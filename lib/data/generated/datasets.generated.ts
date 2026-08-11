/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Written by `python manage.py build_frontend_data` from the merged CSVs in
 * emotional-tone-moderation/data/, through the same `get_dataset()` the API
 * serves. Every figure here is read from those tables; none is illustrative,
 * interpolated or hand-written, and a year the source does not publish is
 * `null` rather than a plausible number.
 *
 * This is the offline fallback for `getDatasets()`. It can only be *stale*
 * (a CSV changed and nobody regenerated), never invented - and
 * `test_generated_frontend_data_is_current` fails the build if it is stale.
 *
 * Regenerate rather than edit:
 *     cd backend && python manage.py build_frontend_data
 */

import type { Dataset } from "../datasets";

export const generatedDatasets: Dataset[] = [
  {
    "id": "measles",
    "name": "Measles × Vaccination Coverage",
    "shortName": "Measles × MCV1",
    "tagline": "Coverage stalled below herd immunity, and cases came back.",
    "role": "primary",
    "failureMode": "alarmism",
    "failureModeLabel": "Natural failure mode: alarmism",
    "rows": 9959,
    "yearRange": "1980-2024",
    "granularity": "country × year",
    "sources": ["Our World in Data", "WHO", "WUENIC (MCV1)"],
    "description": "Merged measles case counts with first-dose measles vaccine (MCV1) coverage and population, by country and year. Global coverage has plateaued below the ~95% herd-immunity threshold, and case counts rebounded, a story whose natural failure mode is alarmism, so the moderator must pull an over-alarmist narrative down without losing real urgency.",
    "primaryLabel": "Reported measles cases",
    "secondaryLabel": "MCV1 coverage",
    "primaryUnit": "thousands",
    "secondaryUnit": "%",
    "referenceLine": {"value": 95.0, "label": "~95% herd-immunity line"},
    "series": [
      {"year": 1980, "primary": 3852.2, "secondary": 16.0},
      {"year": 1985, "primary": 2819.6, "secondary": 46.0},
      {"year": 1990, "primary": 1325.1, "secondary": 73.0},
      {"year": 1995, "primary": 720.4, "secondary": 73.0},
      {"year": 2000, "primary": 853.5, "secondary": 71.0},
      {"year": 2005, "primary": 585.7, "secondary": 77.0},
      {"year": 2010, "primary": 343.8, "secondary": 84.0},
      {"year": 2015, "primary": 214.8, "secondary": 84.0},
      {"year": 2018, "primary": 359.3, "secondary": 86.0},
      {"year": 2019, "primary": 873.4, "secondary": 86.0},
      {"year": 2020, "primary": 159.2, "secondary": 83.0},
      {"year": 2021, "primary": 123.2, "secondary": 81.0},
      {"year": 2022, "primary": 206.8, "secondary": 83.0},
      {"year": 2023, "primary": 669.1, "secondary": 83.0},
      {"year": 2024, "primary": 675.5, "secondary": 84.0},
    ],
    "previewRows": [
      {"country": "Germany", "year": 2024, "cases": "645", "coverage": "96%"},
      {"country": "Nigeria", "year": 2024, "cases": "14,999", "coverage": "57%"},
      {"country": "United States", "year": 2024, "cases": "n/a", "coverage": "92%"},
      {"country": "India", "year": 2024, "cases": "18,530", "coverage": "97%"},
    ],
    "countryYears": [1990, 2000, 2010, 2019, 2023],
    "countryMetrics": [
      {
        "key": "cases_per_million",
        "label": "Reported measles cases",
        "unit": "per million people",
        "polarity": "higher-is-worse",
        "breaks": [1.0, 10.0, 50.0, 200.0],
        "decimals": 1,
        "mappable": true,
      },
      {
        "key": "mcv1_coverage",
        "label": "MCV1 coverage",
        "unit": "%",
        "polarity": "higher-is-better",
        "breaks": [70.0, 85.0, 92.0, 95.0],
        "decimals": 0,
        "mappable": true,
      },
      {
        "key": "cases",
        "label": "Reported cases",
        "unit": "cases",
        "polarity": "higher-is-worse",
        "breaks": [100.0, 1000.0, 10000.0, 50000.0],
        "decimals": 0,
        "mappable": false,
      },
    ],
    "countryStats": [
      {
        "iso3": "AFG",
        "name": "Afghanistan",
        "series": {
          "cases_per_million": [133.6, 324.5, 70.3, 9.3, 67.3],
          "mcv1_coverage": [20.0, 27.0, 62.0, 57.0, 55.0],
          "cases": [1609.0, 6532.0, 1989.0, 353.0, 2792.0],
        },
      },
      {
        "iso3": "ALB",
        "name": "Albania",
        "series": {
          "cases_per_million": [null, 209.1, 3.4, 169.2, 4.6],
          "mcv1_coverage": [88.0, 95.0, 99.0, 95.0, 83.0],
          "cases": [null, 662.0, 10.0, 488.0, 13.0],
        },
      },
      {
        "iso3": "DZA",
        "name": "Algeria",
        "series": {
          "cases_per_million": [70.8, null, 2.9, 59.7, 4.4],
          "mcv1_coverage": [83.0, 80.0, 95.0, 80.0, 99.0],
          "cases": [1796.0, null, 103.0, 2585.0, 203.0],
        },
      },
      {
        "iso3": "ASM",
        "name": "American Samoa",
        "series": {
          "cases_per_million": [10673.2, 17.6, null, null, null],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [498.0, 1.0, null, null, null],
        },
      },
      {
        "iso3": "AND",
        "name": "Andorra",
        "series": {
          "cases_per_million": [null, 30.4, 0.0, 0.0, 0.0],
          "mcv1_coverage": [null, 97.0, 99.0, 99.0, 99.0],
          "cases": [null, 2.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "AGO",
        "name": "Angola",
        "series": {
          "cases_per_million": [2500.3, 137.0, 51.1, 92.3, 95.5],
          "mcv1_coverage": [38.0, 41.0, 59.0, 59.0, 63.0],
          "cases": [29069.0, 2219.0, 1190.0, 2987.0, 3508.0],
        },
      },
      {
        "iso3": "AIA",
        "name": "Anguilla",
        "series": {
          "cases_per_million": [1781.0, 0.0, null, 0.0, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [15.0, 0.0, null, 0.0, 0.0],
        },
      },
      {
        "iso3": "ATG",
        "name": "Antigua and Barbuda",
        "series": {
          "cases_per_million": [0.0, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [89.0, 95.0, 98.0, 97.0, 94.0],
          "cases": [0.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "ARG",
        "name": "Argentina",
        "series": {
          "cases_per_million": [60.0, 0.2, 0.4, 2.9, 0.0],
          "mcv1_coverage": [93.0, 91.0, 95.0, 86.0, 80.0],
          "cases": [1967.0, 6.0, 17.0, 130.0, 0.0],
        },
      },
      {
        "iso3": "ARM",
        "name": "Armenia",
        "series": {
          "cases_per_million": [247.5, 4.8, 0.7, 2.4, 188.2],
          "mcv1_coverage": [null, 92.0, 97.0, 95.0, 96.0],
          "cases": [879.0, 15.0, 2.0, 7.0, 554.0],
        },
      },
      {
        "iso3": "ABW",
        "name": "Aruba",
        "series": {
          "cases_per_million": [null, null, null, 9.3, null],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [null, null, null, 1.0, null],
        },
      },
      {
        "iso3": "AUS",
        "name": "Australia",
        "series": {
          "cases_per_million": [51.4, 5.6, 3.2, 11.2, 1.0],
          "mcv1_coverage": [86.0, 91.0, 94.0, 94.0, 91.0],
          "cases": [880.0, 108.0, 70.0, 286.0, 26.0],
        },
      },
      {
        "iso3": "AUT",
        "name": "Austria",
        "series": {
          "cases_per_million": [null, null, 6.2, 17.0, 20.4],
          "mcv1_coverage": [60.0, 75.0, 80.0, 95.0, 90.0],
          "cases": [null, null, 52.0, 151.0, 186.0],
        },
      },
      {
        "iso3": "AZE",
        "name": "Azerbaijan",
        "series": {
          "cases_per_million": [280.2, 25.7, 0.0, 27.8, 1280.0],
          "mcv1_coverage": [null, 67.0, 89.0, 78.0, 71.0],
          "cases": [2026.0, 210.0, 0.0, 281.0, 13207.0],
        },
      },
      {
        "iso3": "BHS",
        "name": "Bahamas",
        "series": {
          "cases_per_million": [260.9, 0.0, 0.0, 7.6, 0.0],
          "mcv1_coverage": [86.0, 93.0, 94.0, 83.0, 86.0],
          "cases": [72.0, 0.0, 0.0, 3.0, 0.0],
        },
      },
      {
        "iso3": "BHR",
        "name": "Bahrain",
        "series": {
          "cases_per_million": [114.6, 9.0, 0.0, 2.0, 1.9],
          "mcv1_coverage": [87.0, 98.0, 99.0, 99.0, 99.0],
          "cases": [59.0, 6.0, 0.0, 3.0, 3.0],
        },
      },
      {
        "iso3": "BGD",
        "name": "Bangladesh",
        "series": {
          "cases_per_million": [15.3, 37.9, 5.2, 35.3, 1.6],
          "mcv1_coverage": [65.0, 74.0, 88.0, 97.0, 96.0],
          "cases": [1705.0, 5098.0, 788.0, 5827.0, 281.0],
        },
      },
      {
        "iso3": "BRB",
        "name": "Barbados",
        "series": {
          "cases_per_million": [197.2, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [87.0, 94.0, 85.0, 92.0, 89.0],
          "cases": [51.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "BLR",
        "name": "Belarus",
        "series": {
          "cases_per_million": [22.0, 2.1, 0.1, 21.3, 21.2],
          "mcv1_coverage": [null, 98.0, 99.0, 98.0, 97.0],
          "cases": [224.0, 21.0, 1.0, 201.0, 193.0],
        },
      },
      {
        "iso3": "BEL",
        "name": "Belgium",
        "series": {
          "cases_per_million": [null, null, 3.7, 41.8, 5.7],
          "mcv1_coverage": [85.0, 82.0, 95.0, 96.0, 96.0],
          "cases": [null, null, 40.0, 480.0, 67.0],
        },
      },
      {
        "iso3": "BLZ",
        "name": "Belize",
        "series": {
          "cases_per_million": [136.5, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [86.0, 96.0, 98.0, 96.0, 93.0],
          "cases": [25.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "BEN",
        "name": "Benin",
        "series": {
          "cases_per_million": [null, 587.7, 40.0, 34.3, 33.9],
          "mcv1_coverage": [79.0, 70.0, 68.0, 58.0, 52.0],
          "cases": [null, 4244.0, 392.0, 437.0, 478.0],
        },
      },
      {
        "iso3": "BMU",
        "name": "Bermuda",
        "series": {
          "cases_per_million": [17.4, 0.0, null, 0.0, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [1.0, 0.0, null, 0.0, 0.0],
        },
      },
      {
        "iso3": "BTN",
        "name": "Bhutan",
        "series": {
          "cases_per_million": [293.6, 700.3, 29.9, 2.6, 12.7],
          "mcv1_coverage": [93.0, 78.0, 95.0, 97.0, 99.0],
          "cases": [173.0, 418.0, 21.0, 2.0, 10.0],
        },
      },
      {
        "iso3": "BOL",
        "name": "Bolivia",
        "series": {
          "cases_per_million": [115.0, 14.2, 0.0, 0.0, 0.0],
          "mcv1_coverage": [53.0, 84.0, 88.0, 79.0, 68.0],
          "cases": [820.0, 122.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "BIH",
        "name": "Bosnia and Herzegovina",
        "series": {
          "cases_per_million": [115.1, 10.3, 11.8, 419.7, 4.1],
          "mcv1_coverage": [null, 80.0, 91.0, 79.0, 55.0],
          "cases": [512.0, 43.0, 45.0, 1404.0, 13.0],
        },
      },
      {
        "iso3": "BWA",
        "name": "Botswana",
        "series": {
          "cases_per_million": [932.8, 1593.0, 419.6, 0.0, 25.4],
          "mcv1_coverage": [87.0, 91.0, 96.0, 97.0, 97.0],
          "cases": [1218.0, 2672.0, 853.0, 0.0, 63.0],
        },
      },
      {
        "iso3": "BRA",
        "name": "Brazil",
        "series": {
          "cases_per_million": [411.9, 0.2, 0.3, 100.8, 0.0],
          "mcv1_coverage": [78.0, 99.0, 99.0, 91.0, 87.0],
          "cases": [61435.0, 36.0, 68.0, 20901.0, 0.0],
        },
      },
      {
        "iso3": "VGB",
        "name": "British Virgin Islands",
        "series": {
          "cases_per_million": [5722.6, 0.0, null, 0.0, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [90.0, 0.0, null, 0.0, 0.0],
        },
      },
      {
        "iso3": "BRN",
        "name": "Brunei",
        "series": {
          "cases_per_million": [47.0, 128.7, 0.0, 2.3, 2.2],
          "mcv1_coverage": [99.0, 99.0, 94.0, 97.0, 97.0],
          "cases": [12.0, 42.0, 0.0, 1.0, 1.0],
        },
      },
      {
        "iso3": "BGR",
        "name": "Bulgaria",
        "series": {
          "cases_per_million": [16.7, 5.8, 2958.5, 176.5, 0.0],
          "mcv1_coverage": [99.0, 89.0, 97.0, 95.0, 92.0],
          "cases": [147.0, 46.0, 22004.0, 1231.0, 0.0],
        },
      },
      {
        "iso3": "BFA",
        "name": "Burkina Faso",
        "series": {
          "cases_per_million": [1070.4, 509.3, 155.2, 32.1, 29.5],
          "mcv1_coverage": [79.0, 48.0, 92.0, 88.0, 88.0],
          "cases": [9804.0, 6074.0, 2511.0, 672.0, 680.0],
        },
      },
      {
        "iso3": "BDI",
        "name": "Burundi",
        "series": {
          "cases_per_million": [2377.3, 2838.1, 52.8, 9.1, 123.0],
          "mcv1_coverage": [74.0, 72.0, 92.0, 92.0, 86.0],
          "cases": [13282.0, 18363.0, 495.0, 112.0, 1684.0],
        },
      },
      {
        "iso3": "KHM",
        "name": "Cambodia",
        "series": {
          "cases_per_million": [335.3, 981.9, 79.7, 41.5, 0.6],
          "mcv1_coverage": [34.0, 65.0, 90.0, 87.0, 79.0],
          "cases": [2473.0, 12237.0, 1156.0, 684.0, 11.0],
        },
      },
      {
        "iso3": "CMR",
        "name": "Cameroon",
        "series": {
          "cases_per_million": [1866.4, 981.0, 12.2, 110.1, 215.2],
          "mcv1_coverage": [56.0, 49.0, 79.0, 61.0, 71.0],
          "cases": [21150.0, 14629.0, 240.0, 2809.0, 6105.0],
        },
      },
      {
        "iso3": "CAN",
        "name": "Canada",
        "series": {
          "cases_per_million": [37.2, 6.7, 2.9, 3.0, 0.3],
          "mcv1_coverage": [89.0, 96.0, 90.0, 90.0, 92.0],
          "cases": [1033.0, 206.0, 99.0, 113.0, 12.0],
        },
      },
      {
        "iso3": "CPV",
        "name": "Cape Verde",
        "series": {
          "cases_per_million": [0.0, 4.4, 0.0, 0.0, 0.0],
          "mcv1_coverage": [79.0, 86.0, 97.0, 98.0, 95.0],
          "cases": [0.0, 2.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "CYM",
        "name": "Cayman Islands",
        "series": {
          "cases_per_million": [0.0, 0.0, null, null, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [0.0, 0.0, null, null, 0.0],
        },
      },
      {
        "iso3": "CAF",
        "name": "Central African Republic",
        "series": {
          "cases_per_million": [443.9, 836.6, 0.5, 685.6, 745.5],
          "mcv1_coverage": [82.0, 36.0, 53.0, 37.0, 39.0],
          "cases": [1275.0, 3207.0, 2.0, 3390.0, 3841.0],
        },
      },
      {
        "iso3": "TCD",
        "name": "Chad",
        "series": {
          "cases_per_million": [1207.8, 416.6, 15.8, 112.8, 614.0],
          "mcv1_coverage": [32.0, 28.0, 46.0, 40.0, 63.0],
          "cases": [7226.0, 3546.0, 194.0, 1882.0, 11862.0],
        },
      },
      {
        "iso3": "CHL",
        "name": "Chile",
        "series": {
          "cases_per_million": [145.7, 0.0, 0.0, 0.6, 0.1],
          "mcv1_coverage": [97.0, 97.0, 93.0, 95.0, 94.0],
          "cases": [1958.0, 0.0, 0.0, 11.0, 1.0],
        },
      },
      {
        "iso3": "CHN",
        "name": "China",
        "series": {
          "cases_per_million": [74.3, 56.0, 28.2, 2.1, 0.4],
          "mcv1_coverage": [98.0, 84.0, 99.0, 99.0, 95.0],
          "cases": [85705.0, 71093.0, 38159.0, 2974.0, 621.0],
        },
      },
      {
        "iso3": "COL",
        "name": "Colombia",
        "series": {
          "cases_per_million": [385.9, 0.0, 0.0, 4.9, 0.0],
          "mcv1_coverage": [82.0, 88.0, 88.0, 95.0, 93.0],
          "cases": [12520.0, 1.0, 0.0, 244.0, 0.0],
        },
      },
      {
        "iso3": "COM",
        "name": "Comoros",
        "series": {
          "cases_per_million": [5236.2, null, 0.0, 82.6, 60.0],
          "mcv1_coverage": [87.0, 70.0, 72.0, 76.0, 70.0],
          "cases": [2328.0, null, 0.0, 65.0, 51.0],
        },
      },
      {
        "iso3": "COG",
        "name": "Congo",
        "series": {
          "cases_per_million": [1515.6, 532.5, 0.9, 11.8, 62.3],
          "mcv1_coverage": [75.0, 34.0, 75.0, 73.0, 65.0],
          "cases": [3608.0, 1678.0, 4.0, 66.0, 385.0],
        },
      },
      {
        "iso3": "COK",
        "name": "Cook Islands",
        "series": {
          "cases_per_million": [2099.6, 126.0, 0.0, 0.0, null],
          "mcv1_coverage": [67.0, 76.0, 99.0, 99.0, 84.0],
          "cases": [36.0, 2.0, 0.0, 0.0, null],
        },
      },
      {
        "iso3": "CRI",
        "name": "Costa Rica",
        "series": {
          "cases_per_million": [24.4, 0.0, 0.0, 2.0, 0.2],
          "mcv1_coverage": [90.0, 82.0, 83.0, 95.0, 93.0],
          "cases": [76.0, 0.0, 0.0, 10.0, 1.0],
        },
      },
      {
        "iso3": "CIV",
        "name": "Cote d'Ivoire",
        "series": {
          "cases_per_million": [1460.2, 323.7, 19.6, 13.2, 43.7],
          "mcv1_coverage": [56.0, 68.0, 64.0, 71.0, 70.0],
          "cases": [17799.0, 5729.0, 441.0, 372.0, 1361.0],
        },
      },
      {
        "iso3": "HRV",
        "name": "Croatia",
        "series": {
          "cases_per_million": [24.6, 2.1, 1.6, 13.0, 0.8],
          "mcv1_coverage": [null, 93.0, 96.0, 93.0, 90.0],
          "cases": [119.0, 9.0, 7.0, 52.0, 3.0],
        },
      },
      {
        "iso3": "CUB",
        "name": "Cuba",
        "series": {
          "cases_per_million": [1.1, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [94.0, 94.0, 99.0, 99.0, 99.0],
          "cases": [12.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "CUW",
        "name": "Curacao",
        "series": {
          "cases_per_million": [null, null, null, 5.3, null],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [null, null, null, 1.0, null],
        },
      },
      {
        "iso3": "CYP",
        "name": "Cyprus",
        "series": {
          "cases_per_million": [5.1, 0.0, 16.0, 4.7, 0.0],
          "mcv1_coverage": [77.0, 86.0, 87.0, 86.0, 82.0],
          "cases": [4.0, 0.0, 18.0, 6.0, 0.0],
        },
      },
      {
        "iso3": "CZE",
        "name": "Czechia",
        "series": {
          "cases_per_million": [234.9, 0.9, 0.0, 55.9, 0.1],
          "mcv1_coverage": [null, 97.0, 98.0, 92.0, 87.0],
          "cases": [2420.0, 9.0, 0.0, 590.0, 1.0],
        },
      },
      {
        "iso3": "COD",
        "name": "Democratic Republic of Congo",
        "series": {
          "cases_per_million": [124.4, 164.0, 78.9, 3582.8, 2944.5],
          "mcv1_coverage": [38.0, 26.0, 66.0, 65.0, 52.0],
          "cases": [4564.0, 8282.0, 5407.0, 333017.0, 311500.0],
        },
      },
      {
        "iso3": "DNK",
        "name": "Denmark",
        "series": {
          "cases_per_million": [35.0, 2.6, 0.9, 2.6, 1.5],
          "mcv1_coverage": [84.0, 99.0, 85.0, 96.0, 95.0],
          "cases": [180.0, 14.0, 5.0, 15.0, 9.0],
        },
      },
      {
        "iso3": "DJI",
        "name": "Djibouti",
        "series": {
          "cases_per_million": [179.4, 244.9, 7.5, null, 386.8],
          "mcv1_coverage": [85.0, 50.0, 85.0, 83.0, 76.0],
          "cases": [104.0, 183.0, 7.0, null, 446.0],
        },
      },
      {
        "iso3": "DMA",
        "name": "Dominica",
        "series": {
          "cases_per_million": [186.7, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [88.0, 99.0, 99.0, 92.0, 84.0],
          "cases": [13.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "DOM",
        "name": "Dominican Republic",
        "series": {
          "cases_per_million": [486.2, 29.5, 0.0, 0.0, 0.0],
          "mcv1_coverage": [70.0, 85.0, 81.0, 90.0, 88.0],
          "cases": [3477.0, 253.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "TLS",
        "name": "East Timor",
        "series": {
          "cases_per_million": [null, null, 46.1, 16.9, 5.1],
          "mcv1_coverage": [null, null, 66.0, 75.0, 72.0],
          "cases": [null, null, 50.0, 22.0, 7.0],
        },
      },
      {
        "iso3": "ECU",
        "name": "Ecuador",
        "series": {
          "cases_per_million": [157.2, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [60.0, 99.0, 95.0, 83.0, 74.0],
          "cases": [1646.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "EGY",
        "name": "Egypt",
        "series": {
          "cases_per_million": [15.2, 36.0, 0.2, 0.0, 2.3],
          "mcv1_coverage": [86.0, 98.0, 96.0, 95.0, 96.0],
          "cases": [887.0, 2633.0, 16.0, 0.0, 267.0],
        },
      },
      {
        "iso3": "SLV",
        "name": "El Salvador",
        "series": {
          "cases_per_million": [0.0, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [98.0, 97.0, 92.0, 96.0, 99.0],
          "cases": [0.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "GNQ",
        "name": "Equatorial Guinea",
        "series": {
          "cases_per_million": [67.5, null, 0.0, 0.0, 146.1],
          "mcv1_coverage": [88.0, 50.0, 44.0, 51.0, 61.0],
          "cases": [32.0, null, 0.0, 0.0, 270.0],
        },
      },
      {
        "iso3": "ERI",
        "name": "Eritrea",
        "series": {
          "cases_per_million": [null, 351.1, 17.3, 1.9, 15.6],
          "mcv1_coverage": [null, 76.0, 95.0, 93.0, 93.0],
          "cases": [null, 789.0, 51.0, 6.0, 54.0],
        },
      },
      {
        "iso3": "EST",
        "name": "Estonia",
        "series": {
          "cases_per_million": [21.0, 6.4, 0.0, 20.4, 2.9],
          "mcv1_coverage": [null, 93.0, 95.0, 88.0, 85.0],
          "cases": [33.0, 9.0, 0.0, 27.0, 4.0],
        },
      },
      {
        "iso3": "SWZ",
        "name": "Eswatini",
        "series": {
          "cases_per_million": [1679.2, 9.6, 281.6, 0.0, 2.4],
          "mcv1_coverage": [85.0, 92.0, 94.0, 81.0, 85.0],
          "cases": [1465.0, 10.0, 313.0, 0.0, 3.0],
        },
      },
      {
        "iso3": "ETH",
        "name": "Ethiopia",
        "series": {
          "cases_per_million": [38.6, 24.6, 46.8, 34.5, 186.8],
          "mcv1_coverage": [38.0, 28.0, 64.0, 56.0, 68.0],
          "cases": [1836.0, 1660.0, 4235.0, 3998.0, 24038.0],
        },
      },
      {
        "iso3": "FJI",
        "name": "Fiji",
        "series": {
          "cases_per_million": [41.4, null, 0.0, 30.6, null],
          "mcv1_coverage": [84.0, 81.0, 96.0, 94.0, 98.0],
          "cases": [32.0, null, 0.0, 28.0, null],
        },
      },
      {
        "iso3": "FIN",
        "name": "Finland",
        "series": {
          "cases_per_million": [0.6, null, 0.9, 2.2, 0.2],
          "mcv1_coverage": [97.0, 96.0, 98.0, 96.0, 94.0],
          "cases": [3.0, null, 5.0, 12.0, 1.0],
        },
      },
      {
        "iso3": "FRA",
        "name": "France",
        "series": {
          "cases_per_million": [null, 168.1, 79.6, 40.1, 1.8],
          "mcv1_coverage": [71.0, 84.0, 89.0, 92.0, 95.0],
          "cases": [null, 10000.0, 5048.0, 2637.0, 117.0],
        },
      },
      {
        "iso3": "PYF",
        "name": "French Polynesia",
        "series": {
          "cases_per_million": [147.2, null, 0.0, null, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [30.0, null, 0.0, null, 0.0],
        },
      },
      {
        "iso3": "GAB",
        "name": "Gabon",
        "series": {
          "cases_per_million": [750.2, 11.8, 0.6, 0.9, 469.7],
          "mcv1_coverage": [76.0, 55.0, 62.0, 62.0, 66.0],
          "cases": [738.0, 15.0, 1.0, 2.0, 1167.0],
        },
      },
      {
        "iso3": "GMB",
        "name": "Gambia",
        "series": {
          "cases_per_million": [null, 230.9, 1.0, 0.4, 14.1],
          "mcv1_coverage": [86.0, 89.0, 92.0, 85.0, 80.0],
          "cases": [null, 336.0, 2.0, 1.0, 38.0],
        },
      },
      {
        "iso3": "GEO",
        "name": "Georgia",
        "series": {
          "cases_per_million": [null, 11.6, 5.7, 1031.9, 10.2],
          "mcv1_coverage": [null, 73.0, 94.0, 99.0, 95.0],
          "cases": [null, 50.0, 22.0, 3918.0, 39.0],
        },
      },
      {
        "iso3": "DEU",
        "name": "Germany",
        "series": {
          "cases_per_million": [null, null, 9.7, 6.2, 0.9],
          "mcv1_coverage": [75.0, 92.0, 97.0, 97.0, 96.0],
          "cases": [null, null, 780.0, 514.0, 79.0],
        },
      },
      {
        "iso3": "GHA",
        "name": "Ghana",
        "series": {
          "cases_per_million": [2094.6, 1174.7, 25.2, 40.8, 67.5],
          "mcv1_coverage": [61.0, 90.0, 93.0, 92.0, 90.0],
          "cases": [32246.0, 23068.0, 641.0, 1274.0, 2282.0],
        },
      },
      {
        "iso3": "GRC",
        "name": "Greece",
        "series": {
          "cases_per_million": [23.9, 5.2, 13.4, 4.2, 0.0],
          "mcv1_coverage": [76.0, 89.0, 99.0, 97.0, 91.0],
          "cases": [245.0, 56.0, 149.0, 45.0, 0.0],
        },
      },
      {
        "iso3": "GRD",
        "name": "Grenada",
        "series": {
          "cases_per_million": [60.0, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [85.0, 92.0, 95.0, 94.0, 82.0],
          "cases": [6.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "GUM",
        "name": "Guam",
        "series": {
          "cases_per_million": [7.2, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [1.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "GTM",
        "name": "Guatemala",
        "series": {
          "cases_per_million": [975.3, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [68.0, 86.0, 93.0, 90.0, 89.0],
          "cases": [8802.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "GIN",
        "name": "Guinea",
        "series": {
          "cases_per_million": [1982.5, 1339.9, 4.3, 349.5, 6.5],
          "mcv1_coverage": [35.0, 42.0, 58.0, 50.0, 52.0],
          "cases": [12756.0, 11294.0, 45.0, 4555.0, 94.0],
        },
      },
      {
        "iso3": "GNB",
        "name": "Guinea-Bissau",
        "series": {
          "cases_per_million": [266.0, null, 16.6, 30.5, 2.3],
          "mcv1_coverage": [53.0, 71.0, 76.0, 79.0, 72.0],
          "cases": [259.0, null, 26.0, 60.0, 5.0],
        },
      },
      {
        "iso3": "GUY",
        "name": "Guyana",
        "series": {
          "cases_per_million": [1.3, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [73.0, 86.0, 95.0, 98.0, 98.0],
          "cases": [1.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "HTI",
        "name": "Haiti",
        "series": {
          "cases_per_million": [206.3, 119.5, 0.0, 0.0, null],
          "mcv1_coverage": [31.0, 54.0, 63.0, 74.0, 72.0],
          "cases": [1414.0, 992.0, 0.0, 0.0, null],
        },
      },
      {
        "iso3": "HND",
        "name": "Honduras",
        "series": {
          "cases_per_million": [1678.5, 0.0, 0.0, 0.0, null],
          "mcv1_coverage": [90.0, 98.0, 98.0, 89.0, 77.0],
          "cases": [8360.0, 0.0, 0.0, 0.0, null],
        },
      },
      {
        "iso3": "HKG",
        "name": "Hong Kong",
        "series": {
          "cases_per_million": [8.6, 8.9, 1.8, 12.0, 0.5],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [48.0, 60.0, 13.0, 90.0, 4.0],
        },
      },
      {
        "iso3": "HUN",
        "name": "Hungary",
        "series": {
          "cases_per_million": [2.8, 0.1, 0.0, 2.4, 0.1],
          "mcv1_coverage": [99.0, 99.0, 99.0, 99.0, 99.0],
          "cases": [29.0, 1.0, 0.0, 23.0, 1.0],
        },
      },
      {
        "iso3": "ISL",
        "name": "Iceland",
        "series": {
          "cases_per_million": [54.9, 0.0, 0.0, 24.9, 0.0],
          "mcv1_coverage": [99.0, 91.0, 93.0, 93.0, 91.0],
          "cases": [14.0, 0.0, 0.0, 9.0, 0.0],
        },
      },
      {
        "iso3": "IND",
        "name": "India",
        "series": {
          "cases_per_million": [103.6, 36.7, 25.3, 7.5, 45.3],
          "mcv1_coverage": [56.0, 56.0, 82.0, 95.0, 93.0],
          "cases": [89612.0, 38835.0, 31458.0, 10430.0, 65150.0],
        },
      },
      {
        "iso3": "IDN",
        "name": "Indonesia",
        "series": {
          "cases_per_million": [501.9, 15.5, 76.6, 7.2, 64.2],
          "mcv1_coverage": [58.0, 76.0, 78.0, 88.0, 82.0],
          "cases": [92105.0, 3344.0, 18869.0, 1965.0, 18063.0],
        },
      },
      {
        "iso3": "IRN",
        "name": "Iran",
        "series": {
          "cases_per_million": [91.5, 178.8, 7.0, 0.2, 7.2],
          "mcv1_coverage": [85.0, 99.0, 99.0, 99.0, 99.0],
          "cases": [5341.0, 11874.0, 538.0, 20.0, 648.0],
        },
      },
      {
        "iso3": "IRQ",
        "name": "Iraq",
        "series": {
          "cases_per_million": [173.2, 29.7, 15.8, 92.2, 273.6],
          "mcv1_coverage": [75.0, 86.0, 75.0, 86.0, 97.0],
          "cases": [3045.0, 726.0, 492.0, 3799.0, 12331.0],
        },
      },
      {
        "iso3": "IRL",
        "name": "Ireland",
        "series": {
          "cases_per_million": [158.2, null, 97.2, 13.2, 0.8],
          "mcv1_coverage": [78.0, 79.0, 90.0, 91.0, 89.0],
          "cases": [556.0, null, 443.0, 65.0, 4.0],
        },
      },
      {
        "iso3": "ISR",
        "name": "Israel",
        "series": {
          "cases_per_million": [50.6, 5.9, 3.1, 131.6, null],
          "mcv1_coverage": [91.0, 95.0, 96.0, 99.0, 98.0],
          "cases": [230.0, 36.0, 23.0, 1139.0, null],
        },
      },
      {
        "iso3": "ITA",
        "name": "Italy",
        "series": {
          "cases_per_million": [91.6, 25.4, 6.2, 27.0, 0.7],
          "mcv1_coverage": [43.0, 74.0, 91.0, 94.0, 95.0],
          "cases": [5223.0, 1457.0, 372.0, 1623.0, 44.0],
        },
      },
      {
        "iso3": "JAM",
        "name": "Jamaica",
        "series": {
          "cases_per_million": [1534.1, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [74.0, 88.0, 89.0, 94.0, 93.0],
          "cases": [3651.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "JPN",
        "name": "Japan",
        "series": {
          "cases_per_million": [26.4, 177.1, 3.5, 5.9, null],
          "mcv1_coverage": [73.0, 96.0, 94.0, 96.0, 94.0],
          "cases": [3259.0, 22497.0, 450.0, 742.0, null],
        },
      },
      {
        "iso3": "JOR",
        "name": "Jordan",
        "series": {
          "cases_per_million": [80.1, 5.9, 0.0, 4.5, null],
          "mcv1_coverage": [87.0, 94.0, 98.0, 87.0, 95.0],
          "cases": [290.0, 32.0, 0.0, 48.0, null],
        },
      },
      {
        "iso3": "KAZ",
        "name": "Kazakhstan",
        "series": {
          "cases_per_million": [15.9, 15.8, 0.2, 693.7, 743.3],
          "mcv1_coverage": [null, 99.0, 99.0, 99.0, 99.0],
          "cases": [273.0, 245.0, 4.0, 13326.0, 15111.0],
        },
      },
      {
        "iso3": "KEN",
        "name": "Kenya",
        "series": {
          "cases_per_million": [3366.7, 685.4, 2.3, 8.6, 16.2],
          "mcv1_coverage": [78.0, 78.0, 86.0, 92.0, 91.0],
          "cases": [77072.0, 21002.0, 95.0, 439.0, 896.0],
        },
      },
      {
        "iso3": "KIR",
        "name": "Kiribati",
        "series": {
          "cases_per_million": [400.7, 0.0, 0.0, 24.2, null],
          "mcv1_coverage": [75.0, 80.0, 89.0, 94.0, 79.0],
          "cases": [30.0, 0.0, 0.0, 3.0, null],
        },
      },
      {
        "iso3": "KWT",
        "name": "Kuwait",
        "series": {
          "cases_per_million": [42.1, 3.1, 4.4, 2.7, 1.2],
          "mcv1_coverage": [66.0, 99.0, 98.0, 97.0, 99.0],
          "cases": [71.0, 6.0, 13.0, 12.0, 6.0],
        },
      },
      {
        "iso3": "KGZ",
        "name": "Kyrgyzstan",
        "series": {
          "cases_per_million": [131.0, 3.2, 0.0, 366.5, 996.1],
          "mcv1_coverage": [null, 98.0, 99.0, 96.0, 96.0],
          "cases": [584.0, 16.0, 0.0, 2380.0, 7046.0],
        },
      },
      {
        "iso3": "LAO",
        "name": "Laos",
        "series": {
          "cases_per_million": [502.8, 61.1, 24.1, 154.6, 0.3],
          "mcv1_coverage": [32.0, 42.0, 64.0, 70.0, 69.0],
          "cases": [2168.0, 332.0, 153.0, 1119.0, 2.0],
        },
      },
      {
        "iso3": "LVA",
        "name": "Latvia",
        "series": {
          "cases_per_million": [7.9, 0.0, 0.0, 1.6, 0.5],
          "mcv1_coverage": [null, 97.0, 95.0, 99.0, 97.0],
          "cases": [21.0, 0.0, 0.0, 3.0, 1.0],
        },
      },
      {
        "iso3": "LBN",
        "name": "Lebanon",
        "series": {
          "cases_per_million": [null, 1.1, 2.4, 180.7, 59.9],
          "mcv1_coverage": [61.0, 71.0, 86.0, 82.0, 67.0],
          "cases": [null, 5.0, 12.0, 1047.0, 346.0],
        },
      },
      {
        "iso3": "LSO",
        "name": "Lesotho",
        "series": {
          "cases_per_million": [1212.9, 329.4, 1246.3, 210.0, 7.3],
          "mcv1_coverage": [80.0, 74.0, 88.0, 90.0, 76.0],
          "cases": [2195.0, 660.0, 2488.0, 464.0, 17.0],
        },
      },
      {
        "iso3": "LBR",
        "name": "Liberia",
        "series": {
          "cases_per_million": [null, 2041.2, 542.0, 238.5, 838.1],
          "mcv1_coverage": [null, 63.0, 65.0, 68.0, 82.0],
          "cases": [null, 5977.0, 2200.0, 1203.0, 4604.0],
        },
      },
      {
        "iso3": "LBY",
        "name": "Libya",
        "series": {
          "cases_per_million": [209.4, null, null, 27.1, 35.2],
          "mcv1_coverage": [89.0, 93.0, 98.0, 73.0, 73.0],
          "cases": [931.0, null, null, 188.0, 257.0],
        },
      },
      {
        "iso3": "LTU",
        "name": "Lithuania",
        "series": {
          "cases_per_million": [null, 5.4, 0.7, 298.4, 1.1],
          "mcv1_coverage": [null, 97.0, 96.0, 93.0, 87.0],
          "cases": [null, 19.0, 2.0, 834.0, 3.0],
        },
      },
      {
        "iso3": "LUX",
        "name": "Luxembourg",
        "series": {
          "cases_per_million": [41.9, 0.0, 0.0, 38.7, 0.0],
          "mcv1_coverage": [80.0, 93.0, 96.0, 96.0, 99.0],
          "cases": [16.0, 0.0, 0.0, 24.0, 0.0],
        },
      },
      {
        "iso3": "MAC",
        "name": "Macao",
        "series": {
          "cases_per_million": [54.1, 11.4, null, 55.1, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [19.0, 5.0, null, 37.0, 0.0],
        },
      },
      {
        "iso3": "MDG",
        "name": "Madagascar",
        "series": {
          "cases_per_million": [1199.3, 2134.6, 0.1, 7556.1, 11.4],
          "mcv1_coverage": [47.0, 57.0, 66.0, 60.0, 51.0],
          "cases": [14459.0, 35256.0, 1.0, 213231.0, 355.0],
        },
      },
      {
        "iso3": "MWI",
        "name": "Malawi",
        "series": {
          "cases_per_million": [null, 26.9, 8006.8, 0.9, 8.2],
          "mcv1_coverage": [81.0, 73.0, 93.0, 92.0, 87.0],
          "cases": [null, 304.0, 118712.0, 17.0, 173.0],
        },
      },
      {
        "iso3": "MYS",
        "name": "Malaysia",
        "series": {
          "cases_per_million": [31.6, 269.4, 2.5, 32.2, 57.0],
          "mcv1_coverage": [70.0, 96.0, 95.0, 97.0, 96.0],
          "cases": [563.0, 6187.0, 73.0, 1077.0, 2002.0],
        },
      },
      {
        "iso3": "MDV",
        "name": "Maldives",
        "series": {
          "cases_per_million": [0.0, 70.9, 0.0, 0.0, 9.5],
          "mcv1_coverage": [96.0, 99.0, 97.0, 99.0, 99.0],
          "cases": [0.0, 20.0, 0.0, 0.0, 5.0],
        },
      },
      {
        "iso3": "MLI",
        "name": "Mali",
        "series": {
          "cases_per_million": [151.2, 136.5, 107.8, 21.6, 15.3],
          "mcv1_coverage": [43.0, 49.0, 78.0, 71.0, 68.0],
          "cases": [1388.0, 1578.0, 1719.0, 454.0, 364.0],
        },
      },
      {
        "iso3": "MLT",
        "name": "Malta",
        "series": {
          "cases_per_million": [16.3, 5.0, 0.0, 59.5, 0.0],
          "mcv1_coverage": [80.0, 74.0, 73.0, 96.0, 95.0],
          "cases": [6.0, 2.0, 0.0, 30.0, 0.0],
        },
      },
      {
        "iso3": "MHL",
        "name": "Marshall Islands",
        "series": {
          "cases_per_million": [313.6, 0.0, 0.0, null, 0.0],
          "mcv1_coverage": [52.0, 94.0, 97.0, 85.0, 88.0],
          "cases": [14.0, 0.0, 0.0, null, 0.0],
        },
      },
      {
        "iso3": "MRT",
        "name": "Mauritania",
        "series": {
          "cases_per_million": [706.5, null, 381.0, 43.9, 67.5],
          "mcv1_coverage": [38.0, 46.0, 67.0, 75.0, 92.0],
          "cases": [1379.0, null, 1292.0, 196.0, 339.0],
        },
      },
      {
        "iso3": "MUS",
        "name": "Mauritius",
        "series": {
          "cases_per_million": [0.9, 0.0, 9.4, 76.2, 0.0],
          "mcv1_coverage": [76.0, 84.0, 99.0, 99.0, 96.0],
          "cases": [1.0, 0.0, 12.0, 98.0, 0.0],
        },
      },
      {
        "iso3": "MEX",
        "name": "Mexico",
        "series": {
          "cases_per_million": [830.5, 0.3, 0.0, 0.0, 0.0],
          "mcv1_coverage": [75.0, 96.0, 95.0, 73.0, 76.0],
          "cases": [68782.0, 30.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "FSM",
        "name": "Micronesia (country)",
        "series": {
          "cases_per_million": [9.9, 0.0, null, 0.0, 8.9],
          "mcv1_coverage": [81.0, 85.0, 80.0, 78.0, 86.0],
          "cases": [1.0, 0.0, null, 0.0, 1.0],
        },
      },
      {
        "iso3": "MDA",
        "name": "Moldova",
        "series": {
          "cases_per_million": [728.4, 162.2, 0.0, 28.9, 1.0],
          "mcv1_coverage": [null, 89.0, 97.0, 97.0, 85.0],
          "cases": [3242.0, 687.0, 0.0, 90.0, 3.0],
        },
      },
      {
        "iso3": "MCO",
        "name": "Monaco",
        "series": {
          "cases_per_million": [0.0, null, null, 26.2, 0.0],
          "mcv1_coverage": [99.0, 98.0, 93.0, 88.0, 88.0],
          "cases": [0.0, null, null, 1.0, 0.0],
        },
      },
      {
        "iso3": "MNG",
        "name": "Mongolia",
        "series": {
          "cases_per_million": [136.8, 376.8, 2.6, 0.6, 0.0],
          "mcv1_coverage": [92.0, 92.0, 97.0, 98.0, 96.0],
          "cases": [296.0, 925.0, 7.0, 2.0, 0.0],
        },
      },
      {
        "iso3": "MNE",
        "name": "Montenegro",
        "series": {
          "cases_per_million": [null, null, 7.9, 0.0, 0.0],
          "mcv1_coverage": [null, null, 90.0, 37.0, 24.0],
          "cases": [null, null, 5.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "MSR",
        "name": "Montserrat",
        "series": {
          "cases_per_million": [0.0, null, null, 0.0, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [0.0, null, null, 0.0, 0.0],
        },
      },
      {
        "iso3": "MAR",
        "name": "Morocco",
        "series": {
          "cases_per_million": [64.7, 259.2, 19.5, null, null],
          "mcv1_coverage": [79.0, 93.0, 98.0, 99.0, 98.0],
          "cases": [1577.0, 7368.0, 633.0, null, null],
        },
      },
      {
        "iso3": "MOZ",
        "name": "Mozambique",
        "series": {
          "cases_per_million": [1380.9, 406.8, 100.9, 2.1, 19.5],
          "mcv1_coverage": [59.0, 71.0, 82.0, 83.0, 65.0],
          "cases": [18082.0, 7375.0, 2321.0, 63.0, 656.0],
        },
      },
      {
        "iso3": "MMR",
        "name": "Myanmar",
        "series": {
          "cases_per_million": [198.4, 18.7, 3.9, 99.8, 0.3],
          "mcv1_coverage": [68.0, 84.0, 88.0, 84.0, 73.0],
          "cases": [7900.0, 845.0, 190.0, 5252.0, 15.0],
        },
      },
      {
        "iso3": "NAM",
        "name": "Namibia",
        "series": {
          "cases_per_million": [null, 257.9, 1487.3, 4.5, 14.2],
          "mcv1_coverage": [null, 69.0, 75.0, 80.0, 86.0],
          "cases": [null, 469.0, 3138.0, 12.0, 42.0],
        },
      },
      {
        "iso3": "NRU",
        "name": "Nauru",
        "series": {
          "cases_per_million": [31104.2, 0.0, null, 0.0, null],
          "mcv1_coverage": [null, 8.0, 99.0, 95.0, 98.0],
          "cases": [300.0, 0.0, null, 0.0, null],
        },
      },
      {
        "iso3": "NPL",
        "name": "Nepal",
        "series": {
          "cases_per_million": [9.3, 382.8, 7.0, 15.1, 32.4],
          "mcv1_coverage": [57.0, 71.0, 86.0, 92.0, 93.0],
          "cases": [182.0, 9397.0, 190.0, 430.0, 963.0],
        },
      },
      {
        "iso3": "NLD",
        "name": "Netherlands",
        "series": {
          "cases_per_million": [1.1, 63.5, 0.9, 4.8, 0.4],
          "mcv1_coverage": [94.0, 96.0, 96.0, 94.0, 89.0],
          "cases": [16.0, 1019.0, 15.0, 84.0, 7.0],
        },
      },
      {
        "iso3": "NCL",
        "name": "New Caledonia",
        "series": {
          "cases_per_million": [102.0, 0.0, 0.0, null, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [18.0, 0.0, 0.0, null, 0.0],
        },
      },
      {
        "iso3": "NZL",
        "name": "New Zealand",
        "series": {
          "cases_per_million": [null, 16.9, 9.9, 438.7, null],
          "mcv1_coverage": [90.0, 85.0, 91.0, 92.0, 89.0],
          "cases": [null, 65.0, 43.0, 2189.0, null],
        },
      },
      {
        "iso3": "NIC",
        "name": "Nicaragua",
        "series": {
          "cases_per_million": [0.0, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [0.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "NER",
        "name": "Niger",
        "series": {
          "cases_per_million": [2469.6, 1852.3, 22.5, 449.8, 65.3],
          "mcv1_coverage": [25.0, 37.0, 67.0, 79.0, 80.0],
          "cases": [20463.0, 21319.0, 372.0, 10321.0, 1708.0],
        },
      },
      {
        "iso3": "NGA",
        "name": "Nigeria",
        "series": {
          "cases_per_million": [1191.1, 1678.9, 51.0, 134.1, 88.4],
          "mcv1_coverage": [54.0, 33.0, 56.0, 58.0, 54.0],
          "cases": [115682.0, 212183.0, 8491.0, 28094.0, 20143.0],
        },
      },
      {
        "iso3": "NIU",
        "name": "Niue",
        "series": {
          "cases_per_million": [null, 0.0, 0.0, 0.0, null],
          "mcv1_coverage": [99.0, 99.0, 99.0, 99.0, 99.0],
          "cases": [null, 0.0, 0.0, 0.0, null],
        },
      },
      {
        "iso3": "PRK",
        "name": "North Korea",
        "series": {
          "cases_per_million": [0.0, null, 0.0, null, 0.0],
          "mcv1_coverage": [98.0, 78.0, 99.0, 99.0, 99.0],
          "cases": [0.0, null, 0.0, null, 0.0],
        },
      },
      {
        "iso3": "MKD",
        "name": "North Macedonia",
        "series": {
          "cases_per_million": [null, 17.5, 105.8, 704.6, 0.6],
          "mcv1_coverage": [null, 97.0, 98.0, 75.0, 73.0],
          "cases": [null, 36.0, 217.0, 1337.0, 1.0],
        },
      },
      {
        "iso3": "MNP",
        "name": "Northern Mariana Islands",
        "series": {
          "cases_per_million": [807.1, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [35.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "NOR",
        "name": "Norway",
        "series": {
          "cases_per_million": [22.4, 0.0, 0.6, 3.4, 0.4],
          "mcv1_coverage": [87.0, 88.0, 93.0, 97.0, 96.0],
          "cases": [95.0, 0.0, 3.0, 18.0, 2.0],
        },
      },
      {
        "iso3": "OMN",
        "name": "Oman",
        "series": {
          "cases_per_million": [715.4, 6.6, 1.1, 0.0, 5.0],
          "mcv1_coverage": [98.0, 99.0, 99.0, 99.0, 99.0],
          "cases": [1262.0, 15.0, 3.0, 0.0, 25.0],
        },
      },
      {
        "iso3": "PAK",
        "name": "Pakistan",
        "series": {
          "cases_per_million": [187.6, 13.3, 21.7, 8.9, 71.6],
          "mcv1_coverage": [50.0, 57.0, 57.0, 81.0, 84.0],
          "cases": [21785.0, 2064.0, 4321.0, 2066.0, 17722.0],
        },
      },
      {
        "iso3": "PLW",
        "name": "Palau",
        "series": {
          "cases_per_million": [0.0, 0.0, 0.0, null, 0.0],
          "mcv1_coverage": [98.0, 83.0, 39.0, 97.0, 96.0],
          "cases": [0.0, 0.0, 0.0, null, 0.0],
        },
      },
      {
        "iso3": "PSE",
        "name": "Palestine",
        "series": {
          "cases_per_million": [null, 1.6, 0.2, 46.0, 0.6],
          "mcv1_coverage": [null, 93.0, 98.0, 99.0, 89.0],
          "cases": [null, 5.0, 1.0, 228.0, 3.0],
        },
      },
      {
        "iso3": "PAN",
        "name": "Panama",
        "series": {
          "cases_per_million": [770.1, 0.0, 0.0, 0.0, null],
          "mcv1_coverage": [73.0, 97.0, 97.0, 97.0, 88.0],
          "cases": [1891.0, 0.0, 0.0, 0.0, null],
        },
      },
      {
        "iso3": "PNG",
        "name": "Papua New Guinea",
        "series": {
          "cases_per_million": [1174.1, 1288.6, 0.0, 0.1, 1.1],
          "mcv1_coverage": [67.0, 69.0, 63.0, 37.0, 52.0],
          "cases": [4575.0, 7135.0, 0.0, 1.0, 12.0],
        },
      },
      {
        "iso3": "PRY",
        "name": "Paraguay",
        "series": {
          "cases_per_million": [345.9, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [69.0, 92.0, 93.0, 87.0, 83.0],
          "cases": [1396.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "PER",
        "name": "Peru",
        "series": {
          "cases_per_million": [33.5, 0.0, 0.0, 0.1, 0.0],
          "mcv1_coverage": [64.0, 97.0, 94.0, 85.0, 84.0],
          "cases": [737.0, 1.0, 0.0, 2.0, 0.0],
        },
      },
      {
        "iso3": "PHL",
        "name": "Philippines",
        "series": {
          "cases_per_million": [683.1, 89.4, 66.1, 437.9, 25.2],
          "mcv1_coverage": [85.0, 78.0, 87.0, 83.0, 81.0],
          "cases": [42938.0, 7120.0, 6368.0, 48525.0, 2892.0],
        },
      },
      {
        "iso3": "POL",
        "name": "Poland",
        "series": {
          "cases_per_million": [1483.9, 2.0, 0.3, 35.8, 0.9],
          "mcv1_coverage": [95.0, 97.0, 98.0, 93.0, 92.0],
          "cases": [56471.0, 77.0, 13.0, 1367.0, 35.0],
        },
      },
      {
        "iso3": "PRT",
        "name": "Portugal",
        "series": {
          "cases_per_million": [40.7, 4.4, 0.5, 1.0, 0.0],
          "mcv1_coverage": [85.0, 87.0, 96.0, 99.0, 98.0],
          "cases": [407.0, 45.0, 5.0, 10.0, 0.0],
        },
      },
      {
        "iso3": "QAT",
        "name": "Qatar",
        "series": {
          "cases_per_million": [713.3, 71.3, 172.6, 1.8, 42.6],
          "mcv1_coverage": [79.0, 91.0, 99.0, 99.0, 99.0],
          "cases": [314.0, 46.0, 295.0, 5.0, 127.0],
        },
      },
      {
        "iso3": "ROU",
        "name": "Romania",
        "series": {
          "cases_per_million": [204.5, 1.6, 9.4, 200.0, 192.3],
          "mcv1_coverage": [92.0, 98.0, 95.0, 90.0, 78.0],
          "cases": [4691.0, 35.0, 193.0, 3900.0, 3677.0],
        },
      },
      {
        "iso3": "RUS",
        "name": "Russia",
        "series": {
          "cases_per_million": [123.3, 32.7, 0.9, 30.6, 90.0],
          "mcv1_coverage": [null, 97.0, 98.0, 98.0, 97.0],
          "cases": [18370.0, 4800.0, 129.0, 4491.0, 13083.0],
        },
      },
      {
        "iso3": "RWA",
        "name": "Rwanda",
        "series": {
          "cases_per_million": [1216.2, 255.1, 11.7, 64.0, 7.7],
          "mcv1_coverage": [83.0, 74.0, 95.0, 96.0, 96.0],
          "cases": [8970.0, 2095.0, 121.0, 818.0, 108.0],
        },
      },
      {
        "iso3": "KNA",
        "name": "Saint Kitts and Nevis",
        "series": {
          "cases_per_million": [1977.5, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [99.0, 99.0, 99.0, 97.0, 95.0],
          "cases": [80.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "LCA",
        "name": "Saint Lucia",
        "series": {
          "cases_per_million": [217.6, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [82.0, 88.0, 95.0, 96.0, 85.0],
          "cases": [30.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "VCT",
        "name": "Saint Vincent and the Grenadines",
        "series": {
          "cases_per_million": [8.9, 0.0, 0.0, 0.0, null],
          "mcv1_coverage": [96.0, 96.0, 99.0, 99.0, 90.0],
          "cases": [1.0, 0.0, 0.0, 0.0, null],
        },
      },
      {
        "iso3": "WSM",
        "name": "Samoa",
        "series": {
          "cases_per_million": [0.0, null, 41.4, 27107.5, 0.0],
          "mcv1_coverage": [89.0, 93.0, 56.0, 96.0, 87.0],
          "cases": [0.0, null, 8.0, 5687.0, 0.0],
        },
      },
      {
        "iso3": "SMR",
        "name": "San Marino",
        "series": {
          "cases_per_million": [42.5, 37.3, 0.0, 346.1, 0.0],
          "mcv1_coverage": [null, 99.0, 88.0, 86.0, 89.0],
          "cases": [1.0, 1.0, 0.0, 12.0, 0.0],
        },
      },
      {
        "iso3": "STP",
        "name": "Sao Tome and Principe",
        "series": {
          "cases_per_million": [81.3, 0.0, 0.0, 0.0, null],
          "mcv1_coverage": [71.0, 69.0, 92.0, 95.0, 87.0],
          "cases": [10.0, 0.0, 0.0, 0.0, null],
        },
      },
      {
        "iso3": "SAU",
        "name": "Saudi Arabia",
        "series": {
          "cases_per_million": [511.1, null, 13.3, 34.0, 67.8],
          "mcv1_coverage": [88.0, 94.0, 98.0, 95.0, 97.0],
          "cases": [5439.0, null, 334.0, 1035.0, 2254.0],
        },
      },
      {
        "iso3": "SEN",
        "name": "Senegal",
        "series": {
          "cases_per_million": [648.1, 585.8, 33.9, 16.3, 31.2],
          "mcv1_coverage": [51.0, 48.0, 81.0, 86.0, 87.0],
          "cases": [5004.0, 5839.0, 428.0, 267.0, 564.0],
        },
      },
      {
        "iso3": "SRB",
        "name": "Serbia",
        "series": {
          "cases_per_million": [632.2, 4.9, 2.7, 3.2, 7.4],
          "mcv1_coverage": [null, 89.0, 95.0, 87.0, 84.0],
          "cases": [4978.0, 38.0, 20.0, 22.0, 50.0],
        },
      },
      {
        "iso3": "SYC",
        "name": "Seychelles",
        "series": {
          "cases_per_million": [175.7, null, 0.0, 0.0, 0.0],
          "mcv1_coverage": [86.0, 97.0, 99.0, 99.0, 93.0],
          "cases": [13.0, null, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "SLE",
        "name": "Sierra Leone",
        "series": {
          "cases_per_million": [197.8, 808.2, 175.0, 5.2, 76.2],
          "mcv1_coverage": [null, 37.0, 82.0, 93.0, 90.0],
          "cases": [830.0, 3575.0, 1089.0, 40.0, 645.0],
        },
      },
      {
        "iso3": "SGP",
        "name": "Singapore",
        "series": {
          "cases_per_million": [47.0, 34.9, 9.8, 26.8, null],
          "mcv1_coverage": [84.0, 96.0, 95.0, 96.0, 97.0],
          "cases": [143.0, 141.0, 50.0, 152.0, null],
        },
      },
      {
        "iso3": "SVK",
        "name": "Slovakia",
        "series": {
          "cases_per_million": [8.9, 0.0, 0.0, 58.3, 1.1],
          "mcv1_coverage": [null, 98.0, 98.0, 96.0, 94.0],
          "cases": [47.0, 0.0, 0.0, 318.0, 6.0],
        },
      },
      {
        "iso3": "SVN",
        "name": "Slovenia",
        "series": {
          "cases_per_million": [null, null, 1.0, 24.5, 0.5],
          "mcv1_coverage": [null, 95.0, 95.0, 94.0, 95.0],
          "cases": [null, null, 2.0, 51.0, 1.0],
        },
      },
      {
        "iso3": "SLB",
        "name": "Solomon Islands",
        "series": {
          "cases_per_million": [1034.8, null, 0.0, null, 0.0],
          "mcv1_coverage": [70.0, 91.0, 74.0, 81.0, 68.0],
          "cases": [343.0, null, 0.0, null, 0.0],
        },
      },
      {
        "iso3": "SOM",
        "name": "Somalia",
        "series": {
          "cases_per_million": [null, 448.6, 9.4, 17.6, 172.5],
          "mcv1_coverage": [30.0, 24.0, 46.0, 52.0, 63.0],
          "cases": [null, 3965.0, 115.0, 283.0, 3167.0],
        },
      },
      {
        "iso3": "ZAF",
        "name": "South Africa",
        "series": {
          "cases_per_million": [260.7, 30.9, 238.8, 1.0, 16.3],
          "mcv1_coverage": [79.0, 72.0, 72.0, 83.0, 80.0],
          "cases": [10624.0, 1459.0, 12499.0, 59.0, 1033.0],
        },
      },
      {
        "iso3": "KOR",
        "name": "South Korea",
        "series": {
          "cases_per_million": [77.5, 698.1, 2.3, 3.8, 0.1],
          "mcv1_coverage": [93.0, 95.0, 98.0, 98.0, 97.0],
          "cases": [3415.0, 32647.0, 114.0, 194.0, 7.0],
        },
      },
      {
        "iso3": "SSD",
        "name": "South Sudan",
        "series": {
          "cases_per_million": [null, null, null, 326.3, 692.9],
          "mcv1_coverage": [null, null, null, 65.0, 72.0],
          "cases": [null, null, null, 3401.0, 7957.0],
        },
      },
      {
        "iso3": "ESP",
        "name": "Spain",
        "series": {
          "cases_per_million": [553.9, 3.7, 6.5, 6.1, 0.3],
          "mcv1_coverage": [99.0, 94.0, 95.0, 98.0, 96.0],
          "cases": [21650.0, 152.0, 302.0, 288.0, 15.0],
        },
      },
      {
        "iso3": "LKA",
        "name": "Sri Lanka",
        "series": {
          "cases_per_million": [244.9, 856.6, 3.8, 2.2, 35.3],
          "mcv1_coverage": [80.0, 99.0, 99.0, 99.0, 99.0],
          "cases": [4004.0, 16527.0, 79.0, 49.0, 810.0],
        },
      },
      {
        "iso3": "SDN",
        "name": "Sudan",
        "series": {
          "cases_per_million": [639.1, 103.4, 19.2, 78.0, 27.5],
          "mcv1_coverage": [57.0, 58.0, 90.0, 90.0, 51.0],
          "cases": [14075.0, 2875.0, 680.0, 3555.0, 1377.0],
        },
      },
      {
        "iso3": "SUR",
        "name": "Suriname",
        "series": {
          "cases_per_million": [84.8, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [65.0, 84.0, 87.0, 64.0, 71.0],
          "cases": [35.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "SWE",
        "name": "Sweden",
        "series": {
          "cases_per_million": [3.4, 6.7, 0.6, 1.9, 1.0],
          "mcv1_coverage": [96.0, 91.0, 97.0, 97.0, 93.0],
          "cases": [29.0, 59.0, 6.0, 20.0, 11.0],
        },
      },
      {
        "iso3": "CHE",
        "name": "Switzerland",
        "series": {
          "cases_per_million": [296.4, null, 9.8, null, 5.9],
          "mcv1_coverage": [90.0, 82.0, 92.0, 95.0, 95.0],
          "cases": [1990.0, null, 77.0, null, 52.0],
        },
      },
      {
        "iso3": "SYR",
        "name": "Syria",
        "series": {
          "cases_per_million": [42.5, 8.8, 1.2, 1.3, 31.5],
          "mcv1_coverage": [87.0, 84.0, 82.0, 76.0, 74.0],
          "cases": [535.0, 146.0, 26.0, 27.0, 744.0],
        },
      },
      {
        "iso3": "TJK",
        "name": "Tajikistan",
        "series": {
          "cases_per_million": [1277.5, 30.6, 0.0, 0.7, 28.3],
          "mcv1_coverage": [null, 88.0, 94.0, 98.0, 98.0],
          "cases": [6897.0, 192.0, 0.0, 7.0, 294.0],
        },
      },
      {
        "iso3": "TZA",
        "name": "Tanzania",
        "series": {
          "cases_per_million": [571.4, 427.6, 3.7, 2.0, 43.3],
          "mcv1_coverage": [80.0, 78.0, 92.0, 89.0, 84.0],
          "cases": [14920.0, 14649.0, 167.0, 120.0, 2887.0],
        },
      },
      {
        "iso3": "THA",
        "name": "Thailand",
        "series": {
          "cases_per_million": [534.2, 64.7, 37.7, 75.7, 0.9],
          "mcv1_coverage": [80.0, 94.0, 98.0, 96.0, 93.0],
          "cases": [29244.0, 4074.0, 2583.0, 5412.0, 64.0],
        },
      },
      {
        "iso3": "TGO",
        "name": "Togo",
        "series": {
          "cases_per_million": [1224.5, 748.0, 19.0, 9.1, 83.4],
          "mcv1_coverage": [73.0, 58.0, 68.0, 78.0, 81.0],
          "cases": [4548.0, 3578.0, 120.0, 69.0, 686.0],
        },
      },
      {
        "iso3": "TKL",
        "name": "Tokelau",
        "series": {
          "cases_per_million": [0.0, 0.0, 0.0, 0.0, null],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [0.0, 0.0, 0.0, 0.0, null],
        },
      },
      {
        "iso3": "TON",
        "name": "Tonga",
        "series": {
          "cases_per_million": [651.8, 0.0, 0.0, 6235.3, 114.7],
          "mcv1_coverage": [86.0, 95.0, 99.0, 99.0, 99.0],
          "cases": [65.0, 0.0, 0.0, 659.0, 12.0],
        },
      },
      {
        "iso3": "TTO",
        "name": "Trinidad and Tobago",
        "series": {
          "cases_per_million": [408.1, 0.0, 0.0, 0.0, 0.0],
          "mcv1_coverage": [70.0, 90.0, 92.0, 99.0, 90.0],
          "cases": [511.0, 0.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "TUN",
        "name": "Tunisia",
        "series": {
          "cases_per_million": [65.7, 4.8, 0.1, 393.2, 0.8],
          "mcv1_coverage": [93.0, 95.0, 97.0, 98.0, 96.0],
          "cases": [547.0, 47.0, 1.0, 4669.0, 10.0],
        },
      },
      {
        "iso3": "TUR",
        "name": "Turkey",
        "series": {
          "cases_per_million": [203.0, 248.3, 0.1, 34.0, 58.3],
          "mcv1_coverage": [78.0, 87.0, 97.0, 97.0, 95.0],
          "cases": [11372.0, 16244.0, 7.0, 2904.0, 5088.0],
        },
      },
      {
        "iso3": "TKM",
        "name": "Turkmenistan",
        "series": {
          "cases_per_million": [746.2, 24.7, 0.0, 0.0, 0.0],
          "mcv1_coverage": [null, 96.0, 99.0, 99.0, 99.0],
          "cases": [2806.0, 113.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "TCA",
        "name": "Turks and Caicos Islands",
        "series": {
          "cases_per_million": [170.8, 0.0, null, 0.0, 0.0],
          "mcv1_coverage": [null, null, null, null, null],
          "cases": [2.0, 0.0, null, 0.0, 0.0],
        },
      },
      {
        "iso3": "TUV",
        "name": "Tuvalu",
        "series": {
          "cases_per_million": [null, null, 0.0, 0.0, null],
          "mcv1_coverage": [95.0, 81.0, 85.0, 96.0, 98.0],
          "cases": [null, null, 0.0, 0.0, null],
        },
      },
      {
        "iso3": "UGA",
        "name": "Uganda",
        "series": {
          "cases_per_million": [150.1, 1773.1, 40.5, 21.4, 8.2],
          "mcv1_coverage": [52.0, 57.0, 73.0, 87.0, 90.0],
          "cases": [2637.0, 42554.0, 1313.0, 920.0, 399.0],
        },
      },
      {
        "iso3": "UKR",
        "name": "Ukraine",
        "series": {
          "cases_per_million": [131.4, 16.5, 0.8, 1274.1, 1.8],
          "mcv1_coverage": [null, 99.0, 56.0, 93.0, 92.0],
          "cases": [6841.0, 817.0, 39.0, 57282.0, 66.0],
        },
      },
      {
        "iso3": "ARE",
        "name": "United Arab Emirates",
        "series": {
          "cases_per_million": [625.3, 19.8, 12.5, 19.9, 45.5],
          "mcv1_coverage": [80.0, 94.0, 94.0, 99.0, 98.0],
          "cases": [1187.0, 69.0, 87.0, 187.0, 484.0],
        },
      },
      {
        "iso3": "GBR",
        "name": "United Kingdom",
        "series": {
          "cases_per_million": [492.1, 1.8, 7.0, 16.3, 7.2],
          "mcv1_coverage": [87.0, 88.0, 89.0, 91.0, 90.0],
          "cases": [28228.0, 104.0, 443.0, 1092.0, 493.0],
        },
      },
      {
        "iso3": "USA",
        "name": "United States",
        "series": {
          "cases_per_million": [109.7, 0.3, 0.2, null, 0.3],
          "mcv1_coverage": [90.0, 91.0, 92.0, 90.0, 92.0],
          "cases": [27786.0, 85.0, 63.0, null, 121.0],
        },
      },
      {
        "iso3": "URY",
        "name": "Uruguay",
        "series": {
          "cases_per_million": [35.4, 0.0, 0.0, 2.6, 0.0],
          "mcv1_coverage": [97.0, 89.0, 95.0, 96.0, 96.0],
          "cases": [110.0, 0.0, 0.0, 9.0, 0.0],
        },
      },
      {
        "iso3": "UZB",
        "name": "Uzbekistan",
        "series": {
          "cases_per_million": [192.7, 3.2, 4.1, 50.7, 33.0],
          "mcv1_coverage": [null, 99.0, 98.0, 98.0, 99.0],
          "cases": [3943.0, 80.0, 117.0, 1672.0, 1176.0],
        },
      },
      {
        "iso3": "VUT",
        "name": "Vanuatu",
        "series": {
          "cases_per_million": [452.5, 48.3, 0.0, 0.0, 0.0],
          "mcv1_coverage": [66.0, 61.0, 71.0, 80.0, 70.0],
          "cases": [67.0, 9.0, 0.0, 0.0, 0.0],
        },
      },
      {
        "iso3": "VEN",
        "name": "Venezuela",
        "series": {
          "cases_per_million": [498.4, 0.9, 0.0, 18.9, 0.0],
          "mcv1_coverage": [61.0, 84.0, 79.0, 93.0, 68.0],
          "cases": [9881.0, 22.0, 0.0, 548.0, 0.0],
        },
      },
      {
        "iso3": "VNM",
        "name": "Vietnam",
        "series": {
          "cases_per_million": [124.8, 214.0, 32.1, 145.7, 0.4],
          "mcv1_coverage": [88.0, 97.0, 98.0, 95.0, 82.0],
          "cases": [8175.0, 16512.0, 2809.0, 14156.0, 43.0],
        },
      },
      {
        "iso3": "YEM",
        "name": "Yemen",
        "series": {
          "cases_per_million": [null, null, 19.1, 33.1, 1263.1],
          "mcv1_coverage": [69.0, 70.0, 68.0, 54.0, 45.0],
          "cases": [null, null, 510.0, 1161.0, 49755.0],
        },
      },
      {
        "iso3": "ZMB",
        "name": "Zambia",
        "series": {
          "cases_per_million": [866.7, 3087.6, 1128.1, 0.8, 272.8],
          "mcv1_coverage": [90.0, 85.0, 96.0, 93.0, 83.0],
          "cases": [6748.0, 30930.0, 15754.0, 15.0, 5653.0],
        },
      },
      {
        "iso3": "ZWE",
        "name": "Zimbabwe",
        "series": {
          "cases_per_million": [1354.2, 124.7, 725.9, 0.3, 338.5],
          "mcv1_coverage": [87.0, 75.0, 90.0, 85.0, 90.0],
          "cases": [13728.0, 1483.0, 9696.0, 4.0, 5532.0],
        },
      },
    ],
    "countrySourceNote": "OWID / WHO / WUENIC, merged project table: every reporting country",
  },
  {
    "id": "mumps-global",
    "name": "Mumps (global)",
    "shortName": "Mumps",
    "tagline": "Cases roughly halved since 2000, but not smoothly.",
    "role": "secondary",
    "failureMode": "over-optimism",
    "failureModeLabel": "Natural failure mode: over-optimism",
    "rows": 26,
    "yearRange": "2000-2025",
    "granularity": "global total x year",
    "sources": ["WHO vaccine-preventable diseases surveillance"],
    "description": "Global reported mumps cases and incidence per million. Falling across the span, which makes false reassurance the natural failure mode.",
    "primaryLabel": "Reported mumps cases",
    "secondaryLabel": "Incidence per million",
    "primaryUnit": "cases",
    "secondaryUnit": "per million",
    "series": [
      {"year": 2000, "primary": 544093.0, "secondary": 316.8},
      {"year": 2001, "primary": 412341.0, "secondary": 229.7},
      {"year": 2002, "primary": 487932.0, "secondary": 309.9},
      {"year": 2003, "primary": 334524.0, "secondary": 200.6},
      {"year": 2004, "primary": 654216.0, "secondary": 213.8},
      {"year": 2005, "primary": 619062.0, "secondary": 212.4},
      {"year": 2006, "primary": 643321.0, "secondary": 194.1},
      {"year": 2007, "primary": 407873.0, "secondary": 119.6},
      {"year": 2008, "primary": 537740.0, "secondary": 156.6},
      {"year": 2009, "primary": 546684.0, "secondary": 151.0},
      {"year": 2010, "primary": 619389.0, "secondary": 163.6},
      {"year": 2011, "primary": 726638.0, "secondary": 196.0},
      {"year": 2012, "primary": 687934.0, "secondary": 187.0},
      {"year": 2013, "primary": 516316.0, "secondary": 137.3},
      {"year": 2014, "primary": 311602.0, "secondary": 85.6},
      {"year": 2015, "primary": 385781.0, "secondary": 101.1},
      {"year": 2016, "primary": 592174.0, "secondary": 157.2},
      {"year": 2017, "primary": 560784.0, "secondary": 151.1},
      {"year": 2018, "primary": 502132.0, "secondary": 128.1},
      {"year": 2019, "primary": 169898.0, "secondary": 81.7},
      {"year": 2020, "primary": 279270.0, "secondary": 66.4},
      {"year": 2021, "primary": 241742.0, "secondary": 43.4},
      {"year": 2022, "primary": 381029.0, "secondary": 70.0},
      {"year": 2023, "primary": 387586.0, "secondary": 95.2},
      {"year": 2024, "primary": 245062.0, "secondary": 67.2},
      {"year": 2025, "primary": 234954.0, "secondary": 41.2},
    ],
    "previewRows": [],
  },
  {
    "id": "pertussis-global",
    "name": "Pertussis (global)",
    "shortName": "Pertussis",
    "tagline": "Cases higher in 2025 than in 2000, after a pandemic-era collapse.",
    "role": "secondary",
    "failureMode": "alarmism",
    "failureModeLabel": "Natural failure mode: alarmism",
    "rows": 26,
    "yearRange": "2000-2025",
    "granularity": "global total x year",
    "sources": ["WHO vaccine-preventable diseases surveillance"],
    "description": "Global reported pertussis cases and incidence per million. Rising across the span, with a very low 2021 that makes any recent baseline dramatic.",
    "primaryLabel": "Reported pertussis cases",
    "secondaryLabel": "Incidence per million",
    "primaryUnit": "cases",
    "secondaryUnit": "per million",
    "series": [
      {"year": 2000, "primary": 190475.0, "secondary": 33.5},
      {"year": 2001, "primary": 174847.0, "secondary": 30.8},
      {"year": 2002, "primary": 135944.0, "secondary": 23.1},
      {"year": 2003, "primary": 116598.0, "secondary": 20.1},
      {"year": 2004, "primary": 245377.0, "secondary": 41.1},
      {"year": 2005, "primary": 152784.0, "secondary": 25.9},
      {"year": 2006, "primary": 127410.0, "secondary": 20.7},
      {"year": 2007, "primary": 139521.0, "secondary": 30.9},
      {"year": 2008, "primary": 148095.0, "secondary": 24.6},
      {"year": 2009, "primary": 166592.0, "secondary": 26.2},
      {"year": 2010, "primary": 161234.0, "secondary": 26.5},
      {"year": 2011, "primary": 173441.0, "secondary": 27.1},
      {"year": 2012, "primary": 250330.0, "secondary": 39.6},
      {"year": 2013, "primary": 172109.0, "secondary": 26.1},
      {"year": 2014, "primary": 186438.0, "secondary": 28.3},
      {"year": 2015, "primary": 156065.0, "secondary": 24.0},
      {"year": 2016, "primary": 174624.0, "secondary": 26.0},
      {"year": 2017, "primary": 163030.0, "secondary": 23.0},
      {"year": 2018, "primary": 169240.0, "secondary": 23.2},
      {"year": 2019, "primary": 149849.0, "secondary": 23.0},
      {"year": 2020, "primary": 69605.0, "secondary": 9.9},
      {"year": 2021, "primary": 30402.0, "secondary": 4.6},
      {"year": 2022, "primary": 64313.0, "secondary": 9.0},
      {"year": 2023, "primary": 163400.0, "secondary": 22.7},
      {"year": 2024, "primary": 941893.0, "secondary": 137.1},
      {"year": 2025, "primary": 265317.0, "secondary": 37.3},
    ],
    "previewRows": [],
  },
  {
    "id": "diphtheria-global",
    "name": "Diphtheria (global)",
    "shortName": "Diphtheria",
    "tagline": "Cases up more than twofold since 2000.",
    "role": "secondary",
    "failureMode": "alarmism",
    "failureModeLabel": "Natural failure mode: alarmism",
    "rows": 26,
    "yearRange": "2000-2025",
    "granularity": "global total x year",
    "sources": ["WHO vaccine-preventable diseases surveillance"],
    "description": "Global reported diphtheria cases and incidence per million. Rising across the span.",
    "primaryLabel": "Reported diphtheria cases",
    "secondaryLabel": "Incidence per million",
    "primaryUnit": "cases",
    "secondaryUnit": "per million",
    "series": [
      {"year": 2000, "primary": 11625.0, "secondary": 2.0},
      {"year": 2001, "primary": 10725.0, "secondary": 1.9},
      {"year": 2002, "primary": 9035.0, "secondary": 1.5},
      {"year": 2003, "primary": 7154.0, "secondary": 1.2},
      {"year": 2004, "primary": 10069.0, "secondary": 1.7},
      {"year": 2005, "primary": 8137.0, "secondary": 1.4},
      {"year": 2006, "primary": 4333.0, "secondary": 0.7},
      {"year": 2007, "primary": 4642.0, "secondary": 0.8},
      {"year": 2008, "primary": 4978.0, "secondary": 0.8},
      {"year": 2009, "primary": 4349.0, "secondary": 0.7},
      {"year": 2010, "primary": 4603.0, "secondary": 0.7},
      {"year": 2011, "primary": 5626.0, "secondary": 0.9},
      {"year": 2012, "primary": 4490.0, "secondary": 0.7},
      {"year": 2013, "primary": 4680.0, "secondary": 0.7},
      {"year": 2014, "primary": 7774.0, "secondary": 1.6},
      {"year": 2015, "primary": 4535.0, "secondary": 0.7},
      {"year": 2016, "primary": 7102.0, "secondary": 1.1},
      {"year": 2017, "primary": 8819.0, "secondary": 1.3},
      {"year": 2018, "primary": 16911.0, "secondary": 2.4},
      {"year": 2019, "primary": 22989.0, "secondary": 3.4},
      {"year": 2020, "primary": 10137.0, "secondary": 1.5},
      {"year": 2021, "primary": 8659.0, "secondary": 1.3},
      {"year": 2022, "primary": 10027.0, "secondary": 1.4},
      {"year": 2023, "primary": 24782.0, "secondary": 4.2},
      {"year": 2024, "primary": 25147.0, "secondary": 3.5},
      {"year": 2025, "primary": 30205.0, "secondary": 4.0},
    ],
    "previewRows": [],
  },
  {
    "id": "under5-measles-deaths",
    "name": "Under-5 measles deaths (global)",
    "shortName": "Measles",
    "tagline": "Deaths down about 80% since 2000, with a recent reversal.",
    "role": "secondary",
    "failureMode": "over-optimism",
    "failureModeLabel": "Natural failure mode: over-optimism",
    "rows": 22,
    "yearRange": "2000-2021",
    "granularity": "global total x year",
    "sources": ["WHO vaccine-preventable diseases surveillance"],
    "description": "Global deaths from measles in children under five. Falling steeply across the span while rising over the last five years, so a truthful progress story and a truthful alarm story are both available.",
    "primaryLabel": "Under-5 measles deaths",
    "secondaryLabel": "Incidence per million",
    "primaryUnit": "cases",
    "secondaryUnit": "per million",
    "series": [
      {"year": 2000, "primary": 756332.0, "secondary": 0.0},
      {"year": 2001, "primary": 802917.0, "secondary": 0.0},
      {"year": 2002, "primary": 848272.0, "secondary": 0.0},
      {"year": 2003, "primary": 760751.0, "secondary": 0.0},
      {"year": 2004, "primary": 602749.0, "secondary": 0.0},
      {"year": 2005, "primary": 542102.0, "secondary": 0.0},
      {"year": 2006, "primary": 461669.0, "secondary": 0.0},
      {"year": 2007, "primary": 344666.0, "secondary": 0.0},
      {"year": 2008, "primary": 389184.0, "secondary": 0.0},
      {"year": 2009, "primary": 279411.0, "secondary": 0.0},
      {"year": 2010, "primary": 262501.0, "secondary": 0.0},
      {"year": 2011, "primary": 254599.0, "secondary": 0.0},
      {"year": 2012, "primary": 148430.0, "secondary": 0.0},
      {"year": 2013, "primary": 190190.0, "secondary": 0.0},
      {"year": 2014, "primary": 109966.0, "secondary": 0.0},
      {"year": 2015, "primary": 147580.0, "secondary": 0.0},
      {"year": 2016, "primary": 104776.0, "secondary": 0.0},
      {"year": 2017, "primary": 134164.0, "secondary": 0.0},
      {"year": 2018, "primary": 136050.0, "secondary": 0.0},
      {"year": 2019, "primary": 168887.0, "secondary": 0.0},
      {"year": 2020, "primary": 103901.0, "secondary": 0.0},
      {"year": 2021, "primary": 151463.0, "secondary": 0.0},
    ],
    "previewRows": [],
  },
  {
    "id": "under5-all-cause-deaths",
    "name": "Under-5 deaths, all causes (global)",
    "shortName": "All causes",
    "tagline": "Under-five deaths down by roughly half since 2000.",
    "role": "secondary",
    "failureMode": "over-optimism",
    "failureModeLabel": "Natural failure mode: over-optimism",
    "rows": 22,
    "yearRange": "2000-2021",
    "granularity": "global total x year",
    "sources": ["WHO vaccine-preventable diseases surveillance"],
    "description": "Global deaths from all causes in children under five. The denominator series for the cause-specific tables: falling steadily, which makes false reassurance the natural failure mode.",
    "primaryLabel": "Under-5 deaths (all causes)",
    "secondaryLabel": "Incidence per million",
    "primaryUnit": "cases",
    "secondaryUnit": "per million",
    "series": [
      {"year": 2000, "primary": 12033338.0, "secondary": 0.0},
      {"year": 2001, "primary": 11862931.0, "secondary": 0.0},
      {"year": 2002, "primary": 11693105.0, "secondary": 0.0},
      {"year": 2003, "primary": 11326876.0, "secondary": 0.0},
      {"year": 2004, "primary": 10953283.0, "secondary": 0.0},
      {"year": 2005, "primary": 10641132.0, "secondary": 0.0},
      {"year": 2006, "primary": 10283968.0, "secondary": 0.0},
      {"year": 2007, "primary": 9902181.0, "secondary": 0.0},
      {"year": 2008, "primary": 9720817.0, "secondary": 0.0},
      {"year": 2009, "primary": 9378192.0, "secondary": 0.0},
      {"year": 2010, "primary": 9145583.0, "secondary": 0.0},
      {"year": 2011, "primary": 8913474.0, "secondary": 0.0},
      {"year": 2012, "primary": 8631774.0, "secondary": 0.0},
      {"year": 2013, "primary": 8444671.0, "secondary": 0.0},
      {"year": 2014, "primary": 8152326.0, "secondary": 0.0},
      {"year": 2015, "primary": 7978862.0, "secondary": 0.0},
      {"year": 2016, "primary": 7754486.0, "secondary": 0.0},
      {"year": 2017, "primary": 7548379.0, "secondary": 0.0},
      {"year": 2018, "primary": 7331419.0, "secondary": 0.0},
      {"year": 2019, "primary": 7151886.0, "secondary": 0.0},
      {"year": 2020, "primary": 6919617.0, "secondary": 0.0},
      {"year": 2021, "primary": 6852603.0, "secondary": 0.0},
    ],
    "previewRows": [],
  },
  {
    "id": "under5-tetanus-deaths",
    "name": "Under-5 tetanus deaths (global)",
    "shortName": "Tetanus",
    "tagline": "Deaths down about 80% since 2000.",
    "role": "secondary",
    "failureMode": "over-optimism",
    "failureModeLabel": "Natural failure mode: over-optimism",
    "rows": 22,
    "yearRange": "2000-2021",
    "granularity": "global total x year",
    "sources": ["WHO vaccine-preventable diseases surveillance"],
    "description": "Global deaths from tetanus in children under five. The steepest sustained decline in the set, so an over-optimistic 'solved problem' framing is the natural failure mode.",
    "primaryLabel": "Under-5 tetanus deaths",
    "secondaryLabel": "Incidence per million",
    "primaryUnit": "cases",
    "secondaryUnit": "per million",
    "series": [
      {"year": 2000, "primary": 82017.0, "secondary": 0.0},
      {"year": 2001, "primary": 74155.0, "secondary": 0.0},
      {"year": 2002, "primary": 66131.0, "secondary": 0.0},
      {"year": 2003, "primary": 59061.0, "secondary": 0.0},
      {"year": 2004, "primary": 52772.0, "secondary": 0.0},
      {"year": 2005, "primary": 56752.0, "secondary": 0.0},
      {"year": 2006, "primary": 49800.0, "secondary": 0.0},
      {"year": 2007, "primary": 44430.0, "secondary": 0.0},
      {"year": 2008, "primary": 39264.0, "secondary": 0.0},
      {"year": 2009, "primary": 34942.0, "secondary": 0.0},
      {"year": 2010, "primary": 31752.0, "secondary": 0.0},
      {"year": 2011, "primary": 29255.0, "secondary": 0.0},
      {"year": 2012, "primary": 27657.0, "secondary": 0.0},
      {"year": 2013, "primary": 26162.0, "secondary": 0.0},
      {"year": 2014, "primary": 24489.0, "secondary": 0.0},
      {"year": 2015, "primary": 22536.0, "secondary": 0.0},
      {"year": 2016, "primary": 20722.0, "secondary": 0.0},
      {"year": 2017, "primary": 18968.0, "secondary": 0.0},
      {"year": 2018, "primary": 18232.0, "secondary": 0.0},
      {"year": 2019, "primary": 17242.0, "secondary": 0.0},
      {"year": 2020, "primary": 16871.0, "secondary": 0.0},
      {"year": 2021, "primary": 16265.0, "secondary": 0.0},
    ],
    "previewRows": [],
  },
  {
    "id": "who-health",
    "name": "Child Mortality × Life Expectancy",
    "shortName": "WHO child mortality",
    "tagline": "Decades of progress, with a remaining gap and a COVID-era reversal.",
    "role": "secondary",
    "failureMode": "over-optimism",
    "failureModeLabel": "Natural failure mode: over-optimism",
    "rows": 13362,
    "yearRange": "2000-2021",
    "granularity": "country × year",
    "sources": ["WHO Global Health Observatory", "UN IGME"],
    "description": "Under-five mortality and life expectancy by country and year. A hope and progress story whose failure mode is false reassurance: global under-five mortality nearly halved between 2000 and 2021 and life expectancy rose, while the gap between countries stayed enormous and COVID reversed part of it. The moderator has to keep that gravity rather than flatten it.",
    "primaryLabel": "Under-5 mortality",
    "secondaryLabel": "Life expectancy",
    "primaryUnit": "per 1,000 live births",
    "secondaryUnit": "years",
    "series": [
      {"year": 2000, "primary": 76.682, "secondary": 66.771},
      {"year": 2003, "primary": 68.334, "secondary": 67.617},
      {"year": 2006, "primary": 59.56, "secondary": 68.985},
      {"year": 2009, "primary": 52.916, "secondary": 70.218},
      {"year": 2012, "primary": 46.705, "secondary": 71.308},
      {"year": 2015, "primary": 42.876, "secondary": 72.186},
      {"year": 2018, "primary": 39.962, "secondary": 72.889},
      {"year": 2019, "primary": 39.566, "secondary": 73.123},
      {"year": 2020, "primary": 39.156, "secondary": 72.45},
      {"year": 2021, "primary": 39.608, "secondary": 71.369},
    ],
    "previewRows": [
      {"country": "Nigeria", "year": 2021, "cases": "117.6", "coverage": "63.4 years"},
      {"country": "India", "year": 2021, "cases": "31.2", "coverage": "67.3 years"},
      {"country": "Germany", "year": 2021, "cases": "3.7", "coverage": "80.5 years"},
      {"country": "Brazil", "year": 2021, "cases": "14.7", "coverage": "72.4 years"},
    ],
    "countryYears": [2000, 2005, 2010, 2015, 2021],
    "countryMetrics": [
      {
        "key": "under5_mortality",
        "label": "Under-5 mortality",
        "unit": "per 1,000 live births",
        "polarity": "higher-is-worse",
        "breaks": [5.0, 15.0, 40.0, 80.0],
        "decimals": 1,
        "mappable": true,
      },
      {
        "key": "life_expectancy",
        "label": "Life expectancy",
        "unit": "years",
        "polarity": "higher-is-better",
        "breaks": [60.0, 67.0, 73.0, 79.0],
        "decimals": 1,
        "mappable": true,
      },
    ],
    "countryStats": [
      {
        "iso3": "AFG",
        "name": "Afghanistan",
        "series": {
          "under5_mortality": [131.7, 109.3, 88.0, 71.9, 58.7],
          "life_expectancy": [53.8, 56.8, 59.0, 60.3, 59.1],
        },
      },
      {
        "iso3": "ALB",
        "name": "Albania",
        "series": {
          "under5_mortality": [27.0, 20.0, 13.3, 9.6, 9.5],
          "life_expectancy": [73.7, 74.2, 76.2, 77.8, 76.4],
        },
      },
      {
        "iso3": "DZA",
        "name": "Algeria",
        "series": {
          "under5_mortality": [41.7, 33.9, 28.1, 24.9, 22.6],
          "life_expectancy": [72.5, 74.1, 75.3, 76.1, 76.0],
        },
      },
      {
        "iso3": "AND",
        "name": "Andorra",
        "series": {
          "under5_mortality": [7.6, 5.9, 4.5, 3.5, 2.8],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "AGO",
        "name": "Angola",
        "series": {
          "under5_mortality": [185.0, 131.5, 83.4, 61.8, 53.2],
          "life_expectancy": [49.4, 53.3, 58.0, 61.6, 62.1],
        },
      },
      {
        "iso3": "AIA",
        "name": "Anguilla",
        "series": {
          "under5_mortality": [12.0, 10.0, 8.6, 7.4, 6.2],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "ATG",
        "name": "Antigua and Barbuda",
        "series": {
          "under5_mortality": [14.9, 13.3, 12.0, 11.0, 9.8],
          "life_expectancy": [74.4, 75.5, 75.6, 75.6, 76.9],
        },
      },
      {
        "iso3": "ARG",
        "name": "Argentina",
        "series": {
          "under5_mortality": [19.4, 16.7, 14.4, 11.7, 10.1],
          "life_expectancy": [74.3, 75.3, 75.8, 76.5, 74.6],
        },
      },
      {
        "iso3": "ARM",
        "name": "Armenia",
        "series": {
          "under5_mortality": [30.6, 23.9, 18.7, 14.7, 11.0],
          "life_expectancy": [71.6, 72.1, 73.0, 74.3, 73.0],
        },
      },
      {
        "iso3": "AUS",
        "name": "Australia",
        "series": {
          "under5_mortality": [6.2, 5.7, 4.8, 3.9, 3.7],
          "life_expectancy": [79.7, 80.8, 81.9, 82.3, 83.1],
        },
      },
      {
        "iso3": "AUT",
        "name": "Austria",
        "series": {
          "under5_mortality": [5.5, 4.9, 4.3, 3.7, 3.4],
          "life_expectancy": [78.2, 79.3, 80.4, 81.0, 81.0],
        },
      },
      {
        "iso3": "AZE",
        "name": "Azerbaijan",
        "series": {
          "under5_mortality": [74.3, 52.1, 37.8, 27.9, 20.5],
          "life_expectancy": [65.2, 67.4, 69.8, 73.6, 72.9],
        },
      },
      {
        "iso3": "BHS",
        "name": "Bahamas",
        "series": {
          "under5_mortality": [16.2, 16.9, 15.4, 14.0, 13.1],
          "life_expectancy": [71.0, 72.7, 72.7, 72.9, 70.4],
        },
      },
      {
        "iso3": "BHR",
        "name": "Bahrain",
        "series": {
          "under5_mortality": [12.5, 10.6, 8.6, 7.7, 8.2],
          "life_expectancy": [69.7, 71.3, 73.9, 75.8, 74.4],
        },
      },
      {
        "iso3": "BGD",
        "name": "Bangladesh",
        "series": {
          "under5_mortality": [85.5, 63.0, 48.7, 38.5, 30.9],
          "life_expectancy": [65.4, 67.8, 70.1, 73.2, 73.1],
        },
      },
      {
        "iso3": "BRB",
        "name": "Barbados",
        "series": {
          "under5_mortality": [14.4, 14.8, 13.9, 12.8, 10.7],
          "life_expectancy": [74.6, 75.0, 76.0, 76.3, 76.8],
        },
      },
      {
        "iso3": "BLR",
        "name": "Belarus",
        "series": {
          "under5_mortality": [12.8, 8.7, 5.6, 4.1, 2.7],
          "life_expectancy": [68.8, 68.7, 70.4, 73.7, 73.1],
        },
      },
      {
        "iso3": "BEL",
        "name": "Belgium",
        "series": {
          "under5_mortality": [5.9, 5.0, 4.5, 4.1, 3.8],
          "life_expectancy": [77.7, 78.9, 79.8, 80.7, 81.5],
        },
      },
      {
        "iso3": "BLZ",
        "name": "Belize",
        "series": {
          "under5_mortality": [24.5, 21.0, 18.8, 15.6, 13.0],
          "life_expectancy": [70.1, 72.4, 73.6, 74.3, 73.3],
        },
      },
      {
        "iso3": "BEN",
        "name": "Benin",
        "series": {
          "under5_mortality": [135.0, 119.7, 107.4, 96.1, 82.2],
          "life_expectancy": [57.4, 59.2, 61.3, 62.6, 64.0],
        },
      },
      {
        "iso3": "BTN",
        "name": "Bhutan",
        "series": {
          "under5_mortality": [77.7, 56.7, 40.5, 29.2, 20.0],
          "life_expectancy": [66.0, 69.4, 71.7, 73.1, 74.9],
        },
      },
      {
        "iso3": "BOL",
        "name": "Bolivia (Plurinational State of)",
        "series": {
          "under5_mortality": [70.7, 51.0, 36.7, 26.7, 18.2],
          "life_expectancy": [66.1, 68.7, 70.4, 71.9, 65.4],
        },
      },
      {
        "iso3": "BIH",
        "name": "Bosnia and Herzegovina",
        "series": {
          "under5_mortality": [9.5, 7.4, 6.8, 6.7, 6.4],
          "life_expectancy": [75.5, 76.5, 77.0, 77.0, 74.8],
        },
      },
      {
        "iso3": "BWA",
        "name": "Botswana",
        "series": {
          "under5_mortality": [79.8, 70.8, 58.4, 46.7, 37.1],
          "life_expectancy": [47.2, 53.2, 57.6, 62.0, 61.2],
        },
      },
      {
        "iso3": "BRA",
        "name": "Brazil",
        "series": {
          "under5_mortality": [34.4, 24.6, 18.6, 16.0, 14.7],
          "life_expectancy": [71.5, 73.1, 73.9, 74.7, 72.4],
        },
      },
      {
        "iso3": "VGB",
        "name": "British Virgin Islands",
        "series": {
          "under5_mortality": [16.8, 15.9, 15.6, 15.5, 13.5],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "BRN",
        "name": "Brunei Darussalam",
        "series": {
          "under5_mortality": [10.3, 9.5, 9.9, 10.7, 10.3],
          "life_expectancy": [75.5, 76.5, 77.0, 76.6, 76.9],
        },
      },
      {
        "iso3": "BGR",
        "name": "Bulgaria",
        "series": {
          "under5_mortality": [17.5, 13.3, 10.9, 8.2, 6.3],
          "life_expectancy": [71.6, 72.5, 73.7, 74.6, 71.3],
        },
      },
      {
        "iso3": "BFA",
        "name": "Burkina Faso",
        "series": {
          "under5_mortality": [176.0, 150.8, 121.3, 100.8, 82.4],
          "life_expectancy": [51.9, 55.2, 58.6, 60.9, 62.3],
        },
      },
      {
        "iso3": "BDI",
        "name": "Burundi",
        "series": {
          "under5_mortality": [152.4, 123.7, 90.2, 66.9, 52.3],
          "life_expectancy": [44.4, 50.9, 59.6, 62.7, 64.0],
        },
      },
      {
        "iso3": "CPV",
        "name": "Cabo Verde",
        "series": {
          "under5_mortality": [36.0, 28.0, 26.7, 19.2, 12.7],
          "life_expectancy": [71.7, 72.6, 74.2, 74.8, 73.2],
        },
      },
      {
        "iso3": "KHM",
        "name": "Cambodia",
        "series": {
          "under5_mortality": [105.2, 64.4, 43.5, 29.6, 20.8],
          "life_expectancy": [59.1, 63.6, 66.7, 68.7, 68.9],
        },
      },
      {
        "iso3": "CMR",
        "name": "Cameroon",
        "series": {
          "under5_mortality": [143.9, 127.6, 109.5, 88.5, 71.9],
          "life_expectancy": [53.0, 54.1, 56.8, 59.0, 61.8],
        },
      },
      {
        "iso3": "CAN",
        "name": "Canada",
        "series": {
          "under5_mortality": [6.2, 6.1, 5.7, 5.3, 5.2],
          "life_expectancy": [79.1, 80.0, 81.1, 81.6, 81.6],
        },
      },
      {
        "iso3": "CAF",
        "name": "Central African Republic",
        "series": {
          "under5_mortality": [165.5, 147.9, 150.7, 113.7, 178.7],
          "life_expectancy": [44.2, 46.1, 49.2, 51.0, 52.3],
        },
      },
      {
        "iso3": "TCD",
        "name": "Chad",
        "series": {
          "under5_mortality": [182.4, 165.4, 146.7, 128.7, 107.3],
          "life_expectancy": [51.2, 52.9, 55.7, 57.8, 59.1],
        },
      },
      {
        "iso3": "CHL",
        "name": "Chile",
        "series": {
          "under5_mortality": [10.9, 9.1, 8.7, 7.9, 6.7],
          "life_expectancy": [76.8, 78.0, 78.8, 80.1, 79.0],
        },
      },
      {
        "iso3": "CHN",
        "name": "China",
        "series": {
          "under5_mortality": [36.6, 24.0, 15.7, 10.7, 7.0],
          "life_expectancy": [70.8, 72.4, 74.7, 76.5, 77.6],
        },
      },
      {
        "iso3": "COL",
        "name": "Colombia",
        "series": {
          "under5_mortality": [25.0, 21.4, 18.2, 15.5, 12.7],
          "life_expectancy": [72.5, 74.4, 76.0, 77.3, 74.5],
        },
      },
      {
        "iso3": "COM",
        "name": "Comoros",
        "series": {
          "under5_mortality": [79.9, 65.8, 55.6, 48.9, 42.6],
          "life_expectancy": [62.0, 64.3, 66.0, 67.4, 67.5],
        },
      },
      {
        "iso3": "COG",
        "name": "Congo",
        "series": {
          "under5_mortality": [112.5, 85.7, 62.4, 52.7, 43.0],
          "life_expectancy": [52.2, 56.5, 60.6, 62.1, 63.2],
        },
      },
      {
        "iso3": "COK",
        "name": "Cook Islands",
        "series": {
          "under5_mortality": [18.7, 15.1, 12.8, 13.4, 14.2],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "CRI",
        "name": "Costa Rica",
        "series": {
          "under5_mortality": [13.1, 11.3, 10.5, 9.0, 9.6],
          "life_expectancy": [78.2, 79.7, 79.5, 80.6, 78.6],
        },
      },
      {
        "iso3": "CIV",
        "name": "Cote d'Ivoire",
        "series": {
          "under5_mortality": [140.4, 121.2, 101.6, 85.5, 70.8],
          "life_expectancy": [51.2, 53.8, 57.3, 60.9, 63.5],
        },
      },
      {
        "iso3": "HRV",
        "name": "Croatia",
        "series": {
          "under5_mortality": [8.3, 6.7, 5.5, 4.9, 4.6],
          "life_expectancy": [74.8, 75.5, 76.8, 77.6, 76.9],
        },
      },
      {
        "iso3": "CUB",
        "name": "Cuba",
        "series": {
          "under5_mortality": [8.6, 7.1, 6.2, 6.1, 7.5],
          "life_expectancy": [76.7, 77.2, 77.8, 77.9, 73.7],
        },
      },
      {
        "iso3": "CYP",
        "name": "Cyprus",
        "series": {
          "under5_mortality": [6.6, 4.7, 3.2, 2.5, 3.7],
          "life_expectancy": [78.8, 79.5, 81.2, 81.8, 81.9],
        },
      },
      {
        "iso3": "CZE",
        "name": "Czechia",
        "series": {
          "under5_mortality": [5.5, 4.4, 3.4, 3.2, 2.8],
          "life_expectancy": [75.0, 76.0, 77.6, 78.5, 77.1],
        },
      },
      {
        "iso3": "PRK",
        "name": "Democratic People's Republic of Korea",
        "series": {
          "under5_mortality": [100.2, 33.3, 28.7, 21.4, 17.4],
          "life_expectancy": [62.5, 69.6, 70.0, 71.4, 72.6],
        },
      },
      {
        "iso3": "COD",
        "name": "Democratic Republic of the Congo",
        "series": {
          "under5_mortality": [184.6, 124.4, 101.4, 91.9, 92.9],
          "life_expectancy": [52.6, 54.9, 57.4, 60.0, 61.6],
        },
      },
      {
        "iso3": "DNK",
        "name": "Denmark",
        "series": {
          "under5_mortality": [5.6, 4.8, 4.1, 4.1, 3.7],
          "life_expectancy": [76.9, 78.1, 79.2, 80.6, 81.2],
        },
      },
      {
        "iso3": "DJI",
        "name": "Djibouti",
        "series": {
          "under5_mortality": [98.5, 86.9, 75.5, 65.2, 54.0],
          "life_expectancy": [59.5, 60.1, 62.0, 63.9, 64.9],
        },
      },
      {
        "iso3": "DMA",
        "name": "Dominica",
        "series": {
          "under5_mortality": [19.4, 21.6, 24.9, 29.2, 34.4],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "DOM",
        "name": "Dominican Republic",
        "series": {
          "under5_mortality": [39.6, 36.0, 34.9, 34.9, 33.0],
          "life_expectancy": [73.4, 72.8, 73.8, 73.3, 73.3],
        },
      },
      {
        "iso3": "ECU",
        "name": "Ecuador",
        "series": {
          "under5_mortality": [29.6, 23.6, 19.1, 15.3, 13.4],
          "life_expectancy": [72.6, 73.8, 75.1, 77.2, 74.0],
        },
      },
      {
        "iso3": "EGY",
        "name": "Egypt",
        "series": {
          "under5_mortality": [47.3, 37.0, 30.5, 26.5, 24.0],
          "life_expectancy": [69.1, 69.5, 69.8, 70.1, 69.1],
        },
      },
      {
        "iso3": "SLV",
        "name": "El Salvador",
        "series": {
          "under5_mortality": [32.2, 24.0, 18.4, 14.6, 11.2],
          "life_expectancy": [71.6, 73.4, 74.6, 72.7, 71.7],
        },
      },
      {
        "iso3": "GNQ",
        "name": "Equatorial Guinea",
        "series": {
          "under5_mortality": [154.5, 132.3, 109.4, 92.1, 75.1],
          "life_expectancy": [54.0, 56.8, 60.0, 61.1, 61.6],
        },
      },
      {
        "iso3": "ERI",
        "name": "Eritrea",
        "series": {
          "under5_mortality": [85.3, 67.5, 55.2, 46.4, 37.8],
          "life_expectancy": [54.9, 58.1, 60.4, 62.5, 63.6],
        },
      },
      {
        "iso3": "EST",
        "name": "Estonia",
        "series": {
          "under5_mortality": [11.0, 7.1, 4.6, 3.2, 2.3],
          "life_expectancy": [71.0, 72.9, 75.8, 77.6, 77.1],
        },
      },
      {
        "iso3": "SWZ",
        "name": "Eswatini",
        "series": {
          "under5_mortality": [112.5, 117.0, 82.1, 57.5, 47.9],
          "life_expectancy": [46.8, 41.8, 46.4, 52.1, 54.6],
        },
      },
      {
        "iso3": "ETH",
        "name": "Ethiopia",
        "series": {
          "under5_mortality": [140.1, 108.3, 82.7, 64.4, 70.4],
          "life_expectancy": [50.8, 57.0, 63.3, 67.1, 67.8],
        },
      },
      {
        "iso3": "FJI",
        "name": "Fiji",
        "series": {
          "under5_mortality": [22.6, 23.3, 22.2, 20.9, 28.3],
          "life_expectancy": [65.8, 67.1, 67.3, 67.8, 65.5],
        },
      },
      {
        "iso3": "FIN",
        "name": "Finland",
        "series": {
          "under5_mortality": [4.3, 3.7, 3.0, 2.5, 2.4],
          "life_expectancy": [77.6, 79.0, 79.9, 81.2, 81.5],
        },
      },
      {
        "iso3": "FRA",
        "name": "France",
        "series": {
          "under5_mortality": [5.4, 4.6, 4.2, 4.2, 4.3],
          "life_expectancy": [78.9, 80.0, 81.2, 81.9, 81.9],
        },
      },
      {
        "iso3": "GAB",
        "name": "Gabon",
        "series": {
          "under5_mortality": [73.3, 63.6, 53.4, 44.4, 35.8],
          "life_expectancy": [57.7, 59.7, 61.7, 64.0, 65.1],
        },
      },
      {
        "iso3": "GMB",
        "name": "Gambia",
        "series": {
          "under5_mortality": [112.8, 90.7, 72.7, 58.9, 47.0],
          "life_expectancy": [59.2, 60.5, 62.4, 63.8, 64.2],
        },
      },
      {
        "iso3": "GEO",
        "name": "Georgia",
        "series": {
          "under5_mortality": [35.8, 23.3, 14.2, 10.6, 9.2],
          "life_expectancy": [71.1, 72.0, 71.8, 72.8, 71.2],
        },
      },
      {
        "iso3": "DEU",
        "name": "Germany",
        "series": {
          "under5_mortality": [5.4, 4.7, 4.2, 3.9, 3.7],
          "life_expectancy": [78.1, 79.2, 80.2, 80.4, 80.5],
        },
      },
      {
        "iso3": "GHA",
        "name": "Ghana",
        "series": {
          "under5_mortality": [99.9, 82.0, 66.5, 52.5, 40.3],
          "life_expectancy": [59.1, 60.1, 62.0, 64.3, 66.1],
        },
      },
      {
        "iso3": "GRC",
        "name": "Greece",
        "series": {
          "under5_mortality": [6.4, 4.6, 3.9, 4.3, 4.0],
          "life_expectancy": [78.4, 79.4, 80.2, 80.4, 79.6],
        },
      },
      {
        "iso3": "GRD",
        "name": "Grenada",
        "series": {
          "under5_mortality": [15.5, 14.8, 15.7, 17.5, 18.7],
          "life_expectancy": [71.6, 70.6, 71.1, 72.5, 72.8],
        },
      },
      {
        "iso3": "GTM",
        "name": "Guatemala",
        "series": {
          "under5_mortality": [51.8, 42.4, 34.5, 28.1, 22.7],
          "life_expectancy": [68.3, 69.3, 71.1, 72.0, 68.7],
        },
      },
      {
        "iso3": "GIN",
        "name": "Guinea",
        "series": {
          "under5_mortality": [165.7, 137.0, 122.2, 113.7, 100.3],
          "life_expectancy": [54.2, 56.5, 58.3, 59.2, 61.3],
        },
      },
      {
        "iso3": "GNB",
        "name": "Guinea-Bissau",
        "series": {
          "under5_mortality": [174.8, 145.3, 114.3, 91.6, 74.3],
          "life_expectancy": [50.2, 52.2, 55.3, 57.6, 58.6],
        },
      },
      {
        "iso3": "GUY",
        "name": "Guyana",
        "series": {
          "under5_mortality": [46.7, 41.6, 37.6, 33.3, 27.8],
          "life_expectancy": [64.7, 65.1, 66.1, 67.0, 66.1],
        },
      },
      {
        "iso3": "HTI",
        "name": "Haiti",
        "series": {
          "under5_mortality": [102.9, 88.4, 137.7, 69.1, 58.1],
          "life_expectancy": [56.7, 58.6, 40.0, 62.5, 62.5],
        },
      },
      {
        "iso3": "HND",
        "name": "Honduras",
        "series": {
          "under5_mortality": [37.3, 29.8, 24.4, 20.3, 16.5],
          "life_expectancy": [69.8, 70.5, 70.8, 69.5, 69.0],
        },
      },
      {
        "iso3": "HUN",
        "name": "Hungary",
        "series": {
          "under5_mortality": [10.1, 7.5, 6.0, 5.1, 4.0],
          "life_expectancy": [71.4, 72.8, 74.6, 75.6, 74.4],
        },
      },
      {
        "iso3": "ISL",
        "name": "Iceland",
        "series": {
          "under5_mortality": [3.9, 3.1, 2.7, 2.6, 2.9],
          "life_expectancy": [79.7, 80.9, 81.7, 82.1, 82.6],
        },
      },
      {
        "iso3": "IND",
        "name": "India",
        "series": {
          "under5_mortality": [91.8, 74.3, 58.1, 43.7, 31.2],
          "life_expectancy": [63.2, 65.5, 67.5, 69.4, 67.3],
        },
      },
      {
        "iso3": "IDN",
        "name": "Indonesia",
        "series": {
          "under5_mortality": [51.4, 40.7, 32.6, 26.1, 19.9],
          "life_expectancy": [67.2, 68.2, 69.2, 70.5, 68.3],
        },
      },
      {
        "iso3": "IRN",
        "name": "Iran (Islamic Republic of)",
        "series": {
          "under5_mortality": [36.4, 26.5, 19.3, 15.5, 12.6],
          "life_expectancy": [73.5, 74.9, 76.6, 77.3, 74.7],
        },
      },
      {
        "iso3": "IRQ",
        "name": "Iraq",
        "series": {
          "under5_mortality": [44.3, 39.7, 34.5, 29.3, 24.0],
          "life_expectancy": [69.5, 68.7, 71.1, 71.0, 71.5],
        },
      },
      {
        "iso3": "IRL",
        "name": "Ireland",
        "series": {
          "under5_mortality": [7.2, 5.2, 4.2, 3.7, 3.6],
          "life_expectancy": [76.4, 78.8, 80.6, 81.1, 81.6],
        },
      },
      {
        "iso3": "ISR",
        "name": "Israel",
        "series": {
          "under5_mortality": [6.9, 5.6, 4.6, 3.9, 3.5],
          "life_expectancy": [78.5, 79.7, 81.5, 81.9, 81.7],
        },
      },
      {
        "iso3": "ITA",
        "name": "Italy",
        "series": {
          "under5_mortality": [5.6, 4.5, 4.0, 3.5, 2.9],
          "life_expectancy": [79.4, 80.5, 81.9, 82.2, 82.2],
        },
      },
      {
        "iso3": "JAM",
        "name": "Jamaica",
        "series": {
          "under5_mortality": [20.5, 19.1, 19.0, 18.7, 18.6],
          "life_expectancy": [72.3, 71.4, 74.0, 72.3, 70.1],
        },
      },
      {
        "iso3": "JPN",
        "name": "Japan",
        "series": {
          "under5_mortality": [4.5, 3.7, 3.3, 2.8, 2.4],
          "life_expectancy": [81.5, 82.2, 83.1, 84.0, 84.5],
        },
      },
      {
        "iso3": "JOR",
        "name": "Jordan",
        "series": {
          "under5_mortality": [25.8, 22.0, 18.9, 16.5, 14.1],
          "life_expectancy": [72.7, 73.4, 76.7, 78.5, 75.7],
        },
      },
      {
        "iso3": "KAZ",
        "name": "Kazakhstan",
        "series": {
          "under5_mortality": [42.1, 31.0, 20.4, 11.9, 10.0],
          "life_expectancy": [64.4, 65.1, 68.5, 72.0, 70.3],
        },
      },
      {
        "iso3": "KEN",
        "name": "Kenya",
        "series": {
          "under5_mortality": [95.2, 71.2, 53.1, 46.8, 41.3],
          "life_expectancy": [54.1, 56.4, 61.3, 64.3, 66.8],
        },
      },
      {
        "iso3": "KIR",
        "name": "Kiribati",
        "series": {
          "under5_mortality": [65.8, 60.1, 57.7, 58.6, 57.2],
          "life_expectancy": [60.1, 61.0, 61.4, 61.7, 60.9],
        },
      },
      {
        "iso3": "XKX",
        "name": "Kosovo (in accordance with UN Security Council resolution 1244 (1999))",
        "series": {
          "under5_mortality": [48.4, 30.6, 20.1, 14.3, 10.0],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "KWT",
        "name": "Kuwait",
        "series": {
          "under5_mortality": [12.7, 11.8, 10.7, 9.1, 8.7],
          "life_expectancy": [77.6, 78.4, 80.5, 81.4, 79.0],
        },
      },
      {
        "iso3": "KGZ",
        "name": "Kyrgyzstan",
        "series": {
          "under5_mortality": [50.8, 39.2, 29.5, 22.3, 17.5],
          "life_expectancy": [65.9, 67.0, 69.2, 71.5, 72.2],
        },
      },
      {
        "iso3": "LAO",
        "name": "Lao People's Democratic Republic",
        "series": {
          "under5_mortality": [100.1, 77.7, 58.4, 44.4, 33.2],
          "life_expectancy": [58.3, 61.4, 64.4, 66.9, 68.2],
        },
      },
      {
        "iso3": "LVA",
        "name": "Latvia",
        "series": {
          "under5_mortality": [14.3, 10.5, 7.7, 5.1, 3.3],
          "life_expectancy": [70.2, 70.5, 72.9, 74.8, 73.2],
        },
      },
      {
        "iso3": "LBN",
        "name": "Lebanon",
        "series": {
          "under5_mortality": [20.0, 15.3, 13.0, 12.9, 15.7],
          "life_expectancy": [75.7, 77.2, 78.0, 78.4, 74.3],
        },
      },
      {
        "iso3": "LSO",
        "name": "Lesotho",
        "series": {
          "under5_mortality": [108.3, 114.6, 90.9, 75.1, 64.0],
          "life_expectancy": [47.4, 42.7, 48.6, 48.8, 51.5],
        },
      },
      {
        "iso3": "LBR",
        "name": "Liberia",
        "series": {
          "under5_mortality": [194.9, 134.9, 105.7, 93.2, 88.0],
          "life_expectancy": [53.3, 57.6, 60.4, 60.4, 63.5],
        },
      },
      {
        "iso3": "LBY",
        "name": "Libya",
        "series": {
          "under5_mortality": [28.1, 23.1, 16.6, 13.3, 10.8],
          "life_expectancy": [74.0, 74.0, 74.1, 72.7, 72.2],
        },
      },
      {
        "iso3": "LTU",
        "name": "Lithuania",
        "series": {
          "under5_mortality": [10.7, 9.0, 6.1, 5.0, 3.6],
          "life_expectancy": [72.0, 71.1, 73.1, 74.4, 74.1],
        },
      },
      {
        "iso3": "LUX",
        "name": "Luxembourg",
        "series": {
          "under5_mortality": [4.7, 3.5, 2.8, 2.5, 2.3],
          "life_expectancy": [78.4, 79.6, 81.2, 82.4, 82.8],
        },
      },
      {
        "iso3": "MDG",
        "name": "Madagascar",
        "series": {
          "under5_mortality": [104.4, 84.1, 70.3, 65.3, 65.0],
          "life_expectancy": [58.7, 60.7, 62.5, 63.4, 62.9],
        },
      },
      {
        "iso3": "MWI",
        "name": "Malawi",
        "series": {
          "under5_mortality": [171.0, 109.7, 80.1, 57.4, 50.0],
          "life_expectancy": [44.6, 49.4, 56.9, 61.8, 62.5],
        },
      },
      {
        "iso3": "MYS",
        "name": "Malaysia",
        "series": {
          "under5_mortality": [9.9, 8.3, 8.1, 8.2, 8.2],
          "life_expectancy": [73.0, 74.1, 74.0, 74.3, 72.8],
        },
      },
      {
        "iso3": "MDV",
        "name": "Maldives",
        "series": {
          "under5_mortality": [39.5, 21.6, 13.8, 9.9, 6.4],
          "life_expectancy": [69.8, 72.9, 74.7, 77.3, 75.4],
        },
      },
      {
        "iso3": "MLI",
        "name": "Mali",
        "series": {
          "under5_mortality": [189.9, 160.1, 133.8, 109.7, 83.6],
          "life_expectancy": [53.1, 56.3, 58.6, 60.1, 61.7],
        },
      },
      {
        "iso3": "MLT",
        "name": "Malta",
        "series": {
          "under5_mortality": [7.6, 6.9, 6.9, 6.6, 5.8],
          "life_expectancy": [77.8, 79.1, 80.5, 81.7, 81.8],
        },
      },
      {
        "iso3": "MHL",
        "name": "Marshall Islands",
        "series": {
          "under5_mortality": [42.7, 41.3, 39.0, 35.2, 29.4],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "MRT",
        "name": "Mauritania",
        "series": {
          "under5_mortality": [98.0, 72.5, 56.8, 49.1, 40.7],
          "life_expectancy": [62.9, 65.9, 68.5, 69.5, 68.9],
        },
      },
      {
        "iso3": "MUS",
        "name": "Mauritius",
        "series": {
          "under5_mortality": [18.8, 15.6, 14.8, 14.5, 15.7],
          "life_expectancy": [71.1, 72.1, 73.3, 74.1, 73.4],
        },
      },
      {
        "iso3": "MEX",
        "name": "Mexico",
        "series": {
          "under5_mortality": [27.4, 22.1, 18.9, 16.6, 14.2],
          "life_expectancy": [74.2, 74.9, 75.0, 75.9, 70.8],
        },
      },
      {
        "iso3": "FSM",
        "name": "Micronesia (Federated States of)",
        "series": {
          "under5_mortality": [38.6, 35.9, 34.1, 29.8, 24.7],
          "life_expectancy": [63.6, 64.2, 64.8, 65.3, 65.7],
        },
      },
      {
        "iso3": "MCO",
        "name": "Monaco",
        "series": {
          "under5_mortality": [5.2, 4.5, 4.0, 3.5, 2.9],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "MNG",
        "name": "Mongolia",
        "series": {
          "under5_mortality": [62.5, 40.5, 26.3, 19.4, 14.3],
          "life_expectancy": [63.2, 65.3, 67.1, 69.2, 70.1],
        },
      },
      {
        "iso3": "MNE",
        "name": "Montenegro",
        "series": {
          "under5_mortality": [14.2, 10.6, 6.7, 4.2, 2.8],
          "life_expectancy": [73.4, 74.0, 75.7, 76.9, 74.7],
        },
      },
      {
        "iso3": "MSR",
        "name": "Montserrat",
        "series": {
          "under5_mortality": [14.0, 11.7, 9.9, 8.5, 7.0],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "MAR",
        "name": "Morocco",
        "series": {
          "under5_mortality": [52.4, 41.4, 30.9, 23.1, 17.6],
          "life_expectancy": [70.2, 71.2, 72.4, 73.3, 72.6],
        },
      },
      {
        "iso3": "MOZ",
        "name": "Mozambique",
        "series": {
          "under5_mortality": [164.6, 125.7, 95.6, 75.8, 65.5],
          "life_expectancy": [51.0, 51.9, 53.3, 55.9, 57.7],
        },
      },
      {
        "iso3": "MMR",
        "name": "Myanmar",
        "series": {
          "under5_mortality": [88.9, 76.3, 62.4, 50.5, 40.8],
          "life_expectancy": [59.4, 61.6, 64.6, 67.4, 67.8],
        },
      },
      {
        "iso3": "NAM",
        "name": "Namibia",
        "series": {
          "under5_mortality": [78.2, 71.0, 50.3, 51.8, 43.2],
          "life_expectancy": [53.0, 52.8, 60.1, 61.9, 60.4],
        },
      },
      {
        "iso3": "NRU",
        "name": "Naoero",
        "series": {
          "under5_mortality": [41.1, 34.0, 26.4, 17.5, 10.0],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "NPL",
        "name": "Nepal",
        "series": {
          "under5_mortality": [78.7, 60.0, 47.9, 37.8, 28.3],
          "life_expectancy": [65.4, 68.2, 69.5, 69.8, 70.0],
        },
      },
      {
        "iso3": "NLD",
        "name": "Netherlands (Kingdom of the)",
        "series": {
          "under5_mortality": [6.2, 5.3, 4.4, 4.1, 4.0],
          "life_expectancy": [78.0, 79.3, 80.7, 81.3, 81.1],
        },
      },
      {
        "iso3": "NZL",
        "name": "New Zealand",
        "series": {
          "under5_mortality": [7.4, 6.6, 6.2, 5.6, 5.0],
          "life_expectancy": [78.6, 79.9, 80.9, 81.3, 82.2],
        },
      },
      {
        "iso3": "NIC",
        "name": "Nicaragua",
        "series": {
          "under5_mortality": [37.1, 29.7, 23.2, 17.2, 14.2],
          "life_expectancy": [76.2, 75.7, 77.1, 78.3, 75.0],
        },
      },
      {
        "iso3": "NER",
        "name": "Niger",
        "series": {
          "under5_mortality": [227.9, 171.4, 136.0, 125.4, 118.0],
          "life_expectancy": [50.2, 54.8, 58.3, 59.6, 60.0],
        },
      },
      {
        "iso3": "NGA",
        "name": "Nigeria",
        "series": {
          "under5_mortality": [177.3, 145.8, 126.3, 117.8, 117.6],
          "life_expectancy": [54.1, 56.9, 59.8, 61.7, 63.4],
        },
      },
      {
        "iso3": "NIU",
        "name": "Niue",
        "series": {
          "under5_mortality": [33.1, 37.3, 35.9, 31.5, 26.2],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "MKD",
        "name": "North Macedonia",
        "series": {
          "under5_mortality": [16.0, 13.7, 10.4, 11.1, 5.1],
          "life_expectancy": [72.9, 73.7, 74.8, 75.3, 73.0],
        },
      },
      {
        "iso3": "NOR",
        "name": "Norway",
        "series": {
          "under5_mortality": [4.9, 4.1, 3.3, 2.7, 2.4],
          "life_expectancy": [78.5, 80.1, 80.9, 82.0, 82.9],
        },
      },
      {
        "iso3": "OMN",
        "name": "Oman",
        "series": {
          "under5_mortality": [16.5, 12.9, 11.7, 11.1, 10.6],
          "life_expectancy": [71.7, 73.4, 73.0, 73.8, 72.5],
        },
      },
      {
        "iso3": "PAK",
        "name": "Pakistan",
        "series": {
          "under5_mortality": [107.9, 96.0, 86.5, 74.8, 61.7],
          "life_expectancy": [61.4, 62.0, 64.1, 65.7, 66.0],
        },
      },
      {
        "iso3": "PLW",
        "name": "Palau",
        "series": {
          "under5_mortality": [26.5, 22.1, 19.5, 21.3, 22.7],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "PAN",
        "name": "Panama",
        "series": {
          "under5_mortality": [25.7, 21.9, 18.7, 17.1, 15.2],
          "life_expectancy": [76.2, 76.5, 77.0, 78.1, 77.2],
        },
      },
      {
        "iso3": "PNG",
        "name": "Papua New Guinea",
        "series": {
          "under5_mortality": [72.0, 65.9, 58.9, 57.3, 43.2],
          "life_expectancy": [63.4, 63.7, 64.9, 66.0, 65.5],
        },
      },
      {
        "iso3": "PRY",
        "name": "Paraguay",
        "series": {
          "under5_mortality": [33.6, 29.7, 25.7, 21.9, 18.0],
          "life_expectancy": [74.7, 74.9, 74.7, 75.2, 70.3],
        },
      },
      {
        "iso3": "PER",
        "name": "Peru",
        "series": {
          "under5_mortality": [38.3, 26.6, 20.2, 16.6, 14.1],
          "life_expectancy": [75.1, 77.5, 78.2, 80.3, 71.7],
        },
      },
      {
        "iso3": "PHL",
        "name": "Philippines",
        "series": {
          "under5_mortality": [36.8, 32.8, 29.5, 27.9, 27.9],
          "life_expectancy": [70.0, 69.4, 69.7, 69.5, 66.4],
        },
      },
      {
        "iso3": "POL",
        "name": "Poland",
        "series": {
          "under5_mortality": [9.3, 7.6, 6.0, 4.9, 4.4],
          "life_expectancy": [73.7, 74.9, 76.2, 77.3, 75.4],
        },
      },
      {
        "iso3": "PRT",
        "name": "Portugal",
        "series": {
          "under5_mortality": [7.2, 4.7, 3.8, 3.6, 3.3],
          "life_expectancy": [76.6, 78.0, 79.7, 80.9, 81.2],
        },
      },
      {
        "iso3": "PRI",
        "name": "Puerto Rico",
        "series": {
          "under5_mortality": [null, null, null, null, null],
          "life_expectancy": [76.2, 77.6, 79.1, 80.5, 79.9],
        },
      },
      {
        "iso3": "QAT",
        "name": "Qatar",
        "series": {
          "under5_mortality": [12.5, 10.4, 9.1, 7.8, 6.2],
          "life_expectancy": [70.4, 71.0, 73.5, 77.8, 76.7],
        },
      },
      {
        "iso3": "KOR",
        "name": "Republic of Korea",
        "series": {
          "under5_mortality": [7.6, 5.6, 4.1, 3.5, 3.0],
          "life_expectancy": [75.9, 78.4, 80.5, 82.4, 83.8],
        },
      },
      {
        "iso3": "MDA",
        "name": "Republic of Moldova",
        "series": {
          "under5_mortality": [31.4, 20.1, 16.8, 15.6, 15.8],
          "life_expectancy": [65.7, 66.0, 67.8, 71.1, 69.6],
        },
      },
      {
        "iso3": "ROU",
        "name": "Romania",
        "series": {
          "under5_mortality": [21.4, 18.2, 12.4, 9.2, 6.4],
          "life_expectancy": [71.1, 72.1, 73.7, 74.9, 72.8],
        },
      },
      {
        "iso3": "RUS",
        "name": "Russian Federation",
        "series": {
          "under5_mortality": [19.4, 13.9, 10.4, 8.2, 5.5],
          "life_expectancy": [65.2, 65.2, 68.8, 71.3, 70.0],
        },
      },
      {
        "iso3": "RWA",
        "name": "Rwanda",
        "series": {
          "under5_mortality": [184.2, 104.5, 63.3, 47.3, 40.6],
          "life_expectancy": [46.9, 57.0, 64.2, 67.0, 67.5],
        },
      },
      {
        "iso3": "KNA",
        "name": "Saint Kitts and Nevis",
        "series": {
          "under5_mortality": [23.9, 19.7, 18.8, 19.4, 17.3],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "LCA",
        "name": "Saint Lucia",
        "series": {
          "under5_mortality": [18.5, 18.5, 18.8, 18.7, 17.9],
          "life_expectancy": [73.2, 74.4, 76.0, 76.4, 71.1],
        },
      },
      {
        "iso3": "VCT",
        "name": "Saint Vincent and the Grenadines",
        "series": {
          "under5_mortality": [22.6, 22.8, 21.4, 17.4, 12.9],
          "life_expectancy": [71.7, 72.6, 73.5, 72.8, 72.6],
        },
      },
      {
        "iso3": "WSM",
        "name": "Samoa",
        "series": {
          "under5_mortality": [21.0, 19.0, 19.1, 18.3, 16.2],
          "life_expectancy": [69.6, 70.2, 70.5, 70.0, 70.3],
        },
      },
      {
        "iso3": "SMR",
        "name": "San Marino",
        "series": {
          "under5_mortality": [5.2, 3.6, 2.6, 1.9, 1.4],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "STP",
        "name": "Sao Tome and Principe",
        "series": {
          "under5_mortality": [82.2, 55.7, 36.2, 23.3, 15.3],
          "life_expectancy": [63.1, 66.3, 68.8, 70.6, 71.2],
        },
      },
      {
        "iso3": "SAU",
        "name": "Saudi Arabia",
        "series": {
          "under5_mortality": [21.9, 16.3, 12.1, 9.0, 6.7],
          "life_expectancy": [70.6, 71.8, 74.9, 76.9, 76.4],
        },
      },
      {
        "iso3": "SEN",
        "name": "Senegal",
        "series": {
          "under5_mortality": [128.9, 87.6, 62.8, 52.2, 42.2],
          "life_expectancy": [58.6, 62.4, 65.6, 67.4, 67.8],
        },
      },
      {
        "iso3": "SRB",
        "name": "Serbia",
        "series": {
          "under5_mortality": [12.7, 9.0, 7.6, 6.3, 5.4],
          "life_expectancy": [71.5, 72.8, 74.3, 75.3, 72.8],
        },
      },
      {
        "iso3": "SYC",
        "name": "Seychelles",
        "series": {
          "under5_mortality": [13.8, 13.8, 14.1, 14.6, 14.7],
          "life_expectancy": [72.1, 72.4, 73.1, 73.2, 74.0],
        },
      },
      {
        "iso3": "SLE",
        "name": "Sierra Leone",
        "series": {
          "under5_mortality": [222.8, 193.2, 157.9, 136.8, 100.6],
          "life_expectancy": [49.8, 52.1, 55.0, 56.9, 61.0],
        },
      },
      {
        "iso3": "SGP",
        "name": "Singapore",
        "series": {
          "under5_mortality": [3.9, 3.0, 2.8, 2.7, 2.4],
          "life_expectancy": [78.5, 80.5, 81.8, 82.8, 83.9],
        },
      },
      {
        "iso3": "SVK",
        "name": "Slovakia",
        "series": {
          "under5_mortality": [9.6, 8.3, 6.9, 6.2, 6.0],
          "life_expectancy": [73.3, 74.1, 75.4, 76.6, 74.5],
        },
      },
      {
        "iso3": "SVN",
        "name": "Slovenia",
        "series": {
          "under5_mortality": [5.4, 4.2, 3.2, 2.6, 2.3],
          "life_expectancy": [76.1, 77.4, 79.5, 80.5, 80.4],
        },
      },
      {
        "iso3": "SLB",
        "name": "Solomon Islands",
        "series": {
          "under5_mortality": [30.5, 29.1, 27.2, 25.0, 21.9],
          "life_expectancy": [63.4, 63.7, 64.4, 65.2, 64.8],
        },
      },
      {
        "iso3": "SOM",
        "name": "Somalia",
        "series": {
          "under5_mortality": [173.2, 173.2, 186.7, 134.3, 111.0],
          "life_expectancy": [49.3, 49.8, 49.5, 53.5, 54.0],
        },
      },
      {
        "iso3": "ZAF",
        "name": "South Africa",
        "series": {
          "under5_mortality": [71.4, 79.8, 50.3, 38.2, 34.0],
          "life_expectancy": [57.1, 52.0, 57.1, 63.3, 61.5],
        },
      },
      {
        "iso3": "SSD",
        "name": "South Sudan",
        "series": {
          "under5_mortality": [180.1, 138.4, 107.2, 240.8, 96.7],
          "life_expectancy": [51.9, 55.9, 58.8, 59.3, 58.6],
        },
      },
      {
        "iso3": "ESP",
        "name": "Spain",
        "series": {
          "under5_mortality": [5.4, 4.7, 3.8, 3.3, 3.2],
          "life_expectancy": [79.1, 80.0, 81.7, 82.3, 82.7],
        },
      },
      {
        "iso3": "LKA",
        "name": "Sri Lanka",
        "series": {
          "under5_mortality": [16.3, 14.0, 11.2, 8.7, 6.6],
          "life_expectancy": [71.5, 73.5, 74.1, 76.4, 77.2],
        },
      },
      {
        "iso3": "SDN",
        "name": "Sudan",
        "series": {
          "under5_mortality": [102.0, 98.8, 73.4, 63.5, 52.7],
          "life_expectancy": [62.5, 64.9, 66.9, 68.3, 67.6],
        },
      },
      {
        "iso3": "SUR",
        "name": "Suriname",
        "series": {
          "under5_mortality": [31.0, 26.5, 23.2, 20.6, 17.4],
          "life_expectancy": [70.6, 71.2, 72.8, 73.0, 69.8],
        },
      },
      {
        "iso3": "SWE",
        "name": "Sweden",
        "series": {
          "under5_mortality": [4.1, 3.6, 3.1, 2.9, 2.5],
          "life_expectancy": [79.6, 80.4, 81.3, 81.7, 82.7],
        },
      },
      {
        "iso3": "CHE",
        "name": "Switzerland",
        "series": {
          "under5_mortality": [5.6, 5.1, 4.6, 4.3, 4.0],
          "life_expectancy": [79.7, 81.1, 82.2, 82.6, 83.3],
        },
      },
      {
        "iso3": "SYR",
        "name": "Syrian Arab Republic",
        "series": {
          "under5_mortality": [23.1, 19.8, 18.8, 37.1, 20.5],
          "life_expectancy": [71.1, 73.2, 73.8, 60.0, 72.4],
        },
      },
      {
        "iso3": "TJK",
        "name": "Tajikistan",
        "series": {
          "under5_mortality": [78.4, 50.3, 37.6, 32.2, 29.8],
          "life_expectancy": [65.6, 68.2, 69.9, 72.4, 71.8],
        },
      },
      {
        "iso3": "THA",
        "name": "Thailand",
        "series": {
          "under5_mortality": [21.7, 17.2, 14.1, 11.9, 9.8],
          "life_expectancy": [71.0, 72.8, 75.3, 77.0, 75.3],
        },
      },
      {
        "iso3": "TLS",
        "name": "Timor-Leste",
        "series": {
          "under5_mortality": [111.5, 88.0, 71.0, 60.2, 52.0],
          "life_expectancy": [62.9, 65.7, 67.0, 67.8, 68.0],
        },
      },
      {
        "iso3": "TGO",
        "name": "Togo",
        "series": {
          "under5_mortality": [119.2, 102.4, 88.3, 75.2, 62.0],
          "life_expectancy": [56.1, 57.0, 59.2, 61.5, 63.9],
        },
      },
      {
        "iso3": "TON",
        "name": "Tonga",
        "series": {
          "under5_mortality": [16.9, 14.8, 13.1, 11.9, 10.4],
          "life_expectancy": [71.0, 72.0, 72.1, 72.5, 72.7],
        },
      },
      {
        "iso3": "TTO",
        "name": "Trinidad and Tobago",
        "series": {
          "under5_mortality": [28.8, 26.9, 24.8, 22.7, 20.4],
          "life_expectancy": [70.4, 71.7, 73.3, 74.4, 71.7],
        },
      },
      {
        "iso3": "TUN",
        "name": "Tunisia",
        "series": {
          "under5_mortality": [29.2, 21.6, 18.7, 18.2, 15.0],
          "life_expectancy": [74.3, 75.4, 76.2, 76.8, 74.1],
        },
      },
      {
        "iso3": "TKM",
        "name": "Turkmenistan",
        "series": {
          "under5_mortality": [68.7, 52.6, 44.0, 43.2, 42.1],
          "life_expectancy": [65.6, 65.3, 69.1, 68.8, 69.1],
        },
      },
      {
        "iso3": "TCA",
        "name": "Turks and Caicos Islands",
        "series": {
          "under5_mortality": [11.7, 8.9, 7.3, 6.2, 5.1],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "TUV",
        "name": "Tuvalu",
        "series": {
          "under5_mortality": [42.8, 38.1, 31.4, 26.0, 21.2],
          "life_expectancy": [null, null, null, null, null],
        },
      },
      {
        "iso3": "TUR",
        "name": "Türkiye",
        "series": {
          "under5_mortality": [37.2, 25.3, 17.6, 13.3, 10.6],
          "life_expectancy": [73.3, 76.2, 76.5, 76.7, 75.3],
        },
      },
      {
        "iso3": "UGA",
        "name": "Uganda",
        "series": {
          "under5_mortality": [143.9, 106.5, 76.0, 57.9, 50.2],
          "life_expectancy": [48.9, 54.8, 60.0, 64.2, 66.0],
        },
      },
      {
        "iso3": "UKR",
        "name": "Ukraine",
        "series": {
          "under5_mortality": [18.2, 14.5, 11.7, 9.5, 8.2],
          "life_expectancy": [67.6, 67.1, 70.1, 72.1, 70.9],
        },
      },
      {
        "iso3": "ARE",
        "name": "United Arab Emirates",
        "series": {
          "under5_mortality": [10.7, 9.8, 8.8, 7.6, 5.6],
          "life_expectancy": [78.1, 79.4, 80.5, 80.7, 78.3],
        },
      },
      {
        "iso3": "GBR",
        "name": "United Kingdom of Great Britain and Northern Ireland",
        "series": {
          "under5_mortality": [6.5, 6.0, 5.2, 4.5, 4.4],
          "life_expectancy": [77.9, 78.9, 80.3, 80.7, 80.1],
        },
      },
      {
        "iso3": "TZA",
        "name": "United Republic of Tanzania",
        "series": {
          "under5_mortality": [128.0, 92.2, 68.2, 54.3, 41.7],
          "life_expectancy": [52.8, 56.6, 61.7, 65.2, 66.8],
        },
      },
      {
        "iso3": "USA",
        "name": "United States of America",
        "series": {
          "under5_mortality": [8.4, 8.0, 7.3, 6.8, 6.5],
          "life_expectancy": [76.7, 77.4, 78.6, 78.6, 76.4],
        },
      },
      {
        "iso3": "URY",
        "name": "Uruguay",
        "series": {
          "under5_mortality": [17.0, 14.4, 10.8, 8.9, 7.3],
          "life_expectancy": [74.9, 75.7, 76.5, 77.1, 75.0],
        },
      },
      {
        "iso3": "UZB",
        "name": "Uzbekistan",
        "series": {
          "under5_mortality": [60.7, 45.2, 29.8, 19.7, 14.6],
          "life_expectancy": [61.7, 63.2, 66.7, 69.4, 72.2],
        },
      },
      {
        "iso3": "VUT",
        "name": "Vanuatu",
        "series": {
          "under5_mortality": [26.6, 24.5, 21.1, 18.6, 18.0],
          "life_expectancy": [64.9, 65.2, 66.1, 66.8, 66.3],
        },
      },
      {
        "iso3": "VEN",
        "name": "Venezuela (Bolivarian Republic of)",
        "series": {
          "under5_mortality": [21.5, 18.5, 17.2, 19.1, 24.2],
          "life_expectancy": [74.0, 74.7, 74.7, 73.9, 71.2],
        },
      },
      {
        "iso3": "VNM",
        "name": "Viet Nam",
        "series": {
          "under5_mortality": [30.3, 25.4, 23.1, 21.6, 18.9],
          "life_expectancy": [71.9, 72.2, 72.5, 73.0, 73.8],
        },
      },
      {
        "iso3": "YEM",
        "name": "Yemen",
        "series": {
          "under5_mortality": [92.9, 70.6, 55.0, 49.3, 42.6],
          "life_expectancy": [63.1, 65.8, 68.0, 68.3, 65.8],
        },
      },
      {
        "iso3": "ZMB",
        "name": "Zambia",
        "series": {
          "under5_mortality": [151.8, 102.7, 74.3, 60.2, 50.4],
          "life_expectancy": [44.5, 50.3, 57.4, 60.4, 61.0],
        },
      },
      {
        "iso3": "ZWE",
        "name": "Zimbabwe",
        "series": {
          "under5_mortality": [99.4, 91.6, 85.2, 59.2, 62.4],
          "life_expectancy": [45.7, 45.7, 51.4, 57.5, 58.5],
        },
      },
      {
        "iso3": "PSE",
        "name": "occupied Palestinian territory, including east Jerusalem",
        "series": {
          "under5_mortality": [30.3, 26.0, 21.9, 18.2, 14.6],
          "life_expectancy": [69.9, 70.6, 72.6, 74.6, 73.5],
        },
      },
    ],
    "countrySourceNote": "WHO Global Health Observatory (MDG_0000000007, WHOSIS_000001) / UN IGME, every reporting country",
  },
];
