// "This week" view: only the current batch of films, no dates, no totals, no road ahead.
// A week opens once every film in the previous one is watched or set aside, so there is no falling behind.
// Shared by the web app, the extension popup, the claude.ai page and (fxCompact/fxCur only) the Letterboxd badge.

function fxCompact(D) {
  // per week: [core film keys], [free-slot ids], fully free?
  return D.W.map((items, wi) => {
    const w = wi + 1, free = !!(D.WM[wi] && D.WM[wi].free);
    const keys = items.filter(it => it[2] === 1).map(it => D.F[it[1]][8]);
    const n = items.filter(it => it[2] === 2).length;
    const slots = free ? [] : Array.from({length: n}, (_, k) => 'free:' + w + ':' + k);
    return [keys, slots, free ? 1 : 0];
  });
}
function fxDone(wk, w, seen) {
  const [keys, slots, free] = wk[w - 1];
  if (free) return !!seen['wk:' + w];
  return keys.every(k => seen[k] || seen['sk:' + k]) && slots.every(k => seen[k] || seen['sk:' + k]);
}
function fxCur(wk, seen) {
  for (let w = 1; w <= wk.length; w++) if (!fxDone(wk, w, seen)) return w;
  return wk.length + 1;
}

// this week's items in display order: core films and free slots ({k, i, lane} / {k, i, free})
function fxItems(D, w) {
  const F = D.F, out = [], items = D.W[w - 1], sg = (D.SG || [])[w - 1] || [];
  if (D.WM[w - 1].free) return out;
  let n = 0;
  items.forEach(it => {
    if (it[2] === 1) out.push({k: F[it[1]][8], i: it[1], lane: it[0]});
    else if (it[2] === 2) { const k = 'free:' + w + ':' + n; out.push({k, i: sg[n] >= 0 ? sg[n] : null, free: true, n}); n++; }
  });
  // films of one director, or of a marathon, always appear in the order they were made
  const groups = {};
  out.forEach(o => { if (!o.free) { const g = F[o.i][11] ? 'ser' : 'd:' + F[o.i][2]; (groups[g] = groups[g] || []).push(o); } });
  Object.values(groups).forEach(g => {
    if (g.length < 2) return;
    const pos = g.map(o => out.indexOf(o)), sorted = g.slice().sort((a, b) => F[a.i][1] - F[b.i][1]);
    pos.forEach((p, k) => { out[p] = sorted[k]; });
  });
  return out;
}
// a free slot's film: the one picked for it, else its suggestion, swapped for an unseen one if already watched
function fxSug(D, w, n, seen, KEYIDX) {
  const F = D.F, SG = D.SG || []; let i = (SG[w - 1] || [])[n];
  const v = seen['free:' + w + ':' + n];
  if (v && v.startsWith('k:')) return KEYIDX[v.slice(2)];
  if (i == null || i < 0) return null;
  if (!seen[F[i][8]]) return i;
  const all = SG.flat().filter(j => j >= 0 && !seen[F[j][8]]);
  return all.length ? all[(w * 7 + n) % all.length] : null;
}
// what a friend may see: this week's films with title, year, director, runtime, poster and the day it was watched.
// Nothing about lanes, drives, marathons, ratings, skips, settings or the rest of the plan.
function fxShare(D, seen, posterUrl) {
  const F = D.F, FA = D.faDir || {}, WK = fxCompact(D), w = fxCur(WK, seen);
  if (w > D.W.length) return JSON.stringify({v: 1, end: 1});
  const KEYIDX = {}; F.forEach((f, i) => { KEYIDX[f[8]] = i; });
  const dir = i => F[i][2].split(', ').map(d => FA[d] || d).join('، ');
  const film = (i, day) => { const p = posterUrl ? posterUrl(F[i][8]) || '' : ''; return {t: F[i][0], y: F[i][1], d: dir(i), m: F[i][3] || 0, p, l: F[i][5] || '', w: day || ''}; };
  const day = v => /^\d{4}-\d\d-\d\d$/.test(v || '') ? v : '';
  const films = [];
  if (D.WM[w - 1].free) {
    const i = fxSug(D, w, 0, seen, KEYIDX);
    if (i != null && seen[F[i][8]]) films.push(film(i, day(seen[F[i][8]])));
    return JSON.stringify({v: 1, rest: 1, films});
  }
  fxItems(D, w).forEach(it => {
    if (seen['sk:' + it.k]) return;
    if (it.free) {
      const v = seen[it.k] || '';
      if (v && !v.startsWith('k:')) { films.push({t: v, y: 0, d: '', m: 0, p: '', l: '', w: '1'}); return; }
      const i = fxSug(D, w, it.n, seen, KEYIDX);
      if (i != null) films.push(film(i, v ? day(seen[F[i][8]]) || '1' : ''));
      return;
    }
    films.push(film(it.i, day(seen[it.k])));
  });
  return JSON.stringify({v: 1, films});
}

// opts: openFull(), fullLabel, posters (Posters module or null), settings (adapter or null)
function mountFocus(root, D, S, opts) {
  const F = D.F, W = D.W, WM = D.WM, SG = D.SG || [], NW = W.length, FA = D.faDir || {};
  const WK = fxCompact(D), P = opts.posters || null, ST = opts.settings || null;
  const fa = n => Number(n).toLocaleString('fa-IR');
  const fa1 = n => Number(n).toLocaleString('fa-IR', {minimumFractionDigits: 1, maximumFractionDigits: 1});
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const jd = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day: 'numeric', month: 'long'});
  const pdate = v => { try { return /^\d{4}-\d\d-\d\d$/.test(v) ? jd.format(new Date(v + 'T12:00:00')) : ''; } catch (e) { return ''; } };
  const ago = t => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'همین الان' : m < 60 ? fa(m) + ' دقیقه پیش' : m < 1440 ? fa(Math.round(m / 60)) + ' ساعت پیش' : fa(Math.round(m / 1440)) + ' روز پیش'; };
  const KEY = i => F[i][8];
  const KEYIDX = {}; F.forEach((f, i) => { KEYIDX[f[8]] = i; });
  const link = i => F[i][5] ? 'https://letterboxd.com/film/' + F[i][5] + '/' : 'https://letterboxd.com/search/films/' + encodeURIComponent(F[i][0] + ' ' + F[i][1]) + '/';
  const LN = {H: 'تاریخ', A: 'مؤلف', C: 'امروز', P: 'پاپ'};
  const STL = {wl: ['ok', 'روی هارد'], done: ['ok', 'روی هارد'], dl: ['dl', 'در حال دانلود'], need: ['need', 'دانلود کن']};
  const dirName = i => F[i][2].split(', ').map(d => FA[d] || d).join('، ');
  let shown = null, pickK = null, altOpen = {}, view = 'week', note = {};

  const seen = () => S.all();
  const res = k => { const s = seen(); return !!(s[k] || s['sk:' + k]); };
  const posterOn = () => !!(P && P.on());

  const itemsOf = w => fxItems(D, w);
  const sugFor = (w, n) => fxSug(D, w, n, seen(), KEYIDX);
  function friends(i) {
    const avg = F[i][14], n = F[i][15];
    return n >= 3 ? `<span class="fx-fr" title="میانگین امتیاز ${fa(n)} نفر از دوستات"><i aria-hidden="true"></i>${fa1(avg / 10)}<span class="fx-frn">دوستات</span></span>` : '';
  }
  function meta(i, lane, free) {
    const st = STL[F[i][4]] || ['need', ''];
    const bits = [];
    if (free) bits.push('<span class="fx-lane F">آزاد</span>');
    else if (LN[lane]) bits.push(`<span class="fx-lane ${lane}">${LN[lane]}</span>`);
    bits.push(`<bdi>${esc(dirName(i))}</bdi>`);
    if (F[i][3]) bits.push(`<span>${fa(F[i][3])} دقیقه</span>`);
    bits.push(friends(i));
    if (F[i][11]) bits.push(`<span class="fx-tag">${esc(F[i][11])}</span>`);
    else if (F[i][10] && !free) bits.push('<span class="fx-tag">اولین فیلمت ازش</span>');
    if (st[1]) bits.push(`<span class="fx-st ${st[0]}">${st[1]}</span>`);
    return bits.join('');
  }
  function poster(i) {
    if (!posterOn()) return '';
    if (i == null) return '<span class="fx-pos none" aria-hidden="true"></span>';
    const src = P.src(KEY(i));
    return `<a class="fx-pos" href="${link(i)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img alt="" loading="lazy" decoding="async" data-pk="${esc(KEY(i))}" data-pt="${esc(F[i][0])}" data-py="${F[i][1]}"${src ? ` src="${src}"` : ''}><span class="fx-pt" dir="ltr">${esc(F[i][0])}</span></a>`;
  }
  // Letterboxd-style rating (half stars, stored 1–10) and heart, shown once a film is ticked
  function rateRow(rk) {
    const s = seen(), r = +(s['r:' + rk] || 0), liked = !!s['l:' + rk];
    let b = '';
    for (let n = 1; n <= 10; n++) b += `<button type="button" data-rate="${n}" aria-label="${fa(n / 2)} ستاره" aria-pressed="${n === r}"></button>`;
    return `<div class="fx-rate" data-rk="${esc(rk)}"><span class="fx-stars" dir="ltr" style="--r:${r}" role="group" aria-label="امتیاز">${b}</span><button type="button" class="fx-heart${liked ? ' on' : ''}" data-like aria-pressed="${liked}" aria-label="دوستش داشتم"></button>${r || liked ? '' : '<span class="fx-ask">چطور بود؟</span>'}</div>`;
  }
  function starsText(rk) {
    const s = seen(), r = +(s['r:' + rk] || 0), l = !!s['l:' + rk];
    return (r ? `<span class="fx-mini" dir="ltr">${'★'.repeat(Math.floor(r / 2))}${r % 2 ? '½' : ''}</span>` : '') + (l ? '<span class="fx-mh" aria-label="دوستش داشتی">♥︎</span>' : '');
  }
  const skipBtn = (done, skipped) => skipped ? '<button type="button" class="fx-link" data-unskip>برگردون</button>' : done ? '' : '<button type="button" class="fx-link fx-skipb" data-skip title="این یکی رو بی‌خیال شو">رد</button>';
  function card(w, it, n) {
    const s = seen();
    if (it.free) {
      const v = s[it.k] || '', skipped = !!s['sk:' + it.k];
      const i = sugFor(w, n), txt = v && !v.startsWith('k:') ? v : '';
      const done = !!v, cls = done ? 'done' : skipped ? 'skip' : '';
      const rk = v.startsWith('k:') ? v.slice(2) : it.k;
      const title = txt ? `<span class="fx-film" dir="auto">${esc(txt)}</span>` : i != null ? `<a class="fx-film" href="${link(i)}" target="_blank" rel="noopener noreferrer">${esc(F[i][0])}</a> <span class="fx-y">${F[i][1]}</span>` : '<span class="fx-film">هر چی دلت خواست</span>';
      const sub = txt ? '<div class="fx-m"><span class="fx-lane F">آزاد</span><span>خودت انتخاب کردی</span></div>' : i != null ? `<div class="fx-m">${meta(i, '', true)}</div>` : '';
      const alt = !done && !skipped ? (altOpen[it.k] ? `<form class="fx-alt" data-alt="${esc(it.k)}"><input type="text" dir="auto" placeholder="اسم فیلمی که دیدی" aria-label="فیلمی که به‌جاش دیدی" required><button type="submit">ثبت</button></form>` : `<button type="button" class="fx-link" data-open-alt="${esc(it.k)}">یه چیز دیگه دیدم</button>`) : '';
      return `<li class="fx-i ${cls}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}" data-sug="${i != null ? i : ''}">
        <button type="button" class="fx-chk" data-tick aria-pressed="${done}" aria-label="دیدمش">${done ? '✓' : ''}</button>${poster(txt ? null : i)}
        <div class="fx-b">${pickK === it.k ? '<span class="fx-tonight">امشب این</span>' : ''}<div>${title}</div>${sub}${alt}${done ? rateRow(rk) : ''}</div>
        ${skipBtn(done, skipped)}</li>`;
    }
    const i = it.i, done = !!s[it.k], skipped = !done && !!s['sk:' + it.k];
    return `<li class="fx-i ${done ? 'done' : skipped ? 'skip' : ''}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}">
      <button type="button" class="fx-chk" data-tick aria-pressed="${done}" aria-label="دیدمش">${done ? '✓' : ''}</button>${poster(i)}
      <div class="fx-b">${pickK === it.k ? '<span class="fx-tonight">امشب این</span>' : ''}<div><a class="fx-film" href="${link(i)}" target="_blank" rel="noopener noreferrer">${esc(F[i][0])}</a> <span class="fx-y">${F[i][1]}</span></div><div class="fx-m">${meta(i, it.lane, false)}</div>${done ? rateRow(it.k) : ''}</div>
      ${skipBtn(done, skipped)}</li>`;
  }
  function dots(list) {
    return `<div class="fx-dots" aria-label="${fa(list.filter(it => res(it.k)).length)} از ${fa(list.length)} تا">${list.map(it => `<i class="${seen()[it.k] ? 'on' : res(it.k) ? 'sk' : ''}"></i>`).join('')}</div>`;
  }
  function nextList(w) {
    let nw = w + 1;
    while (nw <= NW && WM[nw - 1].free) nw++;
    if (nw > NW) return [];
    return itemsOf(nw).map((it, n) => it.free ? (SG[nw - 1] || [])[n] : it.i).filter(i => i != null && i >= 0 && !seen()[KEY(i)]);
  }
  function history() {
    const s = seen(), rows = [];
    Object.entries(s).forEach(([k, v]) => {
      if (KEYIDX[k] !== undefined && /^\d{4}-/.test(v)) rows.push([v, k, KEYIDX[k], 0]);
      else if (k.startsWith('sk:') && KEYIDX[k.slice(3)] !== undefined) rows.push([v, k, KEYIDX[k.slice(3)], 1]);
    });
    const freeTxt = Object.entries(s).filter(([k, v]) => k.startsWith('free:') && v && !v.startsWith('k:')).length;
    const n = rows.filter(r => !r[3]).length + freeTxt;
    rows.sort((a, b) => a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0);
    return {n, rows: rows.slice(0, 30)};
  }
  function foot() {
    return `<footer class="fx-foot">${ST ? `<button type="button" class="fx-link" data-settings>تنظیمات${syncDot()}</button>` : ''}<button type="button" class="fx-link" data-full>${opts.fullLabel || 'نقشه‌ی کامل'}</button></footer>`;
  }
  function syncDot() {
    const st = ST.status();
    if (!st.connected) return '';
    return `<i class="fx-sd ${st.state === 'err' ? 'err' : st.state === 'busy' ? 'busy' : 'ok'}" aria-hidden="true"></i>`;
  }
  function renderWeek() {
    const cur = fxCur(WK, seen());
    if (shown === null || shown > cur) shown = cur;
    const w = shown;
    let h = '';
    if (w > NW) return `<section class="fx-rest"><h1 class="fx-h1">تموم شد</h1><p>همه‌ی هفته‌ها رو رفتی. حالا دیگه هر چی دلت خواست.</p></section>`;
    const m = WM[w - 1], list = itemsOf(w);
    const finished = w < cur;
    h += `<header class="fx-head"><div class="fx-hrow"><h1 class="fx-h1">${finished ? 'این هفته تموم شد' : 'این هفته'}</h1>${m.th && !m.free ? `<span class="fx-th">هفته‌ی سرزده: ${esc(m.th)}</span>` : ''}</div>${m.free ? '' : dots(list)}</header>`;
    if (finished) h += `<div class="fx-next"><span>هر وقت آماده بودی:</span><button type="button" class="fx-btn primary" data-advance>هفته‌ی بعد رو نشونم بده</button></div>`;
    if (m.free) {
      const i = sugFor(w, 0), k = 'free:' + w + ':0';
      h += `<section class="fx-rest"><p>این هفته برنامه نداره. هر چی دلت خواست ببین، یا هیچی.</p>${i != null ? `<p class="fx-muted">اگه دنبال یه فیلم بودی:</p><ul class="fx-list">${card(w, {k, i, free: true}, 0)}</ul>` : ''}<button type="button" class="fx-btn primary" data-rest>بریم سراغ هفته‌ی بعد</button></section>`;
    } else {
      h += `<ul class="fx-list">${list.map((it, k) => card(w, it, it.free ? +it.k.split(':')[2] : k)).join('')}</ul>`;
      if (!finished && list.some(it => !res(it.k))) h += `<div class="fx-act"><button type="button" class="fx-btn" data-tonight>امشب کدوم؟</button><span class="fx-muted">اگه نمی‌خوای خودت انتخاب کنی</span></div>`;
    }
    const nx = nextList(w);
    if (nx.length) {
      const txt = nx.map(i => F[i][0] + ' (' + F[i][1] + ')').join('\n');
      h += `<details class="fx-more"><summary>برای دانلود: فیلم‌های هفته‌ی بعد</summary><pre class="fx-pre" dir="ltr">${esc(txt)}</pre><button type="button" class="fx-btn" data-copy>کپی</button></details>`;
    }
    const hi = history();
    if (hi.rows.length) h += `<details class="fx-more"${opts.histOpen ? ' open' : ''}><summary>تا حالا ${fa(hi.n)} فیلم دیدی</summary><ul class="fx-hist">${hi.rows.map(([v, k, i, sk]) => `<li><bdi class="fx-hf">${esc(F[i][0])}</bdi>${sk ? '' : starsText(k)}<span class="fx-muted">${sk ? 'رد شد' : pdate(v)}</span><button type="button" class="fx-link" data-undo="${esc(k)}">${sk ? 'برگردون' : 'نه، ندیدم'}</button></li>`).join('')}</ul></details>`;
    return h;
  }
  function renderSettings() {
    const st = ST.status(), tm = seen()['cfg:tmdb'];
    const msg = k => note[k] ? `<p class="fx-note ${note[k][0]}">${esc(note[k][1])}</p>` : '';
    let h = `<header class="fx-head"><div class="fx-hrow"><h1 class="fx-h1">تنظیمات</h1></div></header>`;
    h += `<section class="fx-card"><h2>همگام‌سازی آیفون و مک</h2>`;
    if (st.connected) {
      h += `<p>وصلی به گیت‌هاب${st.login ? ` با حساب <bdi>${esc(st.login)}</bdi>` : ''}. ${st.state === 'err' ? `<span class="fx-bad">${esc(st.msg || '')}</span>` : st.state === 'busy' ? 'در حال همگام‌سازی…' : st.at ? 'آخرین همگام‌سازی: ' + ago(st.at) + '.' : ''}</p>
        <div class="fx-row"><button type="button" class="fx-btn" data-sync-now>الان همگام کن</button><button type="button" class="fx-link" data-disconnect>قطع اتصال همین دستگاه</button></div>`;
    } else {
      h += `<p>تیک‌ها، ستاره‌ها و قلب‌ها توی یه Gist خصوصی تو حساب گیت‌هاب خودت نگه داشته می‌شن تا روی همه‌ی دستگاه‌هات یکی باشن. برای هر دستگاه یه بار همون توکن رو اینجا بچسبون.</p>
        <ol class="fx-steps"><li><a href="https://github.com/settings/tokens/new?scopes=gist&description=five-years-cinema" target="_blank" rel="noopener noreferrer">این صفحه‌ی گیت‌هاب</a> رو باز کن؛ اسم و دسترسی (فقط gist) از قبل پر شده.</li><li>Expiration رو بذار روی <b>No expiration</b> و پایین صفحه Generate token رو بزن.</li><li>توکن رو کپی کن و اینجا بچسبون. یه جای امن (مثلاً یادداشت قفل‌دار) هم نگهش دار.</li></ol>
        <form class="fx-form" data-gh><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" placeholder="ghp_…" aria-label="توکن گیت‌هاب" required><button type="submit" class="fx-btn primary">وصل شو</button></form>`;
    }
    h += msg('gh') + `<p class="fx-muted">توکن فقط روی همین دستگاه ذخیره می‌شه و فقط به api.github.com فرستاده می‌شه. با دسترسی gist هیچ ریپو یا تنظیماتی از حسابت قابل تغییر نیست.</p></section>`;
    if (P) {
      h += `<section class="fx-card"><h2>پوسترها</h2>`;
      if (tm) h += `<p>پوسترها از TMDB میان${P.failed() ? '، ولی <span class="fx-bad">TMDB این کلید رو قبول نکرد</span>' : ''}.</p><div class="fx-row"><button type="button" class="fx-link" data-tmdb-clear>برداشتن کلید</button></div>`;
      else h += `<p>برای پوستر یه کلید رایگان TMDB لازمه. کافیه روی یکی از دستگاه‌ها واردش کنی؛ از طریق همگام‌سازی به بقیه هم می‌رسه.</p>
        <ol class="fx-steps"><li>تو <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer">themoviedb.org</a> حساب بساز (اگه نداری).</li><li>از <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">صفحه‌ی API</a> یه کلید Developer بگیر (استفاده‌ی شخصی).</li><li>توی همون صفحه «API Read Access Token» (همون رشته‌ی بلندی که با eyJ شروع می‌شه) رو کپی کن و اینجا بچسبون.</li></ol>
        <form class="fx-form" data-tmdb><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" placeholder="eyJ…" aria-label="کلید TMDB" required><button type="submit" class="fx-btn primary">ذخیره</button></form>`;
      h += msg('tmdb') + `<p class="fx-muted" dir="ltr" style="text-align:left">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section>`;
    }
    if (ST.shareOn) {
      const sid = seen()['cfg:share'];
      h += `<section class="fx-card"><h2>لینک برای دوستات</h2>`;
      if (!st.connected) h += `<p class="fx-muted">اول همگام‌سازی رو وصل کن؛ لینک از همون حساب گیت‌هاب ساخته می‌شه.</p>`;
      else if (sid) h += `<p>با این لینک فقط فیلم‌های همین هفته دیده می‌شن: اسم، سال، کارگردان، مدت، پوستر و اینکه کدوم رو کی دیدی. هیچی رو نمی‌شه تغییر داد و بقیه‌ی برنامه و تنظیمات هم دیده نمی‌شن.</p><pre class="fx-pre fx-link-pre" dir="ltr">${esc(ST.shareUrl(sid))}</pre><div class="fx-row"><button type="button" class="fx-btn primary" data-share-copy>کپی لینک</button><button type="button" class="fx-link" data-share-off>قطع اشتراک</button></div>`;
      else h += `<p>یه لینک فقط‌خوندنی برای دوستات: فقط فیلم‌های همین هفته، با اسم، سال، کارگردان، مدت، پوستر و تاریخ دیدن. هارد، رگه‌ها، ماراتن‌ها، نمره‌ها، بقیه‌ی برنامه و تنظیمات توش نیست.</p><div class="fx-row"><button type="button" class="fx-btn primary" data-share-on>ساختن لینک</button></div>`;
      h += msg('share') + `</section>`;
    }
    h += `<section class="fx-card"><h2>پشتیبان</h2><p class="fx-muted">برای آوردن تیک‌ها از نسخه‌های قبلی یا نگه داشتن یه نسخه‌ی دستی.</p>
      <div class="fx-row"><button type="button" class="fx-btn" data-bk-copy>کپی پشتیبان</button></div>
      <form class="fx-form" data-bk><input type="text" autocomplete="off" dir="ltr" placeholder="متن پشتیبان رو اینجا بچسبون" aria-label="متن پشتیبان" required><button type="submit" class="fx-btn">بازگردانی</button></form>${msg('bk')}</section>`;
    h += `<div class="fx-row"><button type="button" class="fx-btn primary" data-back>برگرد به این هفته</button></div>`;
    return h;
  }
  function render() {
    const html = view === 'settings' && ST ? renderSettings() : renderWeek();
    root.innerHTML = `<div class="fx${posterOn() ? ' fx-hasp' : ''}">${html}${view === 'settings' ? '' : foot()}</div>`;
    if (posterOn()) P.fill(root);
  }
  function setFilm(k, on) {
    S.set(k, on ? today() : null);
    if (on) S.set('sk:' + k, null);
    else {
      S.set('r:' + k, null); S.set('l:' + k, null);
      Object.entries(seen()).forEach(([fk, v]) => { if (fk.startsWith('free:') && v === 'k:' + k) S.set(fk, null); });
    }
  }
  const say = (k, cls, txt) => { note[k] = [cls, txt]; render(); };
  root.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    const li = t.closest('.fx-i'), k = li && li.dataset.k;
    if (t.hasAttribute('data-tick')) {
      const s = seen();
      if (k.startsWith('free:')) {
        const v = s[k];
        if (v) { S.set(k, null); S.set('r:' + k, null); S.set('l:' + k, null); if (v.startsWith('k:')) setFilm(v.slice(2), false); }
        else if (li.dataset.sug !== '') { const fk = KEY(+li.dataset.sug); S.set(k, 'k:' + fk); S.set(fk, today()); S.set('sk:' + k, null); }
        else { altOpen[k] = true; }
      } else setFilm(k, !s[k]);
      if (pickK === k) pickK = null;
    } else if (t.hasAttribute('data-rate')) {
      const rk = t.closest('.fx-rate').dataset.rk, n = +t.dataset.rate, cur = +(seen()['r:' + rk] || 0);
      S.set('r:' + rk, n === cur ? null : n);
    } else if (t.hasAttribute('data-like')) {
      const rk = t.closest('.fx-rate').dataset.rk; S.set('l:' + rk, seen()['l:' + rk] ? null : 1);
    } else if (t.hasAttribute('data-skip')) { S.set('sk:' + k, today()); if (pickK === k) pickK = null; }
    else if (t.hasAttribute('data-unskip')) S.set('sk:' + k, null);
    else if (t.hasAttribute('data-open-alt')) { altOpen[t.dataset.openAlt] = true; render(); const inp = root.querySelector('.fx-alt input'); if (inp) inp.focus(); return; }
    else if (t.hasAttribute('data-advance')) { shown = null; }
    else if (t.hasAttribute('data-rest')) { S.set('wk:' + shown, today()); shown = null; }
    else if (t.hasAttribute('data-tonight')) {
      const list = itemsOf(shown).filter(it => !res(it.k));
      const ok = list.filter(it => {
        if (it.free || it.i == null) return true;
        const d = F[it.i][2], ser = !!F[it.i][11];
        return !list.some(o => o !== it && !o.free && o.i != null && F[o.i][1] < F[it.i][1] && (F[o.i][2] === d || (ser && F[o.i][11])));
      });
      const pool = ok.length ? ok : list;
      if (pool.length) { let p; do { p = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && p.k === pickK); pickK = p.k; }
      render();
      const el = root.querySelector('.fx-i.pick'); if (el) el.scrollIntoView({block: 'center', behavior: 'smooth'});
      return;
    }
    else if (t.hasAttribute('data-copy')) {
      const txt = root.querySelector('.fx-pre').textContent;
      copy(txt, t, root.querySelector('.fx-pre'));
      return;
    }
    else if (t.hasAttribute('data-undo')) { const u = t.dataset.undo; if (u.startsWith('sk:')) S.set(u, null); else setFilm(u, false); }
    else if (t.hasAttribute('data-full')) { opts.openFull && opts.openFull(shown); return; }
    else if (t.hasAttribute('data-settings')) { view = 'settings'; note = {}; render(); window.scrollTo(0, 0); return; }
    else if (t.hasAttribute('data-back')) { view = 'week'; note = {}; render(); window.scrollTo(0, 0); return; }
    else if (t.hasAttribute('data-sync-now')) { ST.syncNow(); }
    else if (t.hasAttribute('data-disconnect')) { ST.disconnect(); note.gh = ['ok', 'این دستگاه از همگام‌سازی جدا شد. تیک‌هاش سر جاشه.']; }
    else if (t.hasAttribute('data-share-on')) {
      say('share', 'busy', 'دارم لینک رو می‌سازم…');
      ST.shareOn().then(r => { note.share = r ? ['bad', r] : ['ok', 'ساخته شد؛ کپیش کن و بفرست.']; render(); });
      return;
    }
    else if (t.hasAttribute('data-share-off')) {
      say('share', 'busy', 'دارم لینک رو باطل می‌کنم…');
      ST.shareOff().then(r => { note.share = r ? ['bad', r] : ['ok', 'لینک قبلی دیگه کار نمی‌کنه.']; render(); });
      return;
    }
    else if (t.hasAttribute('data-share-copy')) { copy(ST.shareUrl(seen()['cfg:share']), t, root.querySelector('.fx-link-pre')); return; }
    else if (t.hasAttribute('data-tmdb-clear')) { S.set('cfg:tmdb', null); P.setToken(null); }
    else if (t.hasAttribute('data-bk-copy')) {
      const o = {}; Object.entries(seen()).forEach(([k2, v]) => { if (!k2.startsWith('cfg:')) o[k2] = v; });
      copy(JSON.stringify(o), t, null);
      return;
    }
    else return;
    render();
  });
  function copy(txt, btn, node) {
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { btn.textContent = 'کپی شد'; }, () => {
      if (node) { const r = document.createRange(); r.selectNodeContents(node); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); btn.textContent = 'انتخاب شد؛ کپی کن'; }
      else { window.prompt('این متن رو کپی کن:', txt); }
    });
  }
  root.addEventListener('submit', async e => {
    const f = e.target.closest('form'); if (!f) return;
    e.preventDefault();
    const inp = f.querySelector('input'), v = inp.value.trim(); if (!v) return;
    if (f.dataset.alt) { const k = f.dataset.alt; S.set(k, v); S.set('sk:' + k, null); delete altOpen[k]; render(); return; }
    if (f.hasAttribute('data-gh')) {
      inp.disabled = true; say('gh', 'busy', 'دارم توکن رو امتحان می‌کنم…');
      const r = await ST.connect(v);
      note.gh = r ? ['bad', r] : ['ok', 'وصل شد. از این به بعد همه‌چی خودش همگام می‌شه.']; render(); return;
    }
    if (f.hasAttribute('data-tmdb')) {
      if (!/^eyJ/.test(v)) { say('tmdb', 'bad', 'این «API Key» کوتاهه؛ «API Read Access Token» رو بچسبون (با eyJ شروع می‌شه).'); return; }
      inp.disabled = true; say('tmdb', 'busy', 'دارم کلید رو امتحان می‌کنم…');
      const ok = await P.test(v);
      if (ok === false) { say('tmdb', 'bad', 'TMDB این کلید رو قبول نکرد.'); return; }
      S.set('cfg:tmdb', v); P.setToken(v);
      say('tmdb', 'ok', ok ? 'ذخیره شد؛ پوسترها کم‌کم میان.' : 'ذخیره شد؛ وقتی اینترنت بود پوسترها میان.'); return;
    }
    if (f.hasAttribute('data-bk')) {
      try {
        const o = JSON.parse(v); let c = 0;
        Object.entries(o).forEach(([k, val]) => { if (val && !k.startsWith('cfg:') && !seen()[k]) { S.set(k, val); c++; } });
        say('bk', 'ok', fa(c) + ' مورد اضافه شد.');
      } catch (err) { say('bk', 'bad', 'این متن پشتیبان درست نیست؛ کل متنی که کپی کردی رو بچسبون.'); }
    }
  });
  if (P) P.setToken(seen()['cfg:tmdb']);
  render();
  return {
    render: () => { if (P) P.setToken(seen()['cfg:tmdb']); if (!root.querySelector('input:focus')) render(); },
    current: () => fxCur(WK, seen()),
  };
}
