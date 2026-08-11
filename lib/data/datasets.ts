/**
 * Dataset metadata + illustrative sample time-series for the two datasets the
 * project uses. Numbers are representative samples for the interface; the real
 * pipeline reads the full merged tables (see source attributions).
 */

/* Explicit .ts extensions: Node's type-stripping resolves value imports
   literally, so without them nothing that reaches this file can be tested with
   `node --test`. Type-only imports are erased and do not need one. */
import { measlesYears, measlesMetrics, measlesCountryStats } from "./country-stats/measles.ts";
import { whoYears, whoMetrics, whoCountryStats } from "./country-stats/who-health.ts";

export type FailureMode = "alarmism" | "over-optimism";

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

export const datasets: Dataset[] = [
  {
    id: "measles",
    name: "Measles × Vaccination Coverage",
    shortName: "Measles × MCV1",
    tagline: "Coverage stalled below herd immunity, and cases came back.",
    role: "primary",
    failureMode: "alarmism",
    failureModeLabel: "Natural failure mode: alarmism",
    rows: 9959,
    yearRange: "1980–2024",
    granularity: "country × year",
    sources: ["Our World in Data", "WHO", "WUENIC (MCV1)"],
    description:
      "Merged measles case counts with first-dose measles vaccine (MCV1) coverage and population, by country and year. Global coverage has plateaued below the ~95% herd-immunity threshold, and case counts rebounded, a story whose natural failure mode is alarmism, so the moderator must pull an over-alarmist narrative down without losing real urgency.",
    primaryLabel: "Reported measles cases",
    secondaryLabel: "MCV1 coverage",
    primaryUnit: "thousands",
    secondaryUnit: "%",
    referenceLine: { value: 95, label: "~95% herd-immunity line" },
    series: [
      { year: 1980, primary: 4211, secondary: 16 },
      { year: 1985, primary: 2899, secondary: 35 },
      { year: 1990, primary: 1378, secondary: 57 },
      { year: 1995, primary: 791, secondary: 63 },
      { year: 2000, primary: 854, secondary: 72 },
      { year: 2005, primary: 575, secondary: 76 },
      { year: 2010, primary: 340, secondary: 84 },
      { year: 2015, primary: 214, secondary: 85 },
      { year: 2018, primary: 354, secondary: 86 },
      { year: 2019, primary: 870, secondary: 85 },
      { year: 2020, primary: 132, secondary: 84 },
      { year: 2021, primary: 59, secondary: 81 },
      { year: 2022, primary: 171, secondary: 83 },
      { year: 2023, primary: 322, secondary: 83 },
      { year: 2024, primary: 359, secondary: 84 },
    ],
    previewRows: [
      { country: "World", year: 2019, cases: "869,770", coverage: "85%" },
      { country: "World", year: 2021, cases: "59,012", coverage: "81%" },
      { country: "World", year: 2023, cases: "321,582", coverage: "83%" },
      { country: "Nigeria", year: 2023, cases: "42,938", coverage: "62%" },
      { country: "India", year: 2023, cases: "39,617", coverage: "89%" },
      { country: "Yemen", year: 2023, cases: "31,406", coverage: "67%" },
    ],
    countryYears: measlesYears,
    countryMetrics: measlesMetrics,
    countryStats: measlesCountryStats,
    countrySourceNote: "WHO / WUENIC · illustrative country sample",
  },
  {
    id: "who-health",
    name: "WHO Global Health Observatory",
    shortName: "WHO child mortality",
    tagline: "Decades of progress, with a remaining gap and a COVID-era reversal.",
    role: "secondary",
    failureMode: "over-optimism",
    failureModeLabel: "Natural failure mode: over-optimism",
    rows: 7264,
    yearRange: "1990–2022",
    granularity: "country × year",
    sources: ["WHO Global Health Observatory", "UN IGME"],
    description:
      "Child-mortality and life-expectancy trends. This is a 'hope / progress' story (under-five mortality fell sharply and life expectancy rose), but its failure mode is the opposite: over-optimism and false reassurance. The moderator must keep the gravity (the remaining inequality, the COVID-era reversal) rather than flatten it, proving the agent calibrates in both directions.",
    primaryLabel: "Under-5 mortality",
    secondaryLabel: "Life expectancy",
    primaryUnit: "per 1,000 live births",
    secondaryUnit: "years",
    series: [
      { year: 1990, primary: 93, secondary: 64.0 },
      { year: 1995, primary: 85, secondary: 65.0 },
      { year: 2000, primary: 76, secondary: 66.5 },
      { year: 2005, primary: 65, secondary: 68.1 },
      { year: 2010, primary: 52, secondary: 70.1 },
      { year: 2015, primary: 43, secondary: 72.0 },
      { year: 2019, primary: 38, secondary: 73.1 },
      { year: 2020, primary: 38, secondary: 72.0 },
      { year: 2021, primary: 37, secondary: 71.0 },
      { year: 2022, primary: 37, secondary: 71.7 },
    ],
    previewRows: [
      { country: "World", year: 1990, cases: "93.0", coverage: "64.0 yrs" },
      { country: "World", year: 2022, cases: "37.0", coverage: "71.7 yrs" },
      { country: "Sub-Saharan Africa", year: 2022, cases: "70.5", coverage: "61.0 yrs" },
      { country: "Europe", year: 2022, cases: "4.3", coverage: "78.2 yrs" },
    ],
    countryYears: whoYears,
    countryMetrics: whoMetrics,
    countryStats: whoCountryStats,
    countrySourceNote: "WHO Global Health Observatory / UN IGME · illustrative country sample",
  },
];

export function getDataset(id: string): Dataset | undefined {
  return datasets.find((d) => d.id === id);
}
