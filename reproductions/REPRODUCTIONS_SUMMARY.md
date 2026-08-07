# Reproductions — Full Details

Two data-to-text papers reproduced offline to ground our project's design. Generator models run
locally via Ollama; **Opus 4.7** is the LLM judge. Per-paper code and raw outputs live in
`paper5-quintd/` and `paper9-datatales/`.

---

## Paper 5 — Quintd
**Kasner & Dušek, *Beyond Traditional Benchmarks: Analyzing Behaviors of Open LLMs on Data-to-Text
Generation*, ACL 2024 (arXiv:2401.10186).** Reproduced 2026-06-17.

### What the paper claims
Open 7B LLMs (Llama 2, Mistral, Zephyr) + GPT-3.5 doing zero-shot data-to-text are fluent but
unreliable: **>80% of outputs have ≥1 semantic error** (humans 76–86%, GPT-4 metric 89–94%),
**>2 errors/output**, dominated by **INCORRECT** (facts contradicting the data). Evaluation is
**reference-free**: a judge marks token-level error spans using taxonomy
**{0 Incorrect, 1 Not-checkable, 2 Misleading, 3 Other}**.

### What we did (offline re-run of collect → generate → annotate)
| Stage | Paper | Ours |
|---|---|---|
| Generator | Llama2/Mistral/Zephyr-7B + GPT-3.5 | **gemma4:12b** via Ollama (thinking off, temp 0, num_ctx 8192, 512 tok) |
| Judge | GPT-4-1106 | **Opus 4.7** with the *exact* `gpt4_metric.yaml` prompt + taxonomy |
| Inputs | Quintd-1 (fresh) | **Reused** released Quintd-1 inputs |
| Scale | 100/domain | **20/domain × 5 = 100** (test split) |

Faithfulness anchors kept identical: input serialization, generation prompt, output schema, judge
prompt/taxonomy/one-shot example, annotation `.jsonl` schema, and metric definitions.

### Headline result
**18.0%** of 100 outputs had ≥1 error (**0.23** errors/output) — the paper's **>80% / >2 does NOT
reproduce**. A 2026 12B model is **~4–5× more accurate** on the same task and inputs.

| Domain | %≥1 error | err/out |
|---|---|---|
| openweather | 20% | 0.20 |
| gsmarena | 5% | 0.05 |
| ice_hockey | 30% | 0.45 |
| owid | 20% | 0.30 |
| wikidata | 15% | 0.15 |
| **All** | **18%** | **0.23** |

### Three-way (size × recency) sweep
| Model | Year · size | %≥1 error | err/story |
|---|---|---|---|
| Zephyr-7B | 2023 · 7B | **87%** | — |
| qwen3.5:4b | 2026 · 4B | **52%** | 0.80 |
| gemma4:12b | 2026 · 12B | **18%** | 0.23 |

Both axes matter; the 4B model reintroduces failure modes gemma avoids (Not-checkable hallucinations
on gsmarena; the "per-hundred read as %" unit error on owid — the same mistake Zephyr made).

### Qualitative findings
- **Matches the paper:** INCORRECT dominates (0.17 of 0.23); hardest domains are numeric/derivation
  (ice_hockey score arithmetic, owid time-series reading); simple lookup (wikidata, gsmarena) is
  near error-free.
- **Differs from 2023 models:** gemma **almost never fabricates** ungrounded facts (Not-checkable
  0.01) — it *mis-derives* rather than invents. That is the shift behind 80% → 18%.

### Verification (anti-leniency)
An adversarial second-pass judge re-hunted all 100 outputs for missed errors (parsing owid CSVs in
Python for exact numbers): **exactly 1 missed** (a duplicate span; example-level rate unchanged) and
≤2 possible *false positives* → the 18% is a real model property, **not** judge leniency.

### Verdict & limitations
Method reproduces cleanly; the **headline does not generalize** to a 2026 12B model; the qualitative
lessons survive ("can't trust unchecked," just far less often). Limits: n=100 (not 500); single
generator; LLM judge (not GPT-4/human); thinking disabled; reused inputs.

**Artifacts:** `outputs/…/gemma4.json`, `annotations/…/*.jsonl`, `metrics.csv` (+ `metrics_qwen3.csv`),
`judgments/`, `judge_inputs/`, and **"The Red Pen" dashboard** (`dashboard.py` — editorial
fact-checker UI with error-span markup, live Ollama runs, scoreboard).

---

## Paper 9 — DataTales
**Yang, Liu & Kan, *DataTales: A Benchmark for Real-World Intelligent Data Narration* (arXiv:2410.17859,
2025).** A benchmark of 4,922 financial-market reports paired with tabular ticker data for data
**narration** (trends, causation, prediction) — deeper than Quintd's faithfulness.

### What we did
Cloned the full release (`reports.tsv` 4,922 reports; `source_data_long.csv` 245k OHLCV rows; split
4181/513/513). Built our **own** DataTales-style evaluation on a **30 `investrade` equity test-report
slice** (Dec 2022–Feb 2023): same-day(+prior) OHLCV table for major indices + mega-caps, the paper's
own generation prompt, **zero-shot** via Ollama (thinking off, temp 0), **Opus 4.7** as referee. Ran
**two models**: qwen3.5:4b and gemma4:12b.

### Results
| Axis | gemma4:12b | qwen3.5:4b |
|---|---|---|
| BLEU-4 (style) | 2.17 | 1.54 |
| "% of stated numbers correct" | **90.7%** (223/246) | 67.9% (178/262) |
| Masked-number prediction *(paper's real metric)* | **12.2%** (14/115) | 0.9% (1/115) |
| Insightfulness proxy (1–5) | impact 2.60 / sig 2.47 | impact 2.77 / sig 2.33 |

Masked-number prediction reproduces the paper's **sub-30% regime** (paper: GPT-4 25.2%, Llama2-13B
20.7%, Llama2-7B 18.8%, GPT-3.5 14.6%): gemma sits just below the GPT-3.5/Llama2 band; qwen
essentially cannot reconstruct the human's numbers.

### Per-operation accuracy — the complexity gradient + the causal wall
| Operation | gemma4:12b | qwen3.5:4b |
|---|---|---|
| lookup | 93.1% | 86.2% |
| comparison | 91.7% | 74.2% |
| subtraction | 80.0%\* | 46.4% |
| rate_of_change | 88.9%\* | 43.3% |
| trend | 87.3% | 40.5% |
| **causal** | **0.0%** | **0.0%** |
| predictive | – | 0.0% |

\* small n for gemma (it writes more concise reports). **Key result:** scale (4B → 12B) closes the gap
on reading/computing (comparison 74→92, rate 43→89, trend 40→87), but **causal stays 0% for both** —
a capability wall, not a size problem. Every "driven by / amid / as investors…" claim was confabulated.

### Representative errors
- **gemma (narrow):** stale prior-session close (sometimes flips direction); typos (VIX 11.13 for
  21.13; Dow 33,156 for 34,156).
- **qwen (bigger):** fabricated "+318 pts / 29%", invented "Saturday" sessions, reversed multiple
  indices at once.

### Two factuality views reconciled
"% of numbers it *states* correctly" (90.7 / 67.9) vs "can it *predict* the human's number"
(12.2 / 0.9): the models are **cautious and mostly-right about what they choose to say, but cannot
reconstruct a human analyst's quantitative narrative** — exactly DataTales' point.

### Caveats
Our "% stated correct" ≠ the paper's masked-number metric; insightfulness is an LLM proxy (not
finance-human); zero-shot only; n=30 equity; same-day table narrower than the paper's (a lower bound).

**Artifacts:** `eval_inputs.json`, `generations.json` / `generations_gemma4.json`, `judgments/` &
`judgments_gemma4/`, `metrics.json` / `metrics_gemma4.json`, `factuality_*.json`; reports `REPORT.md`
(qwen) + `REPORT_gemma4.md` (gemma).

---

## The throughline (why both matter to our project)
Both papers show modern open LLMs **read data well but reason/causally explain poorly**. Quintd's
faithfulness crisis has eased (80% → 18% in ~2 years), so our novelty should be **tone moderation, not
another fact-checker** — yet DataTales' **causal = 0%** proves analytical/causal claims still need
**gating/verification**. That is exactly the niche our emotional-tone-moderation (+ a small
factual-consistency) layer fills.
