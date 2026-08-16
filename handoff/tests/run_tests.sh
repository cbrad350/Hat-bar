#!/bin/bash
# Hat Bar Tally — run the browser test suite.
#
#   ./run_tests.sh          from anywhere; paths are derived, not hardcoded
#
# The repo holds the REAL synced Square catalog (square-catalog.json +
# square-photos/). The tests need a small deterministic fixture instead, so this
# stashes the real files, swaps in the fixture, and always puts them back — even
# if the run fails or is interrupted. Never leave the working tree missing data
# that came from the sync.
#
# Requires: node, playwright-core, Pillow (python3 -m pip install pillow),
# and a Chromium binary. Override CHROME_PATH if yours lives elsewhere.
set -u
cd "$(dirname "$0")"
ROOT="${REPO_ROOT:-$(cd ../.. && pwd)}"
export REPO_ROOT="$ROOT"
STASH=$(mktemp -d)

restore() {
  rm -rf "$ROOT/square-catalog.json" "$ROOT/square-photos"
  [ -e "$STASH/square-catalog.json" ] && mv "$STASH/square-catalog.json" "$ROOT/"
  [ -e "$STASH/square-photos" ] && mv "$STASH/square-photos" "$ROOT/"
  rm -rf "$STASH"
}
trap restore EXIT

[ -e "$ROOT/square-catalog.json" ] && mv "$ROOT/square-catalog.json" "$STASH/"
[ -e "$ROOT/square-photos" ] && mv "$ROOT/square-photos" "$STASH/"

python3 - "$ROOT" <<'EOF'
import json, os, sys
from PIL import Image
root = sys.argv[1]
os.makedirs(root + "/square-photos", exist_ok=True)
for name, color in [("hat1.jpg", (150, 120, 90)), ("hat2.jpg", (40, 40, 45)), ("scarf.jpg", (140, 60, 50))]:
    Image.new("RGB", (32, 32), color).save(f"{root}/square-photos/{name}")
# Deliberately mirrors the real Square library's quirks, all of which the
# importer is expected to clean up:
#   - category "Hats" but names prefixed "HAT:" (they don't match)
#   - "+ Basic ... Package" suffixes restating what the price includes
#   - "Copy" tails left by duplicating an item in the Square dashboard
#   - a doubled space inside a name
catalog = {
  "generatedAt": "2026-08-09T16:00:00.000Z",
  "items": [
    {"id": "sq1", "name": "HAT: Austrian Wool Rancher - Stone + Basic Package Copy", "category": "Hats", "price": 185, "priceMax": 185, "photo": "square-photos/hat1.jpg"},
    {"id": "sq2", "name": "HAT: AHM  Wool Cattleman - Black + Basic Customization Package", "category": "Hats", "price": 225, "priceMax": 225, "photo": "square-photos/hat2.jpg"},
    {"id": "sq3", "name": "HAT: Premium Hat Upgrade", "category": "Hats", "price": 40, "priceMax": 40, "photo": None},
    {"id": "sq4", "name": "BANDS: Scarf", "category": "BANDS", "price": 15, "priceMax": 15, "photo": "square-photos/scarf.jpg"},
    {"id": "sq5", "name": "BANDS: Signature Band", "category": "BANDS", "price": 3, "priceMax": 3, "photo": None},
    {"id": "sq6", "name": "FEATHERS: Luxe Feathers", "category": "FEATHERS", "price": 6, "priceMax": 6, "photo": None},
    {"id": "sq7", "name": "DETAILS: Chain 1 - 6 Inch", "category": "DETAILS", "price": 5, "priceMax": 5, "photo": None},
    {"id": "sq8", "name": "DETAILS: Custom Branding", "category": "DETAILS", "price": 2, "priceMax": 2, "photo": None}
  ]
}
with open(root + "/square-catalog.json", "w") as f:
    json.dump(catalog, f, indent=2)
EOF

node test_app.js
status=$?
echo "exit=$status"
exit $status
