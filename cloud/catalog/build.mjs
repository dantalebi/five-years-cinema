// Builds the Discover catalog: the seed's films, matched on TMDB (poster, directors, countries, genres, keywords),
// plus the rest of each movement's films by its core directors, then sorted into movements, periods and lenses.
//   TMDB_TOKEN=… node catalog/build.mjs        (TMDB_API points it at a test server; LIMIT=n for a partial run)
// What TMDB said is kept in tmdb-cache.json, so a later run only asks about what's new. Output: dist/catalog.json,
// also copied to ../public/catalog/catalog.json for the site.
import fs from 'node:fs';
import path from 'node:path';
import {MOVEMENTS, PERIODS, CONTEMPLATIVE, AVANT_GARDE, AVANT_KEYS, LENSES} from './taxonomy.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const API = process.env.TMDB_API || 'https://api.themoviedb.org/3', TOKEN = process.env.TMDB_TOKEN || '';
const LIMIT = +process.env.LIMIT || Infinity, MISS_DAYS = 45, NOW = Date.now();
const seed = JSON.parse(fs.readFileSync(process.env.CATALOG_SEED || path.join(HERE, 'seed.json'), 'utf8'));
const CACHE_F = process.env.CATALOG_CACHE || path.join(HERE, 'tmdb-cache.json');
const cache = fs.existsSync(CACHE_F) ? JSON.parse(fs.readFileSync(CACHE_F, 'utf8')) : {};
for (const k of ['slug', 'movie', 'person', 'credits']) cache[k] = cache[k] || {};
const save = () => fs.writeFileSync(CACHE_F, JSON.stringify(cache));

const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const KEYS = new Set(AVANT_KEYS.concat(...MOVEMENTS.map(m => m.keys || []), ['short film', 'neo-noir']));
let calls = 0, fails = 0;
const FAILED = undefined;  // a request that never got an answer (null: TMDB answered that there's no such thing)
async function get(p, tries = 4) {
  if (!TOKEN && !process.env.TMDB_API) throw new Error('TMDB_TOKEN is not set');
  for (let a = 0; a < tries; a++) {
    calls++;
    try {
      const r = await fetch(API + p, {headers: {Authorization: 'Bearer ' + TOKEN, accept: 'application/json'}});
      if (r.status === 401) { console.error('TMDB turned the token down (401). Check the TMDB_TOKEN secret: it is the long “API Read Access Token”.'); process.exit(2); }
      if (r.status === 429) { await new Promise(res => setTimeout(res, (+(r.headers.get('retry-after') || 2)) * 1000)); continue; }
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { if (a === tries - 1) { fails++; return FAILED; } await new Promise(res => setTimeout(res, 800 * (a + 1))); }
  }
  fails++; return FAILED;
}
async function pool(items, n, fn) {
  let i = 0, done = 0;
  const tick = setInterval(() => console.log(`  ${done}/${items.length} · ${calls} calls`), 15000);
  await Promise.all(Array.from({length: n}, async () => { while (i < items.length) { const it = items[i++]; await fn(it); done++; if (done % 400 === 0) save(); } }));
  clearInterval(tick);
}

// a film's details, kept compact: [title, original title, year, runtime, poster, genres, countries, language, directors, keywords, votes, rating×10]
async function details(id) {
  if (cache.movie[id]) return cache.movie[id];
  const j = await get(`/movie/${id}?append_to_response=credits,keywords`);
  if (!j) return null;
  const y = +(String(j.release_date || '').slice(0, 4)) || 0;
  const dirs = ((j.credits && j.credits.crew) || []).filter(c => c.job === 'Director').map(c => c.name).slice(0, 4);
  const kw = ((j.keywords && j.keywords.keywords) || []).map(k => String(k.name).toLowerCase()).filter(k => KEYS.has(k));
  cache.movie[id] = [j.title || '', j.original_title && j.original_title !== j.title ? j.original_title : '', y, j.runtime || 0, j.poster_path || '',
    (j.genres || []).map(g => g.id), (j.production_countries || []).map(c => c.iso_3166_1).slice(0, 4), j.original_language || '', dirs, kw,
    j.vote_count || 0, Math.round((j.vote_average || 0) * 10)];
  return cache.movie[id];
}
// which TMDB film a Letterboxd entry is: same title (or original title), same or next-door year, the most-voted of those
async function match(t, y) {
  const tries = [`/search/movie?query=${encodeURIComponent(t)}${y ? '&primary_release_year=' + y : ''}`, `/search/movie?query=${encodeURIComponent(t)}`];
  const want = norm(t);
  let best = null;
  for (const q of tries) {
    const j = await get(q); if (j === FAILED) return -1;
    const rs = (j && j.results) || [];
    for (const r of rs.slice(0, 12)) {
      const ry = +(String(r.release_date || '').slice(0, 4)) || 0, dy = y && ry ? Math.abs(ry - y) : 3;
      const same = norm(r.title) === want || norm(r.original_title) === want;
      const near = !same && (norm(r.title).includes(want) || want.includes(norm(r.title))) && want.length > 3;
      if ((!same && !near) || dy > 1) continue;
      const sc = (same ? 10 : 4) + (dy === 0 ? 5 : 2) + Math.log10(1 + (r.vote_count || 0));
      if (!best || sc > best.sc) best = {id: r.id, sc};
    }
    if (best) break;
  }
  return best ? best.id : 0;
}

async function main() {
  if (!TOKEN && !process.env.TMDB_API) { console.error('TMDB_TOKEN is not set: add it under Settings → Secrets and variables → Actions.'); process.exit(2); }
  const films = seed.films.slice(0, LIMIT);
  console.log(`seed: ${films.length} films`);
  // 1. the seed's films on TMDB
  const todo = films.filter(f => { const c = cache.slug[f[0]]; return !c || (c[0] === 0 && NOW - c[1] > MISS_DAYS * 864e5); });
  console.log(`matching ${todo.length} films…`);
  await pool(todo, 6, async f => { const id = await match(f[1], f[2]); if (id < 0) return; cache.slug[f[0]] = [id, NOW]; if (id) await details(id); });
  save();
  const byId = new Map();
  films.forEach(f => { const id = (cache.slug[f[0]] || [0])[0]; if (id) byId.set(id, f); });
  // 2. the rest of each movement, and of the two taste lenses, from their directors' filmographies
  const names = new Set();
  MOVEMENTS.forEach(m => (m.dirs || []).forEach(d => names.add(d)));
  if (LIMIT === Infinity) { CONTEMPLATIVE.forEach(d => names.add(d)); AVANT_GARDE.forEach(d => names.add(d)); }
  const people = [...names].filter(n => cache.person[n] === undefined);
  console.log(`looking up ${people.length} directors…`);
  await pool(people, 6, async n => {
    const j = await get(`/search/person?query=${encodeURIComponent(n)}`);
    if (j === FAILED) return;
    const rs = ((j && j.results) || []).filter(p => norm(p.name) === norm(n) || (p.also_known_as || []).some(a => norm(a) === norm(n)));
    const pick = rs.sort((a, b) => (b.known_for_department === 'Directing') - (a.known_for_department === 'Directing') || (b.popularity || 0) - (a.popularity || 0))[0];
    cache.person[n] = pick ? pick.id : 0;
  });
  const pids = [...names].map(n => cache.person[n]).filter(id => id && !cache.credits[id]);
  await pool(pids, 6, async id => {
    const j = await get(`/person/${id}/movie_credits`);
    if (j === FAILED) return;
    cache.credits[id] = ((j && j.crew) || []).filter(c => c.job === 'Director').map(c => [c.id, +(String(c.release_date || '').slice(0, 4)) || 0, c.vote_count || 0]);
  });
  save();
  const wantExtra = new Map();  // TMDB id → why it's wanted
  const nn = n => norm(n);
  MOVEMENTS.forEach(m => (m.dirs || []).forEach(d => (cache.credits[cache.person[d]] || []).forEach(([id, y, vc]) => { if (y >= m.from && y <= m.to && vc >= 3 && !byId.has(id)) wantExtra.set(id, 'm'); })));
  if (LIMIT === Infinity) {
    CONTEMPLATIVE.forEach(d => (cache.credits[cache.person[d]] || []).forEach(([id, y, vc]) => { if (y && vc >= 15 && !byId.has(id)) wantExtra.set(id, 'c'); }));
    AVANT_GARDE.forEach(d => (cache.credits[cache.person[d]] || []).filter(c => c[1]).sort((a, b) => b[2] - a[2]).slice(0, 25).forEach(([id, y, vc]) => { if (vc >= 3 && !byId.has(id)) wantExtra.set(id, 'a'); }));
  }
  const extra = [...wantExtra.keys()].filter(id => !cache.movie[id]);
  console.log(`fetching ${extra.length} more films for movements and lenses…`);
  await pool(extra, 6, async id => { await details(id); });
  save();

  // 3. the catalog
  const dirIx = new Map(), coIx = new Map(), dirs = [], cos = [];
  const ix = (map, arr, v) => { if (!map.has(v)) { map.set(v, arr.length); arr.push(v); } return map.get(v); };
  const C = new Set(CONTEMPLATIVE.map(nn)), A = new Set(AVANT_GARDE.map(nn)), AK = new Set(AVANT_KEYS);
  const groups = MOVEMENTS.map(m => Object.assign({kind: 'movement', dset: new Set((m.dirs || []).map(nn))}, m)).concat(PERIODS.map(p => Object.assign({kind: 'period'}, p)));
  const rows = [], seen = new Set();
  const add = (id, sd) => {
    if (id && seen.has(id)) return; if (id) seen.add(id);
    const d = id ? cache.movie[id] : null;
    const [t, ot, y, rt, p, gs, cs, lang, ds, kw, vc] = d || [sd[1], '', sd[2], 0, '', [], [], '', [], [], 0];
    const year = y || (sd ? sd[2] : 0), canon = sd ? sd[5] : [0, 0, 0, 0, 0], q = sd ? sd[3] : -1;
    const dn = ds.map(nn), kws = new Set(kw);
    const movs = [];
    groups.forEach((g, gi) => {
      if (!year || year < g.from || year > g.to) return;
      if (g.countries && !cs.some(c => g.countries.includes(c))) return;
      if (g.genres && !gs.some(x => g.genres.includes(x))) return;
      if (g.kind === 'period') { movs.push(gi); return; }
      if (dn.some(x => g.dset.has(x)) || (g.keys || []).some(k => kws.has(k))) movs.push(gi);
    });
    const isCanon = canon[0] || canon[1] || (canon[2] && canon[2] <= 1000) || (canon[3] && canon[3] <= 250);
    let lens = 0;
    const set = k => { lens |= 1 << LENSES.findIndex(l => l.id === k); };
    if (vc >= 6000 || (vc >= 2500 && q >= 45)) set('essentials');
    if (isCanon) set('canon');
    if (dn.some(x => C.has(x))) set('contemplative');
    if (dn.some(x => A.has(x)) || kw.some(k => AK.has(k))) set('avant-garde');
    if (q >= 70 && vc < 1500 && !isCanon) set('gems');
    if (year >= 2000 && (canon[3] || q >= 75)) set('c21');
    if (gs.includes(99)) set('documentary');
    if (gs.includes(16)) set('animation');
    rows.push([id || 0, sd ? sd[0] : '', t || (sd && sd[1]) || '', year, rt, p, ds.map(n => ix(dirIx, dirs, n)), cs.map(c => ix(coIx, cos, c)), gs, movs, lens,
      q, sd ? sd[4] : -1, vc, canon, ot, lang]);
  };
  films.forEach(f => add((cache.slug[f[0]] || [0])[0], f));
  wantExtra.forEach((why, id) => { if (cache.movie[id] && cache.movie[id][2]) add(id, null); });
  const GEN = {28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror',
    10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'};
  const out = {v: 1, built: new Date().toISOString().slice(0, 10), fields: ['tmdb', 'slug', 'title', 'year', 'runtime', 'poster', 'dirs', 'countries', 'genres', 'groups', 'lenses', 'quality', 'reach', 'votes', 'canon', 'original', 'lang'],
    canon: seed.canon, dirs, countries: cos, genres: GEN,
    groups: groups.map(g => ({id: g.id, name: g.name, kind: g.kind, from: g.from, to: g.to, desc: g.desc})),
    lenses: LENSES, films: rows};
  const txt = JSON.stringify(out);
  const outs = process.env.CATALOG_OUT ? [process.env.CATALOG_OUT] : [path.join(HERE, 'dist'), path.join(HERE, '..', 'public', 'catalog')];
  outs.forEach(dir => { fs.mkdirSync(dir, {recursive: true}); fs.writeFileSync(path.join(dir, 'catalog.json'), txt); });
  const matched = rows.filter(r => r[0]).length;
  console.log(`catalog: ${rows.length} films (${matched} on TMDB, ${rows.length - films.length} added from movements and lenses) · ${dirs.length} directors · ${(txt.length / 1e6).toFixed(2)} MB · ${calls} calls, ${fails} failed`);
  groups.forEach((g, gi) => console.log(`  ${g.name}: ${rows.filter(r => r[9].includes(gi)).length}`));
  LENSES.forEach((l, li) => console.log(`  [${l.name}]: ${rows.filter(r => r[10] & (1 << li)).length}`));
}
main().catch(e => { console.error(e); save(); process.exit(1); });
