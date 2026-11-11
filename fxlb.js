// Letterboxd → diary. One set of rules for both ways in:
//  - the app, importing the export files (diary.csv, reviews.csv) once;
//  - a scheduled GitHub Action reading the public RSS feed of new logs every few hours.
// A row: {t, y, slug, date, r (1–10), l, rw, rv, sp, tg[], tm, guid}.
// Plan films logged on or after `since` tick the plan; anything earlier (or a second viewing) becomes a diary entry.
// A row that matches something already in the diary (same film, within a day) only fills in what's missing.
const FXLB = (() => {
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  const dayN = s => Math.floor(Date.parse(s + 'T00:00:00Z') / 864e5);
  const isDate = s => /^\d{4}-\d\d-\d\d$/.test(String(s || ''));
  const stripYear = s => String(s).replace(/\s*\(\d{4}\)\s*$/, '');
  const yearOf = s => +(String(s).match(/\((\d{4})\)\s*$/) || [])[1] || 0;
  const parse = s => { try { return JSON.parse(s); } catch (e) { return null; } };

  // ---- CSV (quotes, doubled quotes, newlines inside quotes) ----
  function csv(text) {
    const rows = []; let row = [], f = '', q = false;
    text = String(text).replace(/^\uFEFF/, '');
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
  // diary.csv / reviews.csv from Letterboxd's export → rows; null if the file has no viewing dates
  function fromCsv(text) {
    const rows = csv(text), hi = rows.findIndex(r => r.includes('Name') && r.includes('Year'));
    if (hi < 0) return null;
    const H = rows[hi], c = n => H.indexOf(n), cW = c('Watched Date');
    if (cW < 0) return null;
    const cN = c('Name'), cY = c('Year'), cR = c('Rating'), cRw = c('Rewatch'), cT = c('Tags'), cRv = c('Review');
    const out = [];
    rows.slice(hi + 1).forEach(r => {
      const t = (r[cN] || '').trim(), date = (r[cW] || '').trim();
      if (!t || !isDate(date)) return;
      const rt = cR >= 0 ? parseFloat(r[cR]) : 0;
      out.push({t, y: +(r[cY] || 0) || 0, slug: '', date, r: rt > 0 ? Math.max(1, Math.min(10, Math.round(rt * 2))) : 0, l: false,
        rw: cRw >= 0 && /^yes$/i.test((r[cRw] || '').trim()), rv: cRv >= 0 ? (r[cRv] || '').trim().slice(0, 20000) : '', sp: false,
        tg: cT >= 0 ? (r[cT] || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 8) : [], tm: 0, guid: ''});
    });
    return out;
  }
  // the RSS feed at letterboxd.com/<user>/rss/ → rows (diary items only)
  function fromRss(xml) {
    const dec = s => String(s).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    const out = [];
    for (const m of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const x = m[1];
      const raw = n => { const r = x.match(new RegExp('<' + n + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + n + '>')); return r ? r[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim() : ''; };
      const tag = n => dec(raw(n));
      const t = tag('letterboxd:filmTitle'), date = tag('letterboxd:watchedDate');
      if (!t || !isDate(date)) continue;
      const paras = [...raw('description').matchAll(/<p>([\s\S]*?)<\/p>/g)].map(p => p[1]).filter(p => !/<img\b/i.test(p));
      const text = p => dec(p.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim();
      const sp = paras.some(p => /may contain spoilers/i.test(text(p)));
      const body = paras.map(text).filter(p => p && !/may contain spoilers/i.test(p) && !/^(Re)?[Ww]atched on [^.]{4,60}\.$/.test(p) && !/^Liked on [^.]{4,60}\.$/.test(p));
      const rating = parseFloat(tag('letterboxd:memberRating'));
      out.push({t, y: +tag('letterboxd:filmYear') || 0, slug: (tag('link').match(/\/film\/([a-z0-9-]+)\//i) || [])[1] || '', date,
        r: rating > 0 ? Math.max(1, Math.min(10, Math.round(rating * 2))) : 0, l: /^yes$/i.test(tag('letterboxd:memberLike')),
        rw: /^yes$/i.test(tag('letterboxd:rewatch')), rv: body.join('\n\n').slice(0, 20000), sp: sp && body.length > 0, tg: [], tm: +tag('tmdb:movieId') || 0, guid: tag('guid')});
    }
    return out;
  }

  // which plan film a row is: by Letterboxd slug, else title and year (a year off is fine)
  function matcher(F) {
    const bySlug = {}, byTY = {};
    (F || []).forEach(f => { if (f[5]) bySlug[f[5]] = f[8]; const k = norm(f[0]) + '|' + f[1]; if (!byTY[k]) byTY[k] = f[8]; });
    return r => (r.slug && bySlug[r.slug]) || byTY[norm(r.t) + '|' + r.y] || (r.y ? byTY[norm(r.t) + '|' + (r.y - 1)] || byTY[norm(r.t) + '|' + (r.y + 1)] : '') || '';
  }
  // ---- the merge: returns the entries to set, and what happened ----
  function merge(rows, data, F, since) {
    const cur = Object.assign({}, data), sets = [];
    const set = (k, v) => { if (v === undefined || cur[k] === v || (v === null && cur[k] === undefined)) return; if (v === null) delete cur[k]; else cur[k] = v; sets.push([k, v]); };
    const planKey = matcher(F);
    const filmId = (pk, t, y, tm) => pk ? 'k:' + pk : tm ? 'tm:' + tm : 't:' + norm(t) + '|' + (y || 0);
    // what's already in the diary: film → [entry key, date]
    const idx = {};
    // entries already there match within a day (time zones); entries this import adds match only the same day,
    // so two real watches on consecutive days stay two, while reviews.csv still folds into its diary.csv row
    const note = (fid, k, d, fresh) => { (idx[fid] = idx[fid] || []).push([k, d, fresh]); };
    for (const k in cur) {
      if (k.startsWith('log:') && !k.slice(4).includes(':') && isDate(cur['v:' + k])) {
        const v = String(cur[k]);
        if (v.startsWith('k:')) note('k:' + v.slice(2), k, cur['v:' + k]);
        else if (v.startsWith('t:')) {
          const md = parse(cur['md:' + k]) || {}, t = stripYear(v.slice(2)), y = yearOf(v.slice(2)), pk = planKey({t, y});
          note(filmId(pk, t, y, 0), k, cur['v:' + k]); if (md.tm) note('tm:' + md.tm, k, cur['v:' + k]);
        }
      } else if ((k.startsWith('add:') || k.startsWith('free:')) && cur[k] && !String(cur[k]).startsWith('k:') && isDate(cur['v:' + k])) {
        const v = String(cur[k]).replace(/^t:/, ''), t = stripYear(v), y = yearOf(v);
        note(filmId(planKey({t, y}), t, y, 0), k, cur['v:' + k]);
      }
    }
    for (const f of F || []) if (isDate(cur[f[8]])) note('k:' + f[8], f[8], cur[f[8]]);
    const near = (fid, date) => (idx[fid] || []).find(([, d, fresh]) => fresh ? d === date : Math.abs(dayN(d) - dayN(date)) <= 1);
    function fill(k, r) {
      let ch = false;
      const put = (p, v) => { if (v && !cur[p + k]) { set(p + k, v); ch = true; } };
      put('r:', r.r || 0); put('l:', r.l ? 1 : 0); put('rw:', r.rw ? 1 : 0);
      if (r.rv && !cur['rv:' + k]) { set('rv:' + k, r.rv); if (r.sp) set('sp:' + k, 1); ch = true; }
      // Letterboxd habit: "w/ milad" tags say who you watched with
      const tg = r.tg || [], ww = tg.filter(x => /^w\/\s*\S/i.test(x)).map(x => x.replace(/^w\/\s*/i, '').trim());
      const rest = tg.filter(x => !/^w\/\s*\S/i.test(x));
      if (ww.length || r.ww) put('ww:', r.ww || ww.join(', '));
      if (rest.length) put('tg:', rest.join(', '));
      return ch;
    }
    const res = {added: 0, ticked: 0, merged: 0, same: 0};
    const base = Date.now().toString(36); let n = 0;
    rows.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0).forEach(r => {
      if (r.guid && cur['lb:' + r.guid]) { res.same++; return; }
      const pk = planKey(r), fid = filmId(pk, r.t, r.y, r.tm);
      const hit = near(fid, r.date) || (r.tm && !pk ? near('tm:' + r.tm, r.date) : null);
      if (hit) { if (fill(hit[0], r)) res.merged++; else res.same++; }
      else if (pk && !isDate(cur[pk]) && r.date >= since) {
        set(pk, r.date); set('sk:' + pk, null); fill(pk, r); note(fid, pk, r.date, 1); res.ticked++;
      } else {
        const id = r.guid ? 'log:lb' + String(r.guid).replace(/[^a-z0-9]/gi, '').slice(-24) : 'log:' + base + (n++).toString(36).padStart(4, '0');
        set(id, pk ? 'k:' + pk : 't:' + r.t + (r.y ? ' (' + r.y + ')' : '')); set('v:' + id, r.date);
        if (!pk && (r.tm || r.md)) set('md:' + id, JSON.stringify(Object.assign({tm: r.tm || 0, t: r.t, y: r.y || 0}, r.md || {})));
        fill(id, r); note(fid, id, r.date, 1); if (!pk && r.tm) note('tm:' + r.tm, id, r.date, 1); res.added++;
      }
      if (r.guid) set('lb:' + r.guid, r.date);
    });
    return Object.assign(res, {sets});
  }
  // the export as Letterboxd gives it (a .zip): pull out the files we read, without any library
  async function unzip(buf, wanted) {
    const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), out = {};
    let eocd = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) return null;
    let p = dv.getUint32(eocd + 16, true);
    for (let k = 0, n = dv.getUint16(eocd + 10, true); k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const m = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + el + cl;
      if (!wanted.includes(name)) continue;
      const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), data = b.subarray(start, start + cs);
      if (m === 0) out[name] = new TextDecoder().decode(data);
      else if (m === 8 && typeof DecompressionStream !== 'undefined') out[name] = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    return out;
  }
  return {csv, fromCsv, fromRss, merge, matcher, norm, unzip};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = FXLB;
