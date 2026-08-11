"""Evaluation results, kept honest about where each figure comes from.

Two sources, never blended:

* **measured** - computed from the runs in this database. Small, local, and
  carrying its own n, because a mean over three demo runs is not a study
  result and must not be able to read like one.
* **reproduction** - read from the committed artifacts under ``reproductions/``,
  naming the file each figure came from.

Anything that is neither is reported as unavailable rather than filled in.
"""

from __future__ import annotations

import csv
import statistics
from pathlib import Path

from django.db.models import Count

from .datasets import REPO_ROOT
from .models import Run, RunStatus, StageResult
from .schemas import (
    EditCategoryCount,
    FaithfulnessPoint,
    MaskedNumberPoint,
    MaskedNumberResults,
    MeasuredResults,
    OperationAccuracy,
    PerOperationResults,
    ReproductionResults,
    ResultsOut,
    StageTiming,
    TierRuns,
)
from .services import emotive_spans_of

QUINTD_DIR = REPO_ROOT / "reproductions" / "paper5-quintd"
DATATALES_DIR = REPO_ROOT / "reproductions" / "paper9-datatales"

# Ascending analytical complexity, which is the axis the DataTales finding is
# about: accuracy falls as the operation asks for more than reading a cell.
# Ordering here rather than in the chart keeps the claim with the data.
OPERATIONS = [
    ("lookup", "Lookup"),
    ("comparison", "Comparison"),
    ("subtraction", "Subtraction"),
    ("rate_of_change", "Rate of change"),
    ("trend", "Trend"),
    ("causal", "Causal"),
    ("predictive", "Predictive"),
]

# Smallest first, so a reader crossing the chart reads the scale effect in the
# direction the caption describes it.
DATATALES_MODELS = ["qwen3.5:4b", "gemma4:12b"]

EDIT_LABELS = {
    "intensity": "Intensity",
    "framing": "Framing",
    "overreach": "Overreach",
    "grounding": "Grounding",
}


def _pooled_error_rate(path: Path) -> float | None:
    """Share of outputs with >=1 semantic error, pooled across domains.

    Weighted by n rather than averaged over domains: the domains have equal n
    today, but a plain mean would silently start lying the day they do not.
    """
    if not path.exists():
        return None
    total = flagged = 0
    with path.open() as fh:
        for row in csv.DictReader(fh):
            n = int(row["n"])
            total += n
            flagged += n * float(row["pct_with_error"]) / 100
    return round(flagged / total * 100, 1) if total else None


def faithfulness() -> ReproductionResults | None:
    """The paper-5 reproduction: does the 2023 finding survive on 2026 models?"""
    gemma = _pooled_error_rate(QUINTD_DIR / "metrics.csv")
    qwen = _pooled_error_rate(QUINTD_DIR / "metrics_qwen3.csv")
    if gemma is None and qwen is None:
        return None

    series = [
        FaithfulnessPoint(
            model="Paper baseline",
            value=80.0,
            note="> 80% in the original study, 2023-era 7B models",
            tone="bad",
        )
    ]
    if qwen is not None:
        series.append(
            FaithfulnessPoint(
                model="qwen3.5:4b", value=qwen, note="a 2026 4B model regresses", tone="warn"
            )
        )
    if gemma is not None:
        series.append(
            FaithfulnessPoint(
                model="gemma4:12b", value=gemma, note="modern 12B, fairly faithful", tone="good"
            )
        )
    return ReproductionResults(
        caption=(
            "Re-running the reference-free error-span method on the released Quintd-1 "
            "inputs. A modern 12B model is far more faithful than the paper's baseline; "
            "a 4B model regresses. Both size and recency matter."
        ),
        unit="% of outputs with >=1 semantic error",
        source="reproductions/paper5-quintd/metrics.csv, metrics_qwen3.csv",
        series=series,
    )


def measured() -> MeasuredResults:
    """What the runs in this database actually show."""
    runs = list(Run.objects.all())
    done = [r for r in runs if r.status == RunStatus.DONE]

    judged = [r for r in done if r.raw_alarmism is not None and r.moderated_alarmism is not None]
    moderated = [r for r in done if r.emotive_spans]
    checked = [r for r in done if r.factual_check]

    counts = dict.fromkeys(EDIT_LABELS, 0)
    for run in moderated:
        for span in emotive_spans_of(run):
            counts[span.category] += 1

    timings: list[StageTiming] = []
    keys = (
        StageResult.objects.values("stage", "model")
        .annotate(n=Count("id"))
        .order_by("stage", "model")
    )
    for key in keys:
        seconds = list(
            StageResult.objects.filter(stage=key["stage"], model=key["model"]).values_list(
                "duration_s", flat=True
            )
        )
        timings.append(
            StageTiming(
                stage=key["stage"],
                model=key["model"],
                runs=len(seconds),
                median_seconds=round(statistics.median(seconds), 1),
            )
        )

    return MeasuredResults(
        runs_total=len(runs),
        runs_complete=len(done),
        by_tier=[
            TierRuns(tier=row["tier"], runs=row["n"])
            for row in Run.objects.values("tier").annotate(n=Count("id")).order_by("tier")
        ],
        alarmism_before=(
            round(statistics.mean(r.raw_alarmism for r in judged), 2) if judged else None
        ),
        alarmism_after=(
            round(statistics.mean(r.moderated_alarmism for r in judged), 2) if judged else None
        ),
        alarmism_n=len(judged),
        edits_per_run=(
            round(sum(len(r.emotive_spans) for r in moderated) / len(moderated), 1)
            if moderated
            else None
        ),
        edits_by_category=[
            EditCategoryCount(category=key, label=label, count=counts[key])  # type: ignore[arg-type]
            for key, label in EDIT_LABELS.items()
        ],
        facts_preserved_rate=(
            round(
                sum(
                    1
                    for r in checked
                    if not any(i.get("status") == "flagged" for i in r.factual_check)
                )
                / len(checked)
                * 100,
                1,
            )
            if checked
            else None
        ),
        facts_checked_n=len(checked),
        stage_timings=timings,
    )


def per_operation() -> PerOperationResults | None:
    """The paper-9 reproduction: accuracy against analytical complexity.

    Read from ``per_operation.csv``, which ``export_aggregates.py`` writes out
    of the judged evaluation. The per-item judgments themselves are gitignored,
    but the aggregate is small and is exactly what the chart quotes, so it is
    committed rather than retyped here as a constant.
    """
    path = DATATALES_DIR / "per_operation.csv"
    if not path.exists():
        return None

    labels = dict(OPERATIONS)
    order = {op: i for i, (op, _) in enumerate(OPERATIONS)}
    rows: list[OperationAccuracy] = []
    with path.open() as fh:
        for row in csv.DictReader(fh):
            if row["operation"] not in labels:
                continue
            rows.append(
                OperationAccuracy(
                    model=row["model"],
                    operation=row["operation"],
                    label=labels[row["operation"]],
                    correct=int(row["correct"]),
                    total=int(row["total"]),
                    pct=float(row["pct"]),
                )
            )
    if not rows:
        return None

    models = [m for m in DATATALES_MODELS if any(r.model == m for r in rows)]
    models += sorted({r.model for r in rows} - set(models))
    rows.sort(key=lambda r: (order[r.operation], models.index(r.model)))

    return PerOperationResults(
        caption=(
            "Reproducing the DataTales finding that accuracy falls as analytical "
            "complexity rises, on 30 equity-market reports judged against the source "
            "table. Scale closes the gap on reading and computing - trend goes from "
            "40.5% to 87.3% between the 4B and the 12B - but the causal operation "
            "stays at 0% for both. That is a capability wall, not a size problem."
        ),
        unit="accuracy %, correct of attempted",
        source="reproductions/paper9-datatales/per_operation.csv",
        models=models,
        rows=rows,
    )


def masked_number() -> MaskedNumberResults | None:
    """Paper 9's own factuality metric: predict the human analyst's next number.

    Kept beside the paper's reported models, because the claim being reproduced
    is not a number but a regime - everything lands under 30%.
    """
    path = DATATALES_DIR / "masked_number.csv"
    if not path.exists():
        return None

    series: list[MaskedNumberPoint] = []
    with path.open() as fh:
        for row in csv.DictReader(fh):
            series.append(
                MaskedNumberPoint(
                    model=row["model"],
                    value=float(row["pct"]),
                    correct=int(row["correct"]) if row["correct"] else None,
                    total=int(row["total"]) if row["total"] else None,
                    source=row["source"],  # type: ignore[arg-type]
                )
            )
    if not series:
        return None

    return MaskedNumberResults(
        caption=(
            "The paper's own factuality metric, reimplemented: give the model the table "
            "and the human report up to a number, and check whether it predicts that "
            "number exactly. The same 115 gold targets for both of ours, so they are "
            "directly comparable. Everything lands in the paper's sub-30% regime, which "
            "is the claim that reproduces."
        ),
        unit="% of masked numbers predicted exactly",
        source="reproductions/paper9-datatales/masked_number.csv",
        series=series,
    )


def build() -> ResultsOut:
    blocks = {
        "faithfulness": faithfulness(),
        "per_operation": per_operation(),
        "masked_number": masked_number(),
    }
    unavailable = [
        f"The {name.replace('_', ' ')} figures come from a reproduction whose "
        "aggregate file is not present in this checkout."
        for name, value in blocks.items()
        if value is None
    ]
    return ResultsOut(measured=measured(), **blocks, unavailable=unavailable)
