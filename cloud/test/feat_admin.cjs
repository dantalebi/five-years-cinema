// The owner's page: how the site is doing and every account, public or private, for whoever runs it (OWNER on the
// server; the test server's is "boss"), and for nobody else (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };
const here = p => p.url().replace(B, '');
const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async () => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const signup = async (p, u) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
    await p.waitForSelector('[data-ostart="list"]', {timeout: 15000}); await p.click('[data-ostart="list"]'); await p.waitForSelector('.fx-tabbar');
  };
  const sync = async p => { await p.waitForTimeout(1600); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(800); };
  const boss = await ctx(); await signup(boss, 'boss');
  const jon = await ctx(); await signup(jon, 'jon');
  await jon.evaluate(d => { Store.set('log:j1', 't:Close-Up (1990)'); Store.set('v:log:j1', d); Store.set('rv:log:j1', 'A trial, filmed.'); Store.set('log:j2', 't:Heat (1995)'); Store.set('v:log:j2', d); Store.set('wx:x1', 't:Stalker (1979)'); Store.set('cfg:share', 'jon'); }, day(2));
  await jon.evaluate(() => CloudSync.follow('boss', true)); await sync(jon);
  // Ivy keeps her profile private: nobody else on the site can see her, but the owner knows she's there
  const ivy = await ctx(); await signup(ivy, 'ivy');
  await ivy.evaluate(d => { Store.set('log:i1', 't:Mirror (1975)'); Store.set('v:log:i1', d); }, day(1)); await ivy.evaluate(() => CloudSync.shareOff()); await sync(ivy);

  // the owner: a menu item of his own, and the page
  await boss.reload(); await boss.waitForSelector('.fx-tabbar');
  await boss.click('[data-ac-menu]'); await boss.waitForSelector('.av-menu');
  const items = await boss.$$eval('.av-menu [role=menuitem]', es => es.map(e => e.textContent));
  ok(items.slice(-5).join('|') === 'Your site|Invite friends|Settings|Help and about|Sign out', 'the owner’s menu: Your site, above Settings', items);
  await boss.click('.av-menu a[href="/admin"]'); await boss.waitForSelector('.ad-list li', {timeout: 10000});
  ok(here(boss) === '/admin' && /Only you can see this page/.test(await boss.$eval('.ad-head', e => e.innerText)), 'Your site, at /admin');
  const big = await boss.$$eval('.ad-big div', ds => ds.map(d => d.innerText.replace(/\s+/g, ' ')));
  ok(/^3 Members/.test(big[0]) && /^3 Active this week/.test(big[1]) && /^3 New this month/.test(big[2]) && /^3 Diary entries/.test(big[3]), 'three members, all active and new, three diary entries', big);
  const lines = await boss.$eval('.fx-app', e => e.innerText.replace(/\s+/g, ' '));
  ok(/1 diary entry|3 diary entries, 1 with a review/.test(lines) && /1 film marked seen without a date/.test(lines), 'what’s on the site, counted', lines.slice(0, 400));
  const rows = await boss.$$eval('.ad-list li', ls => ls.map(l => l.innerText.replace(/\s+/g, ' ')));
  const row = u => rows.find(r => r.includes('@' + u)) || '';
  ok(/Private profile/.test(row('ivy')) && /1 entry/.test(row('ivy')), 'Ivy, private, is there: one entry', row('ivy'));
  ok(/2 entries, 1 review, 1 seen without a date/.test(row('jon')) && /0 followers, 1 following/.test(row('jon')), 'Jon: his entries, review and follows', row('jon'));
  ok(/You/.test(row('boss')) && /1 follower/.test(row('boss')), 'and the owner himself', row('boss'));
  ok(!/A trial, filmed|Close-Up|Mirror/.test(lines), 'counts only: no titles, no reviews');
  ok(await boss.$('.ad-list li a.ad-who[href="/u/jon"]') !== null && !(await boss.$('.ad-list li a.ad-who[href="/u/ivy"]')), 'public profiles link to their page; private ones don’t');
  await boss.click('[data-ad-sort="entries"]'); await boss.waitForTimeout(150);
  ok(/@jon/.test(await boss.$eval('.ad-list li', l => l.innerText)), 'sorted by entries: Jon first');
  await boss.screenshot({path: path.join(OUT, 'admin.png'), fullPage: true});

  // anyone else: no menu item, no numbers
  await jon.reload(); await jon.waitForSelector('.fx-tabbar');
  await jon.click('[data-ac-menu]'); await jon.waitForSelector('.av-menu');
  ok(!(await jon.$('.av-menu a[href="/admin"]')), 'a member’s menu: no Your site');
  ok(await jon.evaluate(async () => (await fetch('/api/admin')).status) === 404, 'and the site won’t give them the numbers');
  await jon.goto(B + '/admin'); await jon.waitForSelector('.fx-blank');
  ok(/only for the person who runs the site/.test(await jon.$eval('.fx-blank', e => e.innerText)), 'the address says it isn’t for them');
  const anon = await ctx(); await anon.goto(B + '/about');
  ok(await anon.evaluate(async () => (await fetch('/api/admin')).status) === 401, 'nor to visitors');
  ok(/Whoever runs .+ sees a list of accounts/.test(await anon.$eval('#root', e => e.innerText)), 'About says what the owner can see');

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
