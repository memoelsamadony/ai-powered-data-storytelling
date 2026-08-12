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
import type { ChartPayload } from "@/lib/charts/spec";

import { datasets as mockDatasets, getDataset, type Dataset } from "@/lib/data/datasets";
import type {
  FaithfulnessResults,
  MaskedNumberResults,
  PerOperationResults,
} from "@/lib/data/metrics";
import { mergeDatasets, normaliseDataset } from "@/lib/data/merge-datasets";
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

export async function getDatasets(): Promise<Dataset[]> {
  // Merge rule and its reasoning live in lib/data/merge-datasets.ts, which is
  // where they are unit-tested.
  return withFallback(
    async () => mergeDatasets(await call<Dataset[]>("/datasets"), mockDatasets),
    () => mockDatasets,
  );
}

export async function getDatasetById(id: string): Promise<Dataset | undefined> {
  return withFallback(
    async () => normaliseDataset(await call<Dataset>(`/datasets/${id}`)),
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

/**
 * Completed runs already in the backend, newest first.
 *
 * This is what the studio's cached mode replays. A stored run needs no model,
 * so it costs a request rather than the minutes a live tier takes, and it is
 * the same text every time - which a live run explicitly is not, since a fixed
 * seed stops reproducing once the model is evicted.
 *
 * Answers an empty list when the backend is unreachable, so a caller can treat
 * "no cached runs" and "no backend" the same way: stay live.
 */
export async function listRuns(datasetId?: string, tier?: string): Promise<RunRef[]> {
  const q = new URLSearchParams();
  if (datasetId) q.set("datasetId", datasetId);
  if (tier) q.set("tier", tier);
  try {
    return await call<RunRef[]>(`/runs?${q}`);
  } catch (err) {
    unstable_rethrow(err);
    console.warn("[api] cached runs unavailable:", err);
    return [];
  }
}

/**
 * Start a run on a registry dataset or on an uploaded table.
 *
 * The source is a tagged object rather than two positional ids, so a caller
 * cannot pass an upload id in the dataset slot - which the backend would answer
 * with a 404 that reads as "your file is gone".
 */
export async function createRun(
  source: string | { datasetId: string } | { uploadId: string },
  tier = "mid",
): Promise<RunRef> {
  const body = typeof source === "string" ? { datasetId: source } : source;
  return call<RunRef>("/runs", {
    method: "POST",
    body: JSON.stringify({ ...body, tier }),
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

// ------------------------------------------------------------------- results

export interface Results {
  /** Computed from the runs in the backend's own database. */
  measured: {
    runsTotal: number;
    runsComplete: number;
    byTier: { tier: string; runs: number }[];
    alarmismBefore: number | null;
    alarmismAfter: number | null;
    optimismBefore: number | null;
    optimismAfter: number | null;
    /** One n per axis: runs judged before the second axis exist with only the
        first, so the two counts differ until those age out. */
    alarmismN: number;
    optimismN: number;
    editsPerRun: number | null;
    editsByCategory: { category: string; label: string; count: number }[];
    factsPreservedRate: number | null;
    factsCheckedN: number;
    stageTimings: { stage: string; model: string; runs: number; medianSeconds: number }[];
  };
  /**
   * The reproduction half, read from the committed CSVs and naming its source
   * file. Identical in shape to `./data/generated/results.generated.ts`, which
   * is the same three functions snapshotted at build time - the page prefers
   * the live copy so a re-run reproduction shows up without a rebuild, and
   * falls back to the snapshot rather than to nothing.
   */
  faithfulness: FaithfulnessResults | null;
  perOperation: PerOperationResults | null;
  maskedNumber: MaskedNumberResults | null;
  /** Figures the backend deliberately does not serve, and why. */
  unavailable: string[];
}

/**
 * Null when the backend is unreachable, like `getHealth`. No mock shape is
 * substituted: the page's own constants are already the fallback, and they are
 * labelled as such, so inventing a second set here would only blur which is
 * which.
 */
export async function getResults(): Promise<Results | null> {
  try {
    return await call<Results>("/results");
  } catch (err) {
    unstable_rethrow(err);
    console.warn("[api] results unavailable:", err);
    return null;
  }
}

// ---------------------------------------------------------------- comparison

export interface ComparisonMetrics {
  textSimilarity: { metric: string; value: number }[];
  /* All four are nullable: the backend schema is, because a run whose judge was
     unreachable has no rating, and the panel says "not measured" rather than
     computing a move that was never taken. */
  alarmismBefore: number | null;
  alarmismAfter: number | null;
  optimismBefore: number | null;
  optimismAfter: number | null;
  emotiveSpansRemoved: number;
  factsPreserved: boolean;
}

/**
 * NOTE: this deliberately differs from the original mock signature
 * `compareStories(datasetId)`. Real similarity scoring needs the human baseline
 * text, which a dataset id cannot supply, so the caller passes the run and the
 * text it collected.
 *
 * Null when the backend cannot score it, like `getHealth` above, and unlike
 * every other call here. A similarity score is a measurement of two specific
 * texts: a stand-in figure is not a degraded version of one, it is a different
 * claim about a comparison that never happened. The caller shows its own
 * placeholders and labels them as such.
 */
export async function compareStories(
  runId: string,
  humanText: string,
): Promise<ComparisonMetrics | null> {
  try {
    return await call<ComparisonMetrics>("/compare", {
      method: "POST",
      body: JSON.stringify({ runId, humanText }),
    });
  } catch (err) {
    unstable_rethrow(err);
    console.warn("[api] scoring unavailable:", err);
    return null;
  }
}

// -------------------------------------------------------------------- charts

/** How a column got its type. Present so a wrong inference is visible. */
export interface ChartColumnReport {
  key: string;
  label: string;
  type: string;
  /** "declared" when the registry or the header named it, "inferred" otherwise. */
  basis: string;
  evidence: string;
  missing: number;
  distinct: number;
}

export interface ChartSuggestion {
  charts: ChartPayload[];
  columns: ChartColumnReport[];
  /** Shape changes made before charting: a melt, a row cap, a renamed column. */
  notes: string[];
  candidatesConsidered: number;
  model: string;
  source: string;
}

/**
 * The figures worth drawing for one table, chosen on the backend.
 *
 * Null rather than a fallback, for the same reason `compareStories` is: a
 * suggested figure is a claim that a model looked at this data and judged this
 * form right for it. A canned chart is not a degraded version of that, it is a
 * different claim. The caller says the selector was unavailable instead of
 * quietly showing figures nobody chose.
 *
 * Takes minutes on the large tier - one Ollama call, on hardware that can hold
 * one model at a time - so callers should not put it in a blocking render path
 * without saying what is happening.
 *
 * `model` overrides the tier's moderator for this call only. Picking figures
 * and moderating prose are different jobs and do not have to be the same
 * weight class, so a run can moderate on a small model and still choose its
 * figures on the largest one the machine can hold. The response echoes the
 * model that actually ran, and the footer under the figures prints it, so the
 * override can never be silent.
 */
export async function suggestCharts(
  source: { datasetId: string } | { uploadId: string },
  {
    n = 3,
    tier = "demo",
    seed,
    model,
  }: { n?: number; tier?: string; seed?: number; model?: string } = {},
): Promise<ChartSuggestion | null> {
  try {
    return await call<ChartSuggestion>("/charts/suggest", {
      method: "POST",
      body: JSON.stringify({ ...source, n, tier, seed, model }),
    });
  } catch (err) {
    unstable_rethrow(err);
    console.warn("[api] chart selection unavailable:", err);
    return null;
  }
}

// ------------------------------------------------------------------- uploads

export interface UploadedDataset {
  id: string;
  originalName: string;
  rows: number;
  columns: string[];
  numericColumns: string[];
  yearRange: string;
  countries: number | null;
  previewRows: Record<string, string>[];
  /** The story pipeline can generate from it. Per file, not a constant. */
  wired: boolean;
  /** Figures can be suggested from it. True - a table states its own types. */
  chartable: boolean;
  note: string;
  /** How the file was read, in one sentence. Empty when `wired` is false. */
  mapping: string;
  /** Shape changes and caveats behind that reading. */
  mappingNotes: string[];
}

/** Raised with the backend's own words, so the reader is told what was wrong. */
export class UploadRejected extends Error {}

/**
 * Send a CSV to the backend.
 *
 * Deliberately does NOT use `call`: that helper sets a JSON content-type, and a
 * multipart body needs the browser to set its own boundary. It also does not
 * use `withFallback`, because there is no honest mock for "your file was
 * stored" - a fallback here would tell the reader their upload succeeded when
 * nothing received it.
 */
export async function uploadDataset(file: File): Promise<UploadedDataset> {
  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${API_BASE}/uploads`, { method: "POST", body, cache: "no-store" });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    // 400 is the backend judging the file; anything else is the backend itself.
    throw new UploadRejected(
      res.status === 400 ? detail : `The server could not store the file (${res.status}: ${detail}).`,
    );
  }
  return res.json() as Promise<UploadedDataset>;
}
