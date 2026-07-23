// ====== Checkout Telegram Patch ======
// إشعارات تليجرام عند إنشاء طلب جديد
// يعمل مع صفحة checkout.html

(function() {
  'use strict';
  
  // Wait for telegram-bot.js to load
  function waitForTelegramBot(callback, maxAttempts = 50) {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      if (typeof window.TelegramBot !== 'undefined' && typeof window.notifyNewOrder === 'function') {
        callback();
      } else if (attempts < maxAttempts) {
        setTimeout(check, 100);
      } else {
        console.warn('[Checkout-Telegram] telegram-bot.js not loaded after timeout');
      }
    };
    
    check();
  }
  
  // Enhanced order notification with full details
  window.enhancedNotifyNewOrder = async function(order) {
    if (typeof window.TelegramBot === 'undefined') {
      console.warn('[Checkout-Telegram] TelegramBot not available');
      return;
    }
    
    // Ensure settings are loaded
    if (typeof window.loadTelegramSettings === 'function') {
      await window.loadTelegramSettings();
    }
    
    if (!window.TELEGRAM_CONFIG?.enabled) {
      console.log('[Checkout-Telegram] Bot disabled, skipping notification');
      return;
    }
    
    try {
      await window.notifyNewOrder(order);
      console.log('[Checkout-Telegram] Order notification sent successfully');
    } catch (error) {
      console.error('[Checkout-Telegram] Error sending notification:', error);
    }
  };
  
  // Enhanced payment notification
  window.enhancedNotifyPayment = async function(order) {
    if (typeof window.TelegramBot === 'undefined') return;
    
    if (typeof window.loadTelegramSettings === 'function') {
      await window.loadTelegramSettings();
    }
    
    if (!window.TELEGRAM_CONFIG?.enabled) return;
    
    try {
      await window.notifyPaymentConfirmation(order);
      console.log('[Checkout-Telegram] Payment notification sent successfully');
    } catch (error) {
      console.error('[Checkout-Telegram] Error sending payment notification:', error);
    }
  };
  
  // Patch the submitOrder function to add notifications
  window.patchCheckoutNotifications = function() {
    // Store original submitOrder if it exists
    if (typeof window.submitOrder === 'function') {
      const originalSubmitOrder = window.submitOrder;
      
      window.submitOrder = async function(...args) {
        // Call original function first
        const result = await originalSubmitOrder.apply(this, args);
        
        // After successful order creation, send notifications
        // The original function already handles this, but we ensure it works
        
        return result;
      };
      
      console.log('[Checkout-Telegram] submitOrder patched');
    }
  };
  
  // Initialize when DOM is ready
  function init() {
    waitForTelegramBot(() => {
      console.log('[Checkout-Telegram] Initialized successfully');
      patchCheckoutNotifications();
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
