"""Build the multi-user site (Cloudflare Pages) into public/: the shared app files plus the account layer.
The server is functions/api/[[path]].js, which Cloudflare deploys from the same folder."""
import hashlib, json, os, re, shutil

SRC, W5, SITE5, TPL = '/home/claude/web5/src/', '/home/claude/work5/', '/home/claude/web5/site/', '/home/claude/tpl/site/'
HERE = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = HERE + 'public/'

shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
for f in ('store.js', 'posters.js', 'share.js', 'fxlist.js', 'fxlb.js', 'play.js', 'app.css'):
    shutil.copy(SRC + f, OUT + f)
for f in ('focus.js', 'focus.css', 'fxcal.js'):
    shutil.copy(W5 + f, OUT + f)
for f in ('cloudsync.js', 'friends.js', 'cloud.js'):
    shutil.copy(HERE + 'src/' + f, OUT + f)
for f in ('icon32.png', 'apple-touch-icon.png', 'icon192.png', 'icon512.png', 'maskable512.png'):
    shutil.copy(SITE5 + f, OUT + f)
shutil.copy(TPL + 'sample-plan.json', OUT + 'sample-plan.json')
shutil.copy('/home/claude/web5/og/og_tpl.jpg', OUT + 'film-diary.jpg')

open(OUT + 'config.js', 'w').write('''// The site's name, and the language a first-time visitor sees (each person picks their own afterwards).
const FY_CONFIG = {siteName: 'Film Diary', siteNameFa: 'دفتر فیلم', lang: 'fa'};
''')

DESC = 'One week of films at a time, a diary of everything you watch, and your friends’.'
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
       "img-src 'self' data: https://image.tmdb.org; connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'; frame-ancestors 'none'")
scripts = ('config.js', 'store.js', 'posters.js', 'fxcal.js', 'focus.js', 'fxlb.js', 'play.js', 'share.js', 'fxlist.js', 'cloudsync.js', 'friends.js', 'cloud.js')
fonts = re.search(r'<link rel="stylesheet" href="https://fonts[^>]+>', open(SITE5 + 'index.html').read()).group(0)
# absolute paths throughout: the same page also answers at /u/<name>
index = f'''<!doctype html>
<html dir="ltr" lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP.replace("; frame-ancestors 'none'", '')}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="theme-color" content="#EEEFF2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1014" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Film Diary">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" href="/icon32.png" sizes="32x32">
<meta name="description" content="{DESC}">
<meta property="og:type" content="website">
<meta property="og:title" content="Film Diary">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="/film-diary.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<title>Film Diary</title>
{fonts}
<link rel="stylesheet" href="/app.css">
<link rel="stylesheet" href="/focus.css">
</head>
<body>
<main id="root"><p class="boot">Film Diary…</p></main>
<noscript><p class="boot">This page needs JavaScript.</p></noscript>
''' + ''.join(f'<script src="/{s}"></script>\n' for s in scripts) + '</body>\n</html>\n'
assert 'dantalebi' not in index and 'Danial' not in index
open(OUT + 'index.html', 'w').write(index)

man = json.load(open(SITE5 + 'manifest.webmanifest'))
man.update({'name': 'Film Diary', 'short_name': 'Film Diary', 'description': DESC, 'start_url': '/', 'scope': '/'})
for ic in man.get('icons', []):
    ic['src'] = '/' + ic['src'].lstrip('./')
json.dump(man, open(OUT + 'manifest.webmanifest', 'w'), ensure_ascii=False, indent=1)

# Cloudflare Pages: every /u/<name> is the same page; headers for every file
open(OUT + '_redirects', 'w').write('/u/*  /index.html  200\n')
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
shell = ['/', '/index.html'] + ['/' + s for s in scripts] + ['/focus.css', '/app.css', '/sample-plan.json', '/manifest.webmanifest', '/icon32.png', '/apple-touch-icon.png', '/icon192.png', '/icon512.png', '/maskable512.png']
h = hashlib.sha256()
for f in shell[1:]:
    h.update(open(OUT + f.lstrip('/'), 'rb').read())
sw = open(SRC + 'sw.js').read()
sw = sw.replace("'fy-__HASH__'", f"'fd-{h.hexdigest()[:12]}'").replace('__SHELL__', json.dumps(shell))
sw = sw.replace("k.startsWith('fy-')", "k.startsWith('fd-')")
old = "  if (u.origin === self.location.origin) {\n"
assert sw.count(old) == 1
sw = sw.replace(old, old + "    if (u.pathname.startsWith('/api/')) return;\n"
                "    if (req.mode === 'navigate') { e.respondWith(caches.open(V).then(c => c.match('/index.html')).then(hit => hit || fetch(req))); return; }\n")
open(OUT + 'sw.js', 'w').write(sw)
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(OUT + f))
