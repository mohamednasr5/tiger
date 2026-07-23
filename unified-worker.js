// ====== Tiger Jeans Unified Worker ======
// الإصدار 3.0 - موحد ومحسّن
// يدعم: AI Proxy + Telegram Notifications + Bosta Tracking

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';
const BOSTA_TRACK_URL = 'https://track.bosta.co/shipments';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Admin-Secret'
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ====== Health Check ======
      if (path === '/' && request.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'Tiger Jeans Unified Worker v3.0',
          endpoints: {
            ai: '/v1/chat/completions',
            telegramNotify: '/telegram/notify',
            telegramTest: '/telegram/test',
            track: '/track/:number'
          },
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ====== AI Proxy Routes (/v1/*) ======
      if (path.startsWith('/v1/')) {
        return handleAIProxy(request, env);
      }

      // ====== Telegram Routes (/telegram/*) ======
      if (path.startsWith('/telegram/')) {
        return handleTelegramRoute(request, env, path);
      }

      // ====== Tracking Route (/track/*) ======
      if (path.startsWith('/track/')) {
        return handleTrackingRequest(request, path);
      }

      // ====== Admin API Routes (/admin/*) ======
      if (path.startsWith('/admin/')) {
        return handleAdminAPI(request, env, path);
      }

      // Default 404
      return new Response(JSON.stringify({
        error: 'Not found',
        availableEndpoints: ['/v1/chat/completions', '/telegram/notify', '/track/:number']
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[Worker] Unhandled error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// ====== AI Proxy Handler ======
async function handleAIProxy(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Get API key - prefer client-supplied for testing, fallback to worker secret
  const clientAuth = request.headers.get('Authorization') || '';
  const clientKey = clientAuth.replace(/^Bearer\s+/i, '').trim();
  const apiKey = clientKey || env.NVIDIA_API_KEY;

  if (!apiKey) {
    return jsonResponse({
      error: 'لا يوجد مفتاح NVIDIA API. اضبط NVIDIA_API_KEY كـ Secret على الـ Worker.'
    }, 401);
  }

  const url = new URL(request.url);
  const targetUrl = `${NVIDIA_BASE}${url.pathname.replace('/v1', '')}`;
  const accept = request.headers.get('Accept') || 'application/json';

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': accept
      },
      body: await request.text()
    });

    const isStream = accept.includes('text/event-stream');

    const respHeaders = new Headers(corsHeaders);
    respHeaders.set('Content-Type', isStream ? 'text/event-stream' : 'application/json');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders
    });
  } catch (e) {
    return jsonResponse({ error: `Upstream fetch failed: ${e.message}` }, 502);
  }
}

// ====== Telegram Handler ======
async function handleTelegramRoute(request, env, path) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatIdString = env.TELEGRAM_CHAT_ID;

  // GET /telegram/test - Test endpoint
  if (path === '/telegram/test' && request.method === 'GET') {
    if (!botToken) {
      return jsonResponse({ error: 'Telegram not configured' }, 500);
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await response.json();

      if (data.ok) {
        return jsonResponse({ 
          success: true, 
          bot: data.result,
          message: 'Telegram worker is running'
        });
      } else {
        return jsonResponse({ error: data.description }, 400);
      }
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  // POST /telegram/notify - Send notification
  if (path === '/telegram/notify' || path === '/telegram/') {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    if (!botToken || !chatIdString) {
      return jsonResponse({ error: 'Missing Telegram Secrets in Cloudflare' }, 500);
    }

    try {
      const body = await request.json();
      const text = body.text || body.message || '';
      
      if (!text) {
        return jsonResponse({ error: 'No message provided' }, 400);
      }

      const parseMode = body.parse_mode || 'HTML';
      
      // Support multiple chat IDs (comma-separated)
      const chatIds = chatIdString.split(',').map(id => id.trim());
      
      const sendPromises = chatIds.map(chatId => {
        const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        return fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: parseMode,
            disable_web_page_preview: false
          })
        }).then(res => res.json());
      });

      const results = await Promise.all(sendPromises);
      const allSuccess = results.every(r => r.ok);

      return jsonResponse({
        success: allSuccess,
        results: results.map((r, i) => ({
          chatId: chatIds[i],
          ok: r.ok,
          ...(r.ok ? {} : { error: r.description })
        }))
      }, allSuccess ? 200 : 207);

    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  // POST /telegram/webhook - Webhook handler (for future use)
  if (path === '/telegram/webhook' && request.method === 'POST') {
    return handleTelegramWebhook(request, env);
  }

  return jsonResponse({ error: 'Telegram endpoint not found' }, 404);
}

// ====== Telegram Webhook Handler ======
async function handleTelegramWebhook(request, env) {
  try {
    const update = await request.json();
    
    // Extract message info
    const message = update.message || update.edited_message;
    if (!message) {
      return jsonResponse({ ok: true }); // Acknowledge non-message updates
    }

    const chatId = message.chat.id.toString();
    const text = message.text || '';
    const from = message.from;

    console.log(`[Telegram] Message from ${from?.first_name} (${chatId}): ${text}`);

    // Handle commands
    if (text.startsWith('/')) {
      return await handleTelegramCommand(text, chatId, from, env);
    }

    // Handle tracking requests (phone number detection)
    const phoneMatch = text.match(/01[0125]\d{8}/);
    if (phoneMatch) {
      return await handleTrackCommand(phoneMatch[0], chatId, env);
    }

    // Default response
    return await sendTelegramMessage(env, chatId, `
🐯 <b>Tiger Jeans Bot</b>

مرحباً! أنا بوت تايجر چينز.

<b>الأوامر المتاحة:</b>
/track [رقم] - تتبع طلبك
/start - الترحيب
/help - المساعدة

أو أرسل رقم تليفونك مباشرة لتتبع طلباتك.
    `);

  } catch (e) {
    console.error('[Webhook] Error:', e);
    return jsonResponse({ error: e.message }, 500);
  }
}

// ====== Telegram Command Handler ======
async function handleTelegramCommand(command, chatId, from, env) {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ');

  switch (cmd) {
    case '/start':
      return await sendTelegramMessage(env, chatId, `
🐯 <b>مرحباً بك في Tiger Jeans!</b>

أنا بوت خدمة العملاء الذكي.

<b>ما يمكنني فعله:</b>
📦 تتبع طلباتك
🔍 البحث عن منتجات
💬 الإجابة على استفساراتك

<b>كيفية الاستخدام:</b>
• أرسل <b>/track</b> متبوعاً برقم تليفونك
• أو أرسل رقم التليفون مباشرة
• أو اكتب <b>/help</b> للمزيد

🛒 <a href="https://tiger-jeans.com">زيارة المتجر</a>
      `);

    case '/help':
      return await sendTelegramMessage(env, chatId, `
📖 <b>دليل المساعدة - Tiger Jeans</b>

<b>الأوامر:</b>
/track 01012345678 - تتبع الطلبات
/start - بدء المحادثة
/help - هذه الرسالة

<b>معلومات الطلب:</b>
• يمكنك إرسال رقم التليفون مباشرة
• ستحصل على حالة آخر 5 طلبات
• روابط تتبع مباشرة لشحنات بوستا

<b>عن المتجر:</b>
🛒 tiger-jeans.com
📱 للدعم: تواصل مع خدمة العملاء

🐯 <i>نحن هنا لمساعدتك!</i>
      `);

    case '/track':
      if (!arg) {
        return await sendTelegramMessage(env, chatId, `
❓ <b>كيفية تتبع الطلب</b>

أرسل الأمر بالصيغة التالية:
<code>/track 01012345678</code>

أو أرسل رقم التليفون مباشرة بدون أي أمر.
        `);
      }
      return await handleTrackCommand(arg, chatId, env);

    default:
      return await sendTelegramMessage(env, chatId, `
❓ أمر غير معروف: ${cmd}

أرسل <b>/help</b> لعرض الأوامر المتاحة.
      `);
  }
}

// ====== Track Order Handler ======
async function handleTrackCommand(phoneOrCode, chatId, env) {
  // This would typically query Firebase
  // For now, return a helpful response
  
  // Normalize phone
  let phone = phoneOrCode.replace(/\D/g, '');
  if (phone.startsWith('2') && phone.length > 10) phone = phone.substring(1);
  if (!phone.startsWith('0') && /^\d{10}$/.test(phone)) phone = '0' + phone;

  // In a real implementation, you'd query Firebase here
  // For now, we'll return a template response that the frontend can customize
  
  return await sendTelegramMessage(env, chatId, `
🔍 <b>نتائج البحث عن:</b> <code>${phone}</code>

⏳ جاري البحث في قاعدة البيانات...

<i>ملاحظة: لتفعيل التتبع الكامل، تأكد من ربط Worker بقاعدة بيانات Firebase.</i>

🔗 <a href="https://tiger-jeans.com/track.html?phone=${phone}">تتبع من الموقع</a>
  `);
}

// ====== Tracking Handler ======
async function handleTrackingRequest(request, path) {
  const trackingNumber = path.replace('/track/', '');
  
  if (!trackingNumber) {
    return jsonResponse({ error: 'Tracking number required' }, 400);
  }

  // Generate Bosta tracking link
  const bostaUrl = `${BOSTA_TRACK_URL}/${trackingNumber}`;

  return jsonResponse({
    trackingNumber,
    links: {
      bosta: bostaUrl,
      embed: `${bostaUrl}?embed=true`
    },
    message: `تابع شحنتك على بوستا`
  });
}

// ====== Admin API Handler ======
async function handleAdminAPI(request, env, path) {
  // Verify admin access (simple secret check)
  const adminSecret = request.headers.get('X-Admin-Secret');
  if (adminSecret !== env.ADMIN_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // GET /admin/stats
  if (path === '/admin/stats' && request.method === 'GET') {
    return jsonResponse({
      status: 'ok',
      workerVersion: '3.0',
      uptime: process.uptime?.() || 0,
      timestamp: Date.now(),
      services: {
        ai: !!env.NVIDIA_API_KEY,
        telegram: !!env.TELEGRAM_BOT_TOKEN
      }
    });
  }

  return jsonResponse({ error: 'Admin endpoint not found' }, 404);
}

// ====== Utility Functions ======

function sendTelegramMessage(env, chatId, text, parseMode = 'HTML') {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return Promise.resolve(jsonResponse({ error: 'Bot not configured' }, 500));
  }

  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: false
    })
  }).then(res => res.json())
    .then(data => {
      if (data.ok) {
        return jsonResponse({ ok: true, result: data.result });
      } else {
        return jsonResponse({ error: data.description }, 500);
      }
    });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
