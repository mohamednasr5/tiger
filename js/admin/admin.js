import { auth, db } from '../../js/firebase-config.js';
import Auth from '../../js/modules/auth.js';
import Products from '../../js/modules/products.js';
import Orders from '../../js/modules/orders.js';
import Utils from '../../js/utils.js';
import { ref, get, set, update, remove, push, onValue, orderByChild, equalTo, query, limitToLast } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// ═══════════════════════════════════════════════════════════════════
//  TIGER Admin Module
//  Image uploads now go through Cloudflare Worker → R2
// ═══════════════════════════════════════════════════════════════════

const WORKER_URL = 'https://tiger-upload.studegy10.workers.dev';
const ADMIN_SECRET = '521988'; // Must match Worker env var

const Admin = {
  init() {
    if (!Auth.isAdmin) {
      Auth.requireAdmin().catch(() => { window.location.href = '/'; });
    }
    this.initSidebar();
    this.initCharts();
  },

  initSidebar() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('href') === currentPage);
    });
  },

  initCharts() {
    console.log('Admin initialized');
  },

  // ── Products ──
  async fetchAllProducts() {
    const snapshot = await get(ref(db, 'products'));
    const products = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => products.push({ id: child.key, ...child.val() }));
    }
    return products;
  },

  async saveProduct(productData, productId = null) {
    if (productId) {
      await update(ref(db, `products/${productId}`), productData);
    } else {
      const newRef = push(ref(db, 'products'));
      await set(newRef, { ...productData, createdAt: Date.now(), status: 'draft' });
      productId = newRef.key;
    }
    return productId;
  },

  async deleteProduct(productId) {
    await remove(ref(db, `products/${productId}`));
  },

  // ══════════════════════════════════════════════════════════════
  //  IMAGE UPLOAD — Cloudflare Worker + R2
  //  Replaces Firebase Storage for all image uploads
  // ══════════════════════════════════════════════════════════════

  /**
   * Upload images via Worker → compress → store in R2 → return URLs
   * @param {File[]} files - Array of File objects
   * @param {Object} options - { folder, sizes, preserveOriginal, onProgress }
   * @returns {Array} Array of upload result objects
   */
  async uploadImages(files, options = {}) {
    const {
      folder = 'products',       // R2 folder: products, banners, categories, etc.
      sizes = 'medium,thumbnail,large', // Comma-separated size variants
      preserveOriginal = false,
      onProgress = null           // Callback: (percent, label) => void
    } = options;

    if (!files || files.length === 0) return [];

    // Use /upload/multi for multiple files
    if (files.length > 1) {
      return await this._uploadMulti(files, folder, sizes, preserveOriginal, onProgress);
    }

    // Single file upload
    const formData = new FormData();
    formData.append('images', files[0]);
    formData.append('folder', folder);
    formData.append('sizes', sizes);
    formData.append('preserveOriginal', String(preserveOriginal));

    const response = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'X-Admin-Secret': ADMIN_SECRET
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return [this._normalizeUploadResult(result.image)];
  },

  /**
   * Multi-file upload with progress tracking
   */
  async _uploadMulti(files, folder, sizes, preserveOriginal, onProgress) {
    const results = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      if (onProgress) onProgress(((i) / total) * 100, `Uploading ${i + 1}/${total}...`);

      try {
        const formData = new FormData();
        formData.append('images', files[i]);
        formData.append('folder', folder);
        formData.append('sizes', sizes);
        formData.append('preserveOriginal', String(preserveOriginal));

        const response = await fetch(`${WORKER_URL}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ADMIN_SECRET}`,
            'X-Admin-Secret': ADMIN_SECRET
          },
          body: formData
        });

        const result = await response.json();
        results.push(this._normalizeUploadResult(result.image, result.success));
      } catch (e) {
        results.push({ success: false, error: e.message });
      }

      if (onProgress) onProgress(((i + 1) / total) * 100, `${i + 1}/${total} complete`);
    }

    return results;
  },

  /**
   * Upload a single image and return the main URL (simple helper)
   */
  async uploadSingleImage(file, folder = 'products') {
    const results = await this.uploadImages([file], { folder });
    return results[0]?.mainUrl || null;
  },

  /**
   * Upload banner images
   */
  async uploadBannerImages(files) {
    return await this.uploadImages(files, {
      folder: 'banners',
      sizes: 'large,medium,thumbnail',
      preserveOriginal: true
    });
  },

  /**
   * Delete an image from R2 via Worker
   */
  async deleteImage(key) {
    const response = await fetch(`${WORKER_URL}/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'X-Admin-Secret': ADMIN_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key })
    });
    return await response.json();
  },

  /**
   * List images in a folder from R2
   */
  async listImages(folder = '', limit = 50) {
    const params = new URLSearchParams();
    if (folder) params.set('folder', folder);
    params.set('limit', String(limit));

    const response = await fetch(`${WORKER_URL}/list?${params}`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'X-Admin-Secret': ADMIN_SECRET
      }
    });
    return await response.json();
  },

  /**
   * Normalize Worker response to a consistent format
   */
  _normalizeUploadResult(image, success = true) {
    if (!image) return { success: false, error: 'No image data returned' };
    return {
      success,
      id: image.id,
      mainUrl: image.mainUrl || image.variants?.medium?.url,
      thumbnailUrl: image.variants?.thumbnail?.url || image.mainUrl,
      largeUrl: image.variants?.large?.url,
      key: image.mainKey,
      originalName: image.originalName,
      originalSize: image.originalSize,
      originalSizeFormatted: image.originalSizeFormatted,
      compressedSize: image.variants?.medium?.size,
      compressedSizeFormatted: image.variants?.medium?.sizeFormatted,
      compressionRatio: image.variants?.medium ? image.compressionRatio : null,
      variants: image.variants,
      folder: image.folder,
      createdAt: image.createdAt
    };
  },

  // ── Orders ──
  async updateOrderStatus(orderId, status, note = '') {
    const updates = { status, updatedAt: Date.now() };
    await update(ref(db, `orders/${orderId}/statusHistory/${status}`), Date.now());
    if (note) {
      await push(ref(db, `orders/${orderId}/notes`), { text: note, createdAt: Date.now(), by: 'admin' });
    }
    await update(ref(db, `orders/${orderId}`), updates);
  },

  // ── Settings ──
  async saveSettings(settings) {
    await update(ref(db, 'settings'), settings);
  },

  async getSettings() {
    const snapshot = await get(ref(db, 'settings'));
    return snapshot.exists() ? snapshot.val() : {};
  },

  // ── Customers ──
  async fetchCustomers() {
    const snapshot = await get(ref(db, 'users'));
    const customers = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => customers.push({ id: child.key, ...child.val() }));
    }
    return customers;
  },

  // ── Analytics ──
  async fetchAnalytics() {
    const orders = await Orders.getAll();
    const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'payment_review').length;
    return { totalRevenue, totalOrders, pendingOrders, totalCustomers: new Set(orders.map(o => o.userId)).size };
  }
};

// Initialize when DOM ready
if (document.body.dataset.page === 'admin') {
  document.addEventListener('DOMContentLoaded', () => {
    Auth.onUpdate(() => { if (Auth.isAdmin) Admin.init(); });
  });
}

export default Admin;