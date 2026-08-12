"use client";

import { Check, Database, AlertTriangle, TrendingUp } from "lucide-react";
import type { Dataset } from "@/lib/data/datasets";
import { StoryChart } from "@/components/charts/story-chart";
import { DatasetUpload } from "@/components/generate/dataset-upload";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DatasetPicker({
  datasets,
  selectedId,
  onSelect,
}: {
  datasets: Dataset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = datasets.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {datasets.map((d) => {
          const active = d.id === selectedId;
          const alarm = d.failureMode === "alarmism";
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={cn(
                "group relative flex flex-col rounded-2xl border bg-surface p-5 text-left transition-all duration-200 hover:-translate-y-0.5",
                active ? "border-navy ring-2 ring-navy/15" : "border-hairline hover:border-brand-blue/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-soft text-navy">
                  <Database className="h-5 w-5" />
                </span>
                {active && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-navy text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-serif text-lg leading-tight text-navy">{d.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{d.tagline}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone={alarm ? "alarm" : "brand"}>
                  {alarm ? <AlertTriangle className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {alarm ? "alarmism" : "over-optimism"}
                </Badge>
                <span className="font-mono text-[0.68rem] text-faint">{d.rows.toLocaleString()} rows</span>
              </div>
            </button>
          );
        })}

        <DatasetUpload />
      </div>

      {selected && (
        <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="kicker text-deep-teal">Preview · {selected.name}</span>
              <p className="mt-1.5 text-sm text-muted">
                {selected.granularity} · {selected.yearRange} ·{" "}
                <span className="text-ink">{selected.sources.join(", ")}</span>
              </p>
            </div>
          </div>

          {/*
            The country table appears only when the dataset has country rows to
            put in it. A global-total table has no country dimension at all, so
            `previewRows` is empty by construction, and rendering the header row
            anyway left column names standing over nothing. The headers are the
            dataset's own series labels rather than a measles/everything-else
            branch: that branch captioned every non-measles table `U5MR` and
            `Life exp.`, which was invisible only because the body was empty.
          */}
          <div
            className={cn(
              "mt-5 grid gap-6",
              selected.previewRows.length > 0 && "lg:grid-cols-[1fr_1.2fr]",
            )}
          >
            {selected.previewRows.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-hairline">
                <table className="w-full text-sm">
                  <thead className="bg-surface-soft">
                    <tr className="text-left font-mono text-[0.68rem] uppercase tracking-wide text-faint">
                      <th className="px-4 py-2.5 font-medium">Country</th>
                      <th className="px-4 py-2.5 font-medium">Year</th>
                      <th className="px-4 py-2.5 text-right font-medium">{selected.primaryLabel}</th>
                      <th className="px-4 py-2.5 text-right font-medium">{selected.secondaryLabel}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {selected.previewRows.map((r, i) => (
                      <tr key={i} className="text-ink">
                        <td className="px-4 py-2.5">{r.country}</td>
                        <td className="px-4 py-2.5 font-mono text-muted">{r.year}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{r.cases}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{r.coverage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <StoryChart dataset={selected} height={280} />
            </div>
          </div>

          {selected.previewRows.length === 0 && (
            <p className="mt-3 font-mono text-[0.68rem] uppercase tracking-wide text-faint">
              {selected.granularity} — no country breakdown to preview
            </p>
          )}

          <p className="mt-5 rounded-xl bg-surface-soft/70 px-4 py-3 text-sm text-muted">
            <span className="font-medium text-ink">{selected.failureModeLabel}.</span>{" "}
            {selected.failureMode === "alarmism"
              ? "The moderator must pull an over-alarmist story down without losing real urgency."
              : "The moderator must keep the gravity (the remaining gap, the reversal) rather than flatten it into false reassurance."}
          </p>
        </div>
      )}
    </div>
  );
}
