# Which models this project uses, and why

Two entirely separate model populations are involved, and conflating them is the
easiest mistake a reader of this repo can make.

- **Local Ollama models** are the *object of study*. They generate, moderate,
  judge and fact-check the stories. Every number in `RESULTS.md` comes from
  them.
- **Claude (Opus, via subagents)** is *tooling*. It wrote the 25 reference
  stories in `experiments/human-baselines/llm-drafts/`, and it wrote the code.
  It never appears in the pipeline and never rates anything.

---

## 1. Local models: the pipeline

Hardware: Apple M1 Max, 32 GB unified memory. Ollama reports a 24.0 GB GPU
wired limit, of which about **22.0 GB is usable for weights**. Anything larger
spills to CPU and crawls, which is why `qwen3.6:35b` (23.9 GB) cannot serve as
a judge on this machine without `sudo sysctl iogpu.wired_limit_mb=28672`.

### Installed as of 2026-08-11

| Tag | Size | Role |
|---|---|---|
| `llama3.2:1b` | 1.3 GB | generator, ladder rung 1 |
| `llama3.2:3b` | 2.0 GB | generator, ladder rung 2 |
| `gemma3:4b` | 3.3 GB | spare 4B generator (cross-family control) |
| `qwen3.5:4b` | 3.4 GB | generator, ladder rung 3; the interim report's generator |
| `llama3.1:8b` | 4.9 GB | generator, ladder rung 4; fixed generator for the moderator ladder |
| `qwen3.5:9b` | 6.6 GB | **judge for every ladder tier** |
| `gemma4:12b` | 7.6 GB | moderator, ladder rung 1 |
| `gemma4:26b` | ~16 GB | moderator, ladder rung 2 |
| `gemma4:31b` | 19 GB | moderator, ladder rung 3; the original moderator |
| `qwen3.6:35b` | 23 GB | MoE moderator, `x35b`. Measured 4%/96% CPU/GPU at 40.9 tok/s, see below |

### Measured: the 22 GB ceiling is not the constraint it looks like

`manage.py tiers` warns that `qwen3.6:35b` (23.9 GB) exceeds the 22.0 GB usable
limit and suggests `sudo sysctl iogpu.wired_limit_mb=28672`. That warning
predicts a CPU spill and a crawl. Measured on 2026-08-11, it does neither in
any way that matters:

| | `gemma4:31b` | `qwen3.6:35b` |
|---|---|---|
| architecture | `gemma4`, dense | `qwen35moe`, **Mixture of Experts** |
| parameters | 31.3B | 36.0B |
| resident | 20 GB, 100% GPU | 24 GB, **4%/96% CPU/GPU** |
| generation | ~9.5 tok/s | **40.9 tok/s** |
| moderate stage | 116-145 s | **34.6 s** |

Only 4% of the model lands on CPU, and the run is roughly four times *faster*
than the smaller dense model. The reason is in the architecture row: MoE keeps
all 36B of weights resident, which is where the 24 GB comes from, but activates
only a fraction of them per token, so memory footprint and compute cost come
apart. A ceiling stated in gigabytes says nothing about speed for a sparse
model.

Practical consequence: the sysctl is **not needed** to run `x35b`, and
`qwen3.6:35b` is the cheapest large moderator available here, not the most
expensive. `gemma4:26b` is dense at 25.8B and pays close to full price for a
result no better than 31B's.

### What does not exist

`gemma4` ships **12b, 26b and 31b only**. There is no `gemma4:8b`, so the
"gemma4 from 8B to 31B" ladder starts at 12B; that is a property of the model
family, not a gap in the setup. Likewise `llama3.2` tops out at 3b, so the
4B rung is filled by `qwen3.5:4b` (with `gemma3:4b` available as a same-size
cross-family check). `llama3.3` is 70b-only and `llama4` is 17b; neither fits
the ladder cleanly and 70b does not fit the machine.

### Tiers

`judge` is `qwen3.5:9b` on every ladder tier: a different *family* from the
`gemma4` moderator, which is what makes the alarmism rating independent, and
small enough to stay under the memory ceiling.

| Tier | Generator | Moderator | Judge | Purpose |
|---|---|---|---|---|
| `g1b` | `llama3.2:1b` | `gemma4:31b` | `qwen3.5:9b` | generator ladder |
| `g3b` | `llama3.2:3b` | `gemma4:31b` | `qwen3.5:9b` | generator ladder |
| `g4b` | `qwen3.5:4b` | `gemma4:31b` | `qwen3.5:9b` | generator ladder |
| `g8b` | `llama3.1:8b` | `gemma4:31b` | `qwen3.5:9b` | generator ladder; also the 31B rung of the moderator ladder |
| `m12b` | `llama3.1:8b` | `gemma4:12b` | `qwen3.5:9b` | moderator ladder |
| `m26b` | `llama3.1:8b` | `gemma4:26b` | `qwen3.5:9b` | moderator ladder |
| `m31b-selfjudge` | `llama3.1:8b` | `gemma4:31b` | `gemma4:31b` | **P0.1 control** |

`m31b-selfjudge` differs from `g8b` in exactly one thing: who judges. The gap
between those two rows is the self-assessment bias, and it is the only way to
say how much the earlier self-judged numbers were inflated.

Legacy tiers `demo`, `mid` and `large` are kept so the older `RESULTS.md`
numbers stay reproducible. All three self-judge and none should be used for new
measurements.

---

## 2. Claude: the tooling layer

Claude Opus subagents wrote the 25 reference stories, one isolated context per
story, in two passes:

- **Pass 1** (2026-08-10): a crossed grid of 5 personas x 5 series. Each agent
  saw exactly one evidence pack, the construct-free rules from `BRIEF.md`, a
  persona and a length target. Isolation was verified from the agent
  transcripts: the only file any agent read was its own pack.
- **Pass 2** (2026-08-11): a style-only revision of all 25. The brief named
  rhythm, register and template tics and never mentioned tone, alarm or the
  study's construct, so the reference is not steered on the dimension being
  measured. Each editor read its own draft and its own pack, nothing else.

These stories are labelled `llm_drafted: true` everywhere they appear and are
**not** human baselines. `experiments/human-baselines/stories/` remains reserved
for the genuine human track and is still empty. Similarity metrics computed
against the drafts measure distance to Claude text; see `LOOPHOLES.md` L2.

---

## 3. Reproducing a run

```bash
cd backend
.venv/bin/python manage.py tiers                      # what the hardware can run
.venv/bin/python manage.py run_pipeline --dataset pertussis-global --tier g8b --seed 7
```

A seed reproduces the text only while the model stays warm. Every sequential
tier evicts between stages, so generation is always a cold load; the committed
raw stories are the reproducible artefact, not the seed (`LOOPHOLES.md` L11).
