#!/usr/bin/env python3
"""DataTales factuality metric (masked-number prediction / cloze, Fig. 5).

For each gold human report: find its numeric values; for each value, give the
model the source TABLE + the report PREFIX up to that number, and ask it to
predict the next value. Score exact-match (normalized) vs the gold number.
This is the paper's metric: it measures whether the model can produce the
number a human analyst wrote, from the data + context. Same gold targets for
every model -> a clean apples-to-apples comparison.

Usage: python3 factuality_metric.py --model gemma4:12b --label gemma4
"""
import argparse
import json
import re
import time
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
HOST = "http://localhost:11434"

# numeric mention: optional $, digits with thousands separators, optional decimal, optional %
NUM_RE = re.compile(r"\$?\d[\d,]*(?:\.\d+)?%?")


def norm_num(s):
    """normalize a numeric string for exact-match: drop $ , and spaces; keep digits . %"""
    s = s.strip().lstrip("$").replace(",", "").rstrip(".")
    return s.lower()


def is_calendar(num_str, text, start):
    """skip 4-digit years (2015-2025) and day-of-month after a month name."""
    core = num_str.strip("$%,")
    if re.fullmatch(r"20(1[5-9]|2[0-5])", core):  # year
        return True
    months = ("january february march april may june july august september "
              "october november december").split()
    pre = text[max(0, start - 12):start].lower()
    if re.fullmatch(r"\d{1,2}", core) and any(m in pre for m in months):
        return True  # day of month
    return False


def gold_targets(text):
    """list of (num_str, start, end) numeric targets in the gold report."""
    out = []
    for m in NUM_RE.finditer(text):
        if is_calendar(m.group(0), text, m.start()):
            continue
        out.append((m.group(0), m.start(), m.end()))
    return out


def predict(model, table, prefix):
    prompt = (
        "You are an expert financial market analyst. Using ONLY the market data below, "
        "complete the market report with the SINGLE next numeric value.\n"
        "Output ONLY that number (e.g. 3,839.50 or 1.2% or 288), nothing else.\n\n"
        f"Market data:\n```\n{table}\n```\n\n"
        f"Report so far:\n{prefix}\n\nNext value:"
    )
    payload = {"model": model, "messages": [{"role": "user", "content": prompt}],
               "stream": False, "think": False,
               "options": {"temperature": 0, "num_predict": 24, "num_ctx": 8192, "seed": 0}}
    r = requests.post(f"{HOST}/api/chat", json=payload, timeout=600)
    r.raise_for_status()
    out = r.json()["message"]["content"]
    m = NUM_RE.search(out)
    return (m.group(0) if m else ""), out.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="Ollama tag, e.g. gemma4:12b")
    ap.add_argument("--label", required=True, help="e.g. gemma4 / qwen3")
    ap.add_argument("--inputs", default=str(HERE / "eval_inputs.json"))
    ap.add_argument("--max-per-report", type=int, default=10)
    args = ap.parse_args()

    items = json.loads(Path(args.inputs).read_text())["items"]
    per_report, n_ok, n_tot = [], 0, 0
    for it in items:
        gold, table = it["gold"], it["table"]
        targets = gold_targets(gold)[: args.max_per_report]
        rec = {"id": it["id"], "preds": []}
        ok = 0
        for num_str, start, _ in targets:
            prefix = gold[:start].rstrip()
            pred, raw = predict(args.model, table, prefix)
            hit = bool(pred) and norm_num(pred) == norm_num(num_str)
            ok += hit
            rec["preds"].append({"gold": num_str, "pred": pred, "correct": hit})
        rec["correct"], rec["total"] = ok, len(targets)
        n_ok += ok
        n_tot += len(targets)
        per_report.append(rec)
        print(f"{it['id']}: {ok}/{len(targets)}")

    acc = round(100 * n_ok / n_tot, 1) if n_tot else None
    result = {"model": args.model, "label": args.label, "metric": "masked-number prediction (exact match)",
              "n_reports": len(items), "numbers_total": n_tot, "numbers_correct": n_ok,
              "factuality_acc_pct": acc, "per_report": per_report}
    out = HERE / f"factuality_{args.label}.json"
    out.write_text(json.dumps(result, indent=2))
    print(f"\n{args.model}: FACTUALITY (masked-number) = {acc}%  ({n_ok}/{n_tot})  -> {out.name}")


if __name__ == "__main__":
    main()
