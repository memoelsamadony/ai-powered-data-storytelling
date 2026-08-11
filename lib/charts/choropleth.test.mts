import { test } from "node:test";
import assert from "node:assert/strict";
import { binOf, legendLabels, formatValue, valueAt, statsByIso } from "./choropleth.ts";

const BREAKS = [1, 10, 50, 200];

test("binOf: below the first break is bin 0", () => {
  assert.equal(binOf(0, BREAKS), 0);
  assert.equal(binOf(0.9, BREAKS), 0);
});

test("binOf: a value exactly on a break belongs to the higher bin", () => {
  assert.equal(binOf(1, BREAKS), 1);
  assert.equal(binOf(10, BREAKS), 2);
  assert.equal(binOf(50, BREAKS), 3);
  assert.equal(binOf(200, BREAKS), 4);
});

test("binOf: values above the top break clamp into the last bin", () => {
  assert.equal(binOf(200_000, BREAKS), 4);
});

test("binOf: absent values are null, not bin 0 — absence is not a low value", () => {
  assert.equal(binOf(null, BREAKS), null);
  assert.equal(binOf(undefined, BREAKS), null);
});

test("binOf: is independent of the data it is called with", () => {
  // The scrubber correctness rule: the same value must land in the same bin
  // regardless of what other values exist, so a country cannot change colour
  // because the year changed rather than its own figure.
  assert.equal(binOf(37, BREAKS), 2);
  assert.equal(binOf(37, BREAKS), 2);
});

test("legendLabels: one label per boundary, top bin marked open-ended", () => {
  assert.deepEqual(legendLabels(BREAKS), ["0", "1", "10", "50", "200+"]);
});

test("legendLabels: honours decimals", () => {
  assert.deepEqual(legendLabels([4.5, 9], 1), ["0.0", "4.5", "9.0+"]);
});

test("formatValue: thousands separators and fixed decimals", () => {
  assert.equal(formatValue(42938), "42,938");
  assert.equal(formatValue(71.66, 1), "71.7");
});

test("formatValue: absent values render as an en dash, never as zero", () => {
  assert.equal(formatValue(null), "—");
  assert.equal(formatValue(undefined), "—");
});

const STATS = [
  { iso3: "NGA", name: "Nigeria", series: { cov: [54, 33, 41, 54, 62] } },
  { iso3: "IND", name: "India", series: { cov: [56, 56, 74, 89, 93] } },
];

test("valueAt: reads the metric at the year index", () => {
  assert.equal(valueAt(STATS[0], "cov", 0), 54);
  assert.equal(valueAt(STATS[0], "cov", 4), 62);
});

test("valueAt: unknown metric or out-of-range year is null, not a throw", () => {
  assert.equal(valueAt(STATS[0], "nope", 0), null);
  assert.equal(valueAt(STATS[0], "cov", 99), null);
  assert.equal(valueAt(STATS[0], "cov", -1), null);
});

test("statsByIso: builds a lookup keyed by iso3", () => {
  const map = statsByIso(STATS);
  assert.equal(map.size, 2);
  assert.equal(map.get("IND")?.name, "India");
  assert.equal(map.get("ZZZ"), undefined);
});
