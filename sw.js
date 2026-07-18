// TIGER E-Commerce - Service Worker
const CACHE_NAME = 'tiger-v1';
const OFFLINE_URL = '/index.html';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/css/components.css',
  '/css/animations.css',
  '/css/responsive.css',
  '/js/firebase-config.js',
  '/js/utils.js',
  '/js/app.js',
  '/js/modules/auth.js',
  '/js/modules/products.js',
  '/js/modules/cart.js',
  '/js/modules/wishlist.js',
  '/js/modules/orders.js',
  '/js/modules/notifications.js',
  '/pages/shop.html',
  '/pages/product.html',
  '/pages/cart.html',
  '/pages/checkout.html',
  '/pages/account.html',
  '/pages/login.html',
  '/pages/wishlist.html',
  '/pages/about.html',
  '/pages/contact.html',
  '/pages/faq.html'
];

// Install - precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.log('Precache failed for some URLs:', err);
        return cache.addAll(['/index.html', '/manifest.json', '/css/main.css']);
      });
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
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

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Firebase and external API requests
  if (request.url.includes('firebaseio.com') ||
      request.url.includes('googleapis.com') ||
      request.url.includes('firebaseapp.com') ||
      request.url.includes('gstatic.com') ||
      request.url.includes('fonts.googleapis.com') ||
      request.url.includes('fonts.gstatic.com')) {
    return;
  }

  // For navigation requests (HTML pages) - network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For static assets - stale while revalidate
  if (request.url.match(/\.(css|js|png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Default - network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  // Sync offline cart changes when back online
  console.log('Cart sync triggered');
}

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'TIGER';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    event.waitUntil(self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('tiger') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }));
  }
});