// The plan builder: a new member builds a plan from the catalog (leaving out what they've seen), starts it, sees it on
// This Week and the plan map; later rebuilds it from Settings (Playwright, test/server.mjs on :8790, the real catalog).
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); if (!c) fails++; };
const here = p => p.url().replace(B, '');

(async () => {
  if (!fs.existsSync(path.join(__dirname, '..', 'public', 'catalog', 'catalog.json'))) { console.log('ok   no catalog in this build: skipped'); console.log('ALL PASSED'); return; }
  const b = await chromium.launch(), errs = [];
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}), p = await c.newPage();
  await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
  await p.click('[data-amode="up"]'); await p.fill('input[name=u]', 'otto'); await p.fill('input[name=n]', 'Otto'); await p.fill('input[name=p]', 'pass for otto');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('[data-obuild]', {timeout: 15000});
  const opts = await p.$$eval('.fx-opt h2', hs => hs.map(h => h.textContent));
  ok(/Build your plan/.test(opts[0]), 'building a plan is the first way to start', opts);
  // he has seen Citizen Kane: the plan must leave it out
  const kane = await p.evaluate(async () => { const j = await (await fetch('/catalog/catalog.json')).json(); const f = j.films.find(r => r[1] === 'citizen-kane'); return f ? f[0] : 0; });
  await p.evaluate(tm => { Store.set('log:k1', 't:Citizen Kane (1941)'); Store.set('v:log:k1', '2026-01-05'); Store.set('md:log:k1', JSON.stringify({tm, t: 'Citizen Kane', y: 1941})); }, kane);
  await p.click('[data-obuild]'); await p.waitForSelector('[data-pb-go]', {timeout: 15000});
  ok(/leaves out the 1 catalog film/.test(await p.$eval('.fx-app', e => e.innerText)), 'it says what it will leave out');
  await p.click('[data-pb-years="1"]'); await p.click('[data-pb-per="3"]');
  await p.click('[data-pb-go]'); await p.waitForSelector('[data-pb-start]', {timeout: 15000});
  const pv = await p.$eval('.fx-app', e => e.innerText.replace(/\s+/g, ' '));
  ok(/52 weeks · 104 films/.test(pv), 'the preview: a year, two films a week and an open slot', pv.slice(0, 160));
  ok(/Directors you’ll follow/i.test(pv) && /Week 1/i.test(pv), 'it shows the first weeks and the directors');
  await p.screenshot({path: path.join(OUT, 'plan-preview.png'), fullPage: true});
  await p.click('[data-pb-start]'); await p.waitForSelector('.fx-tabbar', {timeout: 15000}); await p.waitForTimeout(600);
  ok(here(p) === '/week', 'started: This Week', here(p));
  const D = await p.evaluate(() => ({kind: window.D.kind, W: window.D.W.length, keys: window.D.W.flat().filter(it => it[2] === 1).map(it => window.D.F[it[1]][8]),
    perWeek: window.D.W.map(wk => wk.filter(it => it[2] === 1).map(it => window.D.F[it[1]][2].split(', ')[0])), open: window.D.W.every(wk => wk.some(it => it[2] === 2)),
    tms: window.D.F.map(f => f[16]), R: Object.values(window.D.R).map(r => r.f.filter(n => !window.D.F[n][10]).map(n => [window.D.W.findIndex(wk => wk.some(it => it[1] === n && it[2] === 1)), window.D.F[n][1]]))}));
  ok(D.kind === 'gen' && D.W === 52, 'a 52-week plan of its own', [D.kind, D.W]);
  ok(D.keys.length === new Set(D.keys).size, 'no film twice');
  ok(D.perWeek.every(ds => ds.filter(Boolean).length === new Set(ds.filter(Boolean)).size), 'never two films by one director in a week');
  ok(D.open, 'an open slot every week');
  ok(!D.tms.includes(kane), 'Citizen Kane, already seen, is left out');
  ok(D.R.every(fs => fs.filter(x => x[0] >= 0).sort((a, b) => a[0] - b[0]).every((x, k, a) => !k || x[1] >= a[k - 1][1])), 'each director’s films come in the order they were made');
  const saved = await p.evaluate(async () => { const r = await fetch('/api/plan'); return r.ok ? (await r.json()).plan.kind : r.status; });
  ok(saved === 'gen', 'saved to the account', saved);
  ok((await p.$$('.fx-i')).length >= 3, 'This Week shows its films and the open slot', (await p.$$('.fx-i')).length);
  await p.click('.fx-planlink'); await p.waitForSelector('.pm-svg');
  const map = await p.$eval('.fx-app', e => e.innerText);
  ok(/Movements & Periods/i.test(map) && /Directors across the plan/i.test(map), 'the plan map works for a built plan');
  await p.screenshot({path: path.join(OUT, 'plan-map.png'), fullPage: false});
  // rebuild from Settings
  await p.click('[data-ac-menu]'); await p.click('.av-menu a[href="/settings"]'); await p.click('a[href="/plan/new"]'); await p.waitForSelector('[data-pb-go]');
  ok(here(p) === '/plan/new', 'the builder in the app', here(p));
  await p.click('[data-pb-years="2"]'); await p.click('[data-pb-preset="directors"]'); await p.click('[data-pb-go]'); await p.waitForSelector('[data-pb-start]', {timeout: 15000});
  ok(/replaces your current plan \(the plan you built on/.test(await p.$eval('.fx-app', e => e.innerText)), 'it says it will replace the current plan');
  await p.click('[data-pb-start]'); await p.waitForTimeout(1500); await p.waitForSelector('.fx-tabbar');
  ok(await p.evaluate(() => window.D.W.length) === 104 && here(p) === '/week', 'replaced: two years', here(p));
  ok(await p.evaluate(() => Store.data['log:k1']) === 't:Citizen Kane (1941)', 'the diary is untouched');
  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
