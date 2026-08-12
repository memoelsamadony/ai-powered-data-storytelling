import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BIVARIATE,
  CATEGORICAL,
  DEEMPHASIS,
  DEEMPHASIS_INK,
  bivariateColor,
  bucketOf,
  colorsFor,
  drawOrder,
  foldTail,
  rampColor,
  strokeWidthFor,
  terciles,
} from "./scales.ts";
import type { ChartSpec } from "./spec.ts";

function spec(over: Partial<ChartSpec> = {}): ChartSpec {
  return {
    form: "line",
    encoding: { x: "year", y: "cases", color: "country" },
    title: "t",
    rationale: "r",
    ...over,
  };
}

test("slot 1 is not the alarm hue: alarm means something in this project", () => {
  assert.notEqual(CATEGORICAL[0], "#e0392b");
  assert.equal(CATEGORICAL[0], "#1e66b8");
});

test("the categorical set is exactly the four validated in tokens", () => {
  assert.deepEqual([...CATEGORICAL].sort(), ["#0e8f86", "#1e66b8", "#e0392b", "#e8a33d"]);
});

test("colour follows the entity, not its rank", () => {
  const all = colorsFor(spec(), ["Nigeria", "India", "Yemen"]);
  // Drop the biggest series; the survivors must keep their hues.
  const filtered = colorsFor(spec(), ["Nigeria", "India"]);
  assert.equal(filtered.get("Nigeria"), all.get("Nigeria"));
  assert.equal(filtered.get("India"), all.get("India"));
});

test("hues are assigned in fixed order and never cycled past the fourth", () => {
  const c = colorsFor(spec(), ["a", "b", "c", "d", "e", "f"]);
  assert.equal(c.get("a"), CATEGORICAL[0]);
  assert.equal(c.get("d"), CATEGORICAL[3]);
  // A fifth generated hue is indistinguishable under CVD, so the tail is grey.
  assert.equal(c.get("e"), DEEMPHASIS_INK);
  assert.equal(c.get("f"), DEEMPHASIS_INK);
});

test("emphasis puts one series in the accent and every other in the same grey", () => {
  const c = colorsFor(spec({ emphasis: "India" }), ["Nigeria", "India", "Yemen"]);
  assert.equal(c.get("India"), "#1e66b8");
  assert.equal(c.get("Nigeria"), DEEMPHASIS);
  assert.equal(c.get("Yemen"), DEEMPHASIS);
});

test("emphasis also thickens, so identity never rests on colour alone", () => {
  const s = spec({ emphasis: "India" });
  assert.ok(strokeWidthFor(s, "India") > strokeWidthFor(s, "Nigeria"));
  assert.equal(strokeWidthFor(spec(), "anything"), 2);
});

test("the emphasised series draws last, so it sits on top", () => {
  assert.deepEqual(drawOrder(spec({ emphasis: "b" }), ["a", "b", "c"]), ["a", "c", "b"]);
  assert.deepEqual(drawOrder(spec(), ["a", "b", "c"]), ["a", "b", "c"]);
});

test("foldTail keeps declared order and never re-ranks", () => {
  assert.deepEqual(foldTail(["a", "b", "c", "d"], 4), ["a", "b", "c", "d"]);
  assert.deepEqual(foldTail(["a", "b", "c", "d", "e"], 4), ["a", "b", "c", "Other"]);
  assert.equal(bucketOf("e", ["a", "b", "c"]), "Other");
  assert.equal(bucketOf("a", ["a", "b", "c"]), "a");
});

test("rampColor: absence returns null so the caller can hatch it", () => {
  assert.equal(rampColor(null), null);
});

test("rampColor: polarity picks the ramp, and bins clamp rather than overflow", () => {
  assert.equal(rampColor(0, "higher-is-worse"), "#fdeeea");
  assert.equal(rampColor(0, "higher-is-better"), "#e4f5f2");
  assert.equal(rampColor(99, "higher-is-worse"), "#8f1d12");
});

test("terciles collapse five bins to three, absence surviving as null", () => {
  assert.equal(terciles(null), null);
  assert.equal(terciles(0), 0);
  assert.equal(terciles(1), 0);
  assert.equal(terciles(2), 1);
  assert.equal(terciles(4), 2);
});

test("bivariate: both-high is the darkest cell, and either absent is null", () => {
  assert.equal(bivariateColor(4, 4), BIVARIATE[2][2]);
  assert.equal(bivariateColor(null, 4), null);
  assert.equal(bivariateColor(4, null), null);
});
