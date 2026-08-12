"use client";

/**
 * `beeswarm`, `box` and `ridgeline` — the spread a mean hides.
 *
 * This project's central claim is about calibration, and a global average is
 * the most common way a data story quietly decalibrates itself: "global
 * coverage is 84%" is true and tells you nothing about the countries at 40%.
 * These three forms are the ones that put the distribution back on the page.
 *
 *   beeswarm   every item as a dot. Nothing is aggregated away.
 *   box        quartiles per slice, when the shape matters more than the items.
 *   ridgeline  the distribution itself, moving over time.
 */

import { useState } from "react";
import { asNumber, formatCell, groupBy } from "@/lib/charts/frame";
import { colorsFor, DEEMPHASIS, DEEMPHASIS_INK } from "@/lib/charts/scales";
import { columnOf } from "@/lib/charts/spec";
import { band, histogram, linear, linePath, padDomain, quartiles } from "@/lib/charts/svg";
import * as t from "@/lib/charts/tokens";
import { ChartTooltipCard } from "../chrome";
import { compact } from "./time-series";
import type { FormProps } from "./props";

const PAD = { l: 56, r: 20, t: 12, b: 30 };
const SVG_W = 620;

/** Shared y-scale and gridlines, since all three share a value axis. */
function useValueScale(frame: FormProps["frame"], spec: FormProps["spec"], height: number) {
  const yKey = spec.encoding.y!;
  const values = frame.rows.map((r) => asNumber(r[yKey])).filter((n): n is number => n !== null);
  const domain: [number, number] = values.length
    ? padDomain([Math.min(...values), Math.max(...values)])
    : [0, 1];
  return { yKey, scale: linear(domain, [height - PAD.b, PAD.t]) };
}

function Gridlines({ scale }: { scale: ReturnType<typeof linear> }) {
  return (
    <>
      {scale.ticks(5).map((v) => (
        <g key={v}>
          <line x1={PAD.l} y1={scale(v)} x2={SVG_W - PAD.r} y2={scale(v)} stroke={t.grid} />
          <text
            x={PAD.l - 8}
            y={scale(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fontFamily="var(--font-plex-mono)"
            fill={t.faint}
          >
            {compact(v)}
          </text>
        </g>
      ))}
    </>
  );
}

/* ── Beeswarm ────────────────────────────────────────────────────────────── */

export function BeeswarmChart({ spec, frame, height }: FormProps) {
  const [hover, setHover] = useState<{ label: string; value: number | null } | null>(null);
  const { yKey, scale } = useValueScale(frame, spec, height);
  const xKey = spec.encoding.x!;
  const yCol = columnOf(frame, yKey);
  const nameKey = frame.columns.find((c) => c.type === "nominal" && c.key !== xKey)?.key;

  const groups = groupBy(frame.rows, xKey);
  const x = band([...groups.keys()], [PAD.l, SVG_W - PAD.r], 0.15);
  const colors = colorsFor(spec, [...groups.keys()]);
  const r = 3.5;

  return (
    <div className="relative">
      <svg width="100%" height={height} viewBox={`0 0 ${SVG_W} ${height}`} role="img" aria-label={spec.title}>
        <Gridlines scale={scale} />

        {[...groups].map(([key, rows]) => {
          const cx = x(key) + x.bandwidth / 2;
          const dim = spec.emphasis ? key !== spec.emphasis : false;
          const color = dim ? DEEMPHASIS : (colors.get(key) ?? t.brandBlue);
          /* Deterministic offsets, not jitter: a chart that reshuffles on every
             render is one the reader cannot compare to the one they just saw. */
          const positions = rows.map((row) => scale(asNumber(row[yKey]) ?? 0));
          const offsets = swarm(positions, r);
          return (
            <g key={key}>
              <text x={cx} y={height - 10} textAnchor="middle" fontSize={10} fill={dim ? DEEMPHASIS_INK : t.muted}>
                {key}
              </text>
              {rows.map((row, i) => {
                const v = asNumber(row[yKey]);
                if (v === null) return null;
                return (
                  <circle
                    key={i}
                    cx={cx + offsets[i]}
                    cy={scale(v)}
                    r={r}
                    fill={color}
                    /* The 2px surface ring that keeps overlapping marks apart. */
                    stroke={t.surface}
                    strokeWidth={1.5}
                    onMouseEnter={() =>
                      setHover({ label: nameKey ? String(row[nameKey]) : key, value: v })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute right-0 top-0 z-10">
          <ChartTooltipCard
            heading={hover.label}
            lines={[{ label: yCol?.label ?? yKey, value: formatCell(hover.value, yCol) }]}
          />
        </div>
      )}
    </div>
  );
}

/** Local wrapper so the swarm radius stays with the mark that uses it. */
function swarm(positions: number[], radius: number): number[] {
  const placed: { pos: number; off: number }[] = [];
  const gap = radius * 2;
  return positions.map((pos) => {
    let off = 0;
    let step = 0;
    while (placed.some((p) => Math.abs(p.pos - pos) < gap && Math.abs(p.off - off) < gap)) {
      step += 1;
      off = (step % 2 === 1 ? 1 : -1) * Math.ceil(step / 2) * gap;
    }
    placed.push({ pos, off });
    return off;
  });
}

/* ── Box ─────────────────────────────────────────────────────────────────── */

export function BoxChart({ spec, frame, height }: FormProps) {
  const [hover, setHover] = useState<string | null>(null);
  const { yKey, scale } = useValueScale(frame, spec, height);
  const xKey = spec.encoding.x!;
  const yCol = columnOf(frame, yKey);

  const groups = groupBy(frame.rows, xKey);
  const x = band([...groups.keys()], [PAD.l, SVG_W - PAD.r], 0.45);
  const colors = colorsFor(spec, [...groups.keys()]);

  const stats = new Map(
    [...groups].map(([k, rows]) => [k, quartiles(rows.map((r) => asNumber(r[yKey])))]),
  );

  return (
    <div className="relative">
      <svg width="100%" height={height} viewBox={`0 0 ${SVG_W} ${height}`} role="img" aria-label={spec.title}>
        <Gridlines scale={scale} />

        {[...groups.keys()].map((key) => {
          const q = stats.get(key);
          if (!q) return null;
          const left = x(key);
          const w = x.bandwidth;
          const cx = left + w / 2;
          const dim = spec.emphasis ? key !== spec.emphasis : false;
          const color = dim ? DEEMPHASIS : (colors.get(key) ?? t.brandBlue);
          return (
            <g key={key} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}>
              {/* Whiskers to the extremes, drawn thin so the box carries the eye. */}
              <line x1={cx} y1={scale(q.min)} x2={cx} y2={scale(q.max)} stroke={color} strokeWidth={1} />
              <rect
                x={left}
                y={scale(q.q3)}
                width={w}
                height={Math.max(1, scale(q.q1) - scale(q.q3))}
                fill={color}
                fillOpacity={0.18}
                stroke={color}
                strokeWidth={1.5}
                rx={2}
              />
              <line x1={left} y1={scale(q.median)} x2={left + w} y2={scale(q.median)} stroke={color} strokeWidth={2.5} />
              <text x={cx} y={height - 10} textAnchor="middle" fontSize={10} fill={dim ? DEEMPHASIS_INK : t.muted}>
                {key}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && stats.get(hover) && (
        <div className="pointer-events-none absolute right-0 top-0 z-10">
          <ChartTooltipCard
            heading={`${hover} · n=${stats.get(hover)!.n}`}
            lines={[
              { label: "Max", value: formatCell(stats.get(hover)!.max, yCol) },
              { label: "Upper quartile", value: formatCell(stats.get(hover)!.q3, yCol) },
              { label: "Median", value: formatCell(stats.get(hover)!.median, yCol) },
              { label: "Lower quartile", value: formatCell(stats.get(hover)!.q1, yCol) },
              { label: "Min", value: formatCell(stats.get(hover)!.min, yCol) },
            ]}
          />
        </div>
      )}
    </div>
  );
}

/* ── Ridgeline ───────────────────────────────────────────────────────────── */

const BINS = 28;

/**
 * One density curve per x-slice, overlapping downward.
 *
 * Curves are scaled to a shared maximum count, so a taller ridge means more
 * items and not just a narrower spread. Scaling each row to its own peak is the
 * usual way this chart lies.
 */
export function RidgelineChart({ spec, frame, height }: FormProps) {
  const yKey = spec.encoding.y!;
  const xKey = spec.encoding.x!;
  const yCol = columnOf(frame, yKey);
  const groups = [...groupBy(frame.rows, xKey)];

  const values = frame.rows.map((r) => asNumber(r[yKey])).filter((n): n is number => n !== null);
  if (!values.length) return null;
  const domain = padDomain([Math.min(...values), Math.max(...values)]);
  const value = linear(domain, [PAD.l, SVG_W - PAD.r]);

  const densities = groups.map(([key, rows]) => ({
    key,
    counts: histogram(rows.map((r) => asNumber(r[yKey])), BINS, domain),
  }));
  const peak = Math.max(1, ...densities.flatMap((d) => d.counts));

  const rowH = Math.max(18, (height - PAD.t - PAD.b) / Math.max(1, groups.length));
  /* Ridges overlap by half a row: enough to read as one field, not so much that
     a curve hides the one behind it. */
  const amplitude = rowH * 1.6;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${SVG_W} ${height}`} role="img" aria-label={spec.title}>
      {value.ticks(5).map((v) => (
        <text key={v} x={value(v)} y={height - 10} textAnchor="middle" fontSize={10} fontFamily="var(--font-plex-mono)" fill={t.faint}>
          {compact(v)}
        </text>
      ))}
      <text x={SVG_W / 2} y={height - 22} textAnchor="middle" fontSize={10} fill={t.faint}>
        {yCol?.label}
      </text>

      {/* Drawn back to front so a nearer ridge occludes the one behind it. */}
      {densities
        .map((d, i) => ({ ...d, i }))
        .reverse()
        .map(({ key, counts, i }) => {
          const baseY = PAD.t + i * rowH + rowH;
          const pts = counts.map((c, bi) => ({
            x: value(domain[0] + ((bi + 0.5) / BINS) * (domain[1] - domain[0])),
            y: baseY - (c / peak) * amplitude,
          }));
          const area = `${linePath(pts)}L${pts[pts.length - 1].x},${baseY}L${pts[0].x},${baseY}Z`;
          return (
            <g key={key}>
              <path d={area} fill={t.brandBlue} fillOpacity={0.16} stroke={t.brandBlue} strokeWidth={1.5} />
              <text x={PAD.l - 8} y={baseY - 4} textAnchor="end" fontSize={10} fontFamily="var(--font-plex-mono)" fill={t.muted}>
                {key}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
