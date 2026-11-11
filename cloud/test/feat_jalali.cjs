// The Solar Hijri calendar: month boundaries, and the diary's years in Persian (Playwright against test/server.mjs on :8790).
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
eval(fs.readFileSync(path.join(__dirname, '../public/fxcal.js'), 'utf8').replace(/^const /gm, 'var '));
// month lengths: 31 × 6, 30 × 5, then 29 or 30; Nowruz 1405 = 21 March 2026; Aban 1405 starts 23 October 2026
let bad = 0;
for (let y = 1395; y <= 1410; y++) { let tot = 0; for (let m = 1; m <= 12; m++) { const d = fxJalMonth(y, m); tot += d.length; if (m <= 11 && d.length !== (m <= 6 ? 31 : 30)) bad++; } if (tot < 365 || tot > 366) bad++; }
ok(bad === 0, 'month lengths for 1395–1410');
ok(fxJalMonth(1405, 1)[0] === '2026-03-21' && fxJalMonth(1405, 8)[0] === '2026-10-23', 'Nowruz and Aban 1405');
ok(fxYearOf('2026-03-20', true) === '1404' && fxYearOf('2026-03-21', true) === '1405', 'the year turns at Nowruz');
(async () => {
  const b = await chromium.launch(), c = await b.newContext({serviceWorkers: 'block'}), p = await c.newPage();
  await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
  await p.goto('http://localhost:8790/'); await p.waitForSelector('form[data-auth]');
  await p.click('[data-amode="up"]'); await p.fill('input[name=u]', 'jal_user'); await p.fill('input[name=p]', 'jalali pass 1');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-ostart="sample"]', {timeout: 15000});
  await p.click('[data-ostart="sample"]'); await p.waitForSelector('.fx-tabbar');
  await p.evaluate(() => { [['2026-03-20', 'A'], ['2026-03-21', 'B'], ['2025-12-30', 'C']].forEach(([d, t], i) => { Store.set('log:j' + i, 't:' + t + ' (2000)'); Store.set('v:log:j' + i, d); }); Store.set('cfg:lang', 'fa'); });
  await p.click('[data-nav="diary"]'); await p.waitForTimeout(500);
  const chips = await p.$$eval('.fx-years button', l => l.map(b => b.dataset.year));
  ok(JSON.stringify(chips) === JSON.stringify(['1405', '1404', 'all']), 'Persian diary: years 1405 and 1404', chips);
  await p.click('[data-year="1404"]'); await p.waitForTimeout(300);
  ok(await p.$$eval('.fx-de', l => l.length) === 2, '1404 holds 30 Dec 2025 and 20 Mar 2026');
  await p.click('[data-nav="settings"]'); await p.click('[data-cal="g"]'); await p.click('[data-nav="diary"]'); await p.waitForTimeout(300);
  const g = await p.$$eval('.fx-years button', l => l.map(b => b.dataset.year));
  ok(JSON.stringify(g) === JSON.stringify(['2026', '2025', 'all']), 'Gregorian when chosen', g);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
