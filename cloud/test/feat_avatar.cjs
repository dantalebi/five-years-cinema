// Profile pictures and the profile: the picture in the corner opens the account menu; upload a photo or use a film
// still, frame it, save it; it shows in Settings, on your profile and in friends' feeds; bio, pronouns and location
// on the profile page; removing the picture (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); if (!c) fails++; };

// a 600×400 PNG, drawn here (no image tools needed)
function png(w, h) {
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = (x * 255 / w) | 0; raw[o + 1] = (y * 255 / h) | 0; raw[o + 2] = 140; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

(async () => {
  const pic = path.join(OUT, 'avatar-test.png'), PNG = png(600, 400); fs.writeFileSync(pic, PNG);
  const b = await chromium.launch(), errs = [];
  const ctx = async () => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
    // a film still, as TMDB's image server sends it (readable by the page's canvas)
    await c.route(/image\.tmdb\.org\/t\/p\/w(300|780)\//, r => r.fulfill({status: 200, contentType: 'image/png', headers: {'access-control-allow-origin': '*'}, body: PNG}));
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const signup = async (p, u) => {
    await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
    await p.click('[data-amode="up"]'); await p.fill('input[name=u]', u); await p.fill('input[name=n]', u[0].toUpperCase() + u.slice(1)); await p.fill('input[name=p]', 'pass for ' + u);
    await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]');
    await p.waitForSelector('[data-ostart="sample"]', {timeout: 15000}); await p.click('[data-ostart="sample"]'); await p.waitForSelector('.fx-tabbar');
  };
  const p = await ctx(); await signup(p, 'vera');

  // the corner: initials until there's a picture; it opens the account menu
  ok(await p.$('.av-top .av-me .av-i') !== null && (await p.$eval('.av-top .av-i', e => e.textContent)) === 'V', 'the corner shows her initial');
  ok(!(await p.$('.fx-gear')), 'the picture takes the gear’s place');
  await p.click('[data-ac-menu]'); await p.waitForSelector('.av-menu');
  const items = await p.$$eval('.av-menu [role=menuitem]', es => es.map(e => e.textContent));
  ok(items.join('|') === 'Your profile|Settings|About|Sign out', 'the menu: profile, Settings, About, Sign out', items);
  await p.screenshot({path: path.join(OUT, 'av-menu.png')});
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok(!(await p.$('.av-menu')), 'Escape closes it');
  await p.click('[data-ac-menu]'); await p.click('.av-menu a[href="/settings"]'); await p.waitForSelector('.ac-me');
  ok(p.url().endsWith('/settings') && !(await p.$('.av-menu')), 'Settings from the menu');

  // upload a photo, frame it, save it
  await p.setInputFiles('input[data-ac-avfile]', pic); await p.waitForSelector('.av-crop canvas');
  await p.$eval('[data-avzoom]', e => { e.value = '1.6'; e.dispatchEvent(new Event('input', {bubbles: true})); });
  const box = await p.$eval('.av-crop canvas', e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x + 40, box.y + 10); await p.mouse.up();
  await p.screenshot({path: path.join(OUT, 'av-crop.png')});
  await p.click('[data-avsave]'); await p.waitForSelector('.ac-me img.av', {timeout: 8000});
  const src = await p.$eval('.ac-me img.av', e => e.getAttribute('src'));
  ok(/^\/api\/avatar\/vera\?v=\d+$/.test(src), 'saved: Settings shows it', src);
  const img = await p.evaluate(async s => { const r = await fetch(s); const a = new Uint8Array(await r.arrayBuffer()); return {type: r.headers.get('content-type'), cache: r.headers.get('cache-control'), jpeg: a[0] === 0xFF && a[1] === 0xD8, n: a.length}; }, src);
  ok(img.type === 'image/jpeg' && img.jpeg && img.n < 80000 && /immutable/.test(img.cache), 'a small JPEG, cached for good', img);
  ok(await p.$('.av-top img.av') !== null, 'and in the corner');
  ok(!(await p.$('.fx-sheet')), 'the framing sheet is gone');

  // bio, pronouns, location; the profile page
  await p.fill('textarea[data-cfg="cfg:bio"]', 'Slow cinema and Saturday matinees.'); await p.fill('input[data-cfg="cfg:pron"]', 'she/her'); await p.fill('input[data-cfg="cfg:loc"]', 'Tehran');
  await p.click('[data-cfg-save]'); await p.waitForTimeout(300);
  await p.evaluate(() => { Store.set('log:v1', 't:Close-Up (1990)'); Store.set('v:log:v1', '2026-11-10'); Store.set('r:log:v1', 10); });
  await p.waitForTimeout(1700); await p.evaluate(() => CloudSync.run()); await p.waitForTimeout(800);
  const v = await ctx(); await signup(v, 'walt');
  await v.goto(B + '/u/vera'); await v.waitForSelector('.fx-pid', {timeout: 10000});
  const head = await v.$eval('.fx-share header', e => e.innerText.replace(/\s+/g, ' '));
  ok(await v.$('.fx-pid img.av-xl') !== null, 'her profile shows the picture');
  ok(/she\/her/.test(head) && /Slow cinema and Saturday matinees/.test(head) && /Tehran/.test(head), 'with pronouns, bio and location', head.slice(0, 200));
  await v.screenshot({path: path.join(OUT, 'av-profile.png')});
  await v.click('[data-pfollow]'); await v.waitForTimeout(500);
  await v.goto(B + '/activity'); await v.waitForSelector('.fx-actv', {timeout: 10000});
  ok(await v.$('.fx-actv .fx-aw img.av') !== null, 'and in the feed of people who follow her');
  await v.click('[data-seg="p"]'); await v.waitForSelector('.fx-people li');
  ok(await v.$('.fx-people li img.av') !== null, 'and in People');

  // a still from a film
  await p.click('[data-ac-avstill]'); await p.waitForSelector('form[data-avq]');
  await p.fill('form[data-avq] input', 'Close-Up'); await p.click('form[data-avq] button'); await p.waitForSelector('[data-avfilm]');
  await p.click('[data-avfilm]'); await p.waitForSelector('[data-avstill]'); await p.click('[data-avstill]'); await p.waitForSelector('.av-crop canvas');
  await p.click('[data-avsave]'); await p.waitForTimeout(800);
  const src2 = await p.$eval('.ac-me img.av', e => e.getAttribute('src'));
  ok(src2 !== src, 'a film still as the picture: a new version', src2);
  // Back closes the framing sheet without saving
  await p.setInputFiles('input[data-ac-avfile]', pic); await p.waitForSelector('.av-crop canvas');
  await p.goBack(); await p.waitForTimeout(400);
  ok(!(await p.$('.av-crop')) && p.url().endsWith('/settings') && (await p.$eval('.ac-me img.av', e => e.getAttribute('src'))) === src2, 'Back closes it and keeps the picture');

  // remove it
  await p.click('[data-ac-avrm]'); await p.waitForSelector('.ac-me .av-i');
  ok(await p.evaluate(async () => (await fetch('/api/avatar/vera')).status) === 404, 'removed: back to her initial');

  // what the server refuses
  const bad = await p.evaluate(async () => (await fetch('/api/avatar', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({img: btoa('<svg onload=alert(1)>'.repeat(20))})})).status);
  ok(bad === 400, 'only a JPEG is accepted', bad);
  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
