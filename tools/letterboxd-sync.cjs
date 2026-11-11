// Runs on GitHub Actions every few hours: reads the public Letterboxd RSS feed and brings new logs
// into the private sync Gist, using the same rules as the app (fxlb.js). Needs the repository secret
// FY_GIST_TOKEN: a GitHub token with only the "gist" scope. Nothing here is ever written to the repository.
const FXLB = require('../fxlb.js');
const API = 'https://api.github.com';
const TOKEN = (process.env.GIST_TOKEN || '').trim(), USER = (process.env.LB_USER || '').trim();
const SINCE = process.env.LB_SINCE || '2026-11-01';
const SYNC = 'five-years-cinema.json', PLAN = 'five-years-plan.json';

async function gh(method, path, body) {
  const r = await fetch(API + path, {method, headers: Object.assign({Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'five-years-cinema-letterboxd-sync'}, body ? {'Content-Type': 'application/json'} : {}), body: body ? JSON.stringify(body) : undefined});
  if (!r.ok) throw new Error(method + ' ' + path.replace(/[0-9a-f]{20,}/g, '…') + ' → HTTP ' + r.status);
  return r.json();
}
async function findGist(file) {
  for (let p = 1; p <= 10; p++) {
    const list = await gh('GET', '/gists?per_page=100&page=' + p);
    const g = list.find(g => g.files && g.files[file]);
    if (g) return g.id;
    if (list.length < 100) break;
  }
  return null;
}
async function fileOf(id, file) {
  const g = await gh('GET', '/gists/' + id), f = g.files[file];
  if (f.truncated && f.raw_url) { const r = await fetch(f.raw_url, {headers: {Authorization: 'Bearer ' + TOKEN}}); return r.text(); }
  return f.content;
}

(async () => {
  if (!TOKEN) { console.log('::warning::Add the repository secret FY_GIST_TOKEN (a GitHub token with the gist scope) to turn on the Letterboxd import.'); return; }
  if (!/^[A-Za-z0-9_]{1,40}$/.test(USER)) throw new Error('LB_USER is not a Letterboxd username');
  const feed = await fetch('https://letterboxd.com/' + USER + '/rss/', {headers: {'User-Agent': 'Mozilla/5.0 (compatible; five-years-cinema diary sync; +https://github.com/dantalebi/five-years-cinema)', Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'}});
  if (!feed.ok) throw new Error('Letterboxd feed → HTTP ' + feed.status);
  const rows = FXLB.fromRss(await feed.text());
  const syncId = await findGist(SYNC);
  if (!syncId) { console.log('::warning::No sync Gist yet: turn on Sync in the app first.'); return; }
  const planId = await findGist(PLAN);
  const F = planId ? (JSON.parse(await fileOf(planId, PLAN)).F || []) : [];
  let doc = {};
  try { doc = JSON.parse(await fileOf(syncId, SYNC) || '{}') || {}; } catch (e) { doc = {}; }
  const E = doc.e || {}, data = {};
  for (const k in E) { const v = E[k] && E[k][0]; if (v !== null && v !== undefined && v !== '') data[k] = v; }
  const r = FXLB.merge(rows, data, F, SINCE);
  const now = Date.now();
  r.sets.forEach(([k, v]) => { E[k] = [v, now]; });
  E['lbsync:at'] = [new Date(now).toISOString(), now];
  E['lbsync:n'] = [r.added + r.ticked + r.merged, now];
  await gh('PATCH', '/gists/' + syncId, {files: {[SYNC]: {content: JSON.stringify({v: 1, app: 'five-years-cinema', e: E})}}});
  console.log(`Feed: ${rows.length} logs · ${r.ticked} plan films ticked · ${r.added} diary entries added · ${r.merged} filled in · ${r.same} already there.`);
})().catch(e => { console.error(String(e && e.message || e)); process.exit(1); });
