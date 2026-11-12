// A year in film: from the diary and from a profile's Stats, with its story picture (Playwright against test/server.mjs on :8790).
const {chromium} = require('playwright');
const B = 'http://localhost:8790';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}), p = await c.newPage();
  await c.route(/image\.tmdb\.org/, r => r.fulfill({status: 200, contentType: 'image/svg+xml', headers: {'access-control-allow-origin': '*'}, body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"><rect width="20" height="30" fill="#486"/></svg>'}));
  await c.route(/fonts\.g/, r => r.fulfill({status: 200, body: ''}));
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
  await p.click('[data-amode="up"]'); await p.fill('input[name=u]', 'wrapper'); await p.fill('input[name=n]', 'Wren'); await p.fill('input[name=p]', 'pass for wrapper');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-ostart="sample"]', {timeout: 15000});
  await p.click('[data-ostart="sample"]'); await p.waitForSelector('.fx-tabbar');
  await p.evaluate(() => { [['Heat', 1995, '2025-03-02', 10], ['Ran', 1985, '2025-03-03', 10], ['Alien', 1979, '2025-07-09', 8], ['Jaws', 1975, '2025-07-10', 6], ['Up', 2009, '2026-01-02', 7]].forEach(([t, y, d, r], i) => {
    const k = 'log:w' + i; Store.set(k, 't:' + t + ' (' + y + ')'); Store.set('v:' + k, d); Store.set('r:' + k, r); Store.set('md:' + k, JSON.stringify({tm: 100 + i, t, y, d: 'Some Director', m: 100, p: '/p' + i + '.jpg'})); }); });
  await p.waitForTimeout(2500); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(1500);
  await p.click('[data-nav="diary"]'); await p.click('[data-year="2025"]');
  ok(await p.$('[data-wrapped="2025"]') !== null, 'a way in from the diary (2025: 4 films)');
  await p.click('[data-year="2026"]'); ok(await p.$('[data-wrapped]') === null, 'not for a year with one film');
  await p.click('[data-year="2025"]'); await p.click('[data-wrapped]'); await p.waitForSelector('.fw');
  ok(/4\s*films/.test(await p.$eval('.fw-big', e => e.innerText)), '4 films in 2025', await p.$eval('.fw-big', e => e.innerText.replace(/\s+/g, ' ')));
  ok(/March|July/.test(await p.$eval('.fw', e => e.innerText)) && /Some Director/.test(await p.$eval('.fw', e => e.innerText)), 'months and directors');
  await p.click('[data-fwimg]'); await p.waitForSelector('.fw-prev img', {timeout: 15000});
  const size = await p.evaluate(() => new Promise(r => { const im = document.querySelector('.fw-prev img'); if (im.complete) r([im.naturalWidth, im.naturalHeight]); else im.onload = () => r([im.naturalWidth, im.naturalHeight]); }));
  ok(size[0] === 1080 && size[1] === 1920, 'a 1080×1920 picture', size);
  ok(await p.$('.fw-prev a[download]') !== null, 'with a Save link');
  await p.keyboard.press('Escape'); ok(await p.$('.fw') === null, 'Escape closes it');
  // the same from the public profile's Stats
  await p.goto(B + '/u/wrapper'); await p.waitForSelector('[data-tab="stats"]'); await p.click('[data-tab="stats"]');
  await p.click('[data-year="2025"]'); await p.click('[data-wrapped="2025"]'); await p.waitForSelector('.fw');
  ok(/Wren’s year/.test(await p.$eval('.fw-hero', e => e.innerText)), 'from the profile, with the name');
  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
