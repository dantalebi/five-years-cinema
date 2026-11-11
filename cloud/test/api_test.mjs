// Exercises the API over HTTP against test/server.mjs: accounts, sync between two devices, profiles, follows, feed, proxies, safety checks.
const B = process.argv[2] || 'http://localhost:8790';
const jar = {};  // one cookie per "device"
async function call(dev, method, p, body, extra = {}) {
  const h = Object.assign({}, body !== undefined ? {'content-type': 'application/json'} : {}, jar[dev] ? {cookie: jar[dev]} : {}, extra);
  const r = await fetch(B + p, {method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined});
  const sc = r.headers.get('set-cookie'); if (sc) { const m = sc.match(/fd_s=([^;]*)/); jar[dev] = m && m[1] ? 'fd_s=' + m[1] : ''; }
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = t; }
  return {s: r.status, j, h: r.headers};
}
const K = c => c.repeat(64);  // a stand-in for the browser-stretched password
let fails = 0; const ok = (cond, what, extra) => { console.log((cond ? 'ok   ' : 'FAIL ') + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 160) : '')); if (!cond) fails++; };

let r = await call('a', 'POST', '/api/signup', {username: 'Danial', key: K('a'), name: 'Danial Talebi'});
ok(r.s === 200 && r.j.me.username === 'danial' && /fd_s=/.test(jar.a), 'sign up (username lowercased, session cookie)', r.j);
ok(/HttpOnly/.test(r.h.get('set-cookie')) && /SameSite=Lax/.test(r.h.get('set-cookie')) && /Secure/.test(r.h.get('set-cookie')), 'cookie is HttpOnly, Secure, SameSite=Lax');
r = await call('x', 'POST', '/api/signup', {username: 'danial', key: K('b')}); ok(r.s === 409, 'same username refused');
r = await call('x', 'POST', '/api/signup', {username: 'api', key: K('b')}); ok(r.s === 400, 'reserved username refused');
r = await call('x', 'POST', '/api/signup', {username: 'ok_name', key: 'short'}); ok(r.s === 400, 'malformed key refused');
r = await call('a', 'GET', '/api/me'); ok(r.s === 200 && r.j.me.name === 'Danial Talebi', 'me');
r = await call('nobody', 'GET', '/api/me'); ok(r.s === 401, 'me without a session → 401');
// cross-site and form posts are refused
r = await call('a', 'POST', '/api/sync', {since: 0, changes: []}, {origin: 'https://evil.example'}); ok(r.s === 403, 'other origin refused');
r = await fetch(B + '/api/sync', {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded', cookie: jar.a}, body: 'since=0'}); ok(r.status === 403, 'form post refused');
// login on a second device
r = await call('a2', 'POST', '/api/login', {username: 'danial', key: K('b')}); ok(r.s === 401, 'wrong password');
r = await call('a2', 'POST', '/api/login', {username: 'DANIAL', key: K('a')}); ok(r.s === 200, 'log in on a second device');
// sync: device 1 writes, device 2 sees it; newer wins; deletes travel
r = await call('a', 'POST', '/api/sync', {since: 0, changes: [['log:1', 't:Heat (1995)', 1000], ['v:log:1', '2026-11-01', 1000], ['r:log:1', 10, 1000], ['cfg:name', 'Danial', 1000]]});
ok(r.s === 200 && r.j.changes.length === 4, 'push 4', r.j.seq);
const seqA = r.j.seq;
r = await call('a2', 'POST', '/api/sync', {since: 0, changes: [['r:log:1', 8, 500], ['l:log:1', 1, 2000]]});
const m2 = Object.fromEntries(r.j.changes.map(c => [c[0], c[1]]));
ok(m2['r:log:1'] === 10 && m2['l:log:1'] === 1 && m2['log:1'] === 't:Heat (1995)', 'second device: older rating loses, new like kept', m2);
r = await call('a', 'POST', '/api/sync', {since: seqA, changes: [['cfg:name', null, 3000]]});
ok(r.j.changes.some(c => c[0] === 'l:log:1') && r.j.changes.some(c => c[0] === 'cfg:name' && c[1] === null), 'first device gets the like and its own delete', r.j.changes);
// big pushes page through
const many = Array.from({length: 500}, (_, i) => ['mx:tm' + i, {g: [18]}, 5000]);
r = await call('a', 'POST', '/api/sync', {since: 0, changes: many}); ok(r.s === 200, 'push 500');
r = await call('a', 'POST', '/api/sync', {since: 0, changes: many.concat([['x', 1, 1]])}); ok(r.s === 413, 'over 500 refused');
let seq = 0, got = 0, rounds = 0; do { r = await call('a2', 'POST', '/api/sync', {since: seq, changes: []}); got += r.j.changes.length; seq = r.j.seq; rounds++; } while (r.j.more && rounds < 5);
ok(got >= 505, 'pull pages through everything', {got, rounds});
// another person, profiles and follows
r = await call('b', 'POST', '/api/signup', {username: 'sara_k', key: K('c'), name: 'Sara'}); ok(r.s === 200, 'second user');
const payload = {v: 2, lang: 'en', name: 'Danial Talebi', diary: [{id: 'log1', t: 'Heat', y: 1995, r: 10, h: 1, w: '2026-11-01', rv: 'long review…', p: 'https://image.tmdb.org/t/p/w185/x.jpg'}], now: {films: []}};
r = await call('a', 'PUT', '/api/profile', {payload, public: true}); ok(r.s === 200, 'publish profile');
r = await call('anon', 'GET', '/api/u/danial'); ok(r.s === 200 && r.j.data.diary[0].t === 'Heat' && r.j.updated > 0, 'anyone reads a public profile');
r = await call('anon', 'GET', '/api/u/sara_k'); ok(r.s === 404, 'no profile yet → 404');
r = await call('b', 'POST', '/api/follow', {username: 'danial'}); ok(r.s === 200, 'sara follows danial');
r = await call('b', 'POST', '/api/follow', {username: 'sara_k'}); ok(r.s === 404, 'can’t follow yourself');
r = await call('b', 'GET', '/api/u/danial/meta'); ok(r.j.follows === true && r.j.followers === 1 && r.j.self === false, 'meta: follows, counts', r.j);
r = await call('b', 'GET', '/api/feed'); ok(r.s === 200 && r.j.feed[0].u === 'danial' && r.j.feed[0].recent[0].t === 'Heat' && r.j.feed[0].recent[0].rv === 1, 'feed has the latest entry (review flagged, not its text)', r.j.feed[0]);
r = await call('b', 'GET', '/api/people'); ok(r.j.people.length === 1 && r.j.people[0].following === true, 'people', r.j.people);
r = await call('a', 'DELETE', '/api/profile', undefined); ok(r.s === 200, 'make profile private');
r = await call('anon', 'GET', '/api/u/danial'); ok(r.s === 404, 'private profile → 404');
r = await call('b', 'GET', '/api/feed'); ok(r.j.feed.length === 0, 'private profile leaves the feed');
r = await call('a', 'PUT', '/api/profile', {payload, public: true});
r = await call('b', 'POST', '/api/follow', {username: 'danial', on: false}); r = await call('b', 'GET', '/api/u/danial/meta'); ok(r.j.follows === false && r.j.followers === 0, 'unfollow');
// plans
r = await call('a', 'PUT', '/api/plan', {plan: {F: [['Heat', 1995]], W: [[0, 0, 1]]}}); ok(r.s === 200, 'save a private plan');
r = await call('a', 'GET', '/api/plan'); ok(r.j.plan.F[0][0] === 'Heat', 'read it back');
r = await call('b', 'GET', '/api/plan'); ok(r.s === 404, 'someone else has none');
// proxies
r = await call('anon', 'GET', '/api/lb/Sara_K'); ok(r.s === 200 && /Letterboxd - Sara K/.test(r.j), 'Letterboxd RSS for anyone');
r = await call('anon', 'GET', '/api/lb/nobody_here'); ok(r.s === 404, 'unknown Letterboxd user → 404');
r = await call('anon', 'GET', '/api/lb/bad%20name'); ok(r.s === 404, 'bad username never reaches Letterboxd');
r = await call('anon', 'GET', '/api/tmdb/search/movie?query=Heat'); ok(r.s === 401, 'TMDB only for members');
r = await call('b', 'GET', '/api/tmdb/search/movie?query=Heat&year=1995'); ok(r.s === 200 && r.j.results[0].title === 'Heat', 'TMDB search through the site key');
r = await call('b', 'GET', '/api/tmdb/account'); ok(r.s === 400, 'other TMDB paths refused');
// password change signs other devices out
r = await call('a', 'POST', '/api/password', {key: K('a'), next: K('d')}); ok(r.s === 200, 'change password');
r = await call('a2', 'GET', '/api/me'); ok(r.s === 401, 'other device signed out');
r = await call('a', 'GET', '/api/me'); ok(r.s === 200, 'this device stays in');
r = await call('a2', 'POST', '/api/login', {username: 'danial', key: K('d')}); ok(r.s === 200, 'new password works');
// too many wrong passwords
for (let i = 0; i < 10; i++) await call('z', 'POST', '/api/login', {username: 'sara_k', key: K('e')});
r = await call('z', 'POST', '/api/login', {username: 'sara_k', key: K('c')}); ok(r.s === 429, 'slowed down after 10 wrong tries');
// delete an account: everything goes
r = await call('b', 'POST', '/api/follow', {username: 'danial'});
r = await call('a', 'POST', '/api/delete', {key: K('x')}); ok(r.s === 401, 'delete needs the password');
r = await call('a', 'POST', '/api/delete', {key: K('d')}); ok(r.s === 200, 'delete account');
r = await call('anon', 'GET', '/api/u/danial'); ok(r.s === 404, 'profile gone');
r = await call('b', 'GET', '/api/feed'); ok(r.j.feed.length === 0, 'and out of the feed');
r = await call('a2', 'GET', '/api/me'); ok(r.s === 401, 'all sessions gone');
r = await call('a', 'POST', '/api/login', {username: 'danial', key: K('d')}); ok(r.s === 401, 'can’t log in');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
