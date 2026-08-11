#!/usr/bin/env python3
"""Presentation figures for the final CMS Team Project talk.

Every number here is transcribed from RESULTS.md, which in turn was read off a
metrics file or a run record. No figure invents a value; where a number has a
caveat in RESULTS.md the caveat is drawn on the figure, not left to the speaker.

Output: one .svg per figure in this directory. render.sh turns them into PNGs.
"""
import os

W, H = 1600, 900
OUT = os.path.dirname(os.path.abspath(__file__))

# --- design tokens -------------------------------------------------------
# Light surface = pure white to match the deck master background (theme lt1).
SURFACE   = "#ffffff"
INK       = "#0b0b0b"
INK_2     = "#52514e"
MUTED     = "#898781"
GRID      = "#e1e0d9"
BASELINE  = "#c3c2b7"

BLUE      = "#2a78d6"   # categorical slot 1
ORANGE    = "#eb6834"   # categorical slot 2
AQUA      = "#1baf7a"   # categorical slot 3
GOOD      = "#0ca30c"
WARNING   = "#fab219"
CRITICAL  = "#d03b3b"

FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif"


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def txt(x, y, s, size=20, fill=INK_2, weight="normal", anchor="start", ls="0"):
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" '
            f'fill="{fill}" font-weight="{weight}" text-anchor="{anchor}" '
            f'letter-spacing="{ls}">{esc(s)}</text>')


def vbar(x, y_top, w, y_base, fill, r=4, opacity=1.0, extra=""):
    """Vertical bar, 4px rounded at the data end, anchored to the baseline."""
    h = y_base - y_top
    r = min(r, h / 2 if h > 0 else 0, w / 2)
    return (f'<path d="M {x} {y_base} L {x} {y_top+r} Q {x} {y_top} {x+r} {y_top} '
            f'L {x+w-r} {y_top} Q {x+w} {y_top} {x+w} {y_top+r} L {x+w} {y_base} Z" '
            f'fill="{fill}" fill-opacity="{opacity}" {extra}/>')


def hbar(x0, y, x1, h, fill, r=4, opacity=1.0, extra=""):
    """Horizontal bar, 4px rounded at the data end."""
    w = x1 - x0
    r = min(r, w / 2 if w > 0 else 0, h / 2)
    return (f'<path d="M {x0} {y} L {x1-r} {y} Q {x1} {y} {x1} {y+r} '
            f'L {x1} {y+h-r} Q {x1} {y+h} {x1-r} {y+h} L {x0} {y+h} Z" '
            f'fill="{fill}" fill-opacity="{opacity}" {extra}/>')


def wrap(text, width):
    words, line, lines = text.split(), "", []
    for w_ in words:
        if len(line) + len(w_) + 1 > width:
            lines.append(line); line = w_
        else:
            line = (line + " " + w_).strip()
    if line:
        lines.append(line)
    return lines


def frame(title, subtitle, body, footnote, caption="", defs=""):
    foot_svg = "\n".join(txt(72, 830 + i * 22, ln, size=16, fill=MUTED)
                         for i, ln in enumerate(wrap(footnote, 168)[:3]))
    cap_svg = txt(W - 72, 172, caption, size=19, fill=INK_2, anchor="end") if caption else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
  <rect width="8" height="8" fill="{BLUE}" fill-opacity="0.22"/>
  <line x1="0" y1="0" x2="0" y2="8" stroke="{BLUE}" stroke-width="3"/>
</pattern>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="{MUTED}"/>
</marker>
<marker id="arrowblue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="{BLUE}"/>
</marker>
{defs}
</defs>
<rect width="{W}" height="{H}" fill="{SURFACE}"/>
{txt(72, 76, title, size=40, fill=INK, weight="bold")}
{txt(72, 116, subtitle, size=23, fill=INK_2)}
<line x1="72" y1="140" x2="{W-72}" y2="140" stroke="{GRID}" stroke-width="2"/>
{body}
{cap_svg}
{foot_svg}
</svg>'''


def write(name, svg):
    p = os.path.join(OUT, name + ".svg")
    with open(p, "w") as f:
        f.write(svg)
    print("wrote", os.path.basename(p))


# =========================================================================
# FIG 1 - Quintd faithfulness. Motivation: facts are largely solved.
# =========================================================================
def fig1():
    data = [
        ("Zephyr-7B", "2023 · 7B · reported", 87.0, True),
        ("qwen3.5:4b", "2026 · 4B", 52.0, False),
        ("gemma4:12b", "2026 · 12B", 18.0, False),
    ]
    x0, x1 = 150, 1180
    yb, yt = 720, 210          # baseline and top of the 100% scale
    def sy(v): return yb - (v / 100.0) * (yb - yt)

    b = []
    for v in range(0, 101, 20):
        b.append(f'<line x1="{x0}" y1="{sy(v)}" x2="{x1}" y2="{sy(v)}" stroke="{GRID}" stroke-width="1"/>')
        b.append(txt(x0 - 18, sy(v) + 7, f"{v}%", size=19, fill=MUTED, anchor="end"))

    # the paper's own headline, as a reference line
    b.append(f'<line x1="{x0}" y1="{sy(80)}" x2="{x1}" y2="{sy(80)}" stroke="{CRITICAL}" '
             f'stroke-width="2.5" stroke-dasharray="9 6"/>')
    b.append(txt(x1 - 6, sy(80) - 14, "paper's headline:  > 80% of outputs contain ≥ 1 error",
                 size=19, fill=CRITICAL, anchor="end", weight="bold"))

    bw, gap = 210, 130
    for i, (name, sub, v, reported) in enumerate(data):
        x = x0 + 96 + i * (bw + gap)
        fill = "url(#hatch)" if reported else BLUE
        extra = f'stroke="{BLUE}" stroke-width="2.5" stroke-dasharray="7 5"' if reported else ""
        b.append(vbar(x, sy(v), bw, yb, fill, extra=extra))
        b.append(txt(x + bw / 2, sy(v) - 20, f"{v:.0f}%" if reported else f"{v:.1f}%",
                     size=34, fill=INK, weight="bold", anchor="middle"))
        b.append(txt(x + bw / 2, yb + 40, name, size=25, fill=INK, weight="bold", anchor="middle"))
        b.append(txt(x + bw / 2, yb + 68, sub, size=19, fill=MUTED, anchor="middle"))

    b.append(f'<line x1="{x0}" y1="{yb}" x2="{x1}" y2="{yb}" stroke="{BASELINE}" stroke-width="2"/>')

    # the read-out, in the empty right third
    px = 1245
    b.append(f'<rect x="{px-25}" y="248" width="360" height="330" rx="10" fill="{BLUE}" fill-opacity="0.06"/>')
    b.append(txt(px, 292, "WHAT THIS MEANS", size=17, fill=BLUE, weight="bold", ls="1.5"))
    for i, line in enumerate([
            "The 2024 paper's headline does",
            "not reproduce on a modern 12B",
            "model: 18.0% vs > 80%, and 0.23",
            "vs > 2 errors per output.",
            "",
            "Modern open models are already",
            "fairly faithful — so factual",
            "accuracy is not where the",
            "remaining gap is."]):
        b.append(txt(px, 332 + i * 27, line, size=19, fill=INK_2,
                     weight="bold" if i in (6, 7, 8) else "normal"))

    return frame(
        "Faithfulness is largely solved. Tone is not.",
        "Reproduction of Kasner & Dušek (Quintd, ACL 2024)  ·  n = 100 outputs per model (20 × 5 domains)",
        "\n".join(b),
        caption="Lower is better ↓   ·   share of outputs containing at least one semantic error",
        footnote="Judge: Claude Opus 4.7 using the paper's own gpt4_metric.yaml prompt.  Hatched bar = figure reported in the paper; "
        "no metrics CSV in our repository, so it cannot be re-derived here.  Per-domain cells rest on 20 examples each — "
        "not readable to better than ±10 points.")


# =========================================================================
# FIG 2 - DataTales per-operation accuracy. The causal wall.
# =========================================================================
def fig2():
    ops = [
        ("lookup", "simple", 86.2, 93.1, "69/80", "81/87", False),
        ("comparison", "basic quant.", 74.2, 91.7, "66/89", "88/96", False),
        ("subtraction", "basic quant.", 46.4, 80.0, "13/28", "4/5", True),
        ("rate of change", "basic quant.", 43.3, 88.9, "13/30", "8/9", True),
        ("trend", "advanced", 40.5, 87.3, "17/42", "69/79", False),
        ("causal", "advanced", 0.0, 0.0, "0/13", "0/8", False),
    ]
    x0, x1 = 150, 1180
    yb, yt = 700, 215
    def sy(v): return yb - (v / 100.0) * (yb - yt)

    b = []
    for v in range(0, 101, 25):
        b.append(f'<line x1="{x0}" y1="{sy(v)}" x2="{x1}" y2="{sy(v)}" stroke="{GRID}" stroke-width="1"/>')
        b.append(txt(x0 - 18, sy(v) + 7, f"{v}%", size=19, fill=MUTED, anchor="end"))

    group_w = (x1 - x0 - 40) / len(ops)
    bw = 62
    for i, (op, cat, qv, gv, qn, gn, small) in enumerate(ops):
        gx = x0 + 20 + i * group_w
        cx = gx + group_w / 2
        for j, (v, n, colr) in enumerate([(qv, qn, BLUE), (gv, gn, ORANGE)]):
            # 2px surface gap between the adjacent bars of a group
            x = cx - bw - 1 + j * (bw + 2)
            if v == 0:
                b.append(f'<line x1="{x}" y1="{yb}" x2="{x+bw}" y2="{yb}" stroke="{colr}" stroke-width="5"/>')
            else:
                op_ = 0.45 if small else 1.0
                b.append(vbar(x, sy(v), bw, yb, colr, opacity=op_))
            lbl = f"{v:.1f}" + ("*" if small else "")
            b.append(txt(x + bw / 2, sy(v) - 14, lbl, size=21, fill=INK,
                         weight="bold", anchor="middle"))
            b.append(txt(x + bw / 2, sy(v) - 14 + (34 if v > 0 else 34), n, size=15,
                         fill=MUTED, anchor="middle") if False else "")
        b.append(txt(cx, yb + 36, op, size=21, fill=INK, weight="bold", anchor="middle"))
        b.append(txt(cx, yb + 60, cat, size=17, fill=MUTED, anchor="middle"))
        b.append(txt(cx, yb + 84, f"{qn}  ·  {gn}", size=16, fill=MUTED, anchor="middle"))

    b.append(f'<line x1="{x0}" y1="{yb}" x2="{x1}" y2="{yb}" stroke="{BASELINE}" stroke-width="2"/>')

    # legend
    b.append(f'<rect x="{x0}" y="168" width="15" height="15" rx="3" fill="{BLUE}"/>')
    b.append(txt(x0 + 24, 181, "qwen3.5:4b", size=19, fill=INK_2))
    b.append(f'<rect x="{x0+190}" y="168" width="15" height="15" rx="3" fill="{ORANGE}"/>')
    b.append(txt(x0 + 214, 181, "gemma4:12b", size=19, fill=INK_2))

    # the callout on causal
    cxx = x0 + 20 + 5.5 * group_w
    b.append(f'<rect x="{cxx-88}" y="{yb-14}" width="176" height="24" rx="6" fill="{CRITICAL}" fill-opacity="0.10"/>')
    b.append(txt(cxx, yb + 112, "the wall", size=17, fill=CRITICAL, weight="bold", anchor="middle"))

    px = 1245
    b.append(f'<rect x="{px-25}" y="238" width="360" height="352" rx="10" fill="{CRITICAL}" fill-opacity="0.07"/>')
    b.append(txt(px, 282, "THE CAPABILITY WALL", size=17, fill=CRITICAL, weight="bold", ls="1.5"))
    for i, line in enumerate([
            "Scale lifts every reading and",
            "computing operation — trend",
            "40.5% → 87.3%.",
            "",
            "Causal analysis stays at exactly",
            "0% for both models, on 13 and 8",
            "claims. Every “driven by / amid /",
            "as investors…” was unsupported",
            "by the table.",
            "",
            "This is why the fact-checker is a",
            "separate agent from the tone agent."]):
        b.append(txt(px, 322 + i * 26, line, size=19, fill=INK_2,
                     weight="bold" if i in (4, 5, 10, 11) else "normal"))

    return frame(
        "Bigger models compute better. They do not reason causally.",
        "Reproduction of DataTales (Yang, Liu & Kan)  ·  per-operation accuracy on the official test split",
        "\n".join(b),
        caption="Share of analytical claims that check out against the source table",
        footnote="* Small denominators — gemma writes more concise reports and makes only 5 subtraction and 9 rate claims "
        "(against qwen's 28 and 30), so a single item moves those two bars by 12–20 points. They are drawn faded "
        "for that reason. Counts under each label are qwen · gemma.")


# =========================================================================
# FIG 3 - Alarmism, the novel metric. The headroom effect.
# =========================================================================
def fig3():
    x0, x1 = 320, 1160
    def sx(v): return x0 + (v - 1) / 4.0 * (x1 - x0)

    b = []
    for v in [1, 2, 3, 4, 5]:
        b.append(f'<line x1="{sx(v)}" y1="238" x2="{sx(v)}" y2="600" stroke="{GRID}" stroke-width="1"/>')
        b.append(txt(sx(v), 638, str(v), size=24, fill=MUTED, anchor="middle", weight="bold"))
    b.append(txt(sx(1), 670, "flat — hides the stakes", size=17, fill=MUTED, anchor="middle"))
    b.append(txt(sx(5), 670, "manipulative catastrophising", size=17, fill=MUTED, anchor="middle"))
    b.append(txt(sx(3), 670, "alarmism rating (1–5, half-point scale)", size=17, fill=MUTED, anchor="middle"))

    rows = [
        ("pertussis-global", "rising series", 3.5, 3.0, 330, "10 emotive spans · 1 flagged claim"),
        ("measles", "falling series", 2.0, 2.0, 490, "8 emotive spans · 3 flagged claims"),
    ]
    for name, dirn, before, after, y, meta in rows:
        b.append(txt(110, y - 4, name, size=25, fill=INK, weight="bold"))
        b.append(txt(110, y + 24, dirn, size=19, fill=MUTED))
        b.append(txt(110, y + 50, meta, size=16, fill=MUTED))
        if abs(before - after) < 1e-9:
            b.append(f'<circle cx="{sx(before)}" cy="{y}" r="27" fill="none" stroke="{MUTED}" '
                     f'stroke-width="2" stroke-dasharray="5 4"/>')
            b.append(f'<circle cx="{sx(before)}" cy="{y}" r="14" fill="{ORANGE}" stroke="{SURFACE}" stroke-width="2"/>')
            b.append(f'<circle cx="{sx(after)}" cy="{y}" r="9" fill="{BLUE}" stroke="{SURFACE}" stroke-width="2"/>')
            b.append(txt(sx(before), y - 46, "2.0", size=23, fill=INK, weight="bold", anchor="middle"))
            b.append(txt(sx(after) + 50, y + 8, "Δ 0.0  —  no change", size=23, fill=MUTED, weight="bold"))
        else:
            b.append(f'<line x1="{sx(before)}" y1="{y}" x2="{sx(after)+18}" y2="{y}" stroke="{BLUE}" '
                     f'stroke-width="5" marker-end="url(#arrowblue)"/>')
            b.append(f'<circle cx="{sx(before)}" cy="{y}" r="14" fill="{ORANGE}" stroke="{SURFACE}" stroke-width="2"/>')
            b.append(f'<circle cx="{sx(after)}" cy="{y}" r="14" fill="{BLUE}" stroke="{SURFACE}" stroke-width="2"/>')
            b.append(txt(sx(before), y - 32, f"{before}", size=23, fill=ORANGE, weight="bold", anchor="middle"))
            b.append(txt(sx(after), y - 32, f"{after}", size=23, fill=BLUE, weight="bold", anchor="middle"))
            b.append(txt(sx(max(before, after)) + 54, y + 8, "Δ −0.5   first non-zero delta in the project",
                         size=22, fill=BLUE, weight="bold"))

    b.append(f'<circle cx="330" cy="192" r="10" fill="{ORANGE}"/>')
    b.append(txt(348, 200, "raw story (llama3.1:8b)", size=20, fill=INK_2))
    b.append(f'<circle cx="660" cy="192" r="10" fill="{BLUE}"/>')
    b.append(txt(678, 200, "after tone moderation (gemma4:31b)", size=20, fill=INK_2))

    b.append(f'<rect x="110" y="702" width="1380" height="106" rx="10" fill="{BLUE}" fill-opacity="0.07"/>')
    b.append(txt(136, 736, "The headroom effect", size=22, fill=BLUE, weight="bold"))
    b.append(txt(136, 768, "The moderator can only remove alarmism the generator actually produced. On the falling series it wrote a calm story",
                 size=20, fill=INK_2))
    b.append(txt(136, 794, "unprompted — and moderation still rewrote 8 spans while moving the rating by nothing. The rising series gave it work to do.",
                 size=20, fill=INK_2))

    return frame(
        "The novel metric: alarmism before vs after moderation",
        "Two runs, mid tier  ·  llama3.1:8b generator, gemma4:31b moderator  ·  after the 2026-08-10 metric refit",
        "\n".join(b),
        footnote="n = 2 runs — these verify the instrument on real data; they are not yet a result. The judge is currently the "
        "same model as the moderator (gemma4:31b), so these deltas are self-assessed; an independent judge is protocol item "
        "P0.1 and is not yet satisfied.")


# =========================================================================
# FIG 4 - Groundedness. The founding anecdote, as a measurement.
# =========================================================================
def fig4():
    x0, x1 = 470, 1180
    def sx(p): return x0 + p * (x1 - x0)

    b = []
    for p, lab in [(0, "0%"), (0.25, "25%"), (0.5, "50%"), (0.75, "75%"), (1.0, "100%")]:
        b.append(f'<line x1="{sx(p)}" y1="215" x2="{sx(p)}" y2="620" stroke="{GRID}" stroke-width="1"/>')
        b.append(txt(sx(p), 656, lab, size=19, fill=MUTED, anchor="middle"))

    groups = [
        ("measles", 250, [("raw story", 2, 4, ORANGE), ("after moderation", 11, 11, BLUE)]),
        ("pertussis-global", 450, [("raw story", 4, 4, ORANGE), ("after moderation", 6, 6, BLUE)]),
    ]
    for dataset, gy, rows in groups:
        b.append(txt(110, gy, dataset, size=25, fill=INK, weight="bold"))
        for i, (stage, hit, total, colr) in enumerate(rows):
            y = gy + 24 + i * 72
            b.append(txt(440, y + 30, stage, size=20, fill=INK_2, anchor="end"))
            frac = hit / total
            b.append(f'<rect x="{x0}" y="{y}" width="{x1-x0}" height="46" rx="4" fill="{GRID}" fill-opacity="0.5"/>')
            b.append(hbar(x0, y, sx(frac), 46, colr))
            b.append(txt(x1 + 20, y + 31, f"{hit} of {total} figures supported",
                         size=21, fill=INK, weight="bold"))
            if frac < 1:
                b.append(txt((sx(frac) + x1) / 2, y + 31, f"{total-hit} unsupported", size=19,
                             fill=CRITICAL, weight="bold", anchor="middle"))

    b.append(f'<rect x="110" y="700" width="1380" height="108" rx="10" fill="{GOOD}" fill-opacity="0.07"/>')
    b.append(txt(136, 734, "The founding anecdote, reproduced as a measurement", size=22, fill=GOOD, weight="bold"))
    b.append(txt(136, 766, "The moderated measles story states more numbers than the raw one (11 vs 4) and grounds every single one of them.",
                 size=20, fill=INK_2))
    b.append(txt(136, 792, "The tone agent is quietly doing factual work — and this metric is computed in Python against the evidence pack, no model in the loop.",
                 size=20, fill=INK_2))

    return frame(
        "Moderation made the prose more data-bound, not less",
        "Groundedness: share of the figures stated in the story that the evidence pack supports",
        "\n".join(b),
        footnote="Replaces the old factsPreserved boolean, which merely restated the fact-checker's verdict. Numeric density "
        "rose in both runs (+13.2 and +5.7 per 100 words), the same finding seen from the text side. n = 2.")


# =========================================================================
# FIG 5 - The pipeline, with measured stage timings.
# =========================================================================
def fig5():
    stages = [
        ("generate", "llama3.1:8b", 11.5, "11.5–63.1 s", BLUE, "writes the story\nfrom the data pack"),
        ("judge_raw", "gemma4:31b", 15.1, "15.1–45.0 s", MUTED, "rates alarmism\n1–5"),
        ("moderate", "gemma4:31b", 119.5, "87.2–131.7 s", ORANGE, "rewrites emotive\nspans, with reasons"),
        ("judge_mod.", "gemma4:31b", 10.3, "10.3–13.0 s", MUTED, "re-rates the\nmoderated story"),
        ("factcheck", "gemma4:31b", 71.5, "71.5–109.0 s", AQUA, "verifies claims\nagainst the table"),
    ]
    total = sum(s[2] for s in stages)
    b = []

    bx, by, bw, bh, gap = 96, 190, 262, 150, 42
    for i, (name, model, t, rng, colr, desc) in enumerate(stages):
        x = bx + i * (bw + gap)
        b.append(f'<rect x="{x}" y="{by}" width="{bw}" height="{bh}" rx="10" fill="{colr}" fill-opacity="0.10" '
                 f'stroke="{colr}" stroke-width="2.5"/>')
        b.append(txt(x + 18, by + 36, name, size=23, fill=INK, weight="bold"))
        b.append(txt(x + 18, by + 62, model, size=18, fill=colr, weight="bold"))
        for j, line in enumerate(desc.split("\n")):
            b.append(txt(x + 18, by + 92 + j * 23, line, size=17, fill=INK_2))
        if i < len(stages) - 1:
            b.append(f'<path d="M {x+bw+6} {by+bh/2} L {x+bw+gap-10} {by+bh/2}" stroke="{MUTED}" '
                     f'stroke-width="2.5" marker-end="url(#arrow)"/>')

    tx0, tx1, ty, th = 96, 1504, 486, 74
    b.append(txt(tx0, ty - 24, "One complete run, measured end to end — 227.9 s", size=22, fill=INK, weight="bold"))
    cur = tx0
    for name, model, t, rng, colr, desc in stages:
        w = (t / total) * (tx1 - tx0)
        b.append(f'<rect x="{cur}" y="{ty}" width="{max(w-2,1)}" height="{th}" rx="4" fill="{colr}" '
                 f'fill-opacity="{0.95 if colr != MUTED else 0.45}"/>')
        pct = t / total * 100
        if pct > 6:
            b.append(txt(cur + w / 2 - 1, ty + 34, f"{t:.1f} s", size=22, fill="#ffffff",
                         weight="bold", anchor="middle"))
            b.append(txt(cur + w / 2 - 1, ty + 58, f"{pct:.0f}% of the run", size=17, fill="#ffffff",
                         anchor="middle"))
        b.append(txt(cur + w / 2 - 1, ty + th + 26, name, size=17, fill=INK_2, anchor="middle"))
        b.append(txt(cur + w / 2 - 1, ty + th + 47, rng, size=15, fill=MUTED, anchor="middle"))
        cur += w
    b.append(txt(tx1, ty - 24, "the tone agent is the bottleneck", size=20, fill=ORANGE,
                 weight="bold", anchor="end"))

    facts = [
        ("227.9 – 361.7 s", "per complete run, same stage sequence — wall clock is not stable, model loads vary"),
        ("2 of 3 runs", "the moderate stage fell back from grammar-constrained to prompted JSON — probabilistic, not deterministic"),
        ("~9.5 tok/s", "generation speed of gemma4:31b on the M1 Max, which is what sets every number above"),
    ]
    for i, (big, small) in enumerate(facts):
        x = 96 + i * 476
        b.append(f'<rect x="{x}" y="664" width="452" height="134" rx="10" fill="{GRID}" fill-opacity="0.40"/>')
        b.append(txt(x + 24, 708, big, size=30, fill=INK, weight="bold"))
        for j, ln in enumerate(wrap(small, 48)[:3]):
            b.append(txt(x + 24, 738 + j * 22, ln, size=17, fill=INK_2))

    return frame(
        "The pipeline, and where the time actually goes",
        "Five stages, each writing a Run / StageResult row  ·  measured on run 7c2eb23c, mid tier",
        "\n".join(b),
        footnote="Ranges are the min-max across the three mid-tier runs of 2026-08-07. Timings are indicative, not benchmarks "
        "— a proper latency comparison needs repeats on a quiet machine. The judge and the moderator are the same model here, "
        "which is the open protocol defect P0.1.")


# =========================================================================
# FIG 6 - Experiment status map.
# =========================================================================
def fig6():
    b = []
    cards = [
        ("E0", "Metric refit", "done", "chrF++, smoothed BLEU,\ngroundedness, 11 text stats"),
        ("E1", "Calibration", "ready", "does moderation move\nalarmism to the human band?"),
        ("E2", "Rubric ablation", "ready", "is it the rubric or just\nthe parameter count?"),
        ("E3", "Specificity &\nidempotence", "ready", "re-moderating a moderated\nstory should change nothing"),
        ("E4", "Silent fact\ncorrection", "ready", "figures fixed without being\nflagged — falls out of E1"),
        ("E5", "Generator ×\nmoderator scale", "ready", "can a strong moderator\nreplace generator scale?"),
        ("E6", "Visual tone", "later", "depends on the\nchart-spec work"),
        ("—", "Judge validation", "blocked", "judge == moderator today;\nneeds a distinct model"),
        ("—", "Human baselines", "blocked", "25 LLM drafts written; the\nhuman track is still empty"),
        ("—", "User study", "later", "trust, engagement,\nreadability, preference"),
    ]
    styles = {
        "done":    (GOOD, "✓", "DONE"),
        "ready":   (BLUE, "▶", "READY TO RUN"),
        "blocked": (CRITICAL, "!", "BLOCKED"),
        "later":   (MUTED, "○", "AFTER THE ABOVE"),
    }
    cw, ch, gx, gy = 265, 196, 20, 22
    for i, (code, name, st, desc) in enumerate(cards):
        col, row = i % 5, i // 5
        x = 96 + col * (cw + gx)
        y = 196 + row * (ch + gy)
        colr, icon, label = styles[st]
        b.append(f'<rect x="{x}" y="{y}" width="{cw}" height="{ch}" rx="10" fill="{colr}" fill-opacity="0.07" '
                 f'stroke="{colr}" stroke-width="2"/>')
        b.append(f'<rect x="{x}" y="{y}" width="{cw}" height="6" rx="3" fill="{colr}"/>')
        b.append(txt(x + 18, y + 44, code, size=21, fill=colr, weight="bold"))
        for j, line in enumerate(name.split("\n")):
            b.append(txt(x + 56, y + 44 + j * 23, line, size=20, fill=INK, weight="bold"))
        b.append(f'<circle cx="{x+cw-28}" cy="{y+38}" r="13" fill="{colr}"/>')
        b.append(txt(x + cw - 28, y + 44, icon, size=16, fill="#ffffff", weight="bold", anchor="middle"))
        b.append(txt(x + 18, y + 108, label, size=14, fill=colr, weight="bold", ls="1.2"))
        for j, line in enumerate(desc.split("\n")):
            b.append(txt(x + 18, y + 136 + j * 22, line, size=16, fill=INK_2))

    b.append(f'<rect x="96" y="656" width="1408" height="122" rx="10" fill="{WARNING}" fill-opacity="0.14"/>')
    b.append(txt(122, 694, "What has to happen before any tone number is citable", size=22, fill=INK, weight="bold"))
    b.append(txt(122, 728, "1.  Pick a judge from a different model family than the moderator — today gemma4:31b grades its own rewrite, "
                 "so every alarmism delta is self-assessed.", size=19, fill=INK_2))
    b.append(txt(122, 758, "2.  Land the human baselines — without a reference, chrF++ and every similarity metric is undefined, and the "
                 "1–5 scale has no anchor.", size=19, fill=INK_2))

    return frame(
        "Where the experiments stand tonight",
        "The instruments are built and verified on real data. The measurements come next.",
        "\n".join(b),
        footnote="Protocol: EXPERIMENT_PLAN.md plus Addendum A (scale, prompting, time-series metrics). E0 parameters, "
        "prompts, hashes, stage timings and full texts are committed in experiments/e0-metric-refit.json.")


# =========================================================================
# FIG 7 - Hardware ceiling. Why the pipeline is shaped the way it is.
# =========================================================================
def fig7():
    x0, x1 = 430, 1300
    MAXGB = 46.0
    def sx(v): return x0 + (v / MAXGB) * (x1 - x0)

    rows = [
        ("llama3.1:8b", "generator, all tiers", 4.9, BLUE, False),
        ("gemma4:31b", "moderator, judge, fact-checker", 19.9, ORANGE, False),
        ("qwen3.6:35b", "large tier only", 23.9, ORANGE, True),
        ("gemma4:31b  +  qwen3.6:35b", "both resident at once", 43.8, CRITICAL, True),
    ]
    b = []
    for v in [0, 10, 20, 30, 40]:
        b.append(f'<line x1="{sx(v)}" y1="248" x2="{sx(v)}" y2="626" stroke="{GRID}" stroke-width="1"/>')
        b.append(txt(sx(v), 662, f"{v} GB", size=18, fill=MUTED, anchor="middle"))

    for v, colr in [(22.0, CRITICAL), (24.0, CRITICAL), (32.0, MUTED)]:
        b.append(f'<line x1="{sx(v)}" y1="234" x2="{sx(v)}" y2="632" stroke="{colr}" stroke-width="2.5" '
                 f'stroke-dasharray="8 5"/>')
    b.append(txt(sx(22.0) - 12, 226, "~22 GB usable", size=17, fill=CRITICAL, weight="bold", anchor="end"))
    b.append(txt(sx(24.0) + 12, 226, "24 GB wired GPU limit", size=17, fill=CRITICAL, weight="bold"))
    b.append(txt(sx(32.0) + 12, 254, "32 GB total RAM", size=17, fill=MUTED, weight="bold"))

    for i, (name, role, gb, colr, over) in enumerate(rows):
        y = 286 + i * 88
        b.append(txt(410, y + 20, name, size=23, fill=INK, weight="bold", anchor="end"))
        b.append(txt(410, y + 46, role, size=17, fill=MUTED, anchor="end"))
        b.append(hbar(x0, y, sx(gb), 48, colr))
        if gb > 15:
            b.append(txt(sx(gb) - 18, y + 32, f"{gb} GB", size=24, fill="#ffffff",
                         weight="bold", anchor="end"))
        else:
            b.append(txt(sx(gb) + 18, y + 32, f"{gb} GB", size=24, fill=INK, weight="bold"))
        if over:
            b.append(txt(sx(gb) + 18, y + 32, "exceeds the ceiling", size=19, fill=CRITICAL, weight="bold"))

    b.append(f'<rect x="96" y="700" width="1408" height="110" rx="10" fill="{ORANGE}" fill-opacity="0.09"/>')
    b.append(txt(122, 736, "Consequence: the two big models can never be co-resident", size=22, fill=INK, weight="bold"))
    b.append(txt(122, 768, "Every multi-model run is load → infer → evict → load. That is why a run takes minutes rather than seconds, why the large tier is batch-only,",
                 size=19, fill=INK_2))
    b.append(txt(122, 794, "and why a fixed seed does not reproduce across stages — every eviction is a cold load, and a cold load breaks byte-identical output.",
                 size=19, fill=INK_2))

    return frame(
        "The constraint that shapes the whole design",
        "Apple M1 Max, 32 GB unified memory  ·  measured, not estimated",
        "\n".join(b),
        footnote="macOS caps wired GPU memory at ~75% of RAM. qwen3.6:35b alone (23.9 GB) already exceeds the usable limit "
        "and needs sudo sysctl iogpu.wired_limit_mb=28672. Measured for gemma4:31b: ~11 s model load, ~62 tok/s prompt eval, "
        "~9.5 tok/s generation.")


# =========================================================================
# FIG 8 - The worked example. What the moderator actually changed.
# =========================================================================
def fig8():
    rows = [
        ("Plummet", "Trends", "Exaggerated intensity verb", False),
        ("dropped dramatically", "decreased", "Overstated intensity", False),
        ("just under 675,000", "675,533", "Vague phrasing; precise data available", True),
        ("stalled", "remained relatively stable", "Manipulative framing suggesting failure", False),
        ("shining examples of\neffective vaccination", "have high first-dose\ncoverage", "Overstated causation and celebratory tone", False),
        ("lags behind", "has lower coverage", "Judgmental / shaming language", False),
        ("resulting in a significantly\nhigher measles rate", "which corresponds with\na higher rate", "Overstated direct causation", True),
    ]
    b = []
    cx1, cx2, cx3 = 118, 560, 990
    b.append(txt(cx1, 180, "ORIGINAL", size=15, fill=MUTED, weight="bold", ls="1.5"))
    b.append(txt(cx2, 180, "REPLACEMENT", size=15, fill=MUTED, weight="bold", ls="1.5"))
    b.append(txt(cx3, 180, "REASON GIVEN BY THE MODERATOR", size=15, fill=MUTED, weight="bold", ls="1.5"))
    b.append(f'<line x1="104" y1="194" x2="1496" y2="194" stroke="{BASELINE}" stroke-width="2"/>')

    y = 206
    for orig, repl, reason, key in rows:
        nl = max(len(orig.split("\n")), len(repl.split("\n")))
        rh = 48 if nl == 1 else 74
        if key:
            b.append(f'<rect x="104" y="{y}" width="1392" height="{rh}" rx="8" fill="{AQUA}" fill-opacity="0.11"/>')
            b.append(f'<rect x="104" y="{y}" width="5" height="{rh}" rx="2.5" fill="{AQUA}"/>')
        for j, line in enumerate(orig.split("\n")):
            b.append(txt(cx1, y + 31 + j * 25, line, size=20, fill=INK_2))
        b.append(txt(cx2 - 40, y + 31, "→", size=21, fill=MUTED))
        for j, line in enumerate(repl.split("\n")):
            b.append(txt(cx2, y + 31 + j * 25, line, size=20, fill=INK,
                         weight="bold" if key else "normal"))
        b.append(txt(cx3, y + 31, reason, size=18, fill=MUTED))
        y += rh + 6

    by = y + 12
    b.append(f'<rect x="104" y="{by}" width="682" height="132" rx="10" fill="{AQUA}" fill-opacity="0.11"/>')
    b.append(txt(128, by + 36, "Two of the seven are not cosmetic", size=21, fill=AQUA, weight="bold"))
    b.append(txt(128, by + 68, "A vague figure became the exact value from the table, and a", size=19, fill=INK_2))
    b.append(txt(128, by + 92, "causal claim was downgraded to a correlational one. Given", size=19, fill=INK_2))
    b.append(txt(128, by + 116, "causal accuracy is 0%, that is safety work, not style work.", size=19, fill=INK_2))

    b.append(f'<rect x="814" y="{by}" width="682" height="132" rx="10" fill="{WARNING}" fill-opacity="0.17"/>')
    b.append(txt(838, by + 36, "Then the fact-checker flagged the moderator", size=21, fill=INK, weight="bold"))
    b.append(txt(838, by + 68, "8 claims checked, 7 verified, 1 flagged — and the flagged item", size=19, fill=INK_2))
    b.append(txt(838, by + 92, "is the moderator's own new phrasing. The two agents", size=19, fill=INK_2))
    b.append(txt(838, by + 116, "disagreeing is why they are kept as separate agents.", size=19, fill=INK_2))

    return frame(
        "What the tone agent actually did — one real run",
        "Run 056795c4  ·  measles  ·  7 spans rebalanced, each returned with a stated reason",
        "\n".join(b),
        footnote="Alarmism 2.0 → 2.0 on this run: the rating did not move, but seven spans were still rewritten — which is "
        "exactly why the delta on its own is an insufficient measure of what the agent does.")


for f in (fig1, fig2, fig3, fig4, fig5, fig6, fig7, fig8):
    write(f.__name__, f())
