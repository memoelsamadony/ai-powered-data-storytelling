# Results under an independent judge, and against human writing

Measured 2026-08-12, after merging the two-axis judge from PR #8 (`20911ac`)
with the blinding and the seven-dataset registry from PR #5. Three things were
prerequisites for any earlier tone number to mean much, and all three now hold:

1. **The authoritative rating is Claude Opus 5**, called blind through
   `backend/storytelling/judge.py`. It never generates, never moderates, and
   shares no vendor or family with anything it grades.
2. **Two axes, not one.** Alarmism alone cannot see the failure mode of a
   falling series: a story that glosses over remaining harm scores a calm 2.0
   for alarmism while being exactly as miscalibrated.
3. **A human reference set exists**, `experiments/human-baselines/pilot-stories/`,
   25 team-written stories scored on the same rubric by the same judge.

Judge spend for everything below: **$1.69** of list-price-equivalent tokens
across 85 calls.

---

## 1. Moderation converges both axes on the calibrated middle

Opus tone, 1-5 on each axis, where 3 is calibrated and **both ends are
failures**. n = 20 machine runs, 25 human stories.

| | raw | moderated | human |
|---|---|---|---|
| **alarmism** | 3.59 | **2.09** | **2.00** |
| **optimism** | 2.25 | **2.67** | **2.50** |

Re-measured 2026-08-12 over all 24 runs after the judge pass was rebuilt; the
earlier table read 3.64 / 2.13 over 20. Both are within the 0.5 test-retest
drift in section 2, which is exactly why that section exists.

The two axes move in opposite directions, and that is the finding. Moderation
pulls alarmism down 1.51 points and pushes optimism up 0.51. A single-axis view
would have called the second movement nothing at all.

Per series, alarmism:

| series | raw | moderated | human (n=5) |
|---|---|---|---|
| pertussis-global | 4.25 | 2.12 | 2.12 |
| diphtheria-global | 3.50 | 2.50 | 2.00 |
| under5-measles-deaths | 3.00 | 2.50 | 1.76 |
| mumps-global | 2.60 | 1.80 | 1.82 |
| measles | 2.10 | 2.00 | 2.26 |

On `pertussis-global`, the most dramatic series, moderation lands the machine
at **2.12 against a human 2.12**. On `mumps-global` it lands at 1.80 against
1.82. Where the raw story was already near the human level (`measles`), it
barely moves it.

**A claim from the single-axis run does not survive.** That run reported
moderation raising alarmism on three flat series, and called it bidirectional
correction. Re-measured on the two-axis prompt, alarmism does not rise anywhere:
`measles` 2.10 to 2.00, `under5-tetanus-deaths` 2.0 to 2.0,
`under5-all-cause-deaths` 2.3 to 2.3. The correction is real but it lives on the
**optimism** axis, which the earlier run could not see. Alarmism only ever falls
or holds.

One consequence worth stating plainly: moderated alarmism at 2.13 sits **below**
the calibrated 3.0, in the direction the rubric calls "flat, hides real stakes".
The moderator does not aim at calibrated; it aims at quiet, and it happens to
land near where these human writers also sit.

Caveats that travel with the human column:

- **Correction, 2026-08-12.** An earlier version of this file said the writers
  had rewritten machine drafts, and therefore withheld every similarity metric
  against them. That came from a README and a `source_draft:` field shipped with
  the stories; the authors say it is wrong and these are their own writing. The
  tone figures are unchanged, the leakage caveat is withdrawn, and **similarity
  metrics against this set are usable**. See L2.
- The stories have **no headline**, so humans are judged on body text and
  machines on headline plus body. Headlines are where alarmism concentrates, so
  the human column is if anything flattered and the gap is a lower bound.
- Five interchangeable writer slots per series, not the four named writers
  `ASSIGNMENT.md` S6 wants, so nothing here computes `H`.

---

## 2. Changing the prompt barely moved alarmism: a test-retest check

PR #8 asserted that adding the optimism axis left alarmism's definition
unchanged. That is checkable rather than assumable, so the same 40 stories were
scored under both prompts:

- **identical rating: 14 of 40**
- **mean absolute drift: 0.155** points
- **maximum drift: 0.5** points, and **40 of 40** within 0.5

So the claim holds, and the alarmism scale now has a measured stability figure
rather than an assurance. This matters because a prompt change *has* moved a
result in this project before, in the pairwise evaluation below.

---

## 3. The local judge understates its own result

The cheap in-pipeline rater and Opus rated the same 40 stories.

| | local (`qwen3.5:4b` / `gemma4:31b`) | Opus 5 |
|---|---|---|
| mean rating | 2.70 | 2.89 |
| mean moderation delta | **-0.75** | **-1.51** |

- Pearson r on the ratings **0.81**, on the deltas **0.77**.
- Mean absolute difference **0.49** points.
- The local judge understated the shift by more than 0.25 points in **16 of 20
  runs**.

The local rater tracks the ordering well and compresses the effect to about
**half** its measured size. Every "the moderator barely moved it" reading in the
earlier tables was partly the instrument.

**This withdraws the sharpest claim in L18.** `qwen3.5:2b` was the run where
moderation supposedly did nothing (local 4.0 to 4.0) while marking 10 emotive
spans, written up as "the moderator edited and did not calm". Opus scores the
same two stories **4.7 to 2.5**. The moderator worked; the 4B judge could not
see it.

This is also why the local judge was kept rather than replaced when PR #8
proposed routing the pipeline rating to Claude. The two numbers live in separate
columns, and their disagreement is the measurement.

---

## 4. Pairwise preference: moderated wins everything except readability

Paper protocol, position randomised, treatment label hidden, 20 pairs.

| criterion | moderated | raw | tie |
|---|---|---|---|
| relevance_informativeness | **70%** | 0% | 30% |
| structure_coherence | 25% | 0% | 75% |
| narrative_quality | 20% | **60%** | 20% |
| factual_correctness | **100%** | 0% | 0% |
| **overall** | **100%** | **0%** | 0% |

**Narrative quality is the honest cost**, and it is the clearest it has been:
the raw story wins it three times as often. Moderation buys accuracy and
calibration by spending engagement. A reader who sees only the overall row
misses the trade the system makes.

Position check: the judge picked the first-shown story **54.5%** of the time,
close enough to even that ordering is not driving the win rates.

---

## 5. Three measurement bugs found and fixed

All three were in judging code, and all three would have flattered the result.

**The paired prompt was not blind.** `judge_run` showed the judge both stories
in one call, labelled `VERSION A (unmoderated)` and `VERSION B (after tone
moderation)`, always in that order. It named the treatment to the rater and
added fixed position on top. Now two independent single-story calls that share
no context. The two *axes* still share one call, because that argument does
hold: they are two readings of one story and one reader should make them
together. It does not extend to two stories.

**The pairwise judge was gagged.** `run_cli` hardcoded the tone system prompt,
which ends "judge tone only, never factual accuracy". The pairwise caller
inherited it while asking about factual correctness. `system` is now a
parameter. The fix moved narrative quality for the raw story from 35% to 55%.

**The merge nearly dropped `human_alarmism` and the local judge.** PR #8 removed
`run_judge`, `JudgeOut` and the `human_alarmism` column, all consistent with its
own design. Merged naively that would have deleted a populated column and the
comparison in section 3. All three are restored; `manage.py makemigrations
--check` is clean and the 20 stored runs survive.

---

## 6. What these numbers still cannot support

- **n = 1 per cell.** No repeats, so no confidence interval and no significance
  test. Every difference here is a point estimate.
- **One judge.** Opus rates each story once, so there is still no ICC or
  Krippendorff's alpha. The test-retest figure in section 2 is a stability
  measure, not an inter-rater one.
- **Breadth and depth do not intersect.** Only `g8b` ran across all seven
  datasets; the other twelve tiers ran on `pertussis-global` alone.
- **The local judge has one axis**, so `raw_optimism` and `moderated_optimism`
  are null on locally-judged runs. Null renders as "not measured", not as a
  score.
- **The human set is not the S6 protocol set** in `ASSIGNMENT.md`: five
  interchangeable writer slots per series rather than four named writers with a
  stable cross-series identity. The writing is genuinely human; the *design* is
  what falls short, so nothing here computes `H`.

Per-run table: `experiments/RUNS.md`. Machine-readable: `runs_table.json`,
`human_baseline_scores.json`, `pairwise_results.json`.
