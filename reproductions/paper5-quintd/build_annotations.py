#!/usr/bin/env python3
"""Stage 2b — turn Opus 4.7 subagent judgments into paper-format annotation .jsonl.

Each subagent writes ``judgments/<domain>.json``: a list of
``{"table_idx": int, "errors": [{"reason","text","type"}]}`` produced with the
exact ``evaluation/gpt4_metric.yaml`` prompt + taxonomy.

This script computes the ``start`` character offset of every error span in the
generated text using the SAME substring-search logic as the paper's
``evaluation/evaluate.py::Metric.create_annotation``, then writes
``annotations/opus47/opus47-<domain>-test-<label>-direct.jsonl`` with the paper's
annotation schema so the existing metric code can consume it unchanged.
"""
import argparse
import json
import logging
from pathlib import Path

from quintd_data import DOMAINS

logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_BASE = REPO_ROOT / "data" / "quintd-1" / "outputs"
JUDGMENTS_DIR = Path(__file__).resolve().parent / "judgments"
ANN_DIR = REPO_ROOT / "data" / "quintd-1" / "annotations" / "opus47"


def load_outputs(domain, split, label):
    path = OUT_BASE / split / domain / "direct" / f"{label}.json"
    data = json.loads(path.read_text())
    return [g["out"] for g in data["generated"]]


def create_annotation(text, errors, table_idx, domain, label, split, annotator_id):
    """Port of evaluate.py::Metric.create_annotation (start-offset computation)."""
    annotation_list = []
    current_pos = 0
    for error in errors:
        etext = error.get("text", "")
        if not etext:
            continue
        start_pos = text.lower().find(etext.lower(), current_pos)
        if current_pos != 0 and start_pos == -1:
            start_pos = text.find(etext)
        if start_pos == -1:
            logger.warning(f"[{domain}#{table_idx}] cannot find span {etext!r}, skipping")
            continue
        rec = {"reason": error.get("reason", ""), "text": etext,
               "type": int(error["type"]), "start": start_pos}
        annotation_list.append(rec)
        current_pos = start_pos + len(etext)
    return {"annotator_id": annotator_id, "dataset": domain, "model": label,
            "setup": "direct", "split": split, "table_idx": table_idx,
            "annotations": annotation_list}


def run_domain(domain, split, label, annotator_id):
    # prefer label-namespaced judgments (judgments/<label>/<domain>.json),
    # fall back to flat layout (judgments/<domain>.json) for the original gemma run
    judg_path = JUDGMENTS_DIR / label / f"{domain}.json"
    if not judg_path.exists():
        judg_path = JUDGMENTS_DIR / f"{domain}.json"
    if not judg_path.exists():
        logger.warning(f"[{domain}] no judgments file for label={label}, skipping")
        return 0
    judgments = json.loads(judg_path.read_text())
    outputs = load_outputs(domain, split, label)

    by_idx = {j["table_idx"]: j.get("errors", []) for j in judgments}
    records = []
    for idx, text in enumerate(outputs):
        errors = by_idx.get(idx, [])
        records.append(create_annotation(text, errors, idx, domain, label, split, annotator_id))

    ANN_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ANN_DIR / f"{annotator_id}-{domain}-{split}-{label}-direct.jsonl"
    with open(out_path, "w") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    logger.info(f"[{domain}] wrote {len(records)} annotations -> {out_path.name}")
    return len(records)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--domains", nargs="+", default=DOMAINS)
    ap.add_argument("--split", default="test")
    ap.add_argument("--label", default="gemma4")
    ap.add_argument("--annotator-id", default="opus47")
    args = ap.parse_args()
    total = sum(run_domain(d, args.split, args.label, args.annotator_id) for d in args.domains)
    logger.info(f"Total annotation records: {total}")


if __name__ == "__main__":
    main()
