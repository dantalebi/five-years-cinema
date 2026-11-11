// Runs on GitHub Actions every few hours, in a copy of the "letterboxd-feed" branch:
//  - feed.json: the latest logs from your public Letterboxd RSS feed. The app reads it and adds new logs to the
//    diary itself, with the same rules as its import (fxlb.js).
//  - friends/<username>.json: the public logs of the friends listed on your published profile, kept and added to
//    over time, so visitors can compare their taste with yours. Only titles, years, ratings and dates — no reviews.
// No token or secret is involved: the feeds and the profile are public already.
const fs = require('fs'), path = require('path');
const FXLB = require('../fxlb.js');
const [dir] = process.argv.slice(2);
const USER = (process.env.LB_USER || '').trim();
const okUser = u => /^[A-Za-z0-9_]{1,40}$/.test(u || '');
const UA = {'User-Agent': 'Mozilla/5.0 (compatible; five-years-cinema diary; +https://github.com/dantalebi/five-years-cinema)', Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'};
const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const newest = (a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.guid < b.guid ? 1 : -1);

async function rss(user) {
  const r = await fetch('https://letterboxd.com/' + user + '/rss/', {headers: UA});
  if (r.status === 404) return {missing: true};
  if (!r.ok) throw new Error('Letterboxd feed for ' + user + ' → HTTP ' + r.status);
  const xml = await r.text(), title = (xml.match(/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  return {items: FXLB.fromRss(xml), name: title.replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/^Letterboxd\s*-\s*/i, '').trim().slice(0, 60)};
}

(async () => {
  if (!okUser(USER)) throw new Error('LB_USER is not a Letterboxd username');
  // your own feed: the feed only holds recent logs, so keep what earlier runs saw too (newest first, up to 400)
  const mine = await rss(USER);
  if (mine.missing) throw new Error('No Letterboxd user ' + USER);
  const byId = {};
  ((read(path.join(dir, 'feed.json')) || {}).items || []).concat(mine.items).forEach(it => { if (it && it.guid) byId[it.guid] = it; });
  const items = Object.values(byId).sort(newest).slice(0, 400);
  fs.writeFileSync(path.join(dir, 'feed.json'), JSON.stringify({v: 1, user: USER, items}, null, 1) + '\n');
  console.log(`Feed: ${mine.items.length} recent logs · ${items.length} kept.`);

  // friends: the usernames listed on the published profile (a public gist)
  const gist = (process.env.SHARE_GIST || '').trim(), owner = (process.env.GITHUB_REPOSITORY_OWNER || '').trim();
  if (!/^[0-9a-f]{20,40}$/.test(gist) || !owner) return;
  let list = [];
  try {
    const r = await fetch(`https://gist.githubusercontent.com/${owner}/${gist}/raw/five-years-share.json?t=${Date.now()}`);
    if (r.ok) list = ((await r.json()).lbf || []).filter(okUser).map(u => u.toLowerCase()).slice(0, 100);
    else { console.log('Profile not readable (HTTP ' + r.status + '); friends left as they are.'); return; }
  } catch (e) { console.log('Profile not readable; friends left as they are.'); return; }
  const fdir = path.join(dir, 'friends');
  fs.mkdirSync(fdir, {recursive: true});
  // someone taken off the list: their file goes too
  fs.readdirSync(fdir).forEach(f => { if (f.endsWith('.json') && !list.includes(f.slice(0, -5))) { fs.unlinkSync(path.join(fdir, f)); console.log('Friend removed: ' + f.slice(0, -5)); } });
  // each friend's feed is read about every three hours (new friends right away), so an hourly run stays light
  let n = 0;
  for (const u of list) {
    const file = path.join(fdir, u + '.json'), old = read(file) || {};
    if (old.at && Date.now() - Date.parse(old.at) < 170 * 60e3) continue;
    if (n++) await sleep(1500);
    try {
      const got = await rss(u);
      if (got.missing) { fs.writeFileSync(file, JSON.stringify({v: 1, user: u, missing: true, at: new Date().toISOString()}) + '\n'); console.log(`Friend ${u}: no such user.`); continue; }
      const seen = {};
      (old.items || []).concat(got.items.map(x => ({t: x.t, y: x.y, tm: x.tm, r: x.r, l: x.l ? 1 : 0, rw: x.rw ? 1 : 0, d: x.date, s: x.slug, g: x.guid})))
        .forEach(x => { if (x && x.g) seen[x.g] = x; });
      const all = Object.values(seen).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0).slice(0, 3000);
      fs.writeFileSync(file, JSON.stringify({v: 1, user: u, name: got.name || old.name || '', at: new Date().toISOString(), items: all}) + '\n');
      console.log(`Friend ${u}: ${got.items.length} recent logs · ${all.length} kept.`);
    } catch (e) { console.log(`Friend ${u}: ${e.message} (kept what was there).`); }
  }
})().catch(e => { console.error(String(e && e.message || e)); process.exit(1); });
