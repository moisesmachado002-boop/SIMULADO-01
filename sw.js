const CACHE = 'mentor-ia-v9-1-1-presets';
const SUPABASE_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4';
const LOCAL_ASSETS = [
  './','./index.html','./styles.css','./layout-refresh.css','./layout-lock.css','./auth.css',
  './bank-mode.css','./qg-mode.css','./edital-core.css','./question-filters.css','./question-difficulty.css',
  './question-feedback.css','./mentor-engine.css','./qconcursos-links.css','./q-presets-p8.css','./app.js','./cloud-sync.js',
  './runtime-bootstrap.js','./bank-mode.js','./qg-mode.js','./review-engine.js','./schedule-engine.js',
  './study-profile.js','./mentor-engine.js','./mentor-p8-bridge.js','./qconcursos-links.js','./q-presets-p8.js','./stability-9.1.js',
  './edital-core.js','./question-state.js','./question-filters.js','./question-difficulty.js','./question-feedback.js',
  './manifest.json','./icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(LOCAL_ASSETS);
    try {
      const response = await fetch(SUPABASE_SDK, { cache:'no-store', mode:'cors' });
      if (response.ok) await cache.put(SUPABASE_SDK, response.clone());
    } catch (error) {
      console.warn('SDK remoto não pôde ser pré-cacheado:', error);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('mentor-ia-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);

  if (url.href === SUPABASE_SDK) {
    event.respondWith((async () => {
      const cached = await caches.match(SUPABASE_SDK);
      if (cached) {
        fetch(SUPABASE_SDK, { cache:'no-store', mode:'cors' })
          .then(async response => {
            if (response.ok) await (await caches.open(CACHE)).put(SUPABASE_SDK, response.clone());
          })
          .catch(() => {});
        return cached;
      }
      const response = await fetch(event.request);
      if (response.ok) (await caches.open(CACHE)).put(SUPABASE_SDK, response.clone()).catch(() => {});
      return response;
    })());
    return;
  }

  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache:'no-store' })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put('./index.html', copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(fetch(event.request, { cache:'no-store' })
    .then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    })
    .catch(() => caches.match(event.request)));
});