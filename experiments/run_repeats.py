#!/usr/bin/env python3
"""Repeat one configuration N times, so its numbers acquire a variance.

Everything in this project has been n=1: one story per cell, one moderation,
one judgement. A single observation cannot distinguish a property of the model
from a property of that draft, which is why no significance test appears
anywhere in the results and why the combination table is a ranking rather than
a finding.

**Seeds must differ, and that is the whole point.** `g4b` and `q4b` are the same
configuration at the same seed and produced byte-identical text
(`raw_sha=3e29e7e9983c`), which was briefly mistaken for a repeat that
reproduced. It was the sampler replaying. Repeats at a fixed seed measure
determinism; repeats at distinct seeds measure what a re-run of the experiment
would actually give you. This script does the second.

    python3 experiments/run_repeats.py --tier g4b --n 5
    python3 experiments/run_repeats.py --tier g4b --tier g8b --n 5
"""

from __future__ import annotations

import argparse
import os
import statistics as st
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402

django.setup()
sys.path.insert(0, str(HERE))
from safe_write import add_force_flag, write_json, write_text  # noqa: E402
from storytelling import faithfulness, ollama_client as oc, services  # noqa: E402
from storytelling.models import Run, RunStatus  # noqa: E402
from storytelling.services import _dataset_values  # noqa: E402

# Fixed so the repeat set itself is reproducible, distinct so each run resamples.
SEEDS = [101, 202, 303, 404, 505, 606, 707, 808, 909, 1010]


def one(tier: str, dataset: str, seed: int) -> dict:
    started = time.perf_counter()
    run = Run.objects.create(dataset_id=dataset, tier=tier)
    services.do_generate(run, seed=seed)
    services.do_moderate(run)
    services.do_factcheck(run)
    run.status = RunStatus.DONE
    run.save(update_fields=["status"])

    raw = "\n\n".join(run.raw_paragraphs or [])
    mod = "\n\n".join(run.moderated_paragraphs or [])
    vals, _ = _dataset_values(dataset)
    ret = faithfulness.retention(raw, mod)
    inj = faithfulness.injection(mod, raw, vals)
    return {
        "run": str(run.id), "seed": seed,
        "alarmism_raw": run.opus_raw_alarmism,
        "alarmism_moderated": run.opus_moderated_alarmism,
        "optimism_raw": run.opus_raw_optimism,
        "optimism_moderated": run.opus_moderated_optimism,
        "numeric_retention": (None if ret["numeric_retention"] is None
                              else round(ret["numeric_retention"], 3)),
        "added_unsupported": inj["added_unsupported"],
        "emotive_spans": len(run.emotive_spans or []),
        "seconds": round(time.perf_counter() - started, 1),
    }


def summarise(label: str, rows: list[dict]) -> dict:
    def stat(key):
        vals = [r[key] for r in rows if r.get(key) is not None]
        if not vals:
            return None
        return {"n": len(vals), "mean": round(st.fmean(vals), 3),
                "sd": round(st.pstdev(vals), 3) if len(vals) > 1 else 0.0,
                "min": min(vals), "max": max(vals), "values": vals}
    return {"config": label,
            **{k: stat(k) for k in ("alarmism_raw", "alarmism_moderated",
                                    "numeric_retention", "emotive_spans", "seconds")}}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tier", action="append", required=True)
    ap.add_argument("--dataset", default="pertussis-global")
    ap.add_argument("--n", type=int, default=5)
    add_force_flag(ap)
    a = ap.parse_args()

    out = {}
    for tier in a.tier:
        t = oc.resolve_tier(tier)
        label = f"{t.generator} x {t.moderator}"
        print(f"\n=== {tier}  {label}  x{a.n} on {a.dataset}", flush=True)
        rows = []
        for seed in SEEDS[:a.n]:
            r = one(tier, a.dataset, seed)
            rows.append(r)
            print(f"  seed {seed:>4}  alarmism {r['alarmism_raw']} -> "
                  f"{r['alarmism_moderated']}   retention {r['numeric_retention']}   "
                  f"{r['seconds']:.0f}s", flush=True)
        out[tier] = {"label": label, "dataset": a.dataset,
                     "runs": rows, "summary": summarise(label, rows)}
        s = out[tier]["summary"]
        print(f"  -> moderated alarmism {s['alarmism_moderated']['mean']} "
              f"+/- {s['alarmism_moderated']['sd']}   "
              f"retention {s['numeric_retention']['mean']} "
              f"+/- {s['numeric_retention']['sd']}", flush=True)

    import json
    # Name the file after what it contains. Writing every invocation to one
    # exp-repeats.json meant a later single-tier run silently replaced a
    # finished five-seed set; that happened once and the set had to be rebuilt
    # from the database.
    dest = HERE / "exp_json" / f"exp-repeats-{'-'.join(a.tier)}.json"
    payload = {
        "experiment": "Repeats at distinct seeds, to put a variance on the ranking",
        "question": "Is the gap between the top combinations bigger than the "
                    "run-to-run noise of a single combination?",
        "dataset": a.dataset,
        "n_per_config": a.n,
        "seeds": SEEDS[:a.n],
        "why_distinct_seeds": "Repeats at a fixed seed measure determinism, not "
                              "stability: g4b and q4b share a seed and produced "
                              "byte-identical text.",
        "configs": out,
        "figure": "presentation/figures/fig13.svg",
    }
    write_json(dest, payload, force=a.force)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
