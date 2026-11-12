// The plan map: opens from This Week, counts what you've watched, tapping a week shows its films (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const B = 'http://localhost:8790';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}), p = await c.newPage();
  await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
  await p.click('[data-amode="up"]'); await p.fill('input[name=u]', 'mapper'); await p.fill('input[name=p]', 'pass for mapper');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-ostart="sample"]', {timeout: 15000});
  await p.click('[data-ostart="sample"]'); await p.waitForSelector('.fx-tabbar');
  await p.click('[data-nav="week"]');
  ok(await p.$('.fx-planlink') !== null, 'This Week links to the whole plan', await p.$eval('.fx-planlink', e => e.innerText).catch(() => ''));
  // watch three of week 1's films
  const keys = await p.evaluate(() => { const ks = fxItems(window.D, 1, Store.data).filter(x => !x.free).slice(0, 3).map(x => x.k); ks.forEach(k => Store.set(k, '2026-11-10')); return ks; });
  await p.click('.fx-planlink'); await p.waitForSelector('.pm-svg');
  ok(await p.$$eval('.pm-svg', l => l.length) === 5, 'five years on the map');
  ok(await p.$$eval('.pm-c.s-w', l => l.length) === 3, 'three squares filled in', await p.$$eval('.pm-c.s-w', l => l.length));
  ok(/^3\b/.test(await p.$eval('.pm-stats b', e => e.innerText)), 'stats: 3 watched');
  ok(/Week 1\b/.test(await p.$eval('#pm-week', e => e.innerText)) && /You’re here/.test(await p.$eval('#pm-week', e => e.innerText)), 'week panel starts at this week');
  // tap week 30 on the map
  await p.click('.pm-svg >> nth=0 >> [data-pmwk="30"] .pm-hit', {force: true}); await p.waitForTimeout(500);
  ok(/Week 30/.test(await p.$eval('#pm-week h2', e => e.innerText)), 'tapping a week opens it', await p.$eval('#pm-week h2', e => e.innerText));
  await p.click('[data-pmstep="1"]'); await p.waitForTimeout(300);
  ok(/Week 31/.test(await p.$eval('#pm-week h2', e => e.innerText)), 'next week');
  await p.click('[data-pmgo]'); await p.waitForTimeout(300);
  ok(/Week 1\b/.test(await p.$eval('#pm-week h2', e => e.innerText)), 'back to this week');
  // a movement and a director open their films
  if (await p.$('[data-pmg]')) { await p.click('[data-pmg]'); ok(await p.$$eval('.pm-groups .pm-fl li', l => l.length) > 3, 'a movement lists its films'); }
  if (await p.$('[data-pmd]')) { await p.click('[data-pmd]'); ok(await p.$$eval('.pm-dirs .pm-fl li', l => l.length) > 1, 'a director lists their films by week'); }
  await p.click('[data-nav="week"]'); ok(await p.$('.pm-svg') === null, '← This Week goes back');
  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
