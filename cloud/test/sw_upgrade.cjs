// A browser holding the broken worker (as Danial's does): does the fixed one take over by itself? And offline?
const {chromium} = require('playwright'); const fs = require('fs');
const S = process.env.SCR, PUB = __dirname + '/../public/sw.js';
(async () => {
  fs.copyFileSync(S + '/sw-old.js', PUB);
  const b = await chromium.launch(); const c = await b.newContext(); const p = await c.newPage();
  await p.goto('http://localhost:8790/'); await p.waitForTimeout(4000);   // the worker installs, takes over, and the app reloads once
  const tryGo = async () => { try { await p.goto('http://localhost:8790/'); await p.waitForTimeout(600); return 'opens: ' + await p.title(); } catch (e) { return e.message.split('\n')[0].replace(/ at .*/, ''); } };
  console.log('old worker, second visit:', await tryGo());
  fs.copyFileSync(S + '/sw-new.js', PUB);   // the fix is deployed
  const seen = [];
  for (let i = 0; i < 4; i++) { seen.push(await tryGo()); await p.waitForTimeout(1500); }
  console.log('after the fix is deployed, visits:', seen.join(' | '));
  await c.setOffline(true);
  console.log('offline:', await tryGo());
  await b.close();
})();
