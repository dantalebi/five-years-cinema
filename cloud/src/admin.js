// The owner's page (/admin): how TVC15 is doing, and every account on it, public or private. The site only gives the
// numbers to its owner (OWNER on the server); anyone else who finds the address is told the page isn't for them.
// Counts only: nothing anyone wrote, and nothing from a private diary but how many entries it has.
// fxAdmin(CS, {redraw}) → a hidden tab for mountFocus.
function fxAdmin(CS, o) {
  const U = fxCat, esc = U.esc, num = U.num;
  let got = null, at = 0, busy = false, sort = 'seen';
  function load(force) {
    if (busy || (!force && got && Date.now() - at < 60e3)) return;
    busy = true;
    CS.admin().then(r => { busy = false; got = r.ok ? {ok: true, j: r.j} : {ok: false, status: r.status}; at = Date.now(); if (o.redraw) o.redraw(); });
  }
  const day = ms => new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric'}).format(new Date(ms));
  const ago = ms => {
    if (!ms) return 'never';
    const m = (Date.now() - ms) / 6e4;
    return m < 2 ? 'just now' : m < 60 ? Math.round(m) + ' minutes ago' : m < 1440 ? Math.round(m / 60) + (Math.round(m / 60) === 1 ? ' hour ago' : ' hours ago')
      : m < 2880 ? 'yesterday' : m < 43200 ? Math.round(m / 1440) + ' days ago' : day(ms);
  };
  const n = (v, one, many) => num(v) + ' ' + (v === 1 ? one : many);
  const PLAN = {own: 'their own plan', list: 'a list', sample: 'Five Years of Cinema'};
  function view() {
    load();
    let h = `<header class="fx-head ad-head"><div class="fx-eye">Only you can see this page</div><h1 class="fx-h1">Your site</h1></header>`;
    if (!got) return h + '<p class="fx-muted">Tuning in…</p>';
    if (!got.ok) return h + (got.status === 404 ? `<div class="fx-blank"><p class="fx-muted">This page is only for the person who runs the site.</p></div>`
      : `<div class="fx-blank"><p class="fx-muted">The numbers didn’t load. Check your connection and try again.</p><div class="fx-row"><button type="button" class="fx-btn" data-ad-retry>Try again</button></div></div>`);
    const j = got.j, T = j.totals, P = j.people || [];
    h += `<section class="fx-big ad-big" dir="ltr">${[[T.members, T.members === 1 ? 'Member' : 'Members'], [T.activeWeek, 'Active this week'], [T.newMonth, 'New this month'], [T.entries, 'Diary entries']]
      .map(([v, l]) => `<div><b data-n="${Math.min(8, num(v).length)}">${num(v)}</b><span>${esc(l)}</span></div>`).join('')}</section>`;
    const line = (b, rest) => `<li><b>${b}</b><span>${rest}</span></li>`;
    h += `<section class="fx-card ad-sec"><h2>Members</h2><ul class="ad-lines">
      ${line(num(T.publicProfiles), `public ${T.publicProfiles === 1 ? 'profile' : 'profiles'}, and ${n(T.members - T.publicProfiles, 'private one', 'private ones')}`)}
      ${line(num(T.publicDiaries), `${T.publicDiaries === 1 ? 'shows its diary' : 'show their diaries'}; the rest keep it to themselves`)}
      ${line(num(T.activeDay), `active today, ${num(T.activeWeek)} this week, ${num(T.activeMonth)} this month`)}
      ${line(num(T.newWeek), `joined this week, ${num(T.newMonth)} this month`)}
      ${line(num(T.letterboxd), `${T.letterboxd === 1 ? 'has' : 'have'} Letterboxd connected`)}</ul></section>`;
    h += `<section class="fx-card ad-sec"><h2>On the site</h2><ul class="ad-lines">
      ${line(num(T.entries), `diary ${T.entries === 1 ? 'entry' : 'entries'}, ${n(T.reviews, 'with a review', 'with reviews')}`)}
      ${line(num(T.seenOnly), `${T.seenOnly === 1 ? 'film' : 'films'} marked seen without a date`)}
      ${line(num(T.watchlists), `${T.watchlists === 1 ? 'film' : 'films'} on watchlists`)}
      ${line(num(T.follows), `${T.follows === 1 ? 'follow' : 'follows'}, ${n(T.hearts, 'heart', 'hearts')}, ${n(T.comments, 'comment', 'comments')}`)}
      ${line(num(T.lists), `${T.lists === 1 ? 'list' : 'lists'}, ${num(T.publicLists)} of them public`)}</ul></section>`;
    // sign-ups, month by month (the last twelve)
    const ms = []; const d0 = new Date(); d0.setDate(1);
    for (let k = 11; k >= 0; k--) { const d = new Date(d0.getFullYear(), d0.getMonth() - k, 1); ms.push(d.toISOString().slice(0, 7)); }
    const cnt = ms.map(m => (j.months || {})[m] || 0), mx = Math.max(1, ...cnt);
    if (cnt.some(Boolean)) h += `<section class="fx-card ad-sec"><h2>Sign-ups</h2><div class="hm-months ad-months" role="img" aria-label="Sign-ups each month: ${cnt.join(', ')}">${ms.map((m, k) => `<div><i style="--h:${cnt[k] ? Math.max(6, Math.round(cnt[k] / mx * 100)) : 0}%" title="${cnt[k]}"></i><span>${'JFMAMJJASOND'[+m.slice(5) - 1]}</span></div>`).join('')}</div></section>`;
    // everyone, public or private
    const by = {seen: (a, b) => b.seen - a.seen, joined: (a, b) => b.joined - a.joined, entries: (a, b) => b.entries - a.entries || b.seen - a.seen}[sort];
    const seg = [['seen', 'Last active'], ['joined', 'Newest'], ['entries', 'Most entries']].map(([k, l]) => `<button type="button" data-ad-sort="${k}" aria-pressed="${sort === k}">${l}</button>`).join('');
    h += `<section class="ad-people"><div class="ad-ph"><h2>Everyone</h2><nav class="fx-years fx-seg" aria-label="Sort">${seg}</nav></div><ul class="ad-list">${P.slice().sort(by).map(x => {
      const who = `${typeof fxAvatar === 'function' ? fxAvatar(x.username, x.name, x.av, 'm') : ''}<span class="ad-n"><b dir="auto">${esc(x.name || x.username)}</b><small>@${esc(x.username)}</small></span>`;
      const facts = [n(x.entries, 'entry', 'entries'), x.reviews ? n(x.reviews, 'review', 'reviews') : '', x.seenOnly ? num(x.seenOnly) + ' seen without a date' : '', x.wl ? num(x.wl) + ' on the watchlist' : '',
        n(x.followers, 'follower', 'followers'), num(x.following) + ' following', x.lists ? n(x.lists, 'list', 'lists') : '', x.plan ? 'on ' + (PLAN[x.plan] || x.plan) : 'no plan yet', x.lb ? 'Letterboxd connected' : ''].filter(Boolean);
      return `<li>${x.public ? `<a class="ad-who" href="/u/${esc(x.username)}">${who}</a>` : `<span class="ad-who">${who}</span>`}
        <div class="ad-tags">${x.username === j.owner ? '<span class="fx-badge">You</span>' : ''}${x.public ? (x.diary ? '' : '<span class="ad-tag">Diary private</span>') : '<span class="ad-tag priv">Private profile</span>'}</div>
        <p class="ad-when">Joined ${esc(day(x.joined))}, active ${esc(ago(x.seen))}${x.devices ? `, signed in on ${n(x.devices, 'device', 'devices')}` : ''}</p>
        <p class="ad-facts">${esc(facts.join(', '))}</p></li>`;
    }).join('')}</ul></section>`;
    return h + `<p class="fx-muted ad-note">Counts only: nobody’s reviews or private diary entries are shown here. Updated ${esc(ago(j.at))}.</p>`;
  }
  return {
    id: 'admin', hidden: true, label: {en: 'Your site', fa: 'Your site'},
    view,
    click(b, render) {
      if (b.dataset.adSort) { sort = ['seen', 'joined', 'entries'].includes(b.dataset.adSort) ? b.dataset.adSort : 'seen'; render(); return true; }
      if (b.hasAttribute('data-ad-retry')) { got = null; load(true); render(); return true; }
      return false;
    },
  };
}
