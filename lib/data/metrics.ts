/**
 * Evaluation numbers surfaced on the Results page and in the comparison panel.
 * Grounded in the interim report's reproductions; figures marked "illustrative"
 * are representative samples for the interface, not final study results.
 */

/* ---- Faithfulness: % of outputs with ≥1 semantic error (lower is better) ---- */
export const faithfulness = {
  caption:
    "Re-running the reference-free error-span method, a modern 12B model is far more faithful than the paper's original baseline; a 4B model regresses. Both size and recency matter.",
  unit: "% of outputs with ≥1 semantic error",
  series: [
    { model: "Paper baseline", value: 80, note: ">80% in the original study", tone: "bad" as const },
    { model: "gemma 4B", value: 52, note: "smaller model regresses", tone: "warn" as const },
    { model: "gemma 12B", value: 18, note: "modern, fairly faithful", tone: "good" as const },
  ],
};

/* ---- Analytical correctness: per-operation accuracy (higher is better) ---- */
export const perOperation = {
  caption:
    "Reading and computing operations improve sharply with scale — but the causal operation scores 0% for both models. Causal reasoning is a capability wall, not a size problem.",
  unit: "accuracy %",
  operations: [
    { op: "Lookup", small: 71, large: 95 },
    { op: "Comparison", small: 58, large: 88 },
    { op: "Trend", small: 49, large: 86 },
    { op: "Rate-of-change", small: 43, large: 89 },
    { op: "Causal", small: 0, large: 0 },
  ],
  smallLabel: "4B model",
  largeLabel: "12B model",
};

/* ---- Masked-number prediction (sub-30% regime) ---- */
export const maskedNumber = {
  caption:
    "Reconstructing a human analyst's key numbers stays in the paper's sub-30% regime — strong models still fail most analytical numbers.",
  unit: "% of masked numbers correctly predicted",
  series: [
    { model: "gemma 12B", value: 12.2 },
    { model: "gemma 4B", value: 0.9 },
  ],
};

/* ---- Tone calibration (the novel metric) ---- */
export const toneCalibration = {
  caption:
    "The novel metric: an LLM-judge alarmism rating (1–5) measured before vs after moderation, plus the count of emotive spans removed — with faithfulness re-checked afterwards to confirm the edit preserved the facts.",
  alarmismBefore: 4.6,
  alarmismAfter: 2.1,
  scaleMax: 5,
  emotiveSpansRemoved: 14,
  factsPreserved: true,
  factsPreservedNote: "All retained numbers re-verified after moderation",
};

/* ---- Text-similarity metrics (human vs LLM-moderated) — illustrative ---- */
export const textSimilarity = {
  caption:
    "Surface-overlap scores comparing the LLM-moderated story against the human baseline. Useful as a signal, but they reward wording overlap, not faithfulness or tone — which is why our metric set goes beyond them.",
  illustrative: true,
  series: [
    { metric: "BLEU", value: 0.31 },
    { metric: "ROUGE-L", value: 0.48 },
    { metric: "METEOR", value: 0.41 },
  ],
};

/* ---- User study dimensions (planned, Task 5) ---- */
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
export const headlineStats = [
  { value: "18%", label: "12B faithfulness error rate", sub: "vs >80% in the original benchmark" },
  { value: "0%", label: "causal-operation accuracy", sub: "a capability wall for both model sizes" },
  { value: "4.6 → 2.1", label: "alarmism, before → after", sub: "on the 1–5 LLM-judge tone scale" },
  { value: "9,959", label: "rows in the primary dataset", sub: "measles × MCV1 coverage, 1980–2024" },
];
