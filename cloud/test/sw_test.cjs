// The offline worker on a Pages-like server: second visit (served by the worker) must still open, at / and at /u/<name>.
const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext(); const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8790/'); await p.waitForSelector('form[data-auth]', {timeout: 15000});
  await p.waitForFunction(() => navigator.serviceWorker.controller, null, {timeout: 15000}).catch(() => {});
  const out = [];
  for (const u of ['/', '/u/nobody_here', '/']) {
    try { const r = await p.goto('http://localhost:8790' + u); await p.waitForTimeout(800); out.push(u + ' → ' + (r ? r.status() : 'sw') + ' ' + (await p.title())); }
    catch (e) { out.push(u + ' → ' + e.message.split('\n')[0]); }
  }
  console.log(out.join('\n')); console.log('controlled:', await p.evaluate(() => !!navigator.serviceWorker.controller), 'errors', errs);
  await b.close();
})();
