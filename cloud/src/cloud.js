// The multi-user site. One page, three faces:
//   /u/<username>  a member's public profile (anyone can read it; members can follow and compare tastes)
//   /              signed out: sign in or create an account. Signed in: your own diary app, with a Friends tab.
// Everything you change goes to the site's server (CloudSync) and comes back on your other devices.
(function () {
  let root = document.getElementById('root'), FX = null, PF = null, kind = '', sig = '', busy = false;
  const C = typeof FY_CONFIG !== 'undefined' ? FY_CONFIG : {};
  const S = {all: () => Store.data, set: (k, v) => Store.set(k, v)};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const fresh = () => { if (PF) { PF.stop(); PF = null; } FX = null; const r = root.cloneNode(false); root.replaceWith(r); root = r; };
  const lang = () => 'en';  // the site is in English (the app's Persian strings stay, unused)
  const num = n => lang() === 'fa' ? Number(n).toLocaleString('fa-IR') : Number(n).toLocaleString('en-US');
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  if (typeof fxTune !== 'undefined' && !window.fxFetch0) {
    const f0 = window.fxFetch0 = window.fetch.bind(window);
    window.fetch = (u, o) => /\/api\/(sync|inbox|me)\b/.test(String(u && u.url || u)) ? f0(u, o) : fxTune.wrap(f0(u, o));
  }
  Posters.setProxy('/api/tmdb');
  CloudSync.setLang(() => lang());
  Posters.setChosen(k => Store.data['ps:' + k] || '');

  const GT = {
    en: {
      site: C.siteName || 'Film Diary', tag: 'A film diary with a plan. Log what you watch, follow your friends, and pick tonight’s film together.', langL: 'فارسی',
      about: 'Named after “TVC 15,” David Bowie’s song about a television set that swallows people whole.',
      signin: 'Sign in', signup: 'Create an account', user: 'Username', userPh: 'Letters, numbers and underscores', pass: 'Password', passNew: 'Password (at least 8 characters)', name: 'Your name', namePh: 'Shown on your profile', code: 'Invite code',
      pub: 'Make my profile public (people can see your diary and follow you)', go: 'Sign in', make: 'Create account', working: 'One moment…', short: 'Your password needs at least 8 characters.',
      privacy: 'Your password is scrambled on your device before it’s sent, so the site never sees it. No email or phone number required.',
      h0: 'Build your plan', p0: 'Choose how long and how many films a week, and get a schedule made for you from the Discover catalog: film history, great directors, recent films and popular favorites, mixed week by week. It leaves out what you’ve already logged.', b0: 'Build your plan',
      h1: 'Make your own list', p1: 'Search for films and add them. Your list is split into weeks, so you only ever see this week’s films.', b1: 'Start a list',
      h2: 'Start from your Letterboxd watchlist', p2: 'Export your data on letterboxd.com (Settings → Data → Export your data), then upload watchlist.csv or any list. You can bring in your full history (the .zip) from Settings later.', b2: 'Upload a .csv',
      h3: 'Follow “Five Years of Cinema”', p3: n => 'The plan this site started with: ' + n + ' films over 260 weeks, from the silent era to today, made by hand for one viewer.', b3: 'Use this plan',
      h4: 'Coming from the old site?', p4: 'On the old site, go to Settings → Backup → “Download everything,” then choose that file here. Your diary, plan and settings all come with you.', b4: 'Choose file',
      per: 'Films per week', importing: (d, n) => 'Matching films with TMDB… ' + d + ' / ' + n, bad: 'That doesn’t look like a Letterboxd export.', nodates: 'This file has no watch dates. To bring in your history, use the .zip in Settings.',
      moving: n => 'Moving ' + n + ' entries…', moved: 'Everything’s here.', badMove: 'That file isn’t from the old site.', signOut: 'Sign out', hi: u => 'Signed in as @' + u,
      followers: n => n + (n === 1 ? ' follower' : ' followers'), following: n => n + ' following', follow: 'Follow', unfollow: 'Following', join: 'Sign in to follow', mine: 'Go to my diary',
    },
    fa: {
      site: C.siteNameFa || 'دفتر فیلم', tag: 'هر هفته فقط فیلم‌های همون هفته، یه دفتر از هر چی می‌بینی، و دفتر دوستات.', langL: 'English',
      signin: 'ورود', signup: 'ساختن حساب', user: 'یوزرنیم', userPh: 'حروف انگلیسی، عدد، _', pass: 'رمز', passNew: 'رمز (حداقل ۸ حرف)', name: 'اسمت', namePh: 'روی پروفایلت نشون داده می‌شه', code: 'کد دعوت',
      pub: 'پروفایل عمومی (بقیه دفترت رو می‌بینن و می‌تونن فالوت کنن)', go: 'ورود', make: 'ساختن حسابم', working: 'یه لحظه…', short: 'رمز باید حداقل ۸ حرف باشه.',
      privacy: 'رمزت قبل از فرستادن روی همین دستگاه درهم می‌شه و سایت هیچ‌وقت خودش رو نمی‌بینه. ایمیل و شماره لازم نیست.',
      h1: 'لیست خودت رو بساز', p1: 'هر فیلمی رو جستجو کن و اضافه کن. لیستت هفته‌به‌هفته چیده می‌شه که فقط فیلم‌های همین هفته جلوت باشه.', b1: 'شروع لیست',
      h2: 'واچ‌لیست لترباکست رو بیار', p2: 'از letterboxd.com خروجی بگیر (Settings ← Data ← Export your data) و watchlist.csv یا هر لیستی رو آپلود کن. کل تاریخچه‌ت (فایل zip) رو بعداً از تنظیمات بیار.', b2: 'آپلود فایل csv',
      h3: 'برنامه‌ی نمونه رو بردار', p3: n => '«پنج سال سینما»: ' + n + ' فیلم توی ۲۶۰ هفته، از سینمای صامت تا امروز.', b3: 'برنامه‌ی نمونه',
      h4: 'از سایت قدیمی میای؟', p4: 'تو سایت قدیمی: تنظیمات ← پشتیبان ← «دانلود همه‌چی». بعد همون فایل رو این‌جا انتخاب کن؛ دفتر، برنامه و تنظیمات همه میان.', b4: 'انتخاب فایل',
      per: 'فیلم در هفته', importing: (d, n) => 'دارم فیلم‌ها رو با TMDB تطبیق می‌دم… ' + d + ' از ' + n, bad: 'این فایل خروجی لترباکس به نظر نمیاد.', nodates: 'این فایل تاریخ دیدن نداره؛ برای تاریخچه فایل zip رو از تنظیمات بیار.',
      moving: n => 'دارم ' + n + ' مورد رو میارم…', moved: 'همه‌چی اومد.', badMove: 'این فایلِ سایت قدیمی نیست.', signOut: 'خروج', hi: u => 'با @' + u + ' وارد شدی',
      followers: n => n + ' دنبال‌کننده', following: n => n + ' دنبال‌شونده', follow: 'فالو', unfollow: 'فالو می‌کنی', join: 'برای فالو وارد شو', mine: 'برو به دفتر خودم',
    },
  };
  const T = () => GT[lang() === 'fa' ? 'fa' : 'en'];
  const shell = (inner, extra) => {
    const L = lang(), dir = L === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = L; document.documentElement.dir = dir;
    root.innerHTML = `<div class="fx fx-onb ${extra || ''}" dir="${dir}" lang="${L}">${inner}</div>`;
  };

  // ================= signed out =================
  let authMode = 'in', authNote = '', cfg = null;
  async function authScreen() {
    fresh();
    if (!cfg) { const r = await CloudSync.config(); cfg = r.ok ? r.j : {}; }
    const t = T(), up = authMode === 'up';
    if (authMode === 'rec') { recoverScreen(); return; }
    shell(`<header class="fx-head fx-authhead">${typeof FX_BRAND !== 'undefined' ? `${FX_BRAND.mark({h: 64, id: 'auth', cls: 'fx-authmark'})}<h1 class="fx-authword">${FX_BRAND.word({h: 40})}</h1>` : `<h1 class="fx-h1">${esc(t.site)}</h1>`}<p class="fx-lede">${esc(t.tag)}</p>${t.about ? `<p class="fx-muted fx-small fx-about">${esc(t.about)}</p>` : ''}</header>
      <div class="fx-years fx-seg fx-authtabs" role="tablist"><button type="button" role="tab" data-amode="in" aria-pressed="${!up}">${t.signin}</button><button type="button" role="tab" data-amode="up" aria-pressed="${up}">${t.signup}</button></div>
      <form class="fx-card fx-authf" data-auth="${authMode}" novalidate>
        <label class="fx-field"><span>${t.user}</span><input name="u" type="text" dir="ltr" autocomplete="username" autocapitalize="off" spellcheck="false" required placeholder="${esc(t.userPh)}"></label>
        ${up ? `<label class="fx-field"><span>${t.name}</span><input name="n" type="text" dir="auto" maxlength="60" autocomplete="name" placeholder="${esc(t.namePh)}"></label>` : ''}
        <label class="fx-field"><span>${up ? t.passNew : t.pass}</span><input name="p" type="password" dir="ltr" autocomplete="${up ? 'new-password' : 'current-password'}" required ${up ? 'minlength="8"' : ''}></label>
        ${up && cfg.code ? `<label class="fx-field"><span>${t.code}</span><input name="c" type="text" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" required></label>` : ''}
        ${up ? `<label class="fx-check"><input type="checkbox" name="pub" checked> ${t.pub}</label>` : ''}
        <div class="fx-row"><button type="submit" class="fx-btn primary">${up ? t.make : t.go}</button></div>
        ${authNote ? `<p class="fx-note ${authNote === t.working ? 'busy' : 'bad'}">${esc(authNote)}</p>` : ''}
        ${up ? '' : `<p class="fx-small"><button type="button" class="fx-link" data-amode="rec">Forgot your password?</button></p>`}
        <p class="fx-muted fx-small">${t.privacy}</p>
      </form>
      <p class="fx-muted fx-small fx-authfoot"><a href="/about">About ${esc(C.siteName || 'TVC15')} and your privacy</a></p>`, 'fx-auth');
    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.amode) { authMode = b.dataset.amode; authNote = ''; authScreen(); }
    });
    root.querySelector('form[data-auth]').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, u = f.elements.u.value.trim().toLowerCase(), p = f.elements.p.value, t2 = T();
      if (!u || !p) return;
      if (authMode === 'up' && p.length < 8) { authNote = t2.short; authScreen(); return; }
      const note = f.querySelector('.fx-note') || f.appendChild(Object.assign(document.createElement('p'), {className: 'fx-note busy'}));
      note.className = 'fx-note busy'; note.textContent = t2.working;
      f.querySelectorAll('input, button').forEach(x => { x.disabled = true; });
      const name = authMode === 'up' ? f.elements.n.value.trim() : '', pub = authMode === 'up' && f.elements.pub.checked;
      const err = authMode === 'up' ? await CloudSync.signup(u, p, name, f.elements.c ? f.elements.c.value.trim() : '') : await CloudSync.login(u, p);
      if (err) { authNote = err; authScreen(); return; }
      authNote = '';
      await Store.load();
      if (authMode === 'up') {
        Store.set('cfg:lang', lang());
        if (name) Store.set('cfg:name', name);
        if (pub) Store.set('cfg:share', u);
      }
      await CloudSync.run();
      const rk = CloudSync.takeKey();
      if (rk) keyScreen(rk, true, home); else home();
    });
  }
  // forgot your password: username, recovery key, a new password
  function recoverScreen(note) {
    fresh();
    shell(`<header class="fx-head"><div class="fx-hrow"><button type="button" class="fx-link fx-bk" data-amode="in">Sign in</button></div><h1 class="fx-h1">Reset your password</h1>
      <p class="fx-lede">Use the recovery key you saved when you made your account (or later, in Settings).</p></header>
      <form class="fx-card fx-authf" data-recover novalidate>
        <label class="fx-field"><span>Username</span><input name="u" type="text" dir="ltr" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>
        <label class="fx-field"><span>Recovery key</span><input name="k" type="text" dir="ltr" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" required></label>
        <label class="fx-field"><span>New password (at least 8 characters)</span><input name="p" type="password" dir="ltr" autocomplete="new-password" minlength="8" required></label>
        <label class="fx-field"><span>New password again</span><input name="p2" type="password" dir="ltr" autocomplete="new-password" minlength="8" required></label>
        <div class="fx-row"><button type="submit" class="fx-btn primary">Reset password</button></div>
        ${note ? `<p class="fx-note bad">${esc(note)}</p>` : ''}
        <p class="fx-muted fx-small">No recovery key? Only someone who runs the site can help, and they’ll need to confirm it’s you.</p>
      </form>`, 'fx-auth');
    root.addEventListener('click', e => { const b = e.target.closest('button[data-amode]'); if (b) { authMode = b.dataset.amode; authNote = ''; authScreen(); } });
    root.querySelector('form[data-recover]').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, u = f.elements.u.value.trim().toLowerCase(), k = f.elements.k.value.trim(), p = f.elements.p.value;
      if (!u || !k || !p) return;
      if (p.length < 8) { recoverScreen('Your new password needs at least 8 characters.'); return; }
      if (p !== f.elements.p2.value) { recoverScreen('The two passwords don’t match.'); return; }
      f.querySelectorAll('input, button').forEach(x => { x.disabled = true; });
      const err = await CloudSync.recover(u, k, p);
      if (err) { recoverScreen(err); return; }
      authMode = 'in';
      await Store.load(); await CloudSync.run();
      keyScreen(CloudSync.takeKey(), false, home);
    });
  }
  // a recovery key, shown once: copy it or download it, then carry on
  // while the recovery key is on screen, nothing (a sync bringing your plan in, say) replaces it
  let keyHold = false;
  function keyScreen(rk, isNew, then) {
    keyHold = true;
    fresh();
    shell(`<header class="fx-head"><div class="fx-eye">${isNew ? 'One more thing' : 'Password reset'}</div><h1 class="fx-h1">Your recovery key</h1>
      <p class="fx-lede">${isNew ? 'If you ever forget your password, this key and your username get you back in.' : 'Your password is changed, and you’re signed out everywhere else. Your old recovery key is used up; here’s a new one.'} Save it now: it won’t be shown again.</p></header>
      <section class="fx-card ac-key"><code class="ac-keybig" dir="ltr">${esc(rk)}</code>
        <div class="fx-row"><button type="button" class="fx-btn" data-kcopy>Copy</button><button type="button" class="fx-btn" data-kdl>Download as a text file</button></div>
        <label class="fx-check"><input type="checkbox" data-kok> I’ve saved my recovery key somewhere safe</label>
        <div class="fx-row"><button type="button" class="fx-btn primary" data-knext disabled>Continue</button></div></section>`, 'fx-auth');
    root.addEventListener('change', e => { if (e.target.matches('[data-kok]')) root.querySelector('[data-knext]').disabled = !e.target.checked; });
    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-kcopy')) (navigator.clipboard ? navigator.clipboard.writeText(rk) : Promise.reject()).then(() => { b.textContent = 'Copied'; }, () => {});
      if (b.hasAttribute('data-kdl')) {
        const me = CloudSync.me() || {}, a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([`${C.siteName || 'TVC15'} recovery key\nUsername: ${me.username || ''}\nRecovery key: ${rk}\n\nKeep this somewhere safe. With your username, it resets your password.\n`], {type: 'text/plain'}));
        a.download = (C.siteName || 'TVC15') + '-recovery-key.txt'; document.body.appendChild(a); a.click(); a.remove();
      }
      if (b.hasAttribute('data-knext')) { keyHold = false; then(); }
    });
  }

  // ================= signed in: your diary =================
  let sampleCache = null;
  async function planData() {
    const k = Store.data['cfg:plan'];
    if (k === 'sample') {
      if (!sampleCache) sampleCache = await (await fetch('/sample-plan.json')).json();
      return sampleCache;
    }
    if (k === 'own') {
      const cached = CloudSync.cachedPlan();
      const latest = CloudSync.loadPlan().then(D => { if (D && cached && FX && JSON.stringify(D) !== JSON.stringify(cached)) { window.D = D; FX.setPlan(D); } return D; });
      const D = cached || await latest;
      if (!D) throw new Error('noplan');
      (D.posters || []).forEach(([kk, p]) => { if (p && !Posters.src(kk)) Posters.put(kk, p); });
      return D;
    }
    const D = FXL.plan(Store.data);
    D.posters.forEach(([kk, p]) => { if (p) Posters.put(kk, p); });
    return D;
  }
  const listAdapter = () => ({
    add: o => FXL.add(S, o), remove: id => FXL.remove(S, id), move: (id, d) => FXL.move(S, id, d),
    setPerWeek: n => S.set('cfg:perweek', Math.max(1, Math.min(14, n))),
    importFile: (text, name, progress) => importCsv(text, name, progress),
  });
  async function importCsv(text, name, progress) {
    const r = FXL.readLetterboxd(text, name);
    if (r.kind === 'list') return Object.assign({kind: 'list'}, await FXL.importList(S, Posters, r.rows, progress));
    if (r.kind === 'diary') { const res = await FXL.importDiary(S, Posters, r.rows, progress); enrichSoon(); return Object.assign({kind: 'diary'}, res); }
    return {kind: r.kind};
  }
  // plan films logged on Letterboxd from this day on tick the plan; older ones are just diary entries
  const since = () => Store.data['cfg:since'] || today();

  // ---- Letterboxd: the export once (Settings), then new logs from your public feed, read through this site ----
  let lbPulling = false;
  async function lbPull() {
    const u = Store.data['cfg:lb'];
    if (lbPulling || !window.D || !/^[A-Za-z0-9_]{1,40}$/.test(u || '')) return;
    lbPulling = true;
    try {
      const r = await fetch('/api/lb/' + encodeURIComponent(u), {credentials: 'same-origin'});
      if (!r.ok) return;
      const res = FXLB.merge(FXLB.fromRss(await r.text()), Store.data, window.D.F, since());
      res.sets.forEach(([k, v]) => Store.set(k, v));
      Store.set('lbsync:at', new Date().toISOString());
      if (res.added + res.ticked + res.merged) { Store.set('lbsync:n', res.added + res.ticked + res.merged); if (FX) FX.render(); enrichSoon(); }
    } catch (e) {} finally { lbPulling = false; }
  }
  async function pool(list, n, fn) { let i = 0; await Promise.all(Array.from({length: Math.min(n, list.length)}, async () => { while (i < list.length) await fn(list[i++]); })); }
  const LBX = {
    status: () => ({at: Store.data['lbsync:at'] || '', n: +Store.data['lbsync:n'] || 0}),
    async importFiles(files, progress) {
      let rows = [];
      const fw = {}, FILMS = {'watched.csv': 'w', 'ratings.csv': 'r', 'likes/films.csv': 'l', 'watchlist.csv': 'wl'};
      for (const f of files) {
        const head = new Uint8Array(await f.slice(0, 2).arrayBuffer());
        if (head[0] === 0x50 && head[1] === 0x4b) {
          const z = await FXLB.unzip(await f.arrayBuffer(), ['diary.csv', 'reviews.csv'].concat(Object.keys(FILMS))) || {};
          ['diary.csv', 'reviews.csv'].forEach(n => { const r = z[n] && FXLB.fromCsv(z[n]); if (r) rows = rows.concat(r); });
          Object.keys(FILMS).forEach(n => { if (z[n]) fw[FILMS[n]] = z[n]; });
        } else {
          const txt = await f.text(), r = FXLB.fromCsv(txt);
          if (r) rows = rows.concat(r);
          else if (/^watched\.csv$/i.test(f.name)) fw.w = txt; else if (/^ratings\.csv$/i.test(f.name)) fw.r = txt; else if (/^films\.csv$/i.test(f.name)) fw.l = txt; else if (/^watchlist\.csv$/i.test(f.name)) fw.wl = txt;
        }
      }
      const films = FXLB.fromFilms(fw.w, fw.r, fw.l) || [];
      const wlN = fw.wl && FR ? importWatchlist(fw.wl) : 0;
      if (!rows.length && !films.length) return wlN ? {added: 0, ticked: 0, merged: 0, wl: wlN} : {bad: true};
      const D = window.D, isPlan = FXLB.matcher(D.F), need = {};
      rows.forEach(r => { if (!isPlan(r)) { const k = FXLB.norm(r.t) + '|' + r.y; (need[k] = need[k] || []).push(r); } });
      const keys = Object.keys(need); let done = 0;
      progress(0, keys.length);
      await pool(keys, 4, async k => {
        const r0 = need[k][0];
        try {
          const m = await Posters.match(r0.t, r0.y);
          if (m) {
            const d = m.id ? await Posters.details(m.id).catch(() => ({})) : {}, p = d.p || m.p || '';
            need[k].forEach(r => { r.tm = m.id; r.md = {d: d.d || '', m: d.m || 0, p}; });
            if (p) Posters.put('tx:' + r0.t + (r0.y ? ' (' + r0.y + ')' : ''), p);
          }
        } catch (e) {}
        progress(++done, keys.length);
      });
      const res = FXLB.merge(rows, Store.data, D.F, since());
      res.sets.forEach(([kk, v]) => Store.set(kk, v));
      const fr = FXLB.mergeFilms(films, Store.data, D.F);
      fr.sets.forEach(([kk, v]) => Store.set(kk, v));
      enrichSoon();
      return Object.assign(res, {liked: fr.liked, undated: fr.undated});
    },
  };
  // Letterboxd's watchlist.csv → your watchlist here (films you've already seen are left out)
  function importWatchlist(text) {
    const rows = FXLB.csv(text), hi = rows.findIndex(r => r.includes('Name') && r.includes('Year')); if (hi < 0) return 0;
    const H = rows[hi], cN = H.indexOf('Name'), cY = H.indexOf('Year'), cD = H.indexOf('Date');
    const seen = new Set(); try { fxDiary(window.D, Store.data).concat(fxWatched(window.D, Store.data)).forEach(e => seen.add(norm(String(e.t).replace(/\s*\(\d{4}\)\s*$/, '')) + '|' + (+e.y || 0))); } catch (e) {}
    let n = 0;
    rows.slice(hi + 1).slice(0, 3000).forEach(r => {
      const t = String(r[cN] || '').trim(), y = +(r[cY] || 0) || 0; if (!t || seen.has(norm(t) + '|' + y)) return;
      const k = FR.wl.key({t, y, tm: 0}); if (Store.data[k]) return;
      Store.set(k, JSON.stringify({t, y, tm: 0, p: '', u: '', at: Date.parse(r[cD] || '') || Date.now()})); n++;
    });
    return n;
  }
  // fill in director, runtime and poster where only a TMDB id or a bare title is known; then genres and cast for the stats
  let enriching = false; const tried = new Set();
  async function enrichSome() {
    if (enriching || !window.D) return;
    enriching = true; let n = 0;
    try {
      const bare = Object.keys(Store.data).filter(k => /^wx:[^:]+$/.test(k) && String(Store.data[k]).startsWith('t:') && !Store.data['md:' + k] && !tried.has('md:' + k));
      await pool(bare, 3, async k => {
        tried.add('md:' + k);
        try {
          const v = String(Store.data[k]).slice(2), t = v.replace(/\s*\(\d{4}\)\s*$/, ''), y = +(v.match(/\((\d{4})\)\s*$/) || [])[1] || 0;
          const m = await Posters.match(t, y); if (!m) return;
          const d = m.id ? await Posters.details(m.id).catch(() => ({})) : {};
          Store.set('md:' + k, JSON.stringify({tm: m.id || 0, t, y, d: d.d || '', m: d.m || 0, p: d.p || m.p || ''})); n++;
        } catch (e) {}
      });
      const todo = Object.keys(Store.data).filter(k => (k.startsWith('md:log:') || k.startsWith('md:wx:')) && !tried.has(k)).map(k => { try { return [k, JSON.parse(Store.data[k])]; } catch (e) { return [k, null]; } })
        .filter(([, md]) => md && md.tm && (md.d === undefined || !md.p));
      await pool(todo, 3, async ([k, md]) => {
        tried.add(k);
        try {
          const d = await Posters.details(md.tm);
          Store.set(k, JSON.stringify(Object.assign({}, md, {d: d.d || md.d || '', m: d.m || md.m || 0, p: d.p || md.p || ''})));
          const v = Store.data[k.slice(3)]; if (d.p && v) Posters.put('tx:' + String(v).slice(2), d.p);
          if (++n % 10 === 0 && FX) FX.render();
        } catch (e) {}
      });
    } finally { enriching = false; }
    if (n && FX) FX.render();
    if (window.D) fxMetaFill(window.D, () => Store.data, Store.set, Posters).catch(() => {});
  }
  let et = null; const enrichSoon = () => { clearTimeout(et); et = setTimeout(enrichSome, 1500); };

  const FR = typeof fxFriendsTab === 'function' ? fxFriendsTab(CloudSync) : null;
  const AC = typeof fxAccount === 'function' ? fxAccount(CloudSync, {toSettings: () => { if (FX && (FX.view() !== 'settings' || FX.section())) fxNav.open('/settings'); }}) : null;
  const ABOUT = AC ? {id: 'about', hidden: true, label: {en: 'About', fa: 'About'}, view: () => AC.about(), click: b => { if (b.hasAttribute('data-ac-back')) { fxNav.back('/settings'); return true; } return false; }} : null;
  let DX = null, FP = null;
  // the app opens on Home (This week and the rest), or on Activity if you'd rather
  const startView = () => FR && Store.data['cfg:home'] === 'friends' ? 'friends' : 'week';
  const HM = typeof fxHome === 'function' ? fxHome({FR, redraw: () => FX && FX.render()}) : null;
  // the top of each main screen: the wordmark, which takes you home
  const brandBar = () => `<div class="fx-topbar"><a class="fx-brand" href="/" aria-label="${esc(C.siteName || 'TVC15')}, home">${FX_BRAND.word({h: 15})}</a></div>`;
  // ---- addresses: each screen has one (nav.js), so Back steps through the app and any screen can be reloaded or shared ----
  const VIEWS = {'/plan/new': 'build', '/about': 'about', '/week': 'week', '/diary': 'diary', '/stats': 'stats', '/settings': 'settings', '/plan': 'plan', '/list': 'list'};
  const pathOf = v => v === 'week' && HM ? '/' : v === 'settings' ? '/settings' + (FX && FX.section() ? '/' + FX.section() : '') : v === 'build' ? '/plan/new' : v === 'friends' ? (FR ? FR.path() : '/activity') : v === 'discover' && DX ? DX.url() : v === 'film' && FP ? FP.url() : v === 'director' && FP ? FP.dirUrl() : '/' + v;
  function route(url, how) {
    if (!FX) return;
    const u = new URL(url, location.origin), p = u.pathname.replace(/\/+$/, '') || '/';
    let v;
    if (p === '/') v = startView();
    else if (p === '/activity' || p.startsWith('/activity/')) { if (FR) FR.fromPath(p); v = 'friends'; }
    else if ((p === '/discover' || p.startsWith('/discover/')) && DX) { DX.fromUrl(p, u.searchParams); v = 'discover'; }
    else if (p.startsWith('/film/') && FP) { FP.openFilm(fxNav.parseFilm(p)); v = 'film'; }
    else if (p === '/settings' || p.startsWith('/settings/')) { FX.setSection(p.slice(10)); v = 'settings'; }
    else if (p.startsWith('/director/') && FP) { FP.openDirector(p.slice(10).replace(/[^a-z0-9-]/g, '').slice(0, 120)); v = 'director'; }
    else v = VIEWS[p] || startView();
    if (AC) AC.closeMenu();
    FX.go(v);
    if (v !== 'film' && v !== 'director') document.title = C.siteName || 'TVC15';
    // Back and a reload return to the same place; anything else starts at the top
    if (how === 'pop' || how === 'init') fxNav.restore(fxNav.savedY()); else fxNav.top();
  }
  fxNav.setHandler(route);
  document.addEventListener('click', e => { if (AC && FX && !e.target.closest('.av-top') && AC.closeMenu()) FX.render(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && AC && FX && AC.closeMenu()) FX.render(); });
  // links to the app's own screens stay inside the app (a new tab, with ⌘ or Ctrl, still works)
  document.addEventListener('click', e => {
    if (!FX || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target) return;
    const href = a.getAttribute('href');
    if (!/^\/((film|director|discover|activity|week|diary|stats|settings|plan|list)(\/|\?|$)|$)/.test(href)) return;
    e.preventDefault(); FX.closeSheet(); fxNav.open(href);
  });
  // where a plan film sits in your plan, for its page
  function planWeek(key) {
    const D = window.D; if (!D || !Array.isArray(D.W) || !key || kind === 'list') return null;
    const WK = fxCompact(D), cur = fxCur(WK, Store.data);
    for (let w = 1; w <= WK.length; w++) if (WK[w - 1][0].includes(key)) return {w, now: w === cur, done: !!Store.data[key]};
    return null;
  }
  // Stats: the profile's Letterboxd-style stats, built from your own diary on this device (even with the diary hidden from your profile)
  const statsKeep = {};
  const diaryNav = on => `<nav class="fx-years fx-seg fx-dseg" aria-label="Diary">${[['diary', 'Diary'], ['stats', 'Stats']].map(([v, l]) => `<button type="button" data-nav="${v}" aria-pressed="${on === v}">${l}</button>`).join('')}</nav>`;
  const STATS = {
    id: 'stats', hidden: true, label: {en: 'Stats', fa: 'Stats'},
    view: () => `<header class="fx-head"><div class="fx-hrow"><h1 class="fx-h1">Stats</h1></div>${diaryNav('stats')}</header><div class="fx-statsroot"></div>`,
    after(el) {
      const box = el.querySelector('.fx-statsroot'); if (!box || typeof fxProfile !== 'function' || !FX) return;
      let data; try { data = JSON.parse(fxShare(FX.plan(), Object.assign({}, Store.data, {'cfg:pubdiary': null}), k => Posters.src(k))); } catch (e) { return; }
      if (!(data.diary || []).length && !(data.seen || []).length) { box.innerHTML = '<p class="fx-muted">Log a few films and your stats will show up here.</p>'; return; }
      fxProfile(box, 'me', '', {data, only: 'stats', keep: statsKeep, lang: () => 'en', dirHref: fxNav.director});
    },
    click: b => !!b.closest('.fx-statsroot'),
  };
  // what your current plan is, in a few words (the builder says it will replace it)
  function planName() {
    const k = Store.data['cfg:plan'];
    if (k === 'sample') return '“Five Years of Cinema”';
    if (k === 'list') return 'your list';
    if (k === 'own') return window.D && window.D.gen ? 'the plan you built on ' + fxCat.longDay(window.D.gen.made) : 'your own plan';
    return '';
  }
  let PB = null;
  function planner(inApp) {
    if (!PB && typeof fxPlanner === 'function') PB = fxPlanner({wl: FR ? FR.wl : null, plan: planName, save: savePlanAndStart, leave: () => onboard()});
    if (PB) PB.inApp = inApp;
    return PB;
  }
  async function savePlanAndStart(D) {
    const ok = await CloudSync.savePlan(D);
    if (!ok) return false;
    (D.posters || []).forEach(([k, p]) => { if (p) Posters.put(k, p); });
    Store.set('cfg:since', today());
    history.replaceState(Object.assign({}, history.state), '', '/week');
    if (Store.data['cfg:plan'] === 'own') start(); else Store.set('cfg:plan', 'own');
    window.scrollTo(0, 0);
    return true;
  }
  async function start() {
    fresh();
    if (Store.data['cfg:lang'] && Store.data['cfg:lang'] !== 'en') Store.set('cfg:lang', 'en');
    kind = Store.data['cfg:plan'];
    let D;
    try { D = await planData(); } catch (e) { kind = ''; Store.set('cfg:plan', null); onboard(); return; }
    window.D = D;
    sig = kind === 'list' ? FXL.sig(Store.data) : '';
    // the site opens on Friends (unless you chose This week), and Friends comes first in the bar; the plan map opens from This Week
    const PM = kind !== 'list' && typeof fxPlanMap === 'function' ? fxPlanMap() : null;
    // Discover: the shared catalog, after Diary in the bar (Settings moves to a gear at the top)
    if (!DX && typeof fxDiscover === 'function') DX = fxDiscover({wl: FR ? FR.wl : null});
    if (!FP && typeof fxFilmPages === 'function') FP = fxFilmPages({wl: FR ? FR.wl : null, friendsOn: FR ? FR.friendsOn : null, ratings: keys => CloudSync.filmRatings(keys).then(r => r.ok ? r.j : null), planWeek, openEntry: ek => FX && FX.openEntry(ek)});
    FX = mountFocus(root, D, S, {posters: Posters, settings: CloudSync, letterboxd: LBX, list: kind === 'list' ? listAdapter() : null, plan: {reset, own: kind === 'own'},
      tabs: [FR, PM, DX, FP && FP.film, FP && FP.director, STATS, planner(true), ABOUT].filter(Boolean), tabsFirst: !!FR, settingsGear: true, noLang: true, quickLog: true, startView: startView(), settingsExtra: homeChoice,
      fullView: PM ? 'plan' : '', filmHref: fxNav.film, diaryNav, accountUI: AC ? where => AC.ui(where, () => FX && FX.render()) : null,
      topButton: AC ? on => AC.corner(on) : null, brand: v => v === 'film' || v === 'director' || v === 'build' ? '' : brandBar(), homeLabel: HM ? 'Home' : '', homeExtra: HM ? () => HM.html() : null, profileMore: true, onView: v => fxNav.note(pathOf(v)), onSettings: x => fxNav.note('/settings' + (x ? '/' + x : '')), settingsBack: () => fxNav.back('/settings'), modal: {open: fxNav.modal, close: fxNav.unmodal}});
    const logTo = (t, y, md) => FX && FX.logFilm(t, y, md);
    if (FR) { FR.attach(() => FX && FX.render()); FR.setLogger(logTo); }
    if (PM) PM.attach(root, () => FX && FX.render());
    if (DX) DX.attach(root, () => FX && FX.render());
    if (FP) { FP.attach(root, () => FX && FX.render()); FP.setLogger(logTo); }
    if (PB) PB.attach(root, () => FX && FX.render());
    if (AC) {
      const isAc = b => [...b.attributes].some(a => a.name.startsWith('data-ac-'));
      root.addEventListener('click', e => { const b = e.target.closest('button'); if (b && isAc(b)) AC.click(b, () => FX && FX.render()); });
      root.addEventListener('submit', e => { const f = e.target.closest('form'); if (f && isAc(f)) { e.preventDefault(); AC.submit(f, () => FX && FX.render()); } });
      root.addEventListener('change', e => { if (e.target.matches && e.target.matches('input[data-ac-avfile]')) { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) AC.file(f, () => FX && FX.render()); } });
    }
    route(location.pathname + location.search, 'init');
    root.addEventListener('input', e => { if (FR) FR.input(e.target); });
    root.addEventListener('toggle', e => { if (FR && e.target.matches && e.target.matches('details.fx-wl')) FR.wlOpen(e.target.open); }, true);
    root.addEventListener('click', e => {
      const h = e.target.closest('button'); if (h && HM && HM.click(h)) return;
      const b = e.target.closest('[data-home]'); if (!b) return;
      Store.set('cfg:home', b.dataset.home === 'friends' ? 'friends' : null); if (FX) FX.render();
    });
    CloudSync.setPayload(() => {
      const out = fxShare(FX.plan(), Store.data, k => Posters.src(k));
      if (!FR || Store.data['cfg:pubdiary'] === '0' || Store.data['cfg:pubwl'] === '0') return out;
      const o = JSON.parse(out); o.wl = FR.wl.list().slice(0, 1500).map(x => ({t: x.t, y: x.y || 0, tm: x.tm || 0, p: x.p || ''}));
      return JSON.stringify(o);
    });
    enrichSoon(); setTimeout(lbPull, 2500);
  }
  function homeChoice(L) {
    const act = Store.data['cfg:home'] === 'friends';
    const gen = typeof fxPlanner === 'function' ? `<section class="fx-card"><h2>Build a new plan</h2><p class="fx-muted">A schedule made from the Discover catalog, with your choice of length, pace and balance. It leaves out everything you’ve logged, so it’s worth rebuilding after you bring in your Letterboxd history.</p><div class="fx-row"><a class="fx-btn" href="/plan/new" data-app>Build a new plan</a></div></section>` : '';
    return gen + `<section class="fx-card"><h2>Open the app on</h2><div class="fx-row"><button type="button" class="fx-btn${act ? '' : ' primary'}" data-home="week">Home</button><button type="button" class="fx-btn${act ? ' primary' : ''}" data-home="friends">Activity</button></div></section>`;
  }
  function reset() { Store.set('cfg:plan', null); kind = ''; onboard(); window.scrollTo(0, 0); }
  let rt = null;
  function planChanged() {
    clearTimeout(rt);
    rt = setTimeout(async () => {
      if (!CloudSync.me() || location.pathname.startsWith('/u/') || keyHold) return;
      const want = Store.data['cfg:plan'] || '';
      if (want !== kind) { if (want) start(); else if (FX) onboard(); return; }
      if (FX && kind === 'list') { const sg = FXL.sig(Store.data); if (sg !== sig) { sig = sg; const D = await planData(); window.D = D; FX.setPlan(D); return; } }
      if (FX) FX.render();
    }, 60);
  }
  function choose(k) { Store.set('cfg:plan', k); if (!Store.data['cfg:since']) Store.set('cfg:since', today()); start(); window.scrollTo(0, 0); }

  // ---- first time in: how to fill the weeks, or bring everything over from the old site ----
  function onboard(note, cls) {
    fresh();
    const t = T(), pw = FXL.perWeek(Store.data), me = CloudSync.me();
    shell(`<header class="fx-head"><div class="fx-hrow"><div class="fx-eye">${esc(t.hi(me ? me.username : ''))}</div></div><h1 class="fx-h1">${esc(t.site)}</h1><p class="fx-lede">${esc(t.tag)}</p></header>
      ${t.h0 && typeof fxPlanner === 'function' ? `<section class="fx-card fx-opt"><h2>${t.h0}</h2><p>${t.p0}</p><div class="fx-row"><button type="button" class="fx-btn primary" data-obuild>${t.b0}</button></div></section>` : ''}
      <section class="fx-card fx-opt"><h2>${t.h1}</h2><p>${t.p1}</p><div class="fx-row"><button type="button" class="fx-btn" data-ostart="list">${t.b1}</button></div></section>
      <section class="fx-card fx-opt"><h2>${t.h2}</h2><p>${t.p2}</p><div class="fx-row"><label class="fx-btn fx-file">${t.b2}<input type="file" accept=".csv,text/csv" data-oimport multiple></label></div><p class="fx-note" data-oprog ${busy ? '' : 'hidden'}></p></section>
      <section class="fx-card fx-opt"><h2>${t.h3}</h2><p>${t.p3(num(1813))}</p><div class="fx-row"><button type="button" class="fx-btn" data-ostart="sample">${t.b3}</button></div></section>
      <section class="fx-card fx-opt"><h2>${t.h4}</h2><p>${t.p4}</p><div class="fx-row"><label class="fx-btn fx-file">${t.b4}<input type="file" accept=".json,application/json" data-omove></label></div></section>
      <div class="fx-step" role="group" aria-label="${esc(t.per)}"><span>${t.per}</span><button type="button" data-opw="-1"${pw <= 1 ? ' disabled' : ''}>−</button><b>${num(pw)}</b><button type="button" data-opw="1"${pw >= 14 ? ' disabled' : ''}>+</button></div>
      ${note ? `<p class="fx-note ${cls || 'bad'}">${esc(note)}</p>` : ''}
      <div class="fx-row"><button type="button" class="fx-link" data-osignout>${t.signOut}</button></div>`);
    root.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-osignout')) { await CloudSync.disconnect(); return; }
      if (b.dataset.opw) { S.set('cfg:perweek', Math.max(1, Math.min(14, FXL.perWeek(Store.data) + +b.dataset.opw))); onboard(); return; }
      if (b.dataset.ostart) choose(b.dataset.ostart);
      if (b.hasAttribute('data-obuild')) { fresh(); planner(false).host(root); window.scrollTo(0, 0); }
    });
    root.addEventListener('change', async e => {
      if (e.target.matches('[data-omove]')) { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) moveIn(f); return; }
      if (!e.target.matches('[data-oimport]')) return;
      const files = [...(e.target.files || [])]; e.target.value = '';
      if (!files.length) return;
      files.sort((a, b) => (/diary|reviews/i.test(a.name) ? 0 : 1) - (/diary|reviews/i.test(b.name) ? 0 : 1));
      busy = true; let gotList = false, msg = '';
      const prog = root.querySelector('[data-oprog]'); if (prog) prog.hidden = false;
      for (const f of files) {
        const r = await importCsv(await f.text(), f.name, (d, n) => { const el = root.querySelector('[data-oprog]'); if (el) el.textContent = T().importing(num(d), num(n)); });
        if (r.kind === 'list') gotList = true;
        else if (r.kind !== 'diary') msg = r.kind === 'nodates' ? T().nodates : T().bad;
      }
      busy = false;
      if (gotList) choose('list'); else onboard(msg, 'bad');
    });
  }
  // the file the old site downloads (Settings → Backup → Download everything): entries as they were, plus the plan
  async function moveIn(file) {
    let o;
    try { o = JSON.parse(await file.text()); } catch (e) { o = null; }
    if (!o || o.app !== 'five-years-cinema' || !o.e || typeof o.e !== 'object') { onboard(T().badMove); return; }
    const e = {};
    Object.entries(o.e).forEach(([k, v]) => { if (Array.isArray(v) && v.length === 2 && typeof k === 'string' && k.length <= 200 && !/^(cfg:tmdb|cfg:share|lbsync:)/.test(k)) e[k] = v; });
    onboard(T().moving(num(Object.keys(e).length)), 'busy');
    Store.mergeIn(e);
    CloudSync.touch(Object.keys(e));
    if (o.plan && Array.isArray(o.plan.F) && Array.isArray(o.plan.W)) {
      await CloudSync.savePlan(o.plan);
      // the plan started the day its first film was ticked
      const KI = fxKeyIdx(o.plan), first = Object.keys(KI).map(k => Store.data[k]).filter(v => /^\d{4}-\d\d-\d\d$/.test(v || '')).sort()[0];
      if (!Store.data['cfg:since']) Store.set('cfg:since', first || today());
      Store.set('cfg:plan', 'own');
    }
    const me = CloudSync.me();
    if (me && !Store.data['cfg:share']) Store.set('cfg:share', me.username);
    await CloudSync.run();
    if (Store.data['cfg:plan']) start(); else onboard(T().moved, 'ok');
  }

  // ================= /u/<name>: a member's profile =================
  function profilePage(name) {
    fresh();
    const m = location.hash.match(/^#([a-z0-9-]{1,120})$/i), eid = m ? m[1] : '';
    const me = CloudSync.me();
    let meta = null, mine = null, pmore = false, pblock = false, pnote = '';
    const metaHtml = L => {
      const t = GT[L === 'fa' ? 'fa' : 'en'], fa = n => L === 'fa' ? Number(n).toLocaleString('fa-IR') : String(n);
      if (!meta) return '';
      let btn = '';
      if (!me) btn = `<a class="fx-btn" href="/">${t.join}</a>`;
      else if (meta.self) btn = `<a class="fx-btn" href="/">${t.mine}</a>`;
      else btn = `<button type="button" class="fx-btn${meta.follows ? '' : ' primary'}" data-pfollow aria-pressed="${!!meta.follows}">${meta.follows ? t.unfollow : t.follow}</button>`
        + `<button type="button" class="fx-link" data-pmore aria-expanded="${pmore}">More</button>`;
      let more = '';
      if (me && !meta.self && pmore) {
        more = `<div class="fx-pmore">${meta.followsYou ? `<button type="button" class="fx-btn" data-prmfollower>Remove @${esc(name)} as a follower</button>` : ''}`
          + (pblock ? `<p class="fx-note bad">Block @${esc(name)}? They won’t be able to follow you, react to or comment on your entries, or see your profile while signed in. They aren’t told.</p><div class="fx-row"><button type="button" class="fx-btn fx-danger" data-pblockyes>Block</button><button type="button" class="fx-btn" data-pblockno>Cancel</button></div>`
            : `<button type="button" class="fx-btn" data-pblock>Block @${esc(name)}</button>`) + (pnote ? `<p class="fx-note ok">${esc(pnote)}</p>` : '') + '</div>';
      }
      return `<div class="fx-pmeta"><span class="fx-muted">${esc(t.followers(fa(meta.followers)))}, ${esc(t.following(fa(meta.following)))}${meta.followsYou && !meta.self ? ' <span class="fx-badge">Follows you</span>' : ''}</span>${btn}</div>${more}`;
    };
    if (!eid) fxNav.restore(fxNav.savedY());  // back from a film opened here: the same place on the profile
    PF = fxProfile(root, name, eid, {
      clean: true, base: location.origin + '/u/' + name, source: '/api/u/' + name, lbProxy: '/api/lb/', mine: () => mine, site: C.siteName || 'Film Diary', top: brandBar(),
      // a member's films open on the site's own film pages; a visitor's go to Letterboxd
      filmHref: me ? fxNav.film : null, dirHref: me ? fxNav.director : null,
      // on someone else's grids, the films you've seen too
      seenMine: f => !!mine && mine.has(+f.tm > 0 ? 'tm' + f.tm : norm(String(f.t || '').replace(/\s*\(\d{4}\)\s*$/, '')) + '|' + (+f.y || 0)),
      avatar: d => typeof fxAvatar === 'function' ? fxAvatar(name, d.name, d.av, 'xl') : '',
      // the reader's own language and calendar: a member's from their settings, a visitor's from the sign-in screen's switch
      lang: () => 'en',
      headerExtra: metaHtml,
      onButton: (b, render) => {
        if (!meta) return false;
        if (b.hasAttribute('data-pmore')) { pmore = !pmore; pblock = false; pnote = ''; render(); return true; }
        if (b.hasAttribute('data-pblock')) { pblock = true; render(); return true; }
        if (b.hasAttribute('data-pblockno')) { pblock = false; render(); return true; }
        if (b.hasAttribute('data-pblockyes')) { CloudSync.block(name, true).then(r => { if (r.ok) location.href = '/settings/privacy'; }); return true; }
        if (b.hasAttribute('data-prmfollower')) { CloudSync.removeFollower(name).then(r => { if (r.ok) { meta.followsYou = false; meta.followers = Math.max(0, meta.followers - 1); pnote = '@' + name + ' no longer follows you.'; render(); } }); return true; }
        if (!b.hasAttribute('data-pfollow')) return false;
        const on = !meta.follows; meta.follows = on; meta.followers += on ? 1 : -1; render(); typeof fxOSD === 'function' && fxOSD(on ? 'Following' : 'Unfollowed');
        CloudSync.follow(name, on).then(r => { if (!r.ok) { meta.follows = !on; meta.followers += on ? -1 : 1; render(); } });
        return true;
      },
    });
    CloudSync.meta(name).then(r => { if (r.ok) { meta = r.j; PF && PF.render(); } });
    // a member visiting someone else: their own diary, ready for the taste match
    if (me && me.username !== name) myFilms(me.username).then(x => { mine = x; PF && PF.render(); });
  }
  async function myFilms(username) {
    const out = new Map();
    const add = e => { if (!e || typeof e.t !== 'string') return; const k = +e.tm > 0 ? 'tm' + e.tm : norm(e.t) + '|' + (+e.y || 0), o = out.get(k); if (!o) out.set(k, {t: e.t, y: +e.y || 0, tm: +e.tm || 0, r: +e.r || 0}); else if (!o.r && e.r) o.r = +e.r; };
    try {
      const r = await fetch('/api/u/' + username, {cache: 'no-store'});
      if (r.ok) { const j = await r.json(); ((j.data && j.data.diary) || []).forEach(add); ((j.data && j.data.seen) || []).forEach(add); return out; }
    } catch (e) {}
    // a private profile: build it from this device's copy
    try {
      await Store.load();
      const D = Store.data['cfg:plan'] ? await planData() : {F: [], W: []};
      const p = JSON.parse(fxShare(D, Object.assign({}, Store.data, {'cfg:pubdiary': null}), () => ''));
      (p.diary || []).forEach(add); (p.seen || []).forEach(add);
    } catch (e) {}
    return out;
  }

  // ================= which face =================
  async function home() {
    const um = location.pathname.match(/^\/u\/([a-z0-9_]{3,24})\/?$/);
    await Store.load();
    if (um) { profilePage(um[1]); return; }
    let me = CloudSync.me();
    if (!me && /^\/about\/?$/.test(location.pathname)) { fresh(); shell(AC.about(), 'fx-about'); root.addEventListener('click', e => { if (e.target.closest('[data-ac-back]')) { if (history.length > 1) history.back(); else location.href = '/'; } }); return; }
    if (!me) { authScreen(); return; }
    if (Store.data['cfg:plan']) start(); else onboard();
    me = await CloudSync.check();
    if (!me) { authScreen(); return; }
    CloudSync.run();
  }
  CloudSync.onSignOut(() => { location.href = '/'; });
  CloudSync.onStatus(() => FX && FX.render());
  Store.onChange(() => { planChanged(); enrichSoon(); });
  Store.onLocalChange(k => {  // logging a film (or ticking it in the plan) takes it off the watchlist
    if (!FR || !/^\d{4}-\d\d-\d\d$/.test(Store.data[k] || '')) return;
    if (/^v:/.test(k)) setTimeout(() => FR.wlSeen(k.slice(2)), 0);
    else if (window.D && fxKeyIdx(window.D)[k] !== undefined) setTimeout(() => FR.wlSeen(k), 0);
  });
  Store.onLocalChange(k => { if (k === 'cfg:plan' || k === 'cfg:perweek' || String(k).startsWith('pl:')) planChanged(); if (k === 'cfg:lb') setTimeout(lbPull, 500); });
  setInterval(() => { if (document.visibilityState === 'visible') lbPull(); }, 30 * 60e3);
  home();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && navigator.serviceWorker.controller) { reloaded = true; location.reload(); } });
  }
})();
