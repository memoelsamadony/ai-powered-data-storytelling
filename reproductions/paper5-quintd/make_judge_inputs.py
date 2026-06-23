#!/usr/bin/env python3
"""Stage 2a — prepare per-domain judging inputs for the Opus 4.7 judge subagents.

For each domain, writes ``judge_inputs/<domain>.json``: a list of
``{"table_idx", "data", "text"}`` where ``data`` is the SAME serialized
structured input the model saw (str of dataset.get_data item) and ``text`` is
the generated output. This is exactly the ``{data}`` / ``{text}`` pair the
paper's GPT-4 metric (gpt4_metric.yaml) annotates.
"""
import argparse
import json
from pathlib import Path

from quintd_data import get_data, DOMAINS

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_BASE = REPO_ROOT / "data" / "quintd-1" / "outputs"
JUDGE_INPUTS = Path(__file__).resolve().parent / "judge_inputs"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--domains", nargs="+", default=DOMAINS)
    ap.add_argument("--split", default="test")
    ap.add_argument("--label", default="gemma4")
    args = ap.parse_args()

    dest = JUDGE_INPUTS / args.label      # namespace by model label
    dest.mkdir(parents=True, exist_ok=True)
    for d in args.domains:
        out_json = OUT_BASE / args.split / d / "direct" / f"{args.label}.json"
        outputs = json.loads(out_json.read_text())["generated"]
        data = get_data(d, args.split)[:len(outputs)]
        items = []
        for idx, (di, g) in enumerate(zip(data, outputs)):
            items.append({"table_idx": idx, "data": str(di), "text": g["out"]})
        path = dest / f"{d}.json"
        path.write_text(json.dumps(items, ensure_ascii=False, indent=2))
        print(f"{d}: {len(items)} judging inputs -> {path}")


if __name__ == "__main__":
    main()
