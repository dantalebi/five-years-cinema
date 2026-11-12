// The five-year plan as a map you can touch: every film sits in its week, colored by lane, and fills in as you watch.
// Then the plan from other angles: the five years, the lanes, the movements, the directors across the years, the decades.
// fxPlanMap() → a tab for mountFocus that isn't in the bar ({hidden: true}); "Five-Year Plan →" on This Week opens it.
// attach(root, render) adds the map's own pointer handling (tooltips, tapping a week).
function fxPlanMap() {
  // the plan's five programming strands
  const LANES = [
    ['H', 'Film History', 'Landmark films by directors outside the Auteurs strand. Each movement opens in year one with its key works, then deepens year by year, with periods and countries mixed every season.'],
    ['A', 'Auteurs', 'Each major director enters in year one with one or two key works. The rest of the filmography follows in chronological order across all five years, usually one or two films per season.'],
    ['C', 'Contemporary', 'Twenty-first-century auteurs alongside festival and contemporary releases with strong word of mouth.'],
    ['P', 'Popular Cinema', 'Roughly a fifth of the plan: widely seen films and the franchises most cinephiles know. Series such as The Godfather, Alien and Mad Max are kept together.'],
    ['F', 'Open Slots', 'Most weeks include one or two open slots. Every five or six months there is an unscheduled week, and about once a season a themed week.'],
  ];
  const YEARS = [
    ['Foundations', 'An introduction to nearly every major director and movement, through one or two key works each, from the silent era to the present.'],
    ['Expansion', 'Filmographies advance by one or two films per director each season, mostly in chronological order. The movements are explored in greater depth.'],
    ['Depth', 'Mid-career work and lesser-known films that remain highly regarded by critics and filmmakers.'],
    ['The Periphery', 'Greater attention to under-seen cinemas, including Africa, Latin America, Eastern Europe, documentary and experimental film, as filmographies reach their late periods.'],
    ['Completion', 'Late and early works not yet covered, with more open slots for new releases.'],
  ];
  // the plan's 23 groups, sorted into what they are: movements and periods, national and regional cinemas, forms
  const GROUPS = ['Silent Cinema', 'Classical Hollywood', 'Classical French Cinema', 'French New Wave', 'French Cinema after the New Wave', 'Italian Cinema', 'Golden Age of Japanese Cinema', 'Japanese New Wave',
    'German & Central European Cinema', 'Nordic Cinema', 'British Cinema', 'Spanish & Portuguese Cinema', 'Soviet & Eastern European Cinema', 'New Hollywood & American Independent Cinema', 'East Asian Cinema: Taiwan, Hong Kong, China & Korea',
    'Iranian Cinema', 'Latin American Cinema', 'South Asian, African, Middle Eastern & Southeast Asian Cinema', 'Contemporary American Cinema', 'Contemporary European Cinema', 'Contemporary Japanese Cinema', 'Documentary, Experimental & Animation', 'Other'];
  const GKIND = [['Movements & Periods', [0, 1, 2, 3, 4, 6, 7, 13]], ['National & Regional Cinemas', [5, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20]], ['Forms', [21]], ['Other', [22]]];
  const LANE = Object.fromEntries(LANES.map(([k, n]) => [k, n]));
  // a plan made by the builder names its own groups and says what kind each is
  const gkinds = m => !m.D.gen ? GKIND : [['Movements & Periods', ['movement', 'period']], ['National Cinemas', ['nation']], ['Forms', ['form']]]
    .map(([t, ks]) => [t, (m.D.gkind || []).map((k, i) => ks.includes(k) ? i : -1).filter(i => i >= 0)]);
  const ORDER = {H: 0, A: 1, C: 2, P: 3, F: 4};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const num = n => Number(n).toLocaleString('en-US');
  const mon = new Intl.DateTimeFormat('en-US', {month: 'short', year: 'numeric'}), day = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const theme = th => (typeof FX_TH_EN !== 'undefined' && FX_TH_EN[th]) || '';
  let sel = 0, openG = -1, openD = '', allDirs = false, redraw = null, memo = null, memoKey = '';

  // ---- everything the views need, worked out once per change ----
  function model() {
    const D = window.D, S = Store.data;
    if (!D || !Array.isArray(D.W) || !D.W.length) return null;
    const key = Object.keys(S).length + '|' + D.F.length;
    if (memo && memoKey === key) return memo;
    const F = D.F, WK = fxCompact(D), cur = Math.min(fxCur(WK, S), D.W.length + 1);
    const st = k => S[k] && !S['sk:' + k] ? 'w' : S['sk:' + k] ? 's' : '';
    const filmWeek = new Int16Array(F.length);
    const weeks = D.W.map((items, wi) => {
      const w = wi + 1, meta = (D.WM || [])[wi] || {}, slots = (WK[wi] && WK[wi][1]) || [];
      if (meta.free) return {w, free: true, cells: [], done: !!S['wk:' + w], th: ''};
      const cells = [];
      let n = 0;
      items.forEach(it => {
        if (it[2] === 1) { const i = it[1]; filmWeek[i] = w; cells.push({i, lane: it[0] in ORDER ? it[0] : (F[i][6] || 'H'), s: st(F[i][8])}); }
        else if (it[2] === 2) { const k = slots[n++] || ('free:' + w + ':' + (n - 1)); cells.push({free: k, lane: 'F', s: st(k)}); }
      });
      cells.sort((a, b) => ORDER[a.lane] - ORDER[b.lane]);
      return {w, cells, th: meta.th || '', done: w < cur};
    });
    const films = [], slotsAll = [];
    weeks.forEach(wk => wk.cells.forEach(c => (c.free ? slotsAll : films).push(c)));
    const watched = films.filter(c => c.s === 'w'), skipped = films.filter(c => c.s === 's');
    const mins = c => +F[c.i][3] || 0;
    const shelf = F.length - films.length;
    // pace: where the calendar says you'd be, against where you are
    const start = /^\d{4}-\d\d-\d\d$/.test(S['cfg:since'] || '') ? S['cfg:since'] : (/^\d{4}-\d\d-\d\d$/.test(D.start || '') ? D.start : today());
    const days = Math.max(0, Math.round((Date.parse(today()) - Date.parse(start)) / 864e5));
    const expected = Math.min(D.W.length, Math.floor(days / 7) + 1), done = cur - 1;
    const rate = days >= 14 && done > 0 ? done / days : 1 / 7;
    const finish = new Date(Date.now() + Math.max(0, D.W.length - done) / rate * 864e5);
    const lanes = LANES.map(([k]) => { const c = films.filter(x => x.lane === k).concat(k === 'F' ? slotsAll : []); return {k, n: c.length, w: c.filter(x => x.s === 'w').length}; }).filter(l => l.n);
    const groups = (D.groups || []).map((g, gi) => { const c = films.filter(x => F[x.i][13] === gi); return {gi, n: c.length, w: c.filter(x => x.s === 'w').length, shelf: F.filter((f, i) => f[13] === gi && !filmWeek[i]).length}; }).filter(g => g.n);
    const dirs = Object.entries(D.R || {}).map(([id, r]) => {
      const fs = (r.f || []).filter(i => F[i]).map(i => ({i, w: filmWeek[i], s: st(F[i][8])}));
      return {id, name: r.en || r.n || '', y0: r.y0, y1: r.y1, fs, n: fs.filter(x => x.w).length, wn: fs.filter(x => x.s === 'w').length};
    }).filter(d => d.n).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
    const dec = {};
    films.forEach(c => { const y = +F[c.i][1]; if (y > 1870) { const k = Math.floor(y / 10) * 10; (dec[k] = dec[k] || {n: 0, w: 0}).n++; if (c.s === 'w') dec[k].w++; } });
    memo = {D, F, S, weeks, cur, films, slotsAll, watched, skipped, shelf, start, days, expected, done, finish, lanes, groups, dirs, dec, filmWeek,
      hoursDone: Math.round(watched.reduce((a, c) => a + mins(c), 0) / 60), hoursLeft: Math.round(films.filter(c => !c.s).reduce((a, c) => a + mins(c), 0) / 60)};
    memoKey = key;
    return memo;
  }
  const yearOf = w => Math.floor((w - 1) / 52);
  const titleOf = (m, c) => c.free ? 'Open slot' : m.F[c.i][0];
  const poster = (m, i) => {
    const k = m.F[i][8], src = typeof Posters !== 'undefined' ? Posters.src(k) : '';
    return `<span class="fx-pos pm-pos" aria-hidden="true"><img alt="" loading="lazy" data-pk="${esc(k)}" data-pt="${esc(m.F[i][0])}" data-py="${m.F[i][1]}"${src ? ` src="${src}"` : ''}><span class="fx-pt" dir="ltr">${esc(m.F[i][0])}</span></span>`;
  };

  // ---- the map: one strip per year, one column per week, one square per film ----
  function yearSvg(m, y) {
    const ws = m.weeks.slice(y * 52, y * 52 + 52); if (!ws.length) return '';
    const rows = Math.max(6, ...ws.map(w => w.free ? 1 : w.cells.length)), U = 10, H = rows * U + 14;
    let g = '';
    ws.forEach((wk, x) => {
      const X = x * U, here = wk.w === m.cur, picked = wk.w === sel;
      g += `<g class="pm-wk${here ? ' here' : ''}${picked ? ' sel' : ''}" data-pmwk="${wk.w}"><rect class="pm-hit" x="${X}" y="0" width="${U}" height="${H}"/>`;
      if (here) g += `<path class="pm-you" d="M${X + 1} 1 L${X + 9} 1 L${X + 5} 7 Z"/>`;
      else if (wk.th) g += `<circle class="pm-th" cx="${X + 5}" cy="5" r="2"/>`;
      if (wk.free) g += `<rect class="pm-c pm-rest${wk.done ? ' s-w' : ''}" x="${X + 1}" y="${H - U}" width="8" height="8" rx="1.5"/>`;
      // stacked from the bottom: history, auteurs, today, popular, free picks
      wk.cells.forEach((c, r) => { g += `<rect class="pm-c l-${c.lane} s-${c.s || 'n'}" x="${X + 1}" y="${H - (r + 1) * U}" width="8" height="8" rx="1.5" data-pmf="${c.free ? 'f:' + esc(c.free) : c.i}"/>`; });
      g += '</g>';
    });
    return `<svg class="pm-svg" viewBox="0 0 ${ws.length * U} ${H}" role="img" aria-label="Year ${y + 1}: ${ws.length} weeks">${g}</svg>`;
  }
  function weekPanel(m) {
    const w = Math.max(1, Math.min(m.weeks.length, sel || m.cur)), wk = m.weeks[w - 1];
    const label = wk.free ? 'Unscheduled week' : wk.th && theme(wk.th) ? 'Themed week: ' + theme(wk.th) : '';
    let h = `<section class="fx-card pm-weekc" id="pm-week"><div class="pm-whead"><button type="button" class="fx-btn" data-pmstep="-1" aria-label="Previous week"${w <= 1 ? ' disabled' : ''}>←</button>
      <div><div class="fx-eye">Year ${yearOf(w) + 1} · ${esc(YEARS[yearOf(w)] ? YEARS[yearOf(w)][0] : '')}</div><h2 class="pm-wt">Week ${w}${w === m.cur ? ' <span class="pm-now">Current</span>' : w < m.cur ? ' <span class="pm-past">Completed</span>' : ''}</h2>${label ? `<div class="fx-muted">${esc(label)}</div>` : ''}</div>
      <button type="button" class="fx-btn" data-pmstep="1" aria-label="Next week"${w >= m.weeks.length ? ' disabled' : ''}>→</button></div>`;
    if (wk.free) return h + `<p class="fx-muted">An unscheduled week. Watch anything you like, or take a break.</p></section>`;
    h += `<ul class="pm-wl">${wk.cells.map(c => {
      const state = c.s === 'w' ? `<span class="pm-st w">✓ Watched${m.S[c.free || m.F[c.i][8]] && /^\d{4}/.test(m.S[c.free || m.F[c.i][8]]) ? ' ' + esc(day.format(new Date(m.S[c.free || m.F[c.i][8]] + 'T12:00:00'))) : ''}</span>` : c.s === 's' ? '<span class="pm-st s">Skipped</span>' : '';
      if (c.free) return `<li class="pm-wi"><span class="fx-pos pm-pos none" aria-hidden="true"></span><div><div class="pm-ft">Open slot</div><div class="fx-muted fx-small">Your choice</div>${state}</div><i class="pm-lane l-F">Open</i></li>`;
      const f = m.F[c.i];
      return `<li class="pm-wi">${poster(m, c.i)}<div><div class="pm-ft"><bdi>${esc(f[0])}</bdi> <span class="fx-y">${f[1] || ''}</span></div><div class="fx-muted fx-small">${esc(String(f[2] || '').split(',')[0])}${f[3] ? ' · ' + Math.floor(f[3] / 60) + 'h ' + (f[3] % 60) + 'm' : ''}</div>${state}</div><i class="pm-lane l-${c.lane}">${esc(LANE[c.lane] || '')}</i></li>`;
    }).join('')}</ul>${w !== m.cur ? `<div class="fx-row"><button type="button" class="fx-link" data-pmgo="${m.cur}">Back to the current week</button></div>` : ''}</section>`;
    return h;
  }
  function bar(w, n, cls) { return `<span class="pm-bar ${cls || ''}"><i style="width:${n ? Math.max(w ? 1.5 : 0, w / n * 100) : 0}%"></i></span>`; }

  function view() {
    const m = model();
    let h = `<header class="fx-head"><div class="fx-hrow"><button type="button" class="fx-link" data-nav="week">← This Week</button></div>`;
    if (!m) return h + `<h1 class="fx-h1">Your plan</h1><p class="fx-muted">There’s no plan to map yet.</p></header>`;
    const total = m.films.length + m.slotsAll.length, doneN = m.watched.length + m.slotsAll.filter(c => c.s === 'w').length;
    const pct = total ? Math.round(doneN / total * 1000) / 10 : 0;
    const gap = m.cur - m.expected, nw = m.weeks.length, years = Math.ceil(nw / 52);
    const pace = m.done >= nw ? 'Complete' : gap === 0 ? 'On schedule' : gap > 0 ? gap + (gap === 1 ? ' week ahead' : ' weeks ahead') : -gap + (gap === -1 ? ' week behind' : ' weeks behind');
    h += `<div class="fx-eye">Week ${Math.min(m.cur, nw)} of ${nw}${YEARS[yearOf(Math.min(m.cur, nw))] && m.D.years ? ' · Year ' + (yearOf(Math.min(m.cur, nw)) + 1) + ': ' + YEARS[yearOf(Math.min(m.cur, nw))][0] : ''}</div>
      <h1 class="fx-h1">${years === 5 ? 'The Five-Year Plan' : 'Your plan'}</h1>
      <p class="fx-lede">${num(m.films.length)} films over ${nw} weeks${m.slotsAll.length ? ', plus ' + num(m.slotsAll.length) + ' open slots' : ''}${m.shelf > 0 ? ' and a reserve shelf of ' + num(m.shelf) + ' films' : ''}. Each square represents one film and fills in once you’ve watched it.</p></header>`;
    h += `<section class="pm-stats">
      <div><b>${num(doneN)}</b><span>of ${num(total)} watched</span>${bar(doneN, total)}</div>
      <div><b>${pct}%</b><span>complete</span></div>
      <div><b>${num(m.hoursLeft)}</b><span>hours remaining${m.hoursDone ? ' · ' + num(m.hoursDone) + ' watched' : ''}</span></div>
      <div><b class="${gap < 0 ? 'behind' : ''}">${esc(pace)}</b><span>${m.done >= nw ? '' : 'Projected finish: ' + mon.format(m.finish)}</span></div></section>`;
    // the map
    h += `<section class="fx-card pm-mapc"><div class="pm-legend">${LANES.filter(([k]) => m.lanes.some(l => l.k === k)).map(([k, n]) => `<span><i class="l-${k}"></i>${esc(n)}</span>`).join('')}<span class="pm-lg2"><i class="s-n"></i>Not yet watched</span><span class="pm-lg2"><i class="s-w"></i>Watched</span><span class="pm-lg2"><i class="pm-you-k"></i>Current week</span></div>`;
    for (let y = 0; y < years; y++) {
      const ws = m.weeks.slice(y * 52, y * 52 + 52), cells = ws.flatMap(w => w.cells), wn = cells.filter(c => c.s === 'w').length;
      h += `<div class="pm-year"><div class="pm-yh"><h2>Year ${y + 1}${YEARS[y] && m.D.years ? ` <span>${esc(YEARS[y][0])}</span>` : ''}</h2><span class="fx-muted fx-small">${num(wn)} / ${num(cells.length)}</span></div>
        ${YEARS[y] && m.D.years ? `<p class="fx-muted pm-yd">${esc(YEARS[y][1])}</p>` : ''}<div class="pm-strip">${yearSvg(m, y)}</div><div class="pm-ticks"><span>Week ${y * 52 + 1}</span><span>${Math.min(nw, y * 52 + 52)}</span></div></div>`;
    }
    h += `<p class="fx-muted fx-small pm-hint">Select a week to see its films. A dot above a week marks a themed week.</p></section>`;
    h += weekPanel(m);
    // lanes
    h += `<section class="fx-card"><h2>Programming strands</h2><p class="fx-muted">Each week draws on five strands, so no two weeks are alike.</p><ul class="pm-lanes">${m.lanes.map(l => {
      const d = LANES.find(x => x[0] === l.k);
      return `<li><div class="pm-lh"><i class="pm-sw l-${l.k}"></i><b>${esc(d[1])}</b><span class="fx-muted">${num(l.w)} / ${num(l.n)}</span></div>${bar(l.w, l.n, 'l-' + l.k)}<p class="fx-muted fx-small">${esc(d[2])}</p></li>`;
    }).join('')}</ul></section>`;
    // movements
    if (m.groups.length) {
      const row = g => {
        const open = openG === g.gi;
        let x = `<li class="${open ? 'open' : ''}"><button type="button" class="pm-gb" data-pmg="${g.gi}" aria-expanded="${open}"><span class="pm-gn">${esc(m.D.gen ? m.D.groups[g.gi] : GROUPS[g.gi] || m.D.groups[g.gi])}</span><span class="fx-muted">${num(g.w)} / ${num(g.n)}</span>${bar(g.w, g.n)}</button>`;
        if (open) {
          const list = m.films.filter(c => m.F[c.i][13] === g.gi).sort((a, b) => m.filmWeek[a.i] - m.filmWeek[b.i]);
          x += `<ol class="pm-fl">${list.map(c => `<li class="${c.s === 'w' ? 'w' : c.s === 's' ? 's' : ''}"><button type="button" class="fx-link pm-wkb" data-pmgo="${m.filmWeek[c.i]}">Wk ${m.filmWeek[c.i]}</button><span><bdi>${esc(m.F[c.i][0])}</bdi> <span class="fx-y">${m.F[c.i][1] || ''}</span></span>${c.s === 'w' ? '<i>✓</i>' : ''}</li>`).join('')}</ol>${g.shelf ? `<p class="fx-muted fx-small">Plus ${num(g.shelf)} more on the shelf for open slots.</p>` : ''}`;
        }
        return x + '</li>';
      };
      h += `<section class="fx-card"><h2>Movements & cinemas</h2><p class="fx-muted">Select one to see its films and where they fall in the plan.</p>${gkinds(m).map(([title, ids]) => {
        const gs = m.groups.filter(g => ids.includes(g.gi) || (!m.D.gen && title === 'Other' && g.gi >= GROUPS.length));
        return gs.length ? `<h3 class="pm-gk">${esc(title)}</h3><ul class="pm-groups">${gs.map(row).join('')}</ul>` : '';
      }).join('')}</section>`;
    }
    // directors across the five years
    if (m.dirs.length) {
      const list = allDirs ? m.dirs : m.dirs.slice(0, 24), nw2 = m.weeks.length;
      h += `<section class="fx-card"><h2>Directors ${m.D.W.length >= 260 ? 'over five years' : 'across the plan'}</h2><p class="fx-muted">Each dot marks one film in the week it is scheduled. Filmographies unfold gradually, mostly in chronological order.</p>
        <ul class="pm-dirs">${list.map(d => {
          const open = openD === d.id;
          const dots = d.fs.filter(x => x.w).map(x => `<i class="${x.s === 'w' ? 'w' : x.s === 's' ? 's' : ''}" style="left:${((x.w - 0.5) / nw2 * 100).toFixed(2)}%"></i>`).join('');
          let x = `<li class="${open ? 'open' : ''}"><button type="button" class="pm-db" data-pmd="${esc(d.id)}" aria-expanded="${open}"><span class="pm-dn"><bdi>${esc(d.name)}</bdi><span class="fx-muted">${d.wn ? num(d.wn) + ' / ' : ''}${num(d.n)}</span></span><span class="pm-tl">${[1, 2, 3, 4].map(k => `<b style="left:${k * 52 / nw2 * 100}%"></b>`).join('')}<u style="left:${((m.cur - 0.5) / nw2 * 100).toFixed(2)}%"></u>${dots}</span></button>`;
          if (open) x += `<ol class="pm-fl">${d.fs.filter(f => f.w).sort((a, b) => a.w - b.w).map(f => `<li class="${f.s === 'w' ? 'w' : f.s === 's' ? 's' : ''}"><button type="button" class="fx-link pm-wkb" data-pmgo="${f.w}">Wk ${f.w}</button><span><bdi>${esc(m.F[f.i][0])}</bdi> <span class="fx-y">${m.F[f.i][1] || ''}</span></span>${f.s === 'w' ? '<i>✓</i>' : ''}</li>`).join('')}</ol>`;
          return x + '</li>';
        }).join('')}</ul>${m.dirs.length > 24 ? `<div class="fx-row fx-center"><button type="button" class="fx-link" data-pmalld>${allDirs ? 'Show fewer' : 'Show all ' + num(m.dirs.length) + ' directors'}</button></div>` : ''}</section>`;
    }
    // decades
    const decs = Object.keys(m.dec).map(Number).sort((a, b) => a - b);
    if (decs.length > 2) {
      const mx = Math.max(...decs.map(k => m.dec[k].n));
      h += `<section class="fx-card"><h2>By decade</h2><p class="fx-muted">Films in the plan by decade of release. The solid part shows what you’ve watched.</p><div class="pm-decs">${decs.map(k => `<div title="${k}s: ${m.dec[k].w} of ${m.dec[k].n} watched"><span class="pm-dv">${num(m.dec[k].n)}</span><span class="pm-dbar" style="height:${Math.max(3, m.dec[k].n / mx * 100)}%"><i style="height:${m.dec[k].n ? m.dec[k].w / m.dec[k].n * 100 : 0}%"></i></span><span class="pm-dl">${String(k).slice(2)}s</span></div>`).join('')}</div></section>`;
    }
    return h;
  }
  function go(w, render) { const m = model(); if (!m) return; sel = Math.max(1, Math.min(m.weeks.length, w)); render(); const el = document.getElementById('pm-week'); if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  let tip = null;
  function showTip(el, ev) {
    const m = model(); if (!m) return;
    const v = el.getAttribute('data-pmf'), wk = +el.closest('[data-pmwk]').dataset.pmwk;
    let html;
    if (v.startsWith('f:')) html = `<b>Open slot</b><span>Week ${wk}</span>`;
    else { const f = m.F[+v], s = m.S[f[8]] && !m.S['sk:' + f[8]] ? '✓ Watched' : m.S['sk:' + f[8]] ? 'Skipped' : ''; html = `<b>${esc(f[0])}</b><span>${f[1] || ''} · ${esc(String(f[2] || '').split(',')[0])}</span><span>Week ${wk} · ${esc(LANE[f[6]] || '')}${s ? ' · ' + s : ''}</span>`; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'pm-tip'; document.body.appendChild(tip); }
    tip.innerHTML = html; tip.hidden = false;
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2)) + 'px';
    tip.style.top = (r.top + window.scrollY - tip.offsetHeight - 8) + 'px';
  }
  return {
    id: 'plan', hidden: true, label: {en: 'Plan', fa: 'Plan'},
    view,
    click(b, render) {
      redraw = render;
      if (b.dataset.pmstep) { const m = model(); go((sel || (m && m.cur) || 1) + +b.dataset.pmstep, render); return true; }
      if (b.dataset.pmgo) { go(+b.dataset.pmgo, render); return true; }
      if (b.dataset.pmg) { const g = +b.dataset.pmg; openG = openG === g ? -1 : g; render(); return true; }
      if (b.dataset.pmd) { openD = openD === b.dataset.pmd ? '' : b.dataset.pmd; render(); return true; }
      if (b.hasAttribute('data-pmalld')) { allDirs = !allDirs; render(); return true; }
      return false;
    },
    // tapping anywhere in a week's column picks that week; hovering a square names its film
    attach(root, render) {
      redraw = render;
      root.addEventListener('click', e => { const g = e.target.closest && e.target.closest('.pm-svg [data-pmwk]'); if (g) go(+g.dataset.pmwk, render); });
      root.addEventListener('pointerover', e => { const c = e.target.closest && e.target.closest('.pm-svg [data-pmf]'); if (c && e.pointerType === 'mouse') showTip(c, e); });
      root.addEventListener('pointerout', e => { if (tip && e.target.closest && e.target.closest('.pm-svg [data-pmf]')) tip.hidden = true; });
    },
    opened() { sel = 0; if (tip) tip.hidden = true; },
  };
}
