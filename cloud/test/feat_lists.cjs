// Lists of films (made from a film's page or a profile, edited on their own page, public or private, a public one
// readable by anyone with its address, signed in or not); profiles inside the app; who follows whom
// (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); if (!c) fails++; };
const here = p => p.url().replace(B, '');

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async () => { const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}); await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''})); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p; };
  const signup = async (p, u) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
    await p.waitForSelector('[data-ostart="list"]', {timeout: 15000}); await p.evaluate(async () => { await CloudSync.savePlan(await (await fetch('/sample-plan.json')).json()); Store.set('cfg:since', new Date().toISOString().slice(0, 10)); Store.set('cfg:plan', 'own'); }); await p.waitForSelector('.fx-tabbar');
    await p.evaluate(() => Store.set('cfg:share', CloudSync.me().username)); await p.waitForTimeout(1500); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(600);
  };
  const ivy = await ctx(); await signup(ivy, 'ivy');
  const jon = await ctx(); await signup(jon, 'jon');
  await jon.evaluate(() => CloudSync.follow('ivy', true));

  // ---- a film's page: Add to a list, a new list made on the spot ----
  await ivy.goto(B + '/film/tmdb/30017'); await ivy.waitForSelector('[data-fp-addlist]', {timeout: 15000});
  await ivy.click('[data-fp-addlist]'); await ivy.waitForSelector('.ls-sheet form[data-lsnew]');
  ok(/You don’t have any lists yet/.test(await ivy.$eval('.ls-sheet', e => e.innerText)), 'the sheet: no lists yet');
  await ivy.fill('form[data-lsnew] input[name=name]', 'Slow cinema'); await ivy.click('form[data-lsnew] button'); await ivy.waitForSelector('[data-lstog][aria-pressed="true"]');
  ok(/Slow cinema/.test(await ivy.$eval('.ls-pick', e => e.innerText)), 'made, with the film in it');
  await ivy.fill('form[data-lsnew] input[name=name]', 'Secret favorites'); await ivy.uncheck('form[data-lsnew] input[name=pub]'); await ivy.click('form[data-lsnew] button');
  await ivy.waitForFunction(() => document.querySelectorAll('[data-lstog][aria-pressed="true"]').length === 2);
  ok(/private/.test(await ivy.$eval('.ls-pick', e => e.innerText)), 'and a private one');
  await ivy.goBack(); await ivy.waitForTimeout(400);
  ok(!(await ivy.$('.ls-sheet')) && /\/film\/tmdb\/30017$/.test(here(ivy)), 'Back closes the sheet, still on the film', here(ivy));
  await ivy.goto(B + '/film/tmdb/949'); await ivy.waitForSelector('[data-fp-addlist]', {timeout: 15000});
  await ivy.click('[data-fp-addlist]'); await ivy.waitForSelector('[data-lstog]');
  const slow = await ivy.$$eval('[data-lstog]', bs => bs.find(e => /Slow cinema/.test(e.textContent)).dataset.lstog);
  await ivy.click(`[data-lstog="${slow}"]`); await ivy.waitForSelector(`[data-lstog="${slow}"][aria-pressed="true"]`);
  ok(true, 'a second film added to a list from its page');
  await ivy.click('.ls-sheet [data-lsx].fx-btn'); await ivy.waitForTimeout(300);

  // ---- her profile, inside the app: Lists ----
  await ivy.goto(B + '/u/ivy'); await ivy.waitForSelector('.fx-tabs', {timeout: 15000});
  ok(await ivy.$('.fx-tabbar') !== null && await ivy.$('.av-top') !== null, 'a profile is a screen of the app (tab bar, corner)');
  await ivy.click('[data-tab="lists"]'); await ivy.waitForSelector('.ls-cards li');
  const cards = await ivy.$$eval('.ls-card', as => as.map(a => a.innerText.replace(/\s+/g, ' ')));
  ok(cards.length === 2 && cards.some(c => /Secret favorites 1 film, private/.test(c)) && cards.some(c => /Slow cinema 2 films/.test(c)), 'her lists, the private one marked', cards);
  await ivy.click('.ls-card[href="/u/ivy/list/slow-cinema"]'); await ivy.waitForSelector('.ls-h1');
  ok(here(ivy) === '/u/ivy/list/slow-cinema' && await ivy.$('.fx-tabbar') !== null, 'the list’s page, in the app', here(ivy));
  ok((await ivy.$$('.ls-grid li')).length === 2, 'its two films');

  // ---- editing it: describe it, rank it, add by searching, reorder, take one off ----
  await ivy.click('[data-ls-edit]'); await ivy.waitForSelector('[data-ls-f="name"]');
  await ivy.fill('[data-ls-f="note"]', 'Films that take their time.\nWatch them late.');
  await ivy.check('[data-ls-f="ranked"]');
  await ivy.fill('[data-ls-q]', 'Sátántangó'); await ivy.waitForSelector('[data-ls-pick]', {timeout: 8000});
  await ivy.click('[data-ls-pick="0"]'); await ivy.waitForTimeout(200);
  ok((await ivy.$$('.ls-rows li')).length === 3, 'a film added by searching');
  await ivy.click('[data-ls-mv="2:-1"]'); await ivy.click('[data-ls-mv="1:-1"]'); await ivy.waitForTimeout(150);
  ok(/Sátántangó/.test(await ivy.$eval('.ls-rows li', e => e.innerText)), 'moved to the top');
  await ivy.click('[data-ls-rm="2"]'); await ivy.waitForTimeout(150);
  await ivy.click('[data-ls-save]'); await ivy.waitForSelector('.ls-grid', {timeout: 8000});
  const shown = await ivy.$eval('.fx-app', e => e.innerText.replace(/\s+/g, ' '));
  ok(/Films that take their time/.test(shown) && /2 films, ranked/.test(shown), 'saved: the description, ranked', shown.slice(0, 200));
  ok((await ivy.$$('.ls-rank')).length === 2 && await ivy.$eval('.ls-grid .fx-pg', a => a.getAttribute('aria-label')) === 'Sátántangó (2001)', 'numbered, in her order');
  await ivy.screenshot({path: path.join(OUT, 'list-page.png'), fullPage: true});

  // ---- Jon: her public list, not the private one; who follows whom ----
  await jon.goto(B + '/u/ivy'); await jon.waitForSelector('.fx-pmeta', {timeout: 15000});
  ok(await jon.$('a.pf-cnt[href="/u/ivy/followers"]') !== null, 'the follower count is a link');
  await jon.click('a.pf-cnt[href="/u/ivy/followers"]'); await jon.waitForSelector('.pf-people li', {timeout: 8000});
  ok(here(jon) === '/u/ivy/followers' && /@jon/.test(await jon.$eval('.pf-people', e => e.innerText)), 'Ivy’s followers: Jon', here(jon));
  await jon.click('a.fx-btn[href="/u/ivy/following"]'); await jon.waitForTimeout(600);
  ok(here(jon) === '/u/ivy/following' && /Not following anyone yet/.test(await jon.$eval('.fx-app', e => e.innerText)), 'whom she follows: nobody yet');
  await jon.goto(B + '/u/jon/following'); await jon.waitForSelector('.pf-people li');
  await jon.click('[data-pvfollow="ivy"]'); await jon.waitForTimeout(600);
  ok(await jon.evaluate(async () => (await (await fetch('/api/u/ivy/meta')).json()).follows) === false, 'unfollowed from the list');
  await jon.click('[data-pvfollow="ivy"]'); await jon.waitForTimeout(600);
  await jon.goto(B + '/u/ivy'); await jon.waitForSelector('.fx-tabs'); await jon.click('[data-tab="lists"]'); await jon.waitForSelector('.ls-cards li');
  ok((await jon.$$eval('.ls-card', as => as.map(a => a.innerText))).length === 1, 'Jon sees one list: the public one');
  ok(await jon.evaluate(async () => (await fetch('/api/u/ivy/list/secret-favorites')).status) === 404, 'the private one isn’t there for him');
  ok(await jon.evaluate(async () => (await fetch('/api/lists/1', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({name: 'Mine now'})})).status) === 404, 'nor can he change hers');

  // ---- a visitor, no account, with the link ----
  const vis = await ctx(); await vis.goto(B + '/u/ivy/list/slow-cinema'); await vis.waitForSelector('.ls-h1', {timeout: 15000});
  const vt = await vis.$eval('#root', e => e.innerText.replace(/\s+/g, ' '));
  ok(/Slow cinema/.test(vt) && /A list by Ivy/.test(vt) && (await vis.$$('.ls-grid li')).length === 2, 'anyone with the link can read it', vt.slice(0, 160));
  ok(/Create an account/.test(vt) && !(await vis.$('[data-ls-edit]')), 'with an invitation, and nothing to edit');
  await vis.screenshot({path: path.join(OUT, 'list-visitor.png'), fullPage: true});
  await vis.goto(B + '/u/ivy/list/secret-favorites'); await vis.waitForSelector('.fx-h1', {timeout: 15000});
  ok(/List not found/.test(await vis.$eval('.fx-h1', e => e.textContent)), 'a private list: not found');

  // ---- made private, the link stops working; deleted ----
  await ivy.click('[data-ls-edit]'); await ivy.waitForSelector('[data-ls-f="pub"]'); await ivy.uncheck('[data-ls-f="pub"]'); await ivy.click('[data-ls-save]'); await ivy.waitForSelector('.ls-priv', {timeout: 8000});
  ok(await vis.evaluate(async () => (await fetch('/api/u/ivy/list/slow-cinema')).status) === 404, 'private now: the link stops working');
  await ivy.click('[data-ls-edit]'); await ivy.waitForSelector('[data-ls-del]'); await ivy.click('[data-ls-del]'); await ivy.click('[data-ls-delyes]');
  await ivy.waitForURL(/\/u\/ivy$/, {timeout: 8000});
  ok(await ivy.evaluate(async () => (await (await fetch('/api/lists')).json()).lists.length) === 1, 'deleted');

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
