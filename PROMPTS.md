# Prompt engineering: what changed, why, and how it is measured

Every prompt the pipeline sends, what was changed in it and on what evidence,
and how the experiment tests whether the changes matter. Prompts are treated as
an experimental factor here, not as configuration.

All prompt text lives in `backend/storytelling/agents.py`. Each prompt's sha256
is recorded in the per-experiment JSON export, so any figure in the report can
be traced to the exact wording that produced it.

---

## Why prompts get this much attention

Three of the four agents are the same base model doing different jobs. The only
thing that distinguishes a generator from a moderator from a fact-checker is the
prompt. If the project's contribution is an "emotional tone moderation agent",
then the contribution largely **is** a prompt, and it has to be evaluated like
one: with a control, a placebo, and a robustness check.

---

## The four prompts

### 1. Generator

Unchanged in intent from `emotional-tone-moderation/pipeline.py`. It asks for a
short, vivid, attention-grabbing data story in 120 to 160 words, temperature 0.6.

Two changes, both mechanical rather than rhetorical:

| Change | Reason |
|---|---|
| The data table is now `datasets.pack_text(dataset_id)`, read from the CSV | The original hardcoded the numbers in a `DATA = """..."""` string, so a story could be grounded in a figure the dataset did not contain |
| `num_predict` capped at 450 | 120 to 160 words plus JSON overhead. An uncapped generator produces long stories, and the moderator has to restate the whole story, so generator verbosity multiplies downstream cost |

The generator prompt is deliberately **not** tuned. It is the source of the
miscalibration the moderator is supposed to correct, so making it more measured
would remove the thing being measured.

### 2. Moderator: the three rubric versions

This is the prompt the project is actually contributing, and its versions are
the `V0` / `V1` / `V2` levels of the ablation in `EXPERIMENT_PLAN.md` E2.

**V0, the original.** "Detect exaggerated, alarmist, or manipulative emotional
tone and rewrite so the tone is calibrated and faithful to the data."

**V1 adds: preserve legitimate urgency.**

> Reduce manipulation while PRESERVING legitimate urgency and the most
> informative framing. A story stripped of all weight is a failure, not a success.

Evidence for the change: the project's own judge verdict on the first real run
found the moderator had removed the "coverage below 95% for a decade" insight
along with the alarmism. Flattening is a failure mode of the agent, not a
success, and V0 did not say so.

**V2 adds: prefer rates over counts.**

> dropped denominators: raw counts used to compare places of very different
> size, where a per-capita rate is available and more honest

Evidence: the same verdict found neither model used per-capita rates when
comparing Germany with Nigeria, although the rates were in the data. This is
also the one rubric item with an automatic check, `denominator_compliance` in
`experiments/analysis/timeseries_claims.py`, so V2's effect is measurable without
a judge.

**Also in V2, both failure directions are named.** The prompt asks for
"falsely reassuring" and "numbingly detached" tone as well as alarm, because two
of the five datasets are progress stories where the failure mode is
over-optimism.

**Structured output.** The moderator returns `emotiveSpans` as
`{original, replacement, reason}` rather than the original free-text `ISSUES:`
list. This is what makes span counts and the specificity test in E3 possible at
all, and it is also what exposed the grammar-decoding defect described in
`backend/README.md`.

### 3. Fact-checker

Separate agent, separate prompt, by design. The founding observation of this
project is that the tone agent silently corrected a hallucinated number without
flagging it, so a tone rubric cannot be trusted to also report facts.

The prompt is strict about causal language:

> Be strict about causal claims: "driven by", "amid", "because of" are almost
> never supported by a table of counts and coverage.

Evidence: both reproductions put causal-operation accuracy at 0%, for a 4B and a
12B model alike.

### 4. Judge

**Changed structurally, not just in wording.** The judge no longer contains a
prompt at all in the usual sense: it loads
`experiments/human-baselines/RUBRIC.md` at import time and uses the verbatim
block as its system prompt.

`EXPERIMENT_PLAN.md` section 8 requires human raters to use "the identical rubric
given to the judges". Copying the text into `agents.py` would satisfy that on the
day it was copied and drift silently afterwards. Loading it means the two cannot
diverge, and `RUBRIC_ID` and `RUBRIC_SHA256` are recorded with every judgment.
This is blocking item P0.12.

The response format also changed: the rubric pins half-point steps, so the prompt
now asks for one of 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5 or 5 rather than "one decimal
allowed".

---

## The prompt factor in the experiment

`EXPERIMENT_PLAN_ADDENDUM.md` A2 crosses five prompt strategies with moderator
size. The two design features that make it an experiment rather than tinkering:

**A length-matched placebo, `P-verbose`.** Same token count as the rubric, filled
with generic writing advice carrying no tone-specific information. Longer prompts
change model behaviour on their own, so without this any V2 gain is confounded
with prompt length. **The claim is only that the rubric works if it beats the
placebo, not merely the minimal prompt.**

**Three paraphrases per strategy.** Semantically equivalent rewordings, assigned
to stories in balanced rotation, giving a between-paraphrase standard deviation.
If the spread between paraphrases of the rubric is as large as the gap between
the rubric and the placebo, the finding is prompt brittleness rather than rubric
quality. This is the most common failure in published prompt-engineering claims
and it is cheap to guard against.

`P-rubric` (V2) is pre-registered as primary. `P-min`, `P-cot`, `P-critic` and
`P-verbose` are exploratory and enter the Holm-Bonferroni family.

---

## Decoding parameters

Recorded per call in `StageResult.usage` and in the experiment export.

| Stage | Temperature | num_predict | Why |
|---|---|---|---|
| generate | 0.6 | 450 | the generator is meant to reach for drama |
| moderate | 0.0 | 3000 | the largest output: a full rewrite plus every changed span |
| factcheck | 0.0 | 1500 | one entry per claim |
| judge | 0.0 | 250 | a number and one sentence |

`seed` is pinned per run so a generation can be reproduced. `num_ctx` is 8192
throughout.

**Grammar-constrained decoding is attempted first and falls back to prompted
JSON.** This is not defensive padding: `format` sends `gemma4:31b` into a
degenerate repetition loop on some inputs. The fallback path is recorded per
stage in `usage.grammar`, so a batch can be checked for how often it fires.
Details in `backend/README.md`.

---

## What is deliberately not tuned

- **The generator.** Tuning it would remove the miscalibration being measured.
- **The judge, beyond adopting the rubric.** Its wording is the rating
  instrument, and an instrument tuned against the outcome it measures is not an
  instrument.
- **Few-shot exemplars anywhere.** Exemplars would leak a target tone into the
  generator and a target rating into the judge. `P-cot` and `P-critic` test
  reasoning scaffolds instead, which add process without supplying an answer.
