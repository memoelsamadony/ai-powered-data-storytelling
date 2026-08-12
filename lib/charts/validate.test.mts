import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSpec } from "./validate.ts";
import type { ChartFrame, ChartSpec } from "./spec.ts";

const FRAME: ChartFrame = {
  columns: [
    { key: "year", label: "Year", type: "temporal" },
    { key: "country", label: "Country", type: "nominal" },
    { key: "iso3", label: "ISO3", type: "geo" },
    { key: "cases", label: "Reported cases", type: "quantitative" },
    { key: "population", label: "Population", type: "quantitative" },
  ],
  rows: [
    { year: 2000, country: "A", iso3: "AAA", cases: 100, population: 1000 },
    { year: 2001, country: "A", iso3: "AAA", cases: 200, population: 1000 },
    { year: 2000, country: "B", iso3: "BBB", cases: 400, population: 4000 },
    { year: 2001, country: "B", iso3: "BBB", cases: 300, population: 4000 },
  ],
};

/** A frame with no denominator available, so the per-capita nudge stays quiet. */
const NO_POP: ChartFrame = {
  columns: FRAME.columns.filter((c) => c.key !== "population"),
  rows: FRAME.rows.map((row) => {
    const copy = { ...row };
    delete copy.population;
    return copy;
  }),
};

function spec(over: Partial<ChartSpec> = {}): ChartSpec {
  return {
    form: "line",
    encoding: { x: "year", y: "cases", color: "country" },
    title: "Cases by country",
    rationale: "A trend over time with two series.",
    ...over,
  };
}

const errs = (s: ChartSpec, f: ChartFrame = NO_POP) => validateSpec(s, f).errors.join(" | ");
const warns = (s: ChartSpec, f: ChartFrame = NO_POP) => validateSpec(s, f).warnings.join(" | ");

/* ── The happy path ──────────────────────────────────────────────────────── */

test("a well-formed spec validates clean", () => {
  const r = validateSpec(spec(), NO_POP);
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

/* ── Channels ────────────────────────────────────────────────────────────── */

test("a missing required channel is an error", () => {
  assert.match(errs(spec({ encoding: { x: "year" } })), /needs encoding\.y/);
});

test("a channel the form does not use is rejected, not ignored", () => {
  // A silently dropped channel renders a chart nobody asked for.
  assert.match(errs(spec({ encoding: { x: "year", y: "cases", geo: "iso3" } })), /does not use encoding\.geo/);
});

test("a channel naming a column that is not in the frame is an error", () => {
  assert.match(errs(spec({ encoding: { x: "year", y: "nope" } })), /not a column in the frame/);
});

test("the value axis must carry a measure, never a label", () => {
  assert.match(errs(spec({ encoding: { x: "year", y: "country" } })), /binds y to a quantitative column/);
});

test("heatmap is the exception: its y is the row dimension, its measure is colour", () => {
  const s = spec({ form: "heatmap", encoding: { x: "year", y: "country", color: "cases" } });
  assert.equal(validateSpec(s, NO_POP).ok, true);
  // And it still refuses a quantitative row dimension, which would be a scatter.
  const flipped = spec({ form: "heatmap", encoding: { x: "year", y: "cases", color: "cases" } });
  assert.match(errs(flipped), /binds y to/);
});

test("a form that bins colour rejects a nominal colour column", () => {
  const s = spec({ form: "heatmap", encoding: { x: "year", y: "cases", color: "country" } });
  assert.match(errs(s), /binds colour to a quantitative column/);
});

test("a geo channel must be a geo column", () => {
  const s = spec({ form: "choropleth", encoding: { geo: "country", color: "cases" } });
  assert.match(errs(s), /encoding\.geo must be a geo column/);
});

/* ── Modifiers ───────────────────────────────────────────────────────────── */

test("a modifier the form does not honour is an error", () => {
  // line has no stack; accepting it silently would draw an unstacked chart
  // while the caller believed it had asked for a stacked one.
  assert.match(errs(spec({ stack: "percent" })), /line does not honour "stack"/);
});

test("area honours stack, and bar honours baseline", () => {
  assert.equal(validateSpec(spec({ form: "area", stack: "percent" }), NO_POP).ok, true);
  assert.equal(
    validateSpec(spec({ form: "bar", encoding: { x: "country", y: "cases" }, baseline: 0 }), NO_POP).ok,
    true,
  );
});

/* ── Transforms ──────────────────────────────────────────────────────────── */

test("perCapita without a denominator is an error", () => {
  assert.match(errs(spec({ transform: "perCapita" })), /needs a denominator/);
});

test("perCapita with a non-quantitative denominator is an error", () => {
  const s = spec({ transform: "perCapita", denominator: "country" });
  assert.match(errs(s, FRAME), /must be quantitative/);
});

test("a denominator declared but unused is a warning, not silence", () => {
  assert.match(warns(spec({ denominator: "population" }), FRAME), /is unused/);
});

test("indexed needs an x to order by", () => {
  const s = spec({ transform: "indexed", form: "statTile", encoding: { y: "cases" } });
  assert.match(errs(s), /needs encoding\.x/);
});

/* ── The dropped-denominator check ───────────────────────────────────────── */

test("raw counts across places, with a population column available, warns", () => {
  // The rubric's own example of a misleading figure, checked rather than asked for.
  assert.match(warns(spec(), FRAME), /Consider transform "perCapita"/);
});

test("the same figure per capita does not warn", () => {
  const s = spec({ transform: "perCapita", denominator: "population", perCapitaBase: 1_000_000 });
  assert.equal(warns(s, FRAME), "");
});

test("no denominator in the frame means no nudge", () => {
  assert.equal(warns(spec(), NO_POP), "");
});

/* ── Form-specific rules ─────────────────────────────────────────────────── */

test("dumbbell and slope need exactly two x values", () => {
  const three: ChartFrame = {
    ...NO_POP,
    rows: [...NO_POP.rows, { year: 2002, country: "A", iso3: "AAA", cases: 50 }],
  };
  const s = spec({ form: "dumbbell" });
  assert.equal(validateSpec(s, NO_POP).ok, true);
  assert.match(errs(s, three), /needs exactly two x values; the frame has 3/);
});

test("bump without a rank transform warns", () => {
  assert.match(warns(spec({ form: "bump" })), /transform "rank"/);
});

test("emphasis must name a series that exists", () => {
  assert.match(errs(spec({ emphasis: "Nowhere" })), /is not a value in "country"/);
  assert.equal(validateSpec(spec({ emphasis: "B" }), NO_POP).ok, true);
});

const TEN_SERIES: ChartFrame = {
  ...NO_POP,
  rows: "ABCDEFGHIJ".split("").map((c, i) => ({ year: 2000, country: c, iso3: "X", cases: i })),
};

test("more series than the form carries is a warning, never more hues", () => {
  assert.match(warns(spec(), TEN_SERIES), /exceeds the 8 this form carries/);
});

test("a chart that already uses emphasis is not told to use emphasis", () => {
  // Found by running the validator over the real country data: emphasis already
  // collapses every series to two visual classes, so warning here is a false
  // positive, and false positives train readers to ignore warnings.
  assert.equal(warns(spec({ emphasis: "A" }), TEN_SERIES), "");
});

test("when faceted, the count that matters is the largest single panel", () => {
  // Ten series spread one-per-panel is ten readable charts, not one unreadable
  // one. Counting across all panels would warn about a figure that is fine.
  const faceted = spec({ encoding: { x: "year", y: "cases", color: "country", facet: "country" } });
  assert.equal(warns(faceted, TEN_SERIES), "");
});

test("breaks must be four strictly ascending numbers", () => {
  const s = spec({ form: "heatmap", encoding: { x: "year", y: "cases", color: "cases" }, breaks: [10, 5, 50, 200] });
  assert.match(errs(s), /strictly ascending/);
});

/* ── Copy and frame ──────────────────────────────────────────────────────── */

test("a spec with no rationale is rejected", () => {
  // A producer that cannot say why it chose a form has guessed, and the reader
  // is entitled to see which one happened.
  assert.match(errs(spec({ rationale: "  " })), /needs a rationale/);
});

test("a spec with no title is rejected", () => {
  assert.match(errs(spec({ title: "" })), /needs a title/);
});

test("an empty frame is an error, not an empty chart", () => {
  assert.match(errs(spec(), { ...NO_POP, rows: [] }), /no rows/);
});

test("an unknown form fails fast without consulting the rules table", () => {
  const r = validateSpec(spec({ form: "pie" as never }), NO_POP);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /Unknown chart form/);
});
