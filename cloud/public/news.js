// What's new on the site: posts its owner writes (on Your site). The newest one you haven't seen sits at the top of
// Home until you read it or put it away; /news has every post. A post is plain text: a blank line starts a new
// paragraph, a line starting with "- " is a list item, and web addresses become links.
// fxNews(CS, {redraw}) → {card(), tab}: card() for Home, tab a hidden tab for mountFocus (/news).
function fxNews(CS, o) {
  const esc = fxCat.esc;
  let got = null, at = 0, busy = false;
  function load() {
    if (busy || (got && Date.now() - at < 5 * 60e3)) return;
    busy = true;
    CS.news().then(r => { busy = false; at = Date.now(); if (r.ok) { got = r.j.news || []; if (o.redraw) o.redraw(); } });
  }
  const seenAt = () => +((typeof Store !== 'undefined' && Store.data['cfg:newsSeen']) || 0);
  const day = ms => new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric'}).format(new Date(ms));
  // text → paragraphs, lists and links (everything escaped first)
  const linkify = s => esc(s).replace(/https:\/\/[^\s<>"]+[^\s<>".,;:!?)]/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u.replace(/^https:\/\//, '')}</a>`);
  function body(text) {
    return String(text || '').split(/\n{2,}/).map(block => {
      const lines = block.split('\n');
      if (lines.every(l => /^\s*-\s+/.test(l))) return `<ul>${lines.map(l => `<li>${linkify(l.replace(/^\s*-\s+/, ''))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(linkify).join('<br>')}</p>`;
    }).join('');
  }
  const by = p => p.by ? (p.by.name || '@' + p.by.username) : '';
  function card() {
    load();
    const p = (got || [])[0];
    if (!p || p.at <= seenAt()) return '';
    const plain = String(p.body).replace(/\s+/g, ' ').trim();
    return `<section class="fx-card nw-card"><div class="nw-eye"><span>What’s new</span><button type="button" class="nw-x" data-nw-done="${p.at}" aria-label="Put it away">×</button></div>`
      + `<h2 class="nw-t"><a href="/news#n${p.id}" data-app>${esc(p.title)}</a></h2><p class="nw-ex">${esc(plain.slice(0, 220))}${plain.length > 220 ? '…' : ''}</p>`
      + `<div class="fx-row"><a class="fx-btn" href="/news#n${p.id}" data-app>Read it</a></div></section>`;
  }
  const tab = {
    id: 'news', hidden: true, label: {en: 'What’s new', fa: 'What’s new'},
    view() {
      load();
      let h = `<header class="fx-head"><h1 class="fx-h1">What’s new</h1><p class="dx-lede">News from the people who run ${esc((typeof FY_CONFIG !== 'undefined' && FY_CONFIG.siteName) || 'TVC15')}.</p></header>`;
      if (!got) return h + '<p class="fx-muted">Tuning in…</p>';
      if (!got.length) return h + '<div class="fx-blank"><p class="fx-muted">Nothing yet.</p></div>';
      // reading them is seeing them
      if (got[0].at > seenAt()) setTimeout(() => Store.set('cfg:newsSeen', got[0].at), 0);
      return h + got.map(p => `<article class="fx-card nw-post" id="n${p.id}"><div class="nw-meta">${esc(day(p.at))}${by(p) ? `, ${esc(by(p))}` : ''}</div><h2 class="nw-t">${esc(p.title)}</h2><div class="nw-body" dir="auto">${body(p.body)}</div></article>`).join('');
    },
    after(el) { const m = location.hash.match(/^#(n\d+)$/), a = m && el.querySelector('#' + m[1]); if (a && !a.dataset.seen) { a.dataset.seen = 1; a.scrollIntoView({block: 'start'}); } },
    click(b) { return false; },
  };
  return {
    card, tab, body, list: () => { load(); return got || []; },
    click(b) { if (b.dataset.nwDone) { Store.set('cfg:newsSeen', +b.dataset.nwDone); if (o.redraw) o.redraw(); return true; } return false; },
    reload() { got = null; at = 0; load(); },
  };
}
