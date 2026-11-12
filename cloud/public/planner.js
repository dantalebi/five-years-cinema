// The plan builder: a plan of one's own, made from the Discover catalog.
// You choose how long, how many films a week, the balance between the four strands (film history, great directors,
// recent films, popular favorites), what else to make room for (documentaries, animation, experimental film), which
// movements or national cinemas to go deeper on, and whether your watchlist goes in. Films you've seen are left out.
// The schedule follows the principles of the original five-year plan:
//   · Great directors: chosen in proportion to their standing (D'Hondt); each enters early with a key work, and the rest
//     of their films follow in the order they were made, spread across the plan.
//   · Film history: each movement or era opens with its landmarks and deepens over time; the periods come round in turn.
//   · Recent films: the most acclaimed first, from many countries. Popular favorites: the most widely seen first.
//   · Every week mixes the strands in proportion, never two films by one director in a week, and (if you like) keeps
//     one open slot for anything, with a suggestion.
// fxPlanner({wl, plan, save}) → a tab for mountFocus ({hidden: true}, at /plan/new); host(el) runs it without the app.
function fxPlanner(o) {
  const U = fxCat, esc = U.esc, num = U.num;
  const PRESETS = [
    ['balanced', 'Balanced', 'An even mix of film history, great directors, recent films and popular favorites.', {H: .30, A: .30, C: .22, P: .18}],
    ['history', 'Film history first', 'Movements, eras and landmarks lead the way, with the great directors close behind.', {H: .45, A: .30, C: .15, P: .10}],
    ['directors', 'Great directors', 'Whole filmographies, each in the order the films were made.', {H: .20, A: .55, C: .15, P: .10}],
    ['starter', 'New to film', 'Starts with the films most people have seen, then goes further.', {H: .18, A: .14, C: .28, P: .40}],
    ['recent', 'The new century', 'Mostly films from 2000 on, with the classics they grew out of.', {H: .10, A: .22, C: .55, P: .13}],
  ];
  const EXTRAS = [['doc', 'Documentaries', .07], ['anim', 'Animation', .05], ['exp', 'Experimental film', .06]];
  const LANE_NAME = {H: 'Film history', A: 'Great directors', C: 'Recent films', P: 'Popular favorites', F: 'Open slot'};
  const cfg = {years: 2, per: 4, preset: 'balanced', extra: {doc: true, anim: true, exp: false}, focusG: [], focusC: [], wl: true, open: true};
  let plan = null, busy = false, err = '', saved = false, redraw = null;

  // ================= the generator =================
  function generate(C, mk, wlist) {
    const weeks = cfg.years * 52, per = Math.max(2, cfg.per), open = cfg.open ? 1 : 0, core = weeks * (per - open), ty = new Date().getFullYear();
    const bit = id => { const l = C.lenses.find(x => x.id === id); return l ? 1 << l.i : 0; };
    const AV = bit('avant-garde');
    const usable = f => f.tm > 0 && f.y && f.y <= ty && !mk.seen(f) && (f.rt >= 40 || (f.rt === 0 && f.canon) || (cfg.extra.exp && (f.l & AV) && f.rt > 0));
    const pool = C.films.filter(usable);
    const taken = new Map();  // catalog index → {lane, g (group), first}
    const fG = new Set(cfg.focusG), fC = new Set(cfg.focusC);
    // how many films each strand gets
    const w = Object.assign({}, PRESETS.find(p => p[0] === cfg.preset)[3]);
    let xs = 0; EXTRAS.forEach(([k, , share]) => { if (cfg.extra[k]) { w[k] = share; xs += share; } });
    ['H', 'A', 'C', 'P'].forEach(k => { w[k] *= (1 - xs); });
    const quota = {}; let rest = core;
    const keys = Object.keys(w), raw = keys.map(k => w[k] * core);
    keys.forEach((k, i) => { quota[k] = Math.floor(raw[i]); rest -= quota[k]; });
    keys.map((k, i) => [k, raw[i] - quota[k]]).sort((a, b) => b[1] - a[1]).slice(0, rest).forEach(([k]) => quota[k]++);
    const lanes = {H: [], A: [], C: [], P: [], doc: [], anim: [], exp: []};
    const take = (f, lane, extra) => { taken.set(f.i, Object.assign({lane}, extra || {})); lanes[lane].push(f); };
    const free = f => !taken.has(f.i);
    // a D'Hondt allocation: seats to the parties in proportion to their weights
    function dhondt(parties, seats) {
      const n = new Map(parties.map(p => [p.id, 0]));
      for (let s = 0; s < seats; s++) {
        let best = null, bv = -1;
        parties.forEach(p => { const k = n.get(p.id); if (k >= p.max) return; const v = p.w / (k + 1); if (v > bv) { bv = v; best = p; } });
        if (!best) break;
        n.set(best.id, n.get(best.id) + 1);
      }
      return n;
    }
    // ---- your watchlist goes in first, in the strand it belongs to ----
    const extraRows = [];
    if (cfg.wl && wlist.length) {
      const cap = Math.round(core * .4);
      wlist.slice(0, cap).forEach(x => {
        const f = U.find(x);
        if (f) { if (!free(f) || mk.seen(f)) return; take(f, f.y >= 2000 ? 'C' : f.m.length || f.canon ? 'H' : f.v >= 5000 ? 'P' : 'H', {wl: 1}); }
        else if (x.t && !mk.seen(x)) extraRows.push({t: x.t, y: +x.y || 0, tm: +x.tm || 0, p: String(x.p || '').replace(/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+/, ''), lane: (+x.y || 0) >= 2000 ? 'C' : 'H'});
      });
    }
    // ---- great directors ----
    const byDir = new Map(), allByDir = new Map();
    C.films.forEach(f => { const d = f.d[0]; if (d == null) return; (allByDir.get(d) || allByDir.set(d, []).get(d)).push(f); });
    pool.forEach(f => { const d = f.d[0]; if (d == null || !free(f)) return; (byDir.get(d) || byDir.set(d, []).get(d)).push(f); });
    const stature = d => {
      const all = allByDir.get(d) || [];
      let s = all.reduce((a, f) => a + (f.canon ? 12 : 0) + Math.max(0, f.rec - 55), 0);
      if (all.some(f => f.m.some(g => fG.has(g)))) s *= 1.6;
      if (all.some(f => f.c.some(c => fC.has(c)))) s *= 1.4;
      return s;
    };
    const seatsA = quota.A - lanes.A.length, K = Math.max(4, Math.min(80, Math.round(seatsA / (cfg.preset === 'directors' ? 7 : 5))));
    const dparties = [...byDir.entries()].filter(([d]) => (allByDir.get(d) || []).length >= 3).map(([d, fs]) => ({id: d, w: stature(d), max: fs.length})).filter(p => p.w > 0)
      .sort((a, b) => b.w - a.w).slice(0, K);
    const dseats = dhondt(dparties, Math.max(0, seatsA));
    const R = {};
    dparties.filter(p => dseats.get(p.id) > 0).sort((a, b) => b.w - a.w).forEach((p, rank) => {
      const fs = byDir.get(p.id).slice().sort((a, b) => b.rec - a.rec).slice(0, dseats.get(p.id));
      fs.forEach((f, j) => take(f, 'A', {d: p.id, first: j === 0, rank}));
      R[p.id] = {rank, n: fs.length};
    });
    const auteurs = new Set(Object.keys(R).map(Number));
    // "your first Ozu" only when it really is
    const seenDir = new Set([...auteurs].filter(d => (allByDir.get(d) || []).some(f => mk.seen(f))));
    // ---- film history: movements and eras, each opening with its landmarks ----
    const gfilms = new Map();
    const histOk = f => free(f) && f.y < 2000 && !auteurs.has(f.d[0]);
    pool.forEach(f => { if (!histOk(f)) return; const gs = f.m.length ? f.m : f.canon ? [-1] : []; gs.forEach(g => (gfilms.get(g) || gfilms.set(g, []).get(g)).push(f)); });
    const imp = f => f.rec + (f.canon ? 10 : 0);
    gfilms.forEach(l => l.sort((a, b) => imp(b) - imp(a)));
    const gparties = [...gfilms.entries()].map(([g, l]) => ({id: g, w: Math.sqrt((C.n.group.get(g) || l.length) + 4) * (fG.has(g) ? 3 : 1) * (g === -1 ? 1.5 : 1), max: l.length}));
    const gseats = dhondt(gparties, Math.max(0, quota.H - lanes.H.length));
    gparties.forEach(p => {
      let k = gseats.get(p.id), j = 0; const l = gfilms.get(p.id);
      for (const f of l) { if (k <= 0) break; if (!free(f)) continue; take(f, 'H', {g: p.id, gj: j++}); k--; }
    });
    // ---- documentaries, animation, experimental film ----
    const fill = (lane, test, score, perDir) => {
      const cnt = new Map();
      pool.filter(f => free(f) && test(f)).sort((a, b) => score(b) - score(a)).forEach(f => {
        if (lanes[lane].length >= (quota[lane] || 0)) return;
        const d = f.d[0], c = cnt.get(d) || 0; if (perDir && c >= perDir) return;
        cnt.set(d, c + 1); take(f, lane);
      });
    };
    if (cfg.extra.doc) fill('doc', f => f.g.includes(99), f => f.rec, 3);
    if (cfg.extra.anim) fill('anim', f => f.g.includes(16), f => f.rec, 3);
    if (cfg.extra.exp) fill('exp', f => !!(f.l & AV), f => f.rec, 4);
    // ---- recent films, from many countries ----
    const cfilms = new Map();
    pool.forEach(f => { if (!free(f) || f.y < 2000) return; const c = f.c[0] != null ? f.c[0] : -1; (cfilms.get(c) || cfilms.set(c, []).get(c)).push(f); });
    const cscore = f => f.rec + (f.cn[3] ? 8 : 0) + (f.c.some(c => fC.has(c)) ? 12 : 0);
    cfilms.forEach(l => l.sort((a, b) => cscore(b) - cscore(a)));
    const cparties = [...cfilms.entries()].map(([c, l]) => ({id: c, w: Math.sqrt(l.length) * (fC.has(c) ? 3 : 1) * (l[0] ? cscore(l[0]) / 60 : 1), max: l.length}));
    const cseats = dhondt(cparties, Math.max(0, quota.C - lanes.C.length));
    cparties.forEach(p => { let k = cseats.get(p.id); for (const f of cfilms.get(p.id)) { if (k <= 0) break; if (free(f)) { take(f, 'C'); k--; } } });
    // ---- popular favorites ----
    const pscore = f => Math.log10(1 + f.v) * (f.q >= 0 ? .6 + f.q / 250 : .8);
    fill('P', f => f.v >= 3000, pscore, 3);
    // a strand that ran short hands its films to the others
    let short = core - [...taken.values()].length - extraRows.length;
    for (const [lane, test, score] of [['C', f => f.y >= 2000, f => f.rec], ['H', f => f.y < 2000, imp], ['P', f => f.v >= 1500, pscore], ['A', () => true, f => f.rec]]) {
      if (short <= 0) break;
      const before = lanes[lane].length; quota[lane] = before + short;
      fill(lane, test, score, 4);
      short -= lanes[lane].length - before;
    }

    // ================= the order: where each film falls in the plan (0 = first week, 1 = last) =================
    const pos = new Map();
    const nd = Object.keys(R).length || 1;
    // directors: the key work early (the greatest first), the rest in the order made, spread across the plan
    Object.entries(R).forEach(([d, r]) => {
      const fs = lanes.A.filter(f => taken.get(f.i).d === +d), first = fs.find(f => taken.get(f.i).first), others = fs.filter(f => f !== first).sort((a, b) => a.y - b.y);
      if (first) pos.set(first.i, .22 * r.rank / nd);
      others.forEach((f, j) => pos.set(f.i, .18 + .82 * (j + .5) / others.length + .01 * (r.rank % 7)));
    });
    // movements and eras: landmarks first, deeper cuts later; the earlier periods a little ahead of the later ones
    const order = C.groups.map(g => g.i).sort((a, b) => C.groups[a].from - C.groups[b].from), chron = new Map(order.map((g, k) => [g, k / Math.max(1, order.length)]));
    const gcount = new Map(); lanes.H.forEach(f => { const g = taken.get(f.i).g; gcount.set(g, (gcount.get(g) || 0) + 1); });
    // each movement opens with a landmark that's acclaimed and widely seen; the movements whose landmarks are best known open first
    const land = f => imp(f) + 6 * Math.log10(1 + f.v);
    const byG = new Map(); lanes.H.forEach(f => { const g = taken.get(f.i).g; (byG.get(g) || byG.set(g, []).get(g)).push(f); });
    byG.forEach(l => { l.sort((a, b) => land(b) - land(a)); l.forEach((f, j) => { taken.get(f.i).gj = j; }); });
    const grank = new Map([...byG.entries()].sort((a, b) => land(b[1][0]) - land(a[1][0])).map(([g], k, all) => [g, k / Math.max(1, all.length)]));
    lanes.H.forEach(f => { const t = taken.get(f.i), n = gcount.get(t.g) || 1; pos.set(f.i, t.wl ? .5 : Math.pow(((t.gj || 0) + .5) / n, 1.25) * .8 + .14 * (grank.get(t.g) || .5) + .06 * (chron.get(t.g) || .5)); });
    const spread = (list, front) => list.forEach((f, k) => { if (!pos.has(f.i)) pos.set(f.i, Math.pow((k + .5) / list.length, front)); });
    spread(lanes.C.slice().sort((a, b) => cscore(b) - cscore(a)), 1.1);
    spread(lanes.P.slice().sort((a, b) => pscore(b) - pscore(a)), 1.2);
    ['doc', 'anim', 'exp'].forEach(k => spread(lanes[k].slice().sort((a, b) => b.rec - a.rec), 1));
    lanes.A.forEach(f => { if (!pos.has(f.i)) pos.set(f.i, .5); });
    // your watchlist: spread evenly
    const wlTaken = [...taken.entries()].filter(([, t]) => t.wl).map(([i]) => i);
    wlTaken.forEach((i, k) => pos.set(i, (k + .5) / wlTaken.length));
    // ================= the weeks =================
    const LN = {H: 'H', A: 'A', C: 'C', P: 'P', doc: 'H', anim: 'C', exp: 'H'};
    const queues = {};
    Object.keys(lanes).forEach(k => { queues[k] = lanes[k].slice().sort((a, b) => pos.get(a.i) - pos.get(b.i)); });
    // titles from your watchlist that aren't in the catalog go in with the recent or historical strand
    extraRows.forEach((x, k) => { const q = queues[x.lane]; q.splice(Math.min(q.length, Math.round((k + .5) / extraRows.length * q.length)), 0, Object.assign({x: 1, i: 'x' + k}, x)); });
    const total = Object.values(queues).reduce((a, q) => a + q.length, 0);
    const acc = {}; Object.keys(queues).forEach(k => { acc[k] = 0; });
    const F = [], fIndex = new Map(), Wk = [], WM = [], SG = [], dirRows = {};
    const gnames = [], gkind = [], gix = new Map();
    const gIdx = (key, name, kind) => { if (!gix.has(key)) { gix.set(key, gnames.length); gnames.push(name); gkind.push(kind); } return gix.get(key); };
    function row(f, lane, week) {
      if (fIndex.has(f.i)) return fIndex.get(f.i);
      const t = f.x ? null : taken.get(f.i) || {};
      const dirs = f.x ? [] : f.d.map(k => C.dirs[k]);
      let g = -1;
      if (!f.x) {
        const gi = t.g != null && t.g >= 0 ? t.g : f.m[0];
        if (gi != null && gi >= 0) g = gIdx('g' + gi, C.groups[gi].name, C.groups[gi].kind);
        else if (t.g === -1) g = gIdx('canon', 'Other Landmarks', 'movement');
        else if (f.c[0] != null) g = gIdx('c' + f.c[0], 'Cinema of ' + C.cnames[f.c[0]], 'nation');
        if (f.g.includes(99)) g = gIdx('doc', 'Documentary', 'form');
        else if (f.g.includes(16)) g = gIdx('anim', 'Animation', 'form');
        else if (f.l & AV) g = gIdx('exp', 'Experimental Film', 'form');
      }
      const key = f.slug || (f.tm > 0 ? 'tm' + f.tm : 'wl-' + U.norm(f.t).replace(/ /g, '-') + '-' + (f.y || 0));
      const n = F.length;
      // [title, year, directors, runtime, copy status, Letterboxd slug, strand, 0, key, plan year, "your first …", series, 0, group, friends' average, friends, TMDB id]
      F.push([f.t, f.y || 0, dirs.join(', '), f.rt || 0, '', f.slug || '', lane, 0, key, Math.floor((week - 1) / 52) + 1, t && t.first && !seenDir.has(t.d) ? 1 : '', '', 0, g, 0, 0, f.tm > 0 ? f.tm : 0]);
      fIndex.set(f.i, n);
      if (lane === 'A' && t && t.d != null) { const r = dirRows[t.d] || (dirRows[t.d] = {en: C.dirs[t.d], f: [], y0: 9999, y1: 0}); r.f.push(n); r.y0 = Math.min(r.y0, f.y); r.y1 = Math.max(r.y1, f.y); }
      return n;
    }
    const posters = [];
    const lens = Object.keys(queues).filter(k => queues[k].length);
    const share = {}; lens.forEach(k => { share[k] = queues[k].length / Math.max(1, total); });
    const slotsPer = per - open;
    const all = Object.values(queues).flat(), avgRt = all.reduce((a, f) => a + (f.rt || 100), 0) / Math.max(1, all.length), cap = avgRt * slotsPer * 1.4;
    // leftovers that make good open-slot suggestions: acclaimed films not in the plan, a different one each week
    const sugg = open ? pool.filter(f => free(f) && f.rt >= 60).sort((a, b) => b.rec - a.rec).slice(0, weeks * 3) : [];
    let si = 0;
    for (let w = 1; w <= weeks; w++) {
      const items = [], dirsThisWeek = new Set();
      // which strands this week: the ones furthest behind their share
      lens.forEach(k => { acc[k] += share[k] * slotsPer; });
      const picks = [];
      for (let s = 0; s < slotsPer; s++) {
        const k = lens.filter(x => queues[x].length).sort((a, b) => acc[b] - acc[a])[0];
        if (!k) break;
        acc[k] -= 1; picks.push(k);
      }
      let mins = 0;
      picks.forEach(k => {
        const q = queues[k];
        // never two films by one director in a week, nor a week far longer than usual: look a few films ahead for one that fits
        const fits = f => !(f.d && f.d[0] != null && dirsThisWeek.has(f.d[0]));
        let j = q.findIndex((f, n) => n < 8 && fits(f) && mins + (f.rt || avgRt) <= cap);
        if (j < 0) j = q.findIndex((f, n) => n < 8 && fits(f));
        if (j < 0) j = 0;
        mins += q[j] ? q[j].rt || avgRt : 0;
        const f = q.splice(j, 1)[0]; if (!f) return;
        if (f.d && f.d[0] != null) dirsThisWeek.add(f.d[0]);
        const lane = k === 'doc' || k === 'anim' || k === 'exp' ? (f.y >= 2000 ? 'C' : 'H') : LN[k];
        const n = row(f, lane, w);
        items.push([lane, n, 1, lane === 'A' && taken.get(f.i) ? taken.get(f.i).d : -1]);
        if (f.p) posters.push([F[n][8], f.p]);
      });
      if (!items.length) break;
      const sg = [];
      if (open) {
        items.push(['F', -1, 2, -1]);
        while (si < sugg.length && taken.has(sugg[si].i)) si++;
        const sf = sugg[si++];
        if (sf) { taken.set(sf.i, {lane: 'F'}); const n = row(sf, 'F', w); sg.push(n); if (sf.p) posters.push([F[n][8], sf.p]); }
      }
      Wk.push(items); WM.push({free: 0, th: ''}); SG.push(sg);
    }
    // a director's films after the first always come in the order they were made: the films swap between that director's weeks
    Object.values(dirRows).forEach(r => {
      const slots = [];
      Wk.forEach((items, wi) => items.forEach((it, ii) => { if (it[2] === 1 && r.f.includes(it[1]) && !F[it[1]][10] && !(wi === 0 && false)) slots.push([wi, ii, it[1]]); }));
      const intro = r.f.find(n => F[n][10]);
      const films = slots.map(x => x[2]).sort((a, b) => F[a][1] - F[b][1]);
      // without a "your first" film (you've seen some of theirs), the earliest unseen film opens their run
      slots.forEach((x, k) => { Wk[x[0]][x[1]][1] = films[k]; });
      if (intro != null) r.intro = intro;
    });
    return {kind: 'gen', v: 1, F, W: Wk, WM, SG, faDir: {}, groups: gnames, gkind, R: dirRows, start: new Date().toISOString().slice(0, 10), posters,
      gen: {made: new Date().toISOString().slice(0, 10), cfg: JSON.parse(JSON.stringify(cfg)), catalog: C.built}};
  }

  // ================= the page =================
  const hoursOf = D => Math.round(D.W.reduce((a, wk) => a + wk.reduce((b, it) => b + (it[2] === 1 ? +D.F[it[1]][3] || 0 : 0), 0), 0) / 60);
  function laneMix(D) {
    const n = {}; let t = 0;
    D.W.forEach(wk => wk.forEach(it => { if (it[2] === 1) { n[it[0]] = (n[it[0]] || 0) + 1; t++; } }));
    return {n, t};
  }
  function view() {
    const C = U.get();
    let h = `<header class="fx-head dx-head"><div class="fx-hrow"><button type="button" class="fx-link" data-pb-back>${tab.inApp ? '← Back' : '← Other ways to start'}</button></div>
      <div class="fx-eye">Your plan</div><h1 class="fx-h1 dx-h1">Build your plan</h1>
      <p class="dx-lede">A week-by-week schedule made from the ${C ? num(C.films.length) + '-film ' : ''}Discover catalog. It leaves out what you’ve seen and mixes film history, great directors, recent films and popular favorites.</p></header>`;
    if (!C) {
      const s = U.status();
      if (s === 'idle' || s === 'loading') { U.load().then(() => redraw && redraw(), () => redraw && redraw()); return h + `<p class="fx-muted dx-wait">Loading the catalog…</p>`; }
      return h + `<section class="fx-card"><h2>The catalog isn’t available</h2><p class="fx-muted">${s === 'missing' ? 'It’s being put together right now. Check back in a little while.' : 'Check your connection and try again.'}</p><div class="fx-row"><button type="button" class="fx-btn" data-pb-retry>Try again</button></div></section>`;
    }
    if (plan) return h + preview(C);
    const seg = (name, list, cur) => `<div class="fx-years fx-seg pb-seg" role="radiogroup">${list.map(([v, l]) => `<button type="button" data-pb-${name}="${v}" aria-pressed="${cur === v}">${l}</button>`).join('')}</div>`;
    const avg = 108, hours = Math.round(cfg.per * avg / 60 * 10) / 10;
    h += `<section class="fx-card pb-sec"><h2>How long</h2>${seg('years', [[1, '1 year'], [2, '2 years'], [3, '3 years'], [5, '5 years']], cfg.years)}</section>`;
    h += `<section class="fx-card pb-sec"><h2>Films a week</h2>${seg('per', [[2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6'], [7, '7']], cfg.per)}
      <p class="fx-muted">About ${String(hours).replace(/\.0$/, '')} hours a week, ${num(cfg.per * cfg.years * 52)} films in all.</p></section>`;
    h += `<section class="fx-card pb-sec"><h2>Balance</h2><div class="pb-opts">${PRESETS.map(([k, n, d]) => `<button type="button" class="pb-opt" data-pb-preset="${k}" aria-pressed="${cfg.preset === k}"><b>${n}</b><span>${d}</span></button>`).join('')}</div></section>`;
    h += `<section class="fx-card pb-sec"><h2>Make room for</h2><div class="dx-hides">${EXTRAS.map(([k, n]) => `<button type="button" class="dx-tog" data-pb-extra="${k}" aria-pressed="${!!cfg.extra[k]}">${n}</button>`).join('')}</div></section>`;
    const gsel = C.groups.filter(g => !cfg.focusG.includes(g.i)).sort((a, b) => a.from - b.from);
    const csel = [...C.n.country.entries()].filter(([c, k]) => k >= 15 && !cfg.focusC.includes(c)).map(([c]) => c).sort((a, b) => C.cnames[a].localeCompare(C.cnames[b], 'en'));
    const chips = cfg.focusG.map(g => `<button type="button" class="fx-chip" data-pb-rmg="${g}">${esc(C.groups[g].name)}<i aria-hidden="true">×</i></button>`)
      .concat(cfg.focusC.map(c => `<button type="button" class="fx-chip" data-pb-rmc="${c}">${esc('Cinema of ' + C.cnames[c])}<i aria-hidden="true">×</i></button>`));
    const full = cfg.focusG.length + cfg.focusC.length >= 5;
    h += `<section class="fx-card pb-sec"><h2>Go deeper</h2><p class="fx-muted">Optional: up to five movements or national cinemas to see more of.</p>
      ${chips.length ? `<div class="dx-active">${chips.join('')}</div>` : ''}
      ${full ? '' : `<div class="dx-panel pb-focus"><label class="dx-f"><span>Movement or era</span><select data-pb-addg><option value="">Choose…</option>${gsel.map(g => `<option value="${g.i}">${esc(g.name)}</option>`).join('')}</select></label>
      <label class="dx-f"><span>National cinema</span><select data-pb-addc><option value="">Choose…</option>${csel.map(c => `<option value="${c}">${esc(C.cnames[c])}</option>`).join('')}</select></label></div>`}</section>`;
    const wn = o.wl ? o.wl.list().length : 0;
    h += `<section class="fx-card pb-sec"><h2>Each week</h2><div class="dx-hides pb-col">
      <button type="button" class="dx-tog" data-pb-open aria-pressed="${cfg.open}">Leave one open slot for anything you like</button>
      ${wn ? `<button type="button" class="dx-tog" data-pb-wl aria-pressed="${cfg.wl}">Put the ${num(wn)} ${wn === 1 ? 'film' : 'films'} on my watchlist in the plan</button>` : ''}</div></section>`;
    const mk = U.marks(o.wl), seenN = C.films.reduce((a, f) => a + (mk.seen(f) ? 1 : 0), 0);
    h += `<section class="fx-card pb-sec"><p class="fx-muted">${seenN ? `It leaves out the ${num(seenN)} catalog films you’ve already seen.` : 'Nothing in your diary yet. If you use Letterboxd, bring in your history first (Settings → Letterboxd), so the plan leaves out what you’ve seen.'}</p>
      <div class="fx-row"><button type="button" class="fx-btn primary" data-pb-go${busy ? ' disabled' : ''}>${busy ? 'Building…' : 'Build my plan'}</button></div>${err ? `<p class="fx-note bad">${esc(err)}</p>` : ''}</section>`;
    return h + U.attr();
  }
  function preview(C) {
    const D = plan, mix = laneMix(D), first = D.W.slice(0, 3);
    const dirs = Object.values(D.R || {}).sort((a, b) => b.f.length - a.f.length).slice(0, 14);
    const groups = new Map(); D.W.forEach(wk => wk.forEach(it => { if (it[2] === 1) { const g = D.F[it[1]][13]; if (g >= 0 && (D.gkind[g] === 'movement' || D.gkind[g] === 'period') && D.groups[g] !== 'Other Landmarks') groups.set(g, (groups.get(g) || 0) + 1); } }));
    const gtop = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    const cell = n => { const r = D.F[n], p = (D.posters.find(x => x[0] === r[8]) || [])[1] || ''; return U.cell({t: r[0], y: r[1], slug: r[5], tm: r[16], p}, {seen: () => '', wl: () => false}); };
    let h = `<section class="fx-card pb-sec"><div class="fp-prog"><b>${num(D.W.length)} weeks · ${num(mix.t)} films · about ${num(hoursOf(D))} hours</b></div>
      <div class="pb-mix">${['H', 'A', 'C', 'P'].filter(k => mix.n[k]).map(k => `<span><i class="l-${k}"></i>${LANE_NAME[k]} <b>${Math.round(mix.n[k] / mix.t * 100)}%</b></span>`).join('')}${cfg.open ? `<span><i class="l-F"></i>One open slot a week</span>` : ''}</div></section>`;
    first.forEach((wk, k) => { h += `<section class="fx-card pb-sec"><h2>Week ${k + 1}</h2><ul class="dx-grid pb-week">${wk.filter(it => it[2] === 1).map(it => cell(it[1])).join('')}</ul></section>`; });
    if (dirs.length) h += `<section class="fx-card pb-sec"><h2>Directors you’ll follow</h2><p class="pb-names">${dirs.map(d => `<span>${esc(d.en)} <b>${d.f.length}</b></span>`).join('')}</p></section>`;
    if (gtop.length) h += `<section class="fx-card pb-sec"><h2>Movements and eras</h2><p class="pb-names">${gtop.map(([g, n]) => `<span>${esc(D.groups[g])} <b>${n}</b></span>`).join('')}</p></section>`;
    const has = o.plan && o.plan();
    h += `<section class="fx-card pb-sec">${has ? `<p class="fx-muted">This replaces your current plan (${esc(has)}). Everything you’ve logged stays in your diary.</p>` : ''}
      <div class="fx-row"><button type="button" class="fx-btn primary" data-pb-start${busy ? ' disabled' : ''}>${busy ? 'Saving…' : has ? 'Replace my plan' : 'Start this plan'}</button><button type="button" class="fx-btn" data-pb-edit>Change settings</button></div>${err ? `<p class="fx-note bad">${esc(err)}</p>` : ''}</section>`;
    return h;
  }
  async function build(render) {
    busy = true; err = ''; render();
    await new Promise(r => setTimeout(r, 30));  // let "Building…" show
    try {
      const C = await U.load();
      plan = generate(C, U.marks(o.wl), o.wl ? o.wl.list() : []);
      if (!plan.W.length) { plan = null; err = 'There aren’t enough films you haven’t seen to fill a plan like this. Try fewer films a week.'; }
    } catch (e) { err = 'Something went wrong building your plan. Try again.'; }
    busy = false; render(); window.scrollTo(0, 0);
  }
  async function start(render) {
    if (!plan || busy) return;
    busy = true; err = ''; render();
    const ok = await o.save(plan).catch(() => false);
    busy = false;
    if (!ok) { err = 'Your plan couldn’t be saved. Check your connection and try again.'; render(); return; }
    plan = null;
  }
  const tab = {
    id: 'build', hidden: true, label: {en: 'Build your plan', fa: 'Build your plan'},
    view,
    click(b, render) {
      const d = b.dataset;
      if (b.hasAttribute('data-pb-back')) { if (tab.inApp) fxNav.back('/settings'); else if (o.leave) o.leave(); return true; }
      if (b.hasAttribute('data-pb-retry')) { U.retry(); render(); return true; }
      if (d.pbYears) { cfg.years = +d.pbYears; render(); return true; }
      if (d.pbPer) { cfg.per = +d.pbPer; render(); return true; }
      if (d.pbPreset) { cfg.preset = d.pbPreset; render(); return true; }
      if (d.pbExtra) { cfg.extra[d.pbExtra] = !cfg.extra[d.pbExtra]; render(); return true; }
      if (b.hasAttribute('data-pb-open')) { cfg.open = !cfg.open; render(); return true; }
      if (b.hasAttribute('data-pb-wl')) { cfg.wl = !cfg.wl; render(); return true; }
      if (d.pbRmg != null) { cfg.focusG = cfg.focusG.filter(g => g !== +d.pbRmg); render(); return true; }
      if (d.pbRmc != null) { cfg.focusC = cfg.focusC.filter(c => c !== +d.pbRmc); render(); return true; }
      if (b.hasAttribute('data-pb-go')) { build(render); return true; }
      if (b.hasAttribute('data-pb-edit')) { plan = null; render(); window.scrollTo(0, 0); return true; }
      if (b.hasAttribute('data-pb-start')) { start(render); return true; }
      return false;
    },
    change(el, render) {
      if (el.matches('[data-pb-addg]') && el.value !== '') { if (cfg.focusG.length + cfg.focusC.length < 5) cfg.focusG.push(+el.value); render(); return true; }
      if (el.matches('[data-pb-addc]') && el.value !== '') { if (cfg.focusG.length + cfg.focusC.length < 5) cfg.focusC.push(+el.value); render(); return true; }
      return false;
    },
    attach(el, render) { redraw = render; el.addEventListener('change', e => { if (e.target.matches && e.target.closest('[data-pb-addg], [data-pb-addc]')) tab.change(e.target, render); }); },
    generate: (C, mk, wl, c) => { Object.assign(cfg, c || {}); return generate(C, mk, wl); },
  };
  // the builder on its own (the first visit, before there's a plan)
  tab.host = function (el) {
    const render = () => { el.innerHTML = `<div class="fx fx-app" dir="ltr" lang="en">${view()}</div>`; };
    redraw = render;
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (b && el.contains(b)) tab.click(b, render); });
    el.addEventListener('change', e => { if (e.target.matches) tab.change(e.target, render); });
    render();
  };
  return tab;
}
