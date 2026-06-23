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
  charts/               Recharts wrappers
lib/
  api.ts                ← swap-in point for the real Python backend
  data/                 Typed mock content (datasets, stories, metrics, literature, team)
public/brand/           Logo assets
source-materials/       Original brief, report, presentations, palette
```

## Wiring in the Python backend (future work)

Every piece of displayed content flows through `lib/api.ts`. The functions there currently
return mock data with simulated latency. To go live, change their bodies to `fetch('/api/…')`
calls against the Python pipeline — no component needs to change:

- `getDatasets()` / `getDatasetById(id)`
- `generateStory(datasetId)` → `{ raw, moderated, factualCheck }`
- `compareStories(datasetId)` → metrics (BLEU/ROUGE/METEOR, alarmism before/after, …)

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Recharts · Framer Motion ·
Newsreader + IBM Plex Sans/Mono. Brand palette sampled from the project logo, with a
tone axis added: **alarmist = warm red, calibrated = teal**.

## Team

Mahmoud Elsamadony · Ahmed Okasha · Ahmed Elsaadani · Ahmed Ramadan
Supervisors: Susmita Khadse, Julián Méndez · Chair: Prof. Dr. Raimund Dachselt (IMLD).
Code & data: https://github.com/memoelsamadony/ai-powered-data-storytelling
