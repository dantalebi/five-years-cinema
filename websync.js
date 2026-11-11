// Web side of the sync: the GitHub token stays in this browser's storage (home-screen apps on iPhone have their own).
// Also loads the plan from its private gist and keeps the friends' read-only page up to date.
const WebSync = (() => {
  const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  let state = 'ok', msg = '', busy = false, again = false, timer = null, payloadFn = null;
  const subs = [];
  const tell = () => subs.forEach(f => { try { f(); } catch (e) {} });
  const status = () => ({connected: !!ls('fy-gh'), login: ls('fy-login') || '', state, msg, at: +ls('fy-at') || 0});
  async function updateShare(token) {
    const id = Store.get('cfg:share');
    if (!id || !payloadFn) return;
    const content = payloadFn();
    if (!content || ls('fy-share-last') === id + '|' + content) return;
    await FYSync.shareWrite(token, id, content);
    put('fy-share-last', id + '|' + content);
  }
  async function run() {
    const token = ls('fy-gh');
    if (!token) return;
    if (busy) { again = true; return; }
    busy = true; state = 'busy'; tell();
    try {
      const res = await FYSync.once({token, gist: ls('fy-gist')}, Store.entries());
      if (res.gist && res.gist !== ls('fy-gist')) put('fy-gist', res.gist);
      if (res.pull) Store.mergeIn(res.M);
      try { await updateShare(token); } catch (e) { if (e.code === '404') { Store.set('cfg:share', null); } else throw e; }
      state = 'ok'; msg = ''; put('fy-at', String(Date.now()));
    } catch (e) {
      state = 'err'; msg = FYSync.message(e, fxLang(Store.data));
    } finally {
      busy = false; tell();
      if (again) { again = false; setTimeout(run, 800); }
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 1500); }
  async function connect(tok) {
    tok = tok.trim();
    let login;
    try { login = await FYSync.user(tok); } catch (e) { return FYSync.message(e, fxLang(Store.data)); }
    put('fy-gh', tok); put('fy-login', login || ''); put('fy-gist', null);
    await run();
    return state === 'err' ? msg : null;
  }
  function disconnect() { ['fy-gh', 'fy-login', 'fy-gist', 'fy-at', 'fy-share-last'].forEach(k => put(k, null)); state = 'ok'; msg = ''; tell(); }
  // the plan: cached on this device, refreshed from its private gist when that changes
  function cachedPlan() { try { return JSON.parse(ls('fy-plan') || 'null'); } catch (e) { return null; } }
  async function loadPlan() {
    const token = ls('fy-gh');
    if (!token) return null;
    const r = await FYSync.plan(token, ls('fy-plan-id'), cachedPlan() ? ls('fy-plan-at') : null);
    if (!r) return null;
    put('fy-plan-id', r.id);
    if (r.D) { put('fy-plan', JSON.stringify(r.D)); put('fy-plan-at', r.at); return r.D; }
    return null;
  }
  async function shareOn() {
    const token = ls('fy-gh');
    if (!token || !payloadFn) return fxLang(Store.data) === 'fa' ? 'اول همگام‌سازی رو وصل کن.' : 'Connect sync first.';
    try {
      const id = await FYSync.shareCreate(token, payloadFn());
      Store.set('cfg:share', id); put('fy-share-last', null);
      schedule();
      return null;
    } catch (e) { return FYSync.message(e, fxLang(Store.data)); }
  }
  async function shareOff() {
    const token = ls('fy-gh'), id = Store.get('cfg:share');
    if (!id) return null;
    try { if (token) await FYSync.shareDelete(token, id); } catch (e) { return FYSync.message(e, fxLang(Store.data)); }
    Store.set('cfg:share', null); put('fy-share-last', null);
    return null;
  }
  const shareUrl = id => new URL('share.html#' + id, location.href.replace(/#.*$/, '')).href;
  Store.onLocalChange(schedule);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
  window.addEventListener('online', () => run());
  setInterval(() => { if (document.visibilityState === 'visible') run(); }, 90000);
  return {status, connect, disconnect, syncNow: run, onStatus: f => subs.push(f), run, loadPlan, cachedPlan, shareOn, shareOff, shareUrl, setPayload: f => { payloadFn = f; }};
})();
