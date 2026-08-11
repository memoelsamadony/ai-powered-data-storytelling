/**
 * How a live backend dataset list and the generated snapshot are combined.
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
 * So: the backend wins for every id it serves, and the snapshot fills only the
 * ids it does not. Deliberately whole-dataset, never field-by-field. Both
 * sides now hold the same real figures, so the risk is no longer a fabricated
 * number but a stale one: a dataset carrying today's trend line over last
 * month's country table would be the harder thing to notice and the worse
 * thing to publish, and the source note under the map could no longer say
 * which of the two is on screen.
 *
 * Snapshot order is preserved, because it is the order the page argues in: the
 * alarmism dataset first, the over-optimism one second.
 */
export function mergeDatasets(live: Dataset[], mocks: Dataset[]): Dataset[] {
  const byId = new Map(live.map((d) => [d.id, normaliseDataset(d)]));
  const merged = mocks.map((mock) => byId.get(mock.id) ?? mock);
  const extra = live.filter((d) => !mocks.some((m) => m.id === d.id));
  return [...merged, ...extra.map(normaliseDataset)];
}
