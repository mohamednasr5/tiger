/**
 * Tiger Jeans - Telegram Notification Service
 * ===========================================
 * خدمة إشعارات مستقلة تعمل 24/7
 * تراقب Firebase وتبعت إشعارات فورية لتليجرام
 * 
 * الطرق المتاحة:
 * POST /api/notify/order     - إشعار طلب جديد
 * POST /api/notify/payment   - إشعار دفع
 * POST /api/notify/preorder  - إشعار طلب مسبق
 * POST /api/notify/lowstock  - إشعار مخزون منخفض
 * POST /api/notify/status    - إشعار تغيير حالة
 */

// ====== Configuration ======
// ⚠️ مهم: استبدل هذه القيم ببيانات البوت الخاصة بك
// للحصول على Bot Token: تواصل مع @BotFather على تليجرام
// للحصول على Chat ID: أرسل رسالة لـ @userinfobot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID_HERE';
const FIREBASE_DB_URL = 'https://tiger-d1433-default-rtdb.firebaseio.com';

// ====== CORS Headers ======
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Bot-Token, X-Chat-ID',
  'Content-Type': 'application/json'
};

// ====== Main Handler ======
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    try {
      // ====== Notification Endpoints ======
      
      // New Order Notification
      if (url.pathname === '/api/notify/order' && request.method === 'POST') {
        return await handleOrderNotification(request);
      }
      
      // Payment Confirmation Notification
      if (url.pathname === '/api/notify/payment' && request.method === 'POST') {
        return await handlePaymentNotification(request);
      }
      
      // Pre-order Notification
      if (url.pathname === '/api/notify/preorder' && request.method === 'POST') {
        return await handlePreorderNotification(request);
      }
      
      // Low Stock Alert
      if (url.pathname === '/api/notify/lowstock' && request.method === 'POST') {
        return await handleLowStockNotification(request);
      }
      
      // Status Change Notification
      if (url.pathname === '/api/notify/status' && request.method === 'POST') {
        return await handleStatusNotification(request);
      }

      // ====== Telegram Webhook Endpoint ======
      if (url.pathname === '/api/telegram/webhook' && request.method === 'POST') {
        return await handleTelegramWebhook(request);
      }

      // ====== Send Message Directly ======
      if (url.pathname === '/api/telegram/send' && request.method === 'POST') {
        return await handleSendMessage(request);
      }

      // ====== Track Order ======
      if (url.pathname === '/api/track' && request.method === 'GET') {
        return await handleTrackOrder(url);
      }

      // Health Check
      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'Tiger Jeans Telegram Bot',
          timestamp: new Date().toISOString()
        }), { headers: corsHeaders });
      }

      // Default
      return new Response(JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        endpoints: [
          'POST /api/notify/order',
          'POST /api/notify/payment', 
          'POST /api/notify/preorder',
          'POST /api/notify/lowstock',
          'POST /api/notify/status',
          'POST /api/telegram/send',
          'GET /api/track?phone=XXX',
          'GET /api/health'
        ]
      }), { status: 404, headers: corsHeaders });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: corsHeaders });
    }
  },

  // Scheduled Event (Cron Trigger) - Check for new orders every minute
  async scheduled(event, env, ctx) {
    console.log('Running scheduled check...');
    
    try {
      // Fetch settings from Firebase
      const settings = await fetchFromFirebase('settings/telegram');
      
      if (!settings || !settings.enabled || !settings.botToken) {
        console.log('Telegram not configured or disabled');
        return;
      }

      // Check for new unnotified orders
      await checkNewOrders(settings);
      
      // Check for new preorders
      await checkNewPreorders(settings);
      
      // Check low stock
      await checkLowStock(settings);

    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  }
};

// ====== Get Bot Token & Chat ID ======
// Cache for Telegram settings (refresh every 5 minutes)
let cachedTelegramSettings = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTelegramSettings() {
  const now = Date.now();
  
  // Return cache if still valid
  if (cachedTelegramSettings && (now - settingsCacheTime) < SETTINGS_CACHE_TTL) {
    return cachedTelegramSettings;
  }
  
  try {
    // Fetch from Firebase
    const settings = await fetchFromFirebase('settings/telegram');
    
    if (settings && settings.enabled && settings.botToken && settings.chatId) {
      cachedTelegramSettings = {
        botToken: settings.botToken,
        chatId: String(settings.chatId),
        enabled: settings.enabled
      };
      settingsCacheTime = now;
      console.log('✓ Loaded Telegram settings from Firebase');
      return cachedTelegramSettings;
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch Telegram settings from Firebase:', error.message);
  }
  
  // Fallback to environment variables or defaults
  return {
    botToken: TELEGRAM_BOT_TOKEN,
    chatId: TELEGRAM_CHAT_ID,
    enabled: true
  };
}

function getBotConfig(requestOrSettings) {
  // If a settings object is passed directly (from scheduled event), use it
  if (requestOrSettings?.botToken && requestOrSettings?.chatId) {
    return {
      botToken: requestOrSettings.botToken,
      chatId: String(requestOrSettings.chatId)
    };
  }
  
  // Try to get from request headers (for API calls with custom credentials)
  if (typeof requestOrSettings?.headers?.get === 'function') {
    const headerToken = requestOrSettings.headers.get('X-Bot-Token');
    const headerChatId = requestOrSettings.headers.get('X-Chat-ID');
    
    if (headerToken && headerChatId) {
      return { botToken: headerToken, chatId: headerChatId };
    }
  }
  
  // Return defaults (will be resolved async in handlers)
  return {
    botToken: TELEGRAM_BOT_TOKEN,
    chatId: TELEGRAM_CHAT_ID
  };
}

// ====== Send Telegram Message ======
async function sendTelegramMessage(botToken, chatId, text, parseMode = 'HTML') {
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
    throw new Error(`Telegram API Error: ${result.description}`);
  }
  
  return result;
}

// ====== Format Price ======
function formatPrice(price) {
  return Number(price || 0).toLocaleString('ar-EG') + ' ج.م';
}

// ====== Fetch from Firebase ======
async function fetchFromFirebase(path) {
  const url = `${FIREBASE_DB_URL}/${path}.json`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Firebase error: ${response.status}`);
  }
  
  return await response.json();
}

// ====== Update in Firebase ======
async function updateInFirebase(path, data) {
  const url = `${FIREBASE_DB_URL}/${path}.json`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  return await response.json();
}

// ============================================
// NOTIFICATION HANDLERS
// ============================================

// ====== Handle New Order Notification ======
async function handleOrderNotification(request) {
  try {
    const orderData = await request.json();
    
    // Get Telegram config from Firebase (with fallback)
    const config = await getTelegramSettings();
    
    if (!config.enabled || config.botToken === 'YOUR_BOT_TOKEN_HERE') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Telegram not configured. Add botToken and chatId to settings/telegram in Firebase.',
        warning: 'Notification skipped'
      }), { status: 202, headers: corsHeaders });
    }
    
    const order = orderData.order || orderData;
    const items = order.items || [];
    
    let itemsList = items.map((item) => 
      `📦 ${item.name} (${item.size || '-'}/${item.color || '-'}) × ${item.qty} = ${formatPrice(item.price * item.qty)}`
    ).join('\n');

    const shippingCost = order.shippingCost || order.shipping || 0;
    const total = order.totalPrice || order.total || 0;

    const message = `
🛒 <b>طلب جديد - Tiger Jeans</b> 🐯
━━━━━━━━━━━━━━━━━

🔖 <b>رقم الطلب:</b> <code>${order.orderCode || order.id || 'N/A'}</code>
👤 <b>العميل:</b> ${order.customer?.name || 'غير محدد'}
📱 <b>التليفون:</b> <code>${order.customer?.phone || 'N/A'}</code>
📍 <b>المدينة:</b> ${order.customer?.city || 'N/A'}
🏠 <b>العنوان:</b> ${order.customer?.address || 'N/A'}

━━━━━━━━━━━━━━━━━
<b>📋 المنتجات:</b>
${itemsList}

━━━━━━━━━━━━━━━━━
💰 <b>الإجمالي:</b> <b>${formatPrice(total)}</b>
🚚 <b>الشحن:</b> ${formatPrice(shippingCost)}
💳 <b>طريقة الدفع:</b> ${order.paymentMethod || order.payment?.method || 'N/A'}
⏰ <b>التاريخ:</b> ${new Date(order.createdAt || Date.now()).toLocaleString('ar-EG')}
    `.trim();

    await sendTelegramMessage(config.botToken, config.chatId, message);

    // Mark as notified in Firebase if we have order ID
    if (order.id) {
      await updateInFirebase(`orders/${order.id}`, { telegramNotified: true, telegramNotifiedAt: Date.now() });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Order notification sent'
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers: corsHeaders });
  }
}

// ====== Handle Payment Notification ======
async function handlePaymentNotification(request) {
  try {
    const orderData = await request.json();
    const config = getBotConfig(request);
    
    const order = orderData.order || orderData;

    const message = `
✅ <b>تأكيد دفع - Tiger Jeans</b> 💰
━━━━━━━━━━━━━━━━━

🔖 <b>رقم الطلب:</b> <code>${order.orderCode || order.id}</code>
👤 <b>العميل:</b> ${order.customer?.name}
📱 <b>التليفون:</b> <code>${order.customer?.phone}</code>

💰 <b>المبلغ المدفوع:</b> <b>${formatPrice(order.totalPrice || order.total)}</b>
💳 <b>طريقة الدفع:</b> ${order.paymentMethod || order.payment?.method || 'N/A'}
📸 <b>حالة الإيصال:</b> ${order.receiptUrl || order.payment?.receiptImage ? 'تم الرفع ✅' : 'لم يتم ❌'}

⏰ <b>تاريخ التأكيد:</b> ${new Date().toLocaleString('ar-EG')}
    `.trim();

    await sendTelegramMessage(config.botToken, config.chatId, message);

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment notification sent'
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers: corsHeaders });
  }
}

// ====== Handle Pre-order Notification ======
async function handlePreorderNotification(request) {
  try {
    const preorderData = await request.json();
    const config = getBotConfig(request);
    
    const preorder = preorderData.preOrder || preorderData;

    const message = `
📋 <b>طلب مسبق جديد - Tiger Jeans</b> ⏳
━━━━━━━━━━━━━━━━━

🔖 <b>رقم الطلب:</b> <code>${preorder.id || 'N/A'}</code>
👤 <b>العميل:</b> ${preorder.customer?.name || preorder.name || 'غير محدد'}
📱 <b>التليفون:</b> <code>${preorder.customer?.phone || preorder.phone || 'N/A'}</code>

📦 <b>المنتج المطلوب:</b> ${preorder.productName || preorder.product?.name || 'N/A'}
📏 <b>المقاس:</b> ${preorder.size || 'N/A'}
🎨 <b>اللون:</b> ${preorder.color || 'N/A'}
🔢 <b>الكمية:</b> ${preorder.quantity || preorder.qty || 1}

💬 <b>ملاحظات:</b> ${preorder.notes || 'لا توجد'}

⏰ <b>التاريخ:</b> ${new Date(preorder.createdAt || Date.now()).toLocaleString('ar-EG')}
    `.trim();

    await sendTelegramMessage(config.botToken, config.chatId, message);

    // Mark as notified
    if (preorder.id) {
      await updateInFirebase(`preorders/${preorder.id}`, { notified: true, notifiedAt: Date.now() });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Preorder notification sent'
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers: corsHeaders });
  }
}

// ====== Handle Low Stock Notification ======
async function handleLowStockNotification(request) {
  try {
    const stockData = await request.json();
    const config = getBotConfig(request);
    
    const { productName, size, color, currentStock, threshold = 2 } = stockData;

    const message = `
⚠️ <b>تنبيه مخزون منخفض - Tiger Jeans</b> 🔴
━━━━━━━━━━━━━━━━━

📦 <b>المنتج:</b> ${productName}
📏 <b>المقاس:</b> ${size || 'كل المقاسات'}
🎨 <b>اللون:</b> ${color || 'كل الألوان'}
🔢 <b>الكمية الحالية:</b> <b>${currentStock}</b> قطعة
⚡ <b>الحد الأدنى:</b> ${threshold} قطعة

⏰ <b>وقت التنبيه:</b> ${new Date().toLocaleString('ar-EG')}
    `.trim();

    await sendTelegramMessage(config.botToken, config.chatId, message);

    return new Response(JSON.stringify({
      success: true,
      message: 'Low stock notification sent'
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers: corsHeaders });
  }
}

// ====== Handle Status Change Notification ======
async function handleStatusNotification(request) {
  try {
    const statusData = await request.json();
    const config = getBotConfig(request);
    
    const { order, oldStatus, newStatus } = statusData;

    const statusEmojis = {
      'pending': '⏳ قيد الانتظار',
      'confirmed': '✅ تم التأكيد',
      'processing': '🔄 قيد التجهيز',
      'shipped': '🚚 تم الشحن',
      'delivered': '🎉 تم التسليم',
      'cancelled': '❌ ملغي'
    };

    const message = `
📊 <b>تحديث حالة الطلب - Tiger Jeans</b>
━━━━━━━━━━━━━━━━━

🔖 <b>رقم الطلب:</b> <code>${order.orderCode || order.id}</code>
👤 <b>العميل:</b> ${order.customer?.name}

📤 <b>من:</b> ${statusEmojis[oldStatus] || oldStatus}
📥 <b>إلى:</b> <b>${statusEmojis[newStatus] || newStatus}</b>

⏰ <b>وقت التحديث:</b> ${new Date().toLocaleString('ar-EG')}
    `.trim();

    await sendTelegramMessage(config.botToken, config.chatId, message);

    return new Response(JSON.stringify({
      success: true,
      message: 'Status notification sent'
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers: corsHeaders });
  }
}

// ============================================
// SCHEDULED TASKS (Auto-check every minute)
// ============================================

// ====== Check for New Orders ======
async function checkNewOrders(settings) {
  try {
    const ordersData = await fetchFromFirebase('orders');
    if (!ordersData) return;

    const orders = Object.entries(ordersData)
      .filter(([id, order]) => !order.telegramNotified && order.status === 'pending')
      .slice(0, 5); // Process max 5 at a time

    for (const [id, order] of orders) {
      try {
        const items = order.items || [];
        let itemsList = items.map((item) => 
          `📦 ${item.name} (${item.size || '-'}/${item.color || '-'}) × ${item.qty}`
        ).join('\n');

        const message = `
🛒 <b>طلب جديد - Tiger Jeans</b> 🐯
━━━━━━━━━━━━━━━━━

🔖 <b>رقم الطلب:</b> <code>${order.code || id}</code>
👤 <b>العميل:</b> ${order.customer?.name || '-'}
📱 <b>التليفون:</b> <code>${order.customer?.phone || '-'}</code>

<b>📋 المنتجات:</b>
${itemsList}

💰 <b>الإجمالي:</b> <b>${formatPrice(order.total)}</b>
⏰ <b>التاريخ:</b> ${new Date(order.createdAt).toLocaleString('ar-EG')}
        `.trim();

        await sendTelegramMessage(settings.botToken, settings.chatId, message);
        
        // Mark as notified
        await updateInFirebase(`orders/${id}`, { 
          telegramNotified: true, 
          telegramNotifiedAt: Date.now() 
        });

        console.log(`Sent notification for order: ${id}`);
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`Error notifying order ${id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error checking orders:', error);
  }
}

// ====== Check for New Preorders ======
async function checkNewPreorders(settings) {
  try {
    const preordersData = await fetchFromFirebase('preorders');
    if (!preordersData) return;

    const preorders = Object.entries(preordersData)
      .filter(([id, po]) => !po.notified && po.status === 'pending')
      .slice(0, 3); // Max 3 at a time

    for (const [id, po] of preorders) {
      try {
        const message = `
📋 <b>طلب مسبق جديد - Tiger Jeans</b> ⏳
━━━━━━━━━━━━━━━━━

👤 <b>العميل:</b> ${po.name || po.customer?.name}
📱 <b>التليفون:</b> <code>${po.phone || po.customer?.phone}</code>
📦 <b>المنتج:</b> ${po.productName}
📏 ${po.size || '-'} | 🎨 ${po.color || '-'} | ×${po.qty || 1}
        `.trim();

        await sendTelegramMessage(settings.botToken, settings.chatId, message);
        
        await updateInFirebase(`preorders/${id}`, { 
          notified: true, 
          notifiedAt: Date.now() 
        });

        console.log(`Sent notification for preorder: ${id}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`Error notifying preorder ${id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error checking preorders:', error);
  }
}

// ====== Check Low Stock ======
async function checkLowStock(settings) {
  try {
    // Only check low stock once per hour (check timestamp)
    const lastCheck = await fetchFromFirebase('settings/lastLowStockCheck');
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    if (lastCheck && lastCheck.timestamp > oneHourAgo) {
      return; // Already checked recently
    }

    const productsData = await fetchFromFirebase('products');
    if (!productsData) return;

    const lowStockItems = [];

    Object.entries(productsData).forEach(([productId, product]) => {
      if (!product.stock) return;
      
      Object.entries(product.stock).forEach(([key, quantity]) => {
        if (quantity <= 2 && quantity > 0) {
          const [size, color] = key.split('_');
          lowStockItems.push({
            name: product.name,
            size: size || '-',
            color: color || '-',
            qty: quantity
          });
        }
      });
    });

    if (lowStockItems.length > 0) {
      let message = `⚠️ <b>تنبيه مخزون منخفض - Tiger Jeans</b> 🔴\n\n`;
      message += `<b>📦 ${lowStockItems.length} صنف يحتاج إعادة تعبئة:</b>\n\n`;

      lowStockItems.slice(0, 10).forEach((item, idx) => {
        message += `${idx + 1}. <b>${item.name}</b>\n`;
        message += `   📏 ${item.size} | 🎨 ${item.color} | 🔢 <b>${item.qty}</b>\n\n`;
      });

      await sendTelegramMessage(settings.botToken, settings.chatId, message);
    }

    // Update last check timestamp
    await updateInFirebase('settings/lastLowStockCheck', { 
      timestamp: Date.now() 
    });

    console.log(`Low stock check completed. Found ${lowStockItems.length} items.`);
    
  } catch (error) {
    console.error('Error checking low stock:', error);
  }
}

// ============================================
// WEBHOOK HANDLER (for bot commands)
// ============================================

async function handleTelegramWebhook(request) {
  const update = await request.json();
  const message = update.message;
  
  if (!message || !message.text) {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  const chatId = message.chat.id;
  const text = message.text;
  const userId = message.from?.id;

  // Load settings to get correct bot token
  let settings;
  try {
    settings = await fetchFromFirebase('settings/telegram');
  } catch (e) {
    settings = null;
  }

  let response;

  if (text.startsWith('/')) {
    const [command, ...args] = text.split(' ');
    response = await processCommand(command, args.join(' '), chatId, userId);
  } else if (/^\d{10,11}$/.test(text.replace(/\s/g, ''))) {
    response = await processCommand('/track', text, chatId, userId);
  } else {
    response = {
      text: `🐯 مرحباً! أنا بوت Tiger Jeans\n\nأرسل /help لعرض الأوامر`,
      parse_mode: 'HTML'
    };
  }

  // Use the bot token from settings or fallback
  const botToken = settings?.botToken || TELEGRAM_BOT_TOKEN;
  
  try {
    await sendTelegramMessage(botToken, chatId, response.text, response.parse_mode);
  } catch (err) {
    console.error('Error sending webhook response:', err);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
}

// ====== Process Commands ======
async function processCommand(command, args, chatId, userId) {
  switch (command.toLowerCase()) {
    case '/start':
      return {
        text: `🐯 <b>مرحباً في بوت Tiger Jeans!</b>\n\nأنا هنا لمساعدتك في:\n• تتبع طلباتك\n• معرفة حالة المخزون\n\n<b>الأوامر:</b>\n/track [رقم] - تتبع طلبك\n/stats - الإحصائيات\n/help - المساعدة`,
        parse_mode: 'HTML'
      };

    case '/help':
      return {
        text: `📚 <b>أوامر البوت:</b>\n\n/track [رقم] - تتبع حالة طلب\n/stats - إحصائيات سريعة\n/lowstock - المخزون المنخفض\nc - آخر 10 طلبات\n/summary - تقرير اليوم`,
        parse_mode: 'HTML'
      };

    case '/track':
      if (!args) {
        return { text: '🔍 أرسل: /track ورقم تليفونك', parse_mode: 'HTML' };
      }
      return await trackOrderByPhone(args.trim());

    case '/stats':
      return await getQuickStats();

    case '/lowstock':
      return await getLowStockReport();

    case '/orders':
      return await getRecentOrders(10);

    case '/summary':
      return await getDailySummary();

    default:
      return { text: '❌ الأمر غير معروف\nأرسل /help', parse_mode: 'HTML' };
  }
}

// ====== Track Order by Phone ======
async function trackOrderByPhone(phone) {
  try {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('20')) cleanPhone = cleanPhone.substring(2);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

    const [ordersData, preordersData] = await Promise.all([
      fetchFromFirebase('orders'),
      fetchFromFirebase('preorders')
    ]);

    const customerOrders = Object.entries(ordersData || {})
      .filter(([id, o]) => {
        const p = (o.customer?.phone || '').replace(/\D/g, '');
        return p.includes(cleanPhone) || cleanPhone.includes(p);
      })
      .map(([id, o]) => ({ id, ...o }));

    const customerPOs = Object.entries(preordersData || {})
      .filter(([id, po]) => {
        const p = (po.phone || '').replace(/\D/g, '');
        return p.includes(cleanPhone) || cleanPhone.includes(p);
      })
      .map(([id, po]) => ({ id, ...po }));

    let msg = `🔍 <b>نتائج: ${phone}</b>\n\n`;

    if (customerOrders.length > 0) {
      msg += `<b>🛒 الطلبات (${customerOrders.length}):</b>\n\n`;
      customerOrders.forEach(o => {
        const s = { pending:'⏳', confirmed:'✅', processing:'🔄', shipped:'🚚', delivered:'🎉', cancelled:'❌' };
        msg += `┌ <b>${o.code || o.id}</b>\n│ 💰${formatPrice(o.total)} ${s[o.status]||o.status}\n└──────────\n`;
      });
    }

    if (customerPOs.length > 0) {
      msg += `\n<b>📋 المسبقة (${customerPOs.length}):</b>\n\n`;
      customerPOs.forEach(po => {
        msg += `┌ <b>#${po.id}</b>\n│ 📦${po.productName}\n└──────────\n`;
      });
    }

    if (!customerOrders.length && !customerPOs.length) {
      msg += '❌ لا توجد طلبات';
    }

    return { text: msg, parse_mode: 'HTML' };
  } catch (e) {
    return { text: '❌ خطأ: ' + e.message, parse_mode: 'HTML' };
  }
}

// ====== Quick Stats ======
async function getQuickStats() {
  try {
    const ordersData = await fetchFromFirebase('orders');
    const orders = Object.values(ordersData || {});
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let todaySales = 0, todayCount = 0;
    orders.forEach(o => {
      if (o.createdAt && String(o.createdAt).includes(todayStr.replace(/-/g,''))) {
        todayCount++;
        todaySales += o.total || 0;
      }
    });

    return {
      text: `📊 <b>إحصائيات - Tiger Jeans</b>\n\n📅 اليوم:\n🛒 ${todayCount} طلب\n💵 ${formatPrice(todaySales)}\n\n📦 إجمالي المنتجات: ${Object.keys(ordersData || {}).length}`,
      parse_mode: 'HTML'
    };
  } catch (e) {
    return { text: '❌ خطأ: ' + e.message, parse_mode: 'HTML' };
  }
}

// ====== Low Stock Report ======
async function getLowStockReport() {
  try {
    const productsData = await fetchFromFirebase('products');
    const items = [];

    Object.entries(productsData || {}).forEach(([id, p]) => {
      if (!p.stock) return;
      Object.entries(p.stock).forEach(([k, q]) => {
        if (q <= 2 && q > 0) {
          const [s, c] = k.split('_');
          items.push({ name: p.name, size: s||'-', color: c||'-', qty: q });
        }
      });
    });

    if (items.length === 0) {
      return { text: '✅ المخزون جيد!', parse_mode: 'HTML' };
    }

    let msg = `⚠️ <b>مخزون منخفض (${items.length}):</b>\n\n`;
    items.forEach((i, idx) => {
      msg += `${idx+1}. ${i.name}\n   📏${i.size} 🎨${i.color} 🔢${i.qty}\n\n`;
    });

    return { text: msg, parse_mode: 'HTML' };
  } catch (e) {
    return { text: '❌ خطأ: ' + e.message, parse_mode: 'HTML' };
  }
}

// ====== Recent Orders ======
async function getRecentOrders(limit = 10) {
  try {
    const ordersData = await fetchFromFirebase('orders');
    const orders = Object.entries(ordersData || {})
      .sort((a, b) => (b[1].createdAt||0) - (a[1].createdAt||0))
      .slice(0, limit);

    if (orders.length === 0) {
      return { text: '📭 لا توجد طلبات', parse_mode: 'HTML' };
    }

    let msg = `📋 <b>آخر ${orders.length} طلبات:</b>\n\n`;
    orders.forEach(([id, o], i) => {
      msg += `${i+1}. <code>${o.code || id}</code>\n   👤${o.customer?.name||'-'} 💰${formatPrice(o.total)}\n\n`;
    });

    return { text: msg, parse_mode: 'HTML' };
  } catch (e) {
    return { text: '❌ خطأ: ' + e.message, parse_mode: 'HTML' };
  }
}

// ====== Daily Summary ======
async function getDailySummary() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const ordersData = await fetchFromFirebase('orders');
    const allOrders = Object.values(ordersData || {});
    const todayOrders = allOrders.filter(o => 
      o.createdAt && String(o.createdAt).startsWith(today.replace(/-/g,''))
    );

    const revenue = todayOrders.reduce((s, o) => s + (o.total||0), 0);
    const shipping = todayOrders.reduce((s, o) => s + (o.shippingCost||0), 0);

    return {
      text: `📊 <b>تقرير اليوم</b>\n\n🛒 ${todayOrders.length} طلب\n💵 ${formatPrice(revenue)}\n🚚 ${formatPrice(shipping)} شحن\n💰 صافي: ${formatPrice(revenue-shipping)}`,
      parse_mode: 'HTML'
    };
  } catch (e) {
    return { text: '❌ خطأ: ' + e.message, parse_mode: 'HTML' };
  }
}

// ====== Handle Send Message ======
async function handleSendMessage(request) {
  const body = await request.json();
  const { botToken, chatId, text, parseMode } = body;
  const config = getBotConfig(request);

  const finalToken = botToken || config.botToken;
  const finalChatId = chatId || config.chatId;

  if (!finalToken || !finalChatId || !text) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing required fields'
    }), { status: 400, headers: corsHeaders });
  }

  try {
    await sendTelegramMessage(finalToken, finalChatId, text, parseMode || 'HTML');
    
    return new Response(JSON.stringify({
      success: true
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers: corsHeaders });
  }
}

// ====== Handle Track Order (Public API) ======
async function handleTrackOrder(url) {
  const phone = url.searchParams.get('phone');

  if (!phone) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing phone parameter'
    }), { status: 400, headers: corsHeaders });
  }

  const result = await trackOrderByPhone(phone);
  return new Response(JSON.stringify(result), { headers: corsHeaders });
}
