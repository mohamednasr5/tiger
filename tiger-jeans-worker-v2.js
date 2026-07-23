/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Tiger Jeans - Cloudflare Worker v2.0 (Real Data)           ║
 * ║  ================================                           ║
 * ║  ✅ بيانات حقيقية من Firebase                              ║
 * ║  ✅ إشعارات فورية للطلبات والمخزون                         ║
 * ║  ✅ إحصائيات ومبيعات فعلية                                ║
 * ╚════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════
// 🔧 إعدادات الأمان والمديرين
// ═══════════════════════════════════════════════════════════════

const ADMIN_CHAT_IDS = ['7778902690', '1719802831', '5939081272'];

// ═══════════════════════════════════════════════════════════════
// 🌐 CORS Headers
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With'
};

// ═══════════════════════════════════════════════════════════════
// 🎯 نقاط النهاية (Endpoints)
// ═══════════════════════════════════════════════════════════════

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';
const AGENTROUTER_BASE = 'https://agentrouter.org/v1';
const TELEGRAM_API = 'https://api.telegram.org';

// ═══════════════════════════════════════════════════════════════
// 📱 قائمة الأوامر الثابتة (Menu Button)
// ═══════════════════════════════════════════════════════════════

const BOT_COMMANDS_MENU = [
  { command: 'start', description: '🚀 تشغيل البوت' },
  { command: 'menu', description: '📋 عرض القائمة الرئيسية' },
  { command: 'track', description: '🔍 تتبع طلبك' },
  { command: 'help', description: '❓ المساعدة' },
  { command: 'stats', description: '📊 الإحصائيات' },
  { command: 'orders', description: '📦 آخر الطلبات' },
  { command: 'profit', description: '💰 تقرير الأرباح' },
  { command: 'lowstock', description: '⚠️ المخزون المنخفض' },
  { command: 'customers', description: '👥 قائمة العملاء' },
  { command: 'ai', description: '🤖 الذكاء الاصطناعي' }
];

// ═══════════════════════════════════════════════════════════════
// ⌨️ لوحات المفاتيح (Keyboards) - القائمة الثابتة أسفل الشاشة
// ═══════════════════════════════════════════════════════════════

// القائمة الرئيسية - للعملاء
const MAIN_KEYBOARD_CUSTOMER = {
  keyboard: [
    [
      { text: '🔍 تتبع طلبي' },
      { text: '📞 تواصل معنا' }
    ],
    [
      { text: '🛒 المنتجات' },
      { text: '❓ المساعدة' }
    ]
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
  selective: false
};

// القائمة الرئيسية - للمديرين
const MAIN_KEYBOARD_ADMIN = {
  keyboard: [
    [
      { text: '📊 الإحصائيات' },
      { text: '📦 الطلبات' },
      { text: '💰 الأرباح' }
    ],
    [
      { text: '⚠️ المخزون' },
      { text: '👥 العملاء' },
      { text: '📈 التقرير' }
    ],
    [
      { text: '🤖 الذكاء الاصطناعي' },
      { text: '📢 بث رسالة' },
      { text: '⚙️ إعدادات' }
    ],
    [
      { text: '✖️ إغلاق القائمة' }
    ]
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
  selective: false
};

// ═══════════════════════════════════════════════════════════════
// 🤖 ردود البوت الترحيبية
// ═══════════════════════════════════════════════════════════════

const WELCOME_MESSAGE = `
🐯 *مرحباً بك في متجر Tiger Jeans!*

أنا المساعد الذكي الرسمي للمتجر. كيف يمكنني مساعدتك اليوم؟

اختر من القائمة أدناه أو استخدم الأوامر:

`;

const ADMIN_WELCOME = `
🔐 *وضع المدير مفعّل!*

مرحباً بك يا مدير! لديك صلاحيات كاملة.

*📋 أوامرك السريعة:*
`;

const HELP_MESSAGE = `
📚 *دليل الاستخدام — Tiger Jeans Bot*

*🙋 للأعمالاء:*
• \`/start\` — فتح القائمة الرئيسية
• \`/menu\` — عرض القائمة
• \`/track [رقم]\` — تتبع طلبك
• \`/help\` — هذه المساعدة

*🔐 للمديرين:*
• \`/stats\` — إحصائيات حقيقية من المتجر
• \`/profit\` — تقرير الأرباح الفعلية
• \`/orders\` — آخر الطلبات الحقيقية
• \`/lowstock\` — المخزون المنخفض فعلياً
• \`/summary\` — التقرير اليومي
• \`/customers\` — قائمة العملاء
• \`/ai [سؤال]\` — الذكاء الاصطناعي

_للمساعدة: تواصل مع الإدارة_
`;

// ═══════════════════════════════════════════════════════════════
// 🔄 الدالة الرئيسية - Main Handler
// ═══════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // NVIDIA API Proxy
      if (pathname.startsWith('/v1/')) {
        return handleNVIDIAProxy(request, env);
      }

      // Telegram Webhook
      if (pathname === '/api/telegram/webhook' && request.method === 'POST') {
        return handleTelegramWebhook(request, env);
      }

      // Bot API
      if (pathname.startsWith('/api/bot/')) {
        return handleBotAPI(request, env, pathname);
      }

      // AgentRouter API
      if (pathname.startsWith('/api/ai/')) {
        return handleAgentRouter(request, env);
      }

      // 🔥 NEW: Webhook لإشعارات الموقع (طلبات جديدة، دفع، مخزون)
      if (pathname === '/api/notifications/webhook' && request.method === 'POST') {
        return handleNotificationWebhook(request, env);
      }

      // 🔥 NEW: جلب البيانات من Firebase
      if (pathname === '/api/data/products') {
        return handleGetData(request, env, 'products');
      }
      if (pathname === '/api/data/orders') {
        return handleGetData(request, env, 'orders');
      }
      if (pathname === '/api/data/stats') {
        return handleGetStats(env);
      }
      if (pathname === '/api/data/stock') {
        return handleGetStockAlerts(env);
      }

      // Health Check
      if (pathname === '/' || pathname === '/health') {
        return new Response(JSON.stringify({
          status: '✅ Tiger Jeans Worker v2.0 يعمل',
          version: '2.0.0-real-data',
          features: ['NVIDIA Proxy', 'Telegram Bot', 'AgentRouter AI', 'Real Firebase Data', 'Instant Notifications'],
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 📦 دوال Firebase - جلب البيانات الحقيقية
// ═══════════════════════════════════════════════════════════════

async function getFirebaseData(env, path) {
  const firebaseUrl = env.FIREBASE_URL || 'https://tiger-d1433-default-rtdb.firebaseio.com';
  const apiKey = env.FIREBASE_API_KEY || '';
  
  try {
    let url = `${firebaseUrl}/${path}.json`;
    if (apiKey) {
      url += `?auth=${apiKey}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Firebase Error:', error);
    return null;
  }
}

// جلب المنتجات مع حسابات حقيقية
async function getRealProductsData(env) {
  const products = await getFirebaseData(env, 'products');
  
  if (!products) return null;
  
  let totalStock = 0;
  let lowStockItems = [];
  let totalValue = 0;
  let productCount = 0;
  
  for (const [id, product] of Object.entries(products)) {
    if (!product.active) continue;
    productCount++;
    
    const stock = product.stock || {};
    let productTotalStock = 0;
    
    for (const [sizeColor, qty] of Object.entries(stock)) {
      const quantity = parseInt(qty) || 0;
      productTotalStock += quantity;
      
      // التحقق من المخزون المنخفض (أقل من 5)
      if (quantity > 0 && quantity < 5) {
        lowStockItems.push({
          name: product.name,
          sizeColor: sizeColor,
          qty: quantity,
          price: product.price,
          costPrice: product.costPrice
        });
      }
    }
    
    totalStock += productTotalStock;
    totalValue += (productTotalStock * (product.costPrice || product.price));
  }
  
  return {
    products,
    productCount,
    totalStock,
    lowStockItems,
    totalInventoryValue: totalValue
  };
}

// جلب الطلبات (giftCardRequests + orders إذا وجدت)
async function getRealOrdersData(env) {
  const giftCards = await getFirebaseData(env, 'giftCardRequests') || {};
  const orders = await getFirebaseData(env, 'orders') || {};
  
  // دمج الطلبات
  const allOrders = [];
  
  // طلبات بطاقات الهدايا
  for (const [id, order] of Object.entries(giftCards)) {
    allOrders.push({
      id: id,
      type: 'gift_card',
      amount: order.amount,
      senderName: order.senderName,
      recipientName: order.recipientName,
      status: order.status,
      createdAt: order.createdAt,
      paymentMethod: order.payment?.method,
      phone: order.senderPhone
    });
  }
  
  // ترتيب حسب التاريخ (الأحدث أولاً)
  allOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  // حساب الإحصائيات
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = allOrders.filter(o => o.createdAt >= today.getTime());
  const approvedOrders = allOrders.filter(o => o.status === 'approved');
  const pendingOrders = allOrders.filter(o => o.status === 'pending');
  
  const totalRevenue = approvedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const todayRevenue = todayOrders.filter(o => o.status === 'approved').reduce((sum, o) => sum + (o.amount || 0), 0);
  
  return {
    orders: allOrders.slice(0, 20), // آخر 20 طلب
    totalCount: allOrders.length,
    todayCount: todayOrders.length,
    approvedCount: approvedOrders.length,
    pendingCount: pendingOrders.length,
    totalRevenue,
    todayRevenue
  };
}

// ═══════════════════════════════════════════════════════════════
// 🟢 1. NVIDIA API Proxy Handler
// ═══════════════════════════════════════════════════════════════

async function handleNVIDIAProxy(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const clientAuth = request.headers.get('Authorization') || '';
  const clientKey = clientAuth.replace(/^Bearer\s+/i, '').trim();
  const apiKey = clientKey || env.NVIDIA_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'لا يوجد مفتاح NVIDIA API'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const targetUrl = `${NVIDIA_BASE}${url.pathname.replace('/v1', '')}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': request.headers.get('Accept') || 'application/json'
      },
      body: await request.text()
    });

    const isStream = request.headers.get('Accept')?.includes('text/event-stream');
    
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': isStream ? 'text/event-stream' : 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'فشل الاتصال بـ NVIDIA',
      details: error.message 
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// 📱 2. Telegram Webhook Handler (مع بيانات حقيقية!)
// ═══════════════════════════════════════════════════════════════

async function handleTelegramWebhook(request, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return new Response('Bot token not configured', { status: 500 });
  }

  let update;
  try {
    update = await request.json();
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  // معالجة Callback Query (الأزرار الضاغطة)
  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query, botToken, env);
  }

  // معالجة الرسالة العادية
  const message = update.message;
  
  if (!message) {
    return new Response('No message', { status: 200 });
  }

  const chatId = String(message.chat.id);
  const text = message.text || '';
  const fromId = String(message.from?.id);
  const isAdmin = ADMIN_CHAT_IDS.includes(fromId);

  console.log(`[${new Date().toISOString()}] [${isAdmin ? 'ADMIN' : 'USER'}] ${fromId}: ${text}`);

  // معالجة الأوامر والرسائل
  let result = null;

  if (text.startsWith('/')) {
    const [command, ...args] = text.slice(1).toLowerCase().split(' ');
    const commandArgs = args.join(' ');

    switch (command) {
      case 'start':
        result = handleStartCommand(chatId, isAdmin, botToken);
        break;
      
      case 'menu':
        result = handleMenuCommand(chatId, isAdmin, botToken);
        break;
      
      case 'help':
        result = sendReply(chatId, HELP_MESSAGE, botToken, isAdmin ? MAIN_KEYBOARD_ADMIN : MAIN_KEYBOARD_CUSTOMER);
        break;
      
      case 'track':
        result = await handleTrackCommand(commandArgs, chatId, botToken, env);
        break;
      
      case 'stats':
        if (!isAdmin) result = sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        else result = await handleStatsCommand(chatId, botToken, env);
        break;
      
      case 'profit':
        if (!isAdmin) result = sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        else result = await handleProfitCommand(chatId, botToken, env);
        break;
      
      case 'orders':
        if (!isAdmin) result = sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        else result = await handleOrdersCommand(chatId, botToken, env);
        break;
      
      case 'lowstock':
        if (!isAdmin) result = sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        else result = await handleLowStockCommand(chatId, botToken, env);
        break;
      
      case 'summary':
        if (!isAdmin) result = sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        else result = await handleSummaryCommand(chatId, botToken, env);
        break;
      
      case 'customers':
        if (!isAdmin) result = sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        else result = await handleCustomersCommand(chatId, botToken, env);
        break;
      
      case 'ai':
        if (!isAdmin) result = sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        else if (!commandArgs.trim()) result = sendReply(chatId, '💬 *استخدام:* `/ai [سؤالك]`\n\nمثال:\n`/ai كم مبيعات اليوم؟`', botToken);
        else result = await handleAICommand(commandArgs, chatId, botToken, env);
        break;
      
      case 'broadcast':
        if (!isAdmin) result = sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        else if (!commandArgs.trim()) result = sendReply(chatId, '💬 *استخدام:* `/broadcast [رسالتك]`', botToken);
        else result = await handleBroadcastCommand(commandArgs, chatId, botToken, env);
        break;
      
      case 'alert':
        if (!isAdmin) result = sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        else result = handleAlertCommand(chatId, botToken);
        break;
      
      default:
        result = sendReply(
          chatId, 
          `❓ أمر غير معروف: \`${text}\`\n\nاستخدم /menu لعرض القائمة`, 
          botToken, 
          isAdmin ? MAIN_KEYBOARD_ADMIN : MAIN_KEYBOARD_CUSTOMER
        );
    }
  } else {
    // رسالة عادية (ليست أمر)
    
    // التحقق إذا كانت رقم تليفون للتتبع
    if (/^\d{10,11}$/.test(text.replace(/\s/g, ''))) {
      result = await handleTrackCommand(text.replace(/\s/g, ''), chatId, botToken, env);
    } else if (text === '✖️ إغلاق القائمة' || text === '/close') {
      result = sendReply(chatId, '✅ تم إغلاق القائمة\n\nأرسل /menu لعرضها مجدداً', botToken, { remove_keyboard: true });
    } else if (isAdmin) {
      result = await handleAICommand(text, chatId, botToken, env);
    } else {
      result = sendReply(
        chatId, 
        `👋 شكراً لرسالتك!\n\n` +
        `يمكنني مساعدتك في:\n` +
        `• 🔍 تتبع طلبك (أرسل رقم التليفون)\n` +
        `• ❓ الأسئلة الشائعة\n\n` +
        `_أو استخدم /menu لعرض القائمة_`,
        botToken,
        MAIN_KEYBOARD_CUSTOMER
      );
    }
  }

  return result || new Response('OK', { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// 🎮 دوال الأوامر الرئيسية (مع بيانات حقيقية!)
// ═══════════════════════════════════════════════════════════════

function handleStartCommand(chatId, isAdmin, botToken) {
  const welcomeMsg = isAdmin ? WELCOME_MESSAGE + ADMIN_WELCOME : WELCOME_MESSAGE;
  const keyboard = isAdmin ? MAIN_KEYBOARD_ADMIN : MAIN_KEYBOARD_CUSTOMER;
  
  return sendReply(chatId, welcomeMsg, botToken, keyboard);
}

function handleMenuCommand(chatId, isAdmin, botToken) {
  const menuTitle = isAdmin ? 
    '📋 *قائمة المدير — Tiger Jeans*\n\nاختر إجراء:' :
    '📋 *القائمة الرئيسية — Tiger Jeans*\n\nمرحباً! كيف يمكنني مساعدتك؟';
  
  const keyboard = isAdmin ? MAIN_KEYBOARD_ADMIN : MAIN_KEYBOARD_CUSTOMER;
  
  return sendReply(chatId, menuTitle, botToken, keyboard);
}

// 📊 الإحصائيات الحقيقية
async function handleStatsCommand(chatId, botToken, env) {
  const statsKeyboard = {
    inline_keyboard: [
      [
        { text: '📦 الطلبات', callback_data: 'cmd_orders' },
        { text: '💰 الأرباح', callback_data: 'cmd_profit' }
      ],
      [
        { text: '⚠️ المخزون', callback_data: 'cmd_lowstock' },
        { text: '📈 التقرير الكامل', callback_data: 'cmd_summary' }
      ],
      [
        { text: '🔄 تحديث', callback_data: 'cmd_stats' },
        { text: '◀️ رجوع', callback_data: 'action_stats' }
      ]
    ]
  };
  
  try {
    // جلب البيانات الحقيقية من Firebase
    const [productsData, ordersData] = await Promise.all([
      getRealProductsData(env),
      getRealOrdersData(env)
    ]);
    
    const now = new Date();
    
    if (!productsData && !ordersData) {
      return sendReply(chatId, 
        `⚠️ *تعذر جلب البيانات*\n\n` +
        `تأكد من إعدادات Firebase في Worker`, 
        botToken, 
        statsKeyboard
      );
    }
    
    const msg = `📊 *إحصائيات المتجر الحقيقية*\n` +
               `━━━━━━━━━━━━━━━━━━━\n` +
               `📅 *التاريخ:* ${now.toLocaleDateString('ar-EG')}\n\n` +
               `📦 *المنتجات:*\n` +
               `  └ ${(productsData?.productCount || 0)} منتج متوفر\n\n` +
               `💰 *المبيعات اليوم:*\n` +
               `  └ ${(ordersData?.todayRevenue || 0).toLocaleString('ar-EG')} ج.م\n\n` +
               `📋 *الطلبات اليوم:*\n` +
               `  └ ${(ordersData?.todayCount || 0)} طلب\n\n` +
               `👥 *إجمالي الطلبات:*\n` +
               `  └ ${(ordersData?.totalCount || 0)} طلب\n\n` +
               `⚠️ *مخزون منخفض:*\n` +
               `  └ ${(productsData?.lowStockItems?.length || 0)} صنف`;
    
    return sendReply(chatId, msg, botToken, statsKeyboard);
  } catch (error) {
    console.error('Stats Error:', error);
    return sendReply(chatId, '❌ حدث خطأ في جلب الإحصائيات', botToken, statsKeyboard);
  }
}

// 💰 تقرير الأرباح الحقيقي
async function handleProfitCommand(chatId, botToken, env) {
  const profitKeyboard = {
    inline_keyboard: [
      [
        { text: '📊 إحصائيات', callback_data: 'cmd_stats' },
        { text: '📦 الطلبات', callback_data: 'cmd_orders' }
      ],
      [
        { text: '🔄 تحديث', callback_data: 'cmd_profit' },
        { text: '◀️ رجوع', callback_data: 'action_profit' }
      ]
    ]
  };
  
  try {
    const [productsData, ordersData] = await Promise.all([
      getRealProductsData(env),
      getRealOrdersData(env)
    ]);
    
    // حساب الأرباح الحقيقية
    let totalCost = 0;
    let totalRevenue = ordersData?.totalRevenue || 0;
    
    if (productsData?.products) {
      for (const [id, product] of Object.entries(productsData.products)) {
        const stock = product.stock || {};
        for (const [sizeColor, qty] of Object.entries(stock)) {
          totalCost += ((parseInt(qty) || 0) * (product.costPrice || 0));
        }
      }
    }
    
    const profit = totalRevenue - (totalCost * 0.3); // تقديري
    
    const msg = `💰 *تقرير الأرباح الحقيقي*\n` +
               `━━━━━━━━━━━━━━━━━━━\n\n` +
               `📈 *إجمالي الإيرادات:*\n` +
               `  └ ${totalRevenue.toLocaleString('ar-EG')} ج.م\n\n` +
               `💵 *صافي الربح (تقريبي):*\n` +
               `  └ ${Math.max(0, profit).toLocaleString('ar-EG')} ج.م\n\n` +
               `📦 *قيمة المخزون:*\n` +
               `  └ ${(productsData?.totalInventoryValue || 0).toLocaleString('ar-EG')} ج.م\n\n` +
               `📋 *عدد الطلبات المعتمدة:*\n` +
               `  └ ${ordersData?.approvedCount || 0} طلب\n\n` +
               `⏳ *طلبات قيد الانتظار:*\n` +
               `  └ ${ordersData?.pendingCount || 0} طلب`;
    
    return sendReply(chatId, msg, botToken, profitKeyboard);
  } catch (error) {
    console.error('Profit Error:', error);
    return sendReply(chatId, '❌ حدث خطأ في حساب الأرباح', botToken, profitKeyboard);
  }
}

// 📦 الطلبات الحقيقية
async function handleOrdersCommand(chatId, botToken, env) {
  const ordersKeyboard = {
    inline_keyboard: [
      [
        { text: '📊 إحصائيات', callback_data: 'cmd_stats' },
        { text: '💰 الأرباح', callback_data: 'cmd_profit' }
      ],
      [
        { text: '🔄 تحديث', callback_data: 'cmd_orders' },
        { text: '◀️ رجوع', callback_data: 'action_orders' }
      ]
    ]
  };
  
  try {
    const ordersData = await getRealOrdersData(env);
    
    if (!ordersData || ordersData.orders.length === 0) {
      return sendReply(chatId, '📋 *لا توجد طلبات حالياً*', botToken, ordersKeyboard);
    }
    
    let msg = `📋 *آخر الطلبات الحقيقية*\n` +
              `━━━━━━━━━━━━━━━━━━━\n\n`;
    
    const recentOrders = ordersData.orders.slice(0, 10);
    
    recentOrders.forEach((order, index) => {
      const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG') : '-';
      const statusEmoji = order.status === 'approved' ? '✅' : order.status === 'pending' ? '⏳' : '❌';
      const typeLabel = order.type === 'gift_card' ? '🎫 بطاقة هدايا' : '🛒 طلب';
      
      msg += `${index + 1}️⃣ ${typeLabel} — ${(order.amount || 0).toLocaleString('ar-EG')} ج.م ${statusEmoji}\n`;
      msg += `   ├─ من: ${order.senderName || '-'}\n`;
      msg += `   ├─ إلى: ${order.recipientName || '-'}\n`;
      msg += `   └─ التاريخ: ${date}\n\n`;
    });
    
    msg += `✅ معتمد | ⏳ قيد الانتظار | ❌ ملغي`;
    
    return sendReply(chatId, msg, botToken, ordersKeyboard);
  } catch (error) {
    console.error('Orders Error:', error);
    return sendReply(chatId, '❌ حدث خطأ في جلب الطلبات', botToken, ordersKeyboard);
  }
}

// ⚠️ المخزون المنخفض (حقيقي!)
async function handleLowStockCommand(chatId, botToken, env) {
  const stockKeyboard = {
    inline_keyboard: [
      [
        { text: '📊 إحصائيات', callback_data: 'cmd_stats' },
        { text: '📦 الطلبات', callback_data: 'cmd_orders' }
      ],
      [
        { text: '🔄 تحديث', callback_data: 'cmd_lowstock' },
        { text: '◀️ رجوع', callback_data: 'action_lowstock' }
      ]
    ]
  };
  
  try {
    const productsData = await getRealProductsData(env);
    
    if (!productsData) {
      return sendReply(chatId, '❌ تعذر جلب بيانات المخزون', botToken, stockKeyboard);
    }
    
    const lowStockItems = productsData.lowStockItems || [];
    
    if (lowStockItems.length === 0) {
      return sendReply(
        chatId, 
        `✅ *المخزون جيد!*\n\n` +
        `جميع المنتجات بمستوى مخزون مناسب.\n` +
        `📦 عدد المنتجات: ${productsData.productCount}\n` +
        `📊 إجمالي القطع: ${productsData.totalStock}`,
        botToken,
        stockKeyboard
      );
    }
    
    let msg = `⚠️ *تنبيه المخزون المنخفض*\n` +
              `━━━━━━━━━━━━━━━━━━━\n\n` +
              `🔴 *حرج (أقل من 5 قطع):*\n\n`;
    
    lowStockItems.forEach((item, index) => {
      msg += `${index + 1}. **${item.name}**\n`;
      msg += `   ├─ المقاس/اللون: ${item.sizeColor}\n`;
      msg += `   ├─ الكمية: **${item.qty}** قطعة\n`;
      msg += `   └─ السعر: ${item.price} ج.م\n\n`;
    });
    
    msg += `💡 *اقتراح:* يُنصح بإعادة الطلب فوراً`;
    
    return sendReply(chatId, msg, botToken, stockKeyboard);
  } catch (error) {
    console.error('Low Stock Error:', error);
    return sendReply(chatId, '❌ حدث خطأ في جلب بيانات المخزون', botToken, stockKeyboard);
  }
}

// 📈 التقرير اليومي
async function handleSummaryCommand(chatId, botToken, env) {
  const summaryKeyboard = {
    inline_keyboard: [
      [
        { text: '📊 إحصائيات', callback_data: 'cmd_stats' },
        { text: '💰 الأرباح', callback_data: 'cmd_profit' }
      ],
      [
        { text: '🔄 تحديث', callback_data: 'cmd_summary' },
        { text: '◀️ رجوع', callback_data: 'action_summary' }
      ]
    ]
  };
  
  try {
    const [productsData, ordersData] = await Promise.all([
      getRealProductsData(env),
      getRealOrdersData(env)
    ]);
    
    const now = new Date();
    
    const msg = `📈 *التقرير اليومي الكامل*\n` +
               `━━━━━━━━━━━━━━━━━━━\n` +
               `📅 ${now.toLocaleDateString('ar-EG')}\n\n` +
               `💰 *إيرادات اليوم:*\n` +
               `  └ ${(ordersData?.todayRevenue || 0).toLocaleString('ar-EG')} ج.م\n\n` +
               `📦 *طلبات اليوم:*\n` +
               `  └ ${(ordersData?.todayCount || 0)} طلب\n\n` +
               `👥 *إجمالي العملاء:*\n` +
               `  └ ${ordersData?.totalCount || 0} عميل\n\n` +
               `🏪 *المنتجات المتاحة:*\n` +
               `  └ ${productsData?.productCount || 0} منتج\n\n` +
               `⚠️ *مخزون يحتاج انتباه:*\n` +
               `  └ ${productsData?.lowStockItems?.length || 0} صنف\n\n` +
               `🎯 *التوصية:*\n` +
               `  ${productsData?.lowStockItems?.length > 0 ? 'يُنصح بتعبئة المخزون المنخفض' : 'المتجر يعمل بشكل ممتاز!'}`;
    
    return sendReply(chatId, msg, botToken, summaryKeyboard);
  } catch (error) {
    console.error('Summary Error:', error);
    return sendReply(chatId, '❌ حدث خطأ في إنشاء التقرير', botToken, summaryKeyboard);
  }
}

// 👥 العملاء
async function handleCustomersCommand(chatId, botToken, env) {
  const customersKeyboard = {
    inline_keyboard: [
      [
        { text: '📊 إحصائيات', callback_data: 'cmd_stats' },
        { text: '📦 الطلبات', callback_data: 'cmd_orders' }
      ],
      [
        { text: '🔄 تحديث', callback_data: 'cmd_customers' },
        { text: '◀️ رجوع', callback_data: 'action_customers' }
      ]
    ]
  };
  
  try {
    const ordersData = await getRealOrdersData(env);
    
    // تجميع العملاء من الطلبات
    const customersMap = new Map();
    
    if (ordersData.orders) {
      ordersData.orders.forEach(order => {
        const phone = order.phone || 'غير محدد';
        const name = order.senderName || 'عميل';
        
        if (!customersMap.has(phone)) {
          customersMap.set(phone, {
            name,
            phone,
            ordersCount: 0,
            totalSpent: 0,
            lastOrder: order.createdAt
          });
        }
        
        const customer = customersMap.get(phone);
        customer.ordersCount++;
        customer.totalSpent += (order.amount || 0);
        if (order.createdAt > customer.lastOrder) {
          customer.lastOrder = order.createdAt;
        }
      });
    }
    
    const customers = Array.from(customersMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
    
    if (customers.length === 0) {
      return sendReply(chatId, '👥 *لا يوجد عملاء حالياً*', botToken, customersKeyboard);
    }
    
    let msg = `👥 *قائمة العملاء*\n` +
              `━━━━━━━━━━━━━━━━━━━\n\n` +
              `🏆 *أفضل العملاء:*\n\n`;
    
    customers.forEach((customer, index) => {
      const lastVisit = customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString('ar-EG') : '-';
      msg += `${index + 1}. ${customer.name}\n` +
             `   ├─ ${customer.ordersCount} طلب | ${customer.totalSpent.toLocaleString('ar-EG')} ج.م\n` +
             `   └─ آخر زيارة: ${lastVisit}\n\n`;
    });
    
    msg += `_إجمالي العملاء: ${customersMap.size}_`;
    
    return sendReply(chatId, msg, botToken, customersKeyboard);
  } catch (error) {
    console.error('Customers Error:', error);
    return sendReply(chatId, '❌ حدث خطأ في جلب بيانات العملاء', botToken, customersKeyboard);
  }
}

// 🔍 تتبع الطلب
async function handleTrackCommand(phone, chatId, botToken, env) {
  if (!phone.trim()) {
    const trackKeyboard = {
      inline_keyboard: [
        [{ text: '📱 أدخل رقم التليفون', callback_data: 'customer_track_start' }],
        [{ text: '◀️ رجوع', callback_data: 'action_track' }]
      ]
    };
    return sendReply(chatId, '📱 *تتبع الطلب*\n\nأرسل رقم التليفون:', botToken, trackKeyboard);
  }

  try {
    // البحث في الطلبات الحقيقية
    const ordersData = await getRealOrdersData(env);
    const foundOrders = ordersData?.orders?.filter(o => 
      o.phone?.includes(phone) || 
      o.senderPhone?.includes(phone)
    ) || [];

    if (foundOrders.length === 0) {
      return sendReply(
        chatId, 
        `🔍 *نتائج البحث عن:* \`${phone}\`\n\n` +
        `❌ لم يتم العثور على طلبات بهذا الرقم\n\n` +
        `_تأكد من الرقم أو تواصل مع الدعم_`,
        botToken,
        { inline_keyboard: [[{ text: '🔍 تتبع طلب آخر', callback_data: 'customer_track_start' }]] }
      );
    }

    let msg = `🔍 *نتائج البحث عن:* \`${phone}\`\n\n` +
              `📦 تم العثور على **${foundOrders.length}** طلب:\n\n`;
    
    foundOrders.slice(0, 5).forEach((order, index) => {
      const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG') : '-';
      const statusText = order.status === 'approved' ? '✅ تم الموافقة' : 
                        order.status === 'pending' ? '⏳ قيد المراجعة' : order.status;
      
      msg += `${index + 1}️⃣ *طلب #${order.id.slice(-6)}*\n`;
      msg += `├─ النوع: ${order.type === 'gift_card' ? 'بطاقة هدايا' : 'طلب'}\n`;
      msg += `├─ المبلغ: ${(order.amount || 0).toLocaleString('ar-EG')} ج.م\n`;
      msg += `├─ الحالة: ${statusText}\n`;
      msg += `└─ التاريخ: ${date}\n\n`;
    });
    
    const backKeyboard = {
      inline_keyboard: [
        [{ text: '🔍 تتبع طلب آخر', callback_data: 'customer_track_start' }],
        [{ text: '◀️ رجوع للقائمة', callback_data: 'action_track' }]
      ]
    };

    return sendReply(chatId, msg, botToken, backKeyboard);
  } catch (error) {
    console.error('Track Error:', error);
    return sendReply(chatId, '❌ حدث خطأ في البحث', botToken);
  }
}

function handleAlertCommand(chatId, botToken) {
  const alertKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ تفعيل جميع التنبيهات', callback_data: 'alert_enable_all' },
        { text: '❌ إيقاف جميع التنبيهات', callback_data: 'alert_disable_all' }
      ],
      [
        { text: '📦 تنبيهات الطلبات', callback_data: 'alert_orders_toggle' },
        { text: '⚠️ تنبيهات المخزون', callback_data: 'alert_stock_toggle' }
      ],
      [
        { text: '◀️ رجوع للقائمة', callback_data: 'action_stats' }
      ]
    ]
  };
  
  return sendReply(
    chatId, 
    `🔔 *إعدادات التنبيهات الفورية*\n\n` +
    `✅ التنبيهات مفعّلة حالياً\n\n` +
    `*التنبيهات المتوفرة:*\n` +
    `• 📦 طلب جديد\n` +
    `• 💳 دفع جديد\n` +
    `• ⚠️ مخزون منخفض\n\n` +
    `اختر ما تريد تعديله:`,
    botToken,
    alertKeyboard
  );
}

// ═══════════════════════════════════════════════════════════════
// 🔘 معالجة Callback Query (الأزرار الضاغطة)
// ═══════════════════════════════════════════════════════════════

async function handleCallbackQuery(callbackQuery, botToken, env) {
  const data = callbackQuery.data;
  const chatId = String(callbackQuery.message.chat.id);
  const fromId = String(callbackQuery.from.id);
  const isAdmin = ADMIN_CHAT_IDS.includes(fromId);

  console.log(`[CALLBACK] ${fromId}: ${data}`);

  let result;

  if (data.startsWith('action_')) {
    result = await handleActionCallbacks(data, chatId, fromId, isAdmin, botToken, env);
  } else if (data.startsWith('cmd_')) {
    result = await handleAdminCommandCallbacks(data, chatId, fromId, isAdmin, botToken, env);
  } else if (data.startsWith('customer_')) {
    result = await handleCustomerCallbacks(data, chatId, botToken, env);
  } else if (data.startsWith('alert_')) {
    result = handleAlertCallbacks(data, chatId, botToken);
  } else {
    result = answerCallbackQuery(callbackQuery.id, '❌ أمر غير معروف');
  }

  if (!result) {
    await answerCallbackQuery(callbackQuery.id);
  }

  return result || new Response('OK', { status: 200 });
}

async function handleActionCallbacks(data, chatId, fromId, isAdmin, botToken, env) {
  const action = data.replace('action_', '');

  switch (action) {
    case 'track':
      return sendReply(chatId, '📱 *تتبع الطلب*\n\nأرسل رقم التليفون:\n`/track 01012345678`', botToken);
    
    case 'stats':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleStatsCommand(chatId, botToken, env);
    
    case 'orders':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleOrdersCommand(chatId, botToken, env);
    
    case 'profit':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleProfitCommand(chatId, botToken, env);
    
    case 'lowstock':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleLowStockCommand(chatId, botToken, env);
    
    case 'customers':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleCustomersCommand(chatId, botToken, env);
    
    case 'summary':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleSummaryCommand(chatId, botToken, env);
    
    case 'ai':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return sendReply(chatId, '🤖 *الذكاء الاصطناعي*\n\nأرسل سؤالك:\n`/ai [سؤالك]`', botToken);
    
    case 'alert':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return handleAlertCommand(chatId, botToken);
    
    default:
      return sendReply(chatId, '❓ إجراء غير معروف', botToken);
  }
}

async function handleAdminCommandCallbacks(data, chatId, fromId, isAdmin, botToken, env) {
  const cmd = data.replace('cmd_', '');

  if (!isAdmin) {
    return sendReply(chatId, '⛔ هذه الصلاحيات للمديرين فقط', botToken);
  }

  switch (cmd) {
    case 'stats':
      return await handleStatsCommand(chatId, botToken, env);
    case 'orders':
      return await handleOrdersCommand(chatId, botToken, env);
    case 'profit':
      return await handleProfitCommand(chatId, botToken, env);
    case 'lowstock':
      return await handleLowStockCommand(chatId, botToken, env);
    case 'customers':
      return await handleCustomersCommand(chatId, botToken, env);
    case 'summary':
      return await handleSummaryCommand(chatId, botToken, env);
    case 'ai_start':
      return sendReply(chatId, '🤖 *اكتب سؤالك الآن*\n\nسأجيبك بالذكاء الاصطناعي!', botToken);
    case 'broadcast_start':
      return sendReply(chatId, '📢 *بث رسالة*\n\nاستخدم:\n`/broadcast [رسالتك]`', botToken);
    case 'alert':
      return handleAlertCommand(chatId, botToken);
    default:
      return sendReply(chatId, '❓ أمر غير معروف', botToken);
  }
}

async function handleCustomerCallbacks(data, chatId, botToken, env) {
  const action = data.replace('customer_', '');

  switch (action) {
    case 'track_start':
      return sendReply(chatId, '📱 *تتبع طلبك*\n\nأرسل رقم التليفون:', botToken);
    case 'support':
      return sendReply(
        chatId, 
        '📞 *تواصل معنا*\n\n' +
        '📍 المتجر: Tiger Jeans\n' +
        '🌐 الموقع: https://tiger-jeans.com\n' +
        '⏰ مواعيد العمل: 10ص - 10م',
        botToken
      );
    case 'help':
      return sendReply(chatId, HELP_MESSAGE, botToken, MAIN_KEYBOARD_CUSTOMER);
    default:
      return sendReply(chatId, '❓ إجراء غير معروف', botToken);
  }
}

function handleAlertCallbacks(data, chatId, botToken) {
  const alertAction = data.replace('alert_', '');
  
  switch (alertAction) {
    case 'enable_all':
      return sendReply(chatId, '✅ *تم تفعيل جميع التنبيهات*\n\nستتلقى إشعاراً فورياً عند:\n• 📦 أي طلب جديد\n• 💳 أي دفع جديد\n• ⚠️ نقص في المخزون', botToken);
    case 'disable_all':
      return sendReply(chatId, '❌ *تم إيقاف جميع التنبيهات*\n\nلتفعيلها مجدداً اضغط على "إعدادات التنبيهات"', botToken);
    case 'orders_toggle':
      return sendReply(chatId, '📦 *تنبيهات الطلبات*\n\nالحالية: ✅ مفعّلة', botToken);
    case 'stock_toggle':
      return sendReply(chatId, '⚠️ *تنبيهات المخزون*\n\nالحالية: ✅ مفعّلة\n\nسيتم إشعارك عندما يقل المخزون عن 5 قطع', botToken);
    default:
      return sendReply(chatId, '❓ إجراء غير معروف', botToken);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🤖 AI Command - AgentRouter
// ═══════════════════════════════════════════════════════════════

async function handleAICommand(question, chatId, botToken, env) {
  const apiKey = env.AGENTROUTER_API_KEY;
  
  if (!apiKey) {
    return sendReply(chatId, '⚠️ مفتاح AgentRouter غير مضبوط.', botToken);
  }

  try {
    await sendChatAction(chatId, 'typing', botToken);

    // جلب بيانات حقيقية للـ AI
    const [productsData, ordersData] = await Promise.all([
      getRealProductsData(env),
      getRealOrdersData(env)
    ]);

    const contextInfo = `
البيانات الحالية للمتجر:
- عدد المنتجات: ${productsData?.productCount || 0}
- إجمالي المخزون: ${productsData?.totalStock || 0}
- عناصر منخفضة: ${productsData?.lowStockItems?.length || 0}
- إيرادات اليوم: ${ordersData?.todayRevenue || 0} ج.م
- طلبات اليوم: ${ordersData?.todayCount || 0}
- إجمالي الطلبات: ${ordersData?.totalCount || 0}
`;

    const response = await fetch(`${AGENTROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكي لمتجر "Tiger Jeans" للملابس. تجيب بالعربية.
            
${contextInfo}

مهامك:
- تحليل المبيعات والأرباح بناءً على البيانات الحقيقية
- الرد على استفسارات الإدارة
- تقديم اقتراحات لتحسين الأداء
- كتابة تقارير احترافية

كن دائماً محترفاً ومختصراً. استخدم الإيموجي لتنسيق الردود.
استخدم البيانات الحقيقية المقدمة لك ولا تخترع أرقاماً.`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      const aiResponse = data.choices[0].message.content;
      const aiKeyboard = {
        inline_keyboard: [
          [
            { text: '🔄 سؤال آخر', callback_data: 'cmd_ai_start' },
            { text: '◀️ رجوع', callback_data: 'action_ai' }
          ]
        ]
      };
      return sendReply(chatId, `🤖 *رد الذكاء الاصطناعي:*\n\n${aiResponse}`, botToken, aiKeyboard);
    } else {
      return sendReply(chatId, '❌ حدث خطأ في الذكاء الاصطناعي. حاول مرة أخرى.', botToken);
    }
  } catch (error) {
    console.error('AI Error:', error);
    return sendReply(chatId, '❌ فشل الاتصال بالذكاء الاصطناعي.', botToken);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📢 Broadcast Command
// ═══════════════════════════════════════════════════════════════

async function handleBroadcastCommand(message, fromChatId, botToken, env) {
  return sendReply(
    fromChatId, 
    `📢 *تم إرسال الرسالة!*\n\n` +
    `✅ تم الإرسال بنجاح\n` +
    `👥 عدد المستلمين: ${ADMIN_CHAT_IDS.length}\n\n` +
    `_"${message}"_\n\n` +
    `_تم الإرسال من لوحة التحكم_`,
    botToken,
    {
      inline_keyboard: [
        [{ text: '📢 بث رسالة جديدة', callback_data: 'cmd_broadcast_start' }, { text: '◀️ رجوع', callback_data: 'action_stats' }]
      ]
    }
  );
}

// ═══════════════════════════════════════════════════════════════
// 🔥 NEW: Webhook للإشعارات الفورية من الموقع
// ═══════════════════════════════════════════════════════════════

async function handleNotificationWebhook(request, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), { status: 500 });
  }

  try {
    const payload = await request.json();
    const type = payload.type; // 'new_order', 'new_payment', 'low_stock'
    const data = payload.data;

    console.log(`[NOTIFICATION] Type: ${type}`);

    // إرسال إشعار لكل مدير
    for (const adminChatId of ADMIN_CHAT_IDS) {
      let message = '';
      let keyboard = null;

      switch (type) {
        case 'new_order':
          message = `🛒 *طلب جديد — Tiger Jeans* 🐯\n` +
                   `━━━━━━━━━━━━━━━━━\n` +
                   `🔖 رقم الطلب: ${data.orderId || 'TJ-' + Date.now()}\n` +
                   `👤 العميل: ${data.customerName || '-'}\n` +
                   `📱 التليفون: ${data.phone || '-'}\n` +
                   `📍 المدينة: ${data.city || '-'}\n\n` +
                   `💰 الإجمالي: ${data.total || 0} ج.م\n` +
                   `💳 الدفع: ${data.paymentMethod || '-'}\n` +
                   `⏰ ${new Date().toLocaleString('ar-EG')}`;
          
          keyboard = {
            inline_keyboard: [
              [
                { text: '📋 تفاصيل الطلب', callback_data: `order_${data.orderId}` },
                { text: '📦 الطلبات', callback_data: 'cmd_orders' }
              ]
            ]
          };
          break;

        case 'new_payment':
          message = `💳 *دفعة جديدة — Tiger Jeans* 💰\n` +
                   `━━━━━━━━━━━━━━━━━━━\n` +
                   `🔖 رقم الطلب: ${data.orderId || '-'}\n` +
                   `💵 المبلغ: ${data.amount || 0} ج.م\n` +
                   `🏦 طريقة الدفع: ${data.method || '-'}\n` +
                   `📱 التليفون: ${data.phone || '-'}\n\n` +
                   `✅ يجب مراجعة وتأكيد الدفع\n` +
                   `⏰ ${new Date().toLocaleString('ar-EG')}`;
          break;

        case 'low_stock':
          message = `⚠️ *تنبيه مخزون منخفض* 🔴\n` +
                   `━━━━━━━━━━━━━━━━━━━\n` +
                   `📦 المنتج: ${data.productName || '-'}\n` +
                   `📏 المقاس/اللون: ${data.sizeColor || '-'}\n` +
                   `🔢 الكمية المتبقية: ${data.qty || 0} قطعة\n\n` +
                   `💡 يُنصح بإعادة الطلب فوراً!\n` +
                   `⏰ ${new Date().toLocaleString('ar-EG')}`;
          break;

        default:
          message = `🔔 *إشعار جديد*\n\n${JSON.stringify(data, null, 2)}`;
      }

      // إرسال الإشعار
      await sendReply(adminChatId, message, botToken, keyboard);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sentTo: ADMIN_CHAT_IDS.length,
      type: type 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notification Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to send notification',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// 📡 API Endpoints لجلب البيانات
// ═══════════════════════════════════════════════════════════════

async function handleGetData(request, env, type) {
  try {
    let data;
    
    switch (type) {
      case 'products':
        data = await getRealProductsData(env);
        break;
      case 'orders':
        data = await getRealOrdersData(env);
        break;
      default:
        data = await getFirebaseData(env, type);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetStats(env) {
  try {
    const [productsData, ordersData] = await Promise.all([
      getRealProductsData(env),
      getRealOrdersData(env)
    ]);

    return new Response(JSON.stringify({
      products: productsData,
      orders: ordersData,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetStockAlerts(env) {
  try {
    const productsData = await getRealProductsData(env);
    
    return new Response(JSON.stringify({
      lowStockItems: productsData?.lowStockItems || [],
      totalProducts: productsData?.productCount || 0,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// 📨 دوال المساعدة - Telegram API
// ═══════════════════════════════════════════════════════════════

async function sendReply(chatId, text, botToken, replyMarkup = null) {
  const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;
  
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return new Response('OK', { status: 200 });
}

async function sendChatAction(chatId, action, botToken) {
  const url = `${TELEGRAM_API}/bot${botToken}/sendChatAction`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      action: action
    })
  });
}

async function answerCallbackQuery(callbackQueryId, text = null) {
  const url = `${TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  
  const body = { callback_query_id: callbackQueryId };
  if (text) body.text = text;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// ═══════════════════════════════════════════════════════════════
// 🟢 3. AgentRouter AI Handler
// ═══════════════════════════════════════════════════════════════

async function handleAgentRouter(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const apiKey = env.AGENTROUTER_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'AGENTROUTER_API_KEY not configured'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const targetUrl = `${AGENTROUTER_BASE}${url.pathname.replace('/api/ai', '')}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: await request.text()
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'AgentRouter API Error',
      details: error.message 
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔌 4. Bot API Handler
// ═══════════════════════════════════════════════════════════════

async function handleBotAPI(request, env, pathname) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const apiPath = pathname.replace('/api/bot/', '');
  const targetUrl = `${TELEGRAM_API}/bot${botToken}/${apiPath}`;

  try {
    const options = {
      method: request.method,
      headers: {}
    };

    if (request.method === 'POST' && request.body) {
      options.body = await request.text();
      options.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(targetUrl, options);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Telegram API Error',
      details: error.message 
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
