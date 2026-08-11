/**
 * Country-level child-mortality and life-expectancy figures for the map.
 *
 * ILLUSTRATIVE SAMPLE, exactly like `series` and `previewRows` in datasets.ts:
 * anchored to published WHO GHO and UN IGME values where those are known, and
 * plausibly interpolated where they are not. Do not cite these numbers.
 *
 * Both measures are already rates, so both are mappable.
 * Columnar: each array is one value per index of `whoYears`.
 */
import type { CountryMetric, CountryStat } from "../datasets";

export const whoYears = [1990, 2000, 2010, 2019, 2022];

export const whoMetrics: CountryMetric[] = [
  {
    key: "under5_mortality",
    label: "Under-5 mortality",
    unit: "per 1,000 live births",
    polarity: "higher-is-worse",
    breaks: [5, 15, 40, 80],
  },
  {
    key: "life_expectancy",
    label: "Life expectancy",
    unit: "years",
    polarity: "higher-is-better",
    breaks: [60, 67, 73, 79],
    decimals: 1,
  },
];

export const whoCountryStats: CountryStat[] = [
  { iso3: "NGA", name: "Nigeria", series: {
    under5_mortality: [213, 185, 137, 117, 107],
    life_expectancy: [46.1, 46.3, 51.3, 54.8, 53.6] } },
  { iso3: "ETH", name: "Ethiopia", series: {
    under5_mortality: [202, 143, 76, 50, 44],
    life_expectancy: [46.9, 51.9, 62.1, 67.8, 67.3] } },
  { iso3: "COD", name: "DR Congo", series: {
    under5_mortality: [186, 161, 111, 81, 76],
    life_expectancy: [48.0, 50.1, 56.5, 61.4, 62.4] } },
  { iso3: "EGY", name: "Egypt", series: {
    under5_mortality: [85, 47, 27, 21, 19],
    life_expectancy: [64.6, 68.6, 70.4, 71.9, 70.2] } },
  { iso3: "ZAF", name: "South Africa", series: {
    under5_mortality: [58, 74, 49, 34, 33],
    life_expectancy: [63.0, 55.9, 59.9, 65.6, 61.5] } },
  { iso3: "KEN", name: "Kenya", series: {
    under5_mortality: [99, 100, 59, 43, 38],
    life_expectancy: [57.7, 51.4, 62.6, 66.7, 63.7] } },
  { iso3: "TZA", name: "Tanzania", series: {
    under5_mortality: [165, 130, 75, 50, 45],
    life_expectancy: [50.9, 51.1, 61.0, 66.2, 66.9] } },
  { iso3: "SDN", name: "Sudan", series: {
    under5_mortality: [128, 106, 81, 59, 55],
    life_expectancy: [55.3, 59.1, 63.1, 65.3, 64.4] } },
  { iso3: "AGO", name: "Angola", series: {
    under5_mortality: [224, 204, 105, 73, 67],
    life_expectancy: [42.3, 46.5, 56.2, 62.2, 61.6] } },
  { iso3: "IND", name: "India", series: {
    under5_mortality: [126, 91, 58, 33, 29],
    life_expectancy: [58.5, 62.5, 67.0, 70.9, 67.2] } },
  { iso3: "CHN", name: "China", series: {
    under5_mortality: [54, 37, 16, 8, 7],
    life_expectancy: [68.9, 72.0, 75.2, 77.4, 78.6] } },
  { iso3: "PAK", name: "Pakistan", series: {
    under5_mortality: [139, 112, 89, 67, 62],
    life_expectancy: [60.1, 62.4, 65.1, 66.3, 66.4] } },
  { iso3: "IDN", name: "Indonesia", series: {
    under5_mortality: [84, 52, 33, 23, 21],
    life_expectancy: [62.6, 66.3, 68.4, 71.3, 68.3] } },
  { iso3: "BGD", name: "Bangladesh", series: {
    under5_mortality: [143, 88, 49, 30, 28],
    life_expectancy: [58.4, 65.4, 70.2, 73.6, 74.3] } },
  { iso3: "PHL", name: "Philippines", series: {
    under5_mortality: [57, 40, 31, 27, 25],
    life_expectancy: [65.3, 67.3, 68.6, 70.5, 69.3] } },
  { iso3: "AFG", name: "Afghanistan", series: {
    under5_mortality: [178, 130, 93, 62, 55],
    life_expectancy: [45.9, 55.0, 61.5, 63.6, 62.9] } },
  { iso3: "YEM", name: "Yemen", series: {
    under5_mortality: [122, 95, 60, 60, 58],
    life_expectancy: [57.6, 63.0, 67.1, 66.6, 63.8] } },
  { iso3: "JPN", name: "Japan", series: {
    under5_mortality: [6, 5, 3, 2, 2],
    life_expectancy: [78.8, 81.1, 82.9, 84.4, 84.0] } },
  { iso3: "KAZ", name: "Kazakhstan", series: {
    under5_mortality: [53, 44, 19, 10, 9],
    life_expectancy: [66.7, 64.9, 68.4, 73.2, 70.5] } },
  { iso3: "DEU", name: "Germany", series: {
    under5_mortality: [9, 5, 4, 4, 4],
    life_expectancy: [75.3, 78.2, 80.1, 81.3, 80.7] } },
  { iso3: "FRA", name: "France", series: {
    under5_mortality: [9, 5, 4, 4, 4],
    life_expectancy: [76.9, 79.1, 81.7, 82.9, 82.3] } },
  { iso3: "GBR", name: "United Kingdom", series: {
    under5_mortality: [10, 7, 5, 4, 4],
    life_expectancy: [75.7, 77.9, 80.4, 81.3, 80.4] } },
  { iso3: "ITA", name: "Italy", series: {
    under5_mortality: [9, 6, 4, 3, 3],
    life_expectancy: [77.1, 79.8, 82.0, 83.4, 82.8] } },
  { iso3: "UKR", name: "Ukraine", series: {
    under5_mortality: [19, 17, 11, 8, 7],
    life_expectancy: [70.1, 67.9, 70.3, 73.0, 68.6] } },
  { iso3: "RUS", name: "Russia", series: {
    under5_mortality: [22, 23, 12, 6, 5],
    life_expectancy: [68.9, 65.3, 68.9, 73.2, 69.4] } },
  { iso3: "USA", name: "United States", series: {
    under5_mortality: [11, 8, 7, 6, 6],
    life_expectancy: [75.3, 76.6, 78.5, 78.8, 76.4] } },
  { iso3: "CAN", name: "Canada", series: {
    under5_mortality: [8, 6, 5, 5, 4],
    life_expectancy: [77.4, 79.2, 81.2, 82.2, 81.7] } },
  { iso3: "MEX", name: "Mexico", series: {
    under5_mortality: [46, 27, 18, 14, 13],
    life_expectancy: [70.8, 74.1, 74.4, 75.1, 70.2] } },
  { iso3: "BRA", name: "Brazil", series: {
    under5_mortality: [62, 35, 19, 14, 14],
    life_expectancy: [65.3, 70.1, 73.4, 75.9, 72.8] } },
  { iso3: "ARG", name: "Argentina", series: {
    under5_mortality: [28, 20, 14, 9, 8],
    life_expectancy: [71.6, 74.1, 75.6, 76.6, 75.4] } },
  { iso3: "AUS", name: "Australia", series: {
    under5_mortality: [9, 6, 5, 4, 4],
    life_expectancy: [77.0, 79.6, 81.9, 83.0, 83.2] } },
  { iso3: "PNG", name: "Papua New Guinea", series: {
    under5_mortality: [89, 74, 56, 45, 42],
    life_expectancy: [57.5, 62.0, 64.5, 65.6, 65.4] } },
];
