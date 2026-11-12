#!/bin/bash
# Every suite, each against a fresh local server (an empty database each time).
# OUT=<folder for screenshots>  bash test/all.sh
cd "$(dirname "$0")/.." || exit 1
OUT=${OUT:-/tmp}; fail=0
run() {
  pkill -f "test/server.mjs 8790" 2>/dev/null; sleep 0.4
  node test/server.mjs 8790 > "$OUT/server.log" 2>&1 & sleep 1.2
  echo "== $1"; if ! OUT=$OUT node "$@" > "$OUT/last.log" 2>&1; then fail=1; grep -v '^ok' "$OUT/last.log" | tail -8; else tail -1 "$OUT/last.log"; fi
}
python3 build_cloud.py > /dev/null || exit 1
run test/api_test.mjs
run test/e2e.cjs
run test/poster_csp.cjs 8790
run test/catalog_test.mjs
for t in test/feat_*.cjs; do [ -f "$t" ] && run "$t"; done
pkill -f "test/server.mjs 8790" 2>/dev/null
[ $fail = 0 ] && echo "EVERYTHING PASSED" || { echo "SOMETHING FAILED"; exit 1; }
