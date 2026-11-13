// Joining and keeping order: the owner decides who can join (anyone, with an invite, nobody new), sets or renews the
// invite code, how many invite links each member gets, and a contact for people without one; members make invite
// links (one person each, two weeks, taken back until used); the owner suspends, signs out or deletes an account and
// takes down comments; and writes the news on everyone's Home (Playwright, test/server.mjs on :8790, owner "boss").
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };
const here = p => p.url().replace(B, '');
const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async () => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
  };
  // sign up from wherever the page is (the sign-up form already showing, or the front page)
  const signup = async (p, u, from) => {
    if (from !== false) { await p.goto(B + (from || '/')); await p.waitForSelector('form[data-auth]'); }
    if (await p.$('[data-amode="up"][aria-pressed="false"]')) await p.click('[data-amode="up"]');
    await p.waitForSelector('input[name=n]');
    await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]');
  };
  const finish = async p => { await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('[data-ostart="list"]', {timeout: 15000}); await p.click('[data-ostart="list"]'); await p.waitForSelector('.fx-tabbar'); };
  const admin = async p => { await p.goto(B + '/admin'); await p.waitForSelector('.ad-join', {timeout: 10000}); };

  const boss = await ctx(); await signup(boss, 'boss'); await finish(boss);
  const jon = await ctx(); await signup(jon, 'jon'); await finish(jon);
  await jon.evaluate(d => { Store.set('log:j1', 't:Close-Up (1990)'); Store.set('v:log:j1', d); Store.set('cfg:share', 'jon'); }, day(1));
  await jon.waitForTimeout(1600); await jon.evaluate(() => CloudSync.run()); await jon.waitForTimeout(800);

  // ---- who can join ----
  await admin(boss);
  ok(await boss.$eval('[data-ad-mode="open"]', e => e.getAttribute('aria-pressed')) === 'true', 'a site with no invite code starts open to anyone');
  await boss.click('[data-ad-mode="invite"]'); await boss.waitForSelector('[data-ad-newcode]');
  await boss.click('[data-ad-newcode]'); await boss.waitForFunction(() => /^[a-z0-9]{4}-[a-z0-9]{4}$/.test((document.querySelector('.ad-code code') || {}).textContent || ''));
  const code1 = await boss.$eval('.ad-code code', e => e.textContent);
  ok(true, 'invite only, with a fresh code', code1);
  await boss.fill('[data-ad-contact]', 'https://t.me/danitalebi'); await boss.click('[data-ad-contactsave]'); await boss.waitForTimeout(600);
  ok(await boss.$eval('[data-ad-inv="3"]', e => e.getAttribute('aria-pressed')) === 'true', 'members have three invite links each, to start with');

  const v1 = await ctx(); await v1.goto(B + '/'); await v1.waitForSelector('form[data-auth]'); await v1.click('[data-amode="up"]'); await v1.waitForSelector('input[name=c]');
  const ask = await v1.$eval('.au-ask', e => e.innerText);
  ok(/No invite\? Ask someone on TVC15 for a link, or message the site’s owner on Telegram/.test(ask) && /^https:\/\/t\.me\/danitalebi\/?$/.test(await v1.$eval('.au-ask a', a => a.href)), 'sign-up asks for the code, and says where to get one', ask);
  await v1.screenshot({path: path.join(OUT, 'signup-ask.png'), fullPage: true});
  await signup(v1, 'nocode', false); await v1.waitForSelector('.fx-ferr');
  ok(/invite code or link doesn’t work/.test(await v1.$eval('.fx-ferr', e => e.textContent)), 'no code, no account');
  await v1.fill('input[name=p]', 'pass for withcode'); await v1.fill('input[name=u]', 'withcode'); await v1.fill('input[name=c]', code1); await v1.click('form[data-auth] button[type=submit]');
  await finish(v1); ok(true, 'the owner’s code works');

  // ---- a member's invite link ----
  await jon.goto(B + '/invite'); await jon.waitForSelector('[data-iv-make]');
  ok(/3 invites left/.test(await jon.$eval('.iv-make', e => e.innerText)), 'Jon: three invites left');
  await jon.click('[data-iv-make]'); await jon.waitForSelector('.iv-list li');
  const link = await jon.$eval('.iv-list code', e => e.textContent), jcode = link.split('/join/')[1];
  ok(/\/join\/[a-z0-9]{12}$/.test(link) && /Open until/.test(await jon.$eval('.iv-st', e => e.textContent)) && /2 invites left/.test(await jon.$eval('.iv-make', e => e.innerText)), 'a link, open for two weeks; two left', link);
  await jon.screenshot({path: path.join(OUT, 'invite.png'), fullPage: true});
  const kim = await ctx(); await kim.goto(B + '/join/' + jcode); await kim.waitForSelector('.au-inv');
  ok(/Jon invited you to TVC15/.test(await kim.$eval('.au-inv', e => e.innerText)) && !(await kim.$('input[name=c][type=text]')), 'the link: who it’s from, and no code to type');
  await kim.screenshot({path: path.join(OUT, 'join.png'), fullPage: true});
  await signup(kim, 'kim', false); await finish(kim);
  ok(here(kim) === '/' || here(kim) === '/week', 'Kim is in, at Home', here(kim));
  const v2 = await ctx(); await v2.goto(B + '/join/' + jcode); await v2.waitForSelector('.au-inv');
  ok(/doesn’t work any more/.test(await v2.$eval('.au-inv', e => e.innerText)), 'used once, it doesn’t work again');
  await jon.goto(B + '/invite'); await jon.waitForSelector('.iv-list li');
  ok(/Used by @kim/.test(await jon.$eval('.iv-list', e => e.innerText)), 'Jon sees who used it');
  await admin(boss);
  ok(/invited by @jon/.test(await boss.$$eval('.ad-list li', ls => (ls.find(l => /@kim/.test(l.innerText)) || {}).innerText || '')), 'the owner sees who invited whom');
  // members' invites off; a new code replaces the old one
  await boss.click('[data-ad-inv="0"]'); await boss.waitForTimeout(500);
  await jon.goto(B + '/invite'); await jon.waitForSelector('.fx-card');
  ok(/turned off for now/.test(await jon.$eval('.fx-app', e => e.innerText)) && !(await jon.$('[data-iv-make]')), 'invites turned off: none for Jon');
  await admin(boss); await boss.click('[data-ad-newcode]'); await boss.waitForFunction(c => document.querySelector('.ad-code code').textContent !== c, code1);
  const r1 = await v2.evaluate(async c => { const r = await fetch('/api/signup', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({username: 'oldcode', key: 'a'.repeat(64), code: c})}); return r.status; }, code1);
  ok(r1 === 403, 'the old code stops working at once', r1);
  // closed
  await boss.click('[data-ad-mode="closed"]'); await boss.waitForTimeout(500);
  const v3 = await ctx(); await v3.goto(B + '/'); await v3.waitForSelector('form[data-auth]'); await v3.click('[data-amode="up"]'); await v3.waitForSelector('.fx-card h2');
  ok(/Not taking new members right now/.test(await v3.$eval('.fx-card h2', e => e.textContent)) && !(await v3.$('input[name=n]')), 'closed: no sign-up form');
  await boss.click('[data-ad-mode="invite"]'); await boss.waitForTimeout(500);

  // ---- a comment taken down; an account suspended, restored, signed out, deleted ----
  const eid = await jon.evaluate(() => fxEntryId('log:j1'));
  await kim.evaluate(e => fetch('/api/react', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({owner: 'jon', eid: e, kind: 'c', text: 'Something rude.', ft: 'Close-Up (1990)'})}), eid);
  await admin(boss);
  ok(/Something rude/.test(await boss.$eval('.ad-cms', e => e.innerText)), 'the owner sees the latest comments');
  await boss.click('[data-ad-uncomment]'); await boss.waitForSelector('[data-ad-uncomment]:text("Take it down?")'); await boss.click('[data-ad-uncomment]'); await boss.waitForTimeout(700);
  const feedC = await jon.evaluate(async () => (await (await fetch('/api/inbox')).json()).re.filter(r => r[3] === 'c').length);
  ok(feedC === 0 && !(await boss.$('.ad-cms')), 'taken down (two taps): gone everywhere', feedC);
  await kim.evaluate(e => fetch('/api/react', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({owner: 'jon', eid: e, kind: 'c', text: 'Nice one.', ft: 'Close-Up (1990)'})}), eid);
  await admin(boss);
  await boss.click('[data-ad-manage="kim"]'); await boss.click('[data-ad-suspend="kim"][data-on="1"]'); await boss.waitForSelector('.ad-tag.ban');
  ok(await kim.evaluate(async () => (await fetch('/api/me')).status) === 401, 'suspended: signed out');
  ok(await kim.evaluate(async () => (await fetch('/api/login', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({username: 'kim', key: 'b'.repeat(64)})})).status) === 401, 'a wrong password is still just wrong');
  await kim.goto(B + '/'); await kim.waitForSelector('form[data-auth]'); await kim.fill('input[name=u]', 'kim'); await kim.fill('input[name=p]', 'pass for kim'); await kim.click('form[data-auth] button[type=submit]'); await kim.waitForSelector('.fx-ferr');
  ok(/This account has been suspended/.test(await kim.$eval('.fx-ferr', e => e.textContent)), 'and the right one says suspended');
  ok(await jon.evaluate(async () => (await (await fetch('/api/inbox')).json()).re.filter(r => r[3] === 'c').length) === 0, 'their comment hidden while suspended');
  await boss.screenshot({path: path.join(OUT, 'admin-manage.png'), fullPage: true});
  await boss.click('[data-ad-suspend="kim"][data-on="0"]'); await boss.waitForTimeout(600);
  await kim.fill('input[name=u]', 'kim'); await kim.fill('input[name=p]', 'pass for kim'); await kim.click('form[data-auth] button[type=submit]'); await kim.waitForSelector('.fx-tabbar', {timeout: 15000});
  ok(await jon.evaluate(async () => (await (await fetch('/api/inbox')).json()).re.filter(r => r[3] === 'c').length) === 1, 'restored: back in, the comment back too');
  ok(await boss.evaluate(async () => (await fetch('/api/admin/suspend', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({username: 'boss'})})).status) === 404, 'nobody can suspend the owner');
  ok(await jon.evaluate(async () => (await fetch('/api/admin/suspend', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({username: 'kim'})})).status) === 404, 'and only the owner can suspend anyone');
  await admin(boss); await boss.click('[data-ad-manage="jon"]'); await boss.click('[data-ad-signout="jon"]'); await boss.waitForTimeout(600);
  ok(await jon.evaluate(async () => (await fetch('/api/me')).status) === 401, 'signed out everywhere');
  await admin(boss); await boss.click('[data-ad-manage="kim"]'); await boss.click('[data-ad-del="kim"]'); await boss.waitForSelector('[data-ad-delconfirm]');
  await boss.fill('[data-ad-delconfirm]', 'kimm'); await boss.click('[data-ad-delyes="kim"]'); await boss.waitForTimeout(300);
  ok(/Type the username exactly/.test(await boss.$eval('.fx-app', e => e.innerText)), 'deleting needs the username typed exactly');
  await boss.fill('[data-ad-delconfirm]', 'kim'); await boss.click('[data-ad-delyes="kim"]'); await boss.waitForTimeout(800);
  ok(!(await boss.$$eval('.ad-list li', ls => ls.some(l => /@kim/.test(l.innerText)))), 'deleted');

  // ---- news ----
  await jon.goto(B + '/'); await jon.waitForSelector('form[data-auth]'); await jon.fill('input[name=u]', 'jon'); await jon.fill('input[name=p]', 'pass for jon'); await jon.click('form[data-auth] button[type=submit]'); await jon.waitForSelector('.fx-tabbar');
  await jon.goto(B + '/'); await jon.waitForSelector('.nw-card', {timeout: 10000});
  ok(/What’s new/.test(await jon.$eval('.nw-eye', e => e.innerText)) && await jon.$eval('.nw-t', e => e.textContent) === 'Bring your friends', 'Home: the first post, about inviting friends');
  await jon.screenshot({path: path.join(OUT, 'news-home.png'), fullPage: true});
  await jon.click('.nw-card a.fx-btn'); await jon.waitForSelector('.nw-post');
  ok(here(jon).startsWith('/news') && (await jon.$$('.nw-body li')).length === 5 && /Boss/.test(await jon.$eval('.nw-meta', e => e.textContent)), 'the post: a list of what’s new, signed by the owner', here(jon));
  await jon.screenshot({path: path.join(OUT, 'news.png'), fullPage: true});
  await jon.goto(B + '/'); await jon.waitForSelector('.fx-tabbar'); await jon.waitForTimeout(800);
  ok(!(await jon.$('.nw-card')), 'read once, it leaves Home');
  await admin(boss); await boss.click('[data-ad-nnew]'); await boss.fill('[data-ad-nt]', 'Popular is here'); await boss.fill('[data-ad-nb]', 'See what everyone is watching.\n\n- This week\n- All time'); await boss.click('[data-ad-npub]'); await boss.waitForTimeout(700);
  ok((await boss.$$('.ad-posts li')).length === 2, 'the owner writes another');
  const jon2 = await ctx(); await jon2.goto(B + '/'); await jon2.waitForSelector('form[data-auth]'); await jon2.fill('input[name=u]', 'jon'); await jon2.fill('input[name=p]', 'pass for jon'); await jon2.click('form[data-auth] button[type=submit]'); await jon2.waitForSelector('.nw-card', {timeout: 10000});
  ok(await jon2.$eval('.nw-t', e => e.textContent) === 'Popular is here', 'the newest one on Home');
  await jon2.click('[data-nw-done]'); await jon2.waitForTimeout(300);
  ok(!(await jon2.$('.nw-card')), '× puts it away');
  await admin(boss); await boss.click('.ad-posts li:first-child [data-ad-ndel]'); await boss.click('.ad-posts li:first-child [data-ad-ndel]'); await boss.waitForTimeout(700);
  ok((await boss.$$('.ad-posts li')).length === 1, 'and deletes one (two taps)');
  ok(await jon2.evaluate(async () => (await fetch('/api/admin/news', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({title: 'x', body: 'y'})})).status) === 404, 'only the owner writes news');

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
