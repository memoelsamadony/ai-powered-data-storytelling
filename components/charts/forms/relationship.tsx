"use client";

/**
 * `scatter`, `connectedScatter` and `parallelCoordinates` — two or more
 * measures against each other rather than against time.
 *
 * These are the honest home for the question a dual-axis chart pretends to
 * answer. "Does coverage track incidence?" is a relationship between two
 * measures, and plotting them as x against y states that directly instead of
 * inviting the reader to read meaning into where two arbitrary scales happen to
 * cross.
 *
 * `connectedScatter` adds time as the path rather than as an axis, which is the
 * only way to show a trajectory that doubles back.
 */

import { useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { asNumber, binOf, breaksFor, formatCell, groupBy } from "@/lib/charts/frame";
import { colorsFor, rampColor, DEEMPHASIS, DEEMPHASIS_INK } from "@/lib/charts/scales";
import { columnOf } from "@/lib/charts/spec";
import { linear, linePath, padDomain } from "@/lib/charts/svg";
import * as t from "@/lib/charts/tokens";
import { AXIS, ChartTooltipCard } from "../chrome";
import { compact } from "./time-series";
import type { FormProps } from "./props";

/* ── Scatter / bubble ────────────────────────────────────────────────────── */

export function ScatterForm({ spec, frame, height }: FormProps) {
  const xKey = spec.encoding.x!;
  const yKey = spec.encoding.y!;
  const sizeKey = spec.encoding.size;
  const colorKey = spec.encoding.color;
  const colorCol = columnOf(frame, colorKey);
  const xCol = columnOf(frame, xKey);
  const yCol = columnOf(frame, yKey);
  const nameKey = frame.columns.find((c) => c.type === "nominal" && c.key !== colorKey)?.key;

  const quantColor = colorCol?.type === "quantitative";
  const breaks = quantColor ? breaksFor(frame, spec) : null;
  const groups = quantColor ? new Map([["", frame.rows]]) : groupBy(frame.rows, colorKey);
  const colors = colorsFor(spec, [...groups.keys()]);

  const sizeExtent = sizeKey
    ? (frame.rows
        .map((r) => asNumber(r[sizeKey]))
        .filter((n): n is number => n !== null)
        .reduce<[number, number]>(
          (acc, n) => [Math.min(acc[0], n), Math.max(acc[1], n)],
          [Infinity, -Infinity],
        ) as [number, number])
    : null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={t.grid} />
        <XAxis
          type="number"
          dataKey={xKey}
          name={xCol?.label}
          domain={["dataMin", "dataMax"]}
          {...AXIS}
          tickFormatter={compact}
        />
        <YAxis
          type="number"
          dataKey={yKey}
          name={yCol?.label}
          width={56}
          {...AXIS}
          axisLine={false}
          tickFormatter={compact}
        />
        {sizeKey && sizeExtent && (
          /* Area-proportional, never radius-proportional: sizing by radius
             squares the difference and overstates every large mark. */
          <ZAxis type="number" dataKey={sizeKey} range={[36, 560]} domain={sizeExtent} />
        )}

        {[...groups].map(([name, rows]) => (
          <Scatter
            key={name || "all"}
            name={name || (yCol?.label ?? "")}
            data={rows}
            fill={
              quantColor
                ? undefined
                : spec.emphasis && name !== spec.emphasis
                  ? DEEMPHASIS
                  : colors.get(name)
            }
            /* A 2px surface ring keeps overlapping marks separable. */
            stroke={t.surface}
            strokeWidth={2}
            fillOpacity={0.85}
            isAnimationActive={false}
            shape={
              quantColor && breaks
                ? (props: { cx?: number; cy?: number; payload?: Record<string, unknown> }) => {
                    const v = asNumber(props.payload?.[colorKey!] as number);
                    const fill = rampColor(binOf(v, breaks), spec.polarity);
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={5}
                        fill={fill ?? t.surface}
                        stroke={fill ? t.surface : t.noDataStroke}
                        strokeWidth={2}
                      />
                    );
                  }
                : undefined
            }
          />
        ))}

        <Tooltip
          cursor={{ stroke: t.navy, strokeOpacity: 0.15 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as Record<string, unknown>;
            return (
              <ChartTooltipCard
                heading={nameKey ? String(row[nameKey]) : (spec.title ?? "")}
                lines={[
                  { label: xCol?.label ?? xKey, value: formatCell(row[xKey] as number, xCol) },
                  { label: yCol?.label ?? yKey, value: formatCell(row[yKey] as number, yCol) },
                  ...(sizeKey
                    ? [
                        {
                          label: columnOf(frame, sizeKey)?.label ?? sizeKey,
                          value: formatCell(row[sizeKey] as number, columnOf(frame, sizeKey)),
                        },
                      ]
                    : []),
                ]}
              />
            );
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* ── Connected scatter ───────────────────────────────────────────────────── */

const PAD = { l: 56, r: 20, t: 12, b: 32 };

export function ConnectedScatterChart({ spec, frame, height }: FormProps) {
  const xKey = spec.encoding.x!;
  const yKey = spec.encoding.y!;
  const xCol = columnOf(frame, xKey);
  const yCol = columnOf(frame, yKey);
  const groups = groupBy(frame.rows, spec.encoding.color);
  const colors = colorsFor(spec, [...groups.keys()]);
  const svgW = 620;

  const xs = frame.rows.map((r) => asNumber(r[xKey])).filter((n): n is number => n !== null);
  const ys = frame.rows.map((r) => asNumber(r[yKey])).filter((n): n is number => n !== null);
  if (!xs.length || !ys.length) return null;

  const x = linear(padDomain([Math.min(...xs), Math.max(...xs)]), [PAD.l, svgW - PAD.r]);
  const y = linear(padDomain([Math.min(...ys), Math.max(...ys)]), [height - PAD.b, PAD.t]);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${svgW} ${height}`} role="img" aria-label={spec.title}>
      {y.ticks(5).map((v) => (
        <g key={`y${v}`}>
          <line x1={PAD.l} y1={y(v)} x2={svgW - PAD.r} y2={y(v)} stroke={t.grid} />
          <text x={PAD.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fontFamily="var(--font-plex-mono)" fill={t.faint}>
            {compact(v)}
          </text>
        </g>
      ))}
      {x.ticks(5).map((v) => (
        <text key={`x${v}`} x={x(v)} y={height - 10} textAnchor="middle" fontSize={10} fontFamily="var(--font-plex-mono)" fill={t.faint}>
          {compact(v)}
        </text>
      ))}

      {[...groups].map(([name, rows]) => {
        const dim = spec.emphasis ? name !== spec.emphasis : false;
        const color = dim ? DEEMPHASIS : (colors.get(name) ?? t.brandBlue);
        const pts = rows.map((r) => {
          const xv = asNumber(r[xKey]);
          const yv = asNumber(r[yKey]);
          return xv === null || yv === null ? null : { x: x(xv), y: y(yv) };
        });
        const first = pts.find(Boolean);
        const last = [...pts].reverse().find(Boolean);
        return (
          <g key={name || "all"}>
            <path d={linePath(pts)} fill="none" stroke={color} strokeWidth={dim ? 1.25 : 2} />
            {pts.map((p, i) =>
              p ? <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} stroke={t.surface} strokeWidth={1.5} /> : null,
            )}
            {/* Direct-label the endpoints only. The path already carries the
                order, so a label on every point would be noise. */}
            {first && (
              <text x={first.x + 6} y={first.y - 6} fontSize={10} fontFamily="var(--font-plex-mono)" fill={dim ? DEEMPHASIS_INK : t.muted}>
                {String(rows[0]?.[xKey] ?? "")}
              </text>
            )}
            {last && (
              <text x={last.x + 6} y={last.y - 6} fontSize={10} fontWeight={600} fill={dim ? DEEMPHASIS_INK : t.ink}>
                {name || String(rows[rows.length - 1]?.[xKey] ?? "")}
              </text>
            )}
          </g>
        );
      })}

      <text x={svgW / 2} y={height - 22} textAnchor="middle" fontSize={10} fill={t.faint}>
        {xCol?.label} →
      </text>
      <text x={12} y={PAD.t + 4} fontSize={10} fill={t.faint}>
        {yCol?.label} ↑
      </text>
    </svg>
  );
}

/* ── Parallel coordinates ────────────────────────────────────────────────── */

/**
 * One line per item across several measures, each on its own axis.
 *
 * Every axis is independently scaled to its own min and max, which is stated on
 * the axis rather than assumed: the form compares an item's PROFILE across
 * measures, not the magnitudes themselves.
 */
export function ParallelCoordinatesChart({ spec, frame, height }: FormProps) {
  const [hover, setHover] = useState<string | null>(null);
  const measures = spec.encoding.measures ?? [];
  const groups = groupBy(frame.rows, spec.encoding.color);
  const colors = colorsFor(spec, [...groups.keys()]);
  const svgW = 620;
  const top = 20;
  const bottom = height - 34;

  const axes = measures.map((key, i) => {
    const values = frame.rows.map((r) => asNumber(r[key])).filter((n): n is number => n !== null);
    const col = columnOf(frame, key);
    return {
      key,
      col,
      x: PAD.l + (i * (svgW - PAD.l - PAD.r)) / Math.max(1, measures.length - 1),
      scale: linear(
        values.length ? padDomain([Math.min(...values), Math.max(...values)]) : [0, 1],
        [bottom, top],
      ),
    };
  });

  return (
    <div className="relative">
      <svg width="100%" height={height} viewBox={`0 0 ${svgW} ${height}`} role="img" aria-label={spec.title}>
        {axes.map((a) => (
          <g key={a.key}>
            <line x1={a.x} y1={top} x2={a.x} y2={bottom} stroke={t.hairline} />
            <text x={a.x} y={height - 18} textAnchor="middle" fontSize={10} fill={t.muted}>
              {a.col?.label ?? a.key}
            </text>
            <text x={a.x} y={top - 6} textAnchor="middle" fontSize={9} fontFamily="var(--font-plex-mono)" fill={t.faint}>
              {compact(a.scale.domain[1])}
            </text>
            <text x={a.x} y={bottom + 12} textAnchor="middle" fontSize={9} fontFamily="var(--font-plex-mono)" fill={t.faint}>
              {compact(a.scale.domain[0])}
            </text>
          </g>
        ))}

        {[...groups].map(([name, rows]) => {
          const row = rows[0];
          const dim = (spec.emphasis && name !== spec.emphasis) || (hover !== null && hover !== name);
          const color = dim ? DEEMPHASIS : (colors.get(name) ?? t.brandBlue);
          const pts = axes.map((a) => {
            const v = asNumber(row?.[a.key]);
            return v === null ? null : { x: a.x, y: a.scale(v) };
          });
          return (
            <path
              key={name || "all"}
              d={linePath(pts)}
              fill="none"
              stroke={color}
              strokeWidth={dim ? 1 : 2}
              onMouseEnter={() => setHover(name)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute right-0 top-0 z-10">
          <ChartTooltipCard
            heading={hover}
            lines={axes.map((a) => ({
              label: a.col?.label ?? a.key,
              value: formatCell(groups.get(hover)?.[0]?.[a.key] ?? null, a.col),
            }))}
          />
        </div>
      )}
    </div>
  );
}
