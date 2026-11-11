// Runs on GitHub Actions every few hours: reads the public Letterboxd RSS feed and keeps the latest logs in
// feed.json on the "letterboxd-feed" branch. The app reads that file and adds new logs to the diary itself,
// with the same rules as its import (fxlb.js). No token or secret is involved: the feed is public already.
const fs = require('fs');
const FXLB = require('../fxlb.js');
const [oldPath, outPath] = process.argv.slice(2);
const USER = (process.env.LB_USER || '').trim();
(async () => {
  if (!/^[A-Za-z0-9_]{1,40}$/.test(USER)) throw new Error('LB_USER is not a Letterboxd username');
  const r = await fetch('https://letterboxd.com/' + USER + '/rss/', {headers: {'User-Agent': 'Mozilla/5.0 (compatible; five-years-cinema diary; +https://github.com/dantalebi/five-years-cinema)', Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'}});
  if (!r.ok) throw new Error('Letterboxd feed → HTTP ' + r.status);
  const fresh = FXLB.fromRss(await r.text());
  let old = [];
  try { old = JSON.parse(fs.readFileSync(oldPath, 'utf8')).items || []; } catch (e) {}
  // the feed only holds recent logs, so keep what earlier runs saw too (newest first, up to 400)
  const byId = {};
  old.concat(fresh).forEach(it => { if (it && it.guid) byId[it.guid] = it; });
  const items = Object.values(byId).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.guid < b.guid ? 1 : -1)).slice(0, 400);
  fs.writeFileSync(outPath, JSON.stringify({v: 1, user: USER, items}, null, 1) + '\n');
  console.log(`Feed: ${fresh.length} recent logs · ${items.length} kept.`);
})().catch(e => { console.error(String(e && e.message || e)); process.exit(1); });
