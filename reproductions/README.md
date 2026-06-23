# Reproductions

Partial, offline reproductions of two data-to-text papers, used to ground the design choices of our own
project. Each subfolder has its own `README.md` (how to run) and `REPORT.md` (results + caveats).

## `paper5-quintd/` — Kasner & Dušek (ACL 2024)
Data-to-text faithfulness of open LLMs on the released **Quintd-1** inputs.
Generator `gemma4:12b` (Ollama); reference-free error judge = **Opus 4.7** using the paper's exact
`gpt4_metric.yaml` taxonomy.
**Result:** the >80%-error headline did **not** reproduce — gemma4:12b ≈ **18%** of outputs with ≥1 error.
Three-way: **Zephyr-7B 87% · qwen3.5:4b 52% · gemma4:12b 18%**. Includes "The Red Pen" review dashboard.

## `paper9-datatales/` — DataTales
Per-operation narration evaluation on equity-market tables. Models `qwen3.5:4b` and `gemma4:12b`.
**Result:** per-operation accuracy gradient; **causal operation 0%** for both; paper's masked-number
factuality **under 30%** (gemma 12.2, qwen 0.9).

> These are *partial* reproductions (small samples, local open models, an LLM judge instead of GPT-4/humans).
> See each `REPORT.md` for exact scope and caveats.
