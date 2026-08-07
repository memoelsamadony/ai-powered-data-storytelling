/**
 * Front-end API facade.
 *
 * Today these functions return typed mock data with simulated latency so the
 * interface is fully interactive without a backend. Later, each function becomes
 * a `fetch('/api/...')` call to the Python pipeline (generation → tone
 * moderation → factual check) without changing any component that consumes it.
 */

import { datasets, getDataset, type Dataset } from "@/lib/data/datasets";
import { getStorySet, type StorySet } from "@/lib/data/stories";

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export async function getDatasets(): Promise<Dataset[]> {
  await delay(120);
  return datasets;
}

export async function getDatasetById(id: string): Promise<Dataset | undefined> {
  await delay(120);
  return getDataset(id);
}

export interface GenerateResult {
  dataset: Dataset;
  story: StorySet;
}

/**
 * Run the (mock) generation pipeline for a dataset. In production this streams
 * the three stages; here the caller drives the staged animation and we simply
 * return the full payload.
 */
export async function generateStory(datasetId: string): Promise<GenerateResult> {
  await delay(400);
  const dataset = getDataset(datasetId) ?? datasets[0];
  return { dataset, story: getStorySet(dataset.id) };
}

export interface ComparisonMetrics {
  textSimilarity: { metric: string; value: number }[];
  alarmismBefore: number;
  alarmismAfter: number;
  emotiveSpansRemoved: number;
  factsPreserved: boolean;
}

export async function compareStories(datasetId: string): Promise<ComparisonMetrics> {
  await delay(300);
  const story = getStorySet(datasetId);
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
}
