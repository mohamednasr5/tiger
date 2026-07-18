// ====== إعدادات المتجر ======
const firebaseConfig = {
  apiKey: "ضع-API-KEY-هنا",
  authDomain: "ضع-PROJECT-ID.firebaseapp.com",
  databaseURL: "https://ضع-PROJECT-ID-default-rtdb.firebaseio.com",
  projectId: "ضع-PROJECT-ID",
  storageBucket: "ضع-PROJECT-ID.appspot.com",
  messagingSenderId: "ضع-SENDER-ID",
  appId: "ضع-APP-ID"
};

const UPLOAD_WORKER_URL = "https://tiger-upload.studegy10.workers.dev";
const STORE_NAME = "Tiger Jeans";
const CART_KEY = "tj_cart";

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ====== أدوات مساعدة عامة ======
function fmtPrice(n) {
  return Number(n || 0).toLocaleString("ar-EG") + " جنيه";
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
  showToast("تمت الإضافة إلى السلة");
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
  });
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
