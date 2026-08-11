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

2. **No gold reference story is shown.** The published protocol hands the
   judge a reference story. The only human set in this repo,
   `human-baselines/pilot-stories/`, was hand-rewritten *from* the machine
   drafts, so handing it to the judge would be comparing the machine against an
   edited version of itself. The judge therefore works from the evidence pack
   alone, which makes "Relevance and Informativeness" a weaker criterion here
   than in the paper. Flagged in the output rather than hidden.

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


PAIRWISE_SYSTEM = (
    "You are an impartial evaluator of data journalism. You compare two stories "
    "written from the same data and decide which is better on each criterion, or "
    "whether they tie. You have no information about how either story was "
    "produced and must not speculate. You reply with JSON and nothing else."
)

PAIRWISE_PROMPT = """Two stories were written from the same data. Compare them.

--- DATA ---
{table}

--- STORY 1 ---
{s1_headline}

{s1_body}

--- STORY 2 ---
{s2_headline}

{s2_body}

For each criterion, answer "story_1", "story_2" or "tie":

{criteria}

Then give an "overall" verdict on the same three-way choice.

Reply with exactly this JSON and nothing else:
{{"criteria": {{{keys}}}, "overall": "<story_1|story_2|tie>",
  "rationale": "<one or two sentences>"}}"""


def judge_pairs(workers: int = 3, model: str = "opus") -> int:
    """Run the pairwise comparison through the backend's CLI judge.

    The judge is given two stories and the table, and is told nothing about
    where either came from. Which of the two is the moderated one is decided by
    the position coin flip in ``build()`` and lives only in the key file, so a
    verdict cannot be a response to the label.
    """
    from concurrent.futures import ThreadPoolExecutor
    from storytelling import judge as judge_mod

    if not judge_mod.is_available():
        print("the 'claude' CLI is not on PATH", file=sys.stderr)
        return 1
    items = json.loads((HERE / "pairwise_items.json").read_text())["items"]
    criteria_block = "\n".join(f"- {k}: {v}" for k, v in CRITERIA.items())
    keys_block = ", ".join(f'"{k}": "<story_1|story_2|tie>"' for k in CRITERIA)

    def one(item: dict) -> dict:
        prompt = PAIRWISE_PROMPT.format(
            table=item["data_table"],
            s1_headline=item["story_1"]["headline"], s1_body=item["story_1"]["body"],
            s2_headline=item["story_2"]["headline"], s2_body=item["story_2"]["body"],
            criteria=criteria_block, keys=keys_block,
        )
        try:
            reply, cost, _s = judge_mod.run_cli(prompt, model=model, system=PAIRWISE_SYSTEM)
            v = judge_mod._extract_json(reply)
            return {"pair_id": item["pair_id"], "criteria": v.get("criteria", {}),
                    "overall": v.get("overall"), "rationale": v.get("rationale", ""),
                    "cost_usd": cost}
        except judge_mod.JudgeUnavailable as exc:
            return {"pair_id": item["pair_id"], "criteria": {}, "overall": None,
                    "error": str(exc)}

    with ThreadPoolExecutor(max_workers=workers) as pool:
        verdicts = list(pool.map(one, items))

    failed = [v for v in verdicts if v.get("error")]
    spend = sum(v.get("cost_usd") or 0 for v in verdicts)
    dest = HERE / "pairwise_results.json"
    dest.write_text(json.dumps(
        {"judge": f"claude/{model}", "blind": True, "position_seed": POSITION_SEED,
         "n": len(verdicts), "failed": len(failed), "cost_usd": round(spend, 4),
         "verdicts": verdicts}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {dest.name}: {len(verdicts)} pairs, {len(failed)} failed, "
          f"${spend:.2f} list-price equivalent")
    return score(dest)


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
    print("No gold reference story was shown to the judge: the human pilot set "
          "is hand-rewritten from machine drafts,")
    print("  so using it as the gold reference would compare the machine with "
          "an edited version of itself.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--score", type=Path, help="aggregate a judge results file")
    ap.add_argument("--judge", action="store_true",
                    help="run the comparison through the Claude CLI, then score it")
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()
    if a.score:
        return score(a.score)
    if a.judge:
        return judge_pairs(workers=a.workers)
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
