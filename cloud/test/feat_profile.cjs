// A member visiting another member's profile sees their taste match at once (Playwright against test/server.mjs on :8790).
const {chromium} = require('playwright');
const B = 'http://localhost:8790';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const person = async (u, films) => {
    const c = await b.newContext({serviceWorkers: 'block'}), p = await c.newPage();
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('[data-ostart="list"]', {timeout: 15000});
    await p.evaluate(() => { Store.set('cfg:since', new Date().toISOString().slice(0, 10)); Store.set('cfg:plan', 'sample'); }); await p.waitForSelector('.fx-tabbar');
    await p.evaluate(films => films.forEach(([t, y, r], i) => { Store.set('log:p' + i, 't:' + t + ' (' + y + ')'); Store.set('v:log:p' + i, '2026-10-0' + (i + 1)); Store.set('r:log:p' + i, r); }), films);
    await p.waitForTimeout(2200); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(800);
    return p;
  };
  const a = await person('amy', [['Heat', 1995, 10], ['Fargo', 1996, 8], ['Alien', 1979, 6], ['Ran', 1985, 9]]);
  const z = await person('zack', [['Heat', 1995, 9], ['Fargo', 1996, 8], ['Alien', 1979, 7], ['Jaws', 1975, 5]]);
  await z.goto(B + '/u/amy'); await z.waitForSelector('.fx-tchip', {timeout: 10000});
  const chip = await z.$eval('.fx-tchip', e => e.innerText.replace(/\s+/g, ' '));
  ok(/87% taste match, 3 films in common/.test(chip), 'taste match in the header', chip);
  await z.click('.fx-tchip'); await z.waitForSelector('.fx-score');
  ok(/87/.test(await z.$eval('.fx-score', e => e.innerText)) && /Your ratings vs./.test(await z.$eval('.fx-gintro', e => e.innerText)), 'opens the full comparison');
  await a.goto(B + '/u/amy'); await a.waitForSelector('.fx-pmeta', {timeout: 10000}); await a.waitForTimeout(800);
  ok(await a.$('.fx-tchip') === null, 'not on your own profile');
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
