/**
 * Pure frame operations — no React, no colour, no DOM.
 *
 * Every reshape and every value transform a chart needs lives here, so it can
 * be tested with `node --test` (see `frame.test.mts`). The components render;
 * they do not decide, and they do not do arithmetic.
 *
 * Two invariants hold throughout:
 *
 *   1. `null` means "not reported" and survives every transform as `null`. It
 *      is never coerced to 0. A missing reading is not a low reading, and the
 *      renderers break their lines at nulls rather than drawing through them.
 *   2. No transform reads the *visible* slice. Everything is computed over the
 *      whole frame, so faceting or scrubbing a year cannot move a scale and
 *      recolour a mark whose own figure never changed.
 */

import type {
  ChartColumn,
  ChartFrame,
  ChartRow,
  ChartSpec,
  ChartValue,
} from "./spec.ts";
import { columnOf } from "./spec.ts";

/* ── Cell access ─────────────────────────────────────────────────────────── */

/** A cell as a number, or null when it is absent or not numeric. */
export function asNumber(v: ChartValue | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** A cell as a display string. Absent reads "n/a", never a zero. */
export function formatCell(v: ChartValue | undefined, column?: ChartColumn): string {
  if (v === null || v === undefined) return "n/a";
  if (typeof v === "string") return v;
  const decimals = column?.decimals ?? 0;
  const n = v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const unit = column?.unit?.trim();
  if (!unit) return n;
  return unit === "%" ? `${n}%` : `${n} ${unit}`;
}

/**
 * Distinct values of a column, in first-appearance order.
 *
 * First-appearance rather than sorted, because the frame's own row order is the
 * only ordering signal the producer gave us. A `sort` on the spec re-orders
 * explicitly; nothing else should.
 */
export function distinctValues(frame: ChartFrame, key: string | undefined): ChartValue[] {
  if (!key) return [];
  const seen = new Set<string>();
  const out: ChartValue[] = [];
  for (const row of frame.rows) {
    const v = row[key];
    if (v === null || v === undefined) continue;
    const k = String(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/** [min, max] over a numeric column, ignoring nulls. Null when nothing numeric. */
export function extentOf(frame: ChartFrame, key: string | undefined): [number, number] | null {
  if (!key) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const row of frame.rows) {
    const n = asNumber(row[key]);
    if (n === null) continue;
    if (n < lo) lo = n;
    if (n > hi) hi = n;
  }
  return lo === Infinity ? null : [lo, hi];
}

/** The distinct series identities a spec will draw, capped by nothing here. */
export function seriesKeys(frame: ChartFrame, spec: ChartSpec): string[] {
  return distinctValues(frame, spec.encoding.color).map(String);
}

/* ── Grouping ────────────────────────────────────────────────────────────── */

/** Rows grouped by the stringified value of `key`, preserving encounter order. */
export function groupBy(rows: ChartRow[], key: string | undefined): Map<string, ChartRow[]> {
  const out = new Map<string, ChartRow[]>();
  if (!key) {
    out.set("", rows);
    return out;
  }
  for (const row of rows) {
    const k = String(row[key] ?? "");
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}

/**
 * One sub-frame per distinct value of `encoding.facet`.
 *
 * Returns a single unlabelled panel when nothing is faceted, so a renderer can
 * treat "one chart" and "small multiples" with the same loop. Columns are
 * shared by reference: a facet is a row filter, never a different schema.
 */
export function facets(frame: ChartFrame, spec: ChartSpec): { label: string; frame: ChartFrame }[] {
  const key = spec.encoding.facet;
  if (!key) return [{ label: "", frame }];
  return [...groupBy(frame.rows, key)].map(([label, rows]) => ({
    label,
    frame: { ...frame, rows },
  }));
}

/* ── Transforms ──────────────────────────────────────────────────────────── */

/** Writes a numeric result into a copied row, preserving null. */
function withValue(row: ChartRow, key: string, value: number | null): ChartRow {
  return { ...row, [key]: value };
}

/**
 * Rescales each series so its base point reads 100.
 *
 * This is the honest replacement for a dual axis: two measures whose magnitudes
 * differ by orders of magnitude become comparable *rates of change* on one
 * scale, and the chart stops implying that a crossing point means anything.
 *
 * The base is `spec.indexBase` if given, otherwise each series' own first
 * non-null point. A series whose base is 0 or null cannot be indexed, and is
 * returned as all-null rather than as a division by zero.
 */
function indexSeries(frame: ChartFrame, spec: ChartSpec): ChartFrame {
  const { x, y, color } = spec.encoding;
  if (!y) return frame;

  const bases = new Map<string, number | null>();
  for (const [key, rows] of groupBy(frame.rows, color)) {
    let base: number | null = null;
    if (spec.indexBase !== undefined && x) {
      const hit = rows.find((r) => String(r[x]) === String(spec.indexBase));
      base = hit ? asNumber(hit[y]) : null;
    } else {
      for (const r of rows) {
        const n = asNumber(r[y]);
        if (n !== null) {
          base = n;
          break;
        }
      }
    }
    bases.set(key, base === 0 ? null : base);
  }

  return {
    ...frame,
    rows: frame.rows.map((row) => {
      const base = bases.get(String(row[color ?? ""] ?? "")) ?? null;
      const n = asNumber(row[y]);
      return withValue(row, y, base === null || n === null ? null : (n / base) * 100);
    }),
  };
}

/** `y / denominator × perCapitaBase`. The declared-denominator transform. */
function perCapita(frame: ChartFrame, spec: ChartSpec): ChartFrame {
  const { y } = spec.encoding;
  const den = spec.denominator;
  if (!y || !den) return frame;
  const base = spec.perCapitaBase ?? 1;
  return {
    ...frame,
    rows: frame.rows.map((row) => {
      const n = asNumber(row[y]);
      const d = asNumber(row[den]);
      return withValue(row, y, n === null || d === null || d === 0 ? null : (n / d) * base);
    }),
  };
}

/** Each point as a percentage of its x-slice total. */
function shareOfSlice(frame: ChartFrame, spec: ChartSpec): ChartFrame {
  const { x, y } = spec.encoding;
  if (!x || !y) return frame;
  const totals = new Map<string, number>();
  for (const [key, rows] of groupBy(frame.rows, x)) {
    let sum = 0;
    for (const r of rows) sum += asNumber(r[y]) ?? 0;
    totals.set(key, sum);
  }
  return {
    ...frame,
    rows: frame.rows.map((row) => {
      const total = totals.get(String(row[x] ?? "")) ?? 0;
      const n = asNumber(row[y]);
      return withValue(row, y, n === null || total === 0 ? null : (n / total) * 100);
    }),
  };
}

/**
 * Position within each x-slice, 1 = largest. Feeds the bump chart.
 *
 * Nulls do not receive a rank. A country that reported nothing this year is
 * absent from the ordering rather than placed last, which would read as "worst"
 * when it means "unknown".
 */
function rankWithinSlice(frame: ChartFrame, spec: ChartSpec): ChartFrame {
  const { x, y } = spec.encoding;
  if (!x || !y) return frame;
  const ranks = new Map<ChartRow, number | null>();
  for (const [, rows] of groupBy(frame.rows, x)) {
    const ranked = rows
      .filter((r) => asNumber(r[y]) !== null)
      .sort((a, b) => (asNumber(b[y]) ?? 0) - (asNumber(a[y]) ?? 0));
    for (const r of rows) ranks.set(r, null);
    ranked.forEach((r, i) => ranks.set(r, i + 1));
  }
  return {
    ...frame,
    rows: frame.rows.map((row) => withValue(row, y, ranks.get(row) ?? null)),
  };
}

/**
 * Applies `spec.transform`, and relabels the y column to match.
 *
 * The relabel is not cosmetic. An axis that reads "Reported cases" while
 * showing an index of 100 is the same class of defect as a dual axis: the
 * reader is told one thing and shown another. Every transform renames its own
 * output and states its unit.
 */
export function applyTransform(frame: ChartFrame, spec: ChartSpec): ChartFrame {
  const t = spec.transform ?? "raw";
  if (t === "raw") return frame;

  const out =
    t === "indexed"
      ? indexSeries(frame, spec)
      : t === "perCapita"
        ? perCapita(frame, spec)
        : t === "share"
          ? shareOfSlice(frame, spec)
          : rankWithinSlice(frame, spec);

  const y = spec.encoding.y;
  if (!y) return out;
  return { ...out, columns: out.columns.map((c) => (c.key === y ? relabel(c, spec) : c)) };
}

function relabel(column: ChartColumn, spec: ChartSpec): ChartColumn {
  switch (spec.transform) {
    case "indexed":
      return {
        ...column,
        label: `${column.label}, indexed`,
        unit: spec.indexBase === undefined ? "= 100 at first year" : `= 100 in ${spec.indexBase}`,
        decimals: 1,
      };
    case "perCapita": {
      const base = spec.perCapitaBase ?? 1;
      const per =
        base === 1_000_000 ? "per million" : base === 100_000 ? "per 100,000" : `per ${base}`;
      return { ...column, label: `${column.label}, ${per}`, unit: "", decimals: 2 };
    }
    case "share":
      return { ...column, label: `${column.label}, share`, unit: "%", decimals: 1 };
    case "rank":
      return { ...column, label: `${column.label}, rank`, unit: "", decimals: 0 };
    default:
      return column;
  }
}

/* ── Reshape ─────────────────────────────────────────────────────────────── */

/** A wide row: the x value plus one key per series. */
export interface WideRow extends ChartRow {
  __x: ChartValue;
}

/**
 * Long to wide, which is the only shape Recharts will plot.
 *
 * Long is the contract because a producer should not have to name 194 columns
 * to split by country. The pivot happens here, once, at the boundary, and is
 * tested rather than trusted.
 *
 * Duplicate (x, series) pairs keep the LAST value and do not silently sum. A
 * frame with duplicates is a producer bug, and summing would hide it behind a
 * plausible number.
 */
export function pivotToWide(
  frame: ChartFrame,
  spec: ChartSpec,
): { rows: WideRow[]; series: string[] } {
  const { x, y, color } = spec.encoding;
  if (!x || !y) return { rows: [], series: [] };

  const series = color ? distinctValues(frame, color).map(String) : [y];
  const byX = new Map<string, WideRow>();
  const order: string[] = [];

  for (const row of frame.rows) {
    const xv = row[x];
    if (xv === null || xv === undefined) continue;
    const key = String(xv);
    let wide = byX.get(key);
    if (!wide) {
      wide = { __x: xv } as WideRow;
      byX.set(key, wide);
      order.push(key);
    }
    wide[color ? String(row[color] ?? "") : y] = asNumber(row[y]);
  }

  /* Absent series become explicit nulls so a line breaks rather than joins
     across a gap it never had data for. */
  const rows = order.map((k) => {
    const wide = byX.get(k) as WideRow;
    for (const s of series) if (!(s in wide)) wide[s] = null;
    return wide;
  });

  return { rows, series };
}

/**
 * Two x-values per item, for the before/after forms.
 *
 * `dumbbell` and `slope` are only meaningful across exactly two x-slices. This
 * returns the first and last present for each item and reports which they were,
 * so the renderer can label them instead of assuming.
 */
export interface Pair {
  label: string;
  from: number | null;
  to: number | null;
}

export function pairsOf(
  frame: ChartFrame,
  spec: ChartSpec,
): { pairs: Pair[]; fromX: ChartValue; toX: ChartValue } {
  const { x, y, color } = spec.encoding;
  const xs = distinctValues(frame, x);
  const fromX = xs[0] ?? null;
  const toX = xs[xs.length - 1] ?? null;
  if (!x || !y) return { pairs: [], fromX, toX };

  const pairs: Pair[] = [];
  for (const [label, rows] of groupBy(frame.rows, color)) {
    const at = (target: ChartValue) => {
      const hit = rows.find((r) => String(r[x]) === String(target));
      return hit ? asNumber(hit[y]) : null;
    };
    pairs.push({ label, from: at(fromX), to: at(toX) });
  }
  return { pairs, fromX, toX };
}

/* ── Sorting ─────────────────────────────────────────────────────────────── */

/**
 * Row order per `spec.sort`. Nulls sort last under either direction, because
 * "not reported" is not a small value and must not lead a ranked bar.
 */
export function sortRows(frame: ChartFrame, spec: ChartSpec): ChartFrame {
  const sort = spec.sort;
  if (!sort) return frame;
  const key =
    sort.by === "y" ? spec.encoding.y : sort.by === "x" ? spec.encoding.x : spec.encoding.color;
  if (!key) return frame;

  const dir = sort.order === "asc" ? 1 : -1;
  const rows = [...frame.rows].sort((a, b) => {
    const na = asNumber(a[key]);
    const nb = asNumber(b[key]);
    if (na === null && nb === null) return 0;
    if (na === null) return 1;
    if (nb === null) return -1;
    if (na !== nb) return (na - nb) * dir;
    return String(a[key]).localeCompare(String(b[key])) * dir;
  });
  return { ...frame, rows };
}

/* ── Binning ─────────────────────────────────────────────────────────────── */

/**
 * Which of five bins a value falls in, or null when absent.
 *
 * Mirrors `choropleth.binOf` so the map and the heatmap bin identically, and a
 * value that reads "dark" on one reads "dark" on the other.
 */
export function binOf(value: number | null, breaks: readonly number[]): number | null {
  if (value === null || Number.isNaN(value)) return null;
  let bin = 0;
  for (const b of breaks) if (value >= b) bin += 1;
  return bin;
}

/**
 * Four breaks derived from the whole frame, for when the producer declared none.
 *
 * Declared breaks are strongly preferred and `CountryMetric` carries its own.
 * These are the fallback, and they are computed over EVERY row rather than the
 * visible facet or year, which is the property that matters: the scale must not
 * move when the reader scrubs. Quantiles rather than equal intervals, because
 * these distributions are heavily skewed and equal intervals put 190 countries
 * in one bin.
 */
export function fallbackBreaks(
  frame: ChartFrame,
  key: string | undefined,
): [number, number, number, number] | null {
  if (!key) return null;
  const values = frame.rows
    .map((r) => asNumber(r[key]))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
  if (values.length < 5) return null;
  const at = (q: number) => values[Math.min(values.length - 1, Math.floor(q * values.length))];
  return [at(0.2), at(0.4), at(0.6), at(0.8)];
}

/** The breaks a spec will actually use: declared first, derived only if absent. */
export function breaksFor(frame: ChartFrame, spec: ChartSpec): readonly number[] | null {
  return spec.breaks ?? fallbackBreaks(frame, spec.encoding.color);
}

/* ── Pipeline ────────────────────────────────────────────────────────────── */

/**
 * Everything a renderer needs, in the one order these steps may run.
 *
 * Transform before sort: a ranked bar of per-capita rates must rank the rates,
 * not the raw counts it was handed. Sorting first would rank by the wrong
 * number and look entirely plausible.
 */
export function prepare(frame: ChartFrame, spec: ChartSpec): ChartFrame {
  return sortRows(applyTransform(frame, spec), spec);
}

/** Convenience for the table twin and tooltips. */
export function columnsOf(frame: ChartFrame, keys: (string | undefined)[]): ChartColumn[] {
  return keys
    .map((k) => columnOf(frame, k))
    .filter((c): c is ChartColumn => c !== undefined);
}
