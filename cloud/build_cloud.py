"""Build the multi-user site (Cloudflare Pages) into public/: the shared app files plus the account layer.
The server is functions/api/[[path]].js, which Cloudflare deploys from the same folder."""
import hashlib, json, os, re, shutil, subprocess

SRC, W5, SITE5, TPL = '/home/claude/web5/src/', '/home/claude/work5/', '/home/claude/web5/site/', '/home/claude/tpl/site/'
HERE = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = HERE + 'public/'

shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
for f in ('store.js', 'posters.js', 'share.js', 'fxlist.js', 'fxlb.js', 'play.js'):
    shutil.copy(SRC + f, OUT + f)
for f in ('focus.js', 'focus.css', 'fxcal.js'):
    shutil.copy(W5 + f, OUT + f)
for f in ('app.css', 'brand.js', 'cloudsync.js', 'nav.js', 'catalog.js', 'friends.js', 'home.js', 'lists.js', 'popular.js', 'admin.js', 'planmap.js', 'discover.js', 'filmpage.js', 'planner.js', 'avatar.js', 'account.js', 'cloud.js'):
    shutil.copy(HERE + 'src/' + f, OUT + f)
# the logo's icons and share image, drawn by brand/render.cjs from src/brand.js (drawn again if they're missing)
if not os.path.exists(HERE + 'brand/out/og.jpg'):
    subprocess.run(['node', HERE + 'brand/render.cjs'], check=True)
for f in ('icon.svg', 'icon32.png', 'apple-touch-icon.png', 'icon192.png', 'icon512.png', 'maskable512.png', 'og.jpg'):
    shutil.copy(HERE + 'brand/out/' + f, OUT + f)
shutil.copy(TPL + 'sample-plan.json', OUT + 'sample-plan.json')
# the Discover catalog, as the GitHub Action last built it (catalog/build.mjs); without one, Discover says it's on its way
if os.path.exists(HERE + 'catalog/dist/catalog.json'):
    os.makedirs(OUT + 'catalog')
    shutil.copy(HERE + 'catalog/dist/catalog.json', OUT + 'catalog/catalog.json')

# The site's name. MOVED: an old address that now sends everyone to the new one (empty: none).
NAME = 'TVC15'
MOVED_FROM, MOVED_TO = 'film-diary-cdo.pages.dev', 'https://tvc15.pages.dev'
open(OUT + 'config.js', 'w').write(f'''// The site's name and language.
const FY_CONFIG = {{siteName: '{NAME}', siteNameFa: '{NAME}', lang: 'en'}};
''' + (f'''// the site moved: the old address sends you to the same page at the new one
if (location.hostname === '{MOVED_FROM}') location.replace('{MOVED_TO}' + location.pathname + location.search + location.hash);
''' if MOVED_TO else ''))

DESC = 'A film diary with a plan. Log what you watch, follow your friends, and pick tonight’s film together.'
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
       # connect-src: the offline worker fetches posters and fonts itself, and the worker obeys the policy sent with sw.js
       "img-src 'self' data: blob: https://image.tmdb.org; connect-src 'self' https://image.tmdb.org https://fonts.googleapis.com https://fonts.gstatic.com; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'; frame-ancestors 'none'")
scripts = ('config.js', 'brand.js', 'store.js', 'posters.js', 'fxcal.js', 'focus.js', 'fxlb.js', 'play.js', 'share.js', 'fxlist.js', 'cloudsync.js', 'nav.js', 'catalog.js', 'friends.js', 'home.js', 'lists.js', 'popular.js', 'admin.js', 'planmap.js', 'discover.js', 'filmpage.js', 'planner.js', 'avatar.js', 'account.js', 'cloud.js')
# Archivo at every width and weight (the look's one typeface); Vazirmatn for anything written in Persian
fonts = ('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&family=Vazirmatn:wght@400;500;700;800&display=swap">')
BOOT = subprocess.run(['node', '-e', "process.stdout.write(require(process.argv[1]).mark({h: 77, id: 'boot'}))", HERE + 'src/brand.js'], capture_output=True, text=True, check=True).stdout
# absolute paths throughout: the same page also answers at /u/<name>
index = f'''<!doctype html>
<html dir="ltr" lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP.replace("; frame-ancestors 'none'", '')}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="theme-color" content="#EDEFEA" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121D1B" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="{NAME}">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/icon32.png" sizes="32x32">
<meta name="description" content="{DESC}">
<meta property="og:type" content="website">
<meta property="og:title" content="{NAME}">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<title>{NAME}</title>
{fonts}
<link rel="stylesheet" href="/app.css">
<link rel="stylesheet" href="/focus.css">
</head>
<body>
<main id="root"><div class="boot" role="status" aria-label="Loading {NAME}">{BOOT}</div></main>
<noscript><p class="boot">This page needs JavaScript.</p></noscript>
''' + ''.join(f'<script src="/{s}"></script>\n' for s in scripts) + '</body>\n</html>\n'
assert 'dantalebi' not in index and 'Danial' not in index
open(OUT + 'index.html', 'w').write(index)

man = json.load(open(SITE5 + 'manifest.webmanifest'))
man.update({'name': NAME, 'short_name': NAME, 'description': DESC, 'start_url': '/', 'scope': '/', 'background_color': '#121D1B', 'theme_color': '#121D1B'})
for ic in man.get('icons', []):
    ic['src'] = '/' + ic['src'].lstrip('./')
json.dump(man, open(OUT + 'manifest.webmanifest', 'w'), ensure_ascii=False, indent=1)

# Cloudflare Pages: headers for every file
# every screen has an address (nav.js); all of them are the same page
APP_PATHS = ['/u/*', '/plan/*', '/film/*', '/director/*', '/discover', '/discover/*', '/popular', '/popular/*', '/admin', '/activity', '/activity/*', '/week', '/diary', '/stats', '/settings', '/settings/*', '/plan', '/list', '/about']
# (an exact path rewritten to /index.html gets redirected to / by Pages' pretty URLs, so those go to / itself)
open(OUT + '_redirects', 'w').write(''.join(f'{p}  {"/index.html" if p.endswith("*") else "/"}  200\n' for p in APP_PATHS))
open(OUT + '_headers', 'w').write(f'''/*
  Content-Security-Policy: {CSP}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000
  X-Frame-Options: DENY
/sw.js
  Cache-Control: no-cache
/config.js
  Cache-Control: no-cache
''')

# ---- offline shell: the app's files from the cache; pages (/, /u/<name>) are the same index.html; /api never cached ----
# no /index.html in the list: Pages answers it with a redirect to /, and a page served from a stored redirect fails to open
shell = ['/'] + ['/' + s for s in scripts] + ['/focus.css', '/app.css', '/sample-plan.json', '/manifest.webmanifest', '/icon.svg', '/icon32.png', '/apple-touch-icon.png', '/icon192.png', '/icon512.png', '/maskable512.png']
h = hashlib.sha256()
for f in ['/index.html'] + shell[1:]:
    h.update(open(OUT + f.lstrip('/'), 'rb').read())
sw = open(SRC + 'sw.js').read()
sw = sw.replace("'fy-__HASH__'", f"'fd-{h.hexdigest()[:12]}'").replace('__SHELL__', json.dumps(shell))
sw = sw.replace("k.startsWith('fy-')", "k.startsWith('fd-')")
old = "  if (u.origin === self.location.origin) {\n"
assert sw.count(old) == 1
# pages (/, /u/<name>): the network first, so a new version shows at once; offline, the stored page, rebuilt so it's never a redirect
sw = sw.replace(old, old + "    if (u.pathname.startsWith('/api/')) return;\n"
                "    if (req.mode === 'navigate') {\n"
                "      e.respondWith(fetch(req).catch(() => caches.open(V).then(c => c.match('/')).then(hit => hit ? new Response(hit.body, {status: 200, headers: hit.headers}) : Response.error())));\n"
                "      return;\n"
                "    }\n")
# the Discover catalog (a megabyte or two, rebuilt monthly): the stored copy at once, a fresh one fetched behind it for next time
old = "    e.respondWith(caches.open(V).then(c => c.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req))));\n"
assert sw.count(old) == 1
sw = sw.replace(old, "    if (u.pathname.startsWith('/catalog/')) {\n"
                "      e.respondWith(caches.open('fx-catalog').then(async c => {\n"
                "        const hit = await c.match(req, {ignoreSearch: true});\n"
                "        const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; });\n"
                "        if (hit) { e.waitUntil(net.catch(() => {})); return hit; }\n"
                "        return net;\n"
                "      }));\n"
                "      return;\n"
                "    }\n" + old)
# posters drawn into a canvas (the year-in-film picture) are fetched with CORS: those go straight to TMDB, never from the
# cache, which holds the ordinary (opaque) copies
old = "  if (u.host === 'image.tmdb.org' || u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {\n"
assert sw.count(old) == 1
sw = sw.replace(old, old + "    if (req.mode === 'cors' && u.host === 'image.tmdb.org') return;\n")
# the version also covers the worker's own code, so a change to how it works replaces the old one's stored files
sw = re.sub(r"'fd-[0-9a-f]{12}'", "'fd-" + hashlib.sha256((h.hexdigest() + sw).encode()).hexdigest()[:12] + "'", sw)
# every outside host the worker fetches must be allowed by the policy it runs under, or those images fail
for host in re.findall(r"u\.host === '([^']+)'", sw):
    assert 'https://' + host in CSP.split('connect-src')[1].split(';')[0], host
open(OUT + 'sw.js', 'w').write(sw)
for f in sorted(os.listdir(OUT)):
    if os.path.isfile(OUT + f): print(f, os.path.getsize(OUT + f))
