/**
 * How a backend dataset list and the typed mocks are combined.
 *
 * Kept apart from `lib/api.ts` so it can be unit-tested: that module reaches for
 * `next/navigation` and the `@/` alias, neither of which resolves under the bare
 * `node --test` harness.
 */

import type { Dataset } from "./datasets";

/** Tolerate a backend older than the fields the charts read. */
export function normaliseDataset(d: Dataset): Dataset {
  return { ...d, shortName: d.shortName ?? d.name };
}

/**
 * The backend serves only datasets whose CSV is collected, so taking its list
 * alone would silently drop the interface from two datasets to one, and the
 * whole argument of the project is that tone fails in *both* directions.
 *
 * So: the backend wins for every id it serves, and the mocks fill only the ids
 * it does not. Deliberately whole-dataset, never field-by-field. A dataset
 * carrying a real trend line under illustrative country figures would be the
 * harder thing to notice and the worse thing to publish, and the source note
 * under the map could no longer say which of the two is on screen.
 *
 * Mock order is preserved, because it is the order the page argues in: the
 * alarmism dataset first, the over-optimism one second.
 */
export function mergeDatasets(live: Dataset[], mocks: Dataset[]): Dataset[] {
  const byId = new Map(live.map((d) => [d.id, normaliseDataset(d)]));
  const merged = mocks.map((mock) => byId.get(mock.id) ?? mock);
  const extra = live.filter((d) => !mocks.some((m) => m.id === d.id));
  return [...merged, ...extra.map(normaliseDataset)];
}
