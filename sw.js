const CACHE_NAME = 'tiger-store-v1';
const DYNAMIC_CACHE = 'tiger-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/firebase-config.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
];

// 1. التثبيت والتخزين الأولي
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('تم التخزين المؤقت للملفات الأساسية');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. التفعيل وتنظيف النسخ القديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. استراتيجية جلب البيانات (Cache First للصور والملفات الثابتة، Network First للبيانات)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // تخزين صور Cloudflare R2 مؤقتاً
  if (url.origin.includes('r2.cloudflarestorage.com') || url.pathname.match(/\.(png|jpg|jpeg|svg|gif)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((networkResponse) => {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else {
    // استراتيجية Network First لباقي الطلبات (مثل Firestore)
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
