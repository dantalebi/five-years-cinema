// Lists of films, as on Letterboxd: a name, a few words about it, the films (in order, numbered if it's ranked), public
// or private. A public list sits on its owner's profile and has an address anyone can open, signed in or not.
// fxLists(CloudSync, {redraw, member}) →
//   page(user, slug) the list's page (loading, then the list; its owner can edit it there) · profileTab(user) the cards
//   on a profile · addTo(film) the sheet that adds a film to your lists · click(button) / submit(form) / input(el)
function fxLists(CS, o) {
  const U = fxCat, esc = U.esc, num = U.num;
  const member = () => !!(o.member && o.member());
  const redraw = force => o.redraw && o.redraw(force);
  const okPath = p => typeof p === 'string' && /^\/[A-Za-z0-9._-]{1,80}$/.test(p);
  const img = (p, w) => okPath(p) ? 'https://image.tmdb.org/t/p/' + (w || 'w185') + p : '';
  const pathOf = p => { const m = String(p || '').match(/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+(\/[A-Za-z0-9._-]+)$/); return m ? m[1] : okPath(p) ? p : ''; };
  const href = (u, slug) => '/u/' + u + '/list/' + slug;
  const site = () => (typeof FY_CONFIG !== 'undefined' && FY_CONFIG.siteName) || 'TVC15';
  const filmHref = f => typeof fxNav !== 'undefined' ? fxNav.film({tm: +f.tm || 0, t: f.t, y: +f.y || 0}) : '';
  const fkey = f => +f.tm ? 'tm' + f.tm : U.norm(U.bare(f.t)) + '|' + (+f.y || 0);
  const day = ms => new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric'}).format(new Date(ms));

  // ---- your own lists ----
  let mine = null, mineAt = 0, mineP = null;
  function loadMine(force) {
    if (!member()) return Promise.resolve([]);
    if (mineP) return mineP;
    if (mine && !force && Date.now() - mineAt < 60e3) return Promise.resolve(mine);
    mineP = CS.lists.mine().then(r => { mineP = null; if (r.ok) { mine = r.j.lists || []; mineAt = Date.now(); } return mine || []; });
    return mineP;
  }
  const keep = l => { if (!mine) return; const i = mine.findIndex(x => x.id === l.id); if (i >= 0) mine[i] = l; else mine.unshift(l); };

  // ---- one list's page ----
  const pages = new Map();   // 'user/slug' → {state: loading|ready|none, list, by, own}
  let ed = null;             // editing: {key, name, note, pub, ranked, films, q, res, busy, del, note2}
  function load(user, slug) {
    const k = user + '/' + slug;
    if (pages.has(k)) return pages.get(k);
    const pg = {state: 'loading'}; pages.set(k, pg);
    const get = member() ? CS.lists.one(user, slug) : fetch('/api/u/' + user + '/list/' + slug).then(async r => ({ok: r.ok, j: await r.json().catch(() => null)})).catch(() => ({ok: false}));
    get.then(r => { if (r.ok && r.j && r.j.list) Object.assign(pg, {state: 'ready', list: r.j.list, by: r.j.by, own: !!r.j.own}); else pg.state = 'none'; redraw(); });
    return pg;
  }
  function page(user, slug, inApp) {
    const pg = load(user, slug), k = user + '/' + slug;
    const back = inApp ? `<div class="fx-hrow"><a class="fx-link fx-bk" href="/u/${esc(user)}" data-app>Profile</a></div>` : '';
    if (pg.state === 'loading') return `<header class="fx-head">${back}</header><p class="fx-muted">Tuning in…</p>`;
    if (pg.state === 'none') return `<header class="fx-head">${back}<h1 class="fx-h1">List not found</h1></header><p class="fx-muted">It may be private, or it was deleted.</p>`;
    const L = pg.list, by = pg.by || {}, editing = ed && ed.key === k;
    document.title = L.name + ' – ' + site();
    if (editing) return editView(pg, back);
    const av = typeof fxAvatar === 'function' ? fxAvatar(by.username, by.name, by.av, 's') : '';
    const meta = [num(L.n) + (L.n === 1 ? ' film' : ' films'), L.ranked ? 'ranked' : '', 'updated ' + day(L.updated)].filter(Boolean).join(', ');
    let h = `<header class="fx-head ls-head">${back}<a class="ls-by" href="/u/${esc(by.username)}"${inApp ? ' data-app' : ''}>${av}<span>A list by <b dir="auto">${esc(by.name || '@' + by.username)}</b></span></a>
      <h1 class="fx-h1 ls-h1" dir="auto">${esc(L.name)}</h1>${L.pub ? '' : '<span class="ls-priv">Private: only you can see it</span>'}
      ${L.note ? `<p class="ls-note" dir="auto">${esc(L.note)}</p>` : ''}<p class="ls-meta">${esc(meta)}</p>
      <div class="fx-row ls-acts">${L.pub ? `<button type="button" class="fx-btn${pg.own ? '' : ' primary'}" data-ls-share="${esc(k)}">Share</button>` : ''}${pg.own ? `<button type="button" class="fx-btn primary" data-ls-edit="${esc(k)}">Edit list</button>` : ''}</div></header>`;
    if (!L.films.length) return h + `<div class="fx-blank"><p class="fx-muted">${pg.own ? 'No films yet. Add some with Edit list, or from any film’s page.' : 'No films yet.'}</p></div>`;
    h += `<ol class="fx-pgrid ls-grid${L.ranked ? ' ranked' : ''}">${L.films.map((f, i) => {
      const lab = f.t + (f.y ? ' (' + f.y + ')' : ''), hr = inApp || member() ? filmHref(f) : (+f.tm > 0 ? 'https://letterboxd.com/tmdb/' + (+f.tm) + '/' : '');
      const pic = okPath(f.p) ? `<img src="${img(f.p)}" alt="" loading="lazy" decoding="async">` : `<span class="fx-pgt" dir="auto">${esc(f.t)}</span>`;
      const box = hr ? `<a class="fx-pg" href="${esc(hr)}"${hr.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''} title="${esc(lab)}" aria-label="${esc(lab)}">${pic}</a>` : `<span class="fx-pg" title="${esc(lab)}">${pic}</span>`;
      return `<li>${L.ranked ? `<b class="ls-rank">${i + 1}</b>` : ''}${box}${f.c ? `<span class="ls-c" dir="auto">${esc(f.c)}</span>` : ''}</li>`;
    }).join('')}</ol>`;
    if (!member()) h += `<section class="fx-card ls-cta"><h2>Make lists of your own</h2><p class="fx-muted">${esc(site())} is a film diary with a plan: log what you watch, follow friends, and keep lists like this one.</p><div class="fx-row"><a class="fx-btn primary" href="/">Create an account</a></div></section>`;
    return h;
  }

  // ---- editing a list: its name, description, public or not, ranked or not, and the films ----
  function startEdit(k) {
    const pg = pages.get(k); if (!pg || !pg.list) return;
    const L = pg.list;
    ed = {key: k, id: L.id, name: L.name, note: L.note, pub: L.pub, ranked: L.ranked, films: L.films.map(f => Object.assign({}, f)), q: '', res: null, busy: false, del: false, msg: null};
  }
  function editView(pg, back) {
    const sw = (attr, on, t, d) => `<label class="st-sw"><span><b>${t}</b><small>${d}</small></span><input type="checkbox" class="fx-sw" role="switch" ${attr}${on ? ' checked' : ''}></label>`;
    let h = `<header class="fx-head">${back}<h1 class="fx-h1">Edit list</h1></header>
      <section class="fx-card ls-ed"><label class="fx-field"><span>Name</span><input type="text" data-ls-f="name" maxlength="100" dir="auto" value="${esc(ed.name)}" required></label>
      <label class="fx-field"><span>Description</span><textarea data-ls-f="note" rows="3" maxlength="2000" dir="auto" placeholder="What brings these films together">${esc(ed.note)}</textarea></label>
      ${sw('data-ls-f="pub"', ed.pub, 'Public', 'On your profile, and anyone with the link can see it, even without an account.')}
      ${sw('data-ls-f="ranked"', ed.ranked, 'Ranked', 'Number the films in the order you put them.')}</section>
      <section class="fx-card ls-ed"><h2>${ed.films.length ? num(ed.films.length) + (ed.films.length === 1 ? ' film' : ' films') : 'Films'}</h2>
      <div class="ls-add"><input type="search" class="fx-pick-q" data-ls-q placeholder="Add a film: search by title" aria-label="Add a film: search by title" autocomplete="off" spellcheck="false" value="${esc(ed.q)}">
      ${ed.res ? `<ul class="ls-res">${ed.res.length ? ed.res.map((f, i) => { const inl = ed.films.some(x => fkey(x) === fkey(f)); return `<li><button type="button" data-ls-pick="${i}"${inl ? ' disabled' : ''}>${okPath(f.p) ? `<img src="${img(f.p, 'w92')}" alt="">` : '<i></i>'}<span><b dir="auto">${esc(f.t)}</b> ${f.y || ''}</span><em>${inl ? 'In the list' : 'Add'}</em></button></li>`; }).join('') : '<li class="fx-muted">No films found.</li>'}</ul>` : ''}</div>
      <ol class="ls-rows">${ed.films.map((f, i) => `<li><span class="ls-n">${i + 1}</span>${okPath(f.p) ? `<img src="${img(f.p, 'w92')}" alt="">` : '<i></i>'}<span class="ls-t"><b dir="auto">${esc(f.t)}</b> ${f.y || ''}</span>
        <span class="ls-mv"><button type="button" data-ls-mv="${i}:-1" aria-label="Move ${esc(f.t)} up"${i ? '' : ' disabled'}>↑</button><button type="button" data-ls-mv="${i}:1" aria-label="Move ${esc(f.t)} down"${i < ed.films.length - 1 ? '' : ' disabled'}>↓</button><button type="button" data-ls-rm="${i}" aria-label="Take ${esc(f.t)} off the list">✕</button></span></li>`).join('')}</ol></section>
      <div class="fx-row ls-save"><button type="button" class="fx-btn primary" data-ls-save${ed.busy ? ' disabled' : ''}>${ed.busy ? 'Saving…' : 'Save'}</button><button type="button" class="fx-btn" data-ls-cancel>Cancel</button></div>
      ${ed.msg ? `<p class="fx-note ${ed.msg[0]}">${esc(ed.msg[1])}</p>` : ''}
      <section class="fx-card"><h2>Delete this list</h2>${ed.del ? `<p class="fx-note bad">Delete “${esc(ed.name)}” for good? Its link stops working. The films stay in your diary.</p><div class="fx-row"><button type="button" class="fx-btn fx-danger" data-ls-delyes>Delete it</button><button type="button" class="fx-btn" data-ls-delno>Keep it</button></div>` : '<div class="fx-row"><button type="button" class="fx-link" data-ls-del>Delete list</button></div>'}</section>`;
    return h;
  }
  let qt = null, qn = 0;
  function search(q) {
    clearTimeout(qt); const n = ++qn;
    if (q.trim().length < 2) { if (ed.res) { ed.res = null; redraw(true); refocus(); } return; }
    qt = setTimeout(async () => {
      let res = [];
      try { res = typeof Posters !== 'undefined' ? await Posters.search(q.trim()) : []; } catch (e) {}
      if (!ed || n !== qn) return;
      ed.res = res.map(f => ({t: f.t, y: f.y, tm: f.id, p: f.p}));
      redraw(true); refocus();
    }, 300);
  }
  const refocus = () => { const i = document.querySelector('[data-ls-q]'); if (i) { i.focus({preventScroll: true}); i.setSelectionRange(i.value.length, i.value.length); } };
  async function save() {
    const pg = pages.get(ed.key); if (!pg) return;
    if (!ed.name.trim()) { ed.msg = ['bad', 'Give the list a name.']; redraw(); return; }
    ed.busy = true; ed.msg = null; redraw();
    const r = await CS.lists.update(ed.id, {name: ed.name, note: ed.note, pub: ed.pub, ranked: ed.ranked, films: ed.films});
    ed.busy = false;
    if (!r.ok) { ed.msg = ['bad', CS.say ? CS.say(r.code) : 'Couldn’t save it. Try again.']; redraw(); return; }
    pg.list = r.j.list; keep(r.j.list); ed = null; redraw();
    if (typeof fxOSD === 'function') fxOSD('Saved');
  }

  // ---- a profile's lists ----
  const tabs = new Map();    // user → {state, lists}
  let newOpen = false, newBusy = false, newMsg = '';
  function profileTab(user, own) {
    let t = tabs.get(user);
    if (!t) { t = {state: 'loading'}; tabs.set(user, t); (member() ? CS.lists.of(user) : fetch('/api/u/' + user + '/lists').then(async r => ({ok: r.ok, j: await r.json().catch(() => null)}))).then(r => { t.state = r.ok ? 'ready' : 'none'; t.lists = r.ok && r.j ? r.j.lists || [] : []; redraw(); }); }
    let h = '';
    if (own) h += newOpen ? `<form class="fx-form ls-new" data-ls-new><input type="text" name="name" maxlength="100" dir="auto" placeholder="Name of the new list" aria-label="Name of the new list" required><label class="fx-check"><input type="checkbox" name="pub" checked> Public</label><button type="submit" class="fx-btn primary"${newBusy ? ' disabled' : ''}>Create</button>${newMsg ? `<p class="fx-note bad">${esc(newMsg)}</p>` : ''}</form>`
      : `<div class="fx-row"><button type="button" class="fx-btn primary" data-ls-newopen>New list</button></div>`;
    if (t.state === 'loading') return h + '<p class="fx-muted">Tuning in…</p>';
    if (!t.lists.length) return h + `<div class="fx-blank"><p class="fx-muted">${own ? 'No lists yet. Make one here, or from any film’s page with Add to a list.' : 'No public lists yet.'}</p></div>`;
    return h + `<ul class="ls-cards">${t.lists.map(l => `<li><a class="ls-card" href="${esc(href(user, l.slug))}" data-app><span class="ls-stack">${[0, 1, 2, 3, 4].map(i => { const p = pathOf((l.posters || [])[i]); return p ? `<img src="${img(p, 'w154')}" alt="" loading="lazy">` : '<i></i>'; }).join('')}</span>`
      + `<b dir="auto">${esc(l.name)}</b><small>${num(l.n)} ${l.n === 1 ? 'film' : 'films'}${l.pub ? '' : ', private'}</small></a></li>`).join('')}</ul>`;
  }

  // ---- add a film to your lists (from its page) ----
  let sh = null, shEl = null;   // {film, busy: Set of list ids}
  function addTo(film) {
    if (!member()) return;
    sh = {film: {t: U.bare(String(film.t || '')), y: +film.y || 0, tm: +film.tm || 0, p: pathOf(film.p)}, busy: new Set(), msg: ''};
    if (!shEl) { shEl = document.body.appendChild(document.createElement('div')); shEl.className = 'fx-sheetwrap ls-wrap'; shEl.addEventListener('click', shClick); shEl.addEventListener('submit', shSubmit); }
    shEl.hidden = false; document.documentElement.classList.add('fx-lock');
    if (typeof fxNav !== 'undefined') fxNav.modal('lists', () => { shClose(true); return true; });
    shRender(); loadMine(true).then(shRender);
  }
  const has = (l, f) => l.films.some(x => fkey(x) === fkey(f));
  function shRender() {
    if (!sh || !shEl) return;
    const f = sh.film;
    shEl.innerHTML = `<div class="fx-scrim" data-lsx></div><div class="fx fx-sheet ls-sheet" dir="ltr" lang="en" role="dialog" aria-modal="true" aria-label="Add to a list"><div class="fx-shbody">
      <div class="fx-shh"><h2 class="fx-h2">Add to a list</h2><button type="button" class="fx-btn primary" data-lsx>Done</button></div>
      <p class="fx-muted ls-for" dir="auto">${esc(f.t)}${f.y ? ' (' + f.y + ')' : ''}</p>
      ${mine === null ? '<p class="fx-muted">Tuning in…</p>' : mine.length ? `<ul class="ls-pick">${mine.map(l => { const on = has(l, f); return `<li><button type="button" data-lstog="${l.id}" aria-pressed="${on}"${sh.busy.has(l.id) ? ' disabled' : ''}><span><b dir="auto">${esc(l.name)}</b><small>${num(l.n)} ${l.n === 1 ? 'film' : 'films'}${l.pub ? '' : ', private'}</small></span><i aria-hidden="true"></i></button></li>`; }).join('')}</ul>` : '<p class="fx-muted">You don’t have any lists yet.</p>'}
      <form class="fx-form ls-new" data-lsnew><input type="text" name="name" maxlength="100" dir="auto" placeholder="A new list" aria-label="Name of a new list" required><label class="fx-check"><input type="checkbox" name="pub" checked> Public</label><button type="submit" class="fx-btn">Create and add</button></form>
      ${sh.msg ? `<p class="fx-note bad">${esc(sh.msg)}</p>` : ''}</div></div>`;
  }
  function shClose(byBack) {
    if (!shEl || shEl.hidden) return;
    shEl.hidden = true; shEl.innerHTML = ''; sh = null; document.documentElement.classList.remove('fx-lock');
    if (!byBack && typeof fxNav !== 'undefined') fxNav.unmodal('lists');
    redraw();
  }
  async function shClick(e) {
    const b = e.target.closest('button, .fx-scrim'); if (!b || !sh) return;
    if (b.hasAttribute('data-lsx')) { shClose(); return; }
    const id = +b.dataset.lstog; if (!id) return;
    const l = (mine || []).find(x => x.id === id); if (!l || sh.busy.has(id)) return;
    const f = sh.film, on = !has(l, f);
    const films = on ? l.films.concat([f]) : l.films.filter(x => fkey(x) !== fkey(f));
    sh.busy.add(id); shRender();
    const r = await CS.lists.update(id, {films});
    if (!sh) return;
    sh.busy.delete(id);
    if (r.ok) { keep(r.j.list); invalidate(r.j.list); if (typeof fxOSD === 'function') fxOSD(on ? 'Added' : 'Taken off'); } else sh.msg = 'Couldn’t change that list. Try again.';
    shRender();
  }
  async function shSubmit(e) {
    const f = e.target.closest('form[data-lsnew]'); if (!f || !sh) return;
    e.preventDefault();
    const name = f.elements.name.value.trim(); if (!name) return;
    const r = await CS.lists.create({name, pub: f.elements.pub.checked, films: [sh.film]});
    if (!sh) return;
    if (r.ok) { if (mine) mine.unshift(r.j.list); invalidate(r.j.list); if (typeof fxOSD === 'function') fxOSD('List made'); } else sh.msg = r.code === 'full' ? 'That’s the most lists you can have.' : 'Couldn’t make the list. Try again.';
    shRender();
  }
  // what's shown elsewhere goes stale when a list changes
  function invalidate(l) {
    const me = (CS.me && CS.me() || {}).username;
    if (me) { tabs.delete(me); pages.delete(me + '/' + l.slug); }
  }

  return {
    page, profileTab, addTo, loadMine,
    reset(user) { if (user) tabs.delete(user); ed = null; },
    // the clicks on list pages and profile tabs (the sheet handles its own)
    click(b) {
      const d = b.dataset;
      if (d.lsShare) {
        const pg = pages.get(d.lsShare); if (!pg || !pg.list) return true;
        const [u, slug] = d.lsShare.split('/'), url = location.origin + href(u, slug);
        if (navigator.share) navigator.share({title: pg.list.name, url}).catch(() => {});
        else (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { if (typeof fxOSD === 'function') fxOSD('Link copied'); }, () => { if (typeof fxOSD === 'function') fxOSD('Couldn’t copy'); });
        return true;
      }
      if (d.lsEdit) { startEdit(d.lsEdit); redraw(); window.scrollTo(0, 0); return true; }
      if (!ed && !b.hasAttribute('data-ls-newopen')) return false;
      if (b.hasAttribute('data-ls-newopen')) { newOpen = true; newMsg = ''; redraw(); const i = document.querySelector('form[data-ls-new] input'); if (i) i.focus(); return true; }
      if (b.hasAttribute('data-ls-cancel')) { ed = null; redraw(); return true; }
      if (b.hasAttribute('data-ls-save')) { save(); return true; }
      if (d.lsPick !== undefined) { const f = ed.res && ed.res[+d.lsPick]; if (f && !ed.films.some(x => fkey(x) === fkey(f))) ed.films.push({t: f.t, y: f.y, tm: f.tm, p: f.p}); redraw(); return true; }
      if (d.lsMv) { const [i, dir] = d.lsMv.split(':').map(Number), j = i + dir; if (ed.films[i] && ed.films[j]) { const x = ed.films[i]; ed.films[i] = ed.films[j]; ed.films[j] = x; } redraw(); return true; }
      if (d.lsRm !== undefined) { ed.films.splice(+d.lsRm, 1); redraw(); return true; }
      if (b.hasAttribute('data-ls-del')) { ed.del = true; redraw(); return true; }
      if (b.hasAttribute('data-ls-delno')) { ed.del = false; redraw(); return true; }
      if (b.hasAttribute('data-ls-delyes')) {
        const id = ed.id, k = ed.key;
        CS.lists.remove(id).then(r => { if (!r.ok) return; if (mine) mine = mine.filter(x => x.id !== id); pages.delete(k); const u = k.split('/')[0]; tabs.delete(u); ed = null; if (typeof fxOSD === 'function') fxOSD('Deleted'); if (o.open) o.open('/u/' + u); });
        return true;
      }
      return false;
    },
    submit(f) {
      if (!f.matches('form[data-ls-new]')) return false;
      const name = f.elements.name.value.trim(); if (!name || newBusy) return true;
      newBusy = true; redraw();
      CS.lists.create({name, pub: f.elements.pub.checked}).then(r => {
        newBusy = false;
        if (!r.ok) { newMsg = 'Couldn’t make the list. Try again.'; redraw(); return; }
        newOpen = false; if (mine) mine.unshift(r.j.list); invalidate(r.j.list);
        const me = (CS.me() || {}).username, k = me + '/' + r.j.list.slug;
        pages.set(k, {state: 'ready', list: r.j.list, by: {username: me, name: (CS.me() || {}).name || '', av: (CS.me() || {}).av || 0}, own: true});
        startEdit(k); if (o.open) o.open(href(me, r.j.list.slug));
      });
      return true;
    },
    // typing in the edit form keeps what's typed (the page is drawn again on every change)
    input(el) {
      if (!ed || !el.matches) return false;
      if (el.matches('[data-ls-q]')) { ed.q = el.value; search(el.value); return true; }
      const f = el.dataset && el.dataset.lsF;
      if (f === 'name' || f === 'note') { ed[f] = el.value; return true; }
      if (f === 'pub' || f === 'ranked') { ed[f] = el.checked; return true; }
      return false;
    },
    editing: () => !!ed,
  };
}
