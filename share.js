// Public, read-only film diary: the current programme plus (if the owner publishes it) the diary with ratings, likes and reviews.
// Reads one public-subset gist; nothing here can change anything.
(function () {
  const root = document.getElementById('root');
  const hm = (location.hash.match(/^#([0-9a-f]{20,40})(?:\/([a-z0-9-]{1,120}))?$/i) || []);
  const id = hm[1], focusId = hm[2] || '';
  let lang = 'en', data = null, updated = '', tab = focusId ? 'diary' : 'now', open = {}, jumped = false;
  const TX = {
    en: {diary: 'Film diary', title: 'Film Diary', now: 'Now Showing', tDiary: 'Diary', tReviews: 'Reviews', tStats: 'Stats', updated: a => 'updated ' + a,
      prog: (n, of, rt) => 'Programme · ' + n + '/' + of + ' logged' + (rt ? ' · ' + rt + ' runtime' : ''), end: 'The five-year programme is complete.', rest: 'Intermission — no programme this week.',
      watched: 'Logged', min: n => n + '′', films: n => n + (n === 1 ? ' film' : ' films'), hours: n => n + 'h watched', avg: a => 'avg ★' + a, likes: n => n + ' ♥', reviews: n => n + (n === 1 ? ' review' : ' reviews'),
      discuss: 'Discuss on the channel ↗', perma: 'Copy link', copied: 'Link copied', more: 'Read more', less: 'Less', noReviews: 'No reviews yet.', noDiary: 'Nothing logged yet.',
      spread: 'Rating spread', decades: 'By decade', directors: 'Most-logged directors', totals: 'Totals', rated: 'rated', liked: 'liked', reviewed: 'reviewed', runtime: 'total runtime',
      bad: 'This link is incomplete', gone: 'This page is no longer published', fail: 'Couldn’t load right now', later: 'Try again in a few minutes.',
      ago: m => m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago',
      hmf: m => m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + 'm', attr: 'Posters: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.'},
    fa: {diary: 'دفتر فیلم', title: 'دفتر فیلم', now: 'این هفته', tDiary: 'دفتر', tReviews: 'ریویوها', tStats: 'آمار', updated: a => 'به‌روز شده ' + a,
      prog: (n, of, rt) => n + ' از ' + of + ' دیده شد' + (rt ? ' · ' + rt : ''), end: 'برنامه‌ی پنج‌ساله تموم شده.', rest: 'این هفته برنامه نداره؛ هفته‌ی آزاده.',
      watched: 'دیدمش', min: n => n + ' دقیقه', films: n => n + ' فیلم', hours: n => n + ' ساعت', avg: a => 'میانگین ★' + a, likes: n => n + ' ♥', reviews: n => n + ' ریویو',
      discuss: 'گفت‌وگو تو کانال ↗', perma: 'کپی لینک', copied: 'لینک کپی شد', more: 'ادامه', less: 'کمتر', noReviews: 'هنوز ریویویی نیست.', noDiary: 'هنوز چیزی ثبت نشده.',
      spread: 'پخش امتیازها', decades: 'به تفکیک دهه', directors: 'کارگردان‌های پرتکرار', totals: 'جمع', rated: 'امتیازدار', liked: 'قلب‌دار', reviewed: 'ریویودار', runtime: 'زمان کل',
      bad: 'این لینک کامل نیست', gone: 'این صفحه دیگه منتشر نمی‌شه', fail: 'الان باز نشد', later: 'چند دقیقه‌ی دیگه دوباره امتحان کن.',
      ago: m => m < 1 ? 'همین الان' : m < 60 ? m + ' دقیقه پیش' : m < 1440 ? Math.round(m / 60) + ' ساعت پیش' : Math.round(m / 1440) + ' روز پیش',
      hmf: m => m >= 60 ? Math.floor(m / 60) + ' ساعت و ' + (m % 60) + ' دقیقه' : m + ' دقیقه', attr: 'پوسترها: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.'},
  };
  const T = () => TX[lang];
  const fa = n => lang === 'fa' ? Number(n).toLocaleString('fa-IR') : String(n);
  const faDigits = s => lang === 'fa' ? String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]) : String(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const day = /^\d{4}-\d\d-\d\d$/;
  const fmt = (o) => new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', o);
  const pdate = v => { try { return day.test(v) ? fmt({day: 'numeric', month: 'short'}).format(new Date(v + 'T12:00:00')) : ''; } catch (e) { return ''; } };
  const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return !isFinite(m) ? '' : faDigits(T().ago(m)); };
  const okPoster = p => typeof p === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9._-]+$/.test(p);
  const okSlug = l => typeof l === 'string' && /^[a-z0-9-]+$/.test(l);
  const okUrl = u => typeof u === 'string' && /^https:\/\/[^\s"<>]+$/.test(u);
  const stars = r => r ? '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '') : '';
  const permalink = eid => location.href.replace(/#.*$/, '') + '#' + id + '/' + eid;

  function poster(f) {
    return `<span class="fx-pos${okPoster(f.p) ? '' : ' none'}" aria-hidden="true">${okPoster(f.p) ? `<img alt="" loading="lazy" src="${f.p}">` : ''}<span class="fx-pt" dir="ltr">${esc(f.t)}</span></span>`;
  }
  function titleOf(f) {
    const link = okSlug(f.l) ? `https://letterboxd.com/film/${f.l}/` : '';
    const t = link ? `<a class="fx-film" href="${link}" target="_blank" rel="noopener noreferrer">${esc(f.t)}</a>` : `<span class="fx-film" dir="auto">${esc(f.t)}</span>`;
    return t + (f.y ? ` <span class="fx-y">${f.y}</span>` : '');
  }
  function header() {
    const t = T(), d = data.diary || [], mins = d.reduce((a, e) => a + (+e.m || 0), 0), rated = d.filter(e => e.r);
    const avg = rated.length ? (rated.reduce((a, e) => a + e.r, 0) / rated.length / 2).toFixed(1) : '';
    const name = String(data.name || '').trim();
    const strip = d.length ? [t.films(d.length), t.hours(Math.round(mins / 60)), avg ? t.avg(avg) : '', t.likes(d.filter(e => e.h).length), t.reviews(d.filter(e => e.rv).length)].filter(Boolean).map(faDigits).join(' · ') : '';
    let h = `<header class="fx-head"><div class="fx-eye">${esc(t.diary)}${updated ? ' · ' + esc(t.updated(ago(updated))) : ''}</div><div class="fx-hrow"><h1 class="fx-h1">${esc(name || t.title)}</h1></div>${strip ? `<div class="fx-eye fx-strip">${esc(strip)}</div>` : ''}${okUrl(data.ch) ? `<a class="fx-link fx-ch" href="${esc(data.ch)}" target="_blank" rel="noopener noreferrer">${t.discuss}</a>` : ''}</header>`;
    if (d.length) h += `<nav class="fx-tabs" role="tablist">${[['now', t.now], ['diary', t.tDiary], ['reviews', t.tReviews], ['stats', t.tStats]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('')}</nav>`;
    return h;
  }
  function nowView() {
    const t = T(), now = data.now || {films: data.films || [], rest: data.rest, end: data.end}, films = Array.isArray(now.films) ? now.films : [];
    if (now.end) return `<section class="fx-rest"><p>${t.end}</p></section>`;
    if (now.rest && !films.length) return `<section class="fx-rest"><p>${t.rest}</p></section>`;
    const rt = films.reduce((a, f) => a + (+f.m || 0), 0);
    let h = `<div class="fx-eye">${esc(faDigits(t.prog(films.filter(f => f.w).length, films.length, rt ? t.hmf(rt) : '')))}</div>`;
    h += `<div class="fx-dots">${films.map(f => `<i class="${f.w ? 'on' : ''}"></i>`).join('')}</div>`;
    h += '<ul class="fx-list">' + films.map(f => {
      const meta = [f.d ? `<bdi>${esc(f.d)}</bdi>` : '', f.m ? `<span class="fx-rt">${t.min(fa(f.m))}</span>` : ''].join('');
      const watched = f.w ? `<span class="fx-seen">${t.watched}${pdate(f.w) ? ' · ' + pdate(f.w) : ''}</span>` : '';
      return `<li class="fx-i fx-ro${f.w ? ' done' : ''}"><span class="fx-chk" aria-hidden="true">${f.w ? '✓' : ''}</span>${poster(f)}<div class="fx-b"><div>${titleOf(f)}</div><div class="fx-m">${meta}</div>${watched}</div><span></span></li>`;
    }).join('') + '</ul>';
    return h;
  }
  function entry(e, full) {
    const t = T(), long = (e.rv || '').length > 320, isOpen = full || open[e.id] || e.id === focusId;
    const rv = e.rv ? `<p class="fx-rvx" dir="auto">${esc(isOpen || !long ? e.rv : e.rv.slice(0, 320) + '…')}</p>${long && !full ? `<button type="button" class="fx-link fx-rvb" data-more="${esc(e.id)}">${isOpen ? t.less : t.more}</button>` : ''}` : '';
    return `<li class="fx-de${e.id === focusId ? ' hl' : ''}" id="e-${esc(e.id)}"><span class="fx-dday">${faDigits(day.test(e.w) ? +e.w.slice(8) : '')}</span>${poster(e)}
      <div class="fx-db"><div>${titleOf(e)}</div><div class="fx-dm"><span class="fx-mini" dir="ltr">${stars(e.r)}</span>${e.h ? '<span class="fx-mh">♥︎</span>' : ''}${e.d ? `<bdi class="fx-hd">${esc(e.d)}</bdi>` : ''}${full ? `<span class="fx-hd">${pdate(e.w)}</span>` : ''}</div>${rv}</div>
      <button type="button" class="fx-link fx-skipb" data-perma="${esc(e.id)}" title="${t.perma}">#</button></li>`;
  }
  function diaryView() {
    const d = data.diary || [];
    if (!d.length) return `<p class="fx-muted">${T().noDiary}</p>`;
    const mf = fmt({month: 'long', year: 'numeric'});
    let h = '<div class="fx-diary">', month = '';
    d.forEach(e => {
      const mk = day.test(e.w) ? mf.format(new Date(e.w + 'T12:00:00')) : '—';
      if (mk !== month) { if (month) h += '</ul>'; month = mk; h += `<h2 class="fx-mon">${esc(mk)}</h2><ul class="fx-dl">`; }
      h += entry(e, false);
    });
    return h + '</ul></div>';
  }
  function reviewsView() {
    const d = (data.diary || []).filter(e => e.rv);
    if (!d.length) return `<p class="fx-muted">${T().noReviews}</p>`;
    return '<ul class="fx-dl fx-revs">' + d.map(e => entry(e, true)).join('') + '</ul>';
  }
  function statsView() {
    const t = T(), d = data.diary || [];
    const hist = Array(11).fill(0); d.forEach(e => { if (e.r) hist[e.r]++; });
    const mx = Math.max(1, ...hist);
    let h = `<section class="fx-card"><h2>${t.spread}</h2><div class="fx-hist2" dir="ltr">${hist.slice(1).map((n, k) => `<div class="fx-bar" title="${(k + 1) / 2}★ · ${n}"><i style="height:${Math.round(n / mx * 100)}%"></i></div>`).join('')}</div><div class="fx-hist2-ax" dir="ltr"><span>½★</span><span>★★★★★</span></div></section>`;
    const dec = {}; d.forEach(e => { if (e.y) { const k = Math.floor(e.y / 10) * 10; dec[k] = (dec[k] || 0) + 1; } });
    const dk = Object.keys(dec).sort(), dm = Math.max(1, ...Object.values(dec));
    h += `<section class="fx-card"><h2>${t.decades}</h2><div class="fx-rows">${dk.map(k => `<div class="fx-rowbar"><span class="fx-rk">${faDigits(k)}s</span><span class="fx-rb"><i style="width:${Math.round(dec[k] / dm * 100)}%"></i></span><span class="fx-rn">${fa(dec[k])}</span></div>`).join('')}</div></section>`;
    const dir = {}; d.forEach(e => { (e.d || '').split(/,\s*|،\s*/).filter(Boolean).forEach(x => { dir[x] = (dir[x] || 0) + 1; }); });
    const top = Object.entries(dir).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (top.length) h += `<section class="fx-card"><h2>${t.directors}</h2><ol class="fx-top">${top.map(([n, c]) => `<li><bdi>${esc(n)}</bdi><span class="fx-rn">${fa(c)}</span></li>`).join('')}</ol></section>`;
    const mins = d.reduce((a, e) => a + (+e.m || 0), 0);
    h += `<section class="fx-card"><h2>${t.totals}</h2><div class="fx-eye fx-strip">${esc(faDigits([t.films(d.length), t.runtime + ' ' + t.hmf(mins), d.filter(e => e.r).length + ' ' + t.rated, d.filter(e => e.h).length + ' ' + t.liked, d.filter(e => e.rv).length + ' ' + t.reviewed].join(' · ')))}</div></section>`;
    return h;
  }
  function render() {
    const t = T();
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.title = (data && data.name ? data.name + ' · ' : '') + t.title;
    const body = tab === 'diary' ? diaryView() : tab === 'reviews' ? reviewsView() : tab === 'stats' ? statsView() : nowView();
    const hasP = /fx-pos"|fx-pos /.test(body) && /<img/.test(body);
    root.innerHTML = `<div class="fx fx-share fx-pub${hasP ? ' fx-hasp' : ''}" dir="${lang === 'fa' ? 'rtl' : 'ltr'}">${header()}${body}<footer class="fx-foot fx-muted" dir="ltr">${esc(t.attr)}</footer></div>`;
  }
  function shell(title, sub) {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    root.innerHTML = `<div class="fx fx-share" dir="${lang === 'fa' ? 'rtl' : 'ltr'}"><header class="fx-head"><h1 class="fx-h1">${esc(title)}</h1></header>${sub ? `<p class="fx-muted">${esc(sub)}</p>` : ''}</div>`;
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }
    else if (b.dataset.more) { open[b.dataset.more] = !open[b.dataset.more]; render(); }
    else if (b.dataset.perma) {
      const url = permalink(b.dataset.perma);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { b.textContent = '✓'; b.title = T().copied; }, () => { location.hash = id + '/' + b.dataset.perma; });
    }
  });
  async function load() {
    if (!id) { shell(TX.en.bad); return; }
    try {
      const r = await fetch('https://api.github.com/gists/' + id, {cache: 'no-store', headers: {Accept: 'application/vnd.github+json'}});
      if (r.status === 404) { shell(T().gone); return; }
      if (!r.ok) throw new Error('http');
      const g = await r.json(), f = g.files && g.files['five-years-share.json'];
      if (!f) throw new Error('nofile');
      let txt = f.content || '{}';
      if (f.truncated && f.raw_url) txt = await fetch(f.raw_url, {cache: 'no-store'}).then(x => x.text());
      data = JSON.parse(txt);
      lang = data.lang === 'fa' ? 'fa' : 'en';
      if (!Array.isArray(data.diary)) data.diary = [];
      data.diary = data.diary.filter(e => e && typeof e.t === 'string');
      updated = g.updated_at;
      render();
      if (focusId && !jumped) { jumped = true; const el = document.getElementById('e-' + focusId); if (el) el.scrollIntoView({block: 'center'}); }
    } catch (e) {
      if (!data) shell(T().fail, T().later);
    }
  }
  load();
  setInterval(() => { if (document.visibilityState === 'visible') load(); }, 300000);
})();
