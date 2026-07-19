// ====== Tiger Jeans - Telegram Bot Integration ======
// بوت تليجرام متكامل مع لوحة التحكم و Firebase

// ====== إعدادات البوت ======
const TELEGRAM_CONFIG = {
  botToken: '', // سيتم حفظه من لوحة التحكم
  chatId: '',   // معرف الدردشة (Admin Chat ID)
  workerUrl: 'https://tigerorder.studegy10.workers.dev',
  enabled: false
};

// ====== تحميل الإعدادات من Firebase ======
async function loadTelegramSettings() {
  try {
    const snapshot = await db.ref('settings/telegram').once('value');
    const settings = snapshot.val();
    if (settings) {
      TELEGRAM_CONFIG.botToken = settings.botToken || '';
      TELEGRAM_CONFIG.chatId = settings.chatId || '';
      TELEGRAM_CONFIG.enabled = settings.enabled || false;
    }
    return TELEGRAM_CONFIG;
  } catch (error) {
    console.error('Error loading Telegram settings:', error);
    return TELEGRAM_CONFIG;
  }
}

// ====== حفظ الإعدادات في Firebase ======
async function saveTelegramSettings(settings) {
  try {
    await db.ref('settings/telegram').set({
      botToken: settings.botToken || '',
      chatId: settings.chatId || '',
      enabled: settings.enabled || false,
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    // تحديث الـ config المحلي
    TELEGRAM_CONFIG.botToken = settings.botToken || '';
    TELEGRAM_CONFIG.chatId = settings.chatId || '';
    TELEGRAM_CONFIG.enabled = settings.enabled || false;
    
    return true;
  } catch (error) {
    console.error('Error saving Telegram settings:', error);
    return false;
  }
}

// ====== إرسال رسالة عبر البوت ======
async function sendTelegramMessage(message, parseMode = 'HTML') {
  if (!TELEGRAM_CONFIG.enabled || !TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId) {
    console.log('Telegram not configured or disabled');
    return { success: false, error: 'Not configured' };
  }

  try {
    // محاولة الإرسال عبر Worker أولاً
    const response = await fetch(`${TELEGRAM_CONFIG.workerUrl}/api/telegram/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: TELEGRAM_CONFIG.botToken,
        chatId: TELEGRAM_CONFIG.chatId,
        text: message,
        parseMode: parseMode
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Telegram message sent via Worker');
      return result;
    } else {
      // فشل Worker - نحاول مباشرة
      return await sendDirectToTelegram(message, parseMode);
    }
  } catch (error) {
    console.error('Worker failed, trying direct:', error);
    return await sendDirectToTelegram(message, parseMode);
  }
}

// ====== إرسال مباشر لـ Telegram API (Backup) ======
async function sendDirectToTelegram(message, parseMode = 'HTML') {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CONFIG.chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Telegram message sent directly');
      return { success: true };
    } else {
      console.error('Telegram API error:', result.description);
      return { success: false, error: result.description };
    }
  } catch (error) {
    console.error('Direct send failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// 📢 قوالب الإشعارات الجاهزة
// ============================================

// ====== إشعار طلب جديد ======
async function notifyNewOrder(orderData) {
  const order = orderData.order || orderData;
  const items = order.items || [];
  
  let itemsList = items.map((item, idx) => 
    `📦 ${item.name} (${item.size || '-'}/${item.color || '-'}) × ${item.qty} = ${fmtPrice(item.price * item.qty)}`
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
💰 <b>الإجمالي:</b> <b>${fmtPrice(total)}</b>
🚚 <b>الشحن:</b> ${fmtPrice(shippingCost)}
💳 <b>طريقة الدفع:</b> ${order.paymentMethod || 'N/A'}
⏰ <b>التاريخ:</b> ${new Date(order.createdAt || Date.now()).toLocaleString('ar-EG')}
  `.trim();

  return await sendTelegramMessage(message);
}

// ====== إشعار تأكيد الدفع ======
async function notifyPaymentConfirmation(orderData) {
  const order = orderData.order || orderData;
  
  const message = `
✅ <b>تأكيد دفع - Tiger Jeans</b> 💰
━━━━━━━━━━━━━━━━━

🔖 <b>رقم الطلب:</b> <code>${order.orderCode || order.id}</code>
👤 <b>العميل:</b> ${order.customer?.name}
📱 <b>التليفون:</b> <code>${order.customer?.phone}</code>

💰 <b>المبلغ المدفوع:</b> <b>${fmtPrice(order.totalPrice || order.total)}</b>
💳 <b>طريقة الدفع:</b> ${order.paymentMethod || 'N/A'}
📸 <b>حالة الإيصال:</b> ${order.receiptUrl ? 'تم الرفع ✅' : 'لم يتم ❌'}

⏰ <b>تاريخ التأكيد:</b> ${new Date().toLocaleString('ar-EG')}

━━━━━━━━━━━━━━━━━
<i>يرجى مراجعة الإيصال والموافقة على الطلب</i>
  `.trim();

  return await sendTelegramMessage(message);
}

// ====== إشعار طلب مسبق جديد ======
async function notifyNewPreOrder(preOrderData) {
  const preOrder = preOrderData.preOrder || preOrderData;
  
  const message = `
📋 <b>طلب مسبق جديد - Tiger Jeans</b> ⏳
━━━━━━━━━━━━━━━━━

🔖 <b>رقم الطلب:</b> <code>${preOrder.id || preOrder.preOrderId || 'N/A'}</code>
👤 <b>العميل:</b> ${preOrder.customer?.name || preOrder.name || 'غير محدد'}
📱 <b>التليفون:</b> <code>${preOrder.customer?.phone || preOrder.phone || 'N/A'}</code>

📦 <b>المنتج المطلوب:</b> ${preOrder.productName || preOrder.product?.name || 'N/A'}
📏 <b>المقاس:</b> ${preOrder.size || 'N/A'}
🎨 <b>اللون:</b> ${preOrder.color || 'N/A'}
🔢 <b>الكمية:</b> ${preOrder.quantity || preOrder.qty || 1}

💬 <b>ملاحظات:</b> ${preOrder.notes || 'لا توجد'}

⏰ <b>التاريخ:</b> ${new Date(preOrder.createdAt || Date.now()).toLocaleString('ar-EG')}

━━━━━━━━━━━━━━━━━
<i>هذا طلب مسبق - يرجى التواصل مع العميل عند توفر المنتج</i>
  `.trim();

  return await sendTelegramMessage(message);
}

// ====== إشعار انخفاض المخزون ======
async function notifyLowStock(productName, size, color, currentStock, threshold = 2) {
  const message = `
⚠️ <b>تنبيه مخزون منخفض - Tiger Jeans</b> 🔴
━━━━━━━━━━━━━━━━━

📦 <b>المنتج:</b> ${productName}
📏 <b>المقاس:</b> ${size || 'كل المقاسات'}
🎨 <b>اللون:</b> ${color || 'كل الألوان'}
🔢 <b>الكمية الحالية:</b> <b>${currentStock}</b> قطعة
⚡ <b>الحد الأدنى:</b> ${threshold} قطعة

⏰ <b>وقت التنبيه:</b> ${new Date().toLocaleString('ar-EG')}

━━━━━━━━━━━━━━━━━
<i>يرجى إعادة تعبئة المخزون في أقرب وقت</i>
  `.trim();

  return await sendTelegramMessage(message);
}

// ====== إشعار تغيير حالة الطلب ======
async function notifyOrderStatusChange(orderData, oldStatus, newStatus) {
  const order = orderData.order || orderData;
  
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

  return await sendTelegramMessage(message);
}

// ====== إشعار يومي - ملخص المبيعات ======
async function sendDailySummary(salesData) {
  const { 
    totalOrders = 0, 
    totalRevenue = 0, 
    totalShipping = 0,
    topProducts = [],
    ordersByPayment = {}
  } = salesData;

  let productsText = '';
  if (topProducts.length > 0) {
    productsText = '\n\n<b>🏆 أكثر المنتجات مبيعاً:</b>\n' + 
      topProducts.slice(0, 5).map((p, i) => `${i+1}. ${p.name} (${p.qty} قطعة)`).join('\n');
  }

  const paymentMethods = Object.entries(ordersByPayment).map(([method, count]) => 
    `• ${method}: ${count} طلب`
  ).join('\n') || 'لا توجد';

  const message = `
📊 <b>التقرير اليومي - Tiger Jeans</b> 🐯
━━━━━━━━━━━━━━━━━
📅 <b>اليوم:</b> ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

<b>📈 الإحصائيات:</b>
🛒 عدد الطلبات: <b>${totalOrders}</b>
💵 إجمالي المبيعات: <b>${fmtPrice(totalRevenue)}</b>
🚚 مصاريف الشحن: <b>${fmtPrice(totalShipping)}</b>
💰 صافي الربح التقريبي: <b>${fmtPrice(totalRevenue - totalShipping)}</b>

<b>💳 الطلبات حسب طريقة الدفع:</b>
${paymentMethods}${productsText}

━━━━━━━━━━━━━━━━━
<i>تقرير تلقائي من نظام Tiger Jeans</i>
  `.trim();

  return await sendTelegramMessage(message);
}

// ============================================
// 🔍 أوامر البوت للعملاء والأدمن
// ============================================

// ====== تتبع حالة طلب برقم التليفون ======
async function trackOrderByPhone(phoneNumber) {
  if (!phoneNumber) {
    return { success: false, error: 'رقم التليفون مطلوب' };
  }

  try {
    // تنظيف رقم التليفون
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('20')) cleanPhone = cleanPhone.substring(2);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

    // البحث في الطلبات العادية
    const ordersSnapshot = await db.ref('orders').orderByChild('customer/phone').once('value');
    const orders = ordersSnapshot.val() || {};
    
    const customerOrders = Object.entries(orders)
      .filter(([id, order]) => {
        const orderPhone = (order.customer?.phone || '').replace(/\D/g, '');
        return orderPhone.includes(cleanPhone) || cleanPhone.includes(orderPhone);
      })
      .map(([id, order]) => ({ id, ...order }));

    // البحث في الطلبات المسبقة
    const preordersSnapshot = await db.ref('preorders').orderByChild('phone').once('value');
    const preorders = preordersSnapshot.val() || {};

    const customerPreorders = Object.entries(preorders)
      .filter(([id, po]) => {
        const poPhone = (po.phone || po.customer?.phone || '').replace(/\D/g, '');
        return poPhone.includes(cleanPhone) || cleanPhone.includes(poPhone);
      })
      .map(([id, po]) => ({ id, ...po }));

    // بناء الرسالة
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
        
        message += `┌─ <b>${order.orderCode || order.id}</b>\n`;
        message += `│ 💰 ${fmtPrice(order.totalPrice || order.total)} | ${status}\n`;
        message += `│ 📅 ${new Date(order.createdAt).toLocaleDateString('ar-EG')}\n`;
        message += `└──────────────\n`;
      });
    }

    if (customerPreorders.length > 0) {
      message += `\n<b>📋 الطلبات المسبقة (${customerPreorders.length}):</b>\n\n`;
      customerPreorders.forEach(po => {
        message += `┌─ <b>طلب مسبق #${po.id}</b>\n`;
        message += `│ 📦 ${po.productName || po.product?.name}\n`;
        message += `│ 📏 ${po.size || '-'} | 🎨 ${po.color || '-'} | ×${po.quantity || po.qty || 1}\n`;
        message += `│ ⏰ ${new Date(po.createdAt).toLocaleDateString('ar-EG')}\n`;
        message += `└──────────────\n`;
      });
    }

    if (customerOrders.length === 0 && customerPreorders.length === 0) {
      message += `❌ لم يتم العثور على أي طلبات مرتبطة بهذا الرقم`;
    }

    return await sendTelegramMessage(message);

  } catch (error) {
    console.error('Error tracking order:', error);
    return { success: false, error: error.message };
  }
}

// ====== عرض المخزون المنخفض ======
async function getLowStockReport() {
  try {
    const productsSnapshot = await db.ref('products').once('value');
    const products = productsSnapshot.val() || {};
    
    const lowStockItems = [];

    Object.entries(products).forEach(([productId, product]) => {
      if (!product.stock) return;
      
      Object.entries(product.stock).forEach(([key, quantity]) => {
        if (quantity <= 2 && quantity > 0) {
          const [size, color] = key.split('_');
          lowStockItems.push({
            productId,
            productName: product.name,
            size: size || 'افتراضي',
            color: color || 'افتراضي',
            quantity
          });
        }
      });
    });

    if (lowStockItems.length === 0) {
      const message = `✅ <b>تقرير المخزون - Tiger Jeans</b>\n\n🎉 جميع المنتجات بمستوى مخزون جيد! لا توجد أصناف تحتاج إعادة تعبئة.`;
      return await sendTelegramMessage(message);
    }

    let message = `⚠️ <b>تقرير المخزون المنخفض - Tiger Jeans</b> 🔴\n\n`;
    message += `<b>📦 ${lowStockItems.length} صنف يحتاج إعادة تعبئة:</b>\n\n`;

    lowStockItems.forEach((item, idx) => {
      message += `${idx + 1}. <b>${item.productName}</b>\n`;
      message += `   📏 ${item.size} | 🎨 ${item.color} | 🔢 <b>${item.quantity}</b> قطعة\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━\n`;
    message += `<i>آخر تحديث: ${new Date().toLocaleString('ar-EG')}</i>`;

    return await sendTelegramMessage(message);

  } catch (error) {
    console.error('Error getting low stock report:', error);
    return { success: false, error: error.message };
  }
}

// ====== إحصائيات سريعة ======
async function getQuickStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const ordersSnapshot = await db.ref('orders').once('value');
    const orders = ordersSnapshot.val() || {};
    
    let todaySales = 0;
    let todayOrders = 0;
    let monthSales = 0;
    let monthOrders = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    Object.values(orders).forEach(order => {
      const orderDate = order.createdAt;
      if (orderDate) {
        if (orderDate >= today) {
          todayOrders++;
          todaySales += order.totalPrice || order.total || 0;
        }
        if (orderDate >= monthStart) {
          monthOrders++;
          monthSales += order.totalPrice || order.total || 0;
        }
      }
    });

    const message = `
📊 <b>إحصائيات سريعة - Tiger Jeans</b> 🐯
━━━━━━━━━━━━━━━━━

<b>📅 اليوم (${new Date().toLocaleDateString('ar-EG')}):</b>
🛒 الطلبات: <b>${todayOrders}</b>
💵 المبيعات: <b>${fmtPrice(todaySales)}</b>

<b>📆 هذا الشهر:</b>
🛒 الطلبات: <b>${monthOrders}</b>
💵 المبيعات: <b>${fmtPrice(monthSales)}</b>

<b>📦 إجمالي المنتجات:</b> ${Object.keys(productsSnapshot.val() || {}).length}
<b>📋 إجمالي الطلبات:</b> ${Object.keys(orders).length}

⏰ <b>آخر تحديث:</b> ${new Date().toLocaleString('ar-EG')}
    `.trim();

    return await sendTelegramMessage(message);

  } catch (error) {
    console.error('Error getting stats:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// 🎮 معالجة أوامر البوت (للـ Webhook)
// ============================================

async function handleBotCommand(command, args, chatId, userId) {
  switch(command.toLowerCase()) {
    case '/start':
      return {
        text: `
🐯 <b>مرحباً بك في بوت Tiger Jeans!</b>

أنا بوت متجر تايجر جينز للمساعدة في:
• تتبع الطلبات
• عرض الإحصائيات
• تنبيهات المخزون

<b>الأوامر المتاحة:</b>
/track [رقم] - تتبع طلب برقم التليفون
/stats - إحصائيات سريعة
/lowstock - المخزون المنخفض
/help - المساعدة
        `.trim(),
        parse_mode: 'HTML'
      };

    case '/help':
    case '/commands':
      return {
        text: `
📚 <b>دليل أوامر بوت Tiger Jeans</b>
━━━━━━━━━━━━━━━━━

<b>للعملاء:</b>
/track 01012345678 - تتبع حالتك

<b>للأدمن:</b>
/stats - إحصائيات المبيعات
/lowstock - تقرير المخزون
/orders - آخر 10 طلبات
/summary - تقرير اليوم

<b>عام:</b>
/start - تشغيل البوت
/help - عرض المساعدة
        `.trim(),
        parse_mode: 'HTML'
      };

    case '/track':
      if (!args || args.trim() === '') {
        return {
          text: '🔍 يرجى إدخال رقم التليفون:\n\n<code>/track 01012345678</code>',
          parse_mode: 'HTML'
        };
      }
      // تنفيذ التتبع وإعادة النتيجة
      const trackResult = await trackOrderByPhone(args.trim());
      return trackResult;

    case '/stats':
      const statsResult = await getQuickStats();
      return statsResult;

    case '/lowstock':
      const stockResult = await getLowStockReport();
      return stockResult;

    case '/orders':
      // جلب آخر 10 طلبات
      return await getLastOrders(10);

    case '/summary':
      // تقرير اليوم الكامل
      return await generateDailyReport();

    default:
      return {
        text: '❌ الأمر غير معروف\n\nأرسل /help لعرض الأوامر المتاحة',
        parse_mode: 'HTML'
      };
  }
}

// ====== جلب آخر الطلبات ======
async function getLastOrders(limit = 10) {
  try {
    const snapshot = await db.ref('orders').orderByChild('createdAt').limitToLast(limit).once('value');
    const orders = snapshot.val() || {};
    
    const ordersList = Object.values(orders).reverse().slice(0, limit);
    
    if (ordersList.length === 0) {
      return { text: '📭 لا توجد طلبات حتى الآن', parse_mode: 'HTML' };
    }

    let message = `📋 <b>آخر ${ordersList.length} طلبات:</b>\n\n`;
    
    ordersList.forEach((order, idx) => {
      const statusEmojis = {
        'pending': '⏳',
        'confirmed': '✅',
        'processing': '🔄',
        'shipped': '🚚',
        'delivered': '🎉',
        'cancelled': '❌'
      };
      
      message += `${idx + 1}. ${statusEmojis[order.status] || '📋'} <code>${order.orderCode || order.id}</code>\n`;
      message += `   👤 ${order.customer?.name || '-'} | 💰 ${fmtPrice(order.totalPrice || order.total)}\n\n`;
    });

    return { text: message, parse_mode: 'HTML' };
  } catch (error) {
    return { text: `❌ خطأ: ${error.message}`, parse_mode: 'HTML' };
  }
}

// ====== توليد تقرير يومي كامل ======
async function generateDailyReport() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await db.ref('orders').once('value');
    const allOrders = Object.values(snapshot.val() || {});
    
    const todayOrders = allOrders.filter(o => 
      o.createdAt && o.createdAt.toString().startsWith(today.replace(/-/g, '').slice(0,8))
    );

    const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0);
    const totalShipping = todayOrders.reduce((sum, o) => sum + (o.shippingCost || o.shipping || 0), 0);

    // حساب حسب طريقة الدفع
    const byPayment = {};
    todayOrders.forEach(o => {
      const method = o.paymentMethod || 'other';
      byPayment[method] = (byPayment[method] || 0) + 1;
    });

    // حساب حسب الحالة
    const byStatus = {};
    todayOrders.forEach(o => {
      const status = o.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    let message = `📊 <b>التقرير اليومي الكامل</b>\n`;
    message += `📅 ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    
    message += `<b>📈 ملخص:</b>\n`;
    message += `• إجمالي الطلبات: <b>${todayOrders.length}</b>\n`;
    message += `• إجمالي المبيعات: <b>${fmtPrice(totalRevenue)}</b>\n`;
    message += `• مصاريف الشحن: <b>${fmtPrice(totalShipping)}</b>\n`;
    message += `• صافي الربح: <b>${fmtPrice(totalRevenue - totalShipping)}</b>\n\n`;

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

// ============================================
// 🔗 اختبار الاتصال بالبوت
// ============================================

async function testTelegramConnection() {
  if (!TELEGRAM_CONFIG.botToken) {
    return { success: false, error: 'لم يتم إدخال توكن البوت' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/getMe`);
    const result = await response.json();
    
    if (result.ok) {
      const botInfo = result.result;
      return {
        success: true,
        data: {
          id: botInfo.id,
          name: botInfo.first_name,
          username: botInfo.username,
          canJoinGroups: botInfo.can_join_groups
        },
        message: `✅ متصل بـ @${botInfo.username}`
      };
    } else {
      return { success: false, error: result.description };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ====== تصدير للاستخدام الخارجي ======
window.TelegramBot = {
  config: TELEGRAM_CONFIG,
  loadSettings: loadTelegramSettings,
  saveSettings: saveTelegramSettings,
  sendMessage: sendTelegramMessage,
  
  // الإشعارات
  notifyNewOrder,
  notifyPaymentConfirmation,
  notifyNewPreOrder,
  notifyLowStock,
  notifyOrderStatusChange,
  sendDailySummary,
  
  // الأوامر
  trackOrderByPhone,
  getLowStockReport,
  getQuickStats,
  handleBotCommand,
  
  // الأدوات
  testConnection: testTelegramConnection
};

console.log('🐯 Telegram Bot module loaded for Tiger Jeans');
