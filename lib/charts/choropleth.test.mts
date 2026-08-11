import { test } from "node:test";
import assert from "node:assert/strict";
import {
  binOf,
  legendLabels,
  formatValue,
  valueAt,
  statsByIso,
  annualYears,
  interpolateSeries,
  steppedYears,
} from "./choropleth.ts";

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

test("formatValue: absent values render as n/a, never as zero", () => {
  assert.equal(formatValue(null), "n/a");
  assert.equal(formatValue(undefined), "n/a");
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

/* ── Annual expansion and the step tabs ──────────────────────────────────── */

const ANCHORS = [1990, 2000, 2010, 2019, 2023];

test("annualYears: fills every year between the first and last anchor", () => {
  const y = annualYears(ANCHORS);
  assert.equal(y.length, 34);
  assert.equal(y[0], 1990);
  assert.equal(y.at(-1), 2023);
  assert.deepEqual(y.slice(0, 4), [1990, 1991, 1992, 1993]);
});

test("annualYears: a single anchor yields just that year", () => {
  assert.deepEqual(annualYears([2020]), [2020]);
  assert.deepEqual(annualYears([]), []);
});

test("interpolateSeries: anchor years keep their exact published value", () => {
  const out = interpolateSeries(ANCHORS, [54, 33, 41, 54, 62], annualYears(ANCHORS));
  const y = annualYears(ANCHORS);
  for (const [i, a] of ANCHORS.entries()) {
    assert.equal(out[y.indexOf(a)], [54, 33, 41, 54, 62][i], `anchor ${a} must not drift`);
  }
});

test("interpolateSeries: midpoints are linear between the bracketing anchors", () => {
  const y = annualYears([1990, 2000]);
  const out = interpolateSeries([1990, 2000], [10, 20], y);
  assert.equal(out[y.indexOf(1995)], 15);
  assert.equal(out[y.indexOf(1991)], 11);
});

test("interpolateSeries: a null anchor makes its whole span null, never a guess", () => {
  const y = annualYears([1990, 2000, 2010]);
  const out = interpolateSeries([1990, 2000, 2010], [10, null, 30], y);
  assert.equal(out[y.indexOf(1995)], null);
  assert.equal(out[y.indexOf(2005)], null);
  assert.equal(out[y.indexOf(1990)], 10);
  assert.equal(out[y.indexOf(2010)], 30);
});

test("steppedYears: step 10 walks from the first anchor and always keeps the last year", () => {
  const y = annualYears(ANCHORS);
  assert.deepEqual(steppedYears(y, 10), [1990, 2000, 2010, 2020, 2023]);
});

test("steppedYears: step 1 returns every year", () => {
  const y = annualYears(ANCHORS);
  assert.deepEqual(steppedYears(y, 1), y);
});

test("steppedYears: step 5 and 3 land on the expected grid", () => {
  const y = annualYears(ANCHORS);
  assert.deepEqual(steppedYears(y, 5), [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2023]);
  assert.deepEqual(steppedYears(y, 3).slice(0, 4), [1990, 1993, 1996, 1999]);
  assert.equal(steppedYears(y, 3).at(-1), 2023);
});

test("steppedYears: never duplicates the last year when the grid already lands on it", () => {
  const y = annualYears([1990, 2000]);
  const out = steppedYears(y, 5);
  assert.deepEqual(out, [1990, 1995, 2000]);
  assert.equal(new Set(out).size, out.length);
});
