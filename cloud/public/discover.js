// Discover: a catalog of about ten thousand films for everyone on TVC15, kept apart from anyone's plan or watchlist.
// Ways in for different kinds of viewers, the movements, eras, national cinemas, decades and genres; filters that
// stack, so the list keeps narrowing (and can hide what you've seen or already saved); Letterboxd-style sorting.
// Every list has its own address (/discover/movement/french-new-wave?genre=crime&sort=old), so Back and reloading work;
// each film opens its own page (filmpage.js).
// fxDiscover({wl, top}) → a tab for mountFocus (top(): anything to show first on the front page: Popular) ({end: true}: it sits after Diary); fromUrl(path, params) shows an address,
// url() is the address of what's on screen; attach(root, render) adds the typing and dropdown handling.
function fxDiscover(o) {
  const U = fxCat, esc = U.esc, num = U.num, norm = U.norm;
  const WL = (o && o.wl) || null;
  const ERAS = [[0, 'The Silent and Early Sound Era'], [1940, 'Postwar Cinema'], [1956, 'The New Waves'], [1980, 'Late Twentieth Century'], [2000, 'The Twenty-First Century']];
  const LENGTHS = [['short', 'Short films (under 40 min)', m => m > 0 && m < 40], ['u90', 'Under 90 minutes', m => m >= 40 && m < 90], ['mid', '90 minutes to 2 hours', m => m >= 90 && m <= 120],
    ['long', 'Over 2 hours', m => m > 120], ['epic', 'Over 3 hours', m => m > 180]];
  const SORTS = [['rec', 'Recommended'], ['pop', 'Popularity'], ['rated', 'Rating, highest first'], ['poll', 'Poll ranking'], ['new', 'Release date, newest first'], ['old', 'Release date, oldest first'],
    ['title', 'Title'], ['short', 'Length, shortest first'], ['long', 'Length, longest first'], ['shuffle', 'Shuffle']];
  const PAGE = 60;
  let C = null, redraw = null, root = null, qt = null, pending = null;
  const st = {page: 'home', f: {}, primary: '', q: '', sort: 'rec', n: PAGE, fOpen: false, seed: 1, allC: false};
  const shownN = new Map();  // how far down each list you'd got, so Back returns to the same place
  const hides = () => String((typeof Store !== 'undefined' && Store.data['cfg:dxh']) || '');
  let asked = false;
  function ready() {
    if (C) return true;
    const c = U.get();
    if (c) { C = c; if (pending) { const pd = pending; pending = null; fromUrl(...pd); } return true; }
    // fetched once; after a failure, only "Try again" fetches it again
    if (U.status() === 'idle' && !asked) { asked = true; U.load().then(() => { asked = false; if (redraw) redraw(); }, () => { asked = false; if (redraw) redraw(); }); }
    return false;
  }

  // ---- addresses: the list on screen ↔ /discover/<way in>/<which>?<more filters>&sort=… ----
  const DIMS = ['lens', 'group', 'theme', 'country', 'genre', 'decade', 'len'];
  const gslug = g => norm(C.gname[g] || '').replace(/ /g, '-');
  const PARAM = {lens: 'collection', group: 'movement', theme: 'theme', country: 'country', genre: 'genre', decade: 'decade', len: 'length'};
  function enc(dim, v) {
    return dim === 'lens' ? C.lenses[v].id : dim === 'group' ? C.groups[v].id : dim === 'theme' ? C.themes[v].id : dim === 'country' ? C.countries[v].toLowerCase() : dim === 'genre' ? gslug(v) : dim === 'decade' ? v + 's' : v;
  }
  function dec(dim, s) {
    s = String(s || '').toLowerCase();
    if (dim === 'lens') { const l = C.lenses.find(x => x.id === s); return l ? l.i : null; }
    if (dim === 'group') { const g = C.groups.find(x => x.id === s); return g ? g.i : null; }
    if (dim === 'theme') { const t = (C.themes || []).find(x => x.id === s); return t ? t.i : null; }
    if (dim === 'country') { const k = C.countries.findIndex(c => c.toLowerCase() === s); return k >= 0 ? k : null; }
    if (dim === 'genre') { const g = Object.keys(C.gname).find(k => gslug(+k) === s); return g ? +g : null; }
    if (dim === 'decade') { const m = s.match(/^(\d{3}0)s?$/); return m ? +m[1] : null; }
    if (dim === 'len') return LENGTHS.some(l => l[0] === s) ? s : null;
    return null;
  }
  function url() {
    if (!C || st.page === 'home') return '/discover';
    const pr = st.primary && st.f[st.primary] != null ? st.primary : '';
    let p = '/discover/all';
    if (pr) p = '/discover/' + (pr === 'group' ? (C.groups[st.f.group].kind === 'period' ? 'era' : 'movement') : PARAM[pr]) + '/' + encodeURIComponent(enc(pr, st.f[pr]));
    const q = new URLSearchParams();
    DIMS.forEach(d => { if (d !== pr && st.f[d] != null) q.set(PARAM[d], enc(d, st.f[d])); });
    if (st.q) q.set('q', st.q);
    if (st.sort !== defaultSort()) q.set('sort', st.sort);
    const s = q.toString();
    return p + (s ? '?' + s : '');
  }
  function defaultSort() {
    const lid = st.primary === 'lens' && st.f.lens != null && C.lenses[st.f.lens] ? C.lenses[st.f.lens].id : '';
    return lid === 'essentials' ? 'pop' : lid === 'canon' ? 'poll' : 'rec';
  }
  function fromUrl(path, params) {
    if (!C && !U.get()) { pending = [path, params]; ready(); return; }
    if (!C) C = U.get();
    const parts = path.replace(/^\/discover\/?/, '').split('/').filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    st.f = {}; st.primary = ''; st.fOpen = false;
    st.q = String(params.get('q') || '').slice(0, 80);
    if (!parts.length) { st.page = st.q ? 'browse' : 'home'; }
    else {
      st.page = 'browse';
      const way = {collection: 'lens', movement: 'group', era: 'group', theme: 'theme', country: 'country', genre: 'genre', decade: 'decade', length: 'len'}[parts[0]];
      if (way && parts[1] != null) { const v = dec(way, parts[1]); if (v != null) { st.f[way] = v; st.primary = way; } }
    }
    DIMS.forEach(d => { if (d === st.primary) return; const raw = params.get(PARAM[d]); if (raw != null) { const v = dec(d, raw); if (v != null) st.f[d] = v; } });
    const s = params.get('sort');
    st.sort = SORTS.some(x => x[0] === s) ? s : defaultSort();
    st.n = shownN.get(path + '?' + params.toString()) || PAGE;
  }
  // a change made on the page itself: the address follows without a new step in history
  const keep = () => { shownN.set(url().replace(/^([^?]*)$/, '$1?'), st.n); if (typeof fxNav !== 'undefined') fxNav.replace(url()); };

  // ---- filtering: every filter narrows what the others leave ----
  function pass(f, skip) {
    const x = st.f;
    if (skip !== 'lens' && x.lens != null && !(f.l & (1 << x.lens))) return false;
    if (skip !== 'group' && x.group != null && !f.m.includes(x.group)) return false;
    if (skip !== 'theme' && x.theme != null && !(f.th || []).includes(x.theme)) return false;
    if (skip !== 'country' && x.country != null && !f.c.includes(x.country)) return false;
    if (skip !== 'genre' && x.genre != null && !f.g.includes(x.genre)) return false;
    if (skip !== 'decade' && x.decade != null && f.dec !== x.decade) return false;
    if (skip !== 'len' && x.len != null) { const L = LENGTHS.find(l => l[0] === x.len); if (L && !L[2](f.rt)) return false; }
    return true;
  }
  const vals = (f, dim) => dim === 'lens' ? C.lenses.filter(l => f.l & (1 << l.i)).map(l => l.i) : dim === 'group' ? f.m : dim === 'theme' ? (f.th || []) : dim === 'country' ? f.c : dim === 'genre' ? f.g
    : dim === 'decade' ? (f.dec ? [f.dec] : []) : LENGTHS.filter(l => l[2](f.rt)).map(l => l[0]);
  const rnd = (i, s) => { let h = (i + 1) * 2654435761 ^ s * 40503; h = Math.imul(h ^ h >>> 15, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^ h >>> 16) >>> 0; };
  const sortTitle = f => f.t.replace(/^(the|a|an)\s+/i, '');
  function sortFn(k) {
    const by = (a, b) => b.rec - a.rec;
    return k === 'pop' ? (a, b) => b.v - a.v || by(a, b) : k === 'rated' ? (a, b) => b.q - a.q || b.v - a.v : k === 'poll' ? (a, b) => a.poll - b.poll || by(a, b)
      : k === 'new' ? (a, b) => b.y - a.y || by(a, b) : k === 'old' ? (a, b) => (a.y || 9999) - (b.y || 9999) || by(a, b) : k === 'title' ? (a, b) => sortTitle(a).localeCompare(sortTitle(b), 'en')
      : k === 'short' ? (a, b) => (a.rt || 1e4) - (b.rt || 1e4) || by(a, b) : k === 'long' ? (a, b) => b.rt - a.rt || by(a, b) : k === 'shuffle' ? (a, b) => rnd(a.i, st.seed) - rnd(b.i, st.seed) : by;
  }
  function compute() {
    const mk = U.marks(WL), words = norm(st.q).split(' ').filter(Boolean), H = hides();
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
  const label = (dim, v) => dim === 'lens' ? (C.lenses[v] || {}).name : dim === 'group' ? (C.groups[v] || {}).name : dim === 'theme' ? ((C.themes || [])[v] || {}).name : dim === 'country' ? C.cnames[v] : dim === 'genre' ? C.gname[v]
    : dim === 'decade' ? v + 's' : (LENGTHS.find(l => l[0] === v) || [])[1];
  const filmsN = n => num(n) + (n === 1 ? ' film' : ' films');
  const link = (href, body, cls) => `<a${cls ? ` class="${cls}"` : ''} href="${esc(href)}" data-app>${body}</a>`;
  function search() {
    return `<div class="dx-q"><input type="search" class="fx-pick-q" data-dx-q enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Search titles and directors" aria-label="Search titles and directors" value="${esc(st.q)}"></div>`;
  }
  function waiting() {
    const s = U.status();
    if (s === 'missing') return `<section class="fx-card"><h2>The catalog is on its way</h2><p class="fx-muted">It’s being put together right now. Check back in a little while.</p></section>`;
    if (s === 'error') return `<section class="fx-card"><h2>The catalog didn’t load</h2><p class="fx-muted">Check your connection and try again.</p><div class="fx-row"><button type="button" class="fx-btn" data-dx-retry>Try again</button></div></section>`;
    return `<p class="fx-muted dx-wait">Loading the catalog…</p>`;
  }
  function home() {
    return `<header class="fx-head dx-head"><div class="fx-hrow"><h1 class="fx-h1">Discover</h1></div>
      <p class="dx-lede">${num(C.films.length)} films, from the silent era to now. Find a way in by movement, country or mood, and save what you like to your watchlist.</p></header>${search()}<div class="dx-dyn">${homeBody()}</div>`;
  }
  const gurl = g => '/discover/' + (g.kind === 'period' ? 'era' : 'movement') + '/' + g.id;
  function homeBody() {
    const n = C.n;
    let h = (o && o.top ? o.top() : '') + `<section class="fx-card dx-sec"><h2>Where to start</h2><ul class="dx-doors">` + C.lenses.filter(l => n.lens.get(l.i)).map(l =>
      `<li>${link('/discover/collection/' + l.id, `<span class="dx-door">${esc(l.door)}</span><b>${esc(l.name)}</b><span class="dx-dd">${esc(l.desc)}</span><span class="dx-n">${filmsN(n.lens.get(l.i))}</span>`)}</li>`).join('') + '</ul></section>';
    // themes: what films are about; one in season comes first
    const today = new Date().toISOString().slice(0, 10), ths = (C.themes || []).filter(t => (n.theme.get(t.i) || 0) >= 8)
      .sort((a, b) => U.inSeason(b, today) - U.inSeason(a, today) || a.name.localeCompare(b.name, 'en'));
    if (ths.length) h += `<section class="fx-card dx-sec"><h2>Themes</h2><p class="fx-muted">What the films are about: a subject, a place, a season.</p><div class="dx-chips">${ths.map(t => link('/discover/theme/' + t.id, `${esc(t.name)} <span>${num(n.theme.get(t.i))}</span>`, 'dx-chip' + (U.inSeason(t, today) ? ' dx-season' : ''))).join('')}</div></section>`;
    const row = g => `<li>${link(gurl(g), `<b>${esc(g.name)}</b><span class="dx-yrs">${g.from}–${g.to >= new Date().getFullYear() ? 'now' : g.to}</span><span class="dx-n">${num(n.group.get(g.i))}</span>`)}</li>`;
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
    h += `<section class="fx-card dx-sec"><h2>National Cinemas</h2><div class="dx-chips">${top.map(([c, k]) => link('/discover/country/' + C.countries[c].toLowerCase(), `${esc(C.cnames[c])} <span>${num(k)}</span>`, 'dx-chip')).join('')}</div>`
      + (cs.length > 24 ? `<button type="button" class="fx-link dx-allc" data-dx-allc>${st.allC ? 'Show the top 24' : 'All ' + cs.length + ' countries, A to Z'}</button>` : '') + '</section>';
    const decs = [...n.decade.entries()].sort((a, b) => a[0] - b[0]);
    h += `<section class="fx-card dx-sec"><h2>Decades</h2><div class="dx-chips">${decs.map(([d, k]) => link('/discover/decade/' + d + 's', `${d}s <span>${num(k)}</span>`, 'dx-chip')).join('')}</div></section>`;
    const gs = [...n.genre.entries()].filter(([g]) => C.gname[g] && g !== 10770).sort((a, b) => C.gname[a[0]].localeCompare(C.gname[b[0]], 'en'));
    h += `<section class="fx-card dx-sec"><h2>Genres</h2><div class="dx-chips">${gs.map(([g, k]) => link('/discover/genre/' + gslug(g), `${esc(C.gname[g])} <span>${num(k)}</span>`, 'dx-chip')).join('')}</div></section>`;
    h += `<section class="fx-card dx-sec"><div class="fx-row">${link('/discover/all', `Browse all ${num(C.films.length)} films`, 'fx-btn primary')}</div></section>`;
    return h + attr();
  }
  const attr = () => `<p class="fx-muted dx-attr">Film data and posters from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.${C && C.built ? ' Catalog updated ' + esc(U.longDay(C.built)) + '.' : ''}</p>`;
  function browse() {
    const pr = st.primary && st.f[st.primary] != null ? st.primary : DIMS.find(d => st.f[d] != null) || '';
    let eye = 'The catalog', title = st.q && !pr ? 'Search' : 'All films', desc = '';
    if (pr === 'group') { const g = C.groups[st.f.group]; eye = (g.kind === 'period' ? 'Era' : 'Movement') + ', ' + g.from + '–' + (g.to >= new Date().getFullYear() ? 'now' : g.to); title = g.name; desc = g.desc; }
    else if (pr === 'lens') { const l = C.lenses[st.f.lens]; eye = l.door || 'Collection'; title = l.name; desc = l.desc; }
    else if (pr === 'theme') { const t = C.themes[st.f.theme]; eye = 'Theme'; title = t.name; desc = t.desc; }
    else if (pr === 'country') { eye = 'National cinema'; title = 'Cinema of ' + C.cnames[st.f.country]; }
    else if (pr === 'decade') { eye = 'Decade'; title = 'The ' + st.f.decade + 's'; }
    else if (pr === 'genre') { eye = 'Genre'; title = C.gname[st.f.genre]; }
    else if (pr === 'len') { eye = 'Length'; title = label('len', st.f.len); }
    return `<header class="fx-head dx-head"><div class="fx-hrow">${link('/discover', 'Discover', 'fx-link fx-bk')}</div>
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
    h += `<p class="dx-count"><b>${filmsN(R.list.length)}</b>${hid.length ? `<span>, ${hid.join(' and ')} hidden</span>` : ''}</p>`;
    if (!R.list.length) h += `<div class="fx-blank"><p class="fx-muted dx-none">Nothing matches all of these. Remove a filter${R.hs || R.hw ? ' or show the films you’ve hidden' : ''} to see more.</p></div>`;
    else h += `<ul class="dx-grid">${R.list.slice(0, st.n).map(f => U.cell(f, R.mk)).join('')}</ul>`;
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
    const og = (name, list) => list ? `<optgroup label="${name}">${list}</optgroup>` : '';
    let h = '<div class="dx-panel">';
    h += sel('lens', ['Collection', 'Any collection'], C.lenses.map(l => [l.i, l.name]));
    h += sel('group', ['Movement or era', 'Any movement or era'], op => og('Movements', groups('movement').map(op).join('')) + og('Eras and golden ages', groups('period').map(op).join('')));
    if ((C.themes || []).length) h += sel('theme', ['Theme', 'Any theme'], C.themes.map(t => [t.i, t.name]).sort((a, b) => a[1].localeCompare(b[1], 'en')));
    h += sel('country', ['Country', 'Any country'], C.countries.map((c, i) => [i, C.cnames[i]]).sort((a, b) => a[1].localeCompare(b[1], 'en')));
    h += sel('genre', ['Genre', 'Any genre'], Object.keys(C.gname).map(Number).filter(g => g !== 10770).map(g => [g, C.gname[g]]).sort((a, b) => a[1].localeCompare(b[1], 'en')));
    h += sel('decade', ['Decade', 'Any decade'], [...C.n.decade.keys()].sort((a, b) => b - a).map(d => [d, d + 's']));
    h += sel('len', ['Length', 'Any length'], LENGTHS.map(l => [l[0], l[1]]));
    return h + '</div>';
  }
  function partial() {
    const dyn = root && root.querySelector('.dx-dyn');
    if (!dyn) { if (redraw) redraw(); return; }
    dyn.innerHTML = st.page === 'home' ? homeBody() : tools() + attr();
  }

  return {
    id: 'discover', label: {en: 'Discover', fa: 'Discover'}, end: true,
    view() {
      if (!ready()) return `<header class="fx-head dx-head"><div class="fx-hrow"><h1 class="fx-h1">Discover</h1></div></header>` + waiting();
      return st.page === 'browse' ? browse() : home();
    },
    url, fromUrl,
    click(b, render) {
      const d = b.dataset;
      if (b.hasAttribute('data-dx-retry')) { U.retry(); render(); return true; }
      if (!C) return false;
      if (d.dxRm) { delete st.f[d.dxRm]; if (st.primary === d.dxRm) st.primary = ''; st.n = PAGE; partial(); keep(); return true; }
      if (b.hasAttribute('data-dx-clear')) { st.f = {}; st.primary = ''; st.n = PAGE; partial(); keep(); return true; }
      if (d.dxHide) { const H = hides(), on = !H.includes(d.dxHide), nx = (on ? H + d.dxHide : H.replace(d.dxHide, '')).split('').sort().join(''); Store.set('cfg:dxh', nx || null); st.n = PAGE; partial(); return true; }
      if (b.hasAttribute('data-dx-filters')) { st.fOpen = !st.fOpen; partial(); return true; }
      if (b.hasAttribute('data-dx-more')) { st.n += PAGE * 2; partial(); keep(); return true; }
      if (b.hasAttribute('data-dx-shuffle')) { st.seed = (st.seed * 7 + 13) % 100003; partial(); return true; }
      if (b.hasAttribute('data-dx-allc')) { st.allC = !st.allC; partial(); return true; }
      return false;
    },
    // the search box filters as you type; the dropdowns apply at once
    attach(el, render) {
      root = el; redraw = render;
      el.addEventListener('input', e => {
        const q = e.target.closest && e.target.closest('[data-dx-q]'); if (!q || !C) return;
        clearTimeout(qt);
        qt = setTimeout(() => {
          st.q = q.value.slice(0, 80); st.n = PAGE;
          // typing on the front page turns it into a search of everything: a new step in history, then the address keeps up
          if (st.page === 'home' && st.q) { st.page = 'browse'; st.f = {}; st.primary = ''; partial(); if (typeof fxNav !== 'undefined') fxNav.note(url()); return; }
          partial(); keep();
        }, 140);
      });
      el.addEventListener('change', e => {
        const s = e.target; if (!s.matches || !C) return;
        if (s.matches('[data-dx-sort]')) { st.sort = SORTS.some(x => x[0] === s.value) ? s.value : 'rec'; st.n = PAGE; }
        else if (s.matches('[data-dx-f]')) { const dim = s.dataset.dxF; if (!DIMS.includes(dim)) return; if (s.value === '') { delete st.f[dim]; if (st.primary === dim) st.primary = ''; } else st.f[dim] = dim === 'len' ? s.value : +s.value; st.n = PAGE; }
        else return;
        const key = s.matches('[data-dx-sort]') ? '[data-dx-sort]' : '[data-dx-f="' + s.dataset.dxF + '"]';
        partial(); keep();
        const again = el.querySelector(key); if (again) again.focus({preventScroll: true});
      });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-dx-q]')) { e.preventDefault(); e.target.blur(); } });
    },
  };
}
