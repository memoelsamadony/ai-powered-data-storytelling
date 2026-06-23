# Paper 5 reproduction — offline pipeline

Faithful, fully-offline reproduction of Kasner & Dušek (ACL 2024, Quintd) using
`gemma4:12b` (Ollama) as the generator and Opus 4.7 as the reference-free error
judge, on the released Quintd-1 inputs. See [REPORT.md](REPORT.md) for results
(headline: **18% of outputs have ≥1 semantic error**, vs the paper's >80%).

## Requirements
- Ollama running locally with `gemma4:12b` pulled (`ollama list` should show it).
- Python 3.10+ with `pandas`, `python-dateutil`, `pyyaml`, `requests` (all already present).
- Run all commands from this `reproduction/` directory.

## Pipeline

```bash
# 1. Generate 20 outputs/domain (100 total) with gemma4:12b via Ollama.
#    Resumable; writes data/quintd-1/outputs/test/<domain>/direct/gemma4.json
python3 generate_ollama.py --n 20 --label gemma4

# 2. Prepare per-domain (data, text) pairs for the judges.
python3 make_judge_inputs.py
#    -> judge_inputs/<domain>.json

# 3. JUDGE (manual step): for each judge_inputs/<domain>.json, have a Opus 4.7
#    agent annotate semantic errors using the EXACT prompt from
#    ../evaluation/gpt4_metric.yaml (taxonomy 0=Incorrect, 1=Not-checkable,
#    2=Misleading, 3=Other), writing judgments/<domain>.json as a list of
#    {"table_idx", "errors":[{"reason","text","type"}]}.
#    (In this run, 5 parallel Opus 4.7 subagents did this, then an adversarial
#    verification pass re-checked for missed errors.)

# 4. Convert judgments to paper-format annotations (.jsonl, with start offsets).
python3 build_annotations.py
#    -> data/quintd-1/annotations/opus47/opus47-<domain>-test-gemma4-direct.jsonl

# 5. Compute the headline metrics.
python3 compute_metrics.py
#    -> metrics.csv  (+ printed table)
```

## Dashboard ("The Red Pen")

An editorial fact-checker dashboard to run gemma4 live and show off the results
(previous Zephyr-7B stories vs new gemma4 stories, with error spans marked up).

```bash
python3 dashboard.py          # serves http://localhost:8000  (stdlib only, no deps)
```
Then open **http://localhost:8000**. Live runs need Ollama with the models pulled
(`ollama pull gemma4:12b`, `ollama pull zephyr`); everything else is precomputed.

- **Two drafts, one source** — pick a domain + example; see the paper's Zephyr-7B
  story next to gemma4's, each marked up with proofreader's error spans (hover for
  the reason) and numbered margin notes. Each card has a **↻ live** button that
  regenerates that model via Ollama (gemma4:12b vs zephyr-7b-beta, real-time
  head-to-head). gemma4 is deterministic so it reproduces the fact-checked story
  exactly; a live Zephyr run shows a fresh, not-yet-checked paragraph.
- **The scoreboard** — % of stories with ≥1 error, gemma4 vs Zephyr, per domain and
  overall, on the same 20/domain subset (gemma4 18% vs Zephyr 87%).

Dashboard files: `dashboard.py` (server), `dashboard_data.py` (assembles payloads
from outputs + annotations), `dashboard.html` (UI).

## Files
| File | Purpose |
|---|---|
| `quintd_data.py` | Dependency-light port of the paper's `dataset.py::get_data()` per-domain serialization. |
| `generate_ollama.py` | Stage 1 — generation via Ollama `/api/chat` (thinking off, temp 0, num_ctx 8192). |
| `make_judge_inputs.py` | Stage 2a — emit `judge_inputs/<domain>.json` (data+text pairs). |
| `build_annotations.py` | Stage 2b — judgments → paper annotation `.jsonl` (ports `evaluate.py::create_annotation`). |
| `compute_metrics.py` | Stage 3 — % outputs with ≥1 error, avg errors, per-type, per-domain → `metrics.csv`. |
| `REPORT.md` | Full writeup, comparison to the paper, verification, verdict. |

## Knobs
- `--n N` examples/domain (default 20; up to 100 for full paper scale).
- `--domains owid wikidata ...` to run a subset.
- `--model <ollama-tag> --label <name>` to swap in another local model (e.g. `ollama pull zephyr` for the paper's best 7B, then `--model zephyr --label zephyr`).
