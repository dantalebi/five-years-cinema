// Posters from TMDB, looked up by title and year and cached on this device.
// Needs the person's own TMDB "API Read Access Token" (sent as a header, never in the URL).
const Posters = (() => {
  let token = null, cache = {}, busy = 0;
  const queue = [], waiting = {};
  try { cache = JSON.parse(localStorage.getItem('fy-posters') || '{}') || {}; } catch (e) { cache = {}; }
  let st = null;
  const save = () => { clearTimeout(st); st = setTimeout(() => { try { localStorage.setItem('fy-posters', JSON.stringify(cache)); } catch (e) {} }, 400); };
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  const IMG = 'https://image.tmdb.org/t/p/w185';
  let authFail = false;
  function setToken(t) { const n = t && /^eyJ/.test(t.trim()) ? t.trim() : null; if (n !== token) { token = n; authFail = false; } }
  async function api(path) {
    const r = await fetch('https://api.themoviedb.org/3' + path, {headers: {Authorization: 'Bearer ' + token, accept: 'application/json'}});
    if (r.status === 401) { authFail = true; throw new Error('auth'); }
    if (!r.ok) throw new Error('http');
    return r.json();
  }
  function pick(list, t, y) {
    const nt = norm(t); let best = null, bs = -1e9;
    (list || []).forEach((m, k) => {
      const my = +(m.release_date || '').slice(0, 4), dy = my ? Math.abs(my - y) : 9;
      let s = !y ? 0 : dy === 0 ? 3 : dy === 1 ? 2 : dy === 2 ? 0.5 : -6;
      if (norm(m.title) === nt || norm(m.original_title) === nt) s += 3;
      if (m.poster_path) s += 0.5; else s -= 4;
      s -= k * 0.15;
      if (s > bs) { bs = s; best = m; }
    });
    return bs >= 2 ? best : null;
  }
  async function lookup(key, t, y) {
    const q = encodeURIComponent(t.replace(/\s*\(.*?\)\s*$/, ''));
    let j = await api('/search/movie?query=' + q + (y ? '&year=' + y : '') + '&include_adult=false&language=en-US');
    let m = pick(j.results, t, y);
    if (!m && y) { j = await api('/search/movie?query=' + q + '&include_adult=false&language=en-US'); m = pick(j.results, t, y); }
    cache[key] = [m && m.poster_path ? m.poster_path : '', Date.now()]; save();
    return cache[key][0];
  }
  function pump() {
    while (busy < 3 && queue.length) {
      const [key, t, y] = queue.shift(); busy++;
      lookup(key, t, y).catch(() => null).then(p => { busy--; (waiting[key] || []).forEach(f => f(p)); delete waiting[key]; pump(); });
    }
  }
  const fresh = c => c && (c[0] || Date.now() - c[1] < 30 * 864e5);
  function src(key) { const c = cache[key]; return c && c[0] ? IMG + c[0] : ''; }
  function want(key, t, y, cb) {
    const c = cache[key];
    if (fresh(c)) { cb(c[0] ? IMG + c[0] : ''); return; }
    if (!token || authFail) { cb(''); return; }
    if (waiting[key]) { waiting[key].push(p => cb(p ? IMG + p : '')); return; }
    waiting[key] = [p => cb(p ? IMG + p : '')]; queue.push([key, t, y]); pump();
  }
  // fill every <img data-pk> under root that has no picture yet
  function fill(root) {
    root.querySelectorAll('img[data-pk]:not([src])').forEach(img => {
      want(img.dataset.pk, img.dataset.pt, +img.dataset.py, url => { if (url) img.src = url; else img.closest('.fx-pos') && img.closest('.fx-pos').classList.add('none'); });
    });
  }
  async function test(t) {
    try { const r = await fetch('https://api.themoviedb.org/3/configuration', {headers: {Authorization: 'Bearer ' + String(t).trim(), accept: 'application/json'}}); return r.ok; }
    catch (e) { return null; }
  }
  return {setToken, on: () => !!token, failed: () => authFail, src, fill, test};
})();
