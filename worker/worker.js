// ═══════════════════════════════════════════════════════════════════════════
//  TIGER Image Upload Worker — Cloudflare Workers + R2
//  Endpoint: https://tiger-upload.studegy10.workers.dev
//  Domain : tiger-jeans.com
// ═══════════════════════════════════════════════════════════════════════════

// ── R2 Bucket Binding Name (must match wrangler.toml) ──
// In Cloudflare dashboard: Workers & Pages → R2 → Create bucket "tiger-images"
// In Worker settings: Variables and Secrets → R2 Bucket Bindings → name = "BUCKET"

// ── Environment ──
// BUCKET        → R2 binding
// ADMIN_SECRET  → Secret key to authorize upload requests
// ALLOWED_ORIGINS → Comma-separated allowed origins for CORS

const ALLOWED_ORIGINS_DEFAULT = 'https://tiger-jeans.com,https://www.tiger-jeans.com';

// ── Image Config ──
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB max
const MAX_FILES_PER_REQUEST = 10;

// Compression targets
const QUALITY_MAP = {
  'thumbnail': { maxW: 300, maxH: 300, quality: 70 },
  'small':     { maxW: 600, maxH: 600, quality: 75 },
  'medium':    { maxW: 1000, maxH: 1000, quality: 80 },
  'large':     { maxW: 1600, maxH: 1600, quality: 85 },
  'original':  { maxW: 2400, maxH: 2400, quality: 90 },
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'
];

const CDN_BASE_URL = 'https://images.tiger-jeans.com'; // Custom R2 public domain (or use Workers dev domain)


// ═══════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── CORS Preflight ──
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    try {
      // ── Health Check ──
      if (path === '/' || path === '/health') {
        return jsonResponse({
          status: 'ok',
          service: 'TIGER Image Upload Service',
          version: '1.0.0',
          domain: 'tiger-jeans.com',
          timestamp: new Date().toISOString(),
          endpoints: {
            upload: 'POST /upload',
            uploadMulti: 'POST /upload/multi',
            delete: 'DELETE /delete',
            list: 'GET /list',
            info: 'GET /info/:key'
          }
        });
      }

      // ── Single Image Upload ──
      if (path === '/upload' && request.method === 'POST') {
        return await handleUpload(request, env, false);
      }

      // ── Multi Image Upload ──
      if (path === '/upload/multi' && request.method === 'POST') {
        return await handleUpload(request, env, true);
      }

      // ── Delete Image ──
      if (path === '/delete' && request.method === 'DELETE') {
        return await handleDelete(request, env);
      }

      // ── List Images ──
      if (path === '/list' && request.method === 'GET') {
        return await handleList(request, env);
      }

      // ── Get Image Info ──
      if (path.startsWith('/info/') && request.method === 'GET') {
        const key = decodeURIComponent(path.replace('/info/', ''));
        return await handleInfo(key, env);
      }

      // ── Serve image directly from R2 (CDN fallback) ──
      if (path.startsWith('/images/')) {
        return await serveImage(request, env);
      }

      // ── 404 ──
      return jsonResponse({ error: 'Not Found' }, 404);

    } catch (err) {
      console.error('Worker Error:', err.message, err.stack);
      return jsonResponse({ error: 'Internal Server Error', message: err.message }, 500);
    }
  }
};


// ═══════════════════════════════════════════════════════════════
//  UPLOAD HANDLER (Single + Multi)
// ═══════════════════════════════════════════════════════════════
async function handleUpload(request, env, isMulti) {
  // ── Auth Check ──
  const authError = verifyAuth(request, env);
  if (authError) return authError;

  // ── CORS Headers ──
  const corsHeaders = getCORSHeaders(request, env);

  // ── Parse Multipart ──
  const formData = await request.formData();
  const files = formData.getAll('images');
  const folder = formData.get('folder') || 'products';
  const sizes = formData.get('sizes') ? formData.get('sizes').split(',') : ['medium', 'thumbnail'];
  const preserveOriginal = formData.get('preserveOriginal') === 'true';

  if (!files || files.length === 0) {
    return jsonResponse({ error: 'No images provided. Use field name: images' }, 400, corsHeaders);
  }

  if (isMulti && files.length > MAX_FILES_PER_REQUEST) {
    return jsonResponse({ error: `Maximum ${MAX_FILES_PER_REQUEST} images per request` }, 400, corsHeaders);
  }

  // ── Process each image ──
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileResult = await processImage(file, folder, sizes, preserveOriginal, env);
    results.push(fileResult);
  }

  // ── Response ──
  if (isMulti) {
    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return jsonResponse({
      success: true,
      message: `${succeeded.length} of ${results.length} images uploaded`,
      totalProcessed: results.length,
      succeededCount: succeeded.length,
      failedCount: failed.length,
      images: results
    }, 201, corsHeaders);

  } else {
    const result = results[0];
    if (result.success) {
      return jsonResponse({
        success: true,
        message: 'Image uploaded successfully',
        image: result
      }, 201, corsHeaders);
    } else {
      return jsonResponse({
        success: false,
        error: result.error,
        image: result
      }, 400, corsHeaders);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
//  PROCESS SINGLE IMAGE
// ═══════════════════════════════════════════════════════════════
async function processImage(file, folder, sizes, preserveOriginal, env) {
  const fileId = generateId();
  const timestamp = Date.now();

  // ── Validate ──
  if (!file || !(file instanceof File) && !(file instanceof Blob)) {
    return { success: false, error: 'Invalid file object', index: fileId };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`, index: fileId };
  }

  const mimeType = file.type || 'image/jpeg';
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { success: false, error: `Unsupported file type: ${mimeType}`, index: fileId };
  }

  try {
    // ── Read original image bytes ──
    const originalBuffer = await file.arrayBuffer();
    const originalSize = originalBuffer.byteLength;

    // ── Generate file extension ──
    const ext = getExtension(mimeType);
    const baseName = `${timestamp}_${fileId}`;

    // ── Store original if requested ──
    let originalUrl = null;
    if (preserveOriginal) {
      const originalKey = `${folder}/originals/${baseName}${ext}`;
      await env.BUCKET.put(originalKey, originalBuffer, {
        httpMetadata: { contentType: mimeType },
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          originalSize: String(originalSize),
          source: 'tiger-admin'
        }
      });
      originalUrl = `${CDN_BASE_URL}/${originalKey}`;
    }

    // ── Process each requested size ──
    const variants = {};
    const imageBitmap = await createImageBitmap(new Blob([originalBuffer], { type: mimeType }));

    for (const sizeName of sizes) {
      const config = QUALITY_MAP[sizeName];
      if (!config) {
        variants[sizeName] = { error: `Unknown size: ${sizeName}` };
        continue;
      }

      try {
        // ── Calculate dimensions (maintain aspect ratio) ──
        let { width, height } = calculateDimensions(
          imageBitmap.width, imageBitmap.height,
          config.maxW, config.maxH
        );

        // ── Create canvas and draw ──
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // High-quality downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imageBitmap, 0, 0, width, height);

        // ── Convert to WebP (better compression) ──
        let outputBuffer;
        let outputMime = 'image/webp';
        let outputExt = '.webp';

        // For AVIF support in modern browsers
        try {
          const blob = await canvas.convertToBlob({
            type: 'image/webp',
            quality: config.quality / 100
          });
          outputBuffer = await blob.arrayBuffer();
        } catch (e) {
          // Fallback to JPEG
          const blob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality: config.quality / 100
          });
          outputBuffer = await blob.arrayBuffer();
          outputMime = 'image/jpeg';
          outputExt = '.jpg';
        }

        // ── Save to R2 ──
        const r2Key = `${folder}/${sizeName}/${baseName}${outputExt}`;
        await env.BUCKET.put(r2Key, outputBuffer, {
          httpMetadata: { contentType: outputMime },
          customMetadata: {
            width: String(width),
            height: String(height),
            quality: String(config.quality),
            originalSize: String(originalSize),
            compressedSize: String(outputBuffer.byteLength),
            compressionRatio: ((1 - outputBuffer.byteLength / originalSize) * 100).toFixed(1) + '%',
            uploadedAt: new Date().toISOString(),
            source: 'tiger-admin'
          }
        });

        variants[sizeName] = {
          url: `${CDN_BASE_URL}/${r2Key}`,
          key: r2Key,
          width: width,
          height: height,
          size: outputBuffer.byteLength,
          sizeFormatted: formatBytes(outputBuffer.byteLength),
          mimeType: outputMime
        };

      } catch (e) {
        variants[sizeName] = { error: e.message };
        console.error(`Error processing ${sizeName}:`, e.message);
      }
    }

    imageBitmap.close();

    // ── Build response ──
    const mainVariant = variants['medium'] || variants['small'] || variants['large'] || Object.values(variants)[0];

    return {
      success: true,
      id: fileId,
      originalName: file.name || 'unknown',
      originalSize: originalSize,
      originalSizeFormatted: formatBytes(originalSize),
      mimeType: mimeType,
      folder: folder,
      originalUrl: originalUrl,
      mainUrl: mainVariant?.url || null,
      mainKey: mainVariant?.key || null,
      variants: variants,
      createdAt: new Date().toISOString()
    };

  } catch (err) {
    return { success: false, error: err.message, index: fileId };
  }
}


// ═══════════════════════════════════════════════════════════════
//  DELETE HANDLER
// ═══════════════════════════════════════════════════════════════
async function handleDelete(request, env) {
  const authError = verifyAuth(request, env);
  if (authError) return authError;

  const corsHeaders = getCORSHeaders(request, env);

  const { key, keys, folder, id } = await request.json();

  if (!key && !keys && !id) {
    return jsonResponse({ error: 'Provide "key", "keys" (array), or "id" to delete' }, 400, corsHeaders);
  }

  const keysToDelete = [];

  if (key) {
    keysToDelete.push(key);
  } else if (keys && Array.isArray(keys)) {
    keysToDelete.push(...keys);
  } else if (id) {
    // Delete all variants for a given image ID
    const listed = await env.BUCKET.list({ prefix: '' });
    for (const obj of listed.objects) {
      if (obj.key.includes(id)) {
        keysToDelete.push(obj.key);
      }
    }
  }

  if (keysToDelete.length === 0) {
    return jsonResponse({ error: 'No matching keys found to delete' }, 404, corsHeaders);
  }

  const deleted = [];
  const failed = [];

  for (const k of keysToDelete) {
    try {
      await env.BUCKET.delete(k);
      deleted.push(k);
    } catch (e) {
      failed.push({ key: k, error: e.message });
    }
  }

  return jsonResponse({
    success: true,
    message: `${deleted.length} files deleted`,
    deleted,
    failed
  }, corsHeaders);
}


// ═══════════════════════════════════════════════════════════════
//  LIST HANDLER
// ═══════════════════════════════════════════════════════════════
async function handleList(request, env) {
  const authError = verifyAuth(request, env);
  if (authError) return authError;

  const corsHeaders = getCORSHeaders(request, env);
  const url = new URL(request.url);

  const prefix = url.searchParams.get('prefix') || '';
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  const cursor = url.searchParams.get('cursor') || undefined;
  const folder = url.searchParams.get('folder') || '';

  const listPrefix = folder ? `${folder}/` : prefix;

  const listed = await env.BUCKET.list({
    prefix: listPrefix,
    limit: Math.min(limit, 1000),
    cursor: cursor
  });

  const files = listed.objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    sizeFormatted: formatBytes(obj.size),
    uploaded: obj.uploaded.toISOString(),
    url: `${CDN_BASE_URL}/${obj.key}`,
    httpMetadata: obj.httpMetadata
  }));

  return jsonResponse({
    success: true,
    files,
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : undefined,
    count: files.length
  }, corsHeaders);
}


// ═══════════════════════════════════════════════════════════════
//  INFO HANDLER
// ═══════════════════════════════════════════════════════════════
async function handleInfo(key, env) {
  const corsHeaders = getCORSHeaders({ headers: { get: () => '*' } }, env);

  const object = await env.BUCKET.head(key);
  if (!object) {
    return jsonResponse({ error: 'Image not found' }, 404, corsHeaders);
  }

  return jsonResponse({
    success: true,
    key: object.key,
    size: object.size,
    sizeFormatted: formatBytes(object.size),
    uploaded: object.uploaded.toISOString(),
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata,
    url: `${CDN_BASE_URL}/${object.key}`
  }, corsHeaders);
}


// ═══════════════════════════════════════════════════════════════
//  SERVE IMAGE FROM R2 (CDN)
// ═══════════════════════════════════════════════════════════════
async function serveImage(request, env) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace('/images/', ''));

  const object = await env.BUCKET.get(key);

  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', object.httpEtag);
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(object.body, { headers });
}


// ═══════════════════════════════════════════════════════════════
//  AUTH VERIFICATION
// ═══════════════════════════════════════════════════════════════
function verifyAuth(request, env) {
  const corsHeaders = getCORSHeaders(request, env);

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader === `Bearer ${env.ADMIN_SECRET}`) {
    return null; // Authenticated
  }

  // Check query param (for simple integrations)
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (token && token === env.ADMIN_SECRET) {
    return null; // Authenticated
  }

  // Check X-Admin-Secret header
  const secretHeader = request.headers.get('X-Admin-Secret');
  if (secretHeader && secretHeader === env.ADMIN_SECRET) {
    return null;
  }

  return jsonResponse({ error: 'Unauthorized. Provide valid ADMIN_SECRET.' }, 401, corsHeaders);
}


// ═══════════════════════════════════════════════════════════════
//  CORS HANDLING
// ═══════════════════════════════════════════════════════════════
function getCORSHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = (env.ALLOWED_ORIGINS || ALLOWED_ORIGINS_DEFAULT).split(',');

  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Secret',
    'Access-Control-Max-Age': '86400',
  };
}

function handleCORS(request, env) {
  const headers = getCORSHeaders(request, env);
  return new Response(null, { status: 204, headers });
}


// ═══════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════
function calculateDimensions(origW, origH, maxW, maxH) {
  let width = origW;
  let height = origH;

  // Only downscale, never upscale
  if (width <= maxW && height <= maxH) {
    return { width, height };
  }

  const ratioW = maxW / width;
  const ratioH = maxH / height;
  const ratio = Math.min(ratioW, ratioH);

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  return { width, height };
}

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getExtension(mimeType) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
  };
  return map[mimeType] || '.jpg';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Powered-By': 'TIGER Upload Worker',
    ...extraHeaders
  };

  return new Response(JSON.stringify(data, null, 2), { status, headers });
}