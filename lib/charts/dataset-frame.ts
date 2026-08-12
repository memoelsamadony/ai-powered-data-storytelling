/**
 * `Dataset` → `ChartFrame`. The bridge from the data the app already has.
 *
 * `lib/data/datasets.ts` holds two shapes, and neither is a chart frame:
 *
 *   `series`       the world trend, as `{ year, primary, secondary }[]`
 *   `countryStats` country figures, columnar, one array per metric
 *
 * Both become long-format frames here, so everything already in the repo can be
 * drawn through the spec contract without waiting on a backend. Pure, so
 * `node --test` reaches it.
 */

import type { Dataset } from "../data/datasets.ts";
import type { ChartColumn, ChartFrame, ChartRow } from "./spec.ts";

/**
 * Country figures as one row per (country, year).
 *
 * Every declared `CountryMetric` becomes a quantitative column, including the
 * ones flagged `mappable: false`. That flag governs whether a metric may be put
 * on a MAP, not whether it exists: a count is a perfectly good bar chart and a
 * misleading choropleth, and only the map cares about the difference.
 */
export function countryFrameOf(dataset: Dataset): ChartFrame {
  const years = dataset.countryYears ?? [];
  const metrics = dataset.countryMetrics ?? [];
  const stats = dataset.countryStats ?? [];

  const columns: ChartColumn[] = [
    { key: "year", label: "Year", type: "temporal" },
    { key: "country", label: "Country", type: "nominal" },
    { key: "iso3", label: "ISO3", type: "geo" },
    ...metrics.map(
      (m): ChartColumn => ({
        key: m.key,
        label: m.label,
        type: "quantitative",
        unit: m.unit,
        decimals: m.decimals ?? 0,
      }),
    ),
  ];

  const rows: ChartRow[] = stats.flatMap((stat) =>
    years.map((year, i) => {
      const row: ChartRow = { year, country: stat.name, iso3: stat.iso3 };
      for (const m of metrics) row[m.key] = stat.series[m.key]?.[i] ?? null;
      return row;
    }),
  );

  return { columns, rows, sourceNote: dataset.countrySourceNote };
}

/**
 * The world trend as one row per (year, measure).
 *
 * The two measures share one `value` column, which is only honest under a spec
 * that puts them on comparable footing: `transform: "indexed"`, or a facet. A
 * raw plot of this frame would draw a percentage and a count against the same
 * axis, which is the dual-axis defect wearing a different hat. The column is
 * labelled "Value" rather than borrowing either measure's name, so nothing
 * downstream can mistake one for the other.
 */
export function worldFrameOf(dataset: Dataset): ChartFrame {
  const columns: ChartColumn[] = [
    { key: "year", label: "Year", type: "temporal" },
    { key: "measure", label: "Measure", type: "nominal" },
    { key: "value", label: "Value", type: "quantitative", decimals: 1 },
  ];

  const rows: ChartRow[] = dataset.series.flatMap((point) => [
    { year: point.year, measure: dataset.primaryLabel, value: point.primary },
    { year: point.year, measure: dataset.secondaryLabel, value: point.secondary },
  ]);

  return { columns, rows, sourceNote: dataset.sources.join(" · ") };
}

/* ── Slicing ─────────────────────────────────────────────────────────────── */

/** Rows matching a predicate, columns untouched. A slice is never a new schema. */
export function whereRows(frame: ChartFrame, keep: (row: ChartRow) => boolean): ChartFrame {
  return { ...frame, rows: frame.rows.filter(keep) };
}

/**
 * The `n` items with the largest value of `measure` in the frame's last x-slice.
 *
 * Used to keep a categorical chart inside the four validated hues. It returns
 * the NAMES so the caller filters its own frame with them, rather than folding
 * silently here: which items survive is an editorial choice, and it should be
 * visible at the call site.
 */
export function topBy(
  frame: ChartFrame,
  itemKey: string,
  measure: string,
  n: number,
): string[] {
  const best = new Map<string, number>();
  for (const row of frame.rows) {
    const v = row[measure];
    if (typeof v !== "number" || Number.isNaN(v)) continue;
    const item = String(row[itemKey] ?? "");
    const current = best.get(item);
    if (current === undefined || v > current) best.set(item, v);
  }
  return [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);
}
