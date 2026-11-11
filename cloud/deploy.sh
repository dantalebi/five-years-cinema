#!/bin/bash
# Test, copy the multi-user site into the repo's cloud/ folder, commit and push (Cloudflare Pages deploys from main).
# bash deploy.sh "commit message"
set -e
HERE=$(cd "$(dirname "$0")" && pwd); REPO=/home/claude/five-years-cinema
OUT=${OUT:-/tmp/claude-0/-home-claude/79e1b5ed-ff03-5da8-90ed-2b8ff50601d7/scratchpad} bash "$HERE/test/all.sh"
for f in build_cloud.py deploy.sh SETUP.md wrangler.toml; do [ -f "$HERE/$f" ] && cp "$HERE/$f" "$REPO/cloud/"; done
for d in functions public src test; do rm -rf "$REPO/cloud/$d"; cp -r "$HERE/$d" "$REPO/cloud/$d"; done
rm -f "$REPO/cloud/test/"*.png
cd "$REPO"
git add -A cloud
git -c core.quotepath=off status --short
git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HJSK5qVqiAzNgr3heEqQ5X"
git push -q origin main
git log --oneline -1
