/**
 * Country-level measles figures for the map.
 *
 * ILLUSTRATIVE SAMPLE, exactly like `series` and `previewRows` in datasets.ts:
 * anchored to published WHO/WUENIC and Our World in Data values where those are
 * known, and plausibly interpolated where they are not. The real pipeline reads
 * the full merged table. Do not cite these numbers.
 *
 * Columnar: each array is one value per index of `measlesYears`.
 */
import type { CountryMetric, CountryStat } from "../datasets";

export const measlesYears = [1990, 2000, 2010, 2019, 2023];

export const measlesMetrics: CountryMetric[] = [
  {
    key: "cases_per_million",
    label: "Reported measles cases",
    unit: "per million people",
    polarity: "higher-is-worse",
    breaks: [1, 10, 50, 200],
  },
  {
    key: "mcv1_coverage",
    label: "MCV1 coverage",
    unit: "%",
    polarity: "higher-is-better",
    breaks: [70, 85, 92, 95],
  },
  {
    key: "cases",
    label: "Reported cases",
    unit: "cases",
    polarity: "higher-is-worse",
    breaks: [100, 1000, 10000, 50000],
    /* Never mapped: a choropleth of counts is a population map. */
    mappable: false,
  },
];

export const measlesCountryStats: CountryStat[] = [
  { iso3: "NGA", name: "Nigeria", series: {
    cases_per_million: [606, 233, 116, 231, 193],
    mcv1_coverage: [54, 33, 41, 54, 62],
    cases: [57600, 28100, 18400, 46500, 42938] } },
  { iso3: "ETH", name: "Ethiopia", series: {
    cases_per_million: [190, 95, 47, 75, 62],
    mcv1_coverage: [38, 33, 66, 60, 71],
    cases: [9100, 6400, 4300, 8600, 7600] } },
  { iso3: "COD", name: "DR Congo", series: {
    cases_per_million: [420, 210, 165, 350, 210],
    mcv1_coverage: [38, 46, 68, 57, 61],
    cases: [15400, 10200, 10900, 30500, 21400] } },
  { iso3: "EGY", name: "Egypt", series: {
    cases_per_million: [95, 12, 3, 1, 1],
    mcv1_coverage: [86, 98, 96, 94, 96],
    cases: [5400, 790, 250, 110, 105] } },
  { iso3: "ZAF", name: "South Africa", series: {
    cases_per_million: [61, 9, 38, 2, 4],
    mcv1_coverage: [79, 77, 65, 83, 85],
    cases: [2200, 400, 1900, 120, 250] } },
  { iso3: "KEN", name: "Kenya", series: {
    cases_per_million: [145, 40, 21, 16, 35],
    mcv1_coverage: [78, 75, 86, 89, 90],
    cases: [3400, 1300, 890, 840, 1950] } },
  { iso3: "TZA", name: "Tanzania", series: {
    cases_per_million: [130, 35, 9, 5, 11],
    mcv1_coverage: [81, 78, 91, 87, 89],
    cases: [3300, 1200, 410, 300, 730] } },
  { iso3: "SDN", name: "Sudan", series: {
    cases_per_million: [210, 88, 34, 60, 120],
    mcv1_coverage: [57, 47, 82, 88, 67],
    cases: [4900, 2600, 1200, 2600, 5700] } },
  { iso3: "AGO", name: "Angola", series: {
    cases_per_million: [260, 130, 52, 30, 44],
    mcv1_coverage: [38, 41, 75, 57, 63],
    cases: [2900, 2000, 1300, 960, 1600] } },
  { iso3: "IND", name: "India", series: {
    cases_per_million: [99, 62, 24, 14, 9],
    mcv1_coverage: [56, 56, 74, 89, 93],
    cases: [86000, 64300, 29300, 19500, 12800] } },
  { iso3: "CHN", name: "China", series: {
    cases_per_million: [70, 46, 7, 0, 0],
    mcv1_coverage: [98, 85, 99, 99, 95],
    cases: [80000, 58000, 9900, 580, 380] } },
  { iso3: "PAK", name: "Pakistan", series: {
    cases_per_million: [155, 90, 36, 50, 47],
    mcv1_coverage: [50, 59, 80, 75, 82],
    cases: [16500, 12800, 6100, 11200, 11600] } },
  { iso3: "IDN", name: "Indonesia", series: {
    cases_per_million: [95, 38, 70, 10, 4],
    mcv1_coverage: [58, 76, 78, 77, 91],
    cases: [17300, 8100, 17000, 2700, 1200] } },
  { iso3: "BGD", name: "Bangladesh", series: {
    cases_per_million: [175, 60, 10, 4, 15],
    mcv1_coverage: [65, 74, 94, 97, 93],
    cases: [18500, 7900, 1500, 680, 2600] } },
  { iso3: "PHL", name: "Philippines", series: {
    cases_per_million: [130, 33, 10, 440, 18],
    mcv1_coverage: [85, 79, 80, 68, 81],
    cases: [8200, 2600, 960, 48500, 2100] } },
  { iso3: "AFG", name: "Afghanistan", series: {
    cases_per_million: [320, 175, 110, 200, 260],
    mcv1_coverage: [20, 27, 62, 64, 70],
    cases: [3900, 3500, 3200, 7700, 11000] } },
  { iso3: "YEM", name: "Yemen", series: {
    cases_per_million: [280, 130, 55, 210, 830],
    mcv1_coverage: [49, 71, 60, 66, 67],
    cases: [3400, 2300, 1300, 6400, 31406] } },
  { iso3: "JPN", name: "Japan", series: {
    cases_per_million: [40, 3, 6, 6, 0],
    mcv1_coverage: [73, 96, 95, 98, 98],
    cases: [4900, 380, 740, 740, 28] } },
  { iso3: "KAZ", name: "Kazakhstan", series: {
    cases_per_million: [85, 14, 9, 120, 700],
    mcv1_coverage: [86, 99, 99, 98, 95],
    cases: [1400, 220, 150, 2300, 13800] } },
  { iso3: "DEU", name: "Germany", series: {
    cases_per_million: [60, 7, 9, 6, 0],
    mcv1_coverage: [85, 91, 96, 97, 96],
    cases: [4700, 580, 780, 500, 23] } },
  { iso3: "FRA", name: "France", series: {
    cases_per_million: [75, 17, 8, 40, 1],
    mcv1_coverage: [71, 84, 90, 90, 95],
    cases: [4300, 1000, 520, 2700, 83] } },
  { iso3: "GBR", name: "United Kingdom", series: {
    cases_per_million: [22, 2, 6, 3, 6],
    mcv1_coverage: [87, 88, 89, 92, 89],
    cases: [1300, 100, 380, 200, 380] } },
  { iso3: "ITA", name: "Italy", series: {
    cases_per_million: [90, 9, 15, 27, 1],
    mcv1_coverage: [43, 74, 90, 94, 94],
    cases: [5100, 520, 890, 1600, 43] } },
  { iso3: "UKR", name: "Ukraine", series: {
    cases_per_million: [55, 76, 1, 130, 7],
    mcv1_coverage: [90, 99, 56, 93, 85],
    cases: [2800, 3700, 45, 5600, 250] } },
  { iso3: "RUS", name: "Russia", series: {
    cases_per_million: [160, 22, 0, 30, 9],
    mcv1_coverage: [84, 97, 98, 97, 97],
    cases: [23700, 3200, 60, 4400, 1300] } },
  { iso3: "USA", name: "United States", series: {
    cases_per_million: [110, 0, 0, 4, 0],
    mcv1_coverage: [90, 91, 92, 92, 92],
    cases: [27800, 86, 63, 1274, 59] } },
  { iso3: "CAN", name: "Canada", series: {
    cases_per_million: [45, 6, 2, 3, 0],
    mcv1_coverage: [85, 96, 93, 90, 92],
    cases: [1200, 200, 99, 113, 12] } },
  { iso3: "MEX", name: "Mexico", series: {
    cases_per_million: [730, 0, 0, 1, 0],
    mcv1_coverage: [75, 96, 95, 99, 99],
    cases: [62000, 30, 0, 180, 7] } },
  { iso3: "BRA", name: "Brazil", series: {
    cases_per_million: [425, 4, 0, 91, 0],
    mcv1_coverage: [78, 99, 99, 93, 96],
    cases: [62000, 700, 68, 19300, 12] } },
  { iso3: "ARG", name: "Argentina", series: {
    cases_per_million: [60, 1, 0, 4, 0],
    mcv1_coverage: [93, 99, 95, 91, 94],
    cases: [1900, 40, 3, 180, 0] } },
  { iso3: "AUS", name: "Australia", series: {
    cases_per_million: [55, 6, 3, 9, 1],
    mcv1_coverage: [86, 91, 94, 95, 94],
    cases: [950, 110, 70, 240, 26] } },
  { iso3: "PNG", name: "Papua New Guinea", series: {
    cases_per_million: [240, 110, 30, 35, 55],
    mcv1_coverage: [67, 62, 56, 37, 46],
    cases: [1000, 600, 200, 310, 540] } },
];
