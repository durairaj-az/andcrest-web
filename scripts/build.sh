#!/bin/sh
# Copies the public site into dist/ (what Cloudflare serves) and, with "zip", also writes release/andcrest-site.zip.
# Source files stay in the project root; dist/ is generated, so edit the root files and run this again.
set -eu
cd "$(dirname "$0")/.."

rm -rf dist && mkdir dist
rsync -a \
  --exclude '.DS_Store' \
  --exclude 'assets/image_add5791c.jpg' \
  --include '/*.html' --include '/_headers' \
  --include '/css/***' --include '/js/***' --include '/assets/***' \
  --exclude '*' ./ dist/
echo "dist/ updated: $(find dist -type f | wc -l | tr -d ' ') files, $(du -sh dist | cut -f1)"

if [ "${1:-}" = "zip" ]; then
  mkdir -p release && rm -f release/andcrest-site.zip
  (cd dist && zip -qr ../release/andcrest-site.zip . -x '.DS_Store')
  echo "release/andcrest-site.zip: $(du -h release/andcrest-site.zip | cut -f1)"
fi
