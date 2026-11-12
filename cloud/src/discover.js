// Discover: a catalog of about ten thousand films for everyone on TVC15, kept apart from anyone's plan or watchlist.
// Ways in for different kinds of viewers, the movements, eras, national cinemas, decades and genres; filters that
// stack, so the list keeps narrowing (and can hide what you've seen or already saved); Letterboxd-style sorting;
// and a page for each film. The catalog is one static file (/catalog/catalog.json, rebuilt monthly on GitHub), so
// browsing never waits on the server.
// fxDiscover({wl}) → a tab for mountFocus ({end: true}: it sits after Diary). attach(root, render) adds its own
// handling of typing and of the dropdowns; setLogger(fn) is what "Log" calls.
function fxDiscover(o) {
  const WL = (o && o.wl) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const num = n => Number(n).toLocaleString('en-US');
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  const bare = t => String(t || '').replace(/\s*\(\d{4}\)\s*$/, '');
  const okPath = p => typeof p === 'string' && /^\/[A-Za-z0-9._-]+$/.test(p);
  const okSlug = s => typeof s === 'string' && /^[a-z0-9-]{1,120}$/.test(s);
  const img = (p, w) => okPath(p) ? 'https://image.tmdb.org/t/p/' + w + p : '';
  const hm = m => m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm';
  const longDay = d => { try { return new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric'}).format(new Date(d + 'T12:00:00')); } catch (e) { return d; } };
  // country names: the ones Intl doesn't know (countries that no longer exist) or names too formally
  const CN = {SU: 'Soviet Union', XC: 'Czechoslovakia', CS: 'Czechoslovakia', YU: 'Yugoslavia', XG: 'East Germany', DD: 'East Germany', XI: 'Northern Ireland',
    HK: 'Hong Kong', MO: 'Macao', US: 'United States', GB: 'United Kingdom', KR: 'South Korea', KP: 'North Korea', PS: 'Palestine', CD: 'DR Congo', MK: 'North Macedonia'};
  let DN = null; try { DN = new Intl.DisplayNames(['en'], {type: 'region'}); } catch (e) {}
  const cname = c => { if (CN[c]) return CN[c]; try { return DN && /^[A-Z]{2}$/.test(c) ? DN.of(c) : c; } catch (e) { return c; } };
  const POLLS = [['Sight and Sound 2022', 'Critics’ poll'], ['Sight and Sound 2022', 'Directors’ poll'], ['They Shoot Pictures, Don’t They', 'The 1,000 Greatest Films'],
    ['They Shoot Pictures, Don’t They', 'The 21st Century’s Most Acclaimed'], ['Criterion Closet', 'Most-picked films']];
  const ERAS = [[0, 'The Silent and Early Sound Era'], [1940, 'Postwar Cinema'], [1956, 'The New Waves'], [1980, 'Late Twentieth Century'], [2000, 'The Twenty-First Century']];
  const LENGTHS = [['short', 'Short films (under 40 min)', m => m > 0 && m < 40], ['u90', 'Under 90 minutes', m => m >= 40 && m < 90], ['mid', '90 minutes to 2 hours', m => m >= 90 && m <= 120],
    ['long', 'Over 2 hours', m => m > 120], ['epic', 'Over 3 hours', m => m > 180]];
  const SORTS = [['rec', 'Recommended'], ['pop', 'Popularity'], ['rated', 'Rating, highest first'], ['poll', 'Poll ranking'], ['new', 'Release date, newest first'], ['old', 'Release date, oldest first'],
    ['title', 'Title'], ['short', 'Length, shortest first'], ['long', 'Length, longest first'], ['shuffle', 'Shuffle']];
  const PAGE = 60;
  // a TV series (Dekalog, Berlin Alexanderplatz) has a negative id in the catalog: not a TMDB film id anywhere else
  const ref = f => ({t: f.t, y: f.y, tm: f.tm > 0 ? f.tm : 0});
  let C = null, status = 'idle', redraw = null, root = null, logger = null, qt = null;
  const info = new Map();  // TMDB id → {ov, tag, bd, cast} for the film page
  const st = {page: 'home', f: {}, primary: '', q: '', sort: 'rec', n: PAGE, film: -1, stack: [], fOpen: false, seed: 1, allC: false};
  const hides = () => String((typeof Store !== 'undefined' && Store.data['cfg:dxh']) || '');

  // ---- the catalog: fetched once, the first time Discover opens ----
  async function load() {
    if (status === 'loading' || status === 'ready') return;
    status = 'loading';
    try {
      const r = await fetch('/catalog/catalog.json', {credentials: 'same-origin'});
      // no catalog yet: a 404, or the app's own page sent back in its place
      if (r.status === 404 || !/json/.test(r.headers.get('content-type') || '')) status = 'missing';
      else if (!r.ok) throw new Error('http');
      else { C = prep(await r.json()); status = 'ready'; }
    } catch (e) { status = 'error'; }
    if (redraw) redraw();
  }
  function prep(j) {
    const ix = {}; (j.fields || []).forEach((k, i) => { ix[k] = i; });
    if (!['tmdb', 'slug', 'title', 'year', 'runtime', 'poster', 'dirs', 'countries', 'genres', 'groups', 'lenses', 'quality', 'reach', 'votes', 'canon', 'original'].every(k => k in ix) || !Array.isArray(j.films)) throw new Error('shape');
    const arr = v => Array.isArray(v) ? v : [];
    const dirs = arr(j.dirs).map(String), countries = arr(j.countries).map(String);
    const groups = arr(j.groups).map((g, i) => ({i, name: String(g.name || ''), kind: g.kind === 'period' ? 'period' : 'movement', from: +g.from || 0, to: +g.to || 0, desc: String(g.desc || '')}));
    const lenses = arr(j.lenses).map((l, i) => ({i, id: String(l.id || ''), name: String(l.name || ''), door: String(l.door || ''), desc: String(l.desc || '')}));
    const gname = {}; Object.entries(j.genres || {}).forEach(([id, n]) => { gname[+id] = String(n); });
    const films = j.films.map((r, i) => {
      const f = {i, tm: +r[ix.tmdb] || 0, slug: okSlug(r[ix.slug]) ? r[ix.slug] : '', t: String(r[ix.title] || ''), y: +r[ix.year] || 0, rt: +r[ix.runtime] || 0,
        p: okPath(r[ix.poster]) ? r[ix.poster] : '', d: arr(r[ix.dirs]).filter(k => dirs[k] != null), c: arr(r[ix.countries]).filter(k => countries[k] != null),
        g: arr(r[ix.genres]).map(Number), m: arr(r[ix.groups]).filter(k => groups[k]), l: +r[ix.lenses] || 0, q: Number(r[ix.quality]), re: Number(r[ix.reach]), v: +r[ix.votes] || 0,
        cn: arr(r[ix.canon]).map(x => +x || 0), ot: String(r[ix.original] || '')};
      if (!Number.isFinite(f.q)) f.q = -1;
      if (!Number.isFinite(f.re)) f.re = -1;
      f.dec = f.y ? Math.floor(f.y / 10) * 10 : 0;
      f.ny = norm(f.t) + '|' + f.y;
      f.s = ' ' + norm([f.t, f.ot].concat(f.d.map(k => dirs[k])).join(' '));
      // where it stands in the polls (one scale for sorting: the main lists first, then the 21st-century list, then the Closet)
      const [ssc, ssd, ts, t21, cc] = [0, 1, 2, 3, 4].map(k => f.cn[k] || 0), main = [ssc, ssd, ts].filter(Boolean), best = main.length ? Math.min(...main) : 0;
      f.poll = best || (t21 ? 1000 + t21 : cc ? 3000 + cc : 1e9);
      // "Recommended": how well loved, how widely seen and how often named in the polls, in one score
      let cb = best ? (best <= 100 ? 22 : best <= 250 ? 16 : best <= 500 ? 11 : 7) : 0;
      if (t21) cb = Math.max(cb, t21 <= 100 ? 12 : 6);
      if (cc) cb += 3;
      f.rec = .42 * (f.q >= 0 ? f.q : 50) + .18 * Math.max(0, f.re) + .22 * Math.min(100, Math.log10(1 + f.v) * 25) + cb;
      return f;
    });
    const tally = (fn) => { const m = new Map(); films.forEach(f => fn(f).forEach(v => m.set(v, (m.get(v) || 0) + 1))); return m; };
    const lensN = tally(f => lenses.filter(l => f.l & (1 << l.i)).map(l => l.i));
    return {built: String(j.built || ''), dirs, countries, cnames: countries.map(cname), groups, lenses, gname, films,
      n: {lens: lensN, group: tally(f => f.m), country: tally(f => f.c), decade: tally(f => f.dec ? [f.dec] : []), genre: tally(f => f.g)}};
  }

  // ---- what you've seen (diary, plan, Letterboxd import) and what's on your watchlist ----
  function marks() {
    const seen = new Map(), S = (typeof Store !== 'undefined' && Store.data) || {}, D = window.D;
    const add = (t, y, tm, slug, date) => {
      [tm ? 'tm' + tm : '', slug ? 's:' + slug : '', norm(bare(t)) + '|' + (+y || 0)].forEach(k => { if (k && !seen.has(k)) seen.set(k, date || ''); });
    };
    try {
      if (D && typeof fxDiary === 'function') {
        fxDiary(D, S).forEach(e => { const md = e.md || {}; if (e.i != null) { const r = D.F[e.i]; add(r[0], r[1], r[16], r[5], e.date); } else add(md.t || e.t, md.y || e.y, md.tm, '', e.date); });
        if (typeof fxWatched === 'function') fxWatched(D, S).forEach(e => { const md = e.md || {}; if (e.i != null) { const r = D.F[e.i]; add(r[0], r[1], r[16], r[5]); } else add(md.t || e.t, md.y || e.y, md.tm, ''); });
      }
    } catch (e) {}
    const when = f => { for (const k of [f.tm > 0 ? 'tm' + f.tm : '', f.slug ? 's:' + f.slug : '', f.ny]) if (k && seen.has(k)) return seen.get(k) || '-'; return ''; };
    const memo = new Map();
    return {
      seen: f => { if (!memo.has(f.i)) memo.set(f.i, when(f)); return memo.get(f.i); },
      wl: f => !!(WL && WL.has(ref(f))),
    };
  }

  // ---- filtering: every filter narrows what the others leave ----
  const DIMS = ['lens', 'group', 'country', 'genre', 'decade', 'len', 'dir'];
  function pass(f, skip) {
    const x = st.f;
    if (skip !== 'lens' && x.lens != null && !(f.l & (1 << x.lens))) return false;
    if (skip !== 'group' && x.group != null && !f.m.includes(x.group)) return false;
    if (skip !== 'country' && x.country != null && !f.c.includes(x.country)) return false;
    if (skip !== 'genre' && x.genre != null && !f.g.includes(x.genre)) return false;
    if (skip !== 'decade' && x.decade != null && f.dec !== x.decade) return false;
    if (skip !== 'len' && x.len != null) { const L = LENGTHS.find(l => l[0] === x.len); if (L && !L[2](f.rt)) return false; }
    if (skip !== 'dir' && x.dir != null && !f.d.includes(x.dir)) return false;
    return true;
  }
  const vals = (f, dim) => dim === 'lens' ? C.lenses.filter(l => f.l & (1 << l.i)).map(l => l.i) : dim === 'group' ? f.m : dim === 'country' ? f.c : dim === 'genre' ? f.g
    : dim === 'decade' ? (f.dec ? [f.dec] : []) : dim === 'len' ? LENGTHS.filter(l => l[2](f.rt)).map(l => l[0]) : f.d;
  const rnd = (i, s) => { let h = (i + 1) * 2654435761 ^ s * 40503; h = Math.imul(h ^ h >>> 15, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^ h >>> 16) >>> 0; };
  function sortFn(k) {
    const by = (a, b) => b.rec - a.rec;
    return k === 'pop' ? (a, b) => b.v - a.v || by(a, b) : k === 'rated' ? (a, b) => b.q - a.q || b.v - a.v : k === 'poll' ? (a, b) => a.poll - b.poll || by(a, b)
      : k === 'new' ? (a, b) => b.y - a.y || by(a, b) : k === 'old' ? (a, b) => (a.y || 9999) - (b.y || 9999) || by(a, b) : k === 'title' ? (a, b) => sortTitle(a).localeCompare(sortTitle(b), 'en')
      : k === 'short' ? (a, b) => (a.rt || 1e4) - (b.rt || 1e4) || by(a, b) : k === 'long' ? (a, b) => b.rt - a.rt || by(a, b) : k === 'shuffle' ? (a, b) => rnd(a.i, st.seed) - rnd(b.i, st.seed) : by;
  }
  const sortTitle = f => f.t.replace(/^(the|a|an)\s+/i, '');
  function compute() {
    const mk = marks(), words = norm(st.q).split(' ').filter(Boolean), H = hides();
    const hs = H.includes('s'), hw = H.includes('w');
    let hidS = 0, hidW = 0;
    const pool = [];
    for (const f of C.films) {
      if (words.length && !words.every(w => f.s.includes(' ' + w))) continue;
      if (hs && mk.seen(f)) { if (pass(f, '')) hidS++; continue; }
      if (hw && mk.wl(f)) { if (pass(f, '')) hidW++; continue; }
      pool.push(f);
    }
    const list = pool.filter(f => pass(f, '')).sort(sortFn(st.sort));
    const counts = dim => { const m = new Map(); pool.forEach(f => { if (pass(f, dim)) vals(f, dim).forEach(v => m.set(v, (m.get(v) || 0) + 1)); }); return m; };
    return {mk, list, hidS, hidW, counts, hs, hw};
  }

  // ---- views ----
  const label = (dim, v) => dim === 'lens' ? (C.lenses[v] || {}).name : dim === 'group' ? (C.groups[v] || {}).name : dim === 'country' ? C.cnames[v] : dim === 'genre' ? C.gname[v]
    : dim === 'decade' ? v + 's' : dim === 'len' ? (LENGTHS.find(l => l[0] === v) || [])[1] : C.dirs[v];
  const filmsN = n => num(n) + (n === 1 ? ' film' : ' films');
  function poster(f, w, cls) {
    const src = img(f.p, w);
    return `<span class="fx-pos dx-pos${cls ? ' ' + cls : ''}${src ? '' : ' dx-nop'}">${src ? `<img loading="lazy" decoding="async" alt="" src="${src}">` : `<span class="dx-npt">${esc(f.t)}</span>`}</span>`;
  }
  function cell(f, mk) {
    const s = mk.seen(f), w = mk.wl(f);
    return `<li><button type="button" class="dx-cell" data-dx-film="${f.i}" title="${esc(f.t + (f.y ? ' (' + f.y + ')' : ''))}">${poster(f, 'w185')}${s ? '<i class="dx-mk dx-mseen" aria-label="Watched"></i>' : w ? '<i class="dx-mk dx-mwl" aria-label="On your watchlist"></i>' : ''}</button>`
      + `<span class="dx-ct">${esc(f.t)}</span><span class="dx-cy">${f.y || ''}</span></li>`;
  }
  function search() {
    return `<div class="dx-q"><input type="search" class="fx-pick-q" data-dx-q enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Search titles and directors" aria-label="Search titles and directors" value="${esc(st.q)}"></div>`;
  }
  function state() {
    if (status === 'missing') return `<section class="fx-card"><h2>The catalog is on its way</h2><p class="fx-muted">It’s being put together right now. Check back in a little while.</p></section>`;
    if (status === 'error') return `<section class="fx-card"><h2>The catalog didn’t load</h2><p class="fx-muted">Check your connection and try again.</p><div class="fx-row"><button type="button" class="fx-btn" data-dx-retry>Try again</button></div></section>`;
    return `<p class="fx-muted dx-wait">Loading the catalog…</p>`;
  }
  function home() {
    return `<header class="fx-head dx-head"><div class="fx-hrow"><h1 class="fx-h1">Discover</h1></div>
      <p class="dx-lede">${num(C.films.length)} films, from the silent era to now. Find a way in by movement, country or mood, and save what you like to your watchlist.</p></header>${search()}<div class="dx-dyn">${homeBody()}</div>`;
  }
  function homeBody() {
    const n = C.n;
    let h = `<section class="fx-card dx-sec"><h2>Where to start</h2><ul class="dx-doors">` + C.lenses.filter(l => n.lens.get(l.i)).map(l =>
      `<li><button type="button" data-dx-go="lens:${l.i}"><span class="dx-door">${esc(l.door)}</span><b>${esc(l.name)}</b><span class="dx-dd">${esc(l.desc)}</span><span class="dx-n">${filmsN(n.lens.get(l.i))}</span></button></li>`).join('') + '</ul></section>';
    const row = g => `<li><button type="button" data-dx-go="group:${g.i}"><b>${esc(g.name)}</b><span class="dx-yrs">${g.from}–${g.to >= new Date().getFullYear() ? 'now' : g.to}</span><span class="dx-n">${num(n.group.get(g.i))}</span></button></li>`;
    const movs = C.groups.filter(g => g.kind === 'movement' && n.group.get(g.i)).sort((a, b) => a.from - b.from || a.to - b.to);
    h += `<section class="fx-card dx-sec"><h2>Movements</h2><p class="fx-muted">Schools, waves and avant-gardes, in the order they began. Each one includes its lesser-known films.</p>`;
    ERAS.forEach(([from], k) => {
      const to = k + 1 < ERAS.length ? ERAS[k + 1][0] : 1e4, these = movs.filter(g => g.from >= from && g.from < to);
      if (these.length) h += `<h3 class="dx-era">${ERAS[k][1]}</h3><ul class="dx-list">${these.map(row).join('')}</ul>`;
    });
    h += '</section>';
    const eras = C.groups.filter(g => g.kind === 'period' && n.group.get(g.i)).sort((a, b) => a.from - b.from);
    if (eras.length) h += `<section class="fx-card dx-sec"><h2>Eras and Golden Ages</h2><p class="fx-muted">Periods when a whole film industry was at its peak.</p><ul class="dx-list">${eras.map(row).join('')}</ul></section>`;
    const cs = [...n.country.entries()].sort((a, b) => b[1] - a[1]), top = st.allC ? cs.slice().sort((a, b) => C.cnames[a[0]].localeCompare(C.cnames[b[0]], 'en')) : cs.slice(0, 24);
    h += `<section class="fx-card dx-sec"><h2>National Cinemas</h2><div class="dx-chips">${top.map(([c, k]) => `<button type="button" class="dx-chip" data-dx-go="country:${c}">${esc(C.cnames[c])} <span>${num(k)}</span></button>`).join('')}</div>`
      + (cs.length > 24 ? `<button type="button" class="fx-link dx-allc" data-dx-allc>${st.allC ? 'Show the top 24' : 'All ' + cs.length + ' countries, A to Z'}</button>` : '') + '</section>';
    const decs = [...n.decade.entries()].sort((a, b) => a[0] - b[0]);
    h += `<section class="fx-card dx-sec"><h2>Decades</h2><div class="dx-chips">${decs.map(([d, k]) => `<button type="button" class="dx-chip" data-dx-go="decade:${d}">${d}s <span>${num(k)}</span></button>`).join('')}</div></section>`;
    const gs = [...n.genre.entries()].filter(([g]) => C.gname[g] && g !== 10770).sort((a, b) => C.gname[a[0]].localeCompare(C.gname[b[0]], 'en'));
    h += `<section class="fx-card dx-sec"><h2>Genres</h2><div class="dx-chips">${gs.map(([g, k]) => `<button type="button" class="dx-chip" data-dx-go="genre:${g}">${esc(C.gname[g])} <span>${num(k)}</span></button>`).join('')}</div></section>`;
    h += `<section class="fx-card dx-sec"><div class="fx-row"><button type="button" class="fx-btn primary" data-dx-go="all">Browse all ${num(C.films.length)} films</button></div></section>`;
    return h + attr();
  }
  const attr = () => `<p class="fx-muted dx-attr">Film data and posters from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.${C && C.built ? ' Catalog updated ' + esc(longDay(C.built)) + '.' : ''}</p>`;
  function browse() {
    const pr = st.primary && st.f[st.primary] != null ? st.primary : DIMS.find(d => st.f[d] != null) || '';
    let eye = 'The catalog', title = 'All films', desc = '';
    if (pr === 'group') { const g = C.groups[st.f.group]; eye = (g.kind === 'period' ? 'Era' : 'Movement') + ' · ' + g.from + '–' + (g.to >= new Date().getFullYear() ? 'now' : g.to); title = g.name; desc = g.desc; }
    else if (pr === 'lens') { const l = C.lenses[st.f.lens]; eye = l.door || 'Collection'; title = l.name; desc = l.desc; }
    else if (pr === 'country') { eye = 'National cinema'; title = 'Cinema of ' + C.cnames[st.f.country]; }
    else if (pr === 'decade') { eye = 'Decade'; title = 'The ' + st.f.decade + 's'; }
    else if (pr === 'genre') { eye = 'Genre'; title = C.gname[st.f.genre]; }
    else if (pr === 'dir') { eye = 'Director'; title = C.dirs[st.f.dir]; }
    else if (pr === 'len') { eye = 'Length'; title = label('len', st.f.len); }
    return `<header class="fx-head dx-head"><div class="fx-hrow"><button type="button" class="fx-link" data-dx-home>← Discover</button></div>
      <div class="fx-eye">${esc(eye)}</div><h1 class="fx-h1 dx-h1">${esc(title)}</h1>${desc ? `<p class="dx-lede">${esc(desc)}</p>` : ''}</header>${search()}<div class="dx-dyn">${tools()}${attr()}</div>`;
  }
  // the filters, the sort and the results; redrawn on their own while you type, so the search box keeps focus
  function tools() {
    const R = compute(), nf = DIMS.filter(d => st.f[d] != null).length;
    let h = `<div class="dx-bar"><button type="button" class="dx-fbtn" data-dx-filters aria-expanded="${st.fOpen}">Filters${nf ? `<span>${nf}</span>` : ''}</button>
      <label class="dx-sort"><span>Sort by</span><select data-dx-sort aria-label="Sort by">${SORTS.map(([k, n]) => `<option value="${k}"${st.sort === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      ${st.sort === 'shuffle' ? '<button type="button" class="fx-link" data-dx-shuffle>Shuffle again</button>' : ''}</div>
      <div class="dx-hides"><button type="button" class="dx-tog" data-dx-hide="s" aria-pressed="${R.hs}">Hide watched</button><button type="button" class="dx-tog" data-dx-hide="w" aria-pressed="${R.hw}">Hide watchlist</button></div>`;
    if (st.fOpen) h += panel(R);
    const chips = DIMS.filter(d => st.f[d] != null).map(d => `<button type="button" class="fx-chip" data-dx-rm="${d}" aria-label="Remove filter: ${esc(label(d, st.f[d]))}">${esc(label(d, st.f[d]))}<i aria-hidden="true">×</i></button>`);
    if (chips.length) h += `<div class="dx-active">${chips.join('')}${chips.length > 1 ? '<button type="button" class="fx-link" data-dx-clear>Clear all</button>' : ''}</div>`;
    const hid = [R.hidS ? num(R.hidS) + ' watched' : '', R.hidW ? num(R.hidW) + ' on your watchlist' : ''].filter(Boolean);
    h += `<p class="dx-count"><b>${filmsN(R.list.length)}</b>${hid.length ? ` <span>· ${hid.join(' and ')} hidden</span>` : ''}</p>`;
    if (!R.list.length) h += `<p class="fx-muted dx-none">Nothing matches all of these. Remove a filter${R.hs || R.hw ? ' or show the films you’ve hidden' : ''} to see more.</p>`;
    else h += `<ul class="dx-grid">${R.list.slice(0, st.n).map(f => cell(f, R.mk)).join('')}</ul>`;
    if (R.list.length > st.n) h += `<div class="dx-more"><button type="button" class="fx-btn" data-dx-more>Show more</button><span class="fx-muted">${num(st.n)} of ${num(R.list.length)}</span></div>`;
    return h;
  }
  function panel(R) {
    const sel = (dim, any, opts) => {
      const cur = st.f[dim], cn = R.counts(dim);
      const op = ([v, n]) => { const k = cn.get(v) || 0; return k || v === cur ? `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(n)} (${num(k)})</option>` : ''; };
      const body = typeof opts === 'function' ? opts(op) : opts.map(op).join('');
      return `<label class="dx-f"><span>${any[0]}</span><select data-dx-f="${dim}"><option value="">${any[1]}</option>${body}</select></label>`;
    };
    const groups = kind => C.groups.filter(g => g.kind === kind).sort((a, b) => a.from - b.from).map(g => [g.i, g.name]);
    let h = '<div class="dx-panel">';
    h += sel('lens', ['Collection', 'Any collection'], C.lenses.map(l => [l.i, l.name]));
    const og = (name, list) => list ? `<optgroup label="${name}">${list}</optgroup>` : '';
    h += sel('group', ['Movement or era', 'Any movement or era'], op => og('Movements', groups('movement').map(op).join('')) + og('Eras and golden ages', groups('period').map(op).join('')));
    h += sel('country', ['Country', 'Any country'], C.countries.map((c, i) => [i, C.cnames[i]]).sort((a, b) => a[1].localeCompare(b[1], 'en')));
    h += sel('genre', ['Genre', 'Any genre'], Object.keys(C.gname).map(Number).filter(g => g !== 10770).map(g => [g, C.gname[g]]).sort((a, b) => a[1].localeCompare(b[1], 'en')));
    h += sel('decade', ['Decade', 'Any decade'], [...C.n.decade.keys()].sort((a, b) => b - a).map(d => [d, d + 's']));
    h += sel('len', ['Length', 'Any length'], LENGTHS.map(l => [l[0], l[1]]));
    return h + '</div>';
  }
  function film() {
    const f = C.films[st.film]; if (!f) { st.page = 'home'; return home(); }
    const mk = marks(), seen = mk.seen(f), wl = mk.wl(f), x = info.get(f.tm) || null;
    const dn = f.d.map(k => `<button type="button" class="dx-a" data-dx-dir="${k}">${esc(C.dirs[k])}</button>`);
    const lb = f.slug ? 'https://letterboxd.com/film/' + f.slug + '/' : f.tm > 0 ? 'https://letterboxd.com/tmdb/' + f.tm + '/' : 'https://letterboxd.com/search/films/' + encodeURIComponent(f.t) + '/';
    const meta = [f.tm < 0 ? 'TV series' : '', f.rt ? hm(f.rt) : ''].concat(f.c.map(c => `<button type="button" class="dx-a" data-dx-go="country:${c}">${esc(C.cnames[c])}</button>`)).filter(Boolean);
    const gen = f.g.filter(g => C.gname[g] && g !== 10770).map(g => `<button type="button" class="dx-a" data-dx-go="genre:${g}">${esc(C.gname[g])}</button>`);
    let h = `<header class="fx-head dx-head"><div class="fx-hrow"><button type="button" class="fx-link" data-dx-back>← Back</button></div></header>`;
    if (x && x.bd) h += `<div class="dx-bd" aria-hidden="true"><img alt="" src="${img(x.bd, 'w780')}"></div>`;
    h += `<section class="dx-fh${x && x.bd ? ' dx-onbd' : ''}">${poster(f, 'w342', 'dx-fpos')}<div class="dx-fi">
      <h1 class="dx-ft">${esc(f.t)}</h1>${f.ot ? `<p class="dx-ot">${esc(f.ot)}</p>` : ''}
      <p class="dx-by">${f.y ? `<span>${f.y}</span>` : ''}${dn.length ? `<span>Directed by ${dn.join(', ')}</span>` : ''}</p>
      ${meta.length ? `<p class="dx-meta">${meta.join('<i>·</i>')}</p>` : ''}${gen.length ? `<p class="dx-meta">${gen.join('<i>·</i>')}</p>` : ''}</div></section>`;
    h += `<div class="dx-acts"><button type="button" class="fx-btn${wl ? '' : ' primary'} dx-wlb" data-dx-wl="${f.i}" aria-pressed="${wl}">${wl ? 'On your watchlist' : 'Add to watchlist'}</button>`
      + (logger ? `<button type="button" class="fx-btn" data-dx-log="${f.i}">${seen ? 'Log again' : 'Log'}</button>` : '')
      + `<a class="fx-btn" href="${esc(lb)}" target="_blank" rel="noopener noreferrer">Letterboxd ↗</a></div>`;
    if (seen) h += `<p class="dx-seen">${seen !== '-' ? 'You watched this on ' + esc(longDay(seen)) + '.' : 'You’ve seen this.'}</p>`;
    if (x && (x.tag || x.ov)) h += `<section class="dx-ov">${x.tag ? `<p class="dx-tag">${esc(x.tag)}</p>` : ''}${x.ov ? `<p>${esc(x.ov)}</p>` : ''}${x.cast && x.cast.length ? `<p class="fx-muted">Starring ${esc(x.cast.join(', '))}</p>` : ''}</section>`;
    else if (f.tm && !x) h += `<p class="fx-muted dx-wait">…</p>`;
    const part = f.m.map(g => `<button type="button" class="dx-chip" data-dx-go="group:${g}">${esc(C.groups[g].name)}</button>`)
      .concat(C.lenses.filter(l => f.l & (1 << l.i)).map(l => `<button type="button" class="dx-chip" data-dx-go="lens:${l.i}">${esc(l.name)}</button>`));
    if (part.length) h += `<section class="fx-card dx-sec"><h2>Part of</h2><div class="dx-chips">${part.join('')}</div></section>`;
    const polls = f.cn.map((r, k) => r && POLLS[k] ? `<li><span>${esc(POLLS[k][0])}<em>${esc(POLLS[k][1])}</em></span><b>#${num(r)}</b></li>` : '').join('');
    if (polls) h += `<section class="fx-card dx-sec"><h2>In the polls</h2><ul class="dx-polls">${polls}</ul></section>`;
    if (f.d.length) {
      const d0 = f.d[0], more = C.films.filter(g => g !== f && g.d.includes(d0)).sort((a, b) => a.y - b.y);
      if (more.length) h += `<section class="fx-card dx-sec"><div class="dx-sh"><h2>More by ${esc(C.dirs[d0])}</h2>${more.length > 12 ? `<button type="button" class="fx-link" data-dx-dir="${d0}">All ${more.length + 1}</button>` : ''}</div>
        <ul class="dx-row">${more.slice(0, 12).map(g => cell(g, mk)).join('')}</ul></section>`;
    }
    return h + attr();
  }
  async function fetchInfo(f) {
    if (!f.tm || info.has(f.tm)) return;
    info.set(f.tm, null);
    let x = {};
    try {
      const r = await fetch('/api/tmdb/' + (f.tm > 0 ? 'movie/' + f.tm : 'tv/' + -f.tm) + '?append_to_response=credits&language=en-US', {headers: {accept: 'application/json'}, credentials: 'same-origin'});
      if (r.ok) {
        const j = await r.json();
        x = {ov: String(j.overview || '').slice(0, 1500), tag: String(j.tagline || '').slice(0, 200), bd: okPath(j.backdrop_path) ? j.backdrop_path : '',
          cast: ((j.credits && j.credits.cast) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 5).map(c => String(c.name || '').slice(0, 60)).filter(Boolean)};
      }
    } catch (e) {}
    info.set(f.tm, x);
    if (st.page === 'film' && C && C.films[st.film] === f && redraw) redraw();
  }

  // ---- moving around ----
  function go(spec) {
    const [dim, v] = String(spec).split(':');
    st.f = {}; st.primary = ''; st.q = ''; st.n = PAGE; st.fOpen = false; st.stack = [];
    if (dim !== 'all' && DIMS.includes(dim)) { st.f[dim] = dim === 'len' ? v : +v; st.primary = dim; }
    // each way in opens in the order that suits it: what everyone's seen for newcomers, poll rank for the canon
    const lid = dim === 'lens' && C.lenses[+v] ? C.lenses[+v].id : '';
    st.sort = lid === 'essentials' ? 'pop' : lid === 'canon' ? 'poll' : 'rec';
    st.page = 'browse';
  }
  function open(i) {
    st.stack.push({page: st.page, film: st.film, y: window.scrollY || 0});
    st.page = 'film'; st.film = i;
    fetchInfo(C.films[i]);
  }
  function back() {
    const s = st.stack.pop();
    if (!s) { st.page = 'home'; return 0; }
    st.page = s.page; st.film = s.film;
    return s.y;
  }
  const top = () => window.scrollTo(0, 0);
  function partial() {
    const dyn = root && root.querySelector('.dx-dyn');
    if (!dyn) { if (redraw) redraw(); return; }
    dyn.innerHTML = st.page === 'home' ? homeBody() : tools() + attr();
  }

  return {
    id: 'discover', label: {en: 'Discover', fa: 'Discover'}, end: true,
    view() {
      if (status !== 'ready') { if (status === 'idle') load(); return `<header class="fx-head dx-head"><div class="fx-hrow"><h1 class="fx-h1">Discover</h1></div></header>` + state(); }
      return st.page === 'film' ? film() : st.page === 'browse' ? browse() : home();
    },
    click(b, render) {
      const d = b.dataset;
      if (b.hasAttribute('data-dx-retry')) { status = 'idle'; render(); return true; }
      if (!C) return false;
      if (d.dxGo) { go(d.dxGo); render(); top(); return true; }
      if (d.dxFilm != null) { open(+d.dxFilm); render(); top(); return true; }
      if (d.dxDir != null) { go('dir:' + d.dxDir); render(); top(); return true; }
      if (b.hasAttribute('data-dx-home')) { st.page = 'home'; st.f = {}; st.q = ''; st.stack = []; render(); top(); return true; }
      if (b.hasAttribute('data-dx-back')) { const y = back(); render(); window.scrollTo(0, y); return true; }
      if (d.dxRm) { delete st.f[d.dxRm]; st.n = PAGE; partial(); return true; }
      if (b.hasAttribute('data-dx-clear')) { st.f = {}; st.n = PAGE; partial(); return true; }
      if (d.dxHide) { const H = hides(), on = !H.includes(d.dxHide), nx = (on ? H + d.dxHide : H.replace(d.dxHide, '')).split('').sort().join(''); Store.set('cfg:dxh', nx || null); st.n = PAGE; partial(); return true; }
      if (b.hasAttribute('data-dx-filters')) { st.fOpen = !st.fOpen; partial(); return true; }
      if (b.hasAttribute('data-dx-more')) { st.n += PAGE * 2; partial(); return true; }
      if (b.hasAttribute('data-dx-shuffle')) { st.seed = (st.seed * 7 + 13) % 100003; partial(); return true; }
      if (b.hasAttribute('data-dx-allc')) { st.allC = !st.allC; partial(); return true; }
      if (d.dxWl != null) {
        const f = C.films[+d.dxWl]; if (!f || !WL) return true;
        WL.set(Object.assign(ref(f), {p: img(f.p, 'w185')}), !WL.has(ref(f)));
        render(); return true;
      }
      if (d.dxLog != null) {
        const f = C.films[+d.dxLog]; if (!f || !logger) return true;
        logger(f.t, f.y, {tm: ref(f).tm, t: f.t, y: f.y, d: f.d.map(k => C.dirs[k]).join(', '), m: f.rt, p: f.p});
        return true;
      }
      return false;
    },
    // the search box filters as you type; the dropdowns apply at once
    attach(el, render) {
      root = el; redraw = render;
      el.addEventListener('input', e => {
        const q = e.target.closest && e.target.closest('[data-dx-q]'); if (!q) return;
        clearTimeout(qt);
        qt = setTimeout(() => { st.q = q.value.slice(0, 80); st.n = PAGE; if (st.page === 'home' && st.q) { st.page = 'browse'; st.f = {}; st.primary = ''; st.stack = []; } partial(); }, 140);
      });
      el.addEventListener('change', e => {
        const s = e.target; if (!s.matches || !C) return;
        if (s.matches('[data-dx-sort]')) { st.sort = SORTS.some(x => x[0] === s.value) ? s.value : 'rec'; st.n = PAGE; }
        else if (s.matches('[data-dx-f]')) { const dim = s.dataset.dxF; if (!DIMS.includes(dim)) return; if (s.value === '') delete st.f[dim]; else st.f[dim] = dim === 'len' ? s.value : +s.value; st.n = PAGE; }
        else return;
        const key = s.matches('[data-dx-sort]') ? '[data-dx-sort]' : '[data-dx-f="' + s.dataset.dxF + '"]';
        partial();
        const again = el.querySelector(key); if (again) again.focus({preventScroll: true});
      });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-dx-q]')) { e.preventDefault(); e.target.blur(); } });
    },
    setLogger(fn) { logger = fn; },
  };
}
