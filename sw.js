const CACHE = 'mentor-ia-v2-8-p7-mentora';
const ASSETS = [
  './','./index.html','./styles.css','./layout-refresh.css','./layout-lock.css','./q-mode.css','./q-presets.css','./auth.css','./bank-mode.css','./qg-mode.css','./edital-core.css','./question-filters.css','./question-difficulty.css','./question-feedback.css','./mentor-engine.css','./app.js','./q-mode.js','./q-presets.js','./cloud-sync.js','./runtime-bootstrap.js','./bank-mode.js','./qg-mode.js','./review-engine.js','./schedule-engine.js','./study-profile.js','./mentor-engine.js','./edital-core.js','./question-state.js','./question-filters.js','./question-difficulty.js','./question-feedback.js','./manifest.json','./icon.svg'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mentor-ia-')&&key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);const scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)) return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).catch(()=>{});return response;}).catch(()=>caches.match('./index.html')));return;
  }
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});return response;}).catch(()=>caches.match(event.request)));
});