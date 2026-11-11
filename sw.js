// Offline shell: the app's own files come from the cache; posters and fonts are kept once fetched.
// GitHub and TMDB API calls always go to the network.
const V = 'fy-95ebc9bf4599';
const SHELL = ["./", "index.html", "plan.html", "share.html", "share.js", "planload.js", "store.js", "sync.js", "websync.js", "posters.js", "focus.js", "focus.css", "app.js", "app.css", "plan.js", "manifest.webmanifest", "icon32.png", "apple-touch-icon.png", "icon192.png", "icon512.png", "maskable512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('fy-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    e.respondWith(caches.open(V).then(c => c.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req))));
    return;
  }
  if (u.host === 'image.tmdb.org' || u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open('fx-media').then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }
      catch (err) { return Response.error(); }
    }));
  }
});
