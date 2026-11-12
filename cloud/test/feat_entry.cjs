// Getting to a friend's diary entry, the same way everywhere: a name opens the profile, a poster or title the film,
// the date, stars or review the entry. The entry names its author as a link; its Back returns to wherever you came
// from (Home, Activity, the film, their diary), or to their profile when there's nowhere to go back to.
// Stats' numbers fit a phone (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };
const here = p => p.url().replace(B, '');
const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async (w) => {
    const c = await b.newContext({viewport: {width: w || 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const signup = async (p, u) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
    await p.waitForSelector('[data-ostart="list"]', {timeout: 15000}); await p.click('[data-ostart="list"]'); await p.waitForSelector('.fx-tabbar');
  };
  const ana = await ctx(); await signup(ana, 'ana');
  await ana.evaluate(d => {
    const e = (k, t, y, w, r, tm) => { Store.set(k, 't:' + t + ' (' + y + ')'); Store.set('v:' + k, w); Store.set('r:' + k, r); Store.set('md:' + k, JSON.stringify({tm, t, y})); };
    e('log:a1', 'Close-Up', 1990, d.d1, 10, 30017); Store.set('rv:log:a1', 'Kiarostami films a real trial.');
    e('log:a2', 'Taste of Cherry', 1997, d.d4, 8, 30020);
  }, {d1: day(1), d4: day(4)});
  await ana.evaluate(() => Store.set('cfg:share', CloudSync.me().username)); await ana.waitForTimeout(1600); await ana.evaluate(() => CloudSync.run()); await ana.waitForTimeout(900);
  const bob = await ctx(); await signup(bob, 'bob'); await bob.evaluate(() => CloudSync.follow('ana', true));

  // Home, From people you follow: the name is her profile, the date her entry
  await bob.goto(B + '/u/ana'); await bob.waitForSelector('.fx-tabs');   // her profile already open once (it used to swallow the entry)
  await bob.goto(B + '/'); await bob.waitForSelector('.hm-feed li', {timeout: 10000});
  const li = '.hm-feed li:first-child';
  ok(await bob.$eval(li + ' .hm-fw a:first-child', a => a.getAttribute('href')) === '/u/ana', 'Home: her name opens her profile');
  const eh = await bob.$eval(li + ' .hm-fwhen', a => a.getAttribute('href'));
  ok(/^\/u\/ana#[a-z0-9-]+$/.test(eh) && await bob.$eval(li + ' a.hm-fm', a => a.getAttribute('href')) === eh, 'the date and the stars open her entry', eh);
  ok(/^\/film\//.test(await bob.$eval(li + ' .hm-ft', a => a.getAttribute('href'))), 'the title opens the film');
  await bob.click(li + ' .hm-fwhen'); await bob.waitForSelector('.fx-epage', {timeout: 8000});
  ok(here(bob) === eh, 'the entry, even with her profile visited before', here(bob));
  ok(/Review by Ana/.test(await bob.$eval('.fx-entry .fx-eye', e => e.innerText)) && await bob.$eval('.fx-ewho', a => a.getAttribute('href')) === '/u/ana', 'it says whose it is, the name a link to her profile');
  ok(await bob.$eval('[data-back]', e => e.textContent) === '← Back', 'and Back, not her name', await bob.$eval('[data-back]', e => e.textContent));
  await bob.screenshot({path: path.join(OUT, 'entry.png'), fullPage: true});
  await bob.click('[data-back]'); await bob.waitForSelector('.hm-feed li');
  ok(here(bob) === '/', 'Back: Home again', here(bob));

  // Activity: the stars open the entry; Back returns to Activity
  await bob.click('[data-nav="friends"]'); await bob.waitForSelector('.fx-actv', {timeout: 10000});
  ok(await bob.$eval('.fx-actv .fx-who', a => a.getAttribute('href')) === '/u/ana', 'Activity: her name opens her profile');
  await bob.click('.fx-actv .fx-aent'); await bob.waitForSelector('.fx-epage');
  await bob.click('[data-back]'); await bob.waitForSelector('.fx-actv');
  ok(here(bob) === '/activity', 'Back: Activity again', here(bob));

  // her diary: an entry is a step of its own, and Back returns to the diary
  await bob.goto(B + '/u/ana/diary'); await bob.waitForSelector('.fx-dl li');
  await bob.click('.fx-dl li:last-child .fx-dday'); await bob.waitForSelector('.fx-epage');
  ok(/^\/u\/ana\/diary#[a-z0-9-]+$/.test(here(bob)), 'from her diary', here(bob));
  await bob.click('[data-back]'); await bob.waitForSelector('.fx-dl li');
  ok(here(bob) === '/u/ana/diary' && await bob.$eval('[data-tab="diary"]', e => e.getAttribute('aria-selected')) === 'true', 'Back: her diary again', here(bob));
  // the name in the entry: her profile
  await bob.click('.fx-dl li:first-child .fx-dday'); await bob.waitForSelector('.fx-ewho');
  await bob.click('.fx-ewho'); await bob.waitForSelector('.fx-tabs');
  ok(here(bob) === '/u/ana' && !(await bob.$('.fx-epage')), 'the name in an entry opens her profile', here(bob));
  // an entry opened from its link, with nowhere to go back to: Back says whose profile it goes to
  await bob.goto(B + eh); await bob.waitForSelector('.fx-epage');
  ok(await bob.$eval('[data-back]', e => e.textContent) === '← Ana', 'opened from a link: “← Ana”');
  await bob.click('[data-back]'); await bob.waitForSelector('.fx-tabs');
  ok(here(bob) === '/u/ana', 'to her profile', here(bob));

  // the film's page: her name, her profile; the date, her entry
  await bob.goto(B + '/film/tmdb/30017'); await bob.waitForSelector('.fp-fl li', {timeout: 15000});
  await bob.click('.fp-fl a.fp-f2'); await bob.waitForSelector('.fx-epage');
  await bob.click('[data-back]'); await bob.waitForSelector('.fp-fl li');
  ok(here(bob) === '/film/tmdb/30017', 'from the film’s page and back to it', here(bob));

  // Stats on a narrow phone: four-digit numbers stay apart
  const st = await ctx(360); await signup(st, 'sam');
  await st.evaluate(() => { for (let i = 0; i < 1304; i++) { const k = 'log:s' + i, y = 1930 + (i % 90); Store.set(k, 't:Film ' + i + ' (' + y + ')'); Store.set('v:' + k, (2020 + (i % 6)) + '-0' + (1 + i % 9) + '-1' + (i % 9)); Store.set('md:' + k, JSON.stringify({tm: 0, t: 'Film ' + i, y, m: 108, d: 'Director ' + (i % 400)})); } });
  await st.goto(B + '/stats'); await st.waitForSelector('.fx-big'); await st.click('[data-year="all"]'); await st.waitForTimeout(400);
  const boxes = await st.$$eval('.fx-big b', bs => bs.map(x => { const r = x.getBoundingClientRect(); return [x.textContent, Math.round(r.left), Math.round(r.right)]; }));
  ok(boxes[0][0] === '1,304' && boxes.every((x, i) => i === 0 || x[1] >= boxes[i - 1][2]), 'Stats at 360px: no number runs into the next', boxes);
  await (await st.$('.fx-big')).screenshot({path: path.join(OUT, 'stats-phone.png')});

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
