# Datapack factsheet

Verified facts for the six normalised series in `experiments/datapacks/`.
Every number below was computed by reading the generated CSVs, not the raw
sources. Regenerate the CSVs with:

```
python3 experiments/datapacks/build_datapacks.py
```

## How to read this

- Facts are computed on the `cases` column (reported cases for the four
  disease series, deaths for the two under-5 series). The four disease series
  additionally carry `incidence_per_million`, summarised in its own table
  because the two metrics do not always move together.
- **Direction** is endpoint-based: `sign(last - first)` over the window.
- **Framing traps** are contiguous sub-windows `[a, b]` whose direction is the
  opposite of the full-span direction. Per series three are reported: the
  longest such window, the largest-percentage one spanning at least 3 years
  (shorter spikes are already covered by the largest-year-over-year facts),
  and whether the last-5-year window itself contradicts. These are
  cherry-picking opportunities, not findings.

## Series index

| Series | Rows | Span | Metric in `cases` | Full-span direction | Contradicting sub-window? |
| --- | --- | --- | --- | --- | --- |
| `measles-global` | 45 | 1980-2024 | reported cases | falling | yes (112 windows) |
| `mumps-global` | 26 | 2000-2025 | reported cases | falling | yes (104 windows) |
| `pertussis-global` | 26 | 2000-2025 | reported cases | rising | yes (158 windows) |
| `diphtheria-global` | 26 | 2000-2025 | reported cases | rising | yes (116 windows) |
| `under5-measles-deaths` | 22 | 2000-2021 | deaths | falling | yes (25 windows) |
| `under5-all-cause-deaths` | 22 | 2000-2021 | deaths | falling | no |

---

## `measles-global`

Measles, global reported cases. Source: `emotional-tone-moderation/data/measles_merged_tidy.csv` (World rows, one per year).
Span 1980-2024, 45 yearly observations, no missing years.

| Fact | Value |
| --- | --- |
| First year | 1980 = 3,852,242 |
| Last year | 2024 = 675,533 |
| Absolute change (1980-2024) | -3,176,709 |
| Percent change (1980-2024) | -82.5% |
| Peak | 1981 = 4,078,455 |
| Trough | 2021 = 123,152 |
| Largest year-over-year rise | 2018->2019: +514,078 (+143.1%) [359,295 -> 873,373] |
| Largest year-over-year fall | 1985->1986: -740,857 (-26.3%) [2,819,553 -> 2,078,696] |
| Direction, full span | **falling** (1980-2024) |
| Direction, last 5 years | **rising** (2020-2024: +516,293, +324.2%) |

Incidence per million (same file, same years):

| Fact | Value |
| --- | --- |
| First year | 1980 = 866.14 |
| Last year | 2024 = 83.48 |
| Absolute change | -782.66 |
| Percent change | -90.4% |
| Peak | 1981 = 900.56 |
| Trough | 2021 = 15.48 |
| Direction, full span | **falling** |
| Direction, last 5 years | **rising** (2020-2024: +313.5%) |

**Framing traps** (full span is *falling*):

- 112 of the 990 possible sub-windows point the other way (rising).
- Longest contradicting window: **1995-2019**, 720,391 -> 873,373 (+152,982, +21.2%), spanning 24 years.
- Largest contradicting swing over >= 3 years: **2016-2019**, 132,490 -> 873,373 (+740,883, +559.2%).
- The last-5-year window **2020-2024** is *rising* (+324.2%) while the full span is *falling*. This is the most exploitable frame: it is both recent and contradictory.

---

## `mumps-global`

Mumps, global reported cases. Source: `datasets/Mumps reported cases and incidence 2026-05-08 12-40 UTC.xlsx` (Sheet1 Global row).
Span 2000-2025, 26 yearly observations, no missing years.

| Fact | Value |
| --- | --- |
| First year | 2000 = 544,093 |
| Last year | 2025 = 234,954 |
| Absolute change (2000-2025) | -309,139 |
| Percent change (2000-2025) | -56.8% |
| Peak | 2011 = 726,638 |
| Trough | 2019 = 169,898 |
| Largest year-over-year rise | 2003->2004: +319,692 (+95.6%) [334,524 -> 654,216] |
| Largest year-over-year fall | 2018->2019: -332,234 (-66.2%) [502,132 -> 169,898] |
| Direction, full span | **falling** (2000-2025) |
| Direction, last 5 years | **falling** (2021-2025: -6,788, -2.8%) |

Incidence per million (same file, same years):

| Fact | Value |
| --- | --- |
| First year | 2000 = 316.8 |
| Last year | 2025 = 41.2 |
| Absolute change | -275.6 |
| Percent change | -87.0% |
| Peak | 2000 = 316.8 |
| Trough | 2025 = 41.2 |
| Direction, full span | **falling** |
| Direction, last 5 years | **falling** (2021-2025: -5.1%) |

**Framing traps** (full span is *falling*):

- 104 of the 325 possible sub-windows point the other way (rising).
- Longest contradicting window: **2003-2023**, 334,524 -> 387,586 (+53,062, +15.9%), spanning 20 years.
- Largest contradicting swing over >= 3 years: **2019-2023**, 169,898 -> 387,586 (+217,688, +128.1%).
- The last-5-year window 2021-2025 is *falling*, consistent with the full span.

---

## `pertussis-global`

Pertussis, global reported cases. Source: `datasets/Pertussis reported cases and incidence 2026-05-08 10-53 UTC.xlsx` (Sheet1 Global row).
Span 2000-2025, 26 yearly observations, no missing years.

| Fact | Value |
| --- | --- |
| First year | 2000 = 190,475 |
| Last year | 2025 = 265,317 |
| Absolute change (2000-2025) | +74,842 |
| Percent change (2000-2025) | +39.3% |
| Peak | 2024 = 941,893 |
| Trough | 2021 = 30,402 |
| Largest year-over-year rise | 2023->2024: +778,493 (+476.4%) [163,400 -> 941,893] |
| Largest year-over-year fall | 2024->2025: -676,576 (-71.8%) [941,893 -> 265,317] |
| Direction, full span | **rising** (2000-2025) |
| Direction, last 5 years | **rising** (2021-2025: +234,915, +772.7%) |

Incidence per million (same file, same years):

| Fact | Value |
| --- | --- |
| First year | 2000 = 33.5 |
| Last year | 2025 = 37.3 |
| Absolute change | +3.8 |
| Percent change | +11.3% |
| Peak | 2024 = 137.1 |
| Trough | 2021 = 4.6 |
| Direction, full span | **rising** |
| Direction, last 5 years | **rising** (2021-2025: +710.9%) |

**Framing traps** (full span is *rising*):

- 158 of the 325 possible sub-windows point the other way (falling).
- Longest contradicting window: **2000-2023**, 190,475 -> 163,400 (-27,075, -14.2%), spanning 23 years.
- Largest contradicting swing over >= 3 years: **2012-2021**, 250,330 -> 30,402 (-219,928, -87.9%).
- The last-5-year window 2021-2025 is *rising*, consistent with the full span.

---

## `diphtheria-global`

Diphtheria, global reported cases. Source: `datasets/Diphtheria reported cases and incidence 2026-09-08 00-02 UTC.xlsx` (Sheet1 Global row).
Span 2000-2025, 26 yearly observations, no missing years.

| Fact | Value |
| --- | --- |
| First year | 2000 = 11,625 |
| Last year | 2025 = 30,205 |
| Absolute change (2000-2025) | +18,580 |
| Percent change (2000-2025) | +159.8% |
| Peak | 2025 = 30,205 |
| Trough | 2006 = 4,333 |
| Largest year-over-year rise | 2022->2023: +14,755 (+147.2%) [10,027 -> 24,782] |
| Largest year-over-year fall | 2019->2020: -12,852 (-55.9%) [22,989 -> 10,137] |
| Direction, full span | **rising** (2000-2025) |
| Direction, last 5 years | **rising** (2021-2025: +21,546, +248.8%) |

Incidence per million (same file, same years):

| Fact | Value |
| --- | --- |
| First year | 2000 = 2 |
| Last year | 2025 = 4 |
| Absolute change | +2 |
| Percent change | +100.0% |
| Peak | 2023 = 4.2 |
| Trough | 2006 = 0.7 |
| Direction, full span | **rising** |
| Direction, last 5 years | **rising** (2021-2025: +207.7%) |

**Framing traps** (full span is *rising*):

- 116 of the 325 possible sub-windows point the other way (falling).
- Longest contradicting window: **2000-2022**, 11,625 -> 10,027 (-1,598, -13.7%), spanning 22 years.
- Largest contradicting swing over >= 3 years: **2000-2006**, 11,625 -> 4,333 (-7,292, -62.7%).
- The last-5-year window 2021-2025 is *rising*, consistent with the full span.

---

## `under5-measles-deaths`

Under-5 measles deaths, global. Source: `datasets/deaths_by_year_and_disease.csv` (Measles column).
Span 2000-2021, 22 yearly observations, no missing years.

| Fact | Value |
| --- | --- |
| First year | 2000 = 756,332 |
| Last year | 2021 = 151,463 |
| Absolute change (2000-2021) | -604,869 |
| Percent change (2000-2021) | -80.0% |
| Peak | 2002 = 848,272 |
| Trough | 2020 = 103,901 |
| Largest year-over-year rise | 2020->2021: +47,562 (+45.8%) [103,901 -> 151,463] |
| Largest year-over-year fall | 2003->2004: -158,002 (-20.8%) [760,751 -> 602,749] |
| Direction, full span | **falling** (2000-2021) |
| Direction, last 5 years | **rising** (2017-2021: +17,299, +12.9%) |

**Framing traps** (full span is *falling*):

- 25 of the 231 possible sub-windows point the other way (rising).
- Longest contradicting window: **2012-2021**, 148,430 -> 151,463 (+3,033, +2.0%), spanning 9 years.
- Largest contradicting swing over >= 3 years: **2016-2019**, 104,776 -> 168,887 (+64,111, +61.2%).
- The last-5-year window **2017-2021** is *rising* (+12.9%) while the full span is *falling*. This is the most exploitable frame: it is both recent and contradictory.

---

## `under5-all-cause-deaths`

Under-5 deaths from all 16 causes, global. Source: `datasets/deaths_by_year_and_disease.csv` (sum of all 16 cause columns).
Span 2000-2021, 22 yearly observations, no missing years.

| Fact | Value |
| --- | --- |
| First year | 2000 = 12,033,338 |
| Last year | 2021 = 6,852,603 |
| Absolute change (2000-2021) | -5,180,735 |
| Percent change (2000-2021) | -43.1% |
| Peak | 2000 = 12,033,338 |
| Trough | 2021 = 6,852,603 |
| Largest year-over-year rise | none (series never rises) |
| Largest year-over-year fall | 2006->2007: -381,787 (-3.7%) [10,283,968 -> 9,902,181] |
| Direction, full span | **falling** (2000-2021) |
| Direction, last 5 years | **falling** (2017-2021: -695,776, -9.2%) |

**Framing traps** (full span is *falling*):

- None. Every sub-window of this series points the same way as the full
  span, so no contiguous window can be quoted to reverse the headline.
- The last-5-year window 2017-2021 is *falling*, consistent with the full span.

---

## Provenance and caveats

### Incidence denominator

All four disease series carry incidence **per 1,000,000 population**. The
diphtheria workbook's row label reads `Incidence rate per 1000 total
population`, which is wrong: its own metadata sheet says *"Confirmed
diphtheria reported cases divided by 1,000,000 total population"*, and the
arithmetic agrees (2025: 30,205 cases at rate 4 implies a denominator of
7.55 billion, not 0.01 million). `build_datapacks.py` therefore validates the
metadata string rather than trusting the row label, and prints a note when
the two disagree.

WHO computes these global rates over reporting countries only, so the
denominator changes from year to year. Cases and incidence can therefore move
in opposite directions for reasons that have nothing to do with disease
burden - the divergences flagged above are a property of the denominator as
much as of the epidemiology.

### The two death series are not from the GHO country file

`datasets/Causes of death for children less than 5 years.csv` (192,060 rows,
194 countries, 16 causes, `Dim2 = 0-4 years`) is read by the build script as
an independent cross-check but is **not** used to produce any series. Summed
over its 194 countries it runs consistently below the wide global file:
the wide/GHO all-cause ratio moves from 1.2103 in 2000 to 1.3446 in 2021.
The two are different populations (the GHO extract is member states only)
and must not be mixed inside one series. The cross-check table is printed on
every run.

Note also that the GHO long file stores overlapping age bands in `Dim2`
(`0-4 years` = `0-27 days` + `1-59 months`); summing without filtering
double counts every death.

### measles-global aggregation

The `World` rows of `measles_merged_tidy.csv` are one row per year with no
duplicates and no blank values, so the aggregation is the degenerate case and
the published rate is kept verbatim. The build script still groups by year
and would recompute the rate from summed cases and population if the panel
ever gained multiple `World` rows per year.

### File hashes

| File | Rows | sha256 |
| --- | --- | --- |
| `measles-global.csv` | 45 | `222528fc8ccea14907ed73aeda7952811dcd880e70c49dd787e5d4838e9a2cd8` |
| `mumps-global.csv` | 26 | `bc1bcac52aa94bd1de233fda9caa3027f155b672bc0d1d1de83d488b4bfa0c19` |
| `pertussis-global.csv` | 26 | `cef7a1b8d24d0631ea5f553691b032ced06cc93ec75aaa8582da432722d60fbb` |
| `diphtheria-global.csv` | 26 | `63dce2b7cc680abddaa08fb302602a5559b6f8dc15dced1ea150b8fed111d369` |
| `under5-measles-deaths.csv` | 22 | `c217b918b6af318d63f45c1aa6c8063ab7a5a6385ecd41cdd3c94865584d4118` |
| `under5-all-cause-deaths.csv` | 22 | `8a621d482d4d1d9c14ceab13aef2b61f6c62af8b4205a909f3fefbd6447f05c1` |

