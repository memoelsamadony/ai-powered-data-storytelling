"""``Dataset`` -> ``ChartFrame``. The port of ``lib/charts/dataset-frame.ts``.

The registry datasets hold two shapes and neither is a chart frame:

    series        the world trend, as {year, primary, secondary}
    country_stats country figures, columnar, one list per metric

Both become long-format frames here. Keeping the port faithful is what lets
``ChartSelectionParityTests`` assert that the server builds byte-comparable
frames to the ones the TypeScript builds for the same dataset - the check the
user asked for, that a custom upload and a registry dataset go through the same
machinery rather than two lookalike code paths.
"""

from __future__ import annotations

from ..schemas import Dataset
from .spec import ChartColumn, ChartFrame


def country_frame_of(dataset: Dataset) -> ChartFrame:
    """Country figures as one row per (country, year).

    Every declared metric becomes a quantitative column, including the ones
    flagged ``mappable=False``. That flag governs whether a metric may go on a
    MAP, not whether it exists: a count is a perfectly good bar chart and a
    misleading choropleth, and only the map cares about the difference.
    """
    years = dataset.country_years or []
    metrics = dataset.country_metrics or []
    stats = dataset.country_stats or []

    columns: list[ChartColumn] = [
        ChartColumn(key="year", label="Year", type="temporal"),
        ChartColumn(key="country", label="Country", type="nominal"),
        ChartColumn(key="iso3", label="ISO3", type="geo"),
        *[
            ChartColumn(
                key=m.key, label=m.label, type="quantitative",
                unit=m.unit, decimals=m.decimals,
            )
            for m in metrics
        ],
    ]

    rows: list[dict[str, float | str | None]] = []
    for stat in stats:
        for i, year in enumerate(years):
            row: dict[str, float | str | None] = {
                "year": year, "country": stat.name, "iso3": stat.iso3,
            }
            for m in metrics:
                values = stat.series.get(m.key) or []
                row[m.key] = values[i] if i < len(values) else None
            rows.append(row)

    return ChartFrame(
        columns=columns, rows=rows,
        source_note=dataset.country_source_note or "",
    )


def world_frame_of(dataset: Dataset) -> ChartFrame:
    """The world trend as one row per (year, measure).

    The two measures share one ``value`` column, which is only honest under a
    spec that puts them on comparable footing: ``transform="indexed"``, or a
    facet. A raw plot of this frame would draw a percentage and a count against
    one axis, which is the dual-axis defect wearing a different hat. The column
    is labelled "Value" rather than borrowing either measure's name, so nothing
    downstream can mistake one for the other.
    """
    columns = [
        ChartColumn(key="year", label="Year", type="temporal"),
        ChartColumn(key="measure", label="Measure", type="nominal"),
        ChartColumn(key="value", label="Value", type="quantitative", decimals=1),
    ]

    rows: list[dict[str, float | str | None]] = []
    for point in dataset.series:
        rows.append({"year": point.year, "measure": dataset.primary_label,
                     "value": point.primary})
        rows.append({"year": point.year, "measure": dataset.secondary_label,
                     "value": point.secondary})

    return ChartFrame(columns=columns, rows=rows,
                      source_note=" · ".join(dataset.sources))


def where_rows(frame: ChartFrame, keep) -> ChartFrame:
    """Rows matching a predicate. A slice is never a new schema."""
    return ChartFrame(
        columns=frame.columns,
        rows=[r for r in frame.rows if keep(r)],
        source_note=frame.source_note,
    )


def top_by(frame: ChartFrame, item_key: str, measure: str, n: int) -> list[str]:
    """The ``n`` items with the largest value of ``measure``.

    Returns the NAMES so the caller filters its own frame with them, rather than
    folding silently here: which items survive a categorical cut is an editorial
    choice and should be visible at the call site.
    """
    best: dict[str, float] = {}
    for row in frame.rows:
        value = row.get(measure)
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            continue
        if value != value:  # NaN
            continue
        item = str(row.get(item_key) or "")
        if item not in best or value > best[item]:
            best[item] = float(value)
    ranked = sorted(best.items(), key=lambda kv: kv[1], reverse=True)
    return [name for name, _ in ranked[:n]]
