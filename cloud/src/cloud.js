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
  Posters.setProxy('/api/tmdb');
  CloudSync.setLang(() => lang());
  Posters.setChosen(k => Store.data['ps:' + k] || '');

  const GT = {
    en: {
      site: C.siteName || 'Film Diary', tag: 'Log what you watch. See what your friends are watching. Pick tonight’s movie together.', eyebrow: 'A film diary for friends', langL: 'فارسی',
      about: 'Named after David Bowie’s “TVC 15,” a song about a TV set that swallows people whole.',
      signin: 'Sign in', signup: 'Create an account', user: 'Username', userPh: 'Letters, numbers and underscores', pass: 'Password', passNew: 'Password (at least 8 characters)', name: 'Your name', namePh: 'Shown on your profile', code: 'Invite code',
      pub: 'Make my profile public (people can see your diary and follow you)', go: 'Sign in', make: 'Create account', working: 'One moment…', short: 'Your password needs at least 8 characters.',
      privacy: 'Your password is scrambled on your device before it’s sent, so the site never sees it. No email or phone number required.',
      h1: 'Make your own list', p1: 'Search for films and add them. Your list is split into weeks, so you only ever see this week’s films.', b1: 'Start a list',
      h2: 'Start from your Letterboxd watchlist', p2: 'Export your data on letterboxd.com (Settings → Data → Export your data), then upload watchlist.csv or any list. You can bring in your full history (the .zip) from Settings later.', b2: 'Upload a .csv',
      h3: 'Try the sample plan', p3: n => '“Five Years of Cinema”: ' + n + ' films over 260 weeks, from the silent era to today.', b3: 'Use the sample plan',
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
    shell(`<header class="fx-head"><div class="fx-hrow"><div class="fx-eye">${esc(t.eyebrow || t.site)}</div></div><h1 class="fx-h1">${esc(t.site)}</h1><p class="fx-lede">${esc(t.tag)}</p>${t.about ? `<p class="fx-muted fx-small fx-about">${esc(t.about)}</p>` : ''}</header>
      <div class="fx-years fx-seg fx-authtabs" role="tablist"><button type="button" role="tab" data-amode="in" aria-pressed="${!up}">${t.signin}</button><button type="button" role="tab" data-amode="up" aria-pressed="${up}">${t.signup}</button></div>
      <form class="fx-card fx-authf" data-auth="${authMode}" novalidate>
        <label class="fx-field"><span>${t.user}</span><input name="u" type="text" dir="ltr" autocomplete="username" autocapitalize="off" spellcheck="false" required placeholder="${esc(t.userPh)}"></label>
        ${up ? `<label class="fx-field"><span>${t.name}</span><input name="n" type="text" dir="auto" maxlength="60" autocomplete="name" placeholder="${esc(t.namePh)}"></label>` : ''}
        <label class="fx-field"><span>${up ? t.passNew : t.pass}</span><input name="p" type="password" dir="ltr" autocomplete="${up ? 'new-password' : 'current-password'}" required ${up ? 'minlength="8"' : ''}></label>
        ${up && cfg.code ? `<label class="fx-field"><span>${t.code}</span><input name="c" type="text" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" required></label>` : ''}
        ${up ? `<label class="fx-check"><input type="checkbox" name="pub" checked> ${t.pub}</label>` : ''}
        <div class="fx-row"><button type="submit" class="fx-btn primary">${up ? t.make : t.go}</button></div>
        ${authNote ? `<p class="fx-note ${authNote === t.working ? 'busy' : 'bad'}">${esc(authNote)}</p>` : ''}
        <p class="fx-muted fx-small">${t.privacy}</p>
      </form>`, 'fx-auth');
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
      home();
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
      return cached || await latest || Promise.reject(new Error('noplan'));
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
  async function start() {
    fresh();
    if (Store.data['cfg:lang'] && Store.data['cfg:lang'] !== 'en') Store.set('cfg:lang', 'en');
    kind = Store.data['cfg:plan'];
    let D;
    try { D = await planData(); } catch (e) { kind = ''; Store.set('cfg:plan', null); onboard(); return; }
    window.D = D;
    sig = kind === 'list' ? FXL.sig(Store.data) : '';
    // the site opens on Friends (unless you chose This week), and Friends comes first in the bar
    FX = mountFocus(root, D, S, {posters: Posters, settings: CloudSync, letterboxd: LBX, list: kind === 'list' ? listAdapter() : null, plan: {reset, own: kind === 'own'},
      tabs: FR ? [FR] : [], tabsFirst: !!FR, noLang: true, quickLog: true, wrapped: openWrapped, startView: FR && Store.data['cfg:home'] !== 'week' ? 'friends' : 'week', settingsExtra: homeChoice});
    if (FR) { FR.attach(() => FX && FX.render()); FR.setLogger((t, y, md) => FX && FX.logFilm(t, y, md)); }
    root.addEventListener('input', e => { if (FR) FR.input(e.target); });
    root.addEventListener('toggle', e => { if (FR && e.target.matches && e.target.matches('details.fx-wl')) FR.wlOpen(e.target.open); }, true);
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-home]'); if (!b) return;
      Store.set('cfg:home', b.dataset.home === 'week' ? 'week' : null); if (FX) FX.render();
    });
    CloudSync.setPayload(() => {
      const out = fxShare(FX.plan(), Store.data, k => Posters.src(k));
      if (!FR || Store.data['cfg:pubdiary'] === '0') return out;
      const o = JSON.parse(out); o.wl = FR.wl.list().slice(0, 1500).map(x => ({t: x.t, y: x.y || 0, tm: x.tm || 0, p: x.p || ''}));
      return JSON.stringify(o);
    });
    enrichSoon(); setTimeout(lbPull, 2500);
  }
  // your year in film: built from your own diary on this device (even with the diary hidden from your profile)
  function openWrapped(year) {
    if (typeof fxWrappedOpen !== 'function' || !FX) return;
    const data = JSON.parse(fxShare(FX.plan(), Object.assign({}, Store.data, {'cfg:pubdiary': null}), k => Posters.src(k)));
    const me = CloudSync.me();
    fxWrappedOpen(data, year, {who: Store.data['cfg:name'] || (me && me.name) || '', url: me ? location.origin + '/u/' + me.username : location.origin, site: C.siteName || 'Film Diary'});
  }
  function homeChoice(L) {
    const week = Store.data['cfg:home'] === 'week';
    return `<section class="fx-card"><h2>Open the app on</h2><div class="fx-row"><button type="button" class="fx-btn${week ? '' : ' primary'}" data-home="friends">Activity</button><button type="button" class="fx-btn${week ? ' primary' : ''}" data-home="week">This Week</button></div></section>`;
  }
  function reset() { Store.set('cfg:plan', null); kind = ''; onboard(); window.scrollTo(0, 0); }
  let rt = null;
  function planChanged() {
    clearTimeout(rt);
    rt = setTimeout(async () => {
      if (!CloudSync.me() || location.pathname.startsWith('/u/')) return;
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
      <section class="fx-card fx-opt"><h2>${t.h4}</h2><p>${t.p4}</p><div class="fx-row"><label class="fx-btn primary fx-file">${t.b4}<input type="file" accept=".json,application/json" data-omove></label></div></section>
      <section class="fx-card fx-opt"><h2>${t.h1}</h2><p>${t.p1}</p><div class="fx-row"><button type="button" class="fx-btn primary" data-ostart="list">${t.b1}</button></div></section>
      <section class="fx-card fx-opt"><h2>${t.h2}</h2><p>${t.p2}</p><div class="fx-row"><label class="fx-btn fx-file">${t.b2}<input type="file" accept=".csv,text/csv" data-oimport multiple></label></div><p class="fx-note" data-oprog ${busy ? '' : 'hidden'}></p></section>
      <section class="fx-card fx-opt"><h2>${t.h3}</h2><p>${t.p3(num(1813))}</p><div class="fx-row"><button type="button" class="fx-btn" data-ostart="sample">${t.b3}</button></div></section>
      <div class="fx-step" role="group" aria-label="${esc(t.per)}"><span>${t.per}</span><button type="button" data-opw="-1"${pw <= 1 ? ' disabled' : ''}>−</button><b>${num(pw)}</b><button type="button" data-opw="1"${pw >= 14 ? ' disabled' : ''}>+</button></div>
      ${note ? `<p class="fx-note ${cls || 'bad'}">${esc(note)}</p>` : ''}
      <div class="fx-row"><button type="button" class="fx-link" data-osignout>${t.signOut}</button></div>`);
    root.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-osignout')) { await CloudSync.disconnect(); return; }
      if (b.dataset.opw) { S.set('cfg:perweek', Math.max(1, Math.min(14, FXL.perWeek(Store.data) + +b.dataset.opw))); onboard(); return; }
      if (b.dataset.ostart) choose(b.dataset.ostart);
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
    let meta = null, mine = null;
    const metaHtml = L => {
      const t = GT[L === 'fa' ? 'fa' : 'en'], fa = n => L === 'fa' ? Number(n).toLocaleString('fa-IR') : String(n);
      if (!meta) return '';
      let btn = '';
      if (!me) btn = `<a class="fx-btn" href="/">${t.join}</a>`;
      else if (meta.self) btn = `<a class="fx-btn" href="/">${t.mine}</a>`;
      else btn = `<button type="button" class="fx-btn${meta.follows ? '' : ' primary'}" data-pfollow aria-pressed="${!!meta.follows}">${meta.follows ? t.unfollow : t.follow}</button>`;
      return `<div class="fx-pmeta"><span class="fx-muted">${esc(t.followers(fa(meta.followers)))} · ${esc(t.following(fa(meta.following)))}</span>${btn}</div>`;
    };
    PF = fxProfile(root, name, eid, {
      clean: true, base: location.origin + '/u/' + name, source: '/api/u/' + name, lbProxy: '/api/lb/', mine: () => mine, site: C.siteName || 'Film Diary',
      // the reader's own language and calendar: a member's from their settings, a visitor's from the sign-in screen's switch
      lang: () => 'en',
      headerExtra: metaHtml,
      onButton: (b, render) => {
        if (!b.hasAttribute('data-pfollow') || !meta) return false;
        const on = !meta.follows; meta.follows = on; meta.followers += on ? 1 : -1; render();
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
