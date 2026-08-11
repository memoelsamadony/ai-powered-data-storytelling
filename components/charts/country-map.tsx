"use client";

/**
 * G15 — the country choropleth.
 *
 * Generic by construction: it renders whatever metrics the dataset declares and
 * knows nothing about measles or child mortality. If it is handed no country
 * data it renders nothing, so `app/datasets/page.tsx` and the comparison step
 * can both call it without owning that rule themselves.
 *
 * Two rules carry the honesty of this figure:
 *
 *  1. Bins come from the metric's declared `breaks` and nothing else. If they
 *     were recomputed per visible year, scrubbing would recolour a country
 *     whose own figure had not moved — the animated cousin of the dual-axis
 *     defect kept as an exhibit in `dataset-chart.tsx`.
 *  2. "No data" is a hatch, not a pale fill. The palest bin sits at 1.13
 *     contrast against the surface and a pale grey scores 1.04 against it, so
 *     a grey fill would read as a low value rather than as an absent one.
 *
 * The geometry is an Equal Earth projection, generated at build time by
 * `scripts/build-world-map.mjs`. Mercator is never used: it inflates
 * high-latitude countries 3–14×, misstating the quantity the colour encodes.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { WORLD_VIEWBOX, worldShapes } from "@/lib/data/world-geo";
import type { CountryMetric, CountryStat } from "@/lib/data/datasets";
import { binOf, formatValue, legendLabels, statsByIso, valueAt } from "@/lib/charts/choropleth";
import * as t from "@/lib/charts/tokens";

/** One frame per this many ms while playing. */
const FRAME_MS = 900;

interface HoverState {
  iso3: string;
  name: string;
  x: number;
  y: number;
}

export function CountryMap({
  years,
  metrics,
  stats,
  sourceNote,
  compact = false,
  showTable = true,
}: {
  years: number[];
  metrics: CountryMetric[];
  stats: CountryStat[];
  sourceNote?: string;
  /** Drop the heading where the surrounding card already names the data. */
  compact?: boolean;
  showTable?: boolean;
}) {
  const mappable = useMemo(() => metrics.filter((m) => m.mappable !== false), [metrics]);
  const [metricKey, setMetricKey] = useState(() => mappable[0]?.key ?? "");
  const [yearIndex, setYearIndex] = useState(() => Math.max(0, years.length - 1));
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const patternId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!playing || years.length < 2) return;
    const id = window.setInterval(() => setYearIndex((i) => (i + 1) % years.length), FRAME_MS);
    return () => window.clearInterval(id);
  }, [playing, years.length]);

  const byIso = useMemo(() => statsByIso(stats), [stats]);
  const metric = mappable.find((m) => m.key === metricKey) ?? mappable[0];

  /* The one guard both call sites rely on. */
  if (!stats.length || !metric || !years.length) return null;

  const ramp = t.rampFor(metric.polarity);
  const labels = legendLabels(metric.breaks, metric.decimals ?? 0);
  const year = years[yearIndex];
  const hovered = hover ? byIso.get(hover.iso3) : undefined;
  const anyValueThisYear = stats.some((s) => valueAt(s, metric.key, yearIndex) !== null);
  const hatch = `url(#nodata-${patternId})`;

  return (
    <figure className="m-0">
      {!compact && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-ink">{metric.label} by country</span>
          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-faint">{year}</span>
        </div>
      )}

      {/* ── Metric toggle. Hidden when the dataset declares only one map layer. */}
      {mappable.length > 1 && (
        <div role="group" aria-label="Metric" className="mb-3 flex flex-wrap gap-1.5">
          {mappable.map((m) => {
            const on = m.key === metric.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetricKey(m.key)}
                aria-pressed={on}
                className={`rounded-lg border px-2.5 py-1 text-[0.72rem] transition-colors ${
                  on
                    ? "border-navy bg-navy text-white"
                    : "border-hairline bg-surface text-muted hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── The map. */}
      <div ref={wrapRef} className="relative" onMouseLeave={() => setHover(null)}>
        <svg
          viewBox={WORLD_VIEWBOX}
          className="block h-auto w-full"
          role="img"
          aria-label={`${metric.label} by country, ${year}. ${stats.length} countries with data.`}
        >
          <defs>
            <pattern
              id={`nodata-${patternId}`}
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="8" height="8" fill={t.surface} />
              <line x1="0" y1="0" x2="0" y2="8" stroke={t.noDataStroke} strokeWidth="2" />
            </pattern>
          </defs>

          {worldShapes.map((shape) => {
            const stat = byIso.get(shape.id);
            const value = stat ? valueAt(stat, metric.key, yearIndex) : null;
            const bin = binOf(value, metric.breaks);
            const name = stat?.name ?? shape.name;
            const active = hover?.iso3 === shape.id;
            return (
              <path
                key={shape.id}
                d={shape.d}
                fill={bin === null ? hatch : ramp[bin]}
                stroke={active ? t.navy : t.countryStroke}
                strokeWidth={active ? 3 : 1}
                tabIndex={bin === null ? -1 : 0}
                aria-label={
                  bin === null
                    ? `${name}, no data`
                    : `${name}, ${metric.label} ${formatValue(value, metric.decimals ?? 0)} ${metric.unit}, ${year}`
                }
                className="outline-none transition-[fill] duration-500"
                onMouseMove={(e) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  if (!box) return;
                  setHover({ iso3: shape.id, name, x: e.clientX - box.left, y: e.clientY - box.top });
                }}
                onFocus={(e) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  const own = e.currentTarget.getBoundingClientRect();
                  if (!box) return;
                  setHover({
                    iso3: shape.id,
                    name,
                    x: own.left - box.left + own.width / 2,
                    y: own.top - box.top,
                  });
                }}
                onBlur={() => setHover(null)}
              />
            );
          })}
        </svg>

        {hover && hovered && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[15rem] -translate-x-1/2 -translate-y-full rounded-xl border border-hairline bg-surface/95 px-3 py-2.5 text-xs shadow-lg backdrop-blur"
            style={{ left: hover.x, top: hover.y - 8 }}
            role="status"
          >
            <p className="font-mono text-[0.7rem] font-semibold text-navy">
              {hovered.name} <span className="text-faint">· {year}</span>
            </p>
            <div className="mt-2 space-y-1.5">
              {metrics.map((m) => (
                <div key={m.key} className="flex items-center gap-3">
                  <span className="text-muted">{m.label}</span>
                  <span className="ml-auto font-mono font-medium text-ink [font-variant-numeric:tabular-nums]">
                    {formatValue(valueAt(hovered, m.key, yearIndex), m.decimals ?? 0)}
                    <span className="ml-1 text-faint">{m.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Year scrubber. */}
      {years.length > 1 && (
        <div className="mt-3 flex items-center gap-3">
          {!reduceMotion && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause the year animation" : "Play the year animation"}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-hairline bg-surface text-muted transition-colors hover:text-ink"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}
          <input
            type="range"
            min={0}
            max={years.length - 1}
            step={1}
            value={yearIndex}
            onChange={(e) => {
              setPlaying(false);
              setYearIndex(Number(e.target.value));
            }}
            aria-label="Year"
            aria-valuetext={String(year)}
            className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-hairline accent-navy"
          />
          <span className="w-10 shrink-0 text-right font-mono text-[0.7rem] text-ink [font-variant-numeric:tabular-nums]">
            {year}
          </span>
        </div>
      )}

      {/* ── Legend. Bin edges, then the no-data swatch. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-end">
          {ramp.map((c, i) => (
            <div key={c} className="flex flex-col items-start">
              <span className="block h-3 w-9" style={{ background: c }} />
              <span className="mt-1 font-mono text-[0.6rem] text-faint">{labels[i]}</span>
            </div>
          ))}
          <span className="ml-2 self-start font-mono text-[0.6rem] text-faint">{metric.unit}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="16" height="12" aria-hidden="true" className="shrink-0">
            <rect width="16" height="12" fill={hatch} stroke={t.countryStroke} />
          </svg>
          <span className="font-mono text-[0.6rem] text-faint">no data</span>
        </div>
      </div>

      {!anyValueThisYear && (
        <p className="mt-2 text-[0.7rem] text-muted">
          No country reported {metric.label} in {year}.
        </p>
      )}

      {sourceNote && <p className="mt-2 font-mono text-[0.6rem] text-faint">{sourceNote}</p>}

      {showTable && (
        <CountryTable
          metrics={metrics}
          stats={stats}
          metricKey={metric.key}
          yearIndex={yearIndex}
          year={year}
        />
      )}
    </figure>
  );
}

/** The table-view twin every chart owes under the chart contract (item 7). */
function CountryTable({
  metrics,
  stats,
  metricKey,
  yearIndex,
  year,
}: {
  metrics: CountryMetric[];
  stats: CountryStat[];
  metricKey: string;
  yearIndex: number;
  year: number;
}) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(
    () =>
      [...stats].sort(
        (a, b) =>
          (valueAt(b, metricKey, yearIndex) ?? -Infinity) - (valueAt(a, metricKey, yearIndex) ?? -Infinity),
      ),
    [stats, metricKey, yearIndex],
  );

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
            <caption className="sr-only">Country figures for {year}</caption>
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-hairline">
                <th className="py-1.5 pr-4 font-medium text-muted">Country</th>
                {metrics.map((m) => (
                  <th key={m.key} className="py-1.5 pr-4 font-medium text-muted">
                    {m.label} <span className="text-faint">({m.unit})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono [font-variant-numeric:tabular-nums]">
              {rows.map((s) => (
                <tr key={s.iso3} className="border-b border-hairline/60">
                  <td className="py-1.5 pr-4 text-ink">{s.name}</td>
                  {metrics.map((m) => (
                    <td key={m.key} className="py-1.5 pr-4 text-ink">
                      {formatValue(valueAt(s, m.key, yearIndex), m.decimals ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
