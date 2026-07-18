// js/app.js
import { auth, db, provider, signInWithPopup, onAuthStateChanged, collection, getDocs } from './firebase-config.js';

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    registerServiceWorker();
    setupScrollAnimations();
    setupNavbarEffect();
    handleAuthentication();
    // جلب المنتجات سواء في الرئيسية أو المتجر
    fetchProducts();
}

// 1. تسجيل الـ Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Error:', err));
    }
}

// 2. الحركات البصرية (Scroll Animations)
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.hidden').forEach((el) => observer.observe(el));
}

// 3. تأثير الـ Navbar
function setupNavbarEffect() {
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.8)';
            navbar.style.background = 'rgba(15, 15, 17, 0.98)';
        } else {
            navbar.style.boxShadow = 'none';
            navbar.style.background = 'rgba(15, 15, 17, 0.85)';
        }
    });
}

// 4. نظام المصادقة (Auth)
function handleAuthentication() {
    const authBtn = document.getElementById('authBtn');
    const profileLink = document.getElementById('profileLink');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            authBtn.innerHTML = `👤 ${user.displayName.split(' ')[0]}`;
            if (profileLink) profileLink.style.display = 'inline-block';
            authBtn.onclick = () => window.location.href = 'profile.html';
        } else {
            authBtn.innerHTML = `👤 دخول`;
            if (profileLink) profileLink.style.display = 'none';
            authBtn.onclick = () => signInWithPopup(auth, provider);
        }
    });
}

// 5. جلب المنتجات (تعمل على الصفحة الرئيسية وصفحة المتجر)
async function fetchProducts() {
    const container = document.getElementById('productsContainer') || document.getElementById('allProductsContainer');
    if (!container) return;
    
    try {
        const querySnapshot = await getDocs(collection(db, "Products"));
        container.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            container.innerHTML += createProductCard(doc.id, doc.data());
        });
    } catch (error) {
        container.innerHTML = '<p style="text-align:center; color:red;">خطأ في تحميل المنتجات.</p>';
    }
}

// 6. قالب بطاقة المنتج (Product Card Template)
function createProductCard(id, product) {
    const sizesHtml = product.sizes ? product.sizes.map(s => `<span>${s}</span>`).join('') : '';
    const oldPriceHtml = product.oldPrice ? `<span class="old">${product.oldPrice.toFixed(2)} ج.م</span>` : '';

    return `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
                <div class="hover-actions">
                    <button class="btn-add-cart" onclick="addToCart('${id}', '${product.name}', ${product.price}, '${product.imageUrl}')">
                        🛒 أضف للسلة
                    </button>
                    <button class="btn-icon">🤍</button>
                </div>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="size-options">${sizesHtml}</div>
                <div class="price">
                    <span class="current">${product.price.toFixed(2)} ج.م</span>
                    ${oldPriceHtml}
                </div>
            </div>
        </div>
    `;
}

// 7. إدارة سلة المشتريات (Cart Logic)
window.addToCart = function(id, name, price, image) {
    let cart = JSON.parse(localStorage.getItem('tiger_cart')) || [];
    const itemIndex = cart.findIndex(i => i.id === id);
    
    if (itemIndex > -1) {
        cart[itemIndex].quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1 });
    }
    
    localStorage.setItem('tiger_cart', JSON.stringify(cart));
    updateCartCount();
    alert("تمت الإضافة للسلة!");
}

function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem('tiger_cart')) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.innerText = count;
}

updateCartCount();
