// Posters through the offline worker, under the site's real headers (public/_headers, as Pages sends them):
// once the worker controls the page, an image from image.tmdb.org must still load.
// node test/poster_csp.cjs [port]   — needs test/server.mjs running on that port
const {chromium} = require('playwright');
const PORT = +process.argv[2] || 8790, BASE = 'http://localhost:' + PORT;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  let seen = 0;
  await ctx.route('https://image.tmdb.org/**', r => { seen++; r.fulfill({status: 200, contentType: 'image/png', body: PNG, headers: {'access-control-allow-origin': '*'}}); });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({status: 200, contentType: 'text/css', body: ''}));
  const page = await ctx.newPage();
  await page.goto(BASE + '/');
  // the app reloads itself once when the worker takes over; wait until the page is controlled and settled
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    try { await page.waitForLoadState('load'); if (await page.evaluate(() => !!navigator.serviceWorker.controller)) break; } catch (e) {}
  }
  await page.waitForTimeout(1500); await page.waitForLoadState('load');
  const res = await page.evaluate(() => new Promise(done => {
    const im = new Image();
    im.onload = () => done('loaded ' + im.naturalWidth);
    im.onerror = () => done('error');
    im.src = 'https://image.tmdb.org/t/p/w185/test' + Date.now() + '.png';
    setTimeout(() => done('timeout'), 8000);
  }));
  const csp = await page.evaluate(async () => (await fetch('/sw.js?x=' + Date.now())).headers.get('content-security-policy'));
  const ok = res === 'loaded 1';
  console.log((ok ? 'ok  ' : 'FAIL') + ' poster through the worker: ' + res + ' (requests seen: ' + seen + ')');
  console.log((csp ? 'ok  ' : 'FAIL') + ' sw.js sent with its policy');
  await browser.close();
  process.exit(ok && csp ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
