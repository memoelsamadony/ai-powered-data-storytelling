#!/usr/bin/env python3
"""Data layer for the reproduction dashboard.

Assembles, from the on-disk artifacts, the payloads the dashboard renders:
- per-example: the structured input, gemma4's story + Opus 4.7 error spans,
  Zephyr's story (paper's best 7B) + the paper's GPT-4 error spans;
- a summary scoreboard: % of stories with >=1 error per domain, gemma4 vs
  Zephyr, computed on the SAME example indices (apples-to-apples).
"""
import glob
import json
from pathlib import Path

from quintd_data import get_data, DOMAINS

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_BASE = REPO_ROOT / "data" / "quintd-1" / "outputs"
ANN = REPO_ROOT / "data" / "quintd-1" / "annotations"

TYPE_NAMES = {0: "Incorrect", 1: "Not checkable", 2: "Misleading", 3: "Other"}

DOMAIN_META = {
    "openweather": {"label": "Weather", "icon": "☁", "task": "five-day forecast"},
    "gsmarena":    {"label": "Product", "icon": "▣", "task": "product description"},
    "ice_hockey":  {"label": "Hockey",  "icon": "◉", "task": "game summary"},
    "owid":        {"label": "Health",  "icon": "≈", "task": "chart caption"},
    "wikidata":    {"label": "Facts",   "icon": "◈", "task": "entity description"},
}

# how many examples we generated per domain
N = 20


def _load_outputs(domain, kind, label):
    """kind: 'direct'/'default' subdir; label: filename stem."""
    path = OUT_BASE / "test" / domain / kind / f"{label}.json"
    if not path.exists():
        return []
    return [g["out"] for g in json.loads(path.read_text())["generated"]]


def _load_opus47_errors(domain, label="gemma4"):
    """Opus 4.7-judged errors per table_idx for a given model label."""
    path = ANN / "opus47" / f"opus47-{domain}-test-{label}-direct.jsonl"
    by_idx = {}
    if path.exists():
        for line in path.read_text().splitlines():
            if not line.strip():
                continue
            r = json.loads(line)
            by_idx[r["table_idx"]] = r["annotations"]
    return by_idx


def _load_gpt4_errors(domain, model):
    """paper's GPT-4 metric errors per table_idx for a given model (e.g. zephyr)."""
    files = glob.glob(str(ANN / "gpt-4" / f"gpt-4-{domain}-test-{model}-direct-*.jsonl"))
    by_idx = {}
    if files:
        for line in Path(files[0]).read_text().splitlines():
            if not line.strip():
                continue
            r = json.loads(line)
            by_idx[r["table_idx"]] = r["annotations"]
    return by_idx


def _spans(annotations, text):
    """Normalize annotation records into {start,end,type,type_name,reason}.
    Re-locates start if missing/stale via case-insensitive search."""
    out = []
    for a in annotations:
        etext = a.get("text", "")
        if not etext:
            continue
        start = a.get("start")
        if start is None or text[start:start + len(etext)].lower() != etext.lower():
            found = text.lower().find(etext.lower())
            start = found if found != -1 else None
        if start is None:
            continue
        out.append({
            "start": start, "end": start + len(etext),
            "type": a.get("type", 3), "type_name": TYPE_NAMES.get(a.get("type", 3), "Other"),
            "reason": a.get("reason", ""), "text": etext,
        })
    out.sort(key=lambda s: s["start"])
    return out


def example(domain, idx):
    data = get_data(domain, "test")
    gemma_out = _load_outputs(domain, "direct", "gemma4")
    zephyr_out = _load_outputs(domain, "default", "zephyr")
    qwen_out = _load_outputs(domain, "direct", "qwen3")
    gemma_err = _load_opus47_errors(domain, "gemma4")
    qwen_err = _load_opus47_errors(domain, "qwen3")
    zephyr_err = _load_gpt4_errors(domain, "zephyr")

    g_text = gemma_out[idx] if idx < len(gemma_out) else ""
    z_text = zephyr_out[idx] if idx < len(zephyr_out) else ""
    q_text = qwen_out[idx] if idx < len(qwen_out) else ""
    out = {
        "domain": domain, "idx": idx, "n": min(N, len(gemma_out)),
        "meta": DOMAIN_META[domain],
        "data": str(data[idx]) if idx < len(data) else "",
        "gemma": {"text": g_text, "spans": _spans(gemma_err.get(idx, []), g_text)},
        "zephyr": {"text": z_text, "spans": _spans(zephyr_err.get(idx, []), z_text)},
    }
    if qwen_out:  # only include the 3rd model once it's been generated
        out["qwen3"] = {"text": q_text, "spans": _spans(qwen_err.get(idx, []), q_text)}
    return out


def _err_rate(by_idx, n):
    """% of examples 0..n-1 with >=1 error."""
    if n == 0:
        return 0.0
    with_err = sum(1 for i in range(n) if by_idx.get(i))
    return 100.0 * with_err / n


def summary():
    rows = []
    g_with = z_with = q_with = total = 0
    has_qwen = bool(_load_outputs(DOMAINS[0], "direct", "qwen3"))
    for d in DOMAINS:
        gemma_out = _load_outputs(d, "direct", "gemma4")
        n = min(N, len(gemma_out))
        gemma_err = _load_opus47_errors(d, "gemma4")
        qwen_err = _load_opus47_errors(d, "qwen3")
        zephyr_err = _load_gpt4_errors(d, "zephyr")
        row = {
            "domain": d, "label": DOMAIN_META[d]["label"], "icon": DOMAIN_META[d]["icon"],
            "n": n, "gemma": round(_err_rate(gemma_err, n), 1),
            "zephyr": round(_err_rate(zephyr_err, n), 1),
        }
        if has_qwen:
            row["qwen3"] = round(_err_rate(qwen_err, n), 1)
            q_with += sum(1 for i in range(n) if qwen_err.get(i))
        rows.append(row)
        g_with += sum(1 for i in range(n) if gemma_err.get(i))
        z_with += sum(1 for i in range(n) if zephyr_err.get(i))
        total += n
    overall = {
        "n": total,
        "gemma": round(100.0 * g_with / total, 1) if total else 0.0,
        "zephyr": round(100.0 * z_with / total, 1) if total else 0.0,
    }
    if has_qwen:
        overall["qwen3"] = round(100.0 * q_with / total, 1) if total else 0.0
    return {
        "rows": rows, "overall": overall, "has_qwen": has_qwen,
        "paper": {"open_models": "76–94%", "errors_per_output": ">2"},
    }


if __name__ == "__main__":
    print(json.dumps(summary(), indent=2))
    print("\nExample ice_hockey #2:")
    ex = example("ice_hockey", 2)
    print("gemma spans:", ex["gemma"]["spans"])
    print("zephyr spans:", len(ex["zephyr"]["spans"]))
