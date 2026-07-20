/**
 * 🛒❤️ Tiger Jeans - Telegram Notifications Helper
 * =================================================
 * هذا الملف يوضع في الموقع (Frontend) لإرسال إشعارات فورية
 * عند إضافة منتجات للسلة أو المفضلة
 * 
 * 📌 الاستخدام:
 *    1. انسخ هذا الملف إلى مشروع الموقع
 *    2. استدعي الدوال من أي مكان في الكود
 * 
 * 🔧 الإعدادات:
 *    غير WORKER_URL ليشير إلى رابط Worker الخاص بك
 */

// ====== ⚙️ الإعدادات - عدلها حسب إعدادتك ======
const WORKER_URL = 'https://your-worker-domain.workers.dev'; // ← غير هذا الرابط

// ====== 📤 دالة إرسال عامة ======
async function sendNotification(endpoint, data) {
  try {
    const response = await fetch(`${WORKER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Headers اختيارية - إذا كان Firebase مفعل، مش لازم
        // 'X-Bot-Token': 'YOUR_BOT_TOKEN',
        // 'X-Chat-ID': 'YOUR_CHAT_ID'
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
// 🛒 إشعار إضافة للسلة
// ==========================================

/**
 * notifyCartAdd - أرسل إشعار عند إضافة منتج للسلة
 * 
 * @param {Object} product - بيانات المنتج
 * @param {string} product.id - معرف المنتج
 * @param {string} product.name - اسم المنتج
 * @param {number} product.price - سعر المنتج
 * @param {string} [product.image] - صورة المنتج (اختياري)
 * 
 * @param {Object} options - خيارات إضافية
 * @param {number} [options.quantity=1] - الكمية
 * @param {string} [options.size] - المقاس
 * @param {string} [options.color] - اللون
 * @param {number} [options.cartTotal] - إجمالي السلة
 * @param {number} [options.cartItemsCount] - عدد المنتجات في السلة
 * @param {Object} [options.customer] - بيانات العميل (اختياري)
 * 
 * @example
 * // عند الضغط على "أضف للسلة":
 * await notifyCartAdd(
 *   { id: 'prod-123', name: 'بنطلون كلاسيك', price: 550 },
 *   { quantity: 2, size: '32', color: 'أسود' }
 * );
 */
export async function notifyCartAdd(product, options = {}) {
  const data = {
    product: {
      id: product.id || '',
      name: product.name || 'منتج غير معروف',
      price: product.price || 0,
      image: product.image || ''
    },
    quantity: options.quantity || 1,
    size: options.size || null,
    color: options.color || null,
    cartTotal: options.cartTotal || null,
    cartItemsCount: options.cartItemsCount || null,
    customer: options.customer || {}
  };

  return sendNotification('/api/notify/cart', data);
}

// ==========================================
// ❤️ إشعار إضافة للمفضلة
// ==========================================

/**
 * notifyFavoriteAdd - أرسل إشعار عند إضافة منتج للمفضلة
 * 
 * @param {Object} product - بيانات المنتج
 * @param {string} product.id - معرف المنتج
 * @param {string} product.name - اسم المنتج
 * @param {number} product.price - سعر المنتج
 * 
 * @param {Object} [options] - خيارات إضافية
 * @param {number} [options.favoritesCount] - عدد المنتجات في المفضلة
 * @param {Object} [options.customer] - بيانات العميل (اختياري)
 * 
 * @example
 * // عند الضغط على قلب المفضلة:
 * await notifyFavoriteAdd(
 *   { id: 'prod-456', name: 'تيشيرت قطني', price: 350 },
 *   { favoritesCount: 5 }
 * );
 */
export async function notifyFavoriteAdd(product, options = {}) {
  const data = {
    product: {
      id: product.id || '',
      name: product.name || 'منتج غير معروف',
      price: product.price || 0
    },
    favoritesCount: options.favoritesCount || 1,
    customer: options.customer || {}
  };

  return sendNotification('/api/notify/favorite', data);
}

// ==========================================
// 📦 أمثلة عملية للاستخدام في React/Vue/JS
// ==========================================

/*
 * ========== مثال 1: React Component ==========
 * 
 * import { notifyCartAdd, notifyFavoriteAdd } from './telegram-notifications';
 * 
 * // في CartContext أو Store:
 * export function addToCart(product, qty, size, color) {
 *   // ... كود إضافة للسلة العادي ...
 *   
 *   // 📤 أرسل إشعار للتليجرام
 *   notifyCartAdd(product, {
 *     quantity: qty,
 *     size,
 *     color,
 *     cartTotal: cart.total,
 *     cartItemsCount: cart.items.length
 *   });
 * }
 * 
 * // في Favorites Context أو Store:
 * export function toggleFavorite(product) {
 *   // ... كود إضافة/إزالة من المفضلة ...
 *   
 *   if (isNowFavorite) {
 *     // 📤 أرسل إشعار للتليجرام
 *     notifyFavoriteAdd(product, {
 *       favoritesCount: favorites.length
 *     });
 *   }
 * }
 */

/*
 * ========== مثال 2: Vue.js / Pinia ==========
 * 
 * import { notifyCartAdd, notifyFavoriteAdd } from '@/utils/telegram-notifications';
 * 
 * // في Cart Store:
 * actions: {
 *   async addItem({ commit }, { product, quantity, size, color }) {
 *     commit('ADD_ITEM', { product, quantity, size, color });
 *     
 *     // 📤 إشعار تليجرام
 *     await notifyCartAdd(product, {
 *       quantity,
 *       size,
 *       color,
 *       cartTotal: this.total,
 *       cartItemsCount: this.items.length
 *     });
 *   }
 * }
 * 
 * // في Favorites Store:
 * actions: {
 *   async toggleFavorite({ state, commit }, product) {
 *     commit('TOGGLE_FAVORITE', product);
 *     
 *     if (state.favorites.find(f => f.id === product.id)) {
 *       // 📤 إشعار تليجرام
 *       await notifyFavoriteAdd(product, {
 *         favoritesCount: state.favorites.length
 *       });
 *     }
 *   }
 * }
 */

/*
 * ========== مثال 3: Vanilla JavaScript ==========
 * 
 * // في ملف main.js أو utils.js:
 * import { notifyCartAdd, notifyFavoriteAdd } from './telegram-notifications';
 * 
 * // عند الضغط على زر "أضف للسلة":
 * document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
 *   btn.addEventListener('click', async () => {
 *     const product = JSON.parse(btn.dataset.product);
 *     
 *     // ... كود إضافة للسلة ...
 *     
 *     // 📤 إشعار تليجرام
 *     await notifyCartAdd(product, {
 *       quantity: parseInt(document.querySelector('.qty-input')?.value) || 1,
 *       size: document.querySelector('.size-select')?.value,
 *       color: document.querySelector('.color-select')?.value
 *     });
 *   });
 * });
 * 
 * // عند الضغط على زر "المفضلة":
 * document.querySelectorAll('.favorite-btn').forEach(btn => {
 *   btn.addEventListener('click', async () => {
 *     const product = JSON.parse(btn.dataset.product);
 *     
 *     // ... كود تبديل المفضلة ...
 *     
 *     if (btn.classList.contains('active')) {
 *       // 📤 إشعار تليجرام
 *       await notifyFavoriteAdd(product);
 *     }
 *   });
 * });
 */

// ==========================================
// 🔄 تصدير للاستخدام
// ==========================================

// ES Modules (React/Vue/modern):
export { notifyCartAdd, notifyFavoriteAdd, sendNotification };

// CommonJS (Node.js/older):
// module.exports = { notifyCartAdd, notifyFavoriteAdd, sendNotification };

// Global (Browser - if not using modules):
// window.notifyCartAdd = notifyCartAdd;
// window.notifyFavoriteAdd = notifyFavoriteAdd;
