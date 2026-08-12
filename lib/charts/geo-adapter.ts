/**
 * Frame → the shape `CountryMap` already speaks.
 *
 * `components/charts/country-map.tsx` is generic by construction and carries a
 * lot of earned behaviour: declared bins, the hatch for absent values, the
 * Equal Earth projection, the 1/3/5/10-year step tabs and the scrubber. A
 * spec-driven choropleth should inherit all of it rather than grow a second
 * map that drifts from the first.
 *
 * So this is an adapter, not a renderer. It reshapes a long-format
 * `ChartFrame` into the `{ years, metrics, stats }` triple that component
 * takes, and lives here rather than in the component so `node --test` can
 * reach it.
 */

import type { CountryMetric, CountryStat } from "../data/datasets.ts";
import type { ChartFrame, ChartSpec } from "./spec.ts";
import { columnOf } from "./spec.ts";
import { asNumber, distinctValues, fallbackBreaks } from "./frame.ts";

/** Columns that plausibly hold a display name for a country. */
const NAME_HINT = /name|country|entity|location|region/i;

export interface CountryData {
  years: number[];
  metrics: CountryMetric[];
  stats: CountryStat[];
}

/**
 * Picks the column holding a human-readable place name.
 *
 * The ISO code is the join key, never the label: a map that prints "NGA" has
 * made the reader do the lookup. Falls back to the code only when the frame
 * carries no name at all.
 */
export function nameColumnOf(frame: ChartFrame, spec: ChartSpec): string | null {
  const geo = spec.encoding.geo;
  const hit = frame.columns.find(
    (c) => c.type === "nominal" && c.key !== geo && NAME_HINT.test(c.key),
  );
  return hit?.key ?? null;
}

/**
 * Reshapes a frame for `CountryMap`.
 *
 * Years come from `encoding.x` when there is one. A frame with no x is a single
 * slice, and gets a one-entry timeline so the same component renders it without
 * a special case: the scrubber simply has nowhere to go.
 *
 * Breaks are the spec's if declared, and derived from the WHOLE frame if not.
 * Never from the visible year: bins that move under a scrubber recolour a
 * country whose own figure never changed.
 */
export function frameToCountryData(frame: ChartFrame, spec: ChartSpec): CountryData {
  const geoKey = spec.encoding.geo;
  const valueKeys = [spec.encoding.color, spec.encoding.color2].filter(
    (k): k is string => !!k,
  );
  if (!geoKey || !valueKeys.length) return { years: [], metrics: [], stats: [] };

  const xKey = spec.encoding.x;
  const years = xKey
    ? distinctValues(frame, xKey)
        .map((v) => asNumber(v))
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b)
    : [0];
  const yearIndex = new Map(years.map((y, i) => [y, i]));

  const metrics: CountryMetric[] = valueKeys.map((key, i) => {
    const col = columnOf(frame, key);
    const breaks = (i === 0 ? spec.breaks : undefined) ?? fallbackBreaks(frame, key) ?? [1, 2, 3, 4];
    return {
      key,
      label: col?.label ?? key,
      unit: col?.unit ?? "",
      polarity: spec.polarity ?? "higher-is-worse",
      breaks,
      decimals: col?.decimals ?? 0,
    };
  });

  const nameKey = nameColumnOf(frame, spec);
  const byIso = new Map<string, CountryStat>();

  for (const row of frame.rows) {
    const iso = row[geoKey];
    if (iso === null || iso === undefined) continue;
    const iso3 = String(iso);

    let stat = byIso.get(iso3);
    if (!stat) {
      stat = {
        iso3,
        name: nameKey ? String(row[nameKey] ?? iso3) : iso3,
        series: Object.fromEntries(valueKeys.map((k) => [k, years.map(() => null)])),
      };
      byIso.set(iso3, stat);
    }

    const idx = xKey ? (yearIndex.get(asNumber(row[xKey]) ?? NaN) ?? -1) : 0;
    if (idx < 0) continue;
    for (const key of valueKeys) stat.series[key][idx] = asNumber(row[key]);
  }

  return { years, metrics, stats: [...byIso.values()] };
}
