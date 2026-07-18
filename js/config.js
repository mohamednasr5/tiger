// ====== إعدادات المتجر ======
const firebaseConfig = {
  apiKey: "AIzaSyCzkn2CQrhgtuqxy1t-lUWgbzUmmQhznN8",
  authDomain: "tiger-d1433.firebaseapp.com",
  databaseURL: "https://tiger-d1433-default-rtdb.firebaseio.com",
  projectId: "tiger-d1433",
  storageBucket: "tiger-d1433.firebasestorage.app",
  messagingSenderId: "421931992267",
  appId: "1:421931992267:web:a2262dbb2984b3b158074e",
  measurementId: "G-6ESN039VQC"
};

const UPLOAD_WORKER_URL = "https://tiger-upload.studegy10.workers.dev";
const STORE_NAME = "Tiger Jeans";
const CART_KEY = "tj_cart";

// ====== محافظات مصر (لاستخدامها في قوائم الاختيار) ======
const EGYPT_GOVERNORATES = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر",
  "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية",
  "المنيا", "القليوبية", "الوادي الجديد", "السويس", "أسوان",
  "أسيوط", "بني سويف", "بورسعيد", "دمياط", "الشرقية",
  "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا",
  "شمال سيناء", "سوهاج"
];

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ====== إدارة حالة تسجيل الدخول (تبقى فعّالة بعد الدخول وبعد تحديث الصفحة) ======
let currentUser = null;

auth.onAuthStateChanged((user) => {
  currentUser = user;
  updateAuthUI(user);
});

function updateAuthUI(user) {
  const topAccountLink = document.getElementById("topAccountLink");
  const topLoginLink = document.getElementById("topLoginLink");
  const headerAccountBtn = document.getElementById("headerAccountBtn");
  const displayName = user ? (user.displayName || user.email || "حسابي") : null;

  if (topAccountLink) {
    topAccountLink.innerHTML = user
      ? `<i class='bx bx-user-check'></i> ${displayName}`
      : `<i class='bx bx-user'></i> حسابي`;
    topAccountLink.onclick = (e) => {
      e.preventDefault();
      user ? openAccountMenu() : (typeof openAuthModal === "function" && openAuthModal());
    };
  }

  if (topLoginLink) {
    topLoginLink.textContent = user ? "تسجيل الخروج" : "سجل دخولك";
    topLoginLink.onclick = (e) => {
      e.preventDefault();
      if (user) {
        doLogout();
      } else if (typeof openAuthModal === "function") {
        openAuthModal();
      }
    };
  }

  if (headerAccountBtn) {
    headerAccountBtn.title = user ? `مسجل دخول: ${displayName}` : "تسجيل الدخول";
    headerAccountBtn.classList.toggle("logged-in", !!user);
    headerAccountBtn.onclick = (e) => {
      e.preventDefault();
      user ? openAccountMenu() : (typeof openAuthModal === "function" && openAuthModal());
    };
  }
}

// نافذة بسيطة لإدارة الحساب بعد تسجيل الدخول (تسجيل الخروج)
function openAccountMenu() {
  if (!currentUser) {
    if (typeof openAuthModal === "function") openAuthModal();
    return;
  }
  const name = currentUser.displayName || currentUser.email || "";
  const wantsLogout = confirm(`مسجل دخول باسم: ${name}\n\nهل تريد تسجيل الخروج؟`);
  if (wantsLogout) doLogout();
}

function doLogout() {
  auth.signOut().then(() => {
    showToast("تم تسجيل الخروج بنجاح");
  }).catch((err) => {
    showToast("حدث خطأ أثناء تسجيل الخروج");
    console.log("Logout error:", err);
  });
}

// ====== أدوات مساعدة عامة ======
function fmtPrice(n) {
  return Number(n || 0).toLocaleString("ar-EG") + " ج.م";
}

function genOrderCode() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return "TJ-" + Date.now().toString().slice(-6) + rand;
}

function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

// ====== إدارة السلة (localStorage) ======
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(
    (c) => c.id === item.id && c.size === item.size && c.color === item.color
  );
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);
  showToast("تمت الإضافة إلى السلة ✓");
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function updateCartQty(index, qty) {
  const cart = getCart();
  if (!cart[index]) return;
  cart[index].qty = Math.max(1, qty);
  saveCart(cart);
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function updateCartBadge() {
  document.querySelectorAll(".cart-badge").forEach((b) => {
    const c = cartCount();
    b.textContent = c;
    b.style.display = c > 0 ? "flex" : "none";
    b.classList.remove("bump");
    void b.offsetWidth;
    b.classList.add("bump");
  });
}

// ====== إدارة المفضلة (localStorage) ======
const WISHLIST_KEY = "tj_wishlist";

function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  updateWishlistBadge();
}

function isWishlisted(id) {
  return getWishlist().some((w) => w.id === id);
}

function toggleWishlistItem(item) {
  const list = getWishlist();
  const idx = list.findIndex((w) => w.id === item.id);
  let added;
  if (idx > -1) {
    list.splice(idx, 1);
    added = false;
  } else {
    list.push(item);
    added = true;
  }
  saveWishlist(list);
  return added;
}

function removeFromWishlist(id) {
  saveWishlist(getWishlist().filter((w) => w.id !== id));
}

function wishlistCount() {
  return getWishlist().length;
}

function updateWishlistBadge() {
  document.querySelectorAll(".wishlist-badge").forEach((b) => {
    const c = wishlistCount();
    b.textContent = c;
    b.style.display = c > 0 ? "flex" : "none";
    b.classList.remove("bump");
    void b.offsetWidth;
    b.classList.add("bump");
  });
  document.querySelectorAll(".wishlist-btn").forEach((btn) => {
    const id = btn.dataset.id;
    if (!id) return;
    const active = isWishlisted(id);
    btn.classList.toggle("active", active);
    const icon = btn.querySelector("i");
    if (icon) icon.className = active ? "bx bxs-heart" : "bx bx-heart";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  updateWishlistBadge();
});
