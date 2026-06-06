/**
 * The narrative payload that drives the tone demonstration. For each dataset we
 * carry three story variants — a human baseline, the raw LLM output, and the
 * tone-moderated output — plus the emotive spans the moderator removed, the
 * "same numbers, two tones" toggle phrases, and the separate factual check.
 *
 * The measles example mirrors the real run reported in the interim report: the
 * raw model is fluent but alarmist and hallucinates a case count; the moderator
 * strips the alarmism and silently re-grounds the number, which is exactly why a
 * separate factual check sits beside the tone agent.
 */

export type StoryVariantId = "human" | "ai-raw" | "ai-moderated";

export interface ToneVariant {
  id: StoryVariantId;
  label: string;
  author: string;
  title: string;
  /** Alarmism rating on the 1–5 LLM-judge scale (1 = flat, 5 = manipulative). */
  alarmismRating: number;
  paragraphs: string[];
}

export interface EmotiveSpan {
  text: string;
  replacement: string;
  reason: string;
}

export interface TonePhrase {
  text: string;
  accent?: boolean;
}

export type FactStatus = "verified" | "flagged" | "corrected";

export interface FactCheckItem {
  claim: string;
  status: FactStatus;
  note: string;
}

export interface StorySet {
  datasetId: string;
  human: ToneVariant;
  aiRaw: ToneVariant;
  aiModerated: ToneVariant;
  emotiveSpans: EmotiveSpan[];
  twoTones: { alarmist: TonePhrase[]; calibrated: TonePhrase[] };
  factualCheck: FactCheckItem[];
}

const measles: StorySet = {
  datasetId: "measles",
  human: {
    id: "human",
    label: "Human baseline",
    author: "Human author",
    title: "When the Shield Slips",
    alarmismRating: 2.4,
    paragraphs: [
      "For two decades, measles looked like a problem the world was solving. Between 2000 and 2016, reported cases fell by more than half as first-dose vaccination climbed from 72% into the mid-80s. The trend line pointed in one direction.",
      "Then it stopped. Coverage settled in the low-to-mid 80s and never reached the roughly 95% needed to hold the virus back. In 2019, before the pandemic disrupted reporting, cases climbed back above 860,000 — the worst year in a generation.",
      "The pattern is not mysterious. Measles is among the most contagious diseases we know, and it finds the gaps we leave. Where coverage holds, it retreats; where coverage slips, it returns. The data is less a warning than a reminder of how little margin there is.",
    ],
  },
  aiRaw: {
    id: "ai-raw",
    label: "LLM — raw",
    author: "General LLM (qwen3.5:4b)",
    title: "A Deadly Disease Roars Back",
    alarmismRating: 4.6,
    paragraphs: [
      "Measles is exploding across the globe, and the numbers are nothing short of terrifying. After years of false comfort, a preventable killer is surging out of control — and our defenses are collapsing in real time.",
      "In 2024 alone, a staggering 2.3 million cases tore through communities as vaccination rates cratered. The herd-immunity wall has been shattered, and every stalled percentage point is another open door to catastrophe.",
      "Make no mistake: this is a crisis spiraling toward disaster. Unless coverage rebounds immediately, the world is hurtling toward an epidemic the likes of which we have not seen in decades.",
    ],
  },
  aiModerated: {
    id: "ai-moderated",
    label: "LLM — tone-moderated",
    author: "Agentic moderator (gemma4:12b)",
    title: "Cases Rose as Coverage Stalled",
    alarmismRating: 2.1,
    paragraphs: [
      "Measles cases have risen again after years of decline. First-dose coverage has held in the low-to-mid 80s — short of the roughly 95% needed for herd immunity — and where that gap persists, the virus has returned.",
      "Around 359,000 cases were reported in 2024. That is far below the early-1980s peak, but it reverses much of the progress made since 2000, with outbreaks concentrated where coverage fell.",
      "The takeaway is specific rather than sweeping: closing the remaining coverage gap, especially in under-immunized regions, is what keeps cases down. The urgency is real, but measured — a margin to protect, not a catastrophe to announce.",
    ],
  },
  emotiveSpans: [
    { text: "exploding", replacement: "have risen", reason: "Manipulative intensity verb" },
    { text: "nothing short of terrifying", replacement: "notable", reason: "Fear framing" },
    { text: "preventable killer is surging out of control", replacement: "the virus has returned", reason: "Catastrophizing" },
    { text: "collapsing in real time", replacement: "have gaps", reason: "Urgency inflation" },
    { text: "a staggering 2.3 million", replacement: "around 359,000", reason: "Hallucinated figure, re-grounded" },
    { text: "tore through communities", replacement: "were reported", reason: "Sensational verb" },
    { text: "cratered", replacement: "stalled", reason: "Loaded verb" },
    { text: "the herd-immunity wall has been shattered", replacement: "coverage is short of herd immunity", reason: "Absolute framing" },
    { text: "crisis spiraling toward disaster", replacement: "a real but measured concern", reason: "Doom framing" },
    { text: "hurtling toward an epidemic", replacement: "at risk of further outbreaks", reason: "Predictive overreach" },
  ],
  twoTones: {
    alarmist: [
      { text: "A deadly disease " },
      { text: "roars back", accent: true },
      { text: " as our defenses " },
      { text: "collapse", accent: true },
      { text: "." },
    ],
    calibrated: [
      { text: "Cases " },
      { text: "rose", accent: true },
      { text: " as " },
      { text: "coverage stalled", accent: true },
      { text: "." },
    ],
  },
  factualCheck: [
    {
      claim: "“2.3 million cases in 2024”",
      status: "flagged",
      note: "Unsupported. The merged data reports ≈359,000 cases in 2024. The tone moderator silently re-grounded this number while removing alarmism — but never flagged it. That blind spot is exactly why a separate factual check runs beside the tone agent.",
    },
    {
      claim: "“~95% needed for herd immunity”",
      status: "verified",
      note: "Consistent with the dataset's herd-immunity reference line.",
    },
    {
      claim: "“coverage in the low-to-mid 80s”",
      status: "verified",
      note: "Matches the MCV1 coverage series (81–86% since 2010).",
    },
  ],
};

const whoHealth: StorySet = {
  datasetId: "who-health",
  human: {
    id: "human",
    label: "Human baseline",
    author: "Human author",
    title: "The Half-Won Fight",
    alarmismRating: 2.2,
    paragraphs: [
      "By almost any measure, child survival is one of the great achievements of the last generation. Since 1990, under-five mortality has fallen from 93 to 37 per 1,000 live births, and global life expectancy has risen by nearly eight years.",
      "But the line is neither straight nor finished. The pandemic erased roughly two years of life-expectancy gains in 2020–21, and a child in sub-Saharan Africa still dies before age five at many times the rate of one in Europe.",
      "Progress this large is easy to round up into a victory. The more honest reading is that the trend is real, fragile, and unevenly shared — a fight half-won, not over.",
    ],
  },
  aiRaw: {
    id: "ai-raw",
    label: "LLM — raw",
    author: "General LLM (qwen3.5:4b)",
    title: "A Triumph for Humanity",
    alarmismRating: 4.3,
    paragraphs: [
      "Humanity has all but conquered child mortality. We are living through a golden age of health in which preventable death is vanishing and every year brings unstoppable, history-making progress.",
      "Life expectancy has soared past 80 worldwide, and the downward march of child deaths is now essentially unstoppable. The finish line is finally in sight, and victory is assured.",
      "There has never been a safer time to be born. The data tells a story of pure, triumphant success — a problem the world can confidently consider solved.",
    ],
  },
  aiModerated: {
    id: "ai-moderated",
    label: "LLM — tone-moderated",
    author: "Agentic moderator (gemma4:12b)",
    title: "Real Progress, Still Unfinished",
    alarmismRating: 2.3,
    paragraphs: [
      "Child survival has improved dramatically. Under-five mortality has fallen from 93 to 37 per 1,000 live births since 1990, and life expectancy has risen substantially — real, hard-won progress.",
      "But the gains are uneven and not guaranteed. Global life expectancy is about 71.7 years, not above 80, and it fell during 2020–21 before partly recovering. The remaining burden is concentrated in the poorest regions.",
      "The accurate framing keeps both halves: decades of genuine progress, alongside a real and unfinished gap. The story is hopeful without being reassuring to the point of complacency.",
    ],
  },
  emotiveSpans: [
    { text: "all but conquered", replacement: "improved dramatically against", reason: "False completion" },
    { text: "golden age of health", replacement: "period of real progress", reason: "Over-optimistic framing" },
    { text: "unstoppable, history-making progress", replacement: "substantial progress", reason: "Inevitability framing" },
    { text: "soared past 80 worldwide", replacement: "risen to about 71.7 years", reason: "Hallucinated figure, re-grounded" },
    { text: "the finish line is finally in sight, and victory is assured", replacement: "the gap is narrowing but not closed", reason: "False reassurance" },
    { text: "a problem the world can confidently consider solved", replacement: "a problem still concentrated in the poorest regions", reason: "Complacency framing" },
  ],
  twoTones: {
    alarmist: [
      { text: "A preventable killer is " },
      { text: "all but defeated", accent: true },
      { text: " — " },
      { text: "victory is assured", accent: true },
      { text: "." },
    ],
    calibrated: [
      { text: "Child deaths keep " },
      { text: "falling", accent: true },
      { text: ", but the gap is " },
      { text: "not yet closed", accent: true },
      { text: "." },
    ],
  },
  factualCheck: [
    {
      claim: "“life expectancy has soared past 80 worldwide”",
      status: "flagged",
      note: "Unsupported. Global life expectancy is ≈71.7 years (2022). The moderator re-grounded the figure while softening the over-optimism but did not flag the original error.",
    },
    {
      claim: "“under-five mortality fell from 93 to 37”",
      status: "verified",
      note: "Matches the WHO/UN IGME series (1990 → 2022).",
    },
    {
      claim: "“fell during 2020–21”",
      status: "verified",
      note: "Consistent with the COVID-era life-expectancy reversal in the data.",
    },
  ],
};

export const storySets: Record<string, StorySet> = {
  measles,
  "who-health": whoHealth,
};

export function getStorySet(datasetId: string): StorySet {
  return storySets[datasetId] ?? measles;
}
