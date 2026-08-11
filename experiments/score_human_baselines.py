#!/usr/bin/env python3
"""Score the human pilot stories on the same instruments as the machine stories.

Until now every tone number in this project was a machine story compared with
another machine story, so "2.0 after moderation" had no external referent: it
could mean calibrated, or it could mean the whole population sits low. A human
story scored by the same blind judge on the same rubric supplies that referent.

What this is not: the ASSIGNMENT.md baseline. ``pilot-stories/README.md`` is
explicit that these were hand-rewritten from LLM drafts rather than written
blind from scratch, so they cannot serve as ``H`` in the S6 sense, and nothing
here computes ``H``. They are a human-shaped reference set, and the leakage
from their source drafts is a caveat that travels with every number below.

    python3 experiments/score_human_baselines.py            # judge and measure
    python3 experiments/score_human_baselines.py --no-judge  # metrics only, free

Writes ``human_baseline_scores.json`` plus a markdown summary on stdout.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402

django.setup()
from storytelling import datasets as ds, judge, metrics, textstats  # noqa: E402
from storytelling.models import Run  # noqa: E402
from storytelling.services import _dataset_values  # noqa: E402

PILOT = HERE / "human-baselines" / "pilot-stories"
OUT = HERE / "human_baseline_scores.json"

# The pilot files carry no headline (see the set's README: adding one would mean
# an LLM originating that piece of text), so the judge is given the body alone.
# Machine stories are judged with their headline, which is a real asymmetry:
# headlines are where alarmism concentrates. Recorded, not silently equalised.
NO_HEADLINE = ""


def parse(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    meta, body = {}, text
    if text.startswith("---"):
        _, front, body = text.split("---", 2)
        for line in front.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.split("#")[0].strip()
    return {"path": str(path.relative_to(HERE.parent)), "meta": meta, "body": body.strip()}


def paragraphs(body: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]


def measure(story: dict) -> dict:
    """Every judge-free instrument the machine stories are scored on."""
    series = story["meta"]["series"]
    body = story["body"]
    values, years = _dataset_values(series)
    g = metrics.groundedness(body, values, years)
    t = textstats.analyse(body)
    return {
        "series": series,
        "writer": story["meta"].get("writer", ""),
        "path": story["path"],
        "words": len(body.split()),
        "declared_words": int(story["meta"].get("word_count", 0) or 0),
        "groundedness": f"{g['supported']}/{g['stated']}",
        "grounded_share": (round(g["supported"] / g["stated"], 3) if g["stated"] else None),
        **{k: round(t[k], 3) for k in (
            "hedge_rate", "booster_rate", "certainty_ratio", "intensifier_rate",
            "superlative_rate", "numeric_density", "causal_rate", "affect_balance",
            "mean_sentence_length", "sentence_length_variance", "passive_rate",
        )},
    }


def judge_one(story: dict) -> tuple[str, float | None, str]:
    table = ds.build_prompt_table(story["meta"]["series"])
    try:
        rating, rationale, _cost, _s = judge.score_story(
            table, NO_HEADLINE, paragraphs(story["body"])
        )
        return story["path"], rating, rationale
    except judge.JudgeUnavailable as exc:
        return story["path"], None, f"unjudged: {exc}"


def machine_reference() -> dict[str, dict]:
    """Opus ratings of the machine stories, per series, for the comparison."""
    out: dict[str, dict] = {}
    for run in Run.objects.exclude(opus_raw_alarmism=None):
        out.setdefault(run.dataset_id, {"raw": [], "moderated": []})
        out[run.dataset_id]["raw"].append(run.opus_raw_alarmism)
        out[run.dataset_id]["moderated"].append(run.opus_moderated_alarmism)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-judge", action="store_true")
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()

    stories = [parse(p) for p in sorted(PILOT.glob("*__human.md"))]
    if not stories:
        print(f"no pilot stories under {PILOT}", file=sys.stderr)
        return 1
    rows = [measure(s) for s in stories]

    if not a.no_judge:
        if not judge.is_available():
            print("no 'claude' on PATH; run with --no-judge for metrics only", file=sys.stderr)
            return 1
        by_path = {r["path"]: r for r in rows}
        with ThreadPoolExecutor(max_workers=a.workers) as pool:
            for path, rating, rationale in pool.map(judge_one, stories):
                by_path[path]["opus_alarmism"] = rating
                by_path[path]["opus_rationale"] = rationale

    machine = machine_reference()
    payload = {
        "note": ("Pilot set: hand-rewritten from LLM drafts, not the blind "
                 "from-scratch protocol in ASSIGNMENT.md. Not usable as H."),
        "judged_without_headline": True,
        "stories": rows,
        "machine_reference_opus": {
            k: {"raw_mean": round(statistics.fmean(v["raw"]), 2),
                "moderated_mean": round(statistics.fmean(v["moderated"]), 2),
                "n": len(v["raw"])}
            for k, v in machine.items()
        },
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    judged = [r for r in rows if r.get("opus_alarmism") is not None]
    print(f"\nwrote {OUT.name}: {len(rows)} stories, {len(judged)} judged\n")
    if judged:
        print("| series | human alarmism (n=5) | machine raw | machine moderated |")
        print("|---|---|---|---|")
        for s in sorted({r["series"] for r in judged}):
            hs = [r["opus_alarmism"] for r in judged if r["series"] == s]
            m = machine.get(s)
            mr = f"{statistics.fmean(m['raw']):.2f}" if m else "n/a"
            mm = f"{statistics.fmean(m['moderated']):.2f}" if m else "n/a"
            print(f"| {s} | {statistics.fmean(hs):.2f} "
                  f"(min {min(hs)}, max {max(hs)}) | {mr} | {mm} |")
        allh = [r["opus_alarmism"] for r in judged]
        print(f"\nhuman pilot overall: mean {statistics.fmean(allh):.2f}, "
              f"median {statistics.median(allh):.2f}, "
              f"sd {statistics.pstdev(allh):.2f}, range {min(allh)}-{max(allh)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
