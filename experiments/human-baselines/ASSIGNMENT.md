# Assignment - who writes what

**Version:** v1.1 (2026-08-10) | **Fixed before any story is written.**
Companion to [`BRIEF.md`](BRIEF.md).

> **Analyst-facing. Do not send this file to the writers.** It names the direction of
> every series, which is a framing handed over before the writer has found one. Each writer
> gets `BRIEF.md`, their two pack files, and the three-line assignment note in §2. Nothing
> else.

---

## 1. Writers

| Writer | Initials |
|---|---|
| Ahmed Elsaadani | `AE` |
| Mahmoud Elsamadony | `ME` |
| Ahmed Okasha | `AO` |
| Ahmed Ramadan | `AR` |

---

## 2. The assignment notes to send

Everyone writes **two** stories, in the order given: first pack, break, second pack.
Copy one block per writer, verbatim, and send it with `BRIEF.md`.

```
AE - story 1: diphtheria-global   pack: experiments/human-baselines/datapacks/diphtheria-global.txt
   - story 2: measles-global      pack: experiments/human-baselines/datapacks/measles-global.txt

ME - story 1: mumps-global        pack: experiments/human-baselines/datapacks/mumps-global.txt
   - story 2: measles-global      pack: experiments/human-baselines/datapacks/measles-global.txt

AO - story 1: pertussis-global    pack: experiments/human-baselines/datapacks/pertussis-global.txt
   - story 2: measles-global      pack: experiments/human-baselines/datapacks/measles-global.txt

AR - story 1: under5-measles-deaths  pack: experiments/human-baselines/datapacks/under5-measles-deaths.txt
   - story 2: measles-global         pack: experiments/human-baselines/datapacks/measles-global.txt

Submit to experiments/human-baselines/stories/<slug>__<initials>.md
story_order: 1 for your first pack, 2 for measles.
Your two series are unrelated and their years do not line up. Do not compare them
with each other; each story uses its own pack and nothing else.
Rates in the packs are per 1,000,000 population.
```

`AR` additionally: put your two sittings on **different days**. See §5.

### What a pack is

A pack is the exact text table the machine writer is given for that series, saved verbatim
to `experiments/human-baselines/datapacks/<series>.txt`. One artefact, two consumers.

- `cases` figures are **reported cases** for the four disease series and **deaths** for
  `under5-measles-deaths`. Different quantities; the pack says which.
- Rates are per **1,000,000** population throughout. The diphtheria source workbook labels
  its incidence row "per 1000 total population"; that label is wrong, its own metadata sheet
  and the arithmetic both say per million. If any writer-facing text restates a unit, it
  takes it from the pack.
- Spans differ: measles 1980-2024, the three other disease series 2000-2025,
  `under5-measles-deaths` 2000-2021.

**Status: the pack files do not exist yet.** See §7.

---

## 3. Why this allocation

### Direction of truth per series

Endpoints read from `experiments/datapacks/*.csv`; direction is the sign of last minus
first across the full span.

| Series | Span | First | Last | Direction of truth | Class |
|---|---|---|---|---|---|
| `measles-global` | 1980-2024 | 3,852,242 | 675,533 | falling 82.5% overall, but rising 324% across 2020-2024 (159,240 to 675,533); the series trough is 2021 at 123,152 | **mixed** |
| `mumps-global` | 2000-2025 | 544,093 | 234,954 | falling | **falling** |
| `pertussis-global` | 2000-2025 | 190,475 | 265,317 | rising, with a 941,893 spike in 2024 | **rising** |
| `diphtheria-global` | 2000-2025 | 11,625 | 30,205 | rising | **rising** |
| `under5-measles-deaths` | 2000-2021 | 756,332 | 151,463 | falling | **falling** |

### The two constraints

1. **No writer draws two series with the same direction of truth.** A writer who wrote two
   falling series would have their personal habits confounded with the direction: any tone
   difference between rising and falling stories in the corpus would be partly a difference
   between writers. Here every writer draws the mixed series plus one that is either rising
   or falling, and the non-measles slots split two rising (`AE`, `AO`) and two falling
   (`ME`, `AR`).
2. **Every series is covered.** Five series, eight slots, all five used.

### The allocation rule

Deterministic and fixed before writing, so it cannot be adjusted once anyone has seen a
story: writers sorted alphabetically by surname (Elsaadani, Elsamadony, Okasha, Ramadan),
non-measles series sorted alphabetically by slug (`diphtheria-global`, `mumps-global`,
`pertussis-global`, `under5-measles-deaths`), zipped in order; measles added to everyone.
The alphabetical series order happens to alternate rising / falling / rising / falling, so
constraint 1 holds without hand-picking.

### Why everyone writes measles

`measles-global` is the anchor. H1 measures each machine story's distance to the median
human rating `H`, and the E1 stories are all measles (`EXPERIMENT_PLAN.md` §3, §7). Spread
one human story per disease and the spread of `H` is part tone and part topic, with no way
to separate them, resting on a single story per topic. Four writers on **identical data**
give a human spread on one topic, which is the quantity `EXPERIMENT_PLAN.md` §12.8 says is
missing, and it is what lets the report say whether a 0.4-point model difference is signal
or noise.

---

## 4. Two sets of stories, two different statuses

| Set | Stories | Status | Use |
|---|---|---|---|
| Anchor | 4 x `measles-global`, one per writer | primary material | defines `H` for the pre-registered H1 test |
| Extension | 4 non-measles, one per series | **PROVISIONAL, n = 1 per series** | weak per-series anchor for the multi-series addendum only |

**The extension baselines are n = 1 and never enter the pre-registered primary test.** One
story per series carries no spread, so any per-series "band" from it is a point estimate
with unknown error, and a single writer's habits cannot be told apart from a property of the
series. They are also rated non-blind (there is no machine story on those series to hide
them among), so raters know every extension item is human-written. Both facts are stated
wherever an extension figure appears, in the limitations, not in a footnote.

---

## 5. Order, and what it costs

Everyone writes their non-measles series first and the anchor second, so the practice
effect sits uniformly on the anchor set instead of splitting it. Two costs, both reported:

- The four anchor stories are written **warm**, by someone who has just spent forty minutes
  writing a disease-count story. The machine writer generates cold. Whatever warming up does
  to prose is inside `H` and outside everything `H` is compared to.
- `AR` draws `under5-measles-deaths` first and then the measles anchor, which is measles
  twice. The other three come to the anchor from an unrelated disease. Mitigation: `AR`
  splits the two sittings across different days, and the leave-one-writer-out check in §6
  covers the case where `AR`'s anchor is the outlier. The carryover is not removable inside
  a design where everyone writes the anchor.

---

## 6. How `H` is computed and reported

Fixed in advance, per `EXPERIMENT_PLAN.md` §1.4 (the story is the unit of analysis):

1. Per anchor story, average the primary judge's two ratings (test-retest) into one value,
   then average that with the secondary judge's rating. One number per story.
2. `H` is the **median across the four anchor stories** (with n = 4, the mean of the two
   middle values).
3. Report `H` **with all four story-level values and the range**, every time it appears
   (`EXPERIMENT_PLAN.md` §12.8). No bootstrap interval: at n = 4 the resampling distribution
   has a handful of atoms and the interval would imply a precision the design cannot
   deliver.
4. **Band-edge sensitivity, pre-committed.** H1 is recomputed with `H` set to the minimum
   and to the maximum of the four anchor values. If the sign of the H1 result changes across
   that range, the result is reported as band-sensitive, in the same table as the primary
   figure.
5. **Leave-one-writer-out, pre-committed.** Recompute `H` four times, dropping one writer
   each time. If any single writer moves `H` by more than 0.5 points, `H` is reported as
   writer-sensitive with all four values shown.
6. **Returned-story sensitivity.** Any story with `returned: true` was edited a second time
   for length, which machine output never is. Recompute `H` with returned stories dropped
   and report both.
7. The per-writer `prior_exposure` table is printed **beside `H`**, not in an appendix.
   These are informed authors who built the pipeline and have read machine output on this
   data; the reference is "written by people with prior exposure, not immediately before
   writing", and the report says so in those words. A replication band written by people
   outside the team is the only real remedy and is listed as future work.
8. Human *rater* judgments from `RATING_SHEET.md` do not enter `H`. `H` is judge-assigned so
   that it sits on the same instrument as `alarmism_before` and `alarmism_after`. The human
   ratings validate that instrument; they do not replace it.

---

## 7. Dependencies and amendments

### Blocking dependencies (not done in this kit)

- **P0.13 - one artefact, two consumers.** For each series, `build_prompt_table(<series>)`
  is saved verbatim to `experiments/human-baselines/datapacks/<series>.txt` and is both the
  writer's pack and the generator's prompt. Acceptance criterion: `sha256(writer pack)`
  equals `sha256(string passed to the generator)`, asserted in the run config. Without it,
  the writers see cases and incidence while the generator additionally sees MCV1 coverage by
  year, per-country detail and the ~95% herd-immunity line - so `H` would be depressed by an
  evidence gap that the report would then call tone.

  Two implementation notes, because this criterion is easy to satisfy in a way that does not
  hold. **Call `build_prompt_table` once**, hold the returned string in a variable, write
  *that* variable to the `.txt` and pass *that same* variable to the generator. Rebuilding
  the string for each consumer makes the equality something the test re-establishes rather
  than something the code guarantees: the two calls drift the moment anything in that
  function becomes non-deterministic (dict ordering, a float repr, a locale-dependent
  thousands separator), and the hashes still match on the day the test is written because
  both calls happen in one process on one machine. And check the **trailing newline**: if
  `build_prompt_table` does not emit one and the file write adds one, the digests differ
  while the visible content is identical, which is a confusing thing to debug at Phase 0.
- **`DatasetSpec` entries** for the four non-measles series. `build_prompt_table` today has
  measles and a WHO GHO stub only, so four packs cannot be generated yet. Backend work.
- **`experiments/analysis/wordcount.py`**, one counter for both populations, whitespace
  tokenisation, body only.
- **`RUBRIC.md` embedded verbatim in the judge prompt** before any rating happens. See
  `RATING_SHEET.md` §0.

### Amendments to the pre-registered protocol

All recorded before any story was written and before any result was seen.

**A1 - four writers, not three (2026-08-10).** `EXPERIMENT_PLAN.md` §3 and §12.8 specify
three human baselines; this kit uses four. Three give a median with no usable spread. Strict
improvement, no cost.

**A2 - eight stories across five series, not three on one (2026-08-10).** Four anchor
stories plus four provisional single-story series baselines for the multi-series addendum.
Team cost rises from the ~2 h in `EXPERIMENT_PLAN.md` §11 to about 4 h. Only the anchor set
feeds H1.

**A3 - rubric of record (2026-08-10).** `RUBRIC.md` `alarmism-rubric v1.1` is the single
instrument for human raters and LLM judges. It disambiguates the deployed `JUDGE_SYSTEM`
scale at level 1 and pins scoring to half-point steps. Blocking, and implemented elsewhere.

**A4 - the pack is the prompt table (2026-08-10).** Supersedes the earlier plan of handing
writers `experiments/datapacks/<series>.csv`. See P0.13 above.

### Limitations created by these decisions

- **The pack carries an instruction that is part of the treatment.** The measles prompt
  table ends "Compare places of different size using the per-million rate, not raw counts",
  and preferring rates is exactly what rubric variant `V2` adds over `V1`
  (`EXPERIMENT_PLAN.md` §3). Both populations now receive it, so H1 is not biased by it. But
  human per-capita usage in these baselines is **not** evidence of natural human practice,
  and H5's `V2 > V1` is partly a test of whether the moderator follows an instruction the
  generator was also given. Removing the line would recreate the evidence asymmetry, which
  is worse.
- **The GHO extract and the wide deaths CSV are not interchangeable.** Summed over
  countries the GHO file runs 1.21x below the wide file in 2000 and 1.34x below by 2021.
  They must never be mixed inside one story or one pack.

---

## 8. Logistics

- **Window:** writers pick their own two sittings inside the agreed window; everything is
  in before the rating session is scheduled.
- **Collection:** stories land as files in `experiments/human-baselines/stories/`. Nobody
  reads a story aloud, quotes it in chat, or comments on it before all eight are in.
- **Returns:** only a body outside 110-170 words comes back, with the word count and
  nothing else, to be edited for length only, recording `returned: true`. **No tone
  feedback is given at any point, by anyone.**
- **Amnesty:** a writer who discloses that a rule slipped has that one story dropped and
  rewrites it in a fresh sitting from a different angle. No other consequence. Disclosure is
  deliberately made cheaper than silence.
- **Pre-set exclusion criteria**, the only two:
  1. LLM assistance, disclosed or discovered;
  2. body still outside 100-200 words after one return.
  Nothing else excludes a story. In particular a story is **not** dropped for an unsupported
  figure or an outside fact: those are counted, reported and left in, because excluding on a
  text property that correlates with tone would quietly reshape the band.
- **Post-hoc checks, run after collection, never fed back to the writer:** numeric claims
  are checked against the pack with the same Python checker used for machine stories
  (`EXPERIMENT_PLAN.md` P0.3), and the text is scored by
  `experiments/analysis/timeseries_claims.py` on the same framing measures as machine
  output. Writers know this happens (`BRIEF.md` rule 6) but not what the measures are.
