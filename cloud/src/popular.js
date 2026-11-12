// Popular: the films the most members watched lately, Letterboxd-style. Two crowds (the people you follow, or everyone
// on TVC15) and four stretches of time (this week, this month, this year, all time); each person counts once a film.
// Private diaries never count (the server only reads public profiles).
// /popular[/friends|/everyone][/this-week|/this-month|/this-year|/all-time] is the page; teaser(who) is a row of it for
// Home and Discover, over the shortest stretch of time that has enough films in it.
// fxPopular(CS, {redraw, wl}) → a hidden tab for mountFocus, plus url(), fromUrl(path), teaser(who).
function fxPopular(CS, o) {
  const U = fxCat, esc = U.esc, num = U.num;
  const SPANS = [['week', 'This week', 'this-week', 'this week'], ['month', 'This month', 'this-month', 'this month'], ['year', 'This year', 'this-year', 'this year'], ['all', 'All time', 'all-time', 'of all time']];
  const st = {who: 'everyone', span: 'week'};
  const got = new Map();  // 'who|span' → {state: 'loading' | 'ready' | 'none', j, at}
  const FRESH = 3 * 60e3;
  function get(who, span, min) {
    const k = who + '|' + span; let c = got.get(k);
    if (!c || (c.state !== 'loading' && Date.now() - c.at > FRESH)) {
      const was = c;
      c = {state: was && was.j ? 'ready' : 'loading', j: was ? was.j : null, at: Date.now()}; got.set(k, c);
      CS.popular(who, span, min).then(r => { c.state = r.ok ? 'ready' : 'none'; if (r.ok) c.j = r.j; if (o.redraw) o.redraw(); });
    }
    return c;
  }
  const spanOf = s => SPANS.find(x => x[0] === s) || SPANS[0];
  function url() { return '/popular' + (st.who === 'friends' ? '/friends' : '') + (st.span !== 'week' ? '/' + spanOf(st.span)[2] : ''); }
  function fromUrl(p) {
    const parts = p.replace(/^\/popular\/?/, '').split('/').filter(Boolean);
    st.who = parts.includes('friends') ? 'friends' : 'everyone';
    const sp = SPANS.find(x => parts.includes(x[2]));
    st.span = sp ? sp[0] : 'week';
  }
  const pathFor = (who, span) => '/popular' + (who === 'friends' ? '/friends' : '') + (span !== 'week' ? '/' + spanOf(span)[2] : '');

  // ---- one film: its poster (marked when you've seen it or saved it), title and year, and who watched it ----
  const avs = f => (f.who || []).slice(0, 3).map(p => typeof fxAvatar === 'function' ? fxAvatar(p.u, p.n, p.a, 's') : '').join('');
  function crowd(f, who) {
    if (who === 'friends') return `<span class="pp-av" title="${esc((f.who || []).map(p => p.n || '@' + p.u).join(', '))}">${avs(f)}</span>${f.n > 3 ? `<span class="pp-n">+${num(f.n - 3)}</span>` : ''}`;
    return `<span class="pp-n">${num(f.n)} ${f.n === 1 ? 'member' : 'members'}</span>`;
  }
  function cell(f, mk, who) {
    const ref = {t: f.t, y: f.y, tm: f.tm, p: f.p}, s = mk.seen(ref), w = !s && mk.wl(ref);
    const avg = f.r ? (f.r / 2).toFixed(1) : '';
    return `<li><a class="dx-cell" href="${esc(fxNav.film(ref))}" data-app title="${esc(f.t + (f.y ? ' (' + f.y + ')' : ''))}">${U.poster(ref, 'w185')}${s ? '<i class="dx-mk dx-mseen" aria-label="Watched"></i>' : w ? '<i class="dx-mk dx-mwl" aria-label="On your watchlist"></i>' : ''}</a>`
      + `<span class="dx-ct">${esc(f.t)}</span><span class="pp-m">${crowd(f, who)}${avg ? `<span class="pp-r" aria-label="Average ${avg} stars">★ ${avg}</span>` : ''}${f.l ? `<span class="pp-l" aria-label="${f.l} ${f.l === 1 ? 'like' : 'likes'}"><i class="fx-ico lk" aria-hidden="true"></i>${num(f.l)}</span>` : ''}</span></li>`;
  }
  const marks = () => U.marks(o.wl || null);

  function view() {
    const c = get(st.who, st.span), fr = st.who === 'friends';
    const seg = [['friends', 'Friends'], ['everyone', 'Everyone']].map(([w, l]) => `<button type="button" class="fx-btn${w === st.who ? ' primary' : ''}" data-pp-who="${w}" aria-pressed="${w === st.who}">${l}</button>`).join('');
    const spans = SPANS.map(([s, l]) => `<button type="button" data-pp-span="${s}" aria-pressed="${s === st.span}">${l}</button>`).join('');
    let h = `<header class="fx-head pp-head"><h1 class="fx-h1">Popular</h1><p class="dx-lede">${fr ? 'What the people you follow watched most.' : 'What members of TVC15 watched most.'}</p></header>
      <div class="pp-tools"><div class="fx-row pf-seg pp-who">${seg}</div><nav class="fx-years pp-span" aria-label="When">${spans}</nav></div>`;
    if (c.state === 'loading' && !c.j) return h + '<p class="fx-muted">Tuning in…</p>';
    if (c.state === 'none' && !c.j) return h + `<div class="fx-blank"><p class="fx-muted">Popular didn’t load. Check your connection and try again.</p><div class="fx-row"><button type="button" class="fx-btn" data-pp-retry>Try again</button></div></div>`;
    const j = c.j, films = j.films || [], when = spanOf(st.span)[3];
    if (!films.length) {
      // nothing in this stretch: say so, and offer the next one that has something
      const wider = SPANS.slice(SPANS.findIndex(x => x[0] === st.span) + 1).find(x => (j.sizes || {})[x[0]]);
      const msg = fr ? (j.sizes && j.sizes.all ? `Nobody you follow logged a film ${when}.` : `Follow people to see what’s popular with them. <a class="fx-link" href="/activity/people" data-app>Find people</a>`)
        : `Nobody on TVC15 logged a film ${when}.`;
      return h + `<div class="fx-blank"><p class="fx-muted">${msg}</p>${wider ? `<div class="fx-row"><button type="button" class="fx-btn" data-pp-span="${wider[0]}">See ${wider[3]}</button></div>` : ''}</div>`;
    }
    const total = (j.sizes || {})[st.span] || films.length;
    h += `<p class="dx-count pp-count"><b>${num(total)} ${total === 1 ? 'film' : 'films'}</b><span>, watched by ${num(j.people)} ${fr ? (j.people === 1 ? 'person you follow' : 'people you follow') : (j.people === 1 ? 'member' : 'members')} ${st.span === 'all' ? 'in all' : when}${total > films.length ? `; the top ${num(films.length)}` : ''}</span></p>`;
    const mk = marks();
    return h + `<ul class="dx-grid pp-grid">${films.map(f => cell(f, mk, st.who)).join('')}</ul><p class="fx-muted pp-note">Each person counts once a film, however often they watched it. Private diaries aren’t counted.</p>`;
  }

  // a row for Home ('friends') and Discover ('everyone'): the shortest stretch of time with at least five films
  function teaser(who) {
    const c = get(who, 'auto', 5), j = c.j;
    if (!j || !(j.films || []).length) return '';
    const sp = spanOf(j.span), fr = who === 'friends', mk = marks();
    const title = fr ? 'Popular with friends' : 'Popular on TVC15';
    return `<section class="fx-card hm-sec pp-tease"><div class="hm-sh"><h2>${title} <span class="pp-when">${esc(sp[3])}</span></h2><a class="fx-link hm-more" href="${pathFor(who, sp[0])}" data-app>More</a></div>`
      + `<ul class="dx-row pp-row">${j.films.slice(0, 12).map(f => cell(f, mk, who)).join('')}</ul></section>`;
  }

  return {
    id: 'popular', hidden: true, label: {en: 'Popular', fa: 'Popular'},
    view, url, fromUrl, teaser,
    click(b, render) {
      const d = b.dataset;
      if (d.ppWho) { st.who = d.ppWho === 'friends' ? 'friends' : 'everyone'; render(); fxNav.replace(url()); return true; }
      if (d.ppSpan) { st.span = spanOf(d.ppSpan)[0]; render(); fxNav.replace(url()); return true; }
      if (b.hasAttribute('data-pp-retry')) { got.delete(st.who + '|' + st.span); render(); return true; }
      return false;
    },
  };
}
