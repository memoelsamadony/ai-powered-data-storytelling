import { test } from "node:test";
import assert from "node:assert/strict";
import {
  band,
  histogram,
  linear,
  linePath,
  niceTicks,
  padDomain,
  quartiles,
  swarmOffsets,
} from "./svg.ts";

/* ── linear ──────────────────────────────────────────────────────────────── */

test("linear: maps the domain onto the range", () => {
  const s = linear([0, 100], [0, 200]);
  assert.equal(s(0), 0);
  assert.equal(s(50), 100);
  assert.equal(s(100), 200);
});

test("linear: an inverted range works, which is how a y-axis is built", () => {
  const y = linear([0, 10], [100, 0]);
  assert.equal(y(0), 100);
  assert.equal(y(10), 0);
});

test("linear: a zero-width domain centres rather than dividing by zero", () => {
  // A single-value series must render one centred mark, not vanish or throw.
  const s = linear([5, 5], [0, 100]);
  assert.equal(s(5), 50);
  assert.ok(Number.isFinite(s(999)));
});

/* ── band ────────────────────────────────────────────────────────────────── */

test("band: spaces categories evenly and leaves a gap between them", () => {
  const b = band(["a", "b", "c", "d"], [0, 400], 0.2);
  assert.equal(b.step, 100);
  assert.equal(b.bandwidth, 80);
  assert.equal(b("a"), 10);
  assert.equal(b("b"), 110);
});

test("band: bandwidth never collapses to zero", () => {
  // Adjacent fills need a surface gap; a scale that packs them flush would
  // force every caller to subtract one.
  const b = band(["a"], [0, 1], 0.99);
  assert.ok(b.bandwidth >= 1);
});

test("band: an unknown category lands at the first slot rather than NaN", () => {
  const b = band(["a", "b"], [0, 100]);
  assert.ok(Number.isFinite(b("nope")));
});

/* ── niceTicks ───────────────────────────────────────────────────────────── */

test("niceTicks: chooses round intervals a person would recognise", () => {
  assert.deepEqual(niceTicks(0, 100, 5), [0, 20, 40, 60, 80, 100]);
  assert.deepEqual(niceTicks(0, 10, 5), [0, 2, 4, 6, 8, 10]);
});

test("niceTicks: does not accumulate float error across steps", () => {
  // Repeated addition prints ticks like 0.30000000000000004.
  for (const t of niceTicks(0, 1, 5)) {
    assert.equal(String(t).length < 6, true, `${t} is not a clean tick`);
  }
});

test("niceTicks: degenerate ranges return the point, not an infinite loop", () => {
  assert.deepEqual(niceTicks(5, 5), [5]);
  assert.deepEqual(niceTicks(NaN, 10), []);
});

/* ── padDomain ───────────────────────────────────────────────────────────── */

test("padDomain: a domain including zero keeps zero as its floor", () => {
  // Nudging it below would put the baseline off the axis and make every bar
  // look truncated.
  assert.equal(padDomain([0, 100])[0], 0);
});

test("padDomain: negatives are padded outward on both sides", () => {
  const [lo, hi] = padDomain([-50, 50]);
  assert.ok(lo < -50);
  assert.ok(hi > 50);
});

test("padDomain: a zero-width domain still yields a usable range", () => {
  assert.deepEqual(padDomain([0, 0]), [0, 1]);
  const [lo, hi] = padDomain([7, 7]);
  assert.ok(hi > lo);
});

/* ── linePath ────────────────────────────────────────────────────────────── */

test("linePath: breaks at a null rather than drawing across the gap", () => {
  // Joining across a gap invents a reading that was never reported.
  const d = linePath([{ x: 0, y: 0 }, null, { x: 2, y: 2 }]);
  assert.equal((d.match(/M/g) ?? []).length, 2);
  assert.equal((d.match(/L/g) ?? []).length, 0);
});

test("linePath: consecutive points are joined", () => {
  const d = linePath([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]);
  assert.equal((d.match(/M/g) ?? []).length, 1);
  assert.equal((d.match(/L/g) ?? []).length, 2);
});

test("linePath: an all-null series is an empty path, not a malformed one", () => {
  assert.equal(linePath([null, null]), "");
});

/* ── quartiles ───────────────────────────────────────────────────────────── */

test("quartiles: interpolates between order statistics", () => {
  const q = quartiles([1, 2, 3, 4, 5]);
  assert.equal(q?.min, 1);
  assert.equal(q?.q1, 2);
  assert.equal(q?.median, 3);
  assert.equal(q?.q3, 4);
  assert.equal(q?.max, 5);
  assert.equal(q?.n, 5);
});

test("quartiles: nulls are dropped, never counted as zero", () => {
  const q = quartiles([null, 10, null, 20]);
  assert.equal(q?.n, 2);
  assert.equal(q?.min, 10);
});

test("quartiles: no values yields null rather than a box of zeros", () => {
  assert.equal(quartiles([null, null]), null);
  assert.equal(quartiles([]), null);
});

test("quartiles: unsorted input is sorted first", () => {
  assert.deepEqual(quartiles([5, 1, 3]), quartiles([1, 3, 5]));
});

/* ── histogram ───────────────────────────────────────────────────────────── */

test("histogram: counts into equal-width bins", () => {
  assert.deepEqual(histogram([0, 1, 2, 3], 4, [0, 4]), [1, 1, 1, 1]);
});

test("histogram: values outside the domain clamp instead of disappearing", () => {
  const h = histogram([-10, 100], 2, [0, 10]);
  assert.equal(h[0], 1);
  assert.equal(h[1], 1);
});

test("histogram: nulls are skipped", () => {
  assert.deepEqual(histogram([null, null], 2, [0, 10]), [0, 0]);
});

test("histogram: the top edge lands in the last bin, not past it", () => {
  const h = histogram([10], 2, [0, 10]);
  assert.equal(h[1], 1);
  assert.equal(h.length, 2);
});

/* ── swarmOffsets ────────────────────────────────────────────────────────── */

test("swarmOffsets: separated points all stay on the centre line", () => {
  assert.deepEqual(swarmOffsets([0, 100, 200], 3), [0, 0, 0]);
});

test("swarmOffsets: colliding points are pushed to alternating sides", () => {
  const offsets = swarmOffsets([50, 50, 50], 3);
  assert.equal(offsets[0], 0);
  assert.notEqual(offsets[1], 0);
  assert.notEqual(offsets[2], offsets[1]);
});

test("swarmOffsets: is deterministic, so a re-render is comparable", () => {
  // Jitter would reshuffle on every render and defeat comparison with the
  // chart the reader saw a moment ago.
  const positions = [10, 10, 11, 40, 41, 41];
  assert.deepEqual(swarmOffsets(positions, 3), swarmOffsets(positions, 3));
});
