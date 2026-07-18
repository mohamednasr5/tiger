// TIGER E-Commerce - Service Worker
const CACHE_NAME = 'tiger-v2';
const BASE_PATH = '/tiger';
const OFFLINE_URL = BASE_PATH + '/index.html';

const PRECACHE_URLS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/css/main.css',
  BASE_PATH + '/css/components.css',
  BASE_PATH + '/css/animations.css',
  BASE_PATH + '/css/responsive.css',
  BASE_PATH + '/js/firebase-config.js',
  BASE_PATH + '/js/utils.js',
  BASE_PATH + '/js/app.js',
  BASE_PATH + '/js/modules/auth.js',
  BASE_PATH + '/js/modules/products.js',
  BASE_PATH + '/js/modules/cart.js',
  BASE_PATH + '/js/modules/wishlist.js',
  BASE_PATH + '/js/modules/orders.js',
  BASE_PATH + '/js/modules/notifications.js',
  BASE_PATH + '/pages/shop.html',
  BASE_PATH + '/pages/product.html',
  BASE_PATH + '/pages/cart.html',
  BASE_PATH + '/pages/checkout.html',
  BASE_PATH + '/pages/account.html',
  BASE_PATH + '/pages/login.html',
  BASE_PATH + '/pages/wishlist.html',
  BASE_PATH + '/pages/about.html',
  BASE_PATH + '/pages/contact.html',
  BASE_PATH + '/pages/faq.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.log('Precache failed for some URLs:', err);
        return cache.addAll([
          BASE_PATH + '/index.html',
          BASE_PATH + '/manifest.json',
          BASE_PATH + '/css/main.css'
        ]);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip external API requests (Firebase, etc.)
  if (!url.origin.includes('github.io') && !url.pathname.startsWith(BASE_PATH)) {
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cached => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (
    url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Sync cart data when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_CART' });
  });
}
