// Draws the site's icons and share image from the logo in src/brand.js: node brand/render.cjs [preview]
// Writes brand/out/: icon.svg, icon32.png, apple-touch-icon.png, icon192.png, icon512.png, maskable512.png, og.jpg
// (build_cloud.py copies them into public/). "preview" also writes brand/out/preview.png, everything side by side.
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const B = require('../src/brand.js');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, {recursive: true});

// an app icon: the screen on unlit glass. `pad` is the share of the square left around the screen (maskable icons
// need the screen inside the middle 80%)
const icon = (size, pad, osd) => {
  const w = size * (1 - 2 * pad), h = w * 0.8, x = (size - w) / 2, y = (size - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${B.GLASS}"/>` +
    `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 120 96">${B.screen({osd, id: 'i' + size})}</svg></svg>`;
};
// the favicon as SVG: the screen alone, transparent around it
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96">${B.screen({osd: true, id: 's'})}</svg>`;

const og = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:${B.GLASS};font-family:Inter,"DejaVu Sans",sans-serif}
.w{position:relative;width:1200px;height:630px}
.bars{position:absolute;left:0;right:0;top:0;height:10px;display:flex}.bars i{flex:1}
.l{position:absolute;left:88px;top:150px}
.l svg.fx-word{display:block}
p{margin:44px 0 0;max-width:600px;font-size:31px;line-height:1.35;color:#B7C7C0;letter-spacing:-.005em}
.m{position:absolute;right:84px;top:132px}
.wk{position:absolute;left:88px;bottom:72px;display:flex;gap:8px}.wk i{width:56px;height:18px;border-radius:3px}
</style></head><body><div class="w">
<div class="bars">${B.BARS.map(c => `<i style="background:${c}"></i>`).join('')}</div>
<div class="l">${B.word({ink: '#E6EFE9', h: 116})}<p>A film diary with a plan. Log what you watch, follow friends, pick tonight’s film together.</p></div>
<div class="m"><svg width="380" height="304" viewBox="0 0 120 96">${B.screen({id: 'og'})}</svg></div>
<div class="wk"><i style="background:#3FC1D0"></i><i style="background:#E8C547"></i><i style="background:#3FC1D0"></i><i style="background:#EF6B5A;opacity:.25"></i><i style="background:#D978C4;opacity:.25"></i><i style="background:#7D90F2;opacity:.25"></i></div>
</div></body></html>`;

(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  const png = async (svg, size, file) => {
    await p.setViewportSize({width: size, height: size});
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await p.screenshot({path: path.join(OUT, file), omitBackground: true, clip: {x: 0, y: 0, width: size, height: size}});
  };
  fs.writeFileSync(path.join(OUT, 'icon.svg'), svgIcon);
  await png(icon(32, 0.03, false), 32, 'icon32.png');
  await png(icon(180, 0.1, true), 180, 'apple-touch-icon.png');
  await png(icon(192, 0.1, true), 192, 'icon192.png');
  await png(icon(512, 0.1, true), 512, 'icon512.png');
  await png(icon(512, 0.17, true), 512, 'maskable512.png');
  await p.setViewportSize({width: 1200, height: 630}); await p.setContent(og);
  await p.screenshot({path: path.join(OUT, 'og.jpg'), type: 'jpeg', quality: 88});
  if (process.argv[2] === 'preview') {
    const img = f => `<img src="data:image/png;base64,${fs.readFileSync(path.join(OUT, f)).toString('base64')}">`;
    await p.setViewportSize({width: 1300, height: 900});
    await p.setContent(`<html><body style="margin:0;padding:30px;background:#777;display:grid;gap:24px;font-family:sans-serif">
      <div style="display:flex;gap:30px;align-items:center;background:${B.GLASS};padding:30px">${B.word({ink: '#E6EFE9', h: 80})}${B.word({ink: '#E6EFE9', h: 22})}${B.mark({h: 120, id: 'a'})}${B.mark({h: 28, id: 'b'})}</div>
      <div style="display:flex;gap:30px;align-items:center;background:#EDEFEA;padding:30px">${B.word({ink: '#13201D', on: '#128A43', h: 80})}${B.word({ink: '#13201D', on: '#128A43', h: 22})}${B.mark({h: 28, id: 'c'})}</div>
      <div style="display:flex;gap:30px;align-items:end">${img('icon512.png')}${img('maskable512.png').replace('<img', '<img style="width:180px;border-radius:40px"')}${img('icon192.png')}${img('apple-touch-icon.png')}${img('icon32.png')}${img('icon32.png').replace('<img', '<img style="width:16px"')}</div></body></html>`);
    await p.screenshot({path: path.join(OUT, 'preview.png'), fullPage: true});
  }
  await b.close();
  console.log('brand: ' + fs.readdirSync(OUT).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
