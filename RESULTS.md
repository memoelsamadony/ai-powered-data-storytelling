# Measured results

Every number in this file was read from a metrics file or a run record, not from a
write-up. Where a figure appears in `REPORT.md` but has no backing artefact in the
repo, that is stated explicitly.

**Two separate bodies of work are collected here.** Part A is the reproductions of
the two prior papers, which ground the project's design choices. Part B is our own
tone-moderation pipeline, run through the Django backend. They use **different
models and different metrics** and are not directly comparable.

Sources:

| Part | Artefact | Location |
|---|---|---|
| A1 | `metrics.csv`, `metrics_qwen3.csv` | `reproductions/paper5-quintd/` |
| A2 | `metrics.json`, `metrics_gemma4.json`, `factuality_*.json` | `reproductions/paper9-datatales/` |
| B | `Run` / `StageResult` rows | `backend/db.sqlite3` |

> The paper9 `metrics*.json` and `factuality_*.json` files are listed in
> `.gitignore`, so they exist only in a local working copy, not in the repository.

---

# Part A - Reproductions

## A1. Kasner & Dušek (Quintd, ACL 2024) - data-to-text faithfulness

**What is measured.** Each generated output is annotated by a reference-free judge
(Opus 4.7, using the paper's exact `gpt4_metric.yaml` prompt) which marks token-level
error spans under the taxonomy **0 = Incorrect, 1 = Not-checkable, 2 = Misleading,
3 = Other**. The headline metric is the share of outputs containing **at least one**
semantic error. `n = 20` per domain, 100 total per model.

*Read it as:* "how often does a model say something the data does not support?"
Lower is better. It says nothing about writing quality.

### gemma4:12b

| Domain | n | % with ≥1 error | avg errors | Incorrect | Not-checkable | Misleading | Other | avg words |
|---|---|---|---|---|---|---|---|---|
| openweather | 20 | 20.0% | 0.20 | 0.20 | 0.00 | 0.00 | 0.00 | 109.9 |
| gsmarena | 20 | 5.0% | 0.05 | 0.05 | 0.00 | 0.00 | 0.00 | 130.0 |
| ice_hockey | 20 | 30.0% | 0.45 | 0.40 | 0.00 | 0.05 | 0.00 | 62.4 |
| owid | 20 | 20.0% | 0.30 | 0.15 | 0.00 | 0.05 | 0.10 | 75.1 |
| wikidata | 20 | 15.0% | 0.15 | 0.05 | 0.05 | 0.05 | 0.00 | 35.5 |
| **ALL** | **100** | **18.0%** | **0.23** | **0.17** | **0.01** | **0.03** | **0.02** | **82.6** |

23 errors across 100 outputs.

### qwen3.5:4b

| Domain | n | % with ≥1 error | avg errors | Incorrect | Not-checkable | Misleading | Other | avg words |
|---|---|---|---|---|---|---|---|---|
| openweather | 20 | 55.0% | 0.65 | 0.60 | 0.05 | 0.00 | 0.00 | 149.1 |
| gsmarena | 20 | 75.0% | 0.95 | 0.30 | 0.35 | 0.20 | 0.10 | 190.5 |
| ice_hockey | 20 | 75.0% | 1.55 | 1.35 | 0.15 | 0.05 | 0.00 | 75.0 |
| owid | 20 | 40.0% | 0.70 | 0.45 | 0.20 | 0.00 | 0.05 | 73.1 |
| wikidata | 20 | 15.0% | 0.15 | 0.00 | 0.00 | 0.10 | 0.05 | 35.3 |
| **ALL** | **100** | **52.0%** | **0.80** | **0.54** | **0.15** | **0.07** | **0.04** | **104.6** |

80 errors across 100 outputs.

### Three-way comparison

| Model | Year · size | % with ≥1 error | errors/output |
|---|---|---|---|
| Zephyr-7B | 2023 · 7B | **87%** | not recorded |
| qwen3.5:4b | 2026 · 4B | **52.0%** | 0.80 |
| gemma4:12b | 2026 · 12B | **18.0%** | 0.23 |

> **Caveat on the Zephyr row.** 87% is quoted in `REPORT.md` and the dashboard, but
> there is **no `metrics_zephyr.csv` in the repository** - unlike the other two rows,
> it cannot be re-derived from a committed artefact. Treat it as a reported figure
> pending the CSV.

**What this supports.** The paper's headline (">80% of outputs contain ≥1 semantic
error") does not reproduce on a modern 12B model: 18.0% vs >80%, and 0.23 vs >2
errors per output. Both axes matter - the 2026 4B model (52%) sits between the 2023
7B model and the 2026 12B model.

**What it does not support.** Any claim about a single domain to better than ±10
points; each per-domain cell rests on 20 examples. It also cannot rule out judge
leniency on its own - the adversarial second pass described in `REPORT.md` (1 missed
error across 100 outputs) is what addresses that, and its per-item records are not in
a metrics file.

**Failure profile.** For both models the dominant error type is **Incorrect**
(contradicts the data): 0.17 of gemma's 0.23, 0.54 of qwen's 0.80. The two models
differ in *Not-checkable* (ungrounded invention): gemma 0.01/output, qwen 0.15/output
- a 15x difference. gemma mis-derives; qwen invents. Hardest domains for both are the
numeric/derivation ones (ice_hockey, owid); simple attribute lookup (wikidata) is
near-clean for both.

---

## A2. DataTales - per-operation narration

30 `investrade` equity-market reports from the official test split, zero-shot.

### Style and factuality

| Metric | qwen3.5:4b | gemma4:12b |
|---|---|---|
| BLEU-4 (corpus, 30 reports) | 1.54 | **2.17** |
| BLEU n-gram precisions (1/2/3/4) | 14.2 / 2.0 / 0.7 / 0.3 | 15.6 / 2.9 / 1.1 / 0.4 |
| Numbers stated that are correct | 178/262 = **67.9%** | 223/246 = **90.7%** |
| Insightfulness - impact (1-5) | 2.77 | 2.60 |
| Insightfulness - significance (1-5) | 2.33 | 2.47 |

*BLEU-4* measures n-gram overlap with the human-written report. **It measures wording,
not correctness** - a factually perfect report phrased differently scores near zero.
Both values sit inside the paper's own zero-shot range (GPT-4 1.96, Llama2-7B 2.26),
so this is best read as "LLM narrations diverge in style from human analysts",
which is the paper's point, rather than as a quality ranking.

*Insightfulness* is an Opus 4.7 proxy on a 1-5 scale, **not** the paper's
finance-expert rating. Do not compare it to their numbers.

### Per-operation accuracy

*What is measured:* every analytical claim in a generated report is classified by
operation type and checked against the source table.

| Operation | Category | qwen3.5:4b | gemma4:12b |
|---|---|---|---|
| lookup | simple | 86.2% (69/80) | **93.1%** (81/87) |
| comparison | basic quantitative | 74.2% (66/89) | **91.7%** (88/96) |
| subtraction | basic quantitative | 46.4% (13/28) | 80.0% (4/5)* |
| rate_of_change | basic quantitative | 43.3% (13/30) | 88.9% (8/9)* |
| trend | advanced analytical | 40.5% (17/42) | **87.3%** (69/79) |
| **causal** | advanced analytical | **0.0%** (0/13) | **0.0%** (0/8) |
| predictive | advanced analytical | 0.0% (0/1) | no claims made |

\* Small denominators. gemma writes more concise reports, so it makes far fewer
explicit difference and rate claims (5 and 9, against qwen's 28 and 30). **Do not
read 80.0% and 88.9% as reliable** - a single item moves them by 12-20 points.

**The result that matters.** Scale lifts every reading and computing operation -
trend goes 40.5% → 87.3%, rate_of_change 43.3% → 88.9%, comparison 74.2% → 91.7%.
**Causal analysis stays at exactly 0% for both**, on 13 and 8 claims respectively.
Every "driven by / amid / as investors..." statement was unsupported by the table.
This is a capability wall, not a size problem, and it is the direct justification for
a separate factual/causal check beside the tone agent.

### Masked-number factuality (the paper's own metric)

*What is measured:* for each number in the **gold human report**, the model is given
the table plus the report prefix up to that number and must predict the exact value.
Normalised exact match. Same 115 targets for both models, so they are directly
comparable to each other and to the paper.

| Model | Score | vs the paper's same-day zero-shot band |
|---|---|---|
| GPT-4 (paper) | 25.2% | n/a |
| LlaMa2-13B (paper) | 20.7% | n/a |
| LlaMa2-7B (paper) | 18.8% | n/a |
| GPT-3.5 (paper) | 14.6% | n/a |
| **gemma4:12b (ours)** | **12.2%** (14/115) | just below the GPT-3.5 / Llama2 band |
| **qwen3.5:4b (ours)** | **0.9%** (1/115) | far below all of them |

**Both land in the paper's sub-30% regime, so its central claim reproduces.**

**Important caveat, verifiable in `factuality_gemma4.json`.** gemma's 14 hits are
almost all *trivial* tokens rather than predicted values: `500` (from "S&P 500", 6 of
the 14), `200`, `2000`, `4,000`, `3,900`, and the bare digit `1`. Genuine exact-value
prediction of an OHLCV figure is **near zero for both models**.

### Why 90.7% and 12.2% are both true

These two factuality numbers look contradictory and are not. They measure opposite
things:

- **"Of the numbers the model chooses to state, how many are right?"** → gemma 90.7%.
  The model only utters figures it can read off the table, so it is mostly right.
- **"Can the model predict the number a human analyst wrote?"** → gemma 12.2%.
  It cannot reconstruct the specific quantitative narrative a human produces.

Together: the models are **cautious and mostly right about what they choose to
report, but cannot produce the precise numbers a human would.** Our same-day table is
also narrower than the paper's, which caps the achievable score.

---

# Part B - Our tone-moderation pipeline

Three complete runs on the `mid` tier: **llama3.1:8b** generator, **gemma4:31b**
moderator, judge and fact-checker. Primary dataset (measles × MCV1), 2026-08-07.

> **Model note.** These runs use different models from Part A. `qwen3.5:4b` and
> `gemma4:12b` are not pulled on this machine, so Part A cannot currently be re-run
> and Part B could not use the report's original pairing.

## B1. Run summary

| Run | Raw headline | Alarmism before → after | Δ | Spans rebalanced | Fact-check (verified / flagged) |
|---|---|---|---|---|---|
| `7c2eb23c` | "Measles Makes a Comeback as Vaccination Rates Plateau" | 3.0 → 2.0 | **−1.0** | 8 | 5 / 3 |
| `0ae47274` | "Measles' Stubborn Resilience" | 2.5 → 2.0 | **−0.5** | 8 | 6 / 2 |
| `056795c4` | "Measles Cases Plummet, But Vaccine Coverage Plateaus" | 2.0 → 2.0 | **0.0** | 7 | 7 / 1 |

*Alarmism* is an LLM judge rating on a 1-5 scale (1 = flat and hides the stakes,
5 = manipulative catastrophising). This is the project's novel metric.

**The finding, and it is not the flattering one.** Every moderated story converges on
**2.0**, but the reduction depends entirely on where the generator started. When
llama3.1:8b wrote a calm story (2.0), moderation changed the tone by **nothing** -
while still rewriting 7 spans. The generator prompt explicitly asks for "vivid,
attention-grabbing" copy and the model largely declined.

**Consequence for the study.** Δalarmism measured on spontaneous generations will
mostly measure *how alarmist the generator happened to be*, not how well the
moderator works. Measuring the moderator requires either inducing the miscalibration
with framing prompts, or pairing a weak generator with a strong moderator. This is
the basis for E1 and E5 in `EXPERIMENTS.md`.

**Also note:** across all three runs the fact-checker returned **0 `corrected`**
items and 1-3 `flagged`. The "corrected" status exists for the silent-re-grounding
behaviour observed in the earlier hand-run; it did not recur here, which is itself
worth reporting rather than assuming.

## B2. Stage timings and token usage

| Run | Stage | Model | Time | Decoding | Out tok | In tok |
|---|---|---|---|---|---|---|
| `7c2eb23c` | generate | llama3.1:8b | 11.5 s | grammar | 193 | 422 |
| | judge_raw | gemma4:31b | 15.1 s | grammar | 43 | 339 |
| | moderate | gemma4:31b | 119.5 s | **fallback** | 675 | 1228 |
| | judge_moderated | gemma4:31b | 10.3 s | grammar | 46 | 339 |
| | factcheck | gemma4:31b | 71.5 s | grammar | 560 | 865 |
| | **total** | | **227.9 s** | | | |
| `0ae47274` | generate | llama3.1:8b | 13.1 s | grammar | 193 | 422 |
| | judge_raw | gemma4:31b | 24.6 s | grammar | 46 | 343 |
| | moderate | gemma4:31b | 87.2 s | grammar | 682 | 980 |
| | judge_moderated | gemma4:31b | 10.8 s | grammar | 38 | 377 |
| | factcheck | gemma4:31b | 95.5 s | grammar | 613 | 903 |
| | **total** | | **231.1 s** | | | |
| `056795c4` | generate | llama3.1:8b | 63.1 s | grammar | 193 | 422 |
| | judge_raw | gemma4:31b | 45.0 s | grammar | 42 | 344 |
| | moderate | gemma4:31b | 131.7 s | **fallback** | 527 | 1233 |
| | judge_moderated | gemma4:31b | 13.0 s | grammar | 42 | 350 |
| | factcheck | gemma4:31b | 109.0 s | grammar | 589 | 876 |
| | **total** | | **361.7 s** | | | |

Notes:

- **"Decoding"** records whether grammar-constrained output succeeded or the client
  fell back to prompted JSON. The `moderate` stage fell back in **2 of 3 runs** and
  succeeded with grammar in the third, on the same model and same-shaped schema -
  the failure is probabilistic, not deterministic. See `backend/README.md`.
- **Wall-clock is not stable across runs.** `056795c4` took 59% longer than
  `7c2eb23c` with an identical stage sequence, because model loads and system memory
  pressure vary. Timings here are indicative, not benchmarks - a proper latency
  comparison needs repeats on a quiet machine.
- `generate` emits exactly 193 output tokens in all three runs (temperature 0.6 but
  a stable length target).

## B3. Worked example - run `056795c4`

**Raw (llama3.1:8b, alarmism 2.0):** "Measles Cases Plummet, But Vaccine Coverage Plateaus"

**Moderated (gemma4:31b, alarmism 2.0):** "Measles Trends: Vaccination Coverage and Case Rates"

The 7 rebalanced spans, as returned by the moderator:

| Original | Replacement | Stated reason |
|---|---|---|
| Plummet | Trends | Exaggerated intensity verb |
| dropped dramatically | decreased | Overstated intensity |
| just under 675,000 | **675,533** | Vague phrasing; precise data available |
| stalled | remained relatively stable | Manipulative framing suggesting failure |
| shining examples of effective vaccination | have high first-dose coverage | Overstated causation and celebratory tone |
| lags behind | has lower coverage | Judgmental/shaming language |
| resulting in a significantly higher measles rate | which corresponds with a higher rate | Overstated direct causation |

Two of these are substantive rather than cosmetic:

- **"just under 675,000" → "675,533"** is a *precision* correction. The tone agent
  replaced a vague figure with the exact value from the table. This is the
  fact-improving side effect the project has argued for, captured with a reason.
- **"resulting in" → "which corresponds with"** downgrades a causal claim to a
  correlational one. Given that both reproductions put causal accuracy at 0%, a tone
  agent that removes unwarranted causal language is doing safety work, not style work.

Fact-check output (8 claims, 7 verified, 1 flagged). The flagged item is
*"which corresponds with a higher rate of 65.8 cases per million"* - the fact-checker
flagged the **moderator's own** phrasing as an unsupported causal-adjacent link. The
two agents disagreeing is the intended behaviour, and it is evidence for keeping them
separate.

## B4. Text-similarity metrics vs the human baseline

Computed by `POST /api/compare` against a 125-word human-written baseline.

| Run | BLEU-4 | ROUGE-L | Unigram F1 | Alarmism before → after | Spans | Facts preserved |
|---|---|---|---|---|---|---|
| `0ae47274` | **0.0** | 0.1538 | 0.2162 | 2.5 → 2.0 | 8 | false |
| `056795c4` | **0.0** | 0.0984 | 0.2011 | 2.0 → 2.0 | 7 | false |

### The zero BLEU is real, and it is a metric artefact

Decomposing run `056795c4` (129 reference tokens, 115 candidate tokens):

| n | Precision |
|---|---|
| 1-gram | 36/115 = **31.3%** |
| 2-gram | 2/114 = **1.8%** |
| 3-gram | 0/113 = **0.0%** |
| 4-gram | 0/112 = **0.0%** |

BLEU-4 is the geometric mean of the four precisions, so **a single zero zeroes the
whole score.** The texts share nearly a third of their vocabulary but not one
three-word sequence.

This is a limitation of the implementation, not a property of the stories:

- Our BLEU is **sentence-level on a single pair, unsmoothed**. At ~120 words,
  4-gram matches are rare and the score collapses.
- Part A2's BLEU-4 of 1.54 and 2.17 is **corpus-level over 30 reports**, where
  4-gram hits accumulate across the corpus and the score stays non-zero. **The two
  BLEU figures in this document are therefore not comparable.**
- **Fix before using BLEU in the report:** apply smoothing (Chen & Cherry), or report
  BLEU-1/BLEU-2, or aggregate corpus-level over many runs. Until then, ROUGE-L and
  unigram F1 are the only usable overlap numbers here.

`factsPreserved: false` in both rows simply reflects ≥1 `flagged` fact-check item; it
is a boolean derived from the fact-checker, not an independent measurement.

**Interpretation.** Low surface overlap with a human story is expected and is not a
quality signal - DataTales makes the same point. These metrics belong in the report
for completeness; the tone-band result and the planned user study are the evidence
that should carry the argument.

---

# Part C - Hardware and throughput

Measured on the development machine (Apple M1 Max, 32 GB unified memory).

| Quantity | Measured |
|---|---|
| GPU wired limit (macOS default) | 24.0 GB (~22 GB usable after headroom) |
| `llama3.1:8b` size | 4.9 GB |
| `gemma4:31b` size | 19.9 GB |
| `qwen3.6:35b` size | 23.9 GB |
| `gemma4:31b` model load | ~11 s |
| `gemma4:31b` prompt eval | ~62 tok/s |
| `gemma4:31b` generation | **~9.5 tok/s** |

`qwen3.6:35b` + `gemma4:31b` = **43.8 GB**, so they can never be co-resident; and
`qwen3.6:35b` alone (23.9 GB) exceeds the usable limit, requiring
`sudo sysctl iogpu.wired_limit_mb=28672`. This is why the large tier is batch-only.
Full policy in `backend/README.md`.

---

# Limitations that apply to everything above

1. **Small samples.** Part A is n=100 (20/domain) and n=30. Part B is **n=3 runs on
   one dataset**. No confidence intervals are computed anywhere. Part B in particular
   is a smoke test of the pipeline, not a result.
2. **LLM judges throughout.** Faithfulness, per-operation accuracy, insightfulness and
   alarmism are all model-assigned. No human agreement study has been run.
3. **The judge grades its own work in Part B.** On the `mid` tier the judge and the
   moderator are both `gemma4:31b`, so the alarmism delta - the novel metric - is
   self-assessed. This needs a distinct judge model before the numbers go in a report.
4. **Part A and Part B use different models** and are not comparable.
5. **Zephyr's 87%** has no backing artefact in the repository.
6. **BLEU-4 in Part B is unsmoothed and single-pair**, hence zero. See B4.
7. **One dataset.** The WHO GHO secondary dataset has not been collected, so the
   both-directions calibration claim is untested.
