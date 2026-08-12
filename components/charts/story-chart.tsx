"use client";

/**
 * G1 — the dataset chart that sits beside a story.
 *
 * ONE plot, ONE y-axis, both measures drawn together. The two measures carry
 * different units, so they are projected onto a shared 0–100% scale rather than
 * given two y-scales: a dual axis lets an arbitrary alignment of two scales
 * invent a correlation that is not in the data (that chart still exists as
 * `DatasetChart`, kept deliberately as the misleading exemplar — defect D1 in
 * FRONTEND_PLAN.md §1.3). The projection here is fixed, declared in the legend,
 * and never chosen to make the lines meet:
 *
 *   • a series already measured in % keeps its true value  (MCV1 coverage)
 *   • any other series is drawn as a share of its own peak  (measles cases,
 *     where the 1980 maximum is 100%)
 *
 * That rule is what keeps the two things the surrounding stories argue about
 * legible: coverage plateaus visibly *short* of the dashed 95% herd-immunity
 * line (only possible because coverage is not rescaled), and the 2019 case
 * spike still reads as a spike. Indexing both series to t0 instead would push
 * coverage to 525% of its 1980 value and flatten the case line into the floor.
 *
 * Chart contract: one y-axis, tokens not literals, solid hairline grid, a
 * legend whenever two series share a plot, hover by default, table-view twin.
 * FRONTEND_PLAN.md §2.
 */

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Dataset, DatasetSeriesPoint } from "@/lib/data/datasets";
import * as t from "@/lib/charts/tokens";

const Y_WIDTH = 46;
const Y_TICKS = [0, 25, 50, 75, 100];

/** How one measure is mapped onto the shared axis. */
type Convention = "native" | "share-of-peak";

interface PlotRow extends DatasetSeriesPoint {
  /** Position on the shared 0–100 axis. Raw values stay for tooltip + table. */
  primaryPlot: number;
  secondaryPlot: number;
}

interface SeriesSpec {
  label: string;
  unit: string;
  color: string;
  convention: Convention;
  /** Year holding the peak — only meaningful for `share-of-peak`. */
  peakYear: number;
  peakValue: number;
  /** The most recent true value, shown in the legend so it needs no hover. */
  latest: number;
  latestYear: number;
}

/** A series already expressed in % is left alone; anything else is normalised. */
function conventionFor(unit: string): Convention {
  return unit.trim() === "%" ? "native" : "share-of-peak";
}

function specFor(
  series: DatasetSeriesPoint[],
  key: "primary" | "secondary",
  label: string,
  unit: string,
  color: string,
): SeriesSpec {
  const peak = series.reduce((best, p) => (p[key] > best[key] ? p : best), series[0]);
  const last = series[series.length - 1];
  return {
    label,
    unit,
    color,
    convention: conventionFor(unit),
    peakYear: peak.year,
    peakValue: peak[key],
    latest: last[key],
    latestYear: last.year,
  };
}

function project(value: number, spec: SeriesSpec): number {
  if (spec.convention === "native") return value;
  return spec.peakValue ? (value / spec.peakValue) * 100 : 0;
}

/** The short note that tells the reader what the shared axis means per series. */
function conventionNote(spec: SeriesSpec): string {
  return spec.convention === "native"
    ? `true ${spec.unit}`
    : `% of the ${spec.peakYear} peak`;
}

function formatValue(value: number, unit: string): string {
  const n = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  return unit === "%" ? `${n}%` : `${n} ${unit}`;
}

export function StoryChart({
  dataset,
  height = 320,
  compact = false,
  showTable = true,
}: {
  dataset: Dataset;
  height?: number;
  /** Tightens the legend where the surrounding card already names the data. */
  compact?: boolean;
  showTable?: boolean;
}) {
  const { rows, primary, secondary } = useMemo(() => {
    const p = specFor(dataset.series, "primary", dataset.primaryLabel, dataset.primaryUnit, t.alarm);
    const s = specFor(dataset.series, "secondary", dataset.secondaryLabel, dataset.secondaryUnit, t.brandBlue);
    const r: PlotRow[] = dataset.series.map((point) => ({
      ...point,
      primaryPlot: project(point.primary, p),
      secondaryPlot: project(point.secondary, s),
    }));
    return { rows: r, primary: p, secondary: s };
  }, [dataset]);

  /**
   * The threshold is declared against the secondary measure, so it may only be
   * drawn while that measure sits on the axis at its true value. Normalised, a
   * 95% line would land at 110% of the plotted maximum and mean nothing.
   */
  const showReference = !!dataset.referenceLine && secondary.convention === "native";

  return (
    <figure className="m-0">
      <ChartLegend
        specs={dataset.secondaryLabel ? [primary, secondary] : [primary]}
        compact={compact}
      />

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={`sc-primary-${dataset.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.alarm} stopOpacity={0.14} />
              <stop offset="100%" stopColor={t.alarm} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={t.grid} vertical={false} />
          <XAxis
            dataKey="year"
            tick={t.monoTick}
            tickLine={false}
            axisLine={t.axisLineProps}
            minTickGap={24}
          />
          <YAxis
            tick={t.monoTick}
            tickLine={false}
            axisLine={false}
            width={Y_WIDTH}
            domain={[0, 100]}
            ticks={Y_TICKS}
            tickFormatter={(v: number) => `${v}%`}
          />

          {showReference && dataset.referenceLine && (
            <ReferenceLine
              y={dataset.referenceLine.value}
              stroke={t.calm}
              /* The only dashed line in the app — this one is a real threshold. */
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: dataset.referenceLine.label,
                position: "insideTopRight",
                fontSize: 10,
                fontFamily: "var(--font-plex-mono)",
                fill: t.calm,
              }}
            />
          )}

          {/* Drawn first, so the thin secondary line stays legible on top of it. */}
          <Area
            type="monotone"
            dataKey="primaryPlot"
            stroke={t.alarm}
            strokeWidth={2}
            fill={`url(#sc-primary-${dataset.id})`}
            name={primary.label}
            dot={false}
            activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }}
          />
          {/* An uploaded table may carry only one usable measure, and the
              payload fills the absent one with 0.0 rather than a gap. Drawing it
              would put a flat line along the axis that reads as "this measure is
              zero every year" - a measurement of something never measured. An
              empty label is what says the measure is absent; every registry
              dataset declares one. */}
          {!!dataset.secondaryLabel && (
            <Line
              type="monotone"
              dataKey="secondaryPlot"
              stroke={t.brandBlue}
              strokeWidth={2}
              name={secondary.label}
              dot={false}
              activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }}
            />
          )}

          <Tooltip
            content={<StoryTooltip primary={primary} secondary={secondary} />}
            cursor={{ stroke: t.navy, strokeOpacity: 0.15 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {!compact && (
        <figcaption className="mt-2 text-[0.7rem] leading-relaxed text-faint">
          Two measures, one axis. {sentenceForAxis(primary, secondary)} Hover for the real
          figures, or read them in the table.
        </figcaption>
      )}

      {showTable && <SeriesTable dataset={dataset} />}
    </figure>
  );
}

/** Spells out the projection in words, so the axis is never taken on trust. */
function sentenceForAxis(primary: SeriesSpec, secondary: SeriesSpec): string {
  /* Labels keep their own casing: lowercasing them would render MCV1 as mcv1. */
  const parts = [primary, secondary].map((s) =>
    s.convention === "native"
      ? `${s.label} keeps its true percentage`
      : `${s.label} is scaled against its ${s.peakYear} peak of ${formatValue(s.peakValue, s.unit)}`,
  );
  return `${parts[0]}; ${parts[1]}.`;
}

/**
 * A legend is mandatory once two series share a plot — identity may never rest
 * on colour alone. It carries the latest true value too, so the headline figure
 * is readable without hovering.
 */
function ChartLegend({ specs, compact }: { specs: SeriesSpec[]; compact: boolean }) {
  return (
    <ul className={`m-0 flex list-none flex-col gap-1 p-0 ${compact ? "mb-2" : "mb-3"}`}>
      {specs.map((s) => (
        <li key={s.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className="h-2.5 w-2.5 shrink-0 translate-y-0.5 rounded-full"
            style={{ background: s.color }}
          />
          <span className="text-xs font-medium text-ink">{s.label}</span>
          <span className="font-mono text-[0.65rem] text-faint">{conventionNote(s)}</span>
          <span className="ml-auto font-mono text-[0.68rem] text-muted [font-variant-numeric:tabular-nums]">
            {formatValue(s.latest, s.unit)}
            <span className="text-faint"> · {s.latestYear}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** G14 — the table-view twin every chart owes under contract item 7. */
export function SeriesTable({ dataset }: { dataset: Dataset }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-hairline pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[0.65rem] uppercase tracking-wider text-faint transition-colors hover:text-muted"
        aria-expanded={open}
      >
        {open ? "Hide table" : "Show as table"}
      </button>
      {open && (
        <div className="scroll-slim mt-2 max-h-56 overflow-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-hairline">
                <th className="py-1.5 pr-4 font-medium text-muted">Year</th>
                <th className="py-1.5 pr-4 font-medium text-muted">
                  {dataset.primaryLabel} <span className="text-faint">({dataset.primaryUnit})</span>
                </th>
                <th className="py-1.5 font-medium text-muted">
                  {dataset.secondaryLabel} <span className="text-faint">({dataset.secondaryUnit})</span>
                </th>
              </tr>
            </thead>
            <tbody className="font-mono [font-variant-numeric:tabular-nums]">
              {dataset.series.map((p) => (
                <tr key={p.year} className="border-b border-hairline/60">
                  <td className="py-1.5 pr-4 text-ink">{p.year}</td>
                  <td className="py-1.5 pr-4 text-ink">{p.primary.toLocaleString()}</td>
                  <td className="py-1.5 text-ink">{p.secondary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface TooltipPayload {
  payload?: PlotRow;
}

function StoryTooltip({
  active,
  payload,
  primary,
  secondary,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  primary: SeriesSpec;
  secondary: SeriesSpec;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-hairline bg-surface/95 px-3.5 py-3 text-xs shadow-lg backdrop-blur">
      <p className="font-mono text-[0.7rem] font-semibold text-navy">{p.year}</p>
      <div className="mt-2 space-y-1.5">
        <Row spec={primary} value={p.primary} plotted={p.primaryPlot} />
        {!!secondary.label && (
          <Row spec={secondary} value={p.secondary} plotted={p.secondaryPlot} />
        )}
      </div>
    </div>
  );
}

/** True value first; the plotted share only where the two differ. */
function Row({ spec, value, plotted }: { spec: SeriesSpec; value: number; plotted: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: spec.color }} />
      <span className="text-muted">{spec.label}</span>
      <span className="ml-auto whitespace-nowrap font-mono font-medium text-ink [font-variant-numeric:tabular-nums]">
        {formatValue(value, spec.unit)}
        {spec.convention === "share-of-peak" && (
          <span className="font-normal text-faint"> · {plotted.toFixed(1)}% of peak</span>
        )}
      </span>
    </div>
  );
}
