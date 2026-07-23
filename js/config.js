// ====== Firebase Configuration - Tiger Jeans ======
// هذا الملف يحتوي على إعدادات Firebase للمشروع
// ملاحظة: في الإنتاج، يُفضل استخدام Firebase Hosting أو Environment Variables

const firebaseConfig = {
  apiKey: "AIzaSyB6KqNf5pKGEMbVn0k5XqkMKdXMZQhG8",
  authDomain: "tiger-d1433.firebaseapp.com",
  databaseURL: "https://tiger-d1433-default-rtdb.firebaseio.com",
  projectId: "tiger-d1433",
  storageBucket: "tiger-d1433.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ====== Site Configuration ======
const SITE_CONFIG = {
  name: "Tiger Jeans",
  nameAr: "تايجر چينز",
  url: "https://tiger-jeans.com",
  currency: "ج.م",
  currencyCode: "EGP",
  
  // Worker URLs
  telegramWorkerUrl: "https://telegram.studegy10.workers.dev",
  aiWorkerUrl: "https://tigerorder.studegy10.workers.dev/v1",
  
  // Upload worker (for images)
  uploadWorkerUrl: "https://tiger-upload.studegy10.workers.dev"
};

// ====== Helper Functions ======

// Format price in EGP
function fmtPrice(price) {
  if (price === undefined || price === null) return "0 ج.م";
  return Number(price).toLocaleString('ar-EG') + " ج.م";
}

// Generate unique order code
function genOrderCode() {
  return 'TJ-' + Math.random().toString(36).substring(2, 12);
}

// Get current timestamp
function now() {
  return Date.now();
}

// Safe JSON parse
function safeParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Console branding
console.log(
  "%c🐯 Tiger Jeans %c v2.0 ",
  "background: #d4af37; color: #000; padding: 5px 10px; border-radius: 3px 0 0 3px; font-weight: bold;",
  "background: #222; color: #d4af37; padding: 5px 10px; border-radius: 0 3px 3px 0;"
);

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig, SITE_CONFIG, db, auth, fmtPrice, genOrderCode };
}
