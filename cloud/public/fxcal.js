// The reader's calendar. Persian readers count years and months in the Solar Hijri calendar (۱۴۰۵, آبان),
// unless they chose the Gregorian one (cfg:cal = 'g'). Dates are stored as 'YYYY-MM-DD' (Gregorian) either way.
const FX_JF = (() => { try { const f = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC'}); return f.formatToParts(new Date(Date.UTC(2026, 2, 21))).some(p => p.type === 'year' && p.value === '1405') ? f : null; } catch (e) { return null; } })();
const FX_JC = new Map();
function fxJal(ds) {  // 'YYYY-MM-DD' → [year, month, day], Solar Hijri
  let v = FX_JC.get(ds);
  if (!v) {
    const p = {}; FX_JF.formatToParts(new Date(ds + 'T12:00:00Z')).forEach(x => { p[x.type] = x.value; });
    v = [+p.year, +p.month, +p.day]; FX_JC.set(ds, v);
  }
  return v;
}
function fxJalOn(lang, seen) { return lang === 'fa' && !!FX_JF && !(seen && seen['cfg:cal'] === 'g'); }
function fxYearOf(ds, jal) { return jal ? String(fxJal(ds)[0]) : String(ds).slice(0, 4); }
const fxIso = t => new Date(t).toISOString().slice(0, 10);
// the days of one Solar Hijri month, as 'YYYY-MM-DD'
function fxJalMonth(jy, jm) {
  let t = Date.UTC(jy + 621, 2, 21) + ((jm <= 6 ? (jm - 1) * 31 : 186 + (jm - 7) * 30) - 3) * 864e5;
  const cmp = ds => { const [y, m] = fxJal(ds); return y !== jy ? y - jy : m - jm; };
  while (cmp(fxIso(t)) >= 0) t -= 864e5;
  while (cmp(fxIso(t)) < 0) t += 864e5;
  const out = [];
  while (cmp(fxIso(t)) === 0) { out.push(fxIso(t)); t += 864e5; }
  return out;
}

// Watch calendar: 12 small months, GitHub-style intensity. Shared by the app and the public profile.
// dates: one 'YYYY-MM-DD' per diary entry; year: 'YYYY' (Solar Hijri when jal) or 'all' (then the last 12 months)
function fxCalendar(dates, year, lang, todayStr, labels, jal) {
  const L = labels, count = {};
  dates.forEach(d => { count[d] = (count[d] || 0) + 1; });
  const cell = ds => { const c = count[ds] || 0; return `<i class="l${c >= 3 ? 3 : c}${ds === todayStr ? ' today' : ''}${ds > todayStr ? ' fut' : ''}" title="${ds}${c ? ' · ' + c : ''}"></i>`; };
  let h = '';
  if (jal) {
    // Solar Hijri: Farvardin first, weeks from Saturday, read right to left
    const mf = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {month: 'long', timeZone: 'UTC'}), months = [];
    if (year === 'all') { let [y, m] = fxJal(todayStr); for (let k = 0; k < 12; k++) { months.unshift([y, m]); if (--m < 1) { m = 12; y--; } } }
    else for (let m = 1; m <= 12; m++) months.push([+year, m]);
    h = '<div class="fx-cal" dir="rtl">';
    months.forEach(([y, m]) => {
      const days = fxJalMonth(y, m); if (!days.length) return;
      const lead = (new Date(days[0] + 'T12:00:00Z').getUTCDay() + 1) % 7;
      h += `<div class="fx-calm"><span>${mf.format(new Date(days[0] + 'T12:00:00Z'))}</span><div class="fx-calg">${'<i class="pad"></i>'.repeat(lead)}${days.map(cell).join('')}</div></div>`;
    });
  } else {
    const mf = new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-gregory' : 'en-US', {month: 'short', timeZone: 'UTC'});
    const months = [];
    if (year === 'all') { const t = new Date(todayStr + 'T12:00:00Z'); for (let k = 11; k >= 0; k--) months.push([t.getUTCFullYear(), t.getUTCMonth() - k]); }
    else for (let m = 0; m < 12; m++) months.push([+year, m]);
    h = '<div class="fx-cal" dir="ltr">';
    months.forEach(([y, m]) => {
      const f1 = new Date(Date.UTC(y, m, 1)), Y = f1.getUTCFullYear(), M = f1.getUTCMonth();
      const len = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate(), lead = (f1.getUTCDay() + 6) % 7;
      let cells = '<i class="pad"></i>'.repeat(lead);
      for (let d = 1; d <= len; d++) cells += cell(Y + '-' + String(M + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
      h += `<div class="fx-calm"><span>${mf.format(f1)}</span><div class="fx-calg">${cells}</div></div>`;
    });
  }
  h += '</div>';
  return h + `<div class="fx-callegend" dir="${jal ? 'rtl' : 'ltr'}"><span>${L.less}</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>${L.more}</span></div>`;
}
const FX_CAL_L = {
  en: {less: 'Less', more: 'More', title: 'Watch calendar'},
  fa: {less: 'کم', more: 'زیاد', title: 'تقویم تماشا'},
};
