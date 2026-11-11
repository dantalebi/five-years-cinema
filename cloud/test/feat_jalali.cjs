// The Solar Hijri calendar helpers in fxcal.js (shared with the old site): month boundaries and the year turning at Nowruz.
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
eval(fs.readFileSync(path.join(__dirname, '../public/fxcal.js'), 'utf8').replace(/^const /gm, 'var '));
// month lengths: 31 × 6, 30 × 5, then 29 or 30; Nowruz 1405 = 21 March 2026; Aban 1405 starts 23 October 2026
let bad = 0;
for (let y = 1395; y <= 1410; y++) { let tot = 0; for (let m = 1; m <= 12; m++) { const d = fxJalMonth(y, m); tot += d.length; if (m <= 11 && d.length !== (m <= 6 ? 31 : 30)) bad++; } if (tot < 365 || tot > 366) bad++; }
ok(bad === 0, 'month lengths for 1395–1410');
ok(fxJalMonth(1405, 1)[0] === '2026-03-21' && fxJalMonth(1405, 8)[0] === '2026-10-23', 'Nowruz and Aban 1405');
ok(fxYearOf('2026-03-20', true) === '1404' && fxYearOf('2026-03-21', true) === '1405', 'the year turns at Nowruz');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
