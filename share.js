// Read-only page for friends: this week's films only, read from a public-subset gist.
(function () {
  const root = document.getElementById('root');
  const id = (location.hash.match(/^#([0-9a-f]{20,40})$/i) || [])[1];
  const fa = n => Number(n).toLocaleString('fa-IR');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const jd = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day: 'numeric', month: 'long'});
  const pdate = v => { try { return /^\d{4}-\d\d-\d\d$/.test(v) ? jd.format(new Date(v + 'T12:00:00')) : ''; } catch (e) { return ''; } };
  const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return !isFinite(m) ? '' : m < 1 ? 'همین الان' : m < 60 ? fa(m) + ' دقیقه پیش' : m < 1440 ? fa(Math.round(m / 60)) + ' ساعت پیش' : fa(Math.round(m / 1440)) + ' روز پیش'; };
  const okPoster = p => typeof p === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9._-]+$/.test(p);
  const okSlug = l => typeof l === 'string' && /^[a-z0-9-]+$/.test(l);
  function shell(inner) { root.innerHTML = `<div class="fx fx-share${inner.includes('fx-pos') ? ' fx-hasp' : ''}">${inner}</div>`; }
  function render(data, updated) {
    const films = Array.isArray(data.films) ? data.films : [];
    let h = `<header class="fx-head"><div class="fx-hrow"><h1 class="fx-h1">این هفته چی می‌بینم</h1></div>${updated ? `<p class="fx-muted">به‌روز شده ${ago(updated)}</p>` : ''}</header>`;
    if (data.end) h += '<section class="fx-rest"><p>برنامه‌ی پنج‌ساله تموم شده.</p></section>';
    else if (data.rest && !films.length) h += '<section class="fx-rest"><p>این هفته برنامه نداره؛ هفته‌ی آزاده.</p></section>';
    else {
      const seen = films.filter(f => f.w).length;
      if (films.length) h += `<div class="fx-dots" aria-label="${fa(seen)} از ${fa(films.length)}">${films.map(f => `<i class="${f.w ? 'on' : ''}"></i>`).join('')}</div>`;
      h += '<ul class="fx-list">' + films.map(f => {
        const link = okSlug(f.l) ? `https://letterboxd.com/film/${f.l}/` : '';
        const title = link ? `<a class="fx-film" href="${link}" target="_blank" rel="noopener noreferrer">${esc(f.t)}</a>` : `<span class="fx-film" dir="auto">${esc(f.t)}</span>`;
        const pos = `<span class="fx-pos${okPoster(f.p) ? '' : ' none'}" aria-hidden="true">${okPoster(f.p) ? `<img alt="" loading="lazy" src="${f.p}">` : ''}<span class="fx-pt" dir="ltr">${esc(f.t)}</span></span>`;
        const meta = [f.d ? `<bdi>${esc(f.d)}</bdi>` : '', f.m ? `<span>${fa(f.m)} دقیقه</span>` : ''].join('');
        const watched = f.w ? `<span class="fx-seen">دیدمش${pdate(f.w) ? ' · ' + pdate(f.w) : ''}</span>` : '';
        return `<li class="fx-i fx-ro${f.w ? ' done' : ''}"><span class="fx-chk" aria-hidden="true">${f.w ? '✓' : ''}</span>${pos}<div class="fx-b"><div>${title}${f.y ? ` <span class="fx-y">${f.y}</span>` : ''}</div><div class="fx-m">${meta}</div>${watched}</div><span></span></li>`;
      }).join('') + '</ul>';
    }
    h += '<footer class="fx-foot fx-muted" dir="ltr">Posters: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</footer>';
    shell(h);
  }
  async function load() {
    if (!id) { shell('<header class="fx-head"><h1 class="fx-h1">این لینک کامل نیست</h1></header>'); return; }
    try {
      const r = await fetch('https://api.github.com/gists/' + id, {cache: 'no-store', headers: {Accept: 'application/vnd.github+json'}});
      if (r.status === 404) { shell('<header class="fx-head"><h1 class="fx-h1">این لینک دیگه فعال نیست</h1></header>'); return; }
      if (!r.ok) throw new Error('http');
      const g = await r.json(), f = g.files && g.files['five-years-share.json'];
      if (!f) throw new Error('nofile');
      render(JSON.parse(f.content || '{}'), g.updated_at);
    } catch (e) {
      if (!root.querySelector('.fx-list')) shell('<header class="fx-head"><h1 class="fx-h1">الان باز نشد</h1></header><p class="fx-muted">چند دقیقه‌ی دیگه دوباره امتحان کن.</p>');
    }
  }
  load();
  setInterval(() => { if (document.visibilityState === 'visible') load(); }, 300000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
})();
