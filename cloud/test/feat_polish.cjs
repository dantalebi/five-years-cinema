// The finish: sheets and the account menu come and go by a class (a close turns back if you change your mind), the tab
// bar floats off the bottom edge, the watchlist row starts at the page's margin, the channel's place while it loads is
// its shape and its height, a poster under the pointer gets a ring that shows on any poster, a film's backdrop starts at
// the very top, and small links get a tap area of 24px (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };

(async () => {
  const b = await chromium.launch(), errs = [];
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
  await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
  let gate = null; await c.route(/\/catalog\/catalog\.json/, async r => { if (gate) await gate; r.continue(); });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]'); await p.click('[data-amode="up"]');
  await p.fill('input[name=u]', 'poli'); await p.fill('input[name=n]', 'Poli'); await p.fill('input[name=p]', 'pass for poli');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
  await p.waitForSelector('[data-ostart="list"]'); await p.click('[data-ostart="list"]'); await p.waitForSelector('.fx-tabbar');
  await p.evaluate(() => { for (let i = 0; i < 4; i++) Store.set('wl:tm' + (4240 + i), JSON.stringify({t: 'Film ' + i, y: 1953, tm: 4240 + i, p: '', u: '', at: Date.now() - i})); });

  // the log sheet: in, out, and back in half way
  await p.goto(B + '/activity'); await p.waitForSelector('[data-wl-log]', {state: 'attached', timeout: 15000}); await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelector('[data-wl-log]').click()); await p.waitForSelector('.fx-sheet', {timeout: 8000}); await p.waitForTimeout(450);
  const st = () => p.evaluate(() => { const w = document.querySelector('.fx-sheetwrap:not(.av-wrap):not(.ls-wrap)'), s = w && w.querySelector('.fx-sheet'); return {hidden: w.hidden, out: w.classList.contains('out'), t: s ? getComputedStyle(s).transform : null}; });
  let s1 = await st(); ok(!s1.hidden && !s1.out && (s1.t === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(s1.t)), 'the sheet slides in', s1);
  await p.evaluate(() => document.querySelector('.fx-sheetwrap .fx-shh [data-scancel]').click()); await p.waitForTimeout(90);
  const mid = await st(); ok(mid.out && !mid.hidden, 'closing: on its way out', mid);
  await p.evaluate(() => document.querySelector('[data-wl-log]').click()); await p.waitForTimeout(500);
  s1 = await st(); ok(!s1.hidden && !s1.out && (s1.t === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(s1.t)), 'opened again half way out: it turns back and stays', s1);
  await p.evaluate(() => document.querySelector('.fx-sheetwrap .fx-shh [data-scancel]').click()); await p.waitForTimeout(500);
  s1 = await st(); ok(s1.hidden && !s1.out, 'closed: gone once it has slid out', s1);

  // the account menu: a class, in place
  await p.click('[data-ac-menu]'); await p.waitForSelector('.av-menu.on');
  await p.keyboard.press('Escape'); await p.waitForTimeout(50);
  ok(!(await p.$('.av-menu.on')) && !!(await p.$('.av-menu')), 'Escape: the menu closes in place (it fades, it isn’t torn out)');
  ok(await p.$eval('.av-menu', m => m.inert && getComputedStyle(m).pointerEvents === 'none'), 'a closed menu can’t be reached');

  // the tab bar floats; the watchlist row starts at the margin
  await p.goto(B + '/'); await p.waitForSelector('.hm-wl', {timeout: 20000});
  const tab = await p.$eval('.fx-tabbar', e => { const r = e.getBoundingClientRect(); return {gap: Math.round(innerHeight - r.bottom), left: Math.round(r.left), radius: parseFloat(getComputedStyle(e).borderTopLeftRadius)}; });
  ok(tab.gap >= 8 && tab.left >= 8 && tab.radius >= 16, 'the tab bar floats off the bottom edge', tab);
  await p.$eval('.hm-wl', e => e.scrollIntoView({block: 'center'})); await p.waitForTimeout(300);
  ok(await p.$eval('.hm-strip li', li => Math.round(li.getBoundingClientRect().left)) === 16, 'the watchlist row starts at the page’s margin');

  // the channel while the catalog comes: its shape, at its height
  let open; gate = new Promise(r => open = r);
  const d = await c.newPage(); await d.goto(B + '/'); await d.waitForSelector('.hm-chw', {timeout: 20000});
  const sk = await d.$eval('.hm-chw', e => ({h: Math.round(e.getBoundingClientRect().height), n: e.querySelectorAll('.sk-pos').length, busy: e.getAttribute('aria-busy')}));
  open(); gate = null; await d.waitForSelector('.hm-ch', {timeout: 20000}); await d.waitForTimeout(300);
  const real = await d.$eval('.hm-ch', e => Math.round(e.getBoundingClientRect().height));
  ok(sk.n === 6 && sk.busy === 'true' && Math.abs(sk.h - real) <= 2, 'loading: six posters’ shapes, the channel’s height, nothing jumps', {sk, real});
  await d.close();

  // a poster under the pointer (a computer): lifted, a ring outside it, not green
  await p.setViewportSize({width: 1280, height: 860}); await p.goto(B + '/'); await p.waitForSelector('.hm-ch .dx-cell', {timeout: 20000});
  await p.$eval('.hm-ch', e => e.scrollIntoView({block: 'center'})); const cells = await p.$$('.hm-ch .dx-cell'); await cells[1].hover(); await p.waitForTimeout(350);
  const hv = await p.$eval('.hm-ch .dx-cell:hover .dx-pos', e => { const cs = getComputedStyle(e); return {sh: cs.boxShadow, t: cs.transform}; });
  ok(/ 0px 0px 0px 4px/.test(hv.sh) && hv.t !== 'none', 'hover: a ring outside the poster, the poster lifted', hv);
  await p.screenshot({path: path.join(OUT, 'polish-hover.png')});

  // a film's page: its backdrop from the very top (with Previous and Next in the header too); links with a 24px tap area
  await p.setViewportSize({width: 390, height: 844});
  await p.goto(B + '/discover/decade/1960s'); await p.waitForSelector('.dx-grid .dx-cell', {timeout: 20000});
  await p.click('.dx-grid a.dx-cell >> nth=2'); await p.waitForSelector('.fp-seq'); await p.waitForSelector('.dx-fh', {timeout: 15000});
  const top = await p.evaluate(() => { document.querySelector('.dx-fh').insertAdjacentHTML('beforebegin', '<div class="dx-bd" aria-hidden="true"><img alt=""></div>'); return Math.round(document.querySelector('.dx-bd').getBoundingClientRect().top); });
  ok(top === 0, 'the backdrop starts at the top: no strip above it', top);
  const small = await p.$$eval('a.dx-a', as => as.map(a => Math.round(a.getBoundingClientRect().height)).filter(h => h < 24));
  ok(!small.length, 'the film’s links: 24px to tap or more', small);

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
