// Activity's timeline: the people you follow as channels (a ring for how much of this week's plan they've watched, a
// dot when they watched something today), one person's week poster by poster, watching their next film too, and
// where two of them don't agree (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };
const day = k => { const d = new Date(Date.now() - k * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

(async () => {
  const b = await chromium.launch(), errs = [];
  async function person(u, name) {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    const p = await c.newPage(); p.on('pageerror', e => errs.push(u + ': ' + e.message));
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]'); await p.click('[data-amode="up"]');
    await p.fill('input[name=u]', u); await p.fill('input[name=n]', name); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
    await p.waitForSelector('[data-ostart="list"]'); await p.click('[data-ostart="list"]'); await p.waitForSelector('.fx-tabbar');
    return {c, p};
  }
  // a public profile with this week of a plan in it (what the app publishes; sent here as it is)
  async function publish(p, payload) {
    await p.evaluate(() => Store.set('cfg:share', '1')); await p.evaluate(() => CloudSync.syncNow()); await p.waitForTimeout(600);
    return p.evaluate(async pl => (await fetch('/api/profile', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({payload: pl, public: true})})).status, payload);
  }
  const ana = await person('ana_t', 'Ana');
  ok(await publish(ana.p, {v: 2, name: 'Ana', diary: [{id: 'a1', t: 'Tokyo Story', y: 1953, r: 10, w: day(0)}, {id: 'a2', t: 'Late Spring', y: 1949, r: 4, w: day(1)}],
    now: {wk: 3, of: 260, films: [{t: 'Tokyo Story', y: 1953, p: '/ts.jpg', w: day(0)}, {t: 'Late Spring', y: 1949, p: '/ls.jpg', w: day(1)}, {t: 'Floating Weeds', y: 1959, p: '/fw.jpg', w: ''}]}}) === 200, 'Ana publishes her profile, this week in it');
  await ana.c.close();
  const cy = await person('cy_t', 'Cy');
  ok(await publish(cy.p, {v: 2, name: 'Cy', diary: [{id: 'c1', t: 'Late Spring', y: 1949, r: 10, w: day(2), rv: 'Ozu at his gentlest.'}],
    now: {wk: 7, of: 104, films: [{t: 'Mirror', y: 1975, w: ''}, {t: 'Solaris', y: 1972, w: ''}]}}) === 200, 'and Cy');
  await cy.c.close();

  const bob = await person('bob_t', 'Bob');
  await bob.p.evaluate(async () => { await CloudSync.follow('ana_t', true); await CloudSync.follow('cy_t', true); });
  const p = bob.p;
  await p.goto(B + '/activity'); await p.waitForSelector('.tl-top', {timeout: 20000});
  const chans = await p.$$eval('.tl-chan[data-tl-ch]', bs => bs.map(x => ({u: x.dataset.tlCh, p: x.querySelector('.tl-ring').style.getPropertyValue('--p'), live: !!x.querySelector('.tl-live'), label: x.getAttribute('aria-label'), on: x.getAttribute('aria-pressed')})));
  ok(chans.length === 2 && chans[0].u === 'ana_t' && chans[0].p === '67' && chans[0].live && /2 of 3 watched, watched something today/.test(chans[0].label) && chans[0].on === 'true', 'channels: Ana first (watched today), her ring two thirds full', chans);
  ok(chans[1].u === 'cy_t' && chans[1].p === '0' && !chans[1].live, 'Cy: nothing watched yet this week', chans[1]);
  ok(!!(await p.$('.tl-add[data-seg="p"]')), 'and a way to find people');
  const wk = await p.evaluate(() => ({h: document.querySelector('.tl-wh h2').textContent, sub: document.querySelector('.tl-wh span').textContent, n: document.querySelectorAll('.tl-wk li').length, on: document.querySelectorAll('.tl-wk li.on').length, stars: [...document.querySelectorAll('.tl-wk li small')].map(s => s.textContent)}));
  ok(wk.h === 'Ana’s week' && wk.sub === 'Week 3 of 260' && wk.n === 3 && wk.on === 2 && wk.stars[0] === '★★★★★' && wk.stars[1] === '★★', 'her week: three films, two watched, with her stars', wk);
  await p.screenshot({path: path.join(OUT, 'timeline.png'), fullPage: true});

  // watch her next film too: it goes on your watchlist, from her
  ok(await p.$eval('[data-tl-along]', b => b.textContent) === 'Watch Floating Weeds too', 'her next film, by name');
  await p.click('[data-tl-along]'); await p.waitForTimeout(300);
  const wl = await p.evaluate(() => Object.keys(Store.data).filter(k => k.startsWith('wl:') && Store.data[k]).map(k => JSON.parse(Store.data[k])));
  ok(wl.length === 1 && wl[0].t === 'Floating Weeds' && wl[0].u === 'ana_t' && /\/fw\.jpg$/.test(wl[0].p), 'on your watchlist, from Ana, with its poster', wl);
  ok(!(await p.$('[data-tl-along]')), 'and the button goes');

  // another channel
  await p.click('[data-tl-ch="cy_t"]'); await p.waitForTimeout(200);
  ok(await p.$eval('.tl-wh h2', h => h.textContent) === 'Cy’s week' && await p.$eval('[data-tl-ch="cy_t"]', b => b.getAttribute('aria-pressed')) === 'true', 'Cy’s week, his channel pressed');

  // where they don't agree: Late Spring, five stars and two
  const split = await p.evaluate(() => { const s = [...document.querySelectorAll('.fx > section')].find(x => /They don’t agree/.test(x.querySelector('h2') ? x.querySelector('h2').textContent : '')); return s ? {film: s.querySelector('.fx-at').textContent.trim(), bars: [...s.querySelectorAll('.tl-bar')].map(b => b.innerText.replace(/\s+/g, ' ').trim()), q: (s.querySelector('.tl-q') || {}).textContent} : null; });
  ok(split && /Late Spring/.test(split.film) && split.bars.length === 2 && /Cy/.test(split.bars[0]) && /Ana/.test(split.bars[1]) && /Ozu at his gentlest/.test(split.q || ''), 'they don’t agree: Late Spring, Cy’s five stars and Ana’s two, with his words', split);
  ok(await p.$$eval('.fx > section h2', hs => hs.some(h => h.textContent === 'Latest')), 'then the latest entries');

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
