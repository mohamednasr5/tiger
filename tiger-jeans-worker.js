/**
 * Tiger Jeans - Unified Worker (AI Proxy + Telegram Notifications)
 * =================================================================
 * وركر موحد لمتجر Tiger Jeans يشمل:
 * 1. Proxy لطلبات NVIDIA NIM API (للذكاء الاصطناعي)
 * 2. إشعارات Telegram للطلبات الجديدة وتحديثات الحالة
 *
 * =================================================================
 * Secrets المطلوبة على Cloudflare:
 * =================================================================
 * 1) NVIDIA_API_KEY    → مفتاح API للذكاء الاصطناعي
 * 2) TELEGRAM_BOT_TOKEN→ توكن بوت تليجرام (من @BotFather)
 * 3) TELEGRAM_CHAT_ID  → معرف الدردشة (Chat ID) لاستلام الإشعارات
 *
 * خطوات الإعداد:
 *   wrangler secret put NVIDIA_API_KEY
 *   wrangler secret put TELEGRAM_BOT_TOKEN
 *   wrangler secret put TELEGRAM_CHAT_ID
 *   wrangler deploy
 *
 * =================================================================
 * Endpoints المتاحة:
 * =================================================================
 * POST /v1/chat/completions     → Proxy لـ NVIDIA AI
 * POST /v1/models               → قائمة النماذج المتاحة
 * POST /telegram/notify-order   → إشعار طلب جديد
 * POST /telegram/status-update  → إشعار تحديث حالة طلب
 * GET  /telegram/test           → اختبار اتصال التليجرام
 * GET  /                        → صفحة معلومات الـ Worker
 */

// ==================== إعدادات NVIDIA AI ====================
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

// ==================== إعدادات CORS ====================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
};

// ==================== دوال مساعدة ====================

/**
 * إنشاء رد CORS صحيح
 */
function corsResponse(body, status = 200, contentType = 'application/json') {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', contentType);
  return new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    { status, headers }
  );
}

/**
 * تنسيق السعر بالجنية المصري
 */
function formatPrice(price) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0
  }).format(price);
}

/**
 * الحصول على رمز حالة الطلب
 */
function getStatusEmoji(status) {
  const emojis = {
    'pending': '⏳',
    'pending_verification': '🔍',
    'confirmed': '✅',
    'processing': '🔄',
    'shipping': '🚚',
    'delivered': '✅',
    'cancelled': '❌',
    'returned': '↩️',
    'refunded': '💰'
  };
  return emojis[status] || '📋';
}

/**
 * الحصول على نص حالة الطلب بالعربية
 */
function getStatusText(status) {
  const texts = {
    'pending': 'قيد الانتظار',
    'pending_verification': 'في انتظار التحقق من الدفع',
    'confirmed': 'تم التأكيد',
    'processing': 'جاري التجهيز',
    'shipping': 'جاري الشحن',
    'delivered': 'تم التسليم',
    'cancelled': 'ملغي',
    'returned': 'مرتجع',
    'refunded': 'مسترد'
  };
  return texts[status] || status;
}

/**
 * الحصول على اسم شركة الشحن بالعربية
 */
function getShippingCompanyName(company) {
  const names = {
    'bosta': 'بوستا (Bosta)',
    'aramex': 'أرامكس (Aramex)',
    'smsa': 'سمسا (SMSA)',
    'dhl': 'DHL',
    'self_pickup': 'استلام ذاتي'
  };
  return names[company] || company;
}

/**
 * الحصول على اسم طريقة الدفع بالعربية
 */
function getPaymentMethodName(method) {
  const names = {
    'vodafone': 'فودافون كاش',
    'instapay': 'إنستاباي',
    'card': 'بطاقة ائتمان',
    'cod': 'الدفع عند الاستلام',
    'wallet': 'محفظة إلكترونية'
  };
  return names[method] || method;
}

// ==================== دوال Telegram ====================

/**
 * إرسال رسالة إلى تليجرام
 */
async function sendTelegramMessage(env, text, parseMode = 'HTML') {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID غير مضبوطين');
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    })
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(`فشل إرسال الرسالة: ${result.description}`);
  }

  return result;
}

/**
 * إنشاء رسالة إشعار طلب جديد
 */
function formatOrderNotification(order, siteUrl = 'https://tiger-jeans.com') {
  const { code, customer, items, total, subtotal, shippingCost, discount, payment, shippingCompany, trackingNumber } = order;

  // بناء قائمة المنتجات
  let itemsList = '';
  items.forEach((item, index) => {
    const productLink = `${siteUrl}/product/${item.id}`;
    itemsList += `
${index + 1}. <b>${item.name}</b>
   🎨 اللون: ${item.color}
   📏 المقاس: ${item.size}
   🔢 الكمية: ${item.qty}
   💰 السعر: ${formatPrice(item.price)}
   🔗 <a href="${productLink}">عرض المنتج</a>`;
  });

  // حساب الخصم إذا وجد
  let discountLine = '';
  if (discount && discount > 0) {
    discountLine = `\n🏷️ الخصم: -${formatPrice(discount)}`;
  }

  // معلومات التتبع
  let trackingLine = '';
  if (trackingNumber) {
    const trackingLink = getTrackingLink(shippingCompany, trackingNumber);
    trackingLine = `\n📦 رقم التتبع: <a href="${trackingLink}">${trackingNumber}</a>`;
  }

  const message = `🛒 <b>طلب جديد - ${code}</b>
━━━━━━━━━━━━━━━━━━━

👤 <b>العميل:</b> ${customer.name}
📱 <b>الهاتف:</b> ${customer.phone}
📍 <b>العنوان:</b> ${customer.address}, ${customer.city}
${customer.notes ? `📝 <b>ملاحظات:</b> ${customer.notes}` : ''}

━━━━━━━━━━━━━━━━━━━
📦 <b>المنتجات:</b>${itemsList}

━━━━━━━━━━━━━━━━━━━
💵 <b>المجموع الفرعي:</b> ${formatPrice(subtotal)}${discountLine}
🚚 <b>الشحن:</b> ${formatPrice(shippingCost || 0)} (${getShippingCompanyName(shippingCompany)})
<b>الإجمالي:</b> <b>${formatPrice(total)}</b>

💳 <b>طريقة الدفع:</b> ${getPaymentMethodName(payment.method)}${trackingLine}

🔗 <a href="${siteUrl}/admin/orders">عرض في لوحة التحكم</a>
🕐 <i>${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}</i>`;

  return message;
}

/**
 * إنشاء رسالة تحديث حالة الطلب
 */
function formatStatusUpdateNotification(order, oldStatus, newStatus, note = '', siteUrl = 'https://tiger-jeans.com') {
  const { code, customer, trackingNumber, shippingCompany } = order;

  // معلومات التتبع إذا توفرت
  let trackingInfo = '';
  if (trackingNumber && newStatus === 'shipping') {
    const trackingLink = getTrackingLink(shippingCompany, trackingNumber);
    trackingInfo = `\n📦 رقم التتبع: <a href="${trackingLink}">${trackingNumber}</a>`;
  }

  const message = `📋 <b>تحديث حالة الطلب - ${code}</b>
━━━━━━━━━━━━━━━━━━━

👤 العميل: ${customer.name}
📱 الهاتف: ${customer.phone}

🔄 <b>تغيير الحالة:</b>
   ${getStatusEmoji(oldStatus)} ${getStatusText(oldStatus)}
       ⬇️
   ${getStatusEmoji(newStatus)} ${getStatusText(newStatus)}${trackingInfo}

${note ? `📝 <b>ملاحظة:</b> ${note}` : ''}

🔗 <a href="${siteUrl}/admin/orders">عرض في لوحة التحكم</a>
🕐 <i>${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}</i>`;

  return message;
}

/**
 * الحصول على رابط التتبع حسب شركة الشحن
 */
function getTrackingLink(company, trackingNumber) {
  const links = {
    'bosta': `https://app.bosta.co/shipments/${trackingNumber}`,
    'aramex': `https://www.aramex.com/track/details?shipment=${trackingNumber}`,
    'smsa': `https://smsaexpress.com/tracking?tracknumbers=${trackingNumber}`,
    'dhl': `https://www.dhl.com/eg-ar/home/tracking/tracking-parcel.html?submit=1&tracking-id=${trackingNumber}`
  };
  return links[company] || '#';
}

// =================️==================== المعالج الرئيسي ====================

export default {
  async fetch(request, env) {
    // ===== معالجة CORS preflight =====
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ===== الصفحة الرئيسية - معلومات الـ Worker =====
      if (path === '/' || path === '') {
        return handleRootPath(env);
      }

      // ===== NVIDIA AI Proxy Endpoints =====
      if (path.startsWith('/v1/')) {
        return await handleAIProxy(request, url, env);
      }

      // ===== Telegram Notification Endpoints =====
      if (path.startsWith('/telegram/')) {
        return await handleTelegramEndpoint(request, url, env);
      }

      // ===== 404 لأي مسار آخر =====
      return corsResponse({ error: 'Not found' }, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return corsResponse(
        { error: `خطأ داخلي: ${error.message}` },
        500
      );
    }
  }
};

// ==================== معالجات المسارات ====================

/**
 * معالجة المسار الرئيسي
 */
async function handleRootPath(env) {
  const telegramConfigured = !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
  const aiConfigured = !!env.NVIDIA_API_KEY;

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tiger Jeans Worker</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.95);
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 25px 80px rgba(0,0,0,0.3);
    }
    h1 {
      color: #e94560;
      text-align: center;
      margin-bottom: 10px;
      font-size: 2em;
    }
    .subtitle {
      color: #666;
      text-align: center;
      margin-bottom: 30px;
      font-size: 0.9em;
    }
    .status-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 30px;
    }
    .status-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      border: 2px solid transparent;
      transition: all 0.3s;
    }
    .status-card.active {
      border-color: #00b894;
      background: linear-gradient(135deg, #00b89410, #00b89405);
    }
    .status-card.inactive {
      border-color: #fd79a8;
      background: linear-gradient(135deg, #fd79a810, #fd79a805);
    }
    .status-icon {
      font-size: 2em;
      margin-bottom: 8px;
    }
    .status-title {
      font-weight: bold;
      color: #2d3436;
      margin-bottom: 5px;
    }
    .status-value {
      font-size: 0.85em;
      color: #636e72;
    }
    .endpoints {
      background: #2d3436;
      border-radius: 12px;
      padding: 20px;
      color: #fff;
    }
    .endpoints h3 {
      color: #e94560;
      margin-bottom: 15px;
      font-size: 1em;
    }
    .endpoint {
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 12px 15px;
      margin-bottom: 10px;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      direction: ltr;
      text-align: left;
    }
    .endpoint .method {
      color: #00b894;
      font-weight: bold;
      margin-right: 10px;
    }
    .endpoint .path {
      color: #74b9ff;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      color: #999;
      font-size: 0.8em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🐯 Tiger Jeans Worker</h1>
    <p class="subtitle">AI Proxy + Telegram Notifications</p>
    
    <div class="status-grid">
      <div class="status-card ${aiConfigured ? 'active' : 'inactive'}">
        <div class="status-icon">${aiConfigured ? '🤖' : '⚠️'}</div>
        <div class="status-title">NVIDIA AI</div>
        <div class="status-value">${aiConfigured ? 'مُفعّل' : 'غير مُفعّل'}</div>
      </div>
      <div class="status-card ${telegramConfigured ? 'active' : 'inactive'}">
        <div class="status-icon">${telegramConfigured ? '📱' : '⚠️'}</div>
        <div class="status-title">Telegram</div>
        <div class="status-value">${telegramConfigured ? 'مُفعّل' : 'غير مُفعّل'}</div>
      </div>
    </div>
    
    <div class="endpoints">
      <h3>📡 Endpoints المتاحة</h3>
      <div class="endpoint"><span class="method">POST</span><span class="path">/v1/chat/completions</span></div>
      <div class="endpoint"><span class="method">POST</span><span class="path">/telegram/notify-order</span></div>
      <div class="endpoint"><span class="method">POST</span><span class="path">/telegram/status-update</span></div>
      <div class="endpoint"><span class="method">GET</span><span class="path">/telegram/test</span></div>
    </div>
    
    <p class="footer">Tiger Jeans © ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/**
 * معالجة طلبات AI Proxy (NVIDIA)
 */
async function handleAIProxy(request, url, env) {
  // السماح فقط بطلبات POST
  if (request.method !== 'POST') {
    return corsResponse({ error: 'Method not allowed' }, 405);
  }

  // استخدام المفتاح من العميل (للاختبار) أو من Secrets
  const clientAuth = request.headers.get('Authorization') || '';
  const clientKey = clientAuth.replace(/^Bearer\s+/i, '').trim();
  const apiKey = clientKey || env.NVIDIA_API_KEY;

  if (!apiKey) {
    return corsResponse({
      error: 'لا يوجد مفتاح NVIDIA API. اضبط NVIDIA_API_KEY كـ Secret على الـ Worker.'
    }, 401);
  }

  const targetUrl = `${NVIDIA_BASE}${url.pathname.replace('/v1', '')}`;
  const accept = request.headers.get('Accept') || 'application/json';

  // إرسال الطلب إلى NVIDIA
  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': accept
      },
      body: await request.text()
    });
  } catch (e) {
    return corsResponse({ error: `فشل الاتصال بـ NVIDIA: ${e.message}` }, 502);
  }

  // تحديد نوع الاستجابة (streaming أو عادية)
  const isStream = accept.includes('text/event-stream');

  const respHeaders = new Headers(corsHeaders);
  respHeaders.set('Content-Type', isStream ? 'text/event-stream' : 'application/json');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders
  });
}

/**
 * معالجة endpoints التليجرام
 */
async function handleTelegramEndpoint(request, url, env) {
  const path = url.pathname.replace('/telegram', '');

  // اختبار الاتصال بتليجرام
  if (path === '/test' || path === '/test/') {
    return await handleTelegramTest(env);
  }

  // إشعار طلب جديد
  if (path === '/notify-order' || path === '/notify-order/') {
    return await handleNotifyOrder(request, env);
  }

  // إشعار تحديث حالة
  if (path === '/status-update' || path === '/status-update/') {
    return await handleStatusUpdate(request, env);
  }

  return corsResponse({ error: 'Endpoint غير موجود' }, 404);
}

/**
 * اختبار اتصال التليجرام
 */
async function handleTelegramTest(env) {
  try {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return corsResponse({
        success: false,
        error: 'TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID غير مضبوطين',
        config: {
          hasBotToken: !!botToken,
          hasChatId: !!chatId
        }
      }, 400);
    }

    // إرسال رسالة اختبار
    const result = await sendTelegramMessage(
      env,
      '🐯 <b>اختبار اتصال Tiger Jeans Worker</b>\n\n✅ الاتصال يعمل بشكل صحيح!\n🕐 ' +
      new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })
    );

    return corsResponse({
      success: true,
      message: 'تم إرسال رسالة الاختبار بنجاح',
      telegramResult: result
    });

  } catch (error) {
    return corsResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * معالجة إشعار طلب جديد
 */
async function handleNotifyOrder(request, env) {
  try {
    // قراءة بيانات الطلب من الجسم
    let order;
    try {
      order = await request.json();
    } catch (e) {
      return corsResponse({
        success: false,
        error: 'جسم الطلب يجب أن يكون JSON صالح'
      }, 400);
    }

    // التحقق من البيانات المطلوبة
    if (!order.code) {
      return corsResponse({
        success: false,
        error: 'حقل code (رقم الطلب) مطلوب'
      }, 400);
    }

    if (!order.customer || !order.customer.name) {
      return corsResponse({
        success: false,
        error: 'بيانات العميل (customer.name) مطلوبة'
      }, 400);
    }

    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return corsResponse({
        success: false,
        error: 'قائمة المنتجات (items) مطلوبة ولا يمكن أن تكون فارغة'
      }, 400);
    }

    // الحصول على رابط الموقع (اختياري)
    const siteUrl = order.siteUrl || 'https://tiger-jeans.com';

    // إنشاء وإرسال الرسالة
    const message = formatOrderNotification(order, siteUrl);
    const result = await sendTelegramMessage(env, message);

    return corsResponse({
      success: true,
      message: `تم إرسال إشعار الطلب ${order.code} بنجاح`,
      orderId: order.code,
      telegramResult: result
    });

  } catch (error) {
    return corsResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * معالجة إشعار تحديث حالة الطلب
 */
async function handleStatusUpdate(request, env) {
  try {
    // قراءة البيانات من الجسم
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return corsResponse({
        success: false,
        error: 'جسم الطلب يجب أن يكون JSON صالح'
      }, 400);
    }

    // التحقق من البيانات المطلوبة
    if (!data.order) {
      return corsResponse({
        success: false,
        error: 'بيانات الطلب (order) مطلوبة'
      }, 400);
    }

    if (!data.newStatus) {
      return corsResponse({
        success: false,
        error: 'الحالة الجديدة (newStatus) مطلوبة'
      }, 400);
    }

    const { order, oldStatus, newStatus, note, siteUrl } = data;

    // إنشاء وإرسال الرسالة
    const message = formatStatusUpdateNotification(
      order,
      oldStatus || order.status,
      newStatus,
      note || '',
      siteUrl || 'https://tiger-jeans.com'
    );

    const result = await sendTelegramMessage(env, message);

    return corsResponse({
      success: true,
      message: `تم إرسال إشعار تحديث الحالة بنجاح`,
      orderId: order.code,
      oldStatus: oldStatus || order.status,
      newStatus: newStatus,
      telegramResult: result
    });

  } catch (error) {
    return corsResponse({
      success: false,
      error: error.message
    }, 500);
  }
}
