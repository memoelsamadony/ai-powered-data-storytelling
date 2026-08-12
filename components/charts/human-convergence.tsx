"use client";

/**
 * Fig 9 on the web: where moderation lands relative to the human writers.
 *
 * The web twin of `fig9()` in presentation/figures/make_figures_human.py, drawn
 * from the same committed artifact so the page and the slide cannot disagree.
 * Same form (a dumbbell per series on one 1-5 scale), same encoding, same
 * ordering, same caveat.
 *
 * Two things this chart does that the per-run tone axis cannot:
 *
 *   1. The reference is each series' OWN human median, plus or minus 0.5, drawn
 *      per row. There is no single editorial "calibrated band" here, because the
 *      claim being made is relative: moderation moves the machine onto the level
 *      the humans wrote at for THAT series, and the humans did not all write at
 *      the same level (1.8 to 2.3 across five series).
 *   2. Every row carries its n. Four of the five are a single run, and a row
 *      that is one run must not read like a mean of repeats.
 *
 * Scale: 1 = flat and hides the stakes, 5 = manipulative catastrophising. Both
 * poles are failures, so this is a target scale and not "low is good" - the
 * moderated dot landing below the human band would be its own failure.
 *
 * Colours are the validated series tokens: alarm for raw, brand blue for
 * moderated, calm for the human band. Identity never rests on colour - the two
 * ends differ in fill as well as hue, both carry a direct label, and the table
 * view below holds every value.
 */

import { useId, useState } from "react";
import * as t from "@/lib/charts/tokens";
import type { HumanComparisonSeries } from "@/lib/data/human-comparison";

const RAW = t.alarm;
const MODERATED = t.brandBlue;
const HUMAN = t.calm;

/* Geometry in viewBox units. Height follows the row count. */
const W = 980;
const X0 = 268;
const X1 = W - 64;
const ANCHOR_Y = 40;
const TICK_Y = 64;
const GRID_TOP = 78;
const FIRST_ROW = 124;
const ROW_GAP = 96;
const BAND_HALF = 0.5;

const rowY = (i: number) => FIRST_ROW + i * ROW_GAP;
const gridBottom = (n: number) => rowY(Math.max(0, n - 1)) + 46;
const chartHeight = (n: number) => gridBottom(n) + 26;

const scale = (v: number) => X0 + ((v - 1) / 4) * (X1 - X0);

/** Keep a value label inside the canvas: a 5.0 sits exactly on X1. */
const PAD = 30;
const clamp = (x: number) => Math.max(PAD, Math.min(W - PAD, x));

interface HoverState {
  x: number;
  y: number;
  kind: "raw" | "moderated" | "human";
  row: HumanComparisonSeries;
}

export function HumanConvergence({ series }: { series: HumanComparisonSeries[] }) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const arrowId = useId().replace(/:/g, "");
  const H = chartHeight(series.length);
  const GRID_BOTTOM = gridBottom(series.length);

  return (
    <figure className="m-0">
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="block min-w-[680px]"
          role="img"
          aria-label={`Alarmism from 1 to 5 per series. ${series
            .map(
              (s) =>
                `${s.label}: raw ${s.machineRaw.toFixed(
                  2,
                )}, moderated ${s.machineModerated.toFixed(2)}, human median ${s.humanMedian.toFixed(1)}`,
            )
            .join("; ")}.`}
        >
          <defs>
            <marker
              id={`hc-arrow-${arrowId}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill={t.muted} />
            </marker>
          </defs>

          {/* Scale: one recessive rule per point, carrying the whole plot. */}
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line x1={scale(v)} y1={GRID_TOP} x2={scale(v)} y2={GRID_BOTTOM} stroke={t.grid} strokeWidth={1} />
              <text
                x={scale(v)}
                y={TICK_Y}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-plex-mono)"
                fill={t.faint}
              >
                {v}
              </text>
            </g>
          ))}

          {/* What each end of the scale means. Both are failures. */}
          {(
            [
              [1, "flat, hides the stakes"],
              [3, "calibrated"],
              [5, "catastrophising"],
            ] as [number, string][]
          ).map(([v, label]) => (
            <text
              key={v}
              x={scale(v)}
              y={ANCHOR_Y}
              textAnchor="middle"
              fontSize={12}
              fontFamily="var(--font-plex-mono)"
              fill={t.faint}
            >
              {label}
            </text>
          ))}

          {series.map((s, i) => {
            const y = rowY(i);
            const xr = scale(s.machineRaw);
            const xm = scale(s.machineModerated);
            const xh = scale(s.humanMedian);
            const dir = Math.sign(xm - xr) || 1;
            const bandX = scale(s.humanMedian - BAND_HALF);
            const bandW = scale(s.humanMedian + BAND_HALF) - bandX;

            return (
              <g key={s.id}>
                {/* This series' own human band, not a shared editorial range. */}
                <rect x={bandX} y={y - 26} width={bandW} height={52} rx={4} fill={HUMAN} fillOpacity={0.12} />
                <line x1={xh} y1={y - 26} x2={xh} y2={y + 26} stroke={HUMAN} strokeWidth={3} />

                <text x={72} y={y + 2} fontSize={16} fontWeight={600} fill={t.ink}>
                  {s.label}
                </text>
                {/* The move, drawn between the marks rather than under them. */}
                <line
                  x1={xr - dir * 12}
                  y1={y}
                  x2={xm + dir * 15}
                  y2={y}
                  stroke={t.muted}
                  strokeWidth={2}
                  strokeLinecap="round"
                  markerEnd={`url(#hc-arrow-${arrowId})`}
                />

                <circle cx={xr} cy={y} r={8} fill={t.surface} stroke={RAW} strokeWidth={3} />
                <circle cx={xm} cy={y} r={8} fill={MODERATED} stroke={t.surface} strokeWidth={2} />

                {/* Raw above, moderated below: the two never collide even when
                    the arrow is short, as it is on Mumps. */}
                <text
                  x={clamp(xr)}
                  y={y - 18}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily="var(--font-plex-mono)"
                  fill={RAW}
                >
                  {s.machineRaw.toFixed(2)}
                </text>
                <text
                  x={clamp(xm)}
                  y={y + 32}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily="var(--font-plex-mono)"
                  fontWeight={600}
                  fill={MODERATED}
                >
                  {s.machineModerated.toFixed(2)}
                </text>

                {/* Hit targets, larger than the marks they cover. */}
                {(
                  [
                    ["raw", xr, y],
                    ["moderated", xm, y],
                    ["human", xh, y - 26],
                  ] as [HoverState["kind"], number, number][]
                ).map(([kind, cx, cy]) => {
                  const show = () => setHover({ x: cx, y: cy, kind, row: s });
                  const hide = () => setHover(null);
                  return (
                    <circle
                      key={kind}
                      cx={cx}
                      cy={cy}
                      r={16}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${s.label}, ${kind}`}
                      onMouseEnter={show}
                      onMouseLeave={hide}
                      onFocus={show}
                      onBlur={hide}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {hover && <Tooltip hover={hover} height={H} />}
      </div>

      {/* Legend: mandatory once three things share a plot. */}
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ border: `2.5px solid ${RAW}`, background: t.surface }}
          />
          raw
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: MODERATED }} />
          after moderation
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="relative h-3.5 w-8 shrink-0 rounded-sm"
            style={{ background: `color-mix(in srgb, ${HUMAN} 12%, transparent)` }}
          >
            <span className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2" style={{ background: HUMAN }} />
          </span>
          human median &plusmn; 0.5 (5 writers per series)
        </span>
      </figcaption>

      <details className="mt-5 border-t border-hairline pt-4">
        <summary className="cursor-pointer font-mono text-[0.7rem] uppercase tracking-wider text-faint hover:text-muted">
          Show as table
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="py-2 pr-4 font-medium text-muted">Series</th>
                <th className="py-2 pr-4 font-medium text-muted">Raw</th>
                <th className="py-2 pr-4 font-medium text-muted">After moderation</th>
                <th className="py-2 pr-4 font-medium text-muted">Human median</th>
                <th className="py-2 font-medium text-muted">Move</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[0.8rem] [font-variant-numeric:tabular-nums]">
              {series.map((s) => {
                const move = s.machineModerated - s.machineRaw;
                return (
                  <tr key={s.id} className="border-b border-hairline/60">
                    <td className="py-2 pr-4 font-sans text-ink">{s.label}</td>
                    <td className="py-2 pr-4 text-ink">{s.machineRaw.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-ink">{s.machineModerated.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-ink">{s.humanMedian.toFixed(1)}</td>
                    <td className="py-2 text-ink">
                      {move > 0 ? "+" : ""}
                      {move.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function Tooltip({ hover, height }: { hover: HoverState; height: number }) {
  const s = hover.row;
  const value =
    hover.kind === "raw" ? s.machineRaw : hover.kind === "moderated" ? s.machineModerated : s.humanMedian;
  const label =
    hover.kind === "raw"
      ? "Machine, raw"
      : hover.kind === "moderated"
        ? "Machine, after moderation"
        : "Human median";
  const colour = hover.kind === "raw" ? RAW : hover.kind === "moderated" ? MODERATED : HUMAN;

  return (
    <div
      className="pointer-events-none absolute z-10 w-60 -translate-x-1/2 -translate-y-full rounded-xl border border-hairline bg-surface/95 px-3.5 py-3 shadow-lg backdrop-blur"
      style={{ left: `${(hover.x / W) * 100}%`, top: `${((hover.y - 24) / height) * 100}%` }}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colour }} />
        <span className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">{label}</span>
      </div>
      <p className="mt-1.5 text-sm text-navy">{s.label}</p>
      <p className="mt-2 border-t border-hairline pt-2 font-mono text-xs text-ink">
        {value.toFixed(2)}
        <span className="text-faint">/5 alarmism</span>
      </p>
      {hover.kind === "human" && (
        <p className="mt-1 font-mono text-[0.68rem] text-faint">5 writers</p>
      )}
    </div>
  );
}
