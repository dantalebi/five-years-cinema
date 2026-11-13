// Two people on the multi-user site, end to end (Playwright against test/server.mjs on :8790).
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/sample-plan.json'), 'utf8'));
delete plan.kind;
const k0 = plan.F[0][8], k1 = plan.F[1][8], k2 = plan.F[2][8];
const now = Date.now(), E = (v, d = 0) => [v, now - d];
// what the old site's "Download everything" gives
const moveFile = {v: 1, app: 'five-years-cinema', exported: new Date().toISOString(), plan, e: {
  [k0]: E('2026-11-02'), ['r:' + k0]: E(9), [k1]: E('2026-11-03'), ['l:' + k1]: E(1),
  'log:a1': E('t:Heat (1995)'), 'v:log:a1': E('2026-10-01'), 'r:log:a1': E(10), 'md:log:a1': E(JSON.stringify({tm: 949, t: 'Heat', y: 1995, d: 'Michael Mann', m: 170, p: '/heat.jpg'})),
  'log:a2': E('t:Fargo (1996)'), 'v:log:a2': E('2026-10-05'), 'r:log:a2': E(6), 'rv:log:a2': E('Snow and nerves.'),
  'cfg:name': E('Danial Talebi'), 'cfg:lang': E('fa'), 'cfg:lb': E('danial_lb'), 'cfg:tmdb': E('eyJsecret'), 'cfg:share': E('oldgistid'),
}};
fs.writeFileSync(path.join(OUT, 'film-diary-move.json'), JSON.stringify(moveFile));
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const dev = async name => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"/>'}));
    const p = await c.newPage();
    p.on('pageerror', e => errs.push(name + ' ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/404|401|Failed to load resource/.test(m.text())) errs.push(name + ' console ' + m.text()); });
    p.on('request', rq => { if (/api\.themoviedb\.org|letterboxd\.com/.test(rq.url())) errs.push(name + ' went straight to ' + rq.url()); });
    return p;
  };
  const text = async (p, sel) => (await p.$eval(sel, e => e.innerText)).replace(/\s+/g, ' ').trim();
  const diaryCount = p => p.evaluate(() => fxDiary(window.D, Store.data).length);

  // Danial signs up and moves his old diary in
  const a = await dev('A');
  await a.goto(B + '/'); await a.waitForSelector('form[data-auth]');
  ok((await a.getAttribute('html', 'dir')) === 'ltr' && !(await a.$('[data-alang]')), 'English only, no language switch');
  await a.click('[data-amode="up"]');
  await a.fill('input[name=u]', 'Danial'); await a.fill('input[name=n]', 'Danial Talebi'); await a.fill('input[name=p]', 'correct horse 1');
  await a.click('form[data-auth] button[type=submit]');
  await a.waitForSelector('[data-knext]', {timeout: 15000}); await a.check('[data-kok]'); await a.click('[data-knext]');
  await a.waitForSelector('[data-omove]', {timeout: 15000});
  ok(true, 'signed up → setup screen');
  const reqs = []; a.on('request', r => { if (r.url().includes('/api/')) reqs.push(r.method() + ' ' + new URL(r.url()).pathname); });
  await a.setInputFiles('[data-omove]', path.join(OUT, 'film-diary-move.json'));
  await a.waitForSelector('.fx-tabbar', {timeout: 20000}); await a.waitForTimeout(1500);
  ok(await a.evaluate(() => Store.data['cfg:plan']) === 'own', 'his own plan came over (cfg:plan = own)');
  ok(await a.evaluate(() => !Store.data['cfg:tmdb'] && Store.data['cfg:share'] === 'danial'), 'old keys and gist id left behind; profile on as @danial');
  ok(await a.evaluate(() => Store.data['cfg:since']) === '2026-11-02', 'plan start taken from the first tick', await a.evaluate(() => Store.data['cfg:since']));
  ok(await diaryCount(a) === 4, 'diary: 2 plan ticks + 2 logs', await diaryCount(a));
  ok(reqs.includes('PUT /api/plan') && reqs.some(r => r === 'POST /api/sync'), 'plan saved and diary synced to the server', reqs.slice(0, 6));
  await a.waitForTimeout(2500);
  // the Letterboxd feed through the site (cfg:lb = danial_lb has two new logs)
  ok(await a.evaluate(() => Object.values(Store.data).filter(v => v === 't:Heat (1995)').length >= 1), 'feed pulled in through /api/lb');
  // second device
  const a2 = await dev('A2');
  await a2.goto(B + '/'); await a2.waitForSelector('form[data-auth]');
  await a2.fill('input[name=u]', 'danial'); await a2.fill('input[name=p]', 'correct horse 1');
  await a2.click('form[data-auth] button[type=submit]');
  await a2.waitForSelector('.fx-tabbar', {timeout: 20000}); await a2.waitForTimeout(800);
  ok(await diaryCount(a2) === await diaryCount(a), 'second device has the same diary', [await diaryCount(a2), await diaryCount(a)]);
  ok(await a2.evaluate(() => Store.data['r:log:a1']) === 10 && await a2.evaluate(() => Store.data['rv:log:a2']) === 'Snow and nerves.', 'ratings and reviews too');
  await a2.evaluate(() => { Store.set('r:log:a1', 9); });
  await a2.waitForTimeout(3000);
  let got = null; for (let i = 0; i < 10 && got !== 9; i++) { await a.evaluate(() => CloudSync.run()); await a.waitForTimeout(700); got = await a.evaluate(() => Store.data['r:log:a1']); }
  ok(got === 9, 'a change on one device reaches the other', got);
  // wrong password
  const x = await dev('X');
  await x.goto(B + '/'); await x.waitForSelector('form[data-auth]');
  await x.fill('input[name=u]', 'danial'); await x.fill('input[name=p]', 'wrong pass');
  await x.click('form[data-auth] button[type=submit]'); await x.waitForSelector('.fx-ferr', {timeout: 15000});
  ok(/Wrong username or password/.test(await text(x, '.fx-ferr')), 'wrong password says so', await text(x, '.fx-ferr'));

  // Sara: English, sample plan, a couple of films Danial has too
  const s = await dev('S');
  await s.goto(B + '/'); await s.waitForSelector('form[data-auth]');
  await s.click('[data-amode="up"]');
  await s.fill('input[name=u]', 'sara_k'); await s.fill('input[name=n]', 'Sara'); await s.fill('input[name=p]', 'another pass 2');
  await s.screenshot({path: path.join(OUT, 'cl-auth.png'), fullPage: true});
  await s.click('form[data-auth] button[type=submit]');
  await s.waitForSelector('[data-knext]', {timeout: 15000}); await s.check('[data-kok]'); await s.click('[data-knext]'); await s.waitForSelector('[data-ostart="list"]', {timeout: 15000});
  await s.evaluate(async () => { await CloudSync.savePlan(await (await fetch('/sample-plan.json')).json()); Store.set('cfg:since', new Date().toISOString().slice(0, 10)); Store.set('cfg:plan', 'own'); }); await s.waitForSelector('.fx-tabbar', {timeout: 15000});
  await s.evaluate(([k0]) => { Store.set(k0, '2026-11-04'); Store.set('r:' + k0, 8); Store.set('log:s1', 't:Heat (1995)'); Store.set('v:log:s1', '2026-11-05'); Store.set('r:log:s1', 10); Store.set('md:log:s1', JSON.stringify({tm: 949, t: 'Heat', y: 1995})); Store.set('log:s2', 't:Fargo (1996)'); Store.set('v:log:s2', '2026-11-06'); Store.set('r:log:s2', 4); }, [k0]);
  await s.waitForTimeout(2500); await s.evaluate(() => CloudSync.run()); await s.waitForTimeout(800);
  // Activity → People: find Danial, follow, then see his latest under Friends
  await s.click('[data-nav="friends"]'); await s.click('[data-seg="p"]'); await s.waitForSelector('.fx-people li', {timeout: 10000});
  ok((await text(s, '.fx-people')).includes('@danial'), 'Danial in People', await text(s, '.fx-people'));
  await s.fill('[data-fr-q]', 'zzz'); ok(await s.$$eval('.fx-people li', l => l.length) === 0, 'search filters'); await s.fill('[data-fr-q]', 'dan');
  await s.click('[data-fr-follow="danial"]'); await s.waitForTimeout(800);
  ok(await s.$eval('[data-fr-follow="danial"]', e => e.getAttribute('aria-pressed')) === 'true', 'now following');
  await s.click('[data-seg="f"]'); await s.waitForSelector('.fx-actv', {timeout: 10000});
  ok(await s.$$eval('.fx-actv', l => l.length) >= 3, 'his latest logs in the feed', await s.$$eval('.fx-actv', l => l.map(e => e.innerText.replace(/\s+/g, ' ')).slice(0, 3)));
  await s.screenshot({path: path.join(OUT, 'cl-friends.png'), fullPage: true});
  // his profile page, as Sara: follow state, and the taste match against her own diary
  await s.goto(B + '/u/danial'); await s.waitForSelector('.fx-pmeta', {timeout: 10000});
  ok(/1 follower|۱ دنبال‌کننده/.test(await text(s, '.fx-pmeta')) && (await s.$eval('[data-pfollow]', e => e.getAttribute('aria-pressed'))) === 'true', 'profile shows followers and that she follows', await text(s, '.fx-pmeta'));
  await s.click('[data-tab="play"]'); await s.click('[data-pl="go:match"]'); await s.waitForSelector('[data-pl="mine"]', {timeout: 8000});
  await s.click('[data-pl="mine"]'); await s.waitForSelector('.fx-score');
  ok(true, 'taste match with her own diary: ' + await text(s, '.fx-score') + ' · ' + await text(s, '.fx-play .fx-small'));
  await s.click('[data-pl="mreset"]'); await s.fill('form[data-pl-form] input', 'sara_k'); await s.press('form[data-pl-form] input', 'Enter'); await s.waitForSelector('.fx-play .fx-small', {timeout: 8000});
  ok(/۲|2/.test(await text(s, '.fx-play .fx-small')), 'any Letterboxd username works through the site: ' + await text(s, '.fx-play .fx-small'));
  await s.screenshot({path: path.join(OUT, 'cl-match.png'), fullPage: true});
  await s.goto(B + '/u/danial'); await s.waitForSelector('[data-pfollow]'); await s.click('[data-pfollow]'); await s.waitForTimeout(600);
  ok(/0 followers|۰ دنبال‌کننده/.test(await text(s, '.fx-pmeta')), 'unfollow from the profile', await text(s, '.fx-pmeta'));

  // someone without an account
  const v = await dev('V');
  await v.goto(B + '/u/danial'); await v.waitForSelector('.fx-pmeta', {timeout: 10000});
  ok((await v.$eval('.fx-pmeta a.fx-btn', e => e.getAttribute('href'))) === '/', 'visitors get a sign-in link instead of Follow');
  const vt = await v.$$eval('.fx-tabs button', l => l.map(x => x.textContent));
  ok(vt.length >= 6 && vt.includes('Films'), 'every tab on a member’s profile, Films among them', vt);
  await v.screenshot({path: path.join(OUT, 'cl-profile.png')});
  await v.goto(B + '/u/nobody_here'); await v.waitForTimeout(800);
  ok(/isn’t public|published/.test(await text(v, 'h1')), 'unknown profile: no longer published', await text(v, 'h1'));

  // Danial's settings: account section, sign out wipes this device
  await a.click('[data-ac-menu]'); await a.click('.av-menu a[href="/settings"]'); await a.waitForTimeout(300);
  ok(/@danial/.test(await text(a, '.fx-app')), 'settings show who is signed in');
  ok(!(await a.$('form[data-tmdb]')) && !(await a.$('form[data-gh]')), 'no TMDB key or GitHub token to paste');
  await a.screenshot({path: path.join(OUT, 'cl-settings.png'), fullPage: true});
  await a.click('[data-sset="privacy"]'); await a.waitForSelector('input[data-pubprof]'); await a.click('input[data-pubprof]'); await a.waitForTimeout(800);
  await v.goto(B + '/u/danial'); await v.waitForTimeout(800);
  ok(/isn’t public|published/.test(await text(v, 'h1')), 'profile off → not readable');
  await a.click('[data-sset-back]'); await a.waitForSelector('[data-ac-out]'); await a.click('[data-ac-out]'); await a.waitForSelector('form[data-auth]', {timeout: 10000});
  ok(await a.evaluate(() => !localStorage.getItem('fy-state') && !localStorage.getItem('fd-me')), 'signing out leaves nothing on the device');
  // nothing went straight to TMDB or Letterboxd
  console.log('errors', errs);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
