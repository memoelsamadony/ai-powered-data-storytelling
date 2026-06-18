"use client";

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

const mono = { fontFamily: "var(--font-plex-mono)", fontSize: 11, fill: "#8493a5" };
const toneColor: Record<string, string> = { bad: "#e0392b", warn: "#e8a33d", good: "#0e8f86" };

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
  suffix?: string;
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
        <CartesianGrid stroke="#d9dfe7" strokeDasharray="3 4" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={mono} tickLine={false} axisLine={false} unit="%" />
        <YAxis type="category" dataKey="model" tick={{ ...mono, fontSize: 12, fill: "#0f172a" }} tickLine={false} axisLine={false} width={96} />
        <Tooltip cursor={{ fill: "#eef4f8" }} content={<ChartTooltip suffix="%" />} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={26} name="Error rate">
          {data.map((d, i) => (
            <Cell key={i} fill={toneColor[d.tone] ?? "#1e66b8"} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={mono} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Per-operation accuracy — grouped bars (small vs large model). */
export function OperationChart({
  data,
  smallLabel,
  largeLabel,
  height = 300,
}: {
  data: { op: string; small: number; large: number }[];
  smallLabel: string;
  largeLabel: string;
  height?: number;
}) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid stroke="#d9dfe7" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="op" tick={{ ...mono, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#d9dfe7" }} />
          <YAxis domain={[0, 100]} tick={mono} tickLine={false} axisLine={false} unit="%" />
          <Tooltip cursor={{ fill: "#eef4f8" }} content={<ChartTooltip suffix="%" />} />
          <Bar dataKey="small" name={smallLabel} fill="#9cc2e8" radius={[5, 5, 0, 0]} barSize={20} />
          <Bar dataKey="large" name={largeLabel} fill="#1e66b8" radius={[5, 5, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted">
        <Legend color="#9cc2e8" label={smallLabel} />
        <Legend color="#1e66b8" label={largeLabel} />
      </div>
    </div>
  );
}

/* Generic single-series vertical bars (masked numbers, text similarity). */
export function SimpleBarChart({
  data,
  color = "#1e66b8",
  domainMax = 100,
  suffix = "",
  decimals = 0,
  height = 240,
}: {
  data: { label: string; value: number }[];
  color?: string;
  domainMax?: number;
  suffix?: string;
  decimals?: number;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid stroke="#d9dfe7" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="label" tick={{ ...mono, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#d9dfe7" }} />
        <YAxis domain={[0, domainMax]} tick={mono} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "#eef4f8" }} content={<ChartTooltip suffix={suffix} />} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} barSize={48}>
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
