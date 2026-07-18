import { auth, db, provider, signInWithPopup, onAuthStateChanged, collection, getDocs } from './firebase-config.js';

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    registerServiceWorker();
    setupScrollAnimations();
    setupNavbarEffect();
    handleAuthentication();
    fetchFeaturedProducts();
}

// 1. تسجيل الـ Service Worker لتمكين PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW مسجل بنجاح:', registration.scope))
                .catch(err => console.log('فشل تسجيل SW:', err));
        });
    }
}

// 2. الحركات البصرية (Animations) عند التمرير
function setupScrollAnimations() {
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.hidden').forEach((el) => observer.observe(el));
}

// 3. تأثير تظليل شريط التنقل (Sticky Navbar)
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

// 4. نظام المصادقة (Firebase Auth)
function handleAuthentication() {
    const authBtn = document.getElementById('authBtn');
    const profileLink = document.getElementById('profileLink');

    // الاستماع لحالة المستخدم
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // مستخدم مسجل الدخول
            authBtn.innerHTML = `👤 ${user.displayName.split(' ')[0]}`;
            profileLink.style.display = 'inline-block';
            authBtn.onclick = () => window.location.href = 'profile.html';
        } else {
            // غير مسجل
            authBtn.innerHTML = `👤 دخول`;
            profileLink.style.display = 'none';
            authBtn.onclick = () => {
                signInWithPopup(auth, provider).catch(error => {
                    console.error("فشل تسجيل الدخول:", error);
                    alert("تعذر تسجيل الدخول، يرجى المحاولة لاحقاً.");
                });
            };
        }
    });
}

// 5. جلب المنتجات من Firestore وعرضها ديناميكياً
async function fetchFeaturedProducts() {
    const container = document.getElementById('productsContainer');
    
    try {
        // سيقوم هذا الكود بجلب البيانات من مجموعة 'Products'
        const querySnapshot = await getDocs(collection(db, "Products"));
        container.innerHTML = ''; // تفريغ الـ Spinner
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p style="text-align:center; grid-column:1/-1;">لا توجد منتجات حالياً.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const card = createProductCard(doc.id, product);
            container.innerHTML += card;
        });

    } catch (error) {
        console.error("خطأ في جلب المنتجات:", error);
        container.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:red;">حدث خطأ في تحميل المنتجات.</p>';
    }
}

// 6. قالب بطاقة المنتج (HTML Generator)
function createProductCard(id, product) {
    // إنشاء خيارات المقاسات
    const sizesHtml = product.sizes ? product.sizes.map(size => `<span>${size}</span>`).join('') : '';
    
    // حساب السعر القديم إن وجد
    const oldPriceHtml = product.oldPrice ? `<span class="old">${product.oldPrice.toFixed(2)} ج.م</span>` : '';

    return `
        <div class="product-card">
            <div class="product-image">
                <!-- الرابط هنا سيكون من Cloudflare R2 -->
                <img src="${product.imageUrl || 'https://via.placeholder.com/400x500/222/fff?text=صورة+المنتج'}" alt="${product.name}" loading="lazy">
                <div class="hover-actions">
                    <button class="btn-add-cart" onclick="addToCart('${id}', '${product.name}', ${product.price}, '${product.imageUrl}')">
                        🛒 أضف للسلة
                    </button>
                    <button class="btn-icon" aria-label="إضافة للمفضلة">🤍</button>
                    <button class="btn-icon" aria-label="عرض سريع">👁️</button>
                </div>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="sizes">
                    المقاسات:
                    <div class="size-options">
                        ${sizesHtml || '<span>متوفر بمقاسات مختلفة</span>'}
                    </div>
                </div>
                <div class="price">
                    <span class="current">${product.price.toFixed(2)} ج.م</span>
                    ${oldPriceHtml}
                </div>
            </div>
        </div>
    `;
}

// 7. دالة إضافة المنتج للسلة (مؤقتة باستخدام LocalStorage لسرعة الأداء)
window.addToCart = function(id, name, price, image) {
    let cart = JSON.parse(localStorage.getItem('tiger_cart')) || [];
    
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1 });
    }
    
    localStorage.setItem('tiger_cart', JSON.stringify(cart));
    updateCartCount();
    
    // أنيميشن صغير للتأكيد
    const cartBtn = document.getElementById('cartBtn');
    cartBtn.style.transform = 'scale(1.2)';
    setTimeout(() => cartBtn.style.transform = 'scale(1)', 200);
}

function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem('tiger_cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').innerText = totalItems;
}

// تحديث العداد عند تحميل الصفحة
updateCartCount();
