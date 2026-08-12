#!/bin/bash
# Render every figS*.svg in this directory to a 3200x1800 PNG (2x of the 1600x900
# artboard) using headless Chrome. 16:9, so it drops onto a slide full-bleed.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="$(mktemp -d)"
for svg in "$DIR"/figS*.svg; do
  name="$(basename "$svg" .svg)"
  cat > "$TMP/$name.html" <<HTML
<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden}svg{display:block}</style>
$(cat "$svg")
HTML
  "$CHROME" --headless --disable-gpu --hide-scrollbars --no-sandbox \
    --force-device-scale-factor=2 --window-size=1600,900 \
    --screenshot="$DIR/$name.png" "file://$TMP/$name.html" 2>/dev/null
  echo "rendered $name.png"
done
rm -rf "$TMP"
