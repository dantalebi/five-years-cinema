// The Friends tab of the multi-user site: what the people you follow logged lately, and everyone on the site to follow.
// fxFriendsTab(CloudSync) → a tab for mountFocus: {id, label, view(lang), click(button, render)}
function fxFriendsTab(CS) {
  const TX = {
    en: {h: 'Friends', feedH: 'Lately, from people you follow', none: 'Follow people below and their latest logs show up here.', peopleH: 'People on the site',
      find: 'Find someone', follow: 'Follow', following: 'Following', followsYou: 'follows you', loading: 'Loading…', fail: 'Couldn’t load. Pull to try again.', retry: 'Try again',
      alone: 'Nobody else is here yet. Send your link to a friend.', more: 'Show more', profile: 'Profile'},
    fa: {h: 'دوستان', feedH: 'تازه‌ها از کسایی که فالو می‌کنی', none: 'پایین چند نفر رو فالو کن تا تازه‌ترین لاگ‌هاشون این‌جا بیاد.', peopleH: 'آدم‌های سایت',
      find: 'پیدا کردن', follow: 'فالو', following: 'فالو می‌کنی', followsYou: 'فالوت می‌کنه', loading: 'دارم میارم…', fail: 'باز نشد.', retry: 'دوباره',
      alone: 'هنوز کس دیگه‌ای این‌جا نیست. لینکت رو برای یه دوست بفرست.', more: 'بیشتر', profile: 'پروفایل'},
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const okPoster = p => typeof p === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9._-]+$/.test(p);
  const okUser = u => /^[a-z0-9_]{3,24}$/.test(u || '');
  const okId = id => /^[a-z0-9-]{1,120}$/i.test(id || '');
  const stars = r => r ? '★'.repeat(Math.floor(r / 2)) + (r % 2 ? '½' : '') : '';
  let feed = null, people = null, err = false, loading = false, q = '', shown = 40, lang = 'en', redraw = null;
  const T = () => TX[lang];
  const digits = s => lang === 'fa' ? String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]) : String(s);
  const when = d => { try { return /^\d{4}-\d\d-\d\d$/.test(d) ? new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {day: 'numeric', month: 'short'}).format(new Date(d + 'T12:00:00')) : ''; } catch (e) { return ''; } };
  async function load() {
    if (loading) return;
    loading = true; err = false;
    const [f, p] = await Promise.all([CS.feed(), CS.people()]);
    loading = false;
    if (!f.ok || !p.ok) { err = true; } else { feed = f.j.feed || []; people = p.j.people || []; }
    if (redraw) redraw();
  }
  function feedHtml() {
    const t = T();
    const rows = [];
    (feed || []).forEach(x => (Array.isArray(x.recent) ? x.recent : []).forEach(e => { if (e && typeof e.t === 'string' && okUser(x.u)) rows.push(Object.assign({u: x.u, n: x.n}, e)); }));
    rows.sort((a, b) => String(b.w || '').localeCompare(String(a.w || '')));
    if (!rows.length) return `<p class="fx-muted">${t.none}</p>`;
    return `<ul class="fx-feed">${rows.slice(0, shown).map(e => {
      const href = '/u/' + e.u + (okId(e.id) ? '#' + e.id : '');
      return `<li><a class="fx-fr" href="${href}"><span class="fx-pos${okPoster(e.p) ? '' : ' none'}" aria-hidden="true">${okPoster(e.p) ? `<img alt="" loading="lazy" src="${e.p}">` : ''}<span class="fx-pt" dir="ltr">${esc(e.t)}</span></span>
        <span class="fx-b"><span class="fx-ft"><bdi>${esc(e.t)}</bdi> <span class="fx-y">${+e.y || ''}</span></span>
        <span class="fx-fm"><span class="fx-mini" dir="ltr">${stars(+e.r)}</span>${e.h ? '<i class="fx-ico lk"></i>' : ''}${e.rw ? '<i class="fx-ico rw"></i>' : ''}${e.rv ? '<i class="fx-ico rv"></i>' : ''}</span>
        <span class="fx-fw"><bdi>${esc(e.n || '@' + e.u)}</bdi> · ${esc(digits(when(e.w)))}</span></span></a></li>`;
    }).join('')}</ul>${rows.length > shown ? `<div class="fx-row fx-center"><button type="button" class="fx-link" data-fr-more>${t.more}</button></div>` : ''}`;
  }
  function peopleHtml() {
    const t = T(), nq = q.toLowerCase().trim();
    const list = (people || []).filter(p => okUser(p.username) && (!nq || p.username.includes(nq) || String(p.name || '').toLowerCase().includes(nq)));
    if (!(people || []).length) return `<p class="fx-muted">${t.alone}</p>`;
    return `<input type="search" class="fx-find" data-fr-q placeholder="${esc(t.find)}" aria-label="${esc(t.find)}" value="${esc(q)}" dir="auto">
      <ul class="fx-people">${list.map(p => `<li><a href="/u/${p.username}" class="fx-pn"><b dir="auto">${esc(p.name || p.username)}</b><span dir="ltr">@${p.username}</span>${p.follower ? `<span class="fx-badge">${t.followsYou}</span>` : ''}</a>
        <button type="button" class="fx-btn${p.following ? '' : ' primary'}" data-fr-follow="${p.username}" aria-pressed="${!!p.following}">${p.following ? t.following : t.follow}</button></li>`).join('')}</ul>`;
  }
  return {
    id: 'friends', label: {en: TX.en.h, fa: TX.fa.h},
    view(L) {
      lang = L === 'fa' ? 'fa' : 'en';
      const t = T();
      if (!feed && !err) load();
      let h = `<header class="fx-head"><div class="fx-hrow"><h1 class="fx-h1">${t.h}</h1></div></header>`;
      if (err) return h + `<p class="fx-note bad">${t.fail} <button type="button" class="fx-link" data-fr-retry>${t.retry}</button></p>`;
      if (!feed) return h + `<p class="fx-note busy">${t.loading}</p>`;
      return h + `<section class="fx-card"><h2>${t.feedH}</h2>${feedHtml()}</section><section class="fx-card"><h2>${t.peopleH}</h2>${peopleHtml()}</section>`;
    },
    click(b, render) {
      redraw = render;
      if (b.hasAttribute('data-fr-retry')) { err = false; feed = null; render(); return true; }
      if (b.hasAttribute('data-fr-more')) { shown += 40; render(); return true; }
      if (b.dataset.frFollow) {
        const u = b.dataset.frFollow, p = (people || []).find(x => x.username === u); if (!p) return true;
        const on = !p.following; p.following = on; render();
        CS.follow(u, on).then(r => { if (!r.ok) p.following = !on; feed = null; load(); });
        return true;
      }
      return false;
    },
    // typing in the search box filters without losing focus
    input(el) { if (el.matches('[data-fr-q]')) { q = el.value; const list = el.parentNode.querySelector('.fx-people'); if (list) { const tmp = document.createElement('div'); tmp.innerHTML = peopleHtml(); list.replaceWith(tmp.querySelector('.fx-people') || document.createElement('ul')); } return true; } return false; },
    attach(render) { redraw = render; },
    reset() { feed = null; people = null; },
  };
}
