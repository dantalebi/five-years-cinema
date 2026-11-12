#!/bin/bash
# Test, copy the multi-user site into the repo's cloud/ folder, commit and push (Cloudflare Pages deploys from main).
# bash deploy.sh "commit message"
# The Discover catalog is built on GitHub (.github/workflows/catalog.yml), which commits tmdb-cache.json and the catalog
# itself: those come back from the repo first, so the site is built and pushed with the latest ones.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); REPO=/home/claude/five-years-cinema
git -C "$REPO" pull -q --rebase origin main
mkdir -p "$HERE/catalog/dist"
[ -f "$REPO/cloud/catalog/tmdb-cache.json" ] && cp "$REPO/cloud/catalog/tmdb-cache.json" "$HERE/catalog/"
[ -f "$REPO/cloud/catalog/dist/catalog.json" ] && cp "$REPO/cloud/catalog/dist/catalog.json" "$HERE/catalog/dist/"
OUT=${OUT:-/tmp/claude-0/-home-claude/79e1b5ed-ff03-5da8-90ed-2b8ff50601d7/scratchpad} bash "$HERE/test/all.sh"
for f in build_cloud.py deploy.sh SETUP.md wrangler.toml; do [ -f "$HERE/$f" ] && cp "$HERE/$f" "$REPO/cloud/"; done
for d in functions public src test; do rm -rf "$REPO/cloud/$d"; cp -r "$HERE/$d" "$REPO/cloud/$d"; done
mkdir -p "$REPO/cloud/catalog"
for f in build.mjs taxonomy.mjs seed.py seed.json; do cp "$HERE/catalog/$f" "$REPO/cloud/catalog/"; done
[ -d "$HERE/workflows" ] && mkdir -p "$REPO/.github/workflows" && cp "$HERE/workflows/"*.yml "$REPO/.github/workflows/"
rm -f "$REPO/cloud/test/"*.png
cd "$REPO"
git add -A cloud .github
git -c core.quotepath=off status --short
git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HJSK5qVqiAzNgr3heEqQ5X"
git pull -q --rebase origin main
git push -q origin main
git log --oneline -1
