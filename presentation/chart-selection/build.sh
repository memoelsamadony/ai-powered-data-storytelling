#!/bin/bash
# reference.html + the figS*.svg files -> reference.pdf, via headless Chrome.
# The SVGs are inlined rather than linked so the PDF is one self-contained file
# and the figures stay vector (a reader can zoom into a 17px axis label).
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

python3 - "$DIR" <<'PY'
import pathlib, re, sys
d = pathlib.Path(sys.argv[1])
html = (d / "reference.html").read_text()

CAPTIONS = {
  "figS1": "<b>Figure S1.</b> The split the whole design rests on: applicability is computed, ranking is asked.",
  "figS2": "<b>Figure S2.</b> Experiment 1 — two models, same seed, same fourteen candidates, original prompt.",
  "figS3": "<b>Figure S3.</b> Experiment 3 — compute is a tie; the wall clock was measuring another session's job.",
  "figS4": "<b>Figure S4.</b> Experiment 2 — three titles checked against the table the reader would see.",
  "figS5": "<b>Figure S5.</b> Experiment 4 — the standing reproducibility finding, and the condition where it does not apply.",
  "figS6": "<b>Figure S6.</b> The claim we corrected, and the reasoning that replaced it.",
  "figS7": "<b>Figure S7.</b> Experiment 5 — three prompts, twelve runs. The schema change is what worked.",
}

def sub(m):
    name = m.group(1)
    svg = (d / f"{name}.svg").read_text()
    svg = svg.replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg ', 1)
    svg = re.sub(r'\s(width|height)="\d+"', '', svg, count=2)
    return f'<figure id="{name}">{svg}<figcaption>{CAPTIONS[name]}</figcaption></figure>'

html, n = re.subn(r"<!--FIG:(figS\d)-->", sub, html)
missing = [k for k in CAPTIONS if f'id="{k}"' not in html]
if missing:
    raise SystemExit(f"figures never placed in the document: {missing}")
(d / ".build.html").write_text(html)
print(f"inlined {n} figures")
PY

"$CHROME" --headless --disable-gpu --no-sandbox --no-pdf-header-footer \
  --print-to-pdf="$DIR/reference.pdf" "file://$DIR/.build.html" 2>&1 | grep -i "written" || true
rm -f "$DIR/.build.html"
