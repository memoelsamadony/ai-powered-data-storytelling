"use client";

/**
 * The tone axis — the project's thesis in one chart.
 *
 * Form: a dumbbell (before → after per item) laid over a single 1–5 tone scale.
 * Position encodes where a story's tone landed; color encodes which author
 * produced it. Those are genuinely independent here, which is the whole point:
 * raw LLM output lands on *both* sides of the calibrated band, so the moderator
 * has to pull in opposite directions for the two datasets.
 *
 * Scale (as defined in RESULTS.md): 1 = flat, hides the stakes ·
 * 5 = manipulative catastrophising. Both poles are failures; the middle is the
 * target. That makes this a diverging/target-band scale, NOT "low is good" —
 * see the note on AlarmismMeter in the datasets page.
 *
 * Palette validated with the dataviz six checks (light, surface #ffffff,
 * --pairs all): worst CVD ΔE 13.9 (deutan), normal-vision floor 16.2. Identity
 * is never color-alone — each variant also carries a distinct mark shape and a
 * legend entry, and the table view below carries every value.
 */

import { useId, useState } from "react";
import * as t from "@/lib/charts/tokens";

/* Colour comes from the token module — no literals here (contract item 2). */
const C = t.variant;
const SURFACE = t.surface;
const HAIRLINE = t.hairline;
const FAINT = t.faint;
const MUTED = t.muted;
const NAVY = t.navy;
const BAND_FILL = t.tone.band;

/* Geometry, in viewBox units. Height follows the row count so the same chart
   works for one dataset (the generate studio) or both (the datasets page). */
const W = 780;
const X0 = 208;
const X1 = 748;
const AXIS_TOP = 74;
const ROW_GAP = 86;
const FIRST_ROW = 132;

const rowY = (i: number) => FIRST_ROW + i * ROW_GAP;
const axisBottom = (n: number) => rowY(Math.max(0, n - 1)) + 44;
const chartHeight = (n: number) => axisBottom(n) + 38;

/** The editorial "calibrated" range. Both human baselines fall inside it. */
const BAND: [number, number] = [2.0, 3.0];

const scale = (v: number) => X0 + ((v - 1) / 4) * (X1 - X0);

export interface ToneAxisRow {
  id: string;
  /** Short label for the row, e.g. "Measles × MCV1". */
  label: string;
  /** What this dataset tempts the model toward. */
  tempts: string;
  human: { value: number; title: string; author: string };
  raw: { value: number; title: string; author: string };
  moderated: { value: number; title: string; author: string };
}

type VariantKey = "human" | "raw" | "moderated";

const VARIANTS: { key: VariantKey; label: string; color: string }[] = [
  { key: "human", label: "Human baseline", color: C.human },
  { key: "raw", label: "LLM — raw", color: C.raw },
  { key: "moderated", label: "LLM — tone-moderated", color: C.moderated },
];

interface HoverState {
  x: number;
  y: number;
  variant: VariantKey;
  row: ToneAxisRow;
}

export function ToneAxis({ rows }: { rows: ToneAxisRow[] }) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const arrowId = useId().replace(/:/g, "");
  const AXIS_BOTTOM = axisBottom(rows.length);
  const H = chartHeight(rows.length);

  return (
    <figure className="m-0">
      {/* Legend — always present for ≥2 series, so identity is never color-alone. */}
      <figcaption className="mb-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {VARIANTS.map((v) => (
            <span key={v.key} className="inline-flex items-center gap-2 text-xs text-muted">
              <LegendMark variant={v.key} color={v.color} />
              {v.label}
            </span>
          ))}
        </div>
      </figcaption>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="block min-w-[600px]"
          role="img"
          aria-label={`Alarmism rating from 1 to 5, showing the raw LLM story, the tone-moderated story and the human baseline. ${rows
            .map(
              (r) =>
                `${r.label}: pulled ${r.moderated.value > r.raw.value ? "up" : "down"} from ${r.raw.value.toFixed(
                  1,
                )} to ${r.moderated.value.toFixed(1)}`,
            )
            .join("; ")}.`}
        >
          <defs>
            <marker
              id={`arrow-${arrowId}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill={FAINT} />
            </marker>
          </defs>

          {/* The target band. Recessive — it annotates the scale, it is not data. */}
          <rect
            x={scale(BAND[0])}
            y={AXIS_TOP}
            width={scale(BAND[1]) - scale(BAND[0])}
            height={AXIS_BOTTOM - AXIS_TOP}
            fill={BAND_FILL}
          />
          <line x1={scale(BAND[0])} y1={AXIS_TOP} x2={scale(BAND[0])} y2={AXIS_BOTTOM} stroke={HAIRLINE} strokeWidth={1} />
          <line x1={scale(BAND[1])} y1={AXIS_TOP} x2={scale(BAND[1])} y2={AXIS_BOTTOM} stroke={HAIRLINE} strokeWidth={1} />
          <text
            x={(scale(BAND[0]) + scale(BAND[1])) / 2}
            y={AXIS_TOP - 10}
            textAnchor="middle"
            fontSize={11}
            fontFamily="var(--font-plex-mono)"
            fill={MUTED}
          >
            calibrated band
          </text>

          {/* Pole labels — the two ways to get tone wrong. */}
          <text x={X0} y={36} textAnchor="start" fontSize={11.5} fontFamily="var(--font-plex-mono)" fill={FAINT}>
            ← 1 · numbing, hides the stakes
          </text>
          <text x={X1} y={36} textAnchor="end" fontSize={11.5} fontFamily="var(--font-plex-mono)" fill={FAINT}>
            catastrophising · 5 →
          </text>

          {/* Rows */}
          {rows.map((row, i) => {
            const y = rowY(i);
            const xr = scale(row.raw.value);
            const xm = scale(row.moderated.value);
            const xh = scale(row.human.value);
            const dir = Math.sign(xm - xr) || 1;

            return (
              <g key={row.id}>
                <line x1={X0} y1={y} x2={X1} y2={y} stroke={HAIRLINE} strokeWidth={1} />

                {/* Row label */}
                <text x={X0 - 16} y={y - 4} textAnchor="end" fontSize={13.5} fill={NAVY} fontWeight={500}>
                  {row.label}
                </text>
                <text x={X0 - 16} y={y + 13} textAnchor="end" fontSize={11} fontFamily="var(--font-plex-mono)" fill={FAINT}>
                  {row.tempts}
                </text>

                {/* The movement: raw → moderated */}
                <line
                  x1={xr + dir * 11}
                  y1={y}
                  x2={xm - dir * 14}
                  y2={y}
                  stroke={FAINT}
                  strokeWidth={2}
                  strokeLinecap="round"
                  markerEnd={`url(#arrow-${arrowId})`}
                />

                {/* Human baseline — a reference, not part of the before→after
                    movement, so it rides above the row line. That also keeps it
                    legible where it nearly coincides with the moderated dot. */}
                <line x1={xh} y1={y - 12} x2={xh} y2={y - 5} stroke={C.human} strokeWidth={1} />
                <g transform={`translate(${xh} ${y - 20}) rotate(45)`}>
                  <rect x={-6} y={-6} width={12} height={12} fill={C.human} stroke={SURFACE} strokeWidth={2} />
                </g>

                {/* Raw — hollow ring (the "before" end of the dumbbell). */}
                <circle cx={xr} cy={y} r={7} fill={SURFACE} stroke={C.raw} strokeWidth={3.5} />
                {/* Moderated — solid (the "after" end). */}
                <circle cx={xm} cy={y} r={7} fill={C.moderated} stroke={SURFACE} strokeWidth={2} />

                {/* Direct labels at the dumbbell ends only — never a number on every mark. */}
                <text
                  x={xr - dir * 16}
                  y={y + 20}
                  textAnchor={dir > 0 ? "end" : "start"}
                  fontSize={12}
                  fontFamily="var(--font-plex-mono)"
                  fill={MUTED}
                >
                  {row.raw.value.toFixed(1)}
                </text>
                <text
                  x={xm + dir * 16}
                  y={y + 20}
                  textAnchor={dir > 0 ? "start" : "end"}
                  fontSize={12}
                  fontFamily="var(--font-plex-mono)"
                  fontWeight={600}
                  fill={NAVY}
                >
                  {row.moderated.value.toFixed(1)}
                </text>

                {/* Hit targets — deliberately larger than the marks. */}
                {(
                  [
                    ["human", xh, y - 20],
                    ["raw", xr, y],
                    ["moderated", xm, y],
                  ] as [VariantKey, number, number][]
                ).map(([key, cx, cy]) => {
                  const show = () => setHover({ x: cx, y: cy, variant: key, row });
                  const hide = () => setHover(null);
                  return (
                    <circle
                      key={key}
                      cx={cx}
                      cy={cy}
                      r={15}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${row.label} — ${VARIANTS.find((v) => v.key === key)!.label}: ${row[key].value.toFixed(1)} of 5`}
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

          {/* Axis */}
          <line x1={X0} y1={AXIS_BOTTOM} x2={X1} y2={AXIS_BOTTOM} stroke={HAIRLINE} strokeWidth={1} />
          {[1, 2, 3, 4, 5].map((t) => (
            <g key={t}>
              <line x1={scale(t)} y1={AXIS_BOTTOM} x2={scale(t)} y2={AXIS_BOTTOM + 5} stroke={HAIRLINE} strokeWidth={1} />
              <text
                x={scale(t)}
                y={AXIS_BOTTOM + 20}
                textAnchor="middle"
                fontSize={11.5}
                fontFamily="var(--font-plex-mono)"
                fill={FAINT}
              >
                {t}
              </text>
            </g>
          ))}
        </svg>

        {hover && <Tooltip hover={hover} height={H} />}
      </div>

      {/* Table view — every value stays reachable without reading the chart. */}
      <details className="mt-5 border-t border-hairline pt-4">
        <summary className="cursor-pointer font-mono text-[0.7rem] uppercase tracking-wider text-faint hover:text-muted">
          Show as table
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="py-2 pr-4 font-medium text-muted">Dataset</th>
                {VARIANTS.map((v) => (
                  <th key={v.key} className="py-2 pr-4 font-medium text-muted">
                    {v.label}
                  </th>
                ))}
                <th className="py-2 font-medium text-muted">Δ raw → moderated</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[0.8rem] [font-variant-numeric:tabular-nums]">
              {rows.map((row) => {
                const d = row.moderated.value - row.raw.value;
                return (
                  <tr key={row.id} className="border-b border-hairline/60">
                    <td className="py-2 pr-4 font-sans text-ink">{row.label}</td>
                    <td className="py-2 pr-4 text-ink">{row.human.value.toFixed(1)}</td>
                    <td className="py-2 pr-4 text-ink">{row.raw.value.toFixed(1)}</td>
                    <td className="py-2 pr-4 text-ink">{row.moderated.value.toFixed(1)}</td>
                    <td className="py-2 text-ink">
                      {d > 0 ? "+" : ""}
                      {d.toFixed(1)}
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
  const v = hover.row[hover.variant];
  const meta = VARIANTS.find((x) => x.key === hover.variant)!;
  return (
    <div
      className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full rounded-xl border border-hairline bg-surface/95 px-3.5 py-3 shadow-lg backdrop-blur"
      style={{ left: `${(hover.x / W) * 100}%`, top: `${((hover.y - 22) / height) * 100}%` }}
    >
      <div className="flex items-center gap-2">
        <LegendMark variant={hover.variant} color={meta.color} />
        <span className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">{meta.label}</span>
      </div>
      <p className="mt-1.5 font-serif text-sm leading-snug text-navy">“{v.title}”</p>
      <p className="mt-1 text-[0.7rem] text-muted">{v.author}</p>
      <p className="mt-2 border-t border-hairline pt-2 font-mono text-xs text-ink">
        {v.value.toFixed(1)}
        <span className="text-faint">/5 alarmism</span>
      </p>
    </div>
  );
}

/** Mark shapes mirror the chart, so the legend is a real key, not just a swatch. */
function LegendMark({ variant, color }: { variant: VariantKey; color: string }) {
  if (variant === "human") {
    return <span className="h-2.5 w-2.5 shrink-0 rotate-45" style={{ background: color }} />;
  }
  if (variant === "raw") {
    return (
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ border: `2.5px solid ${color}`, background: SURFACE }}
      />
    );
  }
  return <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />;
}
