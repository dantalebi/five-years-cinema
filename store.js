// Ticks, ratings and likes, as timestamped entries {key: [value, ms]} so two devices can be merged key by key.
// Same API everywhere: Store.data (live map of current values), Store.set(k, v), Store.load(), Store.onChange(f).
// In the extension it lives in chrome.storage.local; on the web, in localStorage.
const Store = (() => {
  const EXT = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);
  let E = {};
  const data = {}, subs = [], localSubs = [];
  const live = v => v !== null && v !== undefined && v !== '';
  function rebuild() { for (const k in data) delete data[k]; for (const k in E) if (live(E[k][0])) data[k] = E[k][0]; }
  function merge(A, B) { const M = Object.assign({}, A); for (const k in B) if (!M[k] || B[k][1] > M[k][1]) M[k] = B[k]; return M; }
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const cget = keys => new Promise(r => { try { chrome.storage.local.get(keys, v => r(v || {})); } catch (e) { r({}); } });
  async function readLocal() {
    if (EXT) return (await cget(['fy'])).fy || null;
    try { const s = lsGet('fy-state'); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  // extension 1.0/1.1 kept ticks in per-season docs (q00…, sh0…) of chrome.storage.sync
  async function legacy() {
    if (!EXT) return {};
    const read = a => new Promise(r => { try { chrome.storage[a].get(null, v => r(v || {})); } catch (e) { r({}); } });
    const [s, l] = await Promise.all([read('sync'), read('local')]), out = {};
    [l, s].forEach(all => Object.entries(all).forEach(([id, doc]) => {
      if (/^(q\d\d|sh\d)$/.test(id) && doc && typeof doc === 'object') Object.entries(doc).forEach(([k, v]) => { if (v) out[k] = [v, 1]; });
    }));
    return out;
  }
  async function load() {
    const st = await readLocal();
    if (st && st.e) E = merge(E, st.e);
    else { const old = await legacy(); if (Object.keys(old).length) { E = merge(E, old); flush(); } }
    rebuild();
    return data;
  }
  let wt = null;
  function flush() {
    clearTimeout(wt); wt = null;
    if (EXT) cget(['fy']).then(o => { E = merge(E, (o.fy && o.fy.e) || {}); chrome.storage.local.set({fy: {v: 1, e: E}}); });
    else { try { const cur = JSON.parse(lsGet('fy-state') || 'null'); if (cur && cur.e) E = merge(E, cur.e); } catch (e) {} lsSet('fy-state', JSON.stringify({v: 1, e: E})); }
  }
  function set(k, v) {
    const val = live(v) ? v : null, cur = E[k];
    if ((!cur && val === null) || (cur && cur[0] === val)) return;
    E[k] = [val, Date.now()];
    if (val === null) delete data[k]; else data[k] = val;
    clearTimeout(wt); wt = setTimeout(flush, 120);
    localSubs.forEach(f => { try { f(k); } catch (e) {} });
  }
  // remote entries arriving from the sync
  function mergeIn(R) {
    const before = JSON.stringify(E); E = merge(E, R);
    if (JSON.stringify(E) === before) return false;
    rebuild(); flush(); subs.forEach(f => { try { f('sync'); } catch (e) {} });
    return true;
  }
  const notify = why => load().then(() => subs.forEach(f => { try { f(why); } catch (e) {} }));
  if (EXT) { try { chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.fy) notify('change'); }); } catch (e) {} }
  else { try { window.addEventListener('storage', e => { if (e.key === 'fy-state') notify('change'); }); } catch (e) {} }
  window.addEventListener && window.addEventListener('pagehide', () => { if (wt) flush(); });
  return {data, load, set, get: k => data[k], mergeIn, entries: () => E, merge, onChange: f => subs.push(f), onLocalChange: f => localSubs.push(f), ext: EXT};
})();
