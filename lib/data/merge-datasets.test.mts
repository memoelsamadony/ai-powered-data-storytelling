import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeDatasets, normaliseDataset } from "./merge-datasets.ts";
import type { Dataset } from "./datasets.ts";

/** Only the fields these functions actually read; the rest is chart furniture. */
const make = (id: string, extra: Partial<Dataset> = {}): Dataset =>
  ({
    id,
    name: `${id} long name`,
    shortName: `${id} short`,
    ...extra,
  }) as Dataset;

test("a dataset the backend serves replaces its mock", () => {
  const merged = mergeDatasets([make("measles", { rows: 9959 })], [make("measles", { rows: 12 })]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].rows, 9959);
});

test("a dataset the backend does not serve keeps its mock", () => {
  const merged = mergeDatasets([make("measles")], [make("measles"), make("who-health")]);
  assert.deepEqual(
    merged.map((d) => d.id),
    ["measles", "who-health"],
  );
});

test("the page keeps both datasets when the backend serves only one", () => {
  // The argument needs a story that tempts alarmism and one that tempts false
  // reassurance. Dropping to a single dataset would take the argument with it.
  assert.equal(mergeDatasets([make("measles")], [make("measles"), make("who-health")]).length, 2);
});

test("an empty backend list falls back to every mock, in order", () => {
  const mocks = [make("measles"), make("who-health")];
  assert.deepEqual(mergeDatasets([], mocks), mocks);
});

test("mock order is preserved, whatever order the backend answers in", () => {
  const merged = mergeDatasets(
    [make("who-health"), make("measles")],
    [make("measles"), make("who-health")],
  );
  assert.deepEqual(
    merged.map((d) => d.id),
    ["measles", "who-health"],
  );
});

test("a dataset only the backend knows is appended, not dropped", () => {
  const merged = mergeDatasets([make("measles"), make("pertussis")], [make("measles")]);
  assert.deepEqual(
    merged.map((d) => d.id),
    ["measles", "pertussis"],
  );
});

test("merging is whole-dataset, never field-by-field", () => {
  // The invariant the map's honesty rests on. A live dataset without country
  // figures must render no map, rather than inheriting the illustrative ones
  // and presenting them under a real trend line, where the source note below
  // could no longer say which of the two is on screen.
  const live = make("measles", { rows: 9959 });
  const mock = make("measles", {
    rows: 12,
    countryStats: [{ iso3: "NGA", name: "Nigeria", series: {} }],
    countryYears: [1990],
    countrySourceNote: "illustrative country sample",
  });

  const [merged] = mergeDatasets([live], [mock]);

  assert.equal(merged.rows, 9959);
  assert.equal(merged.countryStats, undefined);
  assert.equal(merged.countryYears, undefined);
  assert.equal(merged.countrySourceNote, undefined);
});

test("normaliseDataset: a backend without shortName falls back to the full name", () => {
  // The charts label rows with shortName; without this they render blank.
  const d = normaliseDataset({ id: "x", name: "Long name" } as Dataset);
  assert.equal(d.shortName, "Long name");
});

test("normaliseDataset: a real shortName is left alone", () => {
  assert.equal(normaliseDataset(make("measles")).shortName, "measles short");
});
