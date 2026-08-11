"use client";

/**
 * `bar` and `lollipop` — comparing magnitude across categories.
 *
 * Three modifiers do the work the catalog names as separate charts:
 *   orientation: "horizontal"  the ranked bar, and the only readable option
 *                              once category names are long
 *   baseline: 0                the diverging bar. Marks take the warm or cool
 *                              pole by which side of the baseline they fall,
 *                              with `polarity` deciding which side is which
 *   stack                      part-to-whole, with a 2px surface gap between
 *                              adjacent fills rather than a border
 *
 * The lollipop is a `Bar` with a custom shape rather than a second chart: it
 * inherits the axes, the tooltip and the stacking rules instead of reimplementing
 * them, and the only difference is how much ink the mark spends.
 */

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { asNumber, formatCell, pivotToWide } from "@/lib/charts/frame";
import { colorsFor } from "@/lib/charts/scales";
import { columnOf } from "@/lib/charts/spec";
import * as t from "@/lib/charts/tokens";
import { AXIS, ChartTooltipCard } from "../chrome";
import { compact } from "./time-series";
import type { FormProps } from "./props";

export function BarChartForm({ spec, frame, height }: FormProps) {
  const { rows, series } = pivotToWide(frame, spec);
  const colors = colorsFor(spec, series);
  const xCol = columnOf(frame, spec.encoding.x);
  const yCol = columnOf(frame, spec.encoding.y);

  const horizontal = spec.orientation === "horizontal";
  const stacked = spec.stack && spec.stack !== "none";
  const percent = spec.stack === "percent";
  const diverging = spec.baseline !== undefined;
  const baseline = spec.baseline ?? 0;
  const lollipop = spec.form === "lollipop";

  /* Above the baseline takes the pole that matches the metric's direction, so a
     falling death rate reads calm and a rising one reads alarm. */
  const above = spec.polarity === "higher-is-better" ? t.calm : t.alarm;
  const below = spec.polarity === "higher-is-better" ? t.alarm : t.calm;

  const valueAxis = (
    <YAxis
      {...AXIS}
      axisLine={false}
      width={56}
      type={horizontal ? "category" : "number"}
      dataKey={horizontal ? "__x" : undefined}
      domain={percent ? [0, 1] : undefined}
      tickFormatter={
        horizontal ? undefined : (v: number) => (percent ? `${Math.round(v * 100)}%` : compact(v))
      }
    />
  );

  const categoryAxis = (
    <XAxis
      {...AXIS}
      type={horizontal ? "number" : "category"}
      dataKey={horizontal ? undefined : "__x"}
      domain={percent ? [0, 1] : undefined}
      tickFormatter={
        horizontal ? (v: number) => (percent ? `${Math.round(v * 100)}%` : compact(v)) : undefined
      }
      interval={0}
      minTickGap={4}
    />
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={rows}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 16, bottom: 4, left: horizontal ? 8 : 0 }}
        stackOffset={percent ? "expand" : undefined}
        barCategoryGap={lollipop ? "40%" : "20%"}
      >
        <CartesianGrid stroke={t.grid} horizontal={!horizontal} vertical={horizontal} />
        {categoryAxis}
        {valueAxis}

        {diverging && (
          <ReferenceLine
            {...(horizontal ? { x: baseline } : { y: baseline })}
            stroke={t.hairline}
            strokeWidth={1}
          />
        )}

        {series.map((name) => (
          <Bar
            key={name}
            dataKey={name}
            name={name}
            stackId={stacked ? "stack" : undefined}
            fill={colors.get(name)}
            /* The surface gap that separates adjacent fills. Never a border. */
            stroke={stacked ? t.surface : undefined}
            strokeWidth={stacked ? 2 : 0}
            radius={lollipop ? 0 : 4}
            shape={lollipop ? <Lollipop horizontal={horizontal} /> : undefined}
            isAnimationActive={false}
          >
            {diverging &&
              rows.map((row, i) => (
                <Cell key={i} fill={(asNumber(row[name]) ?? 0) >= baseline ? above : below} />
              ))}
          </Bar>
        ))}

        <Tooltip
          cursor={{ fill: t.surfaceSoft, fillOpacity: 0.6 }}
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

/**
 * A 2px stem with an 8px head, anchored where the bar's baseline is.
 *
 * Recharts hands a bar shape its resolved rectangle, so the head goes at the
 * data end and the stem runs back to the axis, whichever way the chart is
 * turned. Negative bars arrive with the rect already flipped.
 */
function Lollipop(props: {
  horizontal?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
}) {
  const { horizontal, x = 0, y = 0, width = 0, height = 0, fill } = props;
  const r = 4;
  if (horizontal) {
    const cy = y + height / 2;
    const end = x + width;
    return (
      <g>
        <line x1={x} y1={cy} x2={end} y2={cy} stroke={fill} strokeWidth={2} />
        <circle cx={end} cy={cy} r={r} fill={fill} stroke={t.surface} strokeWidth={2} />
      </g>
    );
  }
  const cx = x + width / 2;
  const end = y;
  return (
    <g>
      <line x1={cx} y1={y + height} x2={cx} y2={end} stroke={fill} strokeWidth={2} />
      <circle cx={cx} cy={end} r={r} fill={fill} stroke={t.surface} strokeWidth={2} />
    </g>
  );
}
