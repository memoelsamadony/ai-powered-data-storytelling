# Critique of this kit

Written as a hostile read of the v1.0 drafts of `BRIEF.md`, `RUBRIC.md`, `ASSIGNMENT.md`
and `RATING_SHEET.md` by someone whose goal is to show that the human tone band `H` is not
a measurement. The resolved / accepted list is at the end.

Severity: **serious** = would undermine the primary claim; **material** = would weaken a
reported number or a blind; **minor** = sloppiness with a cheap fix.

---

## D1. The brief tells the writers what is being measured. **Serious.**

`BRIEF.md` v1.0 opens with "The project measures how alarmist a data story is on a 1-5
scale", says their median "is the reference point that every model story in the study is
measured against", and cites H1 by name. Rule 6 then says "do not try to game any rubric",
which confirms a rubric exists, and rule 8 names `RUBRIC.md` and `RATING_SHEET.md`, both
sitting in the same directory one `ls` away.

A writer who knows they are defining the tone target does not write naturally. They write
what they believe a properly calibrated data story looks like. H1 then asks whether an
agent whose rubric was written by the same team moves stories toward a target the same team
deliberately aimed at. That is not circular in the strict sense that a model wrote the
baseline, but it is the same failure one step out: the anchor becomes a designed artefact
rather than an observation of how these people write.

The irony is exact. The kit exists to prevent an LLM from authoring the anchor, and then
hands the humans the specification the LLM would have been given.

## D2. "Cold" is fiction for these four writers. **Serious, and only partly fixable.**

The four writers built this repository. They have read `RESULTS.md` §B3, which contains a
complete model-written measles story with its headline and seven annotated span
replacements. They wrote `GENERATE_SYSTEM` ("short, vivid, attention-grabbing") and the
moderator rubric. At least one of them argued about what "false reassurance" means.

`BRIEF.md` rule 1 forbids re-reading during the writing window. It cannot un-read. The
strongest claim this design supports is "written by people who have seen model output on
this data, but not immediately before writing", and the kit as drafted does not say so
anywhere a reader of the report would find it.

## D3. Human and model were to be given different evidence. **Serious. Resolved during drafting.**

Draft `ASSIGNMENT.md` handed writers `experiments/datapacks/measles-global.csv`
(`year, cases, incidence_per_million`) while the generator receives
`build_prompt_table("measles")`: the same cases plus **MCV1 coverage by year**, per-country
detail, and the "herd immunity needs ~95% first-dose coverage" line. The coverage shortfall
is the central measles narrative and the strongest legitimate-urgency element in the data. A
human who cannot see it cannot write it.

`H` would then have been depressed by an evidence gap and the report would have called the
gap tone. It would also have been a perfect tell in the blind rating study: any story
mentioning coverage was written by a model.

Recorded here rather than quietly fixed, because the draft really did contain it and
because the fix (below) changes what a "data pack" is.

## D4. Everyone writes the anchor second, and one writer writes measles twice. **Material.**

Uniform ordering was chosen deliberately so the practice effect sits evenly on the anchor
set. Two costs follow, neither stated in the drafts:

- The four anchor stories are written **warm**, by someone who has just spent forty minutes
  writing a disease-count story. The model generates cold, first token to last. Whatever
  warming up does to a person's prose is baked into `H` and into nothing it is compared to.
- `AR` draws `under5-measles-deaths` as their first story and then writes the measles
  anchor. That is measles twice. The other three approach the anchor from an unrelated
  disease; `AR` approaches it having just chosen an angle on measles mortality. This is a
  writer-specific carryover that the allocation rule produced without anyone noticing.

## D5. The stated reason for the no-outside-facts rule is false. **Minor, but it invites lawyering.**

`BRIEF.md` rule 4 justifies itself with "the model gets one table and nothing else". The
model gets one table and several hundred billion tokens of pretraining that include what
measles is, what vaccination coverage means, and what happened in 2020. The asymmetry the
rule actually removes is in what reaches the *page*, not in what is in the writer's head. A
writer who spots that the stated reason is wrong has a licence to decide the rule is wrong
too.

## D6. The worked example anchors more than the form. **Material, and not fully fixable.**

The library example is three paragraphs, plain register, opens with the aggregate total,
moves to a sub-trend, closes on disaggregation by unit, and uses "per cent" twice. That is
a complete template for a measles story, and the sentence "It is an example of the form,
not a model of how to write" will not stop anyone from following it.

Worse, its register is mundane, which on the rubric is about a 2. Choosing a livelier
example would nudge the other way. There is no register-free example, so the example is a
nudge whichever way it is written, and the draft presents it as if it were neutral.

## D7. The length rule pushes tone, and gives humans a second pass the model never gets. **Material.**

"A story outside the range gets handed back to you with the word count" makes a return
likely for anyone who lands at 165 words. What gets cut when a writer trims to a target is
qualifiers, hedges and subordinate clauses. Removing hedges makes prose more assertive, and
assertive is a higher rubric score. So the length rule has a direction.

Separately, a returned story is edited twice. Model output is one shot. The kit does not
record which stories were returned, so this cannot even be checked afterwards.

## D8. The word count is defined by a shell one-liner that both populations do not share. **Minor.**

`tail -n +$(grep -n '^# ' ...)` breaks if the writer's headline contains a `#`, if they omit
the `# ` prefix, or if their frontmatter contains a Markdown heading. More importantly,
nothing says the model stories are counted the same way. "Same length" is only checkable if
one committed counter with one tokenisation counts both.

## D9. Version 1.0 of the rubric silently invalidates the numbers already published. **Minor.**

`RUBRIC.md` codes level 1 as *stakes suppressed*, covering both flat recitation and
reassuring gloss. The deployed scale says only "flat and detached". That is a real change,
and `RESULTS.md` Part B's 2.0 / 2.5 / 3.0 were assigned under the old wording. The change
control note says ids are never pooled, but nobody reading `RESULTS.md` will know that the
figures there are on a different instrument.

## D10. The rubric's example phrases will be pattern-matched, especially by the judge. **Material.**

"exploding" sits at level 4. A story that says "exploding" will now tend to be scored 4
whether or not the underlying jump justifies the word, and an LLM judge does this far more
readily than a person. The rubric says the axis is amplification *relative to what the
numbers show*, and then gives a keyword list that ignores the numbers. The two halves fight
each other.

## D11. The rating sheet leaks its own design to the raters. **Material.**

`RATING_SHEET.md` §1 tells the rater that three of the items are repeats, that four are
human, and that there are 34 items of which 31 are distinct. A rater who knows three items
repeat starts looking for them, recognises the second occurrence, and reproduces their first
score from memory. Intra-rater reliability then measures memory. A rater who knows 4 of 34
are human, roughly 12 per cent, can score `source_guess` as "llm" every time and be right
88 per cent of the time.

The kit made exactly the mistake it caught in `BRIEF.md`: the participant-facing document
contains the analyst's design.

## D12. Blinding is reported as raw accuracy against a 12 per cent base rate. **Material.**

Following from D11: raw accuracy is uninterpretable here. A rater guessing "llm"
indiscriminately scores 88 per cent and the report would print it as evidence that raters
could not tell them apart, when in fact it is evidence that they never tried.

## D13. Asking for a source guess changes the tone rating it sits next to. **Material.**

The response row collects `rating`, `source_guess` and `self_authored` together, item by
item. From item one the rater is thinking about authorship, and there is a well-known pull
to rate text you believe a machine wrote differently from text you believe a person wrote.
The blinding check, as drafted, contaminates the very ratings it is meant to qualify.

## D14. The person who builds the blind pool is also one of the four raters. **Material.**

Someone has to run the normaliser, hold `keymap.csv` and shuffle the items. All four
candidates for that job are raters. The draft says nobody opens `keymap.csv` until ratings
are in and then does not say who "nobody" is, or what stops the operator from having seen
the mapping in a terminal scroll-back.

## D15. A bootstrap CI on the median of four values is theatre. **Material.**

`ASSIGNMENT.md` promises "a percentile bootstrap 95% CI, 10,000 resamples" for `H`. With
n = 4 the resampling distribution has a handful of atoms, and the resulting interval is a
function of which two of four values happen to be adjacent. Printing an interval like that
next to `H` implies a precision the design cannot deliver, and it is exactly the kind of
number `EXPERIMENT_PLAN.md` §10 rule 1 was written to encourage and rule 4 to discipline.

## D16. `H` is collapsed to a scalar, which throws away the thing four writers bought. **Material.**

H1 is defined on `d = |alarmism - H|` with `H` a single number. The whole argument for
going from three writers to four was to get a usable spread. The drafts then reduce that
spread to a median and use the median everywhere. If the four anchor ratings turn out to be
1.5, 2, 3.5 and 4, the median is 2.75 and the band is nearly the width of the usable scale;
H1 computed against 2.75 would be reported as though the target were known to a quarter of
a point.

## D17. The pack now carries an instruction that is also part of the treatment. **Material.**

Under the fix to D3 the writer's pack is the generator's prompt table verbatim, which for
measles ends "Compare places of different size using the per-million rate, not raw counts."
Preferring rates over raw counts is precisely what rubric variant `V2` adds over `V1`
(`EXPERIMENT_PLAN.md` §3). Both populations now receive that instruction, so it does not
bias the H1 comparison. It does mean that if human baselines use per-capita rates, that is
not evidence of natural human practice, and H5's `V2 > V1` result is partly a test of
whether the moderator follows an instruction the generator was also given.

## D18. Block B is non-blind, n = 1, and rated by people who know all of it is human. **Material.**

The four extension stories have no model counterpart, so raters know that every item in
Block B is human-written. Their ratings of Block B are therefore not comparable with their
Block A ratings even descriptively, and the drafts imply they can be used as a per-series
band. One story per series, rated in the open, is an anecdote with a number attached.

## D19. Headline case is normalised to "the corpus convention". **Minor.**

`RATING_SHEET.md` step 5 defines the target convention by looking at the corpus. If the
model reliably writes Title Case and the humans write sentence case, the convention is
whatever the majority does, and the normaliser then imposes a model habit on human
headlines, or the reverse. The convention has to be fixed a priori.

## D20. Nothing says what happens when a writer breaks a rule. **Minor.**

The declarations are self-report with no verification path. A writer who ran Grammarly's
"rewrite this sentence" may not think of that as an LLM. If admitting it means their work is
thrown away and the team is short a baseline, the incentive is silence. The kit needs to make
disclosure cheap.

---

# Resolved / accepted

Applied to the v1.1 files in the same directory, or accepted with a reason.

| # | Status | What changed |
|---|---|---|
| D1 | **Resolved** | The writer-facing text no longer names the construct. `BRIEF.md` states only that the story is the independent human reference, never that tone or alarmism is measured, never the 1-5 scale, never H1. Rule 6's "rubric" wording is gone. `RUBRIC.md` and `RATING_SHEET.md` are no longer named or linked in the brief; the writer's packet is `BRIEF.md` plus two pack files, and both other documents are distributed only at the rating session. Residual leak accepted, see below. |
| D2 | **Accepted** | Cannot be undone. `BRIEF.md` keeps the `prior_exposure` field, `ASSIGNMENT.md` now requires the per-writer exposure table to be printed beside `H` wherever `H` appears, and the limitation is stated in the terms of D2: these are informed authors, not naive writers. The only real remedy, a replication band written by people outside the team, is listed as future work. |
| D3 | **Resolved** | The pack **is** the generator's prompt table. `build_prompt_table(<series>)` is saved verbatim to `experiments/human-baselines/datapacks/<series>.txt` and is the writer's only source, with `sha256(writer pack) == sha256(string passed to the generator)` as the acceptance criterion (addendum item P0.13). Evidence identity is now checkable rather than argued. Dependency recorded: four of the five series need `DatasetSpec` entries before their packs can be generated, which is backend work and not part of this kit. |
| D4 | **Accepted, with a check** | Uniform order is kept: splitting it would make the anchor set internally inconsistent, which is worse. Both costs are now stated in `ASSIGNMENT.md`. `AR`'s measles-on-measles carryover is named explicitly, `AR` is asked to put the two sittings on different days, and the pre-committed leave-one-writer-out sensitivity already covers the case where `AR`'s anchor is the outlier. |
| D5 | **Resolved** | Rule 4's justification rewritten: unstated background knowledge shapes both populations, and what has to match is what reaches the page and can be checked against the pack. |
| D6 | **Partly resolved, partly accepted** | The example now says which specific features must not be copied (paragraph count, opening move, use of percentages, register), states plainly that its mundane register is itself a nudge and that no neutral example exists, and instructs writers to close the brief before drafting. That there is a nudge at all is accepted and reported. |
| D7 | **Resolved** | 120-160 is the target; 110-170 is accepted without a return, so returns become rare. A returned story is edited for length only and records `returned: true`, and any figure derived from `H` is re-checked with returned stories dropped. |
| D8 | **Resolved** | One committed counter for both populations, whitespace tokenisation on the body only, headline excluded. `experiments/analysis/wordcount.py` is named as a dependency and the fragile `grep`-based one-liner is gone; word count is now taken from the frontmatter `word_count` field, produced by that script. |
| D9 | **Resolved** | `RUBRIC.md` now states that `RESULTS.md` Part B's alarmism figures were assigned under the unversioned `JUDGE_SYSTEM` wording, are on a different instrument, and must never be compared with, pooled with or plotted against a figure produced under the rubric of record. |
| D10 | **Resolved** | The verbatim block now says the phrases illustrate a level and are not keywords, and carries a contrast pair showing the same verb landing at two different levels depending on the size of the movement in the data. Because that edit changes the verbatim block, the instrument's own change-control rule applies and the id moved to `alarmism-rubric v1.1`; `v1.0` existed only as a draft inside this kit and no judgment was ever recorded under it, so `v1.1` is the first instrument of record. |
| D11 | **Resolved** | `RATING_SHEET.md` is split into Part 1 (rater-facing, distributed) and Part 2 (analyst-facing, not distributed). Pool composition, the repeat count, the human share and the sampling constraints all live in Part 2. Repeat spacing widened to 12 positions. |
| D12 | **Resolved** | The blinding check is reported as sensitivity, specificity and Cohen's kappa against the true source, never as raw accuracy, and the base rate is printed beside it. |
| D13 | **Resolved** | Two passes. Pass 1 collects `rating` and `rationale` for every item and is submitted and locked. Pass 2 re-presents the same items in the same order for `source_guess` and `self_authored` only. Authorship is never in the rater's mind while the tone score is being written. |
| D14 | **Resolved** | The operator role is named, the operator does not open `keymap.csv`, the keymap is committed **before** any rating file exists so the git history evidences the order, and the operator's own ratings are flagged and reported in a with/without sensitivity check. |
| D15 | **Resolved** | The bootstrap CI is dropped. `H` is reported as the median together with all four story-level values and the range, per `EXPERIMENT_PLAN.md` §12.8. |
| D16 | **Resolved** | H1 is additionally reported against the band edges: `d` recomputed with `H` at the minimum and at the maximum of the four anchor values. Pre-committed, so it cannot be selected after the fact. If the sign of the H1 result changes across that range, the result is reported as band-sensitive. |
| D17 | **Accepted, stated** | The prefer-rates instruction stays in the pack, because removing it would recreate the D3 asymmetry. Recorded as a limitation on the interpretation of human per-capita usage and of H5. |
| D18 | **Accepted** | Block B stays n = 1 and non-blind. It is labelled **PROVISIONAL** in `ASSIGNMENT.md`, excluded from every §8 statistic and from H1, and can only become blind if the addendum generates model stories on those four series. |
| D19 | **Resolved** | Headline case is fixed a priori to sentence case for every story, model and human, and the change is logged per item. |
| D20 | **Resolved** | Amnesty clause: a writer who discloses assistance has that story dropped and rewrites it in a fresh sitting, with no other consequence. Disclosure is cheap by design. |

**Residual leak accepted (from D1).** The brief still tells writers not to aim at any
particular register or tone, because the instruction is required and because a writer given
no guidance at all will invent a target of their own. It appears once, in a single clause,
and no other writer-facing sentence mentions tone. These four writers also know what the
project is about; full construct blinding is impossible here and the report should say that
rather than claim the separation of documents restored it.

**Two data caveats carried into the limitations**, from the datapack work:

- The diphtheria workbook labels its incidence row "per 1000 total population". That label
  is wrong: the workbook's own metadata sheet says per 1,000,000, and the arithmetic agrees.
  All four disease series are per million.
- The 192k-row GHO extract and the wide deaths CSV are not interchangeable. Summed over
  countries the GHO file runs 1.21x below the wide file in 2000 and 1.34x below by 2021.
  They must never be mixed inside one story or one pack.
