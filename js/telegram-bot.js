// ====== Tiger Jeans Telegram Bot Library ======
// الإصدار 2.0 - محسّن بالكامل
// يدعم: إشعارات الطلبات، تتبع الشحن، تنبيهات المخزون

(function() {
  'use strict';
  
  // ====== Configuration ======
  const WORKER_URL = 'https://telegram.studegy10.workers.dev';
  const SITE_URL = 'https://tiger-jeans.com';
  
  // ====== Global State ======
  window.TELEGRAM_CONFIG = {
    enabled: false,
    botToken: '',
    chatId: '',
    botUsername: '',
    notifications: {
      newOrders: true,
      payments: true,
      preorders: true,
      lowStock: true,
      statusChanges: true
    },
    lastTested: null,
    connectionStatus: 'idle' // idle, testing, success, error
  };
  
  // Log storage for admin panel
  window.telegramLogs = [];
  
  // ====== Utility Functions ======
  
  function addTelegramLog(message) {
    const timestamp = new Date().toLocaleString('ar-EG');
    window.telegramLogs.unshift({ message, timestamp });
    if (window.telegramLogs.length > 100) window.telegramLogs.pop();
    
    // Update log display in admin panel
    if (typeof updateTelegramLogDisplay === 'function') {
      updateTelegramLogDisplay();
    }
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  
  // Format Telegram HTML (safe)
  function formatTelegramHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  // ====== Core Send Function ======
  
  async function sendTelegramMessage(text, parseMode = 'HTML') {
    if (!window.TELEGRAM_CONFIG.enabled) {
      console.log('[Telegram] Bot disabled, skipping message');
      return { success: false, error: 'Bot disabled' };
    }
    
    if (!window.TELEGRAM_CONFIG.botToken || !window.TELEGRAM_CONFIG.chatId) {
      console.error('[Telegram] Missing botToken or chatId');
      return { success: false, error: 'Missing configuration' };
    }
    
    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text,
          parse_mode: parseMode 
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        addTelegramLog(`✅ تم الإرسال بنجاح - ${new Date().toLocaleTimeString('ar-EG')}`);
        return { success: true };
      } else {
        addTelegramLog(`❌ فشل الإرسال: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[Telegram] Send error:', error);
      addTelegramLog(`❌ خطأ في الاتصال: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  // ====== Notification Formatters ======
  
  // Format new order notification
  function formatOrderNotification(order) {
    const items = order.items || [];
    let itemsText = '';
    
    items.forEach((item, idx) => {
      const productUrl = `${SITE_URL}/#product-${item.id}`;
      itemsText += `
📦 <b>${idx + 1}. ${formatTelegramHtml(item.name)}</b>
   🎨 اللون: ${formatTelegramHtml(item.color)} | 📏 المقاس: ${item.size}
   💰 السعر: ${fmtPrice(item.price)} × ${item.qty} = ${fmtPrice(item.price * item.qty)}
   🔗 <a href="${productUrl}">عرض المنتج</a>`;
    });
    
    const paymentNames = {
      vodafone: 'فودافون كاش',
      instapay: 'إنستاباي',
      cod: 'الدفع عند الاستلام',
      giftcard: 'بطاقة هدايا'
    };
    
    const shippingNames = {
      bosta: 'بوستا (Bosta)',
      aramex: 'أرامكس',
      self_pickup: 'استلام شخصي'
    };
    
    return `🛒 <b>طلب جديد</b> - ${formatTelegramHtml(order.orderCode || order.code)}
━━━━━━━━━━━━━━━━━━

👤 <b>العميل:</b> ${formatTelegramHtml(order.customer?.name)}
📱 <b>الهاتف:</b> ${formatTelegramHtml(order.customer?.phone)}
📍 <b>المدينة:</b> ${formatTelegramHtml(order.customer?.city)}
🏠 <b>العنوان:</b> ${formatTelegramHtml(order.customer?.address)}
${order.customer?.notes ? `\n📝 <b>ملاحظة:</b> ${formatTelegramHtml(order.customer.notes)}` : ''}

━━━━━━━━━━━━━━━━━━
📋 <b>المنتجات:</b>
${itemsText}

━━━━━━━━━━━━━━━━━━
💰 <b>الإجمالي:</b> ${fmtPrice(order.totalPrice || order.total)}
🚚 <b>الشحن:</b> ${shippingNames[order.shippingCompany] || order.shippingCompany || 'لم يُحدد'} (${fmtPrice(order.shippingCost)})
💳 <b>الدفع:</b> ${paymentNames[order.payment?.method] || order.payment?.method}
⏰ <b>التاريخ:</b> ${new Date(order.createdAt).toLocaleString('ar-EG')}

━━━━━━━━━━━━━━━━━━
🔗 <a href="${SITE_URL}/admin.html">لوحة التحكم</a>`;
  }
  
  // Format payment confirmation notification
  function formatPaymentNotification(order) {
    return `💳 <b>تأكيد دفع جديد</b>
━━━━━━━━━━━━━━━━━━

🔖 <b>رقم الطلب:</b> ${formatTelegramHtml(order.orderCode || order.code)}
👤 <b>العميل:</b> ${formatTelegramHtml(order.customer?.name)}
📱 <b>الهاتف:</b> ${formatTelegramHtml(order.customer?.phone)}
💰 <b>المبلغ:</b> ${fmtPrice(order.totalPrice || order.total)}
💳 <b>طريقة الدفع:</b> ${order.payment?.method}

✅ <i>تم رفع إيصال الدفع - يرجى المراجعة</i>

🔗 <a href="${SITE_URL}/admin.html">مراجعة الدفع</a>`;
  }
  
  // Format order status change notification
  function formatStatusChangeNotification(order, oldStatus, newStatus) {
    const statusNames = {
      pending: '⏳ قيد الانتظار',
      confirmed: '✅ مؤكد',
      processing: '🔄 جاري التجهيز',
      shipping: '🚚 تم الشحن',
      delivered: '🎉 تم التسليم',
      cancelled: '❌ ملغي',
      refunded: '💰 مسترد'
    };
    
    let trackingInfo = '';
    if (newStatus === 'shipping' && order.trackingNumber) {
      trackingInfo = `
📦 <b>رقم التتبع:</b> ${order.trackingNumber}
🔗 <a href="https://track.bosta.co/shipments/${order.trackingNumber}">تتبع الشحنة على بوستا</a>`;
    }
    
    return `📊 <b>تحديث حالة الطلب</b>
━━━━━━━━━━━━━━━━━━

🔖 <b>رقم الطلب:</b> ${formatTelegramHtml(order.orderCode || order.code)}
📱 <b>العميل:</b> ${formatTelegramHtml(order.customer?.phone)}

🔄 <b>التغيير:</b> ${statusNames[oldStatus] || oldStatus} → ${statusNames[newStatus] || newStatus}
${trackingInfo}

⏰ ${new Date().toLocaleString('ar-EG')}`;
  }
  
  // Format low stock notification
  function formatLowStockNotification(productName, size, color, currentQty) {
    return `⚠️ <b>تنبيه مخزون منخفض</b> 🔴
━━━━━━━━━━━━━━━━━━

📦 <b>المنتج:</b> ${formatTelegramHtml(productName)}
📏 <b>المقاس:</b> ${size}
🎨 <b>اللون:</b> ${color}
🔢 <b>الكمية الحالية:</b> ${currentQty} قطعة

⚡ <b>الحد الأدنى:</b> 2 قطعة

🔗 <a href="${SITE_URL}/admin.html#products">إدارة المنتجات</a>`;
  }
  
  // Format preorder notification
  function formatPreorderNotification(preorder) {
    return `📋 <b>طلب مسبق جديد</b>
━━━━━━━━━━━━━━━━━━

👤 <b>الاسم:</b> ${formatTelegramHtml(preorder.name)}
📱 <b>الهاتف:</b> ${formatTelegramHtml(preorder.phone)}
📦 <b>المنتج المطلوب:</b> ${formatTelegramHtml(preorder.productName)}

⏰ ${new Date(preorder.createdAt).toLocaleString('ar-EG')}`;
  }
  
  // ====== Public API Functions ======
  
  // Load settings from Firebase
  window.loadTelegramSettings = async function() {
    try {
      const snap = await db.ref('settings/telegram').once('value');
      const settings = snap.val();
      
      if (settings) {
        Object.assign(window.TELEGRAM_CONFIG, settings);
        addTelegramLog('📥 تم تحميل إعدادات البوت');
      }
      
      return settings;
    } catch (error) {
      console.error('[Telegram] Error loading settings:', error);
      addTelegramLog(`❌ خطأ في تحميل الإعدادات: ${error.message}`);
      return null;
    }
  };
  
  // Save settings to Firebase
  window.saveTelegramSettings = async function(settings) {
    try {
      await db.ref('settings/telegram').set(settings);
      Object.assign(window.TELEGRAM_CONFIG, settings);
      addTelegramLog('💾 تم حفظ إعدادات البوت');
      return true;
    } catch (error) {
      console.error('[Telegram] Error saving settings:', error);
      addTelegramLog(`❌ خطأ في حفظ الإعدادات: ${error.message}`);
      return false;
    }
  };
  
  // Test connection to Telegram bot
  window.testTelegramConnection = async function() {
    window.TELEGRAM_CONFIG.connectionStatus = 'testing';
    
    try {
      const response = await fetch(`${WORKER_URL}?action=test`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success || response.ok) {
        // Try to get bot info
        const token = window.TELEGRAM_CONFIG.botToken;
        if (token) {
          const botResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const botData = await botResponse.json();
          
          if (botData.ok) {
            window.TELEGRAM_CONFIG.connectionStatus = 'success';
            window.TELEGRAM_CONFIG.botUsername = botData.result.username;
            addTelegramLog(`✅ اتصل بـ @${botData.result.username}`);
            return { success: true, data: botData.result };
          }
        }
        
        window.TELEGRAM_CONFIG.connectionStatus = 'success';
        return { success: true };
      } else {
        window.TELEGRAM_CONFIG.connectionStatus = 'error';
        return { success: false, error: result.error };
      }
    } catch (error) {
      window.TELEGRAM_CONFIG.connectionStatus = 'error';
      return { success: false, error: error.message };
    }
  };
  
  // Toggle bot enabled/disabled
  window.toggleTelegramBot = async function(enabled) {
    window.TELEGRAM_CONFIG.enabled = enabled;
    await window.saveTelegramSettings(window.TELEGRAM_CONFIG);
    addTelegramLog(enabled ? '🟢 تم تفعيل البوت' : '🔴 تم تعطيل البوت');
  };
  
  // ====== Notification Functions ======
  
  // Notify new order
  window.notifyNewOrder = async function(order) {
    if (!window.TELEGRAM_CONFIG.notifications?.newOrders) return;
    
    const message = formatOrderNotification(order);
    return sendTelegramMessage(message);
  };
  
  // Notify payment confirmation
  window.notifyPaymentConfirmation = async function(order) {
    if (!window.TELEGRAM_CONFIG.notifications?.payments) return;
    
    const message = formatPaymentNotification(order);
    return sendTelegramMessage(message);
  };
  
  // Notify order status change
  window.notifyOrderStatusChange = async function(order, oldStatus, newStatus) {
    if (!window.TELEGRAM_CONFIG.notifications?.statusChanges) return;
    
    const message = formatStatusChangeNotification(order, oldStatus, newStatus);
    return sendTelegramMessage(message);
  };
  
  // Notify low stock
  window.notifyLowStock = async function(productName, size, color, qty) {
    if (!window.TELEGRAM_CONFIG.notifications?.lowStock) return;
    
    const message = formatLowStockNotification(productName, size, color, qty);
    return sendTelegramMessage(message);
  };
  
  // Notify new preorder
  window.notifyPreorder = async function(preorder) {
    if (!window.TELEGRAM_CONFIG.notifications?.preorders) return;
    
    const message = formatPreorderNotification(preorder);
    return sendTelegramMessage(message);
  };
  
  // Send custom message (for admin use)
  window.sendCustomTelegramMessage = async function(text) {
    return sendTelegramMessage(text);
  };
  
  // Get tracking link for Bosta
  window.getBostaTrackingLink = function(trackingNumber) {
    if (!trackingNumber) return null;
    return `https://track.bosta.co/shipments/${trackingNumber}`;
  };
  
  // Track order by phone number (for customer queries)
  window.trackOrderByPhone = async function(phone) {
    try {
      // Normalize phone number
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('2')) phone = phone.substring(1);
      if (!phone.startsWith('0')) phone = '0' + phone;
      
      const ordersSnap = await db.ref('orders')
        .orderByChild('customer/phone')
        .equalTo(phone)
        .limitToLast(10)
        .once('value');
      
      const orders = ordersSnap.val();
      if (!orders) return { found: false, message: 'لا توجد طلبات مرتبطة بهذا الرقم' };
      
      const ordersList = Object.entries(orders).map(([id, o]) => ({ id, ...o }));
      
      let message = `📋 <b>طلباتك لدى Tiger Jeans</b>\n`;
      message += `📱 الرقم: ${phone}\n\n`;
      
      ordersList.forEach(order => {
        const statusIcons = {
          pending: '⏳', confirmed: '✅', processing: '🔄',
          shipping: '🚚', delivered: '🎉', cancelled: '❌', refunded: '💰'
        };
        const icon = statusIcons[order.status] || '❓';
        
        message += `${icon} <b>${order.code}</b>\n`;
        message += `   💰 ${fmtPrice(order.total)} | `;
        
        if (order.status === 'shipping' && order.trackingNumber) {
          message += `📦 <a href="${window.getBostaTrackingLink(order.trackingNumber)}">تتبع</a>\n\n`;
        } else {
          message += `${order.status}\n\n`;
        }
      });
      
      return { found: true, orders: ordersList, message };
    } catch (error) {
      return { found: false, error: error.message };
    }
  };
  
  // ====== Auto-initialize ======
  
  // Load settings when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.loadTelegramSettings();
    });
  } else {
    window.loadTelegramSettings();
  }
  
  // Expose to global scope
  window.TelegramBot = {
    send: sendTelegramMessage,
    notifyNewOrder: window.notifyNewOrder,
    notifyPaymentConfirmation: window.notifyPaymentConfirmation,
    notifyOrderStatusChange: window.notifyOrderStatusChange,
    notifyLowStock: window.notifyLowStock,
    trackOrder: window.trackOrderByPhone,
    getBostaTrackingLink: window.getBostaTrackingLink,
    getConfig: () => window.TELEGRAM_CONFIG,
    getLogs: () => window.telegramLogs
  };
  
  console.log('%c🤖 Telegram Bot Loaded', 'color: #0088cc; font-weight: bold;');
  
})();
