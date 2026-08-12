"""Request and response shapes for the chart-selection endpoint.

Separate from ``spec.py`` on purpose: that file mirrors ``lib/charts/spec.ts``
and must stay a line-for-line twin of it. This one is the envelope around it,
and its twin is the ``suggestCharts`` declaration in ``lib/api.ts``.

``sources_for_*`` is the other half of the answer to "does this work for a
custom dataset": a registry dataset and an upload both arrive at the selector as
a list of ``FrameSource``, so there is one selection path rather than two that
drift. What differs is only where the column types came from - declared by the
registry, or inferred by ``profile.py`` - and that difference is reported rather
than smoothed over.
"""

from __future__ import annotations

import pandas as pd

from ..schemas import Dataset, Schema
from .applicability import FrameSource
from .frames import country_frame_of, world_frame_of
from .profile import frame_from_dataframe, profile_of_frame
from .spec import ChartPayload


class ChartSuggestIn(Schema):
    """Exactly one of ``dataset_id`` / ``upload_id``."""

    dataset_id: str | None = None
    upload_id: str | None = None
    n: int = 3
    tier: str = "demo"
    #: Overrides the tier's moderator for this call. For comparing models on the
    #: same table; leave unset in normal use.
    model: str | None = None
    #: Passed to Ollama. Fixing it makes a run repeatable while the model stays
    #: resident; it does NOT survive an eviction, because a cold load re-reads
    #: the weights and the sampler starts from a different place. See
    #: experiments/MODELS.md - the same caveat applies to every stage here.
    seed: int | None = None


class ColumnReport(Schema):
    """How a column got its type. Present so a wrong inference is visible."""

    key: str
    label: str
    type: str
    basis: str
    evidence: str
    missing: float
    distinct: int


class ChartSuggestOut(Schema):
    charts: list[ChartPayload]
    #: Every column the selector saw, and why it is typed the way it is.
    columns: list[ColumnReport]
    #: Shape changes made before charting: a melt, a row cap, a renamed column.
    notes: list[str]
    #: How many figures were drawable in total; ``charts`` is the chosen subset.
    candidates_considered: int
    model: str
    source: str


def sources_for_dataset(dataset: Dataset) -> list[FrameSource]:
    """A registry dataset offers a world trend and, usually, a country table."""
    sources = [
        FrameSource(
            name="world trend",
            frame=(world := world_frame_of(dataset)),
            profile=profile_of_frame(world),
        )
    ]
    if dataset.country_stats and dataset.country_metrics:
        country = country_frame_of(dataset)
        if country.rows:
            sources.append(
                FrameSource(name="country table", frame=country,
                            profile=profile_of_frame(country))
            )
    return sources


def sources_for_upload(record) -> list[FrameSource]:
    """One uploaded CSV, typed by inference rather than by declaration."""
    df = pd.read_csv(record.stored_path)
    frame, profile = frame_from_dataframe(
        df, source_note=f"Uploaded: {record.original_name}"
    )
    return [FrameSource(name="uploaded table", frame=frame, profile=profile)]


def report_columns(sources: list[FrameSource]) -> list[ColumnReport]:
    out: list[ColumnReport] = []
    seen: set[tuple[str, str]] = set()
    for source in sources:
        for c in source.profile.columns:
            marker = (source.name, c.key)
            if marker in seen:
                continue
            seen.add(marker)
            out.append(ColumnReport(
                key=c.key, label=c.label, type=c.type, basis=c.basis,
                evidence=c.evidence, missing=c.missing, distinct=c.distinct,
            ))
    return out
