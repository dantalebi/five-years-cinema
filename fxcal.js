// Watch calendar: 12 small months, GitHub-style intensity. Shared by the app and the public profile.
// dates: one 'YYYY-MM-DD' per diary entry; year: 'YYYY' or 'all' (then the last 12 months)
function fxCalendar(dates, year, lang, todayStr, labels) {
  const L = labels, count = {};
  dates.forEach(d => { count[d] = (count[d] || 0) + 1; });
  const cal = lang === 'fa' ? 'fa-IR-u-ca-gregory' : 'en-US';
  const mf = new Intl.DateTimeFormat(cal, {month: 'short', timeZone: 'UTC'});
  const asDate = s => new Date(s + 'T12:00:00Z');
  const months = [];
  if (year === 'all') { const t = asDate(todayStr); for (let k = 11; k >= 0; k--) months.push([t.getUTCFullYear(), t.getUTCMonth() - k]); }
  else for (let m = 0; m < 12; m++) months.push([+year, m]);
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
  return h + `<div class="fx-callegend" dir="ltr"><span>${L.less}</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>${L.more}</span></div>`;
}
const FX_CAL_L = {
  en: {less: 'Less', more: 'More', title: 'Watch calendar'},
  fa: {less: 'کم', more: 'زیاد', title: 'تقویم تماشا'},
};
