"use client";

/**
 * Shared chart furniture — the parts every figure owes under the chart contract
 * (FRONTEND_PLAN.md §2), built once so no renderer can forget one.
 *
 *   a legend whenever two series share a plot, so identity is never colour-only
 *   a table-view twin, so no value is reachable only by hovering
 *   a stated reason for the form, so a chart choice is never anonymous
 *   an explicit refusal when the spec is invalid, rather than a plausible chart
 *
 * Nothing here decides anything about the data. It takes what a renderer already
 * computed and dresses it.
 */

import { useState, type ReactNode } from "react";
import type { ChartColumn, ChartFrame, ChartSpec } from "@/lib/charts/spec";
import { columnOf } from "@/lib/charts/spec";
import { formatCell } from "@/lib/charts/frame";
import * as t from "@/lib/charts/tokens";

/* ── Legend ──────────────────────────────────────────────────────────────── */

export interface LegendEntry {
  label: string;
  color: string;
  /** e.g. the convention the series is drawn under, or its latest value. */
  note?: string;
  /** Marks the de-emphasised bulk so a reader knows the grey is deliberate. */
  muted?: boolean;
}

/**
 * Mandatory once two series share a plot. A single series needs none: the title
 * already names it, and a one-row legend is furniture rather than information.
 */
export function ChartLegend({ entries, compact = false }: { entries: LegendEntry[]; compact?: boolean }) {
  if (entries.length < 2) return null;
  return (
    <ul className={`m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 ${compact ? "mb-2" : "mb-3"}`}>
      {entries.map((e) => (
        <li key={e.label} className="flex items-baseline gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 translate-y-0.5 rounded-full"
            style={{ background: e.color }}
          />
          <span className={`text-xs ${e.muted ? "text-faint" : "font-medium text-ink"}`}>{e.label}</span>
          {e.note && <span className="font-mono text-[0.65rem] text-faint">{e.note}</span>}
        </li>
      ))}
    </ul>
  );
}

/** A binned scale legend, for the forms where colour carries magnitude. */
export function RampLegend({
  ramp,
  labels,
  unit,
  hasNoData,
}: {
  ramp: readonly string[];
  labels: string[];
  unit?: string;
  hasNoData?: boolean;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div className="flex items-end gap-px">
        {ramp.map((c, i) => (
          <div key={c} className="flex flex-col items-start">
            <span className="block h-3 w-8" style={{ background: c }} />
            <span className="mt-1 font-mono text-[0.6rem] text-faint [font-variant-numeric:tabular-nums]">
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
      {unit && <span className="font-mono text-[0.65rem] text-faint">{unit}</span>}
      {hasNoData && (
        <span className="flex items-center gap-1.5 font-mono text-[0.65rem] text-faint">
          <svg width="16" height="12" aria-hidden>
            <defs>
              <pattern id="nd-key" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke={t.noDataStroke} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="16" height="12" fill="url(#nd-key)" stroke={t.hairline} />
          </svg>
          not reported
        </span>
      )}
    </div>
  );
}

/* ── Table twin ──────────────────────────────────────────────────────────── */

/**
 * The WCAG-clean equivalent of any figure, generated from the frame itself.
 *
 * Generic on purpose: every form gets a table for free, and none of them has to
 * write one. Only the columns the spec actually uses are shown, in encoding
 * order, so the table reads as the chart rather than as a data dump.
 */
export function FrameTable({
  frame,
  spec,
  maxRows = 400,
}: {
  frame: ChartFrame;
  spec: ChartSpec;
  maxRows?: number;
}) {
  const [open, setOpen] = useState(false);

  const keys = [
    spec.encoding.facet,
    spec.encoding.x,
    spec.encoding.geo,
    spec.encoding.color,
    spec.encoding.y,
    spec.encoding.color2,
    spec.encoding.size,
    ...(spec.encoding.measures ?? []),
  ].filter((k, i, all): k is string => !!k && all.indexOf(k) === i);

  const columns = keys
    .map((k) => columnOf(frame, k))
    .filter((c): c is ChartColumn => c !== undefined);
  if (!columns.length) return null;

  const rows = frame.rows.slice(0, maxRows);
  const truncated = frame.rows.length - rows.length;

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
                {columns.map((c) => (
                  <th key={c.key} className="py-1.5 pr-4 font-medium text-muted">
                    {c.label}
                    {c.unit ? <span className="text-faint"> ({c.unit})</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono [font-variant-numeric:tabular-nums]">
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-hairline/60">
                  {columns.map((c) => (
                    <td key={c.key} className="py-1.5 pr-4 text-ink">
                      {formatCell(row[c.key], c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {truncated > 0 && (
            <p className="mt-2 font-mono text-[0.65rem] text-faint">
              {truncated.toLocaleString()} further rows not shown.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Notices ─────────────────────────────────────────────────────────────── */

/**
 * An invalid spec renders its reasons, never a chart.
 *
 * Drawing something plausible from a spec that failed validation is the worst
 * available outcome: the reader cannot tell it apart from a figure that passed.
 */
export function ChartError({ errors, title }: { errors: string[]; title?: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-soft px-4 py-3" role="alert">
      <p className="text-xs font-medium text-ink">
        {title ? `"${title}" was not drawn` : "This chart was not drawn"}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {errors.map((e) => (
          <li key={e} className="text-xs leading-relaxed text-muted">
            {e}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Warnings render WITH the chart: a soft cap is a judgement call, not a fault. */
export function ChartWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <ul className="mt-2 list-none space-y-1 p-0">
      {warnings.map((w) => (
        <li key={w} className="flex gap-1.5 text-[0.7rem] leading-relaxed text-muted">
          <span aria-hidden className="text-faint">
            ·
          </span>
          {w}
        </li>
      ))}
    </ul>
  );
}

/* ── Figure ──────────────────────────────────────────────────────────────── */

/**
 * Title, plot, caption, stated reason, table.
 *
 * The rationale is disclosed rather than hidden in a tooltip. When a chart form
 * has been chosen by something other than the person reading it, the reader is
 * entitled to see the reason without hunting for it.
 */
export function ChartFigure({
  spec,
  frame,
  legend,
  warnings,
  showTable = true,
  showRationale = true,
  children,
}: {
  spec: ChartSpec;
  frame: ChartFrame;
  legend?: ReactNode;
  warnings?: string[];
  showTable?: boolean;
  showRationale?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className="m-0">
      <figcaption className="mb-2">
        <p className="text-sm font-medium text-ink">{spec.title}</p>
        {spec.subtitle && <p className="mt-0.5 text-xs text-muted">{spec.subtitle}</p>}
      </figcaption>

      {legend}
      {children}

      {(spec.caption || showRationale || frame.sourceNote) && (
        <div className="mt-2 space-y-1">
          {spec.caption && (
            <p className="text-[0.7rem] leading-relaxed text-faint">{spec.caption}</p>
          )}
          {showRationale && (
            <p className="text-[0.7rem] leading-relaxed text-faint">
              <span className="font-mono uppercase tracking-wider">Why this form: </span>
              {spec.rationale}
            </p>
          )}
          {frame.sourceNote && (
            <p className="font-mono text-[0.65rem] text-faint">{frame.sourceNote}</p>
          )}
        </div>
      )}

      <ChartWarnings warnings={warnings ?? []} />
      {showTable && <FrameTable frame={frame} spec={spec} />}
    </figure>
  );
}

/* ── Tooltip ─────────────────────────────────────────────────────────────── */

export interface TooltipLine {
  label: string;
  value: string;
  color?: string;
}

/** One tooltip shape for every form, so hover reads the same everywhere. */
export function ChartTooltipCard({ heading, lines }: { heading: string; lines: TooltipLine[] }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface/95 px-3.5 py-3 text-xs shadow-lg backdrop-blur">
      <p className="font-mono text-[0.7rem] font-semibold text-navy">{heading}</p>
      <div className="mt-2 space-y-1.5">
        {lines.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            {l.color && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} />
            )}
            <span className="text-muted">{l.label}</span>
            <span className="ml-auto whitespace-nowrap font-mono font-medium text-ink [font-variant-numeric:tabular-nums]">
              {l.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Axis props shared by every Recharts plot, so the grid rule cannot regress. */
export const AXIS = {
  tick: t.monoTick,
  tickLine: false as const,
  axisLine: t.axisLineProps,
};
