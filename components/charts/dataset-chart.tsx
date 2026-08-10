"use client";

/**
 * ⚠️ THE ALARMIST EXEMPLAR — deliberately misleading. Do not use as a default.
 *
 * This is a dual-axis chart: measles cases on a left auto-domain axis against
 * MCV1 coverage on a right [0,100] axis. The alignment between two independent
 * y-scales is arbitrary, so the chart *manufactures* a correlation that may not
 * be in the data. It is the canonical misleading-chart technique.
 *
 * It is kept, not deleted, because it is the exhibit (FRONTEND_PLAN.md G13):
 * the generator's chart choices rendered faithfully, beside the moderator's
 * calibrated version of the same data. The project's own fact-checker flagged
 * the moderated story's "which corresponds with a higher rate…" as an
 * unsupported causal-adjacent link (RESULTS.md §B3) — this chart asserts that
 * same link visually, which is precisely what makes it worth showing.
 *
 * For every honest use, import `StoryChart` from `./story-chart` instead.
 * Defect D1 in FRONTEND_PLAN.md §1.3.
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
import type { Dataset } from "@/lib/data/datasets";

const axisStyle = { fontFamily: "var(--font-plex-mono)", fontSize: 11, fill: "#8493a5" };

export function DatasetChart({ dataset, height = 320 }: { dataset: Dataset; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={dataset.series} margin={{ top: 12, right: 8, bottom: 4, left: -8 }}>
        <defs>
          <linearGradient id="ds-primary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0392b" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#e0392b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#d9dfe7" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} tickLine={false} axisLine={{ stroke: "#d9dfe7" }} minTickGap={24} />
        <YAxis yAxisId="left" tick={axisStyle} tickLine={false} axisLine={false} width={44} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={36}
          domain={[0, 100]}
        />
        {dataset.referenceLine && (
          <ReferenceLine
            yAxisId="right"
            y={dataset.referenceLine.value}
            stroke="#0e8f86"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{
              value: dataset.referenceLine.label,
              position: "insideTopRight",
              fontSize: 10,
              fontFamily: "var(--font-plex-mono)",
              fill: "#0e8f86",
            }}
          />
        )}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="primary"
          stroke="#e0392b"
          strokeWidth={2.4}
          fill="url(#ds-primary)"
          name={dataset.primaryLabel}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="secondary"
          stroke="#1e66b8"
          strokeWidth={2.4}
          name={dataset.secondaryLabel}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Tooltip
          content={<DatasetTooltip dataset={dataset} />}
          cursor={{ stroke: "#0d1b5c", strokeOpacity: 0.15, strokeWidth: 1 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

interface TooltipPayload {
  payload?: { year: number; primary: number; secondary: number };
}

function DatasetTooltip({
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
        <Row color="#e0392b" label={dataset.primaryLabel} value={`${p.primary.toLocaleString()} ${dataset.primaryUnit}`} />
        <Row color="#1e66b8" label={dataset.secondaryLabel} value={`${p.secondary} ${dataset.secondaryUnit}`} />
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
