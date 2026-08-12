import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asNumber,
  applyTransform,
  binOf,
  distinctValues,
  extentOf,
  facets,
  fallbackBreaks,
  formatCell,
  pairsOf,
  pivotToWide,
  prepare,
  sortRows,
} from "./frame.ts";
import type { ChartFrame, ChartSpec } from "./spec.ts";

/* Two countries of very different size, three years, one gap.
   B is 4x A's population, which is what makes the per-capita cases interesting:
   B leads on raw counts and does not lead on rates. */
const FRAME: ChartFrame = {
  columns: [
    { key: "year", label: "Year", type: "temporal" },
    { key: "country", label: "Country", type: "nominal" },
    { key: "cases", label: "Reported cases", type: "quantitative" },
    { key: "population", label: "Population", type: "quantitative" },
  ],
  rows: [
    { year: 2000, country: "A", cases: 100, population: 1000 },
    { year: 2001, country: "A", cases: 200, population: 1000 },
    { year: 2002, country: "A", cases: 50, population: 1000 },
    { year: 2000, country: "B", cases: 400, population: 4000 },
    { year: 2001, country: "B", cases: 300, population: 4000 },
    { year: 2002, country: "B", cases: null, population: 4000 },
  ],
};

function spec(over: Partial<ChartSpec> = {}): ChartSpec {
  return {
    form: "line",
    encoding: { x: "year", y: "cases", color: "country" },
    title: "t",
    rationale: "r",
    ...over,
  };
}

const yOf = (f: ChartFrame, country: string, year: number) =>
  f.rows.find((r) => r.country === country && r.year === year)?.cases ?? null;

/* ── Cells ───────────────────────────────────────────────────────────────── */

test("asNumber: empty string and null are absent, not zero", () => {
  assert.equal(asNumber(null), null);
  assert.equal(asNumber(""), null);
  assert.equal(asNumber(undefined), null);
  assert.equal(asNumber("12.5"), 12.5);
  assert.equal(asNumber(0), 0);
});

test("formatCell: absent reads n/a and never a zero", () => {
  assert.equal(formatCell(null), "n/a");
  assert.equal(formatCell(0, { key: "k", label: "l", type: "quantitative" }), "0");
});

test("formatCell: a percent unit is suffixed without a space, others with one", () => {
  assert.equal(formatCell(84, { key: "k", label: "l", type: "quantitative", unit: "%" }), "84%");
  assert.equal(
    formatCell(84, { key: "k", label: "l", type: "quantitative", unit: "years" }),
    "84 years",
  );
});

/* ── Access ──────────────────────────────────────────────────────────────── */

test("distinctValues: first-appearance order, skipping absences", () => {
  assert.deepEqual(distinctValues(FRAME, "country"), ["A", "B"]);
  assert.deepEqual(distinctValues(FRAME, "year"), [2000, 2001, 2002]);
  assert.deepEqual(distinctValues(FRAME, "cases").includes(null), false);
});

test("extentOf: ignores nulls", () => {
  assert.deepEqual(extentOf(FRAME, "cases"), [50, 400]);
});

test("facets: an unfaceted spec still yields exactly one panel", () => {
  const panels = facets(FRAME, spec());
  assert.equal(panels.length, 1);
  assert.equal(panels[0].frame.rows.length, 6);
});

test("facets: one panel per distinct value, columns shared", () => {
  const panels = facets(FRAME, spec({ encoding: { x: "year", y: "cases", facet: "country" } }));
  assert.deepEqual(
    panels.map((p) => p.label),
    ["A", "B"],
  );
  assert.equal(panels[0].frame.rows.length, 3);
  assert.equal(panels[0].frame.columns, FRAME.columns);
});

/* ── Transforms ──────────────────────────────────────────────────────────── */

test("indexed: each series is scaled against its OWN first point", () => {
  const out = applyTransform(FRAME, spec({ transform: "indexed" }));
  assert.equal(yOf(out, "A", 2000), 100);
  assert.equal(yOf(out, "A", 2001), 200);
  assert.equal(yOf(out, "A", 2002), 50);
  // B starts at 400, so its own base is 400 and 300 reads as 75.
  assert.equal(yOf(out, "B", 2000), 100);
  assert.equal(yOf(out, "B", 2001), 75);
});

test("indexed: a null stays null rather than becoming a zero baseline", () => {
  const out = applyTransform(FRAME, spec({ transform: "indexed" }));
  assert.equal(yOf(out, "B", 2002), null);
});

test("indexed: honours an explicit indexBase year", () => {
  const out = applyTransform(FRAME, spec({ transform: "indexed", indexBase: 2001 }));
  assert.equal(yOf(out, "A", 2001), 100);
  assert.equal(yOf(out, "A", 2000), 50);
});

test("perCapita: divides by the declared denominator and scales", () => {
  const out = applyTransform(
    FRAME,
    spec({ transform: "perCapita", denominator: "population", perCapitaBase: 1000 }),
  );
  // The whole point: B leads on raw counts (400 vs 100) and ties on the rate.
  assert.equal(yOf(out, "A", 2000), 100);
  assert.equal(yOf(out, "B", 2000), 100);
  assert.equal(yOf(out, "B", 2001), 75);
});

test("perCapita: a zero denominator is null, never an infinity", () => {
  const zero: ChartFrame = {
    ...FRAME,
    rows: [{ year: 2000, country: "A", cases: 100, population: 0 }],
  };
  const out = applyTransform(
    zero,
    spec({ transform: "perCapita", denominator: "population", perCapitaBase: 1000 }),
  );
  assert.equal(out.rows[0].cases, null);
});

test("share: each point as a percentage of its own x-slice", () => {
  const out = applyTransform(FRAME, spec({ transform: "share" }));
  assert.equal(yOf(out, "A", 2000), 20);
  assert.equal(yOf(out, "B", 2000), 80);
});

test("rank: 1 is the largest in the slice", () => {
  const out = applyTransform(FRAME, spec({ transform: "rank" }));
  assert.equal(yOf(out, "B", 2000), 1);
  assert.equal(yOf(out, "A", 2000), 2);
});

test("rank: an unreported value gets no rank, rather than being placed last", () => {
  const out = applyTransform(FRAME, spec({ transform: "rank" }));
  // B reported nothing in 2002. Ranking it last would read as "worst" when it
  // means "unknown", so it is null and A takes rank 1 alone.
  assert.equal(yOf(out, "B", 2002), null);
  assert.equal(yOf(out, "A", 2002), 1);
});

test("a transform relabels its own y column, so the axis cannot lie", () => {
  const idx = applyTransform(FRAME, spec({ transform: "indexed" }));
  const col = idx.columns.find((c) => c.key === "cases");
  assert.equal(col?.label, "Reported cases, indexed");
  assert.equal(col?.unit, "= 100 at first year");

  const pc = applyTransform(
    FRAME,
    spec({ transform: "perCapita", denominator: "population", perCapitaBase: 1_000_000 }),
  );
  assert.equal(pc.columns.find((c) => c.key === "cases")?.label, "Reported cases, per million");
});

test("raw returns the frame untouched", () => {
  assert.equal(applyTransform(FRAME, spec()), FRAME);
});

/* ── Reshape ─────────────────────────────────────────────────────────────── */

test("pivotToWide: one row per x, one key per series", () => {
  const { rows, series } = pivotToWide(FRAME, spec());
  assert.deepEqual(series, ["A", "B"]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { __x: 2000, A: 100, B: 400 });
});

test("pivotToWide: a missing series becomes an explicit null so the line breaks", () => {
  const sparse: ChartFrame = { ...FRAME, rows: FRAME.rows.filter((r) => r.year !== 2002 || r.country !== "B") };
  const { rows } = pivotToWide(sparse, spec());
  assert.equal(rows[2].B, null);
  assert.ok("B" in rows[2]);
});

test("pivotToWide: duplicate (x, series) keeps the last and never sums", () => {
  const dupe: ChartFrame = {
    ...FRAME,
    rows: [
      { year: 2000, country: "A", cases: 100, population: 1000 },
      { year: 2000, country: "A", cases: 999, population: 1000 },
    ],
  };
  // Summing would hide a producer bug behind a plausible 1099.
  assert.equal(pivotToWide(dupe, spec()).rows[0].A, 999);
});

test("pairsOf: reports the two endpoints it actually used", () => {
  const { pairs, fromX, toX } = pairsOf(FRAME, spec());
  assert.equal(fromX, 2000);
  assert.equal(toX, 2002);
  assert.deepEqual(pairs, [
    { label: "A", from: 100, to: 50 },
    { label: "B", from: 400, to: null },
  ]);
});

/* ── Sorting ─────────────────────────────────────────────────────────────── */

test("sortRows: nulls sort last under both directions", () => {
  const desc = sortRows(FRAME, spec({ sort: { by: "y", order: "desc" } }));
  assert.equal(desc.rows[desc.rows.length - 1].cases, null);
  const asc = sortRows(FRAME, spec({ sort: { by: "y", order: "asc" } }));
  assert.equal(asc.rows[asc.rows.length - 1].cases, null);
  assert.equal(asc.rows[0].cases, 50);
});

/* ── Binning ─────────────────────────────────────────────────────────────── */

test("binOf: matches choropleth.binOf, so map and heatmap bin identically", () => {
  const breaks = [1, 10, 50, 200];
  assert.equal(binOf(0, breaks), 0);
  assert.equal(binOf(10, breaks), 2);
  assert.equal(binOf(200_000, breaks), 4);
  assert.equal(binOf(null, breaks), null);
});

test("fallbackBreaks: ascend, and are computed over every row not a visible slice", () => {
  const breaks = fallbackBreaks(FRAME, "cases");
  assert.ok(breaks);
  assert.ok(breaks!.every((b, i) => i === 0 || b >= breaks![i - 1]));
  // Same answer from a row-reordered frame: the scale cannot move under the reader.
  const shuffled: ChartFrame = { ...FRAME, rows: [...FRAME.rows].reverse() };
  assert.deepEqual(fallbackBreaks(shuffled, "cases"), breaks);
});

test("fallbackBreaks: too few values yields null rather than a fake scale", () => {
  assert.equal(fallbackBreaks({ ...FRAME, rows: FRAME.rows.slice(0, 2) }, "cases"), null);
});

/* ── Pipeline ────────────────────────────────────────────────────────────── */

test("prepare: transforms BEFORE sorting, so a ranked bar ranks the right number", () => {
  const out = prepare(
    FRAME,
    spec({
      transform: "perCapita",
      denominator: "population",
      perCapitaBase: 1000,
      sort: { by: "y", order: "desc" },
    }),
  );
  // Sorting first would put B/2000 on top on its raw count of 400. Per capita,
  // A/2001 leads at 200. Getting this order wrong looks entirely plausible.
  assert.equal(out.rows[0].country, "A");
  assert.equal(out.rows[0].year, 2001);
  assert.equal(out.rows[0].cases, 200);
});
