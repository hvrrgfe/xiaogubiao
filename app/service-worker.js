/* 「小目标」Service Worker —— 离线可用 */
const CACHE_NAME = 'xiaogubiao-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/liquid-glass.css',
  './js/data/presets.js',
  './js/data/templates.js',
  './js/data/duck.js',
  './js/utils/icons.js',
  './js/utils/store.js',
  './js/utils/duckArt.js',
  './js/utils/llm.js',
  './js/app.js',
  './assets/app-icon-192.png',
  './assets/app-icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  // 代理请求与 API 请求不走缓存
  if (url.pathname.indexOf('/api/') === 0) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (res) {
        // 只缓存同源静态资源
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
        }
        return res;
      }).catch(function () {
        // 离线兜底：导航请求返回 index.html
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
