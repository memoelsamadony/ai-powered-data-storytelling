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
    return {
        "run": str(run.id),
        "dataset": run.dataset_id,
        "tier": run.tier,
        "generator": tier.generator,
        "moderator": tier.moderator,
        "local_judge": tier.judge,
        "self_judging": tier.judge == tier.moderator,
        "alarmism_raw_local": a_raw,
        "alarmism_moderated_local": a_mod,
        "alarmism_delta_local": (None if a_raw is None or a_mod is None
                                 else round(a_mod - a_raw, 2)),
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

    out += ["", "## B. Tone", "",
            "| dataset | tier | generator | moderator | raw | moderated | delta | spans |",
            "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        out.append(f"| {r['dataset']} | `{r['tier']}` | `{r['generator']}` | "
                   f"`{r['moderator']}` | {r['alarmism_raw_local']} | "
                   f"{r['alarmism_moderated_local']} | {r['alarmism_delta_local']} | "
                   f"{r['emotive_spans']} |")

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
