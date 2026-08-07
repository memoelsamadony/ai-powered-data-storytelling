# Backend — Django + django-ninja

The service behind the Next.js interface. It owns the dataset layer, the four
agents (generate → moderate → factcheck → judge), run caching, and the metrics.

## Why Django here

The pipeline, the reproductions and every evaluation script in this repo are
already Python. Reimplementing them in TypeScript would strand `compute_eval.py`
and `factuality_metric.py`. `django-ninja` is used rather than DRF because its
schemas are Pydantic, so `storytelling/schemas.py` mirrors the frontend's
TypeScript types 1:1 and validates the models' JSON output with the same
definitions.

## Setup

```bash
brew install python@3.13                 # Django 6 needs >= 3.10
python3.13 -m venv backend/.venv
backend/.venv/bin/pip install django django-ninja django-cors-headers requests pandas

cd backend
.venv/bin/python manage.py migrate
.venv/bin/python manage.py tiers         # what this machine can run, and why
.venv/bin/python manage.py runserver     # http://localhost:8000/api/docs
```

Ollama must be running (`http://localhost:11434`).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/health` | Ollama status, RAM, per-tier runnability |
| GET  | `/api/datasets` | Datasets that actually have a CSV |
| GET  | `/api/datasets/{id}` | One dataset incl. series + preview rows |
| POST | `/api/runs` | Start a run: `{datasetId, tier}` → `runId` |
| POST | `/api/runs/{id}/generate` | Stage 1 → the raw `ToneVariant` |
| POST | `/api/runs/{id}/moderate` | Stage 2 → full `StorySet` with `emotiveSpans` |
| POST | `/api/runs/{id}/factcheck` | Stage 3 → `FactCheckItem[]` |
| GET  | `/api/runs/{id}` | The assembled `StorySet` |
| GET  | `/api/runs` | Cached completed runs (the demo fallback) |
| POST | `/api/runs/{id}/human` | Persist the human baseline story |
| POST | `/api/compare` | BLEU / ROUGE-L / unigram-F1 + alarmism delta |

Responses serialise to **camelCase**, so they drop straight into the existing
React components with no mapping layer.

### Three stage endpoints, not one

`components/generate/pipeline-runner.tsx` runs a
`generate → moderate → factcheck → done` state machine on hardcoded timers
(2200 ms, 1900 ms) over text that has already arrived. A real run is 30 s to
several minutes. One endpoint per stage makes each beat of that animation end
when the real work does, using plain request/response — no SSE, no job polling.
Streaming can be added later without changing this shape.

## Contract deviations from `lib/api.ts`

The frontend facade promised each function could become a `fetch` call *"without
changing any component that consumes it"*. That holds everywhere except one
place, and it needs a frontend change:

* **`compareStories(datasetId)` cannot work as signed.** Real similarity scoring
  needs the human baseline text, which today lives only in React state
  (`humanText` in `generate-experience.tsx`) and is never sent anywhere. The
  backend therefore exposes `POST /api/compare {runId, humanText}`. The frontend
  needs to (a) carry the `runId` returned by `POST /api/runs` through the wizard
  and (b) POST the human text before comparing.
* `generate-experience.tsx` currently imports `datasets` and `getStorySet`
  **directly**, bypassing `lib/api.ts`. Routing it through the facade is the
  first wiring step; everything after that is a backend swap.
* `Dataset` has no `available` field, so `/api/datasets` returns only datasets
  whose CSV exists. Today that is `measles` only — the WHO GHO secondary dataset
  is registered in `datasets.py` and starts serving the moment
  `who_gho_tidy.csv` lands in `emotional-tone-moderation/data/`.

## Scaling to the larger models

### The constraint

Apple M1 Max, **32 GB unified memory**. The GPU draws from the same pool and
macOS caps wired GPU memory at ~75% of RAM (**24 GB** here, ~22 GB usable after
headroom). Measured sizes:

| Model | Size |
|---|---|
| `llama3.1:8b` | 4.9 GB |
| `gemma4:31b` | 19.9 GB |
| `qwen3.6:35b` | 23.9 GB |

`qwen3.6:35b` + `gemma4:31b` is **43.8 GB**. They can never be resident together.
This is the fact the whole design bends around.

### Measured throughput

On this machine, `gemma4:31b` with an 8k context:

| Quantity | Measured |
|---|---|
| Model load | ~11 s |
| Prompt eval | ~62 tok/s |
| Generation | **~9.5 tok/s** |

A moderation stage emitting ~700 tokens is therefore ~90 s of generation before
any load or prompt cost. That is the number to plan the demo around, and the
reason the large tier is batch-only.

Two consequences worth knowing:

* **Generation is capped** (`num_predict`, default 900). Unbounded constrained
  decoding on a 31B model can turn a stage into a multi-minute stall. The first
  end-to-end run here did stall on the moderate stage for 6+ minutes; the cap is
  the most likely fix but was never confirmed as the cause - the run was killed
  before it produced output, and the machine was simultaneously under heavy
  memory pressure. Treat this as a guard, not a diagnosis.
* **Grammar-constrained decoding breaks `gemma4:31b`.** This is the important
  one. Passing Ollama's `format` parameter (a JSON Schema) sends this model into
  a degenerate repetition loop: it emitted the fragment `"ths year-to-date
  figures"` several hundred times until it hit the token cap. A flattened schema
  did not help - it produced structural garbage (`":{"`). Raising the cap,
  adding `repeat_penalty` and raising `temperature` all failed to fix it.

  The same model, same prompt, with **no `format` at all**, stopped cleanly after
  791 tokens and produced well-formed JSON unprompted. `llama3.1:8b` is
  unaffected and works either way, so this is model-specific.

  `generate_json` therefore tries grammar-constrained decoding first and **falls
  back to plain prompted JSON** on truncation or validation failure, parsing the
  result defensively (`_extract_json` handles markdown fences and leading prose).
  `StageResult.usage.grammar` records which path each stage took.

  **This matters for the scale-up plan:** do not assume structured output is
  reliable on the larger local models. Check `usage.grammar` across a batch - if
  the big models are always falling back, the fallback is the real path and the
  grammar attempt is just wasted tokens.
* **`num_ctx` is not free.** The KV cache for an 8k context on a 31B model is
  real memory on top of the 19.9 GB of weights. When the machine is already
  under pressure (iCloud sync, browser, Next.js dev server) that pressure shows
  up as inference slowdown, not as an error. Check `memory_pressure` before
  blaming the model.

### The tiers

| Tier | Generator | Moderator / judge | Peak | Mode |
|---|---|---|---|---|
| `demo` | `qwen3.5:4b` | `gemma4:12b` | 10.7 GB | co-resident, interactive |
| `mid` | `llama3.1:8b` | `gemma4:31b` | 19.9 GB | sequential |
| `large` | `qwen3.6:35b` | `gemma4:31b` | 23.9 GB | sequential, batch only |

`demo` reproduces the interim report's run and is the only tier safe to drive
live from a web request. `mid` isolates the moderation variable — a modest
generator still writes an emotive draft, but a far stronger moderator judges it.
`large` is the report's scale-up target.

**`large` needs the GPU limit raised**, because 23.9 GB exceeds the ~22 GB
usable. Without this the model spills to CPU and crawls:

```bash
sudo sysctl iogpu.wired_limit_mb=28672    # 28 GB; resets on reboot
```

Leave at least ~4 GB for macOS. Do not raise it to the full 32 GB.

### How residency is managed

`ollama_client.ensure_exclusive(model)` evicts every *other* resident model
before a stage runs. It deliberately does **not** evict the model it is about to
use: `moderate`, `judge` and `factcheck` all run on the moderator, so the
19.9 GB load is paid **once per run**, not once per stage. An earlier version
unloaded after every call and reloaded gemma four times per run.

All calls are serialised behind a process-wide lock. Concurrency is not a
missing feature here — two simultaneous requests would try to hold two large
models at once and thrash. One model at a time is the correct behaviour on this
hardware.

### Running the scale-up study

```bash
python manage.py run_pipeline --dataset measles --tier demo  --repeat 5
python manage.py run_pipeline --dataset measles --tier mid   --repeat 5
python manage.py run_pipeline --dataset measles --tier large --repeat 3
```

Every agent call writes a `StageResult` row with its model, wall-clock and full
payload. The report's three scale-up questions become queries over that table:

```python
from django.db.models import Avg, Count
from storytelling.models import Run, StageResult

# latency per stage per model
StageResult.objects.values("stage", "model").annotate(
    avg_s=Avg("duration_s"), n=Count("id"))

# does a bigger moderator need to change less?
Run.objects.filter(status="done").values("tier").annotate(
    before=Avg("raw_alarmism"), after=Avg("moderated_alarmism"))
```

Flagged causal claims per tier answer the causal-gap question directly — the
reproductions put causal accuracy at 0% for both a 4B and a 12B model, so the
interesting result is whether 31B/35B moves it at all.

## Demo safety

A deployed frontend cannot reach `localhost:11434`. Two options, and it is worth
having both on presentation day:

1. **Fully local** — Next.js and Django on the same laptop, `demo` tier live.
2. **Cached** — pre-run with `run_pipeline`, serve `GET /api/runs`. The
   frontend's existing mock mode is already a working precomputed fallback;
   keep it behind a flag.

## Security posture

This is a **local development service** and is configured as one:

* `SECRET_KEY`, `DEBUG` and `ALLOWED_HOSTS` read from the environment
  (`DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`) with local-only
  defaults. `startproject` bakes a real key into `settings.py`; that key was
  removed before the first commit because this repository is public.
* CORS is restricted to the Next.js dev server origins.
* **The API is unauthenticated.** That is fine on localhost, but every
  `POST /runs/{id}/*` triggers minutes of GPU work, so exposing this service
  publicly without auth and rate limiting would be a denial-of-service vector.
  Add both before it leaves the laptop.

## Known gaps

* **The judge grades its own work.** On `mid` and `large` the judge and the
  moderator are the same model (`gemma4:31b`), so the alarmism before/after
  delta - the project's novel metric - is self-assessed. The report must carry
  this caveat, or the tiers need a distinct judge model.
* The human baseline is stored but not yet tone-judged, so `human.alarmismRating`
  is a placeholder. Judging it is a one-line addition to `services.py`.
* `who_gho_tidy.csv` has not been collected.
* No tests yet.
