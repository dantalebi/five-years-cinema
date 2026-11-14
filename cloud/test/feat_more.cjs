// Beyond the catalog and between films: Discover's New and popular (live from TMDB) and its search of all of TMDB;
// a film page's previous and next (buttons, arrow keys), with Back returning to the grid in one step; a mini-series on
// the watchlist gets its poster (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };
const here = p => new URL(p.url()).pathname;

(async () => {
  const b = await chromium.launch(), errs = [];
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
  await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]'); await p.click('[data-amode="up"]');
  await p.fill('input[name=u]', 'nia'); await p.fill('input[name=n]', 'Nia'); await p.fill('input[name=p]', 'pass for nia');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
  await p.waitForSelector('[data-ostart="list"]'); await p.click('[data-ostart="list"]'); await p.waitForSelector('.fx-tabbar');

  // New and popular: this week's trending films out lately, and what's in cinemas; an old film trending again isn't "new"
  await p.goto(B + '/discover'); await p.waitForSelector('.dx-fresh', {timeout: 20000});
  const fresh = await p.$$eval('.dx-fresh .dx-ct', es => es.map(e => e.textContent));
  ok(fresh.join('|') === 'A New Film|In Cinemas Now', 'New and popular: new films, then what’s in cinemas', fresh);
  ok(await p.$eval('.dx-fresh a.dx-cell', a => a.getAttribute('href')) === '/film/tmdb/880001', 'each opens its film page');

  // search: the catalog's films, then the rest of TMDB (films, and series that are well known)
  await p.fill('[data-dx-q]', 'Zqx Unknown Picture'); await p.waitForSelector('.dx-beyond', {timeout: 15000});
  const bey = await p.$$eval('.dx-beyond li', ls => ls.map(l => l.querySelector('a.dx-cell').getAttribute('href') + ' ' + l.querySelector('.dx-ct').textContent));
  ok(/Nothing in the catalog matches/.test(await p.$eval('.dx-dyn', e => e.innerText)) && bey.length === 1 && /^\/film\/tmdb\/\d+ Zqx Unknown Picture$/.test(bey[0]), 'not in the catalog: found on TMDB', bey);
  await p.fill('[data-dx-q]', 'Dekalog'); await p.waitForFunction(() => /Dekalog/.test((document.querySelector('.dx-beyond') || {}).innerText || ''), null, {timeout: 15000});
  ok(await p.$eval('.dx-beyond a.dx-cell', a => a.getAttribute('href')) === '/film/tv/990001', 'a mini-series too');
  await p.screenshot({path: path.join(OUT, 'beyond.png'), fullPage: true});

  // a grid of films: open the third, step forward twice and back once, then Back is the grid again (one step)
  await p.goto(B + '/discover/decade/1960s'); await p.waitForSelector('.dx-grid .dx-cell', {timeout: 20000});
  const grid = await p.$$eval('.dx-grid a.dx-cell', as => as.map(a => a.getAttribute('href')));
  await p.click(`.dx-grid a.dx-cell[href="${grid[2]}"]`); await p.waitForSelector('.fp-seq');
  ok(here(p) === grid[2] && /3 of \d+/.test(await p.$eval('.fp-seq', e => e.innerText)), 'the film page says where it is in the grid', await p.$eval('.fp-seq', e => e.innerText));
  await p.click('[data-fp-step="1"]'); await p.waitForFunction(u => location.pathname === u, grid[3]);
  await p.keyboard.press('ArrowRight'); await p.waitForFunction(u => location.pathname === u, grid[4]);
  await p.keyboard.press('ArrowLeft'); await p.waitForFunction(u => location.pathname === u, grid[3]);
  ok(/4 of/.test(await p.$eval('.fp-seq', e => e.innerText)), 'next, a key to go on, a key to go back', await p.$eval('.fp-seq', e => e.innerText));
  await p.screenshot({path: path.join(OUT, 'film-seq.png')});
  await p.click('[data-fp-back]'); await p.waitForFunction(() => location.pathname === '/discover/decade/1960s');
  ok(true, 'Back: the grid again, in one step');
  await p.goto(B + grid[0]); await p.waitForSelector('.dx-head');
  ok(!(await p.$('.fp-seq')), 'a film page opened on its own: no previous or next');

  // a mini-series on the watchlist (TMDB has it as TV, not as a film): it gets its poster all the same
  await p.goto(B + '/'); await p.waitForSelector('.fx-tabbar');
  await p.evaluate(() => Store.set('wl:dekalog|1989', JSON.stringify({t: 'Dekalog', y: 1989, tm: 0, p: '', u: '', at: Date.now()})));
  await p.waitForFunction(() => { try { return JSON.parse(Store.data['wl:dekalog|1989']).tm < 0; } catch (e) { return false; } }, null, {timeout: 30000}).catch(() => {});
  const dk = await p.evaluate(() => JSON.parse(Store.data['wl:dekalog|1989'] || '{}'));
  ok(dk.tm === -990001 && /\/w185\/dk\.jpg$/.test(dk.p), 'a mini-series on the watchlist: its TV id and poster', dk);

  // Home: the channel right under This week, then friends; your own things (here the watchlist) are in a column beside
  // This week on a wide screen (here, with no plan, beside the rest of Home), and not on a phone
  await p.goto(B + '/'); await p.waitForSelector('.hm-ch', {timeout: 20000});
  const order = await p.$$eval('.hm > section', ss => ss.map(s => s.className.match(/hm-(ch|fr)\b|pp-tease/) ? s.className.match(/hm-(ch|fr)\b|pp-tease/)[0] : '').filter(Boolean));
  ok(order[0] === 'hm-ch' && order[1] === 'hm-fr', 'Home: the channel first, then the people you follow', order);
  ok(await p.$eval('.hm-side', e => getComputedStyle(e).display) === 'none', 'on a phone: no side column');
  await p.setViewportSize({width: 1280, height: 900}); await p.waitForTimeout(200);
  const side = await p.evaluate(() => { const s = document.querySelector('.hm-side'), l = document.querySelector('.fx-list') || document.querySelector('.hm'); return {shown: getComputedStyle(s).display !== 'none', top: Math.round(s.getBoundingClientRect().top - l.getBoundingClientRect().top), left: s.getBoundingClientRect().left > l.getBoundingClientRect().right, wl: !!s.querySelector('.hm-wl [data-hm-pick]')}; });
  ok(side.shown && side.top === 0 && side.left && side.wl, 'on a wide screen: the side column, beside This week, with the watchlist', side);
  await p.screenshot({path: path.join(OUT, 'home-wide.png')});
  await p.setViewportSize({width: 390, height: 844});

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
