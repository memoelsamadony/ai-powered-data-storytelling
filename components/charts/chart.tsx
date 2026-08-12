"use client";

/**
 * `<Chart>` — the one entry point. Give it a payload, get a figure.
 *
 * This is the whole render surface for the chart contract. A producer (an API
 * response, a fixture, or a chart-selection agent on the backend) emits a
 * `ChartPayload`, and this component decides nothing about the data: it
 * validates, prepares, facets, dispatches on `spec.form`, and dresses the
 * result in the chrome every figure owes.
 *
 * Order matters and is not negotiable:
 *
 *   1. validate   an invalid spec renders its reasons, never a chart. Drawing
 *                 something plausible from a spec that failed is the worst
 *                 outcome available, because the reader cannot tell it apart
 *                 from a figure that passed.
 *   2. prepare    transform, then sort. Sorting first would rank the wrong
 *                 number and look entirely convincing.
 *   3. facet      one panel per value, sharing one legend and one table.
 *   4. dispatch   17 geometries, one renderer each.
 *
 * Adding a geometry means a row in `FORM_RULES`, a renderer, and a line in
 * `RENDERERS`. Nothing else in the app changes.
 */

import { useMemo, type ComponentType } from "react";
import type { ChartForm, ChartPayload } from "@/lib/charts/spec";
import { columnOf } from "@/lib/charts/spec";
import { breaksFor, distinctValues, prepare } from "@/lib/charts/frame";
import { colorsFor, rampFor } from "@/lib/charts/scales";
import { legendLabels } from "@/lib/charts/choropleth";
import { validateSpec } from "@/lib/charts/validate";
import { ChartError, ChartFigure, ChartLegend, RampLegend } from "./chrome";
import type { FormProps } from "./forms/props";
import { TimeSeriesChart } from "./forms/time-series";
import { BarChartForm } from "./forms/bar";
import { HeatmapChart } from "./forms/matrix";
import { BumpChart, DumbbellChart, SlopeChart } from "./forms/change";
import {
  ConnectedScatterChart,
  ParallelCoordinatesChart,
  ScatterForm,
} from "./forms/relationship";
import { BeeswarmChart, BoxChart, RidgelineChart } from "./forms/distribution";
import { BivariateChoroplethForm, ChoroplethForm } from "./forms/geo";
import { StatTileForm } from "./forms/stat-tile";

const RENDERERS: Record<ChartForm, ComponentType<FormProps>> = {
  line: TimeSeriesChart,
  area: TimeSeriesChart,
  bar: BarChartForm,
  lollipop: BarChartForm,
  heatmap: HeatmapChart,
  dumbbell: DumbbellChart,
  slope: SlopeChart,
  bump: BumpChart,
  scatter: ScatterForm,
  connectedScatter: ConnectedScatterChart,
  parallelCoordinates: ParallelCoordinatesChart,
  choropleth: ChoroplethForm,
  bivariateChoropleth: BivariateChoroplethForm,
  beeswarm: BeeswarmChart,
  box: BoxChart,
  ridgeline: RidgelineChart,
  statTile: StatTileForm,
};

/**
 * Forms that carry their own legend, because theirs is part of the geometry.
 *
 * A slope chart direct-labels both ends, a dumbbell's key is its two shades, a
 * ridgeline labels each row, and a bivariate map is unreadable without its 3x3
 * grid. Adding a generic legend above these would be a second key saying the
 * same thing in a different shape.
 */
const SELF_LEGEND = new Set<ChartForm>([
  "heatmap",
  "choropleth",
  "bivariateChoropleth",
  "dumbbell",
  "slope",
  "ridgeline",
  "statTile",
]);

export function Chart({
  payload,
  height = 320,
  showTable = true,
  showRationale = true,
}: {
  payload: ChartPayload;
  height?: number;
  showTable?: boolean;
  /** Hide the "why this form" line where the surrounding page already says it. */
  showRationale?: boolean;
}) {
  const { spec, frame } = payload;

  const result = useMemo(() => validateSpec(spec, frame), [spec, frame]);
  const prepared = useMemo(
    () => (result.ok ? prepare(frame, spec) : frame),
    [frame, spec, result.ok],
  );

  const panels = useMemo(() => {
    const key = spec.encoding.facet;
    if (!key) return [{ label: "", frame: prepared }];
    const groups = new Map<string, typeof prepared.rows>();
    for (const row of prepared.rows) {
      const k = String(row[key] ?? "");
      const bucket = groups.get(k);
      if (bucket) bucket.push(row);
      else groups.set(k, [row]);
    }
    return [...groups].map(([label, rows]) => ({ label, frame: { ...prepared, rows } }));
  }, [prepared, spec.encoding.facet]);

  if (!result.ok) return <ChartError errors={result.errors} title={spec.title} />;

  const Renderer = RENDERERS[spec.form];
  const legend = buildLegend(payload, prepared);

  /* Facets shrink to fit rather than each keeping the full height, so a
     six-panel figure does not become six screens of scrolling. */
  const faceted = panels.length > 1;
  const panelHeight = faceted ? Math.max(140, Math.round(height * 0.62)) : height;

  return (
    <ChartFigure
      spec={spec}
      frame={prepared}
      legend={legend}
      warnings={result.warnings}
      showTable={showTable}
      showRationale={showRationale}
    >
      {faceted ? (
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {panels.map((p) => (
            <div key={p.label}>
              <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-wider text-faint">
                {p.label}
              </p>
              <Renderer spec={spec} frame={p.frame} height={panelHeight} />
            </div>
          ))}
        </div>
      ) : (
        <Renderer spec={spec} frame={panels[0].frame} height={panelHeight} />
      )}
    </ChartFigure>
  );
}

/**
 * The legend a form does not draw itself.
 *
 * Categorical when colour carries identity, a binned ramp when it carries
 * magnitude, and nothing at all for a single series: the title already names
 * it, and a one-row legend is furniture rather than information.
 */
function buildLegend(payload: ChartPayload, prepared: ChartPayload["frame"]) {
  const { spec } = payload;
  if (SELF_LEGEND.has(spec.form)) return null;

  const colorCol = columnOf(prepared, spec.encoding.color);
  if (!colorCol) return null;

  if (colorCol.type === "quantitative") {
    const breaks = breaksFor(prepared, spec);
    if (!breaks) return null;
    return (
      <RampLegend
        ramp={rampFor(spec.polarity)}
        labels={legendLabels(breaks, colorCol.decimals ?? 0)}
        unit={colorCol.unit || colorCol.label}
      />
    );
  }

  const series = distinctValues(prepared, spec.encoding.color).map(String);
  const colors = colorsFor(spec, series);

  /* With emphasis set, the legend says what the grey means once rather than
     naming every greyed series. That is the point of the form. */
  if (spec.emphasis) {
    return (
      <ChartLegend
        entries={[
          { label: spec.emphasis, color: colors.get(spec.emphasis) ?? "" },
          {
            label: `${series.length - 1} other ${colorCol.label.toLowerCase()}`,
            color: colors.get(series.find((s) => s !== spec.emphasis) ?? "") ?? "",
            muted: true,
          },
        ]}
      />
    );
  }

  return (
    <ChartLegend
      entries={series.map((name) => ({ label: name, color: colors.get(name) ?? "" }))}
    />
  );
}
