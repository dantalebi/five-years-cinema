// Invite friends (/invite): a member makes a link for a friend. Each link lets one person join, works for two weeks,
// and opens the sign-up page with the member's name on it; it can be taken back until it's used. How many each member
// has is the owner's call (Your site); the owner has as many as they like.
// fxInvites(CS, {redraw}) → a hidden tab for mountFocus.
function fxInvites(CS, o) {
  const esc = fxCat.esc, num = fxCat.num;
  let got = null, busy = false, note = '', copied = '';
  const site = () => (typeof FY_CONFIG !== 'undefined' && FY_CONFIG.siteName) || 'TVC15';
  const link = code => location.origin + '/join/' + code;
  const day = ms => new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric'}).format(new Date(ms));
  function load(force) {
    if (busy || (got && !force)) return;
    busy = true;
    CS.invites.mine().then(r => { busy = false; got = r.ok ? r.j : {error: true}; if (o.redraw) o.redraw(); });
  }
  const after = r => { busy = false; if (r.ok) { got = r.j; note = ''; } else note = r.code === 'none-left' ? 'You’ve used all your invites.' : r.code === 'closed' ? site() + ' isn’t taking new members right now.' : 'That didn’t work. Try again.'; if (o.redraw) o.redraw(); };
  function view() {
    load();
    let h = `<header class="fx-head"><h1 class="fx-h1">Invite friends</h1><p class="dx-lede">Make a link for a friend. It lets one person join ${esc(site())}, works for two weeks, and opens the sign-up page with your name on it.</p></header>`;
    if (!got) return h + '<p class="fx-muted">Tuning in…</p>';
    if (got.error) return h + `<div class="fx-blank"><p class="fx-muted">Your invites didn’t load. Check your connection and try again.</p></div>`;
    const ask = /^https:\/\//.test(got.contact || '') ? ` <a href="${esc(got.contact)}" target="_blank" rel="noopener noreferrer">Ask the site’s owner</a> if you’d like more.` : '';
    let can = '';
    if (!got.open) can = `<p class="fx-muted">${esc(site())} isn’t taking new members right now.</p>`;
    else if (got.allowed === 0) can = `<p class="fx-muted">Invites from members are turned off for now.${ask}</p>`;
    else can = `<div class="fx-row iv-make"><button type="button" class="fx-btn primary" data-iv-make${got.left === 0 ? ' disabled' : ''}>Make an invite link</button>`
      + `<span class="fx-muted">${got.left < 0 ? '' : got.left === 0 ? 'You’ve used all your invites.' + ask : num(got.left) + (got.left === 1 ? ' invite left' : ' invites left')}</span></div>`;
    h += `<section class="fx-card">${can}${note ? `<p class="fx-note bad">${esc(note)}</p>` : ''}</section>`;
    const list = got.invites || [];
    if (list.length) h += `<section class="fx-card"><h2>Your links</h2><ul class="iv-list">${list.map(i => {
      const st = i.state === 'open' ? `Open until ${esc(day(i.expires))}` : i.state === 'used' ? (i.used ? `Used by <a href="/u/${esc(i.used)}">@${esc(i.used)}</a>` : 'Used') : i.state === 'expired' ? 'Expired' : 'Taken back';
      return `<li class="iv-${i.state}"><div class="iv-b"><code dir="ltr">${esc(link(i.code).replace(/^https?:\/\//, ''))}</code><span class="iv-st">${st}</span></div>`
        + (i.state === 'open' ? `<div class="iv-acts"><button type="button" class="fx-btn" data-iv-copy="${esc(i.code)}">${copied === i.code ? 'Copied' : 'Copy link'}</button>${navigator.share ? `<button type="button" class="fx-btn" data-iv-share="${esc(i.code)}">Share</button>` : ''}<button type="button" class="fx-link" data-iv-revoke="${esc(i.code)}">Take back</button></div>` : '')
        + '</li>';
    }).join('')}</ul></section>`;
    return h;
  }
  return {
    id: 'invite', hidden: true, label: {en: 'Invite friends', fa: 'Invite friends'},
    view,
    left() { got = null; note = ''; copied = ''; },
    click(b, render) {
      const d = b.dataset;
      if (b.hasAttribute('data-iv-make')) { if (busy) return true; busy = true; CS.invites.make().then(r => { after(r); if (r.ok && typeof fxOSD === 'function') fxOSD('Link made'); }); return true; }
      if (d.ivRevoke) { busy = true; CS.invites.revoke(d.ivRevoke).then(after); return true; }
      if (d.ivCopy) {
        const url = link(d.ivCopy);
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { copied = d.ivCopy; render(); if (typeof fxOSD === 'function') fxOSD('Link copied'); }, () => { window.prompt('Copy this link:', url); });
        return true;
      }
      if (d.ivShare && navigator.share) { navigator.share({title: site(), text: 'Join me on ' + site() + ', a film diary for friends.', url: link(d.ivShare)}).catch(() => {}); return true; }
      return false;
    },
  };
}
