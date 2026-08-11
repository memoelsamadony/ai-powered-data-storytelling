# Blind rating protocol - judge validation study

**Version:** v1.1 (2026-08-10) | Implements `EXPERIMENT_PLAN.md` §8.
**Raters:** the same four team members who wrote the baselines.
**Instrument:** [`RUBRIC.md`](RUBRIC.md) `alarmism-rubric v1.1`, verbatim block only.

The point of this session is not to rate stories. It is to find out whether the
model-assigned alarmism number means anything, by seeing whether four people using the same
rubric land anywhere near it. Everything below exists to stop the raters being able to tell
what they are rating.

> **This file has two parts. Raters get Part 1 and the rubric, and nothing else.** Part 2
> describes how the item list is built. A rater who has read it knows how many items repeat
> and how many are human-written, and can no longer produce the naive judgments the study
> needs. If you are rating, stop at the end of Part 1.

**Status:** the session is blocked until the two dependencies in §6 are cleared.

---

# Part 1 - for raters

## 1.1 What you are doing

You read a sequence of short data stories, one at a time, and score each one for tone
against `RUBRIC.md`. Some were written by a machine, some by a person; you are not told
which, and typography has been normalised so it will not tell you either.

There are **two passes over the same items, in the same order**:

- **Pass 1 - tone only.** Score every item and submit the file. This is the measurement.
- **Pass 2 - source only.** After Pass 1 is submitted and locked, you go through the same
  items again and say, for each, whether you think a person or a machine wrote it, and
  whether you think you wrote it yourself.

The passes are separate on purpose. If you are thinking about who wrote a story while you
are scoring its tone, the score is partly about authorship, and then the check meant to
qualify the ratings has quietly contaminated them.

Budget 50 to 70 minutes for Pass 1 and about 15 minutes for Pass 2.

## 1.2 Rules

- **Use the rubric, keep it open.** Re-read the anchors whenever you are unsure. That is
  what they are for.
- **Forward only.** Rate, move on. Do not go back and do not revise an earlier score after
  seeing a later story. Retrofitting earlier scores to a distribution you have started to
  perceive is the main way your own ratings stop being independent of each other.
- **One item at a time.** Do not skim ahead, do not lay items side by side, do not compare
  an item with the one before it.
- **No language model, for any part of the rating.** A rating produced with model help is a
  model rating, and that is the one thing this session cannot contain.
- **Do not discuss any item, score or guess with another rater** until all four files of both
  passes exist.
- Rate in one sitting if you can, with a single break at the midpoint. Record your start and
  end times.
- If you recognise a story as your own, score it anyway, exactly as you would any other, and
  say so in Pass 2. Do not adjust the score in either direction to compensate.

## 1.3 Pass 1 response format

One row per item, saved as CSV to
`experiments/judge-validation/ratings/pass1__<initials>.csv`, with exactly this header:

```csv
rater,order_index,story_id,rating,rationale,seconds
AE,1,S-014,3.5,"'wiped out'; leads on the worst three years",74
AE,2,S-002,2,"plain, states both directions",61
```

| Field | Values |
|---|---|
| `rater` | `AE` / `ME` / `AO` / `AR` |
| `order_index` | position in **your** sequence |
| `story_id` | `S-###`, as shown |
| `rating` | 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5. Nothing finer |
| `rationale` | at most 12 words, the wording that drove the score |
| `seconds` | optional |

Submit this file before starting Pass 2. Once submitted it is not edited again.

## 1.4 Pass 2 response format

Same items, same order, at
`experiments/judge-validation/ratings/pass2__<initials>.csv`:

```csv
rater,order_index,story_id,source_guess,self_authored
AE,1,S-014,llm,no
AE,2,S-002,unsure,no
```

`source_guess` is `human` / `llm` / `unsure`; `self_authored` is `yes` / `no`. Guess
honestly rather than cautiously: "unsure" is a real answer, but a string of them tells the
study nothing. Do not reopen your Pass 1 file while doing this.

## 1.5 A separate, shorter block

After both passes you will be given a small second block of stories on other topics, rated
the same way with the same rubric. It is handled separately in the analysis and is not part
of the blind comparison.

**End of Part 1.**

---

# Part 2 - analyst design (not distributed to raters)

## 2.1 The pool

**Block A - blind, and the only block that feeds the §8 statistics.** Every item is a
measles story, so topic cannot betray the source.

| Items | What |
|---|---|
| 27 | machine stories, stratified 3 per cell across 3 framings (`F-alarm`, `F-neutral`, `F-hope`) x 3 conditions (`C0` raw, `C1` paraphrase, `C2` moderated) |
| 3 | three of those 27, repeated later in the sequence, for intra-rater reliability |
| 4 | the human anchor stories, one per writer |
| **34** | **items per rater** (31 distinct texts) |

Sampling constraints, fixed by a recorded seed before the draw:

- **Distinct parents.** No two of the 27 machine items come from the same raw story. `C0`,
  `C1` and `C2` of one raw story are near-duplicates; a rater who sees two of them scores
  the second relative to the first and the ratings stop being independent. With 30 raw
  stories and 27 items this is satisfiable exactly.
- **Repeat spacing.** A repeated item sits at least 12 positions after its first appearance.
  Even so, a rater may notice a repeat and reproduce the earlier score from memory, so the
  intra-rater figure is reported as an **upper bound** on consistency, not an estimate of it.

**Block B - the extension stories, rated after Block A and never pooled with it.** The four
non-measles human baselines (`ASSIGNMENT.md` §4) have no machine counterpart in E1, so a
rater identifies them by topic alone and knows every item in the block is human-written.
Block B ratings are excluded from every §8 statistic and from `H`. If the addendum later
generates machine stories on those four series, Block B can be rebuilt as a blind block on
these same rules and the exclusion lifted.

## 2.2 Anonymisation and normalisation

Applied identically to machine and human stories. **Nothing is ever reworded.** Every
transformation is mechanical and logged per item to
`experiments/judge-validation/normalisation_log.jsonl`.

1. **Strip provenance.** Remove frontmatter, filenames, writer, model, seed, framing,
   condition, run id, timestamps, `emotiveSpans` markup, any residual JSON.
2. **Opaque ids.** Assign `S-001` .. `S-031` from a seeded shuffle. The mapping goes to
   `experiments/judge-validation/keymap.csv`.
3. **Uniform rendering.** Headline on the first line, body paragraphs separated by one blank
   line. No bold, italics, bullets, sub-headings, numbered paragraph prefixes, or trailing
   "Sources" / "Note" lines.
4. **Character normalisation, in both directions.** Em and en dashes to " - "; curly quotes
   and apostrophes to straight; ellipsis character to three dots; non-breaking and double
   spaces to single; trailing whitespace removed. These are machine tells and human tells in
   roughly equal measure.
5. **Headline case fixed a priori to sentence case** for every story in both populations.
   Deriving the target convention from the corpus would impose the majority population's
   habit on the minority, which is precisely a source tell. Every case change is logged.
6. **Machine-tell removal.** Leading "Here is", "Sure", "Of course", restatements of the
   task, emoji.
7. **Human-tell removal, narrowly.** A spell-check pass corrects unambiguous misspellings of
   dictionary words and nothing else: no change to word choice, word order, tense, or
   punctuation beyond step 4. Every correction is logged as a before/after pair so the edit
   set can be audited.
8. **Length is left alone.** No truncation, no padding. Length is a tell and it is also
   data; the word-count rule in `BRIEF.md` manages it, not the normaliser.

## 2.3 Randomisation, and the operator

- **Per-rater order.** An independent permutation per rater from `random.Random(seed)`, seeds
  recorded in `experiments/judge-validation/config.json`. Independent orders mean an order
  effect cannot line up across raters and masquerade as agreement.
- **The operator.** One named person runs the normaliser and the shuffle. All four candidates
  are also raters, so the safeguards are procedural: the operator does not open
  `keymap.csv`; the keymap and the per-rater item files are **committed before any rating
  file exists**, so the git history evidences the order and a later edit would be visible;
  and the operator's own ratings are flagged, with every §8 figure reported with and without
  them.
- Item files are generated per rater at
  `experiments/judge-validation/sheets/<initials>.md`, one item per section, in that rater's
  order, with no neighbouring item visible in the same view.

## 2.4 Self-authorship

Each rater meets one story they wrote and will probably recognise it. Pre-committed
handling: a rating flagged `self_authored: yes` in Pass 2 is excluded from the
human-to-judge ICC and from the human inter-rater ICC **for that item**, retained in the
file, and counted in the report. Each rater therefore contributes about 33 of 34 usable
ratings. That is **planned missingness**: the ICCs are estimated from a mixed-effects model
that tolerates missing cells, never from a complete-case two-way ANOVA, which would drop
whole stories to keep the matrix rectangular. A rater who flags a story they did not write,
or misses one they did, is caught by `keymap.csv` afterwards; both directions are reported.

## 2.5 The blinding check

`source_guess` gives a confusion matrix against the truth. Report **sensitivity,
specificity and Cohen's kappa**, with the base rate printed beside them. Never report raw
accuracy: 4 of 34 items are human, so a rater answering "llm" to everything scores 88 per
cent while having attempted nothing, and that number would read in a report as evidence of
successful blinding.

Report the blinding check **before** the agreement figures, not after. If raters identify
human stories above chance, the blind failed, and every §8 number carries that caveat where
it appears rather than in a closing paragraph.

## 2.6 Statistics

Per `EXPERIMENT_PLAN.md` §8:

| Quantity | Statistic |
|---|---|
| Human to LLM-judge agreement | Spearman rho, and ICC(2,k), two-way random, absolute agreement |
| Between the two LLM judges | Krippendorff's alpha, ordinal |
| Judge self-consistency (`C0` test-retest) | ICC(2,1) |
| Human inter-rater spread | ICC(2,1) across the four raters |
| Human intra-rater consistency | absolute difference on the 3 repeated items, per rater, reported as an upper bound |

Additional rules for this session:

- The **pre-committed downgrade rule** stands: if human-to-judge ICC(2,k) < 0.50, alarmism is
  reported as exploratory only and the primary claim becomes descriptive. It is pre-committed
  precisely so that it cannot be renegotiated once the number is known.
- Report the human inter-rater spread **in the same table** as any model difference the report
  wants to claim. If four people disagree by 1.5 points on the same story, a 0.4-point model
  difference is noise and the report has to say so.
- Prior exposure varies across raters (`prior_exposure` in each story's frontmatter). Report
  it as a table; do not average it away.

## 2.7 Blocking dependencies

**D1 - the instrument must match.** `EXPERIMENT_PLAN.md` §8 requires raters to use "the
identical 1-5 alarmism rubric given to the judges". Today the judges use the five-line scale
in `JUDGE_SYSTEM` (`backend/storytelling/agents.py`) and `JUDGE_PROMPT` accepts any
one-decimal value. **This session cannot run until** the verbatim block of `RUBRIC.md` has
replaced that text, the permitted half-point values are enforced on `alarmismRating`, and
every story rated under the old wording has been re-judged. Otherwise the study validates an
instrument the experiment never used, and a low agreement figure would be uninterpretable.
This kit records the dependency and does not edit the agent file.

**D2 - the normalisation script must exist and be committed.** §2.2 is mechanical and must be
executed by code, with its diff log committed:
`experiments/analysis/normalise_for_rating.py`, to be written. Hand-tidying stories is how
rewording creeps in.
