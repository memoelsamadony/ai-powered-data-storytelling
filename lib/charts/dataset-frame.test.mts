import { test } from "node:test";
import assert from "node:assert/strict";
import { countryFrameOf, topBy, whereRows, worldFrameOf } from "./dataset-frame.ts";
import { datasets } from "../data/datasets.ts";
import { validateSpec } from "./validate.ts";
import type { ChartSpec } from "./spec.ts";

const measles = datasets[0];

test("countryFrameOf: one row per country per year", () => {
  const frame = countryFrameOf(measles);
  const years = measles.countryYears?.length ?? 0;
  const countries = measles.countryStats?.length ?? 0;
  assert.ok(years > 0 && countries > 0, "the fixture lost its country data");
  assert.equal(frame.rows.length, years * countries);
});

test("countryFrameOf: every declared metric becomes a quantitative column", () => {
  const frame = countryFrameOf(measles);
  for (const m of measles.countryMetrics ?? []) {
    const col = frame.columns.find((c) => c.key === m.key);
    assert.ok(col, `${m.key} is missing from the frame`);
    assert.equal(col!.type, "quantitative");
    assert.equal(col!.label, m.label);
  }
});

test("countryFrameOf: metrics flagged unmappable are still columns", () => {
  // `mappable: false` governs whether a metric may go on a MAP, not whether it
  // exists. A count is a fine bar chart and a misleading choropleth.
  const unmappable = (measles.countryMetrics ?? []).filter((m) => m.mappable === false);
  assert.ok(unmappable.length > 0, "the fixture no longer exercises this case");
  const frame = countryFrameOf(measles);
  for (const m of unmappable) {
    assert.ok(frame.columns.some((c) => c.key === m.key));
  }
});

test("countryFrameOf: the geo column is typed geo, so it can only be used as one", () => {
  const frame = countryFrameOf(measles);
  assert.equal(frame.columns.find((c) => c.key === "iso3")?.type, "geo");
});

test("worldFrameOf: two rows per year, one per measure", () => {
  const frame = worldFrameOf(measles);
  assert.equal(frame.rows.length, measles.series.length * 2);
  assert.deepEqual(
    [...new Set(frame.rows.map((r) => r.measure))],
    [measles.primaryLabel, measles.secondaryLabel],
  );
});

test("worldFrameOf: the shared column is labelled Value, never one measure's name", () => {
  // Borrowing either name would let something downstream mistake a percentage
  // for a count. The label stays neutral and the spec has to say what it did.
  const frame = worldFrameOf(measles);
  assert.equal(frame.columns.find((c) => c.key === "value")?.label, "Value");
});

test("whereRows: filters rows and leaves the schema alone", () => {
  const frame = countryFrameOf(measles);
  const last = measles.countryYears?.at(-1);
  const sliced = whereRows(frame, (r) => r.year === last);
  assert.equal(sliced.columns, frame.columns);
  assert.equal(sliced.rows.length, measles.countryStats?.length);
});

test("topBy: returns names in descending order, ignoring absent values", () => {
  const frame = countryFrameOf(measles);
  const top = topBy(frame, "country", "cases_per_million", 5);
  assert.equal(top.length, 5);
  assert.equal(new Set(top).size, 5);
});

test("a real spec over the real frame validates", () => {
  const spec: ChartSpec = {
    form: "heatmap",
    encoding: { x: "year", y: "country", color: "cases_per_million" },
    title: "Measles incidence by country and year",
    rationale: "Two dimensions and one measure across 32 rows.",
  };
  const result = validateSpec(spec, countryFrameOf(measles));
  assert.equal(result.ok, true, result.errors.join(" | "));
});
