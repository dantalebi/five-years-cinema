// Film Diary, the server. Cloudflare Pages Functions with one D1 database bound as DB.
// Accounts and sessions, sync (the app's own key-by-key store, newest wins), public profiles, follows and a feed,
// plus two small proxies: TMDB (the key stays here, in TMDB_TOKEN) and Letterboxd RSS feeds (which browsers can't read).
//
// Passwords: the browser stretches the password first (PBKDF2-SHA256, 600,000 rounds, salted with the username),
// and only that result ever reaches the server, which hashes it again with its own random salt. The heavy work
// happens on the user's device because a free Worker gets about 10 ms of CPU per request.
// Settings (Pages → Settings → Variables): TMDB_TOKEN (secret), SIGNUP_CODE (optional invite code), PEPPER (optional secret).

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', pw TEXT NOT NULL, created INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (h TEXT PRIMARY KEY, uid INTEGER NOT NULL, created INTEGER NOT NULL, seen INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_uid ON sessions(uid)`,
  `CREATE TABLE IF NOT EXISTS kv (uid INTEGER NOT NULL, k TEXT NOT NULL, v TEXT, ms INTEGER NOT NULL, seq INTEGER NOT NULL, PRIMARY KEY (uid, k))`,
  `CREATE INDEX IF NOT EXISTS kv_seq ON kv(uid, seq)`,
  `CREATE TABLE IF NOT EXISTS plans (uid INTEGER PRIMARY KEY, plan TEXT NOT NULL, updated INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS profiles (uid INTEGER PRIMARY KEY, public INTEGER NOT NULL DEFAULT 1, payload TEXT, recent TEXT, updated INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS follows (a INTEGER NOT NULL, b INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (a, b))`,
  `CREATE INDEX IF NOT EXISTS follows_b ON follows(b)`,
  `CREATE TABLE IF NOT EXISTS hits (key TEXT PRIMARY KEY, n INTEGER NOT NULL, since INTEGER NOT NULL)`,
];
let ready = null;
const init = db => ready || (ready = db.batch(SCHEMA.map(s => db.prepare(s))).catch(e => { ready = null; throw e; }));

const HDR = {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff'};
const json = (o, status = 200, h) => new Response(JSON.stringify(o), {status, headers: Object.assign({}, HDR, h || {})});
const raw = (text, status = 200, h) => new Response(text, {status, headers: Object.assign({}, HDR, h || {})});
const fail = (code, status) => json({error: code}, status);

const USERNAME = /^[a-z0-9_]{3,24}$/, KEY = /^[0-9a-f]{64}$/, LB = /^[A-Za-z0-9_]{1,40}$/;
const RESERVED = new Set(['api', 'u', 'admin', 'root', 'login', 'signin', 'signup', 'settings', 'about', 'help', 'support', 'static', 'assets', 'www', 'me', 'null', 'undefined', 'film', 'films', 'diary']);
const DAY = 864e5, SESSION_DAYS = 120, ROUNDS = 5000;
const enc = new TextEncoder();
const b64 = buf => { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64url = buf => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
function same(a, b) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function stretch(key, salt, rounds, env) {
  const k = await crypto.subtle.importKey('raw', enc.encode(env.PEPPER ? env.PEPPER + '|' + key : key), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds}, k, 256));
}
async function hashKey(key, env) { const salt = crypto.getRandomValues(new Uint8Array(16)); return `v1$${ROUNDS}$${b64(salt)}$${await stretch(key, salt, ROUNDS, env)}`; }
async function keyOk(key, stored, env) {
  const [v, rounds, salt, h] = String(stored).split('$');
  if (v !== 'v1') return false;
  return same(await stretch(key, unb64(salt), +rounds, env), h);
}

// ---- requests ----
const ip = req => req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'local';
function cookie(req, name) { const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? m[1] : ''; }
const sessionCookie = (token, maxAge) => `fd_s=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
// state-changing requests must come from this same site. A POST must be JSON (a form on another site can't send
// that without the browser asking first); PUT and DELETE can't be sent cross-site without asking anyway.
function sameSite(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  if (req.method === 'POST' && !/^application\/json\b/i.test(req.headers.get('content-type') || '')) return false;
  const o = req.headers.get('origin');
  return !o || o === new URL(req.url).origin;
}
async function body(req, max) {
  const t = await req.text();
  if (t.length > max) throw Object.assign(new Error('too big'), {status: 413});
  try { return JSON.parse(t || '{}'); } catch (e) { throw Object.assign(new Error('bad json'), {status: 400}); }
}
// at most `max` hits per window, per key (an address, a username)
async function limited(db, key, max, windowMs) {
  const now = Date.now(), cut = now - windowMs;
  const r = await db.prepare(`INSERT INTO hits (key, n, since) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET
      n = CASE WHEN hits.since < ? THEN 1 ELSE hits.n + 1 END, since = CASE WHEN hits.since < ? THEN ? ELSE hits.since END RETURNING n`).bind(key, now, cut, cut, now).first();
  return r && r.n > max;
}
async function who(req, env) {
  const t = cookie(req, 'fd_s');
  if (!t || t.length > 100) return null;
  const h = await sha256(t);
  const r = await env.DB.prepare('SELECT s.uid, s.seen, u.username, u.name FROM sessions s JOIN users u ON u.id = s.uid WHERE s.h = ?').bind(h).first();
  if (!r) return null;
  const now = Date.now();
  if (r.seen < now - SESSION_DAYS * DAY) { await env.DB.prepare('DELETE FROM sessions WHERE h = ?').bind(h).run(); return null; }
  if (r.seen < now - DAY) await env.DB.prepare('UPDATE sessions SET seen = ? WHERE h = ?').bind(now, h).run();
  return {id: r.uid, username: r.username, name: r.name, h};
}
async function startSession(env, uid) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32))), now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (h, uid, created, seen) VALUES (?, ?, ?, ?)').bind(await sha256(token), uid, now, now).run();
  return sessionCookie(token, SESSION_DAYS * 86400);
}
const me = u => ({username: u.username, name: u.name});

// ---- the routes ----
const routes = [];
const on = (method, pattern, fn, opt = {}) => routes.push({method, re: new RegExp('^' + pattern + '$'), fn, opt});

on('GET', '/api/config', async (req, env) => json({code: !!env.SIGNUP_CODE, tmdb: !!env.TMDB_TOKEN}));
on('POST', '/api/signup', async (req, env, ctx) => {
  const b = await body(req, 2000), username = String(b.username || '').toLowerCase().trim(), key = String(b.key || '');
  if (env.SIGNUP_CODE && !same(String(b.code || '').trim(), String(env.SIGNUP_CODE).trim())) return fail('code', 403);
  if (!USERNAME.test(username) || RESERVED.has(username)) return fail('username', 400);
  if (!KEY.test(key)) return fail('key', 400);
  if (await limited(env.DB, 'signup:' + ip(req), 5, 36e5)) return fail('slow', 429);
  const taken = await env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
  if (taken) return fail('taken', 409);
  const name = String(b.name || '').trim().slice(0, 60);
  const r = await env.DB.prepare('INSERT INTO users (username, name, pw, created) VALUES (?, ?, ?, ?) RETURNING id').bind(username, name, await hashKey(key, env), Date.now()).first();
  return json({me: {username, name}}, 200, {'set-cookie': await startSession(env, r.id)});
});
on('POST', '/api/login', async (req, env) => {
  const b = await body(req, 2000), username = String(b.username || '').toLowerCase().trim(), key = String(b.key || '');
  if (!USERNAME.test(username) || !KEY.test(key)) return fail('wrong', 401);
  if (await limited(env.DB, 'login:' + ip(req), 30, 9e5) || await limited(env.DB, 'login:' + username, 10, 9e5)) return fail('slow', 429);
  const u = await env.DB.prepare('SELECT id, username, name, pw FROM users WHERE username = ?').bind(username).first();
  if (!u || !await keyOk(key, u.pw, env)) return fail('wrong', 401);
  return json({me: me(u)}, 200, {'set-cookie': await startSession(env, u.id)});
});
on('POST', '/api/logout', async (req, env, u) => {
  await env.DB.prepare('DELETE FROM sessions WHERE h = ?').bind(u.h).run();
  return json({ok: true}, 200, {'set-cookie': sessionCookie('', 0)});
}, {auth: true});
on('GET', '/api/me', async (req, env, u) => json({me: me(u)}), {auth: true});
on('POST', '/api/password', async (req, env, u) => {
  const b = await body(req, 2000);
  if (!KEY.test(String(b.key || '')) || !KEY.test(String(b.next || ''))) return fail('key', 400);
  if (await limited(env.DB, 'login:' + u.username, 10, 9e5)) return fail('slow', 429);
  const row = await env.DB.prepare('SELECT pw FROM users WHERE id = ?').bind(u.id).first();
  if (!await keyOk(b.key, row.pw, env)) return fail('wrong', 401);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw = ? WHERE id = ?').bind(await hashKey(b.next, env), u.id),
    env.DB.prepare('DELETE FROM sessions WHERE uid = ? AND h != ?').bind(u.id, u.h),  // other devices sign in again
  ]);
  return json({ok: true});
}, {auth: true});
on('POST', '/api/delete', async (req, env, u) => {
  const b = await body(req, 2000), row = await env.DB.prepare('SELECT pw FROM users WHERE id = ?').bind(u.id).first();
  if (!KEY.test(String(b.key || '')) || !await keyOk(b.key, row.pw, env)) return fail('wrong', 401);
  await env.DB.batch(['DELETE FROM kv WHERE uid = ?', 'DELETE FROM plans WHERE uid = ?', 'DELETE FROM profiles WHERE uid = ?', 'DELETE FROM sessions WHERE uid = ?',
    'DELETE FROM follows WHERE a = ?', 'DELETE FROM follows WHERE b = ?', 'DELETE FROM users WHERE id = ?'].map(s => env.DB.prepare(s).bind(u.id)));
  return json({ok: true}, 200, {'set-cookie': sessionCookie('', 0)});
}, {auth: true});

// sync: send what changed here, get back what changed elsewhere. Each change is [key, value, ms]; newest ms wins.
// `seq` is the server's own order of arrival, so a device asks for everything after the last seq it saw.
on('POST', '/api/sync', async (req, env, u) => {
  const b = await body(req, 1.2e6), since = Math.max(0, +b.since || 0), changes = Array.isArray(b.changes) ? b.changes : [];
  if (changes.length > 500) return fail('too many', 413);
  const base = Date.now() * 1000, stmts = [];
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    if (!Array.isArray(c) || typeof c[0] !== 'string' || !c[0] || c[0].length > 200 || !Number.isFinite(+c[2])) return fail('bad change', 400);
    const v = JSON.stringify(c[1] === undefined ? null : c[1]);
    if (v.length > 32000) return fail('too big', 413);
    stmts.push(env.DB.prepare(`INSERT INTO kv (uid, k, v, ms, seq) VALUES (?, ?, ?, ?, ?) ON CONFLICT(uid, k) DO UPDATE SET
      v = excluded.v, ms = excluded.ms, seq = excluded.seq WHERE excluded.ms > kv.ms`).bind(u.id, c[0], v, Math.floor(+c[2]), base + i));
  }
  if (stmts.length >= 100) {  // a big import: keep each account to a sane size
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM kv WHERE uid = ?').bind(u.id).first();
    if (n.n + stmts.length > 80000) return fail('full', 413);
  }
  if (stmts.length) await env.DB.batch(stmts);
  const rows = (await env.DB.prepare('SELECT k, v, ms, seq FROM kv WHERE uid = ? AND seq > ? ORDER BY seq LIMIT 1000').bind(u.id, since).all()).results || [];
  return json({seq: rows.length ? rows[rows.length - 1].seq : since, more: rows.length === 1000, changes: rows.map(r => [r.k, JSON.parse(r.v), r.ms])});
}, {auth: true});

// a plan of one's own (the five-year plan, say), private
on('GET', '/api/plan', async (req, env, u) => {
  const r = await env.DB.prepare('SELECT plan, updated FROM plans WHERE uid = ?').bind(u.id).first();
  return r ? raw('{"updated":' + r.updated + ',"plan":' + r.plan + '}') : fail('none', 404);
}, {auth: true});
on('PUT', '/api/plan', async (req, env, u) => {
  const b = await body(req, 1.9e6);
  if (!b.plan || !Array.isArray(b.plan.F) || !Array.isArray(b.plan.W)) return fail('bad plan', 400);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO plans (uid, plan, updated) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET plan = excluded.plan, updated = excluded.updated').bind(u.id, JSON.stringify(b.plan), now).run();
  return json({updated: now});
}, {auth: true});
on('DELETE', '/api/plan', async (req, env, u) => { await env.DB.prepare('DELETE FROM plans WHERE uid = ?').bind(u.id).run(); return json({ok: true}); }, {auth: true});

// the public profile: the app builds it (fxShare) and sends it whole; the latest diary entries are kept apart for the feed
on('PUT', '/api/profile', async (req, env, u) => {
  const b = await body(req, 1.9e6), p = b.payload;
  if (!p || typeof p !== 'object' || !Array.isArray(p.diary)) return fail('bad profile', 400);
  const keep = ['id', 't', 'y', 'p', 'r', 'h', 'rw', 'w', 'd', 'tm', 'sp'];
  const recent = p.diary.slice(0, 30).map(e => { const o = {}; keep.forEach(k => { if (e && e[k] !== undefined && e[k] !== '') o[k] = e[k]; }); if (e && e.rv) o.rv = 1; return o; });
  const name = String(p.name || '').trim().slice(0, 60), now = Date.now(), pub = b.public === false ? 0 : 1;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO profiles (uid, public, payload, recent, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET
      public = excluded.public, payload = excluded.payload, recent = excluded.recent, updated = excluded.updated`).bind(u.id, pub, JSON.stringify(p), JSON.stringify(recent), now),
    env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, u.id),
  ]);
  return json({updated: now});
}, {auth: true});
on('DELETE', '/api/profile', async (req, env, u) => { await env.DB.prepare('UPDATE profiles SET public = 0 WHERE uid = ?').bind(u.id).run(); return json({ok: true}); }, {auth: true});
on('GET', '/api/u/([a-z0-9_]{3,24})', async (req, env, u, m) => {
  const r = await env.DB.prepare('SELECT p.payload, p.updated FROM users x JOIN profiles p ON p.uid = x.id WHERE x.username = ? AND p.public = 1').bind(m[1]).first();
  if (!r || !r.payload) return fail('none', 404);
  return raw('{"updated":' + r.updated + ',"data":' + r.payload + '}', 200, {'cache-control': 'public, max-age=20'});
});
// who someone is on the site: counts, and whether you follow them
on('GET', '/api/u/([a-z0-9_]{3,24})/meta', async (req, env, u, m) => {
  const x = await env.DB.prepare(`SELECT x.id, x.username, x.name, p.public,
      (SELECT COUNT(*) FROM follows WHERE b = x.id) AS followers, (SELECT COUNT(*) FROM follows WHERE a = x.id) AS following
      FROM users x LEFT JOIN profiles p ON p.uid = x.id WHERE x.username = ?`).bind(m[1]).first();
  if (!x || !x.public) return fail('none', 404);
  const out = {username: x.username, name: x.name, followers: x.followers, following: x.following};
  if (u) { out.self = u.id === x.id; out.follows = !!await env.DB.prepare('SELECT 1 FROM follows WHERE a = ? AND b = ?').bind(u.id, x.id).first(); }
  return json(out);
}, {optionalAuth: true});

// follows, Letterboxd-style: one way, no approval
on('POST', '/api/follow', async (req, env, u) => {
  const b = await body(req, 500), name = String(b.username || '').toLowerCase();
  const x = USERNAME.test(name) && await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(name).first();
  if (!x || x.id === u.id) return fail('none', 404);
  if (b.on === false) await env.DB.prepare('DELETE FROM follows WHERE a = ? AND b = ?').bind(u.id, x.id).run();
  else await env.DB.prepare('INSERT OR IGNORE INTO follows (a, b, at) VALUES (?, ?, ?)').bind(u.id, x.id, Date.now()).run();
  return json({ok: true});
}, {auth: true});
on('GET', '/api/people', async (req, env, u) => {
  const rows = (await env.DB.prepare(`SELECT x.username, x.name, p.updated,
      EXISTS (SELECT 1 FROM follows WHERE a = ? AND b = x.id) AS following, EXISTS (SELECT 1 FROM follows WHERE a = x.id AND b = ?) AS follower
      FROM users x JOIN profiles p ON p.uid = x.id WHERE p.public = 1 AND x.id != ? ORDER BY p.updated DESC LIMIT 300`).bind(u.id, u.id, u.id).all()).results || [];
  return json({people: rows.map(r => ({username: r.username, name: r.name, updated: r.updated, following: !!r.following, follower: !!r.follower}))});
}, {auth: true});
// the latest entries of everyone you follow, assembled without unpacking anyone's whole profile
on('GET', '/api/feed', async (req, env, u) => {
  const rows = (await env.DB.prepare(`SELECT x.username, x.name, p.recent FROM follows f JOIN users x ON x.id = f.b JOIN profiles p ON p.uid = f.b
      WHERE f.a = ? AND p.public = 1 ORDER BY p.updated DESC LIMIT 100`).bind(u.id).all()).results || [];
  return raw('{"feed":[' + rows.map(r => '{"u":' + JSON.stringify(r.username) + ',"n":' + JSON.stringify(r.name || '') + ',"recent":' + (r.recent || '[]') + '}').join(',') + ']}');
}, {auth: true});

// Letterboxd RSS for any username (the taste match and each member's own new logs), kept for half an hour
on('GET', '/api/lb/([A-Za-z0-9_]{1,40})', async (req, env, u, m) => {
  const user = m[1].toLowerCase(), key = new Request('https://cache.film-diary/lb/' + user), cache = typeof caches !== 'undefined' ? caches.default : null;
  const hit = cache && await cache.match(key);
  if (hit) return hit;
  if (!u && await limited(env.DB, 'lb:' + ip(req), 40, 36e5)) return fail('slow', 429);
  const r = await fetch('https://letterboxd.com/' + user + '/rss/', {headers: {'User-Agent': 'Mozilla/5.0 (compatible; film-diary)', Accept: 'application/rss+xml, application/xml;q=0.9'}});
  if (r.status === 404) return fail('nouser', 404);
  if (!r.ok) return fail('letterboxd', 502);
  const res = new Response(await r.text(), {headers: {'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff', 'cache-control': 'public, max-age=1800'}});
  if (cache) await cache.put(key, res.clone());
  return res;
}, {optionalAuth: true});

// TMDB, for members only, through the site's own key; only the few lookups the app makes, answers kept for a day
const TMDB_OK = /^\/(search\/(movie|tv)|movie\/\d+(\/images)?|tv\/\d+|configuration)$/;
on('GET', '/api/tmdb(/.*)', async (req, env, u, m) => {
  if (!env.TMDB_TOKEN) return fail('notmdb', 503);
  if (!TMDB_OK.test(m[1])) return fail('path', 400);
  const url = 'https://api.themoviedb.org/3' + m[1] + new URL(req.url).search, cache = typeof caches !== 'undefined' ? caches.default : null, key = new Request(url);
  const hit = cache && await cache.match(key);
  if (hit) return hit;
  const r = await fetch(url, {headers: {Authorization: 'Bearer ' + env.TMDB_TOKEN, accept: 'application/json'}});
  if (!r.ok) return fail('tmdb', r.status === 404 ? 404 : 502);
  const res = new Response(await r.text(), {headers: {'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', 'cache-control': 'private, max-age=86400'}});
  if (cache) await cache.put(key, new Response(res.clone().body, {headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400'}}));
  return res;
}, {auth: true});

export async function handle(req, env) {
  const path = new URL(req.url).pathname;
  try {
    if (!env.DB) return fail('nodb', 500);
    await init(env.DB);
    const hits = routes.filter(r => r.re.test(path));
    if (!hits.length) return fail('notfound', 404);
    const route = hits.find(r => r.method === req.method);
    if (!route) return fail('method', 405);
    if (!sameSite(req)) return fail('origin', 403);
    const u = route.opt.auth || route.opt.optionalAuth ? await who(req, env) : null;
    if (route.opt.auth && !u) return fail('signin', 401);
    return await route.fn(req, env, u, path.match(route.re));
  } catch (e) {
    if (e && e.status) return fail(e.message, e.status);
    console.error(e && e.stack || e);
    return fail('server', 500);
  }
}
export const onRequest = ctx => handle(ctx.request, ctx.env);
