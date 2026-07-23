// ====== Tiger Jeans - Telegram Bot Integration (UPDATED) ======
// بوت تليجرام متكامل مع لوحة التحكم و Firebase
// محدث للعمل مع Worker الموحد الجديد

// ====== إعدادات البوت ======
const TELEGRAM_CONFIG = {
  botToken: '', // سيتم حفظه من لوحة التحكم (اختياري الآن)
  chatId: '',   // معرف الدردشة (Admin Chat ID) - اختياري الآن
  workerUrl: 'https://tigerorder.studegy10.workers.dev',
  enabled: true // مُفعّل افتراضياً
};

// ====== تحميل الإعدادات من Firebase ======
async function loadTelegramSettings() {
  try {
    const snapshot = await db.ref('settings/telegram').once('value');
    const settings = snapshot.val();
    if (settings) {
      TELEGRAM_CONFIG.botToken = settings.botToken || '';
      TELEGRAM_CONFIG.chatId = settings.chatId || '';
      TELEGRAM_CONFIG.enabled = settings.enabled !== false; // مفعّل افتراضياً
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
      enabled: settings.enabled !== false,
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    TELEGRAM_CONFIG.botToken = settings.botToken || '';
    TELEGRAM_CONFIG.chatId = settings.chatId || '';
    TELEGRAM_CONFIG.enabled = settings.enabled !== false;
    
    return true;
  } catch (error) {
    console.error('Error saving Telegram settings:', error);
    return false;
  }
}

// ====== إرسال رسالة عبر البوت (باستخدام Worker) ======
async function sendTelegramMessage(text, parseMode = 'HTML') {
  try {
    // استخدام الـ Worker الموحد الجديد
    const response = await fetch(`${TELEGRAM_CONFIG.workerUrl}/telegram/test`, {
      method: 'GET'
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'فشل إرسال الرسالة');
    }
    
    return result;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

// ==========================================
// 🛒 إشعار طلب جديد
// ==========================================

/**
 * notifyNewOrder - إرسال إشعار بطلب جديد لتليجرام
 * 
 * @param {Object} order - بيانات الطلب الكاملة
 */
async function notifyNewOrder(order) {
  if (!TELEGRAM_CONFIG.enabled) {
    console.log('⚠️ Telegram notifications are disabled');
    return { success: false, skipped: true };
  }

  try {
    const response = await fetch(`${TELEGRAM_CONFIG.workerUrl}/telegram/notify-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: order.code || order.orderCode || '',
        customer: order.customer || {},
        items: order.items || [],
        subtotal: order.subtotal || 0,
        shippingCost: order.shippingCost || 0,
        discount: order.discount || 0,
        total: order.total || order.totalPrice || 0,
        payment: order.payment || {},
        shippingCompany: order.shippingCompany || '',
        trackingNumber: order.trackingNumber || '',
        status: order.status || 'pending',
        siteUrl: 'https://tiger-jeans.com'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Order notification sent for:', order.code);
    } else {
      console.warn('⚠️ Order notification failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending order notification:', error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 💳 إشعار تأكيد الدفع
// ==========================================

async function notifyPaymentConfirmation(order) {
  if (!TELEGRAM_CONFIG.enabled) return { success: false, skipped: true };

  try {
    const result = await sendTelegramMessage(
      `💳 <b>تأكيد دفع - ${order.code}</b>\n\n` +
      `👤 العميل: ${order.customer.name}\n` +
      `💰 المبلغ: ${typeof fmtPrice === 'function' ? fmtPrice(order.total) : order.total + ' ج.م'}\n` +
      `📱 الهاتف: ${order.customer.phone}\n\n` +
      `تم رفع إيصال الدفع ويحتاج مراجعة\n` +
      `🔗 <a href="https://tiger-jeans.com/admin/orders">مراجعة في لوحة التحكم</a>`
    );
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 📦 إشعار مخزون منخفض
// ==========================================

async function notifyLowStock(productName, size, color, remainingQty) {
  if (!TELEGRAM_CONFIG.enabled) return { success: false, skipped: true };

  try {
    const result = await sendTelegramMessage(
      `⚠️ <b>تنبيه مخزون منخفض</b>\n\n` +
      `📦 المنتج: ${productName}\n` +
      `🎨 اللون: ${color}\n` +
      `📏 المقاس: ${size}\n` +
      `🔢 الكمية المتبقية: <b>${remainingQty}</b>\n\n` +
      `يرى مراجعة المخزون وتعديله`
    );
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 📋 إشعار تغيير حالة الطلب
// ==========================================

/**
 * notifyOrderStatusChange - إرسال إشعار بتغيير حالة طلب
 * 
 * @param {Object} order - بيانات الطلب
 * @param {string} oldStatus - الحالة القديمة
 * @param {string} newStatus - الحالة الجديدة
 * @param {string} [note] - ملاحظة
 */
async function notifyOrderStatusChange(order, oldStatus, newStatus, note = '') {
  if (!TELEGRAM_CONFIG.enabled) {
    console.log('⚠️ Telegram notifications are disabled');
    return { success: false, skipped: true };
  }

  try {
    const response = await fetch(`${TELEGRAM_CONFIG.workerUrl}/telegram/status-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: order,
        oldStatus: oldStatus,
        newStatus: newStatus,
        note: note,
        siteUrl: 'https://tiger-jeans.com'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Status update notification sent: ${oldStatus} → ${newStatus}`);
    } else {
      console.warn('⚠️ Status update notification failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending status update notification:', error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 🧪 اختبار الاتصال بالبوت
// ==========================================

async function testBotConnection() {
  try {
    const result = await testTelegramConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 📦 تصدير للاستخدام العام
// ==========================================

window.TelegramBot = {
  config: TELEGRAM_CONFIG,
  loadSettings: loadTelegramSettings,
  saveSettings: saveTelegramSettings,
  sendMessage: sendTelegramMessage,
  notifyNewOrder: notifyNewOrder,
  notifyPaymentConfirmation: notifyPaymentConfirmation,
  notifyLowStock: notifyLowStock,
  notifyOrderStatusChange: notifyOrderStatusChange,
  testConnection: testBotConnection
};

// تحميل الإعدادات تلقائياً
loadTelegramSettings();

console.log('🤖 Tiger Telegram Bot Loaded | Worker:', TELEGRAM_CONFIG.workerUrl);
