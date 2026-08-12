#!/usr/bin/env python3
"""Figures for the chart-selection work, in the style of ../figures/make_figures.py.

Every number here comes from a run recorded in this session, not from an
estimate. Where a number is confounded (wall clock under GPU contention) the
figure says so on its face rather than leaving it to the speaker.

Output: one .svg per figure. The PDF inlines them; render.sh makes PNGs for
slides.
"""
import os

W, H = 1600, 900
OUT = os.path.dirname(os.path.abspath(__file__))

SURFACE   = "#ffffff"
INK       = "#0b0b0b"
INK_2     = "#52514e"
MUTED     = "#898781"
GRID      = "#e1e0d9"

BLUE      = "#2a78d6"
ORANGE    = "#eb6834"
AQUA      = "#1baf7a"
GOOD      = "#0ca30c"
WARNING   = "#fab219"
CRITICAL  = "#d03b3b"

FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif"
MONO = "'SF Mono', Menlo, Consolas, monospace"


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def txt(x, y, s, size=20, fill=INK_2, weight="normal", anchor="start", font=FONT):
    return (f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" '
            f'fill="{fill}" font-weight="{weight}" text-anchor="{anchor}">{esc(s)}</text>')


def box(x, y, w, h, fill, r=10, opacity=1.0, stroke="none", sw=0):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" '
            f'fill-opacity="{opacity}" stroke="{stroke}" stroke-width="{sw}"/>')


def hbar(x0, y, x1, h, fill, r=4, opacity=1.0):
    w = x1 - x0
    r = min(r, w / 2 if w > 0 else 0, h / 2)
    return (f'<path d="M {x0} {y} L {x1-r} {y} Q {x1} {y} {x1} {y+r} '
            f'L {x1} {y+h-r} Q {x1} {y+h} {x1-r} {y+h} L {x0} {y+h} Z" '
            f'fill="{fill}" fill-opacity="{opacity}"/>')


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


def frame(title, subtitle, body, footnote="", defs=""):
    foot = "\n".join(txt(72, 828 + i * 22, ln, size=16, fill=MUTED)
                     for i, ln in enumerate(wrap(footnote, 168)[:3])) if footnote else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="{MUTED}"/>
</marker>
{defs}
</defs>
<rect width="{W}" height="{H}" fill="{SURFACE}"/>
{txt(72, 76, title, size=40, fill=INK, weight="bold")}
{txt(72, 116, subtitle, size=23, fill=INK_2)}
<line x1="72" y1="140" x2="{W-72}" y2="140" stroke="{GRID}" stroke-width="2"/>
{body}
{foot}
</svg>'''


def write(name, svg):
    p = os.path.join(OUT, name + ".svg")
    with open(p, "w") as f:
        f.write(svg)
    print("wrote", os.path.basename(p))


# =========================================================================
# S1 - The division of labour. The model never names a form.
# =========================================================================
def figS1():
    b = []
    stages = [
        (96,  "The table", ["column types, read", "from the data itself:", "quantitative, temporal,", "nominal, geo"], MUTED, "computed"),
        (392, "Applicability", ["all 17 forms tested", "against those types;", "cuts, caps and", "aggregate drops applied"], BLUE, "computed"),
        (688, "14 candidates", ["each already encoded", "against real columns,", "already sliced, already", "carrying its own note"], BLUE, "computed"),
        (984, "The model", ["ranks them, writes the", "title, caption and", "rationale. It picks an", "INDEX, never a form."], ORANGE, "one call"),
        (1280, "Validation", ["the same rules the", "frontend applies,", "mirrored server-side;", "errors fed back once"], AQUA, "computed"),
    ]
    for x, name, lines, col, tag in stages:
        b.append(box(x, 210, 224, 250, col, opacity=0.08))
        b.append(box(x, 210, 224, 5, col, r=2))
        b.append(txt(x + 20, 258, name, size=25, fill=INK, weight="bold"))
        for i, ln in enumerate(lines):
            b.append(txt(x + 20, 296 + i * 26, ln, size=18, fill=INK_2))
        b.append(txt(x + 20, 440, tag.upper(), size=14, fill=col, weight="bold"))
        if x < 1280:
            b.append(f'<line x1="{x+236}" y1="335" x2="{x+284}" y2="335" stroke="{MUTED}" '
                     f'stroke-width="2.5" marker-end="url(#arrow)"/>')

    b.append(box(96, 512, 1136, 3, GRID, r=0))
    b.append(txt(96, 560, "Free and closed", size=23, fill=BLUE, weight="bold"))
    b.append(txt(96, 592, "Whether a table can carry a bump chart is not a", size=19, fill=INK_2))
    b.append(txt(96, 618, "matter of taste. It follows from the column types,", size=19, fill=INK_2))
    b.append(txt(96, 644, "so it is decided by rules and costs nothing.", size=19, fill=INK_2))

    b.append(txt(800, 560, "Open and editorial", size=23, fill=ORANGE, weight="bold"))
    b.append(txt(800, 592, "Which three of the fourteen are worth a reader's", size=19, fill=INK_2))
    b.append(txt(800, 618, "attention, and how to say why, is the part no rule", size=19, fill=INK_2))
    b.append(txt(800, 644, "table supplies. That is the whole of the model's job.", size=19, fill=INK_2))

    b.append(box(96, 682, 1408, 118, ORANGE, opacity=0.09))
    b.append(txt(124, 722, "Why it is reliable on a 4B model", size=22, fill=INK, weight="bold"))
    b.append(txt(124, 754, "A model asked to name a chart type can name one the data cannot carry, and nothing downstream catches it. A model", size=19, fill=INK_2))
    b.append(txt(124, 780, "handed a numbered list of already-drawable figures can only be wrong about taste. Across 16 runs: no invalid spec, no retry.", size=19, fill=INK_2))

    return frame(
        "Chart selection: what is computed, and what is asked",
        "backend/storytelling/charts/  ·  2,147 lines of package, 715 lines of test",
        "\n".join(b),
        footnote="The candidate count is per table. The WHO tuberculosis upload and the measles registry set both produced exactly 14.")


# =========================================================================
# S3 - Where the wall clock goes. Compute is a tie; contention is not.
# =========================================================================
def figS3():
    b = []
    b.append(txt(72, 196, "Compute per selection, from Ollama's own counters", size=25, fill=INK, weight="bold"))
    b.append(txt(72, 226, "Prefill and decode are unaffected by a competing process. These are the honest numbers.", size=19, fill=INK_2))

    rows = [
        ("qwen3.5:27b", "TB · 2,389 tok", 25.1, 19.1),
        ("gemma4:31b", "TB · 2,456 tok", 32.6, 16.4),
        ("qwen3.5:27b", "measles · 1,779 tok", 21.9, 21.8),
        ("gemma4:31b", "measles · 1,785 tok", 23.6, 17.1),
    ]
    x0, scale = 430, 13.0
    y = 262
    for name, note, pre, dec in rows:
        col = ORANGE if name.startswith("qwen") else BLUE
        b.append(txt(72, y + 27, name, size=21, fill=INK, weight="bold", font=MONO))
        b.append(txt(414, y + 27, note, size=17, fill=MUTED, anchor="end"))
        b.append(hbar(x0, y, x0 + pre * scale, 34, col, opacity=0.85))
        b.append(hbar(x0 + pre * scale + 3, y, x0 + (pre + dec) * scale + 3, 34, col, opacity=0.35))
        b.append(txt(x0 + 14, y + 24, f"prefill {pre:.1f}s", size=17, fill="#ffffff", weight="bold"))
        b.append(txt(x0 + pre * scale + 17, y + 24, f"decode {dec:.1f}s", size=17, fill=INK_2))
        b.append(txt(x0 + (pre + dec) * scale + 22, y + 24, f"= {pre+dec:.1f}s", size=19, fill=INK, weight="bold"))
        y += 48
    b.append(txt(72, y + 26, "Decode rate: qwen 11.3 tok/s writing 216-247 tokens; gemma 9.3 tok/s writing 153-160. Faster, and wordier, cancel out.", size=18, fill=MUTED))

    b.append(box(72, 540, 1456, 3, GRID, r=0))
    b.append(txt(72, 596, "The same selection, three wall clocks", size=25, fill=INK, weight="bold"))
    b.append(txt(72, 626, "gemma4:31b, TB table, seed 11 — byte-identical output every time.", size=19, fill=INK_2))

    bars = [("under contention", 372.0, CRITICAL), ("under contention", 143.2, WARNING), ("competing job dead", 63.2, GOOD)]
    y = 664
    for lab, secs, col in bars:
        b.append(hbar(430, y, 430 + secs * 2.6, 32, col, opacity=0.8))
        b.append(txt(418, y + 23, lab, size=18, fill=INK_2, anchor="end"))
        b.append(txt(430 + secs * 2.6 + 14, y + 23, f"{secs:.1f} s", size=20, fill=INK, weight="bold"))
        y += 44

    return frame(
        "Throughput: a tie between the two models, and a warning about wall clock",
        "Another session's experiment held the same GPU for most of these measurements",
        "\n".join(b),
        footnote="A concurrent run_repeats.py plus its llama-server was resident for the first measurement set. It never touched "
        "prefill or decode - it inflated model load and queue wait. Any wall clock quoted from a shared machine measures the machine.")


# =========================================================================
# S5 - Seed reproducibility: the standing finding, qualified
# =========================================================================
def figS5():
    b = []
    x = 96
    for title, col, rows, verdict, sub in [
        ("RESULTS.md, measured earlier", CRITICAL,
         [("model", "llama3.1:8b"), ("temperature", "0.6"), ("output", "free-form, ~700 tokens"), ("grammar", "none")],
         "Different text", "after an unload and reload"),
        ("This endpoint, measured now", GOOD,
         [("model", "gemma4:31b"), ("temperature", "0"), ("output", "3 picks, ~150 tokens"), ("grammar", "constrained by schema")],
         "Byte-identical", "across two full evictions"),
    ]:
        b.append(box(x, 200, 688, 400, col, opacity=0.07))
        b.append(box(x, 200, 688, 5, col, r=2))
        b.append(txt(x + 28, 250, title, size=25, fill=INK, weight="bold"))
        yy = 300
        for k, v in rows:
            b.append(txt(x + 28, yy, k, size=18, fill=MUTED))
            b.append(txt(x + 200, yy, v, size=18, fill=INK_2, font=MONO))
            yy += 34
        b.append(box(x + 28, 452, 632, 118, col, opacity=0.13))
        b.append(txt(x + 52, 500, verdict, size=32, fill=col, weight="bold"))
        b.append(txt(x + 52, 534, sub, size=19, fill=INK_2))
        x += 720

    b.append(box(96, 632, 1408, 150, BLUE, opacity=0.08))
    b.append(txt(124, 674, "The two do not contradict each other, and the difference is the point", size=23, fill=INK, weight="bold"))
    b.append(txt(124, 710, "Seeded reproducibility fails where sampling has room to diverge. Grammar-constrained decoding at temperature 0 over 150 tokens", size=19, fill=INK_2))
    b.append(txt(124, 738, "has almost none, so the chart selector survives a cold load where the story generator does not. Do not carry this back to the story", size=19, fill=INK_2))
    b.append(txt(124, 766, "stages: they are the condition on the left. One repeat, so this is a qualification, not a new law.", size=19, fill=INK_2))

    return frame(
        "\"A seed does not survive an eviction\" — true of generation, not of selection",
        "Two conditions, two answers. The condition is doing the work, not the seed.",
        "\n".join(b),
        footnote="Verified by diffing two complete run outputs with the timing line removed: 372.0 s and 143.2 s of wall clock, "
        "identical bytes, with two qwen3.5:27b loads evicting gemma in between.")


# =========================================================================
# S4 - The copy failure mode: assertions made without seeing a value
# =========================================================================
def figS4():
    b = []
    b.append(box(72, 176, 1456, 92, WARNING, opacity=0.16))
    b.append(txt(96, 216, "The selector is shown column names, types, ranges and row counts.", size=23, fill=INK, weight="bold"))
    b.append(txt(96, 246, "It is never shown a single data value. Every claim in a title is therefore a claim it cannot have checked.", size=20, fill=INK_2))

    rows = [
        ('"High measles cases often coincide with low vaccination coverage"',
         "Supported, and hedged", GOOD,
         "r = -0.310 across 178 countries in 2023. Weak-to-moderate, and \"often\" is the right strength of word."),
        ('"Global measles trends diverge sharply from vaccination rates"',
         "True, by luck", WARNING,
         "The indexed figure does diverge: cases fall to 18, coverage rises to 235, both indexed to 100 at 1980."),
        ('"Countries with lower vaccination rates report more measles"',
         "Overstated", CRITICAL,
         "Same r = -0.310, about 10% of the variance, written as a flat statement of fact with no hedge at all."),
    ]
    y = 292
    for title, verdict, col, detail in rows:
        b.append(box(72, y, 1456, 120, col, opacity=0.06))
        b.append(box(72, y, 6, 120, col, r=2))
        b.append(txt(104, y + 40, title, size=22, fill=INK, font=MONO))
        b.append(txt(104, y + 74, verdict, size=21, fill=col, weight="bold"))
        b.append(txt(440, y + 74, detail, size=19, fill=INK_2))
        b.append(txt(104, y + 102, "qwen3.5:27b · measles · baseline prompt", size=16, fill=MUTED))
        y += 136

    b.append(box(72, y + 4, 1456, 100, BLUE, opacity=0.08))
    b.append(txt(100, y + 44, "gemma4:31b, same table, same seed: \"Measles cases vs vaccination coverage\" · \"Global trends in measles measures\"", size=20, fill=INK_2))
    b.append(txt(100, y + 76, "Duller, and it asserts nothing it has not been given. On a project measuring over-claiming, that is the cheaper failure.", size=20, fill=INK, weight="bold"))

    return frame(
        "Where the smaller-sounding model actually loses: copy, not choice",
        "Three titles from one run, each checked against the table the reader would see",
        "\n".join(b),
        footnote="Correlations computed from the project's own measles frame at 2023, the year those figures slice to. "
        "The 2024 slice gives r = -0.165 with n = 180; the sign is stable, the strength is not.")


# =========================================================================
# S6 - The causal 0%: what it can and cannot support
# =========================================================================
def figS6():
    b = []
    b.append(box(72, 180, 712, 250, CRITICAL, opacity=0.08))
    b.append(box(72, 180, 712, 5, CRITICAL, r=2))
    b.append(txt(100, 228, "What the page used to say", size=25, fill=INK, weight="bold"))
    for i, ln in enumerate([
            "\"Not one of the 21 causal claims across both runs",
            "was supported by the table. Causal reasoning is a",
            "capability wall, not a size problem.\"",
            "",
            "Printed in a red banner, above every other metric."]):
        b.append(txt(100, 276 + i * 30, ln, size=19, fill=INK_2))

    b.append(box(816, 180, 712, 250, GOOD, opacity=0.08))
    b.append(box(816, 180, 712, 5, GOOD, r=2))
    b.append(txt(844, 228, "What the number can support", size=25, fill=INK, weight="bold"))
    for i, ln in enumerate([
            "Both models state off-table causes with exactly",
            "the confidence they state on-table facts.",
            "",
            "That is a groundedness finding, and it is the",
            "reason the factual check is its own agent."]):
        b.append(txt(844, 276 + i * 30, ln, size=19, fill=INK_2))

    b.append(txt(72, 500, "Why the stronger claim does not follow", size=25, fill=INK, weight="bold"))
    steps = [
        ("The source table is same-day OHLCV", "open, high, low, close, volume. Five columns."),
        ("Causation is not one of them", "\"fell amid inflation concerns\" points outside the table by construction."),
        ("So the row cannot exceed zero", "however capable the model is - and a row that cannot exceed zero cannot"),
        ("", "distinguish a capability ceiling from its own floor."),
    ]
    y = 542
    for head, tail in steps:
        if head:
            b.append(txt(96, y, head, size=20, fill=INK, weight="bold"))
            b.append(txt(620, y, tail, size=19, fill=INK_2))
        else:
            b.append(txt(620, y, tail, size=19, fill=INK_2))
        y += 34

    b.append(box(72, 692, 1456, 104, WARNING, opacity=0.15))
    b.append(txt(100, 734, "And the denominator is 21 claims", size=22, fill=INK, weight="bold"))
    b.append(txt(100, 768, "13 from qwen3.5:4b, 8 from gemma4:12b. By the rule of three, none-correct-out-of-21 is consistent with a true rate near 14%.", size=19, fill=INK_2))

    return frame(
        "The 0% causal row measures groundedness, not causal ability",
        "Corrected in results.py, app/results/page.tsx and lib/data/metrics.ts",
        "\n".join(b),
        footnote="Four written records still carry the older wording and were deliberately left alone: RESULTS.md:143, "
        "reproductions/REPRODUCTIONS_SUMMARY.md:114, reproductions/paper9-datatales/REPORT_gemma4.md:30, presentation/figures/README.md:41.")


# =========================================================================
# S2 - Which model should select? Same seed, same table, same 14 candidates.
# =========================================================================
def figS2():
    b = []
    cells = [
        (72,  200, "qwen3.5:27b", ORANGE, "WHO tuberculosis · uploaded CSV",
         [("choropleth", "where the burden is", True),
          ("bivariateChoropleth", "where it is high AND undetected", True),
          ("line", "how the worst have moved", False)],
         "Two maps. The second contains the first."),
        (800, 200, "gemma4:31b", BLUE, "WHO tuberculosis · uploaded CSV",
         [("choropleth", "where the burden is", False),
          ("bar", "which fifteen are worst, 2024", False),
          ("scatter", "does detection keep up", False)],
         "Where, who, and whether. Three jobs."),
        (72,  520, "qwen3.5:27b", ORANGE, "measles · registry",
         [("bivariateChoropleth", "high cases, low coverage, where", True),
          ("line", "how both have moved, indexed", False),
          ("scatter", "do cases track coverage", True)],
         "The map and the scatter ask one question."),
        (800, 520, "gemma4:31b", BLUE, "measles · registry",
         [("bivariateChoropleth", "high cases, low coverage, where", False),
          ("line", "how both have moved, indexed", False),
          ("bump", "whose rank is volatile", False)],
         "The bivariate map frees the third slot."),
    ]
    for x, y, model, col, table, picks, verdict in cells:
        bad = any(p[2] for p in picks)
        b.append(box(x, y, 728, 290, col, opacity=0.06))
        b.append(box(x, y, 728, 5, col, r=2))
        b.append(txt(x + 26, y + 46, model, size=24, fill=INK, weight="bold", font=MONO))
        b.append(txt(x + 702, y + 46, table, size=17, fill=MUTED, anchor="end"))
        yy = y + 86
        for form, q, dup in picks:
            mark = CRITICAL if dup else col
            b.append(f'<circle cx="{x+38}" cy="{yy-6}" r="6" fill="{mark}" fill-opacity="{1 if dup else 0.45}"/>')
            b.append(txt(x + 60, yy, form, size=20, fill=INK, font=MONO))
            b.append(txt(x + 330, yy, q, size=19, fill=INK_2))
            yy += 42
        vcol = CRITICAL if bad else GOOD
        b.append(box(x + 26, y + 216, 676, 52, vcol, opacity=0.12))
        b.append(txt(x + 46, y + 250, ("REDUNDANT · " if bad else "THREE DISTINCT QUESTIONS · ") + verdict,
                     size=18, fill=vcol if bad else INK_2, weight="bold" if bad else "normal"))

    return frame(
        "Same table, same seed, same fourteen candidates — two models",
        "seed 11 · temperature 0 · n = 3 · the original prompt",
        "\n".join(b),
        footnote="Red marks a pair of figures a reader would answer the same question from. gemma4:31b spans more ground on both "
        "tables; qwen3.5:27b writes the better rationales. The redundancy turned out to be fixable, and the prose was not the deciding axis.")


# =========================================================================
# S7 - Fixing redundancy: prose could not, the schema could
# =========================================================================
def figS7():
    b = []
    runs = ["qwen · TB", "qwen · measles", "gemma · TB", "gemma · measles"]
    variants = [
        ("Baseline", '"Prefer variety: three near-identical figures waste the reader\'s time."',
         [False, False, True, True], "2 of 4 clean"),
        ("Variant A · prose", '"Each figure must answer a DIFFERENT question… judge that by the question, not the shape."',
         [False, False, True, True], "2 of 4 clean"),
        ("Variant B · schema", 'A required question field, decoded BEFORE the index, plus the same instruction.',
         [True, True, True, True], "4 of 4 clean"),
    ]
    x0, colw = 560, 240
    for i, r in enumerate(runs):
        b.append(txt(x0 + i * colw + colw / 2, 214, r, size=18, fill=MUTED, anchor="middle"))
    y = 240
    for name, desc, marks, tally in variants:
        b.append(box(72, y, 1456, 148, GOOD if all(marks) else CRITICAL, opacity=0.05))
        b.append(txt(100, y + 44, name, size=24, fill=INK, weight="bold"))
        for j, ln in enumerate(wrap(desc, 62)[:2]):
            b.append(txt(100, y + 78 + j * 26, ln, size=17, fill=INK_2))
        b.append(txt(100, y + 134, tally, size=18, fill=GOOD if all(marks) else CRITICAL, weight="bold"))
        for i, ok in enumerate(marks):
            cx, cy = x0 + i * colw + colw / 2, y + 74
            col = GOOD if ok else CRITICAL
            b.append(f'<circle cx="{cx}" cy="{cy}" r="30" fill="{col}" fill-opacity="0.14"/>')
            if ok:
                b.append(f'<path d="M {cx-13} {cy+1} l 9 10 l 18 -20" stroke="{col}" stroke-width="5" '
                         f'fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
            else:
                b.append(f'<path d="M {cx-11} {cy-11} l 22 22 M {cx+11} {cy-11} l -22 22" stroke="{col}" '
                         f'stroke-width="5" stroke-linecap="round"/>')
        y += 164

    b.append(box(72, 740, 712, 118, BLUE, opacity=0.09))
    b.append(txt(100, 782, "Why prose could not do it", size=21, fill=INK, weight="bold"))
    b.append(txt(100, 814, "The model had no place to put a question, so it had", size=18, fill=INK_2))
    b.append(txt(100, 838, "nothing to compare the next figure against.", size=18, fill=INK_2))

    b.append(box(816, 740, 712, 118, GOOD, opacity=0.11))
    b.append(txt(844, 782, "And a second thing fixed itself", size=21, fill=INK, weight="bold"))
    b.append(txt(844, 814, "Every over-claiming title disappeared. Asked for the", size=18, fill=INK_2))
    b.append(txt(844, 838, "question first, both models titled the question, not an answer.", size=18, fill=INK_2))

    return frame(
        "Redundancy was a prompt defect, and prose was not enough to fix it",
        "Twelve runs · two models · two tables · three prompts · seed 11 throughout",
        "\n".join(b))


for f in (figS1, figS2, figS3, figS4, figS5, figS6, figS7):
    write(f.__name__, f())
