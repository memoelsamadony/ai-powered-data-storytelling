#!/usr/bin/env python3
"""Rate every story three times, so the alarmism scale gets a reliability figure.

The project has one judge making one call per story, so its central metric has
never had an error bar. The only stability number so far is the 0.155 drift
between the single-axis and two-axis prompts, which measures how much a *prompt
change* moved things - not how much the same judge disagrees with itself.

Three independent calls per story gives that. Reported as:

* **ICC(2,1)**, two-way random effects, absolute agreement, single rater. The
  question it answers is the honest one: if a reader re-rated one of these
  stories once, how much would they agree with us? Absolute agreement rather
  than consistency, because a judge that ranks identically but sits half a
  point high is not interchangeable with ours.
* **Krippendorff's alpha** on the interval scale, which handles the same data
  without assuming balanced raters and is what the addendum named.
* **The spread itself**, because a coefficient hides whether the disagreement
  is one wild story or a little noise everywhere.

Judging is stateless per call, so the three passes are independent in the only
sense available: separate processes, no shared context, no memory of the first
answer. They are not independent *raters* - same model, same prompt - so this
is a self-consistency bound, and an upper bound on what a second model would
agree to. Said plainly rather than dressed up as inter-rater reliability.

    python3 experiments/judge_reliability.py --passes 3
"""

from __future__ import annotations

import argparse
import json
import os
import statistics as st
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402

django.setup()
sys.path.insert(0, str(HERE))
from safe_write import add_force_flag, write_json, write_text  # noqa: E402
from django.db import close_old_connections  # noqa: E402
from storytelling import datasets as ds, judge  # noqa: E402
from storytelling.models import Run  # noqa: E402


def icc_2_1(rows: list[list[float]]) -> float | None:
    """Two-way random effects, absolute agreement, single measurement.

    rows[i] is one story's k ratings. Standard mean-square decomposition; no
    scipy, because one formula does not justify the dependency.
    """
    n = len(rows)
    if n < 2:
        return None
    k = len(rows[0])
    if k < 2 or any(len(r) != k for r in rows):
        return None
    grand = st.fmean(v for r in rows for v in r)
    row_means = [st.fmean(r) for r in rows]
    col_means = [st.fmean(rows[i][j] for i in range(n)) for j in range(k)]

    ss_rows = k * sum((m - grand) ** 2 for m in row_means)
    ss_cols = n * sum((m - grand) ** 2 for m in col_means)
    ss_tot = sum((v - grand) ** 2 for r in rows for v in r)
    ss_err = ss_tot - ss_rows - ss_cols

    msr = ss_rows / (n - 1)
    msc = ss_cols / (k - 1)
    mse = ss_err / ((n - 1) * (k - 1))
    denom = msr + (k - 1) * mse + k * (msc - mse) / n
    return None if denom == 0 else (msr - mse) / denom


def krippendorff_interval(rows: list[list[float]]) -> float | None:
    """alpha = 1 - Do/De for interval data, complete and balanced."""
    vals = [v for r in rows for v in r]
    n_total = len(vals)
    if n_total < 2:
        return None
    # observed disagreement: mean squared difference within each unit
    do_terms = []
    for r in rows:
        k = len(r)
        if k < 2:
            continue
        do_terms.append(sum((a - b) ** 2 for a in r for b in r) / (k - 1))
    do = sum(do_terms) / n_total
    # expected disagreement: mean squared difference across the whole pool
    de = sum((a - b) ** 2 for a in vals for b in vals) / (n_total * (n_total - 1))
    return None if de == 0 else 1 - do / de


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--passes", type=int, default=3)
    ap.add_argument("--workers", type=int, default=3)
    add_force_flag(ap)
    a = ap.parse_args()
    if not judge.is_available():
        print("no 'claude' on PATH", file=sys.stderr)
        return 1

    tables: dict[str, str] = {}
    items = []
    for run in Run.objects.all().order_by("created_at"):
        if not (run.raw_paragraphs and run.moderated_paragraphs):
            continue
        if run.dataset_id not in tables:
            tables[run.dataset_id] = ds.build_prompt_table(run.dataset_id)
        for kind, title, paras in (("raw", run.raw_title, run.raw_paragraphs),
                                   ("moderated", run.moderated_title, run.moderated_paragraphs)):
            items.append({"id": f"{run.id}:{kind}", "dataset": run.dataset_id,
                          "tier": run.tier, "kind": kind, "title": title,
                          "paragraphs": paras})
    print(f"{len(items)} stories x {a.passes} passes = {len(items)*a.passes} calls")

    def score(job):
        idx, it = job
        close_old_connections()
        try:
            s = judge.score_story(tables[it["dataset"]], it["title"], it["paragraphs"])
            return it["id"], idx, s.alarmism, s.optimism, s.cost_usd
        except judge.JudgeUnavailable as exc:
            return it["id"], idx, None, None, None

    jobs = [(p, it) for p in range(a.passes) for it in items]
    alarm: dict[str, list] = {it["id"]: [] for it in items}
    optim: dict[str, list] = {it["id"]: [] for it in items}
    spend = 0.0
    with ThreadPoolExecutor(max_workers=a.workers) as pool:
        for done, (sid, _p, al, op, cost) in enumerate(pool.map(score, jobs), 1):
            if al is not None:
                alarm[sid].append(al)
                optim[sid].append(op)
            spend += cost or 0
            if done % 20 == 0:
                print(f"  {done}/{len(jobs)}  ${spend:.2f}", flush=True)

    meta = {it["id"]: it for it in items}
    full_a = [v for v in alarm.values() if len(v) == a.passes]
    full_o = [v for v in optim.values() if len(v) == a.passes]
    spreads = sorted(
        ({"id": k, "dataset": meta[k]["dataset"], "tier": meta[k]["tier"],
          "kind": meta[k]["kind"], "ratings": v, "spread": round(max(v) - min(v), 2)}
         for k, v in alarm.items() if len(v) == a.passes),
        key=lambda d: -d["spread"])

    res = {
        "experiment": "Judge self-consistency over three independent passes",
        "question": "How much does the same judge disagree with itself on the "
                    "same story, and is that smaller than the effects reported?",
        "judge": "claude/opus, blind, one story per call",
        "passes": a.passes,
        "n_stories": len(full_a),
        "independence": "Separate stateless calls, no shared context. Same model and "
                        "prompt throughout, so this is self-consistency and an upper "
                        "bound on agreement with a different judge, not inter-rater "
                        "reliability between independent raters.",
        "alarmism": {
            "icc_2_1": round(icc_2_1(full_a), 4) if icc_2_1(full_a) is not None else None,
            "krippendorff_alpha": (round(krippendorff_interval(full_a), 4)
                                   if krippendorff_interval(full_a) is not None else None),
            "mean_spread": round(st.fmean(max(v) - min(v) for v in full_a), 3),
            "median_spread": round(st.median(max(v) - min(v) for v in full_a), 3),
            "max_spread": round(max(max(v) - min(v) for v in full_a), 2),
            "identical_all_passes": sum(1 for v in full_a if max(v) == min(v)),
            "within_0_5": sum(1 for v in full_a if max(v) - min(v) <= 0.5),
        },
        "optimism": {
            "icc_2_1": round(icc_2_1(full_o), 4) if icc_2_1(full_o) is not None else None,
            "krippendorff_alpha": (round(krippendorff_interval(full_o), 4)
                                   if krippendorff_interval(full_o) is not None else None),
            "mean_spread": round(st.fmean(max(v) - min(v) for v in full_o), 3),
        },
        "least_stable_stories": spreads[:8],
        "cost_usd": round(spend, 3),
        "ratings": {k: v for k, v in alarm.items()},
        "figure": "presentation/figures/fig13.svg",
    }
    write_json(HERE / "exp_json" / "exp-judge-reliability.json", res,
               force=a.force, quiet=True)

    al = res["alarmism"]
    print(f"\nALARMISM  ICC(2,1) {al['icc_2_1']}   Krippendorff alpha "
          f"{al['krippendorff_alpha']}")
    print(f"  spread: mean {al['mean_spread']}, median {al['median_spread']}, "
          f"max {al['max_spread']}")
    print(f"  {al['identical_all_passes']}/{res['n_stories']} identical on all three passes, "
          f"{al['within_0_5']}/{res['n_stories']} within 0.5")
    print(f"OPTIMISM  ICC(2,1) {res['optimism']['icc_2_1']}   spread "
          f"{res['optimism']['mean_spread']}")
    print(f"\n${res['cost_usd']:.2f} -> exp_json/exp-judge-reliability.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
