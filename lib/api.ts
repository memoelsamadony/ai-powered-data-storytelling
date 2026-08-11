/**
 * Front-end API facade.
 *
 * Talks to the Django backend (`backend/`, django-ninja) over HTTP. The backend
 * serialises camelCase, so responses drop straight into the types in
 * `lib/data/*` with no mapping layer.
 *
 * Every function falls back to the typed mock data when the backend is
 * unreachable, so the interface stays fully demonstrable without Ollama running.
 * `usingMockData()` reports which mode the last call used.
 */

import { unstable_rethrow } from "next/navigation";

import { datasets as mockDatasets, getDataset, type Dataset } from "@/lib/data/datasets";
import { getStorySet, type FactCheckItem, type StorySet } from "@/lib/data/stories";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

let lastCallUsedMock = false;
export const usingMockData = () => lastCallUsedMock;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

/** Try the backend; fall back to mocks so the UI is never dead. */
async function withFallback<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    const value = await fn();
    lastCallUsedMock = false;
    return value;
  } catch (err) {
    // `call` fetches with `cache: "no-store"`, which Next throws on while it is
    // deciding whether a route can be prerendered. That throw is control flow,
    // not a dead backend: catching it reports the backend as down and can bake
    // the mock fallback into a static page for good.
    unstable_rethrow(err);
    console.warn("[api] backend unavailable, using mock data:", err);
    lastCallUsedMock = true;
    return fallback();
  }
}

// ---------------------------------------------------------------- capability

export interface TierInfo {
  id: string;
  label: string;
  description: string;
  runnable: boolean;
  peakResidentGb: number;
  sequential: boolean;
  models: { role: string; model: string; available: boolean; sizeGb: number | null }[];
}

export interface Health {
  ollamaUp: boolean;
  totalRamGb: number;
  gpuWiredLimitGb: number | null;
  tiers: TierInfo[];
}

/** Null when the backend is unreachable — callers should then stay in mock mode. */
export async function getHealth(): Promise<Health | null> {
  try {
    return await call<Health>("/health");
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ datasets

/**
 * The backend only serves a dataset whose CSV is actually collected, so asking
 * it alone would silently drop the interface from two datasets to one, and the
 * whole argument of the project is that tone fails in *both* directions.
 *
 * So: the backend wins for every id it serves, and the mocks fill only the ids
 * it does not. Nothing is merged field-by-field. A half-real dataset carrying a
 * real trend line under illustrative country figures would be the harder thing
 * to notice and the worse thing to publish.
 */
function withMockedRemainder(live: Dataset[]): Dataset[] {
  const byId = new Map(live.map((d) => [d.id, normalise(d)]));
  const merged = mockDatasets.map((mock) => byId.get(mock.id) ?? mock);
  const extra = live.filter((d) => !mockDatasets.some((m) => m.id === d.id));
  return [...merged, ...extra.map(normalise)];
}

/** Tolerate a backend older than the fields the charts read. */
function normalise(d: Dataset): Dataset {
  return { ...d, shortName: d.shortName ?? d.name };
}

export async function getDatasets(): Promise<Dataset[]> {
  return withFallback(
    async () => withMockedRemainder(await call<Dataset[]>("/datasets")),
    () => mockDatasets,
  );
}

export async function getDatasetById(id: string): Promise<Dataset | undefined> {
  return withFallback(
    async () => normalise(await call<Dataset>(`/datasets/${id}`)),
    () => getDataset(id),
  );
}

// ------------------------------------------------------------------ pipeline

export interface RunRef {
  runId: string;
  datasetId: string;
  tier: string;
  status: string;
}

export async function createRun(datasetId: string, tier = "mid"): Promise<RunRef> {
  return call<RunRef>("/runs", {
    method: "POST",
    body: JSON.stringify({ datasetId, tier }),
  });
}

export async function getRun(runId: string): Promise<StorySet> {
  return call<StorySet>(`/runs/${runId}`);
}

/**
 * One call per pipeline stage, mirroring the backend. Each resolves when the
 * real model work for that stage finishes, so the stepper animation is honest
 * rather than timed.
 */
export async function stageGenerate(runId: string): Promise<StorySet> {
  await call(`/runs/${runId}/generate`, { method: "POST" });
  return getRun(runId);
}

export async function stageModerate(runId: string): Promise<StorySet> {
  return call<StorySet>(`/runs/${runId}/moderate`, { method: "POST" });
}

export async function stageFactcheck(runId: string): Promise<StorySet> {
  await call<FactCheckItem[]>(`/runs/${runId}/factcheck`, { method: "POST" });
  return getRun(runId);
}

export async function saveHumanStory(
  runId: string,
  humanText: string,
  humanTitle = "",
): Promise<void> {
  await call(`/runs/${runId}/human`, {
    method: "POST",
    body: JSON.stringify({ humanText, humanTitle }),
  });
}

/** Kept for callers that just want a finished story without driving the stages. */
export interface GenerateResult {
  dataset: Dataset;
  story: StorySet;
}

export async function generateStory(datasetId: string, tier = "mid"): Promise<GenerateResult> {
  return withFallback(
    async () => {
      const run = await createRun(datasetId, tier);
      await stageGenerate(run.runId);
      await stageModerate(run.runId);
      const story = await stageFactcheck(run.runId);
      const dataset = (await getDatasetById(datasetId)) ?? mockDatasets[0];
      return { dataset, story };
    },
    () => ({
      dataset: getDataset(datasetId) ?? mockDatasets[0],
      story: getStorySet(datasetId),
    }),
  );
}

// ---------------------------------------------------------------- comparison

export interface ComparisonMetrics {
  textSimilarity: { metric: string; value: number }[];
  alarmismBefore: number;
  alarmismAfter: number;
  emotiveSpansRemoved: number;
  factsPreserved: boolean;
}

/**
 * NOTE: this deliberately differs from the original mock signature
 * `compareStories(datasetId)`. Real similarity scoring needs the human baseline
 * text, which a dataset id cannot supply, so the caller passes the run and the
 * text it collected.
 */
export async function compareStories(
  runId: string,
  humanText: string,
  datasetIdForFallback?: string,
): Promise<ComparisonMetrics> {
  return withFallback(
    () =>
      call<ComparisonMetrics>("/compare", {
        method: "POST",
        body: JSON.stringify({ runId, humanText }),
      }),
    () => {
      const story = getStorySet(datasetIdForFallback ?? "measles");
      return {
        textSimilarity: [
          { metric: "BLEU", value: 0.31 },
          { metric: "ROUGE-L", value: 0.48 },
          { metric: "METEOR", value: 0.41 },
        ],
        alarmismBefore: story.aiRaw.alarmismRating,
        alarmismAfter: story.aiModerated.alarmismRating,
        emotiveSpansRemoved: story.emotiveSpans.length,
        factsPreserved: true,
      };
    },
  );
}
