#!/usr/bin/env python3
"""Pairwise LLM-as-a-judge evaluation, agentic vs direct prompting.

Follows the protocol used in the agentic-data-storytelling literature: a judge
sees the input data, both candidate stories, and scores five criteria by
*preference* rather than on a numeric scale. Each criterion awards a point to
whichever story is better, or a point to both when they tie.

The mapping onto this project is exact, which is why the protocol transfers:

    Story B, "direct prompting"  = the RAW story, one generator call
    Story A, "agentic framework" = the MODERATED story, after the critic and
                                   revision pass

Two deliberate departures from the published protocol, both recorded here so
the results are not over-claimed:

1. **Position is randomised.** The published protocol presents A and B in a
   fixed order. LLM judges have a well-documented position bias, and a fixed
   order silently folds that bias into the win rate. Here a per-item coin flip
   decides which story is shown first, and the mapping lives in the key file,
   so a position effect can be measured instead of assumed.

2. **No gold reference story exists.** The published protocol hands the judge a
   reference story. This project has no human baselines yet
   (`human-baselines/stories/` is empty), so the judge works from the evidence
   pack alone. That makes "Relevance and Informativeness" a weaker criterion
   here than in the paper, and it is flagged in the output rather than hidden.

The fifth published criterion, *Visualization Specification Quality*, is
reported as not-applicable: this pipeline produces prose, and the charts are
built by the frontend from the dataset rather than proposed by the model. Four
criteria are scored.

    python3 experiments/pairwise_eval.py            # write pairwise_items.json
    python3 experiments/pairwise_eval.py --score results.json   # aggregate
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402
django.setup()
from storytelling.datasets import pack_text  # noqa: E402
from storytelling.models import Run  # noqa: E402

POSITION_SEED = 20260811

CRITERIA = {
    "relevance_informativeness":
        "Relevance and Informativeness. Does the story provide useful "
        "information and address the theme the data is about?",
    "structure_coherence":
        "Structure and Coherence. Is there a logical beginning, middle and end, "
        "and do the parts connect?",
    "narrative_quality":
        "Narrative Quality and Insightfulness. Is the story engaging, and does "
        "it surface an insight worth reading?",
    "factual_correctness":
        "Factual Correctness. Is every claim supported by the data table? A "
        "figure that does not appear in the table, or that is used to describe "
        "a period it does not belong to, is incorrect.",
}
NOT_APPLICABLE = {
    "visualization_quality":
        "Visualization Specification Quality is not scored: this pipeline "
        "produces prose only, and charts are built by the frontend from the "
        "dataset rather than proposed by the model."
}


def build() -> tuple[list[dict], list[dict]]:
    rng = random.Random(POSITION_SEED)
    items, key = [], []
    for run in Run.objects.all().order_by("created_at"):
        raw = "\n\n".join(run.raw_paragraphs or []).strip()
        mod = "\n\n".join(run.moderated_paragraphs or []).strip()
        if not (raw and mod):
            continue
        flip = rng.random() < 0.5      # which candidate is shown first
        first, second = (mod, raw) if flip else (raw, mod)
        first_t, second_t = ((run.moderated_title, run.raw_title) if flip
                             else (run.raw_title, run.moderated_title))
        pid = f"P{len(items) + 1:03d}"
        items.append({
            "pair_id": pid,
            "data_table": pack_text(run.dataset_id),
            "story_1": {"headline": first_t or "", "body": first},
            "story_2": {"headline": second_t or "", "body": second},
        })
        key.append({
            "pair_id": pid, "run": str(run.id),
            "dataset": run.dataset_id, "tier": run.tier,
            "story_1_is": "moderated" if flip else "raw",
            "story_2_is": "raw" if flip else "moderated",
            "position_flipped": flip,
        })
    return items, key


def score(results_path: Path) -> int:
    """Aggregate judge verdicts into win rates, and check for position bias."""
    key = {k["pair_id"]: k for k in
           json.loads((HERE / "pairwise_key.json").read_text())["key"]}
    results = json.loads(results_path.read_text())
    if isinstance(results, dict):
        results = results.get("verdicts", [])

    tally = {c: defaultdict(int) for c in CRITERIA}
    overall = defaultdict(int)
    by_position = defaultdict(int)
    per_tier = defaultdict(lambda: defaultdict(int))
    n = 0
    for r in results:
        k = key.get(r["pair_id"])
        if not k:
            print(f"  unknown pair_id {r['pair_id']}, skipped", file=sys.stderr)
            continue
        n += 1
        for crit in CRITERIA:
            v = r["criteria"].get(crit)
            if v not in ("story_1", "story_2", "tie"):
                continue
            if v == "tie":
                tally[crit]["tie"] += 1
                continue
            winner = k["story_1_is"] if v == "story_1" else k["story_2_is"]
            tally[crit][winner] += 1
            by_position[v] += 1
        ov = r.get("overall")
        if ov in ("story_1", "story_2", "tie"):
            if ov == "tie":
                overall["tie"] += 1
                per_tier[k["tier"]]["tie"] += 1
            else:
                w = k["story_1_is"] if ov == "story_1" else k["story_2_is"]
                overall[w] += 1
                per_tier[k["tier"]][w] += 1

    def pct(d, kk):
        tot = sum(d.values())
        return f"{100 * d[kk] / tot:.1f}%" if tot else "n/a"

    print(f"\nPairwise evaluation, {n} pairs judged by Claude Opus 5 (blind, "
          f"position-randomised)\n")
    print(f"{'criterion':<32}{'agentic':>10}{'direct':>10}{'tie':>10}")
    print("-" * 62)
    for crit in CRITERIA:
        d = tally[crit]
        print(f"{crit:<32}{pct(d,'moderated'):>10}{pct(d,'raw'):>10}{pct(d,'tie'):>10}")
    print("-" * 62)
    print(f"{'OVERALL':<32}{pct(overall,'moderated'):>10}"
          f"{pct(overall,'raw'):>10}{pct(overall,'tie'):>10}")

    tot_pos = by_position["story_1"] + by_position["story_2"]
    if tot_pos:
        p1 = 100 * by_position["story_1"] / tot_pos
        print(f"\nPosition check: the judge picked the FIRST story {p1:.1f}% of "
              f"the time across all non-tied criterion votes.")
        print("  50% means no position bias. A large deviation means the win "
              "rates above are partly an artefact of ordering,")
        print("  which is exactly why position is randomised here.")

    if per_tier:
        print(f"\n{'tier':<20}{'agentic':>10}{'direct':>10}{'tie':>10}")
        print("-" * 50)
        for t in sorted(per_tier):
            d = per_tier[t]
            print(f"{t:<20}{d['moderated']:>10}{d['raw']:>10}{d['tie']:>10}")

    print("\nNot scored: " + NOT_APPLICABLE["visualization_quality"])
    print("No gold reference story exists (human-baselines/stories/ is empty), "
          "so the judge worked from the evidence pack alone.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--score", type=Path, help="aggregate a judge results file")
    a = ap.parse_args()
    if a.score:
        return score(a.score)
    items, key = build()
    if not items:
        print("no completed runs to pair")
        return 1
    (HERE / "pairwise_items.json").write_text(
        json.dumps({"position_seed": POSITION_SEED, "criteria": CRITERIA,
                    "not_applicable": NOT_APPLICABLE, "n": len(items),
                    "items": items}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8")
    (HERE / "pairwise_key.json").write_text(
        json.dumps({"position_seed": POSITION_SEED, "key": key}, indent=2) + "\n",
        encoding="utf-8")
    print(f"wrote pairwise_items.json and pairwise_key.json ({len(items)} pairs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
