// Tonight: a film for two from their watchlists and diaries; Letterboxd's watchlist.csv comes in (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const B = 'http://localhost:8790';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const person = async (u, logs, wl) => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}), p = await c.newPage();
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    p.on('pageerror', e => errs.push(u + ' ' + e.message));
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('[data-ostart="sample"]', {timeout: 15000});
    await p.click('[data-ostart="sample"]'); await p.waitForSelector('.fx-tabbar');
    await p.evaluate(([logs, wl]) => {
      logs.forEach(([t, y, r], i) => { const k = 'log:t' + i; Store.set(k, 't:' + t + ' (' + y + ')'); Store.set('v:' + k, '2026-10-1' + i); Store.set('r:' + k, r); });
      wl.forEach(([t, y]) => Store.set('wl:' + t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + '|' + y, JSON.stringify({t, y, tm: 0, p: '', u: '', at: Date.now()})));
    }, [logs, wl]);
    await p.waitForTimeout(2500); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(1000);
    return p;
  };
  const kim = await person('kim', [['Heat', 1995, 10], ['Ran', 1985, 10]], [['Stalker', 1979], ['Ugetsu', 1953]]);
  const lou = await person('lou', [['Heat', 1995, 8], ['Jaws', 1975, 10]], [['Stalker', 1979], ['Ran', 1985]]);
  await kim.evaluate(() => CloudSync.follow('lou', true)); await kim.reload(); await kim.waitForSelector('.fx-tabbar');
  await kim.click('[data-seg="t"]'); await kim.waitForSelector('[data-tgp="lou"]', {timeout: 8000});
  await kim.click('[data-tgp="lou"]'); await kim.click('[data-tggo]'); await kim.waitForSelector('.fx-tgpick', {timeout: 15000});
  const pick = await kim.$eval('.fx-tgpick', e => e.innerText.replace(/\s+/g, ' '));
  ok(/Stalker/.test(pick) && /everyone’s watchlist/.test(pick), 'Stalker first: on both watchlists, seen by neither', pick);
  ok(!/Add to watchlist/.test(pick), 'already on her watchlist: no “Add to watchlist”');
  const also = await kim.$eval('.fx-tgcard ~ .fx-card:last-child', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
  const all = await kim.$eval('.fx-app', e => e.innerText);
  ok(/Jaws/.test(all) && /Lou gave it ★★★★★/.test(all), 'Jaws: Lou loved it, Kim hasn’t seen it', also);
  ok(!/Heat/.test(all.split('Also good')[1] || ''), 'Heat left out: both have seen it');
  ok(!/\bRan\b/.test(all.split('Also good')[1] || '') || !/watchlist of Lou/.test(all), 'Ran (on Lou’s watchlist) left out: Kim has seen it');
  // Letterboxd's watchlist.csv through Settings
  const fs = require('fs'), path = require('path'), f = path.join(process.env.OUT || '/tmp', 'watchlist.csv');
  fs.writeFileSync(f, 'Date,Name,Year,Letterboxd URI\n2026-02-13,An Autumn Afternoon,1962,https://boxd.it/CUU\n2026-02-13,Heat,1995,https://boxd.it/x\n');
  await kim.click('[data-ac-menu]'); await kim.click('.av-menu a[href="/settings"]'); await kim.click('[data-sset="letterboxd"]'); await kim.waitForSelector('[data-lbimport]', {state: 'attached'}); await kim.setInputFiles('[data-lbimport]', f); await kim.waitForTimeout(2000);
  const wl = await kim.evaluate(() => Object.keys(Store.data).filter(k => k.startsWith('wl:') && Store.data[k]).map(k => JSON.parse(Store.data[k]).t));
  ok(wl.includes('An Autumn Afternoon') && !wl.includes('Heat'), 'watchlist.csv: new films in, seen ones left out', wl);
  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
