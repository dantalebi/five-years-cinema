// Popular (the people you follow, or everyone; this week, month, year, all time; private diaries never count), on its
// own page and as a row on Home and Discover; the account menu, Letterboxd's (everything of yours, then Settings);
// a profile's tabs each with an address; your own profile showing even what's private, and saying so
// (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };
const here = p => p.url().replace(B, '');
const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
// a small catalog, for Discover's front page
const CAT = {v: 1, built: '2026-11-12', fields: ['tmdb', 'slug', 'title', 'year', 'runtime', 'poster', 'dirs', 'countries', 'genres', 'groups', 'lenses', 'quality', 'reach', 'votes', 'canon', 'original', 'lang'],
  canon: ['ss_critics', 'ss_directors', 'tspdt_1000', 'tspdt_21c', 'criterion_closet'], dirs: ['Someone'], countries: ['IT'], genres: {18: 'Drama'},
  groups: [{id: 'slow-cinema', name: 'Slow Cinema', kind: 'movement', from: 1975, to: 2026, desc: 'Long takes.'}], lenses: [{id: 'essentials', name: 'Essentials', door: 'New to film?', desc: 'Widely loved.'}],
  // themes: one always in season here (Halloween's own weeks are in October), one not
  themes: [{id: 'halloween', name: 'Halloween', desc: 'Ghosts, witches, monsters and masks.', season: [1, 1, 12, 31]}, {id: 'queer-cinema', name: 'Queer Cinema', desc: 'Gay, lesbian, bi and trans lives on screen.', season: null}],
  films: Array.from({length: 12}, (_, i) => [3000 + i, 'cat-' + i, 'Catalog Film ' + i, 1970 + i, 90, '/c' + i + '.jpg', [0], [0], [18], [0], 1, 60, 50, 100, [0, 0, 0, 0, 0], '', 'it', i < 9 ? [0, 1] : [1]])};
CAT.fields.push('themes');

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async () => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    await c.route('**/catalog/catalog.json', r => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(CAT)}));
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const signup = async (p, u) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
    await p.waitForSelector('[data-ostart="list"]', {timeout: 15000}); await p.evaluate(async () => { await CloudSync.savePlan(await (await fetch('/sample-plan.json')).json()); Store.set('cfg:since', new Date().toISOString().slice(0, 10)); Store.set('cfg:plan', 'own'); }); await p.waitForSelector('.fx-tabbar');
  };
  const publish = async p => { await p.evaluate(() => Store.set('cfg:share', CloudSync.me().username)); await p.waitForTimeout(1600); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(900); };
  // log films: [key, title, year, date, rating, tmdb, liked, review]
  const log = (p, rows) => p.evaluate(rows => rows.forEach(([k, t, y, d, r, tm, h, rv]) => {
    Store.set(k, 't:' + t + ' (' + y + ')'); Store.set('v:' + k, d); if (r) Store.set('r:' + k, r); Store.set('md:' + k, JSON.stringify({tm, t, y}));
    if (h) Store.set('l:' + k, 1); if (rv) Store.set('rv:' + k, rv);
  }), rows);

  const ana = await ctx(); await signup(ana, 'ana');
  await log(ana, [['log:a1', 'Close-Up', 1990, day(1), 10, 30017, 1, 'Kiarostami films a real trial and lets the man who pretended to be Makhmalbaf play himself.'], ['log:a2', 'Taste of Cherry', 1997, day(20), 8, 30020]]);
  await ana.evaluate(() => { Store.set('wx:s1', 't:Stalker (1979)'); Store.set('r:wx:s1', 10); Store.set('wl:tm949', JSON.stringify({t: 'Heat', y: 1995, tm: 949, p: '', u: '', at: Date.now()})); });
  await publish(ana);
  const cara = await ctx(); await signup(cara, 'cara'); await log(cara, [['log:c1', 'Close-Up', 1990, day(2), 6, 30017]]); await publish(cara);
  const dee = await ctx(); await signup(dee, 'dee'); await log(dee, [['log:d1', 'Close-Up', 1990, day(3), 7, 30017], ['log:d2', 'Taste of Cherry', 1997, day(25), 9, 30020]]); await publish(dee);
  // Eve's diary is private: her Close-Up never counts
  const eve = await ctx(); await signup(eve, 'eve'); await eve.evaluate(() => Store.set('cfg:pubdiary', '0')); await log(eve, [['log:e1', 'Close-Up', 1990, day(1), 4, 30017]]); await publish(eve);
  const bob = await ctx(); await signup(bob, 'bob');
  await bob.evaluate(async () => { for (const u of ['ana', 'dee', 'eve']) await CloudSync.follow(u, true); });

  // ---- the numbers ----
  const api = (p, q) => p.evaluate(async q => { const r = await fetch('/api/popular?' + q); return r.ok ? r.json() : r.status; }, q);
  let j = await api(bob, 'who=everyone&span=week');
  ok(j.films[0].t === 'Close-Up' && j.films[0].n === 3 && j.films[0].l === 1 && j.films[0].r === 7.7 && j.films[0].tm === 30017, 'everyone, this week: Close-Up, by three members (not Eve), one like, 7.7 out of 10', j.films[0]);
  ok(j.people === 3 && !j.films.some(f => f.t === 'Taste of Cherry') && !j.films[0].who, 'three members; nothing older than a week; nobody named', {people: j.people, films: j.films.map(f => f.t)});
  j = await api(bob, 'who=everyone&span=month');
  ok(j.films.some(f => f.t === 'Taste of Cherry' && f.n === 2 && f.y === 1997), 'this month: Taste of Cherry too, by two', j.films);
  j = await api(bob, 'who=friends&span=week');
  ok(j.films.length === 1 && j.films[0].n === 2 && j.films[0].who.map(x => x.u).join() === 'ana,dee', 'the people Bob follows, this week: Ana and Dee (latest first), not Eve', j.films[0]);
  j = await api(bob, 'who=everyone&span=all');
  ok(j.films.some(f => f.t === 'Stalker' && f.n === 1), 'all time counts films marked seen without a date', j.films.map(f => f.t));
  j = await api(bob, 'who=friends&span=auto&min=5');
  ok(j.span === 'all' && j.sizes.week === 1 && j.sizes.month === 2, 'auto: not enough in a week, a month or a year, so all time', j);
  const anon = await ctx(); await anon.goto(B + '/about');
  ok(await api(anon, 'who=everyone&span=week') === 401, 'a visitor can’t ask');

  // ---- the page ----
  await bob.goto(B + '/popular'); await bob.waitForSelector('.pp-grid li', {timeout: 10000});
  ok(await bob.$eval('.fx-h1', e => e.textContent) === 'Popular' && /3 members/.test(await bob.$eval('.pp-grid li', e => e.innerText)), 'Popular: everyone this week, three members under Close-Up');
  ok(/1 film, watched by 3 members this week/.test(await bob.$eval('.pp-count', e => e.innerText)), 'and a line that sums it up', await bob.$eval('.pp-count', e => e.innerText));
  await bob.click('[data-pp-who="friends"]'); await bob.waitForSelector('.pp-av');
  ok(here(bob) === '/popular/friends' && (await bob.$$('.pp-grid li:first-child .pp-av .av')).length === 2, 'Friends: the address follows, two faces under it', here(bob));
  await bob.click('[data-pp-span="month"]'); await bob.waitForFunction(() => document.querySelectorAll('.pp-grid li').length === 2);
  ok(here(bob) === '/popular/friends/this-month', 'this month: its own address', here(bob));
  await bob.screenshot({path: path.join(OUT, 'popular.png'), fullPage: true});
  await bob.reload(); await bob.waitForSelector('.pp-grid li');
  ok(await bob.$eval('[data-pp-span="month"]', e => e.getAttribute('aria-pressed')) === 'true' && await bob.$eval('[data-pp-who="friends"]', e => e.getAttribute('aria-pressed')) === 'true', 'a reload opens the same');
  await bob.click('.pp-grid li:first-child .dx-cell'); await bob.waitForSelector('.fp-soc, .fx-film-h, h1', {timeout: 10000});
  ok(/\/film\/tmdb\/30017$/.test(here(bob)), 'a poster opens the film', here(bob));
  // Home: popular with friends; Discover: popular on TVC15
  await bob.goto(B + '/'); await bob.waitForSelector('.pp-tease', {timeout: 10000});
  const tease = await bob.$eval('.pp-tease', e => e.innerText.replace(/\s+/g, ' '));
  ok(/Popular with friends of all time/.test(tease) && /Close-Up/.test(tease), 'Home: Popular with friends', tease.slice(0, 120));
  ok(await bob.$eval('.pp-tease .hm-more', a => a.getAttribute('href')) === '/popular/friends/all-time', 'More: the same, on its page');
  await (await bob.$('.pp-tease')).screenshot({path: path.join(OUT, 'home-popular.png')});
  await bob.click('[data-nav="discover"]'); await bob.waitForSelector('.dx-doors', {timeout: 10000}); await bob.waitForSelector('.pp-tease', {timeout: 8000});
  ok(/Popular on TVC15/.test(await bob.$eval('.pp-tease', e => e.innerText)), 'Discover opens with Popular on TVC15');
  // Themes: what the films are about; the one in season first
  const chips = await bob.$$eval('.dx-sec .dx-chip[href^="/discover/theme/"]', as => as.map(a => [a.textContent.replace(/\s+/g, ' ').trim(), a.classList.contains('dx-season')]));
  ok(chips.length === 2 && /^Halloween 9/.test(chips[0][0]) && chips[0][1] && /^Queer Cinema 12/.test(chips[1][0]), 'Discover: Themes, the one in season first', chips);
  await bob.click('.dx-chip[href="/discover/theme/queer-cinema"]'); await bob.waitForSelector('.dx-grid li');
  ok(here(bob) === '/discover/theme/queer-cinema' && await bob.$eval('.dx-h1', e => e.textContent) === 'Queer Cinema' && (await bob.$$('.dx-grid li')).length === 12, 'a theme’s own page', here(bob));
  await bob.goto(B + '/'); await bob.waitForSelector('.hm-ch', {timeout: 10000});
  ok(/In season Halloween/.test(await bob.$eval('.hm-chn', e => e.innerText.replace(/\s+/g, ' '))), 'Home: the channel in season', await bob.$eval('.hm-chn', e => e.innerText));
  await bob.screenshot({path: path.join(OUT, 'discover-popular.png')});

  // ---- the account menu ----
  await bob.goto(B + '/'); await bob.waitForSelector('.fx-tabbar');
  await bob.click('[data-ac-menu]'); await bob.waitForSelector('.av-menu');
  const items = await bob.$$eval('.av-menu [role=menuitem]', es => es.map(e => e.textContent));
  ok(items.join('|') === 'Home|Profile|Films|Diary|Reviews|Watchlist|Lists|Stats|Settings|About|Sign out', 'the menu, Letterboxd’s', items);
  ok(await bob.$eval('.av-menu [aria-current="page"]', e => e.textContent) === 'Home', 'the screen you’re on is marked');
  await bob.waitForTimeout(300); await bob.screenshot({path: path.join(OUT, 'av-menu-full.png')});
  // Bob keeps his profile private
  await bob.keyboard.press('Escape'); await bob.evaluate(() => CloudSync.shareOff()); await bob.waitForTimeout(300);
  ok(await anon.evaluate(async () => (await fetch('/api/u/bob')).status) === 404, 'Bob’s profile: private');
  await bob.click('[data-ac-menu]'); await bob.click('.av-menu a[href="/u/bob"]'); await bob.waitForSelector('a.pf-cnt[href="/u/bob/following"]'); await bob.click('a.pf-cnt[href="/u/bob/following"]'); await bob.waitForSelector('.pf-people li', {timeout: 8000});
  ok(here(bob) === '/u/bob/following' && /@ana/.test(await bob.$eval('.pf-people', e => e.innerText)), 'Following: whom Bob follows (his profile isn’t public, but it’s his)', here(bob));
  await bob.click('[data-ac-menu]'); await bob.click('.av-menu a[href="/u/bob"]'); await bob.waitForSelector('.pf-priv');
  ok(/Your profile is private\. Only you can see it\./.test(await bob.$eval('.pf-priv', e => e.innerText)), 'his own profile says it’s private');
  await bob.click('[data-ac-menu]'); await bob.click('.av-menu a[href="/about"]'); await bob.waitForSelector('.ac-doc');
  ok(here(bob) === '/about' && await bob.$('.fx-tabbar') !== null, 'About, inside the app');

  // Ana's diary goes private; her own profile still shows everything, and says what only she can see
  await ana.evaluate(() => Store.set('cfg:pubdiary', '0')); await ana.waitForTimeout(1700); await ana.evaluate(() => CloudSync.run()); await ana.waitForTimeout(900);
  await ana.goto(B + '/'); await ana.waitForSelector('.fx-tabbar');
  await ana.click('[data-ac-menu]'); await ana.click('.av-menu a[href="/u/ana/films"]'); await ana.waitForSelector('.fx-pgrid li', {timeout: 10000});
  ok(here(ana) === '/u/ana/films' && await ana.$eval('[data-tab="films"]', e => e.getAttribute('aria-selected')) === 'true', 'Films: her profile, on Films', here(ana));
  ok((await ana.$$('.fx-pgrid li')).length === 3, 'all three of her films, though her diary is private');
  ok(/Only you can see your films, diary, reviews, stats and watchlist\./.test(await ana.$eval('.pf-priv', e => e.innerText)) && await ana.$('.pf-priv a[href="/settings/privacy"]') !== null, 'with a note saying what only she sees, and where to change it');
  await ana.screenshot({path: path.join(OUT, 'own-profile.png'), fullPage: true});
  await ana.click('[data-ac-menu]'); await ana.click('.av-menu a[href="/u/ana/watchlist"]'); await ana.waitForSelector('[data-tab="wl"][aria-selected="true"]');
  ok((await ana.$$eval('.fx-pgrid .fx-pg', as => as.map(a => a.getAttribute('aria-label')))).join() === 'Heat (1995)', 'Watchlist', here(ana));
  await ana.click('[data-ac-menu]'); await ana.click('.av-menu a[href="/u/ana/reviews"]'); await ana.waitForSelector('[data-tab="reviews"][aria-selected="true"]');
  ok(/Kiarostami films a real trial/.test(await ana.$eval('.fx-app', e => e.innerText)), 'Reviews');
  await ana.click('[data-ac-menu]'); await ana.click('.av-menu a[href="/diary"]'); await ana.waitForTimeout(400);
  ok(here(ana) === '/diary' && await ana.$eval('.fx-tabbar button[aria-current="page"]', e => e.textContent) === 'Diary', 'Diary: the app’s own, to edit');
  // a film logged since: her profile has it the next time she opens it
  await log(ana, [['log:a3', 'Through the Olive Trees', 1994, day(0), 9, 30018]]);
  await ana.click('[data-ac-menu]'); await ana.click('.av-menu a[href="/u/ana/films"]'); await ana.waitForSelector('.fx-pgrid li');
  ok((await ana.$$('.fx-pgrid li')).length === 4, 'a film logged since is there');

  // ---- each tab has an address ----
  await bob.goto(B + '/u/dee'); await bob.waitForSelector('.fx-tabs');
  await bob.click('[data-tab="films"]'); await bob.waitForTimeout(200);
  ok(here(bob) === '/u/dee/films', 'a tab changes the address', here(bob));
  await bob.click('[data-tab="reviews"]'); await bob.waitForTimeout(200);
  await bob.reload(); await bob.waitForSelector('.fx-tabs');
  ok(here(bob) === '/u/dee/reviews' && await bob.$eval('[data-tab="reviews"]', e => e.getAttribute('aria-selected')) === 'true', 'a reload opens the same tab');
  await bob.goBack(); await bob.waitForTimeout(500);
  ok(!/^\/u\/dee/.test(here(bob)), 'Back leaves the profile in one step (tabs don’t pile up)', here(bob));
  await anon.goto(B + '/u/dee/films'); await anon.waitForSelector('.fx-tabs', {timeout: 10000});
  ok(await anon.$eval('[data-tab="films"]', e => e.getAttribute('aria-selected')) === 'true', 'a visitor with the address: Films');
  await anon.click('[data-tab="diary"]'); await anon.waitForTimeout(200);
  ok(here(anon) === '/u/dee/diary', 'and the address follows their tabs too', here(anon));
  await anon.goto(B + '/u/ana/films'); await anon.waitForSelector('.fx-share header', {timeout: 10000}); await anon.waitForTimeout(300);
  ok(!(await anon.$('[data-tab="films"]')) && !(await anon.$('.fx-pgrid')), 'Ana’s films, now private: not for visitors, whatever the address');

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
