#!/usr/bin/env python3
"""Export the committed aggregates for this reproduction.

`metrics*.json` and `factuality*.json` hold a judgment per report and per
number, so they are large, contain the generated text, and are gitignored -
they live only on the machine that ran the evaluation. The *aggregates* are
small, are what the report and the web interface quote, and belong in git.

Same split paper5-quintd already uses: `metrics.csv` is committed, the raw
model outputs and judge inputs are not. The point is that the interface reads
a file produced from the evaluation rather than a constant somebody typed in
after reading the report.

    python3 reproductions/paper9-datatales/export_aggregates.py
    python3 .../export_aggregates.py --artifacts /path/holding/the/json
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

# label -> the two JSONs it was evaluated into. The label is the model name as
# the interface should print it; "gemma 4B" appeared on a chart of qwen3.5:4b's
# numbers once already, which is the mistake this mapping exists to prevent.
MODELS = {
    "qwen3.5:4b": ("metrics.json", "factuality_qwen3.json"),
    "gemma4:12b": ("metrics_gemma4.json", "factuality_gemma4.json"),
}

# The paper's own zero-shot same-day numbers on the masked-number metric
# (Yang, Liu & Kan, arXiv:2410.17859, Fig. 5), carried so the chart can show
# what "sub-30% regime" means rather than asserting it.
PAPER_MASKED = [
    ("GPT-4 (paper)", 25.2),
    ("LlaMa2-13B (paper)", 20.7),
    ("LlaMa2-7B (paper)", 18.8),
    ("GPT-3.5 (paper)", 14.6),
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", type=Path, default=HERE,
                        help="Directory holding the evaluation JSON (default: this one).")
    args = parser.parse_args()

    missing = [
        name
        for pair in MODELS.values()
        for name in pair
        if not (args.artifacts / name).exists()
    ]
    if missing:
        raise SystemExit(
            f"Missing evaluation artifacts in {args.artifacts}: {', '.join(missing)}. "
            "They are gitignored; re-run the evaluation or pass --artifacts."
        )

    def load(name: str) -> dict:
        return json.loads((args.artifacts / name).read_text())

    with (HERE / "per_operation.csv").open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["model", "operation", "correct", "total", "pct"])
        for label, (metrics_file, _) in MODELS.items():
            for op, row in load(metrics_file)["per_operation_accuracy"].items():
                # A model that never attempted an operation has no accuracy, and
                # writing 0 would report a total failure it was never tested on.
                if not row["total"]:
                    continue
                writer.writerow([label, op, row["correct"], row["total"], row["pct"]])

    with (HERE / "masked_number.csv").open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["model", "correct", "total", "pct", "source"])
        for label, pct in PAPER_MASKED:
            writer.writerow([label, "", "", pct, "paper"])
        for label, (_, factuality_file) in MODELS.items():
            data = load(factuality_file)
            writer.writerow([
                label,
                data["numbers_correct"],
                data["numbers_total"],
                data["factuality_acc_pct"],
                "ours",
            ])

    for name in ("per_operation.csv", "masked_number.csv"):
        print(f"wrote {HERE / name}")


if __name__ == "__main__":
    main()
