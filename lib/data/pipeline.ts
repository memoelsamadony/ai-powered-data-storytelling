/** The three-stage agentic pipeline, described once and reused across pages. */

export type StageId = "generate" | "moderate" | "factcheck";

export interface PipelineStage {
  id: StageId;
  index: number;
  name: string;
  agent: string;
  model: string;
  summary: string;
  detail: string;
  /** Tailwind token name used for the stage accent. */
  accent: "brand-blue" | "alarm" | "teal";
}

export const pipelineStages: PipelineStage[] = [
  {
    id: "generate",
    index: 1,
    name: "Generate",
    agent: "General LLM",
    model: "qwen3.5 · 4B → 12B",
    summary: "A general model turns the data into a first-draft narrative.",
    detail:
      "The generator reads the merged dataset and writes a fluent data story. Modern open models are already fairly faithful at stating numbers — but they reach for drama, which is where tone goes wrong.",
    accent: "brand-blue",
  },
  {
    id: "moderate",
    index: 2,
    name: "Moderate tone",
    agent: "Agentic moderator",
    model: "gemma4 · 12B",
    summary: "A second agent detects and rebalances the emotional framing.",
    detail:
      "The novel contribution. The moderator flags manipulative fear, false reassurance, or numbing detachment, removes emotive spans, and proposes a tone-balanced revision — keeping real urgency without the alarmism.",
    accent: "teal",
  },
  {
    id: "factcheck",
    index: 3,
    name: "Factual check",
    agent: "Lightweight verifier",
    model: "grounding pass",
    summary: "A separate check keeps the numbers honest.",
    detail:
      "Because a tone agent is not a fact-checker — in a real run the moderator silently corrected a hallucinated number without flagging it — a lightweight factual/causal check sits beside the moderator to catch unsupported claims.",
    accent: "alarm",
  },
];

export const pipelineGap = {
  headline: "Agentic verification has always targeted facts. We target tone.",
  body: "Framing research shows the emotional framing of a data story changes how it is received — and can mislead even when every number is correct. No published system moderates the affective tone of a data narrative. That gap is our contribution.",
};
