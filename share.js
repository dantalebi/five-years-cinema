// Public, read-only film diary: the current programme plus (if the owner publishes it) the diary with ratings, likes and reviews.
// Reads one public-subset gist; nothing here can change anything.
// fxProfile(root, gistId, entryId, {clean, base}): clean = served at the app's own address, permalinks are base#<entry>
function fxProfile(root, id, focusId, opts) {
  opts = opts || {};
  let lang = 'en', data = null, updated = '', tab = focusId ? 'diary' : 'now', open = {}, withP = false, year = null, cur = focusId || '', pushed = false, listScroll = 0;
  const stv = {dec: 'n', gcl: 'g', gm: 'n', dir: 'n', cast: 'n'};  // which way each stats card is showing
  const TX = {
    en: {diary: 'Film diary', title: 'Film Diary', now: 'This Week', tDiary: 'Diary', tReviews: 'Reviews', tStats: 'Stats', updated: a => 'updated ' + a,
      prog: (n, of, rt) => of + (of === 1 ? ' film' : ' films') + (rt ? ' · ' + rt : '') + (n ? ' · ' + n + ' watched' : ''), end: 'The five-year plan is complete.', rest: 'A free week — nothing scheduled.',
      watched: 'Watched', min: n => n, films: n => n + (n === 1 ? ' film' : ' films'), hours: n => n + 'h', avg: a => '★ ' + a + ' average', likes: n => n + (n === 1 ? ' like' : ' likes'), reviews: n => n + (n === 1 ? ' review' : ' reviews'),
      allYears: 'All time', favs: 'Favorite films', spoiler: 'This review may contain spoilers.', reveal: 'Show review anyway', readReview: 'Read review', open: 'Open entry', backTo: n => '← ' + n, reviewBy: n => 'Review by ' + n, entryBy: n => 'Diary entry by ' + n, entry: 'Diary entry', watchedOn: 'Watched', rewatchedOn: 'Rewatched', spoilerTag: 'Spoilers', rewatch: 'Rewatch', withShort: n => 'with ' + n, cal: 'Watch calendar', perma: 'Copy link to this entry', copied: 'Link copied', more: 'Read more', less: 'Show less', noReviews: 'No reviews yet.', noDiary: 'Nothing logged yet.',
      big: {films: 'Films', hours: 'Hours', dirs: 'Directors', countries: 'Countries', multi: '2+ film days'},
      most: 'Most watched', best: 'Highest rated', gcl: 'Genres, countries & languages', genres: 'Genres', countries: 'Countries', languages: 'Languages',
      dirsH: 'Directors', cast: 'Cast', few: 'Not enough rated films here yet.',
      spread: 'Ratings', byYear: 'Films per year', decades: 'Decades', directors: 'Most-watched directors', totals: 'Totals', rated: 'rated', liked: 'liked', reviewed: 'reviewed', runtime: 'watched',
      bad: 'This link is incomplete', gone: 'This profile is no longer published', fail: 'Couldn’t load', later: 'Try again in a few minutes.',
      ago: m => m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago',
      hmf: m => m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm', attr: 'Posters from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.',
      inApp: 'app', links: {lb: 'Letterboxd', tg: 'Telegram', sp: 'Spotify', ig: 'Instagram', web: 'Website'}},
    fa: {diary: 'دفتر فیلم', title: 'دفتر فیلم', now: 'این هفته', tDiary: 'دفتر', tReviews: 'ریویوها', tStats: 'آمار', updated: a => 'به‌روز شده ' + a,
      prog: (n, of, rt) => n + ' از ' + of + ' دیده شد' + (rt ? ' · ' + rt : ''), end: 'برنامه‌ی پنج‌ساله تموم شده.', rest: 'این هفته برنامه نداره؛ هفته‌ی آزاده.',
      watched: 'دیدمش', min: n => n + ' دقیقه', films: n => n + ' فیلم', hours: n => n + ' ساعت', avg: a => 'میانگین ★' + a, likes: n => n + ' ♥', reviews: n => n + ' ریویو',
      discuss: 'گفت‌وگو تو کانال ↗', allYears: 'همه', favs: 'فیلم‌های محبوب', spoiler: 'این ریویو ممکنه داستان رو لو بده.', reveal: 'با این حال نشونم بده', readReview: 'خوندن ریویو', open: 'باز کردن', backTo: n => '→ ' + n, reviewBy: n => 'ریویوی ' + n, entryBy: n => 'از دفتر ' + n, entry: 'از دفتر', watchedOn: 'دیده‌شده', rewatchedOn: 'دوباره دیده‌شده', spoilerTag: 'اسپویل', rewatch: 'دوباره‌دیدن', withShort: n => 'با ' + n, cal: 'تقویم تماشا', perma: 'کپی لینک', copied: 'لینک کپی شد', more: 'ادامه', less: 'کمتر', noReviews: 'هنوز ریویویی نیست.', noDiary: 'هنوز چیزی ثبت نشده.',
      big: {films: 'فیلم', hours: 'ساعت', dirs: 'کارگردان', countries: 'کشور', multi: 'روزِ چندفیلمی'},
      most: 'بیشترین', best: 'بالاترین امتیاز', gcl: 'ژانر، کشور و زبان', genres: 'ژانرها', countries: 'کشورها', languages: 'زبان‌ها',
      dirsH: 'کارگردان‌ها', cast: 'بازیگرها', few: 'هنوز فیلم امتیازدارِ کافی این‌جا نیست.',
      spread: 'پخش امتیازها', byYear: 'فیلم‌ها در هر سال', decades: 'به تفکیک دهه', directors: 'کارگردان‌های پرتکرار', totals: 'جمع', rated: 'امتیازدار', liked: 'قلب‌دار', reviewed: 'ریویودار', runtime: 'زمان کل',
      bad: 'این لینک کامل نیست', gone: 'این صفحه دیگه منتشر نمی‌شه', fail: 'الان باز نشد', later: 'چند دقیقه‌ی دیگه دوباره امتحان کن.',
      ago: m => m < 1 ? 'همین الان' : m < 60 ? m + ' دقیقه پیش' : m < 1440 ? Math.round(m / 60) + ' ساعت پیش' : Math.round(m / 1440) + ' روز پیش',
      inApp: 'اپ', links: {lb: 'لترباکس', tg: 'تلگرام', sp: 'اسپاتیفای', ig: 'اینستاگرام', web: 'وب‌سایت'},
      hmf: m => m >= 60 ? Math.floor(m / 60) + ' ساعت و ' + (m % 60) + ' دقیقه' : m + ' دقیقه', attr: 'پوسترها: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.'},
  };
  const T = () => TX[lang];
  const fa = n => lang === 'fa' ? Number(n).toLocaleString('fa-IR') : String(n);
  const faDigits = s => lang === 'fa' ? String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]) : String(s).replace(/\b\d{4,}\b/g, n => (n.length === 4 && /^(18|19|20)\d\d$/.test(n)) ? n : Number(n).toLocaleString('en-US'));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const day = /^\d{4}-\d\d-\d\d$/;
  const fmt = (o) => new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', o);
  const pdate = v => { try { return day.test(v) ? fmt({day: 'numeric', month: 'short'}).format(new Date(v + 'T12:00:00')) : ''; } catch (e) { return ''; } };
  const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return !isFinite(m) ? '' : faDigits(T().ago(m)); };
  const okPoster = p => typeof p === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9._-]+$/.test(p);
  // the profile backdrop, like Letterboxd's: a still across the top, fading into the page
  const hero = () => data && data.bd && okPoster(data.bd.p) ? `<div class="fx-hero" aria-hidden="true"><img alt="" src="${data.bd.p}"></div>` : '';
  const okSlug = l => typeof l === 'string' && /^[a-z0-9-]+$/.test(l);
  const okUrl = u => typeof u === 'string' && /^https:\/\/[^\s"<>]+$/.test(u);
  const stars = r => r ? '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '') : '';
  const permalink = eid => opts.clean ? opts.base + '#' + eid : location.href.replace(/#.*$/, '') + '#' + id + '/' + eid;

  function poster(f) {
    if (!withP) return '';
    return `<span class="fx-pos${okPoster(f.p) ? '' : ' none'}" aria-hidden="true">${okPoster(f.p) ? `<img alt="" loading="lazy" src="${f.p}">` : ''}<span class="fx-pt" dir="ltr">${esc(f.t)}</span></span>`;
  }
  const lbUser = () => (data && data.links && /^[A-Za-z0-9_]{1,40}$/.test(data.links.lb || '')) ? data.links.lb : '';
  function titleOf(f, own) {
    const u = lbUser(), link = okSlug(f.l) ? (own && u ? `https://letterboxd.com/${u}/film/${f.l}/` : `https://letterboxd.com/film/${f.l}/`) : (+f.tm > 0 ? `https://letterboxd.com/tmdb/${+f.tm}/` : '');
    const mm = String(f.t).match(/^(.*?)\s*\((\d{4})\)\s*$/), title = mm ? mm[1] : f.t, yr = f.y || (mm ? mm[2] : '');
    const t = link ? `<a class="fx-film" href="${link}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>` : `<span class="fx-film" dir="auto">${esc(title)}</span>`;
    return `<div class="fx-tl">${t}${yr ? `<span class="fx-y">${yr}</span>` : ''}</div>`;
  }
  const subOf = f => (f.d || f.m) ? `<div class="fx-sub"><span class="fx-tw">${f.d ? `<bdi>${esc(f.d)}</bdi>` : ''}${f.m ? `<span>${lang === 'fa' ? faDigits(T().hmf(+f.m)) : T().hmf(+f.m)}</span>` : ''}</span></div>` : '';
  function linksRow() {
    const t = T(), L = data.links || {}, out = [];
    const lb = lbUser();
    if (lb) {
      out.push(`<a href="https://letterboxd.com/${lb}/" target="_blank" rel="noopener noreferrer">${t.links.lb}</a>`);
    }
    [['tg', L.tg || data.ch], ['sp', L.sp], ['ig', L.ig], ['web', L.web]].forEach(([k, u]) => { if (okUrl(u)) out.push(`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t.links[k]}</a>`); });
    return out.length ? `<div class="fx-links"><span class="fx-tw">${out.join('')}</span></div>` : '';
  }
  function header() {
    const t = T(), d = data.diary || [], mins = d.reduce((a, e) => a + (+e.m || 0), 0), rated = d.filter(e => e.r);
    const avg = rated.length ? (rated.reduce((a, e) => a + e.r, 0) / rated.length / 2).toFixed(1) : '';
    const name = String(data.name || '').trim();
    const strip = d.length ? [t.films(d.length), t.hours(Math.round(mins / 60)), avg ? t.avg(avg) : '', d.some(e => e.h) ? t.likes(d.filter(e => e.h).length) : '', d.some(e => e.rv) ? t.reviews(d.filter(e => e.rv).length) : ''].filter(Boolean).map(faDigits).join('  ·  ') : '';
    let h = `<header class="fx-head"><div class="fx-eye">${esc(t.diary)}${updated ? ' · ' + esc(t.updated(ago(updated))) : ''}</div><div class="fx-hrow"><h1 class="fx-h1">${esc(name || t.title)}</h1></div>${strip ? `<div class="fx-strip">${esc(strip)}</div>` : ''}${linksRow()}</header>`;
    const fav = (Array.isArray(data.fav) ? data.fav : []).filter(f => f && typeof f.t === 'string').slice(0, 4);
    if (fav.length) h += `<section class="fx-favrow"><div class="fx-eye">${t.favs}</div><div class="fx-favs">${fav.map(f => { const link = okSlug(f.l) ? `https://letterboxd.com/film/${f.l}/` : (+f.tm > 0 ? `https://letterboxd.com/tmdb/${+f.tm}/` : ''); const inner = `${okPoster(f.p) ? `<img alt="" src="${f.p}">` : ''}<span class="fx-favt">${esc(f.t)}</span>`; return `<div class="fx-fav">${link ? `<a class="fx-favb" href="${link}" target="_blank" rel="noopener noreferrer" title="${esc(f.t)}${f.y ? ' (' + f.y + ')' : ''}">${inner}</a>` : `<span class="fx-favb">${inner}</span>`}</div>`; }).join('')}</div></section>`;
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
      const watched = f.w ? `<div class="fx-seen">${t.watched}${pdate(f.w) ? ' ' + pdate(f.w) : ''}</div>` : '';
      return `<li class="fx-i fx-ro${f.w ? ' done' : ''}">${poster(f)}<div class="fx-b">${titleOf(f)}${subOf(f)}${watched}</div><div class="fx-acts"><span class="fx-chk" aria-hidden="true">${f.w ? '✓' : ''}</span></div></li>`;
    }).join('') + '</ul>';
    return h;
  }
  const tagsOf = e => Array.isArray(e.tg) ? e.tg.filter(x => typeof x === 'string').slice(0, 8) : [];
  function metaOf(e, withDate) {
    const t = T(), tags = tagsOf(e);
    return (e.r || e.h || e.rw || e.rv || e.ww || tags.length || withDate) ? `<div class="fx-dm">${e.r ? `<span class="fx-mini" dir="ltr">${stars(e.r)}</span>` : ''}${e.h ? `<i class="fx-ico lk" title="${esc(t.liked)}"></i>` : ''}${e.rw ? `<i class="fx-ico rw" title="${esc(t.rewatch)}"></i>` : ''}${e.rv ? `<i class="fx-ico rv" title="${esc(t.reviewed)}"></i>` : ''}${withDate ? `<span class="fx-hd">${t.watched} ${pdate(e.w)}</span>` : ''}${e.ww ? `<span class="fx-ww">${esc(t.withShort(String(e.ww).slice(0, 80)))}</span>` : ''}${tags.map(x => `<span class="fx-tagc">${esc(x.slice(0, 30))}</span>`).join('')}</div>` : '';
  }
  // a row in the diary or reviews list
  function entry(e, inReviews) {
    const t = T(), withDate = inReviews;
    // the diary only says there is a review; the reviews tab shows four lines (never a spoiler)
    const rv = !e.rv || !inReviews ? '' : e.sp ? `<p class="fx-spnote">${t.spoiler}</p>` : `<p class="fx-rvx fx-clamp" dir="auto">${esc(e.rv.slice(0, 1200))}</p>`;
    return `<li class="fx-de fx-tap" data-entry="${esc(e.id)}" id="e-${esc(e.id)}"><span class="fx-dday">${faDigits(day.test(e.w) ? +e.w.slice(8) : '')}</span>${poster(e)}
      <div class="fx-b">${titleOf(e, true)}${subOf(e)}${metaOf(e, withDate)}${rv}${e.rv ? `<button type="button" class="fx-link fx-rvb" data-entry="${esc(e.id)}">${t.readReview} →</button>` : ''}</div>
      <button type="button" class="fx-perma" data-perma="${esc(e.id)}" title="${t.perma}" aria-label="${t.perma}">#</button></li>`;
  }
  // one entry on its own page: the full review, behind a choice if it has spoilers
  function entryView(e) {
    const t = T(), name = String(data.name || '').trim(), tags = tagsOf(e);
    const longDate = day.test(e.w) ? fmt({weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}).format(new Date(e.w + 'T12:00:00')) : '';
    const big = withP ? `<span class="fx-pos fx-epos${okPoster(e.p) ? '' : ' none'}" aria-hidden="true">${okPoster(e.p) ? `<img alt="" src="${e.p.replace(/\/w\d+\//, '/w342/')}">` : ''}<span class="fx-pt" dir="ltr">${esc(e.t)}</span></span>` : '';
    const eye = e.rv ? (name ? t.reviewBy(name) : t.tReviews) : (name ? t.entryBy(name) : t.entry);
    const rv = !e.rv ? '' : (e.sp && !open['sp:' + e.id]) ? `<div class="fx-spgate"><p>${t.spoiler}</p><button type="button" class="fx-btn" data-spoil="${esc(e.id)}">${t.reveal}</button></div>` : `<div class="fx-rvfull" dir="auto">${esc(e.rv)}</div>`;
    const rating = e.r || e.h ? `<div class="fx-erate" dir="ltr">${e.r ? `<span class="fx-stars big" style="--r:${+e.r}" aria-label="${stars(e.r)}"></span>` : ''}${e.h ? '<span class="fx-heart big on" aria-hidden="true"></span>' : ''}</div>` : '';
    return `<article class="fx-entry">
      <div class="fx-efilm">${big}<div class="fx-b"><div class="fx-eye">${esc(eye)}</div>${titleOf(e, true)}${subOf(e)}</div></div>
      ${rating}
      <div class="fx-ewhen">${e.rw ? `<i class="fx-ico rw" aria-hidden="true"></i>${t.rewatchedOn}` : t.watchedOn} ${esc(longDate)}${e.ww ? ` · <span class="fx-ww">${esc(t.withShort(String(e.ww).slice(0, 80)))}</span>` : ''}</div>
      ${rv}
      ${tags.length ? `<div class="fx-dm">${tags.map(x => `<span class="fx-tagc">${esc(x.slice(0, 30))}</span>`).join('')}</div>` : ''}
      <div class="fx-row"><button type="button" class="fx-btn" data-perma="${esc(e.id)}">${t.perma}</button></div>
    </article>`;
  }
  const years = () => [...new Set((data.diary || []).map(e => String(e.w || '').slice(0, 4)).filter(y => /^\d{4}$/.test(y)))].sort().reverse();
  const inYear = () => { const ys = years(); if (year === null || (year !== 'all' && !ys.includes(year))) year = ys.length > 1 ? ys[0] : 'all'; return year === 'all' ? (data.diary || []) : (data.diary || []).filter(e => String(e.w).startsWith(year)); };
  function yearNav() {
    const ys = years();
    return ys.length > 1 ? `<nav class="fx-years">${ys.concat('all').map(y => `<button type="button" data-year="${y}" aria-pressed="${year === y}">${y === 'all' ? T().allYears : faDigits(y)}</button>`).join('')}</nav>` : '';
  }
  function diaryView() {
    const d = inYear();
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
    const d = inYear().filter(e => e.rv);
    if (!d.length) return `<p class="fx-muted">${T().noReviews}</p>`;
    return '<ul class="fx-dl fx-revs">' + d.map(e => entry(e, true)).join('') + '</ul>';
  }
  // TMDB genre ids → names (the film list; TV genres were mapped onto these when looked up)
  const GEN = {28: ['Action', 'اکشن'], 12: ['Adventure', 'ماجرایی'], 16: ['Animation', 'انیمیشن'], 35: ['Comedy', 'کمدی'], 80: ['Crime', 'جنایی'], 99: ['Documentary', 'مستند'],
    18: ['Drama', 'درام'], 10751: ['Family', 'خانوادگی'], 14: ['Fantasy', 'فانتزی'], 36: ['History', 'تاریخی'], 27: ['Horror', 'وحشت'], 10402: ['Music', 'موسیقی'],
    9648: ['Mystery', 'معمایی'], 10749: ['Romance', 'عاشقانه'], 878: ['Science Fiction', 'علمی‌تخیلی'], 10770: ['TV Movie', 'فیلم تلویزیونی'], 53: ['Thriller', 'هیجان‌انگیز'],
    10752: ['War', 'جنگی'], 37: ['Western', 'وسترن']};
  const dn = (type, code) => { try { return new Intl.DisplayNames([lang], {type}).of(code) || code; } catch (e) { return code; } };
  const label = {g: id => (GEN[id] || [])[lang === 'fa' ? 1 : 0] || '', c: code => dn('region', code), l: code => dn('language', code === 'cn' ? 'yue' : code)};
  const avgTxt = v => '★ ' + (lang === 'fa' ? Number(v).toLocaleString('fa-IR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : v.toFixed(1));
  const seg = (key, opts) => `<div class="fx-years fx-seg" role="group">${opts.map(([v, l]) => `<button type="button" data-st="${key}:${v}" aria-pressed="${stv[key] === v}">${esc(l)}</button>`).join('')}</div>`;
  // one film per title, with its latest rating — Letterboxd counts films, not viewings
  function filmsOf(d) {
    const m = new Map();
    d.forEach(e => { const k = String(e.t) + '|' + (e.y || 0), f = m.get(k); if (!f) m.set(k, Object.assign({}, e)); else if (!f.r && e.r) f.r = e.r; });
    return [...m.values()];
  }
  // count and average rating per bucket, e.g. per genre: [[bucket, films, average or 0]]
  function tally(films, keys) {
    const a = {};
    films.forEach(f => [...new Set(keys(f))].forEach(k => { if (k === '' || k == null) return; const o = a[k] = a[k] || [0, 0, 0]; o[0]++; if (f.r) { o[1] += f.r; o[2]++; } }));
    return Object.entries(a).map(([k, [n, sum, rn]]) => [k, n, rn, rn ? sum / rn / 2 : 0]);
  }
  const minR = () => year === 'all' ? 3 : 2;
  function ranked(rows, mode, max) {
    if (mode === 'n') return rows.sort((x, y) => y[1] - x[1] || y[3] - x[3]).slice(0, max);
    return rows.filter(r => r[2] >= minR()).sort((x, y) => y[3] - x[3] || y[2] - x[2]).slice(0, max);
  }
  function barList(rows, mode, name) {
    if (!rows.length) return `<p class="fx-muted fx-few">${T().few}</p>`;
    const mx = mode === 'n' ? Math.max(...rows.map(r => r[1])) : 5;
    return `<div class="fx-rows fx-wide">${rows.map(r => `<div class="fx-rowbar"><span class="fx-rk"><bdi>${esc(name(r[0]))}</bdi></span><span class="fx-rb"><i style="width:${Math.max(2, Math.round((mode === 'n' ? r[1] : r[3]) / mx * 100))}%"></i></span><span class="fx-rn" dir="ltr">${mode === 'n' ? fa(r[1]) : avgTxt(r[3])}</span></div>`).join('')}</div>`;
  }
  function nameList(rows, mode) {
    if (!rows.length) return `<p class="fx-muted fx-few">${T().few}</p>`;
    return `<ol class="fx-top">${rows.map(r => `<li><bdi>${esc(r[0])}</bdi><span class="fx-rn"><bdi>${mode === 'n' ? esc(faDigits(T().films(r[1]))) : avgTxt(r[3]) + ' · ' + fa(r[2])}</bdi></span></li>`).join('')}</ol>`;
  }
  const card = (title, tools, body) => `<section class="fx-card"><div class="fx-cardh"><h2>${title}</h2>${tools || ''}</div>${body}</section>`;
  const dirsOf = f => String(f.d || '').split(/,\s*|،\s*/).filter(Boolean);
  function statsView() {
    // all time also counts the films marked watched with no diary entry, as Letterboxd's stats do
    const t = T(), d = inYear(), extra = year === 'all' ? data.seen : [], films = filmsOf(d.concat(extra)), mw = [['n', t.most], ['r', t.best]];
    const hasMeta = films.some(f => Array.isArray(f.g) || Array.isArray(f.c));
    // the headline numbers
    const days = {}; d.forEach(e => { if (day.test(e.w)) days[e.w] = (days[e.w] || 0) + 1; });
    const num = n => Number(n).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US');
    const big = [[num(films.length), t.big.films], [num(Math.round(d.concat(extra).reduce((a, e) => a + (+e.m || 0), 0) / 60)), t.big.hours],
      [num(new Set(films.flatMap(dirsOf)).size), t.big.dirs]];
    if (hasMeta) big.push([num(new Set(films.flatMap(f => f.c || [])).size), t.big.countries]);
    big.push([num(Object.values(days).filter(n => n > 1).length), t.big.multi]);
    let h = `<section class="fx-big" dir="${lang === 'fa' ? 'rtl' : 'ltr'}">${big.map(([n, l]) => `<div><b>${n}</b><span>${esc(l)}</span></div>`).join('')}</section>`;
    if (typeof fxCalendar === 'function') h += `<section class="fx-card"><h2>${t.cal}</h2>${fxCalendar((data.diary || []).map(e => e.w).filter(w => day.test(w)), year, lang, (n => new Date(n.getTime() - n.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date()), FX_CAL_L[lang])}</section>`;
    const hist = Array(11).fill(0); d.concat(extra).forEach(e => { if (e.r) hist[e.r]++; });
    const hm = Math.max(1, ...hist);
    h += `<section class="fx-card"><h2>${t.spread}</h2><div class="fx-hist2" dir="ltr">${hist.slice(1).map((n, k) => `<div class="fx-bar" title="${(k + 1) / 2}★ · ${n}"><i style="height:${Math.round(n / hm * 100)}%"></i></div>`).join('')}</div><div class="fx-hist2-ax" dir="ltr"><span>½★</span><span>★★★★★</span></div></section>`;
    // decades: how many, or how well liked
    const dec = tally(films, f => f.y ? [Math.floor(f.y / 10) * 10] : []);
    const decRows = stv.dec === 'n' ? dec.sort((x, y) => x[0] - y[0]) : ranked(dec, 'r', 12);
    h += card(t.decades, seg('dec', mw), barList(decRows, stv.dec, k => faDigits(k) + (lang === 'fa' ? '' : 's')));
    if (year === 'all') {
      const yc = {}; d.forEach(e => { const y = String(e.w || '').slice(0, 4); if (/^\d{4}$/.test(y)) yc[y] = (yc[y] || 0) + 1; });
      const yk = Object.keys(yc).sort(), ym = Math.max(1, ...Object.values(yc));
      if (yk.length > 1) h += `<section class="fx-card"><h2>${t.byYear}</h2><div class="fx-rows fx-wide">${yk.map(k => `<div class="fx-rowbar"><span class="fx-rk">${faDigits(k)}</span><span class="fx-rb"><i style="width:${Math.round(yc[k] / ym * 100)}%"></i></span><span class="fx-rn">${fa(yc[k])}</span></div>`).join('')}</div></section>`;
    }
    // genres, countries and languages, the way Letterboxd groups them
    if (hasMeta) {
      const pick = {g: f => f.g || [], c: f => f.c || [], l: f => f.lg && f.lg !== 'xx' ? [f.lg] : []}[stv.gcl];
      const rows = ranked(tally(films, pick), stv.gm, 10);
      h += card(t.gcl, `<div class="fx-segs">${seg('gcl', [['g', t.genres], ['c', t.countries], ['l', t.languages]])}${seg('gm', mw)}</div>`, barList(rows, stv.gm, label[stv.gcl]));
    }
    h += card(t.dirsH, seg('dir', mw), nameList(ranked(tally(films, dirsOf), stv.dir, 10), stv.dir));
    if (hasMeta) h += card(t.cast, seg('cast', mw), nameList(ranked(tally(films, f => f.ca || []), stv.cast, 10), stv.cast));
    const mins = d.reduce((a, e) => a + (+e.m || 0), 0);
    h += `<section class="fx-card"><h2>${t.totals}</h2><div class="fx-eye fx-strip">${esc(faDigits([t.films(d.length), t.runtime + ' ' + t.hmf(mins), d.filter(e => e.r).length + ' ' + t.rated, d.filter(e => e.h).length + ' ' + t.liked, d.filter(e => e.rv).length + ' ' + t.reviewed].join(' · ')))}</div></section>`;
    return h;
  }
  function render() {
    const t = T();
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.title = (data && data.name ? data.name + ' · ' : '') + t.title;
    const dir = lang === 'fa' ? 'rtl' : 'ltr', e = cur ? (data.diary || []).find(x => x.id === cur) : null;
    if (e) {
      const name = String(data.name || '').trim() || t.title;
      document.title = (e.t || '') + ' · ' + name;
      root.innerHTML = `<div class="fx fx-share fx-pub fx-epage${withP ? ' fx-hasp' : ''}" dir="${dir}"><nav class="fx-ebar"><button type="button" class="fx-link fx-backl" data-back>${esc(t.backTo(name))}</button></nav>${entryView(e)}<footer class="fx-foot fx-muted" dir="ltr">${esc(t.attr)}</footer></div>`;
      return;
    }
    const body = tab === 'diary' ? diaryView() : tab === 'reviews' ? reviewsView() : tab === 'stats' ? statsView() : nowView();
    const yn = tab === 'now' ? '' : yearNav();
    root.innerHTML = `<div class="fx fx-share fx-pub${withP ? ' fx-hasp' : ''}${hero() ? ' fx-withbd' : ''}" dir="${dir}">${hero()}${header()}${yn}${body}<footer class="fx-foot fx-muted" dir="ltr">${esc(t.attr)}</footer></div>`;
  }
  function shell(title, sub) {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    root.innerHTML = `<div class="fx fx-share" dir="${lang === 'fa' ? 'rtl' : 'ltr'}"><header class="fx-head"><h1 class="fx-h1">${esc(title)}</h1></header>${sub ? `<p class="fx-muted">${esc(sub)}</p>` : ''}</div>`;
  }
  const hashFor = eid => opts.clean ? (eid ? '#' + eid : '') : '#' + id + (eid ? '/' + eid : '');
  function entryFromHash() {
    const m = opts.clean ? location.hash.match(/^#([a-z0-9-]{1,120})$/i) : location.hash.match(/^#[0-9a-f]{20,40}\/([a-z0-9-]{1,120})$/i);
    return m && m[1] !== 'signin' ? m[1] : '';
  }
  function openEntry(eid) { listScroll = window.scrollY; pushed = true; location.hash = hashFor(eid) || '#'; }
  function onHash() {
    const eid = entryFromHash();
    if (eid === cur) return;
    const wasEntry = !!cur; cur = eid;
    if (!data) return;
    if (cur && !data.diary.some(x => x.id === cur)) cur = '';
    if (!cur && tab === 'now' && wasEntry) tab = 'diary';
    render(); window.scrollTo(0, cur ? 0 : listScroll);
  }
  window.addEventListener('hashchange', onHash);
  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) { const row = !e.target.closest('a') && e.target.closest('[data-entry]'); if (row) openEntry(row.dataset.entry); return; }
    if (b.dataset.entry) { openEntry(b.dataset.entry); return; }
    if (b.hasAttribute('data-back')) {
      if (pushed) { pushed = false; history.back(); return; }
      history.replaceState(null, '', location.href.replace(/#.*$/, '') + hashFor('')); cur = ''; if (tab === 'now') tab = 'diary'; render(); window.scrollTo(0, 0); return;
    }
    if (b.dataset.tab) { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }
    else if (b.dataset.year) { year = b.dataset.year; render(); }
    else if (b.dataset.st) { const [k, v] = b.dataset.st.split(':'); if (k in stv) { stv[k] = v; render(); } }
    else if (b.dataset.spoil) { open['sp:' + b.dataset.spoil] = true; render(); }
    else if (b.dataset.more) { open[b.dataset.more] = !open[b.dataset.more]; render(); }
    else if (b.dataset.perma) {
      const url = permalink(b.dataset.perma);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { b.textContent = '✓'; b.title = T().copied; }, () => { location.hash = opts.clean ? b.dataset.perma : id + '/' + b.dataset.perma; });
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
      data.seen = (Array.isArray(data.seen) ? data.seen : []).filter(e => e && typeof e.t === 'string');
      withP = [].concat((data.now && data.now.films) || data.films || [], data.diary).some(f => f && okPoster(f.p));
      updated = g.updated_at;
      if (cur && !data.diary.some(x => x.id === cur)) cur = '';
      if (cur) { const fe = data.diary.find(x => x.id === cur); if (fe && year !== 'all' && !String(fe.w).startsWith(year || '')) year = String(fe.w).slice(0, 4); }
      render();
    } catch (e) {
      if (!data) shell(T().fail, T().later);
    }
  }
  load();
  const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 300000);
  return {stop: () => { clearInterval(timer); window.removeEventListener('hashchange', onHash); }};
}
// share.html#<gist id>[/<entry>] — the original address, still valid for links already shared
if (document.documentElement.dataset.page === 'share') {
  const hm = location.hash.match(/^#([0-9a-f]{20,40})(?:\/([a-z0-9-]{1,120}))?$/i) || [];
  fxProfile(document.getElementById('root'), hm[1], hm[2] || '', {});
}
