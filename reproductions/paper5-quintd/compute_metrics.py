#!/usr/bin/env python3
"""Stage 3 — reproduce the paper's headline semantic-accuracy metrics.

Reads the Opus 4.7 error annotations (paper .jsonl format) plus the generated
outputs and computes, per domain and in aggregate:

  * % of outputs with >= 1 semantic error   <- the paper's headline metric
  * average number of errors per output
  * per-error-type counts and example coverage (Incorrect / Not-checkable /
    Misleading / Other), matching the paper's taxonomy
  * average output length in words

Mirrors the aggregation in evaluation/generate_paper_results.py
(ex_err_ratio + avg_errors), restricted to our single model+annotator.
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path

from quintd_data import DOMAINS

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_BASE = REPO_ROOT / "data" / "quintd-1" / "outputs"
ANN_DIR = REPO_ROOT / "data" / "quintd-1" / "annotations" / "opus47"

TYPE_NAMES = {0: "Incorrect", 1: "NotCheckable", 2: "Misleading", 3: "Other"}


def load_annotations(domain, split, label, annotator_id):
    path = ANN_DIR / f"{annotator_id}-{domain}-{split}-{label}-direct.jsonl"
    if not path.exists():
        return None
    recs = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
    return recs


def load_lengths(domain, split, label):
    path = OUT_BASE / split / domain / "direct" / f"{label}.json"
    data = json.loads(path.read_text())
    return [len(g["out"].split()) for g in data["generated"]]


def domain_stats(recs, lengths):
    n = len(recs)
    n_with_error = 0
    total_errors = 0
    type_counts = defaultdict(int)          # total errors of each type
    type_example_cov = defaultdict(int)     # examples with >=1 of each type
    for r in recs:
        anns = r["annotations"]
        if anns:
            n_with_error += 1
        total_errors += len(anns)
        seen_types = set()
        for a in anns:
            t = a["type"]
            type_counts[t] += 1
            seen_types.add(t)
        for t in seen_types:
            type_example_cov[t] += 1
    return {
        "n": n,
        "pct_with_error": 100.0 * n_with_error / n if n else 0.0,
        "avg_errors": total_errors / n if n else 0.0,
        "total_errors": total_errors,
        "type_counts": {TYPE_NAMES[t]: type_counts.get(t, 0) for t in range(4)},
        "type_avg": {TYPE_NAMES[t]: type_counts.get(t, 0) / n if n else 0.0 for t in range(4)},
        "type_example_pct": {TYPE_NAMES[t]: 100.0 * type_example_cov.get(t, 0) / n if n else 0.0 for t in range(4)},
        "avg_len_words": sum(lengths) / len(lengths) if lengths else 0.0,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--domains", nargs="+", default=DOMAINS)
    ap.add_argument("--split", default="test")
    ap.add_argument("--label", default="gemma4")
    ap.add_argument("--annotator-id", default="opus47")
    ap.add_argument("--csv", default=str(Path(__file__).resolve().parent / "metrics.csv"))
    args = ap.parse_args()

    per_domain = {}
    all_recs, all_lengths = [], []
    for d in args.domains:
        recs = load_annotations(d, args.split, args.label, args.annotator_id)
        if recs is None:
            print(f"[skip] no annotations for {d}")
            continue
        lengths = load_lengths(d, args.split, args.label)
        per_domain[d] = domain_stats(recs, lengths)
        all_recs.extend(recs)
        all_lengths.extend(lengths)

    overall = domain_stats(all_recs, all_lengths)

    # ---- print table ----
    hdr = f"{'domain':12s} {'n':>3s} {'%>=1err':>8s} {'avg_err':>8s} {'Incor':>6s} {'NotChk':>6s} {'Misld':>6s} {'Other':>6s} {'len':>5s}"
    print(hdr)
    print("-" * len(hdr))
    def row(name, s):
        tc = s["type_avg"]
        return (f"{name:12s} {s['n']:3d} {s['pct_with_error']:7.1f}% {s['avg_errors']:8.2f} "
                f"{tc['Incorrect']:6.2f} {tc['NotCheckable']:6.2f} {tc['Misleading']:6.2f} {tc['Other']:6.2f} "
                f"{s['avg_len_words']:5.1f}")
    for d in args.domains:
        if d in per_domain:
            print(row(d, per_domain[d]))
    print("-" * len(hdr))
    print(row("ALL", overall))
    print()
    print(f"HEADLINE: {overall['pct_with_error']:.1f}% of {overall['n']} outputs contain >=1 semantic error "
          f"(avg {overall['avg_errors']:.2f} errors/output).")

    # ---- write CSV ----
    cols = ["domain", "n", "pct_with_error", "avg_errors", "total_errors",
            "avg_Incorrect", "avg_NotCheckable", "avg_Misleading", "avg_Other",
            "pctex_Incorrect", "pctex_NotCheckable", "pctex_Misleading", "pctex_Other",
            "avg_len_words"]
    lines = [",".join(cols)]
    def csv_row(name, s):
        return ",".join(str(x) for x in [
            name, s["n"], f"{s['pct_with_error']:.2f}", f"{s['avg_errors']:.4f}", s["total_errors"],
            f"{s['type_avg']['Incorrect']:.4f}", f"{s['type_avg']['NotCheckable']:.4f}",
            f"{s['type_avg']['Misleading']:.4f}", f"{s['type_avg']['Other']:.4f}",
            f"{s['type_example_pct']['Incorrect']:.2f}", f"{s['type_example_pct']['NotCheckable']:.2f}",
            f"{s['type_example_pct']['Misleading']:.2f}", f"{s['type_example_pct']['Other']:.2f}",
            f"{s['avg_len_words']:.2f}"])
    for d in args.domains:
        if d in per_domain:
            lines.append(csv_row(d, per_domain[d]))
    lines.append(csv_row("ALL", overall))
    Path(args.csv).write_text("\n".join(lines) + "\n")
    print(f"\nWrote {args.csv}")


if __name__ == "__main__":
    main()
