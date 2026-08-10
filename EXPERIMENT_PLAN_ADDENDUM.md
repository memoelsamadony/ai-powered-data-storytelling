# Addendum A: model scale, prompt engineering, and time-series metrics

**Status:** pre-registration. Written before the runs it describes.
**Extends:** [`EXPERIMENT_PLAN.md`](EXPERIMENT_PLAN.md). That protocol is sound and its
Phase 0, design principles, judge-validation study and reporting rules all carry over
unchanged. This addendum replaces only section 6 (machine allocation) and experiment E5,
adds two experiments, and specifies the metrics for the new medical time-series datasets.

**Adds three things the base protocol cannot answer:**

1. **Model scale as a designed factor** rather than a machine assignment. E5 as written
   cannot attribute an effect to generator size, moderator size, or the machine.
2. **Prompt engineering as a measured factor**, crossed with scale, so the project can say
   whether a better rubric substitutes for a bigger model.
3. **Judge-free framing metrics** computed from the time series itself, so the central
   tone claim no longer rests entirely on an LLM judge.

---

## A0. What is wrong with scale in the base protocol

Four defects, all structural rather than sloppy.

| # | Defect | Where | Consequence |
|---|---|---|---|
| S1 | **Machine is confounded with model size.** Machine A runs `demo`, Machine B runs `mid` | §6 | Any tier difference could be hardware, quantisation, or a different model pull |
| S2 | **Generator and moderator scale together.** Tiers move both at once | `ollama_client.TIERS` | A tier difference cannot be attributed to either one |
| S3 | **One comparison, no interaction term.** E5 repeats a single arm and tests it with Mann-Whitney | §7 E5, H8 | The interesting question is an interaction, and a two-sample test cannot express one |
| S4 | **The top of the scale axis is excluded.** `large` is declared out of scope | §6 | The scale claim spans 4B to 31B on the moderator and is silent above it |

S2 is the one that matters most. The project's actual claim is about the **moderator**.
Tiers make the moderator inseparable from the generator, which is the same confound the
base protocol correctly identifies for framing in defect #3 and then reintroduces here.

### The tier abstraction is wrong for experiments

Tiers are a good deployment abstraction: they answer "what can this machine hold at once".
They are the wrong unit for an experiment, because a tier is a bundle. Phase 0 item P0.1
already splits the judge out of the tier. This addendum requires the same for the
generator and moderator: **the experiment runner addresses models directly, not tiers.**

> **P0.10 (new, blocking).** `run_pipeline` accepts `--generator`, `--moderator`, `--judge`
> and `--prompt-variant` as independent arguments. Tiers remain for `/api/health` and the
> interface. **Accept when** a single run can pair any installed generator with any
> installed moderator without editing `TIERS`.

> **P0.11 (new, blocking).** Record the **model digest** (from `/api/tags`), the machine
> id, and the quantisation string on every `StageResult`. **Accept when** a seed-matched
> pair of runs on Machine A and Machine B with the same digest produces byte-identical
> generator output. If it does not, machine becomes a reported blocking factor rather than
> an assumed non-factor.

> **P0.12 (new, blocking).** The rating study in base-protocol section 8 requires human
> raters to use "the identical rubric given to the judges". The deployed judge instrument is
> the terse five-line scale in `JUDGE_SYSTEM` (`backend/storytelling/agents.py`), which is
> not the same document as the rubric written for the raters.
> **Accept when** `experiments/human-baselines/RUBRIC.md` is embedded verbatim in
> `JUDGE_SYSTEM`, and any story judged before the change has been re-judged.
>
> Without this the validation study validates an instrument the experiment never used, and
> the agreement coefficient it reports would be meaningless. This is a blocker, not a
> documentation tidy-up.

P0.11 is what makes it safe to split work across the two machines. Verify it once, on one
pair, before the main runs. If digests differ between machines, re-pull rather than
re-plan.

---

## A1. Design: three crossed factors

### Factors

**G, generator size** (3 levels). The story writer.

| Level | Model | Size | Rationale |
|---|---|---|---|
| `G-S` | `qwen3.5:4b` | 2.6 GB | characterised in Part A: 52.0% Quintd error rate, 0.9% masked-number |
| `G-M` | `llama3.1:8b` | 4.9 GB | mid point; already measured writing calmly unprompted |
| `G-L` | `gemma4:31b` | 19.9 GB | characterised in Part A at 12B; 18.0% error rate |

**M, moderator size** (2 levels). The tone agent, and the project's actual subject.

| Level | Model | Size |
|---|---|---|
| `M-S` | `gemma4:12b` | 8.1 GB |
| `M-L` | `gemma4:31b` | 19.9 GB |

Both moderator levels are the **same family**, deliberately. Comparing gemma to qwen would
confound size with training data. The generator axis spans families on purpose, because
there the point is variation in output, not a controlled size contrast.

**P, prompt strategy** (5 levels). See A2.

**D, direction of truth** (2 levels), a property of the dataset rather than a manipulation.
See A3. This is what lets the both-directions calibration claim be tested without relying
only on framing prompts.

### Why not the full cross

3 x 2 x 5 = 30 cells at n = 30 is 900 moderation calls, roughly 25 hours of local
inference before judging. Instead, two experiments that share one pool of raw stories.

**E7 (scale).** G x M full factorial, prompt fixed at the pre-registered primary `P-rubric`.
6 cells. Raw stories generated once per generator (3 x 30 = 90), each moderated by both
moderators: **180 moderation calls**.

**E8 (prompting).** P x M at fixed generator `G-S`, the weakest generator and therefore
the one with the most headroom for a prompt to matter. 5 x 2 = 10 cells, n = 20:
**200 moderation calls**. Reuses E7's `G-S` raw stories, so no new generation.

The two share the `G-S` x `M-*` x `P-rubric` cells, which is the design's centre point and
a consistency check: the same cell estimated twice from independent runs should agree
within noise. **If it does not, both experiments are suspect** and that is reported.

### Pairing

Every moderator, prompt and judge condition operates on the **same persisted raw story**.
This is base-protocol principle 1.2 and it is what makes every contrast paired and gives
the design its power at n = 30. Concretely: 90 raw stories are generated once, hashed, and
committed. Nothing downstream regenerates them.

---

## A2. Prompt engineering as a measured factor

Prompt strategy is treated as an experimental factor with the same rigour as model size,
not as a set of ad hoc rewordings.

### Levels

| Code | Strategy | Content |
|---|---|---|
| `P-min` | minimal | the original `emotional-tone-moderation/pipeline.py` line: detect and rewrite alarmist tone |
| `P-rubric` | **primary, pre-registered** | the current V2 rubric: named tone failure modes, preserve legitimate urgency, prefer per-capita rates |
| `P-cot` | rubric + reasoning | the rubric, plus an instruction to identify and justify each tone problem before rewriting |
| `P-critic` | rubric + self-critique | two passes: rewrite, then critique the rewrite against the rubric and revise. Costs 2 calls per story |
| `P-verbose` | **length-matched placebo** | the same token count as `P-rubric`, filled with generic writing advice carrying no tone-specific information |

`P-verbose` is the control that makes this science rather than prompt tinkering. Without
it, any gain from `P-rubric` is confounded with prompt length: longer prompts change
behaviour on their own. **The claim is only that the rubric works if `P-rubric` beats
`P-verbose`, not merely `P-min`.**

### Paraphrase robustness

Each strategy is instantiated as **k = 3 semantically equivalent paraphrases**, written
independently and checked to preserve the instruction set. Stories are assigned to
paraphrases in balanced rotation.

This yields a **prompt sensitivity index**: the between-paraphrase standard deviation of
the outcome, per strategy and per moderator size. Two uses:

1. **A strategy effect that does not survive paraphrase variance is not an effect.** If the
   spread between paraphrases of `P-rubric` is as large as the gap between `P-rubric` and
   `P-verbose`, the finding is prompt-brittleness, not rubric quality. This is the single
   most common failure in published prompt-engineering claims and it is cheap to guard.
2. **Prompt sensitivity is itself a scale hypothesis** (H12 below): smaller models are
   expected to be more prompt-brittle. If true, that is a real and reportable result about
   when prompt engineering is worth the effort.

### Pre-registration discipline

`P-rubric` is the primary. The other four are exploratory and enter the Holm-Bonferroni
family. Declaring this in advance is what prevents choosing the winning prompt after
seeing the data.

---

## A3. Datasets: medical time series

Five global series, all annual, all from the new `datasets/` upload plus the existing
measles merge. Normalised to one tidy schema by
`experiments/datapacks/build_datapacks.py`: `series,year,cases,incidence_per_million`.

All figures below were computed from the generated datapacks and cross-checked against
the raw sources; full detail in `experiments/datapacks/FACTSHEET.md`.

| Series | Span | Full-span direction | Last 5 years | Congruent? |
|---|---|---|---|---|
| `measles-global` | 1980-2024 | falling, -82.5% | **rising** | no |
| `mumps-global` | 2000-2025 | falling | falling | yes |
| `pertussis-global` | 2000-2025 | **rising** | rising | yes |
| `diphtheria-global` | 2000-2025 | **rising** | rising | yes |
| `under5-measles-deaths` | 2000-2021 | falling steeply | **rising** | no |
| `under5-all-cause-deaths` | 2000-2021 | falling | falling | yes |

**Two series are internally incongruent**, and they are the most valuable material here.
`measles-global` falls 82.5% across the span while rising over the last five years, and
`under5-measles-deaths` does the same. A narrator can tell a truthful progress story or a
truthful alarm story about either, purely by choosing the window, with no false statement
anywhere. That is the cleanest possible test case for the Window Selection Index, and it
is the situation the project's whole thesis is about: framing that misleads while every
number checks out.

`pertussis-global` supplies the opposite extreme: a trough of 30,402 in 2021 and a peak of
941,893 in 2024, a 31-fold rise. Any baseline anchored at 2021 produces an enormous and
technically correct percentage. That is the Baseline Anchor Distance metric's test case.

**This is a material upgrade over the base protocol**, which had one dataset and had to
manufacture both directions of miscalibration with framing prompts alone (its threat 2 and
threat 3). Here the direction of truth **varies naturally across series**, so:

- a hopeful story about a rising series is a genuine error the moderator must correct
  upward;
- an alarmist story about a falling series is a genuine error it must correct downward;
- and the framing prompt manipulation becomes a **second, independent** way of producing
  miscalibration rather than the only one.

Factor `D` is crossed with framing `F`, and the **incongruent cells are the informative
ones**: `F-hope` on a rising series, `F-alarm` on a falling series. A moderator that merely
lowers intensity will fail the first and pass the second, and the design will show that.

Series are balanced across generator conditions so that direction of truth is not
confounded with model.

---

## A4. Metrics

### A4.1 Fixing the metrics that return zero

The shipped `_bleu` in `backend/storytelling/services.py` ends with:

```python
if min(precisions) == 0:
    return 0.0
```

**Diagnosis, measured on the real run `056795c4` moderated story against the 125-word
human baseline** (129 reference tokens, 115 candidate tokens):

| n | precision |
|---|---|
| 1-gram | 23.48% |
| 2-gram | 0.88% |
| 3-gram | **0.00%** |
| 4-gram | **0.00%** |

BLEU-4 is the geometric mean of the four precisions, so a single zero collapses the whole
score. The texts share almost a quarter of their vocabulary and not one three-word
sequence. **The zero is a property of the estimator at this text length, not of the
stories.** Two 120-word paraphrases of the same content routinely share no 4-gram.

Measured effect of each fix on that same pair:

| Metric | Value |
|---|---|
| BLEU-4 unsmoothed (currently shipped) | **0.0000** |
| BLEU-4, Chen and Cherry smoothing method 1 (epsilon) | 0.0056 |
| BLEU-4, Chen and Cherry method 3 (exponential) | 0.0106 |
| BLEU-1 | 0.2348 |
| BLEU-2 | 0.0088 |
| **chrF++** | **0.3140** |
| ROUGE-L | 0.0984 |
| METEOR-lite | 0.1618 |

> **P0.4 (revised, replaces the base protocol's P0.4).** Report **chrF++ as the primary
> surface-similarity metric**, with BLEU-1, BLEU-2, smoothed BLEU-4, ROUGE-L and
> METEOR reported alongside for continuity with Part A and with the interim presentation.
> Corpus-level BLEU is aggregated across all pairs in a condition before dividing, which is
> what Part A did and is why its BLEU-4 of 1.54 and 2.17 were non-zero.
> **Accept when** a 120-word pair returns a non-zero, interpretable value on every reported
> metric, and the implementation reproduces the table above.

chrF++ is primary because it scores character n-grams, so it degrades gracefully at short
lengths instead of collapsing, and it is the current standard in machine-translation
evaluation for exactly this reason. Reference implementation:
`experiments/analysis/similarity.py`.

**A caveat that belongs in the report regardless.** Surface overlap with one human story is
a weak construct here. Two stories can state identical facts with no shared phrasing. These
metrics are reported because the interim presentation promised them and because Part A used
BLEU; **they must not carry the argument.** The tone-band result (H1) and the judge-free
framing metrics (A4.3) are the evidence.

### A4.2 Other degenerate measures

Carried over from the base protocol and restated because they are the same class of defect:

| Measure | Defect | Fix |
|---|---|---|
| `factsPreserved` | `not any(status == "flagged")` restates the fact-checker | Python numeric accuracy against the CSV (P0.3) |
| human alarmism | hardcoded `2.5` | judged on the same rubric (P0.2) |
| `raw_alarmism or 3.0` | a missing measurement renders as a real one | `None`, excluded from analysis (P0.7) |

### A4.3 Time-series claim taxonomy, verified in Python

The base protocol's P0.3 checks "every figure against the CSV". That is necessary and not
sufficient for time-series narration, where most claims are **relational** rather than
point lookups. This taxonomy is the DataTales per-operation idea specialised to time
series, and every type below is decidable from the tidy CSV without a model.

| Type | Example | Verification |
|---|---|---|
| `point` | "675,533 cases in 2024" | exact lookup, exact match |
| `direction` | "cases rose" | sign of the endpoint difference over the cited window |
| `magnitude_abs` | "up by 14,999" | difference, tolerance 0 |
| `magnitude_rel` | "up 82%" | ratio, tolerance +/- 1 percentage point |
| `extremum` | "the worst year in a generation" | argmax or argmin over the cited window |
| `trend_window` | "falling since 2000" | OLS slope sign over the window, plus monotonicity flag |
| `turning_point` | "the decline stopped in 2016" | sign change in the first difference |
| `aggregate` | "averaged 300,000 a year in the 2010s" | mean over the window, tolerance +/- 1% |
| `cross_series` | "measles fell while pertussis rose" | both directions checked |
| `normalisation` | "Nigeria's rate is higher" | comparison must use the rate column |
| `causal` | "driven by falling coverage" | **not decidable from the table, auto-flagged** |
| `predictive` | "will exceed one million by 2030" | **not decidable, auto-flagged** |

Derived measures:

- **numeric accuracy** = correct / decidable claims
- **per-type accuracy**, giving the DataTales complexity gradient on time series
- **unverifiable claim rate** = (causal + predictive) / all claims. This is a tone-adjacent
  measure obtained for free, and it tests H7 without a judge.

### A4.4 Judge-free framing metrics

**The most important addition in this addendum.** Every tone number in the project is
currently model-assigned, which the base protocol correctly lists as threat 1 and mitigates
with a human agreement study. These five metrics measure rhetorical framing **arithmetically
from the series**, so the central claim acquires a second, independent line of evidence
that no judge can bias.

| Metric | Definition | What it catches |
|---|---|---|
| **Window Selection Index** | 1 if the direction of the cited window contradicts the direction of the full series, else 0 | cherry-picking a sub-window. Measles 2016-2019 rises inside a falling series; pertussis has the mirror case |
| **Baseline Anchor Distance** | \|cited start year minus series trough year\| / span | anchoring a rise to the trough to inflate it |
| **Denominator Compliance** | share of cross-population comparisons stated as rates rather than raw counts | the raw-count trap the rubric names explicitly |
| **Extremum Inflation** | share of "highest ever" or "worst since X" claims that survive checking | superlative inflation |
| **Volatility Framing** | flag when a change smaller than one historical year-over-year standard deviation is narrated as a trend | noise sold as signal |

Each is computed for the raw and the moderated story, giving a **paired, judge-free
before-and-after** for every one of them. `experiments/datapacks/FACTSHEET.md` enumerates,
per series, the sub-windows whose direction contradicts the full series, so the Window
Selection Index has a precomputed ground truth.

If the moderator improves these and the LLM-judged alarmism at the same time, the tone
claim rests on two independent instruments. **If it improves the judged score but not
these, that is a strong signal the judge is measuring style rather than framing**, and it
must be reported.

---

## A5. Hypotheses

Added to the base protocol's secondary family under the same Holm-Bonferroni correction.
`Δd` is the reduction in distance to the human tone band, as defined in the base protocol
H1.

### Scale

| ID | Hypothesis | Test |
|---|---|---|
| **H10** | Moderator size drives the effect more than generator size: the main effect of `M` on `Δd` exceeds the main effect of `G` | Linear mixed model `Δd ~ G * M + (1 \| story)`; compare marginal effects with bootstrap CIs |
| **H11** | **Moderation substitutes for generator scale.** The `G-S` x `M-L` cell reaches a `d_after` no worse than `G-L` x `M-S`, non-inferiority margin 0.3 alarmism points | TOST on the paired contrast |
| **H13** | Causal-claim removal improves with moderator size but does not reach ceiling | McNemar per size, plus the size x status interaction |

**H11 is the headline of this addendum.** If it holds, the claim is that a 4B generator
paired with a strong moderator lands in the same tone band as a 31B generator with a weak
one, at a fraction of the memory. That is a practical, laptop-scale result and the
strongest available argument for the architecture. It is also directly actionable: it says
where to spend the memory budget.

### Prompting

| ID | Hypothesis | Test |
|---|---|---|
| **H14** | The rubric beats a length-matched placebo: `Δd(P-rubric) > Δd(P-verbose)` | Wilcoxon signed-rank, paired within story |
| **H15** | Reasoning and self-critique add nothing beyond the rubric: `P-cot` and `P-critic` do not exceed `P-rubric` | Friedman across the five strategies, post-hoc Wilcoxon with Holm |
| **H12** | **Prompt sensitivity decreases with model size.** The between-paraphrase standard deviation of `Δd` is larger for `M-S` than for `M-L` | Levene on the paraphrase-level variances, plus the ratio with a bootstrap CI |
| **H16** | **Prompting substitutes for moderator scale.** `P-critic` on `M-S` is non-inferior to `P-rubric` on `M-L`, margin 0.3 | TOST |

H15 is stated in the null direction on purpose. Chain-of-thought and self-critique are
widely assumed to help; if they do not help here, that is a finding worth reporting, and
stating it this way removes the incentive to keep adding prompt tricks until one wins.

H12 and H16 together are the prompt-engineering counterpart of H11: **is the cheaper lever
prompting or parameters?** The two together answer a question the project can genuinely
own.

---

## A6. Sample size and cost

| Experiment | Cells | n | Generation | Moderation | Judging |
|---|---|---|---|---|---|
| E7 scale | 6 | 30 | 90 (once) | 180 | 540 |
| E8 prompting | 10 | 20 | 0 (reuses E7) | 200 + 100 for `P-critic`'s second pass | 400 |

Paired Wilcoxon at n = 30, alpha .05, 80% power detects d ~ 0.54, unchanged from the base
protocol. The mixed model for H10 gains power from pairing across the 90 shared raw
stories. **H11 and H16 are non-inferiority tests and need the margin fixed in advance:
0.3 alarmism points, which is below the 0.5 the base protocol calls the edge of
detectability, so both are deliberately conservative.**

Wall clock at the measured 9.5 tok/s for the 31B and roughly 30 tok/s for the 12B:
E7 about 6 to 8 hours, E8 about 5 hours. Both overnight jobs.

### The judging bottleneck, and a correction to the base protocol

The base protocol names **Opus 4.7 as the primary judge**. E7 and E8 together need roughly
**940 judgments**. There is no automated path to Opus in this project: Part A's judging was
done by hand through subagents, which does not scale to four figures.

> **Revision.** The **local secondary judge (`qwen3.6:35b`, different family from the
> gemma moderators) becomes the primary judge at scale.** Opus rates a **stratified random
> subsample of 120 stories**, balanced across every cell, and that subsample is used to
> report local-to-Opus agreement and, if agreement is adequate, to calibrate the local
> scale. The human agreement study in base-protocol section 8 is unchanged and remains the
> gate on the whole metric.

This is a practical constraint, not a preference, and pretending otherwise would leave the
protocol unexecutable. The pre-committed downgrade rule in base-protocol section 8 applies
to the local judge exactly as written.

---

## A7. Machine allocation, decoupled from the design

Machines are assigned to **stages**, never to conditions, so machine cannot be confounded
with any factor.

| | Machine A | Machine B |
|---|---|---|
| Hardware | RTX 4050, 6 GB VRAM, 15 GB RAM | Apple M1 Max, 32 GB unified |
| Can hold | up to about 8 GB of weights | up to about 22 GB, one large model at a time |
| Runs | generation for `G-S` and `G-M`; all `M-S` moderation; all local judging | generation for `G-L`; all `M-L` moderation |

Prerequisite: P0.11 verified once, on one seed-matched pair, before the main runs. If the
digests do not match across machines, re-pull the model rather than reinterpreting the
result.

Note that on Machine B, `M-L` at 19.9 GB and `G-L` at 19.9 GB cannot be co-resident with
anything else, so eviction between stages is mandatory. `backend/README.md` covers the
policy. P0.9 in the base protocol fixes the hardcoded 32 GB probe, which would otherwise
report Machine A as having 24 GB of usable GPU memory and skip eviction entirely.

---

## A8. Execution order

Slots into the base protocol's section 11 after step 7.

| Order | Step | Blocking | Est. |
|---|---|---|---|
| 0 | P0.10, P0.11 and the revised P0.4 | yes | half a day |
| 1 | `build_datapacks.py`, FACTSHEET, and the claim verifier | yes, everything downstream reads it | half a day |
| 2 | Verify P0.11 on one seed-matched pair across machines | yes | 20 min |
| 3 | Generate and commit the 90 raw stories | yes | about 1 h |
| 4 | **E7 scale** | | overnight, both machines |
| 5 | **E8 prompting** | | overnight, Machine A plus Machine B for `M-L` |
| 6 | Centre-point consistency check between E7 and E8 | yes, gates both | analysis only |
| 7 | Judge-free framing metrics over all E7 and E8 artefacts | | analysis only, no model calls |
| 8 | Opus calibration subsample, 120 stories | | manual |

Step 6 is a genuine gate. If the shared `G-S` x `M-*` x `P-rubric` cells disagree between
the two experiments beyond noise, something is not controlled and neither result stands.

---

## A9. What this addendum will and will not support

**Will support**, if the results come out:

- Whether moderator scale or generator scale carries the tone effect (H10).
- Whether a small generator plus a strong moderator matches a large generator (H11), which
  is a deployable claim about where to spend memory.
- Whether the rubric beats a length-matched placebo (H14), which is the difference between
  a contribution and a prompt that happens to be longer.
- Whether prompting substitutes for parameters (H16), and whether prompt brittleness falls
  with scale (H12).
- A framing measurement that does not depend on any judge (A4.4).
- Both-directions calibration evidenced by **naturally rising and falling series** rather
  than by framing prompts alone.

**Will not support**, regardless of outcome:

- Anything above 31B on the moderator, or any closed model. The scale axis stops where the
  hardware does.
- Any claim about non-global or country-level narration. All five series are global
  aggregates; the country-level GHO file is available but out of scope here.
- Generalisation beyond infectious-disease surveillance time series.
- Any prompt-strategy claim that fails its paraphrase-robustness check. Those are reported
  as brittleness, not as effects.
