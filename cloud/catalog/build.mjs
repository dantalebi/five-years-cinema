// Builds the Discover catalog: the seed's films, matched on TMDB (poster, directors, countries, genres, keywords),
// plus the rest of each movement's and period's films by its core directors, and the best-rated films of national
// cinemas the seed barely reaches; then sorted into movements, periods, lenses and themes.
//   TMDB_TOKEN=… node catalog/build.mjs        (TMDB_API points it at a test server; LIMIT=n for a partial run)
// What TMDB said is kept in tmdb-cache.json, so a later run only asks about what's new. Output: dist/catalog.json,
// also copied to ../public/catalog/catalog.json for the site.
import fs from 'node:fs';
import path from 'node:path';
import {MOVEMENTS, PERIODS, CONTEMPLATIVE, AVANT_GARDE, AVANT_KEYS, LENSES, WEST, WORLD, THEMES} from './taxonomy.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const API = process.env.TMDB_API || 'https://api.themoviedb.org/3', TOKEN = process.env.TMDB_TOKEN || '';
const LIMIT = +process.env.LIMIT || Infinity, MISS_DAYS = 45, NOW = Date.now();
const seed = JSON.parse(fs.readFileSync(process.env.CATALOG_SEED || path.join(HERE, 'seed.json'), 'utf8'));
const CACHE_F = process.env.CATALOG_CACHE || path.join(HERE, 'tmdb-cache.json');
const cache = fs.existsSync(CACHE_F) ? JSON.parse(fs.readFileSync(CACHE_F, 'utf8')) : {};
for (const k of ['slug', 'movie', 'tv', 'person', 'credits', 'world']) cache[k] = cache[k] || {};
const save = () => fs.writeFileSync(CACHE_F, JSON.stringify(cache));

const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
// keywords are kept whole (themes read them), lower-cased, at most 60 a film; field 12 marks an entry that has them all
const kwOf = list => (list || []).map(k => String(k.name || '').toLowerCase().trim()).filter(Boolean).slice(0, 60);
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
  if (j === FAILED) return FAILED;
  if (!j) return null;
  const y = +(String(j.release_date || '').slice(0, 4)) || 0;
  const dirs = ((j.credits && j.credits.crew) || []).filter(c => c.job === 'Director').map(c => c.name).slice(0, 4);
  const kw = kwOf(j.keywords && j.keywords.keywords);
  cache.movie[id] = [j.title || '', j.original_title && j.original_title !== j.title ? j.original_title : '', y, j.runtime || 0, j.poster_path || '',
    (j.genres || []).map(g => g.id), (j.production_countries || []).map(c => c.iso_3166_1).slice(0, 4), j.original_language || '', dirs, kw,
    j.vote_count || 0, Math.round((j.vote_average || 0) * 10), 1];
  return cache.movie[id];
}
// does a TMDB director list agree with the director Letterboxd gives? (full name, or surname and first initial)
const dkey = n => { const t = norm(n).split(' ').filter(Boolean); return t.length > 1 ? [t.join(' '), t[t.length - 1] + ' ' + t[0][0]] : [t.join(' ')]; };
const dirOk = (want, have) => { const H = new Set((have || []).flatMap(dkey)); return want.some(w => dkey(w).some(k => H.has(k))); };
// which TMDB film a Letterboxd entry is. The same title (or original title) a year either side, the most-voted first;
// when Letterboxd names the director, the first of those whose director agrees. A title that only contains the other
// ("Night" → "Night at the Museum") needs the director's word. Nothing among films: a TV series of that name (Dekalog,
// Berlin Alexanderplatz), kept as a negative id. Returns FAILED when TMDB couldn't be asked, 0 for no match.
async function match(t, y, want) {
  const tries = [`/search/movie?query=${encodeURIComponent(t)}${y ? '&primary_release_year=' + y : ''}`, `/search/movie?query=${encodeURIComponent(t)}`];
  const wt = norm(t), cands = new Map();
  for (const q of tries) {
    const j = await get(q); if (j === FAILED) return FAILED;
    for (const r of ((j && j.results) || []).slice(0, 12)) {
      const ry = +(String(r.release_date || '').slice(0, 4)) || 0, dy = y && ry ? Math.abs(ry - y) : 3;
      const same = norm(r.title) === wt || norm(r.original_title) === wt;
      const near = !same && wt.length > 3 && (norm(r.title).includes(wt) || wt.includes(norm(r.title)));
      if ((!same && !near) || dy > 1) continue;
      const sc = (same ? 10 : 4) + (dy === 0 ? 5 : 2) + Math.log10(1 + (r.vote_count || 0));
      if (!cands.has(r.id) || cands.get(r.id).sc < sc) cands.set(r.id, {id: r.id, sc, same, dy});
    }
    if ([...cands.values()].some(c => c.same)) break;
  }
  const list = [...cands.values()].sort((a, b) => b.sc - a.sc);
  if (want.length) {
    for (const c of list.slice(0, 3)) { const d = await details(c.id); if (d === FAILED) return FAILED; if (d && dirOk(want, d[8])) return c.id; }
    const c = list.find(c => c.same && c.dy === 0);
    if (c) return c.id;
  } else {
    const c = list.find(c => c.same);
    if (c) return c.id;
  }
  return await matchTv(t, y, want);
}
async function matchTv(t, y, want) {
  const j = await get(`/search/tv?query=${encodeURIComponent(t)}${y ? '&first_air_date_year=' + y : ''}`); if (j === FAILED) return FAILED;
  const wt = norm(t);
  const rs = ((j && j.results) || []).filter(r => (norm(r.name) === wt || norm(r.original_name) === wt) && (!y || Math.abs((+(String(r.first_air_date || '').slice(0, 4)) || 0) - y) <= 1))
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
  for (const r of rs.slice(0, 2)) {
    const d = await tvDetails(r.id); if (d === FAILED) return FAILED;
    if (d && (!want.length || dirOk(want, d[8]))) return -r.id;
  }
  return 0;
}
// a series, in the same compact shape as a film; its length is all of its episodes
async function tvDetails(id) {
  if (cache.tv[id]) return cache.tv[id];
  const j = await get(`/tv/${id}?append_to_response=credits,keywords`);
  if (j === FAILED) return FAILED;
  if (!j) return null;
  const y = +(String(j.first_air_date || '').slice(0, 4)) || 0;
  const dirs = [...new Set([].concat((j.created_by || []).map(c => c.name), ((j.credits && j.credits.crew) || []).filter(c => c.job === 'Director').map(c => c.name)))].slice(0, 4);
  const kw = kwOf(j.keywords && j.keywords.results);
  const ep = (j.episode_run_time || [])[0] || 0;
  cache.tv[id] = [j.name || '', j.original_name && j.original_name !== j.name ? j.original_name : '', y, Math.min(ep * (j.number_of_episodes || 1), 2000), j.poster_path || '',
    (j.genres || []).map(g => g.id), (j.origin_country || []).slice(0, 4), j.original_language || '', dirs, kw, j.vote_count || 0, Math.round((j.vote_average || 0) * 10), 1];
  return cache.tv[id];
}
const info = id => id > 0 ? cache.movie[id] : id < 0 ? cache.tv[-id] : null;
// an entry fetched before keywords were kept whole: its keywords, asked for on their own
async function fullKeywords(id) {
  const d = info(id); if (!d || d[12]) return;
  const j = await get(id > 0 ? `/movie/${id}/keywords` : `/tv/${-id}/keywords`);
  if (j === FAILED) return;
  d[9] = kwOf(j && (j.keywords || j.results)); d[12] = 1;
}
// movements and periods together, in the catalog's order
const GROUPS = MOVEMENTS.map(m => Object.assign({kind: 'movement'}, m)).concat(PERIODS.map(p => Object.assign({kind: 'period'}, p)));
// does a film belong to a group, by its year, countries, genres, directors and keywords?
function inGroup(g, year, cs, gs, dn, kws) {
  if (!year || year < g.from || year > g.to) return false;
  if (g.countries && !cs.some(c => g.countries.includes(c))) return false;
  if (g.genres && !gs.some(x => g.genres.includes(x))) return false;
  if (g.kind === 'period') return true;
  return dn.some(x => g.dset.has(x)) || (g.keys || []).some(k => kws.has(k));
}

async function main() {
  if (!TOKEN && !process.env.TMDB_API) { console.error('TMDB_TOKEN is not set: add it under Settings → Secrets and variables → Actions.'); process.exit(2); }
  const films = seed.films.slice(0, LIMIT);
  console.log(`seed: ${films.length} films`);
  // 1. the seed's films on TMDB
  // matches from before the director check (no third field): kept when the title is the same, or the director agrees;
  // the rest, and the misses, are matched again
  let rechecked = 0;
  films.forEach(f => {
    const c = cache.slug[f[0]]; if (!c || c[2] === 2) return;
    const m = info(c[0]), want = f[8] || [];
    const same = m && (norm(m[0]) === norm(f[1]) || norm(m[1]) === norm(f[1])) && Math.abs(m[2] - f[2]) <= 1;
    if (m && (want.length ? dirOk(want, m[8]) || (same && m[2] === f[2]) : same)) c[2] = 2;
    else { delete cache.slug[f[0]]; rechecked++; }
  });
  console.log(`${rechecked} earlier matches to look at again`);
  const todo = films.filter(f => { const c = cache.slug[f[0]]; return !c || (c[0] === 0 && NOW - c[1] > MISS_DAYS * 864e5); });
  console.log(`matching ${todo.length} films…`);
  await pool(todo, 6, async f => { const id = await match(f[1], f[2], f[8] || []); if (id === FAILED) return; cache.slug[f[0]] = [id, NOW, 2]; if (id > 0) await details(id); });
  save();
  const byId = new Map();
  films.forEach(f => { const id = (cache.slug[f[0]] || [0])[0]; if (id) byId.set(id, f); });
  // 2. the rest of each movement, and of the two taste lenses, from their directors' filmographies
  const names = new Set();
  GROUPS.forEach(m => (m.dirs || []).forEach(d => names.add(d)));
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
  const wantExtra = new Map();  // TMDB id → why it's wanted: a group's index (kept only if it really belongs), or c, a, w
  const want = (id, why) => { if (byId.has(id)) return; if (!wantExtra.has(id)) wantExtra.set(id, new Set()); wantExtra.get(id).add(why); };
  const nn = n => norm(n);
  GROUPS.forEach((m, gi) => (m.dirs || []).forEach(d => (cache.credits[cache.person[d]] || []).forEach(([id, y, vc]) => { if (y >= m.from && y <= m.to && vc >= 3) want(id, gi); })));
  if (LIMIT === Infinity) {
    CONTEMPLATIVE.forEach(d => (cache.credits[cache.person[d]] || []).forEach(([id, y, vc]) => { if (y && vc >= 15) want(id, 'c'); }));
    AVANT_GARDE.forEach(d => (cache.credits[cache.person[d]] || []).filter(c => c[1]).sort((a, b) => b[2] - a[2]).slice(0, 25).forEach(([id, y, vc]) => { if (vc >= 3) want(id, 'a'); }));
  }
  // national cinemas the seed barely reaches: each one's best-rated feature films on TMDB (asked again once a month),
  // ranked with their votes weighed in, so a few enthusiastic ratings can't carry a film
  const worldTodo = WORLD.filter(([cc]) => !cache.world[cc] || NOW - cache.world[cc][0] > 30 * 864e5);
  console.log(`asking TMDB about ${worldTodo.length} national cinemas…`);
  await pool(worldTodo, 4, async ([cc, n, minV]) => {
    const got = [];
    for (let page = 1; page <= 3; page++) {
      const j = await get(`/discover/movie?with_origin_country=${cc}&sort_by=vote_average.desc&vote_count.gte=${minV}&with_runtime.gte=60&without_genres=10770,10402&include_adult=false&page=${page}`);
      if (j === FAILED) return;
      ((j && j.results) || []).forEach(r => got.push([r.id, r.vote_average || 0, r.vote_count || 0]));
      if (!j || page >= (j.total_pages || 1)) break;
    }
    const m = minV * 3, C = 6.4, score = ([, R, v]) => (v * R + m * C) / (v + m);
    cache.world[cc] = [NOW, got.filter(x => x[1] >= 6.8).sort((a, b) => score(b) - score(a)).slice(0, n).map(x => x[0])];
  });
  save();
  const fromWorld = new Set();
  WORLD.forEach(([cc]) => ((cache.world[cc] || [])[1] || []).forEach(id => { fromWorld.add(id); want(id, 'w'); }));
  const extra = [...wantExtra.keys()].filter(id => !cache.movie[id]);
  console.log(`fetching ${extra.length} more films for movements, periods, lenses and world cinema…`);
  await pool(extra, 6, async id => { await details(id); });
  save();
  // every film in the catalog with all of its keywords (the themes need them)
  const inCat = [...byId.keys()].concat([...wantExtra.keys()]).filter(id => { const d = info(id); return d && !d[12]; });
  console.log(`keywords for ${inCat.length} films fetched before they were kept…`);
  await pool(inCat, 6, async id => { await fullKeywords(id); });
  save();

  // 3. the catalog
  const dirIx = new Map(), coIx = new Map(), dirs = [], cos = [];
  const ix = (map, arr, v) => { if (!map.has(v)) { map.set(v, arr.length); arr.push(v); } return map.get(v); };
  const C = new Set(CONTEMPLATIVE.map(nn)), A = new Set(AVANT_GARDE.map(nn)), AK = new Set(AVANT_KEYS), W = new Set(WEST);
  const groups = GROUPS.map(g => Object.assign({dset: new Set((g.dirs || []).map(nn))}, g));
  const rows = [], seen = new Set();
  const add = (id, sd) => {
    if (id && seen.has(id)) return; if (id) seen.add(id);
    const d = info(id);
    const [t, ot, y, rt, p, gs, cs, lang, ds, kw, vc, tr] = d || [sd[1], '', sd[2], 0, '', [], [], '', sd[8] || [], [], 0, 0];
    const year = y || (sd ? sd[2] : 0), canon = sd ? sd[5] : [0, 0, 0, 0, 0], q = sd ? sd[3] : -1;
    const dn = ds.map(nn), kws = new Set(kw);
    const movs = [];
    groups.forEach((g, gi) => { if (inGroup(g, year, cs, gs, dn, kws)) movs.push(gi); });
    // a film wanted for a movement or period it turns out not to belong to (a core director's film made elsewhere,
    // or in another genre) stays out
    if (!sd) { const why = wantExtra.get(id) || new Set(); if (![...why].some(w => typeof w === 'string' || movs.includes(w))) { seen.delete(id); return; } }
    const themes = [];
    THEMES.forEach((th, ti) => { if (th.keys.some(k => kws.has(k)) && (!th.genres || gs.some(x => th.genres.includes(x)))) themes.push(ti); });
    const isCanon = canon[0] || canon[1] || (canon[2] && canon[2] <= 1000) || (canon[3] && canon[3] <= 250);
    let lens = 0;
    const set = k => { lens |= 1 << LENSES.findIndex(l => l.id === k); };
    if (vc >= 6000 || (vc >= 2500 && q >= 45)) set('essentials');
    if (isCanon) set('canon');
    if (dn.some(x => C.has(x))) set('contemplative');
    if (dn.some(x => A.has(x)) || kw.some(k => AK.has(k))) set('avant-garde');
    if (q >= 70 && vc < 1500 && !isCanon) set('gems');
    // films the panel hasn't rated: well rated on TMDB by a small, steady audience, and in a movement, period or
    // national cinema the catalog went looking for
    if (q < 0 && !isCanon && vc >= 25 && vc < 500 && (tr || 0) >= 74 && (movs.length || fromWorld.has(id))) set('gems');
    if (cs.length && !W.has(cs[0]) && (isCanon || q >= 55 || fromWorld.has(id) || ((tr || 0) >= 70 && vc >= 25))) set('world');
    if (year >= 2000 && (canon[3] || q >= 75)) set('c21');
    if (gs.includes(99)) set('documentary');
    if (gs.includes(16)) set('animation');
    rows.push([id || 0, sd ? sd[0] : '', t || (sd && sd[1]) || '', year, rt, p, ds.map(n => ix(dirIx, dirs, n)), cs.map(c => ix(coIx, cos, c)), gs, movs, lens,
      q, sd ? sd[4] : -1, vc, canon, ot, lang, themes]);
  };
  // a seed film TMDB doesn't know stays only if it's in the canon (shown without a poster); the rest are left out
  films.forEach(f => { const id = (cache.slug[f[0]] || [0])[0]; if (info(id) || f[5].some(Boolean)) add(info(id) ? id : 0, f); });
  wantExtra.forEach((why, id) => { if (cache.movie[id] && cache.movie[id][2]) add(id, null); });
  // a theme needs enough films to be worth a page
  const themeN = THEMES.map((th, ti) => rows.filter(r => r[17].includes(ti)).length);
  const GEN = {28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror',
    10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'};
  const out = {v: 1, built: new Date().toISOString().slice(0, 10), fields: ['tmdb', 'slug', 'title', 'year', 'runtime', 'poster', 'dirs', 'countries', 'genres', 'groups', 'lenses', 'quality', 'reach', 'votes', 'canon', 'original', 'lang', 'themes'],
    canon: seed.canon, dirs, countries: cos, genres: GEN,
    groups: groups.map(g => ({id: g.id, name: g.name, kind: g.kind, from: g.from, to: g.to, desc: g.desc})),
    lenses: LENSES, themes: THEMES.map(th => ({id: th.id, name: th.name, desc: th.desc, season: th.season || null})), films: rows};
  const txt = JSON.stringify(out);
  const outs = process.env.CATALOG_OUT ? [process.env.CATALOG_OUT] : [path.join(HERE, 'dist'), path.join(HERE, '..', 'public', 'catalog')];
  outs.forEach(dir => { fs.mkdirSync(dir, {recursive: true}); fs.writeFileSync(path.join(dir, 'catalog.json'), txt); });
  const matched = rows.filter(r => r[0]).length;
  console.log(`catalog: ${rows.length} films (${matched} on TMDB, ${rows.length - films.length} added from movements and lenses) · ${dirs.length} directors · ${(txt.length / 1e6).toFixed(2)} MB · ${calls} calls, ${fails} failed`);
  groups.forEach((g, gi) => console.log(`  ${g.name}: ${rows.filter(r => r[9].includes(gi)).length}`));
  LENSES.forEach((l, li) => console.log(`  [${l.name}]: ${rows.filter(r => r[10] & (1 << li)).length}`));
  THEMES.forEach((th, ti) => console.log(`  {${th.name}}: ${themeN[ti]}`));
}
main().catch(e => { console.error(e); save(); process.exit(1); });
