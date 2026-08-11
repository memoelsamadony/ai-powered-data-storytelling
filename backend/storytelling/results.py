"""Evaluation results, kept honest about where each figure comes from.

Two sources, never blended:

* **measured** - computed from the runs in this database. Small, local, and
  carrying its own n, because a mean over three demo runs is not a study
  result and must not be able to read like one.
* **reproduction** - read from the committed artifacts under ``reproductions/``,
  naming the file each figure came from.

Anything that is neither is reported as unavailable rather than filled in. The
paper9 per-operation and masked-number figures are the live case: their JSON
outputs are gitignored, so they exist on the machine that produced them and not
in a clone, and no honest endpoint can serve them from here.
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
    MeasuredResults,
    ReproductionResults,
    ResultsOut,
    StageTiming,
    TierRuns,
)
from .services import emotive_spans_of

QUINTD_DIR = REPO_ROOT / "reproductions" / "paper5-quintd"

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


def build() -> ResultsOut:
    unavailable = [
        "Per-operation analytical accuracy and masked-number prediction come from the "
        "paper9-datatales reproduction, whose per-item JSON outputs are gitignored and "
        "exist only on the machine that produced them. They cannot be served from a clone."
    ]
    return ResultsOut(measured=measured(), faithfulness=faithfulness(), unavailable=unavailable)
