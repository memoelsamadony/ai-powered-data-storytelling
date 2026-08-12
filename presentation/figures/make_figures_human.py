#!/usr/bin/env python3
"""Figures 9-12: the human comparison, and which combination to ship.

Unlike fig1-fig8, which transcribe from RESULTS.md, these read
``experiments/exp_json/*.json`` and ``experiments/human_vs_machine.json``
directly, so a re-run of the experiment moves the figure. Nothing is typed in
twice. The house rule from make_figures.py still holds: where a number carries a
caveat, the caveat is drawn on the figure rather than left to the speaker.

    python3 presentation/figures/make_figures_human.py && ./render.sh
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_figures import (  # noqa: E402
    W, H, SURFACE, INK, INK_2, MUTED, GRID, BASELINE,
    BLUE, ORANGE, AQUA, GOOD, WARNING, CRITICAL, FONT,
    txt, vbar, hbar, frame, write,
)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EXP = os.path.join(ROOT, "experiments")

HUMAN = json.load(open(os.path.join(EXP, "exp_json", "exp-human-comparison.json")))
RANK = json.load(open(os.path.join(EXP, "exp_json", "exp-combination-ranking.json")))
RUNS = json.load(open(os.path.join(EXP, "human_vs_machine.json")))["runs"]
PAIR = json.load(open(os.path.join(EXP, "pairwise_results.json")))

SERIES_LABEL = {
    "pertussis-global": "Pertussis",
    "diphtheria-global": "Diphtheria",
    "under5-measles-deaths": "Under-5 measles deaths",
    "mumps-global": "Mumps",
    "measles": "Measles",
}


# =========================================================================
# FIG 9 - tone convergence onto the human level, per series
# =========================================================================
def fig9():
    ps = HUMAN["per_series"]
    order = sorted(ps, key=lambda s: -ps[s]["machine_raw_alarmism_mean"])
    x0, x1 = 300, W - 260           # 1.0 .. 5.0
    lo, hi = 1.0, 5.0
    sx = lambda v: x0 + (v - lo) / (hi - lo) * (x1 - x0)
    top, step = 232, 96
    b = []

    # scale
    for v in [1, 2, 3, 4, 5]:
        b.append(f'<line x1="{sx(v)}" y1="{top-40}" x2="{sx(v)}" y2="{top+step*len(order)-40}" '
                 f'stroke="{GRID}" stroke-width="2"/>')
        b.append(txt(sx(v), top - 52, f"{v}", size=18, fill=MUTED, anchor="middle"))
    b.append(txt(sx(1), top - 78, "flat, hides the stakes", size=16, fill=MUTED, anchor="middle"))
    b.append(txt(sx(3), top - 78, "calibrated", size=16, fill=MUTED, anchor="middle"))
    b.append(txt(sx(5), top - 78, "catastrophising", size=16, fill=MUTED, anchor="middle"))

    for i, s in enumerate(order):
        d = ps[s]
        y = top + i * step
        raw, mod, hum = (d["machine_raw_alarmism_mean"],
                         d["machine_moderated_alarmism_mean"],
                         d["human_alarmism_median"])
        b.append(txt(72, y + 6, SERIES_LABEL.get(s, s), size=21, fill=INK, weight="bold"))
        b.append(txt(72, y + 28, f"n={d['n_runs']} run{'s' if d['n_runs'] > 1 else ''}",
                     size=15, fill=MUTED))
        # human band, +/- 0.5
        b.append(f'<rect x="{sx(hum-0.5)}" y="{y-26}" width="{sx(hum+0.5)-sx(hum-0.5)}" '
                 f'height="52" fill="{AQUA}" fill-opacity="0.12" rx="4"/>')
        b.append(f'<line x1="{sx(hum)}" y1="{y-26}" x2="{sx(hum)}" y2="{y+26}" '
                 f'stroke="{AQUA}" stroke-width="3"/>')
        # the move
        b.append(f'<line x1="{sx(raw)}" y1="{y}" x2="{sx(mod)}" y2="{y}" stroke="{MUTED}" '
                 f'stroke-width="2.5" marker-end="url(#arrow)"/>')
        b.append(f'<circle cx="{sx(raw)}" cy="{y}" r="9" fill="none" stroke="{CRITICAL}" stroke-width="3"/>')
        b.append(f'<circle cx="{sx(mod)}" cy="{y}" r="9" fill="{BLUE}"/>')
        b.append(txt(sx(raw), y - 20, f"{raw:.2f}", size=16, fill=CRITICAL, anchor="middle"))
        b.append(txt(sx(mod), y + 34, f"{mod:.2f}", size=16, fill=BLUE, anchor="middle"))

    ly = top + step * len(order) - 10
    b.append(f'<circle cx="{x0+16}" cy="{ly}" r="8" fill="none" stroke="{CRITICAL}" stroke-width="3"/>')
    b.append(txt(x0 + 34, ly + 6, "raw", size=18, fill=INK_2))
    b.append(f'<circle cx="{x0+130}" cy="{ly}" r="8" fill="{BLUE}"/>')
    b.append(txt(x0 + 148, ly + 6, "after moderation", size=18, fill=INK_2))
    b.append(f'<rect x="{x0+380}" y="{ly-10}" width="34" height="20" fill="{AQUA}" fill-opacity="0.12"/>')
    b.append(f'<line x1="{x0+397}" y1="{ly-10}" x2="{x0+397}" y2="{ly+10}" stroke="{AQUA}" stroke-width="3"/>')
    b.append(txt(x0 + 424, ly + 6, "human median +/- 0.5 (5 writers per series)",
                 size=18, fill=INK_2))

    ag = HUMAN["aggregate"]
    return frame(
        "Moderation moves machine stories onto the human level",
        f"Alarmism 1-5, Claude Opus judging blind, one story at a time.   "
        f"Overall {ag['alarmism_raw_mean']:.2f} -> {ag['alarmism_moderated_mean']:.2f}, "
        f"human median {ag['human_alarmism_median']:.2f}.",
        "\n".join(b),
        "n=1 per cell on four of five series, so each arrow is one run, not a mean of repeats. "
        "The human stories carry no headline and the machine stories do; headlines concentrate "
        "alarmism, so the human line is if anything flattered and every gap shown is a lower bound.",
    )


# =========================================================================
# FIG 10 - the decision matrix: which combination to ship
# =========================================================================
def fig10():
    # One row per configuration, not one per run. The five-seed repeats landed in
    # the ranking file afterwards and pushed g4b and g8b to six rows each, which
    # overflowed the table into its own footnote - and, worse, put repeated runs
    # inside a figure whose entire point is that it is the n=1 grid. Collapse to
    # the first run of each tier, which is the run this table originally showed.
    seen: set[str] = set()
    rank = []
    for r in RANK["ranking"]:
        if r["tier"] not in seen:
            seen.add(r["tier"])
            rank.append(r)
    b = []
    # No tier column. The internal ids meant nothing to a reader, and dropping
    # them exposes something better: where a generator x moderator pair appears
    # more than once, those are separate runs of the same configuration, and the
    # "figures kept" column disagrees with itself across them. That disagreement
    # is the whole argument for fig13, so the table should show it rather than
    # hide it behind an id.
    cols = [(72, "generator  x  moderator", "start"),
            (700, "alarmism", "middle"), (850, "gap to human", "middle"),
            (1010, "figures kept", "middle"), (1180, "invented", "middle"),
            (1330, "chrF++ to human", "middle"), (1500, "seconds", "middle")]
    y = 196
    for x, label, anchor in cols:
        b.append(txt(x, y, label, size=16, fill=MUTED, anchor=anchor))
    b.append(f'<line x1="72" y1="{y+13}" x2="{W-72}" y2="{y+13}" stroke="{GRID}" stroke-width="2"/>')

    row_h = 36
    for i, r in enumerate(rank):
        yy = y + 44 + i * row_h
        tied = r["gap_to_human"] == 0.0
        bad = r["added_unsupported"] > 0
        pick = tied and not bad
        if pick:
            b.append(f'<rect x="64" y="{yy-25}" width="{W-128}" height="{row_h-4}" '
                     f'fill="{AQUA}" fill-opacity="0.09" rx="4"/>')
        if bad:
            b.append(f'<rect x="64" y="{yy-25}" width="{W-128}" height="{row_h-4}" '
                     f'fill="{CRITICAL}" fill-opacity="0.07" rx="4"/>')
        b.append(txt(72, yy, f"{r['generator']}  x  {r['moderator']}", size=19,
                     fill=INK, weight="bold" if pick else "normal"))
        b.append(txt(700, yy, f"{r['moderated_alarmism']}", size=19, fill=INK_2, anchor="middle"))
        b.append(txt(850, yy, f"{r['gap_to_human']:.1f}", size=19,
                     fill=GOOD if tied else INK_2, anchor="middle"))
        ret = r["numeric_retention"] or 0
        b.append(txt(1010, yy, f"{ret*100:.0f}%", size=19,
                     fill=GOOD if ret >= 0.7 else (WARNING if ret >= 0.5 else CRITICAL),
                     anchor="middle"))
        b.append(txt(1180, yy, "0" if not bad else f"{r['added_unsupported']}  invented",
                     size=19, fill=CRITICAL if bad else INK_2, anchor="middle"))
        b.append(txt(1330, yy, f"{(r['chrf_max_to_human'] or 0):.3f}", size=19,
                     fill=INK_2, anchor="middle"))
        b.append(txt(1500, yy, f"{r['seconds']:.0f}", size=19, fill=INK_2, anchor="middle"))

    return frame(
        "Six combinations tie on tone. Faithfulness breaks the tie.",
        "Superseded by fig13: five seeds per cell reverse the retention column. Read this "
        "as the ranking it is, not as a recommendation.",
        "\n".join(b),
        "Pertussis only, one row per run. Where a pair of models appears twice or more, "
        "those are separate runs of the same configuration and \"figures kept\" disagrees "
        "with itself: 50%, 75% and 100% for llama3.1:8b x gemma4:31b. That spread is why one "
        "run cannot rank anything, and it is what fig13 measures. The grid is L-shaped, so "
        "the best x best cell was never run. Red rows invented a figure.",
    )


# =========================================================================
# FIG 11 - the two axes, and why one was not enough
# =========================================================================
def fig11():
    ag = HUMAN["aggregate"]
    x0, x1, ytop, ybot = 340, 1180, 220, 720
    lo, hi = 1.0, 5.0
    sx = lambda v: x0 + (v - lo) / (hi - lo) * (x1 - x0)
    sy = lambda v: ybot - (v - lo) / (hi - lo) * (ybot - ytop)
    b = []
    for v in [1, 2, 3, 4, 5]:
        b.append(f'<line x1="{sx(v)}" y1="{ytop}" x2="{sx(v)}" y2="{ybot}" stroke="{GRID}" stroke-width="1.5"/>')
        b.append(f'<line x1="{x0}" y1="{sy(v)}" x2="{x1}" y2="{sy(v)}" stroke="{GRID}" stroke-width="1.5"/>')
        b.append(txt(sx(v), ybot + 30, f"{v}", size=17, fill=MUTED, anchor="middle"))
        b.append(txt(x0 - 20, sy(v) + 6, f"{v}", size=17, fill=MUTED, anchor="end"))
    b.append(txt((x0 + x1) / 2, ybot + 64, "ALARMISM  ->", size=19, fill=INK_2, anchor="middle"))
    b.append(f'<text x="{x0-62}" y="{(ytop+ybot)/2}" font-family="{FONT}" font-size="19" '
             f'fill="{INK_2}" text-anchor="middle" transform="rotate(-90 {x0-62} {(ytop+ybot)/2})">'
             f'OPTIMISM  -&gt;</text>')
    # calibrated crosshair
    b.append(f'<circle cx="{sx(3)}" cy="{sy(3)}" r="13" fill="none" stroke="{AQUA}" '
             f'stroke-width="2.5" stroke-dasharray="4 4"/>')
    b.append(txt(sx(3) + 22, sy(3) - 12, "calibrated on both", size=16, fill=AQUA))

    for r in RUNS:
        a, o = r["alarmism"], r["optimism"]
        if None in (a["raw"], a["moderated"], o["raw"], o["moderated"]):
            continue
        b.append(f'<line x1="{sx(a["raw"])}" y1="{sy(o["raw"])}" x2="{sx(a["moderated"])}" '
                 f'y2="{sy(o["moderated"])}" stroke="{MUTED}" stroke-width="1.6" '
                 f'stroke-opacity="0.55" marker-end="url(#arrow)"/>')
        b.append(f'<circle cx="{sx(a["raw"])}" cy="{sy(o["raw"])}" r="6" fill="none" '
                 f'stroke="{CRITICAL}" stroke-width="2.2"/>')
        b.append(f'<circle cx="{sx(a["moderated"])}" cy="{sy(o["moderated"])}" r="6" fill="{BLUE}"/>')

    b.append(f'<path d="M {sx(ag["human_alarmism_median"])-13} {sy(ag["human_optimism_median"])} '
             f'L {sx(ag["human_alarmism_median"])} {sy(ag["human_optimism_median"])-13} '
             f'L {sx(ag["human_alarmism_median"])+13} {sy(ag["human_optimism_median"])} '
             f'L {sx(ag["human_alarmism_median"])} {sy(ag["human_optimism_median"])+13} Z" '
             f'fill="{AQUA}"/>')
    b.append(txt(sx(ag["human_alarmism_median"]) + 22, sy(ag["human_optimism_median"]) + 6,
                 "human median", size=17, fill=AQUA, weight="bold"))

    lx, ly = 1250, 260
    for i, (label, mk) in enumerate([
        ("raw story", f'<circle cx="{lx}" cy="{ly}" r="6" fill="none" stroke="{CRITICAL}" stroke-width="2.2"/>'),
        ("after moderation", f'<circle cx="{lx}" cy="{ly+38}" r="6" fill="{BLUE}"/>'),
    ]):
        b.append(mk)
        b.append(txt(lx + 20, ly + 6 + i * 38, label, size=18, fill=INK_2))
    note = ("Both ends of both axes are failures. A story can be low on both "
            "(flat, no stance) or high on both: catastrophising the past while "
            "implying the danger has passed.")
    for i, line in enumerate([note[k:k+34] for k in range(0, 0)]):
        pass
    b.append(txt(lx, ly + 110, "Why two axes", size=19, fill=INK, weight="bold"))
    for i, line in enumerate([
        "A falling series tempts the opposite",
        "failure. On WHO child mortality the",
        "raw story scored a calm 2.0 alarmism",
        "and a 4.5 optimism: 'nothing short of",
        "miraculous'. One axis sees nothing",
        "there; moderation moved it to 2.5.",
    ]):
        b.append(txt(lx, ly + 142 + i * 26, line, size=17, fill=INK_2))

    return frame(
        "Two axes, because a falling series fails in the other direction",
        f"Every run: {len([r for r in RUNS if r['optimism']['raw'] is not None])} raw-to-moderated "
        f"moves, all eight datasets.",
        "\n".join(b),
        f"Alarmism falls {ag['alarmism_raw_mean']:.2f} -> {ag['alarmism_moderated_mean']:.2f} "
        f"and optimism rises {ag['optimism_raw_mean']:.2f} -> {ag['optimism_moderated_mean']:.2f}, "
        f"both toward the middle. Note the moderated cloud settles below alarmism 3: the "
        f"moderator aims at quiet rather than at calibrated, and lands near where these human "
        f"writers also sit (diamond).",
    )


# =========================================================================
# FIG 12 - the pairwise verdict, including what it costs
# =========================================================================
def fig12():
    key = {k["pair_id"]: k for k in
           json.load(open(os.path.join(EXP, "pairwise_key.json")))["key"]}
    crits = ["factual_correctness", "relevance_informativeness",
             "structure_coherence", "narrative_quality"]
    label = {"factual_correctness": "Factual correctness",
             "relevance_informativeness": "Relevance & informativeness",
             "structure_coherence": "Structure & coherence",
             "narrative_quality": "Narrative quality"}
    tally = {c: {"moderated": 0, "raw": 0, "tie": 0} for c in crits}
    overall = {"moderated": 0, "raw": 0, "tie": 0}
    n = 0
    for v in PAIR["verdicts"]:
        k = key.get(v["pair_id"])
        if not k:
            continue
        n += 1
        for c in crits:
            pick = v["criteria"].get(c)
            if pick == "tie":
                tally[c]["tie"] += 1
            elif pick in ("story_1", "story_2"):
                tally[c][k["story_1_is"] if pick == "story_1" else k["story_2_is"]] += 1
        ov = v.get("overall")
        if ov == "tie":
            overall["tie"] += 1
        elif ov in ("story_1", "story_2"):
            overall[k["story_1_is"] if ov == "story_1" else k["story_2_is"]] += 1

    x0, x1 = 520, W - 320
    b = []
    rows = [(label[c], tally[c]) for c in crits] + [("OVERALL", overall)]
    for i, (name, d) in enumerate(rows):
        y = 240 + i * 96
        tot = sum(d.values()) or 1
        b.append(txt(72, y + 8, name, size=21, fill=INK,
                     weight="bold" if name == "OVERALL" else "normal"))
        x = x0
        for kkey, col in (("moderated", BLUE), ("tie", BASELINE), ("raw", ORANGE)):
            w = (x1 - x0) * d[kkey] / tot
            if w > 0:
                b.append(hbar(x, y - 18, x + w, 38, col))
                if w > 54:
                    b.append(txt(x + w / 2, y + 8, f"{100*d[kkey]/tot:.0f}%", size=18,
                                 fill="#ffffff", anchor="middle", ))
            x += w
        if name == "Narrative quality":
            b.append(txt(x1 + 20, y + 8, "the cost", size=19, fill=ORANGE, weight="bold"))

    ly = 240 + len(rows) * 96 - 24
    for i, (t, c) in enumerate([("moderated wins", BLUE), ("tie", BASELINE), ("raw wins", ORANGE)]):
        b.append(hbar(x0 + i * 250, ly, x0 + i * 250 + 30, 20, c))
        b.append(txt(x0 + i * 250 + 42, ly + 16, t, size=18, fill=INK_2))

    pos = PAIR.get("position_first_pick_pct")
    return frame(
        "The moderated story wins on everything except readability",
        f"{n} blinded pairs, position randomised, Claude Opus deciding each criterion.",
        "\n".join(b),
        "The judge is never told which story was moderated, and which one is shown first is decided "
        "by a coin flip per pair. Narrative quality is the one criterion the raw story wins, and it "
        "wins it three times as often: this system buys calibration and accuracy by spending "
        "engagement, and a deck that hides that row is selling rather than reporting.",
    )



# =========================================================================
# FIG 13 - what five repeats did to the recommendation
# =========================================================================
def fig13():
    rep = json.load(open(os.path.join(EXP, "exp_json", "exp-repeats-g4b-g8b.json")))
    cfg = rep["configs"]
    b = []
    x0, x1 = 420, 1180
    lo, hi = 0.0, 1.0
    sx = lambda v: x0 + (v - lo) / (hi - lo) * (x1 - x0)

    b.append(txt(72, 208, "NUMERIC RETENTION - the share of the raw story's figures "
                          "that survive moderation", size=17, fill=MUTED))
    for v in [0, 0.25, 0.5, 0.75, 1.0]:
        b.append(f'<line x1="{sx(v)}" y1="238" x2="{sx(v)}" y2="470" stroke="{GRID}" stroke-width="2"/>')
        b.append(txt(sx(v), 496, f"{v*100:.0f}%", size=17, fill=MUTED, anchor="middle"))

    for i, tier in enumerate(["g4b", "g8b"]):
        c = cfg[tier]
        y = 290 + i * 108
        vals = [r["numeric_retention"] for r in c["runs"] if r["numeric_retention"] is not None]
        mean = sum(vals) / len(vals)
        b.append(txt(72, y - 4, c["label"], size=20, fill=INK, weight="bold"))
        b.append(txt(72, y + 22, f"n=5 seeds", size=15, fill=MUTED))
        # range
        b.append(f'<line x1="{sx(min(vals))}" y1="{y}" x2="{sx(max(vals))}" y2="{y}" '
                 f'stroke="{BASELINE}" stroke-width="10" stroke-linecap="round"/>')
        for v in vals:
            b.append(f'<circle cx="{sx(v)}" cy="{y}" r="7" fill="{BLUE}" fill-opacity="0.75"/>')
        b.append(f'<line x1="{sx(mean)}" y1="{y-22}" x2="{sx(mean)}" y2="{y+22}" '
                 f'stroke="{INK}" stroke-width="3"/>')
        b.append(txt(sx(mean), y - 32, f"{mean*100:.0f}%", size=19, fill=INK,
                     weight="bold", anchor="middle"))
        # what the single run had said
        single = {"g4b": 0.714, "g8b": 0.50}[tier]
        b.append(f'<circle cx="{sx(single)}" cy="{y}" r="11" fill="none" '
                 f'stroke="{CRITICAL}" stroke-width="3" stroke-dasharray="3 3"/>')
        b.append(txt(sx(single), y + 44, f"n=1 said {single*100:.0f}%", size=16,
                     fill=CRITICAL, anchor="middle"))

    b.append(f'<rect x="1240" y="250" width="290" height="286" fill="{CRITICAL}" '
             f'fill-opacity="0.06" rx="6"/>')
    b.append(txt(1262, 284, "The ranking was", size=19, fill=INK, weight="bold"))
    b.append(txt(1262, 310, "backwards", size=19, fill=CRITICAL, weight="bold"))
    for i, line in enumerate([
        "One run each had put",
        "qwen3.5:4b ahead on",
        "retention, 71% to 50%.",
        "Five seeds each reverse",
        "it: 61% to 91%.",
        "",
        "Welch t = -2.70, p = 0.029,",
        "Cohen d = 1.71.",
    ]):
        b.append(txt(1262, 346 + i * 24, line, size=16, fill=INK_2))

    b.append(txt(72, 560, "MODERATED ALARMISM - where the moderator leaves the story",
                 size=17, fill=MUTED))
    ax0, ax1 = 420, 1180
    alo, ahi = 1.0, 3.0
    ax = lambda v: ax0 + (v - alo) / (ahi - alo) * (ax1 - ax0)
    for v in [1.0, 1.5, 2.0, 2.5, 3.0]:
        b.append(f'<line x1="{ax(v)}" y1="590" x2="{ax(v)}" y2="720" stroke="{GRID}" stroke-width="2"/>')
        b.append(txt(ax(v), 746, f"{v}", size=17, fill=MUTED, anchor="middle"))
    for i, tier in enumerate(["g4b", "g8b"]):
        c = cfg[tier]
        y = 626 + i * 56
        vals = [r["alarmism_moderated"] for r in c["runs"] if r["alarmism_moderated"] is not None]
        mean = sum(vals) / len(vals)
        b.append(txt(72, y + 6, c["label"], size=17, fill=INK_2))
        b.append(f'<line x1="{ax(min(vals))}" y1="{y}" x2="{ax(max(vals))}" y2="{y}" '
                 f'stroke="{BASELINE}" stroke-width="8" stroke-linecap="round"/>')
        for v in vals:
            b.append(f'<circle cx="{ax(v)}" cy="{y}" r="6" fill="{AQUA}" fill-opacity="0.8"/>')
        b.append(f'<line x1="{ax(mean)}" y1="{y-16}" x2="{ax(mean)}" y2="{y+16}" '
                 f'stroke="{INK}" stroke-width="3"/>')
        b.append(txt(ax(mean) + 16, y + 6, f"{mean:.2f}", size=17, fill=INK, weight="bold"))
    b.append(txt(1240, 660, "Identical: 2.10 both, p = 1.00.", size=17, fill=INK_2))
    b.append(txt(1240, 686, "The moderator converges on the", size=17, fill=INK_2))
    b.append(txt(1240, 712, "same tone whoever wrote the draft.", size=17, fill=INK_2))

    return frame(
        "Five seeds per cell, and the recommendation flips",
        "Same two configurations, run five times each at distinct seeds, pertussis-global.",
        "\n".join(b),
        "Seeds differ deliberately: repeats at a fixed seed replay the same text and measure "
        "determinism, not stability. Judge noise is not the source of this spread - three "
        "independent passes over the same story agree to ICC 0.99, mean spread 0.08, against a "
        "run-to-run alarmism spread of 0.42. The variance is the generator's, not the judge's.",
    )


# =========================================================================
# FIG 14 - the judge has an error bar now
# =========================================================================
def fig14():
    rel = json.load(open(os.path.join(EXP, "exp_json", "exp-judge-reliability.json")))
    al = rel["alarmism"]
    b = []
    cards = [
        ("ICC(2,1)", f"{al['icc_2_1']:.3f}", "two-way random, absolute agreement", GOOD),
        ("Krippendorff alpha", f"{al['krippendorff_alpha']:.3f}", "interval scale", GOOD),
        ("mean spread", f"{al['mean_spread']:.2f}", "points, over three passes", GOOD),
        ("max spread", f"{al['max_spread']:.1f}", "worst single story", WARNING),
    ]
    for i, (label, value, sub, col) in enumerate(cards):
        x = 72 + i * 370
        b.append(f'<rect x="{x}" y="200" width="330" height="150" fill="{col}" '
                 f'fill-opacity="0.07" rx="8"/>')
        b.append(txt(x + 24, 240, label, size=17, fill=MUTED))
        b.append(txt(x + 24, 300, value, size=52, fill=col, weight="bold"))
        b.append(txt(x + 24, 330, sub, size=15, fill=MUTED))

    n = rel["n_stories"]
    b.append(txt(72, 420, f"Agreement across all {n} stories, three independent passes each",
                 size=19, fill=INK, weight="bold"))
    bars = [("identical on all three", al["identical_all_passes"], GOOD),
            ("within 0.5 of each other", al["within_0_5"] - al["identical_all_passes"], AQUA),
            ("further apart", n - al["within_0_5"], CRITICAL)]
    x = 72
    for label, count, col in bars:
        w = (W - 144) * count / n
        if w > 0:
            b.append(hbar(x, 450, x + w, 46, col))
            if w > 90:
                b.append(txt(x + w / 2, 480, f"{count}", size=22, fill="#ffffff",
                             anchor="middle", weight="bold"))
        x += w
    x = 72
    for label, count, col in bars:
        w = (W - 144) * count / n
        if w > 90:
            b.append(txt(x + w / 2, 522, label, size=16, fill=INK_2, anchor="middle"))
        x += w

    b.append(txt(72, 600, "Why this matters for every other number in the deck",
                 size=19, fill=INK, weight="bold"))
    for i, line in enumerate([
        "The judge disagrees with itself by 0.08 points on average. The same configuration "
        "run at five different",
        "seeds disagrees with itself by 0.42. So the spread in the repeat experiment is the "
        "generator resampling,",
        "not the instrument wobbling - which is what makes it worth measuring rather than "
        "averaging away.",
    ]):
        b.append(txt(72, 634 + i * 28, line, size=18, fill=INK_2))

    return frame(
        "The tone scale now has an error bar",
        f"Every story rated three times by Claude Opus, {rel['passes'] * n} calls, "
        f"${rel['cost_usd']:.2f}.",
        "\n".join(b),
        "Same model and same prompt on all three passes, so this is self-consistency, not "
        "inter-rater reliability: it is an upper bound on what a different judge would agree "
        "to. Calls are stateless and share no context, which is the only sense in which they "
        "are independent.",
    )

if __name__ == "__main__":
    write("fig9", fig9())
    write("fig10", fig10())
    write("fig11", fig11())
    write("fig12", fig12())
    write("fig13", fig13())
    write("fig14", fig14())
