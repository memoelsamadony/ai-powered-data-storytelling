/**
 * Pure choropleth logic — no React, no colour, no DOM.
 *
 * Everything the map computes lives here so it can be tested with
 * `node --test`. The component renders; it does not decide.
 */
import type { Polarity } from "./tokens";

export type { Polarity };

export interface CountryStatLike {
  iso3: string;
  name: string;
  /** metric key → one value per index of the dataset's countryYears. */
  series: Record<string, (number | null)[]>;
}

/**
 * Which of the five bins a value falls in, or null when there is no value.
 *
 * `breaks` are the four ascending boundaries; a value sitting exactly on a
 * boundary belongs to the higher bin. Values above the top break clamp into
 * the last bin rather than overflowing.
 *
 * Deliberately a pure function of (value, breaks) and nothing else. Breaks are
 * declared per metric and never derived from the visible year — otherwise
 * scrubbing would recolour a country whose own figure had not moved.
 */
export function binOf(value: number | null | undefined, breaks: readonly number[]): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  let bin = 0;
  for (const b of breaks) if (value >= b) bin += 1;
  return bin;
}

/** Formats a value for display. Absent values are an en dash, never a zero. */
export function formatValue(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Legend edge labels: one per bin, the last marked open-ended. */
export function legendLabels(breaks: readonly number[], decimals = 0): string[] {
  const edges = [0, ...breaks];
  return edges.map((e, i) =>
    i === edges.length - 1 ? `${formatValue(e, decimals)}+` : formatValue(e, decimals),
  );
}

/** The value of one metric for one country at one year index, or null. */
export function valueAt(stat: CountryStatLike, metricKey: string, yearIndex: number): number | null {
  const row = stat.series[metricKey];
  if (!row || yearIndex < 0 || yearIndex >= row.length) return null;
  const v = row[yearIndex];
  return v === null || v === undefined || Number.isNaN(v) ? null : v;
}

/** Lookup keyed by ISO alpha-3, so the render loop is O(1) per shape. */
export function statsByIso<T extends CountryStatLike>(stats: readonly T[]): Map<string, T> {
  return new Map(stats.map((s) => [s.iso3, s]));
}
