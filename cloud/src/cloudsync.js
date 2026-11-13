// The multi-user site's sync and account layer. Same shape as WebSync (the GitHub version), so the app's Settings work
// unchanged, plus sign-in, follows and the feed. The diary is the app's own store, {key: [value, ms]}: this device sends
// the keys it changed, the server answers with whatever changed elsewhere since the last time it asked.
const CloudSync = (() => {
  const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const enc = new TextEncoder();
  let me = null, state = 'ok', msg = '', errCode = '', busy = false, again = false, timer = null, payloadFn = null;
  try { me = JSON.parse(ls('fd-me') || 'null'); } catch (e) { me = null; }
  const subs = [], outs = [];
  const tell = () => subs.forEach(f => { try { f(); } catch (e) {} });
  let langFn = () => (typeof fxLang === 'function' ? fxLang(Store.data) : 'en');
  const L = () => langFn() === 'fa' ? 'fa' : 'en';
  const MSG = {
    en: {net: 'Can’t connect right now. Trying again automatically.', slow: 'Too many attempts. Try again in a few minutes.', wrong: 'Wrong username or password.', taken: 'That username’s already taken.',
      username: 'Usernames need 3–24 characters: letters, numbers or underscores.', code: 'That invite code or link doesn’t work. It may have been used, taken back or expired.', closed: 'TVC15 isn’t taking new members right now.', suspended: 'This account has been suspended.', 'none-left': 'You’ve used all your invites.', full: 'This account has hit its storage limit.', signin: 'You’ve been signed out. Please sign in again.', wrongrk: 'That username and recovery key don’t match.', toobig: 'Your public profile got too big to save. Your diary is safe; tell whoever runs the site.', email: 'That doesn’t look like an email address. Check it and try again.', emailtaken: 'Another account already uses that email.', mailfail: 'The email couldn’t be sent just now. Try again in a little while.', nomail: 'Email isn’t set up on this site yet.', link: 'This link doesn’t work any more: it’s expired or it’s been used. You can ask for a new one.', noemail: 'Add and confirm your own email first (Settings → Account).', slow: 'Too many tries. Wait a little and try again.', none: 'That account isn’t available.', timeout: 'TVC15 is taking too long to answer; it may be busy right now. What you’ve done is safe on this device. Try again in a minute.', server: 'Something went wrong on the site’s side. Try again in a minute; if it keeps happening, tell whoever runs the site.', unsynced: 'Some changes haven’t been saved to your account yet.', other: 'Something went wrong'},
    fa: {net: 'به سایت وصل نشد؛ خودش دوباره امتحان می‌کنه.', slow: 'تلاش زیاد شد. چند دقیقه صبر کن.', wrong: 'یوزرنیم یا رمز درست نیست.', taken: 'این یوزرنیم گرفته شده.',
      username: 'یوزرنیم ۳ تا ۲۴ حرف انگلیسی، عدد یا _ باشه.', code: 'کد دعوت درست نیست.', full: 'این حساب پر شده.', signin: 'از حسابت بیرون اومدی. دوباره وارد شو.', other: 'یه مشکلی پیش اومد'},
  };
  const say = code => MSG[L()][/^http5\d\d$/.test(code || '') ? 'server' : code] || MSG[L()].other + ' (' + code + ')';

  // every request has a time limit, so nothing waits forever: a minute for sending changes or the profile, else 25 seconds
  async function api(method, path, body) {
    let r;
    const ac = typeof AbortController === 'function' ? new AbortController() : null, limit = /^\/(sync|profile)$/.test(path) ? 60e3 : 25e3;
    const tt = ac ? setTimeout(() => ac.abort(), limit) : null;
    try { r = await fetch('/api' + path, {method, credentials: 'same-origin', cache: 'no-store', signal: ac ? ac.signal : undefined, headers: body !== undefined ? {'content-type': 'application/json'} : {}, body: body !== undefined ? JSON.stringify(body) : undefined}); }
    catch (e) { clearTimeout(tt); return {ok: false, status: 0, code: e && e.name === 'AbortError' ? 'timeout' : 'net'}; }
    clearTimeout(tt);
    let j = null; try { j = await r.json(); } catch (e) {}
    if (r.status === 401 && me && !/^\/(login|signup|password|delete|recovery|recover|email|forgot|reset)(\/|$)/.test(path)) { signedOut(); }
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

  // force: asked for now (signing in, Sync now), so the profile goes up at once rather than within a few minutes
  let againForce = false;
  async function run(force) {
    if (!me) return;
    if (busy) { again = true; if (force) againForce = true; return; }
    busy = true; state = 'busy'; tell();
    try {
      const E = Store.entries();
      // the first sync on this device sends everything it has; after that, only what changed here
      const keys = ls('fd-init') === me.username ? [...dirty].filter(k => E[k]) : Object.keys(E);
      const sent = {}; keys.forEach(k => { sent[k] = E[k][1]; });
      // the server numbers each account's changes in the order they're saved, so asking for everything after the last one
      // seen misses nothing (and doesn't bring back what this device just sent)
      let since = Math.max(0, +ls('fd-seq') || 0), more = true;
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
      await publish(force);
      state = 'ok'; msg = ''; errCode = ''; put('fd-at', String(Date.now()));
    } catch (e) {
      state = 'err'; errCode = e.code || 'other'; msg = say(errCode);
    } finally {
      busy = false; tell();
      if (again) { const f = againForce; again = false; againForce = false; setTimeout(() => run(f), 800); }
    }
  }
  // the public profile goes up whenever it changes
  // a profile the site wouldn't take is said (in Settings) and tried again only now and then, not on every sync
  let pubFail = 0, pubCode = '', pubAt = 0, pubTimer = null, lastLocal = 0;
  const QUIET = 15e3, EVERY = 3 * 60e3;
  const fp = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return s.length + ':' + (h >>> 0).toString(36); };
  async function publish(force) {
    if (!payloadFn || !Store.data['cfg:share']) return;
    if (pubFail && Date.now() - pubFail < 20 * 60e3) throw Object.assign(new Error(pubCode), {code: pubCode});
    // while things keep changing (a big import, posters being found), the profile goes up every few minutes, not after
    // every change; a single change goes up once things have been quiet for a few seconds
    const now = Date.now(), quiet = now - lastLocal >= QUIET, due = !pubAt || now - pubAt >= EVERY;
    if (!force && !quiet && !due) { if (!pubTimer) pubTimer = setTimeout(() => { pubTimer = null; run(); }, Math.min(QUIET - (now - lastLocal), EVERY - (now - pubAt)) + 300); return; }
    const content = payloadFn();
    if (!content || ls('fd-pub') === fp(content)) return;
    const r = await api('PUT', '/profile', {payload: JSON.parse(content), public: true});
    if (r.ok) { put('fd-pub', fp(content)); pubFail = 0; pubAt = Date.now(); }
    else if (r.status === 429) pubAt = Date.now();  // the site asked to slow down: in a few minutes, then
    else if (r.status) { pubFail = Date.now(); pubCode = r.status === 413 ? 'toobig' : r.code; throw Object.assign(new Error(pubCode), {code: pubCode}); }
  }
  // changes go up shortly after they're made; when there are a lot of them (an import), in fewer, bigger rounds
  function schedule() { clearTimeout(timer); timer = setTimeout(run, dirty.size > 150 ? 8000 : 1500); }

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
  // the last sign-in or sign-up error's code, so the form can point at the field it's about
  let lastCode = '';
  async function login(username, password) {
    const r = await api('POST', '/login', {username, key: await stretch(username, password)});
    lastCode = r.ok ? '' : r.code || 'other';
    if (!r.ok) return say(r.code);
    signedIn(r.j.me); return null;
  }
  // a new account comes with a recovery key, shown once (lastKey) and never stored on this device
  let lastKey = '';
  let lastEmail = '';  // the address a confirmation link just went to, at sign-up
  async function signup(username, password, name, code, email) {
    const r = await api('POST', '/signup', {username, key: await stretch(username, password), name, code, email: email || undefined});
    lastCode = r.ok ? '' : r.code || 'other';
    if (!r.ok) return say(r.code);
    lastKey = r.j.rk || ''; lastEmail = r.j.emailSent || ''; signedIn(Object.assign(r.j.me, {emailPending: lastEmail})); return null;
  }
  // email for password resets: add or change it (a link confirms it), remove it; the link; forgot password; a reset link
  const keepMe = j => { if (me && j) { me.email = j.email || ''; me.emailPending = j.emailPending || ''; put('fd-me', JSON.stringify(me)); } };
  const email = {
    async set(address, password) { const r = await api('POST', '/email', {email: address, key: await stretch(me.username, password)}); lastCode = r.ok ? '' : r.code; if (!r.ok) return say(r.code); keepMe(r.j); return null; },
    async remove(password) { const r = await api('POST', '/email', {remove: true, key: await stretch(me.username, password)}); lastCode = r.ok ? '' : r.code; if (!r.ok) return say(r.code); keepMe(r.j); return null; },
    async verify(t) { const r = await api('POST', '/email/verify', {t}); if (r.ok && me && me.username === r.j.username) keepMe({email: r.j.email}); return r.ok ? {email: r.j.email, username: r.j.username} : {err: say(r.code)}; },
    sentTo: () => { const e = lastEmail; lastEmail = ''; return e; },
  };
  async function forgot(who) { const r = await api('POST', '/forgot', {who}); lastCode = r.ok ? '' : r.code || 'other'; return r.ok ? null : say(r.code); }
  async function resetWho(t) { const r = await api('GET', '/reset/' + t); return r.ok ? {username: r.j.username} : {err: say(r.code), code: r.code}; }
  async function reset(t, username, next) {
    const r = await api('POST', '/reset', {t, next: await stretch(username, next)});
    lastCode = r.ok ? '' : r.code || 'other';
    if (!r.ok) return say(r.code);
    signedIn(r.j.me); return null;
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
    lastCode = r.ok ? '' : r.code || 'other';
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
  async function shareOn() { if (!me) return say('signin'); Store.set('cfg:share', me.username); put('fd-pub', null); pubAt = 0; lastLocal = 0; schedule(); return null; }
  // turning the profile off: nothing more goes up (a profile on its way up waits to land first, so it can't undo this)
  async function shareOff() {
    const was = Store.data['cfg:share'];
    Store.set('cfg:share', null); clearTimeout(pubTimer); pubTimer = null;
    for (let i = 0; busy && i < 600; i++) await new Promise(r => setTimeout(r, 100));
    const r = await api('DELETE', '/profile');
    if (!r.ok) { if (was) Store.set('cfg:share', was); return say(r.code); }
    put('fd-pub', null); return null;
  }
  const shareUrl = (u, eid) => location.origin + '/u/' + (u || (me && me.username) || '') + (eid ? '#' + eid : '');

  Store.onLocalChange(k => { dirty.add(k); lastLocal = Date.now(); saveDirty(); schedule(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
  window.addEventListener('online', () => run());
  setInterval(() => { if (document.visibilityState === 'visible') run(); }, 90000);
  return {
    kind: 'cloud', status: () => ({connected: !!me, login: me ? me.username : '', state, msg, code: errCode, at: +ls('fd-at') || 0}),
    me: () => me, check, login, signup, disconnect, changePassword, deleteAccount, onSignOut: f => outs.push(f),
    recover, newRecoveryKey, email, forgot, resetWho, reset, takeKey: () => { const k = lastKey; lastKey = ''; return k; }, unsent: () => dirty.size, say,
    sessions: () => api('GET', '/sessions'), endSession: id => api('POST', '/sessions/end', id === 'others' ? {others: true} : {id}),
    // a profile picture (base64 JPEG) or none; the account remembers its version, for its address
    async setAvatar(img) { const r = await api('PUT', '/avatar', {img}); if (r.ok && me) { me.av = r.j.av; put('fd-me', JSON.stringify(me)); } return r; },
    async removeAvatar() { const r = await api('DELETE', '/avatar'); if (r.ok && me) { me.av = 0; put('fd-me', JSON.stringify(me)); } return r; },
    block: (username, on) => api('POST', '/block', {username, on}), blocks: () => api('GET', '/blocks'), removeFollower: username => api('POST', '/follower', {username}),
    run: () => run(true), syncNow: () => run(true), onStatus: f => subs.push(f), touch, setPayload: f => { payloadFn = f; },
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
    admin: fresh => api('GET', '/admin' + (fresh ? '?fresh=1' : '')), health: () => api('GET', '/admin/health'), errCode: () => lastCode,
    adminDo: (what, o) => api('POST', '/admin/' + what, o),
    // invite links: yours, a new one, taking one back; who a link is from
    invites: {mine: () => api('GET', '/invites'), make: () => api('POST', '/invites', {}), revoke: c => api('DELETE', '/invites/' + c), who: c => api('GET', '/invite/' + c)},
    // what's new on the site (the owner writes it)
    news: () => api('GET', '/news'), newsPost: o => api('POST', '/admin/news', o), newsDelete: id => api('DELETE', '/admin/news/' + id),
    config: () => api('GET', '/config'), setLang: f => { langFn = f; },
  };
})();
