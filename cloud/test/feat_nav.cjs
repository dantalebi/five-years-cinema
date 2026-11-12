// Addresses and Back: every screen has an address, Back steps through the app (never out of it), sheets and the +
// box close on Back; films open the site's own film page from This Week, the diary, Activity and profiles; directors
// have pages; Stats sits beside the diary (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); if (!c) fails++; };
const here = p => p.url().replace(B, '');

(async () => {
  const b = await chromium.launch(), errs = [];
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}), p = await c.newPage();
  await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
  await p.click('[data-amode="up"]'); await p.fill('input[name=u]', 'nina'); await p.fill('input[name=n]', 'Nina'); await p.fill('input[name=p]', 'pass for nina');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('[data-ostart="sample"]', {timeout: 15000});
  await p.click('[data-ostart="sample"]'); await p.waitForSelector('.fx-tabbar');
  ok(here(p) === '/', 'starts at /', here(p));

  // This Week → a film's page → its director → Back, Back
  await p.click('[data-nav="week"]'); await p.waitForTimeout(200);
  ok(here(p) === '/week', 'This Week has an address', here(p));
  const href = await p.$eval('.fx-i .fx-film', a => a.getAttribute('href'));
  ok(/^\/film\/[a-z0-9-]+$/.test(href), 'a plan film links to its page on the site, not Letterboxd', href);
  await p.click('.fx-i .fx-film'); await p.waitForSelector('.dx-ft');
  ok(here(p) === href, 'the film page', here(p));
  await p.waitForSelector('.fp-plan', {timeout: 8000});
  ok(/This week/.test(await p.$eval('.fp-plan', e => e.textContent)), 'it says it’s on this week’s plan');
  ok(/letterboxd\.com\/film\//.test(await p.$eval('.dx-acts a[target]', a => a.href)), 'and still links to Letterboxd');
  const dhref = await p.$eval('.dx-by a[href^="/director/"]', a => a.getAttribute('href'));
  await p.click('.dx-by a[href^="/director/"]'); await p.waitForSelector('.fp-prog', {timeout: 8000});
  ok(here(p) === dhref, 'the director’s page', here(p));
  ok(/Born in Paris/.test(await p.$eval('.fx-app', e => e.innerText)) && await p.$('.fp-ph') !== null, 'photo and a line about them');
  ok((await p.$$('.dx-grid li')).length >= 2, 'their films');
  await p.screenshot({path: path.join(OUT, 'nav-director.png')});
  await p.goBack(); await p.waitForSelector('.dx-ft');
  ok(here(p) === href, 'Back: the film again', here(p));
  await p.goBack(); await p.waitForTimeout(300);
  ok(here(p) === '/week' && /This week/i.test(await p.$eval('.fx-h1', e => e.textContent)), 'Back: This Week again', here(p));

  // the + box and the log sheet close on Back, and Back with an unsaved review asks first
  await p.click('.fx-tplus'); await p.waitForSelector('.fx-pick-q');
  await p.goBack(); await p.waitForTimeout(300);
  ok(!(await p.$('.fx-pick-q')) && here(p) === '/week', 'Back closes the + box, and stays put', here(p));
  await p.click('.fx-i .fx-film'); await p.waitForSelector('[data-fp-log]', {timeout: 8000});
  await p.click('[data-fp-log]'); await p.waitForSelector('.fx-sheet');
  await p.fill('.fx-shrv', 'Beautiful.');
  await p.goBack(); await p.waitForTimeout(300);
  ok(!!(await p.$('.fx-sheet')), 'Back with an unsaved review: the sheet stays and asks');
  await p.goBack(); await p.waitForTimeout(300);
  ok(!(await p.$('.fx-sheet')) && here(p) === href, 'Back again: closed, still on the film', here(p));

  // log it for real, then find it in the diary: the title opens the film's page
  await p.click('[data-fp-log]'); await p.waitForSelector('.fx-sheet'); await p.click('.fx-sheet [data-srate="8"]'); await p.click('.fx-sheet [data-ssave]'); await p.waitForTimeout(400);
  ok(here(p) === href, 'saving the entry leaves you on the film', here(p));
  await p.waitForSelector('.fp-you'); ok(/★★★★/.test(await p.$eval('.fp-you', e => e.textContent)), 'the entry shows on the film’s page');
  await p.click('[data-nav="diary"]'); await p.waitForSelector('.fx-de');
  ok(here(p) === '/diary', 'the diary', here(p));
  ok((await p.$eval('.fx-de .fx-film', a => a.getAttribute('href'))) === href, 'the diary links to the same film page');

  // Stats beside the diary
  await p.click('.fx-dseg [data-nav="stats"]'); await p.waitForSelector('.fx-statsonly .fx-big', {timeout: 8000});
  ok(here(p) === '/stats', 'Stats has an address', here(p));
  ok(!(await p.$('[data-wrapped]')), 'no Wrapped button');
  await p.screenshot({path: path.join(OUT, 'nav-stats.png')});
  await p.reload(); await p.waitForSelector('.fx-statsonly', {timeout: 8000});
  ok(here(p) === '/stats', 'a reload stays on Stats');
  await p.goBack(); await p.waitForSelector('.fx-de');
  ok(here(p) === '/diary', 'Back: the diary', here(p));

  // Settings behind the gear, and Back out of it
  await p.click('[data-ac-menu]'); await p.click('.av-menu a[href="/settings"]'); await p.waitForTimeout(200);
  ok(here(p) === '/settings', 'Settings', here(p));
  ok(await p.$('a[href="/plan/new"]') !== null, 'Settings offers to build a new plan');
  await p.goBack(); await p.waitForTimeout(300);
  ok(here(p) === '/diary', 'Back: where you were', here(p));

  // Activity's parts
  await p.click('[data-nav="friends"]'); await p.waitForTimeout(300); await p.click('[data-seg="n"]'); await p.waitForTimeout(300);
  ok(here(p) === '/activity/notifications', 'Notifications has an address', here(p));
  await p.goBack(); await p.waitForTimeout(300);
  ok(here(p) === '/activity' && await p.$eval('[data-seg="f"]', e => e.getAttribute('aria-pressed')) === 'true', 'Back: Friends', here(p));

  // a film by its TMDB id, opened straight from its address
  await p.goto(B + '/film/tmdb/99999991'); await p.waitForSelector('.dx-ft', {timeout: 10000});
  ok(await p.$eval('.dx-ft', e => e.textContent) === 'Film 99999991' && /Agnès Varda/.test(await p.$eval('.dx-by', e => e.textContent)), 'any film, from TMDB');
  ok(await p.$('[data-fp-back]') !== null, 'with a way back');
  await p.click('[data-fp-back]'); await p.waitForTimeout(400);
  ok(/^\/(discover|activity|week)?/.test(here(p)) && await p.$('.fx-tabbar') !== null, 'Back from a page opened directly stays in the app', here(p));

  // a profile's films open the site's film pages for a member
  await p.evaluate(() => Store.set('cfg:pubdiary', '1')); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(1200);
  await p.goto(B + '/u/nina'); await p.waitForSelector('.fx-share', {timeout: 10000});
  await p.click('[data-tab="diary"]').catch(() => {}); await p.waitForTimeout(300);
  const ph = await p.$$eval('.fx-share a.fx-film', as => as.map(a => a.getAttribute('href')));
  ok(ph.length && ph.every(h => h.startsWith('/film/')), 'profile films link to film pages for a member', ph.slice(0, 3));

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
