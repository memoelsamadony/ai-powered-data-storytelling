#!/usr/bin/env python3
"""Assemble the equity evaluation slice -> eval_inputs.json.

Each item: {id, source, date, table, n_entities, gold} plus a shared
`example_report` used as the format guide in the generation prompt.
"""
import argparse
import json
from pathlib import Path

import dt_data

HERE = Path(__file__).resolve().parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=30)
    ap.add_argument("--out", default=str(HERE / "eval_inputs.json"))
    args = ap.parse_args()

    test = dt_data.reports(split="test")
    example = dt_data.example_report()
    items = []
    for r in test:
        if len(items) >= args.n:
            break
        table, n_ent = dt_data.table_for(r["date"])
        if n_ent < 8:  # require a substantive table
            continue
        items.append({
            "id": f"{r['source']}_{r['date']}",
            "source": r["source"], "date": r["date"],
            "table": table, "n_entities": n_ent,
            "gold": r["passage"].strip(),
        })
    payload = {"example_report": example, "items": items}
    Path(args.out).write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"wrote {len(items)} items -> {args.out}")
    print(f"sources: {[i['source'] for i in items][:8]}...")
    print(f"date span: {items[0]['date']} .. {items[-1]['date']}")
    print(f"avg gold words: {sum(len(i['gold'].split()) for i in items)/len(items):.0f}")


if __name__ == "__main__":
    main()
