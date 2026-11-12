// Moving off "Five Years of Cinema" (one person's plan, no longer offered): a member still following it is asked to
// choose a plan of their own, and their diary keeps everything that leaned on the old plan (films ticked in it,
// Letterboxd entries and films marked seen matched to it, films added to its weeks), with ratings, reviews, likes and
// the same ids; "Start over with another plan" keeps the diary the same way (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); if (!c) fails++; };
const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = async () => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const signup = async (p, u) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
    await p.waitForSelector('[data-ostart="list"]', {timeout: 15000});
  };
  const diary = p => p.evaluate(() => fxDiary({F: [], W: [], WM: []}, Store.data).map(e => [e.t, e.date, e.r, e.l, e.rv]));

  // Mo has been following the old plan: a film ticked in it (rated, liked, reviewed), a Letterboxd entry matched to one
  // of its films, a film marked seen matched to another, a film he added to week 1, a skip
  const mo = await ctx(); await signup(mo, 'moe');
  const S = await mo.evaluate(async d => {
    const P = await (await fetch('/sample-plan.json')).json(), F = P.F, K = i => F[i][8];
    const set = (k, v) => Store.set(k, v);
    set(K(0), d.d5); set('r:' + K(0), 8); set('l:' + K(0), 1); set('rv:' + K(0), 'A patient, generous film.');
    set('log:lbabc', 'k:' + K(1)); set('v:log:lbabc', d.d40); set('r:log:lbabc', 6);
    set('wx:zz', 'k:' + K(2)); set('r:wx:zz', 10);
    set('add:1:q', 't:Heat (1995)'); set('v:add:1:q', d.d3); set('r:add:1:q', 9); set('md:add:1:q', JSON.stringify({tm: 949, t: 'Heat', y: 1995}));
    set('sk:' + K(3), 1);
    return {k0: K(0), t0: F[0][0], y0: F[0][1], t1: F[1][0], t2: F[2][0], k3: K(3), ids: [K(0), fxEntryId('log:lbabc'), fxEntryId('add:1:q')].sort()};
  }, {d5: day(5), d40: day(40), d3: day(3)});
  await mo.evaluate(() => { Store.set('cfg:since', '2026-01-01'); Store.set('cfg:plan', 'sample'); });
  await mo.waitForSelector('.ob-retired', {timeout: 15000});
  ok(/Time for a plan of your own/.test(await mo.$eval('.ob-retired', e => e.innerText)), 'he’s asked to choose a plan of his own');
  ok(await mo.evaluate(() => Store.data['cfg:plan'] === undefined && Store.data['cfg:since'] === undefined), 'the old plan is gone from his account');
  ok(!(await mo.$('[data-ostart="sample"]')), 'and it isn’t offered again');
  await mo.screenshot({path: path.join(OUT, 'retired.png'), fullPage: true});
  const d = await diary(mo);
  ok(d.length === 3, 'his diary, with no plan at all: all three entries', d);
  const row = t => d.find(e => e[0].startsWith(t)) || [];
  ok(row(S.t0)[1] === day(5) && row(S.t0)[2] === 8 && row(S.t0)[3] === true && row(S.t0)[4] === 'A patient, generous film.', 'the film ticked in the plan: date, rating, like, review', row(S.t0));
  ok(row(S.t1)[1] === day(40) && row(S.t1)[2] === 6, 'the Letterboxd entry matched to a plan film', row(S.t1));
  ok(row('Heat')[2] === 9, 'the film he added to a week');
  const seen = await mo.evaluate(() => fxWatched({F: [], W: [], WM: []}, Store.data).map(e => [e.t, e.r]));
  ok(seen.length === 1 && seen[0][0].startsWith(S.t2) && seen[0][1] === 10, 'the film marked seen, still counted', seen);
  ok(await mo.evaluate(k => Store.data[k] === undefined && Store.data['sk:' + k] === undefined, S.k3) && await mo.evaluate(k => Store.data[k] === undefined, S.k0), 'the plan’s own bookkeeping is gone');
  // a plan of his own; the profile's entries keep their ids (links and friends' comments still find them)
  await mo.click('[data-ostart="list"]'); await mo.waitForSelector('.fx-tabbar', {timeout: 15000});
  const ids = await mo.evaluate(() => JSON.parse(fxShare(window.D, Object.assign({}, Store.data, {'cfg:pubdiary': null}), () => '')).diary.map(e => e.id).sort());
  ok(ids.join() === S.ids.join(), 'the same ids as before', {ids, want: S.ids});
  await mo.click('[data-nav="diary"]'); await mo.waitForTimeout(400);
  const dt = await mo.$eval('.fx-app', e => e.innerText);
  ok(dt.includes(S.t0) && dt.includes(S.t1) && dt.includes('Heat'), 'and the Diary shows them');

  // Start over with another plan, from Settings: the diary stays
  const ro = await ctx(); await signup(ro, 'roz');
  await ro.evaluate(async () => { await CloudSync.savePlan(await (await fetch('/sample-plan.json')).json()); Store.set('cfg:since', new Date().toISOString().slice(0, 10)); Store.set('cfg:plan', 'own'); });
  await ro.waitForSelector('.fx-tabbar', {timeout: 15000});
  const t0 = await ro.evaluate(d => { const F = window.D.F; Store.set(F[0][8], d); Store.set('r:' + F[0][8], 7); return F[0][0]; }, day(1));
  await ro.goto(B + '/settings/plan'); await ro.waitForSelector('[data-plan-reset]', {timeout: 10000});
  await ro.click('[data-plan-reset]'); await ro.click('[data-plan-reset]'); await ro.waitForSelector('[data-ostart="list"]', {timeout: 10000});
  ok(!(await ro.$('.ob-retired')), 'starting over says nothing about the old plan');
  const rd = await diary(ro);
  ok(rd.length === 1 && rd[0][0].startsWith(t0) && rd[0][2] === 7, 'what she logged through her old plan is still in her diary', rd);

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
