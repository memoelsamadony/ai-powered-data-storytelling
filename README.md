# AI-Powered Data Storytelling — Web Interface

> An agentic approach to moderating the **emotional tone** of data narratives.
> CMS Team Project · Chair of Multimedia Technology · TU Dresden · SoSe 2026.

A general LLM **generates** a data story, an agentic LLM **moderates its emotional tone**
(pulling alarmism down without losing real urgency), and a lightweight **factual check**
keeps the numbers honest. The interface lets you pick a dataset, write a human baseline,
run the pipeline, and compare the human and LLM-moderated stories with metrics.

This is the **front-end** for the project. It runs entirely on realistic **mock data** so it
is fully interactive with no API keys — the Python pipeline plugs in later behind one file
(`lib/api.ts`).

## Getting started

> **Prerequisites:** Node.js 20+ and npm. No API keys or backend needed — the app runs on mock data.

```bash
npm install      # first time only
npm run dev      # http://localhost:3000
```

Build / serve a production bundle:

```bash
npm run build
npm run start
```

## Pages

| Route | What it is |
| --- | --- |
| `/` | Home — hero, the "same numbers, two tones" toggle, pipeline overview, key stats |
| `/generate` | The studio — dataset → human story → animated pipeline → comparison + metrics |
| `/how-it-works` | The generate → moderate → fact-check pipeline, the gap, the two-sided tone problem |
| `/results` | Faithfulness, per-operation accuracy, the novel tone-calibration metric, user study |
| `/datasets` | Measles × vaccination (alarmism) and WHO child-mortality (over-optimism) |
| `/about` | Project summary, literature survey, the team, supervisors, links |

## Project structure

```
app/                     Routes (App Router) — one folder per page
components/              UI: layout, charts, the tone toggle, the generate studio
  generate/             The 4-step studio (picker, editor, pipeline runner, comparison)
  charts/               Recharts wrappers + the country choropleth
lib/
  api.ts                ← swap-in point for the real Python backend
  charts/               Chart colour tokens + pure, unit-tested choropleth logic
  data/                 Typed mock content (datasets, stories, metrics, literature, team)
    country-stats/      Per-country figures backing the maps
    world-geo.ts        Generated country outlines — do not edit by hand
scripts/                One-shot build tools (world-map geometry)
public/brand/           Logo assets
source-materials/       Original brief, report, presentations, palette
```

Unit tests cover the pure chart logic and run on Node's built-in runner — no
test framework to install:

```bash
npm test
```

## Wiring in the Python backend (future work)

Every piece of displayed content flows through `lib/api.ts`. The functions there currently
return mock data with simulated latency. To go live, change their bodies to `fetch('/api/…')`
calls against the Python pipeline — no component needs to change:

- `getDatasets()` / `getDatasetById(id)` → the available datasets
- `generateStory(datasetId)` → `{ dataset, story }` (the story set: human baseline, raw LLM, moderated LLM, factual check, emotive spans)
- `compareStories(datasetId)` → metrics (text similarity BLEU/ROUGE-L/METEOR, alarmism before/after, emotive spans removed, facts preserved)

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Recharts · Framer Motion ·
Newsreader + IBM Plex Sans/Mono. Brand palette sampled from the project logo, with a
tone axis added: **alarmist = warm red, calibrated = teal**.

The country maps are plain inline SVG on an **Equal Earth** projection, generated at
build time by `scripts/build-world-map.mjs` — no map library ships to the browser.
Regenerate them with `node scripts/build-world-map.mjs` (the output is committed, so
this is only needed if the geometry itself changes).

## Team

Mahmoud Elsamadony · Ahmed Okasha · Ahmed Elsaadani · Ahmed Ramadan
Supervisors: Susmita Khadse, Julián Méndez · Chair: Prof. Dr. Raimund Dachselt (IMLD).
Code & data: https://github.com/memoelsamadony/ai-powered-data-storytelling

## Research pipeline and reproductions

The repository also includes the working emotional-tone moderation pipeline in
`emotional-tone-moderation/`: `qwen3.5:4b` generates a data story, `gemma4:12b` calibrates its tone,
and Opus judges faithfulness and tone. It uses a global-measles × MCV1-vaccination dataset.

The research materials in `papers/` and `reproductions/` cover partial reproductions of Quintd and
DataTales. The consolidated findings are in `reproductions/REPRODUCTIONS_SUMMARY.md`; detailed code,
outputs, and reports remain in each paper folder. The Python pipeline requires Python 3, `requests`,
`pandas`, and Ollama with the two listed models.

### Evaluation documents

| File | What it is |
|---|---|
| [`RESULTS.md`](RESULTS.md) | Every measured number to date, with its source artefact and its caveats. Part A (reproductions) is a result; **Part B (our pipeline) is a smoke test, not a result** |
| [`EXPERIMENT_PLAN.md`](EXPERIMENT_PLAN.md) | The pre-registered protocol for the reported experiments: hypotheses, controls, sample size, statistical tests, and the instrumentation fixes that block them |
| [`FRONTEND_PLAN.md`](FRONTEND_PLAN.md) | The visualisation plan — chart audit, the chart contract, and the recommended graph set, including the figures that render the hypotheses above |
| [`EXPERIMENTS.md`](EXPERIMENTS.md) | The earlier design sketch, superseded by the protocol above and kept for its rationale |
