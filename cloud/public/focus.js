// "This week" view: only the current batch of films, no dates, no totals, no road ahead.
// A week opens once every film in the previous one is watched, skipped or removed, so there is no falling behind.
// Films can be added to the week or swapped in for a planned one. English by default, Persian as an option.
// Shared by the web app, the extension popup and (fxCompact/fxCur/fxT only) the Letterboxd badge.

const FX_TH_EN = {'عشق': 'Love', 'وحشت': 'Horror', 'خنده': 'Comedy', 'جنایت': 'Crime', 'سیاست و تاریخ': 'Politics & history', 'جنگ': 'War',
  'کودکی و نوجوانی': 'Growing up', 'زمین و طبیعت': 'Earth & nature', 'حافظه و زمان': 'Memory & time', 'رؤیا و افسانه': 'Dreams & fables',
  'میل و وسوسه': 'Desire', 'سینما درباره‌ی سینما': 'Cinema on cinema', 'اکشن و ماجرا': 'Action & adventure', 'وسترن': 'Westerns'};
const FX_STR = {
  en: {
    thisWeek: 'This Week', weekDone: 'Week done', surprise: t => t + ' week',
    eyebrow: (n, of, rt) => of + (of === '1' ? ' film' : ' films') + (rt ? ' · ' + rt : '') + (n !== '0' ? ' · ' + n + ' watched' : ''),
    hm: m => m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm',
    whenReady: 'All watched.', showNext: 'Next week →',
    restP: 'A week off. Nothing’s scheduled, so watch whatever you like, or nothing at all.', restSug: 'Want a suggestion?', restGo: 'On to next week →',
    tonight: 'Pick for me', tonightHint: '', tonightTag: 'Tonight',
    dl: 'Next week’s downloads', copy: 'Copy', copied: 'Copied', selected: 'Selected. Copy it.',
    watchedN: n => 'Diary · ' + n + (n === '1' ? ' film' : ' films'), skipped: 'Skipped', notWatched: 'Remove', restore: 'Undo',
    skip: 'Skip', skipTitle: 'Skip this film', watched: 'Watched', other: 'Watched something else?', otherPh: 'Film title', save: 'Save',
    anything: 'Your choice', yourPick: 'Your pick', free: 'Your pick', lanes: {H: 'Classic', A: 'Auteur', C: 'Contemporary', P: 'Popular'},
    st: {ok: 'Downloaded', dl: 'Downloading', need: 'Not downloaded'}, min: n => n + ' min', firstBy: d => 'Your first ' + d, marathon: (k, n) => 'Part ' + k + ' of ' + n,
    friends: 'Friends', friendsTitle: n => 'Average rating from ' + n + ' friends', howWas: 'Rate & review', liked: 'Like', stars: n => n + ' stars', reviewed: 'Review',
    review: 'Add a review', editReview: 'Edit review', reviewPh: 'Add a review…',
    settings: 'Settings', full: 'Five-Year Plan', planLink: (w, n) => 'Week ' + w + ' of ' + n + ' · See the whole plan →', diaryLink: 'Diary', back: '← This week', end: 'The End', endP: 'Five years, every film. What comes next is up to you.',
    add: '+ Add a film', addH: 'Add a film', replace: 'Replace', replaceH: t => 'Replace ' + t, insteadOf: t => 'Instead of ' + t, added: 'Added',
    remove: 'Remove', cancel: 'Cancel', addPh: 'Search films…', addAsIs: t => 'Add “' + t + '”', noMatch: 'Not in your plan, but you can still add it.',
    diaryH: 'Diary', diaryEye: (n, h, avg) => n + (n === '1' ? ' film' : ' films') + ' · ' + h + (avg ? ' · ★ ' + avg + ' average' : ''),
    logFilm: '+ Log a film', logH: 'Log a film', allYears: 'All time', watchedLbl: 'Watched',
    inPlan: 'In your plan', fromTmdb: 'From TMDB', searching: 'Searching TMDB…',
    favH: 'Favorite films', favP: 'Four films that sum up your taste. They sit at the top of your profile.', favAdd: 'Add', favPick: n => 'Favorite #' + n, favRemove: 'Remove',
    rewatch: 'Rewatch', spoilers: 'Contains spoilers', withL: 'Watched with', withPh: 'e.g. Sara, Ali', tagsL: 'Tags', tagsPh: 'Separate with commas, e.g. theater, 35mm',
    logAgain: 'Log again', withShort: n => 'with ' + n, calH: 'Watch calendar',
    shNew: 'I watched…', shEdit: 'Edit entry', shSave: 'Save', shDate: 'Watched on', shRewatch: 'I’ve watched this film before', shRate: 'Rate', shRated: 'Rated',
    shReviewPh: 'Add a review…', shSpoil: 'Contains spoilers', shTagPh: 'Add tags…', shTagMore: 'Add another…', shTagRm: x => 'Remove tag ' + x,
    shRemove: 'Remove from diary', shRemove2: 'Tap again to remove', shDiscard: 'Discard changes?', shTagHint: 'Press Return or type a comma to add a tag', shMore: 'More',
    navList: 'List', listH: 'Your List', listEye: (n, w) => n + ' films · ' + w + (w === '1' ? ' week' : ' weeks'), listAdd: '+ Add films', listImport: 'Import from Letterboxd',
    perWeekL: 'Films a week', listEmpty: 'Nothing here yet. Add films one at a time, or bring in your Letterboxd watchlist.', listAllDone: 'You’ve watched everything on your list. Add a few more?',
    wkLabel: w => 'Week ' + w, thisWeekL: 'this week', moveUp: 'Move up', moveDown: 'Move down', removeL: 'Remove', removeL2: 'Remove?', showAllWeeks: n => 'Show all ' + n + ' weeks', pastWeeks: n => n + (n === '1' ? ' week' : ' weeks') + ' behind you',
    importing: (d, n) => 'Matching films with TMDB… ' + d + ' / ' + n, imported: (a, s2) => a + ' films added' + (s2 ? ' · ' + s2 + ' already there' : '') + '.', importedDiary: (a, s2, u) => a + ' diary entries added' + (u ? ' · ' + u + ' updated' : '') + (s2 ? ' · ' + s2 + ' already there' : '') + '.',
    importBad: 'That doesn’t look like a Letterboxd export (a .csv with Name and Year).', importNoDates: 'This file has no watch dates. To bring in your history, use diary.csv from the export.',
    importHelp: 'On letterboxd.com, go to Settings → Data → Export your data. Use watchlist.csv (or any list) for your list, and diary.csv (or reviews.csv) for your history.',
    inList: 'In your list', addedL: t => 'Added: ' + t, listPh: 'Search any film', planH: 'Plan', planList: n => 'Your own list · ' + Number(n).toLocaleString('en-US') + ' films', planSample: 'Sample plan · Five Years of Cinema', planOwn: n => 'Your own plan · ' + Number(n).toLocaleString('en-US') + ' films', planReset: 'Start over with another plan', planReset2: 'Tap again to start over. Your diary stays.',
    lbH: 'Letterboxd', lbP: 'Bring in your whole Letterboxd history in one go. On letterboxd.com, go to Settings → Data → Export your data, then choose the .zip here. Your diary, ratings, likes and watchlist all come over.', lbPick: 'Import Letterboxd export', lbfL: 'Friends on Letterboxd', lbfP: 'Their usernames, separated by commas. Their public Letterboxd logs are checked every few hours, so your page can show how close your tastes are.',
    lbWorking: (d, n) => 'Reading your history… ' + d + ' / ' + n, lbDone: (a, k, m, lk, u) => a + ' diary entries added · ' + k + ' plan films checked off · ' + m + ' updated' + (lk ? ' · ' + lk + ' likes' : '') + (u ? ' · ' + u + ' undated films (counted in your stats)' : '') + '.', lbBad: 'That’s not a Letterboxd export. Choose the .zip from Settings → Data → Export your data (or diary.csv from inside it).',
    lbAuto: (ago, n) => 'Anything you log on Letterboxd shows up here within a few hours. Last checked ' + ago + (n ? ' · ' + n + ' new' : '') + '.', lbAutoOff: 'Anything you log on Letterboxd will show up here within a few hours.',
    changePoster: 'Change poster', posterH: 'Choose a poster', posterDefault: 'Default', imgsLoading: 'Loading from TMDB…', imgsNone: 'TMDB has no other posters for this film.', imgsFail: 'Couldn’t reach TMDB. Try again in a moment.',
    bdH: 'Backdrop', bdP: 'A still from any film, shown across the top of your profile and this app.', bdChoose: 'Choose a film', bdChange: 'Another film', bdRemove: 'Remove', bdFrom: t => 'Stills from ' + t, bdNone: 'TMDB has no stills for this film.', bdPick: 'Choose a film for your backdrop',
    navWeek: 'This Week', navDiary: 'Diary', navSettings: 'Settings', preview: 'Preview ↗', linkL: 'Your link', cfgSave: 'Save changes', cfgSaved: 'Saved.',
    diaryEmpty: 'Your diary is empty. Films you check off show up here, or you can log one yourself.', edit: 'Edit', watchedOn: 'Watched on', done: 'Done', unlog: 'Delete entry',
    logOnLb: 'Letterboxd ↗', logToLb: 'Log on Letterboxd ↗', copyPost: 'Copy as post', postCopied: 'Copied. Ready to paste.',
    syncH: 'Sync', syncOn: login => 'Connected' + (login ? ' as ' + login : '') + '.', syncBusy: 'Syncing…', syncAt: a => 'Last synced ' + a + '.',
    syncNow: 'Sync now', disconnect: 'Disconnect this device',
    acctH: 'Account', acctOn: u => 'Signed in as @' + u + '. Your diary is saved to your account and stays in sync on all your devices.', signOut: 'Sign out of this device',
    pwH: 'Change password', pwCur: 'Current password', pwNew: 'New password (at least 8 characters)', pwSave: 'Change', pwDone: 'Password changed. Other devices will need to sign in again.',
    delH: 'Delete my account', delP: 'This deletes everything: your diary, plan, profile and follows. It can’t be undone, so download a copy first if you want one.', delPw: 'Your password', delGo: 'Delete my account', delSure: 'Tap again to delete it for good',
    dlData: 'Download my data', dlAll: 'Download a backup file', postersSite: 'Posters and film info come from TMDB.',
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
    shareOnP: 'Anyone with the link can see it, but only you can change it. It shows this week’s films and, if you like, your diary with ratings, likes and reviews. Your settings and the rest of your plan stay private.',
    shareOffP: 'A read-only page for friends and followers with this week’s films and your diary. Your settings and the rest of your plan stay private.',
    shareMake: 'Make public', shareCopy: 'Copy link', shareStop: 'Make private', shareMaking: 'Making it public…', shareMade: 'Your profile is public. Copy the link and share it.', shareStopping: 'Making it private…', shareStopped: 'Your profile is private now. The link no longer works.',
    nameL: 'Name', namePh: 'Your name', pubDiary: 'Show my diary, ratings and reviews', linksL: 'Links',
    links: {lb: ['Letterboxd username', 'username'], tg: ['Telegram channel', 'https://t.me/…'], sp: ['Spotify', 'https://open.spotify.com/…'], ig: ['Instagram', 'https://instagram.com/…'], web: ['Website', 'https://…']},
    langH: 'Language', langNote: 'Also used on your public profile.',
    bkH: 'Backup', bkP: 'Copy your diary as JSON, or paste one in. Handy when moving over from an older version.', bkCopy: 'Copy JSON', bkPh: 'Paste JSON', bkLoad: 'Import', bkDone: n => n + ' imported.', bkBad: 'That’s not a valid backup. Paste in all the text you copied.',
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
    shNew: 'دیدمش…', shEdit: 'ویرایش', shSave: 'ثبت', shDate: 'تاریخ دیدن', shRewatch: 'این فیلم رو قبلاً دیده بودم', shRate: 'امتیاز بده', shRated: 'امتیاز',
    shReviewPh: 'ریویو بنویس…', shSpoil: 'اسپویل داره', shTagPh: 'تگ اضافه کن…', shTagMore: 'یکی دیگه…', shTagRm: x => 'حذف تگ ' + x,
    shRemove: 'حذف از دفتر', shRemove2: 'برای حذف دوباره بزن', shDiscard: 'تغییرات بره؟', shTagHint: 'با اینتر یا کاما اضافه می‌شه', shMore: 'بیشتر',
    navList: 'لیست', listH: 'لیست من', listEye: (n, w) => n + ' فیلم · ' + w + ' هفته', listAdd: '+ اضافه کردن فیلم', listImport: 'آوردن از لترباکس',
    perWeekL: 'فیلم در هفته', listEmpty: 'هنوز چیزی اینجا نیست. فیلم‌ها رو یکی‌یکی اضافه کن یا واچ‌لیست لترباکست رو بیار.', listAllDone: 'هر چی توی لیستت بود دیدی. چند تا دیگه اضافه کنیم؟',
    wkLabel: w => 'هفته‌ی ' + w, thisWeekL: 'این هفته', moveUp: 'بالاتر', moveDown: 'پایین‌تر', removeL: 'حذف', removeL2: 'حذف؟', showAllWeeks: n => 'نشون دادن همه‌ی ' + n + ' هفته', pastWeeks: n => n + ' هفته پشت سر گذاشتی',
    importing: (d, n) => 'دارم فیلم‌ها رو با TMDB تطبیق می‌دم… ' + d + ' از ' + n, imported: (a, s2) => a + ' فیلم اضافه شد' + (s2 ? ' · ' + s2 + ' تا از قبل بود' : '') + '.', importedDiary: (a, s2, u) => a + ' مورد به دفتر اضافه شد' + (u ? ' · ' + u + ' تا کامل شد' : '') + (s2 ? ' · ' + s2 + ' تا از قبل بود' : '') + '.',
    importBad: 'این فایل خروجی لترباکس به نظر نمیاد (یه فایل csv با ستون‌های Name و Year).', importNoDates: 'این فایل تاریخ دیدن نداره. برای تاریخچه‌ت diary.csv رو از خروجی لترباکس بیار.',
    importHelp: 'توی letterboxd.com: Settings ← Data ← Export your data. برای لیست watchlist.csv یا یه لیست، برای تاریخچه diary.csv (یا reviews.csv).',
    inList: 'توی لیستت هست', addedL: t => 'اضافه شد: ' + t, listPh: 'هر فیلمی رو جستجو کن', planH: 'برنامه', planList: n => 'لیست خودم · ' + n + ' فیلم', planSample: 'برنامه‌ی نمونه · پنج سال سینما', planOwn: n => 'برنامه‌ی خودت · ' + n + ' فیلم', planReset: 'شروع دوباره با یه برنامه‌ی دیگه', planReset2: 'برای شروع دوباره، دوباره بزن (دفترت می‌مونه)',
    lbH: 'لترباکس', lbP: 'یه بار کل تاریخچه‌ت رو بیار: توی letterboxd.com برو Settings ← Data ← Export your data و فایل zip ـی که می‌ده رو انتخاب کن (یا diary.csv و reviews.csv از توش). فیلم‌هایی از برنامه که قبل از این ماه دیدی به‌عنوان ورودی دفتر میان و برنامه دست نمی‌خوره.', lbPick: 'آوردن خروجی لترباکس', lbfL: 'دوستات تو لترباکس', lbfP: 'یوزرنیم‌هاشون رو با کاما جدا کن. هر چند ساعت لاگ‌های عمومی لترباکسدشون هم خونده می‌شه تا تو صفحه‌ت ببینن سلیقه‌تون چقدر به هم نزدیکه.',
    lbWorking: (d, n) => 'دارم تاریخچه‌ت رو می‌خونم… ' + d + ' از ' + n, lbDone: (a, k, m, lk, u) => a + ' مورد به دفتر اضافه شد · ' + k + ' فیلم برنامه تیک خورد · ' + m + ' مورد کامل شد' + (lk ? ' · ' + lk + ' قلب' : '') + (u ? ' · ' + u + ' فیلمِ بی‌تاریخ که فقط تو آمار حساب می‌شه' : '') + '.', lbBad: 'این خروجی لترباکس نیست؛ فایل zip ـی که از Settings ← Data ← Export your data می‌گیری رو انتخاب کن (یا diary.csv از توش).',
    lbAuto: (ago, n) => 'هر چی توی لترباکس ثبت کنی، تا چند ساعت بعد خودش میاد اینجا. آخرین بررسی ' + ago + (n ? ' · دفعه‌ی قبل ' + n + ' مورد جدید' : '') + '.', lbAutoOff: 'هر چی توی لترباکس ثبت کنی، تا چند ساعت بعد خودش میاد اینجا.',
    changePoster: 'عوض کردن پوستر', posterH: 'یه پوستر انتخاب کن', posterDefault: 'پیش‌فرض', imgsLoading: 'دارم از TMDB میارم…', imgsNone: 'TMDB برای این فیلم پوستر دیگه‌ای نداره.', imgsFail: 'الان به TMDB وصل نشد.',
    bdH: 'بک‌دراپ', bdP: 'یه نمای عریض از هر فیلمی، بالای پروفایلت و بالای همین اپ.', bdChoose: 'انتخاب فیلم', bdChange: 'یه فیلم دیگه', bdRemove: 'برداشتن', bdFrom: t => 'نماهای ' + t, bdNone: 'TMDB برای این فیلم نمایی نداره.', bdPick: 'فیلم بک‌دراپ رو انتخاب کن',
    navWeek: 'این هفته', navDiary: 'دفتر', navSettings: 'تنظیمات', preview: 'دیدن صفحه ↗', linkL: 'لینک صفحه‌ت', cfgSave: 'ذخیره', cfgSaved: 'ذخیره شد.',
    diaryEmpty: 'هنوز چیزی ثبت نشده. هر فیلمی که تیک بزنی خودش اینجا میاد، یا خودت یکی ثبت کن.', edit: 'ویرایش', watchedOn: 'تاریخ دیدن', done: 'تموم', unlog: 'حذف از دفتر',
    logOnLb: 'لترباکس ↗', logToLb: 'ثبت در لترباکس ↗', copyPost: 'کپی پست', postCopied: 'کپی شد؛ تو کانالت بچسبون.',
    syncH: 'همگام‌سازی', syncOn: login => 'وصلی به گیت‌هاب' + (login ? ' با حساب ' + login : '') + '.', syncBusy: 'در حال همگام‌سازی…', syncAt: a => 'آخرین همگام‌سازی: ' + a + '.',
    syncNow: 'الان همگام کن', disconnect: 'قطع اتصال همین دستگاه',
    acctH: 'حساب', acctOn: u => 'با @' + u + ' وارد شدی. دفترت روی سرور همین سایت نگه داشته می‌شه و روی همه‌ی دستگاه‌هات یکیه.', signOut: 'خروج از همین دستگاه',
    pwH: 'عوض کردن رمز', pwCur: 'رمز فعلی', pwNew: 'رمز جدید (حداقل ۸ حرف)', pwSave: 'عوض کن', pwDone: 'رمز عوض شد. بقیه‌ی دستگاه‌ها باید دوباره وارد بشن.',
    delH: 'پاک کردن حسابم', delP: 'همه‌چی پاک می‌شه: دفتر، برنامه، پروفایل و فالوها. برگشت‌پذیر نیست. اگه پشتیبان می‌خوای اول دانلودش کن.', delPw: 'رمزت', delGo: 'پاک کردن همه‌چی', delSure: 'یه بار دیگه بزن تا برای همیشه پاک بشه',
    dlData: 'دانلود دیتای من', dlAll: 'دانلود همه‌چی (فایل)', postersSite: 'پوسترها و اطلاعات فیلم‌ها از TMDB و از طریق همین سایت میان.',
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
// a film's TMDB details for stats (genres, countries, language, cast) live under one key per film, shared by every viewing
const fxNorm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
function fxMetaKey(D, e) {
  if (e.i != null) { const f = D.F[e.i]; return f[16] ? 'mx:tm' + f[16] : 'mx:t' + fxNorm(f[0]) + '|' + (f[1] || 0); }
  const md = e.md || {};
  if (md.tm) return 'mx:tm' + md.tm;
  return 'mx:t' + fxNorm(md.t || String(e.t).replace(/\s*\(\d{4}\)\s*$/, '')) + '|' + (md.y || e.y || 0);
}
function fxMeta(seen, k) { try { const o = JSON.parse(seen[k] || 'null'); return o && typeof o === 'object' && !o.x ? o : null; } catch (e) { return null; } }
// look up the films that have no details yet, three at a time, writing in small batches; a film TMDB doesn't know is tried again after a month
let fxMetaBusy = false;
async function fxMetaFill(D, seen, set, P) {
  if (fxMetaBusy || !P || !P.on() || !P.meta) return 0;
  fxMetaBusy = true;
  const s = seen(), d0 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), todo = new Map();
  try {
    fxDiary(D, s).concat(fxWatched(D, s)).forEach(e => {
      const k = fxMetaKey(D, e);
      if (todo.has(k)) return;
      if (s[k]) { try { const o = JSON.parse(s[k]); if (!o.x || o.x > d0) return; } catch (er) { return; } }
      todo.set(k, e);
    });
    const list = [...todo.entries()], out = [];
    let i = 0, n = 0;
    const flush = () => { out.splice(0).forEach(([k, v]) => set(k, v)); };
    const one = async ([k, e]) => {
      let tm = k.startsWith('mx:tm') ? +k.slice(5) : 0, tv = 0;
      if (!tm) {
        const md = e.md || {}, t = e.i != null ? D.F[e.i][0] : md.t || String(e.t).replace(/\s*\(\d{4}\)\s*$/, ''), y = e.i != null ? D.F[e.i][1] : md.y || e.y || 0;
        const m = await P.match(t, y);
        if (m) { tm = m.id || 0; tv = m.tv || 0; }
      }
      const o = tm || tv ? await P.meta(tm || tv, !tm) : null;
      out.push([k, JSON.stringify(o || {x: new Date().toISOString().slice(0, 10)})]); n++;
      if (out.length >= 25) flush();
    };
    const worker = async () => { while (i < list.length && !P.failed()) { const it = list[i++]; try { await one(it); } catch (er) {} } };
    await Promise.all([worker(), worker(), worker()]);
    flush();
    return n;
  } finally { fxMetaBusy = false; }
}
// films marked watched on Letterboxd with no diary entry (wx:…): counted in the stats, never shown in the diary
function fxWatched(D, seen) {
  const KI = fxKeyIdx(D), inDiary = new Set(), out = [];
  const id = (t, y) => fxNorm(String(t).replace(/\s*\(\d{4}\)\s*$/, '')) + '|' + (y || 0);
  fxDiary(D, seen).forEach(e => { inDiary.add(id(e.t, e.y)); const md = e.md || {}; if (md.tm) inDiary.add('tm' + md.tm); });
  for (const k in seen) {
    if (!k.startsWith('wx:') || k.slice(3).includes(':')) continue;
    const v = String(seen[k] || ''), md = fxMd(seen, k);
    let e = null;
    if (v.startsWith('k:') && KI[v.slice(2)] !== undefined) { const i = KI[v.slice(2)]; e = {k, i, t: D.F[i][0], y: D.F[i][1]}; }
    else if (v.startsWith('t:')) e = {k, i: null, t: v.slice(2), y: fxYear(v), md};
    if (!e || inDiary.has(id(e.t, e.y)) || (md && md.tm && inDiary.has('tm' + md.tm))) continue;
    e.r = +(seen['r:' + k] || 0); e.l = !!seen['l:' + k];
    out.push(e);
  }
  return out;
}
// everything in one file: the diary and settings (no keys or tokens) and, when the plan is one of a kind, the plan.
// The multi-user site reads this file to move a diary over.
function fxDownloadAll(D, entries, seen) {
  const e = {};
  Object.entries(entries || {}).forEach(([k, v]) => { if (!/^(cfg:tmdb|cfg:share|lbsync:)/.test(k)) e[k] = v; });
  const own = !seen['cfg:plan'] && D && Array.isArray(D.F) && D.F.length && Array.isArray(D.W);
  const file = {v: 1, app: 'five-years-cinema', exported: new Date().toISOString(), e};
  if (own) file.plan = D;
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([JSON.stringify(file)], {type: 'application/json'}));
  a.href = url; a.download = 'film-diary-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
// Letterboxd usernames of friends, from whatever was typed: profile links, @names, commas or spaces
const fxFriends = v => [...new Set(String(v || '').split(/[\s,،]+/).map(x => x.trim().replace(/^https?:\/\/(www\.)?letterboxd\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '')).filter(x => /^[A-Za-z0-9_]{1,40}$/.test(x)))].slice(0, 300);
function fxFav(seen) { try { const a = JSON.parse(seen['cfg:fav'] || '[]'); return Array.isArray(a) ? a.slice(0, 4) : []; } catch (e) { return []; } }
const fxTmdbImg = p => p && /^\/[A-Za-z0-9._-]+$/.test(p) ? 'https://image.tmdb.org/t/p/w185' + p : '';
const fxTmdbBd = (p, w) => p && /^\/[A-Za-z0-9._-]+$/.test(p) ? 'https://image.tmdb.org/t/p/' + (w || 'w1280') + p : '';
// the profile backdrop: {p: TMDB still path, t: film title, y: year}
function fxBd(seen) { try { const o = JSON.parse(seen['cfg:bd'] || 'null'); return o && /^\/[A-Za-z0-9._-]+$/.test(o.p || '') ? o : null; } catch (e) { return null; } }
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
  const ovp = k => fxTmdbImg(seen['ps:' + k]);
  const pos = k => ovp(k) || (posterUrl ? posterUrl(k) || '' : '');
  const film = (i, day) => ({t: F[i][0], y: F[i][1], d: dir(i), m: F[i][3] || 0, p: pos(F[i][8]), l: F[i][5] || '', tm: F[i][16] || 0, w: day || ''});
  const day = v => /^\d{4}-\d\d-\d\d$/.test(v || '') ? v : '';
  const ch = /^https:\/\/[^\s"<>]+$/.test(seen['cfg:channel'] || '') ? seen['cfg:channel'] : '';
  const okU = u => /^https:\/\/[^\s"<>]+$/.test(u || '') ? u : '';
  const links = {lb: /^[A-Za-z0-9_]{1,40}$/.test(seen['cfg:lb'] || '') ? seen['cfg:lb'] : '', tg: ch, sp: okU(seen['cfg:sp']), ig: okU(seen['cfg:ig']), web: okU(seen['cfg:web'])};
  const out = {v: 2, lang, name: String(seen['cfg:name'] || '').slice(0, 60), ch, links, now: {films: []}, diary: []};
  const lbf = fxFriends(seen['cfg:lbf']); if (lbf.length) out.lbf = lbf;
  const bd = fxBd(seen);
  if (bd) out.bd = {p: fxTmdbBd(bd.p), t: String(bd.t || '').slice(0, 120), y: +bd.y || 0};
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
        else { const md = fxMd(seen, it.k) || {}; films.push({t: md.t || String(it.title).replace(/\s*\(\d{4}\)\s*$/, ''), y: md.y || fxYear(it.title), d: md.d || '', m: md.m || 0, p: ovp('tx:' + it.title) || fxTmdbImg(md.p) || pos('tx:' + it.title), l: '', tm: md.tm || 0, w: day(seen['v:' + it.k])}); }
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
    const base = e.i != null ? film(e.i, e.date) : {t: md.t || String(e.t).replace(/\s*\(\d{4}\)\s*$/, ''), y: md.y || e.y, d: md.d || '', m: md.m || 0, p: ovp('tx:' + e.t) || fxTmdbImg(md.p) || pos('tx:' + e.t), l: '', tm: md.tm || 0, w: e.date};
    const mx = fxMeta(seen, fxMetaKey(D, e));
    return Object.assign(base, {id: fxEntryId(e.k), r: e.r || 0, h: e.l ? 1 : 0, rv: String(e.rv || '').slice(0, 20000), sp: e.sp ? 1 : 0, rw: e.rw ? 1 : 0,
      ww: String(e.ww || '').slice(0, 80), tg: String(e.tg || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 8)},
      mx ? {g: (mx.g || []).slice(0, 5), c: (mx.c || []).slice(0, 4), lg: mx.l || '', ca: (mx.a || []).slice(0, 6)} : {});
  });
  // the films with no diary entry, for the all-time stats only: no dates, no posters, no reviews
  if (seen['cfg:pubdiary'] !== '0') out.seen = fxWatched(D, seen).map(e => {
    const md = e.md || {}, mx = fxMeta(seen, fxMetaKey(D, e));
    const base = e.i != null ? {t: F[e.i][0], y: F[e.i][1], d: dir(e.i), m: F[e.i][3] || 0} : {t: md.t || String(e.t).replace(/\s*\(\d{4}\)\s*$/, ''), y: md.y || e.y, d: md.d || '', m: md.m || 0};
    if (e.i != null) base.p = pos(F[e.i][8]); else base.p = ovp('tx:' + e.t) || fxTmdbImg(md.p) || pos('tx:' + e.t);
    return Object.assign(base, {r: e.r || 0, h: e.l ? 1 : 0}, mx ? {g: (mx.g || []).slice(0, 5), c: (mx.c || []).slice(0, 4), lg: mx.l || '', ca: (mx.a || []).slice(0, 6)} : {});
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
  let F = D.F, W = D.W, WM = D.WM, SG = D.SG || [], NW = W.length, FA = D.faDir || {};
  let WK = fxCompact(D), KEYIDX = fxKeyIdx(D);
  const P = opts.posters || null, ST = opts.settings || null, LS = opts.list || null;
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
  const link = i => F[i][5] ? 'https://letterboxd.com/film/' + F[i][5] + '/' : F[i][16] ? 'https://letterboxd.com/tmdb/' + F[i][16] + '/' : 'https://letterboxd.com/search/films/' + encodeURIComponent(F[i][0] + ' ' + F[i][1]) + '/';
  const lbSearch = t => 'https://letterboxd.com/search/films/' + encodeURIComponent(t) + '/';
  const STK = {wl: 'ok', done: 'ok', dl: 'dl', need: 'need'};
  const dirName = i => L() === 'fa' ? F[i][2].split(', ').map(d => FA[d] || d).join('، ') : F[i][2];
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  let listAll = false, listRm = '', listNote = null, listBusy = '', lbBusy = '', bdPick = null;
  let shown = null, pickK = null, altOpen = {}, view = opts.startView && (opts.tabs || []).some(x => x.id === opts.startView) ? opts.startView : 'week', note = {}, picker = null, diaryYear = null, calOpen = false, tmTimer = null, flash = '';

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
  let SHORT;
  const shortMap = () => {
    const all = new Set(); F.forEach(f => f[2].split(', ').forEach(d => all.add(d)));
    const short = d => { const p = d.split(' '); if (p.length < 2) return d; if (p[0] === 'Apichatpong') return 'Apichatpong'; if (FAMILY_FIRST.has(p[0]) && p.length === 2 && /-|^[A-Z][a-z]+$/.test(p[1]) && !/^(Ozu)$/.test(p[0])) return p[0]; return p[p.length - 1]; };
    const count = {}, m = {};
    all.forEach(d => { const s2 = short(d); count[s2] = (count[s2] || 0) + 1; m[d] = s2; });
    all.forEach(d => { if (count[m[d]] > 1) m[d] = d; });
    return m;
  };
  SHORT = shortMap();
  function setPlan(nd) {
    D = nd; F = D.F; W = D.W; WM = D.WM; SG = D.SG || []; NW = W.length; FA = D.faDir || {};
    WK = fxCompact(D); KEYIDX = fxKeyIdx(D); SHORT = shortMap();
    if (shown !== null && shown > NW + 1) shown = null;
    render();
  }
  const firstDir = i => { const d = F[i][2].split(', ')[0]; return L() === 'fa' ? FA[d] || d : SHORT[d] || d; };
  function marathon(s) {
    const d = String(s).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).match(/(\d+)\D+(\d+)/);
    return d && +d[2] > 1 ? T().marathon(fa(d[1]), fa(d[2])) : '';
  }
  // a film's link: the site's own film page when it has one (opts.filmHref), Letterboxd otherwise
  const refOf = (i, text, md) => i != null ? {slug: F[i][5], tm: F[i][16] || 0, t: F[i][0], y: F[i][1]} : {tm: md && +md.tm || 0, t: (md && md.t) || String(text || '').replace(/\s*\((\d{4})\)\s*$/, ''), y: (md && +md.y) || fxYear(text)};
  const filmA = (i, text, md) => opts.filmHref ? `href="${esc(opts.filmHref(refOf(i, text, md)))}" data-app` : `href="${i != null ? link(i) : md && md.tm ? 'https://letterboxd.com/tmdb/' + encodeURIComponent(md.tm) + '/' : lbSearch(text)}" target="_blank" rel="noopener noreferrer"`;
  function titleLine(i, text, md) {
    if (i != null) return `<div class="fx-tl"><a class="fx-film" ${filmA(i)}>${esc(F[i][0])}</a><span class="fx-y">${F[i][1]}</span></div>`;
    const m = String(text).match(/^(.*?)\s*\((\d{4})\)\s*$/);
    return `<div class="fx-tl"><a class="fx-film" dir="auto" ${filmA(null, text, md)}>${esc(m ? m[1] : text)}</a>${m ? `<span class="fx-y">${m[2]}</span>` : ''}</div>`;
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
  function poster(i, title, md) {
    if (!posterOn()) return '';
    if (i == null && !title) return '<span class="fx-pos none" aria-hidden="true"></span>';
    const key = i != null ? KEY(i) : 'tx:' + title, t = i != null ? F[i][0] : title, y = i != null ? F[i][1] : fxYear(title);
    const ov = seen()['ps:' + key], src = ov ? fxTmdbImg(ov) : (i == null && md && md.p ? fxTmdbImg(md.p) : P.src(key));
    return `<a class="fx-pos" ${filmA(i, title, md)} tabindex="-1" aria-hidden="true"><img alt="" loading="lazy" decoding="async" data-pk="${esc(key)}" data-pt="${esc(t.replace(/\s*\(?\b(18|19|20)\d\d\b\)?\s*$/, ''))}" data-py="${y}"${src ? ` src="${src}"` : ''}><span class="fx-pt" dir="ltr">${esc(t)}</span></a>`;
  }
  const isCustom = k => /^(add|free|log):/.test(k);
  // a watched film's summary: stars, heart, rewatch, review, date. Tapping it opens the log sheet.
  function metaLine(ek) {
    const s = seen(), t = T(), date = isCustom(ek) ? s['v:' + ek] : s[ek];
    const r = +(s['r:' + ek] || 0), bits = starsText(ek) + (s['rw:' + ek] ? `<i class="fx-ico rw" title="${esc(t.rewatch)}"></i>` : '') + (s['rv:' + ek] ? `<i class="fx-ico rv" title="${esc(t.reviewed)}"></i>` : '');
    return `<button type="button" class="fx-meta" data-open="${esc(ek)}">${r || s['l:' + ek] || s['rv:' + ek] || s['rw:' + ek] ? bits : `<span class="fx-ask">${t.howWas}</span>`}${date ? `<span class="fx-mdate">${esc(pdate(date))}</span>` : ''}</button>`;
  }
  function starsText(rk) {
    const s = seen(), r = +(s['r:' + rk] || 0), l = !!s['l:' + rk];
    return (r ? `<span class="fx-mini" dir="ltr">${'★'.repeat(Math.floor(r / 2))}${r % 2 ? '½' : ''}</span>` : '') + (l ? `<i class="fx-ico lk" title="${esc(T().liked)}"></i>` : '');
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
  const tonightTag = k => pickK === k ? `<span class="fx-tonight">${T().tonightTag}</span>` : '';
  function card(w, it, n) {
    const s = seen(), t = T();
    if (it.add) {
      const done = itemSeen(it), rk = it.i != null ? KEY(it.i) : it.k;
      const orig = it.rp ? origTitle(it.rp) : '';
      const extra = esc(orig ? t.insteadOf(orig) : t.added);
      return `<li class="fx-i fx-add ${done ? 'done' : ''}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}">${poster(it.i, it.i == null ? it.title : '', it.i == null ? fxMd(seen(), it.k) : null)}
        <div class="fx-b">${tonightTag(it.k)}${titleLine(it.i, it.title, fxMd(s, it.k))}${subLine(it.i, fxMd(s, it.k))}${tagLine(it.i, '', extra)}${done ? metaLine(rk) : ''}</div>
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
        <div class="fx-b">${tonightTag(it.k)}${body}${alt}${done ? metaLine(rk) : ''}</div>
        ${actions(done, skipped, 'film')}</li>`;
    }
    const i = it.i, done = !!s[it.k], skipped = !done && !!s['sk:' + it.k];
    return `<li class="fx-i ${done ? 'done' : skipped ? 'skip' : ''}${pickK === it.k ? ' pick' : ''}" data-k="${esc(it.k)}">${poster(i)}
      <div class="fx-b">${tonightTag(it.k)}${titleLine(i)}${subLine(i)}${tagLine(i, it.lane)}${done ? metaLine(it.k) : ''}</div>
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
    if (!opts.openFull && !opts.fullView) return '';
    return `<footer class="fx-foot"><button type="button" class="fx-link" data-full>${t.full} →</button></footer>`;
  }
  function tabbar() {
    const t = T(), b = (v, label, extra) => `<button type="button" data-nav="${v}" aria-current="${view === v ? 'page' : 'false'}">${label}${extra || ''}</button>`;
    // a tab with {end: true} sits after Diary; with settingsGear, Settings is a gear at the top instead of a tab
    const tb = x => b(x.id, esc(x.label[L()] || x.label.en), x.dot && x.dot() ? '<i class="fx-ndot" aria-hidden="true"></i>' : '');
    const vis = (opts.tabs || []).filter(x => !x.hidden), extra = vis.filter(x => !x.end).map(tb).join(''), last = vis.filter(x => x.end).map(tb).join('');
    const plus = opts.quickLog ? `<button type="button" class="fx-tplus" data-qlog aria-label="${esc(t.logFilm.replace(/^\+\s*/, ''))}" title="${esc(t.logFilm.replace(/^\+\s*/, ''))}"><i aria-hidden="true"></i></button>` : '';
    return `<nav class="fx-tabbar${plus ? ' fx-hasplus' : ''}" aria-label="${esc(t.navWeek)} / ${esc(t.navDiary)}"><div>${opts.tabsFirst ? extra : ''}${b('week', t.navWeek)}${LS ? b('list', t.navList) : ''}${plus}${b('diary', t.navDiary)}${opts.tabsFirst ? '' : extra}${last}${ST && !opts.settingsGear ? b('settings', t.navSettings, syncDot()) : ''}</div></nav>`;
  }
  function gear() {
    if (!ST || !opts.settingsGear) return '';
    const t = T();
    return `<button type="button" class="fx-gear" data-nav="settings" aria-label="${esc(t.navSettings)}" title="${esc(t.navSettings)}" aria-current="${view === 'settings' ? 'page' : 'false'}"><i aria-hidden="true"></i>${syncDot()}</button>`;
  }
  function syncDot() {
    const st = ST.status();
    if (!st.connected) return '';
    return `<i class="fx-sd ${st.state === 'err' ? 'err' : st.state === 'busy' ? 'busy' : 'ok'}" aria-hidden="true"></i>`;
  }
  function pickerBox() {
    const t = T(), head = picker.bd ? t.bdPick : picker.list ? t.addToList : picker.fav != null ? t.favPick(fa(picker.fav + 1)) : picker.log ? t.logH : picker.replace ? t.replaceH(origTitle(picker.replace)) : t.addH;
    return `<div class="fx-picker fx-card"><div class="fx-pick-h">${esc(head)}</div>
      <input type="search" class="fx-pick-q" dir="auto" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(picker.list ? t.listPh : t.addPh)}" aria-label="${esc(picker.list ? t.listPh : t.addPh)}" value="${esc(picker.q || '')}">
      ${picker.note ? `<p class="fx-note ok">${esc(picker.note)}</p>` : ''}<ul class="fx-res">${pickerResults()}</ul><div class="fx-row"><button type="button" class="fx-link" data-pick-cancel>${t.cancel}</button></div></div>`;
  }
  function pickerResults() {
    const q = norm(picker.q || ''), t = T();
    if (q.length < 2) return '';
    const hits = [];
    for (let i = 0; i < F.length && hits.length < 60; i++) { const nt = norm(F[i][0]); if (nt.includes(q)) hits.push([nt.startsWith(q) ? 0 : 1, i]); }
    hits.sort((a, b) => a[0] - b[0] || F[a[1]][1] - F[b[1]][1]);
    const tmOn = posterOn(), top = hits.slice(0, tmOn ? 5 : 8);
    let h = (tmOn && top.length ? `<li class="fx-resh">${picker.list ? t.inList : t.inPlan}</li>` : '') + top.map(([, i]) => `<li><button type="button" class="fx-hit" ${picker.list ? 'disabled' : `data-pick-film="${i}"`}><span class="fx-film">${esc(F[i][0])}</span> <span class="fx-y">${F[i][1]}</span><span class="fx-hd"><bdi>${esc(dirName(i))}</bdi></span></button></li>`).join('');
    if (tmOn) {
      const seenTY = new Set(top.map(([, i]) => norm(F[i][0]) + '|' + F[i][1]));
      if (picker.tmq === picker.q && picker.tm) {
        const tm = picker.tm.filter(m => !seenTY.has(norm(m.t) + '|' + m.y));
        if (tm.length) h += `<li class="fx-resh">${t.fromTmdb}</li>` + tm.map((m, k) => `<li><button type="button" class="fx-hit fx-tmhit" data-pick-tm="${picker.tm.indexOf(m)}">${m.p ? `<img alt="" src="${fxTmdbImg(m.p)}">` : '<span class="fx-tmph"></span>'}<span><span class="fx-film">${esc(m.t)}</span> <span class="fx-y">${m.y || ''}</span></span></button></li>`).join('');
      } else h += `<li class="fx-muted fx-resh">${t.searching}</li>`;
    } else if (!hits.length) h += `<li class="fx-muted">${t.noMatch}</li>`;
    if (picker.fav == null && !picker.bd) h += `<li><button type="button" class="fx-hit fx-asis" data-pick-text>${esc(t.addAsIs((picker.q || '').trim()))}</button></li>`;
    return h;
  }
  // ---------- a personal list (template edition): weeks of n films, reorder, remove, add, import ----------
  function renderList() {
    const t = T(), s = seen(), n = F.length, nw = W.length, cur = Math.min(fxCur(WK, s), Math.max(nw, 1));
    let h = `<header class="fx-head"><div class="fx-eye">${esc(t.listEye(fa(n), fa(nw)))}</div><h1 class="fx-h1">${t.listH}</h1></header>`;
    const pw = D.perWeek || 3;
    h += `<div class="fx-lbar"><div class="fx-row">${picker && picker.list ? '' : `<button type="button" class="fx-btn primary" data-ladd>${t.listAdd}</button>`}<label class="fx-btn fx-file">${t.listImport}<input type="file" accept=".csv,text/csv" data-limport></label></div>
      <div class="fx-step" role="group" aria-label="${esc(t.perWeekL)}"><span>${t.perWeekL}</span><button type="button" data-lpw="-1" aria-label="−"${pw <= 1 ? ' disabled' : ''}>−</button><b>${fa(pw)}</b><button type="button" data-lpw="1" aria-label="+"${pw >= 14 ? ' disabled' : ''}>+</button></div></div>`;
    if (listBusy) h += `<p class="fx-note" data-lprog>${esc(listBusy)}</p>`;
    else if (listNote) h += `<p class="fx-note ${listNote[0]}">${esc(listNote[1])}</p>`;
    if (picker && picker.list) h += pickerBox();
    if (!n) return h + `<p class="fx-muted">${t.listEmpty}</p><p class="fx-muted fx-small">${t.importHelp}</p>`;
    if (cur > 1) h += `<p class="fx-muted fx-small">${esc(t.pastWeeks(fa(cur - 1)))}</p>`;
    const last = listAll ? nw : Math.min(nw, cur + 5), first = W[0] && W[0][0] ? W[0][0][1] : 0, lastI = n - 1;
    for (let w = cur; w <= last; w++) {
      h += `<section class="fx-lweek"><h3 class="fx-month">${esc(t.wkLabel(fa(w)))}${w === cur ? ` <span class="fx-lnow">· ${t.thisWeekL}</span>` : ''}</h3><ul class="fx-dl fx-ll">`;
      W[w - 1].forEach(it => {
        const i = it[1], k = KEY(i), watched = !!s[k];
        const acts = watched ? `<span class="fx-chk on" aria-label="${esc(t.watched || '')}"></span>`
          : `<button type="button" class="fx-lb" data-lmove="-1" aria-label="${esc(t.moveUp)}"${i === first ? ' disabled' : ''}>↑</button><button type="button" class="fx-lb" data-lmove="1" aria-label="${esc(t.moveDown)}"${i === lastI ? ' disabled' : ''}>↓</button><button type="button" class="fx-lb rm${listRm === k ? ' armed' : ''}" data-lrm aria-label="${esc(t.removeL)}">${listRm === k ? t.removeL2 : '×'}</button>`;
        h += `<li class="fx-de fx-li${watched ? ' done' : ''}" data-lk="${esc(k)}">${posterOn() ? poster(i) : ''}<div class="fx-b">${titleLine(i)}${subLine(i)}</div><div class="fx-lacts">${acts}</div></li>`;
      });
      h += '</ul></section>';
    }
    if (last < nw) h += `<div class="fx-row"><button type="button" class="fx-link" data-lall>${esc(t.showAllWeeks(fa(nw)))}</button></div>`;
    return h;
  }
  async function lbImport(files) {
    const t = T();
    if (!files.length || !opts.letterboxd) return;
    lbBusy = t.lbWorking('0', '…'); delete note.lb; render();
    const prog = (d, n) => { lbBusy = t.lbWorking(fa(d), fa(n)); const el = root.querySelector('[data-lbprog]'); if (el) el.textContent = lbBusy; };
    let r;
    try { r = await opts.letterboxd.importFiles(files, prog); } catch (e) { r = {bad: true}; }
    lbBusy = '';
    note.lb = r.bad ? ['bad', t.lbBad] : ['ok', t.lbDone(fa(r.added), fa(r.ticked), fa(r.merged), r.liked ? fa(r.liked) : '', r.undated ? fa(r.undated) : '')];
    render();
  }
  async function listImport(file) {
    const t = T();
    if (!file || !LS) return;
    let text = '';
    try { text = await file.text(); } catch (e) { listNote = ['bad', t.importBad]; render(); return; }
    const progress = (d, n) => { listBusy = t.importing(fa(d), fa(n)); const el = root.querySelector('[data-lprog]'); if (el) el.textContent = listBusy; };
    listBusy = t.importing(fa(0), '…'); listNote = null; render();
    let r;
    try { r = await LS.importFile(text, file.name, progress); } catch (e) { r = {kind: 'unknown'}; }
    listBusy = '';
    if (r.kind === 'list') listNote = ['ok', t.imported(fa(r.added), r.skipped ? fa(r.skipped) : '')];
    else if (r.kind === 'diary') listNote = ['ok', t.importedDiary(fa(r.added), r.skipped ? fa(r.skipped) : '', r.updated ? fa(r.updated) : '')];
    else listNote = ['bad', r.kind === 'nodates' ? t.importNoDates : t.importBad];
    render();
  }
  function renderWeek() {
    const cur = fxCur(WK, seen()), t = T();
    if (shown === null || shown > cur) shown = cur;
    const w = shown;
    let h = '';
    if (LS && (w > NW || !F.length)) return `<section class="fx-rest"><h1 class="fx-h1">${F.length ? t.end : t.listH}</h1><p>${F.length ? t.listAllDone : t.listEmpty}</p><div class="fx-row"><button type="button" class="fx-btn primary" data-golist>${t.listAdd}</button></div></section>`;
    if (w > NW) return `<section class="fx-rest"><h1 class="fx-h1">${t.end}</h1><p>${t.endP}</p></section>`;
    const m = WM[w - 1], list = itemsOf(w);
    const finished = w < cur;
    const th = m.th ? (L() === 'fa' ? m.th : FX_TH_EN[m.th] || m.th) : '';
    const rt = list.reduce((a, it) => { const i = it.free ? (seen()[it.k] && !String(seen()[it.k]).startsWith('k:') ? null : sugFor(w, it.n)) : it.i; return a + (i != null && !seen()['sk:' + it.k] ? F[i][3] || 0 : 0); }, 0);
    const eye = list.length ? `<div class="fx-eye">${esc(t.eyebrow(fa(list.filter(itemSeen).length), fa(list.filter(it => !seen()['sk:' + it.k]).length), rt ? (L() === 'fa' ? t.hm(rt).replace(/\d+/g, d => fa(d)) : t.hm(rt)) : ''))}</div>` : '';
    h += `<header class="fx-head">${eye}<div class="fx-hrow"><h1 class="fx-h1">${finished ? t.weekDone : t.thisWeek}</h1>${th && !m.free ? `<span class="fx-th">${esc(t.surprise(th))}</span>` : ''}</div>${m.free && !list.length ? '' : dots(list)}${opts.fullView && !LS && t.planLink ? `<button type="button" class="fx-link fx-planlink" data-full>${esc(t.planLink(fa(w), fa(NW)))}</button>` : ''}</header>`;
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
    return h;
  }
  function postText(e) {
    const t = T(), r = e.r, i = e.i;
    const stars = r ? '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '') : '';
    const head = (i != null ? F[i][0] + ' (' + F[i][1] + ') — ' + dirName(i) : e.t + (e.md && e.md.d ? ' — ' + e.md.d : ''));
    const sid = seen()['cfg:share'], url = sid && ST && ST.shareUrl && e.k ? ST.shareUrl(sid, fxEntryId(e.k)) : '';
    return [head, [stars, e.l ? '♥' : '', e.rw ? '↻' : '', e.ww ? T().withShort(e.ww) : ''].filter(Boolean).join(' '), e.rv ? (e.sp ? '⚠️ ' + T().spoilers + '\n\n' : '') + e.rv : '', url].filter(Boolean).join('\n\n');
  }
  function renderDiary() {
    const t = T(), all = fxDiary(D, seen()), jal = typeof fxJalOn === 'function' && fxJalOn(L(), seen()), yOf = ds => jal ? fxYearOf(ds, true) : ds.slice(0, 4);
    const years = [...new Set(all.map(e => yOf(e.date)))].sort().reverse(), ty = yOf(today());
    if (diaryYear === null || (diaryYear !== 'all' && !years.includes(diaryYear))) diaryYear = years.length > 1 ? (years.includes(ty) ? ty : years[0]) : 'all';
    const list = diaryYear === 'all' ? all : all.filter(e => yOf(e.date) === diaryYear);
    const mins = list.reduce((a, e) => a + (e.i != null ? F[e.i][3] || 0 : (e.md && +e.md.m) || 0), 0), rated = list.filter(e => e.r);
    const avg = rated.length ? (rated.reduce((a, e) => a + e.r, 0) / rated.length / 2).toFixed(1) : '';
    const hmFa = m => L() === 'fa' ? t.hm(m).replace(/\d+/g, d => fa(d)) : t.hm(m);
    const nfmt = n => L() === 'fa' ? fa(n) : Number(n).toLocaleString('en-US');
    let h = `<header class="fx-head">${all.length ? `<div class="fx-eye">${esc(t.diaryEye(nfmt(list.length), hmFa(mins).replace(/\b\d{4,}\b/g, n => L() === 'fa' ? n : Number(n).toLocaleString('en-US')), avg ? (L() === 'fa' ? fa1(+avg) : avg) : ''))}</div>` : ''}<div class="fx-hrow"><h1 class="fx-h1">${t.diaryH}</h1></div>${opts.diaryNav ? opts.diaryNav('diary') : ''}</header>`;
    h += picker && picker.log ? pickerBox() : `<div class="fx-act"><button type="button" class="fx-btn" data-log>${t.logFilm}</button></div>`;
    if (all.length && typeof fxCalendar === 'function') h += `<details class="fx-more fx-calwrap"${calOpen ? ' open' : ''}><summary>${t.calH}</summary>${fxCalendar(all.map(e => e.date), diaryYear === 'all' || diaryYear === null ? 'all' : diaryYear, L(), today(), FX_CAL_L[L()], jal)}</details>`;
    if (years.length > 1) h += `<nav class="fx-years">${years.concat('all').map(y => `<button type="button" data-year="${y}" aria-pressed="${diaryYear === y}">${y === 'all' ? t.allYears : fa(y).replace(/[٬,]/g, '')}</button>`).join('')}</nav>`;
    if (!all.length) return h + `<p class="fx-muted">${t.diaryEmpty}</p>`;
    // your year in film (wrapped.js), for a year with a few films in it
    if (opts.wrapped && diaryYear !== 'all' && list.length >= 3) h += `<button type="button" class="fx-wbtn" data-wrapped="${esc(diaryYear)}">Your ${esc(diaryYear)} in film →</button>`;
    // a list, or a wall of posters
    const grid = posterOn() && seen()['cfg:dview'] === 'grid';
    if (posterOn()) h += `<div class="fx-years fx-seg fx-dview" role="group">${[['list', t.dvList || 'List'], ['grid', t.dvGrid || 'Posters']].map(([v, l]) => `<button type="button" data-dview="${v}" aria-pressed="${(v === 'grid') === grid}">${l}</button>`).join('')}</div>`;
    const mf = new Intl.DateTimeFormat(L() === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {month: 'long', year: 'numeric'});
    const dayN = new Intl.DateTimeFormat(L() === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {day: 'numeric'});
    let month = '';
    h += '<div class="fx-diary">';
    list.forEach(e => {
      const d = new Date(e.date + 'T12:00:00'), mk = mf.format(d);
      if (mk !== month) { if (month) h += '</ul>'; month = mk; h += `<h2 class="fx-mon">${esc(mk)}</h2><ul class="${grid ? 'fx-dgrid' : 'fx-dl'}">`; }
      if (grid) {
        const img = poster(e.i, e.i == null ? e.t : '', e.md).replace(/^<a class="fx-pos"[^>]*>/, '<span class="fx-pos" aria-hidden="true">').replace(/<\/a>$/, '</span>');
        const name = e.i != null ? F[e.i][0] : String(e.t || '').replace(/\s*\(\d{4}\)\s*$/, '');
        h += `<li><button type="button" class="fx-gcell" data-open="${esc(e.k)}" title="${esc(name)}" aria-label="${esc(name)}">${img}<span class="fx-gday">${dayN.format(d)}</span></button><div class="fx-gmeta">${e.r ? `<span class="fx-mini" dir="ltr">${'★'.repeat(Math.floor(e.r / 2))}${e.r % 2 ? '½' : ''}</span>` : ''}${e.l ? '<i class="fx-ico lk"></i>' : ''}${e.rw ? '<i class="fx-ico rw"></i>' : ''}${e.rv ? '<i class="fx-ico rv"></i>' : ''}</div></li>`;
        return;
      }
      const meta = e.r || e.l || e.rv || e.rw || e.ww || e.tg ? `<div class="fx-dm">${starsText(e.k)}${e.rw ? `<i class="fx-ico rw" title="${esc(t.rewatch)}"></i>` : ''}${e.rv ? `<i class="fx-ico rv" title="${esc(t.reviewed)}"></i>` : ''}${e.ww ? `<span class="fx-ww">${esc(t.withShort(e.ww))}</span>` : ''}${e.tg ? e.tg.split(',').map(x => x.trim()).filter(Boolean).slice(0, 6).map(x => `<span class="fx-tagc">${esc(x)}</span>`).join('') : ''}</div>` : '';
      h += `<li class="fx-de fx-tap" data-dk="${esc(e.k)}"><span class="fx-dday">${dayN.format(d)}</span>${posterOn() ? poster(e.i, e.i == null ? e.t : '', e.md) : ''}
        <div class="fx-b">${titleLine(e.i, e.t, e.md)}${subLine(e.i, e.md)}${meta}</div>
        <div class="fx-acts"><button type="button" class="fx-link fx-al" data-open="${esc(e.k)}">${t.edit}</button></div></li>`;
    });
    h += '</ul></div>';
    return h;
  }
  function bdField() {
    const t = T(), bd = fxBd(seen());
    let h = bd ? `<div class="fx-bdprev"><img alt="" src="${fxTmdbBd(bd.p, 'w780')}"><span>${esc(bd.t || '')}${bd.y ? ' (' + bd.y + ')' : ''}</span></div>` : '';
    if (picker && picker.bd) h += pickerBox();
    else if (bdPick) {
      h += `<div class="fx-pph"><span class="fx-eye">${esc(t.bdFrom(bdPick.t))}</span><button type="button" class="fx-link" data-bdclose>${t.cancel}</button></div>`;
      if (bdPick.loading) h += `<p class="fx-muted">${t.imgsLoading}</p>`;
      else if (bdPick.err) h += `<p class="fx-note bad">${t.imgsFail}</p>`;
      else if (!bdPick.list.length) h += `<p class="fx-muted">${t.bdNone}</p>`;
      else h += `<div class="fx-bdgrid">${bdPick.list.map(x => `<button type="button" class="fx-bdg${bd && bd.p === x ? ' on' : ''}" data-bdpick="${esc(x)}"><img alt="" loading="lazy" src="${fxTmdbBd(x, 'w300')}"></button>`).join('')}</div>`;
    } else h += `<div class="fx-row"><button type="button" class="fx-btn" data-bdopen${posterOn() ? '' : ' disabled'}>${bd ? t.bdChange : t.bdChoose}</button>${bd ? `<button type="button" class="fx-link" data-bdrm>${t.bdRemove}</button>` : ''}</div>`;
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
      return `<div class="fx-fav"><button type="button" class="fx-favb" data-fav="${n}" title="${esc(title)}">${img}<span class="fx-favt">${esc(title)}</span></button><span class="fx-favc" dir="auto">${esc(title)}</span><button type="button" class="fx-link fx-al" data-favrm="${n}">${t.favRemove}</button></div>`;
    }).join('');
  }
  function renderSettings() {
    const st = ST.status(), tm = seen()['cfg:tmdb'], t = T(), lang = L();
    const msg = k => note[k] ? `<p class="fx-note ${note[k][0]}">${esc(note[k][1])}</p>` : '';
    let h = `<header class="fx-head"><div class="fx-hrow"><h1 class="fx-h1">${t.settings}</h1></div></header>`;
    if (opts.plan) h += `<section class="fx-card"><h2>${t.planH}</h2><p>${esc(D.kind === 'list' ? t.planList(fa(F.length)) : opts.plan.own ? t.planOwn(fa(F.length)) : t.planSample)}</p><div class="fx-row"><button type="button" class="fx-link${note.planReset ? ' fx-warn' : ''}" data-plan-reset>${note.planReset ? t.planReset2 : t.planReset}</button></div></section>`;
    if (ST.shareOn) {
      const sid = seen()['cfg:share'];
      h += `<section class="fx-card"><h2>${t.shareH}</h2>`;
      if (!st.connected) h += `<p class="fx-muted">${t.shareNeedSync}</p>`;
      else {
        if (sid) h += `<div class="fx-field"><span>${t.linkL}</span><pre class="fx-pre fx-link-pre" dir="ltr">${esc(ST.shareUrl(sid).replace(/^https:\/\//, '').replace(/\/$/, ''))}</pre><div class="fx-row"><button type="button" class="fx-btn primary" data-share-copy>${t.shareCopy}</button>${ST.previewUrl ? `<a class="fx-btn" href="${esc(ST.previewUrl(sid))}" target="_blank" rel="noopener">${t.preview}</a>` : ''}</div></div>`;
        h += `<p class="fx-muted">${sid ? t.shareOnP : t.shareOffP}</p>
          <div class="fx-field"><span>${t.bdH}</span><p class="fx-muted">${t.bdP}</p>${bdField()}</div>
          <div class="fx-field"><span>${t.favH}</span><p class="fx-muted">${t.favP}</p><div class="fx-favs">${favTiles()}</div>${picker && picker.fav != null ? pickerBox() : ''}</div>
          <label class="fx-field"><span>${t.nameL}</span><input type="text" data-cfg="cfg:name" maxlength="60" dir="auto" placeholder="${esc(t.namePh)}" value="${esc(seen()['cfg:name'] || '')}"></label>
          <div class="fx-field"><span>${t.linksL}</span><div class="fx-links-ed">${[['lb', 'cfg:lb', 'text'], ['tg', 'cfg:channel', 'url'], ['sp', 'cfg:sp', 'url'], ['ig', 'cfg:ig', 'url'], ['web', 'cfg:web', 'url']].map(([k, ck, ty]) => `<label><span>${t.links[k][0]}</span><input type="${ty}" data-cfg="${ck}" dir="ltr" autocapitalize="off" spellcheck="false" placeholder="${esc(t.links[k][1])}" value="${esc(seen()[ck] || '')}"></label>`).join('')}</div></div>
          <label class="fx-check"><input type="checkbox" data-pubdiary${seen()['cfg:pubdiary'] !== '0' ? ' checked' : ''}> ${t.pubDiary}</label>
          <div class="fx-row"><button type="button" class="fx-btn primary" data-cfg-save>${t.cfgSave}</button>${msg('cfg')}</div>`;
        if (sid) h += `<div class="fx-row"><button type="button" class="fx-link" data-share-off>${t.shareStop}</button></div>`;
        else h += `<div class="fx-row"><button type="button" class="fx-btn primary" data-share-on>${t.shareMake}</button></div>`;
      }
      h += msg('share') + `</section>`;
    }
    if (opts.letterboxd) {
      const ls = opts.letterboxd.status();
      h += `<section class="fx-card"><h2>${t.lbH}</h2><p class="fx-muted">${t.lbP}</p>
        <div class="fx-row"><label class="fx-btn fx-file">${t.lbPick}<input type="file" accept=".zip,.csv,application/zip,text/csv" multiple data-lbimport></label></div>
        ${lbBusy ? `<p class="fx-note busy" data-lbprog>${esc(lbBusy)}</p>` : msg('lb')}
        ${opts.letterboxd.friends ? `<label class="fx-field"><span>${t.lbfL}</span><input type="text" data-cfg="cfg:lbf" dir="ltr" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="username, another_one" value="${esc(seen()['cfg:lbf'] || '')}"></label><p class="fx-muted fx-small">${t.lbfP}</p>` : ''}
        <p class="fx-muted fx-small">${ls.at ? esc(t.lbAuto(ago(Date.parse(ls.at)), ls.n ? fa(ls.n) : '')) : t.lbAutoOff}</p></section>`;
    }
    if (!opts.noLang) h += `<section class="fx-card"><h2>${t.langH}</h2><div class="fx-row"><button type="button" class="fx-btn${lang === 'en' ? ' primary' : ''}" data-lang="en">English</button><button type="button" class="fx-btn${lang === 'fa' ? ' primary' : ''}" data-lang="fa">فارسی</button></div><p class="fx-muted">${t.langNote}</p>${lang === 'fa' && typeof FX_JF !== 'undefined' && FX_JF ? `<div class="fx-field"><span>تقویم</span><div class="fx-row"><button type="button" class="fx-btn${seen()['cfg:cal'] !== 'g' ? ' primary' : ''}" data-cal="j">شمسی</button><button type="button" class="fx-btn${seen()['cfg:cal'] === 'g' ? ' primary' : ''}" data-cal="g">میلادی</button></div></div>` : ''}</section>`;
    if (opts.settingsExtra) h += opts.settingsExtra(lang);
    if (ST.kind === 'cloud') {
      h += `<section class="fx-card"><h2>${t.acctH}</h2><p>${esc(t.acctOn(st.login))} ${st.state === 'err' ? `<span class="fx-bad">${esc(st.msg || '')}</span>` : st.state === 'busy' ? t.syncBusy : st.at ? esc(t.syncAt(ago(st.at))) : ''}</p>
        <div class="fx-row"><button type="button" class="fx-btn" data-sync-now>${t.syncNow}</button><button type="button" class="fx-btn" data-dl-data>${t.dlData}</button><button type="button" class="fx-link" data-disconnect>${t.signOut}</button></div>${msg('gh')}
        <details class="fx-more"><summary>${t.pwH}</summary><form class="fx-form fx-pwform" data-pw><input type="password" name="cur" autocomplete="current-password" dir="ltr" placeholder="${esc(t.pwCur)}" aria-label="${esc(t.pwCur)}" required><input type="password" name="next" autocomplete="new-password" minlength="8" dir="ltr" placeholder="${esc(t.pwNew)}" aria-label="${esc(t.pwNew)}" required><button type="submit" class="fx-btn">${t.pwSave}</button></form>${msg('pw')}</details>
        <details class="fx-more"><summary>${t.delH}</summary><p class="fx-muted">${t.delP}</p><form class="fx-form" data-del><input type="password" name="pw" autocomplete="current-password" dir="ltr" placeholder="${esc(t.delPw)}" aria-label="${esc(t.delPw)}" required><button type="submit" class="fx-btn fx-danger">${note.delSure ? t.delSure : t.delGo}</button></form>${msg('del')}</details></section>`;
    } else {
    h += `<section class="fx-card"><h2>${t.syncH}</h2>`;
    if (st.connected) {
      h += `<p>${esc(t.syncOn(st.login))} ${st.state === 'err' ? `<span class="fx-bad">${esc(st.msg || '')}</span>` : st.state === 'busy' ? t.syncBusy : st.at ? esc(t.syncAt(ago(st.at))) : ''}</p>
        <div class="fx-row"><button type="button" class="fx-btn" data-sync-now>${t.syncNow}</button><button type="button" class="fx-link" data-disconnect>${t.disconnect}</button></div>`;
    } else {
      h += `<p>${t.syncIntro}</p><ol class="fx-steps">${t.syncSteps.map(s => `<li>${s}</li>`).join('')}</ol>
        <form class="fx-form" data-gh><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" placeholder="ghp_…" aria-label="GitHub token" required><button type="submit" class="fx-btn primary">${t.connect}</button></form>`;
    }
    h += msg('gh') + `<p class="fx-muted">${t.tokenNote}</p></section>`;
    }
    if (P && P.proxied && P.proxied()) h += `<section class="fx-card"><h2>${t.postersH}</h2><p class="fx-muted">${t.postersSite}</p><p class="fx-muted" dir="ltr">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section>`;
    else if (P) {
      h += `<section class="fx-card"><h2>${t.postersH}</h2>`;
      if (tm) h += `<p>${t.postersOn}${P.failed() ? ` <span class="fx-bad">${t.postersBad}</span>` : ''}</p><div class="fx-row"><button type="button" class="fx-link" data-tmdb-clear>${t.removeKey}</button></div>`;
      else h += `<p>${t.postersIntro}</p><ol class="fx-steps">${t.postersSteps.map(s => `<li>${s}</li>`).join('')}</ol>
        <form class="fx-form" data-tmdb><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" placeholder="eyJ…" aria-label="TMDB token" required><button type="submit" class="fx-btn primary">${t.save}</button></form>`;
      h += msg('tmdb') + `<p class="fx-muted" dir="ltr">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section>`;
    }
    h += `<section class="fx-card"><h2>${t.bkH}</h2><p class="fx-muted">${t.bkP}</p>
      <div class="fx-row"><button type="button" class="fx-btn" data-bk-copy>${t.bkCopy}</button><button type="button" class="fx-btn" data-dl-all>${t.dlAll}</button></div>
      <form class="fx-form" data-bk><input type="text" autocomplete="off" dir="ltr" placeholder="${esc(t.bkPh)}" aria-label="${esc(t.bkPh)}" required><button type="submit" class="fx-btn">${t.bkLoad}</button></form>${msg('bk')}</section>`;
    return h;
  }
  function applyLang() {
    const lang = L();
    try { document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'; } catch (e) {}
  }
  let viewShown = null, pickShown = false, routing = false;
  function render() {
    applyLang();
    if (!valid(view)) view = 'week';
    const xt = (opts.tabs || []).find(x => x.id === view);
    let html = view === 'settings' && ST ? renderSettings() : view === 'diary' ? renderDiary() : view === 'list' && LS ? renderList() : xt ? xt.view(L()) : renderWeek();
    // the + in the bar: log a film from wherever you are
    if (picker && picker.log && view !== 'diary') html = `<section class="fx-card fx-qlog">${pickerBox()}</section>` + html;
    const bd = view === 'week' ? fxBd(seen()) : null;
    root.innerHTML = `<div class="fx fx-app${posterOn() ? ' fx-hasp' : ''}${bd ? ' fx-withbd' : ''}" dir="${L() === 'fa' ? 'rtl' : 'ltr'}" lang="${L()}">${bd ? `<div class="fx-hero" aria-hidden="true"><img alt="" src="${fxTmdbBd(bd.p)}"></div>` : ''}${gear()}${html}${view === 'week' ? foot() : ''}${tabbar()}</div>`;
    if (flash) { const el = root.querySelector('[data-dk="' + CSS.escape(flash) + '"], .fx-i[data-ek="' + CSS.escape(flash) + '"]'); flash = ''; if (el) { el.classList.add('hl'); el.scrollIntoView({block: 'nearest'}); } }
    if (posterOn()) P.fill(root);
    if (picker) { const q = root.querySelector('.fx-pick-q'); if (q && picker.focus) { q.focus(); const n = q.value.length; q.setSelectionRange(n, n); picker.focus = false; } }
    if (xt && xt.after) xt.after(root);
    if (view !== viewShown) { const was = viewShown; viewShown = view; if (was !== null && !routing && opts.onView) opts.onView(view); }
    // an open picker (the + box, adding a film to a week) is closed by Back
    if (!!picker !== pickShown) { pickShown = !!picker; if (opts.modal) { if (pickShown) opts.modal.open('pick', () => { picker = null; render(); }); else opts.modal.close('pick'); } }
  }
  function valid(v) { return v === 'week' || v === 'diary' || (v === 'settings' && !!ST) || (v === 'list' && !!LS) || (opts.tabs || []).some(x => x.id === v); }
  // show a screen because the site's address asks for it (Back, a link): no new history step
  function go(v) {
    const was = (opts.tabs || []).find(x => x.id === view); if (was && was.left && v !== view) was.left();
    if (sheet) closeSheet(true);
    routing = true;
    view = valid(v) ? v : 'week'; note = {}; picker = null; listNote = null; listRm = ''; if (view === 'week') shown = null;
    render();
    routing = false;
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
  function newLog(val, md, date) {
    const id = 'log:' + Date.now().toString(36);
    S.set(id, val); S.set('v:' + id, date);
    if (md) { S.set('md:' + id, JSON.stringify(md)); if (P && md.p) P.put('tx:' + val.slice(2), md.p); }
    return id;
  }
  function pick(val, md) {
    if (picker.bd) {
      // a film for the backdrop: its stills from TMDB
      const i = val.startsWith('k:') ? KEYIDX[val.slice(2)] : null;
      const ref = i != null ? {t: F[i][0], y: F[i][1], tm: F[i][16] || 0} : {t: (md && md.t) || val.slice(2), y: (md && md.y) || 0, tm: (md && md.tm) || 0};
      picker = null; bdPick = {t: ref.t, y: ref.y, loading: true, list: []};
      loadImages(ref).then(r => { if (bdPick) { bdPick = {t: ref.t, y: ref.y, list: r.backdrops}; render(); } }, () => { if (bdPick) { bdPick.loading = false; bdPick.err = true; render(); } });
      return;
    }
    if (picker.list) {
      const title = md && md.t ? md.t : val.slice(2).replace(/\s*\(\d{4}\)\s*$/, '');
      if (val.startsWith('t:')) LS.add(md ? {t: md.t, y: md.y, d: md.d, m: md.m, p: md.p, tm: md.tm} : {t: title, y: +(val.match(/\((\d{4})\)\s*$/) || [])[1] || 0});
      picker = {q: '', focus: true, list: true, note: T().addedL(title)};
      return;
    }
    const keepMd = key => { if (md) { S.set('md:' + key, JSON.stringify(md)); if (P && md.p) P.put('tx:' + val.slice(2), md.p); } };
    if (picker.fav != null) {
      if (val.startsWith('k:')) setFav(picker.fav, {k: val.slice(2)});
      else setFav(picker.fav, md ? {t: md.t, y: md.y, d: md.d, p: md.p, tm: md.tm} : {t: val.slice(2)});
      picker = null; return;
    }
    if (picker.log) {
      // nothing is written until the sheet is saved
      picker = null;
      if (val.startsWith('k:')) {
        const fk = val.slice(2), i = KEYIDX[fk];
        if (!seen()[fk]) openSheet({info: {i}, create: date => { S.set(fk, date); S.set('sk:' + fk, null); return fk; }});
        else openSheet({info: {i}, rw: true, create: date => newLog(val, null, date)});  // seen before: a rewatch
      } else openSheet({info: {t: val.slice(2), md: md || null}, create: date => newLog(val, md, date)});
      return;
    }
    const a = 'add:' + shown + ':' + Date.now().toString(36);
    S.set(a, val); keepMd(a);
    if (picker.replace) { S.set('rp:' + a, picker.replace); S.set('sk:' + picker.replace, today()); }
    picker = null;
  }

  // ---------- the log sheet (Letterboxd's "I watched…" screen): date, rewatch, rating, like, review, spoilers, company, tags ----------
  const sheetEl = typeof document !== 'undefined' && document.body ? document.body.appendChild(document.createElement('div')) : null;
  if (sheetEl) { sheetEl.className = 'fx-sheetwrap'; sheetEl.hidden = true; }
  let sheet = null, delTimer = null;
  const splitTags = v => String(v || '').split(/[,،\n]/).map(x => x.trim().replace(/\s+/g, ' ').replace(/^#/, '').slice(0, 32)).filter(Boolean);
  function infoOf(ek) {
    const s = seen();
    if (KEYIDX[ek] !== undefined) return {i: KEYIDX[ek]};
    const v = String(s[ek] || '');
    if (v.startsWith('k:') && KEYIDX[v.slice(2)] !== undefined) return {i: KEYIDX[v.slice(2)]};
    return {t: v.replace(/^t:/, ''), md: fxMd(s, ek)};
  }
  function usedTags() {
    const c = {};
    Object.entries(seen()).forEach(([k, v]) => { if (k.startsWith('tg:') && v) splitTags(v).forEach(x => { const q = x.toLowerCase(); c[q] = c[q] || [x, 0]; c[q][1]++; }); });
    return Object.values(c).sort((a, b) => b[1] - a[1]).map(a => a[0]);
  }
  function seenBefore(f) {
    if (!f) return false;
    const all = fxDiary(D, seen());
    if (f.i != null) return all.some(e => e.i === f.i);
    const md = f.md || {}, key = norm(md.t || String(f.t || '').replace(/\s*\(\d{4}\)\s*$/, ''));
    return !!key && all.some(e => (e.md && e.md.tm && md.tm ? e.md.tm === md.tm : norm(e.i != null ? F[e.i][0] : String(e.t).replace(/\s*\(\d{4}\)\s*$/, '')) === key));
  }
  const draftKey = d => JSON.stringify([d.date, d.r, d.l, d.rv.trim(), d.sp, d.rw, d.ww.trim(), d.tg, d.tq.trim()]);
  function openSheet(o) {
    if (!sheet && opts.modal) opts.modal.open('sheet', sheetBack);
    const s = seen(), ek = o.ek || null;
    const d = ek ? {date: (isCustom(ek) ? s['v:' + ek] : s[ek]) || today(), r: +(s['r:' + ek] || 0), l: !!s['l:' + ek], rv: s['rv:' + ek] || '', sp: !!s['sp:' + ek], rw: !!s['rw:' + ek], ww: s['ww:' + ek] || '', tg: splitTags(s['tg:' + ek]), tq: ''}
      : {date: today(), r: 0, l: false, rv: '', sp: false, rw: !!o.rw || seenBefore(o.info), ww: '', tg: [], tq: ''};
    sheet = {ek, create: o.create || null, info: o.info || infoOf(ek), d, init: '', del: false, discard: false, note: '', more: !!(d.ww || d.tg.length || d.sp)};
    sheet.init = draftKey(d);
    renderSheet();
    const body = sheetEl && sheetEl.querySelector('.fx-shbody'); if (body) body.scrollTop = 0;
  }
  function sheetBack() {
    if (!sheet) return true;
    if (sheet.pp) { sheet.pp = null; renderSheet(); return false; }
    readSheetInputs();
    if (!sheet.discard && draftKey(sheet.d) !== sheet.init) { sheet.discard = true; renderSheet(); return false; }
    closeSheet(true); return true;
  }
  function closeSheet(byBack) {
    if (sheet && !byBack && opts.modal) opts.modal.close('sheet');
    sheet = null; clearTimeout(delTimer);
    if (sheetEl) { sheetEl.hidden = true; sheetEl.innerHTML = ''; }
    document.documentElement.classList.remove('fx-lock');
  }
  function sheetFilm() {
    const f = sheet.info, i = f.i;
    let title, year, sub = [], key = '', src = '';
    if (i != null) { title = F[i][0]; year = F[i][1]; sub = [dirName(i), F[i][3] ? hmin(F[i][3]) : '']; key = KEY(i); }
    else {
      const md = f.md || {}, m = String(f.t || '').match(/^(.*?)\s*\((\d{4})\)\s*$/);
      title = md.t || (m ? m[1] : f.t || ''); year = md.y || (m ? m[2] : ''); sub = [md.d || '', md.m ? hmin(+md.m) : ''];
      src = fxTmdbImg(md.p); key = 'tx:' + (f.t || '');
    }
    let img = '';
    if (posterOn()) {
      const ov = seen()['ps:' + key], s2 = ov ? fxTmdbImg(ov) : src || P.src(key);
      img = `<button type="button" class="fx-pos fx-shpos" data-spos aria-label="${esc(T().changePoster)}"><img alt="" data-pk="${esc(key)}" data-pt="${esc(String(title))}" data-py="${year || ''}"${s2 ? ` src="${s2}"` : ''}><span class="fx-pt" dir="ltr">${esc(title)}</span><span class="fx-chg">${T().changePoster}</span></button>`;
    }
    sub = sub.filter(Boolean);
    return `<div class="fx-shfilm">${img}<div class="fx-b"><div class="fx-tl"><span class="fx-film" dir="auto">${esc(title)}</span>${year ? `<span class="fx-y">${year}</span>` : ''}</div>${sub.length ? `<div class="fx-sub"><span class="fx-tw">${sub.map(x => `<bdi>${esc(x)}</bdi>`).join('')}</span></div>` : ''}</div></div>`;
  }
  function lbButton() {
    const f = sheet.info, d = sheet.d, i = f.i, t = T(), md = f.md || {};
    const name = i != null ? F[i][0] + ' ' + F[i][1] : (md.t ? md.t + (md.y ? ' ' + md.y : '') : String(f.t || ''));
    if (!name) return '';
    if (!IOS) {
      const href = i != null ? link(i) : md.tm ? 'https://letterboxd.com/tmdb/' + encodeURIComponent(md.tm) + '/' : lbSearch(name);
      return `<a class="fx-btn" href="${href}" target="_blank" rel="noopener noreferrer">${t.logOnLb}</a>`;
    }
    // the Letterboxd app's own log screen, pre-filled
    const q = ['name=' + encodeURIComponent(name)];
    if (/^\d{4}-\d\d-\d\d$/.test(d.date)) q.push('date=' + d.date);
    if (d.r) q.push('rating=' + d.r / 2);
    if (d.l) q.push('like=true');
    if (d.rv.trim()) q.push('review=' + encodeURIComponent(d.rv.replace(/[<>]/g, '').replace(/\n/g, '<br>')));
    return `<a class="fx-btn" href="letterboxd://x-callback-url/log?${q.join('&')}">${t.logToLb}</a>`;
  }
  // the film's key for posters, its title and year, and its TMDB id (looked up when not known)
  function sheetFilmRef() {
    const f = sheet.info;
    if (f.i != null) return {key: KEY(f.i), t: F[f.i][0], y: F[f.i][1], tm: F[f.i][16] || 0};
    const md = f.md || {}, m = String(f.t || '').match(/^(.*?)\s*\((\d{4})\)\s*$/);
    return {key: 'tx:' + (f.t || ''), t: md.t || (m ? m[1] : f.t || ''), y: md.y || (m ? +m[2] : 0), tm: md.tm || 0};
  }
  async function loadImages(ref) {
    const id = ref.tm || ((await P.match(ref.t, ref.y)) || {}).id;
    return id ? P.images(id) : {posters: [], backdrops: []};
  }
  function posterGrid() {
    const t = T(), pp = sheet.pp, ref = sheetFilmRef(), cur = seen()['ps:' + ref.key] || '';
    let h = `<div class="fx-shfilm fx-pph"><h2 class="fx-h2">${t.posterH}</h2><button type="button" class="fx-link" data-ppclose>${t.cancel}</button></div>`;
    if (pp.loading) return h + `<p class="fx-muted">${t.imgsLoading}</p>`;
    if (pp.err) return h + `<p class="fx-note bad">${t.imgsFail}</p>`;
    if (!pp.list.length) return h + `<p class="fx-muted">${t.imgsNone}</p>`;
    return h + `<div class="fx-pgrid"><button type="button" class="fx-pg${cur ? '' : ' on'}" data-ppick=""><span>${t.posterDefault}</span></button>` + pp.list.map(x => `<button type="button" class="fx-pg${cur === x ? ' on' : ''}" data-ppick="${esc(x)}"><img alt="" loading="lazy" src="${fxTmdbImg(x)}"></button>`).join('') + '</div>';
  }
  function renderSheet(focusSel) {
    if (!sheetEl || !sheet) return;
    if (sheet.pp) {
      const rtl0 = L() === 'fa', old0 = sheetEl.querySelector('.fx-shbody');
      sheetEl.innerHTML = `<div class="fx-scrim" data-ppclose></div><div class="fx fx-sheet" dir="${rtl0 ? 'rtl' : 'ltr'}" lang="${L()}" role="dialog" aria-modal="true" aria-label="${esc(T().posterH)}"><div class="fx-shbody">${posterGrid()}</div></div>`;
      sheetEl.hidden = false; document.documentElement.classList.add('fx-lock');
      return;
    }
    const t = T(), d = sheet.d, isNew = !sheet.ek, rtl = L() === 'fa';
    const old = sheetEl.querySelector('.fx-shbody'), top = old ? old.scrollTop : 0;
    let stars = '';
    for (let n = 1; n <= 10; n++) stars += `<button type="button" data-srate="${n}" aria-label="${esc(t.stars(fa(n / 2)))}" aria-pressed="${n === d.r}"></button>`;
    const have = new Set(d.tg.map(x => x.toLowerCase())), used = usedTags().filter(x => !have.has(x.toLowerCase())).slice(0, 8);
    const sw = (f, label) => `<label class="fx-shline"><span>${label}</span><input type="checkbox" class="fx-sw" role="switch" data-sf="${f}"${d[f] ? ' checked' : ''}></label>`;
    sheetEl.innerHTML = `<div class="fx-scrim" data-scancel></div>
    <div class="fx fx-sheet${posterOn() ? ' fx-hasp' : ''}" dir="${rtl ? 'rtl' : 'ltr'}" lang="${L()}" role="dialog" aria-modal="true" aria-label="${esc(isNew ? t.shNew : t.shEdit)}">
      <header class="fx-shh"><button type="button" class="fx-shb${sheet.discard ? ' warn' : ''}" data-scancel>${sheet.discard ? t.shDiscard : t.cancel}</button><span class="fx-sht">${isNew ? t.shNew : t.shEdit}</span><button type="button" class="fx-shb primary" data-ssave>${t.shSave}</button></header>
      <div class="fx-shbody">
        ${sheetFilm()}
        <div class="fx-shgroup">
          <label class="fx-shline"><span>${t.shDate}</span><input type="date" class="fx-shdate" data-sf="date" value="${esc(d.date)}" max="${today()}"></label>
          ${sw('rw', '<i class="fx-ico rw" aria-hidden="true"></i>' + t.shRewatch)}
        </div>
        <div class="fx-shrate"><span class="fx-shlab">${d.r ? t.shRated : t.shRate}</span><div class="fx-shrrow"><span class="fx-stars big" dir="ltr" style="--r:${d.r}" role="group" aria-label="${esc(t.shRate)}">${stars}</span><button type="button" class="fx-heart big${d.l ? ' on' : ''}" data-slike aria-pressed="${d.l}" aria-label="${esc(t.liked)}"></button></div></div>
        <textarea class="fx-shrv" data-sf="rv" dir="auto" rows="6" placeholder="${esc(t.shReviewPh)}">${esc(d.rv)}</textarea>
        <div class="fx-shgroup">
          ${sw('sp', t.shSpoil)}
          <label class="fx-shline fx-shtext"><span>${t.withL}</span><input type="text" data-sf="ww" dir="auto" maxlength="80" autocomplete="off" placeholder="${esc(t.withPh)}" value="${esc(d.ww)}"></label>
        </div>
        <div class="fx-shtags"><span class="fx-shlab">${t.tagsL}</span>
          <div class="fx-tagbox">${d.tg.map((x, n) => `<button type="button" class="fx-chip" data-tagrm="${n}" aria-label="${esc(t.shTagRm(x))}"><span dir="auto">${esc(x)}</span><i aria-hidden="true">×</i></button>`).join('')}<input type="text" class="fx-tagin" dir="auto" maxlength="32" autocomplete="off" autocapitalize="off" enterkeyhint="enter" placeholder="${esc(d.tg.length ? t.shTagMore : t.shTagPh)}" value="${esc(d.tq)}" aria-label="${esc(t.tagsL)}"></div>
          <span class="fx-shhint">${t.shTagHint}</span>
          ${used.length ? `<div class="fx-tagsug">${used.map(x => `<button type="button" data-tagadd="${esc(x)}">+ <span dir="auto">${esc(x)}</span></button>`).join('')}</div>` : ''}
        </div>
        ${sheet.ek ? `<div class="fx-shfoot"><button type="button" class="fx-btn" data-sagain><i class="fx-ico rw" aria-hidden="true"></i>${t.logAgain}</button><button type="button" class="fx-btn" data-spost>${t.copyPost}</button>${lbButton()}</div>${sheet.note ? `<p class="fx-note ok">${esc(sheet.note)}</p>` : ''}
        <button type="button" class="fx-shdel${sheet.del ? ' armed' : ''}" data-sdel>${sheet.del ? t.shRemove2 : t.shRemove}</button>` : ''}
      </div>
    </div>`;
    sheetEl.hidden = false;
    document.documentElement.classList.add('fx-lock');
    const body = sheetEl.querySelector('.fx-shbody'); if (body) body.scrollTop = top;
    if (posterOn()) P.fill(sheetEl);
    const ta = sheetEl.querySelector('.fx-shrv'); if (ta) grow(ta);
    if (focusSel) { const el = sheetEl.querySelector(focusSel); if (el) el.focus(); }
  }
  // the review box grows with the text, like a page
  function grow(ta) { ta.style.height = 'auto'; ta.style.height = Math.max(150, ta.scrollHeight + 2) + 'px'; }
  function addTags(txt) {
    const d = sheet.d;
    splitTags(txt).forEach(x => { if (d.tg.length < 8 && !d.tg.some(y => y.toLowerCase() === x.toLowerCase())) d.tg.push(x); });
  }
  function readSheetInputs() {
    if (!sheetEl || !sheet) return;
    const d = sheet.d, q = sel => sheetEl.querySelector(sel);
    const rv = q('[data-sf="rv"]'), ww = q('[data-sf="ww"]'), dt = q('[data-sf="date"]'), tq = q('.fx-tagin');
    if (rv) d.rv = rv.value; if (ww) d.ww = ww.value; if (tq) d.tq = tq.value;
    if (dt && /^\d{4}-\d\d-\d\d$/.test(dt.value)) d.date = dt.value;
  }
  function saveSheet() {
    readSheetInputs();
    const d = sheet.d;
    if (d.tq.trim()) { addTags(d.tq); d.tq = ''; }
    const date = /^\d{4}-\d\d-\d\d$/.test(d.date) && d.date <= today() ? d.date : today();
    let ek = sheet.ek;
    if (!ek) ek = sheet.create(date);
    else if (isCustom(ek)) S.set('v:' + ek, date); else S.set(ek, date);
    const rv = d.rv.replace(/\s+$/, '');
    S.set('r:' + ek, d.r || null); S.set('l:' + ek, d.l ? 1 : null); S.set('rv:' + ek, rv.trim() ? rv : null);
    S.set('sp:' + ek, d.sp ? 1 : null); S.set('rw:' + ek, d.rw ? 1 : null);
    S.set('ww:' + ek, d.ww.trim().slice(0, 80) || null); S.set('tg:' + ek, d.tg.length ? d.tg.join(', ') : null);
    if (pickK && (pickK === ek)) pickK = null;
    return {ek, date};
  }
  function deleteEntry(k2) {
    const extra = ['r:', 'l:', 'rv:', 'rw:', 'sp:', 'ww:', 'tg:'];
    if (k2.startsWith('log:')) ['', 'v:', 'md:'].concat(extra).forEach(p => S.set(p + k2, null));
    else if (k2.startsWith('add:')) ['v:'].concat(extra).forEach(p => S.set(p + k2, null));  // the film stays in the week, unwatched
    else if (k2.startsWith('free:')) ['', 'v:'].concat(extra).forEach(p => S.set(p + k2, null));
    else { setFilm(k2, false); extra.forEach(p => S.set(p + k2, null)); }
  }
  // the round check on a week card: logs an unwatched film through the sheet, opens a watched one — never unticks by accident
  function tickItem(li) {
    const k = li.dataset.k, s = seen();
    if (k.startsWith('add:')) {
      const v = s[k] || '';
      if (v.startsWith('k:')) { const fk = v.slice(2); return s[fk] ? openSheet({ek: fk}) : openSheet({info: {i: KEYIDX[fk]}, create: date => { setFilm(fk, true); S.set(fk, date); return fk; }}); }
      return s['v:' + k] ? openSheet({ek: k}) : openSheet({info: infoOf(k), create: date => { S.set('v:' + k, date); return k; }});
    }
    if (k.startsWith('free:')) {
      const v = s[k];
      if (v) return openSheet({ek: v.startsWith('k:') ? v.slice(2) : k, info: v.startsWith('k:') ? null : {t: v}});
      if (li.dataset.sug !== '') { const i = +li.dataset.sug, fk = KEY(i); return openSheet({info: {i}, create: date => { S.set(k, 'k:' + fk); S.set(fk, date); S.set('sk:' + k, null); return fk; }}); }
      altOpen[k] = true; render(); const inp = root.querySelector('.fx-alt input'); if (inp) inp.focus(); return;
    }
    if (s[k]) return openSheet({ek: k});
    openSheet({info: {i: KEYIDX[k]}, create: date => { setFilm(k, true); S.set(k, date); return k; }});
  }
  if (sheetEl) {
    sheetEl.addEventListener('click', e => {
      const b = e.target.closest('button') || (e.target.closest('.fx-scrim') && sheet && sheet.pp ? e.target.closest('.fx-scrim') : null); if (!b || !sheet) return;
      const d = sheet.d, t = T();
      if (b.hasAttribute('data-spos')) {
        readSheetInputs();
        sheet.pp = {loading: true, list: []}; renderSheet();
        const ref = sheetFilmRef();
        loadImages(ref).then(r => { if (sheet && sheet.pp) { sheet.pp = {list: r.posters}; renderSheet(); } }, () => { if (sheet && sheet.pp) { sheet.pp = {err: true, list: []}; renderSheet(); } });
        return;
      }
      if (b.hasAttribute('data-ppclose')) { sheet.pp = null; renderSheet(); return; }
      if (b.dataset.ppick !== undefined && sheet.pp) {
        const ref = sheetFilmRef(), v = b.dataset.ppick;
        S.set('ps:' + ref.key, v || null);
        sheet.pp = null; renderSheet(); render(); return;
      }
      if (b.hasAttribute('data-scancel')) {
        readSheetInputs();
        if (!sheet.discard && draftKey(d) !== sheet.init) { sheet.discard = true; renderSheet(); return; }
        closeSheet(); return;
      }
      if (sheet.discard) sheet.discard = false;
      if (b.hasAttribute('data-ssave')) {
        const r = saveSheet(); closeSheet();
        if (view === 'diary' && diaryYear !== 'all') diaryYear = typeof fxJalOn === 'function' && fxJalOn(L(), seen()) ? fxYearOf(r.date, true) : r.date.slice(0, 4);
        flash = r.ek; render(); return;
      }
      readSheetInputs();
      if (b.dataset.srate) { const n = +b.dataset.srate; d.r = d.r === n ? 0 : n; renderSheet(); return; }
      if (b.hasAttribute('data-slike')) { d.l = !d.l; renderSheet(); return; }
      if (b.dataset.tagrm) { d.tg.splice(+b.dataset.tagrm, 1); renderSheet(); return; }
      if (b.dataset.tagadd) { addTags(b.dataset.tagadd); renderSheet(); return; }
      if (b.hasAttribute('data-sdel')) {
        if (!sheet.del) { sheet.del = true; renderSheet(); clearTimeout(delTimer); delTimer = setTimeout(() => { if (sheet && sheet.del) { readSheetInputs(); sheet.del = false; renderSheet(); } }, 4000); return; }
        deleteEntry(sheet.ek); closeSheet(); render(); return;
      }
      if (b.hasAttribute('data-sagain')) {
        saveSheet();
        const f = sheet.info, val = f.i != null ? 'k:' + KEY(f.i) : 't:' + (f.t || ''), md = f.md || null;
        openSheet({info: f, rw: true, create: date => newLog(val, md, date)});
        render(); return;
      }
      if (b.hasAttribute('data-spost')) {
        const f = sheet.info;
        const txt = postText({i: f.i != null ? f.i : null, t: f.t, md: f.md, r: d.r, l: d.l, rw: d.rw, ww: d.ww.trim(), rv: d.rv.trim() ? d.rv : '', sp: d.sp, k: sheet.ek});
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { if (sheet) { sheet.note = t.postCopied; renderSheet(); } }, () => window.prompt(t.copyPrompt, txt));
      }
    });
    sheetEl.addEventListener('input', e => {
      if (!sheet) return;
      const el = e.target;
      if (el.classList.contains('fx-tagin')) {
        if (/[,،\n]/.test(el.value)) { const parts = el.value.split(/[,،\n]/); sheet.d.tq = parts.pop(); addTags(parts.join(',')); readSheetInputsExceptTags(); renderSheet('.fx-tagin'); }
        else sheet.d.tq = el.value;
        return;
      }
      if (el.dataset.sf === 'rv') { sheet.d.rv = el.value; grow(el); }
      else if (el.dataset.sf === 'ww') sheet.d.ww = el.value;
    });
    function readSheetInputsExceptTags() { const d = sheet.d, rv = sheetEl.querySelector('[data-sf="rv"]'), ww = sheetEl.querySelector('[data-sf="ww"]'); if (rv) d.rv = rv.value; if (ww) d.ww = ww.value; }
    sheetEl.addEventListener('change', e => {
      if (!sheet) return;
      const el = e.target, f = el.dataset.sf;
      if (f === 'date' && /^\d{4}-\d\d-\d\d$/.test(el.value)) sheet.d.date = el.value;
      else if (f === 'rw' || f === 'sp') sheet.d[f] = el.checked;
    });
    sheetEl.addEventListener('keydown', e => {
      if (!sheet) return;
      if (e.target.classList.contains('fx-tagin')) {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (e.target.value.trim()) { readSheetInputsExceptTags(); addTags(e.target.value); sheet.d.tq = ''; renderSheet('.fx-tagin'); } return; }
        if (e.key === 'Backspace' && !e.target.value && sheet.d.tg.length) { readSheetInputsExceptTags(); sheet.d.tg.pop(); renderSheet('.fx-tagin'); return; }
      }
      if (e.key === 'Escape') { const c = sheetEl.querySelector('.fx-shh [data-scancel]'); if (c) c.click(); }
    });
  }
  const say = (k, cls, txt) => { note[k] = [cls, txt]; render(); };
  root.addEventListener('input', e => {
    if (note.cfg && e.target.matches('input[data-cfg]')) { delete note.cfg; const n = root.querySelector('[data-cfg-save] + .fx-note'); if (n) n.remove(); }
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
    if (e.target.matches('input[data-lbimport]')) { const fs = [...(e.target.files || [])]; e.target.value = ''; lbImport(fs); return; }
    if (e.target.matches('input[data-limport]')) { const f = e.target.files && e.target.files[0]; e.target.value = ''; listImport(f); return; }
    const c = e.target.closest('input[data-cfg]');
    if (c) { saveCfg(c); return; }
    if (e.target.closest('input[data-pubdiary]')) { S.set('cfg:pubdiary', e.target.checked ? null : '0'); return; }
  });
  function saveCfg(c) {
    {
      let v = c.value.trim();
      if (c.dataset.cfg === 'cfg:lbf') { v = fxFriends(v).join(', '); c.value = v; }
      else if (c.dataset.cfg === 'cfg:lb') { v = v.replace(/^https?:\/\/(www\.)?letterboxd\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, ''); if (v && !/^[A-Za-z0-9_]{1,40}$/.test(v)) v = ''; c.value = v; }
      else if (c.type === 'url' && v && !/^https:\/\/[^\s"<>]+$/.test(v)) { if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v)) v = 'https://' + v; else v = ''; c.value = v; }
      S.set(c.dataset.cfg, v || null);
    }
  }
  root.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('fx-calwrap')) calOpen = e.target.open; }, true);
  root.addEventListener('keydown', e => {
    if (e.target.classList.contains('fx-pick-q') && e.key === 'Enter') { e.preventDefault(); const b = root.querySelector('.fx-res [data-pick-film]') || root.querySelector('.fx-res [data-pick-tm]') || root.querySelector('.fx-res [data-pick-text]'); if (b && (picker.q || '').trim().length >= 2) b.click(); }
    if (e.key === 'Escape' && picker) { picker = null; render(); }
  });
  root.addEventListener('click', e => {
    // a whole diary row, or the body of a watched card, opens the sheet
    if (!e.target.closest('a, button, input, textarea, form, summary')) {
      const row = e.target.closest('.fx-de.fx-tap[data-dk]'); if (row && root.contains(row)) { openSheet({ek: row.dataset.dk}); return; }
      const card = e.target.closest('.fx-i.done'); if (card && root.contains(card) && card.dataset.k) { tickItem(card); return; }
    }
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    const li = t.closest('.fx-i'), k = li && li.dataset.k, tt = T();
    if (t.dataset.open) { openSheet({ek: t.dataset.open}); return; }
    if (t.hasAttribute('data-bdopen')) { bdPick = null; picker = {q: '', focus: true, bd: true}; render(); return; }
    if (t.hasAttribute('data-bdclose')) { bdPick = null; render(); return; }
    if (t.hasAttribute('data-bdrm')) { S.set('cfg:bd', null); render(); return; }
    if (t.dataset.bdpick) { S.set('cfg:bd', JSON.stringify({p: t.dataset.bdpick, t: bdPick ? bdPick.t : '', y: bdPick ? bdPick.y : 0})); bdPick = null; render(); return; }
    if (t.hasAttribute('data-golist')) { view = 'list'; picker = {q: '', focus: true, list: true}; render(); return; }
    if (t.hasAttribute('data-ladd')) { picker = {q: '', focus: true, list: true}; listNote = null; render(); return; }
    if (t.hasAttribute('data-lall')) { listAll = true; render(); return; }
    if (t.dataset.lpw) { LS.setPerWeek((D.perWeek || 3) + +t.dataset.lpw); return; }
    if (t.dataset.lmove) { listRm = ''; LS.move(t.closest('[data-lk]').dataset.lk, +t.dataset.lmove); return; }
    if (t.hasAttribute('data-lrm')) {
      const k = t.closest('[data-lk]').dataset.lk;
      if (listRm !== k) { listRm = k; render(); setTimeout(() => { if (listRm === k) { listRm = ''; if (view === 'list') render(); } }, 4000); return; }
      listRm = ''; LS.remove(k); return;
    }
    if (t.hasAttribute('data-plan-reset')) {
      if (!note.planReset) { note.planReset = 1; render(); setTimeout(() => { if (note.planReset) { delete note.planReset; render(); } }, 4000); return; }
      delete note.planReset; if (opts.plan) opts.plan.reset(); return;
    }
    if (t.hasAttribute('data-qlog')) { picker = picker && picker.log ? null : {q: '', focus: true, log: true}; if (view === 'settings' || view === 'list') view = 'diary'; render(); window.scrollTo(0, 0); return; }
    if (t.dataset.nav) { const was = (opts.tabs || []).find(x => x.id === view); if (was && was.left && t.dataset.nav !== view) was.left(); view = t.dataset.nav; note = {}; picker = null; listNote = null; listRm = ''; if (view === 'week') shown = null; render(); window.scrollTo(0, 0); return; }
    const xt = (opts.tabs || []).find(x => x.id === view);
    if (xt && xt.click && xt.click(t, render)) return;
    if (t.hasAttribute('data-fav')) { picker = {q: '', focus: true, fav: +t.dataset.fav}; render(); const q = root.querySelector('.fx-pick-q'); if (q) q.scrollIntoView({block: 'center'}); return; }
    if (t.hasAttribute('data-favrm')) { setFav(+t.dataset.favrm, null); render(); return; }
    if (t.hasAttribute('data-pick-tm')) {
      const m = (picker && picker.tm || [])[+t.dataset.pickTm]; if (!m) return;
      t.disabled = true;
      const go = det => { const md = {tm: m.id, t: m.t, y: m.y, d: det.d || '', m: det.m || 0, p: det.p || m.p || ''}; pick('t:' + m.t + (m.y ? ' (' + m.y + ')' : ''), md); render(); };
      P.details(m.id).then(go, () => go({}));
      return;
    }
    if (t.hasAttribute('data-log')) { picker = {q: '', focus: true, log: true}; render(); return; }
    if (t.hasAttribute('data-year')) { diaryYear = t.dataset.year; render(); return; }
    if (t.dataset.wrapped && opts.wrapped) { opts.wrapped(t.dataset.wrapped); return; }
    if (t.dataset.dview) { S.set('cfg:dview', t.dataset.dview === 'grid' ? 'grid' : null); render(); return; }
    if (t.hasAttribute('data-diary')) { view = 'diary'; note = {}; picker = null; render(); window.scrollTo(0, 0); return; }
    if (t.hasAttribute('data-tick')) { tickItem(li); return; }
    if (t.hasAttribute('data-skip')) { S.set('sk:' + k, today()); if (pickK === k) pickK = null; }
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
    else if (t.hasAttribute('data-full')) {
      // the whole plan: a view of its own (the map) where there is one, else whatever opens it
      const fv = opts.fullView && (opts.tabs || []).find(x => x.id === opts.fullView);
      if (fv) { view = fv.id; if (fv.opened) fv.opened(); render(); window.scrollTo(0, 0); return; }
      opts.openFull && opts.openFull(shown); return;
    }
    else if (t.hasAttribute('data-settings')) { view = 'settings'; note = {}; picker = null; render(); window.scrollTo(0, 0); return; }
    else if (t.hasAttribute('data-back')) { view = 'week'; note = {}; picker = null; render(); window.scrollTo(0, 0); return; }
    else if (t.hasAttribute('data-lang')) { S.set('cfg:lang', t.dataset.lang === 'fa' ? 'fa' : 'en'); }
    else if (t.hasAttribute('data-cal')) { S.set('cfg:cal', t.dataset.cal === 'g' ? 'g' : null); diaryYear = null; render(); }
    else if (t.hasAttribute('data-sync-now')) { ST.syncNow(); }
    else if (t.hasAttribute('data-disconnect')) { ST.disconnect(); note.gh = ['ok', tt.disconnected]; }
    else if (t.hasAttribute('data-dl-data') || t.hasAttribute('data-dl-all')) { fxDownloadAll(D, Store.entries(), seen()); return; }
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
    else if (t.hasAttribute('data-cfg-save')) { root.querySelectorAll('input[data-cfg]').forEach(saveCfg); const pd = root.querySelector('input[data-pubdiary]'); if (pd) S.set('cfg:pubdiary', pd.checked ? null : '0'); note.cfg = ['ok', tt.cfgSaved]; }
    else if (t.hasAttribute('data-share-copy')) { copy(ST.shareUrl(seen()['cfg:share']).replace(/\/$/, ''), t, root.querySelector('.fx-link-pre')); return; }
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
    const xs = (opts.tabs || []).find(x => x.id === view);
    if (xs && xs.submit && await xs.submit(f, render)) return;
    const inp = f.querySelector('input'), v = inp.value.trim(), t = T(); if (!v) return;
    if (f.dataset.alt) { const k = f.dataset.alt; delete altOpen[k]; render(); openSheet({info: {t: v}, create: date => { S.set(k, v); S.set('v:' + k, date); S.set('sk:' + k, null); return k; }}); return; }
    // the multi-user site's account: password change, deleting the account (asks twice)
    if (f.hasAttribute('data-pw')) {
      const nx = f.elements.next.value;
      if (nx.length < 8) { say('pw', 'bad', t.pwNew); return; }
      say('pw', 'busy', '…');
      const r = await ST.changePassword(f.elements.cur.value, nx);
      note.pw = r ? ['bad', r] : ['ok', t.pwDone]; render(); return;
    }
    if (f.hasAttribute('data-del')) {
      if (!note.delSure) { note.delSure = true; render(); const pw = root.querySelector('form[data-del] input'); if (pw) { pw.value = v; pw.closest('details').open = true; } return; }
      note.delSure = false; say('del', 'busy', '…');
      const r = await ST.deleteAccount(v);
      if (r) { note.del = ['bad', r]; render(); }
      return;
    }
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
    setPlan,
    plan: () => D,
    // log a film you already know (from the watchlist, say): straight to the "I watched…" sheet
    logFilm(title, year, md) {
      picker = {log: true};
      if (md && md.k && KEYIDX[md.k] !== undefined) { pick('k:' + md.k, null); return; }  // a film in your plan: logged as that film
      const m = md ? Object.assign({}, md) : null; if (m) delete m.k;
      pick('t:' + title + (year ? ' (' + year + ')' : ''), m);
    },
    go, view: () => view,
    openEntry(ek) { if (seen()[ek] || seen()['v:' + ek]) openSheet({ek}); },
    closeSheet: () => { if (sheet) closeSheet(true); },
  };
}
