// The Discover catalog (/catalog/catalog.json), loaded once and shared by Discover, the film and director pages and
// the plan builder; plus the small helpers they share: what you've seen and saved, posters, names.
const fxCat = (() => {
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
  const GENRES = {28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror',
    10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'};
  const POLLS = [['Sight and Sound 2022', 'Critics’ poll'], ['Sight and Sound 2022', 'Directors’ poll'], ['They Shoot Pictures, Don’t They', 'The 1,000 Greatest Films'],
    ['They Shoot Pictures, Don’t They', 'The 21st Century’s Most Acclaimed'], ['Criterion Closet', 'Most-picked films']];

  let C = null, status = 'idle', waiting = [], ix = null;
  function load() {
    if (status === 'ready') return Promise.resolve(C);
    if (status === 'loading') return new Promise((res, rej) => waiting.push([res, rej]));
    status = 'loading';
    return new Promise((res, rej) => {
      waiting.push([res, rej]);
      fetch('/catalog/catalog.json', {credentials: 'same-origin'}).then(async r => {
        // no catalog yet: a 404, or the app's own page sent back in its place
        if (r.status === 404 || !/json/.test(r.headers.get('content-type') || '')) { status = 'missing'; throw new Error('missing'); }
        if (!r.ok) throw new Error('http');
        C = prep(await r.json()); status = 'ready';
        waiting.splice(0).forEach(([ok]) => ok(C));
      }).catch(e => { if (status !== 'missing') status = 'error'; waiting.splice(0).forEach(([, no]) => no(e)); });
    });
  }
  function prep(j) {
    const ixf = {}; (j.fields || []).forEach((k, i) => { ixf[k] = i; });
    if (!['tmdb', 'slug', 'title', 'year', 'runtime', 'poster', 'dirs', 'countries', 'genres', 'groups', 'lenses', 'quality', 'reach', 'votes', 'canon', 'original'].every(k => k in ixf) || !Array.isArray(j.films)) throw new Error('shape');
    const arr = v => Array.isArray(v) ? v : [];
    const dirs = arr(j.dirs).map(String), countries = arr(j.countries).map(String);
    const groups = arr(j.groups).map((g, i) => ({i, id: okSlug(g.id) ? g.id : 'g' + i, name: String(g.name || ''), kind: g.kind === 'period' ? 'period' : 'movement', from: +g.from || 0, to: +g.to || 0, desc: String(g.desc || '')}));
    const lenses = arr(j.lenses).map((l, i) => ({i, id: okSlug(l.id) ? l.id : 'l' + i, name: String(l.name || ''), door: String(l.door || ''), desc: String(l.desc || '')}));
    const gname = {}; Object.entries(j.genres || {}).forEach(([id, n]) => { gname[+id] = String(n); });
    // themes (a subject, a setting, a season), when the catalog has them
    const themes = arr(j.themes).map((t, i) => ({i, id: okSlug(t.id) ? t.id : 't' + i, name: String(t.name || ''), desc: String(t.desc || ''), season: Array.isArray(t.season) && t.season.length === 4 ? t.season.map(Number) : null}));
    const thI = ixf.themes;
    const films = j.films.map((r, i) => {
      const f = {i, tm: +r[ixf.tmdb] || 0, slug: okSlug(r[ixf.slug]) ? r[ixf.slug] : '', t: String(r[ixf.title] || ''), y: +r[ixf.year] || 0, rt: +r[ixf.runtime] || 0,
        p: okPath(r[ixf.poster]) ? r[ixf.poster] : '', d: arr(r[ixf.dirs]).filter(k => dirs[k] != null), c: arr(r[ixf.countries]).filter(k => countries[k] != null),
        g: arr(r[ixf.genres]).map(Number), m: arr(r[ixf.groups]).filter(k => groups[k]), l: +r[ixf.lenses] || 0, q: Number(r[ixf.quality]), re: Number(r[ixf.reach]), v: +r[ixf.votes] || 0,
        cn: arr(r[ixf.canon]).map(x => +x || 0), ot: String(r[ixf.original] || ''), lang: String(r[ixf.lang] || ''), th: thI != null ? arr(r[thI]).filter(k => themes[k]) : []};
      if (!Number.isFinite(f.q)) f.q = -1;
      if (!Number.isFinite(f.re)) f.re = -1;
      f.dec = f.y ? Math.floor(f.y / 10) * 10 : 0;
      f.ny = norm(f.t) + '|' + f.y;
      f.s = ' ' + norm([f.t, f.ot].concat(f.d.map(k => dirs[k])).join(' '));
      // where it stands in the polls (one scale for sorting: the main lists first, then the 21st-century list, then the Closet)
      const [ssc, ssd, ts, t21, cc] = [0, 1, 2, 3, 4].map(k => f.cn[k] || 0), main = [ssc, ssd, ts].filter(Boolean), best = main.length ? Math.min(...main) : 0;
      f.poll = best || (t21 ? 1000 + t21 : cc ? 3000 + cc : 1e9);
      f.canon = !!(ssc || ssd || (ts && ts <= 1000) || (t21 && t21 <= 250));
      // "Recommended": how well loved, how widely seen and how often named in the polls, in one score
      let cb = best ? (best <= 100 ? 22 : best <= 250 ? 16 : best <= 500 ? 11 : 7) : 0;
      if (t21) cb = Math.max(cb, t21 <= 100 ? 12 : 6);
      if (cc) cb += 3;
      f.rec = .42 * (f.q >= 0 ? f.q : 50) + .18 * Math.max(0, f.re) + .22 * Math.min(100, Math.log10(1 + f.v) * 25) + cb;
      return f;
    });
    const tally = fn => { const m = new Map(); films.forEach(f => fn(f).forEach(v => m.set(v, (m.get(v) || 0) + 1))); return m; };
    const dslug = dirs.map(n => norm(n).replace(/ /g, '-'));
    return {built: String(j.built || ''), dirs, dslug, countries, cnames: countries.map(cname), groups, lenses, themes, gname, films,
      n: {lens: tally(f => lenses.filter(l => f.l & (1 << l.i)).map(l => l.i)), group: tally(f => f.m), country: tally(f => f.c), decade: tally(f => f.dec ? [f.dec] : []), genre: tally(f => f.g), theme: tally(f => f.th)}};
  }
  // a film in the catalog, by slug, TMDB id, or title and year
  function find(r) {
    if (!C || !r) return null;
    if (!ix) { ix = {slug: new Map(), tm: new Map(), ny: new Map()}; C.films.forEach(f => { if (f.slug) ix.slug.set(f.slug, f); if (f.tm) ix.tm.set(f.tm, f); if (!ix.ny.has(f.ny)) ix.ny.set(f.ny, f); }); }
    return (r.slug && ix.slug.get(r.slug)) || (r.tm && ix.tm.get(+r.tm)) || (r.t ? ix.ny.get(norm(bare(r.t)) + '|' + (+r.y || 0)) : null) || null;
  }
  const dirIndex = s => C ? C.dslug.indexOf(s) : -1;
  // is a theme in season on a day (YYYY-MM-DD)? A season runs from [month, day] to [month, day]
  function inSeason(t, day) {
    if (!t || !t.season) return false;
    const [m1, d1, m2, d2] = t.season, md = +day.slice(5, 7) * 100 + +day.slice(8, 10), a = m1 * 100 + d1, b = m2 * 100 + d2;
    return a <= b ? md >= a && md <= b : md >= a || md <= b;
  }

  // ---- what you've seen (diary, plan, Letterboxd import) and what's on your watchlist ----
  // seen(ref) → '' (no), '-' (seen, no date) or the latest date; the entries come with it for a film's page
  function marks(WL) {
    // before there's a plan (building the first one), the diary still counts
    const seen = new Map(), S = (typeof Store !== 'undefined' && Store.data) || {}, D = window.D || {F: [], W: [], WM: []};
    const add = (t, y, tm, slug, e) => {
      [+tm > 0 ? 'tm' + tm : '', slug ? 's:' + slug : '', norm(bare(t)) + '|' + (+y || 0)].forEach(k => { if (!k) return; const l = seen.get(k) || []; if (e) l.push(e); seen.set(k, l); });
    };
    try {
      if (D && typeof fxDiary === 'function') {
        fxDiary(D, S).forEach(e => { const md = e.md || {}; if (e.i != null) { const r = D.F[e.i]; add(r[0], r[1], r[16], r[5], e); } else add(md.t || e.t, md.y || e.y || fxYear(e.t), md.tm, '', e); });
        if (typeof fxWatched === 'function') fxWatched(D, S).forEach(e => { const md = e.md || {}; if (e.i != null) { const r = D.F[e.i]; add(r[0], r[1], r[16], r[5]); } else add(md.t || e.t, md.y || e.y, md.tm, ''); });
      }
    } catch (e) {}
    const keys = r => [+r.tm > 0 ? 'tm' + r.tm : '', r.slug ? 's:' + r.slug : '', norm(bare(r.t)) + '|' + (+r.y || 0)];
    const entries = r => { for (const k of keys(r)) if (k && seen.has(k)) return seen.get(k); return null; };
    const memo = new Map();
    const wlRef = r => ({t: r.t, y: r.y, tm: +r.tm > 0 ? +r.tm : 0});
    return {
      seen: r => { const key = r.i != null ? r.i : keys(r).join('#'); if (!memo.has(key)) { const l = entries(r); memo.set(key, l ? (l[0] && l[0].date) || '-' : ''); } return memo.get(key); },
      entries: r => (entries(r) || []).filter(Boolean),
      wl: r => !!(WL && WL.has(wlRef(r))),
    };
  }
  // posters: the catalog's own, or a placeholder with the title
  function poster(f, w, cls) {
    const src = img(f.p, w);
    return `<span class="fx-pos dx-pos${cls ? ' ' + cls : ''}${src ? '' : ' dx-nop'}">${src ? `<img loading="lazy" decoding="async" alt="" src="${src}">` : `<span class="dx-npt">${esc(f.t)}</span>`}</span>`;
  }
  // a film in a poster grid, linking to its page
  function cell(f, mk) {
    const s = mk.seen(f), w = mk.wl(f);
    return `<li><a class="dx-cell" href="${esc(fxNav.film(f))}" data-app title="${esc(f.t + (f.y ? ' (' + f.y + ')' : ''))}">${poster(f, 'w185')}${s ? '<i class="dx-mk dx-mseen" aria-label="Watched"></i>' : w ? '<i class="dx-mk dx-mwl" aria-label="On your watchlist"></i>' : ''}</a>`
      + `<span class="dx-ct">${esc(f.t)}</span><span class="dx-cy">${f.y || ''}</span></li>`;
  }
  const attr = () => `<p class="fx-muted dx-attr">Film data and posters from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>`;
  return {load, get: () => C, status: () => status, retry: () => { if (status !== 'ready' && status !== 'loading') status = 'idle'; }, find, dirIndex, marks, poster, cell, attr, inSeason,
    esc, num, norm, bare, okPath, okSlug, img, hm, longDay, cname, GENRES, POLLS};
})();
