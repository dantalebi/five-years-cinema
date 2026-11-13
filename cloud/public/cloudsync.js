// The multi-user site's sync and account layer. Same shape as WebSync (the GitHub version), so the app's Settings work
// unchanged, plus sign-in, follows and the feed. The diary is the app's own store, {key: [value, ms]}: this device sends
// the keys it changed, the server answers with whatever changed elsewhere since the last time it asked.
const CloudSync = (() => {
  const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const enc = new TextEncoder();
  let me = null, state = 'ok', msg = '', busy = false, again = false, timer = null, payloadFn = null;
  try { me = JSON.parse(ls('fd-me') || 'null'); } catch (e) { me = null; }
  const subs = [], outs = [];
  const tell = () => subs.forEach(f => { try { f(); } catch (e) {} });
  let langFn = () => (typeof fxLang === 'function' ? fxLang(Store.data) : 'en');
  const L = () => langFn() === 'fa' ? 'fa' : 'en';
  const MSG = {
    en: {net: 'Can’t connect right now. Trying again automatically.', slow: 'Too many attempts. Try again in a few minutes.', wrong: 'Wrong username or password.', taken: 'That username’s already taken.',
      username: 'Usernames need 3–24 characters: letters, numbers or underscores.', code: 'That invite code or link doesn’t work. It may have been used, taken back or expired.', closed: 'TVC15 isn’t taking new members right now.', suspended: 'This account has been suspended.', 'none-left': 'You’ve used all your invites.', full: 'This account has hit its storage limit.', signin: 'You’ve been signed out. Please sign in again.', wrongrk: 'That username and recovery key don’t match.', none: 'That account isn’t available.', unsynced: 'Some changes haven’t been saved to your account yet.', other: 'Something went wrong'},
    fa: {net: 'به سایت وصل نشد؛ خودش دوباره امتحان می‌کنه.', slow: 'تلاش زیاد شد. چند دقیقه صبر کن.', wrong: 'یوزرنیم یا رمز درست نیست.', taken: 'این یوزرنیم گرفته شده.',
      username: 'یوزرنیم ۳ تا ۲۴ حرف انگلیسی، عدد یا _ باشه.', code: 'کد دعوت درست نیست.', full: 'این حساب پر شده.', signin: 'از حسابت بیرون اومدی. دوباره وارد شو.', other: 'یه مشکلی پیش اومد'},
  };
  const say = code => MSG[L()][code] || MSG[L()].other + ' (' + code + ')';

  async function api(method, path, body) {
    let r;
    try { r = await fetch('/api' + path, {method, credentials: 'same-origin', cache: 'no-store', headers: body !== undefined ? {'content-type': 'application/json'} : {}, body: body !== undefined ? JSON.stringify(body) : undefined}); }
    catch (e) { return {ok: false, status: 0, code: 'net'}; }
    let j = null; try { j = await r.json(); } catch (e) {}
    if (r.status === 401 && me && !/^\/(login|signup|password|delete|recovery|recover)$/.test(path)) { signedOut(); }
    return {ok: r.ok, status: r.status, j, code: (j && j.error) || (r.ok ? '' : 'http' + r.status)};
  }
  // the password never leaves the device as typed: 600,000 rounds of PBKDF2, salted with the site and username
  async function stretch(username, password) {
    const k = await crypto.subtle.importKey('raw', enc.encode(String(password).normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('film-diary/v1/' + String(username).toLowerCase().trim()), iterations: 600000}, k, 256);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ---- which keys this device still has to send ----
  let dirty = new Set();
  try { dirty = new Set(JSON.parse(ls('fd-dirty') || '[]')); } catch (e) {}
  let dt = null;
  const saveDirty = () => { clearTimeout(dt); dt = setTimeout(() => put('fd-dirty', JSON.stringify([...dirty])), 200); };
  function touch(keys) { keys.forEach(k => dirty.add(k)); saveDirty(); schedule(); }

  async function run() {
    if (!me) return;
    if (busy) { again = true; return; }
    busy = true; state = 'busy'; tell();
    try {
      const E = Store.entries();
      // the first sync on this device sends everything it has; after that, only what changed here
      const keys = ls('fd-init') === me.username ? [...dirty].filter(k => E[k]) : Object.keys(E);
      const sent = {}; keys.forEach(k => { sent[k] = E[k][1]; });
      let since = Math.max(0, (+ls('fd-seq') || 0) - 120e6), more = true;  // a two-minute overlap: nothing slips between devices
      while (keys.length || more) {
        const batch = keys.splice(0, 400).map(k => [k, E[k][0], E[k][1]]);
        const r = await api('POST', '/sync', {since, changes: batch});
        if (!r.ok) throw Object.assign(new Error(r.code), {code: r.code});
        const R = {}; r.j.changes.forEach(([k, v, ms]) => { R[k] = [v, ms]; });
        if (Object.keys(R).length) Store.mergeIn(R);
        since = r.j.seq; more = r.j.more;
        batch.forEach(([k]) => { const cur = Store.entries()[k]; if (!cur || cur[1] === sent[k]) dirty.delete(k); });
      }
      put('fd-seq', String(since)); put('fd-init', me.username); saveDirty();
      await publish();
      state = 'ok'; msg = ''; put('fd-at', String(Date.now()));
    } catch (e) {
      state = 'err'; msg = say(e.code || 'other');
    } finally {
      busy = false; tell();
      if (again) { again = false; setTimeout(run, 800); }
    }
  }
  // the public profile goes up whenever it changes
  async function publish() {
    if (!payloadFn || !Store.data['cfg:share']) return;
    const content = payloadFn();
    if (!content || ls('fd-pub') === content) return;
    const r = await api('PUT', '/profile', {payload: JSON.parse(content), public: true});
    if (r.ok) put('fd-pub', content);
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 1500); }

  // ---- signing in and out ----
  function wipe() {  // nothing of one account stays behind for the next person on this device
    ['fy-state', 'fd-me', 'fd-seq', 'fd-dirty', 'fd-init', 'fd-at', 'fd-pub', 'fd-plan', 'fd-plan-at'].forEach(k => put(k, null));
  }
  function signedIn(m) {
    if (ls('fd-init') && ls('fd-init') !== m.username) wipe();
    me = m; put('fd-me', JSON.stringify(m));
  }
  function signedOut() { me = null; wipe(); outs.forEach(f => { try { f(); } catch (e) {} }); }
  async function check() {  // is the session still good? (offline: trust the last answer)
    const r = await api('GET', '/me');
    if (r.ok) { signedIn(r.j.me); return me; }
    if (r.status === 401) { me = null; return null; }
    return me;
  }
  async function login(username, password) {
    const r = await api('POST', '/login', {username, key: await stretch(username, password)});
    if (!r.ok) return say(r.code);
    signedIn(r.j.me); return null;
  }
  // a new account comes with a recovery key, shown once (lastKey) and never stored on this device
  let lastKey = '';
  async function signup(username, password, name, code) {
    const r = await api('POST', '/signup', {username, key: await stretch(username, password), name, code});
    if (!r.ok) return say(r.code);
    lastKey = r.j.rk || ''; signedIn(r.j.me); return null;
  }
  // sign out: first send what this device hasn't sent yet; if that fails, say so (force: sign out anyway)
  async function disconnect(o) {
    o = o || {};
    if (dirty.size && !o.force) { await run(); if (dirty.size) return 'unsynced'; }
    const r = await api('POST', '/logout', {all: !!o.all});
    if (!r.ok && r.status !== 401 && !o.force) return say(r.code);
    signedOut(); return null;
  }
  async function recover(username, rk, next) {
    username = String(username || '').toLowerCase().trim();
    const r = await api('POST', '/recover', {username, rk: String(rk || '').trim(), next: await stretch(username, next)});
    if (!r.ok) return say(r.code);
    lastKey = r.j.rk || ''; signedIn(r.j.me); return null;
  }
  async function newRecoveryKey(password) {
    const r = await api('POST', '/recovery', {key: await stretch(me.username, password)});
    if (!r.ok) return {err: say(r.code)};
    if (me) { me.rk = true; put('fd-me', JSON.stringify(me)); }
    return {rk: r.j.rk};
  }
  async function changePassword(cur, next) {
    const r = await api('POST', '/password', {key: await stretch(me.username, cur), next: await stretch(me.username, next)});
    return r.ok ? null : say(r.code);
  }
  async function deleteAccount(password) {
    const r = await api('POST', '/delete', {key: await stretch(me.username, password)});
    if (!r.ok) return say(r.code);
    signedOut(); return null;
  }

  // ---- a plan of one's own (the five-year plan), cached here ----
  function cachedPlan() { try { return JSON.parse(ls('fd-plan') || 'null'); } catch (e) { return null; } }
  async function loadPlan() {
    const r = await api('GET', '/plan');
    if (!r.ok) return null;
    if (String(r.j.updated) !== ls('fd-plan-at')) { put('fd-plan', JSON.stringify(r.j.plan)); put('fd-plan-at', String(r.j.updated)); }
    return r.j.plan;
  }
  async function savePlan(D) { const r = await api('PUT', '/plan', {plan: D}); if (r.ok) { put('fd-plan', JSON.stringify(D)); put('fd-plan-at', String(r.j.updated)); } return r.ok; }

  // ---- the profile switch, as the app's Settings expect it ----
  async function shareOn() { if (!me) return say('signin'); Store.set('cfg:share', me.username); put('fd-pub', null); schedule(); return null; }
  async function shareOff() { const r = await api('DELETE', '/profile'); if (!r.ok) return say(r.code); Store.set('cfg:share', null); put('fd-pub', null); return null; }
  const shareUrl = (u, eid) => location.origin + '/u/' + (u || (me && me.username) || '') + (eid ? '#' + eid : '');

  Store.onLocalChange(k => { dirty.add(k); saveDirty(); schedule(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
  window.addEventListener('online', () => run());
  setInterval(() => { if (document.visibilityState === 'visible') run(); }, 90000);
  return {
    kind: 'cloud', status: () => ({connected: !!me, login: me ? me.username : '', state, msg, at: +ls('fd-at') || 0}),
    me: () => me, check, login, signup, disconnect, changePassword, deleteAccount, onSignOut: f => outs.push(f),
    recover, newRecoveryKey, takeKey: () => { const k = lastKey; lastKey = ''; return k; }, unsent: () => dirty.size, say,
    sessions: () => api('GET', '/sessions'), endSession: id => api('POST', '/sessions/end', id === 'others' ? {others: true} : {id}),
    // a profile picture (base64 JPEG) or none; the account remembers its version, for its address
    async setAvatar(img) { const r = await api('PUT', '/avatar', {img}); if (r.ok && me) { me.av = r.j.av; put('fd-me', JSON.stringify(me)); } return r; },
    async removeAvatar() { const r = await api('DELETE', '/avatar'); if (r.ok && me) { me.av = 0; put('fd-me', JSON.stringify(me)); } return r; },
    block: (username, on) => api('POST', '/block', {username, on}), blocks: () => api('GET', '/blocks'), removeFollower: username => api('POST', '/follower', {username}),
    run, syncNow: run, onStatus: f => subs.push(f), touch, setPayload: f => { payloadFn = f; },
    loadPlan, cachedPlan, savePlan, shareOn, shareOff, shareUrl, previewUrl: u => shareUrl(u),
    follow: (username, on) => api('POST', '/follow', {username, on}), feed: () => api('GET', '/feed'), people: () => api('GET', '/people'), meta: u => api('GET', '/u/' + u + '/meta'),
    react: o => api('POST', '/react', o), inbox: () => api('GET', '/inbox'),
    // a film among the members: the people you follow (every entry), watchlists, everyone's ratings counted
    filmRatings: keys => api('GET', '/film?' + keys.map(k => 'k=' + encodeURIComponent(k)).join('&')),
    // who follows someone and whom they follow; lists of films (yours, someone's, one by its address)
    follows: (u, which) => api('GET', '/u/' + u + '/' + (which === 'following' ? 'following' : 'followers')),
    lists: {mine: () => api('GET', '/lists'), create: o => api('POST', '/lists', o), update: (id, o) => api('PUT', '/lists/' + id, o), remove: id => api('DELETE', '/lists/' + id),
      of: u => api('GET', '/u/' + u + '/lists'), one: (u, slug) => api('GET', '/u/' + u + '/list/' + slug)},
    // the films the most members watched lately: who 'friends' or 'everyone'; span week, month, year, all or auto
    popular: (who, span, min) => api('GET', '/popular?who=' + (who === 'friends' ? 'friends' : 'everyone') + '&span=' + encodeURIComponent(span || 'week') + (min ? '&min=' + (+min) : '')),
    // the owner's page: the site's numbers and every account
    admin: () => api('GET', '/admin'),
    adminDo: (what, o) => api('POST', '/admin/' + what, o),
    // invite links: yours, a new one, taking one back; who a link is from
    invites: {mine: () => api('GET', '/invites'), make: () => api('POST', '/invites', {}), revoke: c => api('DELETE', '/invites/' + c), who: c => api('GET', '/invite/' + c)},
    // what's new on the site (the owner writes it)
    news: () => api('GET', '/news'), newsPost: o => api('POST', '/admin/news', o), newsDelete: id => api('DELETE', '/admin/news/' + id),
    config: () => api('GET', '/config'), setLang: f => { langFn = f; },
  };
})();
