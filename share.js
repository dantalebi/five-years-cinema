// Read-only page for friends: this week's films only, read from a public-subset gist.
(function () {
  const root = document.getElementById('root');
  const id = (location.hash.match(/^#([0-9a-f]{20,40})$/i) || [])[1];
  let lang = 'en';
  const TX = {
    en: {title: 'What I’m watching this week', updated: a => 'Updated ' + a, end: 'The five-year plan is complete.', rest: 'No films this week — a free week.', watched: 'Watched', min: n => n + ' min',
      bad: 'This link is incomplete', gone: 'This link is no longer active', fail: 'Couldn’t load right now', later: 'Try again in a few minutes.',
      ago: m => m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'},
    fa: {title: 'این هفته چی می‌بینم', updated: a => 'به‌روز شده ' + a, end: 'برنامه‌ی پنج‌ساله تموم شده.', rest: 'این هفته برنامه نداره؛ هفته‌ی آزاده.', watched: 'دیدمش', min: n => n + ' دقیقه',
      bad: 'این لینک کامل نیست', gone: 'این لینک دیگه فعال نیست', fail: 'الان باز نشد', later: 'چند دقیقه‌ی دیگه دوباره امتحان کن.',
      ago: m => m < 1 ? 'همین الان' : m < 60 ? m + ' دقیقه پیش' : m < 1440 ? Math.round(m / 60) + ' ساعت پیش' : Math.round(m / 1440) + ' روز پیش'},
  };
  const T = () => TX[lang];
  const fa = n => lang === 'fa' ? Number(n).toLocaleString('fa-IR') : String(n);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const jd = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day: 'numeric', month: 'long'}), ed = new Intl.DateTimeFormat('en-US', {day: 'numeric', month: 'short'});
  const pdate = v => { try { return /^\d{4}-\d\d-\d\d$/.test(v) ? (lang === 'fa' ? jd : ed).format(new Date(v + 'T12:00:00')) : ''; } catch (e) { return ''; } };
  const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return !isFinite(m) ? '' : T().ago(m).replace(/\d+/g, d => fa(d)); };
  const okPoster = p => typeof p === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9._-]+$/.test(p);
  const okSlug = l => typeof l === 'string' && /^[a-z0-9-]+$/.test(l);
  function shell(inner) {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'; document.title = T().title;
    root.innerHTML = `<div class="fx fx-share${inner.includes('fx-pos') ? ' fx-hasp' : ''}" dir="${lang === 'fa' ? 'rtl' : 'ltr'}">${inner}</div>`;
  }
  function render(data, updated) {
    lang = data.lang === 'fa' ? 'fa' : 'en';
    const t = T(), films = Array.isArray(data.films) ? data.films : [];
    let h = `<header class="fx-head"><div class="fx-hrow"><h1 class="fx-h1">${t.title}</h1></div>${updated ? `<p class="fx-muted">${t.updated(ago(updated))}</p>` : ''}</header>`;
    if (data.end) h += `<section class="fx-rest"><p>${t.end}</p></section>`;
    else if (data.rest && !films.length) h += `<section class="fx-rest"><p>${t.rest}</p></section>`;
    else {
      const seen = films.filter(f => f.w).length;
      if (films.length) h += `<div class="fx-dots" aria-label="${fa(seen)} / ${fa(films.length)}">${films.map(f => `<i class="${f.w ? 'on' : ''}"></i>`).join('')}</div>`;
      h += '<ul class="fx-list">' + films.map(f => {
        const link = okSlug(f.l) ? `https://letterboxd.com/film/${f.l}/` : '';
        const title = link ? `<a class="fx-film" href="${link}" target="_blank" rel="noopener noreferrer">${esc(f.t)}</a>` : `<span class="fx-film" dir="auto">${esc(f.t)}</span>`;
        const pos = `<span class="fx-pos${okPoster(f.p) ? '' : ' none'}" aria-hidden="true">${okPoster(f.p) ? `<img alt="" loading="lazy" src="${f.p}">` : ''}<span class="fx-pt" dir="ltr">${esc(f.t)}</span></span>`;
        const meta = [f.d ? `<bdi>${esc(f.d)}</bdi>` : '', f.m ? `<span>${t.min(fa(f.m))}</span>` : ''].join('');
        const watched = f.w ? `<span class="fx-seen">${t.watched}${pdate(f.w) ? ' · ' + pdate(f.w) : ''}</span>` : '';
        return `<li class="fx-i fx-ro${f.w ? ' done' : ''}"><span class="fx-chk" aria-hidden="true">${f.w ? '✓' : ''}</span>${pos}<div class="fx-b"><div>${title}${f.y ? ` <span class="fx-y">${f.y}</span>` : ''}</div><div class="fx-m">${meta}</div>${watched}</div><span></span></li>`;
      }).join('') + '</ul>';
    }
    h += '<footer class="fx-foot fx-muted" dir="ltr">Posters: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</footer>';
    shell(h);
  }
  async function load() {
    if (!id) { shell(`<header class="fx-head"><h1 class="fx-h1">${T().bad}</h1></header>`); return; }
    try {
      const r = await fetch('https://api.github.com/gists/' + id, {cache: 'no-store', headers: {Accept: 'application/vnd.github+json'}});
      if (r.status === 404) { shell(`<header class="fx-head"><h1 class="fx-h1">${T().gone}</h1></header>`); return; }
      if (!r.ok) throw new Error('http');
      const g = await r.json(), f = g.files && g.files['five-years-share.json'];
      if (!f) throw new Error('nofile');
      render(JSON.parse(f.content || '{}'), g.updated_at);
    } catch (e) {
      if (!root.querySelector('.fx-list')) shell(`<header class="fx-head"><h1 class="fx-h1">${T().fail}</h1></header><p class="fx-muted">${T().later}</p>`);
    }
  }
  load();
  setInterval(() => { if (document.visibilityState === 'visible') load(); }, 300000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
})();
