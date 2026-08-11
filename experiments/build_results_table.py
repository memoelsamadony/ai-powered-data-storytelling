#!/usr/bin/env python3
"""One row per run: which generator, which moderator, which judge, every metric.

The pipeline stores stages and text; this joins them to the model that produced
each stage and to every judge-free metric the project has, so a reader can see
the pairing and the numbers in the same place instead of inferring the pairing
from a tier name.

    python3 experiments/build_results_table.py            # markdown to stdout
    python3 experiments/build_results_table.py --json     # machine-readable
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402
django.setup()
from storytelling import faithfulness, metrics, ollama_client as oc, textstats  # noqa: E402
from storytelling.models import Run, StageResult  # noqa: E402
from storytelling.services import _dataset_values  # noqa: E402
from storytelling.datasets import SPECS, load_frame  # noqa: E402

_VALS: dict = {}
_SERIES: dict = {}


def values_for(ds: str):
    if ds not in _VALS:
        _VALS[ds] = _dataset_values(ds)
    return _VALS[ds]


def series_for(ds: str) -> dict:
    """year -> primary value, for the trend-selection metric."""
    if ds in _SERIES:
        return _SERIES[ds]
    spec = SPECS[ds]
    df = load_frame(ds)
    agg = df[df["country"] == spec.aggregate_row]
    out = {}
    for _, r in agg.iterrows():
        v = r.get(spec.primary_col)
        try:
            if v is not None and v == v:
                out[int(r["year"])] = float(v)
        except (TypeError, ValueError):
            pass
    _SERIES[ds] = out
    return out


def row_for(run: Run) -> dict:
    tier = oc.resolve_tier(run.tier)
    raw = "\n\n".join(run.raw_paragraphs or [])
    mod = "\n\n".join(run.moderated_paragraphs or [])
    vals, years = values_for(run.dataset_id)
    g_raw = metrics.groundedness(f"{run.raw_title}\n\n{raw}", vals, years)
    g_mod = metrics.groundedness(f"{run.moderated_title}\n\n{mod}", vals, years)
    t_raw, t_mod = textstats.analyse(raw), textstats.analyse(mod)
    ret = faithfulness.retention(raw, mod)
    inj = faithfulness.injection(mod, raw, vals)
    rw = faithfulness.rewrite_intensity(raw, mod)
    sel_raw = faithfulness.trend_selection(raw, series_for(run.dataset_id))
    sel_mod = faithfulness.trend_selection(mod, series_for(run.dataset_id))
    stages = {s.stage: {"model": s.model, "seconds": round(s.duration_s or 0, 1)}
              for s in StageResult.objects.filter(run=run)}
    a_raw, a_mod = run.raw_alarmism, run.moderated_alarmism
    o_raw, o_mod = run.opus_raw_alarmism, run.opus_moderated_alarmism
    return {
        "run": str(run.id),
        "dataset": run.dataset_id,
        "tier": run.tier,
        "generator": tier.generator,
        "moderator": tier.moderator,
        "local_judge": tier.judge,
        "self_judging": tier.judge == tier.moderator,
        "opus_judge": run.opus_model or None,
        "alarmism_raw_local": a_raw,
        "alarmism_moderated_local": a_mod,
        "alarmism_delta_local": (None if a_raw is None or a_mod is None
                                 else round(a_mod - a_raw, 2)),
        "alarmism_raw_opus": o_raw,
        "alarmism_moderated_opus": o_mod,
        "alarmism_delta_opus": (None if o_raw is None or o_mod is None
                                else round(o_mod - o_raw, 2)),
        "emotive_spans": len(run.emotive_spans or []),
        "flagged_claims": sum(1 for c in (run.factual_check or [])
                              if not c.get("supported", True)),
        "groundedness_raw": f"{g_raw['supported']}/{g_raw['stated']}",
        "groundedness_moderated": f"{g_mod['supported']}/{g_mod['stated']}",
        "numeric_retention": (None if ret["numeric_retention"] is None
                              else round(ret["numeric_retention"], 3)),
        "year_retention": (None if ret["year_retention"] is None
                           else round(ret["year_retention"], 3)),
        "added_unsupported": inj["added_unsupported"],
        "rewrite_fraction": round(rw["rewrite_fraction"], 3),
        "chrf_raw_vs_mod": round(rw["chrf_raw_vs_moderated"], 4),
        "words_raw": len(raw.split()),
        "words_moderated": len(mod.split()),
        "word_ratio": (None if ret["word_ratio"] is None else round(ret["word_ratio"], 3)),
        "selection_ratio_raw": sel_raw.get("selection_ratio"),
        "selection_flipped_raw": sel_raw.get("direction_flipped"),
        "selection_ratio_moderated": sel_mod.get("selection_ratio"),
        "hedge_raw": round(t_raw["hedge_rate"], 3),
        "hedge_moderated": round(t_mod["hedge_rate"], 3),
        "superlative_raw": round(t_raw["superlative_rate"], 3),
        "superlative_moderated": round(t_mod["superlative_rate"], 3),
        "numeric_density_raw": round(t_raw["numeric_density"], 2),
        "numeric_density_moderated": round(t_mod["numeric_density"], 2),
        "cv_sentence_raw": faithfulness.cv_sentence_length(raw),
        "cv_sentence_moderated": faithfulness.cv_sentence_length(mod),
        "stages": stages,
        "seconds_total": round(sum(s["seconds"] for s in stages.values()), 1),
    }


def judge_agreement_section(rows: list[dict]) -> list[str]:
    """How far the cheap in-pipeline rater is from the authoritative one.

    Two judges rating the same 40 stories is the only thing in this project that
    can say whether the local number was ever worth reading. Pearson r is
    computed on the raw ratings; the deltas are compared separately, because a
    judge can track another judge's ordering closely and still disagree about
    how much moderation moved the text.
    """
    pairs = [(r["alarmism_raw_local"], r["alarmism_raw_opus"]) for r in rows] + \
            [(r["alarmism_moderated_local"], r["alarmism_moderated_opus"]) for r in rows]
    pairs = [(a, b) for a, b in pairs if a is not None and b is not None]
    deltas = [(r["alarmism_delta_local"], r["alarmism_delta_opus"]) for r in rows
              if r["alarmism_delta_local"] is not None and r["alarmism_delta_opus"] is not None]
    if len(pairs) < 3:
        return []

    def pearson(xs, ys):
        n = len(xs)
        mx, my = sum(xs) / n, sum(ys) / n
        num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
        dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
        dy = math.sqrt(sum((y - my) ** 2 for y in ys))
        return num / (dx * dy) if dx and dy else float("nan")

    loc, opus = [p[0] for p in pairs], [p[1] for p in pairs]
    mean_abs = sum(abs(a - b) for a, b in pairs) / len(pairs)
    dl, do = [d[0] for d in deltas], [d[1] for d in deltas]
    understated = sum(1 for a, b in deltas if abs(b) > abs(a) + 0.25)
    return [
        "", "### B1. Do the two judges agree?", "",
        f"- Ratings compared: **{len(pairs)}** (every raw and moderated story).",
        f"- Pearson r between local and Opus ratings: **{pearson(loc, opus):.2f}**.",
        f"- Mean absolute difference: **{mean_abs:.2f}** points on a 1-5 scale.",
        f"- Mean rating: local **{sum(loc) / len(loc):.2f}**, "
        f"Opus **{sum(opus) / len(opus):.2f}**.",
        f"- Mean moderation delta: local **{sum(dl) / len(dl):+.2f}**, "
        f"Opus **{sum(do) / len(do):+.2f}**"
        f" (Pearson r between the two deltas: **{pearson(dl, do):.2f}**).",
        f"- Runs where the local judge understated the shift by more than "
        f"0.25 points: **{understated} of {len(deltas)}**.",
    ]


def md(rows: list[dict]) -> str:
    out = ["# Runs: pairings and metrics", "",
           "Every completed run. `local_judge` is the cheap secondary rater that",
           "runs inside the pipeline; the authoritative alarmism rating is Claude",
           "Opus 5, applied blind offline (`export_for_judging.py`).", ""]

    out += ["## A. Model pairing per run", "",
            "| dataset | tier | generator | moderator | local judge | self-judging? | s |",
            "|---|---|---|---|---|---|---|"]
    for r in rows:
        out.append(f"| {r['dataset']} | `{r['tier']}` | `{r['generator']}` | "
                   f"`{r['moderator']}` | `{r['local_judge']}` | "
                   f"{'**yes**' if r['self_judging'] else 'no'} | {r['seconds_total']:.0f} |")

    out += ["", "## B. Tone, by both judges", "",
            "The Opus columns are the authoritative rating: a blind call per story,",
            "no label, no sibling to compare against, a vendor and family that",
            "appear nowhere else in the pipeline. The local columns are the cheap",
            "in-pipeline rater, kept so the two can be compared rather than because",
            "either alone is trusted.", "",
            "| dataset | tier | generator | moderator | opus raw | opus mod | "
            "**opus delta** | local raw | local mod | local delta | spans |",
            "|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in rows:
        od = r["alarmism_delta_opus"]
        delta = f"**{od:+.1f}**" if od is not None else "n/a"
        out.append(f"| {r['dataset']} | `{r['tier']}` | `{r['generator']}` | "
                   f"`{r['moderator']}` | {r['alarmism_raw_opus']} | "
                   f"{r['alarmism_moderated_opus']} | {delta} | "
                   f"{r['alarmism_raw_local']} | {r['alarmism_moderated_local']} | "
                   f"{r['alarmism_delta_local']} | {r['emotive_spans']} |")

    out += judge_agreement_section(rows)

    out += ["", "## C. Faithfulness of the moderation", "",
            "Retention is the share of the raw story's figures still present after",
            "moderation. A large tone improvement with low retention is deletion,",
            "not moderation. `added_unsup` counts figures the moderator invented.", "",
            "| dataset | tier | generator | moderator | ground raw | ground mod | "
            "num.ret | yr.ret | added_unsup | rewrite | words |",
            "|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in rows:
        out.append(f"| {r['dataset']} | `{r['tier']}` | `{r['generator']}` | "
                   f"`{r['moderator']}` | {r['groundedness_raw']} | "
                   f"{r['groundedness_moderated']} | {r['numeric_retention']} | "
                   f"{r['year_retention']} | {r['added_unsupported']} | "
                   f"{r['rewrite_fraction']} | {r['words_raw']}->{r['words_moderated']} |")

    out += ["", "## D. Framing and style", "",
            "`sel.ratio` compares the trend across the years the story cites with the",
            "trend of the whole series: near 1 mirrors it, negative points the other way.", "",
            "| dataset | tier | generator | moderator | sel.ratio raw | flipped | "
            "hedge r->m | superl r->m | num.dens r->m |",
            "|---|---|---|---|---|---|---|---|---|"]
    for r in rows:
        out.append(f"| {r['dataset']} | `{r['tier']}` | `{r['generator']}` | "
                   f"`{r['moderator']}` | {r['selection_ratio_raw']} | "
                   f"{r['selection_flipped_raw']} | "
                   f"{r['hedge_raw']}->{r['hedge_moderated']} | "
                   f"{r['superlative_raw']}->{r['superlative_moderated']} | "
                   f"{r['numeric_density_raw']}->{r['numeric_density_moderated']} |")
    return "\n".join(out) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    runs = [r for r in Run.objects.all().order_by("created_at")
            if (r.raw_paragraphs and r.moderated_paragraphs)]
    rows = []
    for r in runs:
        try:
            rows.append(row_for(r))
        except Exception as exc:  # a half-written run must not kill the table
            print(f"skip {r.id} ({r.dataset_id}/{r.tier}): {exc}", file=sys.stderr)
    if a.json:
        (HERE / "runs_table.json").write_text(
            json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote runs_table.json ({len(rows)} runs)")
    else:
        (HERE / "RUNS.md").write_text(md(rows), encoding="utf-8")
        print(md(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
