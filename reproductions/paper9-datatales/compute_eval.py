#!/usr/bin/env python3
"""Aggregate the DataTales-style evaluation for the equity slice.

Reproduces (in spirit) the paper's three axes:
  * Style       -> corpus BLEU-4 (generated vs gold report)
  * Factuality  -> % of numeric claims that are correct (Opus 4.7-judged)
  * Per-operation accuracy -> correct/total for each of the 7 analytical ops
  * Insightfulness (proxy) -> Opus 4.7 1-5 impact + significance

Reads generations.json + judgments/*.json (one list of per-report judgments each).
"""
import argparse
import glob
import json
import math
import re
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
OPS = ["lookup", "comparison", "subtraction", "rate_of_change", "trend", "causal", "predictive"]


# ---------- BLEU-4 (corpus, with add-1 smoothing on higher n-grams) ----------
def _tok(s):
    return re.findall(r"[a-z0-9]+(?:\.[0-9]+)?|%", s.lower())


def _ngrams(toks, n):
    return [tuple(toks[i:i + n]) for i in range(len(toks) - n + 1)]


def corpus_bleu(hyps, refs, max_n=4):
    p_num = [0] * max_n
    p_den = [0] * max_n
    hyp_len = ref_len = 0
    for h, r in zip(hyps, refs):
        ht, rt = _tok(h), _tok(r)
        hyp_len += len(ht)
        ref_len += len(rt)
        for n in range(1, max_n + 1):
            hn = defaultdict(int)
            for g in _ngrams(ht, n):
                hn[g] += 1
            rn = defaultdict(int)
            for g in _ngrams(rt, n):
                rn[g] += 1
            overlap = sum(min(c, rn.get(g, 0)) for g, c in hn.items())
            total = max(len(ht) - n + 1, 0)
            p_num[n - 1] += overlap
            p_den[n - 1] += total
    precisions = []
    for n in range(max_n):
        num, den = p_num[n], p_den[n]
        if n == 0:
            precisions.append(num / den if den else 0.0)
        else:  # add-1 smoothing
            precisions.append((num + 1) / (den + 1) if den else 0.0)
    if min(precisions) <= 0:
        geo = 0.0
    else:
        geo = math.exp(sum(math.log(p) for p in precisions) / max_n)
    bp = 1.0 if hyp_len > ref_len else math.exp(1 - ref_len / hyp_len) if hyp_len else 0.0
    return 100 * bp * geo, [round(100 * p, 1) for p in precisions]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gens", default=str(HERE / "generations.json"))
    ap.add_argument("--judg", default=str(HERE / "judgments"))
    ap.add_argument("--out", default=str(HERE / "metrics.json"))
    ap.add_argument("--label", default="qwen3.5:4b")
    args = ap.parse_args()

    gens = json.loads(Path(args.gens).read_text())
    by_id = {g["id"]: g for g in gens}

    # ---- style: BLEU ----
    hyps = [g["generated"] for g in gens]
    refs = [g["gold"] for g in gens]
    bleu, prec = corpus_bleu(hyps, refs)

    # ---- load judgments (dedup by id; keep first occurrence) ----
    seen, judg = set(), []
    for f in sorted(glob.glob(str(Path(args.judg) / "*.json"))):
        for j in json.loads(Path(f).read_text()):
            if j["id"] in seen:
                continue
            seen.add(j["id"])
            judg.append(j)
    judged_ids = {j["id"] for j in judg}

    num_ok = num_tot = 0
    op_ok = defaultdict(int)
    op_tot = defaultdict(int)
    impacts, sigs = [], []
    for j in judg:
        for c in j.get("numeric_claims", []):
            num_tot += 1
            num_ok += 1 if c.get("correct") else 0
        for o in j.get("operations", []):
            t = o.get("type")
            if t in OPS:
                op_tot[t] += 1
                op_ok[t] += 1 if o.get("correct") else 0
        ins = j.get("insightfulness", {})
        if ins:
            impacts.append(ins.get("impact", 0))
            sigs.append(ins.get("significance", 0))

    result = {
        "n_generated": len(gens),
        "n_judged": len(judged_ids),
        "style_bleu4": round(bleu, 2),
        "bleu_precisions": prec,
        "factuality": {
            "numeric_claims_total": num_tot,
            "numeric_correct": num_ok,
            "numeric_accuracy_pct": round(100 * num_ok / num_tot, 1) if num_tot else None,
        },
        "per_operation_accuracy": {
            op: {"correct": op_ok[op], "total": op_tot[op],
                 "pct": round(100 * op_ok[op] / op_tot[op], 1) if op_tot[op] else None}
            for op in OPS
        },
        "insightfulness_proxy": {
            "avg_impact": round(sum(impacts) / len(impacts), 2) if impacts else None,
            "avg_significance": round(sum(sigs) / len(sigs), 2) if sigs else None,
            "scale": "1-5 (Opus 4.7 proxy, not human)",
        },
    }
    Path(args.out).write_text(json.dumps(result, indent=2))

    # ---- print ----
    print(f"DataTales equity slice — {args.label} (zero-shot, thinking off)")
    print(f"  reports: {result['n_generated']} generated, {result['n_judged']} judged\n")
    print(f"  STYLE     BLEU-4 = {result['style_bleu4']}  (precisions {prec})")
    f = result["factuality"]
    print(f"  FACTUALITY numeric accuracy = {f['numeric_accuracy_pct']}%  "
          f"({f['numeric_correct']}/{f['numeric_claims_total']} numbers correct)")
    ins = result["insightfulness_proxy"]
    print(f"  INSIGHT   impact={ins['avg_impact']}  significance={ins['avg_significance']}  (1-5 proxy)")
    print(f"\n  PER-OPERATION ACCURACY")
    for op in OPS:
        d = result["per_operation_accuracy"][op]
        if d["total"]:
            print(f"    {op:15s} {d['pct']:5.1f}%  ({d['correct']}/{d['total']})")
    print(f"\n  wrote {args.out}")


if __name__ == "__main__":
    main()
