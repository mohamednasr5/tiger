// ============================================================
// TIGER E-Commerce - Main Application
// ============================================================
import { auth, db, storage, analytics, messaging } from './firebase-config.js';
import Auth from './modules/auth.js';
import Products from './modules/products.js';
import Cart from './modules/cart.js';
import Wishlist from './modules/wishlist.js';
import Notifications from './modules/notifications.js';
import Orders from './modules/orders.js';
import Utils from './utils.js';

window.TigerApp = { Auth, Products, Cart, Wishlist, Notifications, Orders, Utils };

const App = {
  async init() {
    this.initPageLoader();
    this.initHeader();
    this.initMobileMenu();
    this.initSearch();
    this.initHeroSlider();
    this.initScrollAnimations();
    this.initBackToTop();
    this.initInstallBanner();
    this.initNewsletter();
    this.initCartDrawer();
    this.initLoginModal();
    this.initAccordions();

    const page = document.body.dataset.page;
    if (page === 'home') await this.initHomepage();
    if (page === 'shop') await this.initShopPage();
    if (page === 'product') await this.initProductPage();
    if (page === 'cart') await this.initCartPage();
    if (page === 'checkout') await this.initCheckoutPage();
    if (page === 'account') await this.initAccountPage();
    if (page === 'wishlist') await this.initWishlistPage();

    Utils.lazyLoadImages();
    this.initGoogleLogin();

    setTimeout(() => {
      const loader = document.getElementById('pageLoader');
      if (loader) { loader.classList.add('loaded'); setTimeout(() => loader.style.display = 'none', 500); }
    }, 800);
  },

  initPageLoader() { window.addEventListener('load', () => document.body.classList.add('loaded')); },

  initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    let lastScroll = 0;
    window.addEventListener('scroll', Utils.throttle(() => {
      const s = window.scrollY;
      header.classList.toggle('header-scrolled', s > 100);
      if (document.body.dataset.page === 'home') {
        header.classList.toggle('header-hidden', s > lastScroll && s > 300);
      }
      lastScroll = s;
    }, 50));
    document.querySelectorAll('.nav-item-has-children').forEach(item => {
      let t;
      item.addEventListener('mouseenter', () => { clearTimeout(t); item.classList.add('hover'); });
      item.addEventListener('mouseleave', () => { t = setTimeout(() => item.classList.remove('hover'), 150); });
    });
  },

  initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileOverlay');
    const closeBtn = document.getElementById('mobileClose');
    if (!hamburger || !menu) return;
    const open = () => { hamburger.classList.add('active'); menu.classList.add('active'); overlay?.classList.add('active'); document.body.style.overflow = 'hidden'; };
    const close = () => { hamburger.classList.remove('active'); menu.classList.remove('active'); overlay?.classList.remove('active'); document.body.style.overflow = ''; };
    hamburger.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    menu.querySelectorAll('.mobile-submenu-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => { e.preventDefault(); toggle.classList.toggle('active'); toggle.nextElementSibling?.classList.toggle('active'); });
    });
    menu.querySelectorAll('a:not(.mobile-submenu-toggle)').forEach(link => link.addEventListener('click', close));
  },

  initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('searchInput');
    const close = document.getElementById('searchClose');
    const results = document.getElementById('searchResults');
    if (!searchBtn || !overlay) return;
    const openS = () => { overlay.classList.add('active'); document.body.style.overflow = 'hidden'; setTimeout(() => input?.focus(), 300); };
    const closeS = () => { overlay.classList.remove('active'); document.body.style.overflow = ''; if (input) input.value = ''; if (results) results.innerHTML = ''; };
    searchBtn.addEventListener('click', openS);
    close?.addEventListener('click', closeS);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeS(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('active')) closeS(); });
    if (input && results) {
      input.addEventListener('input', Utils.debounce(() => {
        const q = input.value.trim();
        if (q.length < 2) { results.innerHTML = ''; return; }
        results.innerHTML = '<div class="search-loading">Searching...</div>';
        const r = Products.search(q);
        results.innerHTML = r.length === 0 ? '<div class="search-no-results">No products found</div>' :
          r.slice(0, 8).map(p => `<a href="pages/product.html?id=${p.id}" class="search-result-item"><div class="search-result-img"><img src="${p.images?.[0] || ''}" alt="${Utils.sanitize(p.name)}" loading="lazy"></div><div class="search-result-info"><h4>${Utils.sanitize(p.name)}</h4><div class="search-result-price">${p.salePrice && p.salePrice < p.originalPrice ? `<span class="price-sale">${Utils.formatPrice(p.salePrice)}</span><span class="price-original">${Utils.formatPrice(p.originalPrice)}</span>` : `<span>${Utils.formatPrice(p.originalPrice)}</span>`}</div></div></a>`).join('');
      }, 300));
    }
  },

  initHeroSlider() {
    const slider = document.getElementById('heroSlider');
    if (!slider) return;
    const slides = slider.querySelectorAll('.hero-slide');
    const dots = slider.querySelectorAll('.hero-dot');
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');
    let current = 0, interval; const total = slides.length;
    if (total === 0) return;
    const goTo = (i) => {
      slides[current]?.classList.remove('active'); dots[current]?.classList.remove('active');
      current = ((i % total) + total) % total;
      slides[current]?.classList.add('active'); dots[current]?.classList.add('active');
      slides[current]?.querySelectorAll('[class*="animate-"]').forEach(el => { el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; });
    };
    const next = () => goTo(current + 1), prev = () => goTo(current - 1);
    const start = () => { interval = setInterval(next, 5000); }, stop = () => clearInterval(interval);
    prevBtn?.addEventListener('click', () => { stop(); prev(); start(); });
    nextBtn?.addEventListener('click', () => { stop(); next(); start(); });
    dots.forEach(d => d.addEventListener('click', () => { stop(); goTo(parseInt(d.dataset.slide)); start(); }));
    let sx = 0;
    slider.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', (e) => { const d = sx - e.changedTouches[0].clientX; if (Math.abs(d) > 50) { stop(); d > 0 ? next() : prev(); start(); } }, { passive: true });
    start();
  },

  initScrollAnimations() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          if (entry.target.hasAttribute('data-count')) Utils.animateCounter(entry.target, parseInt(entry.target.dataset.count));
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.animate-on-scroll, [data-count]').forEach(el => obs.observe(el));
  },

  initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', Utils.throttle(() => btn.classList.toggle('active', window.scrollY > 500), 100));
    btn.addEventListener('click', () => Utils.scrollTo('body', 0));
  },

  initInstallBanner() {
    let dp;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); dp = e; document.getElementById('installBanner').style.display = 'block'; });
    document.getElementById('installBtn')?.addEventListener('click', async () => {
      if (dp) { dp.prompt(); const { outcome } = await dp.userChoice; if (outcome === 'accepted') Utils.showToast('TIGER app installed!', 'success'); dp = null; document.getElementById('installBanner').style.display = 'none'; }
    });
    document.getElementById('installDismiss')?.addEventListener('click', () => { document.getElementById('installBanner').style.display = 'none'; });
    window.addEventListener('appinstalled', () => { document.getElementById('installBanner').style.display = 'none'; dp = null; });
  },

  initNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]')?.value;
      if (!Utils.isValidEmail(email)) { Utils.showToast('Please enter a valid email', 'error'); return; }
      try {
        const { ref, push, set } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js");
        await push(ref(db, 'newsletter'), { email, subscribedAt: Date.now() });
        Utils.showToast('Subscribed! Check email for 10% off', 'success'); form.reset();
      } catch { Utils.showToast('Subscription failed', 'error'); }
    });
  },

  initCartDrawer() {
    const cartBtn = document.getElementById('cartBtn');
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    const closeBtn = document.getElementById('cartDrawerClose');
    if (!cartBtn || !drawer) return;
    const open = () => { drawer.classList.add('active'); overlay?.classList.add('active'); document.body.style.overflow = 'hidden'; this.renderCartDrawer(); };
    const close = () => { drawer.classList.remove('active'); overlay?.classList.remove('active'); document.body.style.overflow = ''; };
    cartBtn.addEventListener('click', (e) => { e.preventDefault(); open(); });
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    Cart.onUpdate(() => this.renderCartDrawer());
  },

  renderCartDrawer() {
    const itemsEl = document.getElementById('cartDrawerItems');
    const subtotalEl = document.getElementById('cartDrawerSubtotal');
    if (!itemsEl) return;
    if (Cart.items.length === 0) {
      itemsEl.innerHTML = '<div class="cart-drawer-empty"><p>Your cart is empty</p><a href="pages/shop.html" class="btn btn-primary btn-sm">Start Shopping</a></div>';
      if (subtotalEl) subtotalEl.textContent = 'EGP 0';
      return;
    }
    itemsEl.innerHTML = Cart.items.map(item => `
      <div class="cart-drawer-item"><div class="cart-drawer-item-img"><img src="${item.image}" alt="${Utils.sanitize(item.name)}" loading="lazy"></div>
      <div class="cart-drawer-item-info"><h4>${Utils.sanitize(item.name)}</h4><p class="cart-drawer-item-variant">${item.size ? 'Size: '+item.size : ''} ${item.color ? '· '+item.color : ''}</p><p class="cart-drawer-item-price">${Utils.formatPrice(item.price)} × ${item.quantity}</p></div>
      <button class="cart-drawer-item-remove" data-remove="${item.id}">✕</button></div>`).join('');
    if (subtotalEl) subtotalEl.textContent = Utils.formatPrice(Cart.getSubtotal());
    itemsEl.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => Cart.removeItem(btn.dataset.remove)));
  },

  initLoginModal() {
    const loginBtns = document.querySelectorAll('.login-btn, [data-login]');
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    const close = () => modal.classList.remove('active');
    loginBtns.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('active'); }));
    modal.querySelector('.modal-close')?.addEventListener('click', close);
    modal.querySelector('.modal-overlay')?.addEventListener('click', close);
    document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
      const r = await Auth.loginWithGoogle();
      if (r.success) { close(); Utils.showToast('Welcome, ' + r.user.displayName + '!', 'success'); }
    });
  },

  initGoogleLogin() {
    document.querySelectorAll('[data-google-login]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const r = await Auth.loginWithGoogle();
        if (r.success) { Utils.showToast('Welcome, ' + r.user.displayName + '!', 'success'); document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); }
      });
    });
    document.querySelectorAll('[data-logout]').forEach(btn => btn.addEventListener('click', () => Auth.logout()));
  },

  initAccordions() {
    document.querySelectorAll('.accordion-header').forEach(h => {
      h.addEventListener('click', () => {
        const item = h.parentElement, isOpen = item.classList.contains('active');
        item.closest('.product-accordion, .accordion-group')?.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
        if (!isOpen) item.classList.add('active');
      });
    });
  },

  // ==================== STAR HTML ====================
  getStarHTML(rating) {
    let html = '<div class="stars">';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) html += '<span class="star filled">★</span>';
      else if (i - 0.5 <= rating) html += '<span class="star half">★</span>';
      else html += '<span class="star empty">★</span>';
    }
    return html + '</div>';
  },

  // ==================== PRODUCT CARD ====================
  createProductCard(product, index = 0) {
    const hasDiscount = product.salePrice && product.salePrice < product.originalPrice;
    const discount = hasDiscount ? Utils.calcDiscount(product.originalPrice, product.salePrice) : 0;
    const secondImage = product.images?.[1] || '';
    const mainImage = product.images?.[0] || '';
    return `<div class="product-card animate-fade-in-up" style="animation-delay:${index*0.08}s">
      <div class="product-card-image">
        <a href="pages/product.html?id=${product.id}"><img src="${mainImage}" alt="${Utils.sanitize(product.name)}" loading="lazy" class="product-main-img">${secondImage ? `<img src="${secondImage}" alt="${Utils.sanitize(product.name)}" loading="lazy" class="product-second-img">` : ''}</a>
        <div class="product-card-badges">${hasDiscount ? `<span class="badge badge-sale">-${discount}%</span>` : ''}${product.newArrival ? '<span class="badge badge-new">New</span>' : ''}${product.bestSeller ? '<span class="badge badge-bestseller">Best Seller</span>' : ''}</div>
        <div class="product-card-actions">
          <button class="product-action-btn" data-wishlist-btn="${product.id}" aria-label="Wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
          <a href="pages/product.html?id=${product.id}" class="product-action-btn" aria-label="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
          <button class="product-action-btn" data-share-btn="${product.id}" aria-label="Share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
        </div>
      </div>
      <div class="product-card-info">
        <span class="product-card-category">${Utils.sanitize(product.categoryName || product.category || '')}</span>
        <h3 class="product-card-name"><a href="pages/product.html?id=${product.id}">${Utils.sanitize(product.name)}</a></h3>
        <div class="product-card-rating">${this.getStarHTML(product.avgRating || 0)}${product.reviewCount ? `<span>(${product.reviewCount})</span>` : ''}</div>
        <div class="product-card-price">${hasDiscount ? `<span class="price-sale">${Utils.formatPrice(product.salePrice)}</span><span class="price-original">${Utils.formatPrice(product.originalPrice)}</span>` : `<span class="price-current">${Utils.formatPrice(product.originalPrice)}</span>`}</div>
      </div></div>`;
  },

  // ==================== HOMEPAGE ====================
  async initHomepage() {
    Utils.showSkeleton(document.getElementById('featuredGrid'), 4);
    Utils.showSkeleton(document.getElementById('bestSellersGrid'), 4);
    Utils.showSkeleton(document.getElementById('newArrivalsGrid'), 4);
    await Products.fetchAll();
    this.renderGrid('featuredGrid', Products.getFeatured());
    this.renderGrid('bestSellersGrid', Products.getBestSellers());
    this.renderGrid('newArrivalsGrid', Products.getNewArrivals());
    this.attachProductListeners();
  },

  renderGrid(gridId, products) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    if (!products.length) { grid.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1">No products available yet.</p>'; return; }
    grid.innerHTML = products.slice(0, 8).map((p, i) => this.createProductCard(p, i)).join('');
  },

  attachProductListeners() {
    document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); Wishlist.toggle(btn.dataset.wishlistBtn); });
    });
    document.querySelectorAll('[data-share-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); Utils.shareProduct({ title: btn.dataset.shareBtn, url: window.location.href }); });
    });
  },

  // ==================== SHOP PAGE ====================
  async initShopPage() {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;
    Utils.showSkeleton(grid, 8);
    await Products.fetchAll();
    await Products.fetchCategories();
    this.renderCategoryNav();
    this.initShopControls();
    this.applyFilters();
  },

  renderCategoryNav() {
    const nav = document.getElementById('categoryNav');
    if (!nav) return;
    let html = '<button class="filter-chip active" data-category="all">All</button>';
    Products.categories.forEach(c => { html += `<button class="filter-chip" data-category="${c.id}">${Utils.sanitize(c.name)}</button>`; });
    nav.innerHTML = html;
    nav.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => { nav.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); this.applyFilters(); });
    });
  },

  initShopControls() {
    document.getElementById('sortSelect')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('priceRange')?.addEventListener('input', Utils.debounce(() => this.applyFilters(), 300));
    document.querySelectorAll('[data-size-filter]').forEach(btn => btn.addEventListener('click', () => { btn.classList.toggle('active'); this.applyFilters(); }));
    document.getElementById('saleFilter')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterToggle')?.addEventListener('click', () => document.getElementById('shopFilters')?.classList.toggle('active'));
  },

  applyFilters() {
    const cat = document.querySelector('.filter-chip.active')?.dataset.category || 'all';
    const sort = document.getElementById('sortSelect')?.value || 'newest';
    const saleOnly = document.getElementById('saleFilter')?.checked;
    const sizes = [...document.querySelectorAll('[data-size-filter].active')].map(b => b.dataset.sizeFilter);
    const maxPrice = document.getElementById('priceRange')?.value;
    const filters = { category: cat, sort, onSale: saleOnly, sizes, maxPrice: maxPrice ? parseInt(maxPrice) : null };
    const filtered = Products.filter(Products.allProducts, filters);
    const grid = document.getElementById('shopGrid');
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = filtered.length + ' Products';
    if (!filtered.length) { grid.innerHTML = '<div class="empty-state"><p>No products match your filters</p></div>'; return; }
    grid.innerHTML = filtered.map((p, i) => this.createProductCard(p, i)).join('');
    this.attachProductListeners();
  },

  // ==================== PRODUCT PAGE ====================
  async initProductPage() {
    const pid = Utils.getParam('id');
    if (!pid) { window.location.href = 'shop.html'; return; }
    const product = await Products.fetchById(pid);
    if (!product) { window.location.href = 'shop.html'; return; }
    this.renderProductPage(product);
    this.initGallery(product);
    this.initProductActions(product);
    await Products.fetchAll();
    this.renderGrid('relatedProducts', Products.getRelated(product, 4));
    this.attachProductListeners();
    const reviews = await Products.getReviews(pid);
    this.renderReviews(pid, reviews);
    document.getElementById('productBreadcrumb') && (document.getElementById('productBreadcrumb').innerHTML = '<a href="../index.html">Home</a> <span>/</span> <a href="shop.html">Shop</a> <span>/</span> <span>' + Utils.sanitize(product.name) + '</span>');
    document.title = product.name + ' - TIGER';
  },

  renderProductPage(p) {
    const gm = document.getElementById('galleryMain'), gt = document.getElementById('galleryThumbs');
    if (gm && p.images?.length) {
      gm.innerHTML = '<img src="' + p.images[0] + '" alt="' + Utils.sanitize(p.name) + '" id="mainImage" class="gallery-main-img">';
      if (gt) gt.innerHTML = p.images.map((img, i) => '<button class="gallery-thumb ' + (i === 0 ? 'active' : '') + '" data-index="' + i + '"><img src="' + img + '" alt="Thumb ' + (i+1) + '" loading="lazy"></button>').join('');
    }
    const info = document.getElementById('productInfo');
    if (!info) return;
    const hd = p.salePrice && p.salePrice < p.originalPrice;
    const disc = hd ? Utils.calcDiscount(p.originalPrice, p.salePrice) : 0;
    info.innerHTML = `
      <span class="product-brand overline">${Utils.sanitize(p.brand||'TIGER')}</span>
      <h1 class="product-name">${Utils.sanitize(p.name)}</h1>
      <div class="product-rating">${this.getStarHTML(p.avgRating||0)} <span>(${p.reviewCount||0} reviews)</span></div>
      <div class="product-price-block">${hd ? '<span class="price-sale product-price-large">'+Utils.formatPrice(p.salePrice)+'</span><span class="price-original product-price-large">'+Utils.formatPrice(p.originalPrice)+'</span><span class="badge badge-sale">-'+disc+'%</span>' : '<span class="price-current product-price-large">'+Utils.formatPrice(p.originalPrice)+'</span>'}</div>
      <p class="product-short-desc">${Utils.sanitize(p.description||'')}</p>
      ${p.sizes?.length ? '<div class="product-option-group"><label class="product-option-label">Size</label><div class="size-options" id="sizeOptions">'+p.sizes.map((s,i) => '<button class="size-btn '+(i===0?'active':'')+'" data-size="'+s+'">'+s+'</button>').join('')+'</div><button class="size-guide-link" id="sizeGuideBtn">Size Guide</button></div>' : ''}
      ${p.colors?.length ? '<div class="product-option-group"><label class="product-option-label">Color</label><div class="color-options" id="colorOptions">'+p.colors.map((c,i) => '<button class="color-swatch '+(i===0?'active':'')+'" data-color="'+c+'" style="background:'+c+'" title="'+c+'"></button>').join('')+'</div></div>' : ''}
      <div class="product-option-group"><label class="product-option-label">Quantity</label><div class="quantity-selector"><button class="qty-btn" id="qtyMinus">−</button><input type="number" id="qtyInput" value="1" min="1" max="${p.stock||99}" class="qty-input"><button class="qty-btn" id="qtyPlus">+</button></div></div>
      <div class="product-actions">
        <button class="btn btn-primary btn-lg btn-full" id="addToCartBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Add to Cart</button>
        <button class="btn btn-gold btn-lg btn-full" id="buyNowBtn">Buy Now</button>
        <button class="btn btn-outline btn-icon" id="productWishlistBtn" data-wishlist-btn="${p.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
        <button class="btn btn-outline btn-icon" id="shareProductBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
      </div>
      <div class="product-meta"><p><strong>SKU:</strong> ${Utils.sanitize(p.sku||'N/A')}</p>${p.shippingCost !== undefined ? '<p><strong>Shipping:</strong> '+(p.shippingCost > 0 ? Utils.formatPrice(p.shippingCost) : 'Free Shipping')+'</p>' : ''}<p><strong>Estimated Delivery:</strong> 3-5 business days</p></div>
      <div class="product-accordion">
        <div class="accordion-item"><button class="accordion-header">Description</button><div class="accordion-body"><p>${Utils.sanitize(p.longDescription||p.description||'No description available.')}</p></div></div>
        ${p.specifications ? '<div class="accordion-item"><button class="accordion-header">Specifications</button><div class="accordion-body"><table class="spec-table">'+Object.entries(p.specifications).map(([k,v]) => '<tr><td>'+Utils.sanitize(k)+'</td><td>'+Utils.sanitize(v)+'</td></tr>').join('')+'</table></div></div>' : ''}
        <div class="accordion-item"><button class="accordion-header">Reviews (${p.reviewCount||0})</button><div class="accordion-body" id="reviewsAccordionBody"><div class="reviews-list" id="reviewsList"></div><div class="review-form" id="reviewFormSection"><h4>Write a Review</h4><div class="rating-input" id="ratingInput">${[1,2,3,4,5].map(i => '<button class="rating-star" data-rating="'+i+'">★</button>').join('')}</div><input type="text" id="reviewTitle" placeholder="Review Title" class="form-input"><textarea id="reviewComment" placeholder="Your Review" class="form-input" rows="3"></textarea><button class="btn btn-primary btn-sm" id="submitReviewBtn">Submit Review</button></div></div></div>
      </div>`;
  },

  initGallery(product) {
    const thumbs = document.querySelectorAll('.gallery-thumb');
    const mainImg = document.getElementById('mainImage');
    const galleryMain = document.getElementById('galleryMain');
    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        if (mainImg && product.images[parseInt(thumb.dataset.index)]) {
          mainImg.style.opacity = '0';
          setTimeout(() => { mainImg.src = product.images[parseInt(thumb.dataset.index)]; mainImg.style.opacity = '1'; }, 200);
        }
      });
    });
    if (galleryMain && mainImg && !Utils.isMobile()) {
      galleryMain.addEventListener('mousemove', (e) => { const r = galleryMain.getBoundingClientRect(); mainImg.style.transformOrigin = ((e.clientX-r.left)/r.width*100)+'% '+((e.clientY-r.top)/r.height*100)+'%'; mainImg.style.transform = 'scale(2)'; });
      galleryMain.addEventListener('mouseleave', () => { mainImg.style.transform = 'scale(1)'; });
    }
  },

  initProductActions(product) {
    document.querySelectorAll('.size-btn').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }));
    document.querySelectorAll('.color-swatch').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }));
    const qty = document.getElementById('qtyInput');
    document.getElementById('qtyMinus')?.addEventListener('click', () => { qty.value = Math.max(1, (parseInt(qty.value)||1)-1); });
    document.getElementById('qtyPlus')?.addEventListener('click', () => { qty.value = Math.min(product.stock||99, (parseInt(qty.value)||1)+1); });
    document.getElementById('addToCartBtn')?.addEventListener('click', () => {
      Cart.addItem(product, document.querySelector('.size-btn.active')?.dataset.size, document.querySelector('.color-swatch.active')?.dataset.color, parseInt(qty?.value)||1);
    });
    document.getElementById('buyNowBtn')?.addEventListener('click', () => {
      Cart.addItem(product, document.querySelector('.size-btn.active')?.dataset.size, document.querySelector('.color-swatch.active')?.dataset.color, parseInt(qty?.value)||1);
      setTimeout(() => { window.location.href = 'checkout.html'; }, 300);
    });
    document.getElementById('productWishlistBtn')?.addEventListener('click', () => Wishlist.toggle(product.id));
    document.getElementById('shareProductBtn')?.addEventListener('click', () => Utils.shareProduct({ title: product.name, url: window.location.href }));
    document.getElementById('sizeGuideBtn')?.addEventListener('click', () => document.getElementById('sizeGuideModal')?.classList.add('active'));
    let selRating = 0;
    document.querySelectorAll('.rating-star').forEach(star => { star.addEventListener('click', () => { selRating = parseInt(star.dataset.rating); document.querySelectorAll('.rating-star').forEach((s,i) => s.classList.toggle('active', i<selRating)); }); });
    document.getElementById('submitReviewBtn')?.addEventListener('click', async () => {
      if (!Auth.currentUser) { Utils.showToast('Please login to review', 'warning'); return; }
      if (!selRating) { Utils.showToast('Select a rating', 'warning'); return; }
      try { await Products.addReview(product.id, { rating: selRating, title: document.getElementById('reviewTitle')?.value||'', comment: document.getElementById('reviewComment')?.value||'' }); Utils.showToast('Review submitted!', 'success'); this.renderReviews(product.id, await Products.getReviews(product.id)); } catch { Utils.showToast('Failed to submit review', 'error'); }
    });
  },

  renderReviews(pid, reviews) {
    const list = document.getElementById('reviewsList');
    if (!list) return;
    if (!reviews.length) { list.innerHTML = '<p class="text-muted">No reviews yet.</p>'; return; }
    list.innerHTML = reviews.map(r => '<div class="review-item"><div class="review-header"><div><strong>'+Utils.sanitize(r.userName)+'</strong><div class="review-stars">'+('★'.repeat(r.rating)+'☆'.repeat(5-r.rating))+'</div></div><span class="review-date">'+Utils.formatDate(r.createdAt)+'</span></div>'+(r.title?'<h4>'+Utils.sanitize(r.title)+'</h4>':'')+'<p>'+Utils.sanitize(r.comment)+'</p></div>').join('');
  },

  // ==================== CART PAGE ====================
  async initCartPage() {
    this.renderCartPage(); Cart.onUpdate(() => this.renderCartPage());
    document.getElementById('clearCartBtn')?.addEventListener('click', () => { if (confirm('Clear all items?')) Cart.clear(); });
  },

  renderCartPage() {
    const c = document.getElementById('cartItems'), s = document.getElementById('cartSummary');
    if (!c) return;
    if (!Cart.items.length) {
      c.innerHTML = '<div class="empty-state"><h2>Your Cart is Empty</h2><p>Add some products to get started.</p><a href="shop.html" class="btn btn-primary">Continue Shopping</a></div>';
      if (s) s.style.display = 'none'; return;
    }
    if (s) s.style.display = 'block';
    c.innerHTML = Cart.items.map(item => '<div class="cart-item"><div class="cart-item-img"><a href="product.html?id='+item.productId+'"><img src="'+item.image+'" alt="'+Utils.sanitize(item.name)+'" loading="lazy"></a></div><div class="cart-item-details"><h3><a href="product.html?id='+item.productId+'">'+Utils.sanitize(item.name)+'</a></h3><p class="cart-item-variant">'+(item.size?'Size: '+item.size:'')+' '+(item.color?'· '+item.color:'')+'</p><p class="cart-item-price">'+Utils.formatPrice(item.price)+'</p></div><div class="cart-item-quantity"><div class="quantity-selector quantity-selector-sm"><button class="qty-btn" onclick="TigerApp.Cart.updateQuantity(\''+item.id+'\','+(item.quantity-1)+')">−</button><span>'+item.quantity+'</span><button class="qty-btn" onclick="TigerApp.Cart.updateQuantity(\''+item.id+'\','+(item.quantity+1)+')">+</button></div></div><div class="cart-item-total">'+Utils.formatPrice(item.price*item.quantity)+'</div><button class="cart-item-remove" onclick="TigerApp.Cart.removeItem(\''+item.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>').join('');
    document.getElementById('cartSubtotal').textContent = Utils.formatPrice(Cart.getSubtotal());
    document.getElementById('cartShipping').textContent = Cart.getShippingTotal() > 0 ? Utils.formatPrice(Cart.getShippingTotal()) : 'Free';
    document.getElementById('cartTotal').textContent = Utils.formatPrice(Cart.getTotal());
    document.getElementById('cartItemCount').textContent = Cart.getCount() + ' items';
  },

  // ==================== CHECKOUT PAGE ====================
  async initCheckoutPage() {
    if (!Cart.items.length) { window.location.href = 'cart.html'; return; }
    this.renderCheckoutSummary();
    this.initCheckoutForm();
    this.initPaymentMethods();
  },

  renderCheckoutSummary() {
    const el = (id) => document.getElementById(id);
    el('checkoutSubtotal') && (el('checkoutSubtotal').textContent = Utils.formatPrice(Cart.getSubtotal()));
    el('checkoutShipping') && (el('checkoutShipping').textContent = Cart.getShippingTotal() > 0 ? Utils.formatPrice(Cart.getShippingTotal()) : 'Free');
    el('checkoutTotal') && (el('checkoutTotal').textContent = Utils.formatPrice(Cart.getTotal()));
    const items = el('checkoutItems');
    if (items) items.innerHTML = Cart.items.map(i => '<div class="checkout-item"><img src="'+i.image+'" alt="'+Utils.sanitize(i.name)+'"><div><p>'+Utils.sanitize(i.name)+'</p><small>'+(i.size||'')+' '+(i.color?'· '+i.color:'')+' × '+i.quantity+'</small></div><span>'+Utils.formatPrice(i.price*i.quantity)+'</span></div>').join('');
  },

  initCheckoutForm() {
    document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Auth.currentUser) { Utils.showToast('Please login first', 'warning'); return; }
      const fd = new FormData(e.target);
      const pm = document.querySelector('input[name="paymentMethod"]:checked')?.value;
      if (!pm) { Utils.showToast('Select a payment method', 'warning'); return; }
      const orderData = { userId: Auth.currentUser.uid, userEmail: Auth.currentUser.email, userName: fd.get('name')||Auth.currentUser.displayName, phone: fd.get('phone'), address: fd.get('address'), governorate: fd.get('governorate'), city: fd.get('city'), notes: fd.get('notes'), items: Cart.items, subtotal: Cart.getSubtotal(), shipping: Cart.getShippingTotal(), total: Cart.getTotal(), paymentMethod: pm };
      try { const { ref: r, update: u } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js"); await u(r(db, 'users/'+Auth.currentUser.uid), { name: orderData.userName, phone: orderData.phone, address: orderData.address, governorate: orderData.governorate, city: orderData.city }); } catch {}
      const result = await Orders.create(orderData);
      if (result.success) this.showPaymentConfirmation(result.orderId, pm);
    });
  },

  initPaymentMethods() {
    document.querySelectorAll('input[name="paymentMethod"]').forEach(r => r.addEventListener('change', () => {
      document.querySelectorAll('.payment-details').forEach(d => d.style.display = 'none');
      document.getElementById('payment-'+r.value)?.style.display = 'block';
    }));
    document.querySelectorAll('.receipt-upload-area').forEach(area => {
      const input = area.querySelector('input[type="file"]'), preview = area.querySelector('.receipt-preview');
      area.addEventListener('click', () => input?.click());
      area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
      area.addEventListener('dragleave', () => area.classList.remove('dragover'));
      area.addEventListener('drop', (e) => { e.preventDefault(); area.classList.remove('dragover'); if (e.dataTransfer.files[0]) this.handleReceipt(e.dataTransfer.files[0], preview); });
      input?.addEventListener('change', () => { if (input.files[0]) this.handleReceipt(input.files[0], preview); });
    });
    document.getElementById('submitPayment')?.addEventListener('click', async () => {
      const oid = document.getElementById('paymentOrderId')?.value;
      const pm = document.querySelector('input[name="paymentMethod"]:checked')?.value;
      const pd = { method: pm, senderName: document.getElementById('senderName')?.value, senderPhone: document.getElementById('senderPhone')?.value, amount: document.getElementById('transferAmount')?.value, notes: document.getElementById('paymentNotes')?.value };
      const rf = document.querySelector('.receipt-upload-area input[type="file"]')?.files[0];
      if (rf) { try { const { ref: sr, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js"); const rr = sr(storage, 'receipts/'+oid+'/'+Date.now()+'_'+rf.name); await uploadBytes(rr, rf); pd.receiptUrl = await getDownloadURL(rr); } catch {} }
      const result = await Orders.submitPaymentConfirmation(oid, pd);
      if (result.success) window.location.href = 'order-confirmation.html?id='+oid;
      else Utils.showToast('Failed to submit payment', 'error');
    });
  },

  handleReceipt(file, preview) {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') { Utils.showToast('Upload image or PDF', 'error'); return; }
    if (file.size > 5*1024*1024) { Utils.showToast('Max 5MB', 'error'); return; }
    if (preview) { if (file.type.startsWith('image/')) { const r = new FileReader(); r.onload = (e) => { preview.innerHTML = '<img src="'+e.target.result+'" alt="Receipt">'; preview.style.display = 'block'; }; r.readAsDataURL(file); } else { preview.innerHTML = '<p>📄 '+file.name+'</p>'; preview.style.display = 'block'; } }
  },

  showPaymentConfirmation(orderId, method) {
    const s = document.getElementById('checkoutSection'), c = document.getElementById('paymentConfirmation');
    if (s) s.style.display = 'none';
    if (c) {
      c.style.display = 'block';
      document.getElementById('paymentOrderId') && (document.getElementById('paymentOrderId').value = orderId);
      document.getElementById('paymentAmount') && (document.getElementById('paymentAmount').textContent = Utils.formatPrice(Cart.getTotal()));
      document.getElementById('paymentMethodDisplay') && (document.getElementById('paymentMethodDisplay').textContent = method === 'vodafone_cash' ? 'Vodafone Cash' : 'InstaPay');
      if (method === 'instapay') document.getElementById('instapayLink')?.addEventListener('click', () => window.open('instapay://pay?amount='+Cart.getTotal(), '_blank'));
    }
  },

  // ==================== ACCOUNT PAGE ====================
  async initAccountPage() {
    if (!Auth.currentUser) { window.location.href = 'login.html'; return; }
    document.querySelectorAll('.account-nav-item').forEach(i => i.addEventListener('click', (e) => { e.preventDefault(); Utils.setParam('tab', i.dataset.tab); this.showAccountTab(i.dataset.tab); }));
    this.showAccountTab(Utils.getParam('tab') || 'orders');
  },

  async showAccountTab(tab) {
    document.querySelectorAll('.account-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector('[data-tab="'+tab+'"]')?.classList.add('active');
    document.querySelectorAll('.account-tab-content').forEach(t => t.style.display = 'none');
    document.getElementById('tab-'+tab)?.style.display = 'block';
    document.querySelector('[data-account-name]') && (document.querySelector('[data-account-name]').textContent = Auth.currentUser.displayName || 'User');
    document.querySelector('[data-account-email]') && (document.querySelector('[data-account-email]').textContent = Auth.currentUser.email || '');

    if (tab === 'orders') {
      const c = document.getElementById('ordersList');
      if (c) { c.innerHTML = '<div class="loading-spinner"></div>'; const orders = await Orders.getByUser(Auth.currentUser.uid);
        c.innerHTML = orders.length ? orders.map(o => '<div class="order-card"><div class="order-card-header"><div><strong>Order #'+o.id.slice(-8)+'</strong><span class="text-muted">'+Utils.formatDate(o.createdAt)+'</span></div><span class="order-status-badge" style="background:'+Utils.getStatusColor(o.status)+'">'+Utils.getStatusLabel(o.status)+'</span></div><div class="order-card-body"><p>'+(o.items?.length||0)+' items · '+Utils.formatPrice(o.total)+'</p></div><div class="order-card-footer"><a href="track-order.html?id='+o.id+'" class="btn btn-sm btn-outline">Track Order</a></div></div>').join('') : '<div class="empty-state"><p>No orders yet</p><a href="shop.html" class="btn btn-primary btn-sm">Shop Now</a></div>';
      }
    }
    if (tab === 'profile') {
      try { const { ref: r, get: g } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js"); const s = await g(r(db, 'users/'+Auth.currentUser.uid)); if (s.exists()) { const d = s.val(); ['profileName','profilePhone','profileAddress','profileGovernorate','profileCity'].forEach(id => { const el = document.getElementById(id); if (el) { const key = id.replace('profile','').toLowerCase(); el.value = d[key] || ''; } }); } } catch {}
      document.getElementById('profileForm')?.addEventListener('submit', async (e) => { e.preventDefault(); const fd = new FormData(e.target); try { const { ref: r, update: u } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js"); await u(r(db, 'users/'+Auth.currentUser.uid), { name: fd.get('name'), phone: fd.get('phone'), address: fd.get('address'), governorate: fd.get('governorate'), city: fd.get('city') }); Utils.showToast('Profile updated', 'success'); } catch { Utils.showToast('Failed to update', 'error'); } });
    }
    if (tab === 'wishlist') {
      const c = document.getElementById('wishlistGrid');
      if (c) { await Products.fetchAll(); const prods = Products.allProducts.filter(p => Wishlist.isWishlisted(p.id));
        c.innerHTML = prods.length ? prods.map((p,i) => this.createProductCard(p,i)).join('') : '<div class="empty-state"><p>Wishlist is empty</p><a href="shop.html" class="btn btn-primary btn-sm">Browse Products</a></div>';
        this.attachProductListeners();
      }
    }
  },

  // ==================== WISHLIST PAGE ====================
  async initWishlistPage() {
    const grid = document.getElementById('wishlistGrid');
    if (!grid) return;
    Utils.showSkeleton(grid, 4);
    await Products.fetchAll();
    Wishlist.onUpdate(() => {
      const prods = Products.allProducts.filter(p => Wishlist.isWishlisted(p.id));
      grid.innerHTML = prods.length ? prods.map((p,i) => this.createProductCard(p,i)).join('') : '<div class="empty-state"><p>Wishlist is empty</p><a href="shop.html" class="btn btn-primary">Start Shopping</a></div>';
      this.attachProductListeners();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
export default App;