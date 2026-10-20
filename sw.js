/* Daftar — network-first service worker (keeps the prototype fresh, works offline after first load) */
const CACHE = 'daftar-v2';
const ASSETS = ['./', './index.html', './css/app.css', './js/i18n.js', './js/store.js', './js/import.js', './js/ocr.js', './js/ui.js', './js/app.js', './js/ops.js', './js/acct.js', './js/reports.js', './manifest.json', './icons/icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request)));
});
