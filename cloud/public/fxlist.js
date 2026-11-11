// Your own list, split into weeks; Letterboxd CSV import. Used by the template edition.
// A film in the list is one entry 'pl:<id>' = JSON {t, y, d, m, p, tm, lb, o} — o is its place in the list.
const FXL = (() => {
  const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const idFor = o => o.tm ? 'm' + (+o.tm) : 'x' + slug(o.t + ' ' + (o.y || ''));
  const lbSlug = u => { const m = String(u || '').match(/letterboxd\.com\/(?:[^/]+\/)?film\/([a-z0-9-]+)\/?/i); return m ? m[1].toLowerCase() : ''; };
  const perWeek = seen => Math.max(1, Math.min(14, Math.round(+seen['cfg:perweek'] || 3)));
  function items(seen) {
    const out = [];
    for (const k in seen) if (k.startsWith('pl:') && seen[k]) { try { const o = JSON.parse(seen[k]); if (o && o.t) { o.id = k.slice(3); out.push(o); } } catch (e) {} }
    return out.sort((a, b) => (+a.o || 0) - (+b.o || 0) || (a.id < b.id ? -1 : 1));
  }
  // the list in the plan shape the app reads: films F, weeks W (n films each)
  function plan(seen) {
    const L = items(seen), n = perWeek(seen);
    const F = L.map(o => [String(o.t), +o.y || 0, String(o.d || ''), +o.m || 0, '', o.lb || '', 'L', 0, o.id, 0, '', '', 0, 0, 0, 0, +o.tm || 0]);
    const W = [], WM = [];
    for (let s = 0; s < F.length; s += n) { W.push(F.slice(s, s + n).map((f, k) => ['L', s + k, 1, -1])); WM.push({free: 0, th: ''}); }
    return {kind: 'list', F, W, WM, SG: [], faDir: {}, perWeek: n, posters: L.map(o => [o.id, o.p || ''])};
  }
  const sig = seen => items(seen).map(o => o.id + ':' + o.o + ':' + (o.p ? 1 : 0) + (o.d ? 1 : 0)).join('|') + '#' + perWeek(seen);
  const maxO = seen => items(seen).reduce((m, o) => Math.max(m, +o.o || 0), 0);
  function add(S, o, at) {
    const seen = S.all(), id = idFor(o);
    if (seen['pl:' + id]) return null;
    S.set('pl:' + id, JSON.stringify({t: o.t, y: +o.y || 0, d: o.d || '', m: +o.m || 0, p: o.p || '', tm: +o.tm || 0, lb: o.lb || '', o: at != null ? at : maxO(seen) + 1}));
    return id;
  }
  function remove(S, id) { S.set('pl:' + id, null); }
  function move(S, id, dir) {
    const L = items(S.all()), i = L.findIndex(o => o.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= L.length) return;
    // give the whole list clean positions, then swap the two
    L.forEach((o, k) => { o.o = k + 1; });
    [L[i].o, L[j].o] = [L[j].o, L[i].o];
    L.forEach(o => { const id2 = o.id; delete o.id; S.set('pl:' + id2, JSON.stringify(o)); o.id = id2; });
  }

  // ---- CSV (RFC 4180: quotes, doubled quotes, newlines inside quotes) ----
  function csv(text) {
    const rows = []; let row = [], f = '', q = false;
    text = String(text).replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
      if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  // Letterboxd exports: watchlist.csv / lists (Name, Year, URI) → a list; diary.csv / reviews.csv (Watched Date…) → diary entries
  function readLetterboxd(text, filename) {
    const rows = csv(text);
    const hi = rows.findIndex(r => r.includes('Name') && r.includes('Year'));
    if (hi < 0) return {kind: 'unknown', rows: []};
    const H = rows[hi], col = n => H.indexOf(n);
    const cN = col('Name'), cY = col('Year'), cU = col('Letterboxd URI') >= 0 ? col('Letterboxd URI') : col('URL');
    const cW = col('Watched Date'), cR = col('Rating'), cRw = col('Rewatch'), cT = col('Tags'), cRv = col('Review');
    const name = String(filename || '').toLowerCase();
    let kind = cW >= 0 ? 'diary' : 'list';
    if (kind === 'list' && /(^|\/)watched\.csv$|ratings\.csv$|likes/.test(name)) kind = 'nodates';
    const out = [];
    rows.slice(hi + 1).forEach(r => {
      const t = (r[cN] || '').trim(); if (!t) return;
      const o = {t, y: +(r[cY] || 0) || 0, lb: cU >= 0 ? lbSlug(r[cU]) : ''};
      if (kind === 'diary') {
        o.date = /^\d{4}-\d\d-\d\d$/.test(r[cW] || '') ? r[cW] : '';
        if (!o.date) return;
        const rt = cR >= 0 ? parseFloat(r[cR]) : 0; o.r = rt > 0 ? Math.max(1, Math.min(10, Math.round(rt * 2))) : 0;
        o.rw = cRw >= 0 && /^yes$/i.test((r[cRw] || '').trim());
        o.tg = cT >= 0 ? (r[cT] || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 8) : [];
        o.rv = cRv >= 0 ? (r[cRv] || '').trim().slice(0, 20000) : '';
      }
      out.push(o);
    });
    return {kind, rows: out};
  }
  // poster, director, runtime and TMDB id, when a TMDB key is set
  async function enrich(P, o) {
    if (!P || !P.on()) return o;
    try {
      const m = await P.match(o.t, o.y); if (!m) return o;
      const d = m.id ? await P.details(m.id).catch(() => ({})) : {};
      return Object.assign({}, o, {tm: m.id, y: o.y || m.y, p: d.p || m.p || '', d: d.d || '', m: d.m || 0});
    } catch (e) { return o; }
  }
  async function pool(list, n, fn, onProgress) {
    let i = 0, done = 0; const out = new Array(list.length);
    async function worker() { while (i < list.length) { const k = i++; out[k] = await fn(list[k]); done++; if (onProgress) onProgress(done, list.length); } }
    await Promise.all(Array.from({length: Math.min(n, list.length)}, worker));
    return out;
  }
  const keyTY = (t, y) => slug(t) + '|' + (+y || 0);
  // films not already in the list are added at the end, in the file's order
  async function importList(S, P, rows, onProgress) {
    const have = new Set(items(S.all()).map(o => keyTY(o.t, o.y))), fresh = [];
    rows.forEach(r => { const k = keyTY(r.t, r.y); if (!have.has(k)) { have.add(k); fresh.push(r); } });
    const full = await pool(fresh, 4, o => enrich(P, o), onProgress);
    let o = maxO(S.all()), n = 0;
    full.forEach(f => { if (add(S, f, ++o)) n++; });
    return {added: n, skipped: rows.length - n};
  }
  // diary rows become dated entries with rating, rewatch, tags and review. A row that's already in the diary
  // (same film, same day) only fills in what's missing, so diary.csv and reviews.csv can both be imported.
  async function importDiary(S, P, rows, onProgress) {
    const seen = S.all(), have = {};
    for (const k in seen) if (k.startsWith('log:') && !k.slice(4).includes(':') && seen[k] && String(seen[k]).startsWith('t:')) {
      const v = String(seen[k]).slice(2), y = (v.match(/\((\d{4})\)\s*$/) || [])[1];
      have[keyTY(v.replace(/\s*\(\d{4}\)\s*$/, ''), y) + '|' + (seen['v:' + k] || '')] = k;
    }
    // diary.csv and reviews.csv describe the same watch twice: fold them first
    const byDay = {};
    rows = rows.filter(r => {
      const k = keyTY(r.t, r.y) + '|' + r.date, o = byDay[k];
      if (!o) { byDay[k] = r; return true; }
      o.rv = o.rv || r.rv; o.r = o.r || r.r; o.rw = o.rw || r.rw; o.sp = o.sp || r.sp;
      if (!(o.tg && o.tg.length)) o.tg = r.tg;
      return false;
    });
    // Letterboxd habit: a "w/ name" tag says who you watched with
    const ww = r => (r.tg || []).filter(x => /^w\/\s*\S/i.test(x)).map(x => x.replace(/^w\/\s*/i, '').trim()).join(', ');
    const tags = r => (r.tg || []).filter(x => !/^w\/\s*\S/i.test(x));
    const fresh = [];
    let updated = 0;
    rows.forEach(r => {
      const id = have[keyTY(r.t, r.y) + '|' + r.date];
      if (!id) { fresh.push(r); return; }
      let ch = false;
      if (r.rv && !seen['rv:' + id]) { S.set('rv:' + id, r.rv); ch = true; }
      if (r.r && !seen['r:' + id]) { S.set('r:' + id, r.r); ch = true; }
      if (r.rw && !seen['rw:' + id]) { S.set('rw:' + id, 1); ch = true; }
      if (tags(r).length && !seen['tg:' + id]) { S.set('tg:' + id, tags(r).join(', ')); ch = true; }
      if (ww(r) && !seen['ww:' + id]) { S.set('ww:' + id, ww(r)); ch = true; }
      if (ch) updated++;
    });
    const full = await pool(fresh, 4, o => enrich(P, o), onProgress);
    const base = Date.now().toString(36);
    full.forEach((f, k) => {
      const id = 'log:' + base + k.toString(36).padStart(4, '0');
      S.set(id, 't:' + f.t + (f.y ? ' (' + f.y + ')' : '')); S.set('v:' + id, f.date);
      if (f.r) S.set('r:' + id, f.r);
      if (f.rw) S.set('rw:' + id, 1);
      if (tags(f).length) S.set('tg:' + id, tags(f).join(', '));
      if (ww(f)) S.set('ww:' + id, ww(f));
      if (f.rv) { S.set('rv:' + id, f.rv); if (f.sp) S.set('sp:' + id, 1); }
      if (f.tm) { S.set('md:' + id, JSON.stringify({tm: f.tm, t: f.t, y: f.y, d: f.d || '', m: f.m || 0, p: f.p || ''})); if (P && f.p) P.put('tx:' + f.t + (f.y ? ' (' + f.y + ')' : ''), f.p); }
    });
    return {added: full.length, updated, skipped: rows.length - full.length - updated};
  }
  return {plan, sig, items, add, remove, move, idFor, perWeek, csv, readLetterboxd, enrich, importList, importDiary};
})();
