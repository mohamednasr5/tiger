/**
 * 🛒❤️ Tiger Jeans - Telegram Notifications Helper (UPDATED)
 * ===========================================================
 * هذا الملف يوضع في الموقع (Frontend) لإرسال إشعارات فورية
 * عند إضافة منتجات للسلة أو المفضلة أو الطلبات الجديدة
 * 
 * 📌 الاستخدام:
 *    1. انسخ هذا الملف إلى مجلد js/ في مشروعك
 *    2. استدعي الدوال من أي مكان في الكود
 * 
 * 🔧 الإعدادات:
 *    WORKER_URL تم تحديثه ليشير إلى Worker الموحد الجديد
 */

// ====== ⚙️ الإعدادات - رابط Worker الموحد ======
const WORKER_URL = 'https://tigerorder.studegy10.workers.dev';

// ====== 📤 دالة إرسال عامة ======
async function sendNotification(endpoint, data) {
  try {
    const response = await fetch(`${WORKER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Notification sent: ${endpoint}`, result);
    } else {
      console.warn(`⚠️ Notification failed: ${endpoint}`, result);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error sending notification to ${endpoint}:`, error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 🛒 إشعار طلب جديد (الأهم - يعمل مع checkout)
// ==========================================

/**
 * notifyNewOrder - أرسل إشعار عند إنشاء طلب جديد
 * 
 * @param {Object} order - بيانات الطلب الكاملة
 */
async function notifyNewOrder(order) {
  const data = {
    code: order.code || '',
    customer: order.customer || {},
    items: order.items || [],
    subtotal: order.subtotal || 0,
    shippingCost: order.shippingCost || 0,
    discount: order.discount || 0,
    total: order.total || 0,
    payment: order.payment || {},
    shippingCompany: order.shippingCompany || '',
    trackingNumber: order.trackingNumber || '',
    status: order.status || 'pending',
    siteUrl: order.siteUrl || 'https://tiger-jeans.com'
  };

  return sendNotification('/telegram/notify-order', data);
}

// ==========================================
// 📋 إشعار تحديث حالة الطلب
// ==========================================

/**
 * notifyStatusUpdate - أرسل إشعار عند تغيير حالة طلب
 */
async function notifyStatusUpdate(order, oldStatus, newStatus, note = '') {
  const data = {
    order: order,
    oldStatus: oldStatus,
    newStatus: newStatus,
    note: note,
    siteUrl: 'https://tiger-jeans.com'
  };

  return sendNotification('/telegram/status-update', data);
}

// ==========================================
// 🧪 اختبار الاتصار بتليجرام
// ==========================================

async function testTelegramConnection() {
  try {
    const response = await fetch(`${WORKER_URL}/telegram/test`);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 📦 تصدير للاستخدام العام
// ==========================================

window.TigerNotifications = {
  notifyNewOrder,
  notifyStatusUpdate,
  testTelegramConnection,
  sendNotification
};

console.log('📱 Tiger Notifications Helper Loaded | Worker:', WORKER_URL);
