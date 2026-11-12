// The + in the bar logs a film from any tab; the watchlist logs too, and logged films leave it; the diary as posters.
const {chromium} = require('playwright');
const B = 'http://localhost:8790';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}), p = await c.newPage();
  await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"/>'}));
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
  await p.click('[data-amode="up"]'); await p.fill('input[name=u]', 'logger'); await p.fill('input[name=p]', 'pass for logger');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('[data-ostart="list"]', {timeout: 15000});
  await p.evaluate(() => { Store.set('cfg:since', new Date().toISOString().slice(0, 10)); Store.set('cfg:plan', 'sample'); }); await p.waitForSelector('.fx-tabbar');
  ok(await p.$eval('.fx-tabbar button[aria-current="page"]', e => e.dataset.nav) === 'week', 'it opens on Home');
  await p.click('[data-nav="friends"]'); await p.waitForTimeout(300);
  ok(await p.$eval('.fx-tabbar button[aria-current="page"]', e => e.dataset.nav) === 'friends', 'on Activity');
  // + from Activity: search, pick, rate, save — and still on Activity
  await p.click('[data-qlog]'); await p.fill('.fx-pick-q', 'Stalker'); await p.waitForSelector('[data-pick-tm]', {timeout: 8000});
  await p.click('[data-pick-tm]'); await p.waitForSelector('.fx-sheet', {timeout: 8000});
  await p.click('.fx-sheet [data-ssave]');
  await p.waitForTimeout(800);
  const logged = await p.evaluate(() => fxDiary(window.D, Store.data).map(e => e.t));
  ok(logged.some(t => /Stalker/.test(t)), 'logged from Activity', logged);
  ok(await p.$eval('.fx-tabbar button[aria-current="page"]', e => e.dataset.nav) === 'friends', 'still on Activity');
  // watchlist → Log → it leaves the watchlist
  await p.evaluate(() => Store.set('wl:tm4242', JSON.stringify({t: 'Ugetsu', y: 1953, tm: 4242, p: '', u: 'someone', at: Date.now()})));
  await p.click('[data-nav="week"]'); await p.click('[data-nav="friends"]'); await p.evaluate(() => { document.querySelector('.fx-wl').open = true; });
  await p.waitForSelector('[data-wl-log]'); await p.click('[data-wl-log]'); await p.waitForSelector('.fx-sheet', {timeout: 8000});
  await p.click('.fx-sheet [data-ssave]');
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => fxDiary(window.D, Store.data).some(e => /Ugetsu/.test(e.t))), 'logged from the watchlist');
  ok(await p.evaluate(() => !Store.data['wl:tm4242']), 'and it left the watchlist');
  // the diary as posters
  await p.click('[data-nav="diary"]'); await p.click('[data-dview="grid"]'); await p.waitForTimeout(400);
  ok(await p.$$eval('.fx-dgrid .fx-gcell', l => l.length) === 2, 'diary as a poster grid');
  await p.click('.fx-dgrid .fx-gcell'); await p.waitForSelector('.fx-sheet', {timeout: 5000});
  ok(true, 'a poster opens its entry');
  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
