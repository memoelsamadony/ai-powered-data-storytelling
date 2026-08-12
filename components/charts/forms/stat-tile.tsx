"use client";

/**
 * `statTile` — the form for when the answer is a number, not a chart.
 *
 * A single current value with its change is a stat tile. Drawing it as a
 * one-bar bar chart, or as an eight-hue pie of one slice, is the most common
 * way a figure misses its own point. Facet it and you get a KPI row.
 *
 * The value uses proportional figures, not `tabular-nums`: equal-width digits
 * make a large standalone number look loose. Tabular figures are for columns
 * that align vertically, which is the table twin's job, not this one.
 */

import { asNumber, distinctValues, formatCell, groupBy } from "@/lib/charts/frame";
import { columnOf } from "@/lib/charts/spec";
import { linePath, linear, padDomain } from "@/lib/charts/svg";
import * as t from "@/lib/charts/tokens";
import type { FormProps } from "./props";

const SPARK_W = 96;
const SPARK_H = 28;

export function StatTileForm({ spec, frame }: FormProps) {
  const yKey = spec.encoding.y!;
  const xKey = spec.encoding.x;
  const yCol = columnOf(frame, yKey);
  const groups = spec.encoding.color ? groupBy(frame.rows, spec.encoding.color) : new Map([["", frame.rows]]);

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-5">
      {[...groups].map(([label, rows]) => {
        const values = rows.map((r) => asNumber(r[yKey]));
        const present = values.filter((n): n is number => n !== null);
        const latest = present[present.length - 1] ?? null;
        const first = present[0] ?? null;

        const delta = latest !== null && first !== null && first !== 0
          ? ((latest - first) / Math.abs(first)) * 100
          : null;

        /* Direction is stated in words as well as colour: a coloured arrow
           alone is identity resting on colour, which the contract forbids. */
        const rising = delta !== null && delta > 0;
        const deltaColor =
          delta === null
            ? t.faint
            : (rising ? spec.polarity !== "higher-is-better" : spec.polarity === "higher-is-better")
              ? t.alarm
              : t.calm;

        const xs = xKey ? distinctValues(frame, xKey) : [];
        const span = xs.length ? `${xs[0]} to ${xs[xs.length - 1]}` : "";

        return (
          <div key={label || "tile"} className="min-w-[8rem]">
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-faint">
              {label || yCol?.label}
            </p>
            <p className="mt-1 text-3xl font-semibold leading-none text-ink">
              {formatCell(latest, yCol)}
            </p>
            {delta !== null && (
              <p className="mt-1.5 text-xs" style={{ color: deltaColor }}>
                {rising ? "up" : "down"} {Math.abs(delta).toFixed(1)}%
                {span && <span className="text-faint"> · {span}</span>}
              </p>
            )}
            <Sparkline values={values} />
          </div>
        );
      })}
    </div>
  );
}

/** A trend, not a chart: no axis, no ticks, no tooltip. The tile states the value. */
function Sparkline({ values }: { values: (number | null)[] }) {
  const present = values.filter((n): n is number => n !== null);
  if (present.length < 2) return null;
  const y = linear(padDomain([Math.min(...present), Math.max(...present)]), [SPARK_H - 2, 2]);
  const step = SPARK_W / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => (v === null ? null : { x: i * step, y: y(v) }));
  return (
    <svg width={SPARK_W} height={SPARK_H} className="mt-2 block" aria-hidden>
      <path d={linePath(pts)} fill="none" stroke={t.brandBlue} strokeWidth={1.5} />
    </svg>
  );
}
