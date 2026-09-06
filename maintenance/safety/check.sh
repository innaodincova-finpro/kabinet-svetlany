#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$repo_root"

mkdir -p maintenance/safety/site
git show d72c7d2e8ebab0573b3289c1f8bd726271dbe49d:index.html > maintenance/safety/source/baseline.html
git show d72c7d2e8ebab0573b3289c1f8bd726271dbe49d:sw.js > maintenance/safety/site/sw.js
python maintenance/safety/source/build.py
cmp index.html maintenance/safety/site/index.html
cmp sw.js maintenance/safety/site/sw.js
node maintenance/safety/tests/safety.cjs "${1:-}"
node maintenance/safety/tests/homework.cjs
