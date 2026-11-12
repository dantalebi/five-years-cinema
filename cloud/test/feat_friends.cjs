// What the people you follow made of a film, in its own section of the film's page (every entry, not just recent ones:
// the site keeps an index of each profile's films); a profile's Films and Watchlist; keeping your watchlist private;
// Settings as a short list of sections (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); if (!c) fails++; };
const here = p => p.url().replace(B, '');

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async () => { const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}); await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''})); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p; };
  const signup = async (p, u) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
    await p.waitForSelector('[data-ostart="sample"]', {timeout: 15000}); await p.click('[data-ostart="sample"]'); await p.waitForSelector('.fx-tabbar');
  };
  const publish = async p => { await p.evaluate(() => Store.set('cfg:share', CloudSync.me().username)); await p.waitForTimeout(1600); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(900); };

  // Ana watched Close-Up twice (an old entry and a new one), liked it, wrote about it; Heat is on her watchlist
  const ana = await ctx(); await signup(ana, 'ana');
  await ana.evaluate(() => {
    const e = (k, t, y, d, r, tm) => { Store.set(k, 't:' + t + ' (' + y + ')'); Store.set('v:' + k, d); Store.set('r:' + k, r); Store.set('md:' + k, JSON.stringify({tm, t, y})); };
    e('log:a1', 'Close-Up', 1990, '2019-03-02', 8, 30017);
    e('log:a2', 'Close-Up', 1990, '2026-11-01', 10, 30017); Store.set('l:log:a2', 1); Store.set('rv:log:a2', 'Kiarostami films a real trial and lets the man who pretended to be Makhmalbaf play himself.');
    e('log:a3', 'Taste of Cherry', 1997, '2026-10-02', 9, 30020);
    Store.set('wx:s1', 't:Stalker (1979)'); Store.set('r:wx:s1', 10); Store.set('wx:s2', 't:Mirror (1975)');   // seen, never logged
    Store.set('wl:tm949', JSON.stringify({t: 'Heat', y: 1995, tm: 949, p: '', u: '', at: Date.now()}));
  });
  await publish(ana);
  const cara = await ctx(); await signup(cara, 'cara');   // someone Bob doesn't follow: counted, not named
  await cara.evaluate(() => { Store.set('log:c1', 't:Close-Up (1990)'); Store.set('v:log:c1', '2026-09-09'); Store.set('r:log:c1', 6); Store.set('md:log:c1', JSON.stringify({tm: 30017, t: 'Close-Up', y: 1990})); });
  await publish(cara);
  const dee = await ctx(); await signup(dee, 'dee');
  await dee.evaluate(() => { Store.set('log:d1', 't:Close-Up (1990)'); Store.set('v:log:d1', '2026-08-01'); Store.set('r:log:d1', 7); Store.set('md:log:d1', JSON.stringify({tm: 30017, t: 'Close-Up', y: 1990})); });
  await publish(dee);

  const bob = await ctx(); await signup(bob, 'bob');
  await bob.evaluate(() => CloudSync.follow('ana', true));
  ok(await bob.evaluate(async () => (await fetch('/api/film?k=m30017')).status) === 200, 'a member can ask about a film');
  const anon = await ctx(); await anon.goto(B + '/about');
  ok(await anon.evaluate(async () => (await fetch('/api/film?k=m30017')).status) === 401, 'a visitor can’t');
  ok(await bob.evaluate(async () => (await fetch('/api/film?k=' + encodeURIComponent('x\ty'))).status) === 400, 'nonsense keys are refused');

  // the film's page
  await bob.goto(B + '/film/tmdb/30017'); await bob.waitForSelector('.fp-soc', {timeout: 15000});
  const soc = await bob.$eval('.fp-soc', e => e.innerText.replace(/\s+/g, ' '));
  ok(/Friends/.test(soc) && /One of the people you follow has seen it, 1 liked it/.test(soc), 'a section of its own, with a line that sums it up', soc.slice(0, 120));
  ok(/5\.0/.test(soc) && /Friends, 1 rating/.test(soc), 'their average, from the latest viewing', soc.slice(0, 200));
  ok(/3\.8/.test(soc) && /Everyone on TVC15, 3 ratings/.test(soc), 'and everyone on the site: one rating a member', soc);
  ok((await bob.$$('.fp-hist i')).length === 10, 'how everyone’s ratings fall, half star to five');
  const rows = await bob.$$eval('.fp-fl li', ls => ls.map(l => l.innerText.replace(/\s+/g, ' ')));
  ok(rows.length === 1 && /Ana/.test(rows[0]) && /November 1, 2026, and 1 time before/.test(rows[0]), 'Ana: her latest viewing, and the one before', rows);
  ok(/Kiarostami films a real trial/.test(rows[0]) && await bob.$('.fp-fl .fx-ico.lk') !== null, 'with her review and her like', rows[0]);
  ok(!/Cara|Dee/.test(soc), 'people Bob doesn’t follow aren’t named');
  const href = await bob.$eval('.fp-fl .fp-fn', a => a.getAttribute('href'));
  ok(/^\/u\/ana#[a-z0-9-]+$/.test(href), 'her name opens her entry', href);
  await bob.screenshot({path: path.join(OUT, 'friends-film.png'), fullPage: true});
  await bob.goto(B + '/film/tmdb/949'); await bob.waitForSelector('.fp-want', {timeout: 15000});
  ok(/Ana wants to see it/.test(await bob.$eval('.fp-want', e => e.innerText)), 'Heat: Ana wants to see it');

  // Bob's Home: This week first, then what the people he follows watched lately
  await bob.goto(B + '/'); await bob.waitForSelector('.fx-tabbar');
  ok(await bob.$eval('.fx-tabbar button[aria-current="page"]', e => e.textContent) === 'Home', 'the app opens on Home');
  await bob.waitForSelector('.hm-feed li', {timeout: 10000});
  ok(/Ana/.test(await bob.$eval('.hm-feed', e => e.innerText)) && /Close-Up/.test(await bob.$eval('.hm-feed', e => e.innerText)), 'Home: Ana’s latest, under This week');
  ok(await bob.$('.fx-i') !== null && (await bob.$$('.hm-sec')).length >= 2, 'This week’s films and the rest');
  // Ana's profile: every film she's watched, and her watchlist
  await bob.goto(B + '/u/ana'); await bob.waitForSelector('.fx-tabs');
  ok(/^4 films/.test(await bob.$eval('.fx-strip', e => e.innerText.trim())), 'her film count counts films, logged or only marked seen (4), not diary entries (3)', await bob.$eval('.fx-strip', e => e.innerText));
  const tabs = await bob.$$eval('.fx-tabs button', bs => bs.map(x => x.textContent));
  ok(tabs.includes('Films') && tabs.includes('Watchlist'), 'Films and Watchlist on her profile', tabs);
  await bob.click('[data-tab="films"]'); await bob.waitForSelector('.fx-pgrid li');
  const cells = await bob.$$eval('.fx-pgrid .fx-pg', as => as.map(a => a.getAttribute('aria-label')));
  ok(cells.length === 4 && cells[0] === 'Close-Up (1990)', 'one cell a film, the latest first, the undated ones too', cells);
  ok(/★★★★★/.test(await bob.$eval('.fx-pgrid li', l => l.innerText)), 'with her rating');
  await bob.click('[data-st="fs:t"]'); await bob.waitForTimeout(200);
  ok((await bob.$$eval('.fx-pgrid .fx-pg', as => as.map(a => a.getAttribute('aria-label'))))[0] === 'Close-Up (1990)' && (await bob.$$eval('.fx-pgrid .fx-pg', as => as.map(a => a.getAttribute('aria-label'))))[3] === 'Taste of Cherry (1997)', 'sorted by title');
  await bob.click('[data-tab="wl"]'); await bob.waitForSelector('.fx-pgrid li');
  ok((await bob.$$eval('.fx-pgrid .fx-pg', as => as.map(a => a.getAttribute('aria-label')))).join() === 'Heat (1995)', 'her watchlist');
  await bob.screenshot({path: path.join(OUT, 'friends-wl.png'), fullPage: true});

  // Ana keeps her watchlist to herself: Settings → Privacy
  await ana.click('[data-ac-menu]'); await ana.click('.av-menu a[href="/settings"]'); await ana.waitForSelector('.st-nav');
  ok((await ana.$$('.st-nav .st-row')).length === 7, 'Settings: six sections and About');
  await ana.click('[data-sset="privacy"]'); await ana.waitForSelector('input[data-pubwl]');
  ok(here(ana) === '/settings/privacy', 'Privacy', here(ana));
  await ana.click('input[data-pubwl]'); await ana.waitForTimeout(1700); await ana.evaluate(() => CloudSync.run()); await ana.waitForTimeout(900);
  ok(await ana.evaluate(() => Store.data['cfg:pubwl']) === '0', 'watchlist: private');
  await bob.goto(B + '/u/ana'); await bob.waitForSelector('.fx-tabs');
  ok(!(await bob.$$eval('.fx-tabs button', bs => bs.map(x => x.textContent))).includes('Watchlist'), 'gone from her profile');
  await bob.goto(B + '/film/tmdb/949'); await bob.waitForTimeout(2500);
  ok(!(await bob.$('.fp-want')), 'and from Heat’s page');

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
