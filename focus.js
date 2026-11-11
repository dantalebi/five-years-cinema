// "This week" view: only the current batch of films, no dates, no totals, no road ahead.
// A week opens once every film in the previous one is watched, skipped or removed, so there is no falling behind.
// Films can be added to the week or swapped in for a planned one. English by default, Persian as an option.
// Shared by the web app, the extension popup and (fxCompact/fxCur/fxT only) the Letterboxd badge.

const FX_TH_EN = {'عشق': 'Love', 'وحشت': 'Horror', 'خنده': 'Comedy', 'جنایت': 'Crime', 'سیاست و تاریخ': 'Politics & history', 'جنگ': 'War',
  'کودکی و نوجوانی': 'Growing up', 'زمین و طبیعت': 'Earth & nature', 'حافظه و زمان': 'Memory & time', 'رؤیا و افسانه': 'Dreams & fables',
  'میل و وسوسه': 'Desire', 'سینما درباره‌ی سینما': 'Cinema on cinema', 'اکشن و ماجرا': 'Action & adventure', 'وسترن': 'Westerns'};
const FX_STR = {
  en: {
    thisWeek: 'Now Showing', weekDone: 'That’s a wrap', surprise: t => 'Strand · ' + t,
    eyebrow: (n, of, rt) => 'Programme · ' + n + '/' + of + ' logged' + (rt ? ' · ' + rt + ' total runtime' : ''),
    hm: m => m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + 'm',
    whenReady: 'Programme complete.', showNext: 'Roll the next programme →',
    restP: 'Intermission. No programme this week — watch anything, or nothing at all.', restSug: 'If you need something to put on:', restGo: 'Next programme →',
    tonight: '⚄ Roll for tonight', tonightHint: 'for the indecisive', tonightTag: 'Tonight’s feature',
    dl: 'Acquisition list · next programme', copy: 'Copy list', copied: 'Copied', selected: 'Selected — copy it',
    watchedN: n => 'Diary · ' + n + (n === '1' ? ' entry' : ' entries'), skipped: 'Passed', notWatched: 'Unlog', restore: 'Undo',
    skip: 'Pass', skipTitle: 'Drop it from this programme', watched: 'Log', other: 'Logged something else', otherPh: 'What did you watch?', save: 'Log it',
    anything: 'Your call', yourPick: 'custom entry', free: 'Wildcard', lanes: {H: 'Canon', A: 'Auteur', C: 'Contemporary', P: 'Multiplex'},
    st: {ok: 'Local copy', dl: 'Downloading', need: 'No copy yet'}, min: n => n + '′', firstBy: 'Entry point', marathon: (k, n) => 'Series ' + k + '/' + n,
    friends: 'circle', friendsTitle: n => 'Average rating across ' + n + ' people you follow', howWas: 'Rate it', liked: 'Like', stars: n => n + ' stars',
    review: '✎ Review', editReview: '✎ Edit review', reviewPh: 'Write a review… it’s your diary, spoilers allowed.',
    settings: 'Settings', full: 'Five-year map', diaryLink: 'Diary', back: '← Back to the programme', end: 'Fin.', endP: 'Five years, every reel. From here on, the programme is yours.',
    add: '+ Add a title', addH: 'Add to this week’s programme', replace: 'Swap', replaceH: t => 'Swap out ' + t, insteadOf: t => 'In lieu of ' + t, added: 'Off-programme',
    remove: 'Drop', cancel: 'Cancel', addPh: 'Search the archive, or type any title', addAsIs: t => 'Add “' + t + '” as a custom entry', noMatch: 'Not in the archive — add it as a custom entry.',
    diaryH: 'Diary', diaryEye: (n, h, avg) => n + (n === '1' ? ' entry' : ' entries') + ' · ' + h + ' watched' + (avg ? ' · avg ★' + avg : ''),
    diaryEmpty: 'Nothing logged yet. The diary writes itself as you log films.', edit: 'Edit', watchedOn: 'Watched on', done: 'Done', unlog: 'Remove from diary',
    logOnLb: 'Letterboxd ↗', copyPost: 'Copy post', postCopied: 'Post copied — paste it in your channel.',
    syncH: 'Sync', syncOn: login => 'Linked to GitHub' + (login ? ' as @' + login : '') + '.', syncBusy: 'Syncing…', syncAt: a => 'Last sync ' + a + '.',
    syncNow: 'Sync now', disconnect: 'Unlink this device',
    syncIntro: 'Your diary — logs, ratings, likes, reviews — lives in a private Gist on your own GitHub account and is merged across devices. Each device needs the same token once.',
    syncSteps: ['Open <a href="https://github.com/settings/tokens/new?scopes=gist&description=five-years-cinema" target="_blank" rel="noopener noreferrer">GitHub’s token page</a> — the name and the gist-only scope are pre-filled.', 'Set Expiration to <b>No expiration</b>, then Generate token.', 'Paste it below, and keep a copy in your password manager.'],
    connect: 'Link', tokenNote: 'The token never leaves this device except in calls to api.github.com. A gist-only token can’t read or change your repositories or account settings.',
    testing: 'Verifying token…', connected: 'Linked. From here on, everything syncs on its own.', disconnected: 'Device unlinked. Its local diary stays put.',
    postersH: 'Artwork', postersOn: 'Posters are pulled from TMDB.', postersBad: 'TMDB rejected this token.', removeKey: 'Remove token',
    postersIntro: 'Posters come from TMDB with your free API Read Access Token. Add it on one device; sync carries it to the rest.',
    postersSteps: ['Sign up at <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer">themoviedb.org</a> if you haven’t.', 'Request a Developer key on the <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">API page</a> (personal use).', 'Copy the “API Read Access Token” — the long one starting with eyJ — and paste it here.'],
    shortKey: 'That’s the short API Key. Paste the “API Read Access Token” (starts with eyJ).', checkingKey: 'Verifying token…', keyBad: 'TMDB rejected this token.',
    keySaved: 'Saved. Posters will start appearing.', keySavedOffline: 'Saved. Posters will appear once you’re online.',
    shareH: 'Public page', shareNeedSync: 'Link sync first — the page is published from the same GitHub account.',
    shareOnP: 'Read-only for everyone else: the current programme (title, year, director, runtime, poster, log date) and, if enabled, your diary with ratings, likes and reviews. Acquisition status, lanes, the schedule and settings never leave your devices.',
    shareOffP: 'Publish a read-only page — a film diary with a “Now Showing” programme. Visitors can read, never edit. Acquisition status, lanes, the schedule and settings stay private.',
    shareMake: 'Publish page', shareCopy: 'Copy link', shareStop: 'Unpublish', shareMaking: 'Publishing…', shareMade: 'Published — copy the link and send it.', shareStopping: 'Unpublishing…', shareStopped: 'Unpublished. The old link is dead.',
    nameL: 'Display name', namePh: 'e.g. Danial', chL: 'Channel link (optional)', chPh: 'https://t.me/yourchannel', pubDiary: 'Include my diary, ratings and reviews',
    langH: 'Language', langNote: 'Also applies to your public page.',
    bkH: 'Backup', bkP: 'Export or import your diary as JSON — for migrating from older versions or keeping an offline copy.', bkCopy: 'Copy JSON', bkPh: 'Paste a JSON backup', bkLoad: 'Import', bkDone: n => n + ' imported.', bkBad: 'Not a valid backup — paste the whole text you copied.',
    copyPrompt: 'Copy this text:', ago: m => m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago',
  },
  fa: {
    thisWeek: 'این هفته', weekDone: 'این هفته تموم شد', surprise: t => 'هفته‌ی سرزده: ' + t,
    eyebrow: (n, of, rt) => n + ' از ' + of + ' دیده شد' + (rt ? ' · ' + rt : ''),
    hm: m => m >= 60 ? Math.floor(m / 60) + ' ساعت و ' + (m % 60) + ' دقیقه' : m + ' دقیقه',
    whenReady: 'هر وقت آماده بودی:', showNext: 'هفته‌ی بعد رو نشونم بده',
    restP: 'این هفته برنامه نداره. هر چی دلت خواست ببین، یا هیچی.', restSug: 'اگه دنبال یه فیلم بودی:', restGo: 'بریم سراغ هفته‌ی بعد',
    tonight: 'امشب کدوم؟', tonightHint: 'اگه نمی‌خوای خودت انتخاب کنی', tonightTag: 'امشب این',
    dl: 'برای دانلود: فیلم‌های هفته‌ی بعد', copy: 'کپی', copied: 'کپی شد', selected: 'انتخاب شد؛ کپی کن',
    watchedN: n => 'دفتر · ' + n + ' فیلم', skipped: 'رد شد', notWatched: 'نه، ندیدم', restore: 'برگردون',
    skip: 'رد', skipTitle: 'این یکی رو بی‌خیال شو', watched: 'دیدمش', other: 'یه چیز دیگه دیدم', otherPh: 'اسم فیلمی که دیدی', save: 'ثبت',
    anything: 'هر چی دلت خواست', yourPick: 'خودت انتخاب کردی', free: 'آزاد', lanes: {H: 'تاریخ', A: 'مؤلف', C: 'امروز', P: 'پاپ'},
    st: {ok: 'روی هارد', dl: 'در حال دانلود', need: 'دانلود کن'}, min: n => n + ' دقیقه', firstBy: 'اولین فیلمت ازش', marathon: (k, n) => 'ماراتن ' + k + ' از ' + n,
    friends: 'دوستات', friendsTitle: n => 'میانگین امتیاز ' + n + ' نفر از دوستات', howWas: 'چطور بود؟', liked: 'دوستش داشتم', stars: n => n + ' ستاره',
    review: '✎ ریویو', editReview: '✎ ویرایش ریویو', reviewPh: 'ریویوت رو بنویس… دفتر خودته، اسپویل هم آزاده.',
    settings: 'تنظیمات', full: 'نقشه‌ی پنج سال', diaryLink: 'دفتر', back: 'برگرد به این هفته', end: 'تموم شد', endP: 'همه‌ی هفته‌ها رو رفتی. حالا دیگه هر چی دلت خواست.',
    add: '+ یه فیلم اضافه کن', addH: 'یه فیلم به این هفته اضافه کن', replace: 'عوض کن', replaceH: t => 'به‌جای ' + t + '…', insteadOf: t => 'به‌جای ' + t, added: 'اضافه',
    remove: 'بردار', cancel: 'بی‌خیال', addPh: 'تو برنامه بگرد یا هر اسمی رو بنویس', addAsIs: t => '«' + t + '» رو همین‌طوری اضافه کن', noMatch: 'تو برنامه چیزی با این اسم نیست؛ همین‌طوری اضافه‌ش کن.',
    diaryH: 'دفتر', diaryEye: (n, h, avg) => n + ' فیلم · ' + h + (avg ? ' · میانگین ★' + avg : ''),
    diaryEmpty: 'هنوز چیزی ثبت نشده. هر فیلمی که تیک بزنی خودش اینجا میاد.', edit: 'ویرایش', watchedOn: 'تاریخ دیدن', done: 'تموم', unlog: 'حذف از دفتر',
    logOnLb: 'لترباکس ↗', copyPost: 'کپی پست', postCopied: 'کپی شد؛ تو کانالت بچسبون.',
    syncH: 'همگام‌سازی', syncOn: login => 'وصلی به گیت‌هاب' + (login ? ' با حساب ' + login : '') + '.', syncBusy: 'در حال همگام‌سازی…', syncAt: a => 'آخرین همگام‌سازی: ' + a + '.',
    syncNow: 'الان همگام کن', disconnect: 'قطع اتصال همین دستگاه',
    syncIntro: 'دفترت (تیک‌ها، ستاره‌ها، قلب‌ها و ریویوها) توی یه Gist خصوصی تو حساب گیت‌هاب خودت نگه داشته می‌شه تا روی همه‌ی دستگاه‌هات یکی باشه. برای هر دستگاه یه بار همون توکن رو اینجا بچسبون.',
    syncSteps: ['<a href="https://github.com/settings/tokens/new?scopes=gist&description=five-years-cinema" target="_blank" rel="noopener noreferrer">این صفحه‌ی گیت‌هاب</a> رو باز کن؛ اسم و دسترسی (فقط gist) از قبل پر شده.', 'Expiration رو بذار روی <b>No expiration</b> و Generate token رو بزن.', 'توکن رو اینجا بچسبون و یه جای امن هم نگهش دار.'],
    connect: 'وصل شو', tokenNote: 'توکن فقط روی همین دستگاه ذخیره می‌شه و فقط به api.github.com فرستاده می‌شه. با دسترسی gist هیچ ریپو یا تنظیماتی از حسابت قابل تغییر نیست.',
    testing: 'دارم توکن رو امتحان می‌کنم…', connected: 'وصل شد. از این به بعد همه‌چی خودش همگام می‌شه.', disconnected: 'این دستگاه از همگام‌سازی جدا شد. تیک‌هاش سر جاشه.',
    postersH: 'پوسترها', postersOn: 'پوسترها از TMDB میان.', postersBad: 'TMDB این کلید رو قبول نکرد.', removeKey: 'برداشتن کلید',
    postersIntro: 'برای پوستر یه کلید رایگان TMDB لازمه. کافیه روی یکی از دستگاه‌ها واردش کنی؛ از طریق همگام‌سازی به بقیه هم می‌رسه.',
    postersSteps: ['تو <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer">themoviedb.org</a> حساب بساز (اگه نداری).', 'از <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">صفحه‌ی API</a> یه کلید Developer بگیر.', '«API Read Access Token» (رشته‌ی بلندی که با eyJ شروع می‌شه) رو کپی کن و اینجا بچسبون.'],
    shortKey: 'این «API Key» کوتاهه؛ «API Read Access Token» رو بچسبون (با eyJ شروع می‌شه).', checkingKey: 'دارم کلید رو امتحان می‌کنم…', keyBad: 'TMDB این کلید رو قبول نکرد.',
    keySaved: 'ذخیره شد؛ پوسترها کم‌کم میان.', keySavedOffline: 'ذخیره شد؛ وقتی اینترنت بود پوسترها میان.',
    shareH: 'صفحه‌ی عمومی', shareNeedSync: 'اول همگام‌سازی رو وصل کن؛ صفحه از همون حساب گیت‌هاب منتشر می‌شه.',
    shareOnP: 'بقیه فقط می‌تونن بخونن: برنامه‌ی همین هفته (اسم، سال، کارگردان، مدت، پوستر، تاریخ دیدن) و اگه روشن باشه، دفترت با ستاره‌ها، قلب‌ها و ریویوها. هارد، رگه‌ها، برنامه‌ی کامل و تنظیمات هیچ‌وقت از دستگاه‌هات بیرون نمی‌رن.',
    shareOffP: 'یه صفحه‌ی فقط‌خوندنی منتشر کن: دفتر فیلم‌هات به‌اضافه‌ی برنامه‌ی همین هفته. بقیه می‌تونن بخونن، ولی هیچ‌وقت نمی‌تونن تغییر بدن.',
    shareMake: 'انتشار صفحه', shareCopy: 'کپی لینک', shareStop: 'لغو انتشار', shareMaking: 'دارم منتشر می‌کنم…', shareMade: 'منتشر شد؛ لینک رو کپی کن و بفرست.', shareStopping: 'دارم لغوش می‌کنم…', shareStopped: 'لغو شد؛ لینک قبلی دیگه کار نمی‌کنه.',
    nameL: 'اسمی که نشون داده بشه', namePh: 'مثلاً دانیال', chL: 'لینک کانال (اختیاری)', chPh: 'https://t.me/yourchannel', pubDiary: 'دفتر، ستاره‌ها و ریویوهام هم منتشر بشه',
    langH: 'زبان', langNote: 'صفحه‌ی عمومی هم همین زبان رو می‌گیره.',
    bkH: 'پشتیبان', bkP: 'برای آوردن دفتر از نسخه‌های قبلی یا نگه داشتن یه نسخه‌ی دستی.', bkCopy: 'کپی پشتیبان', bkPh: 'متن پشتیبان رو اینجا بچسبون', bkLoad: 'بازگردانی', bkDone: n => n + ' مورد اضافه شد.', bkBad: 'این متن پشتیبان درست نیست؛ کل متنی که کپی کردی رو بچسبون.',
    copyPrompt: 'این متن رو کپی کن:', ago: m => m < 1 ? 'همین الان' : m < 60 ? m + ' دقیقه پیش' : m < 1440 ? Math.round(m / 60) + ' ساعت پیش' : Math.round(m / 1440) + ' روز پیش',
  },
};
function fxLang(seen) { return seen && seen['cfg:lang'] === 'fa' ? 'fa' : 'en'; }
function fxNum(lang) { return n => lang === 'fa' ? Number(n).toLocaleString('fa-IR') : String(n); }

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
// films added to a week: add:<week>:<id> = 'k:<film key>' (from the plan) or 't:<title>' (anything else)
function fxAdds(seen) {
  const m = {};
  for (const k in seen) if (k.startsWith('add:') && seen[k]) { const w = +k.split(':')[1]; (m[w] = m[w] || []).push(k); }
  for (const w in m) m[w].sort();
  return m;
}
function fxAddDone(seen, a) {
  const v = seen[a];
  if (!v) return true;
  return v.startsWith('k:') ? !!seen[v.slice(2)] : !!seen['v:' + a];
}
function fxDone(wk, w, seen, adds) {
  const [keys, slots, free] = wk[w - 1];
  if (free) return !!seen['wk:' + w];
  return keys.every(k => seen[k] || seen['sk:' + k]) && slots.every(k => seen[k] || seen['sk:' + k]) && ((adds || {})[w] || []).every(a => fxAddDone(seen, a));
}
function fxCur(wk, seen) {
  const adds = fxAdds(seen);
  for (let w = 1; w <= wk.length; w++) if (!fxDone(wk, w, seen, adds)) return w;
  return wk.length + 1;
}
function fxKeyIdx(D) {
  if (!D.__ki) { D.__ki = {}; D.F.forEach((f, i) => { D.__ki[f[8]] = i; }); }
  return D.__ki;
}
// this week's items in display order: core films, free slots, then added films (a swap takes the place of the film it replaced)
function fxItems(D, w, seen) {
  const F = D.F, out = [], items = D.W[w - 1], sg = (D.SG || [])[w - 1] || [], KI = fxKeyIdx(D);
  if (!D.WM[w - 1].free) {
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
  }
  if (seen) (fxAdds(seen)[w] || []).forEach(a => {
    const v = seen[a], rp = seen['rp:' + a] || '';
    const it = {k: a, add: true, rp, i: v.startsWith('k:') && KI[v.slice(2)] !== undefined ? KI[v.slice(2)] : null, title: v.startsWith('t:') ? v.slice(2) : ''};
    const at = rp && seen['sk:' + rp] ? out.findIndex(o => o.k === rp) : -1;
    if (at >= 0) out.splice(at, 1, it); else out.push(it);
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
const fxYear = t => { const m = String(t).match(/\b(18|19|20)\d\d\b/); return m ? +m[0] : 0; };
// the diary: every logged film with its date, stars, heart and review (custom entries included)
function fxDiary(D, seen) {
  const F = D.F, KI = fxKeyIdx(D), out = [], day = /^\d{4}-\d\d-\d\d$/;
  for (const k in seen) {
    const v = seen[k];
    if (KI[k] !== undefined && day.test(v)) out.push({k, i: KI[k], t: F[KI[k]][0], y: F[KI[k]][1], date: v});
    else if (k.startsWith('v:') && day.test(v)) {
      const base = k.slice(2), bv = seen[base];
      if (!bv) continue;
      if (base.startsWith('add:') && bv.startsWith('t:')) out.push({k: base, i: null, t: bv.slice(2), y: fxYear(bv), date: v});
      else if (base.startsWith('free:') && !bv.startsWith('k:')) out.push({k: base, i: null, t: bv, y: fxYear(bv), date: v});
    }
  }
  out.forEach(e => { e.r = +(seen['r:' + e.k] || 0); e.l = !!seen['l:' + e.k]; e.rv = seen['rv:' + e.k] || ''; });
  out.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : a.k < b.k ? 1 : -1);
  return out;
}
function fxEntryId(k) {
  if (/^[a-z0-9-]+$/.test(k)) return k;
  let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'c' + h.toString(36);
}
// what the public page may show: the current programme (title, year, director, runtime, poster, log date) and,
// if enabled, the diary with ratings, likes and reviews. Never lanes, acquisition status, series, skips, the schedule or settings.
function fxShare(D, seen, posterUrl) {
  const F = D.F, FA = D.faDir || {}, WK = fxCompact(D), w = fxCur(WK, seen), lang = fxLang(seen);
  const KEYIDX = fxKeyIdx(D);
  const dir = i => lang === 'fa' ? F[i][2].split(', ').map(d => FA[d] || d).join('، ') : F[i][2];
  const pos = k => posterUrl ? posterUrl(k) || '' : '';
  const film = (i, day) => ({t: F[i][0], y: F[i][1], d: dir(i), m: F[i][3] || 0, p: pos(F[i][8]), l: F[i][5] || '', w: day || ''});
  const day = v => /^\d{4}-\d\d-\d\d$/.test(v || '') ? v : '';
  const ch = /^https:\/\/[^\s"<>]+$/.test(seen['cfg:channel'] || '') ? seen['cfg:channel'] : '';
  const out = {v: 2, lang, name: String(seen['cfg:name'] || '').slice(0, 60), ch, now: {films: []}, diary: []};
  if (w > D.W.length) out.now.end = 1;
  else {
    const films = out.now.films;
    if (D.WM[w - 1].free) {
      out.now.rest = 1;
      const i = fxSug(D, w, 0, seen, KEYIDX);
      if (i != null && seen[F[i][8]]) films.push(film(i, day(seen[F[i][8]])));
    }
    fxItems(D, w, seen).forEach(it => {
      if (seen['sk:' + it.k]) return;
      if (it.add) {
        if (it.i != null) films.push(film(it.i, day(seen[F[it.i][8]])));
        else films.push({t: it.title, y: fxYear(it.title), d: '', m: 0, p: pos('tx:' + it.title), l: '', w: day(seen['v:' + it.k])});
        return;
      }
      if (it.free) {
        const v = seen[it.k] || '';
        if (v && !v.startsWith('k:')) { films.push({t: v, y: fxYear(v), d: '', m: 0, p: '', l: '', w: day(seen['v:' + it.k]) || '1'}); return; }
        const i = fxSug(D, w, it.n, seen, KEYIDX);
        if (i != null) films.push(film(i, v ? day(seen[F[i][8]]) || '1' : ''));
        return;
      }
      films.push(film(it.i, day(seen[it.k])));
    });
  }
  if (seen['cfg:pubdiary'] !== '0') out.diary = fxDiary(D, seen).map(e => {
    const base = e.i != null ? film(e.i, e.date) : {t: e.t, y: e.y, d: '', m: 0, p: pos('tx:' + e.t), l: '', w: e.date};
    return Object.assign(base, {id: fxEntryId(e.k), r: e.r || 0, h: e.l ? 1 : 0, rv: String(e.rv || '').slice(0, 20000)});
  });
  return JSON.stringify(out);
}

// opts: openFull(week), posters (Posters module or null), settings (adapter or null)
function mountFocus(root, D, S, opts) {
  const F = D.F, W = D.W, WM = D.WM, SG = D.SG || [], NW = W.length, FA = D.faDir || {};
  const WK = fxCompact(D), P = opts.posters || null, ST = opts.settings || null;
  const KEYIDX = fxKeyIdx(D);
  const seen = () => S.all();
  const L = () => fxLang(seen()), T = () => FX_STR[L()];
  const fa = n => fxNum(L())(n);
  const fa1 = n => L() === 'fa' ? Number(n).toLocaleString('fa-IR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : Number(n).toFixed(1);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const jd = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day: 'numeric', month: 'long'});
  const ed = new Intl.DateTimeFormat('en-US', {day: 'numeric', month: 'short'});
  const pdate = v => { try { return /^\d{4}-\d\d-\d\d$/.test(v) ? (L() === 'fa' ? jd : ed).format(new Date(v + 'T12:00:00')) : ''; } catch (e) { return ''; } };
  const ago = t => t ? T().ago(Math.round((Date.now() - t) / 60000)).replace(/\d+/g, d => fa(d)) : '';
  const KEY = i => F[i][8];
  const link = i => F[i][5] ? 'https://letterboxd.com/film/' + F[i][5] + '/' : 'https://letterboxd.com/search/films/' + encodeURIComponent(F[i][0] + ' ' + F[i][1]) + '/';
  const lbSearch = t => 'https://letterboxd.com/search/films/' + encodeURIComponent(t) + '/';
  const STK = {wl: 'ok', done: 'ok', dl: 'dl', need: 'need'};
  const dirName = i => L() === 'fa' ? F[i][2].split(', ').map(d => FA[d] || d).join('، ') : F[i][2];
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  let shown = null, pickK = null, altOpen = {}, view = 'week', note = {}, picker = null, editK = null, reviewOpen = {}, rvTimer = null;

  const res = k => { const s = seen(); return !!(s[k] || s['sk:' + k]); };
  const posterOn = () => !!(P && P.on());
  const itemsOf = w => fxItems(D, w, seen());
  const sugFor = (w, n) => fxSug(D, w, n, seen(), KEYIDX);
  // is a list item settled (watched, skipped or swapped out)?
  const itemDone = it => it.add ? fxAddDone(seen(), it.k) : res(it.k);
  const itemSeen = it => it.add ? (it.i != null ? !!seen()[KEY(it.i)] : !!seen()['v:' + it.k]) : !!seen()[it.k];

  function friends(i) {
    const avg = F[i][14], n = F[i][15];
    return n >= 3 ? `<span class="fx-fr" title="${esc(T().friendsTitle(fa(n)))}"><i aria-hidden="true"></i>${fa1(avg / 10)}<span class="fx-frn">${T().friends}</span></span>` : '';
  }
  function marathon(s) {
    const d = String(s).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).match(/(\d+)\D+(\d+)/);
    return d && +d[2] > 1 ? T().marathon(fa(d[1]), fa(d[2])) : '';
  }
  function meta(i, lane, free, extra) {
    const st = STK[F[i][4]] || 'need', t = T(), bits = [];
    if (extra) bits.push(extra);
    else if (free) bits.push(`<span class="fx-lane F">${t.free}</span>`);
    else if (t.lanes[lane]) bits.push(`<span class="fx-lane ${lane}">${t.lanes[lane]}</span>`);
    bits.push(`<bdi>${esc(dirName(i))}</bdi>`);
    if (F[i][3]) bits.push(`<span class="fx-rt">${t.min(fa(F[i][3]))}</span>`);
    bits.push(friends(i));
    const mt = F[i][11] ? marathon(F[i][11]) : '';
    if (mt) bits.push(`<span class="fx-tag">${esc(mt)}</span>`);
    else if (F[i][10] && !free && !extra) bits.push(`<span class="fx-tag">${t.firstBy}</span>`);
    bits.push(`<span class="fx-st ${st}">${t.st[st]}</span>`);
    return bits.join('');
  }
  function poster(i, title) {
    if (!posterOn()) return '';
    if (i == null && !title) return '<span class="fx-pos none" aria-hidden="true"></span>';
    const key = i != null ? KEY(i) : 'tx:' + title, t = i != null ? F[i][0] : title, y = i != null ? F[i][1] : fxYear(title);
    const src = P.src(key), href = i != null ? link(i) : lbSearch(title);
    return `<a class="fx-pos" href="${href}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img alt="" loading="lazy" decoding="async" data-pk="${esc(key)}" data-pt="${esc(t.replace(/\s*\(?\b(18|19|20)\d\d\b\)?\s*$/, ''))}" data-py="${y}"${src ? ` src="${src}"` : ''}><span class="fx-pt" dir="ltr">${esc(t)}</span></a>`;
  }
  // Letterboxd-style rating (half stars, stored 1–10) and heart, shown once a film is ticked
  function rateRow(rk) {
    const s = seen(), r = +(s['r:' + rk] || 0), liked = !!s['l:' + rk], t = T();
    let b = '';
    for (let n = 1; n <= 10; n++) b += `<button type="button" data-rate="${n}" aria-label="${esc(t.stars(fa(n / 2)))}" aria-pressed="${n === r}"></button>`;
    return `<div class="fx-rate" data-rk="${esc(rk)}"><span class="fx-stars" dir="ltr" style="--r:${r}" role="group">${b}</span><button type="button" class="fx-heart${liked ? ' on' : ''}" data-like aria-pressed="${liked}" aria-label="${t.liked}"></button>${r || liked ? '' : `<span class="fx-ask">${t.howWas}</span>`}</div>`;
  }
  function reviewBlock(rk) {
    const t = T(), rv = seen()['rv:' + rk] || '';
    if (reviewOpen[rk]) return `<textarea class="fx-rv" data-rv="${esc(rk)}" dir="auto" rows="4" placeholder="${esc(t.reviewPh)}">${esc(rv)}</textarea>`;
    return (rv ? `<p class="fx-rvx" dir="auto">${esc(rv.length > 220 ? rv.slice(0, 220) + '…' : rv)}</p>` : '') + `<button type="button" class="fx-link fx-rvb" data-rvopen="${esc(rk)}">${rv ? t.editReview : t.review}</button>`;
  }
  function starsText(rk) {
    const s = seen(), r = +(s['r:' + rk] || 0), l = !!s['l:' + rk];
    return (r ? `<span class="fx-mini" dir="ltr">${'★'.repeat(Math.floor(r / 2))}${r % 2 ? '½' : ''}</span>` : '') + (l ? '<span class="fx-mh">♥︎</span>' : '');
  }
  const chk = done => `<button type="button" class="fx-chk" data-tick aria-pressed="${done}" aria-label="${T().watched}">${done ? '✓' : ''}</button>`;
  function sideBtns(done, skipped, canReplace) {
    const t = T();
    if (skipped) return `<div class="fx-side"><button type="button" class="fx-link" data-unskip>${t.restore}</button></div>`;
    if (done) return '<div class="fx-side"></div>';
    return `<div class="fx-side"><button type="button" class="fx-link fx-skipb" data-skip title="${esc(t.skipTitle)}">${t.skip}</button>${canReplace ? `<button type="button" class="fx-link fx-skipb" data-replace>${t.replace}</button>` : ''}</div>`;
  }
  const tonightTag = k => pickK === k ? `<span class="fx-tonight">${T().tonightTag}</span>` : '';
  function card(w, it, n) {
    const s = seen(), t = T();
    if (it.add) {
      const done = itemSeen(it), rk = it.i != null ? KEY(it.i) : it.k;
      const orig = it.rp ? origTitle(it.rp) : '';
      const tag = `<span class="fx-lane F">${orig ? esc(t.insteadOf(orig)) : t.added}</span>`;
      const title = it.i != null ? `<a class="fx-film" href="${link(it.i)}" target="_blank" rel="noopener noreferrer">${esc(F[it.i][0])}</a> <span class="fx-y">${F[it.i][1]}</span>` : `<a class="fx-film" dir="auto" href="${lbSearch(it.title)}" target="_blank" rel="noopener noreferrer">${esc(it.title)}</a>`;
      const sub = it.i != null ? `<div class="fx-m">${meta(it.i, '', false, tag)}</div>` : `<div class="fx-m">${tag}</div>`;
      return `<li class="fx-i fx-add ${done ? 'done' : ''}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}">${chk(done)}${poster(it.i, it.i == null ? it.title : '')}
        <div class="fx-b">${tonightTag(it.k)}<div>${title}</div>${sub}${done ? rateRow(rk) + reviewBlock(rk) : ''}</div>
        <div class="fx-side"><button type="button" class="fx-link fx-skipb" data-remove>${t.remove}</button></div></li>`;
    }
    if (it.free) {
      const v = s[it.k] || '', skipped = !!s['sk:' + it.k];
      const i = sugFor(w, n), txt = v && !v.startsWith('k:') ? v : '';
      const done = !!v, cls = done ? 'done' : skipped ? 'skip' : '';
      const rk = v.startsWith('k:') ? v.slice(2) : it.k;
      const title = txt ? `<span class="fx-film" dir="auto">${esc(txt)}</span>` : i != null ? `<a class="fx-film" href="${link(i)}" target="_blank" rel="noopener noreferrer">${esc(F[i][0])}</a> <span class="fx-y">${F[i][1]}</span>` : `<span class="fx-film">${t.anything}</span>`;
      const sub = txt ? `<div class="fx-m"><span class="fx-lane F">${t.free}</span><span>${t.yourPick}</span></div>` : i != null ? `<div class="fx-m">${meta(i, '', true)}</div>` : '';
      const alt = !done && !skipped ? (altOpen[it.k] ? `<form class="fx-alt" data-alt="${esc(it.k)}"><input type="text" dir="auto" placeholder="${esc(t.otherPh)}" aria-label="${esc(t.otherPh)}" required><button type="submit">${t.save}</button></form>` : `<button type="button" class="fx-link" data-open-alt="${esc(it.k)}">${t.other}</button>`) : '';
      return `<li class="fx-i ${cls}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}" data-sug="${i != null ? i : ''}">${chk(done)}${poster(txt ? null : i, txt)}
        <div class="fx-b">${tonightTag(it.k)}<div>${title}</div>${sub}${alt}${done ? rateRow(rk) + reviewBlock(rk) : ''}</div>
        ${sideBtns(done, skipped, true)}</li>`;
    }
    const i = it.i, done = !!s[it.k], skipped = !done && !!s['sk:' + it.k];
    return `<li class="fx-i ${done ? 'done' : skipped ? 'skip' : ''}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}">${chk(done)}${poster(i)}
      <div class="fx-b">${tonightTag(it.k)}<div><a class="fx-film" href="${link(i)}" target="_blank" rel="noopener noreferrer">${esc(F[i][0])}</a> <span class="fx-y">${F[i][1]}</span></div><div class="fx-m">${meta(i, it.lane, false)}</div>${done ? rateRow(it.k) + reviewBlock(it.k) : ''}</div>
      ${sideBtns(done, skipped, true)}</li>`;
  }
  function origTitle(k) {
    if (KEYIDX[k] !== undefined) return F[KEYIDX[k]][0];
    const m = k.match(/^free:(\d+):(\d+)$/);
    if (m) { const i = sugFor(+m[1], +m[2]); return i != null ? F[i][0] : T().free; }
    return '';
  }
  function dots(list) {
    return `<div class="fx-dots" aria-label="${fa(list.filter(itemDone).length)} / ${fa(list.length)}">${list.map(it => `<i class="${itemSeen(it) ? 'on' : itemDone(it) ? 'sk' : ''}"></i>`).join('')}</div>`;
  }
  function nextList(w) {
    let nw = w + 1;
    while (nw <= NW && WM[nw - 1].free) nw++;
    if (nw > NW) return [];
    return fxItems(D, nw).map(it => it.free ? (SG[nw - 1] || [])[it.n] : it.i).filter(i => i != null && i >= 0 && !seen()[KEY(i)]);
  }
  function history() {
    const s = seen(), rows = [], swapped = new Set(Object.entries(s).filter(([k]) => k.startsWith('rp:') && s[k.slice(3)]).map(([, v]) => v));
    Object.entries(s).forEach(([k, v]) => {
      if (KEYIDX[k] !== undefined && /^\d{4}-/.test(v)) rows.push([v, k, F[KEYIDX[k]][0], 0, k]);
      else if (k.startsWith('sk:') && KEYIDX[k.slice(3)] !== undefined && !swapped.has(k.slice(3))) rows.push([v, k, F[KEYIDX[k.slice(3)]][0], 1, '']);
      else if (k.startsWith('v:') && /^\d{4}-/.test(v) && s[k.slice(2)]) rows.push([v, k, String(s[k.slice(2)]).slice(2), 0, k.slice(2)]);
    });
    const freeTxt = Object.entries(s).filter(([k, v]) => k.startsWith('free:') && v && !v.startsWith('k:')).length;
    const n = rows.filter(r => !r[3]).length + freeTxt;
    rows.sort((a, b) => a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0);
    return {n, rows: rows.slice(0, 30)};
  }
  function foot() {
    const t = T();
    return `<footer class="fx-foot"><button type="button" class="fx-link" data-diary>${t.diaryLink}</button>${ST ? `<button type="button" class="fx-link" data-settings>${t.settings}${syncDot()}</button>` : ''}<button type="button" class="fx-link" data-full>${t.full}</button></footer>`;
  }
  function syncDot() {
    const st = ST.status();
    if (!st.connected) return '';
    return `<i class="fx-sd ${st.state === 'err' ? 'err' : st.state === 'busy' ? 'busy' : 'ok'}" aria-hidden="true"></i>`;
  }
  function pickerBox() {
    const t = T(), head = picker.replace ? t.replaceH(origTitle(picker.replace)) : t.addH;
    return `<div class="fx-picker fx-card"><div class="fx-pick-h">${esc(head)}</div>
      <input type="search" class="fx-pick-q" dir="auto" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t.addPh)}" aria-label="${esc(t.addPh)}" value="${esc(picker.q || '')}">
      <ul class="fx-res">${pickerResults()}</ul><div class="fx-row"><button type="button" class="fx-link" data-pick-cancel>${t.cancel}</button></div></div>`;
  }
  function pickerResults() {
    const q = norm(picker.q || ''), t = T();
    if (q.length < 2) return '';
    const hits = [];
    for (let i = 0; i < F.length && hits.length < 60; i++) { const nt = norm(F[i][0]); if (nt.includes(q)) hits.push([nt.startsWith(q) ? 0 : 1, i]); }
    hits.sort((a, b) => a[0] - b[0] || F[a[1]][1] - F[b[1]][1]);
    let h = hits.slice(0, 8).map(([, i]) => `<li><button type="button" class="fx-hit" data-pick-film="${i}"><span class="fx-film">${esc(F[i][0])}</span> <span class="fx-y">${F[i][1]}</span><span class="fx-hd"><bdi>${esc(dirName(i))}</bdi></span></button></li>`).join('');
    if (!hits.length) h += `<li class="fx-muted">${t.noMatch}</li>`;
    h += `<li><button type="button" class="fx-hit fx-asis" data-pick-text>${esc(t.addAsIs((picker.q || '').trim()))}</button></li>`;
    return h;
  }
  function renderWeek() {
    const cur = fxCur(WK, seen()), t = T();
    if (shown === null || shown > cur) shown = cur;
    const w = shown;
    let h = '';
    if (w > NW) return `<section class="fx-rest"><h1 class="fx-h1">${t.end}</h1><p>${t.endP}</p></section>`;
    const m = WM[w - 1], list = itemsOf(w);
    const finished = w < cur;
    const th = m.th ? (L() === 'fa' ? m.th : FX_TH_EN[m.th] || m.th) : '';
    const rt = list.reduce((a, it) => { const i = it.free ? (seen()[it.k] && !String(seen()[it.k]).startsWith('k:') ? null : sugFor(w, it.n)) : it.i; return a + (i != null && !seen()['sk:' + it.k] ? F[i][3] || 0 : 0); }, 0);
    const eye = list.length ? `<div class="fx-eye">${esc(t.eyebrow(fa(list.filter(itemSeen).length), fa(list.filter(it => !seen()['sk:' + it.k]).length), rt ? t.hm(rt).replace(/\d+/g, d => fa(d)) : ''))}</div>` : '';
    h += `<header class="fx-head">${eye}<div class="fx-hrow"><h1 class="fx-h1">${finished ? t.weekDone : t.thisWeek}</h1>${th && !m.free ? `<span class="fx-th">${esc(t.surprise(th))}</span>` : ''}</div>${m.free && !list.length ? '' : dots(list)}</header>`;
    if (finished) h += `<div class="fx-next"><span>${t.whenReady}</span><button type="button" class="fx-btn primary" data-advance>${t.showNext}</button></div>`;
    if (m.free) {
      const i = sugFor(w, 0), k = 'free:' + w + ':0';
      h += `<section class="fx-rest"><p>${t.restP}</p>${i != null ? `<p class="fx-muted">${t.restSug}</p><ul class="fx-list">${card(w, {k, i, free: true}, 0)}</ul>` : ''}${list.length ? `<ul class="fx-list">${list.map(it => card(w, it, 0)).join('')}</ul>` : ''}<button type="button" class="fx-btn primary" data-rest>${t.restGo}</button></section>`;
    } else {
      h += `<ul class="fx-list">${list.map((it, k) => card(w, it, it.free ? it.n : k)).join('')}</ul>`;
    }
    if (!finished) {
      if (picker) h += pickerBox();
      else h += `<div class="fx-act">${!m.free && list.some(it => !itemDone(it)) ? `<button type="button" class="fx-btn" data-tonight>${t.tonight}</button>` : ''}<button type="button" class="fx-btn" data-add>${t.add}</button></div>`;
    }
    const nx = nextList(w);
    if (nx.length) {
      const txt = nx.map(i => F[i][0] + ' (' + F[i][1] + ')').join('\n');
      h += `<details class="fx-more"><summary>${t.dl}</summary><pre class="fx-pre" dir="ltr">${esc(txt)}</pre><button type="button" class="fx-btn" data-copy>${t.copy}</button></details>`;
    }
    const hi = history();
    if (hi.n) h += `<div class="fx-more fx-dlink"><button type="button" class="fx-link" data-diary>${esc(t.watchedN(fa(hi.n)))} →</button></div>`;
    return h;
  }
  function postText(e) {
    const t = T(), r = e.r, i = e.i;
    const stars = r ? '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '') : '';
    const head = (i != null ? F[i][0] + ' (' + F[i][1] + ') — ' + dirName(i) : e.t);
    const sid = seen()['cfg:share'], url = sid && ST && ST.shareUrl ? ST.shareUrl(sid) + '/' + fxEntryId(e.k) : '';
    return [head, [stars, e.l ? '♥' : ''].filter(Boolean).join(' '), e.rv || '', url].filter(Boolean).join('\n\n');
  }
  function renderDiary() {
    const t = T(), list = fxDiary(D, seen());
    const mins = list.reduce((a, e) => a + (e.i != null ? F[e.i][3] || 0 : 0), 0), rated = list.filter(e => e.r);
    const avg = rated.length ? (rated.reduce((a, e) => a + e.r, 0) / rated.length / 2).toFixed(1) : '';
    let h = `<header class="fx-head"><div class="fx-eye">${esc(t.diaryEye(fa(list.length), t.hm(mins).replace(/\d+/g, d => fa(d)), avg ? (L() === 'fa' ? fa1(+avg) : avg) : ''))}</div><div class="fx-hrow"><h1 class="fx-h1">${t.diaryH}</h1></div></header>`;
    if (!list.length) return h + `<p class="fx-muted">${t.diaryEmpty}</p><div class="fx-row"><button type="button" class="fx-btn primary" data-back>${t.back}</button></div>`;
    const mf = new Intl.DateTimeFormat(L() === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {month: 'long', year: 'numeric'});
    const dayN = new Intl.DateTimeFormat(L() === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {day: 'numeric'});
    let month = '';
    h += '<div class="fx-diary">';
    list.forEach(e => {
      const d = new Date(e.date + 'T12:00:00'), mk = mf.format(d);
      if (mk !== month) { if (month) h += '</ul>'; month = mk; h += `<h2 class="fx-mon">${esc(mk)}</h2><ul class="fx-dl">`; }
      const title = e.i != null ? `<a class="fx-film" href="${link(e.i)}" target="_blank" rel="noopener noreferrer">${esc(F[e.i][0])}</a> <span class="fx-y">${F[e.i][1]}</span>` : `<span class="fx-film" dir="auto">${esc(e.t)}</span>`;
      const ed = editK === e.k;
      h += `<li class="fx-de${ed ? ' open' : ''}" data-dk="${esc(e.k)}"><span class="fx-dday">${dayN.format(d)}</span>${posterOn() ? poster(e.i, e.i == null ? e.t : '') : ''}
        <div class="fx-db"><div>${title}</div><div class="fx-dm">${starsText(e.k)}${e.rv ? '<span class="fx-rvi" aria-label="review">✎</span>' : ''}${e.i != null ? `<bdi class="fx-hd">${esc(dirName(e.i))}</bdi>` : ''}</div>
        ${ed ? `<div class="fx-ded"><label class="fx-dlab">${t.watchedOn} <input type="date" class="fx-date" value="${e.date}" max="${today()}"></label>${rateRow(e.k)}<textarea class="fx-rv" data-rv="${esc(e.k)}" dir="auto" rows="5" placeholder="${esc(t.reviewPh)}">${esc(e.rv)}</textarea>
          <div class="fx-row"><button type="button" class="fx-btn primary" data-dedone>${t.done}</button><button type="button" class="fx-btn" data-post>${t.copyPost}</button>${e.i != null ? `<a class="fx-link" href="${link(e.i)}" target="_blank" rel="noopener noreferrer">${t.logOnLb}</a>` : ''}<button type="button" class="fx-link" data-unlog>${t.unlog}</button></div>${note.post && note.post[2] === e.k ? `<p class="fx-note ok">${esc(note.post[1])}</p>` : ''}</div>`
        : (e.rv ? `<p class="fx-rvx" dir="auto">${esc(e.rv.length > 280 ? e.rv.slice(0, 280) + '…' : e.rv)}</p>` : '')}</div>
        ${ed ? '' : `<button type="button" class="fx-link fx-skipb" data-dedit>${t.edit}</button>`}</li>`;
    });
    h += '</ul></div>';
    h += `<div class="fx-row"><button type="button" class="fx-btn primary" data-back>${t.back}</button></div>`;
    return h;
  }
  function renderSettings() {
    const st = ST.status(), tm = seen()['cfg:tmdb'], t = T(), lang = L();
    const msg = k => note[k] ? `<p class="fx-note ${note[k][0]}">${esc(note[k][1])}</p>` : '';
    let h = `<header class="fx-head"><div class="fx-hrow"><h1 class="fx-h1">${t.settings}</h1></div></header>`;
    h += `<section class="fx-card"><h2>${t.langH}</h2><div class="fx-row"><button type="button" class="fx-btn${lang === 'en' ? ' primary' : ''}" data-lang="en">English</button><button type="button" class="fx-btn${lang === 'fa' ? ' primary' : ''}" data-lang="fa">فارسی</button></div><p class="fx-muted">${t.langNote}</p></section>`;
    h += `<section class="fx-card"><h2>${t.syncH}</h2>`;
    if (st.connected) {
      h += `<p>${esc(t.syncOn(st.login))} ${st.state === 'err' ? `<span class="fx-bad">${esc(st.msg || '')}</span>` : st.state === 'busy' ? t.syncBusy : st.at ? esc(t.syncAt(ago(st.at))) : ''}</p>
        <div class="fx-row"><button type="button" class="fx-btn" data-sync-now>${t.syncNow}</button><button type="button" class="fx-link" data-disconnect>${t.disconnect}</button></div>`;
    } else {
      h += `<p>${t.syncIntro}</p><ol class="fx-steps">${t.syncSteps.map(s => `<li>${s}</li>`).join('')}</ol>
        <form class="fx-form" data-gh><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" placeholder="ghp_…" aria-label="GitHub token" required><button type="submit" class="fx-btn primary">${t.connect}</button></form>`;
    }
    h += msg('gh') + `<p class="fx-muted">${t.tokenNote}</p></section>`;
    if (ST.shareOn) {
      const sid = seen()['cfg:share'];
      h += `<section class="fx-card"><h2>${t.shareH}</h2>`;
      if (!st.connected) h += `<p class="fx-muted">${t.shareNeedSync}</p>`;
      else {
        h += `<p>${sid ? t.shareOnP : t.shareOffP}</p>
          <label class="fx-field"><span>${t.nameL}</span><input type="text" data-cfg="cfg:name" maxlength="60" dir="auto" placeholder="${esc(t.namePh)}" value="${esc(seen()['cfg:name'] || '')}"></label>
          <label class="fx-field"><span>${t.chL}</span><input type="url" data-cfg="cfg:channel" dir="ltr" placeholder="${esc(t.chPh)}" value="${esc(seen()['cfg:channel'] || '')}"></label>
          <label class="fx-check"><input type="checkbox" data-pubdiary${seen()['cfg:pubdiary'] !== '0' ? ' checked' : ''}> ${t.pubDiary}</label>`;
        if (sid) h += `<pre class="fx-pre fx-link-pre" dir="ltr">${esc(ST.shareUrl(sid))}</pre><div class="fx-row"><button type="button" class="fx-btn primary" data-share-copy>${t.shareCopy}</button><button type="button" class="fx-link" data-share-off>${t.shareStop}</button></div>`;
        else h += `<div class="fx-row"><button type="button" class="fx-btn primary" data-share-on>${t.shareMake}</button></div>`;
      }
      h += msg('share') + `</section>`;
    }
    if (P) {
      h += `<section class="fx-card"><h2>${t.postersH}</h2>`;
      if (tm) h += `<p>${t.postersOn}${P.failed() ? ` <span class="fx-bad">${t.postersBad}</span>` : ''}</p><div class="fx-row"><button type="button" class="fx-link" data-tmdb-clear>${t.removeKey}</button></div>`;
      else h += `<p>${t.postersIntro}</p><ol class="fx-steps">${t.postersSteps.map(s => `<li>${s}</li>`).join('')}</ol>
        <form class="fx-form" data-tmdb><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" placeholder="eyJ…" aria-label="TMDB token" required><button type="submit" class="fx-btn primary">${t.save}</button></form>`;
      h += msg('tmdb') + `<p class="fx-muted" dir="ltr">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section>`;
    }
    h += `<section class="fx-card"><h2>${t.bkH}</h2><p class="fx-muted">${t.bkP}</p>
      <div class="fx-row"><button type="button" class="fx-btn" data-bk-copy>${t.bkCopy}</button></div>
      <form class="fx-form" data-bk><input type="text" autocomplete="off" dir="ltr" placeholder="${esc(t.bkPh)}" aria-label="${esc(t.bkPh)}" required><button type="submit" class="fx-btn">${t.bkLoad}</button></form>${msg('bk')}</section>`;
    h += `<div class="fx-row"><button type="button" class="fx-btn primary" data-back>${t.back}</button></div>`;
    return h;
  }
  function applyLang() {
    const lang = L();
    try { document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'; } catch (e) {}
  }
  function render() {
    applyLang();
    const html = view === 'settings' && ST ? renderSettings() : view === 'diary' ? renderDiary() : renderWeek();
    root.innerHTML = `<div class="fx${posterOn() ? ' fx-hasp' : ''}" dir="${L() === 'fa' ? 'rtl' : 'ltr'}" lang="${L()}">${html}${view === 'week' ? foot() : ''}</div>`;
    if (posterOn()) P.fill(root);
    if (picker) { const q = root.querySelector('.fx-pick-q'); if (q && picker.focus) { q.focus(); const n = q.value.length; q.setSelectionRange(n, n); picker.focus = false; } }
  }
  function setFilm(k, on) {
    S.set(k, on ? today() : null);
    if (on) S.set('sk:' + k, null);
    else {
      S.set('r:' + k, null); S.set('l:' + k, null);
      Object.entries(seen()).forEach(([fk, v]) => { if (fk.startsWith('free:') && v === 'k:' + k) S.set(fk, null); });
    }
  }
  function removeAdd(a) {
    const s = seen(), rp = s['rp:' + a];
    if (rp) S.set('sk:' + rp, null);
    ['rp:', 'v:', 'r:', 'l:'].forEach(p => S.set(p + a, null));
    S.set(a, null);
  }
  function pick(val) {
    const a = 'add:' + shown + ':' + Date.now().toString(36);
    S.set(a, val);
    if (picker.replace) { S.set('rp:' + a, picker.replace); S.set('sk:' + picker.replace, today()); }
    picker = null;
  }
  const say = (k, cls, txt) => { note[k] = [cls, txt]; render(); };
  root.addEventListener('input', e => {
    const rv = e.target.closest('textarea[data-rv]');
    if (rv) { const k = rv.dataset.rv, val = rv.value; clearTimeout(rvTimer); rvTimer = setTimeout(() => S.set('rv:' + k, val.trim() ? val : null), 600); return; }
    if (!e.target.classList.contains('fx-pick-q') || !picker) return;
    picker.q = e.target.value;
    const ul = root.querySelector('.fx-res'); if (ul) ul.innerHTML = pickerResults();
  });
  root.addEventListener('change', e => {
    const c = e.target.closest('input[data-cfg]');
    if (c) { const v = c.value.trim(); if (c.dataset.cfg === 'cfg:channel' && v && !/^https:\/\/\S+$/.test(v)) { c.value = ''; return; } S.set(c.dataset.cfg, v || null); return; }
    if (e.target.closest('input[data-pubdiary]')) { S.set('cfg:pubdiary', e.target.checked ? null : '0'); return; }
    const d = e.target.closest('input.fx-date');
    if (d && /^\d{4}-\d\d-\d\d$/.test(d.value)) { const k = d.closest('[data-dk]').dataset.dk; if (k.startsWith('add:') || k.startsWith('free:')) S.set('v:' + k, d.value); else S.set(k, d.value); render(); }
  });
  root.addEventListener('focusout', e => {
    const rv = e.target.closest && e.target.closest('textarea[data-rv]');
    if (rv) { clearTimeout(rvTimer); S.set('rv:' + rv.dataset.rv, rv.value.trim() ? rv.value : null); }
  });
  root.addEventListener('keydown', e => {
    if (e.target.classList.contains('fx-pick-q') && e.key === 'Enter') { e.preventDefault(); const b = root.querySelector('.fx-res [data-pick-film]') || root.querySelector('.fx-res [data-pick-text]'); if (b && (picker.q || '').trim().length >= 2) b.click(); }
    if (e.key === 'Escape' && picker) { picker = null; render(); }
  });
  root.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    const li = t.closest('.fx-i'), k = li && li.dataset.k, tt = T();
    if (t.hasAttribute('data-rvopen')) { reviewOpen[t.dataset.rvopen] = true; render(); const ta = root.querySelector('textarea[data-rv="' + CSS.escape(t.dataset.rvopen) + '"]'); if (ta) ta.focus(); return; }
    if (t.hasAttribute('data-diary')) { view = 'diary'; editK = null; note = {}; picker = null; render(); window.scrollTo(0, 0); return; }
    if (t.hasAttribute('data-dedit')) { editK = t.closest('[data-dk]').dataset.dk; note = {}; render(); return; }
    if (t.hasAttribute('data-dedone')) { const ta = root.querySelector('.fx-ded textarea'); if (ta) { clearTimeout(rvTimer); S.set('rv:' + ta.dataset.rv, ta.value.trim() ? ta.value : null); } editK = null; render(); return; }
    if (t.hasAttribute('data-unlog')) {
      const k2 = t.closest('[data-dk]').dataset.dk;
      if (k2.startsWith('add:') || k2.startsWith('free:')) ['v:', 'r:', 'l:', 'rv:'].forEach(p => S.set(p + k2, null)); else { setFilm(k2, false); S.set('rv:' + k2, null); }
      editK = null; render(); return;
    }
    if (t.hasAttribute('data-post')) {
      const ta = root.querySelector('.fx-ded textarea'); if (ta) { clearTimeout(rvTimer); S.set('rv:' + ta.dataset.rv, ta.value.trim() ? ta.value : null); }
      const e2 = fxDiary(D, seen()).find(x => x.k === editK);
      if (e2) { const txt = postText(e2); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { note.post = ['ok', T().postCopied, editK]; render(); }, () => window.prompt(T().copyPrompt, txt)); }
      return;
    }
    if (t.hasAttribute('data-tick')) {
      const s = seen();
      if (k.startsWith('add:')) {
        const v = s[k] || '';
        if (v.startsWith('k:')) setFilm(v.slice(2), !s[v.slice(2)]);
        else { const on = !s['v:' + k]; S.set('v:' + k, on ? today() : null); if (!on) { S.set('r:' + k, null); S.set('l:' + k, null); } }
      } else if (k.startsWith('free:')) {
        const v = s[k];
        if (v) { ['', 'v:', 'r:', 'l:', 'rv:'].forEach(p => S.set(p + k, null)); if (v.startsWith('k:')) setFilm(v.slice(2), false); }
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
    else if (t.hasAttribute('data-unskip')) {
      S.set('sk:' + k, null);
      Object.entries(seen()).forEach(([a, v]) => { if (a.startsWith('rp:') && v === k) S.set(a, null); });
    }
    else if (t.hasAttribute('data-remove')) { removeAdd(k); if (pickK === k) pickK = null; }
    else if (t.hasAttribute('data-add')) { picker = {q: '', focus: true}; }
    else if (t.hasAttribute('data-replace')) { picker = {q: '', focus: true, replace: k}; render(); const box = root.querySelector('.fx-picker'); if (box) box.scrollIntoView({block: 'center', behavior: 'smooth'}); return; }
    else if (t.hasAttribute('data-pick-cancel')) { picker = null; }
    else if (t.hasAttribute('data-pick-film')) { pick('k:' + KEY(+t.dataset.pickFilm)); }
    else if (t.hasAttribute('data-pick-text')) { const q = (picker.q || '').trim(); if (q.length < 2) return; pick('t:' + q.slice(0, 120)); }
    else if (t.hasAttribute('data-open-alt')) { altOpen[t.dataset.openAlt] = true; render(); const inp = root.querySelector('.fx-alt input'); if (inp) inp.focus(); return; }
    else if (t.hasAttribute('data-advance')) { shown = null; picker = null; }
    else if (t.hasAttribute('data-rest')) { S.set('wk:' + shown, today()); shown = null; picker = null; }
    else if (t.hasAttribute('data-tonight')) {
      const list = itemsOf(shown).filter(it => !itemDone(it));
      const ok = list.filter(it => {
        if (it.free || it.add || it.i == null) return true;
        const d = F[it.i][2], ser = !!F[it.i][11];
        return !list.some(o => o !== it && !o.free && !o.add && o.i != null && F[o.i][1] < F[it.i][1] && (F[o.i][2] === d || (ser && F[o.i][11])));
      });
      const pool = ok.length ? ok : list;
      if (pool.length) { let p; do { p = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && p.k === pickK); pickK = p.k; }
      render();
      const el = root.querySelector('.fx-i.pick'); if (el) el.scrollIntoView({block: 'center', behavior: 'smooth'});
      return;
    }
    else if (t.hasAttribute('data-copy')) { copy(root.querySelector('.fx-pre').textContent, t, root.querySelector('.fx-pre')); return; }
    else if (t.hasAttribute('data-undo')) {
      const u = t.dataset.undo;
      if (u.startsWith('sk:')) S.set(u, null);
      else if (u.startsWith('v:')) { S.set(u, null); S.set('r:' + u.slice(2), null); S.set('l:' + u.slice(2), null); }
      else setFilm(u, false);
    }
    else if (t.hasAttribute('data-full')) { opts.openFull && opts.openFull(shown); return; }
    else if (t.hasAttribute('data-settings')) { view = 'settings'; note = {}; picker = null; render(); window.scrollTo(0, 0); return; }
    else if (t.hasAttribute('data-back')) { view = 'week'; note = {}; render(); window.scrollTo(0, 0); return; }
    else if (t.hasAttribute('data-lang')) { S.set('cfg:lang', t.dataset.lang === 'fa' ? 'fa' : 'en'); }
    else if (t.hasAttribute('data-sync-now')) { ST.syncNow(); }
    else if (t.hasAttribute('data-disconnect')) { ST.disconnect(); note.gh = ['ok', tt.disconnected]; }
    else if (t.hasAttribute('data-share-on')) {
      say('share', 'busy', tt.shareMaking);
      ST.shareOn().then(r => { note.share = r ? ['bad', r] : ['ok', T().shareMade]; render(); });
      return;
    }
    else if (t.hasAttribute('data-share-off')) {
      say('share', 'busy', tt.shareStopping);
      ST.shareOff().then(r => { note.share = r ? ['bad', r] : ['ok', T().shareStopped]; render(); });
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
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { btn.textContent = T().copied; }, () => {
      if (node) { const r = document.createRange(); r.selectNodeContents(node); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); btn.textContent = T().selected; }
      else { window.prompt(T().copyPrompt, txt); }
    });
  }
  root.addEventListener('submit', async e => {
    const f = e.target.closest('form'); if (!f) return;
    e.preventDefault();
    const inp = f.querySelector('input'), v = inp.value.trim(), t = T(); if (!v) return;
    if (f.dataset.alt) { const k = f.dataset.alt; S.set(k, v); S.set('v:' + k, today()); S.set('sk:' + k, null); delete altOpen[k]; render(); return; }
    if (f.hasAttribute('data-gh')) {
      inp.disabled = true; say('gh', 'busy', t.testing);
      const r = await ST.connect(v);
      note.gh = r ? ['bad', r] : ['ok', T().connected]; render(); return;
    }
    if (f.hasAttribute('data-tmdb')) {
      if (!/^eyJ/.test(v)) { say('tmdb', 'bad', t.shortKey); return; }
      inp.disabled = true; say('tmdb', 'busy', t.checkingKey);
      const ok = await P.test(v);
      if (ok === false) { say('tmdb', 'bad', t.keyBad); return; }
      S.set('cfg:tmdb', v); P.setToken(v);
      say('tmdb', 'ok', ok ? t.keySaved : t.keySavedOffline); return;
    }
    if (f.hasAttribute('data-bk')) {
      try {
        const o = JSON.parse(v); let c = 0;
        Object.entries(o).forEach(([k, val]) => { if (val && !k.startsWith('cfg:') && !seen()[k]) { S.set(k, val); c++; } });
        say('bk', 'ok', t.bkDone(fa(c)));
      } catch (err) { say('bk', 'bad', t.bkBad); }
    }
  });
  if (P) P.setToken(seen()['cfg:tmdb']);
  render();
  return {
    render: () => { if (P) P.setToken(seen()['cfg:tmdb']); if (!root.querySelector('input:focus, textarea:focus')) render(); },
    current: () => fxCur(WK, seen()),
    lang: L,
  };
}
