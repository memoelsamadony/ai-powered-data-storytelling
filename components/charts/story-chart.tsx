"use client";

/**
 * G1 — the dataset chart that sits beside a story.
 *
 * Two measures, two panels, ONE x-axis. This is the honest replacement for the
 * dual-axis `DatasetChart` (defect D1): stacked panels give the same visual
 * juxtaposition without letting an arbitrary alignment of two y-scales invent a
 * correlation. The 95% herd-immunity line stays dashed because it genuinely is
 * a threshold — and now it is the only dashed thing on the page (defect D4).
 *
 * Chart contract: one y-axis per plot, tokens not literals, solid hairline
 * grid, hover by default, table-view twin. FRONTEND_PLAN.md §2.
 */

import { useState } from "react";
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
import type { Dataset } from "@/lib/data/datasets";
import * as t from "@/lib/charts/tokens";

/** Shared so the two panels' plot areas line up exactly. */
const Y_WIDTH = 52;

export function StoryChart({
  dataset,
  height = 320,
  compact = false,
  showTable = true,
}: {
  dataset: Dataset;
  height?: number;
  /** Drop the panel headers where the surrounding card already names the data. */
  compact?: boolean;
  showTable?: boolean;
}) {
  const topH = Math.round(height * 0.52);
  const bottomH = height - topH;

  return (
    <figure className="m-0">
      {!compact && <PanelLabel color={t.alarm} label={dataset.primaryLabel} unit={dataset.primaryUnit} />}
      <ResponsiveContainer width="100%" height={topH}>
        <ComposedChart data={dataset.series} margin={{ top: 6, right: 12, bottom: 0, left: 0 }} syncId={dataset.id}>
          <defs>
            <linearGradient id={`sc-primary-${dataset.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.alarm} stopOpacity={0.18} />
              <stop offset="100%" stopColor={t.alarm} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={t.grid} vertical={false} />
          <XAxis dataKey="year" tick={false} axisLine={t.axisLineProps} height={1} />
          <YAxis tick={t.monoTick} tickLine={false} axisLine={false} width={Y_WIDTH} />
          <Area
            type="monotone"
            dataKey="primary"
            stroke={t.alarm}
            strokeWidth={2}
            fill={`url(#sc-primary-${dataset.id})`}
            name={dataset.primaryLabel}
            dot={false}
            activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }}
          />
          <Tooltip content={<StoryTooltip dataset={dataset} />} cursor={{ stroke: t.navy, strokeOpacity: 0.15 }} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className={compact ? "mt-2" : "mt-3"}>
        {!compact && <PanelLabel color={t.brandBlue} label={dataset.secondaryLabel} unit={dataset.secondaryUnit} />}
      </div>
      <ResponsiveContainer width="100%" height={bottomH}>
        <ComposedChart data={dataset.series} margin={{ top: 6, right: 12, bottom: 4, left: 0 }} syncId={dataset.id}>
          <CartesianGrid stroke={t.grid} vertical={false} />
          <XAxis dataKey="year" tick={t.monoTick} tickLine={false} axisLine={t.axisLineProps} minTickGap={24} />
          <YAxis tick={t.monoTick} tickLine={false} axisLine={false} width={Y_WIDTH} domain={["auto", "auto"]} />
          {dataset.referenceLine && (
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
          <Line
            type="monotone"
            dataKey="secondary"
            stroke={t.brandBlue}
            strokeWidth={2}
            name={dataset.secondaryLabel}
            dot={false}
            activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }}
          />
          <Tooltip content={<StoryTooltip dataset={dataset} />} cursor={{ stroke: t.navy, strokeOpacity: 0.15 }} />
        </ComposedChart>
      </ResponsiveContainer>

      {showTable && <SeriesTable dataset={dataset} />}
    </figure>
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

function PanelLabel({ color, label, unit }: { color: string; label: string; unit: string }) {
  return (
    <div className="mb-1 flex items-baseline gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="text-xs font-medium text-ink">{label}</span>
      <span className="font-mono text-[0.65rem] text-faint">{unit}</span>
    </div>
  );
}

interface TooltipPayload {
  payload?: { year: number; primary: number; secondary: number };
}

function StoryTooltip({
  active,
  payload,
  dataset,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  dataset: Dataset;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-hairline bg-surface/95 px-3.5 py-3 text-xs shadow-lg backdrop-blur">
      <p className="font-mono text-[0.7rem] font-semibold text-navy">{p.year}</p>
      <div className="mt-2 space-y-1.5">
        <Row color={t.alarm} label={dataset.primaryLabel} value={`${p.primary.toLocaleString()} ${dataset.primaryUnit}`} />
        <Row color={t.brandBlue} label={dataset.secondaryLabel} value={`${p.secondary} ${dataset.secondaryUnit}`} />
      </div>
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-muted">{label}</span>
      <span className="ml-auto font-mono font-medium text-ink">{value}</span>
    </div>
  );
}
