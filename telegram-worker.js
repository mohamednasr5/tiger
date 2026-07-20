/**
 * Tiger Jeans - Telegram Bot Cloudflare Worker
 * =============================================
 * هذا الـ Worker يتعامل مع:
 * 1. Webhook من تليجرام (استقبال الأوامر)
 * 2. إرسال الإشعارات للـ Admin
 * 3. تتبع الطلبات
 */

// ====== Firebase Configuration ======
const FIREBASE_CONFIG = {
  databaseURL: 'https://tiger-d1433-default-rtdb.firebaseio.com'
};

// ====== CORS Headers ======
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      // Route: /api/telegram/webhook - Receive updates from Telegram
      if (url.pathname === '/api/telegram/webhook' && request.method === 'POST') {
        return await handleTelegramWebhook(request);
      }
      
      // Route: /api/telegram/send - Send message to admin
      if (url.pathname === '/api/telegram/send' && request.method === 'POST') {
        return await handleSendMessage(request);
      }
      
      // Route: /api/telegram/track - Track order by phone
      if (url.pathname === '/api/telegram/track' && request.method === 'GET') {
        return await handleTrackOrder(url);
      }

      // Default response
      return new Response(JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: [
          '/api/telegram/webhook',
          '/api/telegram/send', 
          '/api/telegram/track?phone=XXX'
        ]
      }), { status: 404, headers: corsHeaders });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: corsHeaders });
    }
  }
};

// ====== Handle Telegram Webhook Updates ======
async function handleTelegramWebhook(request) {
  const update = await request.json();
  
  console.log('Received update:', JSON.stringify(update));

  // Extract message info
  const message = update.message || update.callback_query?.message;
  
  if (!message) {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  const chatId = message.chat.id;
  const text = message.text || '';
  const userId = message.from?.id;

  // Check if it's a command
  if (text.startsWith('/')) {
    const [command, ...args] = text.split(' ');
    const argsString = args.join(' ');
    
    const response = await processCommand(command, argsString, chatId, userId);
    return await sendTelegramResponse(chatId, response);
  }

  // If not a command, show help or track if it looks like a phone number
  if (/^\d{10,11}$/.test(text.replace(/\s/g, ''))) {
    const response = await processCommand('/track', text, chatId, userId);
    return await sendTelegramResponse(chatId, response);
  }

  // Default: Show welcome message
  const welcomeResponse = {
    text: `
🐯 <b>مرحباً بك في بوت Tiger Jeans!</b>

أنا هنا لمساعدتك في تتبع طلباتك ومعرفة حالة المخزون.

<b>الأوامر المتاحة:</b>
• /start - تشغيل البوت
• /track [رقم التليفون] - تتبع طلبك
• /stats - إحصائيات المتجر
• /lowstock - المنتجات شبه النفاذة
• /help - المساعدة

💡 <i>يمكنك إرسال رقم تليفونك مباشرة لتتبع طلبك</i>
    `.trim(),
    parse_mode: 'HTML'
  };

  return await sendTelegramResponse(chatId, welcomeResponse);
}

// ====== Process Bot Commands ======
async function processCommand(command, args, chatId, userId) {
  switch (command.toLowerCase()) {
    case '/start':
      return {
        text: `
🐯 <b>مرحباً بك في بوت Tiger Jeans!</b> 🎉

أنا بوت متجر تايجر جينز الرسمي للمساعدة في:

📦 <b>تتبع الطلبات</b> - اعرف حالة طلبك لحظة بلحظة
📊 <b>الإحصائيات</b> - أحدث المعلومات عن المتجر
⚠️ <b>المخزون</b> تعرف على المنتجات المتوفرة

<b>للبدء، أرسل:</b>
/track [رقم التليفون] - لتتبع طلبك
/help - لعرض جميع الأوامر

🛒 <a href="https://tigerjeans.store">زيارة المتجر</a>
        `.trim(),
        parse_mode: 'HTML'
      };

    case '/help':
    case '/commands':
      return {
        text: `
📚 <b>دليل أوامر بوت Tiger Jeans</b>
━━━━━━━━━━━━━━━━━

<b>🔍 للأعمالاء والعملاء:</b>
/track 01012345678
→ تتبع حالة طلب برقم التليفون

<b>📊 للأدمن فقط:</b>
/stats → إحصائيات سريعة
/lowstock → المخزون المنخفض
/orders → آخر 10 طلبات
/summary → تقرير اليوم الكامل

<b>🛠️ عام:</b>
/start → تشغيل البوت
/help → عرض هذه المساعدة

━━━━━━━━━━━━━━━━━
💡 <i>يمكنك إرسال رقم التليفون مباشرة بدون أمر</i>
        `.trim(),
        parse_mode: 'HTML'
      };

    case '/track':
      if (!args || args.trim() === '') {
        return {
          text: `🔍 <b>لتتبع طلبك، أرسل الأمر مع رقم تليفونك:</b>

<code>/track 01012345678</code>

أو أرسل رقم التليفون مباشرة`,
          parse_mode: 'HTML'
        };
      }
      
      return await fetchOrderTracking(args.trim());

    case '/stats':
      return await fetchStats();

    case '/lowstock':
      return await fetchLowStockReport();

    case '/orders':
      return await fetchRecentOrders(10);

    case '/summary':
      return await fetchDailySummary();

    default:
      return {
        text: `❌ الأمر "${command}" غير معروف

أرسل /help لعرض الأوامر المتاحة`,
        parse_mode: 'HTML'
      };
  }
}

// ====== Fetch Data from Firebase ======
async function fetchFromFirebase(path) {
  const url = `${FIREBASE_CONFIG.databaseURL}/${path}.json`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Firebase error: ${response.status}`);
  }
  
  return await response.json();
}

// ====== Order Tracking Function ======
async function fetchOrderTracking(phoneNumber) {
  try {
    // Clean phone number
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('20')) cleanPhone = cleanPhone.substring(2);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

    // Fetch orders and preorders in parallel
    const [ordersData, preordersData] = await Promise.all([
      fetchFromFirebase('orders'),
      fetchFromFirebase('preorders')
    ]);

    const orders = ordersData || {};
    const preorders = preordersData || {};

    // Filter customer orders
    const customerOrders = Object.entries(orders)
      .filter(([id, order]) => {
        const orderPhone = (order.customer?.phone || '').replace(/\D/g, '');
        return orderPhone.includes(cleanPhone) || cleanPhone.includes(orderPhone);
      })
      .map(([id, order]) => ({ id, ...order }));

    // Filter customer preorders
    const customerPreorders = Object.entries(preorders)
      .filter(([id, po]) => {
        const poPhone = (po.phone || po.customer?.phone || '').replace(/\D/g, '');
        return poPhone.includes(cleanPhone) || cleanPhone.includes(poPhone);
      })
      .map(([id, po]) => ({ id, ...po }));

    // Build response
    let message = `🔍 <b>نتائج البحث عن:</b> <code>${phoneNumber}</code>\n\n`;

    if (customerOrders.length > 0) {
      message += `<b>🛒 الطلبات العادية (${customerOrders.length}):</b>\n\n`;
      
      customerOrders.forEach(order => {
        const statusMap = {
          'pending': '⏳ قيد الانتظار',
          'confirmed': '✅ مؤكد',
          'processing': '🔄 قيد التجهيز',
          'shipped': '🚚 تم الشحن',
          'delivered': '🎉 تم التسليم',
          'cancelled': '❌ ملغي'
        };
        
        const status = statusMap[order.status] || order.status || 'غير محدد';
        const date = new Date(order.createdAt).toLocaleDateString('ar-EG');
        
        message += `┌─ <b>${order.orderCode || order.id}</b>\n`;
        message += `│ 💰 ${formatPrice(order.totalPrice || order.total)}\n`;
        message += `│ ${status}\n`;
        message += `│ 📅 ${date}\n`;
        message += `└──────────────\n`;
      });
    }

    if (customerPreorders.length > 0) {
      message += `\n<b>📋 الطلبات المسبقة (${customerPreorders.length}):</b>\n\n`;
      
      customerPreorders.forEach(po => {
        const date = new Date(po.createdAt).toLocaleDateString('ar-EG');
        
        message += `┌─ <b>طلب مسبق #${po.id}</b>\n`;
        message += `│ 📦 ${po.productName || po.product?.name || 'N/A'}\n`;
        message += `│ 📏 ${po.size || '-'} | 🎨 ${po.color || '-'}\n`;
        message += `│ 🔢 ×${po.quantity || po.qty || 1}\n`;
        message += `│ 📅 ${date}\n`;
        message += `└──────────────\n`;
      });
    }

    if (customerOrders.length === 0 && customerPreorders.length === 0) {
      message += `❌ لم يتم العثور على أي طلبات مرتبطة بهذا الرقم\n\n`;
      message += `💡 تأكد من:\n`;
      message += `• كتابة الرقم بشكل صحيح\n`;
      message += `• استخدام الرقم المسجل في الطلب`;
    }

    return { text: message, parse_mode: 'HTML' };

  } catch (error) {
    console.error('Track order error:', error);
    return {
      text: `❌ حدث خطأ أثناء البحث\n\nيرجى المحاولة مرة أخرى لاحقاً`,
      parse_mode: 'HTML'
    };
  }
}

// ====== Stats Function ======
async function fetchStats() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0].replace(/-/g, '').slice(0, 8);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [ordersData, productsData] = await Promise.all([
      fetchFromFirebase('orders'),
      fetchFromFirebase('products')
    ]);

    const orders = Object.values(ordersData || {});
    
    let todaySales = 0, todayCount = 0;
    let monthSales = 0, monthCount = 0;

    orders.forEach(order => {
      const total = order.totalPrice || order.total || 0;
      const orderDate = order.createdAt;

      if (orderDate) {
        const orderStr = orderDate.toString();
        if (orderStr.includes(today.replace(/-/g, '')) || 
            (typeof orderDate === 'string' && orderDate >= today)) {
          todayCount++;
          todaySales += total;
        }
        if (orderDate >= monthStart) {
          monthCount++;
          monthSales += total;
        }
      }
    });

    const productCount = Object.keys(productsData || {}).length;
    const totalOrders = orders.length;

    return {
      text: `
📊 <b>إحصائيات سريعة - Tiger Jeans</b> 🐯
━━━━━━━━━━━━━━━━━

<b>📅 اليوم (${now.toLocaleDateString('ar-EG')}):</b>
🛒 عدد الطلبات: <b>${todayCount}</b>
💵 المبيعات: <b>${formatPrice(todaySales)}</b>

<b>📆 هذا الشهر:</b>
🛒 عدد الطلبات: <b>${monthCount}</b>
💵 المبيعات: <b>${formatPrice(monthSales)}</b>

<b>📦 عام:</b>
إجمالي المنتجات: <b>${productCount}</b>
إجمالي الطلبات: <b>${totalOrders}</b>

⏰ آخر تحديث: ${now.toLocaleTimeString('ar-EG')}
      `.trim(),
      parse_mode: 'HTML'
    };

  } catch (error) {
    return { text: `❌ خطأ: ${error.message}`, parse_mode: 'HTML' };
  }
}

// ====== Low Stock Report ======
async function fetchLowStockReport() {
  try {
    const productsData = await fetchFromFirebase('products');
    const products = productsData || {};
    
    const lowStockItems = [];

    Object.entries(products).forEach(([productId, product]) => {
      if (!product.stock) return;
      
      Object.entries(product.stock).forEach(([key, quantity]) => {
        if (quantity <= 2 && quantity > 0) {
          const [size, color] = key.split('_');
          lowStockItems.push({
            name: product.name,
            size: size || 'افتراضي',
            color: color || 'افتراضي',
            qty: quantity
          });
        }
      });
    });

    if (lowStockItems.length === 0) {
      return {
        text: `✅ <b>تقرير المخزون - Tiger Jeans</b>\n\n🎉 جميع المنتجات بمستوى مخزون جيد! لا توجد أصناف تحتاج إعادة تعبئة.`,
        parse_mode: 'HTML'
      };
    }

    let message = `⚠️ <b>تقرير المخزون المنخفض - Tiger Jeans</b> 🔴\n\n`;
    message += `<b>📦 ${lowStockItems.length} صنف يحتاج إعادة تعبئة:</b>\n\n`;

    lowStockItems.forEach((item, idx) => {
      message += `${idx + 1}. <b>${item.name}</b>\n`;
      message += `   📏 ${item.size} | 🎨 ${item.color} | 🔢 <b>${item.qty}</b> قطعة\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━\n`;
    message += `<i>آخر تحديث: ${new Date().toLocaleString('ar-EG')}</i>`;

    return { text: message, parse_mode: 'HTML' };

  } catch (error) {
    return { text: `❌ خطأ: ${error.message}`, parse_mode: 'HTML' };
  }
}

// ====== Recent Orders ======
async function fetchRecentOrders(limit = 10) {
  try {
    const ordersData = await fetchFromFirebase('orders');
    const allOrders = Object.entries(ordersData || {});
    
    // Sort by createdAt descending and take last N
    const recentOrders = allOrders
      .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0))
      .slice(0, limit);

    if (recentOrders.length === 0) {
      return { text: '📭 لا توجد طلبات حتى الآن', parse_mode: 'HTML' };
    }

    let message = `📋 <b>آخر ${recentOrders.length} طلبات:</b>\n\n`;
    
    recentOrders.forEach(([id, order], idx) => {
      const statusEmojis = {
        'pending': '⏳',
        'confirmed': '✅',
        'processing': '🔄',
        'shipped': '🚚',
        'delivered': '🎉',
        'cancelled': '❌'
      };
      
      const emoji = statusEmojis[order.status] || '📋';
      const name = order.customer?.name || '-';
      const total = formatPrice(order.totalPrice || order.total);
      
      message += `${idx + 1}. ${emoji} <code>${order.orderCode || id}</code>\n`;
      message += `   👤 ${name} | 💰 ${total}\n\n`;
    });

    return { text: message, parse_mode: 'HTML' };

  } catch (error) {
    return { text: `❌ خطأ: ${error.message}`, parse_mode: 'HTML' };
  }
}

// ====== Daily Summary ======
async function fetchDailySummary() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const ordersData = await fetchFromFirebase('orders');
    const allOrders = Object.values(ordersData || {});

    // Filter today's orders
    const todayOrders = allOrders.filter(o => {
      const date = o.createdAt;
      if (!date) return false;
      const dateStr = typeof date === 'string' ? date : new Date(date).toISOString();
      return dateStr.startsWith(todayStr);
    });

    const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0);
    const totalShipping = todayOrders.reduce((sum, o) => sum + (o.shippingCost || o.shipping || 0), 0);

    // By payment method
    const byPayment = {};
    todayOrders.forEach(o => {
      const method = o.paymentMethod || 'other';
      byPayment[method] = (byPayment[method] || 0) + 1;
    });

    // By status
    const byStatus = {};
    todayOrders.forEach(o => {
      const status = o.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    let message = `📊 <b>التقرير اليومي الكامل</b>\n`;
    message += `📅 ${today.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    
    message += `<b>📈 ملخص:</b>\n`;
    message += `• إجمالي الطلبات: <b>${todayOrders.length}</b>\n`;
    message += `• إجمالي المبيعات: <b>${formatPrice(totalRevenue)}</b>\n`;
    message += `• مصاريف الشحن: <b>${formatPrice(totalShipping)}</b>\n`;
    message += `• صافي الربح: <b>${formatPrice(totalRevenue - totalShipping)}</b>\n\n`;

    message += `<b>💳 حسب الدفع:</b>\n`;
    Object.entries(byPayment).forEach(([m, c]) => {
      message += `• ${m}: ${c} طلب\n`;
    });

    message += `\n<b>📊 الحالات:</b>\n`;
    Object.entries(byStatus).forEach(([s, c]) => {
      message += `• ${s}: ${c}\n`;
    });

    return { text: message, parse_mode: 'HTML' };

  } catch (error) {
    return { text: `❌ خطأ: ${error.message}`, parse_mode: 'HTML' };
  }
}

// ====== Send Message to Telegram ======
async function sendTelegramResponse(chatId, response) {
  // Get bot token from request or environment
  // For webhook responses, we need to know which bot this is for
  
  // This is a placeholder - in production, you'd store bot tokens securely
  // For now, we'll return the response to be sent by the caller
  
  return new Response(JSON.stringify({
    ok: true,
    method: 'sendMessage',
    chat_id: chatId,
    ...response
  }), { headers: corsHeaders });
}

// ====== Handle Send Message API ======
async function handleSendMessage(request) {
  const body = await request.json();
  const { botToken, chatId, text, parseMode = 'HTML' } = body;

  if (!botToken || !chatId || !text) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing required fields: botToken, chatId, text'
    }), { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
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

    if (result.ok) {
      return new Response(JSON.stringify({
        success: true,
        messageId: result.result.message_id
      }), { headers: corsHeaders });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: result.description
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

// ====== Handle Track Order API ======
async function handleTrackOrder(url) {
  const phone = url.searchParams.get('phone');

  if (!phone) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing phone parameter'
    }), { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  const result = await fetchOrderTracking(phone);

  return new Response(JSON.stringify(result), { headers: corsHeaders });
}

// ====== Utility Functions ======
function formatPrice(price) {
  return Number(price || 0).toLocaleString('ar-EG') + ' ج.م';
}
