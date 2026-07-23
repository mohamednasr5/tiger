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

  const bottomAccountLink = document.getElementById("bottomAccountLink");
  if (bottomAccountLink) {
    const icon = bottomAccountLink.querySelector("i");
    if (icon) icon.className = user ? "bx bxs-user-check" : "bx bx-user";
    // Always go straight to "طلباتي" (orders.html) — no logout confirm popup here.
    // Logging out is handled from the account menu (topAccountLink / headerAccountBtn), not this button.
    bottomAccountLink.onclick = null;
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

  if (typeof notifyCartAdd === "function") {
    notifyCartAdd(item).catch((e) => console.log("Telegram cart notify error:", e));
  }
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
  initTheme();
});

// ====== الثيم الليلي / النهاري (Dark / Light Mode) ======
const THEME_KEY = "tj_theme";

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll(".theme-toggle i").forEach((i) => {
    i.className = theme === "dark" ? "bx bx-moon" : "bx bx-sun";
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// Apply theme immediately (before DOMContentLoaded) to avoid flash
(function () {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  document.documentElement.setAttribute("data-theme", saved);
})();

// ====== تفعيل العنصر النشط في شريط التنقل السفلي (Bottom Nav) ======
function setActiveBottomNav(pageKey) {
  document.querySelectorAll(".bottom-nav a[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === pageKey);
  });
}

// ====== تتبع الزوار وحظر الـ IP ======
// كل زيارة (مرة واحدة لكل جلسة متصفح) بتتسجل فى visitors/{ipKey} مع تقريب الموقع
// ولو الـ IP محظور من لوحة التحكم (blockedIPs/{ipKey}) بيتوقف عرض الموقع للزائر ده.
function ipToKey(ip) {
  return String(ip || "").replace(/[.:]/g, "_");
}

function showBlockedOverlay(info) {
  try {
    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;' +
      'background:#0b0b0c;color:#fff;font-family:Tahoma,Arial,sans-serif;text-align:center;padding:2rem;direction:rtl">' +
      '<div><i class="bx bx-block" style="font-size:3.2rem;color:#e0554b"></i>' +
      '<h2 style="margin:1rem 0 .5rem">تم حظر الوصول لهذا الموقع</h2>' +
      '<p style="color:#999;max-width:420px;margin:0 auto">' +
      (info && info.reason ? info.reason : "تم حظر عنوان الـ IP الخاص بك من إدارة المتجر") +
      "</p></div></div>";
    document.body.style.margin = "0";
  } catch (e) {}
}

async function trackVisitorAndCheckBlock() {
  // متعملش تتبع أو حظر في لوحة التحكم نفسها
  if (/admin\.html/i.test(location.pathname)) return;

  try {
    let info = null;
    const cached = sessionStorage.getItem("tj_visitor_info");
    if (cached) {
      try { info = JSON.parse(cached); } catch (e) { info = null; }
    }
    if (!info) {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const d = await res.json();
        if (d && d.ip) {
          info = { ip: d.ip, city: d.city || null, region: d.region || null, country: d.country_name || null };
          sessionStorage.setItem("tj_visitor_info", JSON.stringify(info));
        }
      }
    }
    if (!info || !info.ip) return;
    const ipKey = ipToKey(info.ip);

    // تحقق من الحظر أولاً
    const blockSnap = await db.ref("blockedIPs/" + ipKey).once("value");
    if (blockSnap.exists()) {
      showBlockedOverlay(blockSnap.val());
      return;
    }

    // سجل/حدّث بيانات الزائر مرة واحدة لكل جلسة تصفح فقط
    if (!sessionStorage.getItem("tj_visit_logged")) {
      sessionStorage.setItem("tj_visit_logged", "1");
      const ref = db.ref("visitors/" + ipKey);
      const snap = await ref.once("value");
      const now = Date.now();
      if (snap.exists()) {
        const cur = snap.val();
        await ref.update({
          lastSeen: now,
          lastPage: location.pathname,
          visitCount: (cur.visitCount || 0) + 1,
          city: info.city || cur.city || null,
          region: info.region || cur.region || null,
          country: info.country || cur.country || null
        });
      } else {
        await ref.set({
          ip: info.ip,
          city: info.city || null,
          region: info.region || null,
          country: info.country || null,
          firstSeen: now,
          lastSeen: now,
          lastPage: location.pathname,
          visitCount: 1
        });
      }
    }
  } catch (e) {
    // فشل التتبع (شبكة/أد بلوكر) مش لازم يوقف الموقع
    console.log("visitor tracking error:", e);
  }
}

document.addEventListener("DOMContentLoaded", trackVisitorAndCheckBlock);