# AI-Powered Data Storytelling

**TU Dresden — CMS Team Project, Summer Term 2026**
Faculty of Computer Science · Chair of Multimedia Technology (Interactive Media Lab Dresden)

This project studies how large language models (LLMs) and agentic systems turn structured data into
written narratives, and contributes a capability the current literature does not yet address: an
**emotional-tone moderation agent** that calibrates the affective tone of a generated data story while
keeping it faithful to the underlying numbers.

## The gap we target
Existing agentic data-storytelling systems verify **facts**; none moderate the **emotional tone** of the
narrative. Yet framing — including emotional framing — measurably changes how an audience interprets data.
Our contribution is an agent that detects alarmist, manipulative, or numbing tone and rewrites for a
calibrated, faithful narration.

## Repository layout
```
papers/                       key papers (foundational + the two we reproduced)
reproductions/                our partial reproductions of two data-to-text papers
  paper5-quintd/              faithfulness of open LLMs at data-to-text
  paper9-datatales/           per-operation narration evaluation
emotional-tone-moderation/    our own pipeline + our own merged dataset
```

## Papers
- **`papers/1-DataNarrative_EMNLP2024.pdf`** — DataNarrative (Islam et al., EMNLP 2024). The two-agent
  *generate + verify* architecture our design builds on; we replace its factual verifier with an
  emotional-tone moderator.
- **`papers/5-KasnerDusek_ACL2024.pdf`** — Kasner & Dušek (ACL 2024). Faithfulness of open LLMs on
  data-to-text. *(reproduced — see below)*
- **`papers/9-DataTales.pdf`** — DataTales. Table-to-narrative with per-operation evaluation.
  *(reproduced — see below)*

## Reproductions (summary)

### Paper 5 — Kasner & Dušek (Quintd) → `reproductions/paper5-quintd/`
We re-ran the data-to-text faithfulness study offline on the released Quintd-1 inputs: generator =
`gemma4:12b` via Ollama; reference-free error judge = **Opus 4.7** applying the paper's exact
`gpt4_metric.yaml` taxonomy. **The headline did not reproduce** — gemma4:12b had **≈18%** of outputs with
≥1 semantic error vs the paper's **>80%**. Three-way comparison: **Zephyr-7B 87% · qwen3.5:4b 52% ·
gemma4:12b 18%**. We also built "The Red Pen" review dashboard. **Takeaway:** modern open LLMs are far more
faithful at data-to-text than the 2023 models — which is exactly why our novelty targets *tone* moderation
rather than another factual checker.

### Paper 9 — DataTales → `reproductions/paper9-datatales/`
We evaluated `qwen3.5:4b` and `gemma4:12b` on DataTales-style equity-market narration (BLEU, numeric
factuality, per-operation accuracy, insightfulness proxy). We found a **per-operation accuracy gradient**
with the **causal operation at 0%** for both models. On the paper's **masked-number factuality** metric
both score **under 30%** (gemma 12.2, qwen 0.9); a simpler "% of stated numbers correct" check is much
higher — a reminder that the metric definition drives the headline.

## Our own work — emotional-tone moderation → `emotional-tone-moderation/`
A working pipeline on our own dataset (global measles cases × MCV1 vaccination coverage):
**`qwen3.5:4b` generates** a data story → **`gemma4:12b` moderates** its emotional tone → **Opus 4.7
judges** faithfulness and tone. See that folder's README for the architecture, our data, and how to run it.

## Requirements
- Python 3 with `requests` and `pandas`
- [Ollama](https://ollama.com) with `qwen3.5:4b` and `gemma4:12b` pulled

---
*Course project. The paper PDFs are included for the team's reference under their respective licenses.*
