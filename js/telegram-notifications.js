/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Tiger Jeans - إشعارات Telegram الفورية                    ║
 * ║  ===============================                            ║
 * ║  يُستخدم في: checkout.html, gift-cards.html, admin.html    ║
 * ╚════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════
// ⚙️ إعدادات الإشعارات
// ═══════════════════════════════════════════════════════════════

const TELEGRAM_NOTIFICATIONS = {
  // رابط Worker API (غيّره حسب إعداداتك)
  workerUrl: 'https://telegram.studegy10.workers.dev',
  
  // تفعيل/إيقاف الإشعارات
  enabled: true,
  
  // أنواع الإشعارات المتاحة
  types: {
    NEW_ORDER: 'new_order',        // طلب جديد
    NEW_PAYMENT: 'new_payment',     // دفع جديد
    LOW_STOCK: 'low_stock'         // مخزون منخفض
  }
};

// ═══════════════════════════════════════════════════════════════
// 📤 دالة إرسال الإشعار الرئيسية
// ═══════════════════════════════════════════════════════════════

/**
 * إرسال إشعار فوري لـ Telegram
 * @param {string} type - نوع الإشعار (new_order, new_payment, low_stock)
 * @param {object} data - بيانات الإشعار
 * @returns {Promise<boolean>} - نجاح أو فشل
 */
async function sendTelegramNotification(type, data) {
  try {
    if (!TELEGRAM_NOTIFICATIONS.enabled) {
      console.log('📵 الإشعارات معطّلة');
      return false;
    }

    const response = await fetch(`${TELEGRAM_NOTIFICATIONS.workerUrl}/api/notifications/webhook`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        type: type,
        data: data,
        timestamp: new Date().toISOString(),
        source: window.location.pathname
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ تم إرسال إشعار ${type} بنجاح`);
      
      // عرض إشعار للمستخدم (اختياري)
      if (typeof showToast === 'function') {
        showToast('📱 تم إرسال إشعار للإدارة');
      }
      
      return true;
    } else {
      console.error('❌ فشل إرسال الإشعار:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🛒 إشعارات الطلبات الجديدة
// ═══════════════════════════════════════════════════════════════

/**
 * إرسال إشعار عند طلب جديد
 * @param {object} orderData - بيانات الطلب
 */
function notifyNewOrder(orderData) {
  return sendTelegramNotification(TELEGRAM_NOTIFICATIONS.types.NEW_ORDER, {
    orderId: orderData.id || orderData.orderId || `TJ-${Date.now()}`,
    customerName: orderData.customerName || orderData.name || orderData.customer || 'عميل',
    phone: orderData.phone || orderData.customerPhone || '',
    city: orderData.city || orderData.governorate || '-',
    total: orderData.total || orderData.amount || orderData.totalPrice || 0,
    paymentMethod: orderData.paymentMethod || orderData.payment || '-',
    items: orderData.items || orderData.products || [],
    notes: orderData.notes || orderData.comment || ''
  });
}

/**
 * إرسال إشعار عند إنشاء طلب بطاقة هدايا
 * @param {object} giftData - بيانات بطاقة الهدايا
 */
function notifyNewGiftCard(giftData) {
  return sendTelegramNotification(TELEGRAM_NOTIFICATIONS.types.NEW_ORDER, {
    orderId: `GIFT-${giftData.id || Date.now()}`,
    customerName: giftData.senderName || 'عميل',
    phone: giftData.senderPhone || '',
    city: '-',
    total: giftData.amount || 0,
    paymentMethod: giftData.paymentMethod || giftData.payment?.method || '-',
    recipientName: giftData.recipientName || '',
    occasion: giftData.occasion || ''
  });
}

// ═══════════════════════════════════════════════════════════════
// 💳 إشعارات الدفع الجديد
// ═══════════════════════════════════════════════════════════════

/**
 * إشعار عند دفع جديد (تحويل بنكي/فودافون كاش)
 * @param {object} paymentData - بيانات الدفع
 */
function notifyNewPayment(paymentData) {
  return sendTelegramNotification(TELEGRAM_NOTIFICATIONS.types.NEW_PAYMENT, {
    orderId: paymentData.orderId || paymentData.reference || '-',
    amount: paymentData.amount || paymentData.value || 0,
    method: paymentData.method || paymentData.paymentMethod || '-',
    phone: paymentData.phone || paymentData.senderPhone || '',
    receiptImage: paymentData.receiptImage || paymentData.image || '',
    notes: paymentData.notes || ''
  });
}

// ═══════════════════════════════════════════════════════════════
// ⚠️ إشعارات المخزون المنخفض
// ═══════════════════════════════════════════════════════════════

/**
 * إشعار عند انخفاض المخزون
 * @param {object} stockData - بيانات المخزون
 */
function notifyLowStock(stockData) {
  return sendTelegramNotification(TELEGRAM_NOTIFICATIONS.types.LOW_STOCK, {
    productName: stockData.productName || stockData.name || stockData.title || '-',
    productId: stockData.productId || stockData.id || '-',
    sizeColor: stockData.sizeColor || stockData.variant || `${stockData.size || ''}_${stockData.color || ''}`,
    qty: stockData.qty || stockData.quantity || stockData.stock || 0,
    threshold: stockData.threshold || 5,
    price: stockData.price || 0
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔧 دوال مساعدة
// ═══════════════════════════════════════════════════════════════

/**
 * تفعيل/إيقاف الإشعارات
 * @param {boolean} enabled - تفعيل أم لا
 */
function setNotificationsEnabled(enabled) {
  TELEGRAM_NOTIFICATIONS.enabled = enabled;
  
  // حفظ في localStorage
  try {
    localStorage.setItem('telegram_notifications_enabled', enabled);
  } catch (e) {}
}

/**
 * تحديث رابط Worker
 * @param {string} url - الرابط الجديد
 */
function setWorkerUrl(url) {
  TELEGRAM_NOTIFICATIONS.workerUrl = url;
  
  try {
    localStorage.setItem('telegram_worker_url', url);
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// 🚀 التهيئة التلقائية
// ═══════════════════════════════════════════════════════════════

(function initTelegramNotifications() {
  try {
    // استعادة الإعدادات من localStorage
    const savedEnabled = localStorage.getItem('telegram_notifications_enabled');
    const savedUrl = localStorage.getItem('telegram_worker_url');
    
    if (savedEnabled !== null) {
      TELEGRAM_NOTIFICATIONS.enabled = savedEnabled === 'true';
    }
    
    if (savedUrl) {
      TELEGRAM_NOTIFICATIONS.workerUrl = savedUrl;
    }
  } catch (e) {
    console.warn('⚠️ خطأ في تهيئة إشعارات Telegram:', e);
  }
  
  console.log(`📱 نظام إشعارات Telegram جاهز (${TELEGRAM_NOTIFICATIONS.enabled ? 'مفعّل' : 'معطّل'})`);
})();

// ═══════════════════════════════════════════════════════════════
// 🌐 تصدير الدوال للاستخدام العام
// ═══════════════════════════════════════════════════════════════

// تصدير كـ Global Functions
window.sendTelegramNotification = sendTelegramNotification;
window.notifyNewOrder = notifyNewOrder;
window.notifyNewGiftCard = notifyNewGiftCard;
window.notifyNewPayment = notifyNewPayment;
window.notifyLowStock = notifyLowStock;
window.setNotificationsEnabled = setNotificationsEnabled;
window.setWorkerUrl = setWorkerUrl;

console.log('📱 Telegram Notifications Module Loaded');
