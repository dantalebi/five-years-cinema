// Your account: the recovery key at sign-up, signing out (and what happens to unsaved changes), the devices you're
// signed in on, resetting a forgotten password, blocking and removing followers, the About page
// (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); if (!c) fails++; };
const here = p => p.url().replace(B, '');

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async () => { const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}); await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''})); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return [c, p]; };
  const signup = async (p, u, keep) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('.ac-keybig', {timeout: 15000});
    const key = await p.$eval('.ac-keybig', e => e.textContent);
    await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('[data-ostart="list"]', {timeout: 15000});
    if (keep !== false) { await p.evaluate(() => { Store.set('cfg:since', new Date().toISOString().slice(0, 10)); Store.set('cfg:plan', 'sample'); }); await p.waitForSelector('.fx-tabbar'); }
    return key;
  };
  const signin = async (p, u, pw) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.fill('input[name=u]', u); await p.fill('input[name=p]', pw); await p.click('form[data-auth] button[type=submit]');
  };

  // ---- a new account shows its recovery key once ----
  const [c1, p] = await ctx();
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
  ok(await p.$('a[href="/about"]') !== null, 'the sign-in screen links to About and privacy');
  const key = await signup(p, 'pia');
  ok(/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/.test(key), 'a recovery key, shown after signing up', key);

  // ---- Settings: who you are and Sign out, right at the top ----
  await p.click('[data-ac-menu]'); await p.click('.av-menu a[href="/settings"]'); await p.waitForSelector('.ac-me');
  ok(await p.$('.fx-app .fx-head + .ac-me') !== null, 'the account is the first thing in Settings');
  ok(/@pia/.test(await p.$eval('.ac-me', e => e.innerText)) && await p.$('[data-ac-out]') !== null, 'signed in as @pia, with Sign out');
  await p.click('[data-sset="account"]'); await p.waitForSelector('#ac-security');
  ok(here(p) === '/settings/account', 'Account has its own page', here(p));
  await p.waitForSelector('.ac-list li', {timeout: 8000});
  const devices = await p.$$eval('#ac-security .ac-list li', ls => ls.map(l => l.innerText.replace(/\s+/g, ' ')));
  ok(devices.length === 1 && /Chrome/.test(devices[0]) && /This device/.test(devices[0]), 'where you’re signed in: this device', devices);
  await p.screenshot({path: path.join(OUT, 'acct-settings.png'), fullPage: true});

  // ---- a second device; the first signs it out ----
  await p.evaluate(() => CloudSync.run());
  const [c2, q] = await ctx();
  await signin(q, 'pia', 'pass for pia'); await q.waitForSelector('.fx-tabbar', {timeout: 15000});
  await p.reload(); await p.waitForSelector('#ac-security .ac-list li');
  await p.waitForFunction(() => document.querySelectorAll('#ac-security .ac-list li').length === 2, null, {timeout: 8000});
  ok(true, 'two devices listed');
  await p.click('[data-ac-end]'); await p.waitForTimeout(500);
  ok((await p.$$('#ac-security .ac-list li')).length === 1, 'signed the other one out');
  const st2 = await q.evaluate(async () => (await fetch('/api/me')).status);
  ok(st2 === 401, 'and that device really is signed out', st2);

  // ---- passwords: mismatches are caught; a new recovery key needs the password ----
  await p.click('#ac-security summary');
  await p.fill('form[data-ac-pw] [name=cur]', 'pass for pia'); await p.fill('form[data-ac-pw] [name=next]', 'a new password'); await p.fill('form[data-ac-pw] [name=again]', 'another one');
  await p.click('form[data-ac-pw] button[type=submit]'); await p.waitForTimeout(300);
  ok(/don’t match/.test(await p.$eval('#ac-security', e => e.innerText)), 'the two new passwords must match');
  await p.click('[data-ac-rkask]'); await p.fill('form[data-ac-rk] input', 'wrong password'); await p.click('form[data-ac-rk] button'); await p.waitForTimeout(2500);
  ok(!(await p.$('.ac-key code')), 'no new key with the wrong password');
  await p.fill('form[data-ac-rk] input', 'pass for pia'); await p.click('form[data-ac-rk] button'); await p.waitForSelector('.ac-key code', {timeout: 8000});
  const key2 = await p.$eval('.ac-key code', e => e.textContent);
  ok(key2 !== key && /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/.test(key2), 'a new recovery key replaces the old one');
  await p.click('[data-ac-rkdone]');

  // ---- signing out with changes this device hasn't saved yet ----
  await c1.setOffline(true);
  await p.evaluate(() => Store.set('log:off', 't:Offline Film (2001)'));
  await p.click('[data-sset-back]'); await p.waitForSelector('[data-ac-out]'); await p.click('[data-ac-out]'); await p.waitForSelector('.ac-warn', {timeout: 8000});
  ok(/haven’t been saved/.test(await p.$eval('.ac-warn', e => e.innerText)), 'unsaved changes: it warns before signing out');
  await c1.setOffline(false);
  await p.click('[data-ac-retry]'); await p.waitForSelector('form[data-auth]', {timeout: 10000});
  ok(here(p) === '/' && await p.evaluate(() => !localStorage.getItem('fd-me')), 'back online: saved, then signed out, nothing left on the device');

  // ---- forgot the password: the old key no longer works, the new one does ----
  await p.click('[data-amode="rec"]'); await p.waitForSelector('form[data-recover]');
  await p.fill('[name=u]', 'pia'); await p.fill('[name=k]', key); await p.fill('[name=p]', 'brand new pass'); await p.fill('[name=p2]', 'brand new pass');
  await p.click('form[data-recover] button[type=submit]'); await p.waitForSelector('.fx-note.bad', {timeout: 10000});
  ok(/don’t match/.test(await p.$eval('.fx-note.bad', e => e.textContent)), 'the replaced key is refused');
  await p.fill('[name=u]', 'pia'); await p.fill('[name=k]', key2.toLowerCase()); await p.fill('[name=p]', 'brand new pass'); await p.fill('[name=p2]', 'brand new pass');
  await p.click('form[data-recover] button[type=submit]'); await p.waitForSelector('.ac-keybig', {timeout: 15000});
  const key3 = await p.$eval('.ac-keybig', e => e.textContent);
  ok(key3 !== key2, 'reset: signed in, with a fresh recovery key');
  await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('.fx-tabbar', {timeout: 15000});
  ok(await p.evaluate(() => Object.keys(Store.data).includes('log:off')), 'the diary is all there');
  const oldPw = await q.evaluate(async () => { const r = await CloudSync.login('pia', 'pass for pia'); return r; });
  ok(!!oldPw, 'the old password no longer works');

  // ---- blocking and removing followers ----
  const [c3, z] = await ctx(); await signup(z, 'quin');
  const [c4, r] = await ctx(); await signup(r, 'rex');
  for (const x of [z, r]) { await x.evaluate(() => CloudSync.follow('pia', true)); }
  await p.evaluate(() => Store.set('cfg:share', 'pia')); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(800);
  for (const x of [z, r]) { await x.evaluate(() => CloudSync.run()); }
  await p.goto(B + '/u/rex'); await p.waitForSelector('.fx-pmeta', {timeout: 10000});
  ok(/Follows you/.test(await p.$eval('.fx-pmeta', e => e.innerText)), 'a profile says when they follow you');
  await p.click('[data-pmore]'); await p.click('[data-prmfollower]'); await p.waitForTimeout(600);
  const rexFollows = await r.evaluate(async () => (await (await fetch('/api/u/pia/meta')).json()).follows);
  ok(rexFollows === false, 'removed as a follower');
  await p.goto(B + '/u/quin'); await p.waitForSelector('.fx-pmeta');
  await p.click('[data-pmore]'); await p.click('[data-pblock]'); await p.click('[data-pblockyes]'); await p.waitForURL(/\/settings\/privacy$/, {timeout: 10000});
  await p.waitForSelector('[data-ac-unblock="quin"]', {timeout: 8000});
  ok(true, 'blocked: listed in Settings');
  const zr = await z.evaluate(async () => ({follow: (await CloudSync.follow('pia', true)).status, profile: (await fetch('/api/u/pia')).status, react: (await CloudSync.react({owner: 'pia', eid: 'x1', kind: 'h', on: true})).status,
    people: ((await (await fetch('/api/people')).json()).people || []).some(x => x.username === 'pia')}));
  ok(zr.follow === 404 && zr.profile === 404 && zr.react === 404 && !zr.people, 'a blocked person can’t follow, see the profile, react or find you', zr);
  await p.click('[data-ac-unblock="quin"]'); await p.waitForTimeout(500);
  ok(await z.evaluate(async () => (await fetch('/api/u/pia')).status) === 200, 'unblocked: they can see you again');

  // ---- About ----
  await p.click('[data-sset-back]'); await p.waitForSelector('.st-nav'); await p.click('.st-nav a[href="/about"]'); await p.waitForSelector('.ac-doc');
  ok(here(p) === '/about' && /What .* keeps/i.test(await p.$eval('.fx-app', e => e.innerText)), 'About and privacy, inside the app', here(p));
  await p.screenshot({path: path.join(OUT, 'acct-about.png'), fullPage: false});
  await p.goBack(); await p.waitForTimeout(300);
  ok(here(p) === '/settings', 'Back: Settings', here(p));
  const [c5, v] = await ctx(); await v.goto(B + '/about'); await v.waitForSelector('.ac-doc');
  ok(true, 'and for visitors who aren’t signed in');

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
