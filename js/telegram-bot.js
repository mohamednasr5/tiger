/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Tiger Jeans - Telegram Bot Integration                       ║
 * ║  ===============================                             ║
 * ║  مكتبة الاتصال ببوت تليجرام من لوحة التحكم                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════
// ⚙️ إعدادات البوت
// ═══════════════════════════════════════════════════════════════

const TELEGRAM_DEFAULTS = {
  workerUrl: 'https://telegram.studegy10.workers.dev',
  botToken: '',
  chatId: '',
  enabled: false,
  adminChatIds: ['7778902690', '1719802831', '5939081272']
};

let TELEGRAM_CONFIG = { ...TELEGRAM_DEFAULTS };

// ═══════════════════════════════════════════════════════════════
// 🔄 تحميل الإعدادات من Firebase
// ═══════════════════════════════════════════════════════════════

async function loadTelegramConfig() {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      const db = firebase.database();
      const snapshot = await db.ref('telegramConfig').once('value');
      
      if (snapshot.exists()) {
        TELEGRAM_CONFIG = { ...TELEGRAM_DEFAULTS, ...snapshot.val() };
        console.log('✅ تم تحميل إعدادات البوت');
        
        // تحديث الواجهة
        if (document.getElementById('telegramBotToken')) {
          document.getElementById('telegramBotToken').value = TELEGRAM_CONFIG.botToken || '';
        }
        if (document.getElementById('telegramChatId')) {
          document.getElementById('telegramChatId').value = TELEGRAM_CONFIG.chatId || '';
        }
        if (document.getElementById('telegramEnabled')) {
          document.getElementById('telegramEnabled').checked = TELEGRAM_CONFIG.enabled || false;
        }
        
        // تحديث حالة الاتصال
        if (TELEGRAM_CONFIG.enabled && TELEGRAM_CONFIG.botToken) {
          updateConnectionStatus('active', 'البوت مفعّل');
          testBotConnection();
        } else if (TELEGRAM_CONFIG.botToken) {
          updateConnectionStatus('idle', 'جاهز للتفعيل');
        }
        
        return true;
      }
    }
  } catch (error) {
    console.error('❌ خطأ في تحميل الإعدادات:', error);
    addTelegramLog('❌ خطأ في تحميل الإعدادات: ' + error.message);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// 💾 حفظ الإعدادات
// ═══════════════════════════════════════════════════════════════

async function saveTelegramConfig() {
  const botToken = document.getElementById('telegramBotToken')?.value?.trim() || '';
  const chatId = document.getElementById('telegramChatId')?.value?.trim() || '';
  const enabled = document.getElementById('telegramEnabled')?.checked || false;

  // التحقق من التوكن
  if (!botToken) {
    showToast('❌ أدخل توكن البوت');
    return false;
  }

  if (!botToken.includes(':') || !botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
    showToast('❌ صيغة التوكن غير صحيحة');
    return false;
  }

  // تحديث الكائن المحلي
  TELEGRAM_CONFIG = {
    ...TELEGRAM_CONFIG,
    botToken,
    chatId,
    enabled,
    updatedAt: new Date().toISOString()
  };

  try {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      const db = firebase.database();
      await db.ref('telegramConfig').set(TELEGRAM_CONFIG);
      
      addTelegramLog(`💾 تم حفظ الإعدادات - ${new Date().toLocaleTimeString('ar-EG')}`);
      showToast('✅ تم حفظ إعدادات البوت بنجاح');
      
      // تحديث حالة المديرين
      updateAdminBadge();
      
      return true;
    }
  } catch (error) {
    console.error('❌ خطأ في الحفظ:', error);
    addTelegramLog('❌ خطأ في الحفظ: ' + error.message);
    showToast('❌ فشل حفظ الإعدادات');
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════
// 🔗 اختبار اتصال البوت
// ═══════════════════════════════════════════════════════════════

async function testBotConnection() {
  const token = document.getElementById('telegramBotToken')?.value?.trim() || TELEGRAM_CONFIG.botToken;
  
  if (!token) {
    showToast('❌ أدخل توكن البوت أولاً');
    return false;
  }

  addTelegramLog('🔄 جاري اختبار الاتصال...');
  updateConnectionStatus('loading', 'جاري الاختبار...');

  try {
    // استخدام Worker API
    const response = await fetch(`${TELEGRAM_CONFIG.workerUrl}/api/bot/getMe`, {
      method: 'GET'
    });
    
    const result = await response.json();
    
    if (result.ok && result.result) {
      const botInfo = result.result;
      
      document.getElementById('telegramBotName').textContent = botInfo.first_name;
      document.getElementById('telegramBotUsername').textContent = '@' + botInfo.username;
      
      updateConnectionStatus('success', 'متصل ✓');
      addTelegramLog(`✅ اتصل بـ @${botInfo.username}`);
      
      // تفعيل شارة القائمة
      document.getElementById('navTelegramStatus').style.display = 'inline';
      
      return true;
    } else {
      throw new Error(result.description || 'فشل الاتصال');
    }
  } catch (error) {
    console.error('❌ خطأ الاتصال:', error);
    updateConnectionStatus('error', 'فشل الاتصال');
    addTelegramLog('❌ فشل الاتصال: ' + error.message);
    
    if (typeof showToast === 'function') {
      showToast('❌ فشل الاتصال بالبوت');
    }
    
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 تفعيل/إيقاف البوت
// ═══════════════════════════════════════════════════════════════

async function toggleTelegramBot(enabled) {
  if (!TELEGRAM_CONFIG.botToken) {
    showToast('❌ أدخل توكن البوت أولاً');
    document.getElementById('telegramEnabled').checked = false;
    return;
  }

  addTelegramLog(`${enabled ? '🟢' : '🔴'} البوت ${enabled ? 'مفعّل' : 'معطّل'} - ${new Date().toLocaleTimeString('ar-EG')}`);
  
  if (enabled) {
    // تفعيل Webhook
    await setupWebhook();
  } else {
    // إيقاف Webhook
    await deleteWebhook();
  }

  // حفظ الحالة
  await saveTelegramConfig();
}

// ═══════════════════════════════════════════════════════════════
// 🔧 إعداد Webhook
// ═══════════════════════════════════════════════════════════════

async function setupWebhook() {
  const token = TELEGRAM_CONFIG.botToken;
  const webhookUrl = `${TELEGRAM_CONFIG.workerUrl}/api/telegram/webhook`;

  addTelegramLog('⚙️ جاري تفعيل Webhook...');

  try {
    const response = await fetch(`${TELEGRAM_CONFIG.workerUrl}/api/bot/setWebhook?url=${encodeURIComponent(webhookUrl)}&allowed_updates=["message","callback_query"]`, {
      method: 'GET'
    });
    
    const result = await response.json();
    
    if (result.ok) {
      addTelegramLog('✅ Webhook مفعّل: ' + webhookUrl);
      showToast('✅ تم تفعيل البوت بنجاح');
    } else {
      throw new Error(result.description);
    }
  } catch (error) {
    addTelegramLog('❌ فشل تفعيل Webhook: ' + error.message);
    showToast('❌ فشل تفعيل البوت');
  }
}

async function deleteWebhook() {
  try {
    await fetch(`${TELEGRAM_CONFIG.workerUrl}/api/bot/deleteWebhook`, {
      method: 'GET'
    });
    addTelegramLog('🗑️ Webhook محذوف');
  } catch (error) {
    console.error('خطأ حذف Webhook:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📱 جلب Chat ID
// ═══════════════════════════════════════════════════════════════

async function fetchChatId() {
  const token = document.getElementById('telegramBotToken')?.value?.trim() || TELEGRAM_CONFIG.botToken;
  
  if (!token) {
    showToast('❌ أدخل توكن البوت أولاً');
    return;
  }

  addTelegramLog('🔍 جاري جلب آخر الرسائل...');

  try {
    const response = await fetch(`${TELEGRAM_CONFIG.workerUrl}/api/bot/getUpdates?limit=10&offset=-10`, {
      method: 'GET'
    });
    
    const result = await response.json();
    
    if (result.ok && result.result && result.result.length > 0) {
      // استخراج Chat IDs الفريدة
      const chatIds = [...new Set(result.result.map(u => u.message?.chat.id).filter(Boolean))];
      
      if (chatIds.length > 0) {
        document.getElementById('telegramChatId').value = chatIds[0];
        addTelegramLog(`✅ تم العثور على Chat ID: ${chatIds[0]}`);
        showToast('✅ تم جلب Chat ID');
        
        // عرض جميع IDs المكتشفة
        if (chatIds.length > 1) {
          addTelegramLog(`📋 IDs أخرى: ${chatIds.slice(1).join(', ')}`);
        }
      } else {
        addTelegramLog('⚠️ لا توجد رسائل. أرسل رسالة للبوت أولاً');
        showToast('⚠️ أرسل رسالة للبوت ثم حاول مجدداً');
      }
    } else {
      addTelegramLog('⚠️ لا توجد رسائل. أرسل رسالة للبوت أولاً');
      showToast('⚠️ أرسل رسالة للبوت ثم حاول مجدداً');
    }
  } catch (error) {
    addTelegramLog('❌ خطأ: ' + error.message);
    showToast('❌ فشل جلب Chat ID');
  }
}

// ═══════════════════════════════════════════════════════════════
// 📤 إرسال رسالة اختبار
// ═══════════════════════════════════════════════════════════════

async function sendTestMessage() {
  const chatId = document.getElementById('telegramChatId')?.value?.trim() || TELEGRAM_CONFIG.chatId;
  const token = document.getElementById('telegramBotToken')?.value?.trim() || TELEGRAM_CONFIG.botToken;

  if (!token || !chatId) {
    showToast('❌ تأكد من التوكن و Chat ID');
    return;
  }

  addTelegramLog('📤 جاري إرسال رسالة الاختبار...');

  try {
    const response = await fetch(`${TELEGRAM_CONFIG.workerUrl}/api/bot/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ *اختبار الاتصال — Tiger Jeans*\n\n` +
               `🤖 البوت يعمل بشكل صحيح!\n` +
               `⏰ ${new Date().toLocaleString('ar-EG')}\n\n` +
               `_تم الإرسال من لوحة التحكم_`,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json();

    if (result.ok) {
      addTelegramLog('✅ تم إرسال الرسالة بنجاح');
      showToast('✅ تم إرسال رسالة الاختبار');
    } else {
      throw new Error(result.description);
    }
  } catch (error) {
    addTelegramLog('❌ فشل الإرسال: ' + error.message);
    showToast('❌ فشل إرسال الرسالة');
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 تحديث حالة الاتصال
// ═══════════════════════════════════════════════════════════════

function updateConnectionStatus(status, message) {
  const el = document.getElementById('telegramConnectionStatus');
  if (!el) return;

  const colors = {
    idle: 'var(--text-dim)',
    loading: '#f59e0b',
    success: 'var(--success)',
    active: 'var(--success)',
    error: 'var(--danger)'
  };

  const icons = {
    idle: '⏸️',
    loading: '⏳',
    success: '✅',
    active: '🟢',
    error: '❌'
  };

  el.style.background = colors[status] || colors.idle;
  el.innerHTML = `${icons[status] || ''} ${message}`;
}

// ═══════════════════════════════════════════════════════════════
// 📝 إضافة سجل
// ═══════════════════════════════════════════════════════════════

function addTelegramLog(message) {
  const logEl = document.getElementById('telegramLog');
  if (!logEl) return;

  const time = new Date().toLocaleTimeString('ar-EG');
  const entry = document.createElement('div');
  entry.style.cssText = 'padding: .3rem 0; border-bottom: 1px solid var(--line); opacity: .9;';
  entry.textContent = `[${time}] ${message}`;
  
  logEl.insertBefore(entry, logEl.firstChild);
  
  // الحد الأقصى 100 سجل
  while (logEl.children.length > 100) {
    logEl.removeChild(logEl.lastChild);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🏆 تحديث شارة المديرين
// ═══════════════════════════════════════════════════════════════

function updateAdminBadge() {
  const badge = document.getElementById('navTelegramStatus');
  if (!badge) return;
  
  if (TELEGRAM_CONFIG.enabled) {
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 دوال عامة للاستخدام الخارجي
// ═══════════════════════════════════════════════════════════════

// إرسال إشعار (يمكن استدعاؤها من أي مكان)
window.TelegramBot = {
  config: TELEGRAM_CONFIG,
  
  async notify(message, options = {}) {
    if (!TELEGRAM_CONFIG.enabled || !TELEGRAM_CONFIG.chatId) return false;
    
    try {
      await fetch(`${TELEGRAM_CONFIG.workerUrl}/api/bot/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CONFIG.chatId,
          text: message,
          parse_mode: 'Markdown',
          ...options
        })
      });
      return true;
    } catch (e) {
      console.error('Telegram notification failed:', e);
      return false;
    }
  },

  // إشعار طلب جديد
  async notifyNewOrder(orderData) {
    const message = `🛒 *طلب جديد — Tiger Jeans* 🐯\n` +
                    `━━━━━━━━━━━━━━━━━\n` +
                    `🔖 رقم الطلب: ${orderData.id || 'TJ-XXXXX'}\n` +
                    `👤 العميل: ${orderData.customer || '-'}\n` +
                    `📱 التليفون: ${orderData.phone || '-'}\n` +
                    `📍 المدينة: ${orderData.city || '-'}\n\n` +
                    `💰 الإجمالي: ${orderData.total || '0'} ج.م\n` +
                    `💳 الدفع: ${orderData.paymentMethod || '-'}\n` +
                    `⏰ ${new Date().toLocaleString('ar-EG')}`;
    
    return this.notify(message);
  },

  // تنبيه مخزون منخفض
  async notifyLowStock(productData) {
    const message = `⚠️ *تنبيه مخزون منخفض* 🔴\n` +
                    `━━━━━━━━━━━━━━━━━\n` +
                    `📦 المنتج: ${productData.name}\n` +
                    `📏 المقاس: ${productData.size || '-'}\n` +
                    `🎨 اللون: ${productData.color || '-'}\n` +
                    `🔢 الكمية: ${productData.quantity} قطعة`;
    
    return this.notify(message);
  },

  // تحميل الإعدادات
  loadConfig: loadTelegramConfig,
  
  // حفظ الإعدادات
  saveConfig: saveTelegramConfig,

  // اختبار الاتصال
  test: testBotConnection
};

// ═══════════════════════════════════════════════════════════════
// 🚀 التهيئة عند تحميل الصفحة
// ═══════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  // انتظار تحميل Firebase
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      loadTelegramConfig();
    }, 1500);
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔗 دوال التوافق مع admin.html (Aliases)
// ═══════════════════════════════════════════════════════════════

// هذه الدوال مستدعاة من admin.html - نعملها كـ wrappers
window.loadTelegramSettings = loadTelegramConfig;
window.saveTelegramSettings = saveTelegramConfig;
window.toggleTelegramBot = toggleTelegramBot;
window.fetchChatId = fetchChatId;
window.sendTestMessage = sendTestMessage;
window.testBotConnection = testBotConnection;
window.addTelegramLog = addTelegramLog;

// دالة الحفظ من UI (موجودة في admin.html)
window.saveTelegramSettingsFromUI = async function() {
  return await saveTelegramConfig();
};

console.log('📱 Telegram Bot Module Loaded');
