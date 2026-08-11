# Threats to validity

Every item here is a way a reader could reasonably say "your number does not
show what you claim it shows". They are ordered by how much damage they do to
the headline claim, not by how hard they are to fix. Items marked **OPEN** are
live as of 2026-08-11; **FIXED** ones are recorded because the earlier numbers
in `RESULTS.md` were produced before the fix.

---

## Tier 1: these can invalidate the headline result

### L1. The judge graded its own moderation. **FIXED 2026-08-11, but all Part B and Part D numbers predate the fix**

On the `mid` and `large` tiers the judge and the moderator were both
`gemma4:31b`. The project's novel metric is the alarmism delta between the raw
and the moderated story, so the model that rewrote the text also scored whether
the rewrite improved it. That is not a measurement, it is a self-report.

The `g*`/`m*` tiers now judge with `qwen3.5:9b`, a different family from the
`gemma4` moderator. `m31b-selfjudge` deliberately keeps the old pairing so the
size of the bias is itself measurable: the two rows differ only in who judges.

Residual: the judge is 9B and the moderator is 31B. A judge weaker than the
system it grades can floor the measurement. Reported, not solved.

### L2. There is no human baseline, so "distance to human writing" is unmeasured. **OPEN**

`experiments/human-baselines/stories/` is empty. The 25 stories in
`llm-drafts/` are Claude-authored and labelled as such. Any similarity metric
computed against them measures distance to Claude text, not distance to
independent human writing, and H1 as written in the addendum cannot be tested.
The kit for the real human track is ready; four writers and about four hours
each is what it costs.

### L3. n = 1 per cell. **OPEN**

Every tier x dataset combination is a single run at temperature 0.6. With one
sample per cell there is no variance estimate, so no ranking of tiers is
defensible and no significance test is possible: a 0.5-point alarmism
difference could be sampling noise. The addendum's Aligned Rank Transform and
Wilcoxon plans all assume repeats that do not exist yet. Minimum credible
design is 5 runs per cell.

### L4. The alarmism delta mostly measures the generator's temperament. **OPEN, and it is the founding finding**

Across the three original measles runs the moderated story landed on 2.0
regardless of where the generator started. When the generator already writes
calmly the moderator has nothing to correct, so the delta is near zero and the
metric reports a property of the generator rather than of the moderator. The
generator ladder (1B/3B/4B/8B) exists to test exactly this: if smaller
generators write hotter copy, the delta should grow as the generator shrinks.
Until that lands, "the moderator works" is not supported by a near-zero delta.

---

## Tier 2: these bias specific comparisons

### L5. The moderator ladder confounds size with family. **OPEN**

`gemma4:12b`, `gemma4:26b` and `gemma4:31b` share an architecture, a tokenizer
and a training recipe. A monotone trend across those three rungs is evidence
about scaling *within gemma4*, not about model capability in general. A
cross-family control at one rung (for example `qwen3.5:27b` against
`gemma4:26b`) is what would separate the two explanations.

### L6. The fact-check stage also runs on the moderator. **OPEN**

`factcheck` uses the moderator model, so the same weights that rewrote the
story also adjudicate whether its claims survive. Same structural flaw as L1,
one stage further down, and not yet fixed. The Python groundedness checker in
`storytelling/metrics.py` is model-free and should be treated as the primary
factuality number; the LLM fact-check is secondary until it runs on a
different model.

### L7. Groundedness is not truth. **OPEN by design, documented in the code**

The checker asks whether a stated figure appears in the evidence the model was
given. It cannot catch a real number used in the wrong context: global MCV1
coverage genuinely was 41% in the mid-1980s, so "coverage has collapsed to 41%"
written about today is false but perfectly grounded. Catching that needs the
windowed verifier in `experiments/analysis/timeseries_claims.py`, which is
written but not yet wired into the pipeline.

### L8. No length control. **OPEN**

Moderated stories are not constrained to the length of the raw story, and
several metrics (numeric density, hedge rate, superlative rate, all the
per-100-word rates) move with length. A moderation that merely shortens a story
lowers every rate metric without changing the tone at all. Either constrain the
rewrite to the input length or report every rate alongside the word count.

### L9. The humanize pass moved a tone-adjacent dimension. **OPEN, self-inflicted**

The pass-2 editor brief was deliberately construct-free: it named rhythm,
register and template tics, never tone or alarm. It still moved hedging down
(1.396 to 1.082 per 100 words) and certainty up (0.705 to 0.807) across the 25
drafts. Certainty is adjacent to the construct the study measures, so the
reference set is not tone-neutral with respect to its own construct. Nobody
asked for that shift and it should be stated whenever the reference set is used.

### L10. The instruction that failed its own check. **OPEN, honest negative**

The same brief explicitly asked editors to break uniform sentence rhythm.
Measured sentence-length variance went *down*, 26.65 to 23.83, because the
editors shortened sentences rather than varying them. An instruction that
measurably did the opposite of what it asked is worth reporting: it is evidence
that style instructions to an LLM should be verified, not assumed.

---

## Tier 3: sampling, data and reproducibility

### L11. A seed does not survive a model eviction. **DOCUMENTED**

Same seed, model warm: byte-identical output. Same seed with an unload in
between: different text. Every sequential-tier run evicts between stages, so
generation is always a cold load and run-to-run reproducibility cannot be
assumed. The committed `raw_stories.jsonl` is the reproducible artefact, not
the seed.

### L12. The seven datasets are not seven independent samples. **OPEN**

Five of the seven are WHO vaccine-preventable-disease surveillance series with
the same shape (global total by year, cases plus incidence per million) and
overlapping reporting infrastructure. `under5-measles-deaths` and
`under5-all-cause-deaths` come from the same causes-of-death table and are
nested (one is a subset of the other), as is `under5-tetanus-deaths`. Treating
n=7 as seven degrees of freedom overstates the evidence; the effective number
of independent series is closer to three.

### L13. `under5-all-cause-deaths` is a denominator, not a story. **OPEN**

It was built as the denominator for the cause-specific series. It is now a
`DatasetSpec` and will generate stories, but a story about it is a story about
an aggregate that no journalist would write on its own. Keep it in the set for
completeness, exclude it from any claim about story quality.

### L14. Reported cases are not incidence. **OPEN**

Every disease series counts *reported* cases. Changes in surveillance intensity
move the number without any change in disease. Stories that say "cases rose"
are safe; the fact-check must never accept "the disease spread" as equivalent.
The evidence packs say "Reported ... cases" and the writer brief forbids causal
claims, which handles this on the generation side, but no metric enforces it.

### L15. Single temperature, no decoding sweep. **OPEN**

Everything runs at temperature 0.6. Alarmism and hedging are exactly the kind
of surface properties that move with temperature, so a tier comparison at one
temperature may not survive at another.

### L16. Judge order effects are untested. **OPEN**

`judge_raw` and `judge_moderated` run in a fixed order within a run. Whether
the judge's rating of the moderated story is influenced by having just seen the
raw one is not tested, because the judge is called in separate requests with no
shared context, but this has not been verified empirically. A shuffled
presentation with blinded labels would settle it.

### L17. Single judge, so no reliability statistic exists. **OPEN**

One judge model produces one rating. ICC(2,k) and Krippendorff's alpha, both
named in the addendum, need multiple raters. Until at least three independent
judges rate the same stories, the alarmism scale has no reliability estimate
and its 1-5 granularity is an assumption rather than a finding.

---

## What would move the most, per hour spent

1. Five repeats per cell on one tier pair (L3). Without it nothing else is
   statistically reportable.
2. The four measles human baselines (L2). Unblocks every similarity metric and
   H1.
3. A third judge model plus shuffled blinded presentation (L16, L17). Turns the
   alarmism scale from an assertion into a measurement.
4. Length-matched moderation (L8). Cheap, removes a confound from every rate
   metric at once.
