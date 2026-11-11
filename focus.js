// "This week" view: only the current batch of films, no dates, no totals, no road ahead.
// A week opens once every film in the previous one is watched, skipped or removed, so there is no falling behind.
// Films can be added to the week or swapped in for a planned one. English by default, Persian as an option.
// Shared by the web app, the extension popup and (fxCompact/fxCur/fxT only) the Letterboxd badge.

const FX_TH_EN = {'عشق': 'Love', 'وحشت': 'Horror', 'خنده': 'Comedy', 'جنایت': 'Crime', 'سیاست و تاریخ': 'Politics & history', 'جنگ': 'War',
  'کودکی و نوجوانی': 'Growing up', 'زمین و طبیعت': 'Earth & nature', 'حافظه و زمان': 'Memory & time', 'رؤیا و افسانه': 'Dreams & fables',
  'میل و وسوسه': 'Desire', 'سینما درباره‌ی سینما': 'Cinema on cinema', 'اکشن و ماجرا': 'Action & adventure', 'وسترن': 'Westerns'};
const FX_STR = {
  en: {
    thisWeek: 'This Week', weekDone: 'Week complete', surprise: t => t + ' week',
    eyebrow: (n, of, rt) => of + (of === '1' ? ' film' : ' films') + (rt ? ' · ' + rt : '') + (n !== '0' ? ' · ' + n + ' watched' : ''),
    hm: m => m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm',
    whenReady: 'Every film watched.', showNext: 'Next week →',
    restP: 'A free week. Nothing scheduled — watch anything, or nothing at all.', restSug: 'If you’d like a suggestion', restGo: 'Continue to next week →',
    tonight: 'Pick for me', tonightHint: '', tonightTag: 'Tonight',
    dl: 'Next week’s downloads', copy: 'Copy', copied: 'Copied', selected: 'Selected — copy it',
    watchedN: n => 'Diary · ' + n + (n === '1' ? ' film' : ' films'), skipped: 'Skipped', notWatched: 'Remove', restore: 'Undo',
    skip: 'Skip', skipTitle: 'Skip this film', watched: 'Watched', other: 'Watched something else?', otherPh: 'Film title', save: 'Save',
    anything: 'Anything you like', yourPick: 'Your pick', free: 'Your pick', lanes: {H: 'Classic', A: 'Auteur', C: 'Contemporary', P: 'Popular'},
    st: {ok: 'Downloaded', dl: 'Downloading', need: 'Not downloaded'}, min: n => n + ' min', firstBy: d => 'Your first ' + d, marathon: (k, n) => 'Part ' + k + ' of ' + n,
    friends: 'Friends', friendsTitle: n => 'Average rating from ' + n + ' friends', howWas: 'Rate', liked: 'Like', stars: n => n + ' stars', reviewed: 'Review',
    review: 'Add a review', editReview: 'Edit review', reviewPh: 'Add a review…',
    settings: 'Settings', full: 'Five-year plan', diaryLink: 'Diary', back: '← This week', end: 'The End', endP: 'Five years, every film. What comes next is up to you.',
    add: '+ Add film', addH: 'Add a film', replace: 'Replace', replaceH: t => 'Replace ' + t, insteadOf: t => 'Instead of ' + t, added: 'Added',
    remove: 'Remove', cancel: 'Cancel', addPh: 'Search films…', addAsIs: t => 'Add “' + t + '”', noMatch: 'Not in your plan — you can still add it.',
    diaryH: 'Diary', diaryEye: (n, h, avg) => n + (n === '1' ? ' film' : ' films') + ' · ' + h + (avg ? ' · ★ ' + avg + ' average' : ''),
    logFilm: '+ Log a film', logH: 'Log a film', allYears: 'All', watchedLbl: 'Watched',
    inPlan: 'In your plan', fromTmdb: 'From TMDB', searching: 'Searching TMDB…',
    favH: 'Favorite films', favP: 'Four films that define your taste — shown at the top of your profile.', favAdd: 'Add', favPick: n => 'Favorite #' + n, favRemove: 'Remove',
    rewatch: 'Rewatch', spoilers: 'Contains spoilers', withL: 'Watched with', withPh: 'e.g. Sara, Ali', tagsL: 'Tags', tagsPh: 'comma-separated, e.g. cinema, 35mm',
    logAgain: 'Log again', withShort: n => 'with ' + n, calH: 'Watch calendar',
    diaryEmpty: 'Your diary is empty. Films you mark as watched show up here — or log one yourself.', edit: 'Edit', watchedOn: 'Watched on', done: 'Done', unlog: 'Delete entry',
    logOnLb: 'Letterboxd ↗', logToLb: 'Log on Letterboxd ↗', copyPost: 'Copy as post', postCopied: 'Copied — ready to paste.',
    syncH: 'Sync', syncOn: login => 'Connected' + (login ? ' as ' + login : '') + '.', syncBusy: 'Syncing…', syncAt: a => 'Last synced ' + a + '.',
    syncNow: 'Sync now', disconnect: 'Disconnect this device',
    syncIntro: 'Your diary — watched films, ratings, likes and reviews — is kept in a private Gist on your GitHub account, so every device stays in step. Add the same token once on each device.',
    syncSteps: ['Open <a href="https://github.com/settings/tokens/new?scopes=gist&description=five-years-cinema" target="_blank" rel="noopener noreferrer">GitHub’s token page</a>. The name and gist-only access are already filled in.', 'Set Expiration to <b>No expiration</b>, then Generate token.', 'Paste it here — and keep a copy in your password manager.'],
    connect: 'Connect', tokenNote: 'The token stays on this device and is only sent to api.github.com. With gist access alone, it can’t touch your repositories or account.',
    testing: 'Checking token…', connected: 'Connected. Everything syncs automatically from now on.', disconnected: 'Disconnected. This device keeps its diary.',
    postersH: 'Posters', postersOn: 'Posters from TMDB.', postersBad: 'TMDB didn’t accept this token.', removeKey: 'Remove token',
    postersIntro: 'Posters come from TMDB, using your free API Read Access Token. Add it on one device; it syncs to the others.',
    postersSteps: ['Create an account at <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer">themoviedb.org</a>.', 'Request a Developer key on the <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">API page</a> (personal use).', 'Copy the “API Read Access Token” (the long one, starting with eyJ) and paste it here.'],
    shortKey: 'That’s the short API Key. Paste the “API Read Access Token” — it starts with eyJ.', checkingKey: 'Checking token…', keyBad: 'TMDB didn’t accept this token.',
    keySaved: 'Saved. Posters will start appearing.', keySavedOffline: 'Saved. Posters will appear once you’re online.',
    shareH: 'Public profile', shareNeedSync: 'Connect sync first — your profile is published from the same GitHub account.',
    shareOnP: 'Anyone with the link can read it — nobody can change it. It shows this week’s films and, if you choose, your diary with ratings, likes and reviews. Download status, categories, the full plan and your settings stay private.',
    shareOffP: 'A read-only page for friends and followers: this week’s films and your film diary. Download status, categories, the full plan and your settings stay private.',
    shareMake: 'Publish', shareCopy: 'Copy link', shareStop: 'Unpublish', shareMaking: 'Publishing…', shareMade: 'Published. Copy the link and share it.', shareStopping: 'Unpublishing…', shareStopped: 'Unpublished. The old link no longer works.',
    nameL: 'Name', namePh: 'Your name', pubDiary: 'Show my diary, ratings and reviews', linksL: 'Links',
    links: {lb: ['Letterboxd username', 'username'], tg: ['Telegram channel', 'https://t.me/…'], sp: ['Spotify', 'https://open.spotify.com/…'], ig: ['Instagram', 'https://instagram.com/…'], web: ['Website', 'https://…']},
    langH: 'Language', langNote: 'Also used on your public profile.',
    bkH: 'Backup', bkP: 'Copy your diary as JSON, or import one — handy when moving from an older version.', bkCopy: 'Copy JSON', bkPh: 'Paste JSON', bkLoad: 'Import', bkDone: n => n + ' imported.', bkBad: 'That isn’t a valid backup. Paste the whole text you copied.',
    copyPrompt: 'Copy this text:', ago: m => m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago',
  },
  fa: {
    thisWeek: 'این هفته', weekDone: 'این هفته تموم شد', surprise: t => 'هفته‌ی سرزده: ' + t,
    eyebrow: (n, of, rt) => of + ' فیلم' + (rt ? ' · ' + rt : '') + (n !== '۰' ? ' · ' + n + ' دیده شد' : ''),
    hm: m => m >= 60 ? Math.floor(m / 60) + ' ساعت و ' + (m % 60) + ' دقیقه' : m + ' دقیقه',
    whenReady: 'هر وقت آماده بودی:', showNext: 'هفته‌ی بعد رو نشونم بده',
    restP: 'این هفته برنامه نداره. هر چی دلت خواست ببین، یا هیچی.', restSug: 'اگه دنبال یه فیلم بودی:', restGo: 'بریم سراغ هفته‌ی بعد',
    tonight: 'امشب کدوم؟', tonightHint: 'اگه نمی‌خوای خودت انتخاب کنی', tonightTag: 'امشب این',
    dl: 'برای دانلود: فیلم‌های هفته‌ی بعد', copy: 'کپی', copied: 'کپی شد', selected: 'انتخاب شد؛ کپی کن',
    watchedN: n => 'دفتر · ' + n + ' فیلم', skipped: 'رد شد', notWatched: 'نه، ندیدم', restore: 'برگردون',
    skip: 'رد', skipTitle: 'این یکی رو بی‌خیال شو', watched: 'دیدمش', other: 'یه چیز دیگه دیدم', otherPh: 'اسم فیلمی که دیدی', save: 'ثبت',
    anything: 'هر چی دلت خواست', yourPick: 'خودت انتخاب کردی', free: 'آزاد', lanes: {H: 'تاریخ', A: 'مؤلف', C: 'امروز', P: 'پاپ'},
    st: {ok: 'روی هارد', dl: 'در حال دانلود', need: 'دانلود کن'}, min: n => n + ' دقیقه', firstBy: d => 'اولین فیلمت از ' + d, marathon: (k, n) => 'ماراتن ' + k + ' از ' + n,
    reviewed: 'ریویو', friends: 'دوستات', friendsTitle: n => 'میانگین امتیاز ' + n + ' نفر از دوستات', howWas: 'چطور بود؟', liked: 'دوستش داشتم', stars: n => n + ' ستاره',
    review: '✎ ریویو', editReview: '✎ ویرایش ریویو', reviewPh: 'ریویوت رو بنویس… دفتر خودته، اسپویل هم آزاده.',
    settings: 'تنظیمات', full: 'نقشه‌ی پنج سال', diaryLink: 'دفتر', back: 'برگرد به این هفته', end: 'تموم شد', endP: 'همه‌ی هفته‌ها رو رفتی. حالا دیگه هر چی دلت خواست.',
    add: '+ یه فیلم اضافه کن', addH: 'یه فیلم به این هفته اضافه کن', replace: 'عوض کن', replaceH: t => 'به‌جای ' + t + '…', insteadOf: t => 'به‌جای ' + t, added: 'اضافه',
    remove: 'بردار', cancel: 'بی‌خیال', addPh: 'تو برنامه بگرد یا هر اسمی رو بنویس', addAsIs: t => '«' + t + '» رو همین‌طوری اضافه کن', noMatch: 'تو برنامه چیزی با این اسم نیست؛ همین‌طوری اضافه‌ش کن.',
    diaryH: 'دفتر', diaryEye: (n, h, avg) => n + ' فیلم · ' + h + (avg ? ' · میانگین ★' + avg : ''),
    logFilm: '+ ثبت یه فیلم', logH: 'ثبت یه فیلم', allYears: 'همه', watchedLbl: 'دیدم',
    inPlan: 'تو برنامه', fromTmdb: 'از TMDB', searching: 'دارم تو TMDB می‌گردم…',
    favH: 'فیلم‌های محبوب', favP: 'چهار فیلمی که سلیقه‌ت رو می‌سازن؛ بالای پروفایلت نشون داده می‌شن.', favAdd: 'افزودن', favPick: n => 'محبوب شماره‌ی ' + n, favRemove: 'برداشتن',
    rewatch: 'دوباره‌دیدن', spoilers: 'اسپویل داره', withL: 'با کی دیدم', withPh: 'مثلاً سارا، علی', tagsL: 'تگ‌ها', tagsPh: 'با کاما جدا کن، مثلاً سینما، ۳۵ میلی‌متری',
    logAgain: 'دوباره دیدمش', withShort: n => 'با ' + n, calH: 'تقویم تماشا',
    diaryEmpty: 'هنوز چیزی ثبت نشده. هر فیلمی که تیک بزنی خودش اینجا میاد، یا خودت یکی ثبت کن.', edit: 'ویرایش', watchedOn: 'تاریخ دیدن', done: 'تموم', unlog: 'حذف از دفتر',
    logOnLb: 'لترباکس ↗', logToLb: 'ثبت در لترباکس ↗', copyPost: 'کپی پست', postCopied: 'کپی شد؛ تو کانالت بچسبون.',
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
    shareH: 'پروفایل عمومی', shareNeedSync: 'اول همگام‌سازی رو وصل کن؛ صفحه از همون حساب گیت‌هاب منتشر می‌شه.',
    shareOnP: 'بقیه فقط می‌تونن بخونن: برنامه‌ی همین هفته (اسم، سال، کارگردان، مدت، پوستر، تاریخ دیدن) و اگه روشن باشه، دفترت با ستاره‌ها، قلب‌ها و ریویوها. هارد، رگه‌ها، برنامه‌ی کامل و تنظیمات هیچ‌وقت از دستگاه‌هات بیرون نمی‌رن.',
    shareOffP: 'یه صفحه‌ی فقط‌خوندنی منتشر کن: دفتر فیلم‌هات به‌اضافه‌ی برنامه‌ی همین هفته. بقیه می‌تونن بخونن، ولی هیچ‌وقت نمی‌تونن تغییر بدن.',
    shareMake: 'انتشار صفحه', shareCopy: 'کپی لینک', shareStop: 'لغو انتشار', shareMaking: 'دارم منتشر می‌کنم…', shareMade: 'منتشر شد؛ لینک رو کپی کن و بفرست.', shareStopping: 'دارم لغوش می‌کنم…', shareStopped: 'لغو شد؛ لینک قبلی دیگه کار نمی‌کنه.',
    nameL: 'اسم', namePh: 'اسمت', pubDiary: 'دفتر، ستاره‌ها و ریویوهام هم نشون داده بشه', linksL: 'لینک‌ها',
    links: {lb: ['نام کاربری لترباکس', 'username'], tg: ['کانال تلگرام', 'https://t.me/…'], sp: ['اسپاتیفای', 'https://open.spotify.com/…'], ig: ['اینستاگرام', 'https://instagram.com/…'], web: ['وب‌سایت', 'https://…']},
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
      if ((base.startsWith('add:') || base.startsWith('log:')) && bv.startsWith('t:')) out.push({k: base, i: null, t: bv.slice(2), y: fxYear(bv), date: v});
      else if (base.startsWith('log:') && bv.startsWith('k:') && KI[bv.slice(2)] !== undefined) { const i = KI[bv.slice(2)]; out.push({k: base, i, t: F[i][0], y: F[i][1], date: v, again: true}); }
      else if (base.startsWith('free:') && !bv.startsWith('k:')) out.push({k: base, i: null, t: bv, y: fxYear(bv), date: v});
    }
  }
  out.forEach(e => {
    e.r = +(seen['r:' + e.k] || 0); e.l = !!seen['l:' + e.k]; e.rv = seen['rv:' + e.k] || '';
    e.rw = !!seen['rw:' + e.k]; e.sp = !!seen['sp:' + e.k]; e.ww = seen['ww:' + e.k] || ''; e.tg = seen['tg:' + e.k] || ''; e.md = fxMd(seen, e.k);
  });
  out.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : a.k < b.k ? 1 : -1);
  return out;
}
function fxMd(seen, k) { try { const o = JSON.parse(seen['md:' + k] || 'null'); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
function fxFav(seen) { try { const a = JSON.parse(seen['cfg:fav'] || '[]'); return Array.isArray(a) ? a.slice(0, 4) : []; } catch (e) { return []; } }
const fxTmdbImg = p => p && /^\/[A-Za-z0-9._-]+$/.test(p) ? 'https://image.tmdb.org/t/p/w185' + p : '';
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
  const okU = u => /^https:\/\/[^\s"<>]+$/.test(u || '') ? u : '';
  const links = {lb: /^[A-Za-z0-9_]{1,40}$/.test(seen['cfg:lb'] || '') ? seen['cfg:lb'] : '', tg: ch, sp: okU(seen['cfg:sp']), ig: okU(seen['cfg:ig']), web: okU(seen['cfg:web'])};
  const out = {v: 2, lang, name: String(seen['cfg:name'] || '').slice(0, 60), ch, links, now: {films: []}, diary: []};
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
        else { const md = fxMd(seen, it.k) || {}; films.push({t: md.t || String(it.title).replace(/\s*\(\d{4}\)\s*$/, ''), y: md.y || fxYear(it.title), d: md.d || '', m: md.m || 0, p: fxTmdbImg(md.p) || pos('tx:' + it.title), l: '', tm: md.tm || 0, w: day(seen['v:' + it.k])}); }
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
    const md = e.md || {};
    const base = e.i != null ? film(e.i, e.date) : {t: md.t || String(e.t).replace(/\s*\(\d{4}\)\s*$/, ''), y: md.y || e.y, d: md.d || '', m: md.m || 0, p: fxTmdbImg(md.p) || pos('tx:' + e.t), l: '', tm: md.tm || 0, w: e.date};
    return Object.assign(base, {id: fxEntryId(e.k), r: e.r || 0, h: e.l ? 1 : 0, rv: String(e.rv || '').slice(0, 20000), sp: e.sp ? 1 : 0, rw: e.rw ? 1 : 0,
      ww: String(e.ww || '').slice(0, 80), tg: String(e.tg || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 8)});
  });
  out.fav = fxFav(seen).map(f => {
    if (f && f.k && KEYIDX[f.k] !== undefined) { const i = KEYIDX[f.k]; return {t: F[i][0], y: F[i][1], d: dir(i), p: pos(F[i][8]), l: F[i][5] || ''}; }
    if (f && f.t) return {t: String(f.t).slice(0, 120), y: +f.y || 0, d: String(f.d || '').slice(0, 80), p: fxTmdbImg(f.p), l: '', tm: +f.tm || 0};
    return null;
  }).filter(Boolean);
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
  const today = () => { const n = new Date(); return new Date(n.getTime() - n.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };  // local date, not UTC
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
  let shown = null, pickK = null, altOpen = {}, view = 'week', note = {}, picker = null, editK = null, reviewOpen = {}, rvTimer = null, diaryYear = null, calOpen = false, tmTimer = null;

  const res = k => { const s = seen(); return !!(s[k] || s['sk:' + k]); };
  const posterOn = () => !!(P && P.on());
  const itemsOf = w => fxItems(D, w, seen());
  const sugFor = (w, n) => fxSug(D, w, n, seen(), KEYIDX);
  // is a list item settled (watched, skipped or swapped out)?
  const itemDone = it => it.add ? fxAddDone(seen(), it.k) : res(it.k);
  const itemSeen = it => it.add ? (it.i != null ? !!seen()[KEY(it.i)] : !!seen()['v:' + it.k]) : !!seen()[it.k];

  const hmin = m => L() === 'fa' ? T().min(fa(m)) : T().hm(m);
  // "Your first Ozu": family name, family-name-first for Chinese/Korean names, full name when two directors share it
  const FAMILY_FIRST = new Set(['Jia', 'Wang', 'Bi', 'Hou', 'Tsai', 'Wong', 'Hong', 'Lee', 'Bong', 'Park', 'Kim', 'Zhang', 'Chen', 'Hu', 'Lou', 'Diao', 'Tian', 'Feng', 'King', 'Tsui', 'Lim', 'Hur', 'Im', 'Ozu']);
  const SHORT = (() => {
    const all = new Set(); F.forEach(f => f[2].split(', ').forEach(d => all.add(d)));
    const short = d => { const p = d.split(' '); if (p.length < 2) return d; if (p[0] === 'Apichatpong') return 'Apichatpong'; if (FAMILY_FIRST.has(p[0]) && p.length === 2 && /-|^[A-Z][a-z]+$/.test(p[1]) && !/^(Ozu)$/.test(p[0])) return p[0]; return p[p.length - 1]; };
    const count = {}, m = {};
    all.forEach(d => { const s2 = short(d); count[s2] = (count[s2] || 0) + 1; m[d] = s2; });
    all.forEach(d => { if (count[m[d]] > 1) m[d] = d; });
    return m;
  })();
  const firstDir = i => { const d = F[i][2].split(', ')[0]; return L() === 'fa' ? FA[d] || d : SHORT[d] || d; };
  function marathon(s) {
    const d = String(s).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).match(/(\d+)\D+(\d+)/);
    return d && +d[2] > 1 ? T().marathon(fa(d[1]), fa(d[2])) : '';
  }
  function titleLine(i, text, md) {
    if (i != null) return `<div class="fx-tl"><a class="fx-film" href="${link(i)}" target="_blank" rel="noopener noreferrer">${esc(F[i][0])}</a><span class="fx-y">${F[i][1]}</span></div>`;
    const href = md && md.tm ? 'https://letterboxd.com/tmdb/' + encodeURIComponent(md.tm) + '/' : lbSearch(text);
    const m = String(text).match(/^(.*?)\s*\((\d{4})\)\s*$/);
    return `<div class="fx-tl"><a class="fx-film" dir="auto" href="${href}" target="_blank" rel="noopener noreferrer">${esc(m ? m[1] : text)}</a>${m ? `<span class="fx-y">${m[2]}</span>` : ''}</div>`;
  }
  function subLine(i, md) {
    if (i != null) return `<div class="fx-sub"><span class="fx-tw"><bdi>${esc(dirName(i))}</bdi>${F[i][3] ? `<span>${hmin(F[i][3])}</span>` : ''}</span></div>`;
    if (md && (md.d || md.m)) return `<div class="fx-sub"><span class="fx-tw">${md.d ? `<bdi>${esc(md.d)}</bdi>` : ''}${md.m ? `<span>${hmin(+md.m)}</span>` : ''}</span></div>`;
    return '';
  }
  // one quiet line of context: lane, series or first film by the director, friends' average, and a warning only if there's no copy yet
  function tagLine(i, lane, extra) {
    const t = T(), tags = [];
    if (extra) tags.push(`<span class="fx-tg x">${extra}</span>`);
    else if (lane === 'F') tags.push(`<span class="fx-tg lane F"><i class="fx-ldot"></i>${t.free}</span>`);
    else if (t.lanes[lane]) tags.push(`<span class="fx-tg lane ${lane}"><i class="fx-ldot"></i>${t.lanes[lane]}</span>`);
    if (i != null) {
      const mt = F[i][11] ? marathon(F[i][11]) : '';
      if (mt) tags.push(`<span class="fx-tg">${esc(mt)}</span>`);
      else if (F[i][10] && !extra && lane !== 'F') tags.push(`<span class="fx-tg">${esc(t.firstBy(firstDir(i)))}</span>`);
      if (F[i][15] >= 3) tags.push(`<span class="fx-tg fr" title="${esc(t.friendsTitle(fa(F[i][15])))}">${t.friends}<i aria-hidden="true"></i>${fa1(F[i][14] / 10)}</span>`);
      const st = STK[F[i][4]];
      if (st === 'need' || st === 'dl') tags.push(`<span class="fx-tg warn">${t.st[st]}</span>`);
    }
    return tags.length ? `<div class="fx-tags"><span class="fx-tw">${tags.join('')}</span></div>` : '';
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
  const chk = done => `<button type="button" class="fx-chk" data-tick aria-pressed="${done}" aria-label="${T().watched}" title="${T().watched}">${done ? '✓' : ''}</button>`;
  function actions(done, skipped, kind) {
    const t = T();
    let links = '';
    if (kind === 'add') links = `<button type="button" class="fx-link fx-al" data-remove>${t.remove}</button>`;
    else if (skipped) links = `<button type="button" class="fx-link fx-al" data-unskip>${t.restore}</button>`;
    else if (!done) links = `<button type="button" class="fx-link fx-al" data-skip title="${esc(t.skipTitle)}">${t.skip}</button><button type="button" class="fx-link fx-al" data-replace>${t.replace}</button>`;
    return `<div class="fx-acts">${skipped ? '<span class="fx-chk ghost" aria-hidden="true"></span>' : chk(done)}${links}</div>`;
  }
  const IOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  // On iPhone/iPad this opens the Letterboxd app's own "log" screen pre-filled with date, rating, like and review
  // (letterboxd://x-callback-url/log). Elsewhere it links to the film's Letterboxd page.
  function lbLog(rk) {
    const s = seen(), i = KEYIDX[rk], t = T();
    const custom = /^(add|free|log):/.test(rk), date = custom ? s['v:' + rk] : s[rk];
    const name = i !== undefined ? F[i][0] + ' ' + F[i][1] : String(s[rk] || '').replace(/^[kt]:/, '');
    if (!name) return '';
    if (!IOS) return i !== undefined ? `<a class="fx-link fx-lblog" href="${link(i)}" target="_blank" rel="noopener noreferrer">${t.logOnLb}</a>` : '';
    const r = +(s['r:' + rk] || 0), rv = s['rv:' + rk] || '';
    const q = ['name=' + encodeURIComponent(name)];
    if (/^\d{4}-\d\d-\d\d$/.test(date || '')) q.push('date=' + date);
    if (r) q.push('rating=' + r / 2);
    if (s['l:' + rk]) q.push('like=true');
    if (rv) q.push('review=' + encodeURIComponent(rv.replace(/[<>]/g, '').replace(/\n/g, '<br>')));
    return `<a class="fx-link fx-lblog" href="letterboxd://x-callback-url/log?${q.join('&')}">${t.logToLb}</a>`;
  }
  // the logged date, editable in place: plan films keep it on their own key, custom entries on v:<key>
  function whenLine(dk) {
    const s = seen(), v = /^(add|free|log):/.test(dk) ? s['v:' + dk] : s[dk];
    if (!/^\d{4}-\d\d-\d\d$/.test(v || '')) return '';
    return `<label class="fx-when"><span>${T().watchedLbl}</span><input type="date" class="fx-date fx-date-in" data-dk="${esc(dk)}" value="${v}" max="${today()}" aria-label="${esc(T().watchedOn)}"></label>`;
  }
  const tonightTag = k => pickK === k ? `<span class="fx-tonight">${T().tonightTag}</span>` : '';
  function card(w, it, n) {
    const s = seen(), t = T();
    if (it.add) {
      const done = itemSeen(it), rk = it.i != null ? KEY(it.i) : it.k;
      const orig = it.rp ? origTitle(it.rp) : '';
      const extra = esc(orig ? t.insteadOf(orig) : t.added);
      return `<li class="fx-i fx-add ${done ? 'done' : ''}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}">${poster(it.i, it.i == null ? it.title : '')}
        <div class="fx-b">${tonightTag(it.k)}${titleLine(it.i, it.title, fxMd(s, it.k))}${subLine(it.i, fxMd(s, it.k))}${tagLine(it.i, '', extra)}${done ? whenLine(it.i != null ? rk : it.k) + rateRow(rk) + reviewBlock(rk) + lbLog(rk) : ''}</div>
        ${actions(done, false, 'add')}</li>`;
    }
    if (it.free) {
      const v = s[it.k] || '', skipped = !!s['sk:' + it.k];
      const i = sugFor(w, n), txt = v && !v.startsWith('k:') ? v : '';
      const done = !!v, cls = done ? 'done' : skipped ? 'skip' : '';
      const rk = v.startsWith('k:') ? v.slice(2) : it.k;
      const body = txt ? titleLine(null, txt) + tagLine(null, '', esc(t.yourPick)) : i != null ? titleLine(i) + subLine(i) + tagLine(i, 'F') : `<div class="fx-tl"><span class="fx-film">${t.anything}</span></div>`;
      const alt = !done && !skipped ? (altOpen[it.k] ? `<form class="fx-alt" data-alt="${esc(it.k)}"><input type="text" dir="auto" placeholder="${esc(t.otherPh)}" aria-label="${esc(t.otherPh)}" required><button type="submit">${t.save}</button></form>` : `<button type="button" class="fx-link fx-other" data-open-alt="${esc(it.k)}">${t.other}</button>`) : '';
      return `<li class="fx-i ${cls}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}" data-sug="${i != null ? i : ''}">${poster(txt ? null : i, txt)}
        <div class="fx-b">${tonightTag(it.k)}${body}${alt}${done ? whenLine(v.startsWith('k:') ? rk : it.k) + rateRow(rk) + reviewBlock(rk) + lbLog(rk) : ''}</div>
        ${actions(done, skipped, 'film')}</li>`;
    }
    const i = it.i, done = !!s[it.k], skipped = !done && !!s['sk:' + it.k];
    return `<li class="fx-i ${done ? 'done' : skipped ? 'skip' : ''}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}">${poster(i)}
      <div class="fx-b">${tonightTag(it.k)}${titleLine(i)}${subLine(i)}${tagLine(i, it.lane)}${done ? whenLine(it.k) + rateRow(it.k) + reviewBlock(it.k) + lbLog(it.k) : ''}</div>
      ${actions(done, skipped, 'film')}</li>`;
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
    const t = T(), head = picker.fav != null ? t.favPick(fa(picker.fav + 1)) : picker.log ? t.logH : picker.replace ? t.replaceH(origTitle(picker.replace)) : t.addH;
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
    const tmOn = posterOn(), top = hits.slice(0, tmOn ? 5 : 8);
    let h = (tmOn && top.length ? `<li class="fx-resh">${t.inPlan}</li>` : '') + top.map(([, i]) => `<li><button type="button" class="fx-hit" data-pick-film="${i}"><span class="fx-film">${esc(F[i][0])}</span> <span class="fx-y">${F[i][1]}</span><span class="fx-hd"><bdi>${esc(dirName(i))}</bdi></span></button></li>`).join('');
    if (tmOn) {
      const seenTY = new Set(top.map(([, i]) => norm(F[i][0]) + '|' + F[i][1]));
      if (picker.tmq === picker.q && picker.tm) {
        const tm = picker.tm.filter(m => !seenTY.has(norm(m.t) + '|' + m.y));
        if (tm.length) h += `<li class="fx-resh">${t.fromTmdb}</li>` + tm.map((m, k) => `<li><button type="button" class="fx-hit fx-tmhit" data-pick-tm="${picker.tm.indexOf(m)}">${m.p ? `<img alt="" src="${fxTmdbImg(m.p)}">` : '<span class="fx-tmph"></span>'}<span><span class="fx-film">${esc(m.t)}</span> <span class="fx-y">${m.y || ''}</span></span></button></li>`).join('');
      } else h += `<li class="fx-muted fx-resh">${t.searching}</li>`;
    } else if (!hits.length) h += `<li class="fx-muted">${t.noMatch}</li>`;
    if (picker.fav == null) h += `<li><button type="button" class="fx-hit fx-asis" data-pick-text>${esc(t.addAsIs((picker.q || '').trim()))}</button></li>`;
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
    const eye = list.length ? `<div class="fx-eye">${esc(t.eyebrow(fa(list.filter(itemSeen).length), fa(list.filter(it => !seen()['sk:' + it.k]).length), rt ? (L() === 'fa' ? t.hm(rt).replace(/\d+/g, d => fa(d)) : t.hm(rt)) : ''))}</div>` : '';
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
    const head = (i != null ? F[i][0] + ' (' + F[i][1] + ') — ' + dirName(i) : e.t + (e.md && e.md.d ? ' — ' + e.md.d : ''));
    const sid = seen()['cfg:share'], url = sid && ST && ST.shareUrl ? ST.shareUrl(sid) + '/' + fxEntryId(e.k) : '';
    return [head, [stars, e.l ? '♥' : '', e.rw ? '↻' : '', e.ww ? T().withShort(e.ww) : ''].filter(Boolean).join(' '), e.rv ? (e.sp ? '⚠️ ' + T().spoilers + '\n\n' : '') + e.rv : '', url].filter(Boolean).join('\n\n');
  }
  function renderDiary() {
    const t = T(), all = fxDiary(D, seen());
    const years = [...new Set(all.map(e => e.date.slice(0, 4)))].sort().reverse();
    if (diaryYear === null || (diaryYear !== 'all' && !years.includes(diaryYear))) diaryYear = years.length > 1 ? (years.includes(today().slice(0, 4)) ? today().slice(0, 4) : years[0]) : 'all';
    const list = diaryYear === 'all' ? all : all.filter(e => e.date.startsWith(diaryYear));
    const mins = list.reduce((a, e) => a + (e.i != null ? F[e.i][3] || 0 : 0), 0), rated = list.filter(e => e.r);
    const avg = rated.length ? (rated.reduce((a, e) => a + e.r, 0) / rated.length / 2).toFixed(1) : '';
    const hmFa = m => L() === 'fa' ? t.hm(m).replace(/\d+/g, d => fa(d)) : t.hm(m);
    const nfmt = n => L() === 'fa' ? fa(n) : Number(n).toLocaleString('en-US');
    let h = `<header class="fx-head">${all.length ? `<div class="fx-eye">${esc(t.diaryEye(nfmt(list.length), hmFa(mins).replace(/\b\d{4,}\b/g, n => L() === 'fa' ? n : Number(n).toLocaleString('en-US')), avg ? (L() === 'fa' ? fa1(+avg) : avg) : ''))}</div>` : ''}<div class="fx-hrow"><h1 class="fx-h1">${t.diaryH}</h1></div></header>`;
    h += picker && picker.log ? pickerBox() : `<div class="fx-act"><button type="button" class="fx-btn" data-log>${t.logFilm}</button></div>`;
    if (all.length && typeof fxCalendar === 'function') h += `<details class="fx-more fx-calwrap"${calOpen ? ' open' : ''}><summary>${t.calH}</summary>${fxCalendar(all.map(e => e.date), diaryYear === 'all' || diaryYear === null ? 'all' : diaryYear, L(), today(), FX_CAL_L[L()])}</details>`;
    if (years.length > 1) h += `<nav class="fx-years">${years.concat('all').map(y => `<button type="button" data-year="${y}" aria-pressed="${diaryYear === y}">${y === 'all' ? t.allYears : fa(y).replace(/[٬,]/g, '')}</button>`).join('')}</nav>`;
    if (!all.length) return h + `<p class="fx-muted">${t.diaryEmpty}</p><div class="fx-row"><button type="button" class="fx-btn primary" data-back>${t.back}</button></div>`;
    const mf = new Intl.DateTimeFormat(L() === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {month: 'long', year: 'numeric'});
    const dayN = new Intl.DateTimeFormat(L() === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {day: 'numeric'});
    let month = '';
    h += '<div class="fx-diary">';
    list.forEach(e => {
      const d = new Date(e.date + 'T12:00:00'), mk = mf.format(d);
      if (mk !== month) { if (month) h += '</ul>'; month = mk; h += `<h2 class="fx-mon">${esc(mk)}</h2><ul class="fx-dl">`; }
      const ed = editK === e.k;
      h += `<li class="fx-de${ed ? ' open' : ''}" data-dk="${esc(e.k)}"><span class="fx-dday">${dayN.format(d)}</span>${posterOn() ? poster(e.i, e.i == null ? e.t : '') : ''}
        <div class="fx-b">${titleLine(e.i, e.t, e.md)}${subLine(e.i, e.md)}${e.r || e.l || e.rv || e.rw || e.ww || e.tg ? `<div class="fx-dm">${starsText(e.k)}${e.rw ? `<span class="fx-rw" title="${t.rewatch}">↻</span>` : ''}${e.rv ? `<span class="fx-rvi">${t.reviewed}</span>` : ''}${e.ww ? `<span class="fx-ww">${esc(t.withShort(e.ww))}</span>` : ''}${e.tg ? e.tg.split(',').map(x => x.trim()).filter(Boolean).slice(0, 6).map(x => `<span class="fx-tagc">${esc(x)}</span>`).join('') : ''}</div>` : ''}
        ${ed ? `<div class="fx-ded"><div class="fx-row"><label class="fx-dlab">${t.watchedOn} <input type="date" class="fx-date" value="${e.date}" max="${today()}"></label><label class="fx-check"><input type="checkbox" data-flag="rw"${e.rw ? ' checked' : ''}> ↻ ${t.rewatch}</label></div>${rateRow(e.k)}<textarea class="fx-rv" data-rv="${esc(e.k)}" dir="auto" rows="5" placeholder="${esc(t.reviewPh)}">${esc(e.rv)}</textarea>
          <label class="fx-check"><input type="checkbox" data-flag="sp"${e.sp ? ' checked' : ''}> ${t.spoilers}</label>
          <label class="fx-field"><span>${t.withL}</span><input type="text" data-meta="ww" dir="auto" maxlength="80" placeholder="${esc(t.withPh)}" value="${esc(e.ww)}"></label>
          <label class="fx-field"><span>${t.tagsL}</span><input type="text" data-meta="tg" dir="auto" maxlength="160" placeholder="${esc(t.tagsPh)}" value="${esc(e.tg)}"></label>
          <div class="fx-row"><button type="button" class="fx-btn primary" data-dedone>${t.done}</button><button type="button" class="fx-btn" data-again>${t.logAgain}</button><button type="button" class="fx-btn" data-post>${t.copyPost}</button>${lbLog(e.k)}<button type="button" class="fx-link" data-unlog>${t.unlog}</button></div>${note.post && note.post[2] === e.k ? `<p class="fx-note ok">${esc(note.post[1])}</p>` : ''}</div>`
        : (e.rv ? `<p class="fx-rvx" dir="auto">${esc(e.rv.length > 280 ? e.rv.slice(0, 280) + '…' : e.rv)}</p>` : '')}</div>
        <div class="fx-acts">${ed ? '' : `<button type="button" class="fx-link fx-al" data-dedit>${t.edit}</button>`}</div></li>`;
    });
    h += '</ul></div>';
    h += `<div class="fx-row"><button type="button" class="fx-btn primary" data-back>${t.back}</button></div>`;
    return h;
  }
  function favTiles() {
    const t = T(), fav = fxFav(seen());
    return [0, 1, 2, 3].map(n => {
      const f = fav[n];
      if (!f) return `<div class="fx-fav"><button type="button" class="fx-favb empty" data-fav="${n}" aria-label="${esc(t.favPick(fa(n + 1)))}">+</button></div>`;
      let img = '', title = '';
      if (f.k && KEYIDX[f.k] !== undefined) { const i = KEYIDX[f.k]; title = F[i][0]; const src = P ? P.src(f.k) : ''; img = src ? `<img alt="" src="${src}">` : (P && P.on() ? `<img alt="" data-pk="${esc(f.k)}" data-pt="${esc(F[i][0])}" data-py="${F[i][1]}">` : ''); }
      else { title = f.t || ''; const src = fxTmdbImg(f.p); img = src ? `<img alt="" src="${src}">` : ''; }
      return `<div class="fx-fav"><button type="button" class="fx-favb" data-fav="${n}" title="${esc(title)}">${img}<span class="fx-favt">${esc(title)}</span></button><button type="button" class="fx-link fx-al" data-favrm="${n}">${t.favRemove}</button></div>`;
    }).join('');
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
          <div class="fx-field"><span>${t.favH}</span><p class="fx-muted">${t.favP}</p><div class="fx-favs">${favTiles()}</div>${picker && picker.fav != null ? pickerBox() : ''}</div>
          <label class="fx-field"><span>${t.nameL}</span><input type="text" data-cfg="cfg:name" maxlength="60" dir="auto" placeholder="${esc(t.namePh)}" value="${esc(seen()['cfg:name'] || '')}"></label>
          <div class="fx-field"><span>${t.linksL}</span><div class="fx-links-ed">${[['lb', 'cfg:lb', 'text'], ['tg', 'cfg:channel', 'url'], ['sp', 'cfg:sp', 'url'], ['ig', 'cfg:ig', 'url'], ['web', 'cfg:web', 'url']].map(([k, ck, ty]) => `<label><span>${t.links[k][0]}</span><input type="${ty}" data-cfg="${ck}" dir="ltr" autocapitalize="off" spellcheck="false" placeholder="${esc(t.links[k][1])}" value="${esc(seen()[ck] || '')}"></label>`).join('')}</div></div>
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
    ['rp:', 'v:', 'r:', 'l:', 'rv:', 'md:', 'rw:', 'sp:', 'ww:', 'tg:'].forEach(p => S.set(p + a, null));
    S.set(a, null);
  }
  function setFav(n, item) {
    const arr = fxFav(seen()); while (arr.length < 4) arr.push(null);
    arr[n] = item; S.set('cfg:fav', arr.some(Boolean) ? JSON.stringify(arr) : null);
  }
  function pick(val, md) {
    const keepMd = key => { if (md) { S.set('md:' + key, JSON.stringify(md)); if (P && md.p) P.put('tx:' + val.slice(2), md.p); } };
    if (picker.fav != null) {
      if (val.startsWith('k:')) setFav(picker.fav, {k: val.slice(2)});
      else setFav(picker.fav, md ? {t: md.t, y: md.y, d: md.d, p: md.p, tm: md.tm} : {t: val.slice(2)});
      picker = null; return;
    }
    if (picker.log) {
      if (val.startsWith('k:') && !seen()[val.slice(2)]) { const fk = val.slice(2); S.set(fk, today()); S.set('sk:' + fk, null); editK = fk; }
      else if (val.startsWith('k:')) { const id = 'log:' + Date.now().toString(36); S.set(id, val); S.set('v:' + id, today()); S.set('rw:' + id, 1); editK = id; }  // seen before: a rewatch
      else { const id = 'log:' + Date.now().toString(36); S.set(id, val); S.set('v:' + id, today()); keepMd(id); editK = id; }
      diaryYear = today().slice(0, 4); picker = null; return;
    }
    const a = 'add:' + shown + ':' + Date.now().toString(36);
    S.set(a, val); keepMd(a);
    if (picker.replace) { S.set('rp:' + a, picker.replace); S.set('sk:' + picker.replace, today()); }
    picker = null;
  }
  const say = (k, cls, txt) => { note[k] = [cls, txt]; render(); };
  root.addEventListener('input', e => {
    const rv = e.target.closest('textarea[data-rv]');
    if (rv) { const k = rv.dataset.rv, val = rv.value; clearTimeout(rvTimer); rvTimer = setTimeout(() => S.set('rv:' + k, val.trim() ? val : null), 600); return; }
    if (!e.target.classList.contains('fx-pick-q') || !picker) return;
    picker.q = e.target.value;
    clearTimeout(tmTimer);
    if (posterOn() && norm(picker.q).length >= 2) {
      const q = picker.q;
      tmTimer = setTimeout(() => { P.search(q.trim()).then(r => { if (picker && picker.q === q) { picker.tm = r; picker.tmq = q; const ul = root.querySelector('.fx-res'); if (ul) ul.innerHTML = pickerResults(); } }).catch(() => { if (picker && picker.q === q) { picker.tm = []; picker.tmq = q; const ul = root.querySelector('.fx-res'); if (ul) ul.innerHTML = pickerResults(); } }); }, 350);
    }
    const ul = root.querySelector('.fx-res'); if (ul) ul.innerHTML = pickerResults();
  });
  root.addEventListener('change', e => {
    const c = e.target.closest('input[data-cfg]');
    if (c) {
      let v = c.value.trim();
      if (c.dataset.cfg === 'cfg:lb') { v = v.replace(/^https?:\/\/(www\.)?letterboxd\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, ''); if (v && !/^[A-Za-z0-9_]{1,40}$/.test(v)) v = ''; c.value = v; }
      else if (c.type === 'url' && v && !/^https:\/\/[^\s"<>]+$/.test(v)) { if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v)) v = 'https://' + v; else v = ''; c.value = v; }
      S.set(c.dataset.cfg, v || null); return;
    }
    const fl = e.target.closest('input[data-flag]');
    if (fl) { const k = fl.closest('[data-dk]').dataset.dk; S.set(fl.dataset.flag + ':' + k, fl.checked ? 1 : null); return; }
    const mt = e.target.closest('input[data-meta]');
    if (mt) {
      const k = mt.closest('[data-dk]').dataset.dk; let v = mt.value.trim();
      if (mt.dataset.meta === 'tg') v = v.split(/[,،]/).map(x => x.trim()).filter(Boolean).slice(0, 8).join(', ');
      S.set(mt.dataset.meta + ':' + k, v || null); return;
    }
    if (e.target.closest('input[data-pubdiary]')) { S.set('cfg:pubdiary', e.target.checked ? null : '0'); return; }
    const d = e.target.closest('input.fx-date');
    if (d && /^\d{4}-\d\d-\d\d$/.test(d.value)) { const k = d.dataset.dk || d.closest('[data-dk]').dataset.dk; if (/^(add|free|log):/.test(k)) S.set('v:' + k, d.value); else S.set(k, d.value); if (view === 'diary') { if (diaryYear !== 'all') diaryYear = d.value.slice(0, 4); render(); } }
  });
  root.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('fx-calwrap')) calOpen = e.target.open; }, true);
  root.addEventListener('focusout', e => {
    const rv = e.target.closest && e.target.closest('textarea[data-rv]');
    if (rv) { clearTimeout(rvTimer); S.set('rv:' + rv.dataset.rv, rv.value.trim() ? rv.value : null); }
  });
  root.addEventListener('keydown', e => {
    if (e.target.classList.contains('fx-pick-q') && e.key === 'Enter') { e.preventDefault(); const b = root.querySelector('.fx-res [data-pick-film]') || root.querySelector('.fx-res [data-pick-tm]') || root.querySelector('.fx-res [data-pick-text]'); if (b && (picker.q || '').trim().length >= 2) b.click(); }
    if (e.key === 'Escape' && picker) { picker = null; render(); }
  });
  root.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    const li = t.closest('.fx-i'), k = li && li.dataset.k, tt = T();
    if (t.hasAttribute('data-rvopen')) { reviewOpen[t.dataset.rvopen] = true; render(); const ta = root.querySelector('textarea[data-rv="' + CSS.escape(t.dataset.rvopen) + '"]'); if (ta) ta.focus(); return; }
    if (t.hasAttribute('data-fav')) { picker = {q: '', focus: true, fav: +t.dataset.fav}; render(); const q = root.querySelector('.fx-pick-q'); if (q) q.scrollIntoView({block: 'center'}); return; }
    if (t.hasAttribute('data-favrm')) { setFav(+t.dataset.favrm, null); render(); return; }
    if (t.hasAttribute('data-pick-tm')) {
      const m = (picker && picker.tm || [])[+t.dataset.pickTm]; if (!m) return;
      t.disabled = true;
      const go = det => { const md = {tm: m.id, t: m.t, y: m.y, d: det.d || '', m: det.m || 0, p: det.p || m.p || ''}; pick('t:' + m.t + (m.y ? ' (' + m.y + ')' : ''), md); render(); };
      P.details(m.id).then(go, () => go({}));
      return;
    }
    if (t.hasAttribute('data-again')) {
      const e2 = fxDiary(D, seen()).find(x => x.k === editK); if (!e2) return;
      const id = 'log:' + Date.now().toString(36);
      S.set(id, e2.i != null ? 'k:' + KEY(e2.i) : 't:' + e2.t);
      if (e2.md) S.set('md:' + id, JSON.stringify(e2.md));
      S.set('v:' + id, today()); S.set('rw:' + id, 1);
      editK = id; diaryYear = today().slice(0, 4); render(); return;
    }
    if (t.hasAttribute('data-log')) { picker = {q: '', focus: true, log: true}; editK = null; render(); return; }
    if (t.hasAttribute('data-year')) { diaryYear = t.dataset.year; editK = null; render(); return; }
    if (t.hasAttribute('data-diary')) { view = 'diary'; editK = null; note = {}; picker = null; render(); window.scrollTo(0, 0); return; }
    if (t.hasAttribute('data-dedit')) { editK = t.closest('[data-dk]').dataset.dk; note = {}; render(); return; }
    if (t.hasAttribute('data-dedone')) { const ta = root.querySelector('.fx-ded textarea'); if (ta) { clearTimeout(rvTimer); S.set('rv:' + ta.dataset.rv, ta.value.trim() ? ta.value : null); } editK = null; render(); return; }
    if (t.hasAttribute('data-unlog')) {
      const k2 = t.closest('[data-dk]').dataset.dk;
      const extra = ['rw:', 'sp:', 'ww:', 'tg:'];
      if (k2.startsWith('log:')) ['', 'v:', 'r:', 'l:', 'rv:', 'md:'].concat(extra).forEach(p => S.set(p + k2, null));
      else if (k2.startsWith('add:') || k2.startsWith('free:')) ['v:', 'r:', 'l:', 'rv:'].concat(extra).forEach(p => S.set(p + k2, null)); else { setFilm(k2, false); ['rv:'].concat(extra).forEach(p => S.set(p + k2, null)); }
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
    else if (t.hasAttribute('data-back')) { view = 'week'; note = {}; picker = null; editK = null; render(); window.scrollTo(0, 0); return; }
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
