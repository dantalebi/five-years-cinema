// The catalog build against a stand-in TMDB: matching, movement completion, classification, output shape.
// node test/catalog_test.mjs
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 900000, 7) + 1000;
// a few films the stand-in knows properly; everything else gets a made-up director
const KNOWN = {
  'breathless|1960': {d: 'Jean-Luc Godard', c: 'FR', g: [18, 80]},
  'the 400 blows|1959': {d: 'François Truffaut', c: 'FR', g: [18]},
  'meshes of the afternoon|1943': {d: 'Maya Deren', c: 'US', g: [], kw: ['experimental film']},
  'mirror|1975': {d: 'Andrei Tarkovsky', c: 'SU', g: [18]},
  'double indemnity|1944': {d: 'Billy Wilder', c: 'US', g: [80], kw: ['film noir']},
};
const titles = new Map(), extra = new Map(), people = new Map();
// a title that only appears inside another (Night → Night at the Museum), a film TMDB dates a year later with a
// look-alike in the right year (Shadows), and a TV series (Dekalog)
const SPECIAL = {
  999001: {t: 'Night at the Museum: Secret of the Tomb', y: 2014, d: 'Shawn Levy'},
  999002: {t: 'The Shadows are Crawling', y: 1958, d: 'Someone Else'},
  999003: {t: 'Shadows', y: 1959, d: 'John Cassavetes'},
};
const SEARCH = {'night|2014': [999001], 'night|': [999001], 'shadows|1958': [999002], 'shadows|': [999003, 999002], 'dekalog|1989': [], 'dekalog|': []};
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), q = u.searchParams.get('query') || '', y = u.searchParams.get('primary_release_year');
  const send = j => { res.writeHead(200, {'content-type': 'application/json'}); res.end(JSON.stringify(j)); };
  if (u.pathname === '/search/movie' && SEARCH[q.toLowerCase() + '|' + (y || '')]) {
    return send({results: SEARCH[q.toLowerCase() + '|' + (y || '')].map(id => ({id, title: SPECIAL[id].t, original_title: SPECIAL[id].t, release_date: SPECIAL[id].y + '-06-01', vote_count: 300}))});
  }
  if (u.pathname === '/search/tv') {
    return send({results: q.toLowerCase() === 'dekalog' ? [{id: 77, name: 'Dekalog', original_name: 'Dekalog', first_air_date: '1989-05-10', vote_count: 500}] : []});
  }
  if (u.pathname === '/tv/77') {
    return send({id: 77, name: 'Dekalog', original_name: 'Dekalog', first_air_date: '1989-05-10', episode_run_time: [55], number_of_episodes: 10, poster_path: '/dk.jpg', genres: [{id: 18}],
      origin_country: ['PL'], original_language: 'pl', created_by: [{name: 'Krzysztof Kieślowski'}], credits: {crew: []}, keywords: {results: []}, vote_count: 500, vote_average: 8.4});
  }
  if (u.pathname === '/search/movie') {
    const id = hash(q.toLowerCase() + '|' + (y || '')); titles.set(id, {t: q, y: +y || 2000});
    return send({results: y ? [{id, title: q, original_title: q, release_date: y + '-05-01', vote_count: hash(q) % 9000}] : []});
  }
  let m;
  if ((m = u.pathname.match(/^\/movie\/(\d+)$/))) {
    const id = +m[1], t = SPECIAL[id] || titles.get(id) || extra.get(id) || {t: 'Film ' + id, y: 1965}, k = KNOWN[t.t.toLowerCase() + '|' + t.y] || {};
    return send({id, title: t.t, release_date: t.y + '-05-01', runtime: 95, poster_path: '/p' + id + '.jpg', genres: (k.g || [18]).map(x => ({id: x})),
      production_countries: [{iso_3166_1: k.c || 'IT'}], original_language: 'en', vote_count: hash(t.t) % 9000, vote_average: 7.4,
      credits: {crew: [{job: 'Director', name: k.d || t.d || 'Some Director ' + (id % 50)}]}, keywords: {keywords: (k.kw || []).map(n => ({name: n}))}});
  }
  if (u.pathname === '/search/person') { people.set(hash('p' + q), q); return send({results: [{id: hash('p' + q), name: q, known_for_department: 'Directing', popularity: 5}]}); }
  if ((m = u.pathname.match(/^\/person\/(\d+)\/movie_credits$/))) {
    // every core director has two films in their movement's years that the seed doesn't know
    const pid = +m[1], crew = [1963, 1964].map((yy, i) => { const id = 500000 + pid % 1000 * 10 + i; extra.set(id, {t: 'Lesser-Known ' + pid + '-' + i, y: yy, d: people.get(pid)}); return {id, job: 'Director', release_date: yy + '-01-01', vote_count: 12}; });
    return send({crew});
  }
  res.writeHead(404); res.end('{}');
});
await new Promise(r => srv.listen(0, r));
const port = srv.address().port, tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-'));
const env = Object.assign({}, process.env, {TMDB_API: 'http://localhost:' + port, TMDB_TOKEN: 'test', LIMIT: '300', CATALOG_CACHE: path.join(tmp, 'cache.json'), CATALOG_OUT: tmp});
// a seed with the known films up front
const seedPath = new URL('../catalog/seed.json', import.meta.url).pathname, seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const pick = ['breathless', 'the-400-blows', 'meshes-of-the-afternoon', 'mirror', 'double-indemnity', 'night-2014', 'shadows-1958', 'dekalog'];
const front = pick.map(s => seed.films.find(f => f[0] === s)).filter(Boolean);
ok(front.length === 8, 'the test films are in the seed', front.map(f => f[0]));
fs.writeFileSync(path.join(tmp, 'seed.json'), JSON.stringify(Object.assign({}, seed, {films: front.concat(seed.films.filter(f => !pick.includes(f[0])))})));
env.CATALOG_SEED = path.join(tmp, 'seed.json');
// (the stand-in TMDB runs in this process, so the build runs alongside it, not blocking it)
const out = await new Promise((res, rej) => execFile('node', [new URL('../catalog/build.mjs', import.meta.url).pathname], {env, maxBuffer: 1e7}, (e, so, se) => e ? rej(new Error(se || e.message)) : res(so)));
console.log(out.split('\n').filter(l => /catalog:|French New Wave|Film Noir|\[/.test(l)).join('\n'));
const cat = JSON.parse(fs.readFileSync(path.join(tmp, 'catalog.json'), 'utf8'));
const F = cat.fields, row = slug => cat.films.find(r => r[1] === slug), gi = id => cat.groups.findIndex(g => g.id === id), li = id => cat.lenses.findIndex(l => l.id === id);
ok(cat.films.length > 300, 'seed films plus movement completions', cat.films.length);
ok(!row('night-2014'), 'a title found only inside another, with no director to confirm it, is left out');
const sh = row('shadows-1958');
ok(sh && sh[0] === 999003 && cat.dirs[sh[6][0]] === 'John Cassavetes', 'Shadows: the director picks the right film over a look-alike from the same year', sh && sh.slice(0, 4));
const dk = row('dekalog');
ok(dk && dk[0] === -77 && dk[5] === '/dk.jpg' && cat.dirs[dk[6][0]] === 'Krzysztof Kieślowski' && dk[4] === 550, 'Dekalog: a TV series, as a negative id, ten 55-minute episodes', dk && dk.slice(0, 7));
const b = row('breathless');
if (b) {
  ok(b[0] > 0 && b[5] && cat.dirs[b[6][0]] === 'Jean-Luc Godard', 'Breathless matched, with poster and director');
  ok(b[9].includes(gi('french-new-wave')), 'Breathless is French New Wave');
  ok(b[10] & (1 << li('canon')), 'Breathless is in the canon lens');
} else ok(false, 'Breathless in the first 300 of the seed');
const dbl = row('double-indemnity'); if (dbl) ok(dbl[9].includes(gi('film-noir')) && dbl[9].includes(gi('classical-hollywood')), 'Double Indemnity: film noir and classical Hollywood');
const msh = row('meshes-of-the-afternoon'); if (msh) ok(msh[9].includes(gi('american-avant-garde')) && (msh[10] & (1 << li('avant-garde'))), 'Meshes of the Afternoon: American avant-garde');
const mir = row('mirror'); if (mir) ok(mir[10] & (1 << li('contemplative')), 'Mirror: contemplative');
ok(cat.films.some(r => !r[1] && r[9].length), 'lesser-known films added from movement directors');
ok(F.length === cat.films[0].length, 'every row has every field');
ok(!JSON.stringify(cat).match(/alexeysmolin|unitedinflames|talebi/), 'no panel account names in the catalog');
srv.close();
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
