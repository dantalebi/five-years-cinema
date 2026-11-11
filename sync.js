// Sync through one secret Gist in the person's own GitHub account. Only a token with the "gist" scope is needed;
// it never leaves the device except in requests to api.github.com. Entries merge key by key, newest wins.
const FYSync = (() => {
  const FILE = 'five-years-cinema.json', API = 'https://api.github.com';
  const err = (code, msg) => Object.assign(new Error(msg || code), {code});
  async function req(tok, method, path, body) {
    let r;
    try {
      r = await fetch(API + path, {method, cache: 'no-store', headers: Object.assign({Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}, body ? {'Content-Type': 'application/json'} : {}), body: body ? JSON.stringify(body) : undefined});
    } catch (e) { throw err('net'); }
    if (r.status === 401) throw err('auth');
    if (r.status === 404) throw err('404');
    if (r.status === 403 || r.status === 429) throw err('limit');
    if (!r.ok) throw err('http', 'HTTP ' + r.status);
    return r.status === 204 ? null : r.json();
  }
  function merge(L, R) {
    const M = Object.assign({}, R); let push = false, pull = false;
    for (const k in L) if (!R[k] || L[k][1] > R[k][1]) { M[k] = L[k]; push = true; }
    for (const k in R) if (!L[k] || R[k][1] > L[k][1]) pull = true;
    return {M, push, pull};
  }
  async function user(tok) {
    const u = await req(tok, 'GET', '/user');
    return u && u.login;
  }
  async function findGist(tok, file) {
    file = file || FILE;
    for (let p = 1; p <= 10; p++) {
      const list = await req(tok, 'GET', '/gists?per_page=100&page=' + p);
      const g = (list || []).find(g => g.files && g.files[file]);
      if (g) return g.id;
      if (!list || list.length < 100) break;
    }
    return null;
  }
  async function read(tok, id) {
    const g = await req(tok, 'GET', '/gists/' + id), f = g.files && g.files[FILE];
    if (!f) throw err('404');
    let txt = f.content;
    if (f.truncated && f.raw_url) { const r = await fetch(f.raw_url, {cache: 'no-store'}); txt = await r.text(); }
    try { const o = JSON.parse(txt || '{}'); return (o && o.e) || {}; } catch (e) { return {}; }
  }
  const body = M => ({files: {[FILE]: {content: JSON.stringify({v: 1, app: 'five-years-cinema', e: M})}}});
  // one round: pull, merge, push if this device has anything newer. auth = {token, gist?}
  async function once(auth, L) {
    let id = auth.gist || await findGist(auth.token, FILE);
    if (!id) {
      const g = await req(auth.token, 'POST', '/gists', Object.assign({description: 'five-years-cinema: ticks and ratings (do not edit by hand)', public: false}, body(L)));
      return {M: L, push: true, pull: false, gist: g.id};
    }
    let R;
    try { R = await read(auth.token, id); }
    catch (e) { if (e.code === '404' && auth.gist) return once({token: auth.token}, L); throw e; }
    const {M, push, pull} = merge(L, R);
    if (push) await req(auth.token, 'PATCH', '/gists/' + id, body(M));
    return {M, push, pull, gist: id};
  }
  const MSG = {
    fa: {auth: 'گیت‌هاب این توکن رو قبول نکرد. شاید منقضی شده یا دسترسی gist نداره.', net: 'به اینترنت یا گیت‌هاب وصل نشد؛ بعداً خودش دوباره امتحان می‌کنه.', limit: 'گیت‌هاب فعلاً درخواست‌ها رو محدود کرده؛ چند دقیقه‌ی دیگه خودش دوباره امتحان می‌کنه.', other: 'همگام‌سازی نشد'},
    en: {auth: 'GitHub didn’t accept this token. It may have expired or lack gist access.', net: 'Couldn’t reach GitHub; it will try again on its own.', limit: 'GitHub is rate-limiting for now; it will try again in a few minutes.', other: 'Sync failed'},
  };
  const message = (e, lang) => { const m = MSG[lang === 'fa' ? 'fa' : 'en']; return m[e && e.code] || m.other + (e && e.message && e.message !== e.code ? ' (' + e.message + ')' : '') + '.'; };
  // ---- the plan itself lives in its own secret gist, so the public site carries no personal data ----
  const PLAN = 'five-years-plan.json', SHARE = 'five-years-share.json';
  async function fileText(f) {
    if (!f) throw err('404');
    if (f.truncated && f.raw_url) { const r = await fetch(f.raw_url, {cache: 'no-store'}); if (!r.ok) throw err('http'); return r.text(); }
    return f.content;
  }
  // returns {id, at, D?}: D only when the gist changed since `at`
  async function plan(tok, id, at) {
    id = id || await findGist(tok, PLAN);
    if (!id) return null;
    let g;
    try { g = await req(tok, 'GET', '/gists/' + id); }
    catch (e) { if (e.code === '404') return plan(tok, null, null); throw e; }
    if (at && g.updated_at === at) return {id, at};
    const D = JSON.parse(await fileText(g.files && g.files[PLAN]));
    return {id, at: g.updated_at, D};
  }
  // read-only page for friends: one secret gist holding only this week's public fields
  async function shareCreate(tok, content) {
    const g = await req(tok, 'POST', '/gists', {description: 'five-years-cinema: this week (read-only share)', public: false, files: {[SHARE]: {content}}});
    return g.id;
  }
  async function shareWrite(tok, id, content) { await req(tok, 'PATCH', '/gists/' + id, {files: {[SHARE]: {content}}}); }
  async function shareDelete(tok, id) { try { await req(tok, 'DELETE', '/gists/' + id); } catch (e) { if (e.code !== '404') throw e; } }
  return {once, merge, user, message, FILE, PLAN, SHARE, plan, shareCreate, shareWrite, shareDelete};
})();
