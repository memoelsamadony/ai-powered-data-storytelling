# OUR DATA

`measles_merged_tidy.csv` is **our own merged dataset**, built for this project by joining three public
sources on `(country, year)` and deriving a per-capita incidence rate.

## What we did
- Joined **measles case counts**, **MCV1 vaccination coverage**, and **population** on `(country, year)`.
- Computed `incidence_per_million = measles_cases / population × 1,000,000` (population forward-filled to
  2024 where the source ended at 2023).
- Range: **1980–2024**, all countries + a `World` aggregate.

**Columns:** `country, code, year, mcv1_pct, measles_cases, population, incidence_per_million`

## Sources (raw, unmodified copies in `raw/`, downloaded 2026-06-23)
| File in `raw/` | Variable | Source |
|---|---|---|
| `cases_raw.csv` | reported measles cases | Our World in Data — `reported-cases-of-measles` (WHO-sourced) |
| `coverage_raw.csv` | MCV1 first-dose coverage | OWID — `global-vaccination-coverage` → WHO/UNICEF (WUENIC) |
| `population_raw.csv` | population | Our World in Data |

## Provenance / license
The **merge and derivation are ours**; the underlying figures belong to OWID / WHO / UNICEF (OWID data is
released under CC-BY). Use the source terms for any redistribution of the raw values.
