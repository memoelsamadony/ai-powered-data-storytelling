# Measles × Vaccination — Data + Tone-Moderation Demo (real data)

**Sources (downloaded 2026-06-23):** OWID `reported-cases-of-measles` (WHO-sourced), OWID
`global-vaccination-coverage` → MCV1 (WUENIC), OWID `population`. Merged on (country, year);
incidence = cases / population × 1,000,000. Tidy table: `measles_merged_tidy.csv` (9,959 rows, 1980–2024).

## Analysis summary (verified)

**World — cases vs MCV1 coverage**

| Year | Reported cases | MCV1 |
|---|---|---|
| 2000 | 853,479 | 71% |
| 2010 | 343,806 | 84% |
| 2016 | 132,490 | 85% |
| 2019 | 873,373 | 86% |
| 2021 | 123,152 | 81% |
| 2023 | 669,083 | 83% |
| 2024 | 675,533 | 84% |

Key facts: global MCV1 has **plateaued in the low 80s for a decade** — never near the ~95% herd-immunity
threshold. Cases swing episodically (huge 2019 spike *at* 86% coverage; artificially low 2020–2021 during
the pandemic; ~5× rebound to 669k by 2023). The year-to-year link is **not** a clean "coverage down → cases
up" — it is accumulation of susceptibles below threshold + outbreak dynamics + pandemic reporting effects.

**Germany vs Nigeria, 2024 — why raw counts mislead**

| Country | Cases | Population | Incidence /M | MCV1 |
|---|---|---|---|---|
| Germany | 645 | 85M | 7.6 | 96% |
| Nigeria | 14,999 | 228M | 65.8 | 57% |

Raw counts: Nigeria 23× Germany. Incidence: Nigeria 8.6× Germany. Both show Nigeria worse, but the honest
magnitude is the *rate*, and the structural driver is the MCV1 gap (57% vs 96%). Germany itself rose to 645
in 2024 (highest since 2017) despite 96% national coverage — under-vaccinated pockets.

---

## The tone-moderation pipeline, demonstrated

### STORY A — General LLM (unmoderated)
> **Measles Is Roaring Back — and We're Losing the Fight 😱**
> A disease we once beat is exploding across the globe. Worldwide cases have **detonated** from just
> 123,000 in 2021 to a staggering 669,000 in 2023 — a **terrifying five-fold explosion** in two years.
> Vaccination is **collapsing**, and children are paying the price. Even in wealthy Germany, cases
> **erupted 64-fold**, from 10 to 645. In Nigeria the **catastrophe** is unimaginable. If we don't act
> now, the resurgence will **spiral out of control**.

### MODERATION AGENT — findings
| # | Issue | Type | Evidence |
|---|---|---|---|
| 1 | "detonated / explosion / catastrophe / killer / roaring back / 😱" | Emotional exaggeration | Lexicon inflates affect beyond the data |
| 2 | "five-fold" off the 2021 baseline | Misleading baseline | 2021 (123k) was an artificially low pandemic year; vs 2019 (873k) there is **no** 5× |
| 3 | "vaccination is collapsing" | Overstated causation | Global MCV1 81%→84% is a **plateau**, not a collapse |
| 4 | "64-fold" in Germany | Dropped denominator | Base of 10; rate is 0.1→7.6 /M — still low |
| 5 | "spiral out of control" | Unsupported prediction | No projection in the data |

### STORY B — after emotional-tone moderation (faithful)
> **Measles Cases Are Rising Again as Vaccination Stalls Below Safe Levels**
> Reported measles cases rose to about 669,000 in 2023 and 676,000 in 2024 — close to the 2019
> pre-pandemic level (~873,000), after an unusually low 2020–2021 when the pandemic reduced both
> transmission and reporting. The underlying problem is persistent: global first-dose (MCV1) coverage has
> plateaued in the low 80s (81% in 2021, 84% in 2024), short of the ~95% needed to stop outbreaks. The gap
> is uneven — Nigeria (MCV1 ~57%) reported ~15,000 cases in 2024 (~66 per million), while Germany (MCV1
> ~96%) rose to 645 (~8 per million), its highest since 2017, showing that even high national coverage can
> leave under-vaccinated pockets. The pattern matches measles epidemiology: where enough children remain
> unprotected, susceptibility builds and periodic outbreaks follow.

**What changed:** alarmist lexicon removed; honest pre-pandemic baseline restored; "collapse" → "plateau";
raw multipliers replaced by rates; speculation dropped — *gravity kept, manipulation removed.*
