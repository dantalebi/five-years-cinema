// Email for password resets: an optional address at sign-up or in Settings, confirmed by a link; Forgot your password?
// by username or email sends a one-time link; the recovery key still works; the owner sees email trouble under Site health.
// (Playwright, test/server.mjs on :8790, whose stand-in for Resend keeps what it sends at /__mail.)
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };
const mail = async q => (await fetch(B + '/__mail' + (q || ''))).json();
const linkIn = (m, kind) => (m.text.match(new RegExp('https?://[^\\s]+/' + kind + '/[A-Za-z0-9_-]+')) || [])[0] || '';

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async () => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const signup = async (p, u, email) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]'); await p.click('[data-amode="up"]'); await p.waitForSelector('input[name=n]');
    await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    if (email !== undefined) await p.fill('input[name=e]', email);
    await p.click('form[data-auth] button[type=submit]');
  };
  const finish = async p => { await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('[data-ostart="list"]', {timeout: 15000}); await p.click('[data-ostart="list"]'); await p.waitForSelector('.fx-tabbar'); };

  const boss = await ctx(); await signup(boss, 'boss'); await finish(boss);

  // sign-up: the email is optional, said what it's for; a bad one is pointed out under it, nothing else lost
  const ema = await ctx(); await ema.goto(B + '/'); await ema.waitForSelector('form[data-auth]'); await ema.click('[data-amode="up"]'); await ema.waitForSelector('input[name=e]');
  ok(/Only to reset your password/.test(await ema.$eval('input[name=e]', e => e.closest('label').innerText)), 'sign-up: an optional email, and what it’s for');
  await signup(ema, 'ema', 'ema@example'); await ema.waitForSelector('.fx-ferr');
  const st = await ema.evaluate(() => ({under: document.querySelector('.fx-ferr').closest('label').querySelector('input').name, u: document.querySelector('input[name=u]').value, p: document.querySelector('input[name=p]').value}));
  ok(st.under === 'e' && st.u === 'ema' && st.p === 'pass for ema', 'a bad email: said under it, the rest kept', st);
  await ema.fill('input[name=e]', 'Ema@Example.com'); await ema.click('form[data-auth] button[type=submit]');
  await ema.waitForSelector('[data-knext]', {timeout: 15000});
  ok(/sent a link to ema@example\.com/.test(await ema.$eval('.au-sent', e => e.innerText)), 'the recovery key screen says a confirmation link went out');
  let box = await mail();
  ok(box.length === 1 && box[0].to === 'ema@example.com' && /Confirm your email/.test(box[0].subject) && linkIn(box[0], 'verify-email'), 'the confirmation email', box.map(m => m.to + ': ' + m.subject));
  await ema.check('[data-kok]'); await ema.click('[data-knext]'); await ema.waitForSelector('[data-ostart="list"]', {timeout: 15000}); await ema.click('[data-ostart="list"]'); await ema.waitForSelector('.fx-tabbar');

  // not confirmed yet: Forgot your password sends nothing, and says the same as always
  const anon = await ctx(); await anon.goto(B + '/forgot'); await anon.waitForSelector('form[data-forgot]');
  await anon.fill('input[name=w]', 'ema'); await anon.click('form[data-forgot] button[type=submit]'); await anon.waitForSelector('[data-fsent]');
  ok((await mail()).length === 1, 'an unconfirmed email gets no reset link');
  await anon.click('[data-fagain]'); await anon.waitForSelector('form[data-forgot]');
  ok(await anon.$eval('input[name=w]', e => e.value) === 'ema', 'try again: what was typed is still there');

  // the confirmation link, opened anywhere
  const vlink = linkIn(box[0], 'verify-email').replace(/^https?:\/\/[^/]+/, B);
  await anon.goto(vlink); await anon.waitForSelector('text=You’re all set');
  ok(/ema@example\.com is now the email for @ema/.test(await anon.$eval('.fx-lede', e => e.innerText)), 'the link confirms the email');
  ok(new URL(anon.url()).pathname === '/', 'and the token leaves the address bar');
  ok(await ema.evaluate(async () => (await (await fetch('/api/me')).json()).me.email) === 'ema@example.com', 'the account has it now');
  await anon.goto(vlink); await anon.waitForSelector('text=This link doesn’t work');
  ok(true, 'a used confirmation link doesn’t work twice');

  // forgot, by email (any case): a reset link; by a name nobody has: the same answer, no email
  await anon.goto(B + '/'); await anon.waitForSelector('form[data-auth]'); await anon.click('[data-amode="rec"]'); await anon.waitForSelector('form[data-forgot]');
  ok(!(await anon.$eval('details.au-rk', d => d.open)), 'the recovery key is there too, folded away');
  await anon.fill('input[name=w]', 'EMA@example.com'); await anon.click('form[data-forgot] button[type=submit]'); await anon.waitForSelector('[data-fsent]');
  box = await mail();
  ok(box.length === 2 && box[1].to === 'ema@example.com' && /Reset your TVC15 password/.test(box[1].subject) && /@ema/.test(box[1].text), 'a reset link, to the confirmed address', box[1] && box[1].subject);
  await anon.goto(B + '/forgot'); await anon.waitForSelector('form[data-forgot]'); await anon.fill('input[name=w]', 'nobody_here'); await anon.click('form[data-forgot] button[type=submit]'); await anon.waitForSelector('[data-fsent]');
  ok((await mail()).length === 2, 'no such account: the same “check your email”, and nothing sent');
  await anon.screenshot({path: path.join(OUT, 'forgot-sent.png'), fullPage: true});

  // the reset link: a new password, with mistakes pointed out where they are
  const rlink = linkIn(box[1], 'reset').replace(/^https?:\/\/[^/]+/, B);
  const r2 = await ctx(); await r2.goto(rlink); await r2.waitForSelector('form[data-reset]');
  ok(/For @ema/.test(await r2.$eval('.fx-lede', e => e.innerText)), 'the reset page says whose account');
  await r2.fill('input[name=p]', 'a new password'); await r2.fill('input[name=p2]', 'a new pasword'); await r2.click('form[data-reset] button[type=submit]'); await r2.waitForSelector('.fx-ferr');
  ok(await r2.$eval('.fx-ferr', e => e.closest('label').querySelector('input').name) === 'p2', 'passwords that don’t match: said under the second');
  await r2.screenshot({path: path.join(OUT, 'reset.png'), fullPage: true});
  await r2.fill('input[name=p]', 'a new password'); await r2.fill('input[name=p2]', 'a new password'); await r2.click('form[data-reset] button[type=submit]');
  await r2.waitForSelector('.fx-tabbar, [data-ostart]', {timeout: 20000});
  ok(new URL(r2.url()).pathname === '/' && await r2.evaluate(() => CloudSync.me().username) === 'ema', 'the new password is set, and you’re in');
  ok(await ema.evaluate(async () => (await fetch('/api/me')).status) === 401, 'everywhere else is signed out');
  await r2.goto(rlink); await r2.waitForSelector('text=This link doesn’t work');
  ok(await r2.$('[data-amode="rec"]') !== null, 'a used reset link doesn’t work twice, and offers a new one');
  const lg = await ctx(); await lg.goto(B + '/'); await lg.waitForSelector('form[data-auth]'); await lg.fill('input[name=u]', 'ema'); await lg.fill('input[name=p]', 'a new password'); await lg.click('form[data-auth] button[type=submit]'); await lg.waitForSelector('.fx-tabbar', {timeout: 20000});
  ok(true, 'signing in with the new password works');

  // Settings: adding an email; a wrong password and a taken address, each said where it is
  const bob = await ctx(); await signup(bob, 'bob'); await finish(bob);
  await bob.goto(B + '/settings/account'); await bob.waitForSelector('[data-ac-emset]', {timeout: 15000});
  await bob.click('[data-ac-emset]'); await bob.waitForSelector('form[data-ac-em]');
  await bob.fill('form[data-ac-em] input[name=em]', 'bob@example.com'); await bob.fill('form[data-ac-em] input[name=pw]', 'wrong password'); await bob.click('form[data-ac-em] button[type=submit]');
  await bob.waitForSelector('form[data-ac-em] .fx-ferr');
  const bw = await bob.evaluate(() => ({under: document.querySelector('form[data-ac-em] .fx-ferr').closest('label').querySelector('input').name, em: document.querySelector('form[data-ac-em] input[name=em]').value}));
  ok(bw.under === 'pw' && bw.em === 'bob@example.com', 'a wrong password: said under it, the email kept', bw);
  await bob.fill('form[data-ac-em] input[name=em]', 'ema@example.com'); await bob.fill('form[data-ac-em] input[name=pw]', 'pass for bob'); await bob.click('form[data-ac-em] button[type=submit]');
  await bob.waitForSelector('form[data-ac-em] .fx-ferr');
  ok(/already uses that email/.test(await bob.$eval('form[data-ac-em] .fx-ferr', e => e.textContent)), 'someone else’s email: said under it');
  await bob.fill('form[data-ac-em] input[name=em]', 'bob@example.com'); await bob.fill('form[data-ac-em] input[name=pw]', 'pass for bob'); await bob.click('form[data-ac-em] button[type=submit]');
  await bob.waitForFunction(() => /sent a link to bob@/.test((document.querySelector('#ac-email') || {}).innerText || ''), null, {timeout: 15000});
  ok(/sent a link to bob@example\.com/.test(await bob.$eval('#ac-email', e => e.innerText)) && (await mail()).slice(-1)[0].to === 'bob@example.com', 'a link to confirm it, said in Settings');
  await bob.screenshot({path: path.join(OUT, 'settings-email.png'), fullPage: true});

  // without email set up anywhere, the recovery key: wrong one said under the key, what was typed kept
  await anon.goto(B + '/forgot'); await anon.waitForSelector('details.au-rk'); await anon.click('details.au-rk summary');
  await anon.fill('form[data-recover] input[name=u]', 'ema'); await anon.fill('form[data-recover] input[name=k]', 'AAAAA-BBBBB-CCCCC-DDDDD'); await anon.fill('form[data-recover] input[name=p]', 'another one'); await anon.fill('form[data-recover] input[name=p2]', 'another one');
  await anon.click('form[data-recover] button[type=submit]'); await anon.waitForSelector('form[data-recover] .fx-ferr', {timeout: 15000});
  const rk = await anon.evaluate(() => ({under: document.querySelector('form[data-recover] .fx-ferr').closest('label').querySelector('input').name, u: document.querySelector('form[data-recover] input[name=u]').value, open: document.querySelector('details.au-rk').open}));
  ok(rk.under === 'k' && rk.u === 'ema' && rk.open, 'a wrong recovery key: said under it, the username kept', rk);

  // emails that don't go out: the person is told the same, the owner sees it on Your site
  await mail('?fail=1');
  await anon.goto(B + '/forgot'); await anon.waitForSelector('form[data-forgot]'); await anon.fill('input[name=w]', 'ema'); await anon.click('form[data-forgot] button[type=submit]'); await anon.waitForSelector('[data-fsent]');
  await mail('?fail=0');
  await boss.goto(B + '/admin'); await boss.waitForSelector('.ad-health .ad-lines', {timeout: 15000});
  const hh = await boss.$eval('.ad-health', e => e.innerText);
  ok(/Emails aren’t going out/.test(hh) && /POST \/api\/forgot/.test(hh) && /not verified/.test(hh), 'Your site: the failed email, with what Resend said', hh.slice(0, 300));
  ok(/requests today, of 100,000/.test(hh) && /Password-reset email is set up/.test(hh) && /Busy hours/.test(hh), 'requests against the free limit, email on, busy hours');
  ok(/What takes the time/.test(hh) && /(GET|POST|PUT) \/api\//.test(await boss.$eval('.ad-heavy', e => e.innerText)), 'and what takes the time, by kind of request', (await boss.$eval('.ad-heavy', e => e.innerText).catch(() => '')).slice(0, 200));
  await boss.click('[data-ad-mailtest]'); await boss.waitForSelector('.ad-health .fx-note.bad');
  ok(/Add and confirm your own email/.test(await boss.$eval('.ad-health .fx-note.bad', e => e.textContent)), 'the test email needs the owner’s own email first');
  await boss.screenshot({path: path.join(OUT, 'admin-health.png'), fullPage: true});

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
