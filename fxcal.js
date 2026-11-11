// Watch calendar (12 small months, GitHub-style intensity) and streaks. Shared by the app and the public profile.
function fxStreaks(dates, todayStr) {
  const set = new Set(dates), days = [...set].sort();
  const toN = s => Math.floor(Date.parse(s + 'T00:00:00Z') / 864e5);
  let longest = 0, run = 0, prev = null;
  days.forEach(d => { const n = toN(d); run = prev !== null && n === prev + 1 ? run + 1 : 1; prev = n; if (run > longest) longest = run; });
  let current = 0, n = toN(todayStr);
  if (!set.has(todayStr)) n -= 1; // a streak is still alive if the last film was yesterday
  while (set.has(new Date(n * 864e5).toISOString().slice(0, 10))) { current++; n--; }
  return {longest, current, days: set.size};
}
// dates: one 'YYYY-MM-DD' per diary entry; year: 'YYYY' or 'all' (then the last 12 months)
function fxCalendar(dates, year, lang, todayStr, labels) {
  const count = {}; dates.forEach(d => { count[d] = (count[d] || 0) + 1; });
  const cal = lang === 'fa' ? 'fa-IR-u-ca-gregory' : 'en-US';
  const mf = new Intl.DateTimeFormat(cal, {month: 'short', timeZone: 'UTC'});
  const num = n => lang === 'fa' ? Number(n).toLocaleString('fa-IR') : String(n);
  const months = [];
  if (year === 'all') { const t = new Date(todayStr + 'T12:00:00Z'); for (let k = 11; k >= 0; k--) months.push([t.getUTCFullYear(), t.getUTCMonth() - k]); }
  else for (let m = 0; m < 12; m++) months.push([+year, m]);
  const inRange = [];
  let h = '<div class="fx-cal" dir="ltr">';
  months.forEach(([y, m]) => {
    const first = new Date(Date.UTC(y, m, 1)), Y = first.getUTCFullYear(), M = first.getUTCMonth();
    const len = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate(), lead = (first.getUTCDay() + 6) % 7;
    let cells = '';
    for (let k = 0; k < lead; k++) cells += '<i class="pad"></i>';
    for (let d = 1; d <= len; d++) {
      const ds = Y + '-' + String(M + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'), c = count[ds] || 0;
      if (c) inRange.push(ds);
      const lv = c >= 3 ? 3 : c, fut = ds > todayStr;
      cells += `<i class="l${lv}${ds === todayStr ? ' today' : ''}${fut ? ' fut' : ''}" title="${ds}${c ? ' · ' + c : ''}"></i>`;
    }
    h += `<div class="fx-calm"><span>${mf.format(first)}</span><div class="fx-calg">${cells}</div></div>`;
  });
  h += '</div>';
  const s = fxStreaks(dates, todayStr), sr = fxStreaks(inRange, todayStr);
  const stats = `<div class="fx-calstats"><div><b>${num(new Set(inRange).size)}</b><span>${labels.days}</span></div><div><b>${num(sr.longest)}</b><span>${labels.longest}</span></div><div><b>${num(s.current)}</b><span>${labels.current}</span></div></div>`;
  return stats + h + `<div class="fx-callegend" dir="ltr"><span>${labels.less}</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>${labels.more}</span></div>`;
}
const FX_CAL_L = {
  en: {days: 'days with a film', longest: 'longest streak', current: 'current streak', less: 'Less', more: 'More', title: 'Watch calendar'},
  fa: {days: 'روز با فیلم', longest: 'طولانی‌ترین زنجیره', current: 'زنجیره‌ی فعلی', less: 'کم', more: 'زیاد', title: 'تقویم تماشا'},
};
