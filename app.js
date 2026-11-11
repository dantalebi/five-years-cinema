// Web app entry. The plan isn't part of this public site: it comes from a private gist in the owner's GitHub
// and is cached on the device. Visitors (no token on their device) see the owner's public profile instead;
// the owner signs in on a new device at #signin.
(function () {
  let root = document.getElementById('root'), FX = null, PF = null;
  const PROFILE = typeof FY_PROFILE !== 'undefined' ? FY_PROFILE : null;
  const fresh = () => { if (PF) { PF.stop(); PF = null; } const r = root.cloneNode(false); root.replaceWith(r); root = r; };
  function profile() {
    if (FX) return;
    fresh();
    const m = location.hash.match(/^#([a-z0-9-]{1,120})$/i), eid = m && m[1] !== 'signin' ? m[1] : '';
    PF = fxProfile(root, PROFILE.gist, eid, {clean: true, base: PROFILE.url});
  }
  const S = {all: () => Store.data, set: (k, v) => Store.set(k, v)};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  // ---- Letterboxd: the export files once (here); new logs from the public feed, which a GitHub Action
  // copies to the letterboxd-feed branch every few hours (no token involved). Same rules both ways: fxlb.js ----
  Posters.setChosen(k => Store.data['ps:' + k] || '');
  const LB_SINCE = '2026-11-01', LB_FEED = 'https://raw.githubusercontent.com/dantalebi/five-years-cinema/letterboxd-feed/feed.json';
  let lbPulling = false;
  async function lbPull() {
    if (lbPulling || !window.D) return;
    lbPulling = true;
    try {
      const r = await fetch(LB_FEED + '?t=' + Math.floor(Date.now() / 6e4), {cache: 'no-store'});
      if (!r.ok) return;
      const items = ((await r.json()) || {}).items || [];
      const res = FXLB.merge(items, Store.data, window.D.F, LB_SINCE);
      res.sets.forEach(([k, v]) => Store.set(k, v));
      Store.set('lbsync:at', new Date().toISOString());
      if (res.added + res.ticked + res.merged) Store.set('lbsync:n', res.added + res.ticked + res.merged);
      if (FX && (res.added + res.ticked + res.merged)) { FX.render(); enrichSoon(); }
    } catch (e) {} finally { lbPulling = false; }
  }
  async function pool(list, n, fn) { let i = 0; await Promise.all(Array.from({length: Math.min(n, list.length)}, async () => { while (i < list.length) await fn(list[i++]); })); }
  const LBX = {
    status: () => ({at: Store.data['lbsync:at'] || '', n: +Store.data['lbsync:n'] || 0}),
    async importFiles(files, progress) {
      let rows = [];
      for (const f of files) {
        const head = new Uint8Array(await f.slice(0, 2).arrayBuffer());
        if (head[0] === 0x50 && head[1] === 0x4b) {  // the whole export, zipped: its diary and reviews
          const z = await FXLB.unzip(await f.arrayBuffer(), ['diary.csv', 'reviews.csv']) || {};
          ['diary.csv', 'reviews.csv'].forEach(n => { const r = z[n] && FXLB.fromCsv(z[n]); if (r) rows = rows.concat(r); });
        } else { const r = FXLB.fromCsv(await f.text()); if (r) rows = rows.concat(r); }
      }
      if (!rows.length) return {bad: true};
      const D = window.D, isPlan = FXLB.matcher(D.F), need = {};
      rows.forEach(r => { if (!isPlan(r)) { const k = FXLB.norm(r.t) + '|' + r.y; (need[k] = need[k] || []).push(r); } });
      const keys = Object.keys(need); let done = 0;
      progress(0, keys.length);
      // films outside the plan: poster, director and runtime from TMDB (once per film, not per viewing)
      if (Posters.on()) await pool(keys, 4, async k => {
        const r0 = need[k][0];
        try {
          const m = await Posters.match(r0.t, r0.y);
          if (m) {
            const d = m.id ? await Posters.details(m.id).catch(() => ({})) : {};
            const p = d.p || m.p || '';
            need[k].forEach(r => { r.tm = m.id; r.md = {d: d.d || '', m: d.m || 0, p}; });
            if (p) Posters.put('tx:' + r0.t + (r0.y ? ' (' + r0.y + ')' : ''), p);
          }
        } catch (e) {}
        progress(++done, keys.length);
      });
      const res = FXLB.merge(rows, Store.data, D.F, LB_SINCE);
      res.sets.forEach(([k, v]) => Store.set(k, v));
      enrichSoon();
      return res;
    },
  };
  // entries the GitHub Action brought in know only their TMDB id: fill in director, runtime and poster, a few at a time
  let enriching = false; const tried = new Set();
  async function enrichSome() {
    if (enriching || !Posters.on()) return;
    enriching = true; let n = 0;
    try {
      const todo = Object.keys(Store.data).filter(k => k.startsWith('md:log:') && !tried.has(k)).map(k => { try { return [k, JSON.parse(Store.data[k])]; } catch (e) { return [k, null]; } })
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
    // genres, countries, language and cast for the stats; once per film, synced, so other devices don't repeat it
    if (window.D) fxMetaFill(window.D, () => Store.data, Store.set, Posters).catch(() => {});
  }
  let et = null; const enrichSoon = () => { clearTimeout(et); et = setTimeout(enrichSome, 1500); };
  function start(D) {
    window.D = D;
    fresh();
    FX = mountFocus(root, D, S, {
      posters: Posters, settings: WebSync, letterboxd: LBX,
      openFull: w => { location.href = 'plan.html' + (w ? '#w-' + Math.min(D.W.length, w) : ''); },
    });
    WebSync.setPayload(() => fxShare(D, Store.data, k => Posters.src(k)));
    enrichSoon();
    lbSoon();
  }
  // after this device has pulled from sync (so a log another device already added is known), then every half hour while open
  let lt = null; const lbSoon = () => { clearTimeout(lt); lt = setTimeout(() => Promise.resolve(WebSync.status().connected ? WebSync.run() : null).catch(() => {}).then(lbPull), 2500); };
  setInterval(() => { if (document.visibilityState === 'visible') lbPull(); }, 30 * 6e4);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') lbSoon(); });
  const GT = {
    en: {title: 'Five Years of Cinema', p: 'A personal page — nothing to see here.', owner: 'Is this yours?', how: 'Paste your GitHub token (gist access) and the plan loads from your private Gist. No token yet? <a href="https://github.com/settings/tokens/new?scopes=gist&description=five-years-cinema" target="_blank" rel="noopener noreferrer">Create one here</a> (Expiration: No expiration).', connect: 'Connect', loading: 'Connected — loading your plan…', missing: 'No plan was found in this account’s Gists.'},
    fa: {title: 'پنج سال سینما', p: 'این یه صفحه‌ی شخصیه و چیزی برای نشون دادن به بقیه نداره.', owner: 'صاحب این صفحه‌ای؟', how: 'توکن گیت‌هابت (با دسترسی gist) رو بچسبون تا برنامه از Gist خصوصیت بیاد. اگه توکن نداری، <a href="https://github.com/settings/tokens/new?scopes=gist&description=five-years-cinema" target="_blank" rel="noopener noreferrer">اینجا</a> بسازش (Expiration: No expiration).', connect: 'وصل شو', loading: 'وصل شد؛ دارم برنامه رو میارم…', missing: 'برنامه توی Gistهای این حساب پیدا نشد.'},
  };
  function gate(note, cls) {
    if (PF) fresh();
    const lang = fxLang(Store.data), t = GT[lang];
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    root.innerHTML = `<div class="fx" dir="${lang === 'fa' ? 'rtl' : 'ltr'}"><header class="fx-head"><h1 class="fx-h1">${t.title}</h1></header>
      <section class="fx-card"><p>${t.p}</p>
      <details class="fx-more"><summary>${t.owner}</summary>
      <p class="fx-muted">${t.how}</p>
      <form class="fx-form" data-gate><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" placeholder="ghp_…" aria-label="GitHub token" required><button type="submit" class="fx-btn primary">${t.connect}</button></form>
      ${note ? `<p class="fx-note ${cls || 'bad'}">${esc(note)}</p>` : ''}</details></section></div>`;
    if (note) root.querySelector('details').open = true;
    root.querySelector('form[data-gate]').addEventListener('submit', async e => {
      e.preventDefault();
      const inp = e.target.querySelector('input'), v = inp.value.trim(); if (!v) return;
      inp.disabled = true;
      const err = await WebSync.connect(v);
      if (err) { gate(err); return; }
      gate(GT[fxLang(Store.data)].loading, 'busy');
      fetchPlan(true);
    });
  }
  async function fetchPlan(fromGate) {
    try {
      const D = await WebSync.loadPlan();
      if (D) start(D);
      else if (!FX) gate(fromGate ? GT[fxLang(Store.data)].missing : '');
    } catch (e) {
      if (!FX) gate(FYSync.message(e, fxLang(Store.data)));
    }
  }
  Store.load().then(() => {
    const D = WebSync.cachedPlan();
    if (D) start(D);
    else if (PROFILE && !WebSync.status().connected && location.hash !== '#signin') profile();
    else gate('');
    if (WebSync.status().connected) fetchPlan(false);
    WebSync.run();
  });
  window.addEventListener('hashchange', () => { if (!FX && location.hash === '#signin') gate(''); });
  Store.onChange(() => { if (FX) { FX.render(); enrichSoon(); } });
  WebSync.onStatus(() => FX && FX.render());
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    // a new version took over: reload once so it runs right away
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && navigator.serviceWorker.controller) { reloaded = true; location.reload(); } });
  }
})();
