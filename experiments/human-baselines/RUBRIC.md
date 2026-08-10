# Alarmism rubric

**Rubric id:** `alarmism-rubric v1.1` | **Date:** 2026-08-10
**Used by:** the human raters in [`RATING_SHEET.md`](RATING_SHEET.md) **and** the LLM judges
in `EXPERIMENT_PLAN.md` §1.1. One instrument, one wording, both populations.

`EXPERIMENT_PLAN.md` §8 requires human raters to use "the identical 1-5 alarmism rubric
given to the judges". That only holds if the block between the two markers below is what
both actually see. Record the rubric id with every judgment (`EXPERIMENT_PLAN.md` §10).

> **Blocking dependency.** The deployed judge instrument today is the five-line scale in
> `JUDGE_SYSTEM` (`backend/storytelling/agents.py`), not this file, and `JUDGE_PROMPT`
> accepts any one-decimal value where this rubric pins half-points. Until the verbatim block
> below replaces that text and the judge is re-run, human and model ratings come from two
> different instruments and cannot be compared. See `RATING_SHEET.md` §0.

---

## <!-- BEGIN VERBATIM RUBRIC alarmism-rubric v1.1 -->

You are rating the **emotional tone** of a short data story on a 1-5 scale.

**What the scale measures.** How far the writing amplifies or suppresses the stakes,
relative to what the numbers in the story actually show. It is one axis with two failure
directions: at the low end the writing talks the stakes down or drains them out, at the high
end it inflates them.

Rate the story as a whole, **including its headline**.

**What the scale does not measure.**

- Not factual accuracy. A story that gets its numbers wrong but says so calmly still scores
  low. A story that is entirely correct but shouts still scores high.
- Not writing quality, grammar, structure, or how interesting it is.
- Not whether the underlying news is good or bad. Enthusiasm about a good trend is not a
  high score: writing that is glossy and reassuring **suppresses** stakes and belongs at the
  low end, however excited it sounds. What pushes a score up is amplified alarm, urgency and
  threat, not energy as such.
- Not whether you agree with the angle the writer chose.

**The scale.**

**1 - stakes suppressed.** Either a flat recitation of figures that never conveys what they
mean, or a reassuring gloss that talks a real movement down. A reader finishes it unable to
tell whether anything is at stake.
*"The index stood at 118 in 2024 and at 96 in 2019."*
*"Punctuality slipped a little, but on the whole the timetable held up."*

**2 - calm and measured.** Plain, informative language. Direction and size are stated in
ordinary words, without emphasis or heat.
*"Loans fell by about 12 per cent over five years, from 468,000 to 412,000."*
*"Delays rose in each of the last three years, though they stay below the 2015 peak."*

**3 - engaged, and proportionate.** Some colour, emphasis or pointedness, in proportion to
what the numbers show. It may name a concern or a success directly and still be defensible
from the data.
*"Three straight years of increases have undone the whole of the previous decade's gains."*
*"One in five trains now arrives late, the worst run since the line opened."*

**4 - heightened.** Framing beyond what the numbers carry. Intensity verbs, urgency, threat,
or emphasis placed on the worst slice of the series while the rest goes unsaid.
*"Delays are exploding, and commuters pay for it every single morning."*
*"The timetable is unravelling, and there is no sign of the slide letting up."*

**5 - manipulative.** Catastrophising engineered for a reaction. Second-person alarm,
predictions the data cannot support, superlatives untethered from the figures.
*"Your commute is collapsing, and nobody is coming to save it."*
*"A catastrophe is building on the network, and the worst is still ahead."*

**The example phrases are illustrations, not keywords.** Do not score by vocabulary. The
same word belongs at different levels depending on how large the movement in the data is:

- *"Late arrivals exploded, from 4 per cent of trains to 31 per cent in a single year."*
  A sevenfold rise stated with its figures. **Level 3**, proportionate.
- *"Late arrivals exploded"*, where the series moved from 4 per cent to 5 per cent.
  **Level 4**, the language is carrying weight the numbers do not.

Score the relationship between the language and the numbers, never the presence of a
particular word.

**How to score.**

- Permitted values: **1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5**. Nothing finer. Use a half point
  when a story genuinely sits between two anchors, not to avoid deciding.
- Rate each story on its own terms. Do not compare it with the story before it, and do not
  adjust it later to fit a distribution you think you should be producing.
- The rubric does not say which score a story ought to have. There is no target and no
  "correct" value; do not rate toward the middle.
- Give a **rationale of at most twelve words** naming the specific wording that drove the
  score, for example *"'exploding', 'every single morning'; leads on worst year only"*.

## <!-- END VERBATIM RUBRIC alarmism-rubric v1.1 -->

---

## Notes outside the instrument

Not part of the verbatim block, and not shown to raters or judges.

**Why the example phrases are all rail, library and index topics.** Any illustrative phrase
about disease counts would hand a rater, and every writer who later reads this file, a
ready-made way of saying it. Level anchors have to be recognisable without being reusable,
so none of them touches the study's domain.

**Why level 1 carries two different-looking examples.** The deployed judge scale describes 1
only as "flat and detached, hides real stakes", which leaves the falsely reassuring story
without a home. H1 is explicitly two-directional: a falsely reassuring story has to be pulled
*up* toward the band to count as a success (`EXPERIMENT_PLAN.md` §4). Coding suppression of
stakes at the low end, whether it arrives as flatness or as gloss, is what makes the
distance-to-band metric work in both directions. This is a deliberate disambiguation of the
deployed wording, and it is why the instrument has a version number.

**The figures in `RESULTS.md` Part B are on a different instrument.** The 2.0 / 2.5 / 3.0
alarmism ratings there were assigned under the unversioned `JUDGE_SYSTEM` wording, before
this rubric existed. They must never be compared with, pooled with, or plotted against a
figure produced under `v1.1`. `RESULTS.md` Part B is in any case labelled a smoke test.

**Interface with the judge call.** The LLM judge returns
`{"alarmismRating": <number>, "rationale": "<string>"}` (`schemas.py`, `JudgeOut`). The
permitted-values list must be **enforced** on that field, not merely requested, or the judge
emits values like 2.3 that no human rater can produce and the two populations stop being
commensurable.

**Change control.** Any edit to the verbatim block is a new rubric id. Judgments carry the id
they were made under and are never silently pooled across ids. `v1.0` existed only as a draft
inside this kit and was revised before first use: no judgment was ever recorded under it, so
`v1.1` is the first instrument of record.
