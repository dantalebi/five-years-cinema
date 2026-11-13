// Posters from TMDB, looked up by title and year and cached on this device.
// Needs the person's own TMDB "API Read Access Token" (sent as a header, never in the URL).
const Posters = (() => {
  let token = null, cache = {}, busy = 0;
  const queue = [], waiting = {};
  try { cache = JSON.parse(localStorage.getItem('fy-posters') || '{}') || {}; } catch (e) { cache = {}; }
  try { if (localStorage.getItem('fy-posters-v') !== '3') { for (const k in cache) if (!cache[k][0]) delete cache[k]; localStorage.setItem('fy-posters-v', '3'); } } catch (e) {}
  let st = null;
  const save = () => { clearTimeout(st); st = setTimeout(() => { try { localStorage.setItem('fy-posters', JSON.stringify(cache)); } catch (e) {} }, 400); };
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  const IMG = 'https://image.tmdb.org/t/p/w185';
  let authFail = false;
  // a copy of the template can ship a site-wide key in config.js; a key the person adds in Settings wins
  const DEF = () => (typeof FY_CONFIG !== 'undefined' && FY_CONFIG.tmdb) || '';
  let usingDef = false;
  function setToken(t) { const own = t && /^eyJ/.test(String(t).trim()) ? String(t).trim() : null, d = DEF(), n = own || (d && /^eyJ/.test(d) ? d : null); usingDef = !own && !!n; if (n !== token) { token = n; authFail = false; } }
  // a site with its own server asks TMDB through it (the key stays there): Posters.setProxy('/api/tmdb')
  let proxy = '';
  async function api(path) {
    const r = proxy ? await fetch(proxy + path, {headers: {accept: 'application/json'}, credentials: 'same-origin'})
      : await fetch('https://api.themoviedb.org/3' + path, {headers: {Authorization: 'Bearer ' + token, accept: 'application/json'}});
    if (proxy && r.status === 401) throw new Error('signin');
    if (r.status === 401) { authFail = true; throw new Error('auth'); }
    if (r.status === 429) throw Object.assign(new Error('slow'), {slow: true});  // asked to slow down: try again later
    if (!r.ok) throw new Error('http');
    return r.json();
  }
  function pick(list, t, y) {
    const nt = norm(t); let best = null, bs = -1e9;
    (list || []).forEach((m, k) => {
      const my = +(m.release_date || '').slice(0, 4), dy = my ? Math.abs(my - y) : 9;
      let s = !y ? 0 : dy === 0 ? 3 : dy === 1 ? 2 : dy === 2 ? 0.5 : -6;
      const same = norm(m.title) === nt || norm(m.original_title) === nt;
      if (same) s += 3;
      if (same && my && dy <= 3) s = Math.max(s, 2.5);  // same title, a few years apart (festival vs release year)
      if (m.poster_path) s += 0.5; else s -= 4;
      s -= k * 0.15;
      if (s > bs) { bs = s; best = m; }
    });
    return bs >= 2 ? best : null;
  }
  // miniseries Letterboxd lists as films (Landscapers, Twin Peaks: The Return…) are TV on TMDB: same title only
  async function tvPick(t, y) {
    const q = encodeURIComponent(String(t).replace(/\s*\(\d{4}\)\s*$/, '')), nt = norm(t);
    const j = await api('/search/tv?query=' + q + '&include_adult=false&language=en-US');
    const ok = (j.results || []).filter(s => (norm(s.name) === nt || norm(s.original_name) === nt) && s.poster_path)
      .filter(s => { const sy = +(s.first_air_date || '').slice(0, 4); return !y || !sy || Math.abs(sy - y) <= 3; });
    return ok[0] ? {id: ok[0].id, t: ok[0].name, y: +(ok[0].first_air_date || '').slice(0, 4) || y || 0, p: ok[0].poster_path} : null;
  }
  // last resort: the one film with exactly this title, whatever year TMDB gives it (re-release dates)
  function loose(list, t) {
    const nt = norm(t), same = (list || []).filter(m => m.poster_path && (norm(m.title) === nt || norm(m.original_title) === nt));
    return same.length === 1 ? same[0] : null;
  }
  async function lookup(key, t, y) {
    const q = encodeURIComponent(t.replace(/\s*\(.*?\)\s*$/, ''));
    let j = await api('/search/movie?query=' + q + (y ? '&year=' + y : '') + '&include_adult=false&language=en-US');
    let m = pick(j.results, t, y);
    if (!m && y) { j = await api('/search/movie?query=' + q + '&include_adult=false&language=en-US'); m = pick(j.results, t, y); }
    if (!m) { const s = await tvPick(t, y).catch(() => null); if (s) m = {poster_path: s.p}; }
    if (!m) m = loose(j.results, t);
    cache[key] = [m && m.poster_path ? m.poster_path : '', Date.now()]; save();
    return cache[key][0];
  }
  function pump() {
    while (busy < 6 && queue.length) {
      const [key, t, y] = queue.shift(); busy++;
      lookup(key, t, y).catch(() => null).then(p => { busy--; (waiting[key] || []).forEach(f => f(p)); delete waiting[key]; pump(); });
    }
  }
  const fresh = c => c && (c[0] || Date.now() - c[1] < 3 * 864e5);
  let chosen = () => '';
  const okPath = p => typeof p === 'string' && /^\/[A-Za-z0-9._-]+$/.test(p);
  function src(key) { const o = chosen(key); if (okPath(o)) return IMG + o; const c = cache[key]; return c && c[0] ? IMG + c[0] : ''; }
  // a site can know a film's poster without asking TMDB (its own catalog): Posters.setResolver((t, y) => path or '')
  let resolver = null;
  function want(key, t, y, cb) {
    const o = chosen(key); if (okPath(o)) { cb(IMG + o); return; }
    const c = cache[key];
    if (fresh(c)) { cb(c[0] ? IMG + c[0] : ''); return; }
    if (resolver) { let r = ''; try { r = resolver(t, y); } catch (e) {} if (okPath(r)) { cache[key] = [r, Date.now()]; save(); cb(IMG + r); return; } }
    if ((!token && !proxy) || authFail) { cb(''); return; }
    if (waiting[key]) { waiting[key].push(p => cb(p ? IMG + p : '')); return; }
    waiting[key] = [p => cb(p ? IMG + p : '')]; queue.push([key, t, y]); pump();
  }
  // fill every <img data-pk> under root that has no picture yet. Known posters at once; the ones that need looking up
  // only when they come near the screen (a long diary doesn't send hundreds of searches at once)
  const one = img => want(img.dataset.pk, img.dataset.pt, +img.dataset.py, url => { if (url) img.src = url; else img.closest('.fx-pos') && img.closest('.fx-pos').classList.add('none'); });
  let io = null;
  function fill(root) {
    root.querySelectorAll('img[data-pk]:not([src])').forEach(img => {
      const k = img.dataset.pk, o = chosen(k), c = cache[k];
      if (okPath(o) || fresh(c) || typeof IntersectionObserver === 'undefined') { one(img); return; }
      if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); one(e.target); } }), {rootMargin: '900px 0px'});
      io.observe(img);
    });
  }
  async function test(t) {
    try { const r = await fetch('https://api.themoviedb.org/3/configuration', {headers: {Authorization: 'Bearer ' + String(t).trim(), accept: 'application/json'}}); return r.ok; }
    catch (e) { return null; }
  }
  // the whole TMDB catalogue, for films outside the plan
  async function search(q) {
    if (!token && !proxy) return [];
    const j = await api('/search/movie?query=' + encodeURIComponent(q) + '&include_adult=false&language=en-US&page=1');
    return (j.results || []).slice(0, 8).map(m => ({id: m.id, t: m.title, y: +(m.release_date || '').slice(0, 4) || 0, p: m.poster_path || ''}));
  }
  async function details(id) {
    const j = await api('/movie/' + encodeURIComponent(id) + '?append_to_response=credits&language=en-US');
    const dirs = ((j.credits && j.credits.crew) || []).filter(c => c.job === 'Director').map(c => c.name);
    return {d: dirs.slice(0, 3).join(', '), m: j.runtime || 0, p: j.poster_path || ''};
  }
  // best TMDB match for a title and year (for imports): {id, t, y, p} or null
  async function match(t, y) {
    if (!token && !proxy) return null;
    const q = encodeURIComponent(String(t).replace(/\s*\(\d{4}\)\s*$/, ''));
    let j = await api('/search/movie?query=' + q + (y ? '&year=' + y : '') + '&include_adult=false&language=en-US');
    let m = pick(j.results, t, y);
    if (!m && y) { j = await api('/search/movie?query=' + q + '&include_adult=false&language=en-US'); m = pick(j.results, t, y); }
    if (!m) { const s = await tvPick(t, y).catch(() => null); if (s) return {id: 0, tv: s.id, t: s.t, y: s.y, p: s.p}; }
    if (!m) m = loose(j.results, t);
    return m ? {id: m.id, t: m.title, y: +(m.release_date || '').slice(0, 4) || y || 0, p: m.poster_path || ''} : null;
  }
  // every poster and still TMDB has for a film (for choosing another one)
  async function images(id) {
    const j = await api('/movie/' + encodeURIComponent(id) + '/images');
    const sortP = a => a.slice().sort((x, y) => (x.iso_639_1 === 'en' || !x.iso_639_1 ? 0 : 1) - (y.iso_639_1 === 'en' || !y.iso_639_1 ? 0 : 1) || (y.vote_count || 0) - (x.vote_count || 0));
    return {posters: sortP(j.posters || []).map(p => p.file_path).filter(okPath).slice(0, 60),
      backdrops: (j.backdrops || []).slice().sort((x, y) => (x.iso_639_1 ? 1 : 0) - (y.iso_639_1 ? 1 : 0) || (y.vote_count || 0) - (x.vote_count || 0)).map(p => p.file_path).filter(okPath).slice(0, 40)};
  }
  // what stats are made of: genres, production countries, original language and top-billed cast
  const TVG = {10759: [28, 12], 10765: [878, 14], 10768: [10752], 10762: [10751]};  // TV-only genres → the film ones
  async function meta(id, tv) {
    const j = await api('/' + (tv ? 'tv/' : 'movie/') + encodeURIComponent(id) + '?append_to_response=credits&language=en-US');
    let g = (j.genres || []).map(x => +x.id).filter(Boolean);
    if (tv) g = [].concat(...g.map(x => TVG[x] || (x < 10759 ? [x] : [])));
    const c = tv ? (j.origin_country || []) : (j.production_countries || []).map(x => x.iso_3166_1);
    const cast = ((j.credits && j.credits.cast) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 6).map(x => String(x.name || '').slice(0, 60)).filter(Boolean);
    return {g: [...new Set(g)].slice(0, 5), c: c.filter(x => /^[A-Z]{2}$/.test(x)).slice(0, 4), l: /^[a-z]{2}$/.test(j.original_language || '') ? j.original_language : '', a: cast};
  }
  function put(key, path) { if (path && /^\/[A-Za-z0-9._-]+$/.test(path)) { cache[key] = [path, Date.now()]; save(); } }
  const url = path => path && /^\/[A-Za-z0-9._-]+$/.test(path) ? IMG + path : '';
  return {setToken, setProxy: p => { proxy = p || ''; }, setResolver: f => { resolver = f; }, proxied: () => !!proxy, on: () => !!(token || proxy), failed: () => authFail, shared: () => usingDef, setChosen: f => { chosen = f; }, src, fill, test, search, details, match, images, meta, put, url};
})();
