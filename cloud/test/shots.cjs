// Screenshots of the demo site as one person: node test/shots.cjs <out> <who> <phone|desk> <name:what> ...
// what: a path (/, /u/sara_k), or path + '>' + clicks separated by '>' (CSS selectors), e.g. "friends:/>[data-nav=friends]"
const {chromium} = require('playwright');
const path = require('path');
const [OUT, WHO, SIZE, ...SHOTS] = process.argv.slice(2);
const fakeImg = r => {
  const p = new URL(r.request().url()).pathname, h = [...p].reduce((a, c) => (a * 33 + c.charCodeAt(0)) % 360, 5);
  r.fulfill({status: 200, contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="hsl(${h},35%,38%)"/><rect x="18" y="200" width="120" height="10" fill="hsl(${h},30%,70%)"/><rect x="18" y="218" width="80" height="8" fill="hsl(${h},30%,62%)"/></svg>`});
};
(async () => {
  const b = await chromium.launch();
  const vp = SIZE === 'desk' ? {width: 1280, height: 860} : {width: 390, height: 844};
  const c = await b.newContext({viewport: vp, serviceWorkers: 'block', storageState: WHO === 'none' ? undefined : path.join(OUT, 'state-' + WHO + '.json'), colorScheme: process.env.SCHEME || 'dark'});
  await c.route(/image\.tmdb\.org/, fakeImg); // no font downloads here: Inter (installed) stands in for Archivo
  await c.route(/fonts\.g/, r => r.fulfill({status: 200, contentType: 'text/css', body: "@font-face{font-family:Archivo;src:local('Inter');font-weight:100 900;font-stretch:62% 125%}@font-face{font-family:Archivo;src:local('Inter Black');font-weight:850 900}@font-face{font-family:Archivo;src:local('Inter ExtraBold');font-weight:750 849}"}));
  const p = await c.newPage();
  p.on('pageerror', e => console.log('pageerror', e.message));
  for (const s of SHOTS) {
    const [name, ...rest] = s.split(':'), steps = rest.join(':').split('>');
    await p.goto('http://localhost:8790' + steps[0]); await p.waitForTimeout(1500);
    for (const sel of steps.slice(1)) { if (/^\d+$/.test(sel)) { await p.waitForTimeout(+sel); continue; } if (sel.startsWith('js=')) { await p.evaluate(sel.slice(3)); await p.waitForTimeout(400); continue; } await p.click(sel); await p.waitForTimeout(700); }
    await p.screenshot({path: path.join(OUT, name + '.png'), fullPage: process.env.FULL === '1'});
    console.log('shot', name);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
