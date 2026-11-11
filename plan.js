
const D = window.D;
const F = D.F, W = D.W, R = D.R, WM = D.WM, NW = W.length;
const fa = n => Number(n).toLocaleString('fa-IR');
const faY = n => Number(n).toLocaleString('fa-IR', {useGrouping:false});
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const START = new Date(D.start + 'T00:00:00');
const jfmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day:'numeric', month:'long'});
const jfmtY = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {month:'long', year:'numeric'});
const jfmtFull = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day:'numeric', month:'long', year:'numeric'});
const wStart = w => new Date(START.getTime() + (w - 1) * 7 * 86400000);
const wRange = w => { const a = wStart(w), b = new Date(a.getTime() + 6 * 86400000); return jfmt.format(a) + ' تا ' + jfmt.format(b); };
const today = new Date();
const curWeek = Math.max(1, Math.min(NW, Math.floor((today - START) / (7 * 86400000)) + 1));
const STL = {wl:['ready','روی هارد'], done:['ready','روی هارد'], dl:['dl','در حال دانلود'], need:['need','دانلود کن']};
const LN = {H:'تاریخ', A:'مؤلف', C:'امروز', P:'پاپ', F:'آزاد'};
const LNL = {H:'ستون تاریخ', A:'مؤلف‌ها', C:'سینمای امروز', P:'فرهنگ عمومی'};
const LORDER = ['A', 'H', 'C', 'P'];
const YN = D.years;
const yearOf = w => Math.floor((w - 1) / 52);
const seasonOf = w => Math.floor((w - 1) / 13);
// film: [t, y, d, rt, st, u, L, ir, key, year-phase]
const T = i => F[i][0], Y = i => F[i][1], DIR = i => F[i][2], RT = i => F[i][3], ST = i => F[i][4], U = i => F[i][5], LA = i => F[i][6], IR = i => F[i][7], KEY = i => F[i][8], PH = i => F[i][9];
const linkOf = i => U(i) ? 'https://letterboxd.com/film/' + U(i) + '/' : 'https://letterboxd.com/search/films/' + encodeURIComponent(T(i) + ' ' + Y(i)) + '/';
// week items: [lane, film, 1 core / 0 optional / 2 free slot, runId]
const WEEK_OF = {}; const CORE = []; const OPT = []; const FREE = [];
W.forEach((items, wi) => items.forEach((it, k) => { if (it[2] === 2) { FREE.push(wi + 1); return; } if (!(it[1] in WEEK_OF) || it[2]) WEEK_OF[it[1]] = wi + 1; (it[2] ? CORE : OPT).push({i: it[1], w: wi + 1, l: it[0]}); }));
const runPos = {}; Object.entries(R).forEach(([rid, r]) => r.f.forEach((i, k) => { runPos[i] = [rid, k + 1, r.f.length]; }));
const POOL = [...new Set(D.shelf.concat(OPT.map(o => o.i)))];
const KEYIDX = {}; F.forEach((f, i) => { KEYIDX[f[8]] = i; });

// ---- progress state: Store (store.js) ----
const seen = Store.data;
function setSeen(k, val) { Store.set(k, val || null); refreshCounts(); }
const isSeen = i => !!seen[KEY(i)];
function markFilm(i, on) {
  setSeen(KEY(i), on ? new Date().toISOString().slice(0, 10) : null);
  document.querySelectorAll('[data-i="' + i + '"]').forEach(li => { li.classList.toggle('seen', on); const cb = li.querySelector('input[type=checkbox]'); if (cb) cb.checked = on; });
}
document.getElementById('syncnote').textContent = 'تیک\u200cها روی این دستگاه ذخیره می\u200cشن و اگه همگام\u200cسازی روشن باشه، روی بقیه\u200cی دستگاه\u200cهات هم هست.';
Store.onChange(() => { renderSeason(curSeason, false); refreshCounts(); });
// ---- header ----
const ready = CORE.filter(o => ['wl', 'done', 'dl'].includes(ST(o.i))).length;
document.getElementById('lead').textContent = D.lead;
document.getElementById('hownote').textContent = D.hownote;
document.getElementById('stats').innerHTML = [
  [fa(CORE.length), 'فیلم توی هفته‌ها'], [fa(FREE.length), 'انتخاب آزاد'], [fa(WM.filter(m => m.free).length), 'هفته‌ی کاملاً آزاد'], [fa(WM.filter(m => m.th).length), 'هفته‌ی سرزده'],
  [fa(POOL.length), 'فیلم توی قفسه و کنار کارنامه‌ها'], [fa(ready), 'فیلمِ توی هفته‌ها روی هارده'],
].map(([b, s]) => `<div class="stat"><b class="num">${b}</b><span>${s}</span></div>`).join('');
document.getElementById('lanes').innerHTML = D.lanes.map(([L, h, p]) => `<div class="card"><h3><i class="dot" style="background:var(--l${L})"></i>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('');

// ---- years ----
function runsIn(a, b, lane) {
  const s = new Set(), out = [];
  for (let w = a; w <= b; w++) W[w - 1].forEach(it => { if (it[0] === lane && it[2] === 1 && it[3] >= 0 && R[it[3]] && R[it[3]].f.length > 1 && !s.has(it[3])) { s.add(it[3]); out.push(it[3]); } });
  return out;
}
const rName = rid => { const r = R[rid]; if (r.y1 === r.y0) return r.n + ' ' + faY(r.y0); const same = Math.floor(r.y0 / 100) === Math.floor(r.y1 / 100); return r.n + ' ' + faY(r.y0) + '–' + (same ? faY(r.y1 % 100).padStart(2, '۰') : faY(r.y1)); };
document.getElementById('years').innerHTML = YN.map((y, k) => `<div class="card"><span class="k pcs"><span class="pc">سال ${fa(k + 1)}</span><span class="pc">${jfmtY.format(wStart(k * 52 + 1))}</span></span><b>${esc(y[0])}</b><p>${esc(y[1])}</p></div>`).join('');

// ---- map ----
(function coverage() {
  const G = D.groups, el = document.getElementById('map');
  const cnt = G.map(() => [0, 0, 0, 0, 0]), firstW = G.map(() => [0, 0, 0, 0, 0]);
  W.forEach((items, wi) => items.forEach(it => { if (it[2] !== 1) return; const g = F[it[1]][13]; if (g < 0) return; const y = Math.floor(wi / 52); cnt[g][y]++; if (!firstW[g][y]) firstW[g][y] = wi + 1; }));
  const mx = Math.max(...cnt.flat());
  let h = '<table class="cov"><thead><tr><th scope="col">موج / سینما</th>' + YN.map((y, k) => `<th scope="col">سال ${fa(k + 1)}<span>${esc(y[0])}</span></th>`).join('') + '<th scope="col">جمع</th></tr></thead><tbody>';
  G.forEach((g, gi) => {
    const tot = cnt[gi].reduce((a, b) => a + b, 0); if (!tot) return;
    h += `<tr><th scope="row">${esc(g)}</th>` + cnt[gi].map((c, y) => `<td><button type="button" data-w="${firstW[gi][y] || y * 52 + 1}" style="--a:${c ? Math.round(12 + 70 * Math.sqrt(c / mx)) : 0}%" aria-label="${esc(g)}، سال ${fa(y + 1)}: ${fa(c)} فیلم">${c ? fa(c) : '·'}</button></td>`).join('') + `<td class="tot">${fa(tot)}</td></tr>`;
  });
  el.innerHTML = h + '</tbody></table>';
  el.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) jumpWeek(+b.dataset.w); });
})();

// ---- seasons ----
let curSeason = seasonOf(curWeek);
const SEASON_NAMES = ['یک', 'دو', 'سه', 'چهار'];
const seasonRange = si => ({a: si * 13 + 1, b: si * 13 + 13});
function itemsOfWeeks(a, b, core) { const out = []; for (let w = a; w <= b; w++) W[w - 1].forEach(it => { if (it[2] === 2) return; if (core === undefined || !!it[2] === core) out.push(it); }); return out; }
function renderTabs() {
  const y = Math.floor(curSeason / 4);
  document.getElementById('ytabs').innerHTML = YN.map((yy, k) => { const it = itemsOfWeeks(k * 52 + 1, k * 52 + 52, true); const dn = it.filter(x => isSeen(x[1])).length;
    return `<button type="button" role="tab" aria-selected="${k === y}" data-y="${k}"><b>سال ${fa(k + 1)}: ${esc(yy[0])}</b><span><bdi>${jfmtY.format(wStart(k * 52 + 1))}</bdi></span><span class="pbar"><i style="width:${dn / it.length * 100}%"></i></span></button>`; }).join('');
  document.getElementById('stabs').innerHTML = [0, 1, 2, 3].map(q => { const si = y * 4 + q, {a, b} = seasonRange(si); const it = itemsOfWeeks(a, b, true); const dn = it.filter(x => isSeen(x[1])).length;
    return `<button type="button" role="tab" aria-selected="${si === curSeason}" data-si="${si}"><b>فصل ${SEASON_NAMES[q]}</b><span class="pcs"><span class="pc">هفته‌ی ${fa(a)} تا ${fa(b)}</span><span class="pc">${jfmt.format(wStart(a))}</span></span><span class="pbar"><i style="width:${it.length ? dn / it.length * 100 : 0}%"></i></span></button>`; }).join('');
}
document.getElementById('ytabs').addEventListener('click', e => { const b = e.target.closest('button[data-y]'); if (b) renderSeason(+b.dataset.y * 4, false); });
document.getElementById('stabs').addEventListener('click', e => { const b = e.target.closest('button[data-si]'); if (b) renderSeason(+b.dataset.si, false); });

function meta(i, it) {
  const [cls, lab] = STL[ST(i)] || ['need', ''];
  const rp = runPos[i]; const run = rp && R[rp[0]].f.length > 1 ? `<span>${esc(R[rp[0]].n)} <span class="num">${fa(rp[1])}/${fa(rp[2])}</span></span>` : '';
  const long = RT(i) >= 200 ? `<span class="long">${fa(RT(i))} دقیقه؛ چند نوبت ببین</span>` : RT(i) ? `<span class="num">${fa(RT(i))} دقیقه</span>` : '';
  const extra = (F[i][10] ? `<span class="pill opt">${esc(F[i][10])}</span>` : '') + (F[i][11] ? `<span class="pill dl">${esc(F[i][11])}</span>` : '') + (F[i][12] >= 5 ? `<span class="pill ready" title="LaCinetek">انتخاب ${fa(F[i][12])} فیلمساز</span>` : '');
  return `<span class="lane ${it}">${LN[it]}</span>${extra}${run}<bdi>${esc(DIR(i))}</bdi>${long}<span class="pill ${cls}">${lab}</span>${IR(i) ? '<span class="pill ir">ایران</span>' : ''}`;
}
function filmLi(i, lane, opt) {
  return `<li data-i="${i}" class="${isSeen(i) ? 'seen' : ''}"><input type="checkbox" aria-label="دیدمش: ${esc(T(i))}" ${isSeen(i) ? 'checked' : ''}>
    <div><a class="film" href="${linkOf(i)}" target="_blank" rel="noopener">${esc(T(i))}</a> <span class="small muted num">${Y(i)}</span>
    <div class="fm">${opt ? '<span class="pill opt">اختیاری</span>' : ''}${meta(i, lane)}</div></div></li>`;
}
const drawn = {};
function pickFor(w) {
  const y = yearOf(w);
  const runsHere = new Set(W[w - 1].map(it => it[3]).filter(r => r >= 0));
  const fresh = POOL.filter(i => !isSeen(i));
  const near = fresh.filter(i => runPos[i] && runsHere.has(+runPos[i][0]));
  const same = fresh.filter(i => PH(i) === y);
  const r = Math.random();
  const src = near.length && r < 0.35 ? near : same.length && r < 0.8 ? same : fresh;
  return src.length ? src[Math.floor(Math.random() * src.length)] : null;
}
function slotHtml(w, n) {
  const k = 'free:' + w + ':' + n, v = seen[k] || '';
  let pick = '';
  const fi = v.startsWith('k:') ? KEYIDX[v.slice(2)] : drawn[k];
  if (fi !== undefined && fi !== null) pick = `<div class="pick" data-i="${fi}"><label><input type="checkbox" data-slot="${esc(k)}" ${v.startsWith('k:') ? 'checked' : ''}> دیدمش</label><a class="film" href="${linkOf(fi)}" target="_blank" rel="noopener">${esc(T(fi))}</a><span class="small muted num">${Y(fi)}</span><span class="fm">${meta(fi, LA(fi))}</span></div>`;
  const txt = v && !v.startsWith('k:') ? v : '';
  return `<li style="grid-template-columns:minmax(0,1fr)"><div class="slot"><div class="slotrow"><span class="lane F">آزاد</span><span class="small muted">هر چی دلت خواست: یه فیلم تازه، یه دوباره‌دیدن، یا یکی از قفسه</span></div>
    <div class="slotrow"><button type="button" class="btn" data-draw="${esc(k)}" data-w="${w}">${fi !== undefined && fi !== null ? 'یکی دیگه' : 'تاس بنداز'}</button><input type="text" data-free="${esc(k)}" value="${esc(txt)}" placeholder="Title (year)" aria-label="فیلم انتخابی این هفته"></div>${pick}</div></li>`;
}
function weekHtml(w) {
  const items = W[w - 1], m = WM[w - 1];
  const core = items.filter(it => it[2] === 1), opt = items.filter(it => it[2] === 0), nfree = items.filter(it => it[2] === 2).length;
  if (m.free) {
    let s = ''; for (let n = 0; n < nfree; n++) s += slotHtml(w, n);
    return `<article class="week free${w === curWeek ? ' current' : ''}" id="w-${w}"><div class="whead"><span class="wn">هفته‌ی ${fa(w)}</span><span class="wd">${wRange(w)}</span><span class="theme">هفته‌ی آزاد</span><span class="wcount" data-wc="${w}"></span></div>
      <div class="freebox"><p class="small muted" style="margin:0">این هفته برنامه نداره. عقب‌افتاده‌ها رو جبران کن، فیلم‌های تازه‌ی سال رو ببین، چیزی رو دوباره ببین، یا از قفسه تاس بنداز.</p></div><ul class="wl">${s}</ul></article>`;
  }
  let fn = 0;
  const rows = core.map(it => filmLi(it[1], it[0], false));
  items.filter(it => it[2] === 2).forEach(() => { const pos = Math.floor((w * 7 + fn * 3) % (rows.length + 1)); rows.splice(pos, 0, slotHtml(w, fn)); fn++; });
  return `<article class="week${w === curWeek ? ' current' : ''}" id="w-${w}"><div class="whead"><span class="wn">هفته‌ی ${fa(w)}</span><span class="wd">${wRange(w)}</span>${m.th ? `<span class="theme">هفته‌ی سرزده: ${esc(m.th)}</span>` : ''}<span class="wcount" data-wc="${w}"></span></div>
    <ul class="wl">${rows.join('')}</ul>${opt.length ? `<details class="more"><summary>${fa(opt.length)} فیلم اختیاری از همین کارنامه‌ها، سر جای تاریخی‌شون</summary><ul class="wl">${opt.map(it => filmLi(it[1], it[0], true)).join('')}</ul></details>` : ''}</article>`;
}
function renderSeason(si, scroll) {
  curSeason = si; renderTabs();
  const {a, b} = seasonRange(si), y = Math.floor(si / 4), sh = document.getElementById('shead');
  const core = itemsOfWeeks(a, b, true), opt = itemsOfWeeks(a, b, false);
  const needC = core.filter(it => ST(it[1]) === 'need'), needO = opt.filter(it => ST(it[1]) === 'need');
  const gb = l => Math.round(l.reduce((s, it) => s + (RT(it[1]) || 100) / 60, 0));
  const line = it => `${T(it[1])} (${Y(it[1])}) — ${DIR(it[1])} — ${RT(it[1]) || '?'} min — week ${WEEK_OF[it[1]]}`;
  const dlText = needC.map(line).join('\n') + (needO.length ? '\n\n# optional\n' + needO.map(line).join('\n') : '');
  const ar = runsIn(a, b, 'A'), cr = runsIn(a, b, 'C');
  const hy = core.filter(it => it[0] === 'H').map(it => Y(it[1]));
  const irn = core.filter(it => IR(it[1])).length;
  const fw = []; for (let w = a; w <= b; w++) if (WM[w - 1].free) fw.push(w);
  const tw = []; for (let w = a; w <= b; w++) if (WM[w - 1].th) tw.push(w);
  sh.innerHTML = `<div class="card"><h3 style="font-size:19px">سال ${fa(y + 1)}، فصل ${SEASON_NAMES[si % 4]}: ${esc(YN[y][0])}</h3>
    <div class="small muted pcs"><span class="pc">${wRange(a).split(' تا ')[0]} تا ${wRange(b).split(' تا ')[1]}</span><span class="pc">${fa(core.length)} فیلم</span><span class="pc">${fa(itemsOfWeeks(a, b).length - core.length)} اختیاری</span><span class="pc">${fa(core.filter(it => isSeen(it[1])).length)} دیده‌شده</span>${irn ? `<span class="pc">${fa(irn)} فیلم ایرانی</span>` : ''}${hy.length ? `<span class="pc">ستون تاریخ: ${faY(Math.min(...hy))} تا ${faY(Math.max(...hy))}</span>` : ''}${fw.length ? `<span class="pc">هفته‌ی آزاد: ${fw.map(fa).join('، ')}</span>` : ''}${tw.length ? `<span class="pc">هفته‌ی سرزده: ${tw.map(w => fa(w) + ' (' + esc(WM[w - 1].th) + ')').join('، ')}</span>` : ''}</div>
    <div class="chips" style="margin-top:8px">${ar.map(r => `<span class="chip"><i class="dot" style="background:var(--lA)"></i>${esc(rName(r))}</span>`).join('')}${cr.map(r => `<span class="chip"><i class="dot" style="background:var(--lC)"></i>${esc(rName(r))}</span>`).join('')}</div></div>
    ${needC.length + needO.length ? `<details class="dl"><summary>لیست دانلود این فصل: ${fa(needC.length)} فیلم (حدود ${fa(gb(needC))} گیگ) و ${fa(needO.length)} اختیاری (حدود ${fa(gb(needO))} گیگ)، با 1080p x265</summary><div class="dlbody"><div><button type="button" class="btn primary" id="copyDl">کپی لیست</button></div><pre id="dlpre">${esc(dlText)}</pre></div></details>` : ''}`;
  const cp = document.getElementById('copyDl');
  if (cp) cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText(dlText); cp.textContent = 'کپی شد'; } catch (e) { const r = document.createRange(); r.selectNodeContents(document.getElementById('dlpre')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); cp.textContent = 'متن انتخاب شد؛ کپی کن'; } setTimeout(() => cp.textContent = 'کپی لیست', 2500); });
  const ws = []; for (let w = a; w <= b; w++) ws.push(weekHtml(w));
  document.getElementById('weeks').innerHTML = ws.join('');
  refreshCounts();
  if (scroll) document.getElementById('h-seasons').scrollIntoView({behavior: 'smooth', block: 'start'});
}
const weeksEl = document.getElementById('weeks');
weeksEl.addEventListener('change', e => {
  const sl = e.target.closest('input[data-slot]');
  if (sl) { const k = sl.dataset.slot, i = +sl.closest('[data-i]').dataset.i; if (sl.checked) { setSeen(k, 'k:' + KEY(i)); markFilm(i, true); } else { setSeen(k, null); markFilm(i, false); } return; }
  const cb = e.target.closest('input[type=checkbox]');
  if (cb) { const li = cb.closest('li[data-i]'); if (li) markFilm(+li.dataset.i, cb.checked); return; }
  const fr = e.target.closest('input[data-free]');
  if (fr) { const v = fr.value.trim(); if (v) setSeen(fr.dataset.free, v); else if (!(seen[fr.dataset.free] || '').startsWith('k:')) setSeen(fr.dataset.free, null); }
});
weeksEl.addEventListener('click', e => {
  const b = e.target.closest('button[data-draw]'); if (!b) return;
  const k = b.dataset.draw, w = +b.dataset.w;
  if ((seen[k] || '').startsWith('k:')) return;
  drawn[k] = pickFor(w);
  const art = document.getElementById('w-' + w); if (art) { art.outerHTML = weekHtml(w); refreshCounts(); }
});

function refreshCounts() {
  const n = CORE.filter(o => isSeen(o.i)).length, no = OPT.filter(o => isSeen(o.i)).length;
  const nf = Object.keys(seen).filter(k => k.startsWith('free:')).length;
  const expected = CORE.filter(o => o.w < curWeek).length + FREE.filter(w => w < curWeek).length;
  document.getElementById('pbar').style.width = (n / CORE.length * 100) + '%';
  const diff = n + nf - expected;
  document.getElementById('progrow').innerHTML = `<span><b class="num">${fa(n)}</b> از ${fa(CORE.length)} فیلمِ هفته‌ها</span><span><b class="num">${fa(nf)}</b> از ${fa(FREE.length)} انتخاب آزاد</span><span><b class="num">${fa(no)}</b> اختیاری</span><span>${today < START ? 'برنامه از ' + jfmtFull.format(START) + ' شروع می‌شه' : `امروز هفته‌ی <b class="num">${fa(curWeek)}</b>ه (${wRange(curWeek)})`}</span><span>${expected === 0 ? 'تازه شروع کردی' : diff >= 0 ? `<b>${fa(diff)}</b> فیلم جلوتر از برنامه` : `<b>${fa(-diff)}</b> فیلم عقب‌تر از برنامه؛ اشکالی نداره، هفته‌ی آزاد بعدی برای همینه`}</span>`;
  document.getElementById('lanebars').innerHTML = LORDER.map(L => { const c = CORE.filter(o => o.l === L), d = c.filter(o => isSeen(o.i)).length;
    return `<div class="lanebar"><span><i class="dot" style="background:var(--l${L});width:8px;height:8px"></i> ${LNL[L]}: <b class="num" style="color:var(--ink)">${fa(d)}</b> از ${fa(c.length)}</span><div class="bar"><i style="width:${d / c.length * 100}%;background:var(--l${L})"></i></div></div>`; }).join('');
  document.querySelectorAll('[data-wc]').forEach(el => { const w = +el.dataset.wc; const c = W[w - 1].filter(it => it[2] === 1); const fr = W[w - 1].filter(it => it[2] === 2).length;
    const frd = Object.keys(seen).filter(k => k.startsWith('free:' + w + ':')).length;
    el.textContent = fa(c.filter(it => isSeen(it[1])).length + frd) + ' از ' + fa(c.length + fr); });
}
function jumpWeek(w) { renderSeason(seasonOf(w), false); const el = document.getElementById('w-' + w); if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'}); }
document.getElementById('goNow').addEventListener('click', () => jumpWeek(Math.min(NW, fxCur(fxCompact(D), Store.data))));

// ---- search + global dice ----
const sidx = F.map((f, i) => ({i, k: (f[0] + ' ' + f[2] + ' ' + (D.faDir[f[2]] || '')).toLowerCase()}));
const whereOf = i => WEEK_OF[i] ? `هفته‌ی ${fa(WEEK_OF[i])}، سال ${fa(yearOf(WEEK_OF[i]) + 1)}` : 'توی قفسه';
document.getElementById('q').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase(); const out = document.getElementById('results');
  if (q.length < 2) { out.innerHTML = ''; return; }
  const hits = sidx.filter(x => x.k.includes(q)).slice(0, 14);
  out.innerHTML = hits.map(x => `<button type="button" data-w="${WEEK_OF[x.i] || ''}"><span><span class="film">${esc(T(x.i))}</span> <span class="small muted">${Y(x.i)}</span></span><span class="small muted">${whereOf(x.i)}</span></button>`).join('') || '<div class="small muted">توی برنامه نیست.</div>';
});
document.getElementById('results').addEventListener('click', e => { const b = e.target.closest('button[data-w]'); if (b && b.dataset.w) jumpWeek(+b.dataset.w); });
document.getElementById('dice').addEventListener('click', () => {
  const fresh = D.shelf.filter(i => !isSeen(i)); if (!fresh.length) return;
  const i = fresh[Math.floor(Math.random() * fresh.length)];
  document.getElementById('results').innerHTML = `<div class="card" data-i="${i}" style="padding:10px 14px"><a class="film" href="${linkOf(i)}" target="_blank" rel="noopener">${esc(T(i))}</a> <span class="small muted num">${Y(i)}</span><div class="fm">${meta(i, LA(i))}</div><label class="small" style="display:flex;gap:6px;margin-top:6px;cursor:pointer"><input type="checkbox" id="diceSeen" ${isSeen(i) ? 'checked' : ''}> دیدمش</label></div>`;
  document.getElementById('diceSeen').addEventListener('change', e => markFilm(i, e.target.checked));
});

// ---- shelf ----
(function shelf() {
  const by = {}; D.shelf.forEach(i => { (by[LA(i)] = by[LA(i)] || []).push(i); });
  document.getElementById('shelfnote').textContent = D.shelfnote;
  document.getElementById('shelfsum').textContent = `${fa(D.shelf.length)} فیلم، به تفکیک رگه (به‌اضافه‌ی ${fa(OPT.length)} فیلم اختیاری که کنار کارنامه‌ها توی هفته‌ها هستن)`;
  document.getElementById('shelf').innerHTML = LORDER.filter(L => by[L]).map(L => `<div><div class="boxh"><i class="dot" style="background:var(--l${L})"></i>${LNL[L]} · ${fa(by[L].length)}</div><ul>${by[L].sort((a, b) => Y(a) - Y(b)).map(i => `<li data-i="${i}" class="${isSeen(i) ? 'seen' : ''}"><span><a class="film" href="${linkOf(i)}" target="_blank" rel="noopener">${esc(T(i))}</a> <span class="muted num">${Y(i)}</span></span><span class="small muted"><bdi>${esc(DIR(i))}</bdi></span></li>`).join('')}</ul></div>`).join('');
})();
document.getElementById('foot').textContent = D.foot;
const hw = (location.hash.match(/^#w-(\d+)$/) || [])[1];
Store.load().then(() => { if (hw) jumpWeek(+hw); else renderSeason(curSeason, false); refreshCounts(); });
renderSeason(curSeason, false);
document.getElementById('bkCopy').addEventListener('click', async () => {
  const o = {}; Object.entries(Store.data).forEach(([k, v]) => { if (!k.startsWith('cfg:')) o[k] = v; });
  const txt = JSON.stringify(o); const n = document.getElementById('bkNote');
  try { await navigator.clipboard.writeText(txt); n.textContent = 'کپی شد: ' + fa(Object.keys(o).length) + ' مورد.'; }
  catch (e) { document.getElementById('bkIn').value = txt; n.textContent = 'متن توی کادر گذاشته شد؛ خودت کپی کن.'; }
});
document.getElementById('bkLoad').addEventListener('click', () => {
  const n = document.getElementById('bkNote');
  try { const o = JSON.parse(document.getElementById('bkIn').value); let c = 0; Object.entries(o).forEach(([k, v]) => { if (v && !k.startsWith('cfg:') && !Store.data[k]) { Store.set(k, v); c++; } }); n.textContent = fa(c) + ' مورد اضافه شد.'; renderSeason(curSeason, false); refreshCounts(); }
  catch (e) { n.textContent = 'این متن پشتیبان درست نیست؛ کل متنی که کپی کردی رو بچسبون.'; }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
