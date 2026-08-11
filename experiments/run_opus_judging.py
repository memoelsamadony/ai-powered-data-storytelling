#!/usr/bin/env python3
"""Score every stored run's two stories with the Claude Opus judge, blind.

This goes through the backend's own ``storytelling.judge`` module rather than
re-implementing the call, so the ratings that land in the database are the ones
the API would produce. What it adds is batching and a resume: judging is the
expensive half of the experiment and a partial pass must not have to start over.

Blinding is inherited from ``judge.judge_run``, which scores each story in its
own CLI call with no label and no sibling. The judge is never told that two
stories belong to one run, which of them was moderated, or that a moderation
step exists. The delta is arithmetic done here, not a judgement made there.

    python3 experiments/run_opus_judging.py             # judge what is unjudged
    python3 experiments/run_opus_judging.py --force     # re-judge everything
    python3 experiments/run_opus_judging.py --workers 4
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402

django.setup()
from django.db import close_old_connections  # noqa: E402
from storytelling import datasets as ds, judge  # noqa: E402
from storytelling.models import Run  # noqa: E402

_TABLES: dict[str, str] = {}


def table_for(dataset_id: str) -> str:
    """The evidence pack the story was written from, cached across runs."""
    if dataset_id not in _TABLES:
        _TABLES[dataset_id] = ds.build_prompt_table(dataset_id)
    return _TABLES[dataset_id]


def judge_one(run: Run) -> tuple[Run, str | None]:
    # Each worker opens its own SQLite connection; Django will not share one
    # across threads, and a stale connection from a finished thread must go.
    close_old_connections()
    try:
        judge.judge_run(run, table_for(run.dataset_id))
        return run, None
    except judge.JudgeUnavailable as exc:
        return run, str(exc)
    finally:
        close_old_connections()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-judge already-judged runs")
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()

    if not judge.is_available():
        print("the 'claude' CLI is not on PATH; nothing to do", file=sys.stderr)
        return 1

    runs = [r for r in Run.objects.all().order_by("created_at")
            if r.raw_paragraphs and r.moderated_paragraphs]
    todo = runs if a.force else [r for r in runs if r.opus_raw_alarmism is None]
    print(f"{len(runs)} complete runs, {len(todo)} to judge, {a.workers} workers")
    if not todo:
        return 0

    started, failures = time.perf_counter(), []
    with ThreadPoolExecutor(max_workers=a.workers) as pool:
        for i, (run, error) in enumerate(pool.map(judge_one, todo), start=1):
            if error:
                failures.append((run, error))
                print(f"[{i}/{len(todo)}] {run.dataset_id}/{run.tier}  FAILED: {error[:120]}")
                continue
            delta = run.opus_moderated_alarmism - run.opus_raw_alarmism
            print(f"[{i}/{len(todo)}] {run.dataset_id}/{run.tier}  "
                  f"opus {run.opus_raw_alarmism} -> {run.opus_moderated_alarmism} "
                  f"({delta:+.1f})   local {run.raw_alarmism} -> {run.moderated_alarmism}")

    print(f"\ndone in {time.perf_counter() - started:.0f}s, {len(failures)} failed")
    judged = Run.objects.exclude(opus_raw_alarmism=None)
    spend = sum(r.opus_cost_usd or 0 for r in judged)
    print(f"{judged.count()} runs carry an Opus rating; "
          f"list-price equivalent of all tokens so far: ${spend:.2f}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
