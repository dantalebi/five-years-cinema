// The sign-in and sign-up form when something's wrong: the error under the field it's about, what was typed kept,
// a username's rules said while it's typed; and watchlist films brought in from Letterboxd (title and year only)
// getting their TMDB id and poster in the background (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async () => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const p = await ctx();
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]'); await p.click('[data-amode="up"]'); await p.waitForSelector('input[name=n]');
  await p.fill('input[name=u]', 'dan.t');
  ok(/“\.” can’t be used/.test(await p.$eval('[data-uhint]', e => e.textContent)) && await p.$eval('input[name=u]', e => e.getAttribute('aria-invalid')) === 'true', 'a dot in a username: said while it’s typed');
  await p.fill('input[name=n]', 'Dan'); await p.fill('input[name=p]', 'a fine password'); await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('.fx-ferr');
  const st = await p.evaluate(() => ({u: document.querySelector('input[name=u]').value, n: document.querySelector('input[name=n]').value, p: document.querySelector('input[name=p]').value, under: document.querySelector('.fx-ferr').closest('label').querySelector('input').name, focus: document.activeElement.name}));
  ok(st.u === 'dan.t' && st.n === 'Dan' && st.p === 'a fine password', 'nothing typed is lost', st);
  ok(st.under === 'u' && st.focus === 'u', 'the error sits under the username, which is ready to fix', st);
  await p.screenshot({path: path.join(OUT, 'form-error.png'), fullPage: true});
  await p.fill('input[name=u]', 'dan_t');
  ok(!(await p.$('.fx-ferr')), 'fixing it clears the error');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
  await p.waitForSelector('[data-ostart="list"]');
  // the first screen in: three ways to start, the quickest first; the old site's file folded away
  const opts = await p.$$eval('.ob-opt b', es => es.map(e => e.textContent));
  ok(opts.join('|') === 'Just keep a diary|Make me a plan|Start from my Letterboxd watchlist' && await p.$eval('details.ob-old', d => !d.open), 'three ways to start, the quickest first', opts);
  await p.screenshot({path: path.join(OUT, 'onboard.png'), fullPage: true});
  await p.click('[data-ostart="list"]'); await p.waitForSelector('.fx-tabbar');
  // taken; wrong password
  const q = await ctx(); await q.goto(B + '/'); await q.waitForSelector('form[data-auth]'); await q.click('[data-amode="up"]'); await q.waitForSelector('input[name=n]');
  await q.fill('input[name=u]', 'dan_t'); await q.fill('input[name=n]', 'Other'); await q.fill('input[name=p]', 'another password'); await q.click('form[data-auth] button[type=submit]'); await q.waitForSelector('.fx-ferr');
  ok(/already taken/.test(await q.$eval('.fx-ferr', e => e.textContent)) && await q.$eval('input[name=n]', e => e.value) === 'Other', 'a taken username: said under it, the rest kept');
  await q.click('[data-amode="in"]'); await q.waitForSelector('form[data-auth]'); await q.fill('input[name=u]', 'dan_t'); await q.fill('input[name=p]', 'not the password'); await q.click('form[data-auth] button[type=submit]'); await q.waitForSelector('.fx-ferr');
  const w = await q.evaluate(() => ({u: document.querySelector('input[name=u]').value, p: document.querySelector('input[name=p]').value, under: document.querySelector('.fx-ferr').closest('label').querySelector('input').name, focus: document.activeElement.name}));
  ok(w.u === 'dan_t' && w.p === '' && w.under === 'p' && w.focus === 'p', 'a wrong password: the username kept, the password to type again', w);
  await q.fill('input[name=p]', 'x');
  ok(!(await q.$('.fx-ferr')) && await q.$eval('input[name=p]', e => e.getAttribute('aria-invalid')) === null, 'typing the password again clears its error');
  await q.click('.au-eye'); 
  ok(await q.$eval('input[name=p]', e => e.type) === 'text' && await q.$eval('.au-eye', e => e.textContent) === 'Hide', 'Show: the password can be checked before it’s sent');
  await q.click('.au-eye');
  ok(await q.$eval('input[name=p]', e => e.type) === 'password', 'and hidden again');
  // a slow site: signing in says so after a while, and the answer still comes
  await q.route('**/api/login', async r => { await new Promise(res => setTimeout(res, 9500)); await r.continue(); });
  await q.fill('input[name=p]', 'not the password'); await q.click('form[data-auth] button[type=submit]');
  await q.waitForFunction(() => /Still working… TVC15 is slow right now/.test((document.querySelector('form[data-auth] .fx-note') || {}).textContent || ''), null, {timeout: 15000});
  ok(true, 'a slow sign-in says the site is slow, and that waiting is fine');
  await q.waitForSelector('.fx-ferr', {timeout: 20000}); await q.unroute('**/api/login');
  // an invite link that stopped working between opening it and signing up: said, not swallowed
  const jn = await ctx();
  await jn.route('**/api/invite/*', r => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({by: {username: 'jon', name: 'Jon', av: 0}})}));
  await jn.route('**/api/signup', r => r.fulfill({status: 403, contentType: 'application/json', body: '{"error":"code"}'}));
  await jn.goto(B + '/join/abcdefgh1234'); await jn.waitForSelector('.au-inv');
  await jn.fill('input[name=u]', 'late_one'); await jn.fill('input[name=n]', 'Late'); await jn.fill('input[name=p]', 'pass for late');
  await jn.click('form[data-auth] button[type=submit]');
  await jn.waitForFunction(() => /invite link doesn’t work any more/.test(document.querySelector('form[data-auth]').innerText), null, {timeout: 20000});
  ok(await jn.$eval('input[name=u]', e => e.value) === 'late_one', 'a dead invite link: said, with what was typed kept');
  // the site failing: a bar says so, and that nothing is lost
  await p.route('**/api/sync', r => r.fulfill({status: 503, contentType: 'text/html', body: 'Error 1102'}));
  await p.evaluate(() => { Store.set('cfg:x-test', String(Date.now())); return CloudSync.run(); });
  await p.waitForFunction(() => { const b = document.querySelector('.fx-offline'); return b && !b.hidden && /slow right now/.test(b.textContent); }, null, {timeout: 10000}).catch(() => {});
  ok(await p.$eval('.fx-offline', e => !e.hidden && /saved on this device/.test(e.textContent)), 'the site failing: a bar says it’s slow and nothing is lost');
  await p.unroute('**/api/sync'); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(500);
  ok(await p.$eval('.fx-offline', e => e.hidden), 'and goes once it works again');
  // the database's daily allowance used up: said, with when it comes back
  await p.route('**/api/sync', r => r.fulfill({status: 503, contentType: 'application/json', body: '{"error":"dblimit"}'}));
  await p.evaluate(() => { Store.set('cfg:x-test', String(Date.now())); return CloudSync.run(); });
  await p.waitForTimeout(400);
  ok(await p.$eval('.fx-offline', e => !e.hidden && /used up today’s free database allowance/.test(e.textContent) && /3:30 Tehran/.test(e.textContent)), 'the daily database limit: said, with when it’s back');
  await p.unroute('**/api/sync'); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(500);
  // offline: said at the top while it lasts
  await q.context().setOffline(true); await q.waitForTimeout(200);
  ok(await q.$eval('.fx-offline', e => !e.hidden && /offline/.test(e.textContent)), 'offline: a note at the top');
  await q.context().setOffline(false); await q.waitForTimeout(200);
  ok(await q.$eval('.fx-offline', e => e.hidden), 'back online: gone');

  // the watchlist: films from Letterboxd's watchlist.csv, a title and a year each, get their TMDB id and poster
  await p.evaluate(() => { for (let i = 0; i < 40; i++) Store.set('wl:film number ' + i + '|' + (1960 + i), JSON.stringify({t: 'Film Number ' + i, y: 1960 + i, tm: 0, p: '', u: '', at: Date.now() - i})); });
  await p.reload(); await p.waitForSelector('.fx-tabbar');
  await p.waitForFunction(() => Object.keys(Store.data).filter(k => /^wl:tm\d+$/.test(k)).length >= 40, null, {timeout: 30000}).catch(() => {});
  const wl = await p.evaluate(() => { const ks = Object.keys(Store.data).filter(k => k.startsWith('wl:')); return {n: ks.length, tm: ks.filter(k => /^wl:tm\d+$/.test(k)).length, poster: ks.filter(k => /^https:\/\/image\.tmdb\.org\/t\/p\/w185\//.test(JSON.parse(Store.data[k]).p)).length}; });
  ok(wl.n === 40 && wl.tm === 40 && wl.poster === 40, 'all forty: under their TMDB id, with a poster, nothing doubled', wl);
  // the same watchlist.csv again (downloaded twice, so "watchlist (1).csv"), now with one more film: only the new one comes in
  const fs = require('fs'), f = path.join(OUT, 'watchlist (1).csv');
  fs.writeFileSync(f, 'Date,Name,Year,Letterboxd URI\n' + Array.from({length: 40}, (_, i) => `2026-01-01,Film Number ${i},${1960 + i},https://boxd.it/x${i}`).join('\n') + '\n2026-01-02,One More Film,2001,https://boxd.it/y\n');
  await p.click('[data-ac-menu]'); await p.click('.av-menu a[href="/settings"]'); await p.click('[data-sset="letterboxd"]'); await p.waitForSelector('[data-lbimport]', {state: 'attached'}); await p.setInputFiles('[data-lbimport]', f); await p.waitForTimeout(2000);
  const again = await p.evaluate(() => Object.keys(Store.data).filter(k => k.startsWith('wl:') && Store.data[k]).map(k => JSON.parse(Store.data[k]).t));
  ok(again.length === 41 && again.includes('One More Film'), 'importing it again adds only the new film', again.length);
  const said = () => p.$eval('.fx-note.ok', e => e.textContent).catch(() => '');
  ok(/^1 film added to your watchlist\.$/.test(await said()), 'and says so', await said());
  await p.setInputFiles('[data-lbimport]', f); await p.waitForTimeout(1500);
  ok(/already had all of these/.test(await said()), 'a third time: nothing new, and it says that (not “not a Letterboxd export”)', await said());

  // someone else's watchlist, published before its posters were found: the catalog's poster where it has the film
  await p.evaluate(async () => { await fetch('/api/profile', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({public: true, payload: {v: 2, name: 'Dan', diary: [], wl: [{t: 'Stalker', y: 1979, tm: 0, p: ''}, {t: 'Not In Any Catalog', y: 2001, tm: 0, p: ''}]}})}); });
  const v = await ctx(); await v.goto(B + '/u/dan_t/watchlist'); await v.waitForSelector('.fx-pgrid li', {timeout: 15000});
  await v.waitForFunction(() => document.querySelectorAll('.fx-pgrid img').length > 0, null, {timeout: 20000}).catch(() => {});
  const cells = await v.$$eval('.fx-pgrid li', ls => ls.map(l => l.querySelector('img') ? 'poster' : l.innerText.trim()));
  ok(cells.includes('poster') && cells.includes('Not In Any Catalog'), 'a watchlist without posters: the catalog fills in what it knows', cells);
  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
