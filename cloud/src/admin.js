// The owner's page (/admin): how TVC15 is doing, every account on it (public or private), and the owner's controls:
// who can join (anyone, people with an invite, or nobody new), the invite code, members' invites, a contact for
// people without an invite; invite links out there; suspending, signing out or deleting an account; taking down a
// comment; and the news on everyone's Home. The site gives all this only to its owner (OWNER on the server); anyone
// else who finds the address is told the page isn't for them. Counts only: nobody's diary or reviews.
// fxAdmin(CS, {redraw, onNews}) → a hidden tab for mountFocus.
function fxAdmin(CS, o) {
  const U = fxCat, esc = U.esc, num = U.num;
  let got = null, at = 0, busy = false, sort = 'seen', manage = '', delAsk = '', armed = '', edit = null, note = '', hl = null, hlBusy = false, mailNote = null;
  function load(force) {
    if (busy || (!force && got && Date.now() - at < 60e3)) return;
    busy = true;
    CS.admin().then(r => { busy = false; got = r.ok ? {ok: true, j: r.j} : {ok: false, status: r.status}; at = Date.now(); if (o.redraw) o.redraw(); });
    if (!hlBusy && CS.health) { hlBusy = true; CS.health().then(r => { hlBusy = false; hl = r.ok ? r.j : null; if (o.redraw) o.redraw(); }); }
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
  const seg = (attr, cur, opts) => `<nav class="fx-years fx-seg">${opts.map(([v, l]) => `<button type="button" ${attr}="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</nav>`;

  // who can join, and how
  function joining(j) {
    const S = j.settings || {}, inv = j.invites || [];
    let h = `<section class="fx-card ad-sec ad-join"><h2>Joining</h2>
      ${seg('data-ad-mode', S.signup, [['open', 'Anyone'], ['invite', 'With an invite'], ['closed', 'Closed']])}
      <p class="fx-muted ad-help">${S.signup === 'open' ? 'Anyone who finds the site can make an account.' : S.signup === 'closed' ? 'Nobody new can join, not even with an invite.' : 'People join with the invite code below or with an invite link from a member.'}</p>`;
    if (S.signup === 'invite') h += `<div class="ad-field"><span>Invite code</span><div class="ad-code"><code dir="ltr">${S.code ? esc(S.code) : 'none'}</code><button type="button" class="fx-btn" data-ad-newcode>New code</button></div>
      <div class="fx-row ad-inline"><input type="text" data-ad-code dir="ltr" placeholder="Or type one of your own" autocomplete="off" spellcheck="false" maxlength="40"><button type="button" class="fx-btn" data-ad-setcode>Set</button></div>
      <p class="fx-muted ad-help">A new code replaces the old one at once: anyone you gave the old one to needs the new one.</p></div>`;
    h += `<div class="ad-field"><span>Invite links each member can make</span>${seg('data-ad-inv', S.invites, [[0, 'None'], [1, '1'], [3, '3'], [5, '5'], [10, '10'], [1000, 'No limit']])}</div>
      <div class="ad-field"><span>Where people without an invite can reach you</span><div class="fx-row ad-inline"><input type="url" data-ad-contact dir="ltr" placeholder="https://t.me/yourname" value="${esc(S.contact || '')}" autocomplete="off" spellcheck="false"><button type="button" class="fx-btn" data-ad-contactsave>Save</button></div>
      <p class="fx-muted ad-help">Shown under the sign-up form. Leave it empty to show nothing.</p></div>`;
    if (inv.length) h += `<div class="ad-field"><span>Invite links out there</span><ul class="ad-invs">${inv.map(i => `<li><span><b>@${esc(i.by)}</b>, until ${esc(day(i.expires))}</span><button type="button" class="fx-link" data-ad-revoke="${esc(i.code)}">Take back</button></li>`).join('')}</ul></div>`;
    return h + `<div class="fx-row"><a class="fx-btn" href="/invite" data-app>Make an invite link</a></div></section>`;
  }
  // what to do about one account (never the owner's own)
  function actions(x) {
    if (manage !== x.username || x.owner) return '';
    if (delAsk === x.username) return `<div class="ad-acts ad-del"><p class="fx-note bad">Delete @${esc(x.username)} for good? Their diary, lists, follows and comments all go, and it can’t be undone. Type their username to confirm.</p>
      <div class="fx-row ad-inline"><input type="text" data-ad-delconfirm dir="ltr" autocomplete="off" spellcheck="false" placeholder="${esc(x.username)}"><button type="button" class="fx-btn fx-danger" data-ad-delyes="${esc(x.username)}">Delete</button><button type="button" class="fx-link" data-ad-delno>Cancel</button></div></div>`;
    return `<div class="ad-acts">${x.banned ? `<button type="button" class="fx-btn" data-ad-suspend="${esc(x.username)}" data-on="0">Restore the account</button>`
      : `<button type="button" class="fx-btn" data-ad-suspend="${esc(x.username)}" data-on="1">Suspend</button><button type="button" class="fx-btn" data-ad-signout="${esc(x.username)}">Sign out everywhere</button>`}
      <button type="button" class="fx-link fx-warn" data-ad-del="${esc(x.username)}">Delete the account</button>
      <p class="fx-muted ad-help">${x.banned ? 'Suspended ' + esc(ago(x.banned)) + ': signed out, can’t sign in, and hidden from everyone. Restoring brings it all back.' : 'Suspending signs them out, stops them signing in and hides their profile, lists and comments. Nothing is deleted, and you can restore it.'}</p></div>`;
  }
  function news(j) {
    const list = (o.news && o.news()) || [];
    const e = edit && edit !== 'new' ? list.find(p => p.id === edit) : null;
    let h = `<section class="fx-card ad-sec ad-news"><h2>News</h2><p class="fx-muted ad-help">Posts show at the top of everyone’s Home until they read them. A blank line starts a new paragraph; lines starting with “- ” make a list.</p>`;
    if (edit) h += `<div class="ad-compose"><input type="text" data-ad-nt maxlength="140" placeholder="Title" value="${esc(e ? e.title : '')}"><textarea data-ad-nb rows="8" placeholder="What’s new?">${esc(e ? e.body : '')}</textarea>
      <div class="fx-row"><button type="button" class="fx-btn primary" data-ad-npub>${e ? 'Save' : 'Publish'}</button><button type="button" class="fx-link" data-ad-ncancel>Cancel</button></div></div>`;
    else h += `<div class="fx-row"><button type="button" class="fx-btn primary" data-ad-nnew>Write a post</button></div>`;
    if (list.length) h += `<ul class="ad-posts">${list.map(p => `<li><div><b>${esc(p.title)}</b><span class="fx-muted">${esc(day(p.at))}</span></div><div class="ad-pa"><button type="button" class="fx-link" data-ad-nedit="${p.id}">Edit</button>`
      + `<button type="button" class="fx-link fx-warn" data-ad-ndel="${p.id}">${armed === 'n' + p.id ? 'Delete for good?' : 'Delete'}</button></div></li>`).join('')}</ul>`;
    return h + '</section>';
  }
  // how the site is doing: requests against Cloudflare's free limits, busy hours, errors, the database's size, email
  const bytes = b => b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
  function health() {
    if (!hl) return `<section class="fx-card ad-sec ad-health"><h2>Site health</h2><p class="fx-muted">${hlBusy ? 'Checking…' : 'Couldn’t load the numbers.'}</p></section>`;
    const H = hl.hours || [], L = hl.limits || {}, now = hl.at || Date.now(), h0 = Math.floor(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()) / 36e5);
    const today = H.filter(x => x.hour >= h0).reduce((a, x) => a + x.n, 0), dayAgo = Math.floor(now / 36e5) - 24, week = Math.floor(now / 36e5) - 24 * 7;
    const errDay = H.filter(x => x.hour > dayAgo).reduce((a, x) => a + x.errs, 0), wk = H.filter(x => x.hour > week);
    const wkN = wk.reduce((a, x) => a + x.n, 0), wkMs = wk.reduce((a, x) => a + x.ms, 0), wkSlow = wk.reduce((a, x) => a + x.slow, 0);
    const mailErr = (hl.errors || []).filter(e => e.code === 'mail' && e.at > now - 864e5).length;
    const pct = v => Math.min(100, Math.round(v * 1000) / 10);
    const meter = (v, of) => `<span class="ad-meter" role="img" aria-label="${pct(v / of)}% of the free limit"><i style="width:${Math.max(v ? 1 : 0, pct(v / of))}%"></i></span>`;
    const ok = !errDay && !mailErr && today < L.requests * 0.8;
    // busy hours: the average requests in each hour of the day (your time), over the last two weeks
    const by = Array(24).fill(0), days = Math.max(1, Math.min(14, Math.ceil((now - (H.length ? H[0].hour * 36e5 : now)) / 864e5)));
    H.forEach(x => { by[new Date(x.hour * 36e5).getHours()] += x.n; });
    const mx = Math.max(1, ...by), peak = by.indexOf(Math.max(...by)), hh = k => String(k).padStart(2, '0') + ':00';
    let h = `<section class="fx-card ad-sec ad-health"><h2>Site health</h2>
      <p class="ad-status ${ok ? 'good' : 'bad'}">${ok ? 'All good.' : errDay ? n(errDay, 'error', 'errors') + ' in the last 24 hours. See below.' : mailErr ? 'Emails aren’t going out. See below.' : 'Close to the free limit for today.'}</p>
      <ul class="ad-lines">
        <li><b>${num(today)}</b><span>requests today, of ${num(L.requests)} a day on Cloudflare’s free plan (it starts again at midnight UTC)${meter(today, L.requests)}</span></li>
        <li><b>${wkN ? num(Math.round(wkMs / wkN)) + ' ms' : '—'}</b><span>for an average request this week${wkSlow ? `; ${num(wkSlow)} took longer than 3 seconds` : ''}</span></li>
        ${hl.size ? `<li><b>${bytes(hl.size)}</b><span>database, of ${bytes(L.storage)} free${meter(hl.size, L.storage)}</span></li>` : ''}
        <li><b>${hl.mail ? 'On' : 'Off'}</b><span>${hl.mail ? 'Password-reset email is set up.' : 'Password-reset email isn’t set up yet: add RESEND_API_KEY and MAIL_FROM in Cloudflare (see SETUP.md).'}</span></li></ul>`;
    if (hl.mail) h += `<div class="fx-row"><button type="button" class="fx-btn" data-ad-mailtest>Send me a test email</button></div>${mailNote ? `<p class="fx-note ${mailNote[0]}">${esc(mailNote[1])}</p>` : ''}`;
    if (H.length) h += `<h3>Busy hours</h3><p class="fx-muted ad-help">Average requests in each hour of the day, your time, over the last ${n(days, 'day', 'days')}. Busiest around ${hh(peak)}.</p>
      <div class="ad-hours" role="img" aria-label="Busiest around ${hh(peak)}">${by.map((v, k) => `<div title="${hh(k)}: about ${num(Math.round(v / days))} requests"><i style="--h:${v ? Math.max(4, Math.round(v / mx * 100)) : 0}%"></i>${k % 6 === 0 ? `<span>${hh(k).slice(0, 2)}</span>` : ''}</div>`).join('')}</div>`;
    const E = hl.errors || [];
    h += `<h3>Errors</h3>${E.length ? `<p class="fx-muted ad-help">Kept for 30 days. Each says what was asked for and what went wrong.</p><ul class="ad-errs">${E.slice(0, 20).map(e => `<li><span class="ad-ew">${esc(ago(e.at))}</span><code dir="ltr">${esc(e.method)} ${esc(e.path)}${e.status ? ' → ' + e.status : ''}${e.code ? ' ' + esc(e.code) : ''}</code>${e.msg ? `<span class="ad-em" dir="ltr">${esc(e.msg)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="fx-muted">None in the last 30 days.</p>'}
      <p class="fx-muted ad-help">The database itself: Cloudflare → Workers &amp; Pages → D1 → your database → Console. Reads and writes per day are under Metrics there.</p></section>`;
    return h;
  }
  function comments(j) {
    const list = j.comments || [];
    if (!list.length) return '';
    return `<section class="fx-card ad-sec"><h2>Recent comments</h2><p class="fx-muted ad-help">Take down one that breaks the ground rules.</p><ul class="ad-cms">${list.map(c => `<li><p class="ad-cm" dir="auto">${esc(c.text)}</p>`
      + `<div class="ad-cmeta"><span>@${esc(c.by)} on @${esc(c.on)}’s ${c.film ? esc(c.film) : 'entry'}, ${esc(ago(c.at))}</span><button type="button" class="fx-link fx-warn" data-ad-uncomment="${c.id}">${armed === 'c' + c.id ? 'Take it down?' : 'Take down'}</button></div></li>`).join('')}</ul></section>`;
  }

  function view() {
    load();
    let h = `<header class="fx-head ad-head"><div class="fx-eye">Only you can see this page</div><h1 class="fx-h1">Your site</h1></header>`;
    if (!got) return h + '<p class="fx-muted">Tuning in…</p>';
    if (!got.ok) return h + (got.status === 404 ? `<div class="fx-blank"><p class="fx-muted">This page is only for the person who runs the site.</p></div>`
      : `<div class="fx-blank"><p class="fx-muted">The numbers didn’t load. Check your connection and try again.</p><div class="fx-row"><button type="button" class="fx-btn" data-ad-retry>Try again</button></div></div>`);
    const j = got.j, T = j.totals, P = j.people || [];
    if (note) h += `<p class="fx-note bad">${esc(note)}</p>`;
    h += `<section class="fx-big ad-big" dir="ltr">${[[T.members, T.members === 1 ? 'Member' : 'Members'], [T.activeWeek, 'Active this week'], [T.newMonth, 'New this month'], [T.entries, 'Diary entries']]
      .map(([v, l]) => `<div><b data-n="${Math.min(8, num(v).length)}">${num(v)}</b><span>${esc(l)}</span></div>`).join('')}</section>`;
    const line = (b, rest) => `<li><b>${b}</b><span>${rest}</span></li>`;
    h += health();
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
    for (let k = 11; k >= 0; k--) { const d = new Date(d0.getFullYear(), d0.getMonth() - k, 1); ms.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); }
    const cnt = ms.map(m => (j.months || {})[m] || 0), mx = Math.max(1, ...cnt);
    if (cnt.some(Boolean)) h += `<section class="fx-card ad-sec"><h2>Sign-ups</h2><div class="hm-months ad-months" role="img" aria-label="Sign-ups each month: ${cnt.join(', ')}">${ms.map((m, k) => `<div><i style="--h:${cnt[k] ? Math.max(6, Math.round(cnt[k] / mx * 100)) : 0}%" title="${cnt[k]}"></i><span>${'JFMAMJJASOND'[+m.slice(5) - 1]}</span></div>`).join('')}</div></section>`;
    h += joining(j) + news(j);
    // everyone, public or private
    const by = {seen: (a, b) => b.seen - a.seen, joined: (a, b) => b.joined - a.joined, entries: (a, b) => b.entries - a.entries || b.seen - a.seen}[sort];
    h += `<section class="ad-people"><div class="ad-ph"><h2>Everyone</h2>${seg('data-ad-sort', sort, [['seen', 'Last active'], ['joined', 'Newest'], ['entries', 'Most entries']])}</div><ul class="ad-list">${P.slice().sort(by).map(x => {
      const who = `${typeof fxAvatar === 'function' ? fxAvatar(x.username, x.name, x.av, 'm') : ''}<span class="ad-n"><b dir="auto">${esc(x.name || x.username)}</b><small>@${esc(x.username)}</small></span>`;
      const facts = [n(x.entries, 'entry', 'entries'), x.reviews ? n(x.reviews, 'review', 'reviews') : '', x.seenOnly ? num(x.seenOnly) + ' seen without a date' : '', x.wl ? num(x.wl) + ' on the watchlist' : '',
        n(x.followers, 'follower', 'followers'), num(x.following) + ' following', x.lists ? n(x.lists, 'list', 'lists') : '', x.plan ? 'on ' + (PLAN[x.plan] || x.plan) : 'no plan yet', x.lb ? 'Letterboxd connected' : '', x.email ? 'has an email for resets' : ''].filter(Boolean);
      const tags = (x.owner ? '<span class="fx-badge">You</span>' : '') + (x.banned ? '<span class="ad-tag ban">Suspended</span>' : x.public ? (x.diary ? '' : '<span class="ad-tag">Diary private</span>') : '<span class="ad-tag priv">Private profile</span>');
      return `<li class="${x.banned ? 'ad-banned' : ''}">${x.public && !x.banned ? `<a class="ad-who" href="/u/${esc(x.username)}">${who}</a>` : `<span class="ad-who">${who}</span>`}
        <div class="ad-tags">${tags}${x.owner ? '' : `<button type="button" class="fx-link ad-man" data-ad-manage="${esc(x.username)}" aria-expanded="${manage === x.username}">Manage</button>`}</div>
        <p class="ad-when">Joined ${esc(day(x.joined))}${x.invitedBy ? `, invited by @${esc(x.invitedBy)}` : ''}, active ${esc(ago(x.seen))}${x.devices ? `, signed in on ${n(x.devices, 'device', 'devices')}` : ''}</p>
        <p class="ad-facts">${esc(facts.join(', '))}</p>${actions(x)}</li>`;
    }).join('')}</ul></section>`;
    h += comments(j);
    return h + `<p class="fx-muted ad-note">Counts only: nobody’s diary or reviews are shown here. Updated ${esc(ago(j.at))}.</p>`;
  }
  // every change: say so if it didn't work, then fetch the page again
  const val = sel => { const el = document.querySelector(sel); return el ? el.value : ''; };
  function act(p, done) {
    busy = true;
    p.then(r => { busy = false; note = r.ok ? '' : r.code === 'bad' ? 'That isn’t a valid value.' : 'That didn’t work. Try again.'; if (r.ok && done) done(r); load(true); });
  }
  return {
    id: 'admin', hidden: true, label: {en: 'Your site', fa: 'Your site'},
    view,
    left() { manage = ''; delAsk = ''; armed = ''; edit = null; note = ''; },
    click(b, render) {
      const d = b.dataset, set = o2 => act(CS.adminDo('settings', o2));
      if (d.adSort) { sort = ['seen', 'joined', 'entries'].includes(d.adSort) ? d.adSort : 'seen'; render(); return true; }
      if (b.hasAttribute('data-ad-retry')) { got = null; load(true); render(); return true; }
      if (b.hasAttribute('data-ad-mailtest')) {
        mailNote = ['busy', 'Sending…']; render();
        CS.adminDo('mailtest', {}).then(r => { mailNote = r.ok ? ['ok', 'Sent to ' + r.j.to + '. Check your inbox (and spam).'] : ['bad', r.code === 'noemail' ? 'Add and confirm your own email in Settings → Account first.' : CS.say(r.code)]; render(); if (!r.ok) { hl = null; load(true); } });
        return true;
      }
      if (busy) return true;
      if (d.adMode) { set({signup: d.adMode}); return true; }
      if (b.hasAttribute('data-ad-newcode')) { set({newCode: true}); return true; }
      if (b.hasAttribute('data-ad-setcode')) { const c = val('[data-ad-code]').trim(); if (c) set({code: c}); return true; }
      if (d.adInv !== undefined) { set({invites: +d.adInv}); return true; }
      if (b.hasAttribute('data-ad-contactsave')) { set({contact: val('[data-ad-contact]').trim()}); if (typeof fxOSD === 'function') fxOSD('Saved'); return true; }
      if (d.adRevoke) { act(CS.adminDo('revoke', {code: d.adRevoke})); return true; }
      if (d.adManage) { manage = manage === d.adManage ? '' : d.adManage; delAsk = ''; render(); return true; }
      if (d.adSuspend) { act(CS.adminDo('suspend', {username: d.adSuspend, on: d.on === '1'}), () => typeof fxOSD === 'function' && fxOSD(d.on === '1' ? 'Suspended' : 'Restored')); return true; }
      if (d.adSignout) { act(CS.adminDo('signout', {username: d.adSignout}), () => typeof fxOSD === 'function' && fxOSD('Signed out')); return true; }
      if (d.adDel) { delAsk = d.adDel; render(); return true; }
      if (b.hasAttribute('data-ad-delno')) { delAsk = ''; render(); return true; }
      if (d.adDelyes) { const c = val('[data-ad-delconfirm]').trim().toLowerCase(); if (c !== d.adDelyes) { note = 'Type the username exactly to delete the account.'; render(); return true; } act(CS.adminDo('delete', {username: d.adDelyes, confirm: c}), () => { manage = ''; delAsk = ''; if (typeof fxOSD === 'function') fxOSD('Deleted'); }); return true; }
      if (d.adUncomment) { if (armed !== 'c' + d.adUncomment) { armed = 'c' + d.adUncomment; render(); return true; } armed = ''; act(CS.adminDo('uncomment', {id: +d.adUncomment})); return true; }
      if (b.hasAttribute('data-ad-nnew')) { edit = 'new'; render(); return true; }
      if (d.adNedit) { edit = +d.adNedit; render(); return true; }
      if (b.hasAttribute('data-ad-ncancel')) { edit = null; render(); return true; }
      if (b.hasAttribute('data-ad-npub')) {
        const title = val('[data-ad-nt]').trim(), text = val('[data-ad-nb]').trim();
        if (!title || !text) { note = 'A post needs a title and some text.'; render(); return true; }
        act(CS.newsPost(Object.assign({title, body: text}, edit !== 'new' ? {id: edit} : {})), () => { edit = null; if (o.onNews) o.onNews(); if (typeof fxOSD === 'function') fxOSD('Published'); });
        return true;
      }
      if (d.adNdel) { if (armed !== 'n' + d.adNdel) { armed = 'n' + d.adNdel; render(); return true; } armed = ''; act(CS.newsDelete(+d.adNdel), () => o.onNews && o.onNews()); return true; }
      return false;
    },
  };
}
