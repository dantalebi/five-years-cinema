"""The Discover catalog's seed: which films, and how they rank. Only derived numbers leave this script.
Inputs (kept out of the repo): the panel's Letterboxd ratings and the canon lists (allcinema.json), and the five-year plan.
Output: catalog/seed.json, one row per film: [slug, title, year, quality 0-100, reach 0-100, canon flags, plan group, plan lane, directors]
  quality: a Bayesian average of the panel's ratings, as a percentile across the catalog (no raw averages, no counts)
  reach:   how many of the panel have seen it, as a percentile
  canon:   S&S critics, S&S directors, TSPDT 1000 rank, TSPDT 21st-century rank, Criterion Closet
  directors: as Letterboxd or the plan names them, where known (they confirm which TMDB film a title is)
"""
import json, re, sys, collections, bisect
SRC, PLAN, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(SRC)); plan = json.load(open(PLAN))
ty = lambda s: (re.sub(r'\s*\((\d{4})\)\s*$', '', s), int(m.group(1)) if (m := re.search(r'\((\d{4})\)\s*$', s)) else 0)

watch = collections.defaultdict(set); rates = collections.defaultdict(dict); likes = collections.defaultdict(set); title = {}
for acc, items in d['rows'].items():
    who = acc.split(':')[0]
    for slug, tt, r, lk in items:
        title.setdefault(slug, tt); watch[slug].add(who)
        if r: rates[slug][who] = r
        if lk: likes[slug].add(who)
canon = collections.defaultdict(dict)
for name, items in d['lists'].items():
    for i, (slug, tt, *_r) in enumerate(items):
        title.setdefault(slug, tt); canon[slug][name] = i + 1
planned, dirs = {}, {}
for f in plan['F']:
    if f[5]:
        planned[f[5]] = (f[13], f[6]); title.setdefault(f[5], f'{f[0]} ({f[1]})')
        if f[2]: dirs[f[5]] = [x.strip() for x in f[2].split(',') if x.strip()][:3]
for slug, x in d.get('details', {}).items():
    if x.get('dirs'): dirs[slug] = list(x['dirs'])[:3]

# which films: anything canonical or planned, anything three or more of the panel have seen, and pairs that both rated well
def keep(s):
    if s in canon or s in planned: return True
    n = len(watch[s])
    if n >= 3: return True
    rs = list(rates[s].values())
    return n == 2 and len(rs) == 2 and sum(rs) / 2 >= 7
films = [s for s in title if keep(s)]

# quality: Bayesian average of the 1-10 ratings (likes add half a point), pulled toward the panel's mean
allr = [r for s in films for r in rates[s].values()]
C, M = sum(allr) / len(allr), 4
def bayes(s):
    rs = [r + (0.5 if who in likes[s] else 0) for who, r in rates[s].items()]
    return (sum(rs) + M * C) / (len(rs) + M)
qs = {s: bayes(s) for s in films}
qsorted = sorted(qs.values()); nsorted = sorted(len(watch[s]) for s in films)
def pct(arr, v): return round(bisect.bisect_left(arr, v) / max(1, len(arr) - 1) * 100)
CN = ['ss_critics', 'ss_directors', 'tspdt_1000', 'tspdt_21c', 'criterion_closet']
rows = []
for s in films:
    t, y = ty(title[s])
    c = canon.get(s, {})
    g, l = planned.get(s, (-1, ''))
    rows.append([s, t, y, pct(qsorted, qs[s]) if rates[s] else -1, pct(nsorted, len(watch[s])), [c.get(k, 0) for k in CN], g, l, dirs.get(s, [])])
rows.sort(key=lambda r: (-(r[3] if r[3] >= 0 else 40), r[1]))
json.dump({'v': 1, 'canon': CN, 'films': rows}, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(rows), 'films ·', sum(1 for r in rows if any(r[5])), 'canonical ·', sum(1 for r in rows if r[6] >= 0), 'planned ·', sum(1 for r in rows if r[3] < 0), 'unrated ·', sum(1 for r in rows if r[8]), 'with directors')
