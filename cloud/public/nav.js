// Addresses for every screen, so the phone's Back button (and the browser's) steps back through the app instead of
// leaving it, and any screen can be reloaded or shared. Sheets and pop-up panels take a history step of their own,
// so Back closes them first.
//   fxNav.film(ref) / fxNav.director(name): the address of a film's or a director's page
//   fxNav.setHandler(fn): fn(url, how) shows the screen for an address ('pop' when it comes from Back or Forward)
//   fxNav.open(url): go to a new screen · fxNav.note(url): the screen already changed, record it · fxNav.replace(url)
//   fxNav.modal(id, onBack) / fxNav.unmodal(id): a sheet opened or closed (onBack returns false to stay open)
//   fxNav.restore(y): scroll back to y once the page is tall enough (Back, a reload) · fxNav.savedY(): this entry's place
const fxNav = (() => {
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = s => norm(s).replace(/ /g, '-');
  const okSlug = s => typeof s === 'string' && /^[a-z0-9-]{1,120}$/.test(s);
  // a film: its Letterboxd-style slug when known, otherwise its TMDB id (a series as tv/<id>), otherwise title and year
  function film(r) {
    r = r || {};
    if (okSlug(r.slug)) return '/film/' + r.slug;
    if (+r.tm > 0) return '/film/tmdb/' + (+r.tm);
    if (+r.tm < 0) return '/film/tv/' + (-r.tm);
    return '/film/find/' + encodeURIComponent(String(r.t || '').replace(/\s*\(\d{4}\)\s*$/, '').slice(0, 120)) + (+r.y ? '/' + (+r.y) : '');
  }
  const director = name => '/director/' + slug(name);
  // the other way: what a /film/… address asks for
  function parseFilm(path) {
    const p = path.replace(/^\/film\//, '').replace(/\/+$/, '');
    let m;
    if ((m = p.match(/^tmdb\/(\d+)$/))) return {tm: +m[1]};
    if ((m = p.match(/^tv\/(\d+)$/))) return {tm: -m[1]};
    if ((m = p.match(/^find\/([^/]+)(?:\/(\d{4}))?$/))) { let t = ''; try { t = decodeURIComponent(m[1]); } catch (e) {} return {t: t.slice(0, 120), y: +m[2] || 0}; }
    return okSlug(p) ? {slug: p} : {};
  }

  let handler = null, modal = null, skip = 0;
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  const st = () => (history.state && typeof history.state === 'object' ? history.state : {});
  // the scroll position goes with each entry, so Back returns to the same place in a long list
  function remember() { try { history.replaceState(Object.assign({}, st(), {y: Math.round(window.scrollY || 0)}), ''); } catch (e) {} }
  // leaving the page altogether (a profile's film opens the app, a reload): its place is kept the same way
  window.addEventListener('pagehide', remember);
  // going back to a place: screens that load their content (a director's films, a profile) aren't tall enough yet, so
  // keep trying as the page grows, until it gets there, the person scrolls, or a few seconds pass
  let want = null, until = 0;
  function settle() {
    if (want === null) return;
    if (Date.now() > until) { want = null; return; }
    window.scrollTo(0, want);
    if (Math.abs((window.scrollY || 0) - want) < 3) want = null;
  }
  function restore(y) { want = y > 0 ? y : null; until = Date.now() + 5000; if (want === null) window.scrollTo(0, 0); else settle(); }
  try { new ResizeObserver(() => settle()).observe(document.documentElement); } catch (e) {}
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(ev => window.addEventListener(ev, () => { want = null; }, {passive: true, capture: true}));
  function push(url, extra) {
    remember();
    history.pushState(Object.assign({app: 1, n: (st().n || 0) + 1}, extra || {}), '', url);
  }
  // a link while a sheet is open: the sheet's own history step becomes the new screen's
  function dropModal() { if (!modal) return false; modal = null; return true; }
  function open(url, how) {
    const had = dropModal();
    if (how === 'replace' || had) history.replaceState(Object.assign({}, st(), {app: 1, n: st().n || 0, m: 0}), '', url);
    else push(url);
    if (handler) handler(url, 'push');
  }
  function note(url, extra) {
    if (url === location.pathname + location.search) return;
    if (dropModal()) history.replaceState(Object.assign({}, st(), {m: 0}, extra || {}), '', url); else push(url, extra);
  }
  function replace(url) { if (url !== location.pathname + location.search) history.replaceState(Object.assign({}, st()), '', url); }
  function back(fallback) {
    if ((st().n || 0) > 0) history.back();
    else open(fallback || '/', 'replace');
  }
  function modalOpen(id, onBack) {
    if (modal) { modal = {id, onBack}; return; }  // one sheet gives way to another: same history step
    modal = {id, onBack};
    history.pushState(Object.assign({}, st(), {m: 1}), '', location.pathname + location.search);
  }
  function modalClose(id) {
    if (!modal || modal.id !== id) return;
    modal = null; skip++;
    history.back();
  }
  window.addEventListener('popstate', () => {
    if (skip) { skip--; return; }
    if (modal) {
      const m = modal; modal = null;
      if (m.onBack() === false) { modal = m; history.pushState(Object.assign({}, st(), {m: 1}), '', location.pathname + location.search); }
      return;
    }
    if (handler) handler(location.pathname + location.search, 'pop');
  });
  return {film, director, parseFilm, slug, setHandler: fn => { handler = fn; }, open, note, replace, back, modal: modalOpen, unmodal: modalClose,
    savedY: () => +st().y || 0, depth: () => st().n || 0, state: () => st(), restore, top: () => restore(0)};
})();
