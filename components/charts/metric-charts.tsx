"use client";

import * as t from "@/lib/charts/tokens";
import type { PerOperationResults } from "@/lib/data/metrics";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const mono = t.monoTick;
/* Series identity, not status: these are model rows, so they wear categorical
   hues. Status tokens stay reserved for fact-check state (contract item 3). */
const toneColor: Record<string, string> = { bad: t.alarm, warn: t.amber, good: t.calm };

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
  noteKeySuffix,
}: {
  active?: boolean;
  payload?: {
    value: number;
    name: string;
    color: string;
    payload?: Record<string, number | string>;
  }[];
  label?: string;
  suffix?: string;
  /** Reads `<series name><suffix>` off the row and prints it beside the value,
      which is how a percentage gets to show the count it rests on. */
  noteKeySuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-hairline bg-surface/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur">
      {label && <p className="font-mono text-[0.7rem] font-semibold text-navy">{label}</p>}
      <div className="mt-1.5 space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted">{p.name}</span>
            <span className="ml-auto font-mono font-medium text-ink">
              {p.value}
              {suffix}
              {noteKeySuffix && p.payload?.[`${p.name}${noteKeySuffix}`] && (
                <span className="ml-1.5 font-normal text-faint">
                  {p.payload[`${p.name}${noteKeySuffix}`]}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Faithfulness — % of outputs with ≥1 error (lower is better), coloured by tone. */
export function FaithfulnessChart({
  data,
  height = 240,
}: {
  data: { model: string; value: number; tone: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={t.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={mono} tickLine={false} axisLine={false} unit="%" />
        <YAxis type="category" dataKey="model" tick={{ ...mono, fontSize: 12, fill: t.ink }} tickLine={false} axisLine={false} width={96} />
        <Tooltip cursor={{ fill: t.surfaceSoft }} content={<ChartTooltip suffix="%" />} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={26} name="Error rate">
          {data.map((d, i) => (
            <Cell key={i} fill={toneColor[d.tone] ?? t.brandBlue} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={mono} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Per-operation accuracy, one grouped bar per model.
 *
 * The chart takes the results block whole rather than a pre-pivoted array, so
 * the model labels come from the data and cannot drift from it - a chart of
 * qwen3.5:4b's numbers legended "gemma 4B" is a mistake this file has already
 * shipped once.
 *
 * Every bar's tooltip carries `correct/total`. Some cells rest on very few
 * attempts (gemma4:12b's 80% on subtraction is 4 of 5, because it writes more
 * concise reports and states fewer explicit differences), and a bare
 * percentage would put that beside an 87-attempt cell as an equal.
 */
export function OperationChart({
  results,
  height = 300,
}: {
  results: PerOperationResults;
  height?: number;
}) {
  const colors = [t.brandBlueLight, t.brandBlue];
  const order: string[] = [];
  const byOperation = new Map<string, Record<string, number | string>>();
  for (const row of results.rows) {
    if (!byOperation.has(row.operation)) {
      byOperation.set(row.operation, { op: row.label });
      order.push(row.operation);
    }
    const cell = byOperation.get(row.operation)!;
    cell[row.model] = row.pct;
    cell[`${row.model}__n`] = `${row.correct}/${row.total}`;
  }
  const data = order.map((op) => byOperation.get(op)!);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={t.grid} vertical={false} />
          <XAxis dataKey="op" tick={{ ...mono, fontSize: 11 }} tickLine={false} axisLine={t.axisLineProps} />
          <YAxis domain={[0, 100]} tick={mono} tickLine={false} axisLine={false} unit="%" />
          <Tooltip
            cursor={{ fill: t.surfaceSoft }}
            content={<ChartTooltip suffix="%" noteKeySuffix="__n" />}
          />
          {results.models.map((model, i) => (
            <Bar
              key={model}
              dataKey={model}
              name={model}
              fill={colors[i % colors.length]}
              radius={[5, 5, 0, 0]}
              barSize={20}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
        {results.models.map((model, i) => (
          <Legend key={model} color={colors[i % colors.length]} label={model} />
        ))}
      </div>
    </div>
  );
}

/* Generic single-series vertical bars (masked numbers, similarity scores). */
export function SimpleBarChart({
  data,
  color = t.brandBlue,
  domainMax = 100,
  suffix = "",
  decimals = 0,
  height = 240,
}: {
  /** `muted` recedes a bar without removing it: quoted reference values sit on
      the same axis as measured ones but are not the same kind of claim. */
  data: { label: string; value: number; muted?: boolean }[];
  color?: string;
  domainMax?: number;
  suffix?: string;
  decimals?: number;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ ...mono, fontSize: 11 }} tickLine={false} axisLine={t.axisLineProps} />
        <YAxis domain={[0, domainMax]} tick={mono} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: t.surfaceSoft }} content={<ChartTooltip suffix={suffix} />} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} barSize={48}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.muted ? t.hairline : color} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => `${Number(v).toFixed(decimals)}${suffix}`}
            style={mono}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
