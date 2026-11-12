// A page for every film and every director, inside TVC15. Films in the catalog get everything it knows (movements,
// polls); any other film is looked up on TMDB. Your own history with the film sits on its page: the times you logged
// it (each opens its entry), whether it's in your plan, what people you follow thought; Letterboxd is one link away.
// A director's page: photo, a short biography and every film they directed, with how many you've seen.
// fxFilmPages({wl, friendsOn, ratings, planWeek, openEntry}) → {film, director}: two tabs for mountFocus that aren't in the bar;
// ratings(keys) asks the site what the people you follow made of a film (friendsOn, the recent feed, if it can't).
// openFilm(ref) / openDirector(slug) load what the page needs; setLogger(fn) is what "Log" calls.
function fxFilmPages(o) {
  const U = fxCat, esc = U.esc, num = U.num, img = U.img;
  const WL = o.wl || null;
  let logger = null, redraw = null;
  let fp = null, dp = null;   // the film and the director on show
  const cache = new Map();
  async function tmdb(path) {
    if (cache.has(path)) return cache.get(path);
    const p0 = fetch('/api/tmdb' + path, {headers: {accept: 'application/json'}, credentials: 'same-origin'}).then(r => r.ok ? r.json() : null).catch(() => null);
    const p = typeof fxTune !== 'undefined' ? fxTune.wrap(p0) : p0;  // the page waits on it: the stripe along the top
    cache.set(path, p);
    const j = await p; if (!j) cache.delete(path);
    return j;
  }
  const yearOf = d => +(String(d || '').slice(0, 4)) || 0;
  const plural = (n, one, many) => num(n) + ' ' + (n === 1 ? one : many);
  const stars = r => r ? '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '') : '';
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const genreSlug = n => U.norm(n).replace(/ /g, '-');

  // ================= a film =================
  function planFilm(ref) {
    const D = window.D; if (!D || !Array.isArray(D.F)) return null;
    const ny = ref.t ? U.norm(U.bare(ref.t)) + '|' + (+ref.y || 0) : '';
    const i = D.F.findIndex(r => (ref.slug && r[5] === ref.slug) || (+ref.tm > 0 && +r[16] === +ref.tm) || (ny && U.norm(r[0]) + '|' + r[1] === ny));
    return i >= 0 ? {i, row: D.F[i]} : null;
  }
  async function openFilm(ref) {
    const me = fp = {ref, f: null, x: null, pl: null, state: 'loading', friends: null, soc: null};
    try { await U.load(); } catch (e) {}
    if (fp !== me) return;
    me.f = U.find(ref);
    me.pl = planFilm(Object.assign({}, ref, me.f ? {slug: me.f.slug, tm: me.f.tm, t: me.f.t, y: me.f.y} : {}));
    let tm = +ref.tm || (me.f && me.f.tm) || (me.pl && +me.pl.row[16]) || 0;
    // only a title: find it on TMDB, and give the page its proper address
    if (!tm && !me.f && (ref.t || me.pl)) {
      const t = ref.t || me.pl.row[0], y = +ref.y || (me.pl && me.pl.row[1]) || 0;
      const j = await tmdb('/search/movie?query=' + encodeURIComponent(U.bare(t)) + (y ? '&year=' + y : '') + '&include_adult=false&language=en-US');
      const want = U.norm(U.bare(t)), rs = ((j && j.results) || []).filter(r => (U.norm(r.title) === want || U.norm(r.original_title) === want) && (!y || Math.abs(yearOf(r.release_date) - y) <= 1));
      if (rs[0]) { tm = rs[0].id; me.f = U.find({tm}); }
    }
    if (tm) {
      me.x = await tmdb((tm > 0 ? '/movie/' + tm : '/tv/' + -tm) + '?append_to_response=credits&language=en-US');
      if (fp !== me) return;
    }
    if (!me.f && !me.x && !me.pl) me.state = 'none';
    else {
      me.state = 'ready';
      if (!ref.slug && !(+ref.tm) && (me.f || tm)) fxNav.replace(fxNav.film(me.f || {tm}));
    }
    if (me.state === 'ready' && o.ratings) {
      const F = film();
      o.ratings(filmKeys(F)).then(j => {
        if (fp !== me) return;
        if (j && Array.isArray(j.friends)) { me.soc = j; if (redraw) redraw(); }
        else if (o.friendsOn) o.friendsOn(F, list => { if (fp === me) { me.friends = list; if (redraw) redraw(); } });
      });
    } else if (o.friendsOn) o.friendsOn(film(), list => { if (fp === me) { me.friends = list; if (redraw) redraw(); } });
    if (redraw) redraw();
  }
  // a film's keys as the site indexes everyone's films (functions/api: fkeys): its TMDB id, its title and year
  const fnorm = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 120);
  function filmKeys(F) {
    const k = [];
    if (+F.tm > 0) k.push('m' + F.tm); else if (+F.tm < 0) k.push('t' + (-F.tm));
    [F.t, F.ot].forEach(t => { const n = fnorm(t); if (n && !k.includes('n' + n + '|' + (+F.y || ''))) k.push('n' + n + '|' + (+F.y || '')); });
    return k.slice(0, 3);
  }
  // ---- the people you follow and this film: their own section ----
  const avg = list => { const r = list.filter(x => x > 0); return r.length ? r.reduce((a, b) => a + b, 0) / r.length / 2 : 0; };
  const one = x => (Math.round(x * 10) / 10).toFixed(1);
  function socialHtml() {
    const S = fp.soc; if (!S) return '';
    const fr = S.friends || [], watched = fr.filter(x => x.e.length), want = fr.filter(x => x.wl), all = S.all || {n: 0, hist: []};
    if (!watched.length && !want.length && !all.n) return '';
    const fRates = watched.map(x => (x.e.find(e => e.r) || {}).r || 0), fAvg = avg(fRates), fLiked = watched.filter(x => x.e.some(e => e.h)).length;
    const hist = (all.hist || []).slice(1, 11), max = Math.max(1, ...hist), allAvg = hist.reduce((a, c, i) => a + c * (i + 1), 0) / Math.max(1, hist.reduce((a, c) => a + c, 0)) / 2;
    const av = (x, size) => typeof fxAvatar === 'function' ? fxAvatar(x.u, x.n, x.a, size) : '';
    let h = `<section class="fx-card fp-soc"><div class="fp-soch"><h2>Friends</h2>${watched.length ? `<span class="fx-muted">${watched.length === 1 ? 'One of the people you follow has' : num(watched.length) + ' of the people you follow have'} seen it${fLiked ? `, ${fLiked === watched.length && fLiked > 1 ? 'all' : num(fLiked)} liked it` : ''}</span>` : ''}</div>`;
    // the numbers: the people you follow, everyone on the site, and how everyone's ratings fall
    const tiles = [];
    if (fAvg) tiles.push(`<div class="fp-avg"><b>${one(fAvg)}</b><span><span class="fp-st">${stars(Math.round(fAvg * 2))}</span>Friends, ${plural(fRates.filter(Boolean).length, 'rating', 'ratings')}</span></div>`);
    const allN = hist.reduce((a, c) => a + c, 0);
    if (allN > fRates.filter(Boolean).length) tiles.push(`<div class="fp-avg fp-avg2"><b>${one(allAvg)}</b><span><span class="fp-st">${stars(Math.round(allAvg * 2))}</span>Everyone on ${esc((typeof FY_CONFIG !== 'undefined' && FY_CONFIG.siteName) || 'TVC15')}, ${plural(hist.reduce((a, c) => a + c, 0), 'rating', 'ratings')}</span></div>`);
    if (tiles.length) h += `<div class="fp-sum"><div class="fp-avgs">${tiles.join('')}</div>${allN >= 3 ? `<div class="fp-hist" role="img" aria-label="How everyone rated it, from half a star to five stars: ${hist.join(', ')}">${hist.map((c, i) => `<i style="--h:${c ? Math.max(8, Math.round(c / max * 100)) : 0}%" title="${(i + 1) / 2} ★: ${c}"></i>`).join('')}<span>½</span><span>★★★★★</span></div>` : ''}</div>`;
    // each of them, newest first: what they gave it, when, and the start of their review
    if (watched.length) h += `<ul class="fp-fl">${watched.map(x => {
      const e = x.e[0], prof = '/u/' + esc(x.u), href = prof + (e.id ? '#' + esc(e.id) : ''), more = x.e.length - 1;
      const marks = (e.r ? `<span class="fp-st">${stars(e.r)}</span>` : '') + (x.e.some(z => z.h) ? '<i class="fx-ico lk" title="Liked"></i>' : '') + (e.rw ? '<i class="fx-ico rw" title="Rewatch"></i>' : '');
      const when = e.w ? U.longDay(e.w) : 'Seen, no date';
      // their name opens their profile; the date, the stars and the review open this entry
      return `<li><a class="fp-fav" href="${prof}" aria-hidden="true" tabindex="-1">${av(x, 'm')}</a><div class="fp-fb">`
        + `<div class="fp-f1"><a class="fp-fn" href="${prof}" dir="auto">${esc(x.n || '@' + x.u)}</a>${marks ? (e.id ? `<a class="fp-fe" href="${href}">${marks}</a>` : marks) : ''}</div>`
        + (e.id ? `<a class="fp-f2" href="${href}">` : '<div class="fp-f2">') + `${esc(when)}${more ? `, and ${plural(more, 'time', 'times')} before` : ''}` + (e.id ? '</a>' : '</div>')
        + (e.rx ? `<a class="fp-rx" href="${href}" dir="auto">${esc(e.rx)}${e.rx.length >= 240 ? '…' : ''}</a>` : e.sp ? `<a class="fp-rx sp" href="${href}">Their review has spoilers. Read it on their profile.</a>` : '')
        + '</div></li>';
    }).join('')}</ul>`;
    else if (fr.length || all.n) h += `<p class="fx-muted fp-none">None of the people you follow have logged it yet.</p>`;
    if (want.length) h += `<div class="fp-want"><span class="fp-stack">${want.slice(0, 6).map(x => `<a href="/u/${esc(x.u)}" title="${esc(x.n || '@' + x.u)}">${av(x, 's')}</a>`).join('')}</span><span>${want.length === 1 ? `<b dir="auto">${esc(want[0].n || '@' + want[0].u)}</b> wants to see it` : `<b dir="auto">${esc(want[0].n || '@' + want[0].u)}</b> and ${plural(want.length - 1, 'other', 'others')} want to see it`}</span></div>`;
    return h + '</section>';
  }
  // everything known about the film on show, in one shape
  function film() {
    const C = U.get(), f = fp.f, x = fp.x, pr = fp.pl && fp.pl.row, tv = x && !x.title && x.name;
    const crew = (x && x.credits && x.credits.crew) || [];
    const xd = tv ? (x.created_by || []).map(c => c.name) : crew.filter(c => c.job === 'Director').map(c => c.name);
    return {
      t: f ? f.t : x ? (x.title || x.name || '') : pr ? pr[0] : fp.ref.t || '',
      ot: f ? f.ot : x && (x.original_title || x.original_name) !== (x.title || x.name) ? (x.original_title || x.original_name || '') : '',
      y: f ? f.y : x ? yearOf(x.release_date || x.first_air_date) : pr ? pr[1] : +fp.ref.y || 0,
      rt: f && f.rt ? f.rt : x ? (x.runtime || 0) : pr ? pr[3] : 0,
      p: f && f.p ? f.p : x && U.okPath(x.poster_path) ? x.poster_path : '',
      bd: x && U.okPath(x.backdrop_path) ? x.backdrop_path : '',
      dirs: f && C ? f.d.map(k => C.dirs[k]) : xd.length ? xd.slice(0, 4) : pr ? String(pr[2] || '').split(/,\s*/).filter(Boolean) : [],
      c: f && C ? f.c.map(k => C.countries[k]) : x ? (tv ? x.origin_country || [] : (x.production_countries || []).map(c => c.iso_3166_1)).filter(c => /^[A-Z]{2}$/.test(c)) : [],
      g: f ? f.g : x ? (x.genres || []).map(g => +g.id) : [],
      ov: x ? String(x.overview || '') : '', tag: x ? String(x.tagline || '') : '',
      cast: x ? ((x.credits && x.credits.cast) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 6).map(c => String(c.name || '')).filter(Boolean) : [],
      tm: f ? f.tm : x ? (tv ? -x.id : x.id) : pr ? +pr[16] || 0 : +fp.ref.tm || 0,
      slug: f ? f.slug : pr && pr[5] ? pr[5] : fp.ref.slug || '', tv: !!tv || (f && f.tm < 0), f,
    };
  }
  function filmView() {
    let h = `<header class="fx-head dx-head"><div class="fx-hrow"><button type="button" class="fx-link fx-bk" data-fp-back>Back</button></div></header>`;
    if (!fp || fp.state === 'loading') return h + `<p class="fx-muted dx-wait">Loading…</p>`;
    if (fp.state === 'none') return h + `<section class="fx-card"><h2>Film not found</h2><p class="fx-muted">We couldn’t find this film. It may have been removed from TMDB.</p></section>`;
    const F = film(), C = U.get(), mk = U.marks(WL), seen = mk.seen(F), wl = mk.wl(F), entries = mk.entries(F);
    document.title = F.t + (F.y ? ' (' + F.y + ')' : '') + ' – ' + ((typeof FY_CONFIG !== 'undefined' && FY_CONFIG.siteName) || 'TVC15');
    const lb = F.slug ? 'https://letterboxd.com/film/' + F.slug + '/' : F.tm > 0 ? 'https://letterboxd.com/tmdb/' + F.tm + '/' : 'https://letterboxd.com/search/films/' + encodeURIComponent(F.t) + '/';
    const dn = F.dirs.map(n => `<a class="dx-a" href="${esc(fxNav.director(n))}" data-app>${esc(n)}</a>`);
    const year = F.y ? `<a class="dx-a" href="/discover/decade/${Math.floor(F.y / 10) * 10}s" data-app>${F.y}</a>` : '';
    const meta = [F.tv ? 'TV series' : '', F.rt ? U.hm(F.rt) : ''].concat(F.c.map(c => `<a class="dx-a" href="/discover/country/${c.toLowerCase()}" data-app>${esc(U.cname(c))}</a>`)).filter(Boolean);
    const gen = F.g.filter(g => U.GENRES[g] && g !== 10770).map(g => `<a class="dx-a" href="/discover/genre/${genreSlug(U.GENRES[g])}" data-app>${esc(U.GENRES[g])}</a>`);
    if (F.bd) h += `<div class="dx-bd" aria-hidden="true"><img alt="" src="${img(F.bd, 'w780')}"></div>`;
    h += `<section class="dx-fh">${U.poster(F, 'w342', 'dx-fpos')}<div class="dx-fi">
      <h1 class="dx-ft">${esc(F.t)}</h1>${F.ot ? `<p class="dx-ot">${esc(F.ot)}</p>` : ''}
      <p class="dx-by">${year ? `<span>${year}</span>` : ''}${dn.length ? `<span>Directed by ${dn.join(', ')}</span>` : ''}</p>
      ${meta.length ? `<p class="dx-meta">${meta.join('<i aria-hidden="true"></i>')}</p>` : ''}${gen.length ? `<p class="dx-meta">${gen.join('<i aria-hidden="true"></i>')}</p>` : ''}</div></section>`;
    h += `<div class="dx-acts"><button type="button" class="fx-btn${wl ? '' : ' primary'} dx-wlb" data-fp-wl aria-pressed="${wl}">${wl ? 'On your watchlist' : 'Add to watchlist'}</button>`
      + (logger ? `<button type="button" class="fx-btn" data-fp-log>${seen ? 'Log again' : 'Log'}</button>` : '')
      + (o.addToList ? `<button type="button" class="fx-btn" data-fp-addlist>Add to a list</button>` : '')
      + `<a class="fx-btn" href="${esc(lb)}" target="_blank" rel="noopener noreferrer">Letterboxd ↗</a></div>`;
    // you and this film
    const pw = fp.pl && o.planWeek ? o.planWeek(fp.pl.row[8]) : null;
    if (entries.length) {
      h += `<section class="fx-card dx-sec fp-you"><h2>${entries.length > 1 ? 'You’ve watched it ' + plural(entries.length, 'time', 'times') : 'Your diary'}</h2><ul class="fp-ents">${entries.map(e => {
        const bits = (e.r ? `<span class="fx-mini" dir="ltr">${stars(e.r)}</span>` : '') + (e.l ? '<i class="fx-ico lk" title="Liked"></i>' : '') + (e.rw ? '<i class="fx-ico rw" title="Rewatch"></i>' : '');
        return `<li><button type="button" class="fp-ent" data-fp-entry="${esc(e.k)}"><span class="fp-ed">${esc(U.longDay(e.date))}</span><span class="fp-eb">${bits || '<span class="fx-muted">No rating</span>'}</span>${e.rv ? `<span class="fp-erv" dir="auto">${esc(String(e.rv).slice(0, 220))}${String(e.rv).length > 220 ? '…' : ''}</span>` : ''}</button></li>`;
      }).join('')}</ul></section>`;
    } else if (seen) h += `<p class="dx-seen">You’ve seen this.</p>`;
    if (pw) h += `<p class="fp-plan"><span>In your plan</span> ${pw.done ? 'Watched, week ' + num(pw.w) : pw.now ? 'This week' : 'Week ' + num(pw.w) + (pw.when ? ', ' + esc(pw.when) : '')}</p>`;
    if (fp.soc) h += socialHtml();
    else if (fp.friends && fp.friends.length) {
      h += `<section class="fx-card dx-sec"><h2>People you follow</h2><ul class="fp-fr">${fp.friends.slice(0, 12).map(e => `<li><a class="fx-who" href="/u/${esc(e.u)}${e.id ? '#' + esc(e.id) : ''}">${typeof fxAvatar === 'function' ? fxAvatar(e.u, e.n, e.a, 's') : ''}<b dir="auto">${esc(e.n || '@' + e.u)}</b></a>`
        + `<span class="fx-mini" dir="ltr">${stars(+e.r)}</span>${e.h ? '<i class="fx-ico lk"></i>' : ''}${e.w ? `<span class="fx-muted">${esc(U.longDay(e.w))}</span>` : ''}${e.rx ? `<p dir="auto">${esc(String(e.rx).slice(0, 200))}</p>` : ''}</li>`).join('')}</ul></section>`;
    }
    if (F.tag || F.ov) h += `<section class="dx-ov">${F.tag ? `<p class="dx-tag">${esc(F.tag)}</p>` : ''}${F.ov ? `<p>${esc(F.ov)}</p>` : ''}${F.cast.length ? `<p class="fx-muted">Starring ${esc(F.cast.join(', '))}</p>` : ''}</section>`;
    const f = F.f;
    if (f && C) {
      const part = f.m.map(g => `<a class="dx-chip" href="/discover/${C.groups[g].kind === 'period' ? 'era' : 'movement'}/${esc(C.groups[g].id)}" data-app>${esc(C.groups[g].name)}</a>`)
        .concat(C.lenses.filter(l => f.l & (1 << l.i)).map(l => `<a class="dx-chip" href="/discover/collection/${esc(l.id)}" data-app>${esc(l.name)}</a>`));
      if (part.length) h += `<section class="fx-card dx-sec"><h2>Part of</h2><div class="dx-chips">${part.join('')}</div></section>`;
      const polls = f.cn.map((r, k) => r && U.POLLS[k] ? `<li><span>${esc(U.POLLS[k][0])}<em>${esc(U.POLLS[k][1])}</em></span><b>#${num(r)}</b></li>` : '').join('');
      if (polls) h += `<section class="fx-card dx-sec"><h2>In the polls</h2><ul class="dx-polls">${polls}</ul></section>`;
    }
    if (F.dirs.length && C) {
      const k = C.dirs.indexOf(F.dirs[0]), more = k < 0 ? [] : C.films.filter(g => g !== f && g.d.includes(k) && !(F.tm && g.tm === F.tm)).sort((a, b) => a.y - b.y);
      h += `<section class="fx-card dx-sec"><div class="dx-sh"><h2>More by ${esc(F.dirs[0])}</h2><a class="fx-link" href="${esc(fxNav.director(F.dirs[0]))}" data-app>All their films</a></div>`
        + (more.length ? `<ul class="dx-row">${more.slice(0, 12).map(g => U.cell(g, mk)).join('')}</ul>` : '') + '</section>';
    }
    return h + U.attr();
  }

  // ================= a director =================
  const titleCase = s => s.replace(/\b[a-z]/g, c => c.toUpperCase());
  async function openDirector(slug) {
    const me = dp = {slug, name: '', state: 'loading', person: null, list: [], bioOpen: false, sort: 'old'};
    try { await U.load(); } catch (e) {}
    if (dp !== me) return;
    const C = U.get(), k = U.dirIndex(slug);
    me.name = k >= 0 ? C.dirs[k] : titleCase(String(slug).replace(/-/g, ' '));
    if (redraw) redraw();
    const s = await tmdb('/search/person?query=' + encodeURIComponent(me.name) + '&include_adult=false&language=en-US');
    const want = U.norm(me.name), rs = ((s && s.results) || []).filter(p => U.norm(p.name) === want || (p.also_known_as || []).some(a => U.norm(a) === want));
    const pick = rs.sort((a, b) => (b.known_for_department === 'Directing') - (a.known_for_department === 'Directing') || (b.popularity || 0) - (a.popularity || 0))[0];
    const p = pick ? await tmdb('/person/' + pick.id + '?append_to_response=movie_credits&language=en-US') : null;
    if (dp !== me) return;
    me.person = p;
    const out = new Map();
    // TMDB's list of what they directed, with the catalog's details where it has the film
    ((p && p.movie_credits && p.movie_credits.crew) || []).filter(c => c.job === 'Director').forEach(c => {
      if (out.has('tm' + c.id)) return;
      const cf = U.find({tm: c.id});
      out.set('tm' + c.id, cf || {tm: c.id, t: c.title || '', y: yearOf(c.release_date), p: U.okPath(c.poster_path) ? c.poster_path : '', v: c.vote_count || 0, rt: 0, slug: ''});
    });
    // and anything the catalog has under their name that TMDB didn't list (a series, say)
    if (C && k >= 0) C.films.forEach(f => { if (f.d.includes(k) && !out.has('tm' + f.tm)) out.set('tm' + f.tm, f); });
    me.list = [...out.values()].filter(f => f.t);
    me.state = me.list.length || p ? 'ready' : 'none';
    if (redraw) redraw();
  }
  function dirView() {
    let h = `<header class="fx-head dx-head"><div class="fx-hrow"><button type="button" class="fx-link fx-bk" data-fp-back>Back</button></div>`;
    if (!dp) return h + '</header>';
    const p = dp.person, name = (p && p.name) || dp.name;
    document.title = name + ' – ' + ((typeof FY_CONFIG !== 'undefined' && FY_CONFIG.siteName) || 'TVC15');
    const life = p && p.birthday ? yearOf(p.birthday) + (p.deathday ? '–' + yearOf(p.deathday) : '') : '';
    h += `<div class="fx-eye">Director${life ? ', ' + esc(life) : ''}</div><h1 class="fx-h1 dx-h1">${esc(name)}</h1>${p && p.place_of_birth ? `<p class="fx-muted fp-born">Born in ${esc(p.place_of_birth)}</p>` : ''}</header>`;
    if (dp.state === 'loading') return h + `<p class="fx-muted dx-wait">Loading…</p>`;
    if (dp.state === 'none') return h + `<p class="fx-muted">We couldn’t find this director’s films.</p>`;
    const bio = p ? String(p.biography || '').trim() : '';
    if (bio || (p && U.okPath(p.profile_path))) {
      const short = bio.length > 520 && !dp.bioOpen ? bio.slice(0, 520).replace(/\s+\S*$/, '') + '…' : bio;
      h += `<section class="fp-bio">${p && U.okPath(p.profile_path) ? `<img class="fp-ph" alt="" src="${img(p.profile_path, 'w185')}">` : ''}<div>${short.split(/\n+/).map(x => `<p>${esc(x)}</p>`).join('')}${bio.length > 520 ? `<button type="button" class="fx-link" data-fp-bio>${dp.bioOpen ? 'Less' : 'More'}</button>` : ''}</div></section>`;
    }
    const mk = U.marks(WL), H = String((typeof Store !== 'undefined' && Store.data['cfg:dxh']) || ''), hs = H.includes('s');
    const ty = +today().slice(0, 4), done = dp.list.filter(f => f.y && f.y <= ty), upcoming = dp.list.filter(f => !f.y || f.y > ty);
    const seenN = done.filter(f => mk.seen(f)).length;
    const sorts = {old: (a, b) => a.y - b.y, new: (a, b) => b.y - a.y, pop: (a, b) => (b.v || 0) - (a.v || 0)};
    const list = done.filter(f => !(hs && mk.seen(f))).sort(sorts[dp.sort] || sorts.old);
    h += `<section class="fx-card dx-sec"><div class="fp-prog"><b>${plural(done.length, 'film', 'films')}</b><span>You’ve seen ${num(seenN)}</span><i><b style="width:${done.length ? Math.round(seenN / done.length * 100) : 0}%"></b></i></div>
      <div class="dx-bar"><button type="button" class="dx-tog" data-fp-hide aria-pressed="${hs}">Hide watched</button>
      <label class="dx-sort"><span>Sort by</span><select data-fp-sort aria-label="Sort by">${[['old', 'Oldest first'], ['new', 'Newest first'], ['pop', 'Popularity']].map(([k, n]) => `<option value="${k}"${dp.sort === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>`
      + (list.length ? `<ul class="dx-grid">${list.map(f => U.cell(f, mk)).join('')}</ul>` : `<p class="fx-muted">You’ve seen everything here.</p>`) + '</section>';
    if (upcoming.length) h += `<section class="fx-card dx-sec"><h2>Upcoming</h2><ul class="dx-grid">${upcoming.map(f => U.cell(f, mk)).join('')}</ul></section>`;
    return h + U.attr();
  }

  const wlRef = F => ({t: F.t, y: F.y, tm: F.tm > 0 ? F.tm : 0, p: img(F.p, 'w185')});
  const film_ = {
    id: 'film', hidden: true, label: {en: 'Film', fa: 'Film'},
    view: filmView,
    click(b, render) {
      if (b.hasAttribute('data-fp-back')) { fxNav.back('/discover'); return true; }
      if (!fp || fp.state !== 'ready') return false;
      if (b.hasAttribute('data-fp-wl') && WL) { const F = film(), r = wlRef(F), on = !WL.has(r); WL.set(r, on); render(); typeof fxOSD === 'function' && fxOSD(on ? 'On your watchlist' : 'Off your watchlist'); return true; }
      if (b.hasAttribute('data-fp-addlist') && o.addToList) { const F = film(); o.addToList({t: F.t, y: F.y, tm: F.tm, p: F.p}); return true; }
      if (b.hasAttribute('data-fp-log') && logger) {
        const F = film();
        logger(F.t, F.y, {tm: F.tm > 0 ? F.tm : 0, t: F.t, y: F.y, d: F.dirs.join(', '), m: F.rt, p: F.p, k: fp.pl ? fp.pl.row[8] : ''});
        return true;
      }
      if (b.dataset.fpEntry && o.openEntry) { o.openEntry(b.dataset.fpEntry); return true; }
      return false;
    },
  };
  const dir_ = {
    id: 'director', hidden: true, label: {en: 'Director', fa: 'Director'},
    view: dirView,
    click(b, render) {
      if (b.hasAttribute('data-fp-back')) { fxNav.back('/discover'); return true; }
      if (!dp) return false;
      if (b.hasAttribute('data-fp-bio')) { dp.bioOpen = !dp.bioOpen; render(); return true; }
      if (b.hasAttribute('data-fp-hide')) { const H = String(Store.data['cfg:dxh'] || ''), nx = (H.includes('s') ? H.replace('s', '') : H + 's').split('').sort().join(''); Store.set('cfg:dxh', nx || null); render(); return true; }
      return false;
    },
  };
  return {film: film_, director: dir_, openFilm, openDirector, url: () => fp ? fxNav.film(fp.f || fp.ref) : '/discover', dirUrl: () => dp ? '/director/' + dp.slug : '/discover',
    attach(el, render) { redraw = render; el.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-fp-sort]') && dp) { dp.sort = e.target.value; render(); } }); },
    setLogger(fn) { logger = fn; }};
}
