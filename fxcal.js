// Watch calendar (12 small months, GitHub-style intensity) and four headline numbers. Shared by the app and the public profile.
const fxDayN = s => Math.floor(Date.parse(s + 'T00:00:00Z') / 864e5);
const fxDayS = n => new Date(n * 864e5).toISOString().slice(0, 10);
function fxStreaks(dates, todayStr) {
  const set = new Set(dates), days = [...set].sort();
  let longest = 0, lStart = '', lEnd = '', run = 0, start = '', prev = null;
  days.forEach(d => {
    const n = fxDayN(d);
    if (prev !== null && n === prev + 1) run++; else { run = 1; start = d; }
    prev = n;
    if (run > longest) { longest = run; lStart = start; lEnd = d; }
  });
  // a streak is still alive if the last film was yesterday
  let current = 0, n = fxDayN(todayStr);
  if (!set.has(todayStr)) n -= 1;
  while (set.has(fxDayS(n))) { current++; n--; }
  const past = days.filter(d => d <= todayStr);
  return {longest, lStart, lEnd, current, cStart: current ? fxDayS(n + 1) : '', last: past.length ? past[past.length - 1] : '', days: set.size};
}
// dates: one 'YYYY-MM-DD' per diary entry; year: 'YYYY' or 'all' (then the last 12 months)
function fxCalendar(dates, year, lang, todayStr, labels) {
  const L = labels, count = {};
  dates.forEach(d => { count[d] = (count[d] || 0) + 1; });
  const cal = lang === 'fa' ? 'fa-IR-u-ca-gregory' : 'en-US';
  const mf = new Intl.DateTimeFormat(cal, {month: 'short', timeZone: 'UTC'});
  const mlong = new Intl.DateTimeFormat(cal, {month: 'long', timeZone: 'UTC'});
  const dm = new Intl.DateTimeFormat(cal, {month: 'short', day: 'numeric', timeZone: 'UTC'});
  const dOnly = new Intl.DateTimeFormat(cal, {day: 'numeric', timeZone: 'UTC'});
  const num = n => lang === 'fa' ? Number(n).toLocaleString('fa-IR') : Number(n).toLocaleString('en-US');
  const asDate = s => new Date(s + 'T12:00:00Z');
  const months = [];
  if (year === 'all') { const t = asDate(todayStr); for (let k = 11; k >= 0; k--) months.push([t.getUTCFullYear(), t.getUTCMonth() - k]); }
  else for (let m = 0; m < 12; m++) months.push([+year, m]);
  const first = new Date(Date.UTC(months[0][0], months[0][1], 1)).toISOString().slice(0, 10);
  const lastM = months[11], lastDay = new Date(Date.UTC(lastM[0], lastM[1] + 1, 0)).toISOString().slice(0, 10);
  const end = lastDay < todayStr ? lastDay : todayStr;
  const inRange = dates.filter(d => d >= first && d <= end);
  let h = '<div class="fx-cal" dir="ltr">';
  months.forEach(([y, m]) => {
    const f1 = new Date(Date.UTC(y, m, 1)), Y = f1.getUTCFullYear(), M = f1.getUTCMonth();
    const len = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate(), lead = (f1.getUTCDay() + 6) % 7;
    let cells = '';
    for (let k = 0; k < lead; k++) cells += '<i class="pad"></i>';
    for (let d = 1; d <= len; d++) {
      const ds = Y + '-' + String(M + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'), c = count[ds] || 0;
      const lv = c >= 3 ? 3 : c, fut = ds > todayStr;
      cells += `<i class="l${lv}${ds === todayStr ? ' today' : ''}${fut ? ' fut' : ''}" title="${ds}${c ? ' · ' + c : ''}"></i>`;
    }
    h += `<div class="fx-calm"><span>${mf.format(f1)}</span><div class="fx-calg">${cells}</div></div>`;
  });
  h += '</div>';
  // the four numbers
  // share of days counted from the first film logged in this period, so a diary that started last week isn't "1%"
  const from = inRange.length ? inRange.reduce((m, d) => d < m ? d : m) : first;
  const active = new Set(inRange).size, span = end >= from ? fxDayN(end) - fxDayN(from) + 1 : 0;
  const sr = fxStreaks(inRange, end), all = fxStreaks(dates, todayStr), live = todayStr >= first && todayStr <= lastDay;
  const range = (a, b) => a === b ? dm.format(asDate(a)) : a.slice(0, 7) === b.slice(0, 7) && lang !== 'fa' ? dm.format(asDate(a)) + '–' + dOnly.format(asDate(b)) : dm.format(asDate(a)) + ' – ' + dm.format(asDate(b));
  const rel = d => { const n = fxDayN(todayStr) - fxDayN(d); return n <= 0 ? L.today : n === 1 ? L.yesterday : L.ago(num(n)); };
  const days = n => `${num(n)}<small>${n === 1 ? L.day : L.days}</small>`;
  const tile = (v, label, sub) => `<div class="fx-cst"><b>${v}</b><span class="fx-cstl">${label}</span>${sub ? `<span class="fx-csts">${sub}</span>` : ''}</div>`;
  const tiles = [tile(num(active), L.active, span ? L.pct(num(Math.round(active / span * 100))) : '')];
  tiles.push(tile(days(sr.longest), L.longest, sr.longest > 1 ? range(sr.lStart, sr.lEnd) : sr.longest === 1 ? dm.format(asDate(sr.lStart)) : ''));
  if (live) tiles.push(tile(days(all.current), L.current, all.current ? L.since(dm.format(asDate(all.cStart))) : all.last ? L.last(rel(all.last)) : L.none));
  else { const wk = span ? inRange.length / (span / 7) : 0; tiles.push(tile(num(inRange.length), L.films, wk ? L.perWeek(lang === 'fa' ? wk.toLocaleString('fa-IR', {maximumFractionDigits: 1}) : wk.toFixed(1)) : '')); }
  const byM = {}; inRange.forEach(d => { const k = d.slice(0, 7); byM[k] = (byM[k] || 0) + 1; });
  const top = Object.entries(byM).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))[0];
  tiles.push(tile(top ? mlong.format(asDate(top[0] + '-01')) : '—', L.busiest, top ? L.films_(num(top[1]), top[1]) : ''));
  return `<div class="fx-calstats">${tiles.join('')}</div>` + h + `<div class="fx-callegend" dir="ltr"><span>${L.less}</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>${L.more}</span></div>`;
}
const FX_CAL_L = {
  en: {active: 'Days with a film', pct: p => p + '% of days', longest: 'Longest streak', current: 'Current streak', day: 'day', days: 'days',
    since: d => 'since ' + d, last: r => 'last film ' + r, today: 'today', yesterday: 'yesterday', ago: n => n + ' days ago', none: 'nothing logged yet',
    films: 'Films', perWeek: a => a + ' a week', busiest: 'Busiest month', films_: (s, n) => s + (n === 1 ? ' film' : ' films'),
    less: 'Less', more: 'More', title: 'Watch calendar'},
  fa: {active: 'روزهای فیلم‌دیدن', pct: p => p + '٪ از روزها', longest: 'طولانی‌ترین زنجیره', current: 'زنجیره‌ی فعلی', day: 'روز', days: 'روز',
    since: d => 'از ' + d, last: r => 'آخرین فیلم: ' + r, today: 'امروز', yesterday: 'دیروز', ago: n => n + ' روز پیش', none: 'هنوز چیزی ثبت نشده',
    films: 'فیلم', perWeek: a => 'هفته‌ای ' + a, busiest: 'پرفیلم‌ترین ماه', films_: s => s + ' فیلم',
    less: 'کم', more: 'زیاد', title: 'تقویم تماشا'},
};
