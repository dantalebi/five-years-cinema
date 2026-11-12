// Your account, in Settings. ui(part) draws one part where Settings puts it: 'summary' (who you're signed in as, at the
// top of Settings), 'picture' (your profile picture, in Profile), 'blocked' (in Privacy), 'security' (password, recovery
// key, the devices you're signed in on), 'signout', 'delete' (in Account).
// fxAccount(CloudSync) → {ui(part), click(button, render), submit(form, render), about()}: the app passes its clicks and
// form submissions through.
function fxAccount(CS, o) {
  o = o || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const st = {sessions: null, blocks: null, note: {}, rk: '', rkAsk: false, outWarn: false, allWarn: false, delSure: false, busy: '', menu: false};
  const pic = (u, n, a, size) => typeof fxAvatar === 'function' ? fxAvatar(u, n, a, size) : '';
  let loadedAt = 0;
  const ago = ms => {
    const m = Math.max(0, (Date.now() - ms) / 6e4);
    if (m < 5) return 'active now';
    if (m < 60) return 'active ' + Math.round(m) + ' minutes ago';
    if (m < 1440) { const h = Math.round(m / 60); return 'active ' + h + (h === 1 ? ' hour ago' : ' hours ago'); }
    const d = Math.round(m / 1440); return d === 1 ? 'active yesterday' : d < 30 ? 'active ' + d + ' days ago' : 'last active ' + new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric'}).format(new Date(ms));
  };
  function device(ua) {
    ua = String(ua || '');
    const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : ua ? 'A browser' : 'Unknown device';
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Macintosh|Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : '';
    return b + (os ? ' on ' + os : '');
  }
  const msg = k => st.note[k] ? `<p class="fx-note ${st.note[k][0]}">${esc(st.note[k][1])}</p>` : '';
  async function load(render) {
    if (Date.now() - loadedAt < 30e3) return;
    loadedAt = Date.now();
    const [s, b] = await Promise.all([CS.sessions(), CS.blocks()]);
    if (s.ok) st.sessions = s.j.sessions || [];
    if (b.ok) st.blocks = b.j.blocks || [];
    render();
  }
  let renderRef = null;

  // who you are, at the top of Settings
  function summary() {
    const me = CS.me() || {}, sync = CS.status ? CS.status() : {};
    const syncLine = sync.state === 'err' ? `<span class="fx-bad">${esc(sync.msg || 'Not synced')}</span>` : sync.state === 'busy' ? 'Saving…' : 'Saved to your account, in sync on all your devices';
    let h = `<section class="ac-me"><a class="ac-who" href="/u/${esc(me.username || '')}">${pic(me.username, me.name, me.av, 'l')}<span><b dir="auto">${esc(me.name || me.username || '')}</b><span>@${esc(me.username || '')}</span><small>${syncLine}</small></span><em>View profile</em></a>`;
    if (me.rk === false) h += `<p class="fx-note ac-rknote">You don’t have a recovery key yet. Without one, a forgotten password can’t be reset. <button type="button" class="fx-link" data-sset="account">Make one</button></p>`;
    return h + '</section>';
  }
  // your picture, in Profile
  function picture() {
    const me = CS.me() || {};
    const act = typeof fxAvatarEditor !== 'undefined' ? `<div class="ac-avact"><label class="fx-btn ac-file">${me.av ? 'Change picture' : 'Add a picture'}<input type="file" accept="image/*" data-ac-avfile></label><button type="button" class="fx-btn" data-ac-avstill>Use a film still</button>${me.av ? '<button type="button" class="fx-link" data-ac-avrm>Remove</button>' : ''}</div>` : '';
    return `<section class="fx-card ac-pic"><h2>Picture</h2><div class="ac-picrow">${pic(me.username, me.name, me.av, 'l')}${act}</div>${msg('av')}</section>`;
  }
  function signout() {
    let h = `<div class="ac-out"><button type="button" class="fx-btn" data-ac-out>Sign out</button>`;
    if (st.outWarn) h += `<div class="fx-note bad ac-warn"><p>Some changes on this device haven’t been saved to your account yet (you may be offline). If you sign out now, they’ll be lost.</p>
      <div class="fx-row"><button type="button" class="fx-btn" data-ac-retry>Try saving again</button><button type="button" class="fx-btn fx-danger" data-ac-outforce>Sign out anyway</button></div></div>`;
    return h + msg('out') + '</div>';
  }
  function blocked() {
    let h = `<section class="fx-card"><h2>Blocked accounts</h2><p class="fx-muted">People you block can’t follow you, react to or comment on your entries, or see your profile while they’re signed in. They aren’t told.</p>`;
    if (st.blocks === null) h += `<p class="fx-muted">Loading…</p>`;
    else if (!st.blocks.length) h += `<p class="fx-muted">You haven’t blocked anyone. To block someone, open their profile.</p>`;
    else h += `<ul class="ac-list">${st.blocks.map(b => `<li><span><b dir="auto">${esc(b.name || b.username)}</b> <span class="fx-muted">@${esc(b.username)}</span></span><button type="button" class="fx-btn" data-ac-unblock="${esc(b.username)}">Unblock</button></li>`).join('')}</ul>`;
    return h + msg('blocks') + '</section>';
  }
  function security() {
    const me = CS.me() || {};
    let h = `<section class="fx-card" id="ac-security"><h2>Password</h2>
      <details class="fx-more"${st.note.pw ? ' open' : ''}><summary>Change password</summary><form class="fx-form ac-form" data-ac-pw>
        <input type="password" name="cur" autocomplete="current-password" dir="ltr" placeholder="Current password" aria-label="Current password" required>
        <input type="password" name="next" autocomplete="new-password" minlength="8" dir="ltr" placeholder="New password (at least 8 characters)" aria-label="New password" required>
        <input type="password" name="again" autocomplete="new-password" minlength="8" dir="ltr" placeholder="New password again" aria-label="New password again" required>
        <button type="submit" class="fx-btn primary">Change password</button></form>${msg('pw')}</details>
      <div class="ac-sub"><h3>Recovery key</h3><p class="fx-muted">If you forget your password, your username and recovery key get you back in. ${me.rk ? 'You have one.' : '<b>You don’t have one yet.</b>'} Making a new key cancels the old one.</p>`;
    if (st.rk) h += `<div class="ac-key"><code dir="ltr">${esc(st.rk)}</code><div class="fx-row"><button type="button" class="fx-btn" data-ac-copyrk>Copy</button><button type="button" class="fx-btn primary" data-ac-rkdone>I’ve saved it</button></div>
      <p class="fx-muted">Keep it somewhere safe, like your password manager. It won’t be shown again.</p></div>`;
    else if (st.rkAsk) h += `<form class="fx-form ac-form" data-ac-rk><input type="password" name="pw" autocomplete="current-password" dir="ltr" placeholder="Your password" aria-label="Your password" required><button type="submit" class="fx-btn primary">Make a recovery key</button></form>`;
    else h += `<div class="fx-row"><button type="button" class="fx-btn${me.rk ? '' : ' primary'}" data-ac-rkask>${me.rk ? 'Make a new recovery key' : 'Make a recovery key'}</button></div>`;
    h += msg('rk') + `</div><div class="ac-sub"><h3>Where you’re signed in</h3>`;
    if (st.sessions === null) h += `<p class="fx-muted">Loading…</p>`;
    else {
      h += `<ul class="ac-list">${st.sessions.map(s => `<li><span><b>${esc(device(s.ua))}</b> <span class="fx-muted">${s.current ? 'This device' : esc(ago(s.seen))}</span></span>${s.current ? '' : `<button type="button" class="fx-btn" data-ac-end="${esc(s.id)}">Sign out</button>`}</li>`).join('')}</ul>`;
      if (st.sessions.length > 1) h += `<div class="fx-row"><button type="button" class="fx-btn" data-ac-endothers>Sign out of all other devices</button></div>`;
    }
    return h + msg('sessions') + `</div></section>`;
  }
  function del() {
    return `<section class="fx-card"><h2>Delete your account</h2><p class="fx-muted">This deletes everything: your diary, plan, profile, follows, reactions and comments. It can’t be undone, so download your data first if you want a copy.</p>
      <div class="fx-row"><button type="button" class="fx-btn" data-dl-data>Download my data</button></div>
      <details class="fx-more"${st.delSure || st.note.del ? ' open' : ''}><summary>Delete my account</summary><form class="fx-form ac-form" data-ac-del><input type="password" name="pw" autocomplete="current-password" dir="ltr" placeholder="Your password" aria-label="Your password" required>
      <button type="submit" class="fx-btn fx-danger">${st.delSure ? 'Delete it for good' : 'Delete my account'}</button></form>${st.delSure ? '<p class="fx-note bad">This is permanent. Press the button again to delete your account.</p>' : ''}${msg('del')}</details></section>`;
  }
  const siteName = () => (typeof FY_CONFIG !== 'undefined' && FY_CONFIG.siteName) || 'TVC15';
  function ui(part, render) {
    if (render) renderRef = render;
    if ((part === 'blocked' || part === 'security') && renderRef) load(renderRef);
    return {summary, picture, blocked, security, signout, delete: del}[part] ? {summary, picture, blocked, security, signout, delete: del}[part]() : '';
  }

  async function click(b, render) {
    const d = b.dataset;
    if (b.hasAttribute('data-ac-menu')) { st.menu = !st.menu; render(); return true; }
    if (b.hasAttribute('data-ac-avstill')) { const v = await fxAvatarEditor.stills(); if (v != null) { st.note.av = ['ok', 'Picture saved.']; render(); typeof fxOSD === 'function' && fxOSD('Picture saved'); } return true; }
    if (b.hasAttribute('data-ac-avrm')) { const r = await CS.removeAvatar(); st.note.av = r.ok ? null : ['bad', CS.say(r.code)]; render(); return true; }
    if (b.hasAttribute('data-ac-out') || b.hasAttribute('data-ac-retry')) {
      st.note.out = null; b.disabled = true; st.menu = false;
      const r = await CS.disconnect();
      if (r === 'unsynced') { st.outWarn = true; render(); if (o.toSettings) o.toSettings(); }
      else if (r) { st.note.out = ['bad', r]; render(); }
      return true;
    }
    if (b.hasAttribute('data-ac-outforce')) { await CS.disconnect({force: true}); return true; }
    if (d.acUnblock) {
      const r = await CS.block(d.acUnblock, false);
      if (r.ok) st.blocks = (st.blocks || []).filter(x => x.username !== d.acUnblock); else st.note.blocks = ['bad', CS.say(r.code)];
      render(); return true;
    }
    if (b.hasAttribute('data-ac-rkask')) { st.rkAsk = true; st.note.rk = null; render(); const i = document.querySelector('form[data-ac-rk] input'); if (i) i.focus(); return true; }
    if (b.hasAttribute('data-ac-copyrk')) { (navigator.clipboard ? navigator.clipboard.writeText(st.rk) : Promise.reject()).then(() => { b.textContent = 'Copied'; }, () => {}); return true; }
    if (b.hasAttribute('data-ac-rkdone')) { st.rk = ''; st.note.rk = ['ok', 'Recovery key saved.']; render(); return true; }
    if (d.acEnd) {
      const r = await CS.endSession(d.acEnd);
      if (r.ok) st.sessions = (st.sessions || []).filter(s => s.id !== d.acEnd); else st.note.sessions = ['bad', CS.say(r.code)];
      render(); return true;
    }
    if (b.hasAttribute('data-ac-endothers')) {
      const r = await CS.endSession('others');
      if (r.ok) { st.sessions = (st.sessions || []).filter(s => s.current); st.note.sessions = ['ok', 'Signed out of every other device.']; } else st.note.sessions = ['bad', CS.say(r.code)];
      render(); return true;
    }
    return false;
  }
  async function submit(f, render) {
    if (f.hasAttribute('data-ac-pw')) {
      const cur = f.elements.cur.value, nx = f.elements.next.value, again = f.elements.again.value;
      if (nx.length < 8) { st.note.pw = ['bad', 'The new password needs at least 8 characters.']; render(); return true; }
      if (nx !== again) { st.note.pw = ['bad', 'The two new passwords don’t match.']; render(); return true; }
      st.note.pw = ['busy', 'Changing…']; render();
      const r = await CS.changePassword(cur, nx);
      st.note.pw = r ? ['bad', r] : ['ok', 'Password changed. Your other devices will need to sign in again.'];
      loadedAt = 0; render(); return true;
    }
    if (f.hasAttribute('data-ac-rk')) {
      st.note.rk = ['busy', 'Making a new key…']; render();
      const r = await CS.newRecoveryKey(f.elements.pw.value);
      if (r.err) st.note.rk = ['bad', r.err]; else { st.rk = r.rk; st.rkAsk = false; st.note.rk = null; }
      render(); return true;
    }
    if (f.hasAttribute('data-ac-del')) {
      if (!st.delSure) { st.delSure = true; const v = f.elements.pw.value; render(); const i = document.querySelector('form[data-ac-del] input'); if (i) i.value = v; return true; }
      st.note.del = ['busy', 'Deleting…']; render();
      const r = await CS.deleteAccount(f.elements.pw.value);
      if (r) { st.delSure = false; st.note.del = ['bad', r]; render(); }
      return true;
    }
    return false;
  }

  // ---- about the site, and what it keeps about you ----
  function about() {
    const n = esc(siteName());
    return `<header class="fx-head"><div class="fx-hrow"><button type="button" class="fx-link fx-bk" data-ac-back>Back</button></div><h1 class="fx-h1">${n}</h1>
      <p class="dx-lede">A film diary for friends: log what you watch, follow what your friends are watching, plan what to see next.</p></header>
      <section class="fx-card ac-doc"><h2>What ${n} keeps</h2><ul>
        <li>Your username and display name.</li>
        <li>Your password, but never as you type it: your device scrambles it first, and the server scrambles that again before storing it. Nobody, including whoever runs the site, can read it.</li>
        <li>Your recovery key, stored the same way.</li>
        <li>Your diary, ratings, reviews, watchlist, plan and settings, so they’re the same on every device.</li>
        <li>Who you follow and block, and the hearts and comments you leave.</li>
        <li>For each device you’re signed in on: the browser’s name and when it was last used, so you can sign it out.</li>
        <li>Whoever runs ${n} sees a list of accounts, public or private: each one’s username and name, when it joined and was last active, and how many entries, reviews, follows and lists it has. Never your password, and never what you wrote.</li></ul></section>
      <section class="fx-card ac-doc"><h2>What others can see</h2><ul>
        <li>Your profile page is public only if you make it public (Settings → Public profile). It shows this week’s films and, if you choose, your diary with ratings, likes and reviews.</li>
        <li>People you follow see your activity only through your public profile. Comments you write can be read by anyone who can see that entry.</li>
        <li>Blocked people can’t see your profile while they’re signed in.</li></ul></section>
      <section class="fx-card ac-doc"><h2>Cookies and other services</h2><ul>
        <li>One cookie keeps you signed in. There are no ads, no trackers and no analytics.</li>
        <li>Film details come from TMDB through the site’s server. Posters load straight from TMDB, and fonts from Google Fonts, so those services see the requests your browser makes for them.</li>
        <li>If you add a Letterboxd username, the site reads that account’s public feed.</li>
        <li>The site runs on Cloudflare.</li></ul></section>
      <section class="fx-card ac-doc"><h2>Your control</h2><ul>
        <li>Download everything at any time: Settings → Download my data.</li>
        <li>Delete your account from Settings. Everything goes at once, and it can’t be undone.</li>
        <li>Sign out of any device from Settings → Where you’re signed in.</li></ul></section>
      <section class="fx-card ac-doc"><h2>Ground rules</h2><ul>
        <li>Mark spoilers in reviews.</li>
        <li>Be decent in comments. You can block anyone, and accounts that harass others can be removed.</li></ul></section>
      <p class="fx-muted dx-attr">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>`;
  }
  // a picture from this device: frame it, save it
  async function file(f, render) { const v = await fxAvatarEditor.open(f); if (v != null) { st.note.av = ['ok', 'Picture saved.']; render(); typeof fxOSD === 'function' && fxOSD('Picture saved'); } }
  // the corner of every screen: your picture, opening the menu Letterboxd has under your name: everywhere that's yours
  // (Home, your profile and each of its parts, your diary and stats), then Settings, About and Sign out
  function corner(onSettings) {
    const me = CS.me() || {}, sync = CS.status ? CS.status() : {}, u = '/u/' + esc(me.username || '');
    const here = location.pathname.replace(/\/+$/, '') || '/';
    const item = ([href, label]) => `<a role="menuitem" href="${href}"${here === href || (href === '/' && here === '/week') ? ' aria-current="page"' : ''}>${label}</a>`;
    const yours = [['/', 'Home'], [u, 'Profile'], [u + '/films', 'Films'], ['/diary', 'Diary'], [u + '/reviews', 'Reviews'], [u + '/watchlist', 'Watchlist'], [u + '/lists', 'Lists'], ['/stats', 'Stats']];
    return `<div class="av-top"><button type="button" class="av-me${onSettings ? ' on' : ''}" data-ac-menu aria-haspopup="menu" aria-expanded="${st.menu}" aria-label="Your account" title="Your account">${pic(me.username, me.name, me.av, 's')}${sync.state === 'err' ? '<i class="av-err" aria-hidden="true"></i>' : ''}</button>
      ${st.menu ? `<div class="av-menu" role="menu"><div class="av-mh"><b dir="auto">${esc(me.name || me.username || '')}</b><span>@${esc(me.username || '')}</span></div>
        <div class="av-mg">${yours.map(item).join('')}</div>
        <div class="av-mg av-msys">${(me.owner ? [['/admin', 'Your site']] : []).concat([['/settings', 'Settings'], ['/about', 'About']]).map(item).join('')}<button type="button" role="menuitem" data-ac-out>Sign out</button></div></div>` : ''}</div>`;
  }
  const closeMenu = () => { if (!st.menu) return false; st.menu = false; return true; };
  return {ui, click, submit, about, device, corner, closeMenu, file};
}
