"use client";

/**
 * `dumbbell`, `slope` and `bump` — what moved, and in which direction.
 *
 * All three answer "before versus after" rather than "what happened in
 * between", which is why none of them is a line chart with two points. The
 * dumbbell ranks the size of the gap, the slope shows crossing, and the bump
 * shows a change in ORDER, which is a different claim from a change in value.
 *
 * Dumbbell and slope require exactly two x-slices, and `validateSpec` refuses
 * anything else rather than quietly picking two of five.
 */

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCell, pairsOf, pivotToWide } from "@/lib/charts/frame";
import { colorsFor, drawOrder, strokeWidthFor, DEEMPHASIS, DEEMPHASIS_INK } from "@/lib/charts/scales";
import { columnOf } from "@/lib/charts/spec";
import { linear, padDomain } from "@/lib/charts/svg";
import * as t from "@/lib/charts/tokens";
import { AXIS, ChartTooltipCard } from "../chrome";
import { compact } from "./time-series";
import type { FormProps } from "./props";

/* ── Dumbbell ────────────────────────────────────────────────────────────── */

const ROW_LABEL_W = 132;
const PAD_R = 56;

export function DumbbellChart({ spec, frame, height }: FormProps) {
  const [hover, setHover] = useState<string | null>(null);
  const { pairs, fromX, toX } = pairsOf(frame, spec);
  const yCol = columnOf(frame, spec.encoding.y);

  const values = pairs.flatMap((p) => [p.from, p.to]).filter((n): n is number => n !== null);
  if (!values.length) return null;
  const x = linear(padDomain([Math.min(...values), Math.max(...values)]), [ROW_LABEL_W, 100 - 0]);

  const rowH = Math.max(18, height / Math.max(1, pairs.length));
  const svgW = 640;
  const scale = linear(x.domain, [ROW_LABEL_W, svgW - PAD_R]);

  /* One hue, two shades: the two ends of a dumbbell are the same measure at two
     times, not two different things, so they must not read as two series. */
  const fromColor = t.brandBlueLight;
  const toColor = t.brandBlue;

  return (
    <div className="relative">
      <ul className="m-0 mb-3 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        {[
          { label: String(fromX), color: fromColor },
          { label: String(toX), color: toColor },
        ].map((e) => (
          <li key={e.label} className="flex items-baseline gap-1.5">
            <span className="h-2.5 w-2.5 translate-y-0.5 rounded-full" style={{ background: e.color }} />
            <span className="text-xs font-medium text-ink">{e.label}</span>
          </li>
        ))}
      </ul>

      <svg width="100%" height={pairs.length * rowH + 24} viewBox={`0 0 ${svgW} ${pairs.length * rowH + 24}`} role="img" aria-label={spec.title}>
        {scale.ticks(5).map((tick) => (
          <line
            key={tick}
            x1={scale(tick)}
            y1={0}
            x2={scale(tick)}
            y2={pairs.length * rowH}
            stroke={t.grid}
          />
        ))}
        {scale.ticks(5).map((tick) => (
          <text
            key={`l-${tick}`}
            x={scale(tick)}
            y={pairs.length * rowH + 16}
            textAnchor="middle"
            fontSize={10}
            fontFamily="var(--font-plex-mono)"
            fill={t.faint}
          >
            {compact(tick)}
          </text>
        ))}

        {pairs.map((p, i) => {
          const cy = i * rowH + rowH / 2;
          const dim = spec.emphasis ? p.label !== spec.emphasis : false;
          const a = p.from === null ? null : scale(p.from);
          const b = p.to === null ? null : scale(p.to);
          return (
            <g
              key={p.label}
              onMouseEnter={() => setHover(p.label)}
              onMouseLeave={() => setHover(null)}
            >
              <rect x={0} y={i * rowH} width={svgW} height={rowH} fill="transparent" />
              <text
                x={ROW_LABEL_W - 10}
                y={cy}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill={dim ? DEEMPHASIS_INK : t.ink}
              >
                {p.label.length > 18 ? `${p.label.slice(0, 17)}…` : p.label}
              </text>
              {a !== null && b !== null && (
                <line x1={a} y1={cy} x2={b} y2={cy} stroke={dim ? DEEMPHASIS : t.hairline} strokeWidth={2} />
              )}
              {a !== null && (
                <circle cx={a} cy={cy} r={4.5} fill={dim ? DEEMPHASIS : fromColor} stroke={t.surface} strokeWidth={2} />
              )}
              {b !== null && (
                <circle cx={b} cy={cy} r={4.5} fill={dim ? DEEMPHASIS : toColor} stroke={t.surface} strokeWidth={2} />
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute right-0 top-0 z-10">
          {(() => {
            const p = pairs.find((q) => q.label === hover)!;
            return (
              <ChartTooltipCard
                heading={p.label}
                lines={[
                  { label: String(fromX), value: formatCell(p.from, yCol), color: fromColor },
                  { label: String(toX), value: formatCell(p.to, yCol), color: toColor },
                ]}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* ── Slope ───────────────────────────────────────────────────────────────── */

const SLOPE_PAD = 96;

export function SlopeChart({ spec, frame, height }: FormProps) {
  const { pairs, fromX, toX } = pairsOf(frame, spec);
  const yCol = columnOf(frame, spec.encoding.y);
  const colors = colorsFor(spec, pairs.map((p) => p.label));

  const values = pairs.flatMap((p) => [p.from, p.to]).filter((n): n is number => n !== null);
  if (!values.length) return null;
  const y = linear(padDomain([Math.min(...values), Math.max(...values)]), [height - 28, 12]);
  const svgW = 560;
  const xa = SLOPE_PAD;
  const xb = svgW - SLOPE_PAD;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${svgW} ${height}`} role="img" aria-label={spec.title}>
      <line x1={xa} y1={8} x2={xa} y2={height - 24} stroke={t.hairline} />
      <line x1={xb} y1={8} x2={xb} y2={height - 24} stroke={t.hairline} />
      <text x={xa} y={height - 8} textAnchor="middle" fontSize={10} fontFamily="var(--font-plex-mono)" fill={t.faint}>
        {String(fromX)}
      </text>
      <text x={xb} y={height - 8} textAnchor="middle" fontSize={10} fontFamily="var(--font-plex-mono)" fill={t.faint}>
        {String(toX)}
      </text>

      {pairs.map((p) => {
        if (p.from === null || p.to === null) return null;
        const dim = spec.emphasis ? p.label !== spec.emphasis : false;
        const color = dim ? DEEMPHASIS : (colors.get(p.label) ?? t.brandBlue);
        return (
          <g key={p.label}>
            <line
              x1={xa}
              y1={y(p.from)}
              x2={xb}
              y2={y(p.to)}
              stroke={color}
              strokeWidth={strokeWidthFor(spec, p.label)}
            />
            <circle cx={xa} cy={y(p.from)} r={3.5} fill={color} stroke={t.surface} strokeWidth={2} />
            <circle cx={xb} cy={y(p.to)} r={3.5} fill={color} stroke={t.surface} strokeWidth={2} />
            {/* Direct labels at both ends: a slope chart with a legend box makes
                the reader trace lines back to a key, which defeats the form. */}
            <text x={xa - 8} y={y(p.from)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={dim ? DEEMPHASIS_INK : t.ink}>
              {p.label}
            </text>
            <text x={xb + 8} y={y(p.to)} dominantBaseline="middle" fontSize={10} fontFamily="var(--font-plex-mono)" fill={dim ? DEEMPHASIS_INK : t.muted}>
              {formatCell(p.to, yCol)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Bump ────────────────────────────────────────────────────────────────── */

/**
 * Rank over time. Rank 1 sits at the TOP, so "rising" means rising.
 *
 * A reversed axis is the one place an inverted scale is not a trick: the reader
 * already understands that first place is above second.
 */
export function BumpChart({ spec, frame, height }: FormProps) {
  const { rows, series } = pivotToWide(frame, spec);
  const colors = colorsFor(spec, series);
  const order = drawOrder(spec, series);
  const xCol = columnOf(frame, spec.encoding.x);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="__x" type="number" domain={["dataMin", "dataMax"]} {...AXIS} minTickGap={24} />
        <YAxis
          {...AXIS}
          axisLine={false}
          width={36}
          reversed
          allowDecimals={false}
          domain={[1, "dataMax"]}
        />
        {order.map((name) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            name={name}
            stroke={colors.get(name)}
            strokeWidth={strokeWidthFor(spec, name)}
            dot={{ r: 3, fill: colors.get(name), stroke: t.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }}
            isAnimationActive={false}
            connectNulls={false}
          />
        ))}
        <Tooltip
          cursor={{ stroke: t.navy, strokeOpacity: 0.15 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <ChartTooltipCard
                heading={`${xCol?.label ?? ""} ${label}`.trim()}
                lines={payload
                  .filter((p) => p.value !== null && p.value !== undefined)
                  .sort((a, b) => Number(a.value) - Number(b.value))
                  .map((p) => ({
                    label: String(p.name),
                    color: String(p.color),
                    value: `#${p.value}`,
                  }))}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
