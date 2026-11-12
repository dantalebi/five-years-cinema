// Offline shell: the app's own files come from the cache; posters and fonts are kept once fetched.
// GitHub and TMDB API calls always go to the network.
const V = 'fd-5964006d58d9';
const SHELL = ["/", "/config.js", "/store.js", "/posters.js", "/fxcal.js", "/focus.js", "/fxlb.js", "/play.js", "/share.js", "/fxlist.js", "/cloudsync.js", "/nav.js", "/catalog.js", "/friends.js", "/planmap.js", "/discover.js", "/filmpage.js", "/planner.js", "/account.js", "/cloud.js", "/focus.css", "/app.css", "/sample-plan.json", "/manifest.webmanifest", "/icon32.png", "/apple-touch-icon.png", "/icon192.png", "/icon512.png", "/maskable512.png"];
// fetch past the browser's HTTP cache, so a new version never stores a file from the previous one
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('fd-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (u.pathname.startsWith('/api/')) return;
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).catch(() => caches.open(V).then(c => c.match('/')).then(hit => hit ? new Response(hit.body, {status: 200, headers: hit.headers}) : Response.error())));
      return;
    }
    if (u.pathname.startsWith('/catalog/')) {
      e.respondWith(caches.open('fx-catalog').then(async c => {
        const hit = await c.match(req, {ignoreSearch: true});
        const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
        if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
        return net;
      }));
      return;
    }
    e.respondWith(caches.open(V).then(c => c.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req))));
    return;
  }
  if (u.host === 'image.tmdb.org' || u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {
    if (req.mode === 'cors' && u.host === 'image.tmdb.org') return;
    e.respondWith(caches.open('fx-media').then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }
      catch (err) { return Response.error(); }
    }));
  }
});
