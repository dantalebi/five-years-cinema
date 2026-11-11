// The Activity tab of the multi-user site, and its home page. Three parts:
//   Friends        the latest entries of the people you follow, each with hearts, "seen it", "want to watch" and comments;
//                  then your watchlist
//   Notifications  what happened to you: reactions and comments on your films, replies after your comments, new followers
//   People         everyone on the site, to follow
// fxFriendsTab(CloudSync) → a tab for mountFocus: {id, label, view(lang), click(button, render), submit(form, render), dot()}
function fxFriendsTab(CS) {
  const T = {
    h: 'Activity', segF: 'Friends', segN: 'Notifications', segP: 'People', segT: 'Tonight',
    tH: 'What are we watching tonight?', tP: 'Pick who’s watching. Films on more than one of your watchlists come first, then films one of you loved that the others haven’t seen.',
    tWho: 'Who’s watching', tYou: 'You', tNoFriends: 'Follow a few people first.', tGo: 'Find something', tBusy: 'Going through everyone’s diaries…', tNone: 'Nothing fits yet. Add more to your watchlists, or try a different group.',
    tAgain: 'Show me another', tAlso: 'Other options', tLen: 'Running time', tAny: 'Any', tShort: 'Under 2 hours', tWant: 'Add to watchlist',
    // whose watchlist: "your watchlist", "Sara’s watchlist", "your watchlist and Sara’s", "Sara’s and Negin’s watchlists"
    why: {all: 'On everyone’s watchlist', wl: (mine, others) => {
      const poss = n => n + '’s', list = a => a.length < 3 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
      if (mine) return others.length ? 'On your watchlist and ' + list(others.map(poss)) : 'On your watchlist';
      return others.length === 1 ? 'On ' + poss(others[0]) + ' watchlist' : 'On ' + list(others.map(poss)) + ' watchlists';
    }, loved: (n, r) => n + ' gave it ' + r + ', and nobody else has seen it'},
    none: 'Follow people to see what they’re watching.', findPeople: 'Find people to follow',
    find: 'Search people', follow: 'Follow', following: 'Following', followBack: 'Follow back', followsYou: 'Follows you', loading: 'Loading…', fail: 'Couldn’t load this.', retry: 'Try again',
    alone: 'No one else is here yet. Send a friend your link.', more: 'Show more',
    heart: 'Like', seen: 'Seen it', want: 'Add to watchlist', comment: 'Comment', reply: 'Reply', send: 'Post', cPh: 'Add a comment…', del: 'Delete', you: 'you',
    nNone: 'Nothing yet. Likes, comments and new followers will show up here.',
    did: {
      h: (w, f) => `${w} liked your entry for ${f}`, s: (w, f) => `${w} has seen ${f} too`, w: (w, f) => `${w} added ${f} to their watchlist from your diary`,
      c: (w, f) => `${w} commented on your entry for ${f}`, r: (w, f) => `${w} replied to your comment on ${f}`, f: w => `${w} started following you`,
    },
    spoil: 'Review hidden (contains spoilers)', aFilm: 'a film',
    logIt: 'Log', wlH: 'Watchlist', wlNone: 'Tap the bookmark on a friend’s entry to save it here.', wlFrom: u => 'via @' + u, remove: 'Remove', wlCount: n => n + (n === 1 ? ' film' : ' films'),
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const okPoster = p => typeof p === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9._-]+$/.test(p);
  const okUser = u => /^[a-z0-9_]{3,24}$/.test(u || '');
  const okId = id => /^[a-z0-9-]{1,120}$/i.test(id || '');
  const stars = r => r ? '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '') : '';
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  const bare = t => String(t || '').replace(/\s*\(\d{4}\)\s*$/, '');
  let feed = null, re = [], inbox = null, people = null, me = '', err = false, loading = false, q = '', shown = 30, nShown = 30, redraw = null;
  let tg = {sel: new Set(), state: 'pick', list: [], i: 0, len: 'any'}, tgData = {};
  let logger = null, seg = 'f', openC = new Set(), openN = new Set(), seenBefore = null, wlOpen = false, busyKeys = new Set();
  const when = d => { try { return /^\d{4}-\d\d-\d\d$/.test(d) ? new Intl.DateTimeFormat('en-US', {day: 'numeric', month: 'short'}).format(new Date(d + 'T12:00:00')) : ''; } catch (e) { return ''; } };
  const ago = ms => {
    const m = Math.max(0, (Date.now() - ms) / 6e4);
    return m < 1 ? 'now' : m < 60 ? Math.round(m) + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : m < 10080 ? Math.round(m / 1440) + 'd' : new Intl.DateTimeFormat('en-US', {day: 'numeric', month: 'short'}).format(new Date(ms));
  };
  const S = () => (typeof Store !== 'undefined' ? Store.data : {});
  const myName = () => (CS.me() || {}).name || '';
  // your own entries, by the id the profile gives them, so notifications can name the film
  function myEntries() {
    const out = {};
    try { fxDiary(window.D, S()).forEach(e => { out[fxEntryId(e.k)] = {t: bare(e.t), y: e.y}; }); } catch (e) {}
    return out;
  }

  // ---- the watchlist: one key per film in the diary's own store, so it syncs like everything else ----
  const wlKey = e => 'wl:' + (+e.tm > 0 ? 'tm' + (+e.tm) : norm(bare(e.t)) + '|' + (+e.y || 0));
  const wlHas = e => !!(S()[wlKey(e)] || S()[wlKey({t: e.t, y: e.y, tm: 0})]);
  function wlSet(e, on, from) {
    Store.set(wlKey(e), on ? JSON.stringify({t: bare(e.t), y: +e.y || 0, tm: +e.tm || 0, p: okPoster(e.p) ? e.p : '', u: from || '', at: Date.now()}) : null);
  }
  function wlList() {
    const out = [], data = S();
    Object.keys(data).forEach(k => { if (k.startsWith('wl:') && data[k]) { try { const o = JSON.parse(data[k]); if (o && o.t) out.push(Object.assign({k}, o)); } catch (e) {} } });
    return out.sort((a, b) => (b.at || 0) - (a.at || 0));
  }

  // ---- reactions, indexed by owner/entry: [id, owner, eid, kind, text, at, who, name, film] ----
  function index(list) {
    const ix = {}, ids = new Set();
    list.forEach(([id, ou, eid, kind, text, at, xu, xn]) => {
      if (id && ids.has(id)) return; if (id) ids.add(id);
      const k = ou + '/' + eid, o = ix[k] || (ix[k] = {h: [], s: [], w: [], c: [], last: 0});
      if (kind === 'c') o.c.push({id, u: xu, n: xn, text, at}); else if (o[kind]) o[kind].push({u: xu, n: xn, at});
      o.last = Math.max(o.last, at);
    });
    Object.values(ix).forEach(o => o.c.sort((a, b) => a.at - b.at));
    return ix;
  }
  const allRe = () => re.concat(inbox ? inbox.re.concat(inbox.thr) : []);
  async function load() {
    if (loading) return;
    loading = true; err = false;
    const [f, p, ib] = await Promise.all([CS.feed(), CS.people(), CS.inbox()]);
    loading = false;
    if (!f.ok || !p.ok) err = true;
    else { feed = f.j.feed || []; re = Array.isArray(f.j.re) ? f.j.re : []; me = f.j.me || (CS.me() || {}).username || ''; people = p.j.people || []; }
    if (ib.ok) setInbox(ib.j);
    if (redraw) redraw();
  }
  const setInbox = j => { inbox = {re: Array.isArray(j.re) ? j.re : [], thr: Array.isArray(j.thr) ? j.thr : [], fol: Array.isArray(j.fol) ? j.fol : []}; };
  async function loadInbox() { const ib = await CS.inbox(); if (ib.ok) { if (!me) me = (CS.me() || {}).username || ''; setInbox(ib.j); if (redraw) redraw(); } }

  // ---- notifications: one list, newest first ----
  function notes() {
    if (!inbox) return [];
    const mine = myEntries(), out = [];
    inbox.re.forEach(r => { if (r[6] !== me) out.push({kind: r[3], id: r[0], owner: me, eid: r[2], text: r[4], at: r[5], u: r[6], n: r[7], film: (mine[r[2]] || {}).t || bare(r[8])}); });
    inbox.thr.forEach(r => out.push({kind: 'r', id: r[0], owner: r[1], eid: r[2], text: r[4], at: r[5], u: r[6], n: r[7], film: bare(r[8])}));
    inbox.fol.forEach(([u, n, at, back]) => out.push({kind: 'f', u, n, at, back}));
    return out.sort((a, b) => b.at - a.at);
  }
  const seenAt = () => +S()['cfg:inboxAt'] || 0;
  const unread = () => notes().filter(x => x.at > seenAt()).length;

  // thread: just the people and the comments, with the reply box open (under a notification)
  function reactBar(owner, eid, e, ix, self, thread) {
    const k = owner + '/' + eid, o = ix[k] || {h: [], s: [], w: [], c: []};
    const mineK = kind => o[kind].some(x => x.u === me);
    const btn = (kind, label, n, pressed) => `<button type="button" class="fx-rxb rx-${kind}" data-rx="${kind}" data-o="${owner}" data-e="${esc(eid)}" aria-pressed="${!!pressed}" aria-label="${esc(label)}" title="${esc(label)}"${busyKeys.has(k + kind) ? ' disabled' : ''}><i aria-hidden="true"></i><span>${label}</span>${n ? `<b>${n}</b>` : ''}</button>`;
    let h = thread ? '' : '<div class="fx-rx">';
    if (!self && !thread) {
      h += btn('h', T.heart, o.h.length, mineK('h')) + btn('s', T.seen, o.s.length, mineK('s'));
      if (e) h += btn('w', T.want, o.w.length, wlHas(e));
    }
    if (!thread) h += `<button type="button" class="fx-rxb rx-c" data-rc="${owner}/${esc(eid)}" aria-expanded="${openC.has(k)}" aria-label="${esc(T.comment)}" title="${esc(T.comment)}"><i aria-hidden="true"></i><span>${T.comment}</span>${o.c.length ? `<b>${o.c.length}</b>` : ''}</button></div>`;
    const who = ['h', 's', 'w'].filter(kd => o[kd].length).map(kd => `<span class="rx-${kd}"><i aria-hidden="true"></i> ${o[kd].map(x => `<bdi>${esc(x.u === me ? T.you : x.n || '@' + x.u)}</bdi>`).join(', ')}</span>`);
    if (who.length) h += `<div class="fx-rwho">${who.join('')}</div>`;
    if (o.c.length) h += `<ul class="fx-cm">${o.c.map(c => `<li><a href="/u/${c.u}"><b dir="auto">${esc(c.u === me ? T.you : c.n || '@' + c.u)}</b></a> <span dir="auto">${esc(c.text)}</span> <span class="fx-cmt">${esc(ago(c.at))}</span>${c.u === me || owner === me ? ` <button type="button" class="fx-link fx-cmdel" data-rcdel="${c.id}" aria-label="${esc(T.del)}">×</button>` : ''}</li>`).join('')}</ul>`;
    if (thread || openC.has(k)) h += `<form class="fx-cform" data-rcf="${owner}/${esc(eid)}"><input type="text" name="c" maxlength="500" dir="auto" autocomplete="off" placeholder="${esc(T.cPh)}" aria-label="${esc(T.comment)}"><button type="submit" class="fx-btn primary">${T.send}</button></form>`;
    return h;
  }
  function posterBox(e, href) {
    return `<a class="fx-apos${okPoster(e.p) ? '' : ' none'}" href="${href}" aria-hidden="true" tabindex="-1">${okPoster(e.p) ? `<img alt="" loading="lazy" src="${e.p}">` : ''}<span class="fx-pt" dir="ltr">${esc(bare(e.t))}</span></a>`;
  }
  const feedRows = () => {
    const rows = [];
    (feed || []).forEach(x => (Array.isArray(x.recent) ? x.recent : []).forEach(e => { if (e && typeof e.t === 'string' && okUser(x.u)) rows.push(Object.assign({u: x.u, n: x.n}, e)); }));
    return rows;
  };
  function feedHtml(ix) {
    const rows = feedRows();
    rows.sort((a, b) => String(b.w || '').localeCompare(String(a.w || '')) || ((ix[b.u + '/' + b.id] || {}).last || 0) - ((ix[a.u + '/' + a.id] || {}).last || 0));
    if (!rows.length) return `<p class="fx-muted">${T.none} <button type="button" class="fx-link" data-seg="p">${T.findPeople}</button></p>`;
    return `<ul class="fx-afeed">${rows.slice(0, shown).map(e => {
      const href = '/u/' + e.u + (okId(e.id) ? '#' + e.id : '');
      return `<li class="fx-actv">${posterBox(e, href)}<div class="fx-ab">
        <div class="fx-aw"><a href="/u/${e.u}"><b dir="auto">${esc(e.n || '@' + e.u)}</b></a> · <span>${esc(when(e.w))}</span></div>
        <a class="fx-at" href="${href}"><bdi>${esc(bare(e.t))}</bdi> <span class="fx-y">${+e.y || ''}</span></a>
        <div class="fx-fm"><span class="fx-mini" dir="ltr">${stars(+e.r)}</span>${e.h ? '<i class="fx-ico lk"></i>' : ''}${e.rw ? '<i class="fx-ico rw"></i>' : ''}</div>
        ${e.rx ? `<p class="fx-arx" dir="auto">${esc(e.rx)}${String(e.rx).length >= 280 ? '…' : ''}</p>` : e.rv && e.sp ? `<p class="fx-arx fx-muted">${T.spoil}</p>` : ''}
        ${okId(e.id) ? reactBar(e.u, e.id, e, ix, e.u === me) : ''}</div></li>`;
    }).join('')}</ul>${rows.length > shown ? `<div class="fx-row fx-center"><button type="button" class="fx-link" data-fr-more>${T.more}</button></div>` : ''}`;
  }
  function notesHtml(ix) {
    const list = notes(), before = seenBefore === null ? seenAt() : seenBefore;
    if (!list.length) return `<p class="fx-muted">${T.nNone}</p>`;
    const following = new Set((people || []).filter(p => p.following).map(p => p.username));
    return `<ul class="fx-notes">${list.slice(0, nShown).map(x => {
      const who = `<a href="/u/${x.u}"><b dir="auto">${esc(x.n || '@' + x.u)}</b></a>`;
      if (x.kind === 'f') {
        const back = x.back || following.has(x.u);
        return `<li class="fx-note-i nf${x.at > before ? ' fresh' : ''}"><i class="fx-nico" aria-hidden="true"></i><div class="fx-nb"><p>${T.did.f(who)} <span class="fx-cmt">${esc(ago(x.at))}</span></p></div>${back ? '' : `<button type="button" class="fx-btn primary" data-fr-follow="${x.u}" aria-pressed="false">${T.followBack}</button>`}</li>`;
      }
      const k = x.owner + '/' + x.eid, href = '/u/' + x.owner + (okId(x.eid) ? '#' + x.eid : '');
      const film = `<a class="fx-nfilm" href="${href}"><bdi>${esc(x.film || T.aFilm)}</bdi></a>`;
      const line = T.did[x.kind](who, film);
      const thread = openN.has(x.id) ? `<div class="fx-nthread">${reactBar(x.owner, x.eid, null, ix, true, true)}</div>` : '';
      return `<li class="fx-note-i n${x.kind}${x.at > before ? ' fresh' : ''}"><i class="fx-nico" aria-hidden="true"></i><div class="fx-nb"><p>${line} <span class="fx-cmt">${esc(ago(x.at))}</span></p>
        ${x.text ? `<p class="fx-nq" dir="auto">${esc(x.text)}</p>` : ''}${(x.kind === 'c' || x.kind === 'r') && !openN.has(x.id) ? `<button type="button" class="fx-link" data-rn="${x.id}">${T.reply}</button>` : ''}${thread}</div></li>`;
    }).join('')}</ul>${list.length > nShown ? `<div class="fx-row fx-center"><button type="button" class="fx-link" data-n-more>${T.more}</button></div>` : ''}`;
  }
  function wlHtml() {
    const list = wlList();
    let h = `<details class="fx-more fx-wl"${wlOpen ? ' open' : ''}><summary>${T.wlH} · ${T.wlCount(list.length)}</summary>`;
    if (!list.length) return h + `<p class="fx-muted">${T.wlNone}</p></details>`;
    h += `<ul class="fx-wll">${list.map(x => `<li>${posterBox(x, '#')}<div class="fx-ab"><span class="fx-at"><bdi>${esc(x.t)}</bdi> <span class="fx-y">${x.y || ''}</span></span>${x.u ? `<span class="fx-muted fx-small">${esc(T.wlFrom(x.u))}</span>` : ''}</div><div class="fx-wla">${logger ? `<button type="button" class="fx-btn" data-wl-log="${esc(x.k)}">${T.logIt}</button>` : ''}<button type="button" class="fx-link" data-wl-rm="${esc(x.k)}" aria-label="${esc(T.remove)}">${T.remove}</button></div></li>`).join('')}</ul>`;
    return h + '</details>';
  }
  function peopleHtml() {
    const nq = q.toLowerCase().trim();
    const list = (people || []).filter(p => okUser(p.username) && (!nq || p.username.includes(nq) || String(p.name || '').toLowerCase().includes(nq)));
    if (!(people || []).length) return `<p class="fx-muted">${T.alone}</p>`;
    return `<input type="search" class="fx-find" data-fr-q placeholder="${esc(T.find)}" aria-label="${esc(T.find)}" value="${esc(q)}" dir="auto">
      <ul class="fx-people">${list.map(p => `<li><a href="/u/${p.username}" class="fx-pn"><b dir="auto">${esc(p.name || p.username)}</b><span dir="ltr">@${p.username}</span>${p.follower ? `<span class="fx-badge">${T.followsYou}</span>` : ''}</a>
        <button type="button" class="fx-btn${p.following ? '' : ' primary'}" data-fr-follow="${p.username}" aria-pressed="${!!p.following}">${p.following ? T.following : T.follow}</button></li>`).join('')}</ul>`;
  }
  // a reaction changes on screen at once, and goes back if the site says no
  function toggle(kind, owner, eid, ft) {
    const k = owner + '/' + eid, mineRow = re.find(r => r[1] === owner && r[2] === eid && r[3] === kind && r[6] === me);
    const on = !mineRow;
    if (on) re.push([0, owner, eid, kind, '', Date.now(), me, myName(), ft || '']); else re = re.filter(r => r !== mineRow);
    busyKeys.add(k + kind); if (redraw) redraw();
    return CS.react({owner, eid, kind, on, ft}).then(r => {
      busyKeys.delete(k + kind);
      if (!r.ok) { if (on) re = re.filter(x => !(x[0] === 0 && x[1] === owner && x[2] === eid && x[3] === kind)); else re.push(mineRow); }
      if (redraw) redraw();
      return r.ok;
    });
  }
  // ---- watching together: everyone's watchlist and diary, from their profiles (yours from this device) ----
  const fkeys = f => { const out = [norm(bare(f.t)) + '|' + (+f.y || 0)]; if (+f.tm > 0) out.unshift('tm' + (+f.tm)); return out; };
  async function personData(u) {
    if (u === me) {
      const o = JSON.parse(fxShare(window.D, Object.assign({}, S(), {'cfg:pubdiary': null}), k => (typeof Posters !== 'undefined' ? Posters.src(k) : '')));
      o.wl = wlList(); return o;
    }
    if (tgData[u] && Date.now() - tgData[u].at < 5 * 60e3) return tgData[u].d;
    const r = await fetch('/api/u/' + u, {credentials: 'same-origin', cache: 'no-store'});
    if (!r.ok) return null;
    const j = await r.json(); tgData[u] = {at: Date.now(), d: j.data || {}}; return tgData[u].d;
  }
  async function findTonight() {
    tg.state = 'busy'; if (redraw) redraw();
    const who = [me].concat([...tg.sel]), names = {}; (people || []).forEach(p => { names[p.username] = p.name || '@' + p.username; }); names[me] = T.tYou;
    const all = await Promise.all(who.map(u => personData(u).catch(() => null)));
    const seenBy = new Map(), cand = new Map();
    const mark = (f, u) => fkeys(f).forEach(k => { if (!seenBy.has(k)) seenBy.set(k, new Set()); seenBy.get(k).add(u); });
    all.forEach((d, i) => { if (d) ((d.diary || []).concat(d.seen || [])).forEach(f => { if (f && typeof f.t === 'string') mark(f, who[i]); }); });
    const seenByAny = (f, except) => fkeys(f).some(k => [...(seenBy.get(k) || [])].some(u => u !== except));
    const slot = f => { const k = fkeys(f)[0]; if (!cand.has(k)) cand.set(k, {t: bare(f.t), y: +f.y || 0, tm: +f.tm || 0, p: okPoster(f.p) ? f.p : '', m: +f.m || 0, d: f.d || '', wl: new Set(), loved: []}); const c = cand.get(k); if (!c.p && okPoster(f.p)) c.p = f.p; if (!c.m && f.m) c.m = +f.m; if (!c.d && f.d) c.d = f.d; if (!c.tm && +f.tm > 0) c.tm = +f.tm; return c; };
    all.forEach((d, i) => {
      if (!d) return;
      (Array.isArray(d.wl) ? d.wl : []).forEach(f => { if (f && typeof f.t === 'string' && !seenByAny(f)) slot(f).wl.add(who[i]); });
      ((d.diary || []).concat(d.seen || [])).forEach(f => { if (f && +f.r >= 8 && !seenByAny(f, who[i])) { const c = slot(f); if (!c.loved.some(x => x[0] === who[i])) c.loved.push([who[i], +f.r]); } });
    });
    // titles that are the same film under a TMDB id and a bare title: keep the richer one
    const list = [...cand.values()].filter(c => c.wl.size || c.loved.length);
    list.forEach(c => { c.score = c.wl.size * 3 + (c.wl.size === who.length && who.length > 1 ? 4 : 0) + c.loved.reduce((a, [, r]) => a + (r - 6), 0) + Math.random() * 1.5; });
    list.sort((a, b) => b.score - a.score);
    tg.names = names; tg.who = who; tg.all = list; tg.i = 0; tg.state = 'done';
    if (redraw) redraw();
  }
  const tgList = () => (tg.all || []).filter(c => tg.len !== 'short' || !c.m || c.m < 120);
  function why(c) {
    const n = u => tg.names[u] || '@' + u, out = [];
    if (c.wl.size && c.wl.size === tg.who.length && tg.who.length > 1) out.push(T.why.all);
    else if (c.wl.size) out.push(T.why.wl(c.wl.has(me), [...c.wl].filter(u => u !== me).map(n)));
    c.loved.slice(0, 2).forEach(([u, r]) => out.push(T.why.loved(n(u), stars(r))));
    return out;
  }
  function tonightHtml() {
    const follows = (people || []).filter(p => p.following);
    let h = `<section class="fx-card fx-tgcard"><h2 class="fx-tgh">${T.tH}</h2><p class="fx-muted">${T.tP}</p>`;
    if (!follows.length) return h + `<p class="fx-muted">${T.tNoFriends} <button type="button" class="fx-link" data-seg="p">${T.findPeople}</button></p></section>`;
    h += `<div class="fx-field"><span>${T.tWho}</span><div class="fx-tgwho"><span class="fx-tgc on" aria-disabled="true">${T.tYou}</span>${follows.map(p => `<button type="button" class="fx-tgc${tg.sel.has(p.username) ? ' on' : ''}" data-tgp="${p.username}" aria-pressed="${tg.sel.has(p.username)}">${esc(p.name || '@' + p.username)}</button>`).join('')}</div></div>`;
    h += `<div class="fx-field"><span>${T.tLen}</span><div class="fx-years fx-seg">${[['any', T.tAny], ['short', T.tShort]].map(([v, l]) => `<button type="button" data-tglen="${v}" aria-pressed="${tg.len === v}">${l}</button>`).join('')}</div></div>`;
    h += `<div class="fx-row"><button type="button" class="fx-btn primary" data-tggo${tg.sel.size ? '' : ' disabled'}>${T.tGo}</button></div></section>`;
    if (tg.state === 'busy') return h + `<p class="fx-note busy">${T.tBusy}</p>`;
    if (tg.state !== 'done') return h;
    const list = tgList();
    if (!list.length) return h + `<section class="fx-card"><p class="fx-muted">${T.tNone}</p></section>`;
    const c = list[tg.i % list.length], rest = list.filter(x => x !== c).slice(0, 5);
    const wl = wlHas(c) || c.loved.some(x => x[0] === me);  // nothing to add for a film you've seen
    h += `<section class="fx-card fx-tgpick"><div class="fx-tgbig">${c.p ? `<img alt="" src="${c.p}">` : `<span class="fx-pt" dir="ltr">${esc(c.t)}</span>`}</div>
      <div class="fx-tgb"><div class="fx-at"><bdi>${esc(c.t)}</bdi> <span class="fx-y">${c.y || ''}</span></div>${c.d || c.m ? `<div class="fx-muted">${esc(c.d.split(',')[0] || '')}${c.d && c.m ? ' · ' : ''}${c.m ? Math.floor(c.m / 60) + 'h ' + (c.m % 60) + 'm' : ''}</div>` : ''}
      <ul class="fx-why">${why(c).map(w => `<li>${esc(w)}</li>`).join('')}</ul>
      <div class="fx-row"><button type="button" class="fx-btn primary" data-tgnext>${T.tAgain}</button>${wl ? '' : `<button type="button" class="fx-btn" data-tgwl>${T.tWant}</button>`}${logger && !c.loved.some(x => x[0] === me) ? `<button type="button" class="fx-btn" data-tglog>${T.logIt}</button>` : ''}</div></div></section>`;
    if (rest.length) h += `<section class="fx-card"><h2>${T.tAlso}</h2><ul class="fx-wll">${rest.map(x => `<li>${posterBox(x, '#')}<div class="fx-ab"><span class="fx-at"><bdi>${esc(x.t)}</bdi> <span class="fx-y">${x.y || ''}</span></span><span class="fx-muted fx-small">${esc(why(x)[0] || '')}</span></div><span></span></li>`).join('')}</ul></section>`;
    return h;
  }
  // a pick without a poster (a Letterboxd watchlist film, say): look it up once
  const posterTried = new Set();
  function fillPoster(c) {
    if (!c || c.p || posterTried.has(c.t + c.y) || typeof Posters === 'undefined' || !Posters.match) return;
    posterTried.add(c.t + c.y);
    Posters.match(c.t, c.y).then(m => { if (m && m.p) { c.p = 'https://image.tmdb.org/t/p/w342' + m.p; if (m.id && !c.tm) c.tm = m.id; if (redraw) redraw(); } }).catch(() => {});
  }
  const entry = (owner, eid) => feedRows().find(x => x.u === owner && x.id === eid);
  const filmOf = (owner, eid) => {
    const e = entry(owner, eid); if (e) return bare(e.t) + (e.y ? ' (' + e.y + ')' : '');
    if (owner === me) { const m = myEntries()[eid]; if (m) return m.t + (m.y ? ' (' + m.y + ')' : ''); }
    const r = allRe().find(x => x[1] === owner && x[2] === eid && x[8]); return r ? r[8] : '';
  };
  return {
    id: 'friends', label: {en: T.h, fa: T.h},
    dot: () => !!inbox && unread() > 0,
    view() {
      if (!feed && !err) load();
      const n = inbox ? unread() : 0;
      let h = `<header class="fx-head"><div class="fx-hrow"><h1 class="fx-h1">${T.h}</h1></div></header>
        <div class="fx-years fx-seg fx-aseg" role="tablist">${[['f', T.segF], ['n', T.segN], ['t', T.segT], ['p', T.segP]].map(([v, l]) => `<button type="button" role="tab" data-seg="${v}" aria-pressed="${seg === v}">${l}${v === 'n' && n ? ` <b class="fx-ncount">${n}</b>` : ''}</button>`).join('')}</div>`;
      if (err) return h + `<p class="fx-note bad">${T.fail} <button type="button" class="fx-link" data-fr-retry>${T.retry}</button></p>`;
      if (!feed) return h + `<p class="fx-note busy">${T.loading}</p>`;
      const ix = index(allRe());
      if (seg === 'n') {
        // looking at them marks them seen (they stay highlighted until you leave)
        if (seenBefore === null) seenBefore = seenAt();
        const last = notes().reduce((a, x) => Math.max(a, x.at), 0); if (last > seenAt()) setTimeout(() => Store.set('cfg:inboxAt', last), 0);
        return h + `<section class="fx-card">${notesHtml(ix)}</section>`;
      }
      if (seg === 'p') return h + `<section class="fx-card">${peopleHtml()}</section>`;
      if (seg === 't') return h + tonightHtml();
      return h + `<section class="fx-card">${feedHtml(ix)}</section><section class="fx-card">${wlHtml()}</section>`;
    },
    left() { seenBefore = null; },
    click(b, render) {
      redraw = render;
      if (b.dataset.tgp) { const u = b.dataset.tgp; if (tg.sel.has(u)) tg.sel.delete(u); else if (tg.sel.size < 5) tg.sel.add(u); tg.state = 'pick'; render(); return true; }
      if (b.dataset.tglen) { tg.len = b.dataset.tglen === 'short' ? 'short' : 'any'; tg.i = 0; render(); return true; }
      if (b.hasAttribute('data-tggo')) { findTonight().then(() => fillPoster(tgList()[0])); return true; }
      if (b.hasAttribute('data-tgnext')) { tg.i++; render(); const l = tgList(); fillPoster(l[tg.i % Math.max(1, l.length)]); return true; }
      if (b.hasAttribute('data-tgwl')) { const l = tgList(), c = l[tg.i % l.length]; if (c) { wlSet(c, true, ''); render(); } return true; }
      if (b.hasAttribute('data-tglog')) { const l = tgList(), c = l[tg.i % l.length]; if (c && logger) logger(c.t, c.y, {tm: c.tm || 0, t: c.t, y: c.y || 0, p: String(c.p || '').replace(/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+/, '')}); return true; }
      if (b.dataset.seg) { if (seg === 'n' && b.dataset.seg !== 'n') seenBefore = null; seg = b.dataset.seg; render(); window.scrollTo(0, 0); return true; }
      if (b.hasAttribute('data-fr-retry')) { err = false; feed = null; render(); return true; }
      if (b.hasAttribute('data-fr-more')) { shown += 30; render(); return true; }
      if (b.hasAttribute('data-n-more')) { nShown += 30; render(); return true; }
      if (b.dataset.rx) {
        const kind = b.dataset.rx, owner = b.dataset.o, eid = b.dataset.e, ft = filmOf(owner, eid);
        if (kind === 'w') {  // "want to watch" also puts it on your own watchlist
          const e = entry(owner, eid);
          if (e) { const on = !wlHas(e); wlSet(e, on, owner); const has = re.some(r => r[1] === owner && r[2] === eid && r[3] === 'w' && r[6] === me); if (has !== on) toggle('w', owner, eid, ft); else render(); }
          return true;
        }
        toggle(kind, owner, eid, ft); return true;
      }
      if (b.dataset.rn) { openN.clear(); openN.add(+b.dataset.rn); render(); const f = document.querySelector('.fx-nthread form input'); if (f) f.focus(); return true; }
      if (b.dataset.rc) { const k = b.dataset.rc; if (openC.has(k)) openC.delete(k); else openC.add(k); render(); const f = document.querySelector('form[data-rcf="' + CSS.escape(k) + '"] input'); if (f) f.focus(); return true; }
      if (b.dataset.rcdel) {
        const id = +b.dataset.rcdel, drop = l => l.filter(x => x[0] !== id);
        CS.react({del: id}).then(r => { if (r.ok) { re = drop(re); if (inbox) { inbox.re = drop(inbox.re); inbox.thr = drop(inbox.thr); } } render(); });
        return true;
      }
      if (b.dataset.wlRm) { Store.set(b.dataset.wlRm, null); render(); return true; }
      if (b.dataset.wlLog && logger) {
        const x = wlList().find(w => w.k === b.dataset.wlLog); if (!x) return true;
        logger(x.t, x.y, {tm: x.tm || 0, t: x.t, y: x.y || 0, p: String(x.p || '').replace(/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+/, '')});
        return true;
      }
      if (b.dataset.frFollow) {
        const u = b.dataset.frFollow, p = (people || []).find(x => x.username === u), on = p ? !p.following : true;
        if (p) p.following = on;
        if (inbox) inbox.fol.forEach(f => { if (f[0] === u) f[3] = on; });
        render();
        CS.follow(u, on).then(r => { if (!r.ok && p) p.following = !on; feed = null; load(); });
        return true;
      }
      return false;
    },
    // a comment: shown at once, saved by the site
    async submit(form, render) {
      if (!form.matches('form[data-rcf]')) return false;
      const k = form.dataset.rcf, i = k.indexOf('/'), owner = k.slice(0, i), eid = k.slice(i + 1), inp = form.elements.c, text = inp.value.trim();
      if (!text) return true;
      inp.disabled = true;
      const ft = filmOf(owner, eid), r = await CS.react({owner, eid, kind: 'c', text, ft});
      inp.disabled = false;
      if (r.ok) {
        const row = [r.j.id, owner, eid, 'c', text, r.j.at, me, myName(), ft];
        if (owner === me && inbox) inbox.re.unshift(row); else re.push(row);
        inp.value = '';
      }
      if (document.activeElement) document.activeElement.blur();
      render(); const again = document.querySelector('form[data-rcf="' + CSS.escape(k) + '"] input'); if (again) again.focus();
      return true;
    },
    // typing in the search box filters without losing focus
    input(el) { if (el.matches('[data-fr-q]')) { q = el.value; const list = el.parentNode.querySelector('.fx-people'); if (list) { const tmp = document.createElement('div'); tmp.innerHTML = peopleHtml(); list.replaceWith(tmp.querySelector('.fx-people') || document.createElement('ul')); } return true; } return false; },
    attach(render) { redraw = render; loadInbox(); setInterval(() => { if (document.visibilityState === 'visible') loadInbox(); }, 3 * 60e3); },
    reset() { feed = null; people = null; inbox = null; },
    wlOpen(v) { wlOpen = !!v; },
    setLogger(fn) { logger = fn; },
    // a film you've now logged comes off your watchlist (diary key, e.g. log:… or a plan film's key)
    wlSeen(base) {
      try {
        const data = S(), D = window.D, KI = fxKeyIdx(D), md = fxMd(data, base) || {};
        let t = md.t, y = md.y, tm = md.tm;
        if (KI[base] !== undefined) { const f = D.F[KI[base]]; t = f[0]; y = f[1]; tm = f[16] || 0; }
        else if (!t) { const v = String(data[base] || ''); if (!v.startsWith('t:')) return; t = bare(v.slice(2)); y = +(v.match(/\((\d{4})\)\s*$/) || [])[1] || 0; }
        [wlKey({t, y, tm}), wlKey({t, y, tm: 0})].forEach(k => { if (data[k]) Store.set(k, null); });
      } catch (e) {}
    },
    wl: {list: wlList, set: wlSet, has: wlHas, key: wlKey},
  };
}
