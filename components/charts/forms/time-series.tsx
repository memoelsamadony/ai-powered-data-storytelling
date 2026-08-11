"use client";

/**
 * `line` and `area` — trend over time, and trend with volume.
 *
 * One y-axis. There is no second one, and the spec cannot describe one, which
 * is the whole reason this layer exists (see `dataset-chart.tsx` for the
 * exhibit). Two measures of different magnitude belong in `transform:
 * "indexed"`, in a facet, or in two figures.
 *
 * `stack` turns area into part-to-whole ("stacked") or composition ("percent").
 * Segments carry a 2px surface gap rather than a border, per the mark spec.
 */

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
import { pivotToWide, formatCell } from "@/lib/charts/frame";
import { colorsFor, drawOrder, strokeWidthFor } from "@/lib/charts/scales";
import { columnOf } from "@/lib/charts/spec";
import * as t from "@/lib/charts/tokens";
import { AXIS, ChartTooltipCard } from "../chrome";
import type { FormProps } from "./props";

export function TimeSeriesChart({ spec, frame, height }: FormProps) {
  const { rows, series } = pivotToWide(frame, spec);
  const colors = colorsFor(spec, series);
  const order = drawOrder(spec, series);
  const xCol = columnOf(frame, spec.encoding.x);
  const yCol = columnOf(frame, spec.encoding.y);

  const isArea = spec.form === "area";
  const stacked = isArea && spec.stack && spec.stack !== "none";
  const percent = spec.stack === "percent";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={rows}
        margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
        stackOffset={percent ? "expand" : undefined}
      >
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis
          dataKey="__x"
          type={xCol?.type === "nominal" ? "category" : "number"}
          domain={xCol?.type === "nominal" ? undefined : ["dataMin", "dataMax"]}
          {...AXIS}
          minTickGap={24}
        />
        <YAxis
          {...AXIS}
          axisLine={false}
          width={52}
          domain={percent ? [0, 1] : undefined}
          tickFormatter={(v: number) =>
            percent ? `${Math.round(v * 100)}%` : compact(v)
          }
        />

        {spec.referenceLines?.map((r) => (
          <ReferenceLine
            key={`${r.label}-${r.value}`}
            y={r.axis === "x" ? undefined : r.value}
            x={r.axis === "x" ? r.value : undefined}
            stroke={t.calm}
            /* Dashes are reserved for a real threshold. Grids stay solid. */
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{
              value: r.label,
              position: "insideTopRight",
              fontSize: 10,
              fontFamily: "var(--font-plex-mono)",
              fill: t.calm,
            }}
          />
        ))}

        {order.map((name) =>
          isArea ? (
            <Area
              key={name}
              type="monotone"
              dataKey={name}
              name={name}
              stackId={stacked ? "stack" : undefined}
              /* Stacked segments are separated by a 2px surface-coloured stroke,
                 which reads as a gap between fills rather than as a border drawn
                 around each one. Unstacked, the stroke IS the series line. */
              stroke={stacked ? t.surface : colors.get(name)}
              strokeWidth={stacked ? 2 : strokeWidthFor(spec, name)}
              fill={colors.get(name)}
              fillOpacity={stacked ? 0.9 : 0.14}
              dot={false}
              activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          ) : (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              name={name}
              stroke={colors.get(name)}
              strokeWidth={strokeWidthFor(spec, name)}
              dot={false}
              activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }}
              isAnimationActive={false}
              /* A gap is a gap. Joining across it invents a reading. */
              connectNulls={false}
            />
          ),
        )}

        <Tooltip
          cursor={{ stroke: t.navy, strokeOpacity: 0.15 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <ChartTooltipCard
                heading={`${xCol?.label ?? ""} ${label}`.trim()}
                lines={payload
                  .filter((p) => p.value !== null && p.value !== undefined)
                  .map((p) => ({
                    label: String(p.name),
                    color: String(p.color),
                    value: formatCell(p.value as number, yCol),
                  }))}
              />
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Axis ticks stay short: 1.2M rather than 1,200,000 crowding the gutter. */
export function compact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e4) return `${Math.round(v / 1e3)}k`;
  return v.toLocaleString("en-US", { maximumFractionDigits: 1 });
}
