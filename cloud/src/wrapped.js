// A year in film ("Wrapped"): one year of a diary, full screen, and a 1080×1920 picture for stories.
// Works on a profile payload (fxShare's shape): {name, diary: [{t, y, w, r, h, rv, rw, d, m, p, g, c}]}, so the app
// (your own diary) and a profile page (anyone's) both use it.
//   fxWrappedStats(data, year) → the numbers, or null when the year has fewer than 3 films
//   fxWrappedOpen(data, year, {who, url, site}) → shows it over the page
const FX_WGEN = {28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror',
  10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'};
const FX_WMON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FX_WMONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fxWrappedStats(data, year) {
  const day = /^\d{4}-\d\d-\d\d$/, y = String(year);
  const d = ((data && data.diary) || []).filter(e => e && typeof e.t === 'string' && day.test(e.w || '') && e.w.startsWith(y + '-'));
  if (d.length < 3) return null;
  const by = (list, key) => { const m = new Map(); list.forEach(e => key(e).forEach(k => { if (k) m.set(k, (m.get(k) || 0) + 1); })); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const asc = d.slice().sort((a, b) => a.w < b.w ? -1 : a.w > b.w ? 1 : 0);
  const mins = d.reduce((a, e) => a + (+e.m || 0), 0), rated = d.filter(e => +e.r > 0);
  const dates = [...new Set(d.map(e => e.w))].sort();
  // the longest run of days in a row with at least one film
  let streak = 1, run = 1;
  for (let i = 1; i < dates.length; i++) { run = (Date.parse(dates[i]) - Date.parse(dates[i - 1]) === 864e5) ? run + 1 : 1; streak = Math.max(streak, run); }
  const perDay = by(d, e => [e.w])[0];
  const months = Array(12).fill(0); d.forEach(e => { months[+e.w.slice(5, 7) - 1]++; });
  const busy = months.indexOf(Math.max(...months));
  const best = rated.slice().sort((a, b) => (+b.r - +a.r) || (b.h ? 1 : 0) - (a.h ? 1 : 0) || (a.w < b.w ? -1 : 1));
  const withP = best.filter(e => /^https:\/\/image\.tmdb\.org\//.test(e.p || ''));
  const top = (withP.length >= 5 ? withP : best).slice(0, 5);
  const films = d.filter(e => +e.y > 1870);
  return {
    year: y, n: d.length, hours: Math.round(mins / 60), days: dates.length, streak: dates.length ? streak : 0, perDay: perDay ? perDay[1] : 0,
    rewatches: d.filter(e => e.rw).length, likes: d.filter(e => e.h).length, reviews: d.filter(e => e.rv).length,
    avg: rated.length ? rated.reduce((a, e) => a + +e.r, 0) / rated.length / 2 : 0, five: d.filter(e => +e.r === 10).length,
    top, dirs: by(d, e => String(e.d || '').split(',').map(s => s.trim())).slice(0, 3),
    genres: by(d, e => (e.g || []).map(g => FX_WGEN[g])).slice(0, 3),
    countries: by(d, e => (e.c || []).map(c => { try { return new Intl.DisplayNames(['en'], {type: 'region'}).of(c); } catch (er) { return c; } })).slice(0, 3),
    months, busy, first: asc[0], last: asc[asc.length - 1],
    oldest: films.slice().sort((a, b) => +a.y - +b.y)[0] || null, newest: films.filter(e => +e.y >= +y - 1).length,
    decades: by(films, e => [Math.floor(+e.y / 10) * 10 + 's']).slice(0, 3),
  };
}

function fxWrappedOpen(data, year, opts) {
  opts = opts || {};
  const s = fxWrappedStats(data, year); if (!s) return false;
  const esc = v => String(v).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const num = n => Number(n).toLocaleString('en-US');
  const stars = r => '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '');
  const who = String(opts.who || data.name || '').trim();
  const pos = e => /^https:\/\/image\.tmdb\.org\//.test(e.p || '') ? `<img alt="" src="${esc(e.p)}">` : `<span>${esc(e.t)}</span>`;
  const film = e => `<bdi>${esc(e.t)}</bdi>${e.y ? ` <small>${e.y}</small>` : ''}`;
  const rank = (title, rows) => rows.length ? `<section class="fw-card"><h3>${title}</h3><ol class="fw-rank">${rows.map(([k, n]) => `<li><span>${esc(k)}</span><b>${num(n)}</b></li>`).join('')}</ol></section>` : '';
  const mx = Math.max(1, ...s.months);
  const html = `<div class="fw-scrim" data-fwclose></div><div class="fw" role="dialog" aria-modal="true" aria-label="${esc(s.year)} in film">
    <button type="button" class="fw-x" data-fwclose aria-label="Close">×</button>
    <header class="fw-hero"><div class="fw-eye">${esc(opts.site || 'Film Diary')} · Year in Film</div><h2>${esc(s.year)}</h2><p>${who ? esc(who) + '’s' : 'Your'} year in film</p></header>
    <section class="fw-big">${[[num(s.n), s.n === 1 ? 'film' : 'films'], [num(s.hours), 'hours'], [num(s.days), s.days === 1 ? 'day with a film' : 'days with a film'], [num(s.streak), 'day streak']].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</section>
    ${s.top.length ? `<section class="fw-card"><h3>${s.five >= 3 ? 'Five-star films' : 'Top rated'}</h3><div class="fw-posters">${s.top.map(e => `<figure>${pos(e)}<figcaption>${film(e)}<i>${stars(+e.r)}</i></figcaption></figure>`).join('')}</div></section>` : ''}
    <section class="fw-card"><h3>Month by month</h3><div class="fw-months">${s.months.map((n, i) => `<div class="${i === s.busy ? 'on' : ''}"><i style="height:${Math.round(n / mx * 100)}%"></i><span>${FX_WMON[i][0]}</span></div>`).join('')}</div><p class="fw-note">${FX_WMONL[s.busy]} was your busiest month, with ${num(s.months[s.busy])} ${s.months[s.busy] === 1 ? 'film' : 'films'}.${s.perDay > 1 ? ` Most in a single day: ${num(s.perDay)}.` : ''}</p></section>
    ${rank('Most-watched directors', s.dirs.filter(([, n]) => n > 1))}
    <div class="fw-two">${rank('Top genres', s.genres)}${rank('Top countries', s.countries)}</div>
    <section class="fw-card fw-facts"><h3>Odds and ends</h3><ul>
      <li><span>First film of the year</span>${film(s.first)}</li>
      <li><span>Most recent</span>${film(s.last)}</li>
      ${s.oldest ? `<li><span>Oldest film</span>${film(s.oldest)}</li>` : ''}
      ${s.decades.length ? `<li><span>Favorite decade</span><bdi>${esc(s.decades[0][0])}</bdi></li>` : ''}
      ${s.avg ? `<li><span>Average rating</span><bdi>${s.avg.toFixed(1)} ★</bdi></li>` : ''}
      <li><span>Rewatches · likes · reviews</span><bdi>${num(s.rewatches)} · ${num(s.likes)} · ${num(s.reviews)}</bdi></li>
    </ul></section>
    <footer class="fw-foot"><button type="button" class="fw-btn" data-fwimg>Make a story image</button><p class="fw-note" data-fwnote hidden></p><div class="fw-prev" data-fwprev hidden></div></footer>
  </div>`;
  const wrap = document.body.appendChild(document.createElement('div'));
  wrap.className = 'fw-wrap fx'; wrap.innerHTML = html;
  const prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
  const close = () => { wrap.remove(); document.documentElement.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey); if (blobUrl) URL.revokeObjectURL(blobUrl); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  let blobUrl = '', blob = null, busy = false;
  wrap.addEventListener('click', async e => {
    if (e.target.closest('[data-fwclose]')) { close(); return; }
    const b = e.target.closest('[data-fwimg], [data-fwshare]'); if (!b || busy) return;
    const note = wrap.querySelector('[data-fwnote]'), prev = wrap.querySelector('[data-fwprev]');
    if (b.hasAttribute('data-fwshare')) {
      try { await navigator.share({files: [new File([blob], 'year-in-film-' + s.year + '.png', {type: 'image/png'})], title: s.year + ' in film'}); } catch (er) {}
      return;
    }
    busy = true; b.disabled = true; note.hidden = false; note.textContent = 'Making your image…';
    try {
      blob = await fxWrappedImage(s, {who, url: opts.url || '', site: opts.site || 'Film Diary'});
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(blob);
      const canShare = navigator.canShare && navigator.canShare({files: [new File([blob], 'x.png', {type: 'image/png'})]});
      prev.hidden = false;
      prev.innerHTML = `<img alt="Your ${esc(s.year)} in film" src="${blobUrl}"><div class="fw-row">${canShare ? '<button type="button" class="fw-btn" data-fwshare>Share</button>' : ''}<a class="fw-btn${canShare ? ' ghost' : ''}" href="${blobUrl}" download="year-in-film-${esc(s.year)}.png">Save image</a></div>`;
      note.hidden = true;
      prev.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    } catch (er) { note.textContent = 'Couldn’t make the image. Try again.'; }
    busy = false; b.disabled = false;
  });
  return true;
}

// the 1080×1920 picture. Posters come from TMDB with CORS; one that won't load becomes a titled card instead.
async function fxWrappedImage(s, o) {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const serif = '"Instrument Serif", Georgia, serif', sans = '-apple-system, "Segoe UI", Inter, Roboto, sans-serif', mono = '"JetBrains Mono", Menlo, monospace';
  try { await Promise.all(['400 100px "Instrument Serif"', '400 30px "JetBrains Mono"'].map(f => document.fonts.load(f))); } catch (e) {}
  const img = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src.replace(/\/w\d+\//, '/w342/'); setTimeout(() => res(null), 8000); });
  const posters = await Promise.all(s.top.map(e => img(e.p)));
  // background
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b0d10'); bg.addColorStop(1, '#151a20'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.85, 120, 40, W * 0.85, 120, 700); glow.addColorStop(0, 'rgba(0,224,84,.22)'); glow.addColorStop(1, 'rgba(0,224,84,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, 900);
  const X = 84;
  const text = (t, x, y, font, color, align) => { g.font = font; g.fillStyle = color; g.textAlign = align || 'left'; g.fillText(t, x, y); };
  const fit = (t, max, font) => { g.font = font; if (g.measureText(t).width <= max) return t; while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
  text((o.site + ' · Year in Film').toUpperCase(), X, 140, `500 26px ${mono}`, '#8fa0b0');
  text(s.year, X - 6, 390, `400 300px ${serif}`, '#f2f5f7');
  text(fit(o.who ? o.who + '’s year in film' : 'My year in film', W - 2 * X, `400 52px ${serif}`), X, 470, `400 52px ${serif}`, '#c9d3dc');
  // the big numbers
  const big = [[s.n, s.n === 1 ? 'film' : 'films'], [s.hours, 'hours'], [s.days, 'days']];
  big.forEach(([n, l], i) => { const x = X + i * 310; text(Number(n).toLocaleString('en-US'), x, 650, `400 128px ${serif}`, i === 0 ? '#00e054' : '#f2f5f7'); text(l.toUpperCase(), x + 4, 700, `500 26px ${mono}`, '#8fa0b0'); });
  // five posters
  const pw = 168, ph = 252, gap = (W - 2 * X - 5 * pw) / 4, py = 800;
  text((s.five >= 3 ? 'Five-star films' : 'Top rated').toUpperCase(), X, py - 30, `500 26px ${mono}`, '#8fa0b0');
  s.top.slice(0, 5).forEach((e, i) => {
    const x = X + i * (pw + gap), im = posters[i];
    g.save(); g.beginPath(); if (g.roundRect) g.roundRect(x, py, pw, ph, 12); else g.rect(x, py, pw, ph); g.clip();
    if (im) g.drawImage(im, x, py, pw, ph);
    else { g.fillStyle = '#26303a'; g.fillRect(x, py, pw, ph); g.fillStyle = '#c9d3dc'; g.font = `400 26px ${serif}`; g.textAlign = 'center'; const words = String(e.t).split(/\s+/); let line = '', yy = py + 70; words.forEach(w => { if (g.measureText(line + ' ' + w).width > pw - 24 && line) { g.fillText(line, x + pw / 2, yy); yy += 32; line = w; } else line = line ? line + ' ' + w : w; }); g.fillText(line, x + pw / 2, yy); }
    g.restore();
  });
  // a few lines of facts
  let fy = py + ph + 100;
  const fact = (label, value) => { if (!value) return; text(label.toUpperCase(), X, fy, `500 25px ${mono}`, '#8fa0b0'); text(fit(value, W - 2 * X, `400 54px ${serif}`), X, fy + 62, `400 54px ${serif}`, '#f2f5f7'); fy += 140; };
  fact('Most-watched director', s.dirs[0] && s.dirs[0][1] > 1 ? s.dirs[0][0] + ' · ' + s.dirs[0][1] + ' films' : '');
  fact('Top genres', s.genres[0] ? s.genres.map(x => x[0]).slice(0, 2).join(' & ') : '');
  fact('Busiest month', FX_WMONL[s.busy] + ' · ' + s.months[s.busy] + (s.months[s.busy] === 1 ? ' film' : ' films'));
  // month bars
  const by = Math.max(fy + 10, 1560), bw = (W - 2 * X - 11 * 14) / 12, mxm = Math.max(1, ...s.months);
  s.months.forEach((n, i) => { const h = Math.max(6, Math.round(n / mxm * 150)), x = X + i * (bw + 14); g.fillStyle = i === s.busy ? '#00e054' : '#2c3844'; if (g.roundRect) { g.beginPath(); g.roundRect(x, by + 150 - h, bw, h, 6); g.fill(); } else g.fillRect(x, by + 150 - h, bw, h); text(FX_WMON[i][0], x + bw / 2, by + 190, `500 22px ${mono}`, '#6f7f8f', 'center'); });
  if (o.url) text(o.url.replace(/^https?:\/\//, ''), W / 2, H - 56, `500 26px ${mono}`, '#8fa0b0', 'center');
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/png'));
}
