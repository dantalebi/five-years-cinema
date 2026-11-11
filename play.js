// Games on the public profile, for whoever visits it:
//  «این یا اون»       a bracket of the owner's favourite films: pick one of two until a champion is left
//  «امشب چی ببینم؟»   one film from those they rated 3.5★ and up, filtered by length, decade and genre
//  «هم‌سلیقگی»        how close the visitor's Letterboxd ratings are to the owner's
// It all runs in the visitor's browser. The only things fetched are the owner's friends' public Letterboxd logs,
// which the site's own GitHub Action keeps on its "letterboxd-feed" branch; an export a visitor picks never leaves the page.
// fxPlay({data(), lang(), render(), feed, link(game)}) → {view(), click(button), change(element), submit(form), open(game)}
function fxPlay(ctx) {
  const TX = {
    en: {
      intro: 'Three small games with this diary.',
      duelT: 'This or that', duelP: n => 'Two of ' + n + '’s favourite films at a time: pick one, until your champion is left.',
      nightT: 'What should I watch tonight?', nightP: (n, k) => 'One film from the ' + k + ' that ' + n + ' gave 3.5★ or more.',
      matchT: 'How close is your taste?', matchP: n => 'Your Letterboxd ratings next to ' + n + '’s.',
      back: '← All games', size: n => n + ' films', start: 'Start', or: 'or', undo: '↶ Back one', again: 'Play again with', share: 'Share', copied: 'Copied',
      rounds: {32: 'Round of 32', 16: 'Round of 16', 8: 'Quarter-finals', 4: 'Semi-finals', 2: 'Final'}, of: (a, b) => a + ' / ' + b,
      champ: 'Your champion', theirs: (n, s) => n + ' gave it ' + s, unrated: n => n + ' hasn’t rated it', ranking: 'Your ranking', fewDuel: 'There aren’t enough highly rated films with posters yet.',
      duelShare: (n, c) => 'My champion of ' + n + '’s favourite films: ' + c + ' 🏆',
      anyLen: 'Any length', short: 'Under 1½ h', mid: '1½–2 h', long: 'Over 2 h', anyDec: 'Any decade', anyGenre: 'Any genre', inPool: n => n + (n === 1 ? ' film' : ' films'),
      spin: 'Pick one', another: 'Another one', none: 'Nothing here — loosen a filter.', seenN: (n, k) => n + ' has watched it ' + k + ' times', onLb: 'On Letterboxd ↗', readMore: 'Read the full entry →',
      who: 'Your Letterboxd username', compare: 'Compare', friends: n => n + '’s friends', exportH: 'Or compare everything, from your Letterboxd export',
      exportSteps: 'On letterboxd.com: Settings → Data → Export your data. Then pick the .zip here. It stays on your device.', exportPick: 'Pick the export (.zip)', exportOpen: 'Open the export page ↗',
      notListed: (n, u) => '@' + u + ' isn’t on ' + n + '’s friends list yet. Follow ' + n + ' on Letterboxd and ask to be added, or compare with your export below.',
      follow: n => 'Not on the list yet? Follow ' + n + ' on Letterboxd ↗', followNote: n => 'then ask ' + n + ' to add you.',
      notYet: (n) => 'Not ready yet: a few hours after ' + n + ' adds you, it’ll be here.', noUser: 'There’s no Letterboxd user by that name.', badFile: 'That isn’t a Letterboxd export.', loading: 'Reading…', failed: 'Couldn’t load that now. Try again in a bit.',
      score: (a, n) => 'You and ' + n + ': ' + a + '% alike', tooFew: n => 'Too few films you both rated to say yet. Log a few more on Letterboxd.',
      basis: (k, m) => 'From ' + k + ' films you both watched' + (m === 'rss' ? ' (your recent Letterboxd logs)' : '') + '.',
      tiers: [[85, 'Film twins'], [70, 'Very close'], [55, 'On the same road'], [40, 'Now and then'], [0, 'Two different worlds']],
      bothLoved: 'You both loved', apart: 'Where you disagree', recs: n => 'From ' + n + ' for you', recsNote: m => m === 'rss' ? 'Not in your recent logs.' : 'Not in your watched films.',
      you: 'you', matchShare: (n, a) => 'Me and ' + n + ': ' + a + '% alike in films 🎬 How about you?', tryOther: 'Try another username',
    },
    fa: {
      intro: 'سه تا بازی کوچیک با این دفتر.',
      duelT: 'این یا اون', duelP: n => 'دوتا دوتا بین فیلم‌های محبوب ' + n + ' یکی رو انتخاب کن تا قهرمانت معلوم بشه.',
      nightT: 'امشب چی ببینم؟', nightP: (n, k) => 'یه فیلم از بین ' + k + ' فیلمی که ' + n + ' بهشون ۳٫۵ ستاره یا بیشتر داده.',
      matchT: 'سلیقه‌ت چقدر بهش می‌خوره؟', matchP: n => 'امتیازهای لترباکسدت کنار امتیازهای ' + n + '.',
      back: 'همه‌ی بازی‌ها →', size: n => n + ' فیلم', start: 'شروع', or: 'یا', undo: '↶ یکی برگرد', again: 'دوباره، با', share: 'فرستادن', copied: 'کپی شد',
      rounds: {32: 'دور ۳۲تایی', 16: 'یک‌هشتم نهایی', 8: 'یک‌چهارم نهایی', 4: 'نیمه‌نهایی', 2: 'فینال'}, of: (a, b) => a + ' از ' + b,
      champ: 'قهرمانِ تو', theirs: (n, s) => n + ' بهش ' + s + ' داده', unrated: n => n + ' بهش امتیاز نداده', ranking: 'رتبه‌بندی تو', fewDuel: 'هنوز فیلم پرامتیازِ پوستردار کافی نیست.',
      duelShare: (n, c) => 'قهرمانِ من بین فیلم‌های محبوب ' + n + ': ' + c + ' 🏆',
      anyLen: 'هر مدتی', short: 'کمتر از ۱٫۵ ساعت', mid: '۱٫۵ تا ۲ ساعت', long: 'بیشتر از ۲ ساعت', anyDec: 'هر دهه‌ای', anyGenre: 'هر ژانری', inPool: n => n + ' فیلم',
      spin: 'یکی دربیار', another: 'یکی دیگه', none: 'چیزی پیدا نشد؛ یه فیلتر رو بازتر کن.', seenN: (n, k) => n + ' ' + k + ' بار دیدتش', onLb: 'تو لترباکسد ↗', readMore: 'خوندن کامل ←',
      who: 'یوزرنیم لترباکسدت', compare: 'مقایسه کن', friends: n => 'دوستای ' + n, exportH: 'یا مقایسه‌ی کامل با خروجی لترباکسدت',
      exportSteps: 'توی letterboxd.com: ‏Settings ← Data ← Export your data. بعد فایل zip رو این‌جا انتخاب کن. فایل از دستگاهت بیرون نمی‌ره.', exportPick: 'انتخاب خروجی (.zip)', exportOpen: 'باز کردن صفحه‌ی خروجی ↗',
      notListed: (n, u) => '@' + u + ' هنوز تو لیست دوستای ' + n + ' نیست. ' + n + ' رو تو لترباکسد فالو کن و بگو اضافه‌ت کنه، یا با خروجی لترباکسدت پایین مقایسه کن.',
      follow: n => 'هنوز تو لیست نیستی؟ ' + n + ' رو تو لترباکسد فالو کن ↗', followNote: n => 'و بگو اضافه‌ت کنه.',
      notYet: (n) => 'هنوز آماده نیست: چند ساعت بعد از این‌که ' + n + ' اضافه‌ت کرد، این‌جا میاد.', noUser: 'همچین یوزرنیمی تو لترباکسد نیست.', badFile: 'این خروجی لترباکسد نیست.', loading: 'دارم می‌خونم…', failed: 'الان باز نشد؛ کمی بعد دوباره امتحان کن.',
      score: (a, n) => 'تو و ' + n + ': ' + a + '٪ هم‌سلیقه', tooFew: n => 'هنوز فیلمی که هر دوتون امتیاز داده باشین کمه. چندتا دیگه تو لترباکسد لاگ کن.',
      basis: (k, m) => 'بر اساس ' + k + ' فیلمی که هر دو دیدین' + (m === 'rss' ? ' (از لاگ‌های اخیرت تو لترباکسد)' : '') + '.',
      tiers: [[85, 'دوقلوی سینمایی'], [70, 'خیلی نزدیک'], [55, 'هم‌مسیر'], [40, 'گاهی وقتا'], [0, 'دو دنیای جدا']],
      bothLoved: 'هر دوتون عاشقش بودین', apart: 'جایی که با هم فرق دارین', recs: n => 'از ' + n + ' برای تو', recsNote: m => m === 'rss' ? 'تو لاگ‌های اخیرت نبود.' : 'تو فیلم‌هایی که دیدی نبود.',
      you: 'تو', matchShare: (n, a) => 'من و ' + n + ' ' + a + '٪ هم‌سلیقه‌ایم 🎬 تو چی؟', tryOther: 'یه یوزرنیم دیگه',
    },
  };
  const L = () => ctx.lang() === 'fa' ? 'fa' : 'en', T = () => TX[L()];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const num = n => Number(n).toLocaleString(L() === 'fa' ? 'fa-IR' : 'en-US');
  const digits = s => L() === 'fa' ? String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]) : String(s);
  const okPoster = p => typeof p === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9._-]+$/.test(p);
  const big = p => p.replace(/\/w\d+\//, '/w342/');
  const hm = m => L() === 'fa' ? digits(m >= 60 ? Math.floor(m / 60) + ' ساعت' + (m % 60 ? ' و ' + (m % 60) + ' دقیقه' : '') : m + ' دقیقه') : (m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm');
  const stars = r => r ? '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '') : '';
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  const okUser = u => /^[A-Za-z0-9_]{1,40}$/.test(u || '');
  const name = () => { const d = ctx.data() || {}; return String(d.name || '').trim() || (L() === 'fa' ? 'صاحب این دفتر' : 'this diary'); };
  const first = () => name().split(/\s+/)[0];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  // one film per title: the latest rating, how often it was watched, the latest review that's safe to show
  let fcache = null;
  function films() {
    const d = ctx.data() || {};
    if (fcache && fcache.d === d) return fcache.list;
    const by = new Map(), key = f => +f.tm > 0 ? 'tm' + f.tm : norm(f.t) + '|' + (+f.y || 0);
    const add = (e, dated) => {
      if (!e || typeof e.t !== 'string') return;
      const k = key(e); let f = by.get(k);
      if (!f) by.set(k, f = {t: e.t, y: +e.y || 0, d: e.d || '', m: +e.m || 0, p: okPoster(e.p) ? e.p : '', r: 0, h: false, g: Array.isArray(e.g) ? e.g : [], tm: +e.tm || 0, l: /^[a-z0-9-]+$/.test(e.l || '') ? e.l : '', n: 0, rv: '', id: ''});
      if (!f.r && e.r) f.r = +e.r;
      if (e.h) f.h = true;
      if (!f.p && okPoster(e.p)) f.p = e.p;
      if (dated) { f.n++; if (!f.id) f.id = e.id || ''; if (!f.rv && e.rv && !e.sp) { f.rv = String(e.rv); f.rvId = e.id || ''; } }
    };
    (d.diary || []).forEach(e => add(e, true));
    (d.seen || []).forEach(e => add(e, false));
    fcache = {d, list: [...by.values()]};
    return fcache.list;
  }
  const posterBox = (f, cls) => `<span class="fx-pos ${cls || ''}${f.p ? '' : ' none'}" aria-hidden="true">${f.p ? `<img alt="" src="${esc(big(f.p))}">` : ''}<span class="fx-pt" dir="ltr">${esc(f.t)}</span></span>`;
  const lbLink = f => f.l ? 'https://letterboxd.com/film/' + f.l + '/' : f.tm ? 'https://letterboxd.com/tmdb/' + f.tm + '/' : '';
  const strip = list => `<span class="fx-gstrip" aria-hidden="true">${list.slice(0, 3).map(f => `<img alt="" loading="lazy" src="${esc(f.p)}">`).join('')}</span>`;
  const shareRow = (text, game) => `<div class="fx-row fx-center"><button type="button" class="fx-btn" data-pl="share" data-text="${esc(text)}" data-game="${game}">${T().share}</button><a class="fx-btn" href="https://t.me/share/url?url=${encodeURIComponent(link(game))}&text=${encodeURIComponent(text)}" target="_blank" rel="noopener noreferrer">Telegram ↗</a></div>`;
  const link = game => ctx.link ? ctx.link(game) : location.href.replace(/[?#].*$/, '') + '?play=' + game;

  let game = '';
  // ---------- «این یا اون» ----------
  let duel = null;
  function duelPool() {
    const all = films().filter(f => f.p), top = all.filter(f => f.r >= 8);  // 4★ and up
    const pool = top.length >= 8 ? top : all.filter(f => f.r >= 7);
    const favs = ((ctx.data() || {}).fav || []).map(x => norm(x && x.t)), isFav = f => favs.includes(norm(f.t));
    return pool.slice().sort((a, b) => (isFav(b) - isFav(a)));
  }
  function duelStart(size) {
    const pool = duelPool(), favs = pool.filter((f, i) => i < 4 && ((ctx.data() || {}).fav || []).some(x => x && norm(x.t) === norm(f.t)));
    const rest = shuffle(pool.filter(f => !favs.includes(f)));
    const seed = shuffle(favs.concat(rest).slice(0, size));
    duel = {seed, hist: []}; duelReplay();
  }
  function duelReplay() {
    let cur = duel.seed.slice(), next = [], i = 0; const out = [];
    for (const side of duel.hist) {
      const a = cur[i], b = cur[i + 1], w = side ? b : a;
      next.push(w); out.push([side ? a : b, cur.length]); i += 2;
      if (i >= cur.length) { if (next.length === 1) break; cur = next; next = []; i = 0; }
    }
    Object.assign(duel, {cur, next, i, out, champ: next.length === 1 && i >= cur.length ? next[0] : null});
  }
  const duelSizes = () => [8, 16, 32].filter(s => duelPool().length >= s);
  // 8 · 16 · 32: tapping another size starts a fresh bracket of that size, from wherever you are
  const sizeSeg = (cur, label) => `<div class="fx-row fx-center fx-sizes">${label ? `<span class="fx-muted fx-small">${label}</span>` : ''}<div class="fx-years fx-seg" role="group">${duelSizes().map(s => `<button type="button" data-pl="duel:${s}" aria-pressed="${s === cur}">${digits(T().size(s))}</button>`).join('')}</div></div>`;
  function duelView() {
    const t = T(), n = first();
    if (!duel) {
      const pool = duelPool(), sizes = duelSizes();
      if (!sizes.length) return `<p class="fx-muted">${t.fewDuel}</p>`;
      return `<div class="fx-gintro">${strip(shuffle(pool))}<h2 class="fx-gh">${t.duelT}</h2><p class="fx-muted">${esc(t.duelP(n))}</p></div>
        <div class="fx-row fx-center">${sizes.map(s => `<button type="button" class="fx-btn${s === 16 || sizes.length === 1 ? ' primary' : ''}" data-pl="duel:${s}">${digits(t.size(s))}</button>`).join('')}</div>`;
    }
    if (duel.champ) {
      const c = duel.champ, tiers = [[1, [c]]];
      [[2, 2], [4, '3–4'], [8, '5–8'], [16, '9–16'], [32, '17–32']].forEach(([sz, lab]) => { const l = duel.out.filter(o => o[1] === sz).map(o => o[0]); if (l.length) tiers.push([lab, l]); });
      const champTxt = c.t + (c.y ? ' (' + c.y + ')' : '');
      const rank = tiers.slice(0, 4).map(([lab, l]) => `<li><span class="fx-rk">${digits(lab)}</span><span class="fx-rkf">${l.map(f => `<span class="fx-rkp">${posterBox(f, 'fx-rkpos')}<bdi>${esc(f.t)}</bdi></span>`).join('')}</span></li>`).join('');
      const text = t.duelShare(n, champTxt) + '\n' + tiers.slice(1, 3).map(([lab, l]) => digits(lab) + '. ' + l.map(f => f.t).join('، ')).join('\n');
      return `<div class="fx-champ">${posterBox(c, 'fx-cpos')}<div class="fx-eye">${t.champ}</div><div class="fx-ctitle"><bdi>${esc(c.t)}</bdi> <span class="fx-y">${c.y || ''}</span></div>
        <div class="fx-muted">${c.r ? t.theirs(esc(n), '<span class="fx-mini" dir="ltr">' + stars(c.r) + '</span>') : esc(t.unrated(n))}</div></div>
        <h3 class="fx-gh2">${t.ranking}</h3><ol class="fx-rank">${rank}</ol>
        ${shareRow(text, 'duel')}${sizeSeg(0, t.again)}`;
    }
    const a = duel.cur[duel.i], b = duel.cur[duel.i + 1], size = duel.cur.length;
    const nxt = duel.cur[duel.i + 2]; if (nxt) [duel.cur[duel.i + 2], duel.cur[duel.i + 3]].forEach(f => { if (f && f.p) { const im = new Image(); im.src = big(f.p); } });
    const card = (f, side) => `<button type="button" class="fx-vsb" data-pl="pick:${side}">${posterBox(f, 'fx-vspos')}<span class="fx-vst"><bdi>${esc(f.t)}</bdi> <span class="fx-y">${f.y || ''}</span></span></button>`;
    return `${sizeSeg(duel.seed.length)}<div class="fx-eye fx-center">${esc(t.rounds[size] || '')} · ${digits(t.of(duel.i / 2 + 1, size / 2))}</div>
      <div class="fx-vs" dir="ltr">${card(a, 0)}<span class="fx-vso">${t.or}</span>${card(b, 1)}</div>
      <div class="fx-row fx-center">${duel.hist.length ? `<button type="button" class="fx-link" data-pl="undo">${t.undo}</button>` : ''}</div>`;
  }

  // ---------- «امشب چی ببینم؟» ----------
  const night = {len: '', dec: '', g: '', pick: null, shown: new Set(), spinning: false};
  const GEN = {28: ['Action', 'اکشن'], 12: ['Adventure', 'ماجرایی'], 16: ['Animation', 'انیمیشن'], 35: ['Comedy', 'کمدی'], 80: ['Crime', 'جنایی'], 99: ['Documentary', 'مستند'],
    18: ['Drama', 'درام'], 10751: ['Family', 'خانوادگی'], 14: ['Fantasy', 'فانتزی'], 36: ['History', 'تاریخی'], 27: ['Horror', 'وحشت'], 10402: ['Music', 'موسیقی'],
    9648: ['Mystery', 'معمایی'], 10749: ['Romance', 'عاشقانه'], 878: ['Science Fiction', 'علمی‌تخیلی'], 53: ['Thriller', 'هیجان‌انگیز'], 10752: ['War', 'جنگی'], 37: ['Western', 'وسترن']};
  const nightAll = () => films().filter(f => f.r >= 7);
  function nightPool() {
    return nightAll().filter(f => {
      if (night.len === 's' && !(f.m && f.m < 90)) return false;
      if (night.len === 'm' && !(f.m >= 90 && f.m <= 120)) return false;
      if (night.len === 'l' && !(f.m > 120)) return false;
      if (night.dec && Math.floor(f.y / 10) * 10 !== +night.dec) return false;
      if (night.g && !f.g.includes(+night.g)) return false;
      return true;
    });
  }
  function nightView() {
    const t = T(), n = first(), all = nightAll(), pool = nightPool();
    const decs = [...new Set(all.filter(f => f.y).map(f => Math.floor(f.y / 10) * 10))].sort();
    const gs = Object.keys(GEN).filter(g => all.some(f => f.g.includes(+g))).sort((a, b) => GEN[a][L() === 'fa' ? 1 : 0].localeCompare(GEN[b][L() === 'fa' ? 1 : 0], L()));
    const lens = [['', t.anyLen], ['s', t.short], ['m', t.mid], ['l', t.long]];
    let h = `<div class="fx-gintro"><h2 class="fx-gh">${t.nightT}</h2><p class="fx-muted">${esc(t.nightP(n, num(all.length)))}</p></div>
      <div class="fx-years fx-seg fx-center" role="group">${lens.map(([v, l]) => `<button type="button" data-pl="len:${v}" aria-pressed="${night.len === v}">${esc(l)}</button>`).join('')}</div>
      <div class="fx-row fx-center fx-sels"><select data-pl-sel="dec" aria-label="${esc(t.anyDec)}"><option value="">${t.anyDec}</option>${decs.map(d => `<option value="${d}"${+night.dec === d ? ' selected' : ''}>${digits(d)}${L() === 'fa' ? '' : 's'}</option>`).join('')}</select>
      <select data-pl-sel="g" aria-label="${esc(t.anyGenre)}"><option value="">${t.anyGenre}</option>${gs.map(g => `<option value="${g}"${night.g === g ? ' selected' : ''}>${GEN[g][L() === 'fa' ? 1 : 0]}</option>`).join('')}</select></div>
      <div class="fx-eye fx-center">${esc(digits(t.inPool(pool.length)))}</div>`;
    if (night.spinning) return h + `<div class="fx-reel">${posterBox(pool[0] || {t: ''}, 'fx-reelpos')}</div>`;
    const f = night.pick && pool.includes(night.pick) ? night.pick : null;
    if (f) {
      const lb = lbLink(f), meta = [f.d ? `<bdi>${esc(f.d)}</bdi>` : '', f.m ? esc(hm(f.m)) : ''].filter(Boolean).join(' · ');
      const rv = f.rv ? `<p class="fx-rvx fx-clamp" dir="auto">${esc(f.rv.slice(0, 600))}</p>${f.rvId ? `<button type="button" class="fx-link" data-entry="${esc(f.rvId)}">${t.readMore}</button>` : ''}` : '';
      h += `<div class="fx-pick">${posterBox(f, 'fx-pickpos')}<div class="fx-b"><div class="fx-ctitle"><bdi>${esc(f.t)}</bdi> <span class="fx-y">${f.y || ''}</span></div>
        ${meta ? `<div class="fx-sub">${meta}</div>` : ''}<div class="fx-dm"><span class="fx-mini" dir="ltr">${stars(f.r)}</span>${f.h ? '<i class="fx-ico lk"></i>' : ''}${f.n > 1 ? `<span class="fx-hd">${esc(digits(t.seenN(n, f.n)))}</span>` : ''}</div>
        ${rv}${lb ? `<a class="fx-link" href="${lb}" target="_blank" rel="noopener noreferrer">${t.onLb}</a>` : ''}</div></div>`;
    }
    h += pool.length ? `<div class="fx-row fx-center"><button type="button" class="fx-btn primary" data-pl="spin">${f ? t.another : t.spin}</button></div>` : `<p class="fx-muted fx-center">${t.none}</p>`;
    return h;
  }
  function spin() {
    const pool = nightPool(); if (!pool.length) return;
    let fresh = pool.filter(f => !night.shown.has(f)); if (!fresh.length) { night.shown.clear(); fresh = pool; }
    const pick = fresh[Math.floor(Math.random() * fresh.length)];
    night.shown.add(pick);
    if (reduced() || pool.length < 3) { night.pick = pick; ctx.render(); return; }
    night.spinning = true; ctx.render();
    const reel = shuffle(pool.filter(f => f.p)).slice(0, 14);
    let k = 0, delay = 45;  // about a second and a half, slowing down like a reel
    const step = () => {
      const box = document.querySelector('.fx-reel .fx-pos');
      if (!box || !night.spinning) return;
      const f = k < reel.length ? reel[k] : pick;
      box.innerHTML = (f.p ? `<img alt="" src="${esc(big(f.p))}">` : '') + `<span class="fx-pt" dir="ltr">${esc(f.t)}</span>`;
      box.classList.toggle('none', !f.p);
      if (k++ < reel.length) { delay *= 1.13; setTimeout(step, delay); }
      else setTimeout(() => { night.spinning = false; night.pick = pick; ctx.render(); }, 380);
    };
    setTimeout(step, 30);
  }

  // ---------- «هم‌سلیقگی» ----------
  const match = {state: 'start', user: '', note: '', res: null};
  const friendsList = () => { const d = ctx.data() || {}; return (Array.isArray(d.lbf) ? d.lbf : []).filter(okUser).slice(0, 40); };
  // the visitor's films: Map key → {t, y, tm, r}; key by TMDB id when known, else title|year
  function theirFromRss(items) {
    const m = new Map();
    items.slice().sort((a, b) => a.d < b.d ? 1 : -1).forEach(x => {
      if (!x || typeof x.t !== 'string') return;
      const k = +x.tm > 0 ? 'tm' + x.tm : norm(x.t) + '|' + (+x.y || 0), o = m.get(k);
      if (!o) m.set(k, {t: x.t, y: +x.y || 0, tm: +x.tm || 0, r: +x.r || 0}); else if (!o.r && x.r) o.r = +x.r;
    });
    return m;
  }
  function compare(their, mode) {
    const mine = films(), byTm = new Map(), byTY = new Map();
    mine.forEach(f => { if (f.tm) byTm.set(f.tm, f); byTY.set(norm(f.t) + '|' + f.y, f); });
    const find = x => (x.tm && byTm.get(x.tm)) || byTY.get(norm(x.t) + '|' + x.y) || (x.y ? byTY.get(norm(x.t) + '|' + (x.y - 1)) || byTY.get(norm(x.t) + '|' + (x.y + 1)) : null);
    const common = [], pairs = [], seenMine = new Set();
    their.forEach(x => { const f = find(x); if (!f) return; seenMine.add(f); common.push([f, x]); if (f.r && x.r) pairs.push([f, x]); });
    const diff = pairs.length ? pairs.reduce((a, [f, x]) => a + Math.abs(f.r - x.r), 0) / pairs.length : 0;
    const score = pairs.length >= 3 ? Math.max(0, Math.min(100, Math.round(100 * (1 - diff / 5)))) : null;
    const loved = pairs.filter(([f, x]) => f.r >= 8 && x.r >= 8).sort((a, b) => (b[0].r + b[1].r) - (a[0].r + a[1].r)).slice(0, 6);
    const apart = pairs.filter(([f, x]) => Math.abs(f.r - x.r) >= 3).sort((a, b) => Math.abs(b[0].r - b[1].r) - Math.abs(a[0].r - a[1].r)).slice(0, 3);
    const recs = shuffle(mine.filter(f => f.r >= 9 && f.p && !seenMine.has(f))).sort((a, b) => b.r - a.r).slice(0, 6);
    return {mode, score, common: common.length, pairs: pairs.length, loved, apart, recs};
  }
  async function loadFriend(u) {
    match.state = 'busy'; match.user = u; match.note = ''; ctx.render();
    try {
      const r = await fetch(ctx.feed + 'friends/' + u.toLowerCase() + '.json?t=' + Math.floor(Date.now() / 6e5), {cache: 'no-store'});
      if (r.status === 404) { match.state = 'start'; match.note = T().notYet(first()); ctx.render(); return; }
      if (!r.ok) throw new Error('http');
      const j = await r.json();
      if (j.missing) { match.state = 'start'; match.note = T().noUser; ctx.render(); return; }
      match.res = compare(theirFromRss(Array.isArray(j.items) ? j.items : []), 'rss');
      match.res.who = String(j.name || '').slice(0, 60) || '@' + u;
      match.state = 'done';
    } catch (e) { match.state = 'start'; match.note = T().failed; }
    ctx.render();
  }
  async function loadExport(files) {
    if (typeof FXLB === 'undefined') { match.note = T().failed; ctx.render(); return; }
    match.state = 'busy'; match.note = ''; ctx.render();
    try {
      let diary = [], fw = {};
      for (const f of files) {
        const head = new Uint8Array(await f.slice(0, 2).arrayBuffer());
        if (head[0] === 0x50 && head[1] === 0x4b) {
          const z = await FXLB.unzip(await f.arrayBuffer(), ['diary.csv', 'ratings.csv', 'watched.csv']) || {};
          if (z['diary.csv']) diary = diary.concat(FXLB.fromCsv(z['diary.csv']) || []);
          if (z['ratings.csv']) fw.r = z['ratings.csv']; if (z['watched.csv']) fw.w = z['watched.csv'];
        } else {
          const txt = await f.text(), r = FXLB.fromCsv(txt);
          if (r) diary = diary.concat(r); else if (/ratings/i.test(f.name)) fw.r = txt; else if (/watched/i.test(f.name)) fw.w = txt;
        }
      }
      const m = new Map();
      (FXLB.fromFilms(fw.w, fw.r, null) || []).forEach(x => m.set(norm(x.t) + '|' + x.y, {t: x.t, y: x.y, tm: 0, r: x.r}));
      diary.slice().sort((a, b) => a.date < b.date ? 1 : -1).forEach(x => { const k = norm(x.t) + '|' + x.y, o = m.get(k); if (!o) m.set(k, {t: x.t, y: x.y, tm: 0, r: x.r}); else if (!o.r && x.r) o.r = x.r; });
      if (!m.size) { match.state = 'start'; match.note = T().badFile; ctx.render(); return; }
      match.res = compare(m, 'export'); match.res.who = T().you; match.state = 'done';
    } catch (e) { match.state = 'start'; match.note = T().badFile; }
    ctx.render();
  }
  function matchView() {
    const t = T(), n = first(), fl = ctx.feed ? friendsList() : [];
    let h = `<div class="fx-gintro"><h2 class="fx-gh">${t.matchT}</h2><p class="fx-muted">${esc(t.matchP(n))}</p></div>`;
    if (match.state === 'busy') return h + `<p class="fx-note busy fx-center">${t.loading}</p>`;
    if (match.state === 'done' && match.res) {
      const r = match.res, tier = r.score == null ? '' : t.tiers.find(([min]) => r.score >= min)[1];
      const pair = ([f, x]) => `<li>${posterBox(f, 'fx-rkpos')}<span class="fx-b"><bdi class="fx-mt">${esc(f.t)}</bdi><span class="fx-mr"><span>${esc(n)}</span> <span class="fx-mini" dir="ltr">${stars(f.r)}</span></span><span class="fx-mr"><span>${esc(t.you)}</span> <span class="fx-mini" dir="ltr">${stars(x.r)}</span></span></span></li>`;
      h += r.score == null ? `<p class="fx-muted fx-center">${esc(t.tooFew(n))}</p>` : `<div class="fx-score"><b>${esc(digits(r.score))}<small>%</small></b><span>${esc(tier)}</span></div>`;
      h += `<p class="fx-muted fx-center fx-small">${esc(digits(t.basis(r.common, r.mode)))}</p>`;
      if (r.loved.length) h += `<h3 class="fx-gh2">${t.bothLoved}</h3><ul class="fx-pairs">${r.loved.map(pair).join('')}</ul>`;
      if (r.apart.length) h += `<h3 class="fx-gh2">${t.apart}</h3><ul class="fx-pairs">${r.apart.map(pair).join('')}</ul>`;
      if (r.recs.length) h += `<h3 class="fx-gh2">${esc(t.recs(n))}</h3><p class="fx-muted fx-small">${t.recsNote(r.mode)}</p><div class="fx-recs">${r.recs.map(f => { const lb = lbLink(f); return `<${lb ? `a href="${lb}" target="_blank" rel="noopener noreferrer"` : 'span'} class="fx-rec">${posterBox(f, 'fx-recpos')}<span class="fx-mini" dir="ltr">${stars(f.r)}</span></${lb ? 'a' : 'span'}>`; }).join('')}</div>`;
      if (r.score != null) h += shareRow(t.matchShare(n, digits(r.score)), 'match');
      return h + `<div class="fx-row fx-center"><button type="button" class="fx-link" data-pl="mreset">${t.tryOther}</button></div>`;
    }
    if (fl.length) h += `<div class="fx-eye">${esc(t.friends(n))}</div><div class="fx-years fx-friends">${fl.map(u => `<button type="button" data-pl="friend" data-u="${esc(u)}">@${esc(u)}</button>`).join('')}</div>`;
    if (ctx.feed) h += `<form class="fx-row fx-uform" data-pl-form="user"><input type="text" name="u" dir="ltr" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="${esc(t.who)}" value="${esc(match.user)}" aria-label="${esc(t.who)}"><button type="submit" class="fx-btn primary">${t.compare}</button></form>`;
    if (match.note) h += `<p class="fx-note">${esc(match.note)}</p>`;
    // the way onto the list: follow the owner on Letterboxd, then they add you
    const lb = (((ctx.data() || {}).links) || {}).lb;
    if (ctx.feed && okUser(lb)) h += `<p class="fx-small fx-follow"><a class="fx-link" href="https://letterboxd.com/${lb}/" target="_blank" rel="noopener noreferrer">${esc(t.follow(n))}</a> <span class="fx-muted">${esc(t.followNote(n))}</span></p>`;
    h += `<div class="fx-exp"><h3 class="fx-gh2">${t.exportH}</h3><p class="fx-muted fx-small">${t.exportSteps}</p>
      <div class="fx-row"><a class="fx-btn" href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener noreferrer">${t.exportOpen}</a><label class="fx-btn primary fx-file">${t.exportPick}<input type="file" accept=".zip,.csv,application/zip,text/csv" multiple data-pl-file></label></div></div>`;
    return h;
  }

  function view() {
    const t = T(), n = first(), back = game ? `<div class="fx-row"><button type="button" class="fx-link" data-pl="home">${t.back}</button></div>` : '';
    if (game === 'duel') return `<section class="fx-play">${back}${duelView()}</section>`;
    if (game === 'tonight') return `<section class="fx-play">${back}${nightView()}</section>`;
    if (game === 'match') return `<section class="fx-play">${back}${matchView()}</section>`;
    const fpool = shuffle(films().filter(f => f.p && f.r >= 8));
    const tile = (g, title, p, list) => `<button type="button" class="fx-game" data-pl="go:${g}">${strip(list)}<span class="fx-b"><span class="fx-gt">${title}</span><span class="fx-muted">${esc(p)}</span></span></button>`;
    return `<section class="fx-play"><p class="fx-muted">${t.intro}</p><div class="fx-games">
      ${tile('duel', t.duelT, t.duelP(n), fpool.slice(0, 3))}${tile('tonight', t.nightT, t.nightP(n, num(nightAll().length)), fpool.slice(3, 6))}${tile('match', t.matchT, t.matchP(n), fpool.slice(6, 9))}</div></section>`;
  }
  function open(g) { game = ['duel', 'tonight', 'match'].includes(g) ? g : ''; }
  function click(b) {
    const v = b.dataset.pl || '';
    if (v === 'home') { game = ''; ctx.render(); return true; }
    if (v.startsWith('go:')) { open(v.slice(3)); ctx.render(); window.scrollTo(0, Math.min(window.scrollY, document.querySelector('.fx-tabs') ? document.querySelector('.fx-tabs').offsetTop : 0)); return true; }
    if (v.startsWith('duel:')) { duelStart(+v.slice(5)); ctx.render(); return true; }
    if (v.startsWith('pick:') && duel && !duel.champ) { duel.hist.push(+v.slice(5)); duelReplay(); ctx.render(); return true; }
    if (v === 'undo' && duel) { duel.hist.pop(); duelReplay(); ctx.render(); return true; }
    if (v.startsWith('len:')) { night.len = v.slice(4); night.pick = null; ctx.render(); return true; }
    if (v === 'spin') { spin(); return true; }
    if (v === 'friend') { loadFriend(b.dataset.u); return true; }
    if (v === 'mreset') { match.state = 'start'; match.res = null; match.note = ''; ctx.render(); return true; }
    if (v === 'share') {
      const text = b.dataset.text + '\n' + link(b.dataset.game);
      if (navigator.share) navigator.share({text}).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { b.textContent = T().copied; }, () => {});
      return true;
    }
    return false;
  }
  function change(el) {
    if (el.matches('select[data-pl-sel]')) { night[el.dataset.plSel] = el.value; night.pick = null; ctx.render(); return true; }
    if (el.matches('input[data-pl-file]')) { const fs = [...(el.files || [])]; el.value = ''; if (fs.length) loadExport(fs); return true; }
    return false;
  }
  function submit(form) {
    if (form.dataset.plForm !== 'user') return false;
    const u = String(form.elements.u.value || '').trim().replace(/^https?:\/\/(www\.)?letterboxd\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
    match.user = u;
    if (!okUser(u)) { match.note = T().noUser; ctx.render(); return true; }
    if (friendsList().some(x => x.toLowerCase() === u.toLowerCase())) loadFriend(u);
    else { match.note = T().notListed(first(), u); ctx.render(); }
    return true;
  }
  return {view, click, change, submit, open, game: () => game};
}
