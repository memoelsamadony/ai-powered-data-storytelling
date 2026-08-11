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

/** Formats a value for display. Absent values read "n/a", never a zero. */
export function formatValue(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
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

/* ── Annual expansion, for the 1 / 3 / 5 / 10-year step tabs ────────────────
 *
 * The country tables are anchored to a handful of years with published values.
 * A 1-year step needs a value for every year in between, so the gaps are filled
 * by linear interpolation.
 *
 * This is an estimate, and the UI says so: `isAnchorYear` drives an "est."
 * marker on every year that was filled rather than reported. Interpolating and
 * then presenting the result as though it were annual reporting would be the
 * same class of defect as the dual-axis chart this repo keeps as an exhibit.
 */

/** Every year from the first anchor to the last, inclusive. */
export function annualYears(anchors: readonly number[]): number[] {
  if (!anchors.length) return [];
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  const out: number[] = [];
  for (let y = first; y <= last; y += 1) out.push(y);
  return out;
}

/**
 * Values for every year in `years`, linearly interpolated between anchors.
 *
 * Anchor years keep their published value exactly — interpolation must never
 * drift a real figure. A null at either end of a span makes the whole span
 * null: a missing reading is not something to guess through.
 */
export function interpolateSeries(
  anchors: readonly number[],
  values: readonly (number | null)[],
  years: readonly number[],
): (number | null)[] {
  return years.map((year) => {
    const exact = anchors.indexOf(year);
    if (exact !== -1) return values[exact] ?? null;

    let i = 0;
    while (i < anchors.length - 1 && anchors[i + 1] < year) i += 1;
    const y0 = anchors[i];
    const y1 = anchors[i + 1];
    if (y1 === undefined || year < y0 || year > y1) return null;

    const v0 = values[i];
    const v1 = values[i + 1];
    if (v0 === null || v0 === undefined || v1 === null || v1 === undefined) return null;

    const t = (year - y0) / (y1 - y0);
    return v0 + (v1 - v0) * t;
  });
}

/**
 * The years a given step tab exposes: every `step`th year from the first, plus
 * the final year always, so the most recent reading is never off the end of the
 * timeline just because the range does not divide evenly.
 */
export function steppedYears(years: readonly number[], step: number): number[] {
  if (!years.length) return [];
  const out = years.filter((_, i) => i % step === 0);
  const last = years[years.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}
