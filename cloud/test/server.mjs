// Local stand-in for Cloudflare Pages: static files from public/, /api/* through the real function, D1 on node:sqlite.
// node test/server.mjs [port]   — Letterboxd and TMDB are answered from test fixtures, nothing leaves the machine.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {handle} from '../functions/api/[[path]].js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PUB = path.join(ROOT, 'public'), PORT = +process.argv[2] || 8790;
const sql = new DatabaseSync(process.env.DB_FILE || ':memory:');

// the parts of D1's binding the function uses
class Stmt {
  constructor(q) { this.q = q; this.a = []; }
  bind(...a) { this.a = a; return this; }
  exec(kind) { const st = sql.prepare(this.q); return kind === 'first' ? st.get(...this.a) || null : kind === 'all' ? st.all(...this.a) : st.run(...this.a); }
  async first() { return this.exec('first'); }
  async all() { return {results: this.exec('all')}; }
  async run() { this.exec('run'); return {success: true}; }
}
const DB = {
  prepare: q => new Stmt(q),
  async batch(list) {
    sql.exec('BEGIN');
    try { const out = list.map(s => (/^\s*(SELECT|.*RETURNING)/is.test(s.q) ? {results: s.exec('all')} : (s.exec('run'), {success: true}))); sql.exec('COMMIT'); return out; }
    catch (e) { sql.exec('ROLLBACK'); throw e; }
  },
};
const env = {DB, TMDB_TOKEN: 'test-token', SIGNUP_CODE: process.env.SIGNUP_CODE || '', POP_TTL: process.env.POP_TTL || '0', OWNER: process.env.OWNER || 'boss'};

// outside services, from fixtures
const realFetch = globalThis.fetch, PEOPLE = new Map();
const FIX = path.join(ROOT, 'test', 'fixtures');
globalThis.fetch = async (url, opts) => {
  const u = new URL(typeof url === 'string' ? url : url.url);
  if (u.hostname === 'letterboxd.com') {
    const user = u.pathname.split('/')[1], f = path.join(FIX, 'rss-' + user + '.xml');
    return fs.existsSync(f) ? new Response(fs.readFileSync(f, 'utf8'), {status: 200}) : new Response('', {status: 404});
  }
  if (u.hostname === 'api.themoviedb.org') {
    if ((opts && opts.headers && opts.headers.Authorization) !== 'Bearer test-token') return new Response('{}', {status: 401});
    const q = u.searchParams.get('query'), mm = u.pathname.match(/\/(movie|tv)\/(\d+)(\/images)?$/);
    // a steady id per title, so different films stay different (the same title always gets the same id)
    const qid = q ? 1000 + [...q.toLowerCase()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 900000, 7) : 0;
    if (u.pathname.endsWith('/search/movie')) return Response.json({results: q ? [{id: qid, title: q, release_date: (u.searchParams.get('year') || '2001') + '-01-01', poster_path: '/s' + qid + '.jpg'}] : []});
    if (u.pathname.endsWith('/search/tv')) return Response.json({results: []});
    // people: a director by any name, with two films
    if (u.pathname.endsWith('/search/person')) { PEOPLE.set(qid, q); return Response.json({results: q ? [{id: qid, name: q, known_for_department: 'Directing', popularity: 5}] : []}); }
    const pm = u.pathname.match(/\/person\/(\d+)$/);
    if (pm) { const n = PEOPLE.get(+pm[1]) || 'Someone'; return Response.json({id: +pm[1], name: n, biography: n + ' is a filmmaker.', birthday: '1930-12-03', place_of_birth: 'Paris, France', profile_path: '/pp.jpg',
      movie_credits: {crew: [{id: 101, job: 'Director', title: 'Breathless', release_date: '1960-03-16', poster_path: '/br.jpg', vote_count: 9000}, {id: 777, job: 'Director', title: 'A Later Film', release_date: '1965-05-01', poster_path: '/lf.jpg', vote_count: 50}]}}); }
    if (mm && mm[3]) return Response.json({posters: [{file_path: '/a.jpg'}, {file_path: '/b.jpg'}], backdrops: [{file_path: '/bd.jpg', width: 1280, height: 720}]});
    if (mm) return Response.json({id: +mm[2], title: 'Film ' + mm[2], release_date: '1962-05-01', overview: 'A story told in fixtures.', runtime: 110, poster_path: '/p' + mm[2] + '.jpg', genres: [{id: 18}], production_countries: [{iso_3166_1: 'FR'}], original_language: 'fr',
      credits: {crew: [{job: 'Director', name: 'Agnès Varda'}], cast: [{name: 'Someone', order: 0}]}});
    return Response.json({});
  }
  return realFetch(url, opts);
};

const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain'};
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  if (url.pathname.startsWith('/api/')) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await handle(new Request(url, {method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks)}), env);
    const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
    res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let p = url.pathname;
  // like Cloudflare Pages: "pretty URLs" (/index.html → /, /x.html → /x) and the /u/* rewrite from public/_redirects
  if (/\.html$/.test(p)) { res.writeHead(308, {location: p.replace(/index\.html$/, '').replace(/\.html$/, '')}); res.end(); return; }
  // the app's own addresses (public/_redirects): all the same page
  const RW = fs.existsSync(path.join(PUB, '_redirects')) ? fs.readFileSync(path.join(PUB, '_redirects'), 'utf8').split('\n').map(l => l.trim().split(/\s+/)[0]).filter(Boolean) : [];
  if (RW.some(r => r.endsWith('/*') ? p.startsWith(r.slice(0, -1)) && p.length > r.length - 1 : p === r)) p = '/index.html';
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(PUB, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  // like Pages: the headers from public/_headers (the /* block, then the file's own block)
  const H = {}, rules = fs.readFileSync(path.join(PUB, '_headers'), 'utf8').split(/\n(?=\S)/);
  for (const block of rules) {
    const [pat, ...lines] = block.trim().split('\n');
    if (pat !== '/*' && pat !== url.pathname) continue;
    lines.forEach(l => { const i = l.indexOf(':'); if (i > 0) H[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); });
  }
  res.writeHead(200, {...H, 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': H['cache-control'] || 'no-store'});
  res.end(fs.readFileSync(f));
}).listen(PORT, () => console.log('film-diary local on http://localhost:' + PORT));
