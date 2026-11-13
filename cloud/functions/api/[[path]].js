// Film Diary, the server. Cloudflare Pages Functions with one D1 database bound as DB.
// Accounts and sessions, sync (the app's own key-by-key store, newest wins), public profiles, follows and a feed,
// plus two small proxies: TMDB (the key stays here, in TMDB_TOKEN) and Letterboxd RSS feeds (which browsers can't read).
//
// Passwords: the browser stretches the password first (PBKDF2-SHA256, 600,000 rounds, salted with the username),
// and only that result ever reaches the server, which hashes it again with its own random salt. The heavy work
// happens on the user's device because a free Worker gets about 10 ms of CPU per request.
// Settings (Pages → Settings → Variables): TMDB_TOKEN (secret), SIGNUP_CODE (optional invite code, until the owner sets
// one on Your site), PEPPER (optional secret), OWNER (the owner's username).

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
  // reactions to a diary entry (owner's entry eid): h heart, s seen it too, w want to watch, c a comment (text)
  // ft: the film's title as the reactor saw it, so notifications can name it
  `CREATE TABLE IF NOT EXISTS reacts (id INTEGER PRIMARY KEY, owner INTEGER NOT NULL, eid TEXT NOT NULL, uid INTEGER NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', ft TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS reacts_owner ON reacts(owner, at)`,
  `CREATE INDEX IF NOT EXISTS reacts_uid ON reacts(uid)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS reacts_one ON reacts(owner, eid, uid, kind) WHERE kind != 'c'`,
  // a blocks b: no follows either way, no reactions on a's entries, neither appears to the other
  `CREATE TABLE IF NOT EXISTS blocks (a INTEGER NOT NULL, b INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (a, b))`,
  `CREATE INDEX IF NOT EXISTS blocks_b ON blocks(b)`,
  // a profile picture: a small square JPEG (the app crops and shrinks it to 256 pixels), as base64
  `CREATE TABLE IF NOT EXISTS avatars (uid INTEGER PRIMARY KEY, img TEXT NOT NULL, updated INTEGER NOT NULL)`,
  // lists of films: public ones are on the owner's profile and anyone with the link can read them; films is JSON
  // invites: a link a member (or the owner) makes for someone to join with; used once, good for two weeks
  `CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, uid INTEGER NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL, uses INTEGER NOT NULL DEFAULT 0, max INTEGER NOT NULL DEFAULT 1, revoked INTEGER NOT NULL DEFAULT 0, used_by INTEGER NOT NULL DEFAULT 0)`,
  // news: posts the owner writes for everyone (What's new, on Home)
  `CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY, uid INTEGER NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, at INTEGER NOT NULL)`,
  // the site's own settings, set by its owner on Your site: who can join, the invite code, members' invites, a contact
  `CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
  // results worked out now and then rather than on every request (Popular), with when they were
  `CREATE TABLE IF NOT EXISTS cache (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lists (id INTEGER PRIMARY KEY, uid INTEGER NOT NULL, slug TEXT NOT NULL, name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', pub INTEGER NOT NULL DEFAULT 1, ranked INTEGER NOT NULL DEFAULT 0, films TEXT NOT NULL DEFAULT '[]', n INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL, UNIQUE (uid, slug))`,
];
// columns added after the first release (each is added once; on later starts the database says it's already there)
// users.av: when the profile picture last changed (0: none), so its address changes with it and can be cached for good
const COLUMNS = [`ALTER TABLE sessions ADD COLUMN ua TEXT NOT NULL DEFAULT ''`, `ALTER TABLE users ADD COLUMN rk TEXT NOT NULL DEFAULT ''`, `ALTER TABLE users ADD COLUMN av INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE profiles ADD COLUMN films TEXT`, `ALTER TABLE profiles ADD COLUMN fmeta TEXT`,
  // users.banned: when the owner suspended the account (0: never); users.invited_by: who brought them in
  `ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0`, `ALTER TABLE users ADD COLUMN invited_by INTEGER NOT NULL DEFAULT 0`];
let ready = null;
const init = db => ready || (ready = db.batch(SCHEMA.map(s => db.prepare(s))).then(() => Promise.all(COLUMNS.map(c => db.prepare(c).run().catch(() => {})))).catch(e => { ready = null; throw e; }));

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
  const r = await env.DB.prepare('SELECT s.uid, s.seen, u.username, u.name, u.banned FROM sessions s JOIN users u ON u.id = s.uid WHERE s.h = ?').bind(h).first();
  if (!r || r.banned) return null;
  const now = Date.now();
  if (r.seen < now - SESSION_DAYS * DAY) { await env.DB.prepare('DELETE FROM sessions WHERE h = ?').bind(h).run(); return null; }
  if (r.seen < now - DAY) await env.DB.prepare('UPDATE sessions SET seen = ? WHERE h = ?').bind(now, h).run();
  return {id: r.uid, username: r.username, name: r.name, h};
}
async function startSession(env, uid, req) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32))), now = Date.now(), ua = String((req && req.headers.get('user-agent')) || '').slice(0, 250);
  await env.DB.prepare('INSERT INTO sessions (h, uid, created, seen, ua) VALUES (?, ?, ?, ?, ?)').bind(await sha256(token), uid, now, now, ua).run();
  return sessionCookie(token, SESSION_DAYS * 86400);
}
const me = u => ({username: u.username, name: u.name});
// whoever runs the site: OWNER in the Pages settings (a username, or several with commas); talebi until it's set.
// The owner has one page more than anyone else: the site's numbers and every account (/api/admin)
const owners = env => String(env.OWNER || 'talebi').toLowerCase().split(/[\s,]+/).filter(Boolean);
const isOwner = (env, u) => !!u && owners(env).includes(u.username);
// the site's settings (Your site), with what they fall back to
async function siteSettings(env) {
  const rows = (await env.DB.prepare('SELECT k, v FROM settings').all()).results || [], S = {};
  rows.forEach(r => { S[r.k] = r.v; });
  const code = S.code !== undefined ? S.code : String(env.SIGNUP_CODE || '').trim();
  const signup = ['open', 'invite', 'closed'].includes(S.signup) ? S.signup : (code ? 'invite' : 'open');
  return {signup, code, invites: S.invites !== undefined ? Math.max(0, Math.min(1000, +S.invites || 0)) : 3, contact: S.contact || ''};
}
const INVITE = /^[a-z0-9]{8,24}$/;
const newCode = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
// an invite link still good: not taken back, not past its date, not used up
const liveInvite = (env, code) => INVITE.test(String(code || '')) ? env.DB.prepare(`SELECT i.code, i.uid, x.username, x.name, x.av FROM invites i JOIN users x ON x.id = i.uid
  WHERE i.code = ? AND i.revoked = 0 AND i.expires > ? AND i.uses < i.max AND x.banned = 0`).bind(code, Date.now()).first() : Promise.resolve(null);
// a recovery key: the way back in after a forgotten password (there's no email). Shown once, kept only as a hash.
const RK_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newRecoveryKey = () => [...crypto.getRandomValues(new Uint8Array(20))].map(b => RK_ALPHA[b % 32]).join('').replace(/(.{5})(?=.)/g, '$1-');
const rkHash = (rk, env) => sha256('rk|' + (env.PEPPER || '') + '|' + String(rk || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
// is either of two people blocking the other?
const blocked = async (env, x, y) => !!await env.DB.prepare('SELECT 1 FROM blocks WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)').bind(x, y, y, x).first();

// ---- the routes ----
const routes = [];
const on = (method, pattern, fn, opt = {}) => routes.push({method, re: new RegExp('^' + pattern + '$'), fn, opt});

on('GET', '/api/config', async (req, env) => { const S = await siteSettings(env); return json({code: S.signup === 'invite', closed: S.signup === 'closed', contact: S.contact, tmdb: !!env.TMDB_TOKEN}); });
// who an invite link is from, for the page it opens (nothing for a link that's no good)
on('GET', '/api/invite/([a-z0-9]{8,24})', async (req, env, u, m) => {
  if (await limited(env.DB, 'invite:' + ip(req), 60, 36e5)) return fail('slow', 429);
  const i = await liveInvite(env, m[1]);
  return i ? json({by: {username: i.username, name: i.name || '', av: +i.av || 0}}) : fail('none', 404);
}, {optionalAuth: true});
on('POST', '/api/signup', async (req, env, ctx) => {
  const b = await body(req, 2000), username = String(b.username || '').toLowerCase().trim(), key = String(b.key || '');
  // who can join: anyone, people with the code or an invite link, or (closed) nobody new
  const S = await siteSettings(env), given = String(b.code || '').trim(), invite = await liveInvite(env, given.toLowerCase());
  if (S.signup === 'closed') return fail('closed', 403);
  if (S.signup === 'invite' && !invite && !(S.code && same(given, S.code))) return fail('code', 403);
  if (!USERNAME.test(username) || RESERVED.has(username)) return fail('username', 400);
  if (!KEY.test(key)) return fail('key', 400);
  if (await limited(env.DB, 'signup:' + ip(req), 5, 36e5)) return fail('slow', 429);
  const taken = await env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
  if (taken) return fail('taken', 409);
  const name = String(b.name || '').trim().slice(0, 60);
  const rk = newRecoveryKey();
  // an invite is used up as the account is made (two people racing for the last use: one of them gets it)
  if (invite) { const t = await env.DB.prepare('UPDATE invites SET uses = uses + 1 WHERE code = ? AND uses < max AND revoked = 0 RETURNING code').bind(invite.code).first(); if (!t && S.signup === 'invite' && !(S.code && same(given, S.code))) return fail('code', 403); }
  const r = await env.DB.prepare('INSERT INTO users (username, name, pw, created, rk, invited_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING id').bind(username, name, await hashKey(key, env), Date.now(), await rkHash(rk, env), invite ? invite.uid : 0).first();
  if (invite) await env.DB.prepare('UPDATE invites SET used_by = ? WHERE code = ?').bind(r.id, invite.code).run();
  return json({me: {username, name, rk: true}, rk}, 200, {'set-cookie': await startSession(env, r.id, req)});
});
on('POST', '/api/login', async (req, env) => {
  const b = await body(req, 2000), username = String(b.username || '').toLowerCase().trim(), key = String(b.key || '');
  if (!USERNAME.test(username) || !KEY.test(key)) return fail('wrong', 401);
  if (await limited(env.DB, 'login:' + ip(req), 30, 9e5) || await limited(env.DB, 'login:' + username, 10, 9e5)) return fail('slow', 429);
  const u = await env.DB.prepare('SELECT id, username, name, pw, banned FROM users WHERE username = ?').bind(username).first();
  if (!u || !await keyOk(key, u.pw, env)) return fail('wrong', 401);
  if (u.banned) return fail('suspended', 403);
  return json({me: me(u)}, 200, {'set-cookie': await startSession(env, u.id, req)});
});
// sign out of this device, or (all: true) of every device
on('POST', '/api/logout', async (req, env, u) => {
  const b = await body(req, 200);
  await env.DB.prepare(b.all ? 'DELETE FROM sessions WHERE uid = ?' : 'DELETE FROM sessions WHERE h = ?').bind(b.all ? u.id : u.h).run();
  return json({ok: true}, 200, {'set-cookie': sessionCookie('', 0)});
}, {auth: true});
on('GET', '/api/me', async (req, env, u) => {
  const r = await env.DB.prepare('SELECT rk, av FROM users WHERE id = ?').bind(u.id).first();
  return json({me: Object.assign(me(u), {rk: !!(r && r.rk), av: (r && r.av) || 0}, isOwner(env, u) ? {owner: true} : {})});
}, {auth: true});
// where you're signed in: each session with its browser and when it was last used (id: the start of the session's hash)
on('GET', '/api/sessions', async (req, env, u) => {
  const rows = (await env.DB.prepare('SELECT h, created, seen, ua FROM sessions WHERE uid = ? ORDER BY seen DESC LIMIT 50').bind(u.id).all()).results || [];
  return json({sessions: rows.map(r => ({id: r.h.slice(0, 16), created: r.created, seen: r.seen, ua: r.ua || '', current: r.h === u.h}))});
}, {auth: true});
on('POST', '/api/sessions/end', async (req, env, u) => {
  const b = await body(req, 200);
  if (b.others) await env.DB.prepare('DELETE FROM sessions WHERE uid = ? AND h != ?').bind(u.id, u.h).run();
  else if (/^[0-9a-f]{16}$/.test(String(b.id || ''))) await env.DB.prepare('DELETE FROM sessions WHERE uid = ? AND substr(h, 1, 16) = ? AND h != ?').bind(u.id, b.id, u.h).run();
  else return fail('bad', 400);
  return json({ok: true});
}, {auth: true});
// a new recovery key (the old one stops working); asks for the password first
on('POST', '/api/recovery', async (req, env, u) => {
  const b = await body(req, 500);
  if (await limited(env.DB, 'login:' + u.username, 10, 9e5)) return fail('slow', 429);
  const row = await env.DB.prepare('SELECT pw FROM users WHERE id = ?').bind(u.id).first();
  if (!KEY.test(String(b.key || '')) || !await keyOk(b.key, row.pw, env)) return fail('wrong', 401);
  const rk = newRecoveryKey();
  await env.DB.prepare('UPDATE users SET rk = ? WHERE id = ?').bind(await rkHash(rk, env), u.id).run();
  return json({rk});
}, {auth: true});
// forgot your password: username + recovery key + a new password. Every device is signed out; a new key replaces the used one.
on('POST', '/api/recover', async (req, env) => {
  const b = await body(req, 1000), username = String(b.username || '').toLowerCase().trim();
  if (!USERNAME.test(username) || !KEY.test(String(b.next || '')) || !/^[A-Za-z0-9-]{20,40}$/.test(String(b.rk || ''))) return fail('wrongrk', 401);
  if (await limited(env.DB, 'recover:' + ip(req), 10, 36e5) || await limited(env.DB, 'recover:' + username, 5, 36e5)) return fail('slow', 429);
  const u = await env.DB.prepare('SELECT id, username, name, rk, banned FROM users WHERE username = ?').bind(username).first();
  if (!u || !u.rk || !same(await rkHash(b.rk, env), u.rk)) return fail('wrongrk', 401);
  if (u.banned) return fail('suspended', 403);
  const rk = newRecoveryKey();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw = ?, rk = ? WHERE id = ?').bind(await hashKey(b.next, env), await rkHash(rk, env), u.id),
    env.DB.prepare('DELETE FROM sessions WHERE uid = ?').bind(u.id),
  ]);
  return json({me: Object.assign(me(u), {rk: true}), rk}, 200, {'set-cookie': await startSession(env, u.id, req)});
});
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
// everything an account has, gone at once
const wipe = (env, id) => env.DB.batch(['DELETE FROM kv WHERE uid = ?', 'DELETE FROM plans WHERE uid = ?', 'DELETE FROM profiles WHERE uid = ?', 'DELETE FROM sessions WHERE uid = ?',
  'DELETE FROM follows WHERE a = ?', 'DELETE FROM follows WHERE b = ?', 'DELETE FROM reacts WHERE uid = ?', 'DELETE FROM reacts WHERE owner = ?', 'DELETE FROM blocks WHERE a = ?', 'DELETE FROM blocks WHERE b = ?', 'DELETE FROM avatars WHERE uid = ?',
  'DELETE FROM lists WHERE uid = ?', 'DELETE FROM invites WHERE uid = ?', 'DELETE FROM users WHERE id = ?'].map(q => env.DB.prepare(q).bind(id)));
on('POST', '/api/delete', async (req, env, u) => {
  const b = await body(req, 2000), row = await env.DB.prepare('SELECT pw FROM users WHERE id = ?').bind(u.id).first();
  if (!KEY.test(String(b.key || '')) || !await keyOk(b.key, row.pw, env)) return fail('wrong', 401);
  await wipe(env, u.id);
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

// Each profile's films, one line per entry, so a film's page can find everyone's ratings without unpacking whole
// profiles: "<film key>\t<rating 0-10>\t<liked>\t<watched date>\t<entry id>\t<rewatch>\t<kind: D diary, S seen
// without a date, W watchlist>\t<spoiler>\t<the start of the review>". A film's key is m<TMDB id> (t<id> for a series)
// or n<title, simplified>|<year>; an entry with a TMDB id is listed under both, so either finds it.
const fnorm = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 120);
const fkeys = (t, y, tm) => { const k = []; tm = +tm || 0; if (tm > 0) k.push('m' + tm); else if (tm < 0) k.push('t' + (-tm)); const n = fnorm(t); if (n) k.push('n' + n + '|' + (+y || '')); return k; };
const clean1 = (v, n) => String(v == null ? '' : v).replace(/[\t\n\r\u0000-\u001f]+/g, ' ').trim().slice(0, n);
function filmIndex(p) {
  const out = [];
  const add = (e, kind) => {
    if (!e || typeof e.t !== 'string') return;
    const rx = kind === 'D' && e.rv && typeof e.rv === 'string' && !e.sp ? clean1(e.rv, 240) : '';
    const row = [Math.max(0, Math.min(10, +e.r || 0)), e.h ? 1 : 0, kind === 'D' && /^\d{4}-\d\d-\d\d$/.test(e.w || '') ? e.w : '', kind === 'D' ? clean1(e.id, 120) : '', e.rw ? 1 : 0, kind, e.sp && e.rv ? 1 : 0, rx].join('\t');
    fkeys(e.t, e.y, e.tm).forEach(k => out.push(k + '\t' + row));
  };
  (Array.isArray(p.diary) ? p.diary : []).forEach(e => add(e, 'D'));
  (Array.isArray(p.seen) ? p.seen : []).forEach(e => add(e, 'S'));
  (Array.isArray(p.wl) ? p.wl : []).forEach(e => add(e, 'W'));
  return '\n' + out.join('\n') + '\n';
}
// the lines of one profile's index for any of a film's keys
function filmLines(films, keys) {
  const out = [];
  keys.forEach(k => { const at = '\n' + k + '\t'; let i = films.indexOf(at); while (i >= 0) { const j = films.indexOf('\n', i + 1); out.push(films.slice(i + at.length, j < 0 ? undefined : j).split('\t')); i = films.indexOf(at, i + 1); } });
  return out;
}
// and each profile's films as they're shown (one line a film, under the key its index lines start with):
// "<film key>\t<title>\t<year>\t<poster path>", so Popular can name films without unpacking whole profiles
const ppath = p => { const m = String(p || '').match(/^(?:https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original))?(\/[A-Za-z0-9._-]{1,100})$/); return m ? m[1] : ''; };
function filmMeta(p) {
  const seen = new Set(), out = [];
  const add = e => {
    if (!e || typeof e.t !== 'string') return;
    const k = fkeys(e.t, e.y, e.tm)[0]; if (!k || seen.has(k)) return; seen.add(k);
    out.push(k + '\t' + clean1(String(e.t).replace(/\s*\(\d{4}\)\s*$/, ''), 200) + '\t' + (Math.max(0, Math.min(2100, +e.y || 0)) || '') + '\t' + ppath(e.p));
  };
  ['diary', 'seen', 'wl'].forEach(n => (Array.isArray(p[n]) ? p[n] : []).forEach(add));
  return '\n' + out.join('\n') + '\n';
}
function metaLine(fm, k) {
  const at = '\n' + k + '\t', i = fm.indexOf(at); if (i < 0) return null;
  const j = fm.indexOf('\n', i + 1), l = fm.slice(i + at.length, j < 0 ? undefined : j).split('\t');
  return l[0] ? {t: l[0], y: +l[1] || 0, p: l[2] || ''} : null;
}
// a profile published before these indexes existed: build them once, from the profile itself
async function indexes(env, uid) {
  const pr = await env.DB.prepare('SELECT payload FROM profiles WHERE uid = ?').bind(uid).first();
  try { const p = JSON.parse(pr.payload), films = filmIndex(p), fmeta = filmMeta(p); await env.DB.prepare('UPDATE profiles SET films = ?, fmeta = ? WHERE uid = ?').bind(films, fmeta, uid).run(); return {films, fmeta}; }
  catch (e) { return {films: '', fmeta: ''}; }
}
// the public profile: the app builds it (fxShare) and sends it whole; the latest diary entries are kept apart for the feed
on('PUT', '/api/profile', async (req, env, u) => {
  const b = await body(req, 1.9e6), p = b.payload;
  if (!p || typeof p !== 'object' || !Array.isArray(p.diary)) return fail('bad profile', 400);
  const keep = ['id', 't', 'y', 'p', 'r', 'h', 'rw', 'w', 'd', 'tm', 'sp'];
  const recent = p.diary.slice(0, 30).map(e => {
    const o = {}; keep.forEach(k => { if (e && e[k] !== undefined && e[k] !== '') o[k] = e[k]; });
    if (e && e.rv) { o.rv = 1; if (!e.sp && typeof e.rv === 'string') o.rx = e.rv.slice(0, 280); }  // the start of the review, for the feed
    return o;
  });
  const name = String(p.name || '').trim().slice(0, 60), now = Date.now(), pub = b.public === false ? 0 : 1;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO profiles (uid, public, payload, recent, films, fmeta, updated) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET
      public = excluded.public, payload = excluded.payload, recent = excluded.recent, films = excluded.films, fmeta = excluded.fmeta, updated = excluded.updated`).bind(u.id, pub, JSON.stringify(p), JSON.stringify(recent), filmIndex(p), filmMeta(p), now),
    env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, u.id),
  ]);
  return json({updated: now});
}, {auth: true});
on('DELETE', '/api/profile', async (req, env, u) => { await env.DB.prepare('UPDATE profiles SET public = 0 WHERE uid = ?').bind(u.id).run(); return json({ok: true}); }, {auth: true});
on('GET', '/api/u/([a-z0-9_]{3,24})', async (req, env, u, m) => {
  const r = await env.DB.prepare('SELECT x.id, x.av, p.payload, p.updated FROM users x JOIN profiles p ON p.uid = x.id WHERE x.username = ? AND p.public = 1 AND x.banned = 0').bind(m[1]).first();
  if (!r || !r.payload || (u && await blocked(env, u.id, r.id))) return fail('none', 404);
  return raw('{"updated":' + r.updated + ',"av":' + (+r.av || 0) + ',"data":' + r.payload + '}', 200, {'cache-control': u ? 'private, no-store' : 'public, max-age=20'});
}, {optionalAuth: true});
// who someone is on the site: counts, and whether you follow them
on('GET', '/api/u/([a-z0-9_]{3,24})/meta', async (req, env, u, m) => {
  const x = await env.DB.prepare(`SELECT x.id, x.username, x.name, x.av, p.public,
      (SELECT COUNT(*) FROM follows WHERE b = x.id) AS followers, (SELECT COUNT(*) FROM follows WHERE a = x.id) AS following
      FROM users x LEFT JOIN profiles p ON p.uid = x.id WHERE x.username = ? AND x.banned = 0`).bind(m[1]).first();
  if (!x || (!x.public && !(u && u.id === x.id))) return fail('none', 404);  // your own counts, even while your profile is private
  if (u && u.id !== x.id && await env.DB.prepare('SELECT 1 FROM blocks WHERE a = ? AND b = ?').bind(x.id, u.id).first()) return fail('none', 404);
  const out = {username: x.username, name: x.name, av: x.av || 0, followers: x.followers, following: x.following};
  if (u) {
    out.self = u.id === x.id;
    out.follows = !!await env.DB.prepare('SELECT 1 FROM follows WHERE a = ? AND b = ?').bind(u.id, x.id).first();
    out.followsYou = !!await env.DB.prepare('SELECT 1 FROM follows WHERE a = ? AND b = ?').bind(x.id, u.id).first();
    out.blocked = !!await env.DB.prepare('SELECT 1 FROM blocks WHERE a = ? AND b = ?').bind(u.id, x.id).first();
  }
  return json(out);
}, {optionalAuth: true});

// follows, Letterboxd-style: one way, no approval
on('POST', '/api/follow', async (req, env, u) => {
  const b = await body(req, 500), name = String(b.username || '').toLowerCase();
  const x = USERNAME.test(name) && await env.DB.prepare('SELECT id FROM users WHERE username = ? AND banned = 0').bind(name).first();
  if (!x || x.id === u.id) return fail('none', 404);
  if (b.on !== false && await blocked(env, u.id, x.id)) return fail('none', 404);
  if (b.on === false) await env.DB.prepare('DELETE FROM follows WHERE a = ? AND b = ?').bind(u.id, x.id).run();
  else await env.DB.prepare('INSERT OR IGNORE INTO follows (a, b, at) VALUES (?, ?, ?)').bind(u.id, x.id, Date.now()).run();
  return json({ok: true});
}, {auth: true});
// who follows someone, and whom they follow: [{username, name, av, following (you follow them), you (it's you)}]
on('GET', '/api/u/([a-z0-9_]{3,24})/(followers|following)', async (req, env, u, m) => {
  const x = await env.DB.prepare('SELECT x.id, p.public FROM users x LEFT JOIN profiles p ON p.uid = x.id WHERE x.username = ? AND x.banned = 0').bind(m[1]).first();
  if (!x || (!x.public && !(u && u.id === x.id)) || (u && await blocked(env, u.id, x.id))) return fail('none', 404);
  const me = u ? u.id : 0, col = m[2] === 'followers' ? ['a', 'b'] : ['b', 'a'];
  const rows = (await env.DB.prepare(`SELECT y.username, y.name, y.av, f.at, EXISTS (SELECT 1 FROM follows WHERE a = ? AND b = y.id) AS fol
      FROM follows f JOIN users y ON y.id = f.${col[0]} WHERE f.${col[1]} = ? AND y.banned = 0
        AND NOT EXISTS (SELECT 1 FROM blocks WHERE (a = ? AND b = y.id) OR (a = y.id AND b = ?)) ORDER BY f.at DESC LIMIT 1000`).bind(me, x.id, me, me).all()).results || [];
  return json({people: rows.map(r => ({username: r.username, name: r.name || '', av: +r.av || 0, following: !!r.fol, you: !!u && r.username === u.username}))}, 200, {'cache-control': 'private, no-store'});
}, {optionalAuth: true});

// ---- lists of films ----
const LSLUG = /^[a-z0-9-]{1,80}$/;
const lslug = n => String(n || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'list';
const okPath = p => typeof p === 'string' && /^\/[A-Za-z0-9._-]{1,80}$/.test(p);
// a list's description: line breaks kept, other control characters out
const cleanNote = v => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2000);
// the films as stored: [{t, y, tm, p, c}] (c: a comment on the film, in this list), at most 2,000
function listFilms(a) {
  if (!Array.isArray(a)) return null;
  const out = [];
  for (const f of a.slice(0, 2000)) {
    if (!f || typeof f.t !== 'string' || !f.t.trim()) continue;
    const o = {t: clean1(f.t, 200), y: Math.max(0, Math.min(2100, +f.y || 0)), tm: Math.max(-1e9, Math.min(1e9, Math.round(+f.tm || 0)))};
    if (okPath(f.p)) o.p = f.p;
    const c = clean1(f.c, 500); if (c) o.c = c;
    out.push(o);
  }
  return out;
}
const listRow = (r, full) => Object.assign({id: r.id, slug: r.slug, name: r.name, note: r.note, pub: !!r.pub, ranked: !!r.ranked, n: r.n, created: r.created, updated: r.updated},
  full ? {films: JSON.parse(r.films || '[]')} : {posters: JSON.parse(r.films || '[]').slice(0, 5).map(f => f.p || '')});
// your own lists, whole
on('GET', '/api/lists', async (req, env, u) => {
  const rows = (await env.DB.prepare('SELECT * FROM lists WHERE uid = ? ORDER BY updated DESC LIMIT 500').bind(u.id).all()).results || [];
  return json({lists: rows.map(r => listRow(r, true))}, 200, {'cache-control': 'private, no-store'});
}, {auth: true});
on('POST', '/api/lists', async (req, env, u) => {
  const b = await body(req, 400000), name = clean1(b.name, 100);
  if (!name) return fail('noname', 400);
  const films = listFilms(b.films || []) || [];
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM lists WHERE uid = ?').bind(u.id).first();
  if (n.n >= 500) return fail('full', 413);
  if (await limited(env.DB, 'list:' + u.id, 120, 36e5)) return fail('slow', 429);
  let slug = lslug(name), k = 1;
  while (await env.DB.prepare('SELECT 1 FROM lists WHERE uid = ? AND slug = ?').bind(u.id, slug).first()) slug = lslug(name).slice(0, 56) + '-' + (++k);
  const now = Date.now();
  const r = await env.DB.prepare('INSERT INTO lists (uid, slug, name, note, pub, ranked, films, n, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *')
    .bind(u.id, slug, name, cleanNote(b.note), b.pub === false ? 0 : 1, b.ranked ? 1 : 0, JSON.stringify(films), films.length, now, now).first();
  return json({list: listRow(r, true)});
}, {auth: true});
on('PUT', '/api/lists/(\\d{1,12})', async (req, env, u, m) => {
  const b = await body(req, 400000);
  const r = await env.DB.prepare('SELECT * FROM lists WHERE id = ? AND uid = ?').bind(+m[1], u.id).first();
  if (!r) return fail('none', 404);
  const o = {name: r.name, note: r.note, pub: r.pub, ranked: r.ranked, films: r.films, n: r.n};
  if (b.name !== undefined) { o.name = clean1(b.name, 100); if (!o.name) return fail('noname', 400); }
  if (b.note !== undefined) o.note = cleanNote(b.note);
  if (b.pub !== undefined) o.pub = b.pub ? 1 : 0;
  if (b.ranked !== undefined) o.ranked = b.ranked ? 1 : 0;
  if (b.films !== undefined) { const f = listFilms(b.films); if (!f) return fail('bad', 400); o.films = JSON.stringify(f); o.n = f.length; }
  const now = Date.now();
  await env.DB.prepare('UPDATE lists SET name = ?, note = ?, pub = ?, ranked = ?, films = ?, n = ?, updated = ? WHERE id = ?').bind(o.name, o.note, o.pub, o.ranked, o.films, o.n, now, r.id).run();
  return json({list: listRow(Object.assign({}, r, o, {updated: now}), true)});
}, {auth: true});
on('DELETE', '/api/lists/(\\d{1,12})', async (req, env, u, m) => {
  await env.DB.prepare('DELETE FROM lists WHERE id = ? AND uid = ?').bind(+m[1], u.id).run();
  return json({ok: true});
}, {auth: true});
// someone's lists (the public ones; all of them for the owner), and one list by its address: anyone can read a public
// list, signed in or not, even when its owner's profile is private
on('GET', '/api/u/([a-z0-9_]{3,24})/lists', async (req, env, u, m) => {
  const x = await env.DB.prepare('SELECT id FROM users WHERE username = ? AND banned = 0').bind(m[1]).first();
  if (!x || (u && await blocked(env, u.id, x.id))) return fail('none', 404);
  const own = !!u && u.id === x.id;
  const rows = (await env.DB.prepare(`SELECT * FROM lists WHERE uid = ?${own ? '' : ' AND pub = 1'} ORDER BY updated DESC LIMIT 500`).bind(x.id).all()).results || [];
  return json({lists: rows.map(r => listRow(r, false))}, 200, {'cache-control': 'private, no-store'});
}, {optionalAuth: true});
on('GET', '/api/u/([a-z0-9_]{3,24})/list/([a-z0-9-]{1,80})', async (req, env, u, m) => {
  const r = await env.DB.prepare('SELECT l.*, x.username, x.name AS uname, x.av FROM lists l JOIN users x ON x.id = l.uid WHERE x.username = ? AND l.slug = ? AND x.banned = 0').bind(m[1], m[2]).first();
  if (!r || (!r.pub && !(u && u.id === r.uid)) || (u && u.id !== r.uid && await blocked(env, u.id, r.uid))) return fail('none', 404);
  return json({list: listRow(r, true), by: {username: r.username, name: r.uname || '', av: +r.av || 0}, own: !!u && u.id === r.uid}, 200, {'cache-control': u ? 'private, no-store' : 'public, max-age=30'});
}, {optionalAuth: true});

// profile pictures: set (a JPEG of at most 120 KB), remove, and fetch by username (?v= the version, so it caches for good)
on('PUT', '/api/avatar', async (req, env, u) => {
  const b = await body(req, 170000), img = String(b.img || '');
  if (!/^[A-Za-z0-9+/]+=*$/.test(img) || img.length > 160000) return fail('bad', 400);
  let bytes; try { bytes = unb64(img); } catch (e) { return fail('bad', 400); }
  if (bytes.length < 200 || bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) return fail('bad', 400);  // a JPEG, nothing else
  if (await limited(env.DB, 'avatar:' + u.id, 30, 36e5)) return fail('slow', 429);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO avatars (uid, img, updated) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET img = excluded.img, updated = excluded.updated').bind(u.id, img, now),
    env.DB.prepare('UPDATE users SET av = ? WHERE id = ?').bind(now, u.id),
  ]);
  return json({av: now});
}, {auth: true});
on('DELETE', '/api/avatar', async (req, env, u) => {
  await env.DB.batch([env.DB.prepare('DELETE FROM avatars WHERE uid = ?').bind(u.id), env.DB.prepare('UPDATE users SET av = 0 WHERE id = ?').bind(u.id)]);
  return json({av: 0});
}, {auth: true});
on('GET', '/api/avatar/([a-z0-9_]{3,24})', async (req, env, u, m) => {
  const r = await env.DB.prepare('SELECT a.img, a.updated FROM users x JOIN avatars a ON a.uid = x.id WHERE x.username = ?').bind(m[1]).first();
  if (!r) return new Response('', {status: 404, headers: {'cache-control': 'no-store'}});
  const versioned = new URL(req.url).searchParams.get('v') === String(r.updated);
  return new Response(unb64(r.img), {headers: {'content-type': 'image/jpeg', 'x-content-type-options': 'nosniff',
    'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=300'}});
});
// block or unblock someone: blocking ends follows both ways and removes their reactions to your entries
on('POST', '/api/block', async (req, env, u) => {
  const b = await body(req, 500), name = String(b.username || '').toLowerCase();
  const x = USERNAME.test(name) && await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(name).first();
  if (!x || x.id === u.id) return fail('none', 404);
  if (b.on === false) { await env.DB.prepare('DELETE FROM blocks WHERE a = ? AND b = ?').bind(u.id, x.id).run(); return json({ok: true}); }
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO blocks (a, b, at) VALUES (?, ?, ?)').bind(u.id, x.id, Date.now()),
    env.DB.prepare('DELETE FROM follows WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)').bind(u.id, x.id, x.id, u.id),
    env.DB.prepare('DELETE FROM reacts WHERE owner = ? AND uid = ?').bind(u.id, x.id),
  ]);
  return json({ok: true});
}, {auth: true});
on('GET', '/api/blocks', async (req, env, u) => {
  const rows = (await env.DB.prepare('SELECT x.username, x.name, x.av, k.at FROM blocks k JOIN users x ON x.id = k.b WHERE k.a = ? ORDER BY k.at DESC').bind(u.id).all()).results || [];
  return json({blocks: rows.map(r => ({username: r.username, name: r.name || '', av: r.av || 0, at: r.at}))});
}, {auth: true});
// stop someone following you (without blocking them)
on('POST', '/api/follower', async (req, env, u) => {
  const b = await body(req, 500), name = String(b.username || '').toLowerCase();
  const x = USERNAME.test(name) && await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(name).first();
  if (!x) return fail('none', 404);
  await env.DB.prepare('DELETE FROM follows WHERE a = ? AND b = ?').bind(x.id, u.id).run();
  return json({ok: true});
}, {auth: true});
on('GET', '/api/people', async (req, env, u) => {
  const rows = (await env.DB.prepare(`SELECT x.username, x.name, x.av, p.updated,
      EXISTS (SELECT 1 FROM follows WHERE a = ? AND b = x.id) AS following, EXISTS (SELECT 1 FROM follows WHERE a = x.id AND b = ?) AS follower
      FROM users x JOIN profiles p ON p.uid = x.id WHERE p.public = 1 AND x.id != ? AND x.banned = 0
        AND NOT EXISTS (SELECT 1 FROM blocks WHERE (a = ? AND b = x.id) OR (a = x.id AND b = ?)) ORDER BY p.updated DESC LIMIT 300`).bind(u.id, u.id, u.id, u.id, u.id).all()).results || [];
  return json({people: rows.map(r => ({username: r.username, name: r.name, av: r.av || 0, updated: r.updated, following: !!r.following, follower: !!r.follower}))});
}, {auth: true});
// one film among the members: what the people you follow made of it (every entry, not only recent ones), who has it
// on their watchlist, and how everyone on the site rated it (counted, not named). ?k= one or more of the film's keys.
on('GET', '/api/film', async (req, env, u) => {
  const keys = [...new Set(new URL(req.url).searchParams.getAll('k'))].filter(k => /^(m\d{1,9}|t\d{1,9}|n[^\t\n]{1,120}\|\d{0,4})$/u.test(k)).slice(0, 3);
  if (!keys.length) return fail('bad', 400);
  const rows = (await env.DB.prepare(`SELECT x.id, x.username, x.name, x.av, p.films, p.payload IS NOT NULL AS hasp, EXISTS (SELECT 1 FROM follows WHERE a = ? AND b = x.id) AS fol
      FROM users x JOIN profiles p ON p.uid = x.id WHERE p.public = 1 AND x.id != ? AND x.banned = 0
        AND NOT EXISTS (SELECT 1 FROM blocks WHERE (a = ? AND b = x.id) OR (a = x.id AND b = ?)) LIMIT 2000`).bind(u.id, u.id, u.id, u.id).all()).results || [];
  const friends = [], hist = Array(11).fill(0); let n = 0, likes = 0, want = 0;
  for (const r of rows) {
    let films = r.films;
    if (films == null && r.hasp) films = (await indexes(env, r.id)).films;  // published before the index existed
    const seen = new Set(), es = [];
    let wl = false;
    for (const l of filmLines(films || '', keys)) {
      if (l[5] === 'W') { wl = true; continue; }
      const id = l[3] || 'seen', sig = id + '|' + l[0] + '|' + l[2];
      if (seen.has(sig)) continue; seen.add(sig);
      es.push({r: +l[0] || 0, h: l[1] === '1', w: l[2] || '', id: l[3] || '', rw: l[4] === '1', sp: l[6] === '1', rx: l[7] || ''});
    }
    // an entry and an undated "seen" for the same film are the same viewing
    const real = es.filter(e => e.id); const list = real.length ? real : es.slice(0, 1);
    if (list.length) {
      const best = list.find(e => e.r) || list[0];
      n++; if (best.r) hist[best.r]++; if (list.some(e => e.h)) likes++;
    }
    if (wl && !list.length) want++;
    if (r.fol && (list.length || wl)) friends.push({u: r.username, n: r.name || '', a: +r.av || 0, wl: wl && !list.length, e: list.sort((a, b) => String(b.w).localeCompare(String(a.w))).slice(0, 6)});
  }
  friends.sort((a, b) => (b.e.length > 0) - (a.e.length > 0) || String((b.e[0] || {}).w || '').localeCompare(String((a.e[0] || {}).w || '')));
  return json({friends, all: {n, likes, want, hist}}, 200, {'cache-control': 'private, no-store'});
}, {auth: true});
// ---- Popular: the films the most members watched lately (this week, this month, this year, ever) ----
// From the film indexes of public profiles (a private diary isn't in them, so it never counts): each member counts once
// a film, however often they watched it; its likes are the members who liked it; its average is of each member's latest
// rating. Everyone on the site (counted, never named) or the people you follow (named). Worked out at most every few
// minutes and kept in the cache table.
const SPANS = [['week', 7], ['month', 30], ['year', 365], ['all', 0]];
function popularOf(rows) {
  const today = new Date().toISOString().slice(0, 10), since = {};
  SPANS.forEach(([s, d]) => { since[s] = d ? new Date(Date.parse(today) - (d - 1) * DAY).toISOString().slice(0, 10) : ''; });
  const alias = new Map(), ents = [];
  for (const r of rows) {
    let pk = '', prow = '';
    for (const line of String(r.films || '').split('\n')) {
      const tab = line.indexOf('\t'); if (tab < 1) continue;
      const k = line.slice(0, tab), row = line.slice(tab + 1);
      // an entry with a TMDB id is listed twice in a row, under its id and then its title: one entry, and the title
      // tells which film an entry without an id (someone else's) is
      if (k[0] === 'n' && row === prow && (pk[0] === 'm' || pk[0] === 't')) { alias.set(k, pk); pk = ''; continue; }
      pk = k; prow = row;
      const f = row.split('\t');
      if (f[5] === 'W') continue;
      ents.push([r, k, /^\d{4}-\d\d-\d\d$/.test(f[2]) ? f[2] : '', +f[0] || 0, f[1] === '1']);
    }
  }
  const agg = {}; SPANS.forEach(([s]) => { agg[s] = new Map(); });
  for (const [r, raw, w, rt, h] of ents) {
    const k = raw[0] === 'n' ? alias.get(raw) || raw : raw;
    for (const [s] of SPANS) {
      if (s !== 'all' && (!w || w < since[s])) continue;
      let fm = agg[s].get(k); if (!fm) agg[s].set(k, fm = new Map());
      let o = fm.get(r); if (!o) fm.set(r, o = {w: '', r: 0, h: false, raw});
      if (h) o.h = true;
      if (w >= o.w) { o.w = w; if (rt) o.r = rt; } else if (!o.r) o.r = rt;
    }
  }
  const out = {};
  for (const [s] of SPANS) {
    const list = [], people = new Set();
    for (const [k, fm] of agg[s]) {
      let n = 0, l = 0, rs = 0, rn = 0, w = '';
      for (const [r, o] of fm) { n++; people.add(r.id); if (o.h) l++; if (o.r) { rs += o.r; rn++; } if (o.w > w) w = o.w; }
      list.push({k, n, l, r: rn ? Math.round(rs / rn * 10) / 10 : 0, w, by: [...fm.entries()].sort((a, b) => (b[1].w > a[1].w ? 1 : b[1].w < a[1].w ? -1 : 0))});
    }
    list.sort((a, b) => b.n - a.n || b.l - a.l || b.r - a.r || (b.w > a.w ? 1 : b.w < a.w ? -1 : 0));
    out[s] = {total: list.length, people: people.size, films: list.slice(0, 60)};
  }
  return out;
}
async function popular(env, u, who) {
  const cols = 'x.id, x.username, x.name, x.av, p.films, p.payload IS NOT NULL AS hasp';
  const rows = (await (who === 'friends'
    ? env.DB.prepare(`SELECT ${cols} FROM follows f JOIN users x ON x.id = f.b JOIN profiles p ON p.uid = f.b
        WHERE f.a = ? AND p.public = 1 AND x.banned = 0 AND NOT EXISTS (SELECT 1 FROM blocks WHERE (a = ? AND b = x.id) OR (a = x.id AND b = ?)) LIMIT 2000`).bind(u.id, u.id, u.id)
    : env.DB.prepare(`SELECT ${cols} FROM users x JOIN profiles p ON p.uid = x.id WHERE p.public = 1 AND x.banned = 0 LIMIT 5000`)).all()).results || [];
  let builds = 0;
  for (const r of rows) if (r.films == null && r.hasp && builds++ < 3) r.films = (await indexes(env, r.id)).films;
  const P = popularOf(rows);
  // each film's title, year and poster, from the profile of someone who watched it
  const films = new Map();
  SPANS.forEach(([s]) => P[s].films.forEach(f => { if (!films.has(f.k)) films.set(f.k, f.by.slice(0, 3).map(([r, o]) => [r.id, o.raw])); }));
  const uids = [...new Set([...films.values()].flatMap(c => c.map(x => x[0])))], fm = new Map();
  for (let i = 0; i < uids.length; i += 90) {
    const part = uids.slice(i, i + 90);
    const rs = (await env.DB.prepare(`SELECT uid, fmeta, payload IS NOT NULL AS hasp FROM profiles WHERE uid IN (${part.map(() => '?').join(',')})`).bind(...part).all()).results || [];
    for (const r of rs) fm.set(r.uid, r.fmeta == null && r.hasp && builds++ < 3 ? (await indexes(env, r.uid)).fmeta : r.fmeta || '');
  }
  const meta = new Map();
  for (const [k, cands] of films) for (const [uid, raw] of cands) { const m = metaLine(fm.get(uid) || '', k) || metaLine(fm.get(uid) || '', raw); if (m) { meta.set(k, m); break; } }
  const R = {};
  SPANS.forEach(([s]) => {
    R[s] = {total: P[s].total, people: P[s].people, films: P[s].films.filter(f => meta.has(f.k)).map(f => {
      const m = meta.get(f.k), o = {k: f.k, tm: f.k[0] === 'm' ? +f.k.slice(1) : f.k[0] === 't' ? -f.k.slice(1) : 0, t: m.t, y: m.y, p: m.p, n: f.n, l: f.l, r: f.r, w: f.w};
      if (who === 'friends') o.who = f.by.slice(0, 4).map(([r]) => ({u: r.username, n: r.name || '', a: +r.av || 0}));
      return o;
    })};
  });
  return R;
}
on('GET', '/api/popular', async (req, env, u) => {
  const q = new URL(req.url).searchParams, who = q.get('who') === 'friends' ? 'friends' : 'everyone';
  const ck = who === 'friends' ? 'pop:f:' + u.id : 'pop:e';
  const ttl = env.POP_TTL !== undefined && env.POP_TTL !== '' ? +env.POP_TTL : (who === 'friends' ? 3 : 10) * 60e3;
  let R = null;
  const c = await env.DB.prepare('SELECT v, at FROM cache WHERE k = ?').bind(ck).first();
  if (c && Date.now() - c.at < ttl) { try { R = JSON.parse(c.v); } catch (e) { R = null; } }
  if (!R) {
    R = await popular(env, u, who);
    await env.DB.prepare('INSERT INTO cache (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at').bind(ck, JSON.stringify(R), Date.now()).run();
  }
  const names = SPANS.map(x => x[0]), min = Math.max(1, Math.min(30, +q.get('min') || 1));
  let span = q.get('span');
  // auto: the shortest stretch of time with enough films in it
  if (span === 'auto') span = names.find(s => R[s].films.length >= min) || 'all';
  else if (!names.includes(span)) span = 'week';
  return json({who, span, sizes: Object.fromEntries(names.map(s => [s, R[s].total])), people: R[span].people, films: R[span].films}, 200, {'cache-control': 'private, no-store'});
}, {auth: true});
// ---- the owner's page: how the site is doing, and every account on it, public or private. Counts only: nothing
// anyone wrote, and nothing from a private diary but how many entries it has ----
on('GET', '/api/admin', async (req, env, u) => {
  if (!isOwner(env, u)) return fail('none', 404);
  const all = q => env.DB.prepare(q).all().then(r => r.results || []);
  const [users, sess, profs, kv, cfg, fol, fby, rx, ls] = await Promise.all([
    all('SELECT id, username, name, av, created, banned, invited_by FROM users ORDER BY created'),
    all('SELECT uid, MAX(seen) AS seen, COUNT(*) AS n FROM sessions GROUP BY uid'),
    all('SELECT uid, public, updated FROM profiles'),
    // a diary entry: a date under v:<entry> or a film ticked in a plan (a key with no prefix); seen without a date: wx:
    all(`SELECT uid, SUM(CASE WHEN (k LIKE 'v:%' OR instr(k, ':') = 0) AND v LIKE '"____-__-__"' THEN 1 ELSE 0 END) AS entries,
      SUM(CASE WHEN k LIKE 'rv:%' THEN 1 ELSE 0 END) AS reviews, SUM(CASE WHEN k LIKE 'wx:%' THEN 1 ELSE 0 END) AS seen,
      SUM(CASE WHEN k LIKE 'wl:%' THEN 1 ELSE 0 END) AS wl, MAX(ms) AS last FROM kv WHERE v IS NOT NULL AND v != 'null' GROUP BY uid`),
    all(`SELECT uid, k, v FROM kv WHERE k IN ('cfg:plan', 'cfg:pubdiary', 'cfg:pubwl', 'cfg:lb') AND v IS NOT NULL`),
    all('SELECT a AS uid, COUNT(*) AS n FROM follows GROUP BY a'),
    all('SELECT b AS uid, COUNT(*) AS n FROM follows GROUP BY b'),
    all('SELECT kind, COUNT(*) AS n FROM reacts GROUP BY kind'),
    all('SELECT uid, COUNT(*) AS n, SUM(pub) AS pub FROM lists GROUP BY uid'),
  ]);
  const by = rows => new Map(rows.map(r => [r.uid, r]));
  const S = by(sess), P = by(profs), K = by(kv), F1 = by(fol), F2 = by(fby), L = by(ls), C = new Map();
  cfg.forEach(r => { let v = null; try { v = JSON.parse(r.v); } catch (e) {} if (!C.has(r.uid)) C.set(r.uid, {}); C.get(r.uid)[r.k.slice(4)] = v; });
  const now = Date.now(), within = (t, d) => t && now - t < d * DAY, nameOf = new Map(users.map(x => [x.id, x.username]));
  const people = users.map(x => {
    const s = S.get(x.id) || {}, p = P.get(x.id), k = K.get(x.id) || {}, c = C.get(x.id) || {}, l = L.get(x.id) || {};
    return {username: x.username, name: x.name || '', av: +x.av || 0, joined: x.created, seen: Math.max(+s.seen || 0, +k.last || 0), devices: +s.n || 0,
      public: !!(p && p.public), diary: !!(p && p.public) && c.pubdiary !== '0', plan: typeof c.plan === 'string' ? c.plan : '', lb: !!c.lb,
      entries: +k.entries || 0, reviews: +k.reviews || 0, seenOnly: +k.seen || 0, wl: +k.wl || 0,
      following: +(F1.get(x.id) || {}).n || 0, followers: +(F2.get(x.id) || {}).n || 0, lists: +l.n || 0, publicLists: +l.pub || 0,
      banned: +x.banned || 0, invitedBy: nameOf.get(x.invited_by) || '', owner: owners(env).includes(x.username)};
  });
  const [SET, inv, cm] = await Promise.all([siteSettings(env),
    all(`SELECT i.code, i.created, i.expires, i.uses, i.max, x.username FROM invites i JOIN users x ON x.id = i.uid WHERE i.revoked = 0 AND i.expires > ${now} AND i.uses < i.max ORDER BY i.created DESC LIMIT 200`),
    // the latest comments, for taking down one that breaks the ground rules (comments are seen by anyone who can see the entry)
    all(`SELECT r.id, r.text, r.ft, r.at, x.username AS by, o.username AS ownr FROM reacts r JOIN users x ON x.id = r.uid JOIN users o ON o.id = r.owner WHERE r.kind = 'c' ORDER BY r.at DESC LIMIT 40`)]);
  const sum = f => people.reduce((a, x) => a + f(x), 0), R = {}; rx.forEach(r => { R[r.kind] = r.n; });
  const months = {}; users.forEach(x => { const m = new Date(x.created).toISOString().slice(0, 7); months[m] = (months[m] || 0) + 1; });
  return json({at: now, owner: u.username, people, totals: {
    members: people.length, newWeek: people.filter(x => within(x.joined, 7)).length, newMonth: people.filter(x => within(x.joined, 30)).length,
    activeDay: people.filter(x => within(x.seen, 1)).length, activeWeek: people.filter(x => within(x.seen, 7)).length, activeMonth: people.filter(x => within(x.seen, 30)).length,
    publicProfiles: people.filter(x => x.public).length, publicDiaries: people.filter(x => x.diary).length, letterboxd: people.filter(x => x.lb).length,
    entries: sum(x => x.entries), reviews: sum(x => x.reviews), seenOnly: sum(x => x.seenOnly), watchlists: sum(x => x.wl),
    follows: sum(x => x.following), lists: sum(x => x.lists), publicLists: sum(x => x.publicLists),
    hearts: R.h || 0, comments: R.c || 0, seenToo: R.s || 0, wants: R.w || 0}, months,
    settings: SET, invites: inv.map(i => ({code: i.code, by: i.username, created: i.created, expires: i.expires})),
    comments: cm.map(c => ({id: c.id, text: c.text, film: c.ft || '', at: c.at, by: c.by, on: c.ownr}))}, 200, {'cache-control': 'private, no-store'});
}, {auth: true});
// the owner's controls. Nothing here can touch another owner's account
async function target(env, u, name) {
  if (!isOwner(env, u)) return null;
  const x = USERNAME.test(String(name || '')) && await env.DB.prepare('SELECT id, username FROM users WHERE username = ?').bind(String(name)).first();
  return x && !owners(env).includes(x.username) ? x : null;
}
// suspend an account (signed out everywhere, gone from everything public, can't sign in) or restore it
on('POST', '/api/admin/suspend', async (req, env, u) => {
  const b = await body(req, 500), x = await target(env, u, b.username);
  if (!x) return fail('none', 404);
  if (b.on === false) await env.DB.prepare('UPDATE users SET banned = 0 WHERE id = ?').bind(x.id).run();
  else await env.DB.batch([env.DB.prepare('UPDATE users SET banned = ? WHERE id = ?').bind(Date.now(), x.id), env.DB.prepare('DELETE FROM sessions WHERE uid = ?').bind(x.id),
    env.DB.prepare('UPDATE invites SET revoked = 1 WHERE uid = ?').bind(x.id)]);
  return json({ok: true});
}, {auth: true});
// sign an account out of every device (a password may have leaked)
on('POST', '/api/admin/signout', async (req, env, u) => {
  const b = await body(req, 500), x = await target(env, u, b.username);
  if (!x) return fail('none', 404);
  await env.DB.prepare('DELETE FROM sessions WHERE uid = ?').bind(x.id).run();
  return json({ok: true});
}, {auth: true});
// delete an account and everything in it; the username has to be typed again, so it can't happen by a slip
on('POST', '/api/admin/delete', async (req, env, u) => {
  const b = await body(req, 500), x = await target(env, u, b.username);
  if (!x || String(b.confirm || '') !== x.username) return fail('none', 404);
  await wipe(env, x.id);
  return json({ok: true});
}, {auth: true});
// take down a comment
on('POST', '/api/admin/uncomment', async (req, env, u) => {
  if (!isOwner(env, u)) return fail('none', 404);
  const b = await body(req, 200);
  await env.DB.prepare("DELETE FROM reacts WHERE id = ? AND kind = 'c'").bind(+b.id || 0).run();
  return json({ok: true});
}, {auth: true});
// who can join and how: {signup: open | invite | closed, code (or newCode: true for a fresh one), invites (each member's), contact}
on('POST', '/api/admin/settings', async (req, env, u) => {
  if (!isOwner(env, u)) return fail('none', 404);
  const b = await body(req, 2000), put = (k, v) => env.DB.prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, String(v));
  const st = [];
  if (b.signup !== undefined) { if (!['open', 'invite', 'closed'].includes(b.signup)) return fail('bad', 400); st.push(put('signup', b.signup)); }
  if (b.newCode) st.push(put('code', newCode(4) + '-' + newCode(4)));
  else if (b.code !== undefined) { const c = String(b.code).trim(); if (c && !/^[\w-]{4,40}$/.test(c)) return fail('bad', 400); st.push(put('code', c)); }
  if (b.invites !== undefined) st.push(put('invites', Math.max(0, Math.min(1000, Math.round(+b.invites) || 0))));
  if (b.contact !== undefined) { const c = String(b.contact).trim(); if (c && !/^https:\/\/[^\s"<>]{3,200}$/.test(c)) return fail('bad', 400); st.push(put('contact', c)); }
  if (st.length) await env.DB.batch(st);
  return json({settings: await siteSettings(env)});
}, {auth: true});
// news: what's new on the site, written by its owner; every member reads it on Home
// the first post, written once when there's no news yet, in the owner's name (theirs to edit or delete)
const FIRST_POST = {title: 'Bring your friends', body: `TVC15 has always been invitation-only. Now every member can do the inviting.

Open the menu under your picture and choose Invite friends. Make a link and send it however you like: it lets one person join, it works for two weeks, and it opens the sign-up page with your name on it. Changed your mind? Take it back any time before it’s used.

Also new this month:

- Lists, ranked or not, public or private. A public list opens for anyone with its link, account or not.
- Popular: what the people you follow, or everyone here, watched most this week, this month, this year or ever.
- Themes in Discover: thirty-four ways in, from Queer Cinema and folk horror to road movies, trains and films about films.
- World Cinema, a new collection, and close to 15,000 films in the catalog.
- A name opens a profile, a poster opens the film, a date or a rating opens the diary entry. And Back goes back.

Happy watching.`};
async function seedNews(env) {
  const done = await env.DB.prepare("SELECT 1 FROM settings WHERE k = 'news-seeded'").first();
  if (done) return;
  await env.DB.prepare("INSERT OR IGNORE INTO settings (k, v) VALUES ('news-seeded', '1')").run();
  const has = await env.DB.prepare('SELECT 1 FROM news LIMIT 1').first();
  const o = await env.DB.prepare(`SELECT id FROM users WHERE username IN (${owners(env).map(() => '?').join(',')}) ORDER BY id LIMIT 1`).bind(...owners(env)).first();
  if (!has && o) await env.DB.prepare('INSERT INTO news (uid, title, body, at) VALUES (?, ?, ?, ?)').bind(o.id, FIRST_POST.title, FIRST_POST.body, Date.now()).run();
}
on('GET', '/api/news', async (req, env, u) => {
  await seedNews(env);
  const rows = (await env.DB.prepare('SELECT n.id, n.title, n.body, n.at, x.username, x.name, x.av FROM news n JOIN users x ON x.id = n.uid ORDER BY n.at DESC LIMIT 50').all()).results || [];
  return json({news: rows.map(r => ({id: r.id, title: r.title, body: r.body, at: r.at, by: {username: r.username, name: r.name || '', av: +r.av || 0}}))}, 200, {'cache-control': 'private, no-store'});
}, {auth: true});
on('POST', '/api/admin/news', async (req, env, u) => {
  if (!isOwner(env, u)) return fail('none', 404);
  const b = await body(req, 20000), title = clean1(b.title, 140), text = cleanNote(b.body).slice(0, 8000);
  if (!title || !text) return fail('empty', 400);
  if (b.id) await env.DB.prepare('UPDATE news SET title = ?, body = ? WHERE id = ?').bind(title, text, +b.id || 0).run();
  else await env.DB.prepare('INSERT INTO news (uid, title, body, at) VALUES (?, ?, ?, ?)').bind(u.id, title, text, Date.now()).run();
  return json({ok: true});
}, {auth: true});
on('DELETE', '/api/admin/news/(\\d{1,12})', async (req, env, u, m) => {
  if (!isOwner(env, u)) return fail('none', 404);
  await env.DB.prepare('DELETE FROM news WHERE id = ?').bind(+m[1]).run();
  return json({ok: true});
}, {auth: true});
on('POST', '/api/admin/revoke', async (req, env, u) => {
  if (!isOwner(env, u)) return fail('none', 404);
  const b = await body(req, 200);
  await env.DB.prepare('UPDATE invites SET revoked = 1 WHERE code = ?').bind(String(b.code || '')).run();
  return json({ok: true});
}, {auth: true});

// ---- invite links: a member brings a friend. Each link lets one person join, for two weeks; each member has as many
// as the owner allows (the owner, as many as they like) ----
const INVITE_DAYS = 14;
async function myInvites(env, u) {
  const S = await siteSettings(env), own = isOwner(env, u);
  const rows = (await env.DB.prepare(`SELECT i.code, i.created, i.expires, i.uses, i.max, i.revoked, x.username AS used FROM invites i LEFT JOIN users x ON x.id = i.used_by
    WHERE i.uid = ? ORDER BY i.created DESC LIMIT 100`).bind(u.id).all()).results || [];
  const counted = rows.filter(r => !r.revoked && (r.uses > 0 || r.expires > Date.now())).length;
  return {open: S.signup !== 'closed', allowed: own ? -1 : S.invites, left: own ? -1 : Math.max(0, S.invites - counted), contact: S.contact,
    invites: rows.map(r => ({code: r.code, created: r.created, expires: r.expires, used: r.used || '', state: r.revoked ? 'revoked' : r.uses >= r.max ? 'used' : r.expires <= Date.now() ? 'expired' : 'open'}))};
}
on('GET', '/api/invites', async (req, env, u) => json(await myInvites(env, u), 200, {'cache-control': 'private, no-store'}), {auth: true});
on('POST', '/api/invites', async (req, env, u) => {
  const I = await myInvites(env, u);
  if (!I.open) return fail('closed', 403);
  if (I.left === 0) return fail('none-left', 403);
  if (await limited(env.DB, 'invite-new:' + u.id, 30, DAY)) return fail('slow', 429);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO invites (code, uid, created, expires) VALUES (?, ?, ?, ?)').bind(newCode(12), u.id, now, now + INVITE_DAYS * DAY).run();
  return json(await myInvites(env, u));
}, {auth: true});
on('DELETE', '/api/invites/([a-z0-9]{8,24})', async (req, env, u, m) => {
  await env.DB.prepare('UPDATE invites SET revoked = 1 WHERE code = ? AND uid = ?').bind(m[1], u.id).run();
  return json(await myInvites(env, u));
}, {auth: true});
// the latest entries of everyone you follow, assembled without unpacking anyone's whole profile,
// with the reactions to them: [id, owner, eid, kind, text, at, reactor username, reactor name, film title]
const REACT_DAYS = 180;
const reactRows = rows => rows.map(r => [r.id, r.ou, r.eid, r.kind, r.text, r.at, r.xu, r.xn || '', r.ft || '', r.xa || 0]);
on('GET', '/api/feed', async (req, env, u) => {
  const [rows, re] = await Promise.all([
    env.DB.prepare(`SELECT x.username, x.name, x.av, p.recent FROM follows f JOIN users x ON x.id = f.b JOIN profiles p ON p.uid = f.b
      WHERE f.a = ? AND p.public = 1 AND x.banned = 0 ORDER BY p.updated DESC LIMIT 100`).bind(u.id).all(),
    env.DB.prepare(`SELECT r.id, o.username AS ou, r.eid, r.kind, r.text, r.ft, r.at, x.username AS xu, x.name AS xn, x.av AS xa FROM reacts r
      JOIN users o ON o.id = r.owner JOIN users x ON x.id = r.uid
      WHERE r.owner IN (SELECT b FROM follows WHERE a = ?) AND r.at > ? AND x.banned = 0 AND NOT EXISTS (SELECT 1 FROM blocks WHERE (a = ? AND b = r.uid) OR (a = r.uid AND b = ?))
      ORDER BY r.at LIMIT 3000`).bind(u.id, Date.now() - REACT_DAYS * DAY, u.id, u.id).all(),
  ]);
  return raw('{"me":' + JSON.stringify(u.username) + ',"re":' + JSON.stringify(reactRows(re.results || [])) + ',"feed":[' + (rows.results || []).map(r => '{"u":' + JSON.stringify(r.username) + ',"n":' + JSON.stringify(r.name || '') + ',"a":' + (+r.av || 0) + ',"recent":' + (r.recent || '[]') + '}').join(',') + ']}');
}, {auth: true});
// your notifications: reactions to your own entries, new followers, and replies after your comments on others' entries
on('GET', '/api/inbox', async (req, env, u) => {
  const cut = Date.now() - REACT_DAYS * DAY;
  const [re, fol, thr] = await Promise.all([
    env.DB.prepare(`SELECT r.id, ? AS ou, r.eid, r.kind, r.text, r.ft, r.at, x.username AS xu, x.name AS xn, x.av AS xa FROM reacts r JOIN users x ON x.id = r.uid
      WHERE r.owner = ? AND r.at > ? AND x.banned = 0 AND NOT EXISTS (SELECT 1 FROM blocks WHERE (a = ? AND b = r.uid) OR (a = r.uid AND b = ?)) ORDER BY r.at DESC LIMIT 500`).bind(u.username, u.id, cut, u.id, u.id).all(),
    env.DB.prepare(`SELECT x.username, x.name, x.av, f.at, EXISTS (SELECT 1 FROM follows WHERE a = ? AND b = x.id) AS back FROM follows f JOIN users x ON x.id = f.a
      WHERE f.b = ? AND f.at > ? AND x.banned = 0 ORDER BY f.at DESC LIMIT 100`).bind(u.id, u.id, cut).all(),
    env.DB.prepare(`SELECT r.id, o.username AS ou, r.eid, r.kind, r.text, r.ft, r.at, x.username AS xu, x.name AS xn, x.av AS xa FROM reacts r
      JOIN users o ON o.id = r.owner JOIN users x ON x.id = r.uid
      WHERE r.kind = 'c' AND r.uid != ? AND r.owner != ? AND r.at > ? AND x.banned = 0 AND NOT EXISTS (SELECT 1 FROM blocks WHERE (a = ? AND b = r.uid) OR (a = r.uid AND b = ?))
        AND EXISTS (SELECT 1 FROM reacts m WHERE m.owner = r.owner AND m.eid = r.eid AND m.uid = ? AND m.kind = 'c' AND m.at < r.at)
      ORDER BY r.at DESC LIMIT 200`).bind(u.id, u.id, cut, u.id, u.id, u.id).all(),
  ]);
  return json({re: reactRows(re.results || []), thr: reactRows(thr.results || []), fol: (fol.results || []).map(f => [f.username, f.name || '', f.at, !!f.back, f.av || 0])});
}, {auth: true});
// react to an entry, or take it back; comments can be deleted by whoever wrote them and by the entry's owner
const EID = /^[a-z0-9-]{1,120}$/i;
on('POST', '/api/react', async (req, env, u) => {
  const b = await body(req, 4000);
  if (b.del !== undefined) {
    const r = await env.DB.prepare('SELECT uid, owner FROM reacts WHERE id = ?').bind(+b.del || 0).first();
    if (!r || (r.uid !== u.id && r.owner !== u.id)) return fail('none', 404);
    await env.DB.prepare('DELETE FROM reacts WHERE id = ?').bind(+b.del).run();
    return json({ok: true});
  }
  const owner = String(b.owner || '').toLowerCase(), eid = String(b.eid || ''), kind = String(b.kind || '');
  const ft = String(b.ft || '').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 200);
  if (!USERNAME.test(owner) || !EID.test(eid) || !/^[hswc]$/.test(kind)) return fail('bad', 400);
  const o = await env.DB.prepare('SELECT x.id FROM users x JOIN profiles p ON p.uid = x.id WHERE x.username = ? AND p.public = 1 AND x.banned = 0').bind(owner).first();
  if (!o || await blocked(env, u.id, o.id)) return fail('none', 404);
  if (kind === 'c') {
    const text = String(b.text || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 500);
    if (!text) return fail('empty', 400);
    if (await limited(env.DB, 'c:' + u.id, 60, 36e5)) return fail('slow', 429);
    const r = await env.DB.prepare('INSERT INTO reacts (owner, eid, uid, kind, text, ft, at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, at').bind(o.id, eid, u.id, 'c', text, ft, Date.now()).first();
    return json({id: r.id, at: r.at});
  }
  if (o.id === u.id) return fail('self', 400);
  if (b.on === false) await env.DB.prepare('DELETE FROM reacts WHERE owner = ? AND eid = ? AND uid = ? AND kind = ?').bind(o.id, eid, u.id, kind).run();
  else {
    if (await limited(env.DB, 'r:' + u.id, 600, 36e5)) return fail('slow', 429);
    await env.DB.prepare('INSERT OR IGNORE INTO reacts (owner, eid, uid, kind, text, ft, at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(o.id, eid, u.id, kind, '', ft, Date.now()).run();
  }
  return json({ok: true});
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
const TMDB_OK = /^\/(search\/(movie|tv|person)|movie\/\d+(\/images)?|tv\/\d+|person\/\d+|configuration)$/;
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
