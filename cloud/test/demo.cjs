// A realistic local site for looking at screens: talebi with his plan and Letterboxd history, and two friends.
// DB_FILE=… node test/server.mjs 8790 & node test/demo.cjs <export folder> <plan.json> <out folder>
// Saves each person's signed-in browser state to <out>/state-<name>.json for test/shots.cjs.
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const [LBX, PLAN, OUT] = process.argv.slice(2);
const B = 'http://localhost:8790';
const fakeImg = r => {
  const p = new URL(r.request().url()).pathname, h = [...p].reduce((a, c) => (a * 33 + c.charCodeAt(0)) % 360, 5);
  r.fulfill({status: 200, contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="hsl(${h},35%,38%)"/><rect x="18" y="200" width="120" height="10" fill="hsl(${h},30%,70%)"/><rect x="18" y="218" width="80" height="8" fill="hsl(${h},30%,62%)"/></svg>`});
};
async function person(b, name, fn) {
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
  await c.route(/image\.tmdb\.org/, fakeImg); await c.route(/fonts\.g/, r => r.fulfill({status: 200, body: ''}));
  const p = await c.newPage();
  p.on('pageerror', e => console.log(name, 'pageerror', e.message));
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
  await fn(p);
  await c.storageState({path: path.join(OUT, 'state-' + name + '.json')});
  return {c, p};
}
async function signup(p, u, n, lang) {
  await p.click('[data-amode="up"]');
  await p.fill('input[name=u]', u); await p.fill('input[name=n]', n); await p.fill('input[name=p]', 'demo pass ' + u);
  await p.click('form[data-auth] button[type=submit]');
  await p.waitForSelector('[data-knext]', {timeout: 20000}); await p.check('[data-kok]'); await p.click('[data-knext]');
  await p.waitForSelector('[data-omove]', {timeout: 20000});
}
(async () => {
  const b = await chromium.launch();
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const move = {v: 1, app: 'five-years-cinema', plan, e: {'cfg:lang': [process.env.LANG_UI || 'fa', Date.now()], 'cfg:name': ['Danial Talebi', Date.now()], 'cfg:since': ['2026-03-07', Date.now()]}};
  fs.writeFileSync(path.join(OUT, 'demo-move.json'), JSON.stringify(move));
  // talebi: his plan, then his Letterboxd history from Settings
  const T = await person(b, 'talebi', async p => {
    await signup(p, 'talebi', 'Danial Talebi', 'fa');
    await p.setInputFiles('[data-omove]', path.join(OUT, 'demo-move.json'));
    await p.waitForSelector('.fx-tabbar', {timeout: 30000});
    await p.click('[data-ac-menu]'); await p.click('.av-menu a[href="/settings"]'); await p.click('[data-sset="letterboxd"]'); await p.waitForSelector('[data-lbimport]', {state: 'attached'});
    const files = ['diary.csv', 'reviews.csv', 'watched.csv', 'ratings.csv'].map(f => path.join(LBX, f)).concat([path.join(LBX, 'likes', 'films.csv')]);
    await p.setInputFiles('[data-lbimport]', files);
    for (let i = 0; i < 240; i++) { await p.waitForTimeout(1000); const n = await p.evaluate(() => Object.keys(Store.data).filter(k => /^v:log:/.test(k)).length); if (n > 600 && i > 5) { const n2 = await p.evaluate(() => Object.keys(Store.data).filter(k => /^v:log:/.test(k)).length); if (n2 === n) break; } }
    await p.waitForTimeout(3000); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(4000);
    console.log('talebi diary', await p.evaluate(() => fxDiary(window.D, Store.data).length));
  });
  // two friends, a few films each, some of them his too
  const logs = {
    sara_k: [['Mulholland Drive', 2001, '2026-11-08', 10], ['Close-Up', 1990, '2026-11-06', 9], ['Heat', 1995, '2026-11-02', 8], ['Phantom Thread', 2017, '2026-10-28', 7], ['Lost in Translation', 2003, '2026-10-20', 6], ['Taste of Cherry', 1997, '2026-10-11', 10]],
    negin: [['Margaret', 2011, '2026-11-01', 6], ['Le Samouraï', 1967, '2026-11-09', 9], ['Mauvais Sang', 1986, '2026-11-10', 10], ['Beau Travail', 1999, '2026-10-30', 8], ['Heat', 1995, '2026-10-02', 10]],
  };
  for (const [u, list] of Object.entries(logs)) {
    const F = await person(b, u, async p => {
      await signup(p, u, u === 'sara_k' ? 'Sara' : 'Negin', u === 'sara_k' ? 'en' : 'fa');
      await p.evaluate(() => { Store.set('cfg:since', new Date().toISOString().slice(0, 10)); Store.set('cfg:plan', 'sample'); }); await p.waitForSelector('.fx-tabbar', {timeout: 20000});
      await p.evaluate(list => list.forEach(([t, y, d, r], i) => { const k = 'log:d' + i; Store.set(k, 't:' + t + ' (' + y + ')'); Store.set('v:' + k, d); Store.set('r:' + k, r); }), list);
      await p.waitForTimeout(2500);
      for (const who of ['talebi', u === 'sara_k' ? 'negin' : 'sara_k']) await p.evaluate(w => CloudSync.follow(w, true), who);
      await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(3000);
    });
    await F.c.close();
  }
  await T.p.evaluate(async () => { await CloudSync.follow('sara_k', true); await CloudSync.follow('negin', true); });
  await T.c.storageState({path: path.join(OUT, 'state-talebi.json')});
  await b.close();
  console.log('demo ready');
})().catch(e => { console.error(e); process.exit(1); });
