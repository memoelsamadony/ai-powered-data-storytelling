# Results under an independent judge, and against human writing

Measured 2026-08-12. Two things changed at once, and both were prerequisites
for any of the earlier numbers to mean much:

1. **The authoritative tone rating is now Claude Opus 5**, called blind through
   `backend/storytelling/judge.py`. It never generates, never moderates, and
   shares no vendor or family with anything it grades.
2. **A human reference set exists**, `experiments/human-baselines/pilot-stories/`,
   25 stories scored on the same rubric by the same judge.

Total judge spend for everything below: **$1.66** of list-price-equivalent
tokens across 85 calls (40 story ratings, 25 human ratings, 20 pairwise
comparisons).

---

## 1. The headline: moderation lands machine stories on the human level

Opus alarmism, 1-5, where 3 is calibrated and both ends are failures.

| series | machine raw | machine moderated | **human pilot (n=5)** |
|---|---|---|---|
| pertussis-global | 4.05 | 2.19 | **2.24** |
| diphtheria-global | 3.40 | 2.40 | **1.98** |
| under5-measles-deaths | 3.20 | 2.50 | **1.86** |
| mumps-global | 2.50 | 1.80 | **1.82** |
| measles | 1.95 | 2.05 | **2.08** |
| **overall** | **3.51** | **2.21** | **2.00** |

The raw stories sit well above the humans on every series where the data has a
dramatic shape. After moderation they sit within about 0.2 of the human mean on
three of five series. The human spread is tight (sd 0.30, range 1.5-2.5), so
"2.0" is a real target and not an artefact of averaging.

**Moderation is bidirectional.** On `measles` the raw story was *calmer* than
the human writers (1.95 against 2.08) and moderation pushed it **up** to 2.05,
toward them. Same on `under5-tetanus-deaths` (2.2 to 2.5) and
`under5-all-cause-deaths` (2.4 to 2.5). The moderator is not a volume knob that
only turns down; on flat series it corrects the opposite failure. That is the
strongest evidence so far that it is calibrating rather than dampening.

Caveats that travel with this table, both from `pilot-stories/README.md`:

- The pilot writers rewrote machine drafts by hand rather than writing blind
  from the pack, so the machine's framing leaked into the reference. Tone is
  the safest thing to read off it; similarity metrics are not.
- The pilot stories have **no headline**, so humans are judged on body text and
  machines on headline plus body. Headlines are where alarmism concentrates, so
  the human column is if anything flattered. The gap is a lower bound.

---

## 2. The local judge understated its own result

The cheap in-pipeline rater and Opus rated the same 40 stories.

| | local (`qwen3.5:4b` / `gemma4:31b`) | Opus 5 |
|---|---|---|
| mean rating | 2.70 | 2.86 |
| mean moderation delta | **-0.75** | **-1.30** |

- Pearson r on the ratings: **0.79**. On the deltas: **0.69**.
- Mean absolute difference: **0.52** points.
- The local judge understated the shift by more than 0.25 points in **12 of 20
  runs**.

So the local rater tracks the ordering reasonably but compresses the effect to
about **57%** of its measured size. Every "the moderator barely moved it"
reading in the earlier tables was partly the judge's insensitivity.

**This reverses the sharpest claim in L18.** `qwen3.5:2b` was the one run where
moderation supposedly did nothing (local: 4.0 to 4.0) while marking 10 emotive
spans, which was written up as "the moderator edited and did not calm". Opus
scores the same two stories **4.7 to 2.5, a delta of -2.2, the joint-largest in
the set**. The moderator worked; the 4B judge could not see it. The finding was
an artefact of the instrument and is withdrawn.

---

## 3. Pairwise preference: moderated wins everything except readability

The paper protocol (judge sees the data and both stories, picks a winner per
criterion), with position randomised and the treatment label hidden. 20 pairs.

| criterion | moderated | raw | tie |
|---|---|---|---|
| relevance_informativeness | **70%** | 0% | 30% |
| structure_coherence | 25% | 0% | 75% |
| narrative_quality | 25% | **55%** | 20% |
| factual_correctness | **100%** | 0% | 0% |
| **overall** | **100%** | **0%** | 0% |

Factual correctness is unanimous across all 20 pairs, which matches the
groundedness numbers computed without any judge at all.

**Narrative quality is the honest cost.** It is the only criterion the raw
story wins, and it wins it more than twice as often (55% against 25%).
Moderation buys accuracy and calibration by spending engagement. A reader who
only sees the overall row would miss the trade the system is actually making.

Position check: the judge picked the first-shown story **61.8%** of the time.
That is a real bias, and it is why position is randomised rather than fixed.
With randomisation it adds noise to the win rates instead of a direction.

---

## 4. Two measurement bugs found and fixed on the way

Both were in the new judging code, and both would have manufactured the result
the project wanted.

**The paired prompt was not blind.** `judge_run` showed Opus both stories in
one call, labelled `VERSION A (unmoderated)` and `VERSION B (after tone
moderation)`, always in that order. It named the treatment to the rater and
added a fixed position on top. Replaced with two independent single-story
calls that share no context and carry no label. Every Opus number above was
produced after this fix.

**The pairwise judge was gagged.** `run_cli` hardcoded the alarmism system
prompt, which says *"You judge tone only, never factual accuracy."* The
pairwise caller inherited it while asking about factual correctness. `system`
is now a parameter. The fix changed the answer: narrative quality for the raw
story went from 35% to **55%**, and factual correctness from 95% to **100%**.
The gagged run is not reported anywhere as a result.

---

## 5. What these numbers still cannot support

- **n = 1 per cell.** No repeats, so no confidence interval and no significance
  test. Every difference here is a point estimate.
- **One judge.** Opus rates each story once. No ICC, no Krippendorff's alpha,
  no reliability estimate for the scale itself.
- **Breadth and depth do not intersect.** Only the `g8b` tier ran across all
  seven datasets; the other twelve tiers ran on `pertussis-global` alone, so
  every model comparison is single-dataset.
- **The human set is a pilot**, not the blind protocol set in `ASSIGNMENT.md`.
  Nothing here computes `H`.

Full per-run table with every metric: `experiments/RUNS.md`.
Machine-readable: `runs_table.json`, `human_baseline_scores.json`,
`pairwise_results.json`.
