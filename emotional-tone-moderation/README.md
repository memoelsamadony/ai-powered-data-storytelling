# Emotional-Tone Moderation — our pipeline (measles × vaccination)

This is **our own work**: an end-to-end demonstration of the project's novel contribution, on **our own
merged dataset** (see [`data/`](data/)).

## Architecture
```
qwen3.5:4b   (small model)   ── generates a data story from the table
     │
     ▼
gemma4:12b   (larger model)  ── moderates the EMOTIONAL TONE: flags alarmist /
     │                          manipulative / numbing phrasing and rewrites it,
     │                          faithful to the data
     ▼
Opus 4.7     (judge)         ── scores faithfulness + tone of both versions
```

## Files
| File | What it is |
|------|------------|
| `pipeline.py` | Runs generation (qwen3.5:4b) then moderation (gemma4:12b) via the Ollama API |
| `dump_io.py` | Reconstructs the exact prompts + outputs of a run into `outputs/exact_io.txt` |
| `data/` | **Our merged dataset** + the raw source downloads (see `data/README.md`) |
| `outputs/` | `story_demo.md`, `judge_verdict.md`, `pipeline_run.txt`, `exact_io.txt` from a real run |

## How to run
```bash
# needs Ollama running with both models pulled:
#   ollama pull qwen3.5:4b && ollama pull gemma4:12b
python3 pipeline.py            # -> writes pipeline_run.txt
python3 dump_io.py             # -> writes exact_io.txt (exact model I/O)
```

## What a run showed
On the real data, the small model produced a fluent but **emotive** story and **one hallucinated number**
(claimed Nigeria rose "by over a million" vs the real 14,999). The larger model removed the alarmist
phrasing and, by re-grounding in the data, **silently corrected the number** — but did **not flag it** in
its issues list. Conclusion: the emotional-tone agent needs a **separate factual-consistency check**
alongside it. Full write-up in [`outputs/judge_verdict.md`](outputs/judge_verdict.md).
