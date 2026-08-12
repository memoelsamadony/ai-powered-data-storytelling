/**
 * The dataset contract, and the data behind it.
 *
 * These types are canonical: `backend/storytelling/schemas.py` mirrors them,
 * and the pairing is the only thing keeping the wire format honest.
 *
 * The values used to be hand-written illustrative samples and are now generated
 * from the project's real tables - see ./generated/datasets.generated.ts. The
 * live API is still preferred at runtime (`getDatasets()` in lib/api.ts); this
 * module is what the page renders when the backend is unreachable, which is a
 * cached copy of the same figures rather than a different set of them.
 */

/* Explicit .ts extension: Node's type-stripping resolves value imports
   literally, so without it nothing that reaches this file can be tested with
   `node --test`. Type-only imports are erased and do not need one. */
import { generatedDatasets } from "./generated/datasets.generated.ts";

/**
 * "unknown" is what an uploaded table gets. Which direction a dataset tempts a
 * narrator is an editorial reading of what the numbers are ABOUT, and a file
 * uploaded a minute ago states nothing about that. Mirrors `FailureMode` in
 * backend/storytelling/schemas.py.
 */
export type FailureMode = "alarmism" | "over-optimism" | "unknown";

export interface DatasetSeriesPoint {
  year: number;
  /** Primary metric (e.g. measles cases in thousands, or under-5 mortality). */
  primary: number;
  /** Secondary metric (e.g. MCV1 coverage %, or life expectancy). */
  secondary: number;
}

/** One mapped or disclosed measure in a dataset's country table. */
export interface CountryMetric {
  /** Stable key; indexes into CountryStat.series. */
  key: string;
  label: string;
  unit: string;
  /** Picks the colour ramp: alarm-ward or calm-ward. */
  polarity: "higher-is-worse" | "higher-is-better";
  /**
   * Four ascending class breaks → five bins. Declared, never computed from the
   * visible year: with a year scrubber, recomputed bins would make a country
   * change colour because the scale moved rather than because its value did.
   */
  breaks: [number, number, number, number];
  /** Decimal places for display. Default 0. */
  decimals?: number;
  /** false = shown in the tooltip and table, never mapped. Default true. */
  mappable?: boolean;
}

/** One country's figures, columnar: metric key → value per countryYears index. */
export interface CountryStat {
  /** ISO 3166-1 alpha-3 — joins to WorldShape.id in lib/data/world-geo.ts. */
  iso3: string;
  name: string;
  series: Record<string, (number | null)[]>;
}

export interface Dataset {
  id: string;
  name: string;
  /** Compact name for chart rows and legends, where `name` is too long. */
  shortName: string;
  tagline: string;
  role: "primary" | "secondary";
  failureMode: FailureMode;
  failureModeLabel: string;
  rows: number;
  yearRange: string;
  granularity: string;
  sources: string[];
  description: string;
  /** Labels for the two plotted series. */
  primaryLabel: string;
  secondaryLabel: string;
  primaryUnit: string;
  secondaryUnit: string;
  /** A reference line on the secondary axis, if meaningful (e.g. herd immunity). */
  referenceLine?: { value: number; label: string };
  series: DatasetSeriesPoint[];
  /** A few preview rows shown as a table on the dataset/generate pages. */
  previewRows: { country: string; year: number; cases: string; coverage: string }[];
  /**
   * The map's own timeline — deliberately coarser than `series`, because the
   * country figures are anchored to years with published values rather than
   * interpolated across every point of the world trend.
   */
  countryYears?: number[];
  countryMetrics?: CountryMetric[];
  countryStats?: CountryStat[];
  /** Attribution shown under the map. */
  countrySourceNote?: string;
}

/**
 * A build-time snapshot of what `GET /api/datasets` serves, read from the
 * merged CSVs. Regenerate with `cd backend && python manage.py
 * build_frontend_data` after changing a table or a DatasetSpec.
 */
export const datasets: Dataset[] = generatedDatasets;

export function getDataset(id: string): Dataset | undefined {
  return datasets.find((d) => d.id === id);
}
