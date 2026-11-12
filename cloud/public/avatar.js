// Profile pictures. fxAvatar(username, name, version, size) draws one: the picture when there is one (cached for good,
// since its address changes with each new picture), otherwise the first letter of the name on a color of its own.
// fxAvatarEditor.open({file | url}) lets you frame a photo (or a still from a film) in the circle, drag to move and
// zoom, and saves a 256-pixel JPEG; fxAvatarEditor.stills() picks a film and one of its stills first.
const AV_COLORS = ['#7c5c3b', '#3f6e5a', '#4a5d8f', '#8a4b5f', '#5f6b2e', '#2f6f7a', '#7a4e8a', '#8a5a2b', '#476f3f', '#5b5b78'];
function fxAvatar(username, name, av, size) {
  const u = String(username || ''), cls = 'av av-' + (size || 'm');
  if (+av > 0 && /^[a-z0-9_]{3,24}$/.test(u)) return `<img class="${cls}" alt="" loading="lazy" decoding="async" src="/api/avatar/${u}?v=${+av}">`;
  let h = 0; for (const c of u) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const letter = String(name || u || '?').trim().charAt(0).toUpperCase().replace(/[<>&"]/g, '') || '?';
  return `<span class="${cls} av-i" style="--avc:${AV_COLORS[h % AV_COLORS.length]}" aria-hidden="true">${letter}</span>`;
}

const fxAvatarEditor = (() => {
  let el = null, st = null, done = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const SIZE = 260;  // the crop area on screen
  function shell(inner) {
    if (!el) { el = document.body.appendChild(document.createElement('div')); el.className = 'fx-sheetwrap av-wrap'; listen(); }
    el.hidden = false; document.documentElement.classList.add('fx-lock');
    el.innerHTML = `<div class="fx-scrim" data-avx></div><div class="fx fx-sheet av-sheet" dir="ltr" lang="en" role="dialog" aria-modal="true" aria-label="Profile picture"><div class="fx-shbody">${inner}</div></div>`;
  }
  function close(byBack) {
    if (!el || el.hidden) return;
    el.hidden = true; el.innerHTML = ''; document.documentElement.classList.remove('fx-lock'); st = null;
    if (!byBack && typeof fxNav !== 'undefined') fxNav.unmodal('avatar');
    const d = done; done = null; if (d) d(null);
  }
  function modal() { if (typeof fxNav !== 'undefined') fxNav.modal('avatar', () => { close(true); return true; }); }

  // ---- framing: the image under a circle; drag to move, the slider to zoom ----
  function frame(src, fromFilm) {
    const img = new Image();
    if (fromFilm) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const base = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      st = {img, base, zoom: 1, x: 0, y: 0, fromFilm};
      shell(`<div class="fx-shh"><h2 class="fx-h2">Your picture</h2><button type="button" class="fx-link" data-avx>Cancel</button></div>
        <p class="fx-muted">Drag to move it, and zoom to fit.</p>
        <div class="av-crop"><canvas width="${SIZE * 2}" height="${SIZE * 2}" style="width:${SIZE}px;height:${SIZE}px" aria-label="Your picture, framed"></canvas><i aria-hidden="true"></i></div>
        <label class="av-zoom"><span>Zoom</span><input type="range" min="1" max="4" step="0.01" value="1" data-avzoom aria-label="Zoom"></label>
        <div class="fx-row"><button type="button" class="fx-btn primary" data-avsave>Save picture</button><button type="button" class="fx-btn" data-avx>Cancel</button></div><p class="fx-note" data-avnote hidden></p>`);
      draw(); drag();
    };
    img.onerror = () => { shell(`<div class="fx-shh"><h2 class="fx-h2">Your picture</h2><button type="button" class="fx-link" data-avx>Close</button></div><p class="fx-note bad">That image couldn’t be opened. Try a JPEG or PNG.</p>`); };
    img.src = src;
  }
  function clamp() {
    const s = st.base * st.zoom, w = st.img.naturalWidth * s, h = st.img.naturalHeight * s;
    st.x = Math.min((w - SIZE) / 2, Math.max(-(w - SIZE) / 2, st.x));
    st.y = Math.min((h - SIZE) / 2, Math.max(-(h - SIZE) / 2, st.y));
  }
  function paint(ctx, out) {
    const k = out / SIZE, s = st.base * st.zoom * k, w = st.img.naturalWidth * s, h = st.img.naturalHeight * s;
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, out, out);
    ctx.drawImage(st.img, (out - w) / 2 + st.x * k, (out - h) / 2 + st.y * k, w, h);
  }
  function draw() { const c = el && el.querySelector('canvas'); if (c && st) { clamp(); paint(c.getContext('2d'), c.width); } }
  function drag() {
    const c = el.querySelector('canvas'); let p = null;
    c.addEventListener('pointerdown', e => { p = {x: e.clientX, y: e.clientY, sx: st.x, sy: st.y}; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => { if (!p) return; st.x = p.sx + e.clientX - p.x; st.y = p.sy + e.clientY - p.y; draw(); });
    const up = () => { p = null; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', e => { e.preventDefault(); st.zoom = Math.min(4, Math.max(1, st.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06))); const z = el.querySelector('[data-avzoom]'); if (z) z.value = st.zoom; draw(); }, {passive: false});
  }
  async function save() {
    const note = el.querySelector('[data-avnote]'), btn = el.querySelector('[data-avsave]');
    const out = document.createElement('canvas'); out.width = out.height = 256;
    paint(out.getContext('2d'), 256);
    let blob;
    try { blob = await new Promise((res, rej) => out.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/jpeg', .86)); }
    catch (e) { note.hidden = false; note.className = 'fx-note bad'; note.textContent = 'That still can’t be used. Try another one.'; return; }
    const b64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.readAsDataURL(blob); });
    btn.disabled = true; note.hidden = false; note.className = 'fx-note busy'; note.textContent = 'Saving…';
    const r = await CloudSync.setAvatar(b64);
    if (!r.ok) { btn.disabled = false; note.className = 'fx-note bad'; note.textContent = CloudSync.say(r.code); return; }
    const d = done; done = null; close(); if (d) d(r.j.av);
  }

  // ---- a still from a film: find the film, pick a still ----
  async function tmdb(path) { try { const r = await fetch('/api/tmdb' + path, {headers: {accept: 'application/json'}, credentials: 'same-origin'}); return r.ok ? await r.json() : null; } catch (e) { return null; } }
  function stillsSearch(q, list) {
    shell(`<div class="fx-shh"><h2 class="fx-h2">A still from a film</h2><button type="button" class="fx-link" data-avx>Cancel</button></div>
      <form class="fx-form" data-avq><input type="search" class="fx-pick-q" placeholder="Search for a film" aria-label="Search for a film" value="${esc(q || '')}" autocomplete="off"><button type="submit" class="fx-btn">Search</button></form>
      ${list ? (list.length ? `<ul class="av-films">${list.map(m => `<li><button type="button" data-avfilm="${m.id}">${m.poster_path ? `<img alt="" loading="lazy" src="https://image.tmdb.org/t/p/w92${esc(m.poster_path)}">` : '<span></span>'}<b>${esc(m.title)}</b><span>${esc(String(m.release_date || '').slice(0, 4))}</span></button></li>`).join('')}</ul>` : '<p class="fx-muted">No films found.</p>') : ''}`);
    const i = el.querySelector('.fx-pick-q'); if (i && !list) i.focus();
  }
  async function stillsOf(id) {
    shell(`<div class="fx-shh"><h2 class="fx-h2">Pick a still</h2><button type="button" class="fx-link" data-avx>Cancel</button></div><p class="fx-muted">Loading…</p>`);
    const j = await tmdb('/movie/' + (+id) + '/images');
    const bds = ((j && j.backdrops) || []).filter(b => /^\/[A-Za-z0-9._-]+$/.test(b.file_path || '')).slice(0, 30);
    shell(`<div class="fx-shh"><h2 class="fx-h2">Pick a still</h2><button type="button" class="fx-link" data-avx>Cancel</button></div>
      ${bds.length ? `<ul class="av-stills">${bds.map(b => `<li><button type="button" data-avstill="${esc(b.file_path)}"><img alt="" loading="lazy" src="https://image.tmdb.org/t/p/w300${esc(b.file_path)}"></button></li>`).join('')}</ul>` : '<p class="fx-muted">This film has no stills. Try another one.</p>'}
      <div class="fx-row"><button type="button" class="fx-link" data-avback>← Another film</button></div>`);
  }
  function listen() {
    el.addEventListener('click', e => {
      const b = e.target.closest('button, .fx-scrim'); if (!b) return;
      if (b.hasAttribute('data-avx')) { close(); return; }
      if (b.hasAttribute('data-avsave')) { save(); return; }
      if (b.dataset.avfilm) { stillsOf(b.dataset.avfilm); return; }
      if (b.dataset.avstill) { frame('https://image.tmdb.org/t/p/w780' + b.dataset.avstill, true); return; }
      if (b.hasAttribute('data-avback')) { stillsSearch(st && st.q || '', null); }
    });
    el.addEventListener('input', e => { if (e.target.matches('[data-avzoom]') && st) { st.zoom = +e.target.value; draw(); } });
    el.addEventListener('submit', async e => {
      if (!e.target.matches('[data-avq]')) return;
      e.preventDefault();
      const q = e.target.querySelector('input').value.trim(); if (!q) return;
      const j = await tmdb('/search/movie?query=' + encodeURIComponent(q) + '&include_adult=false&language=en-US');
      st = {q}; stillsSearch(q, ((j && j.results) || []).slice(0, 12));
    });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  return {
    // a photo from this device
    open(file) {
      return new Promise(res => {
        done = res; modal();
        if (!file || !/^image\//.test(file.type || '')) { shell(`<div class="fx-shh"><h2 class="fx-h2">Your picture</h2><button type="button" class="fx-link" data-avx>Close</button></div><p class="fx-note bad">Choose an image file (JPEG or PNG).</p>`); return; }
        frame(URL.createObjectURL(file), false);
      });
    },
    stills() { return new Promise(res => { done = res; modal(); stillsSearch('', null); }); },
    close: () => close(),
  };
})();
