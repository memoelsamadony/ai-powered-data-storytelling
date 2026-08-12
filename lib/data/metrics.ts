/**
 * Evaluation results: the types, and the half of the numbers that is static.
 *
 * Every figure here now traces to a committed file. Until this rewrite the
 * module held hand-written constants that read like results and were not:
 * per-operation accuracy was a "4B vs 12B" table whose values matched neither
 * reproduction (lookup 71/95 against the measured 86.2/93.1), the alarmism
 * headline of 4.6 → 2.1 came from no run at all, and the three similarity
 * scores carried an `illustrative: true` flag that the page then printed in
 * 10px grey under a chart of them.
 *
 * The split that replaced them:
 *
 * * **Reproduction figures** - from evaluations that already ran, read out of
 *   the `per_operation.csv`, `masked_number.csv` and `metrics.csv` files
 *   committed under `reproductions/`. Static, so
 *   they are generated into `./generated/results.generated.ts` at build time
 *   and need no backend.
 * * **Measured figures** - what the runs in *this* deployment show. Live, so
 *   they are fetched from `GET /results` and carry their own n. See `Results`
 *   in lib/api.ts.
 * * **Per-run figures** - text similarity is scored against the baseline the
 *   reader typed, so it exists only inside a run and lives in the studio.
 *
 * A figure belonging to none of the three is not shown.
 */

import {
  generatedFaithfulness,
  generatedPerOperation,
  generatedMaskedNumber,
} from "./generated/results.generated";
import { datasets } from "./datasets";

export interface FaithfulnessPoint {
  model: string;
  value: number;
  note: string;
  tone: "good" | "warn" | "bad";
}

export interface FaithfulnessResults {
  caption: string;
  unit: string;
  /** The file this was read from, printed under the chart. */
  source: string;
  series: FaithfulnessPoint[];
}

/**
 * One model on one analytical operation. `correct`/`total` travel with `pct`
 * because they are not decoration: gemma4:12b's 80% on subtraction is four
 * right out of five, and next to its 93.1% on lookup (81 of 87) the bare
 * percentages would imply an equivalence the sample sizes do not support.
 */
export interface OperationAccuracy {
  model: string;
  operation: string;
  label: string;
  correct: number;
  total: number;
  pct: number;
}

export interface PerOperationResults {
  caption: string;
  unit: string;
  source: string;
  /** Model labels in draw order, smallest first. */
  models: string[];
  rows: OperationAccuracy[];
}

export interface MaskedNumberPoint {
  model: string;
  value: number;
  /** Absent for the paper's own figures, which are quoted rather than rerun. */
  correct?: number | null;
  total?: number | null;
  source: "ours" | "paper";
}

export interface MaskedNumberResults {
  caption: string;
  unit: string;
  source: string;
  series: MaskedNumberPoint[];
}

/* ---- The reproduction half, snapshotted from the committed CSVs ---- */

export const faithfulness = generatedFaithfulness;
export const perOperation = generatedPerOperation;
export const maskedNumber = generatedMaskedNumber;

/** Rows for one model, in the chart's operation order. */
export function operationsFor(results: PerOperationResults, model: string) {
  return results.rows.filter((r) => r.model === model);
}

/* ---- User study (planned, Task 5): a design, and no numbers yet ---- */

export const userStudy = {
  caption:
    "A controlled study comparing the human baseline against the LLM-plus-moderated story. Planned for the project's final phase.",
  status: "planned" as const,
  dimensions: [
    { name: "Trust", description: "Does the reader believe the story?" },
    { name: "Engagement", description: "Does it hold attention?" },
    { name: "Readability", description: "Is it clear and easy to follow?" },
    { name: "Human-vs-LLM preference", description: "Which story do readers prefer, and why?" },
  ],
};

/* ---- Headline stats for the home credibility band ---- */

function pct(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

const causalRow = perOperation.rows.find((r) => r.operation === "causal");
/* Claims attempted across both runs, computed rather than written as 21, so a
   re-run reproduction cannot leave the headline quoting a stale count. */
const causalAttempted = perOperation.rows
  .filter((r) => r.operation === "causal")
  .reduce((n, r) => n + r.total, 0);
const bestFaithful = faithfulness.series.reduce((a, b) => (a.value <= b.value ? a : b));
const primary = datasets.find((d) => d.role === "primary") ?? datasets[0];

/**
 * Derived, never typed in. The band used to carry "4.6 → 2.1" for alarmism,
 * which no run produced; the tone figures now live on the results page, where
 * they are fetched with the sample size behind them.
 */
export const headlineStats = [
  {
    value: pct(bestFaithful.value),
    label: `${bestFaithful.model} faithfulness error rate`,
    sub: `vs > ${pct(Math.max(...faithfulness.series.map((s) => s.value)))} in the original benchmark`,
  },
  {
    value: causalRow ? pct(causalRow.pct) : "0%",
    label: "causal-operation accuracy",
    /* Not "a capability wall": the operation is scored against a table of
       prices and volumes, and causation is not a column in it, so the row
       cannot rise above zero however capable the model is. What it shows is
       that both models state off-table causes as confidently as facts. */
    sub: `off-table causes, stated as fact: ${causalAttempted} claims, none the table could confirm`,
  },
  {
    value: maskedNumber.series.filter((s) => s.source === "ours").map((s) => pct(s.value)).join(" / "),
    label: "of a human analyst's numbers predicted",
    sub: "4B and 12B, both far inside the paper's sub-30% regime",
  },
  {
    value: primary.rows.toLocaleString("en-US"),
    label: "rows in the primary dataset",
    sub: `${primary.shortName}, ${primary.yearRange}`,
  },
];
