# Threats to validity

Every item here is a way a reader could reasonably say "your number does not
show what you claim it shows". They are ordered by how much damage they do to
the headline claim, not by how hard they are to fix. Items marked **OPEN** are
live as of 2026-08-11; **FIXED** ones are recorded because the earlier numbers
in `RESULTS.md` were produced before the fix.

---

## Tier 1: these can invalidate the headline result

### L1. The judge graded its own moderation. **FIXED 2026-08-11, and the bias is now measured: it doubled the reported effect**

On the `mid` and `large` tiers the judge and the moderator were both
`gemma4:31b`. The project's novel metric is the alarmism delta between the raw
and the moderated story, so the model that rewrote the text also scored whether
the rewrite improved it. That is not a measurement, it is a self-report.

The authoritative judge is now **Claude Opus 5**, run blinded and offline over
exported stories, so it shares no weights, family or vendor with anything under
study and is stronger than the moderators it grades. The `g*`/`m*` tiers also
carry a cheap local secondary judge (`qwen3.5:4b`, a different family from the
`gemma4` moderator) so that two independent raters give an agreement statistic.
`m31b-selfjudge` deliberately keeps the old self-judging pairing so the size of
the bias is itself measurable: the two rows differ only in who judges.

**Measured, 2026-08-11, pertussis-global, seed 7.** Two runs whose raw story and
moderated story are byte-identical (`raw_sha=c34380d2b248`,
`mod_sha=0be47174d69d`), differing only in who judges:

| Tier | Judge | Raw | Moderated | Delta |
|---|---|---|---|---|
| `m31b-selfjudge` | `gemma4:31b` (the moderator itself) | **4.0** | 2.0 | **-2.0** |
| `g8b` | `qwen3.5:4b` (independent) | **3.0** | 2.0 | **-1.0** |

The self-judging configuration reports exactly twice the improvement on the same
text. The whole gap comes from the *raw* rating: the model that rewrote the
story scored the "before" a full point more alarmist than an independent judge
did, while both agreed the "after" was 2.0. A model asked to grade its own
moderation inflates the problem it just solved.

Every Part B and Part D alarmism number was produced under the self-judging
pairing and should be read as an upper bound, not a measurement.

Residual: `qwen3.5:4b` is far smaller than the 31B moderator it grades, so a
judge ceiling could now masquerade as a moderation ceiling in the other
direction. This is why the authoritative rating is Claude Opus 5, run blinded
and offline (`experiments/export_for_judging.py`); the local judge is retained
only as a secondary rater for an agreement statistic.

### L2. A human reference exists now, but it is a pilot, not the protocol set. **PARTLY CLOSED 2026-08-12**

`experiments/human-baselines/pilot-stories/` holds 25 human-written stories, 5
per series, and they are scored on the same blind Opus judge as everything else
(`experiments/score_human_baselines.py`). That is enough to answer the question
the project could not answer at all before: where do the machine stories sit
relative to a person writing from the same evidence pack.

Three reasons it is not yet the baseline `ASSIGNMENT.md` specifies, all from
`pilot-stories/README.md`:

1. **Not blind.** Every writer rewrote an LLM draft rather than starting from
   the pack, so the machine's framing leaked into the reference set. Similarity
   metrics against it are therefore still contaminated, and only the *tone*
   numbers are safe to use.
2. **Not from scratch**, so `BRIEF.md` rule 2 is violated by construction.
3. **Wrong shape for `H`.** S6 wants four named writers with stable identity
   across series; this set has five interchangeable slots per series. Nothing
   in the repo computes `H` from it, and nothing should.

The old `llm-drafts/` set, which was Claude-authored throughout, has been
deleted (`DELETED-LLM-DRAFTS.md`), so the repo no longer contains a
machine-written set that could be mistaken for a baseline.

One asymmetry to keep in view: the pilot stories have no headline, so the judge
scores body-only text for humans and headline-plus-body for machines. Headlines
are where alarmism concentrates, so the human figures are, if anything,
flattered relative to the machine ones.

### L3. n = 1 per cell. **OPEN**

Every tier x dataset combination is a single run at temperature 0.6. With one
sample per cell there is no variance estimate, so no ranking of tiers is
defensible and no significance test is possible: a 0.5-point alarmism
difference could be sampling noise. The addendum's Aligned Rank Transform and
Wilcoxon plans all assume repeats that do not exist yet. Minimum credible
design is 5 runs per cell.

### L4. The alarmism delta mostly measures the generator's temperament. **OPEN. The first attempt to test it was confounded; see L18**

Across the three original measles runs the moderated story landed on 2.0
regardless of where the generator started. When the generator already writes
calmly the moderator has nothing to correct, so the delta is near zero and the
metric reports a property of the generator rather than of the moderator. The
generator ladder (1B/3B/4B/8B) exists to test exactly this: if smaller
generators write hotter copy, the delta should grow as the generator shrinks.
Until that lands, "the moderator works" is not supported by a near-zero delta.

---

### L18. The generator ladder mixed families, and correcting it reversed the result. **RESOLVED 2026-08-11**

The first generator ladder paired `llama3.2:1b`, `llama3.2:3b`, `qwen3.5:4b`
and `llama3.1:8b`. Two families and two llama generations, so "size" was never
the only moving part. On that ladder the 8B rung produced the calmest raw story
(3.0) and the smaller rungs ran hot (4.0 to 4.5), which read as "smaller
generators write more alarmist copy".

`qwen3.5` is the only family here with a full ladder, so the same experiment was
re-run inside it, moderator and judge unchanged, same dataset and seed:

| Generator | Params | Raw | Moderated | Delta |
|---|---|---|---|---|
| `qwen3.5:2b` | 2B | 4.0 | 4.0 | **0.0** |
| `qwen3.5:4b` | 4B | 4.5 | 3.0 | -1.5 |
| `qwen3.5:9b` | 9B | 4.0 | 3.0 | -1.0 |

**Within one family, generator size has no effect on raw alarmism.** 2B, 4B and
9B all land between 4.0 and 4.5. So does `llama3.2:1b` and `llama3.2:3b`, at
4.0. The single calm outlier in the whole set is `llama3.1:8b` at 3.0, and it is
also the only llama-3.1 model tested.

The original reading was therefore a **family effect misread as a size effect**.
What can be said is narrower and still useful: most small instruct models write
this series at roughly 4.0, and `llama3.1:8b` writes it calmer. Whether that is
scale or lineage cannot be settled without `qwen3.5:27b`, the rung that would
show whether a larger qwen also calms down.

A second observation from the same table: `qwen3.5:2b` is the only run where
moderation did nothing to the rating (4.0 -> 4.0) despite the moderator marking
10 emotive spans, the most of any run. The moderator edited the text and did not
move the tone, which is a distinct failure from "no edit" and is exactly what
`rewrite_intensity` was added to separate.

---

### L19. Judging the studio's human baseline creates a user-controlled yardstick. **OPEN, introduced 2026-08-12**

The interface now sends the baseline a user types to the same blind Claude judge
that scores the machine stories, because without a human rating the comparison
panel has no band and reports nothing. That fixes a real defect and introduces
four threats, none fatal, all worth naming before a number from this panel is
quoted anywhere.

**1. The band is n=1 and the judge's own wobble is the same size as the band.**
`humanBands` draws a target of +/-0.5 around the human rating. That rating is a
single Claude call with no repeats. The test-retest in `OPUS-JUDGE-RESULTS.md`
measured a maximum drift of **0.5 points** on unchanged text, so re-judging the
same baseline could move the target by the full half-width of the band. "Landed
in the human band" is therefore a soft verdict, not a measurement, until the
baseline is judged more than once and the median taken.

**2. Provenance is unverified, and the yardstick is user-controlled.** Whatever
is pasted into the box is labelled "Human baseline" and scored as one, including
text generated by another model. The studio cannot tell the difference and does
not claim to. This is a demo affordance, not a protocol baseline: the only
baselines with provenance are `human-baselines/pilot-stories/` (hand-rewritten,
see L2) and `stories/` (blind, still being collected). Nothing in the studio
feeds `H`.

A smaller case of the same thing: the baseline is free text reaching an
instructable model, so a determined user can write text aimed at the judge
rather than at the reader. The blast radius is one demo run's own target band,
and the rating is clamped to 1-5, so the worst outcome is a person fooling their
own comparison.

**3. Headline asymmetry, again.** The title field is optional. A baseline saved
without one is judged on body text while the machine stories are judged on
headline plus body, and headlines are where alarmism concentrates. Same caveat
as the pilot set in L2, and deliberately not equalised: stripping the machine
headline would hide a real part of what the generator produced.

**4. Length is uncontrolled.** A 40-word baseline and a 150-word machine story
are scored on the same scale with no length term, and L8 already records that
several measures move with length.

**What the design gets right**, and the reason this is a net gain: all three
stories go through the *same* blind single-story call, so any bias the judge has
applies equally to the human and the machine text and largely cancels in the
difference. Ratings are also never inferred from stale text - saving edited text
clears the old rating before re-judging, and `compare` withholds the rating
entirely when it is handed baseline text the run was not judged on.

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

### L11. Seeded reproducibility: the earlier conclusion was too strong. **CORRECTED 2026-08-11**

The earlier note in `RESULTS.md` said a seed does not survive a model eviction:
same seed warm gave byte-identical output, same seed across an unload gave
different text.

The P0.1 pair above contradicts that. Both runs used seed 7 and `llama3.1:8b`,
and between them the generator was evicted to make room for `gemma4:31b` and
then reloaded from cold. The raw stories are byte-identical
(`raw_sha=c34380d2b248` in both). So a seed *can* survive an eviction, and
whatever caused the earlier divergence was not the cold load by itself.

Until the real cause is isolated, treat seeded reproducibility as **observed but
not guaranteed**: verify by hash rather than assuming either way. The committed
raw stories remain the artefact to trust.

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
