// ============================================================
// TIGER E-Commerce - i18n (Arabic default / English secondary)
// ============================================================
const STORAGE_KEY = 'tiger-lang';

const dict = {
  ar: {
    nav_home: 'الرئيسية',
    nav_shop: 'المتجر',
    nav_new_arrivals: 'وصل حديثاً',
    nav_sale: 'تخفيضات',
    nav_about: 'من نحن',
    nav_contact: 'تواصل معنا',
    nav_men: 'رجالي',
    nav_women: 'حريمي',
    nav_accessories: 'إكسسوارات',
    top_shipping: '🚚 شحن مجاني للطلبات فوق 500 جنيه',
    search_placeholder: 'ابحث عن المنتجات والعلامات والفئات...',
    search_title: 'ابحث في متجرنا',
    hero_sub_1: 'مجموعة 2026 الجديدة',
    hero_title_1: 'اصنع أسلوبك الخاص',
    hero_text_1: 'اكتشف أحدث صيحات الموضة الفاخرة. مصمم لمن يطلبون التميّز.',
    hero_cta_shop: 'تسوق الآن',
    hero_cta_explore: 'استكشف',
    hero_sub_2: 'جودة فاخرة',
    hero_title_2: 'فخامة بلا حدود',
    hero_text_2: 'حيث تلتقي الأناقة بالموضة العصرية. ارتقِ بخزانة ملابسك.',
    hero_cta_discover: 'اكتشف',
    hero_sub_3: 'عروض حصرية',
    hero_title_3: 'تخفيضات الصيف',
    hero_text_3: 'خصم يصل إلى 50% على منتجات مختارة. لفترة محدودة.',
    hero_cta_sale: 'تسوق التخفيضات',
    cat_overline: 'تصفح',
    cat_title: 'تسوق حسب الفئة',
    cat_subtitle: 'اعثر على ما تبحث عنه بالضبط',
    cat_men: 'رجالي',
    cat_women: 'حريمي',
    cat_accessories: 'إكسسوارات',
    cat_shoes: 'أحذية',
    cat_sportswear: 'ملابس رياضية',
    cat_limited: 'إصدار محدود',
    featured_overline: 'مختارة لك',
    featured_title: 'التشكيلة المميزة',
    featured_subtitle: 'قطع مختارة بعناية تُعبّر عن الموسم',
    view_all_products: 'عرض جميع المنتجات',
    offer_subtitle: 'عرض لفترة محدودة',
    offer_title_1: 'خصم يصل إلى',
    offer_title_2: '50%',
    offer_code: 'استخدم الكود:',
    offer_cta: 'تسوق التخفيضات',
    bestsellers_overline: 'الأكثر رواجاً',
    bestsellers_title: 'الأكثر مبيعاً',
    bestsellers_subtitle: 'المنتجات التي يتحدث عنها الجميع',
    view_all_bestsellers: 'عرض جميع الأكثر مبيعاً',
    newarrivals_overline: 'وصل حديثاً',
    newarrivals_title: 'وصل حديثاً',
    newarrivals_subtitle: 'أحدث التصاميم، خصيصاً لك',
    view_all_newarrivals: 'عرض جميع الجديد',
    instagram_title: 'تابعنا على إنستغرام',
    instagram_subtitle: 'أضف لنا تاق ليتم اختيار صورتك',
    testimonials_overline: 'آراء العملاء',
    testimonials_title: 'ماذا يقول عملاؤنا',
    testimonials_subtitle: 'تقييمات حقيقية من عملاء حقيقيين',
    trust_shipping_title: 'شحن مجاني',
    trust_shipping_text: 'توصيل مجاني للطلبات فوق 100 دولار. شحن سريع وموثوق لكل مكان.',
    trust_returns_title: 'استرجاع سهل',
    trust_returns_text: 'سياسة استرجاع لمدة 30 يوماً بدون أي تعقيد.',
    trust_payment_title: 'دفع آمن',
    trust_payment_text: 'بياناتك محمية بتشفير SSL بمعيار 256-بت.',
    trust_support_title: 'دعم على مدار الساعة',
    trust_support_text: 'فريق الدعم المخصص لدينا في خدمتك طوال الوقت.',
    stat_customers: 'عميل سعيد',
    stat_products: 'منتج',
    stat_brands: 'علامة تجارية',
    stat_support: 'دعم',
    newsletter_title: 'اشترك في نشرتنا البريدية',
    newsletter_subtitle_1: 'احصل على خصم',
    newsletter_subtitle_2: '10%',
    newsletter_subtitle_3: 'على طلبك الأول وابقَ على اطلاع بأحدث صيحات الموضة والعروض الحصرية.',
    newsletter_placeholder: 'أدخل بريدك الإلكتروني',
    newsletter_btn: 'اشترك',
    newsletter_disclaimer_1: 'بالاشتراك، أنت توافق على',
    newsletter_disclaimer_2: 'سياسة الخصوصية',
    newsletter_disclaimer_3: '. يمكنك إلغاء الاشتراك في أي وقت.',
    footer_brand_text: 'متجر أزياء فاخرة يقدّم ملابس وإكسسوارات وأحذية راقية، مصمم لمن يطلبون التميّز والأناقة.',
    footer_quick_links: 'روابط سريعة',
    footer_customer_service: 'خدمة العملاء',
    footer_contact_us: 'تواصل معنا',
    footer_faq: 'الأسئلة الشائعة',
    footer_shipping_policy: 'سياسة الشحن',
    footer_return_policy: 'سياسة الاسترجاع',
    footer_size_guide: 'دليل المقاسات',
    footer_track_order: 'تتبع الطلب',
    footer_privacy_policy: 'سياسة الخصوصية',
    footer_terms: 'الشروط والأحكام',
    footer_hours: 'السبت - الخميس: 10:00 ص - 10:00 م',
    footer_rights: '© 2026 تايجر. جميع الحقوق محفوظة.',
    dev_credit: 'برمجة وتطوير بكل حب',
    dev_name: 'المهندس محمد حماد',
    lang_switch: 'English',
    cart_title: 'سلة التسوق',
    cart_empty: 'سلة التسوق فارغة',
    cart_start_shopping: 'ابدأ التسوق',
    cart_checkout: 'إتمام الشراء',
    cart_view_cart: 'عرض السلة',
    cart_subtotal: 'الإجمالي الفرعي',
    cart_shipping_note: 'يتم احتساب الشحن والضرائب عند إتمام الشراء',
    wishlist: 'المفضلة',
    my_account: 'حسابي',
    guest: 'زائر',
    my_orders: 'طلباتي',
  },
  en: {
    nav_home: 'Home',
    nav_shop: 'Shop',
    nav_new_arrivals: 'New Arrivals',
    nav_sale: 'Sale',
    nav_about: 'About',
    nav_contact: 'Contact',
    nav_men: 'Men',
    nav_women: 'Women',
    nav_accessories: 'Accessories',
    top_shipping: '🚚 Free Shipping on Orders Over $100',
    search_placeholder: 'Search for products, brands, categories...',
    search_title: 'Search Our Store',
    hero_sub_1: 'New Collection 2026',
    hero_title_1: 'Define Your Style',
    hero_text_1: 'Discover the latest in premium fashion. Crafted for those who demand excellence.',
    hero_cta_shop: 'Shop Now',
    hero_cta_explore: 'Explore',
    hero_sub_2: 'Premium Quality',
    hero_title_2: 'Luxury Redefined',
    hero_text_2: 'Where elegance meets contemporary fashion. Elevate your wardrobe.',
    hero_cta_discover: 'Discover',
    hero_sub_3: 'Exclusive Deals',
    hero_title_3: 'Summer Sale',
    hero_text_3: 'Up to 50% off on selected items. Limited time offer.',
    hero_cta_sale: 'Shop Sale',
    cat_overline: 'Browse',
    cat_title: 'Shop By Category',
    cat_subtitle: "Find exactly what you're looking for",
    cat_men: 'Men',
    cat_women: 'Women',
    cat_accessories: 'Accessories',
    cat_shoes: 'Shoes',
    cat_sportswear: 'Sportswear',
    cat_limited: 'Limited Edition',
    featured_overline: 'Curated For You',
    featured_title: 'Featured Collection',
    featured_subtitle: 'Handpicked pieces that define the season',
    view_all_products: 'View All Products',
    offer_subtitle: 'Limited Time Offer',
    offer_title_1: 'Up to',
    offer_title_2: '50% Off',
    offer_code: 'Use Code:',
    offer_cta: 'Shop the Sale',
    bestsellers_overline: 'Most Popular',
    bestsellers_title: 'Best Sellers',
    bestsellers_subtitle: 'The products everyone is talking about',
    view_all_bestsellers: 'View All Best Sellers',
    newarrivals_overline: 'Just Dropped',
    newarrivals_title: 'New Arrivals',
    newarrivals_subtitle: 'The freshest styles, just for you',
    view_all_newarrivals: 'View All New Arrivals',
    instagram_title: 'Follow Us on Instagram',
    instagram_subtitle: 'Tag us to get featured',
    testimonials_overline: 'Testimonials',
    testimonials_title: 'What Our Customers Say',
    testimonials_subtitle: 'Real reviews from real people',
    trust_shipping_title: 'Free Shipping',
    trust_shipping_text: 'Free delivery on all orders over $100. Fast and reliable worldwide shipping.',
    trust_returns_title: 'Easy Returns',
    trust_returns_text: "30-day hassle-free return policy. We'll make it right, guaranteed.",
    trust_payment_title: 'Secure Payment',
    trust_payment_text: 'Your data is protected with industry-standard 256-bit SSL encryption.',
    trust_support_title: '24/7 Support',
    trust_support_text: 'Our dedicated support team is here for you around the clock.',
    stat_customers: 'Happy Customers',
    stat_products: 'Products',
    stat_brands: 'Brands',
    stat_support: 'Support',
    newsletter_title: 'Subscribe to Our Newsletter',
    newsletter_subtitle_1: 'Get',
    newsletter_subtitle_2: '10% off',
    newsletter_subtitle_3: 'your first order and stay updated with the latest trends, exclusive offers, and new arrivals.',
    newsletter_placeholder: 'Enter your email address',
    newsletter_btn: 'Subscribe',
    newsletter_disclaimer_1: 'By subscribing, you agree to our',
    newsletter_disclaimer_2: 'Privacy Policy',
    newsletter_disclaimer_3: '. Unsubscribe anytime.',
    footer_brand_text: 'Premium fashion e-commerce delivering luxury clothing, accessories, and footwear. Crafted for those who demand excellence and style.',
    footer_quick_links: 'Quick Links',
    footer_customer_service: 'Customer Service',
    footer_contact_us: 'Contact Us',
    footer_faq: 'FAQ',
    footer_shipping_policy: 'Shipping Policy',
    footer_return_policy: 'Return Policy',
    footer_size_guide: 'Size Guide',
    footer_track_order: 'Track Order',
    footer_privacy_policy: 'Privacy Policy',
    footer_terms: 'Terms & Conditions',
    footer_hours: 'Sat - Thu: 10:00 AM - 10:00 PM',
    footer_rights: '© 2026 TIGER. All rights reserved.',
    dev_credit: 'Programmed and developed with love',
    dev_name: 'Eng. Mohamed Hammad',
    lang_switch: 'العربية',
    cart_title: 'Your Cart',
    cart_empty: 'Your cart is empty',
    cart_start_shopping: 'Start Shopping',
    cart_checkout: 'Checkout',
    cart_view_cart: 'View Cart',
    cart_subtotal: 'Subtotal',
    cart_shipping_note: 'Shipping & taxes calculated at checkout',
    wishlist: 'Wishlist',
    my_account: 'My Account',
    guest: 'Guest',
    my_orders: 'My Orders',
  }
};

const I18n = {
  current: 'ar',
  dict,

  init() {
    this.current = localStorage.getItem(STORAGE_KEY) || 'ar';
    this.apply();
    this.injectToggle();
    this.injectFooterCredit();
  },

  t(key) {
    const d = this.dict[this.current];
    return (d && d[key]) || key;
  },

  apply() {
    document.documentElement.lang = this.current;
    document.documentElement.dir = this.current === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-ar', this.current === 'ar');
    document.body.classList.toggle('lang-en', this.current === 'en');

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = this.t(key);
      if (val !== key) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = this.t(key);
      if (val !== key) el.setAttribute('placeholder', val);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      const val = this.t(key);
      if (val !== key) el.setAttribute('aria-label', val);
    });
    document.querySelectorAll('.lang-toggle-label').forEach(el => {
      el.textContent = this.t('lang_switch');
    });
    const creditText = document.getElementById('devCreditText');
    if (creditText) creditText.textContent = this.t('dev_credit');
    const creditName = document.getElementById('devCreditName');
    if (creditName) creditName.textContent = this.t('dev_name');
  },

  toggle() {
    this.current = this.current === 'ar' ? 'en' : 'ar';
    localStorage.setItem(STORAGE_KEY, this.current);
    this.apply();
  },

  injectToggle() {
    const actions = document.querySelector('.header-actions');
    if (!actions || document.getElementById('langToggleBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'langToggleBtn';
    btn.className = 'header-action-btn lang-toggle-btn';
    btn.setAttribute('aria-label', 'Change language / تغيير اللغة');
    btn.innerHTML = '<span class="lang-toggle-label">' + this.t('lang_switch') + '</span>';
    actions.insertBefore(btn, actions.firstChild);
    btn.addEventListener('click', () => this.toggle());
  },

  injectFooterCredit() {
    const footer = document.querySelector('.site-footer .footer-bottom, .site-footer');
    if (!footer || document.getElementById('devCredit')) return;
    const bar = document.createElement('div');
    bar.id = 'devCredit';
    bar.className = 'dev-credit';
    bar.innerHTML =
      '<span id="devCreditText">' + this.t('dev_credit') + '</span> ' +
      '<span class="dev-credit-heart" aria-hidden="true">❤️</span> ' +
      '<a href="https://www.facebook.com/en.mohamed.nasr" target="_blank" rel="noopener noreferrer" id="devCreditName">' + this.t('dev_name') + '</a>';
    footer.parentElement ? footer.parentElement.insertBefore(bar, footer.nextSibling) : document.body.appendChild(bar);
  }
};

export default I18n;
