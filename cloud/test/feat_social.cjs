// Friends as the home page, reactions, comments, the inbox and the watchlist (Playwright against test/server.mjs on :8790).
const {chromium} = require('playwright');
const B = 'http://localhost:8790';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const person = async (u, films) => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}), p = await c.newPage();
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    p.on('pageerror', e => errs.push(u + ' ' + e.message));
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u.toUpperCase()); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-ostart="sample"]', {timeout: 15000});
    await p.click('[data-ostart="sample"]'); await p.waitForSelector('.fx-tabbar');
    await p.evaluate(films => films.forEach(([t, y, d, r], i) => { Store.set('log:f' + i, 't:' + t + ' (' + y + ')'); Store.set('v:log:f' + i, d); Store.set('r:log:f' + i, r); Store.set('md:log:f' + i, JSON.stringify({tm: 5000 + i * 7 + t.length, t, y})); if (i === 0) Store.set('rv:log:f' + i, 'A review that friends should see in the feed.'); }), films);
    await p.waitForTimeout(2200); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(800);
    return p;
  };
  const a = await person('ana', [['Close-Up', 1990, '2026-11-08', 10], ['Heat', 1995, '2026-11-02', 8]]);
  const z = await person('zed', [['Heat', 1995, '2026-11-01', 6]]);
  // the site opens on Friends
  await z.reload(); await z.waitForSelector('.fx-tabbar');
  ok(await z.$eval('.fx-tabbar button[aria-current="page"]', e => e.dataset.nav) === 'friends', 'home page is Activity');
  ok(await z.$eval('.fx-tabbar button', e => e.dataset.nav) === 'friends', 'Activity comes first in the bar');
  await z.click('[data-seg="p"]'); await z.click('[data-fr-follow="ana"]'); await z.waitForTimeout(800); await z.click('[data-seg="f"]'); await z.waitForSelector('.fx-actv', {timeout: 8000});
  ok(/Close-Up/.test(await z.$eval('.fx-afeed', e => e.innerText)), 'her films in the feed');
  ok(/review that friends/.test(await z.$eval('.fx-afeed', e => e.innerText)), 'with the start of her review');
  ok(await z.$$eval('.fx-mine', l => l.length) === 0, 'no “you: ★★★” beside friends’ films');
  // heart, want to watch, comment
  await z.click('.fx-actv:has-text("Close-Up") [data-rx="h"]'); await z.waitForTimeout(600);
  ok(await z.$eval('.fx-actv:has-text("Close-Up") [data-rx="h"]', e => e.getAttribute('aria-pressed')) === 'true', 'heart on');
  await z.click('.fx-actv:has-text("Close-Up") [data-rx="w"]'); await z.waitForTimeout(600);
  ok(await z.evaluate(() => Object.keys(Store.data).some(k => k.startsWith('wl:') && /Close-Up/.test(Store.data[k] || ''))), '“want to watch” puts it on his watchlist');
  await z.click('.fx-actv:has-text("Close-Up") [data-rc]'); await z.fill('.fx-actv:has-text("Close-Up") form[data-rcf] input', 'great pick <b>!</b>');
  await z.press('.fx-actv:has-text("Close-Up") form[data-rcf] input', 'Enter'); await z.waitForTimeout(800);
  ok(/great pick <b>!<\/b>/.test(await z.$eval('.fx-actv:has-text("Close-Up") .fx-cm', e => e.innerText)), 'comment shows, as text', await z.$eval('.fx-actv:has-text("Close-Up") .fx-cm', e => e.innerText));
  // Ana sees them: a dot on Friends, then the inbox
  await a.click('[data-nav="diary"]'); await a.evaluate(() => { CloudSync.inbox(); }); await a.reload(); await a.waitForSelector('.fx-tabbar'); await a.click('[data-nav="diary"]'); await a.waitForTimeout(1500);
  ok(await a.$('.fx-tabbar [data-nav="friends"] .fx-ndot') !== null, 'a dot on Activity for something new');
  await a.click('[data-nav="friends"]'); await a.waitForSelector('.fx-ncount');
  ok(await a.$eval('.fx-ncount', e => e.innerText) === '4', 'Notifications (4): heart, want, comment, follow', await a.$eval('.fx-ncount', e => e.innerText));
  await a.click('[data-seg="n"]'); await a.waitForSelector('.fx-note-i', {timeout: 8000});
  const ib = await a.$eval('.fx-notes', e => e.innerText);
  ok(/ZED liked your entry for Close-Up/.test(ib) && /ZED commented on your entry for Close-Up/.test(ib) && /great pick/.test(ib) && /ZED started following you/.test(ib) && /added Close-Up to their watchlist/.test(ib), 'what happened, in words', ib.replace(/\s+/g, ' '));
  ok(await a.$$eval('.fx-note-i.fresh', l => l.length) === 4, 'all four marked new');
  await a.click('.fx-note-i.nc [data-rn]'); await a.fill('.fx-note-i.nc form[data-rcf] input', 'thanks!'); await a.press('.fx-note-i.nc form[data-rcf] input', 'Enter'); await a.waitForTimeout(800);
  ok(/thanks!/.test(await a.$eval('.fx-notes', e => e.innerText)), 'she replies from the notification');
  await a.click('.fx-note-i.nf [data-fr-follow="zed"]'); await a.waitForTimeout(600);
  ok(await a.$('.fx-note-i.nf [data-fr-follow]') === null, 'follow back from the notification');
  await a.click('[data-nav="diary"]'); await a.waitForTimeout(300);
  ok(await a.$('.fx-tabbar [data-nav="friends"] .fx-ndot') === null, 'dot gone once seen');
  // he sees her reply; she deletes his comment (her film)
  await z.reload(); await z.waitForSelector('.fx-actv');
  ok(/thanks!/.test(await z.$eval('.fx-actv:has-text("Close-Up")', e => e.innerText)), 'her reply reaches his feed');
  await z.click('[data-seg="n"]'); await z.waitForSelector('.fx-note-i', {timeout: 8000});
  const zn = await z.$eval('.fx-notes', e => e.innerText);
  ok(/ANA replied to your comment on Close-Up/.test(zn) && /ANA started following you/.test(zn), 'he’s told about her reply and her follow', zn.replace(/\s+/g, ' '));
  await a.click('[data-nav="friends"]'); await a.click('[data-seg="n"]'); await a.waitForSelector('.fx-note-i.nc');
  if (!(await a.$('.fx-note-i.nc .fx-nthread'))) await a.click('.fx-note-i.nc [data-rn]');
  await a.waitForSelector('.fx-note-i.nc [data-rcdel]');
  const n0 = await a.$$eval('.fx-note-i.nc .fx-cm [data-rcdel]', l => l.length); await a.click('.fx-note-i.nc .fx-cm li:has-text("great pick") [data-rcdel]'); await a.waitForTimeout(700);
  ok(await a.$$eval('.fx-note-i.nc .fx-cm [data-rcdel]', l => l.length) < n0, 'the film’s owner can delete a comment');
  // someone can't delete another's comment, or react as someone else
  const r1 = await z.evaluate(async () => { const f = await (await fetch('/api/feed')).json(); const mine = f.re.find(r => r[3] === 'c' && r[6] === 'ana'); return (await CloudSync.react({del: mine[0]})).status; });
  ok(r1 === 404, 'not someone else’s comment on someone else’s film', r1);
  const r2 = await z.evaluate(async () => (await CloudSync.react({owner: 'zed', eid: 'x1', kind: 'h', on: true})).status);
  ok(r2 === 400, 'no hearts on your own films', r2);
  const r3 = await z.evaluate(async () => (await fetch('/api/react', {method: 'POST', headers: {'content-type': 'text/plain'}, body: JSON.stringify({owner: 'ana', eid: 'x', kind: 'h'})})).status);
  ok(r3 === 403, 'a plain form post from elsewhere is refused', r3);
  // home choice
  await z.click('[data-nav="settings"]'); await z.click('[data-home="week"]'); await z.waitForTimeout(1500); await z.goto(B + '/'); await z.waitForSelector('.fx-tabbar');
  ok(await z.$eval('.fx-tabbar button[aria-current="page"]', e => e.dataset.nav) === 'week', 'Settings: start on This week');
  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
