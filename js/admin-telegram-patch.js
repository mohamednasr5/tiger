// ====== Admin Telegram Patch ======
// إشعارات تليجرام متقدمة لوحة التحكم
// يعمل مع admin.html

(function() {
  'use strict';
  
  // State for admin-specific features
  window.AdminTelegram = {
    logs: [],
    maxLogs: 200,
    isInitialized: false
  };
  
  // Add log entry
  function addAdminLog(message, type = 'info') {
    const timestamp = new Date().toLocaleString('ar-EG');
    const entry = { message, type, timestamp };
    
    window.AdminTelegram.logs.unshift(entry);
    if (window.AdminTelegram.logs.length > window.AdminTelegram.maxLogs) {
      window.AdminTelegram.logs.pop();
    }
    
    // Update UI if available
    updateLogDisplay();
  }
  
  // Update log display in admin panel
  function updateLogDisplay() {
    const container = document.getElementById('telegramLogs');
    if (!container) return;
    
    container.innerHTML = window.AdminTelegram.logs.map(log => {
      const icon = log.type === 'error' ? '❌' : 
                   log.type === 'success' ? '✅' : 
                   log.type === 'warning' ? '⚠️' : 'ℹ️';
      return `<div class="log-entry log-${log.type}">
        <span class="log-icon">${icon}</span>
        <span class="log-message">${log.message}</span>
        <span class="log-time">${log.timestamp}</span>
      </div>`;
    }).join('');
  }
  
  // Test connection with detailed feedback
  async function testConnectionWithFeedback() {
    const statusEl = document.getElementById('telegramStatus');
    const btnEl = document.getElementById('testTelegramBtn');
    
    if (statusEl) statusEl.textContent = 'جاري الاختبار...';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = '<span class="spinner"></span> جاري الاختبار...';
    }
    
    addAdminLog('🔄 جاري اختبار الاتصال بالبوت...');
    
    try {
      const result = await window.testTelegramConnection();
      
      if (result.success) {
        addAdminLog(`✅ اتصال ناجح! البوت: @${result.data?.username || 'مجهول'}`, 'success');
        if (statusEl) statusEl.innerHTML = '<span style="color:green">● متصل</span>';
        
        // Show bot info
        if (result.data) {
          document.getElementById('telegramBotName').textContent = result.data.first_name || 'Tiger Bot';
          document.getElementById('telegramBotUsername').textContent = '@' + (result.data.username || 'unknown');
        }
      } else {
        addAdminLog(`❌ فشل الاتصال: ${result.error}`, 'error');
        if (statusEl) statusEl.innerHTML = '<span style="color:red">● غير متصل</span>';
      }
    } catch (error) {
      addAdminLog(`❌ خطأ: ${error.message}`, 'error');
      if (statusEl) statusEl.innerHTML = '<span style="color:red">● خطأ</span>';
    }
    
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '🔍 اختبار الاتصال';
    }
  }
  
  // Save settings from admin panel
  async function saveSettingsFromAdmin() {
    const btn = document.getElementById('saveTelegramBtn');
    const originalText = btn ? btn.innerHTML : '';
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> جاري الحفظ...';
    }
    
    addAdminLog('💾 جاري حفظ إعدادات البوت...');
    
    const settings = {
      enabled: document.getElementById('telegramEnabled')?.checked || false,
      botToken: document.getElementById('telegramBotToken')?.value?.trim() || '',
      chatId: document.getElementById('telegramChatId')?.value?.trim() || '',
      
      notifications: {
        newOrders: document.getElementById('notifyNewOrders')?.checked ?? true,
        payments: document.getElementById('notifyPayments')?.checked ?? true,
        preorders: document.getElementById('notifyPreorders')?.checked ?? true,
        lowStock: document.getElementById('notifyLowStock')?.checked ?? true,
        statusChanges: document.getElementById('notifyStatusChanges')?.checked ?? true
      },
      
      updatedAt: Date.now()
    };
    
    try {
      await window.saveTelegramSettings(settings);
      addAdminLog('✅ تم حفظ الإعدادات بنجاح', 'success');
      
      if (btn) {
        btn.innerHTML = '✓ تم الحفظ';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
      }
    } catch (error) {
      addAdminLog(`❌ فشل الحفظ: ${error.message}`, 'error');
      if (btn) {
        btn.innerHTML = originalText;
      }
    }
    
    if (btn) btn.disabled = false;
  }
  
  // Send test message to verify notifications work
  async function sendTestMessage() {
    addAdminLog('📤 جاري إرسال رسالة اختبار...');
    
    const testMessage = `🧪 <b>رسالة اختبار من Tiger Jeans</b>
━━━━━━━━━━━━━━━━━━

✅ هذا تأكيد أن إشعارات التليجرام تعمل بشكل صحيح.
⏰ وقت الإرسال: ${new Date().toLocaleString('ar-EG')}

🔗 <a href="${window.SITE_CONFIG?.url || 'https://tiger-jeans.com'}">الموقع</a>`;
    
    try {
      const result = await window.sendCustomTelegramMessage(testMessage);
      
      if (result.success) {
        addAdminLog('✅ تم إرسال رسالة الاختبار بنجاح', 'success');
      } else {
        addAdminLog(`❌ فشل الإرسال: ${result.error}`, 'error');
      }
    } catch (error) {
      addAdminLog(`❌ خطأ: ${error.message}`, 'error');
    }
  }
  
  // Get Chat ID automatically
  async function fetchChatId() {
    const token = document.getElementById('telegramBotToken')?.value?.trim();
    if (!token) {
      addAdminLog('⚠️ أدخل توكن البوت أولاً', 'warning');
      return;
    }
    
    addAdminLog('🔍 جاري جلب Chat ID...');
    
    try {
      // Get updates to find chat ID
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10`);
      const data = await response.json();
      
      if (data.ok && data.result && data.result.length > 0) {
        // Find the most recent chat ID from a user message
        const chatIds = [...new Set(data.result
          .filter(u => u.message)
          .map(u => u.message.chat.id)
        )];
        
        if (chatIds.length > 0) {
          const chatIdInput = document.getElementById('telegramChatId');
          if (chatIdInput) {
            chatIdInput.value = chatIds[0];
            addAdminLog(`✅ تم العثور على Chat ID: ${chatIds[0]}`, 'success');
          }
        } else {
          addAdminLog('⚠️ لم يتم العثور على رسائل. أرسل رسالة للبوت أولاً', 'warning');
        }
      } else {
        addAdminLog('⚠️ لا توجد تحديثات. أرسل رسالة للبوت ثم حاول مرة أخرى', 'warning');
      }
    } catch (error) {
      addAdminLog(`❌ خطأ: ${error.message}`, 'error');
    }
  }
  
  // Initialize admin telegram tab
  window.initTelegramTab = async function() {
    addAdminLog('🔄 جاري تحميل تبويب تليجرام...');
    
    // Load existing settings
    await window.loadTelegramSettings();
    
    // Update form fields
    if (document.getElementById('telegramBotToken')) {
      document.getElementById('telegramBotToken').value = window.TELEGRAM_CONFIG.botToken || '';
    }
    if (document.getElementById('telegramChatId')) {
      document.getElementById('telegramChatId').value = window.TELEGRAM_CONFIG.chatId || '';
    }
    if (document.getElementById('telegramEnabled')) {
      document.getElementById('telegramEnabled').checked = window.TELEGRAM_CONFIG.enabled || false;
    }
    
    // Update notification checkboxes
    const notifs = window.TELEGRAM_CONFIG.notifications || {};
    if (document.getElementById('notifyNewOrders')) document.getElementById('notifyNewOrders').checked = notifs.newOrders !== false;
    if (document.getElementById('notifyPayments')) document.getElementById('notifyPayments').checked = notifs.payments !== false;
    if (document.getElementById('notifyPreorders')) document.getElementById('notifyPreorders').checked = notifs.preorders !== false;
    if (document.getElementById('notifyLowStock')) document.getElementById('notifyLowStock').checked = notifs.lowStock !== false;
    if (document.getElementById('notifyStatusChanges')) document.getElementById('notifyStatusChanges').checked = notifs.statusChanges !== false;
    
    // Auto-test if token exists
    if (window.TELEGRAM_CONFIG.botToken) {
      testConnectionWithFeedback();
    }
    
    window.AdminTelegram.isInitialized = true;
    addAdminLog('✅ تم تحميل تبويب تليجرام بنجاح', 'success');
  };
  
  // Setup event listeners for admin panel
  function setupEventListeners() {
    // Save button
    const saveBtn = document.getElementById('saveTelegramBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettingsFromAdmin);
    }
    
    // Test button
    const testBtn = document.getElementById('testTelegramBtn');
    if (testBtn) {
      testBtn.addEventListener('click', testConnectionWithFeedback);
    }
    
    // Send test message button
    const sendTestBtn = document.getElementById('sendTestMsgBtn');
    if (sendTestBtn) {
      sendTestBtn.addEventListener('click', sendTestMessage);
    }
    
    // Fetch Chat ID button
    const fetchChatIdBtn = document.getElementById('fetchChatIdBtn');
    if (fetchChatIdBtn) {
      fetchChatIdBtn.addEventListener('click', fetchChatId);
    }
    
    // Toggle enabled checkbox
    const enabledCheckbox = document.getElementById('telegramEnabled');
    if (enabledCheckbox) {
      enabledCheckbox.addEventListener('change', (e) => {
        addAdminLog(e.target.checked ? '🟢 تم تفعيل البوت' : '🔴 تم تعطيل البوت');
      });
    }
  }
  
  // Wait for dependencies and initialize
  function init() {
    // Wait for telegram-bot.js
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkDependencies = () => {
      attempts++;
      
      if (typeof window.TelegramBot !== 'undefined') {
        console.log('[Admin-Telegram] Initialized successfully');
        setupEventListeners();
        addAdminLog('🐯 إعدادات تليجرام جاهزة', 'info');
      } else if (attempts < maxAttempts) {
        setTimeout(checkDependencies, 100);
      } else {
        console.warn('[Admin-Telegram] Dependencies not loaded');
        addAdminLog('⚠️ تعذر تحميل مكتبة التليجرام', 'warning');
      }
    };
    
    checkDependencies();
  }
  
  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Public API
  window.AdminTelegram.testConnection = testConnectionWithFeedback;
  window.AdminTelegram.saveSettings = saveSettingsFromAdmin;
  window.AdminTelegram.sendTestMessage = sendTestMessage;
  window.AdminTelegram.fetchChatId = fetchChatId;
  window.AdminTelegram.addLog = addAdminLog;
  
})();
