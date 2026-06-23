# DataTales equity-slice evaluation

Test qwen3.5:4b on **Paper 9 (DataTales)** data the way the paper evaluates models:
generate financial market reports from tabular OHLCV data, then score **style (BLEU)**,
**numeric factuality**, **per-operation accuracy**, and an **insightfulness proxy**.
Fully offline (Ollama + Opus 4.7 as referee). Separate from the Quintd reproduction.

Requires the DataTales clone at `../paper9-datatales` and Ollama running with `qwen3.5:4b`.

## Pipeline
```bash
python3 build_slice.py --n 30      # equity test reports + same-day tables -> eval_inputs.json
python3 generate_qwen.py           # qwen3.5:4b zero-shot (think off) -> generations.json

# JUDGE (Opus 4.7 subagents): for each generated report, score numeric_claims (vs table),
# operations (lookup/comparison/subtraction/rate_of_change/trend/causal/predictive +
# correctness), and insightfulness (1-5). Write judgments/batch_*.json as lists of
# {id, numeric_claims:[...], operations:[...], insightfulness:{...}}.

python3 compute_eval.py            # BLEU + factuality + per-op accuracy -> metrics.json
```

## Result (30 equity reports, zero-shot)
- **BLEU-4:** 1.54 · **Numeric accuracy:** 67.9% (~1 in 3 numbers wrong)
- **Per-operation:** lookup 86% → comparison 74% → subtraction 46% → rate_of_change 43% → trend 41% → **causal 0%** → **predictive 0%**
- Reproduces the paper's headline: **accuracy falls as analytical complexity rises**; causal/predictive collapse.

See [REPORT.md](REPORT.md) for full analysis and caveats.

## Files
| File | Role |
|---|---|
| `dt_data.py` | Load DataTales reports/splits/source data; build equity tables |
| `build_slice.py` | Assemble the 30-report equity slice → `eval_inputs.json` |
| `generate_qwen.py` | Generate reports with qwen3.5:4b via Ollama → `generations.json` |
| `compute_eval.py` | Pure-Python BLEU + aggregate judge metrics → `metrics.json` |
| `judgments/` | Per-report Opus 4.7 judgments |
