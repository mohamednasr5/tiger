/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Tiger Jeans - Cloudflare Worker v3.0 (NVIDIA NIM ONLY)     ║
 * ║  =========================================================== ║
 * ║  ✅ كل الذكاء الاصطناعي يعتمد على NVIDIA NIM API           ║
 * ║  ✅ إصلاح مشكلة توقف البوت                                ║
 * ║  ✅ بيانات حقيقية من Firebase                              ║
 * ║  ✅ إشعارات فورية للطلبات والمخزون                         ║
 * ║  ✅ معالجة أخطاء محسنة                                     ║
 * ╚══════════════════════════════════════════════════════════════╝
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
// 🎯 نقاط النهاية (Endpoints) - NVIDIA NIM API فقط
// ═══════════════════════════════════════════════════════════════

// ✅ NVIDIA NIM API - المصدر الوحيد للذكاء الاصطناعي
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';
const TELEGRAM_API = 'https://api.telegram.org';

// 🔧 إعدادات نموذج NVIDIA NIM
const NVIDIA_MODEL = 'meta/llama-3.1-70b-instruct'; // نموذج قوي ومستقر
const NVIDIA_FALLBACK_MODEL = 'meta/llama-3.1-8b-instruct'; // بديل أخف

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
  { command: 'ai', description: '🤖 سؤال للذكاء الاصطناعي' }
];

// ═══════════════════════════════════════════════════════════════
// ⌨️ لوحات المفاتيح الثابتة
// ═══════════════════════════════════════════════════════════════

const MAIN_KEYBOARD_CUSTOMER = {
  keyboard: [
    [{ text: '🛒 المتجر' }, { text: '📦 تتبع طلب' }],
    [{ text: '🎁 بطاقات هدايا' }, { text: '🤖 اسأل الذكاء الاصطناعي' }],
    [{ text: '📞 تواصل معنا' }, { text: '❓ مساعدة' }]
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
  is_persistent: true
};

const MAIN_KEYBOARD_ADMIN = {
  keyboard: [
    [{ text: '📊 الإحصائيات' }, { text: '📦 آخر الطلبات' }],
    [{ text: '💰 تقرير الأرباح' }, { text: '⚠️ المخزون المنخفض' }],
    [{ text: '🔔 إعدادات التنبيهات' }, { text: '⚙️ إعدادات الدفع' }],
    [{ text: '🤖 اسأل الذكاء الاصطناعي' }, { text: '📋 القائمة الرئيسية' }]
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
  is_persistent: true
};

// ═══════════════════════════════════════════════════════════════
// 📨 رسائل النظام
// ═══════════════════════════════════════════════════════════════

const WELCOME_MESSAGE = `
🐯 *مرحباً بك في متجر Tiger Jeans!*

*أنا مساعدك الذكي، كيف أقدر أساعدك؟*

استخدم الأوامر التالية:
• 🛒 اضغط *المتجر* لعرض المنتجات
• 📦 اضغط *تتبع طلب* لمتابعة طلبك
• 🎁 اضغط *بطاقات هدايا* لشراء هدايا
• 🤖 اضغط *اسأل الذكاء الاصطناعي* لأي سؤال
• 📞 اضغط *تواصل معنا* للدعم الفني

أو اكتب سؤالك مباشرة وسأرد عليك ذكياً! 🚀
`;

const HELP_MESSAGE = `
📚 *دليل المساعدة - Tiger Jeans Bot*

*🔹 أوامر عامة:*
• /start - تشغيل البوت
• /menu - عرض القائمة
• /track [رقم الطلب] - تتبع الطلب
• /help - هذه الرسالة
• /ai [سؤالك] - سؤال للذكاء الاصطناعي

*🔹 أوامر المديرين:*
• /stats - إحصائيات المتجر
• /orders - آخر 10 طلبات
• /profit - تقرير الأرباح
• /lowstock - المنتجات منخفضة المخزون

*📞 للدعم:* تواصل معنا عبر الصفحة الرئيسية
`;

// ═══════════════════════════════════════════════════════════════
// 🔌 دوال Firebase
// ═══════════════════════════════════════════════════════════════

async function getFirebaseData(path, env) {
  try {
    const res = await fetch(`${env.FIREBASE_URL}/${path}.json`, {
      headers: { 'Authorization': `Bearer ${env.FIREBASE_TOKEN}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Firebase error:', e);
    return null;
  }
}

async function getRealProductsData(env) {
  const data = await getFirebaseData('products', env);
  if (!data || typeof data !== 'object') return [];
  
  return Object.entries(data)
    .map(([id, p]) => ({
      id,
      name: p.name || p.title || 'منتج بدون اسم',
      price: p.price || 0,
      stock: p.stock || p.quantity || 0,
      category: p.category || 'عام',
      ...(p.size && { size: p.size }),
      ...(p.color && { color: p.color })
    }))
    .filter(p => p && p.name);
}

async function getRealOrdersData(env) {
  const data = await getFirebaseData('orders', env);
  if (!data || typeof data !== 'object') return [];
  
  return Object.entries(data)
    .map(([id, o]) => ({
      id,
      code: o.code || o.orderCode || `TJ-${id.slice(0, 6)}`,
      total: o.total || o.totalPrice || 0,
      status: o.status || 'pending',
      customer: o.customer?.name || 'عميل',
      phone: o.customer?.phone || '',
      createdAt: o.createdAt || Date.now(),
      items: o.items || [],
      payment: o.payment?.method || 'unknown'
    }))
    .filter(o => o && o.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);
}

async function getGiftCardRequestsData(env) {
  const data = await getFirebaseData('giftCardRequests', env);
  if (!data || typeof data !== 'object') return [];
  
  return Object.entries(data)
    .map(([id, r]) => ({
      id,
      amount: r.amount || 0,
      senderName: r.senderName || '',
      senderPhone: r.senderPhone || '',
      recipientName: r.recipientName || '',
      status: r.status || 'pending',
      paymentMethod: r.paymentMethod || r.payment?.method || '-',
      createdAt: r.createdAt || Date.now()
    }))
    .filter(r => r && r.id)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ═══════════════════════════════════════════════════════════════
// 🤖 NVIDIA NIM API - الذكاء الاصطناعي الموحد
// ═══════════════════════════════════════════════════════════════

/**
 * إرسال طلب لـ NVIDIA NIM API (للبوت والموقع)
 * @param {string} prompt - السؤال أو الرسالة
 * @param {string} systemPrompt - سياق النظام
 * @param {object} env - متغيرات البيئة
 * @param {boolean} isBot - هل هو للبوت أم للموقع
 * @returns {Promise<string>} - رد الذكاء الاصطناعي
 */
async function callNVIDIANIM(prompt, systemPrompt, env, isBot = true) {
  const apiKey = env.NVIDIA_API_KEY;
  
  if (!apiKey) {
    throw new Error(isBot ? 'NVIDIA_API_KEY غير مضبوط' : 'NVIDIA_API_KEY not configured');
  }

  // تحديد النموذج بناءً على السياق
  const model = NVIDIA_MODEL;
  
  try {
    const response = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: isBot ? 1024 : 2048,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`NVIDIA API Error (${response.status}):`, errorText);
      
      // محاولة بالنموذج البديل إذا فشل النموذج الرئيسي
      if (model === NVIDIA_MODEL) {
        console.log('Trying fallback model...');
        try {
          const fallbackResponse = await fetch(`${NVIDIA_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              model: NVIDIA_FALLBACK_MODEL,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: isBot ? 512 : 1024
            })
          });
          
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            return data.choices?.[0]?.message?.content || 'عذراً، لم أفهم سؤالك.';
          }
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError);
        }
      }
      
      throw new Error(`NVIDIA API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from NVIDIA API');
    }
    
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error('NVIDIA NIM API Error:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🤖 نظام AI للبوت (يعتمد على NVIDIA NIM)
// ═══════════════════════════════════════════════════════════════

/**
 * معالجة أوامر AI للبوت باستخدام NVIDIA NIM
 */
async function handleAICommand(question, chatId, botToken, env) {
  try {
    // إرسال حالة الكتابة
    await sendChatAction(chatId, 'typing', botToken);

    // جلب بيانات حقيقية للـ AI
    let contextInfo = '';
    try {
      const [productsData, ordersData] = await Promise.all([
        getRealProductsData(env),
        getRealOrdersData(env)
      ]);

      contextInfo = `
بيانات المتجر الحالية (${new Date().toLocaleDateString('ar-EG')}):

📦 المنتجات المتاحة (${productsData.length}):
${productsData.slice(0, 10).map(p => `- ${p.name}: ${p.price} ج.م (المخزون: ${p.stock})`).join('\n')}

📋 آخر الطلبات (${ordersData.length}):
${ordersData.slice(0, 5).map(o => `- ${o.code}: ${o.total} ج.م (${o.status})`).join('\n')}
`;
    } catch (dataError) {
      console.error('Error fetching data for AI:', dataError);
      contextInfo = 'لا تتوفر بيانات حالياً.';
    }

    // سياق النظام للبوت
    const systemPrompt = `أنت مساعد ذكي لمتجر "Tiger Jeans" للملابس في مصر. تجيب بالعربية الفصحى البسيطة والودودة.

${contextInfo}

قواعد مهمة:
1. تج دائماً بالعربية
2. كن ودوداً ومحترفاً
3. إذا سئلت عن المنتجات، استخدم البيانات المتوفرة أعلاه
4. إذا سئلت عن الأسعار، اذكر أنها بالجنية المصري
5. إذا لم تعرف إجابة، قل "لسا متأكد، هتواصل مع الدعم الفني ويرد عليك"
6. لا تعطِ معلومات خاطئة
7. كن مختصراً وواضحاً
8. المتجر ي_ship لكل مصر

معلومات المتجر:
- الاسم: Tiger Jeans (تايجر جينز)
- التخصص: بناطيل جينز وملابس عصرية
- الشحن: لكل محافظات مصر
- الدفع: فودافون كاش، انستاباي، عند الاستلام، بطاقات هدايا`;

    // استدعاء NVIDIA NIM API
    const response = await callNVIDIANIM(question, systemPrompt, env, true);

    // إرسال الرد
    return sendReply(chatId, response, botToken);

  } catch (error) {
    console.error('AI Command Error:', error);
    
    // رسالة خطأ واضحة للمستخدم
    return sendReply(chatId, 
      `❌ حدث خطأ في الاتصال بالذكاء الاصطناعي\n\n` +
      `🔄 حاول مرة أخرى بعد ثواني...\n\n` +
      `إذا استمرت المشكلة، تواصل مع الدعم الفني.`, 
      botToken
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// 📨 دوال Telegram API
// ═══════════════════════════════════════════════════════════════

async function sendReply(chatId, text, botToken, keyboard = null) {
  try {
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };
    
    if (keyboard) {
      body.reply_markup = keyboard;
    }

    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('Telegram sendReply error:', err);
    }
    
    return res;
  } catch (e) {
    console.error('sendReply error:', e);
    return null;
  }
}

async function sendChatAction(chatId, action, botToken) {
  try {
    await fetch(`${TELEGRAM_API}/bot${botToken}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: action })
    });
  } catch (e) {
    console.error('sendChatAction error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 أوامر المديرين
// ═══════════════════════════════════════════════════════════════

async function handleStatsCommand(chatId, botToken, env) {
  try {
    await sendChatAction(chatId, 'typing', botToken);
    
    const [products, orders, giftRequests] = await Promise.all([
      getRealProductsData(env),
      getRealOrdersData(env),
      getGiftCardRequestsData(env)
    ]);
    
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const lowStockProducts = products.filter(p => (p.stock || 0) < 5);
    
    const statsMessage = `📊 *إحصائيات متجر Tiger Jeans*
    
📦 *المنتجات:* ${products.length} منتج
💰 *إجمالي المبيعات:* ${totalRevenue.toLocaleString()} ج.م
📋 *الطلبات:* ${orders.length} طلب
⏳ *طلبات معلقة:* ${pendingOrders}
🎁 *طلبات الهدايا:* ${giftRequests.length}
⚠️ *منتجات منخفضة:* ${lowStockProducts.length}

📅 *تحديث:* ${new Date().toLocaleDateString('ar-EG')}
🕐 *الوقت:* ${new Date().toLocaleTimeString('ar-EG')}`;

    return sendReply(chatId, statsMessage, botToken, MAIN_KEYBOARD_ADMIN);
  } catch (e) {
    console.error('Stats error:', e);
    return sendReply(chatId, '❌ حدث خطأ في جلب الإحصائيات', botToken);
  }
}

async function handleOrdersCommand(chatId, botToken, env) {
  try {
    await sendChatAction(chatId, 'typing', botToken);
    
    const orders = await getRealOrdersData(env);
    
    if (!orders.length) {
      return sendReply(chatId, '📭 لا توجد طلبات حالياً', botToken, MAIN_KEYBOARD_ADMIN);
    }
    
    const ordersList = orders.slice(0, 10).map((o, i) => 
      `${i+1}. *${o.code}* - ${o.total} ج.م [${o.status}]`
    ).join('\n');

    const message = `📦 *آخر 10 طلبات:*\n\n${ordersList}\n\n📅 *إجمالي الطلبات:* ${orders.length}`;

    return sendReply(chatId, message, botToken, MAIN_KEYBOARD_ADMIN);
  } catch (e) {
    console.error('Orders error:', e);
    return sendReply(chatId, '❌ حدث خطأ في جلب الطلبات', botToken);
  }
}

async function handleProfitCommand(chatId, botToken, env) {
  try {
    await sendChatAction(chatId, 'typing', botToken);
    
    const orders = await getRealOrdersData(env);
    const giftRequests = await getGiftCardRequestsData(env);
    
    const orderRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const giftRevenue = giftRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalRevenue = orderRevenue + giftRevenue;
    
    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
    const pendingPayments = orders.filter(o => o.status === 'pending_verification' || o.payment === 'vodafone' || o.payment === 'instapay').length;

    const profitMessage = `💰 *تقرير الأرباح - Tiger Jeans*

💵 *إيرادات الطلبات:* ${orderRevenue.toLocaleString()} ج.م
🎁 *إيرادات الهدايا:* ${giftRevenue.toLocaleString()} ج.م
━━━━━━━━━━━━━━━━━━
🏆 *إجمالي الإيرادات:* ${totalRevenue.toLocaleString()} ج.م

📦 *طلبات مكتملة:* ${completedOrders}
⏳ *في انتظار التحقق:* ${pendingPayments}

📅 *التقرير:* ${new Date().toLocaleDateString('ar-EG')}`;

    return sendReply(chatId, profitMessage, botToken, MAIN_KEYBOARD_ADMIN);
  } catch (e) {
    console.error('Profit error:', e);
    return sendReply(chatId, '❌ حدث خطأ في حساب الأرباح', botToken);
  }
}

async function handleLowStockCommand(chatId, botToken, env) {
  try {
    await sendChatAction(chatId, 'typing', botToken);
    
    const products = await getRealProductsData(env);
    const lowStock = products.filter(p => (p.stock || 0) < 5).sort((a, b) => a.stock - b.stock);
    
    if (!lowStock.length) {
      return sendReply(chatId, '✅ جميع المنتجات مخزونة بشكل جيد!', botToken, MAIN_KEYBOARD_ADMIN);
    }
    
    const stockList = lowStock.map((p, i) =>
      `${i+1}. *${p.name}* - المتبقي: ${p.stock} قطعة`
    ).join('\n');

    const message = `⚠️ *تنبيه المخزون المنخفض:*\n\n${stockList}\n\n📦 *عدد المنتجات:* ${lowStock.length}`;

    return sendReply(chatId, message, botToken, MAIN_KEYBOARD_ADMIN);
  } catch (e) {
    console.error('LowStock error:', e);
    return sendReply(chatId, '❌ حدث خطأ في جلب بيانات المخزون', botToken);
  }
}

async function handleTrackCommand(orderCode, chatId, botToken, env) {
  try {
    await sendChatAction(chatId, 'typing', botToken);
    
    if (!orderCode) {
      return sendReply(chatId, '🔍 *لطفاً أرسل رقم الطلب*\n\nمثال: /track TJ-123456', botToken);
    }
    
    const orders = await getRealOrdersData(env);
    const order = orders.find(o => 
      o.code?.toLowerCase() === orderCode.toLowerCase().trim() ||
      o.id?.toLowerCase() === orderCode.toLowerCase().trim()
    );
    
    if (!order) {
      return sendReply(chatId, `❌ *الطلب غير موجود*\n\nرقم الطلب: ${orderCode}\n\nتأكد من رقم الطلب أو تواصل مع الدعم.`, botToken);
    }
    
    const statusEmoji = {
      'pending': '⏳',
      'confirmed': '✅',
      'processing': '🔄',
      'shipped': '🚚',
      'delivered': '✅',
      'cancelled': '❌',
      'pending_verification': '🔍',
      'pending_payment': '💰'
    };
    
    const statusArabic = {
      'pending': 'قيد المراجعة',
      'confirmed': 'تم التأكيد',
      'processing': 'جاري التحضير',
      'shipped': 'تم الشحن',
      'delivered': 'تم التوصيل',
      'cancelled': 'ملغي',
      'pending_verification': 'في انتظار التحقق',
      'pending_payment': 'في انتظار الدفع'
    };

    const trackMessage = `📦 *تفاصيل الطلب:*\n\n` +
      `🔢 *رقم الطلب:* ${order.code}\n` +
      `📊 *الحالة:* ${statusEmoji[order.status] || '📋'} ${statusArabic[order.status] || order.status}\n` +
      `💰 *الإجمالي:* ${order.total} ج.م\n` +
      `💳 *الدفع:* ${order.payment}\n` +
      `👤 *العميل:* ${order.customer}\n` +
      `📅 *التاريخ:* ${new Date(order.createdAt).toLocaleDateString('ar-EG')}`;

    return sendReply(chatId, trackMessage, botToken);
  } catch (e) {
    console.error('Track error:', e);
    return sendReply(chatId, '❌ حدث خطأ في تتبع الطلب', botToken);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔔 نظام الإشعارات
// ═══════════════════════════════════════════════════════════════

function formatNotificationMessage(notification) {
  switch (notification.type) {
    case 'new_order':
      return `🛒 *طلب جديد!*\n\n` +
        `🔢 *رقم الطلب:* ${notification.data.orderId}\n` +
        `👤 *العميل:* ${notification.data.customerName}\n` +
        `📱 *الهاتف:* ${notification.data.phone}\n` +
        `📍 *المدينة:* ${notification.data.city}\n` +
        `💰 *الإجمالي:* ${notification.data.total} ج.م\n` +
        `💳 *الدفع:* ${notification.data.paymentMethod}\n` +
        `🕐 *الوقت:* ${new Date().toLocaleTimeString('ar-EG')}`;
    
    case 'new_payment':
      return `💳 *دفعة جديدة!*\n\n` +
        `🔢 *الطلب:* ${notification.data.orderId}\n` +
        `💰 *المبلغ:* ${notification.data.amount} ج.م\n` +
        `🏦 *الطريقة:* ${notification.data.method}\n` +
        `📱 *الهاتف:* ${notification.data.phone}\n` +
        `🕐 *الوقت:* ${new Date().toLocaleTimeString('ar-EG')}`;
    
    case 'low_stock':
      return `⚠️ *نقص في المخزون!*\n\n` +
        `📦 *المنتج:* ${notification.data.productName}\n` +
        `🆔 *المعرف:* ${notification.data.productId}\n` +
        `📊 *المتبقي:* ${notification.data.qty} قطعة\n` +
        `💰 *السعر:* ${notification.data.price} ج.م\n` +
        `🕐 *الوقت:* ${new Date().toLocaleTimeString('ar-EG')}`;
    
    default:
      return `🔔 *إشعار جديد:*\n${JSON.stringify(notification.data, null, 2)}`;
  }
}

async function sendNotificationToAdmins(message, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  for (const adminId of ADMIN_CHAT_IDS) {
    try {
      await sendReply(adminId, message, botToken);
    } catch (e) {
      console.error(`Failed to notify admin ${adminId}:`, e);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 معالجة الرسائل والأوامر
// ═══════════════════════════════════════════════════════════════

async function handleMessage(text, chatId, botToken, env) {
  const isAdmin = ADMIN_CHAT_IDS.includes(chatId);
  const keyboard = isAdmin ? MAIN_KEYBOARD_ADMIN : MAIN_KEYBOARD_CUSTOMER;
  
  // التحقق من الأوامر
  if (text.startsWith('/')) {
    const parts = text.trim().split(/\s+/);
    const command = parts[0].toLowerCase().replace('/', '');
    const commandArgs = parts.slice(1).join(' ');
    
    switch (command) {
      case 'start':
        return sendReply(chatId, WELCOME_MESSAGE, botToken, keyboard);
        
      case 'menu':
        return sendReply(chatId, '📋 *القائمة الرئيسية*', botToken, keyboard);
        
      case 'help':
        return sendReply(chatId, HELP_MESSAGE, botToken, keyboard);
        
      case 'track':
        return await handleTrackCommand(commandArgs, chatId, botToken, env);
        
      case 'stats':
        if (!isAdmin) return sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        return await handleStatsCommand(chatId, botToken, env);
        
      case 'orders':
        if (!isAdmin) return sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        return await handleOrdersCommand(chatId, botToken, env);
        
      case 'profit':
        if (!isAdmin) return sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        return await handleProfitCommand(chatId, botToken, env);
        
      case 'lowstock':
        if (!isAdmin) return sendReply(chatId, '⛔ هذا الأمر للمديرين فقط.', botToken);
        return await handleLowStockCommand(chatId, botToken, env);
        
      case 'ai':
        if (!commandArgs.trim()) {
          return sendReply(chatId, '🤖 *اكتب سؤالك بعد /ai*\n\nمثال: /ai ما هي مقاسات الجينز المتاحة؟', botToken);
        }
        return await handleAICommand(commandArgs, chatId, botToken, env);
        
      default:
        return sendReply(chatId, '❓ إجراء غير معروف\n\nاكتب /help لعرض الأوامر المتاحة', botToken, keyboard);
    }
  }
  
  // معالجة النصوص العادية (الأزرار)
  switch (text) {
    case '🛒 المتجر':
      return sendReply(chatId, '🛒 *المتجر*\n\nزر موقعنا لتصفح جميع المنتجات:\n\nhttps://tiger-jeans.com/#products', botToken, keyboard);
      
    case '📦 تتبع طلب':
      return sendReply(chatId, '📦 *تتبع الطلب*\n\nأرسل رقم الطلب:\n\n/track [رقم الطلب]', botToken);
      
    case '🎁 بطاقات هدايا':
      return sendReply(chatId, '🎁 *بطاقات الهدايا*\n\nاشتري بطاقة هدايا لمن تحب!\n\nhttps://tiger-jeans.com/gift-cards.html', botToken, keyboard);
      
    case '🤖 اسأل الذكاء الاصطناعي':
      return sendReply(chatId, '🤖 *اسألني أي سؤال!*\n\nاكتب سؤالك مباشرة أو استخدم:\n\n/ai [سؤالك]', botToken, keyboard);
      
    case '📞 تواصل معنا':
      return sendReply(chatId, '📞 *تواصل معنا*\n\nhttps://tiger-jeans.com/contact.html\n\nأو واتساب: 01012345678', botToken, keyboard);
      
    case '❓ مساعدة':
      return sendReply(chatId, HELP_MESSAGE, botToken, keyboard);
      
    case '📊 الإحصائيات':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleStatsCommand(chatId, botToken, env);
      
    case '📦 آخر الطلبات':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleOrdersCommand(chatId, botToken, env);
      
    case '💰 تقرير الأرباح':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleProfitCommand(chatId, botToken, env);
      
    case '⚠️ المخزون المنخفض':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return await handleLowStockCommand(chatId, botToken, env);
      
    case '🔔 إعدادات التنبيهات':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return sendReply(chatId, '🔔 *إعدادات التنبيهات*\n\nجميع التنبيهات مفعّلة ✅\n\n• 📦 الطلبات الجديدة\n• 💳 المدفوعات\n• ⚠️ المخزون المنخفض', botToken, MAIN_KEYBOARD_ADMIN);
      
    case '⚙️ إعدادات الدفع':
      if (!isAdmin) return sendReply(chatId, '⛔ للمديرين فقط', botToken);
      return sendReply(chatId, '⚙️ *إعدادات الدفع*\n\nطرق الدفع المتاحة:\n• 💚 فودافون كاش\n• 💙 انستاباي\n• 📦 عند الاستلام\n• 🎁 بطاقة هدايا', botToken, MAIN_KEYBOARD_ADMIN);
      
    case '📋 القائمة الرئيسية':
      return sendReply(chatId, '📋 *القائمة الرئيسية*', botToken, keyboard);
      
    default:
      // التعامل مع أي نص آخر كسؤال للذكاء الاصطناعي
      if (text.length > 2) {
        return await handleAICommand(text, chatId, botToken, env);
      }
      return sendReply(chatId, '❓ لم أفهم رسالتك\n\nاكتب /help للمساعدة', botToken, keyboard);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🌐 API Endpoints
// ═══════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ════════════════════════════════════════════════════════
      // 🤖 AI Endpoint - للموقع (NVIDIA NIM)
      // ════════════════════════════════════════════════════════
      if (path.startsWith('/api/ai')) {
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'POST required' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const apiKey = env.NVIDIA_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'NVIDIA_API_KEY not configured' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const body = await request.json();
          
          // استخدام NVIDIA NIM API مباشرة
          const nvidiaResponse = await callNVIDIANIM(
            body.prompt || body.message || body.question || '',
            body.systemPrompt || `أنت مساعد ذكي لمتجر "Tiger Jeans" للملابس في مصر. تجيب بالعربية الفصحى البسيطة والودودة. تساعد العملاء في اختيار الملابس والإجابة على استفساراتهم.`,
            env,
            false
          );

          return new Response(JSON.stringify({
            success: true,
            reply: nvidiaResponse,
            provider: 'nvidia-nim',
            model: NVIDIA_MODEL
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (aiError) {
          console.error('Website AI Error:', aiError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'AI service temporarily unavailable',
            details: aiError.message 
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // ════════════════════════════════════════════════════════
      // 📱 Telegram Webhook
      // ════════════════════════════════════════════════════════
      if (path === '/telegram-webhook' || path === '/webhook') {
        if (request.method !== 'POST') {
          return new Response('Use POST', { status: 200 });
        }

        const update = await request.json();
        const botToken = env.TELEGRAM_BOT_TOKEN;
        
        if (!botToken) {
          console.error('TELEGRAM_BOT_TOKEN not set');
          return new Response('Bot token not configured', { status: 500 });
        }

        // معالجة الرسالة
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id.toString();
          const text = update.message.text;
          
          try {
            await handleMessage(text, chatId, botToken, env);
          } catch (handleError) {
            console.error('Handle message error:', handleError);
            
            // إرسال رسالة خطأ للمستخدم بدلاً من السكوت
            await sendReply(chatId, 
              '❌ حدث خطأ مؤقت، حاول مرة أخرى...', 
              botToken,
              ADMIN_CHAT_IDS.includes(chatId) ? MAIN_KEYBOARD_ADMIN : MAIN_KEYBOARD_CUSTOMER
            );
          }
        }

        // معالجة Callback Query (الأزرار)
        if (update.callback_query) {
          const callbackQuery = update.callback_query;
          const chatId = callbackQuery.message?.chat?.id?.toString() || '';
          const data = callbackQuery.data || '';
          
          if (chatId && data) {
            try {
              // تأكيد Callback
              await fetch(`${TELEGRAM_API}/bot${botToken}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: callbackQuery.id })
              });

              // معالجة الأمر
              await handleMessage(data, chatId, botToken, env);
            } catch (callbackError) {
              console.error('Callback error:', callbackError);
            }
          }
        }

        return new Response('OK', { status: 200 });
      }

      // ════════════════════════════════════════════════════════
      // 🔔 Notifications Webhook
      // ════════════════════════════════════════════════════════
      if (path === '/api/notifications/webhook') {
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'POST required' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const notification = await request.json();
          const message = formatNotificationMessage(notification);
          
          await sendNotificationToAdmins(message, env);
          
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Notification sent to admins' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (notifError) {
          console.error('Notification error:', notifError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: notifError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // ════════════════════════════════════════════════════════
      // 📊 Data Endpoints
      // ════════════════════════════════════════════════════════
      if (path === '/api/data/products') {
        const products = await getRealProductsData(env);
        return new Response(JSON.stringify(products), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/data/orders') {
        const orders = await getRealOrdersData(env);
        return new Response(JSON.stringify(orders), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/data/stats') {
        const [products, orders, giftRequests] = await Promise.all([
          getRealProductsData(env),
          getRealOrdersData(env),
          getGiftCardRequestsData(env)
        ]);
        
        const stats = {
          totalProducts: products.length,
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
          pendingOrders: orders.filter(o => o.status === 'pending').length,
          lowStockCount: products.filter(p => (p.stock || 0) < 5).length,
          giftCardRequests: giftRequests.length,
          lastUpdated: new Date().toISOString()
        };

        return new Response(JSON.stringify(stats), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/data/stock') {
        const products = await getRealProductsData(env);
        const lowStock = products.filter(p => (p.stock || 0) < 5).map(p => ({
          name: p.name,
          stock: p.stock,
          id: p.id,
          price: p.price
        }));

        return new Response(JSON.stringify(lowStock), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ════════════════════════════════════════════════════════
      // 🏠 Health Check & Default
      // ════════════════════════════════════════════════════════
      if (path === '/' || path === '/health') {
        return new Response(JSON.stringify({
          status: 'running',
          version: '3.0',
          aiProvider: 'nvidia-nim',
          nvidiaModel: NVIDIA_MODEL,
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Tiger Jeans Worker v3.0 (NVIDIA NIM)', { status: 200 });

    } catch (globalError) {
      console.error('Global worker error:', globalError);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: globalError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

console.log('🐯 Tiger Jeans Worker v3.0 loaded (NVIDIA NIM Only)');
