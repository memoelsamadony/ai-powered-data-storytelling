#!/usr/bin/env python3
"""Export every stored story as a blinded item for the Claude Opus 5 judge.

The authoritative alarmism rating in this project is produced by Claude Opus 5,
run outside the Ollama pipeline. That is what makes the rating independent: the
judge shares no weights, no family and no vendor with the gemma4/llama/qwen
models being studied, and it is stronger than the moderators it grades rather
than weaker (which was the residual problem when the judge was a local 9B).

Blinding matters as much as independence. Each item here is stripped of its
tier, its model names, and crucially of whether it is the raw or the moderated
version, then shuffled under a fixed seed. The judge cannot give the moderated
story a better score because it knows it is the moderated one.

    python3 experiments/export_for_judging.py            # writes judging_items.json
    python3 experiments/export_for_judging.py --key      # writes the unblinding key

The key is written separately and is not needed until the ratings come back.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402
django.setup()
from storytelling.models import Run  # noqa: E402

BLIND_SEED = 20260811


def item_id(run_id: str, kind: str) -> str:
    """Opaque, stable, and carries no hint of raw-vs-moderated."""
    return "S" + hashlib.sha256(f"{run_id}:{kind}:{BLIND_SEED}".encode()).hexdigest()[:10]


def collect() -> tuple[list[dict], list[dict]]:
    items, key = [], []
    for run in Run.objects.all().order_by("created_at"):
        for kind, title, text in (
            ("raw", run.raw_title, "\n\n".join(run.raw_paragraphs or [])),
            ("moderated", run.moderated_title,
             "\n\n".join(run.moderated_paragraphs or [])),
        ):
            if not (text or "").strip():
                continue
            iid = item_id(str(run.id), kind)
            items.append({"item_id": iid, "headline": title or "", "story": text.strip()})
            key.append({
                "item_id": iid, "run": str(run.id), "kind": kind,
                "tier": run.tier, "dataset": run.dataset_id,
                "local_judge_rating": (run.raw_alarmism if kind == "raw"
                                       else run.moderated_alarmism),
            })
    rng = random.Random(BLIND_SEED)
    rng.shuffle(items)
    return items, key


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", action="store_true",
                    help="also write judging_key.json (do not open before rating)")
    a = ap.parse_args()
    items, key = collect()
    if not items:
        print("no runs in the database yet")
        return 1
    (HERE / "judging_items.json").write_text(
        json.dumps({"blind_seed": BLIND_SEED, "n": len(items), "items": items},
                   indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote judging_items.json  ({len(items)} blinded stories)")
    if a.key:
        (HERE / "judging_key.json").write_text(
            json.dumps({"blind_seed": BLIND_SEED, "key": key}, indent=2) + "\n",
            encoding="utf-8")
        print(f"wrote judging_key.json  ({len(key)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
