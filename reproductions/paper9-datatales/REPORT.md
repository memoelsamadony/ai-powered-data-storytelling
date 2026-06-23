# DataTales-style evaluation — qwen3.5:4b on the equity slice

**Paper:** Yang, Liu & Kan, *DataTales: A Benchmark for Real-World Intelligent Data Narration* (arXiv:2410.17859, 2025). Data: github.com/yajingyang/datatales (cloned at `../paper9-datatales`).
**This run:** generate market reports with **qwen3.5:4b** (zero-shot, thinking off) via Ollama on **30 equity-market test reports**, then evaluate them the way the paper does — **style (BLEU)**, **numeric factuality**, **per-operation accuracy**, and an **insightfulness proxy**. Fully offline; Opus 4.7 is the referee.

## Setup

- **Slice:** 30 `investrade` equity-market reports from the official **test** split (Dec 2022–Feb 2023).
- **Input per report:** a same-day(+prior session) OHLCV table for the major equity entities (S&P 500, Nasdaq Composite, Dow, Nasdaq 100, Russell 2000, SOX, VIX, and AAPL/AMZN/GOOGL/META/MSFT/NVDA), built from `source_data_long.csv` — the paper's Fig. 1 style.
- **Prompt:** the paper's own instruction (`prompts/data2text_generation_task_instruction.txt`) — "act as an expert financial market analyst… analyze the data… follow the example report."
- **Generation:** qwen3.5:4b, temperature 0, thinking off, `num_ctx` 8192. ~15 s/report.
- **Judge:** Opus 4.7, against the **source table** (ground truth), via 6 subagents.

## Results

| Axis | qwen3.5:4b (zero-shot) | Paper's framing |
|---|---|---|
| **Style — BLEU-4** | **1.54** (1-gram 14.2%) | LLM narrations diverge sharply from human reports |
| **Numeric factuality** | **67.9%** of stated numbers correct (178/262) → **~1 in 3 numbers wrong** | LLMs do "unacceptably poorly at predicting key numbers" |
| **Insightfulness (proxy)** | impact **2.77** / significance **2.33** (1–5) | modest analytical value |

### Per-operation accuracy — the headline reproduces

The paper's central finding (Fig. 6) is that **accuracy falls as analytical complexity rises**. We see exactly that:

| Operation | Accuracy | Category |
|---|---|---|
| lookup | **86.2%** (69/80) | simple |
| comparison | **74.2%** (66/89) | basic quantitative |
| subtraction | **46.4%** (13/28) | basic quantitative |
| rate_of_change | **43.3%** (13/30) | basic quantitative |
| trend | **40.5%** (17/42) | advanced analytical |
| causal | **0.0%** (0/13) | advanced analytical |
| predictive | **0.0%** (0/1) | advanced analytical |

A clean monotonic gradient: the model can **read a value** (86%) but cannot **explain or project** it (causal/predictive ≈ 0%). Every causal claim ("driven by…", "amid…") was unsupported by the data — the model invents reasons.

### Representative failures (Opus 4.7-judged, vs the table)

- **Fabricated magnitudes:** on 2023-01-20 the report claimed the Nasdaq rose "+318 points / nearly 29%" (actual +288 pts / +2.66%).
- **Inverted directions:** on 2023-01-24 it called the Dow "slipped" and the Nasdaq "advanced" when the Dow rose and the Nasdaq fell.
- **Wrong baselines:** VIX rate-of-change repeatedly computed against the current day's open/high instead of the prior close.
- **Invented facts:** "Saturday" trading sessions and false "all-time/record high" labels.

## How this maps to (and differs from) the paper

- **Reproduced faithfully:** style/BLEU, the numeric-accuracy weakness, and — most importantly — the **complexity → error gradient** with causal/predictive collapsing to ~0%.
- **Differs:** (1) **model** — qwen3.5:4b (2026, 4B), not the paper's Llama2-7B/13B/GPT-3.5/GPT-4; it slots in as a new data point. (2) **factuality metric** — we Opus 4.7-verify each stated number against the table; the paper uses a NER + masked-number-prediction continuation. Both measure numeric fidelity but aren't identical, so the 67.9% is not directly comparable to their sub-30%. (3) **insightfulness** is a Opus 4.7 **proxy**, not their finance-human 1–5. (4) **zero-shot only** (no LoRA fine-tuning). (5) **30 reports, equity, same-day** — a slice, not the full 4.9k / multi-setting benchmark.

## Takeaway for the project

Same lesson as our Quintd reproduction, sharpened: small modern models **read data well but reason over it poorly**, and the failure is concentrated in exactly the operations data *storytelling* needs most — trends, causation, prediction. A storytelling pipeline can't trust an LLM's analytical/causal claims unchecked; this is precisely where a verification (and tone-moderation) layer earns its keep.

## Reproduce
See [README.md](README.md). Artifacts: `eval_inputs.json` (slice), `generations.json` (qwen outputs), `judgments/*.json` (per-report Opus 4.7 judgments), `metrics.json` (aggregated).
