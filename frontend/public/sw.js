// Erhan Flowers ERP — Service Worker
const CACHE = 'erp-v1';
const OFFLINE_URL = '/login';

// Kurulumda login sayfasını önbelleğe al
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  // Eski cache versiyonlarını temizle
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network first — API istekleri her zaman ağdan, statik dosyalar önbellekten
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API isteklerini her zaman ağdan al
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    e.respondWith(fetch(request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Sayfa navigasyonlarını ağdan dene, başarısız olursa cache'den
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL) ?? fetch(request))
    );
    return;
  }

  // Diğer istekler: önce cache, yoksa ağ
  e.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request))
  );
});
