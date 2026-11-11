// Web app entry. The plan isn't part of this public site: it comes from a private gist in the owner's GitHub
// and is cached on the device. Without the owner's token, the page shows only a sign-in card.
(function () {
  let root = document.getElementById('root'), FX = null;
  const S = {all: () => Store.data, set: (k, v) => Store.set(k, v)};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  function start(D) {
    window.D = D;
    if (FX) { const r = root.cloneNode(false); root.replaceWith(r); root = r; }
    FX = mountFocus(root, D, S, {
      posters: Posters, settings: WebSync,
      openFull: w => { location.href = 'plan.html' + (w ? '#w-' + Math.min(D.W.length, w) : ''); },
    });
    WebSync.setPayload(() => fxShare(D, Store.data, k => Posters.src(k)));
  }
  const GT = {
    en: {title: 'Five Years of Cinema', p: 'A personal page — nothing to see here.', owner: 'Is this yours?', how: 'Paste your GitHub token (gist access) and the plan loads from your private Gist. No token yet? <a href="https://github.com/settings/tokens/new?scopes=gist&description=five-years-cinema" target="_blank" rel="noopener noreferrer">Create one here</a> (Expiration: No expiration).', connect: 'Connect', loading: 'Connected — loading your plan…', missing: 'No plan was found in this account’s Gists.'},
    fa: {title: 'پنج سال سینما', p: 'این یه صفحه‌ی شخصیه و چیزی برای نشون دادن به بقیه نداره.', owner: 'صاحب این صفحه‌ای؟', how: 'توکن گیت‌هابت (با دسترسی gist) رو بچسبون تا برنامه از Gist خصوصیت بیاد. اگه توکن نداری، <a href="https://github.com/settings/tokens/new?scopes=gist&description=five-years-cinema" target="_blank" rel="noopener noreferrer">اینجا</a> بسازش (Expiration: No expiration).', connect: 'وصل شو', loading: 'وصل شد؛ دارم برنامه رو میارم…', missing: 'برنامه توی Gistهای این حساب پیدا نشد.'},
  };
  function gate(note, cls) {
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
    if (D) start(D); else gate('');
    if (WebSync.status().connected) fetchPlan(false);
    WebSync.run();
  });
  Store.onChange(() => FX && FX.render());
  WebSync.onStatus(() => FX && FX.render());
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    // a new version took over: reload once so it runs right away
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && navigator.serviceWorker.controller) { reloaded = true; location.reload(); } });
  }
})();
