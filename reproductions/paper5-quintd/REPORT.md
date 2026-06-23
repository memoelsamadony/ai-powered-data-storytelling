# Reproduction Report — Paper 5 (Quintd / Kasner & Dušek, ACL 2024)

**Paper:** Zdeněk Kasner & Ondřej Dušek, *Beyond Traditional Benchmarks: Analyzing Behaviors of Open LLMs on Data-to-Text Generation*, ACL 2024 (arXiv:2401.10186).
**Reproduced by:** offline pipeline using `gemma4:12b` (via Ollama) as the generator and **Opus 4.7 as the reference-free error judge**, on the released **Quintd-1** inputs.
**Date:** 2026-06-17.

---

## 1. What the paper claims

Open 7B LLMs (Llama 2, Mistral, Zephyr) and GPT-3.5, asked to turn structured data into text **zero-shot**, are fluent but **semantically unreliable**:

- **>80% of outputs contain at least one semantic error** (human annotators: 76–86%; GPT-4 metric: 89–94%).
- The dominant error type is **INCORRECT** (facts contradicting the data); open LLMs average **>2 errors per output**.
- Even GPT-3.5 errs in 60–75% of outputs. Zephyr is the best open model.

The evaluation is **reference-free**: a judge (human, or a GPT-4 metric) marks token-level error spans on freshly-collected, unlabeled data, using the taxonomy **{0 Incorrect, 1 Not-checkable, 2 Misleading, 3 Other}**.

## 2. What this reproduction does (and how it deviates)

A faithful, **fully offline** re-run of the paper's 3-stage method (collect → generate → annotate), with three deliberate, documented adaptations forced by available resources (6 GB laptop GPU, no OpenAI key):

| Stage | Original | Here | Rationale |
|---|---|---|---|
| **Generator** | Llama2/Mistral/Zephyr-7B + GPT-3.5 | **`gemma4:12b`** via Ollama (thinking **disabled**, temp 0, `num_ctx=8192`, 512 max tokens) | Only model available locally. Disabling "thinking" makes it a standard zero-shot instruct model — the fair analog of the paper's non-reasoning models. Also turns the study into a test of whether the 2024 finding survives on a 2026 12B model. |
| **Judge** | GPT-4-1106 (`E_gpt`) | **Opus 4.7**, using the *exact* `gpt4_metric.yaml` prompt + taxonomy | No OpenAI key. **Precedent:** the repo itself ships a `Llama3Metric` that uses a local Ollama model as the judge — a non-GPT-4 local judge is a method the authors already used. |
| **Inputs** | Quintd-1 (freshly collectable) | **Reuse** the released Quintd-1 inputs | Fresh collection is blocked (empty OpenWeather/RapidAPI keys); reuse makes results directly comparable to the paper. |
| **Scale** | 100 examples/domain (test) | **20/domain = 100 total** (test) | Generation throughput on the 6 GB GPU. Configurable; scalable to the full 500. |

**Faithfulness anchors kept identical:** the per-domain input serialization (ported verbatim from the paper's `data/dataset.py` `get_data()`), the generation prompt (`model/setups/direct.yaml`), the output JSON schema, the judge prompt + taxonomy + one-shot example (`evaluation/gpt4_metric.yaml`), the annotation `.jsonl` schema and start-offset logic (`evaluation/evaluate.py`), and the metric definitions (`evaluation/generate_paper_results.py`).

## 3. Headline result

> **18.0% of the 100 gemma4:12b outputs contain ≥1 semantic error** (avg **0.23** errors/output).

The paper's headline — *">80% of outputs contain ≥1 semantic error", >2 errors/output* — **does NOT reproduce** for `gemma4:12b`. A modern 12B instruct model is **~4–5× more semantically accurate** on this exact task and these exact inputs than the 2023-era 7B open models, and also clearly better than the paper's GPT-3.5 baseline (60–75% error rate).

### Per-domain (test, n=20 each)

| Domain | % with ≥1 error | avg errors/output | Incorrect | Not-checkable | Misleading | Other | avg length (words) |
|---|---|---|---|---|---|---|---|
| openweather | 20% | 0.20 | 0.20 | 0.00 | 0.00 | 0.00 | 109.9 |
| gsmarena | 5% | 0.05 | 0.05 | 0.00 | 0.00 | 0.00 | 129.9 |
| ice_hockey | 30% | 0.45 | 0.40 | 0.00 | 0.05 | 0.00 | 62.4 |
| owid | 20% | 0.30 | 0.15 | 0.00 | 0.05 | 0.10 | 75.1 |
| wikidata | 15% | 0.15 | 0.05 | 0.05 | 0.05 | 0.00 | 35.5 |
| **ALL** | **18.0%** | **0.23** | **0.17** | **0.01** | **0.03** | **0.02** | **82.6** |

(See `metrics.csv` for the full numeric dump.)

### Three-way (added): does model size matter too?

We later added **qwen3.5:4b** (2026, 4B, thinking disabled) judged the same way, for a
size-and-recency sweep on the same 20/domain:

| Model | Year · size | Stories with ≥1 error | Errors/story |
|---|---|---|---|
| Zephyr-7B | 2023 · 7B | **87%** | — |
| qwen3.5:4b | 2026 · 4B | **52%** | 0.80 |
| gemma4:12b | 2026 · 12B | **18%** | 0.23 |

Both axes matter. The 2026 4B model roughly halves the 2023 7B model's error rate, but
is still ~3× worse than the 2026 12B — and it brings back the failure modes gemma avoids:
many **Not-checkable** hallucinations (gsmarena) and the classic **per-hundred-read-as-percent**
unit error on owid (e.g. "78%" when the data is 0.78 per hundred — the same mistake Zephyr
made). Capability is not free with scale; the small modern model is a real improvement over
2023 but not a substitute for the larger one.

### Two qualitative findings that *do* match the paper

1. **INCORRECT dominates.** Like the paper, the most common error type is **type 0 — facts that contradict the data** (0.17 of the 0.23 errors/output). gemma's failures are mostly *derivation* errors: arithmetic on scores, wrong min/max/peak in a series, unit confusion.
2. **Hardest domains are the numeric/derivation ones.** ice_hockey (period-score arithmetic) and owid (reading values/trends off a time series) are the worst, exactly the kinds of multi-step reasoning over data the paper highlights. Simple attribute lookup (wikidata, gsmarena) is nearly error-free.

### Where gemma differs sharply from the 2023 models

**It almost never fabricates ungrounded facts** (Not-checkable = 0.01/output). The paper's open 7B models hallucinated freely (adding unsupported nationalities, specs, events). gemma sticks closely to the provided data; when it errs, it mis-*derives* rather than invents. This is the qualitative shift behind the 80% → 18% drop.

## 4. Verification (guarding against a lenient judge)

An 18% rate (vs 80%) could be an artifact of Opus 4.7 judging more leniently than GPT-4 — i.e. **false negatives**. To test this, every domain got a second, **adversarial verification pass**: an independent Opus 4.7 judge re-scrutinized all 20 outputs hunting specifically for errors the first pass *missed* (for owid it parsed the CSVs in Python to check numbers exactly).

Result across all 100 outputs: **exactly 1 missed error** (ice_hockey #13 — a second verbatim span of an error already counted at that example, so the 18% example-level rate is unchanged; it nudged avg errors 0.22 → 0.23). gsmarena, owid, openweather, wikidata: **0 missed**. The verifiers also noted ≤2 possible *false positives* (e.g. wikidata #19), which if anything mean the true rate is **slightly lower** than 18%.

**Conclusion:** the low error rate is a robust property of the model, not judge leniency.

## 5. Verdict

The paper's **method reproduces cleanly** — the reference-free, taxonomy-based judging pipeline works end-to-end offline and produces sensible, verifiable per-domain error profiles. The paper's **headline number does not generalize** to a current 12B open model: semantic accuracy on zero-shot data-to-text has improved dramatically (≥1-error rate ~80% → ~18%; errors/output >2 → 0.23) in ~2 years. The paper's *qualitative* lessons survive: errors concentrate in numeric/derivation tasks and are mostly data-contradictions — so outputs still **cannot be trusted unchecked**, just far less often.

## 6. Limitations

- **n = 100** (20/domain), not the paper's 500 — wider confidence intervals; per-domain rates rest on 20 examples each.
- **Single generator** (gemma4:12b), not the paper's four models — this is a point measurement, not the paper's cross-model sweep.
- **Judge is Opus 4.7, not GPT-4 or humans.** The adversarial pass bounds false negatives but does not establish human-level agreement; absolute rates may shift ±a few points with a different judge.
- **Thinking disabled.** With reasoning enabled, gemma4:12b would likely be even more accurate on the numeric domains — left as a deliberate apples-to-apples choice, and a natural follow-up experiment.
- Reused the original Quintd-1 inputs (Nov 2023–Jan 2024), so contamination-resistance is not re-established; comparability to the paper was prioritized over freshness.

## 7. Reproduce it

See [README.md](README.md) for exact commands. Artifacts:
`outputs/test/<domain>/direct/gemma4.json` (generations) · `annotations/opus47/*.jsonl` (error annotations) · `metrics.csv` (numbers) · `judgments/` (raw judge JSON) · `judge_inputs/` (data+text pairs given to judges).
