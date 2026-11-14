// Home: the screen the app opens on. This week's programme comes first (the plan's own screen, drawn by focus.js);
// under it only what you'd act on: a channel from the catalog that changes every day, what the people you follow
// watched lately, what's popular with them, and one line for a film you watched on this day in another year.
// On a wide screen a column beside the plan holds your own things: your year so far, your watchlist, on this day.
// On a phone there's no room for that column: your year is in Stats, your watchlist on your profile.
// fxHome({FR, pop, redraw}) → {html(), click(button)}: html() is added under This week; click() handles its own buttons.
function fxHome(o) {
  const U = fxCat, esc = U.esc, num = U.num;
  const FR = o.FR || null;
  const stars = r => r ? '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '') : '';
  const okPoster = p => typeof p === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9._-]+$/.test(p);
  const small = p => p.replace(/\/w\d+\//, '/w154/');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const filmHref = f => fxNav.film({slug: f.slug || f.l || '', tm: +f.tm || 0, t: U.bare(String(f.t || '')), y: +f.y || 0});
  const ago = w => {
    if (!/^\d{4}-\d\d-\d\d$/.test(w || '')) return '';
    const days = Math.round((Date.parse(today()) - Date.parse(w)) / 864e5);
    return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? days + ' days ago' : new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'}).format(new Date(w + 'T12:00:00'));
  };
  const sec = (cls, title, link, body) => `<section class="fx-card hm-sec ${cls}"><div class="hm-sh"><h2>${title}</h2>${link || ''}</div>${body}</section>`;
  const more = (href, label) => `<a class="fx-link hm-more" href="${href}" data-app>${label}</a>`;

  // your diary, worked out once and kept a moment (Home is drawn again on every click)
  let memo = null, memoAt = 0;
  function diary() {
    if (memo && Date.now() - memoAt < 1500) return memo;
    const D = window.D || {F: [], W: [], WM: []}, S = Store.data;
    const list = typeof fxDiary === 'function' ? fxDiary(D, S) : [];
    const rt = e => e.i != null ? +D.F[e.i][3] || 0 : +((e.md || {}).m) || 0;
    memo = {list, rt, D}; memoAt = Date.now();
    return memo;
  }

  function friends() {
    if (!FR) return '';
    const rows = FR.recent ? FR.recent(3) : null;  // three on Home; All activity has the rest
    if (rows === null) return sec('hm-fr', 'From people you follow', '', '<p class="fx-muted hm-wait">Tuning in…</p>');
    if (!rows.length) return sec('hm-fr', 'From people you follow', '', `<p class="fx-muted">Follow people to see what they’re watching. ${more('/activity/people', 'Find people')}</p>`);
    const av = e => typeof fxAvatar === 'function' ? fxAvatar(e.u, e.n, e.a, 's') : '';
    return sec('hm-fr', 'From people you follow', more('/activity', 'All activity'), `<ul class="hm-feed">${rows.map(e => {
      const href = filmHref(e), title = U.bare(String(e.t));
      return `<li><a class="hm-fpos" href="${esc(href)}" data-app aria-hidden="true" tabindex="-1">${okPoster(e.p) ? `<img src="${esc(small(e.p))}" alt="" loading="lazy">` : ''}</a>`
        + `<div class="hm-fb"><div class="hm-fw"><a href="/u/${esc(e.u)}">${av(e)}<b dir="auto">${esc(e.n || '@' + e.u)}</b></a>${e.id ? `<a class="hm-fwhen" href="/u/${esc(e.u)}#${esc(e.id)}">${esc(ago(e.w))}</a>` : `<span>${esc(ago(e.w))}</span>`}</div>`
        + `<a class="hm-ft" href="${esc(href)}" data-app dir="auto">${esc(title)}${e.y ? ` <span>${e.y}</span>` : ''}</a>`
        + (() => { const m = `${e.r ? `<span class="fp-st">${stars(e.r)}</span>` : ''}${e.h ? '<i class="fx-ico lk" title="Liked"></i>' : ''}${e.rw ? '<i class="fx-ico rw" title="Rewatch"></i>' : ''}${e.rv ? '<i class="fx-ico rv" title="Review"></i>' : ''}`;
          return m && e.id ? `<a class="hm-fm" href="/u/${esc(e.u)}#${esc(e.id)}" aria-label="${esc((e.n || '@' + e.u) + '’s entry')}">${m}</a>` : `<div class="hm-fm">${m}</div>`; })() + `</div></li>`;
    }).join('')}</ul>`);
  }

  function watchlist() {
    if (!FR || !FR.wl) return '';
    const list = FR.wl.list().slice().sort((a, b) => (+b.at || 0) - (+a.at || 0));
    if (!list.length) return '';
    return sec('hm-wl', `Your watchlist <span class="hm-count">${num(list.length)}</span>`, `<button type="button" class="fx-link hm-more" data-hm-pick>Pick one for me</button>`,
      `<ul class="hm-strip">${list.slice(0, 6).map(f => `<li><a class="hm-sp" href="${esc(filmHref(f))}" data-app title="${esc(f.t + (f.y ? ' (' + f.y + ')' : ''))}">${okPoster(f.p) ? `<img src="${esc(small(f.p))}" alt="" loading="lazy">` : `<span>${esc(f.t)}</span>`}</a></li>`).join('')}</ul>`);
  }

  // films you watched on this day in other years: a list in the side column, one quiet line on a phone
  function dayHits() {
    const {list, D} = diary(), t = today(), md = t.slice(5), yr = t.slice(0, 4);
    return list.filter(e => e.date.slice(5) === md && e.date.slice(0, 4) < yr).slice(0, 3).map(e => ({e, yr: e.date.slice(0, 4), ago: +yr - +e.date.slice(0, 4),
      f: e.i != null ? {t: D.F[e.i][0], y: D.F[e.i][1], tm: D.F[e.i][16], slug: D.F[e.i][5]} : {t: (e.md || {}).t || e.t, y: (e.md || {}).y || e.y, tm: (e.md || {}).tm}}));
  }
  const dayLink = h => `<a href="${esc(filmHref(h.f))}" data-app dir="auto">${esc(U.bare(String(h.f.t)))}</a>`;
  function onThisDay(hits) {
    if (!hits.length) return '';
    return sec('hm-otd', 'On this day', '', `<ul class="hm-days">${hits.map(h =>
      `<li><b>${h.yr}</b><span>${dayLink(h)}<small>${h.ago === 1 ? 'A year ago' : h.ago + ' years ago'}${h.e.r ? ` <span class="fp-st">${stars(h.e.r)}</span>` : ''}</small></span></li>`).join('')}</ul>`);
  }
  function dayLine(hits) {
    if (!hits.length) return '';
    const h = hits[0];
    return `<p class="hm-otdl">On this day in ${h.yr} you watched ${dayLink(h)}${h.e.r ? ` <span class="fp-st">${stars(h.e.r)}</span>` : ''}</p>`;
  }

  function year() {
    const {list, rt} = diary(), yr = today().slice(0, 4), mine = list.filter(e => e.date.slice(0, 4) === yr);
    if (!mine.length) return '';
    const months = Array(12).fill(0); mine.forEach(e => { months[+e.date.slice(5, 7) - 1]++; });
    const cur = new Date().getMonth(), max = Math.max(1, ...months);
    const rated = mine.filter(e => e.r), avg = rated.length ? (rated.reduce((a, e) => a + e.r, 0) / rated.length / 2).toFixed(1) : '';
    const hours = Math.round(mine.reduce((a, e) => a + rt(e), 0) / 60);
    const nums = [[num(mine.length), mine.length === 1 ? 'film' : 'films'], [num(hours), hours === 1 ? 'hour' : 'hours']].concat(avg ? [[avg, 'average']] : []);
    const M = 'JFMAMJJASOND';
    return sec('hm-yr', 'Your ' + yr, more('/stats', 'Stats'), `<div class="hm-yrb"><div class="hm-nums">${nums.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>`
      + `<div class="hm-months" role="img" aria-label="Films each month this year: ${months.slice(0, cur + 1).join(', ')}">${months.map((c, i) => `<div class="${i > cur ? 'fut' : ''}"><i style="--h:${c ? Math.max(6, Math.round(c / max * 100)) : 0}%"></i><span>${M[i]}</span></div>`).join('')}</div></div>`);
  }

  // a channel a day: one of the catalog's movements, eras or collections, the films in it you haven't seen
  let catAsked = false;
  function channel() {
    const C = U.get();
    if (!C) {
      if (!catAsked && U.status() === 'idle') { catAsked = true; U.load().then(() => o.redraw && o.redraw(), () => o.redraw && o.redraw()); }
      // the channel's place kept while the catalog comes, so what's under it doesn't jump down when it arrives
      return U.status() === 'loading' ? `<section class="fx-card hm-sec hm-chw" aria-hidden="true"><div class="hm-sh"><h2>Today’s channel</h2></div><div class="hm-chph"></div></section>` : '';
    }
    const day = Math.floor(Date.parse(today()) / 864e5);
    const chans = C.groups.map(g => ({kind: g.kind === 'period' ? 'era' : 'movement', g, name: g.name, films: f => f.m.includes(g.i)}))
      .concat(C.lenses.map(l => ({kind: 'collection', g: l, name: l.name, films: f => !!(f.l & (1 << l.i))})))
      .concat((C.themes || []).map(t => ({kind: 'theme', g: t, name: t.name, films: f => (f.th || []).includes(t.i)})));
    // a theme in season (Halloween, Christmas) is the channel for those weeks
    const season = (C.themes || []).find(t => U.inSeason(t, today()));
    if (season) chans.unshift({kind: 'theme', g: season, name: season.name, films: f => (f.th || []).includes(season.i), season: true});
    if (!chans.length) return '';
    const mk = U.marks(FR ? FR.wl : null);
    // skip channels with too few films left to watch
    for (let k = 0; k < chans.length; k++) {
      const ch = chans[0].season && k === 0 ? chans[0] : chans[(day * 7 + k * 13) % chans.length];
      const left = C.films.filter(f => ch.films(f) && !mk.seen(f)).sort((a, b) => b.rec - a.rec);
      if (left.length < 6) continue;
      const href = '/discover/' + ch.kind + '/' + ch.g.id;
      const kind = ch.season ? 'In season' : ch.kind === 'era' ? 'An era' : ch.kind === 'movement' ? 'A movement' : ch.kind === 'theme' ? 'A theme' : 'A collection';
      return sec('hm-ch', 'Today’s channel', more(href, 'Tune in'), `<a class="hm-chn" href="${esc(href)}" data-app><span>${kind}</span><b>${esc(ch.name)}</b></a>`
        + `<ul class="dx-row">${left.slice(0, 10).map(f => U.cell(f, mk)).join('')}</ul>`);
    }
    return '';
  }

  return {
    html() {
      let h = '', side = '';
      try {
        const hits = dayHits();
        h = (o.news ? o.news.card() : '') + channel() + friends() + (o.pop ? o.pop.teaser('friends') : '') + dayLine(hits);
        side = year() + watchlist() + onThisDay(hits);
      } catch (e) { h = ''; side = ''; }
      // the side column is shown only on a wide screen (focus.css), beside This week
      return (h ? `<div class="hm">${h}</div>` : '') + (side ? `<aside class="hm-side" aria-label="Your films">${side}</aside>` : '');
    },
    click(b) {
      if (o.news && o.news.click(b)) return true;
      if (b.hasAttribute('data-hm-pick') && FR && FR.wl) {
        const l = FR.wl.list(); if (!l.length) return true;
        const f = l[Math.floor(Math.random() * l.length)];
        if (typeof fxOSD === 'function') fxOSD('Your pick');
        setTimeout(() => fxNav.open(filmHref(f)), 450);
        return true;
      }
      return false;
    },
  };
}
