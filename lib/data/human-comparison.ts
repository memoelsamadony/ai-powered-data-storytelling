/**
 * The human-comparison experiment, read straight from the artifact the
 * presentation figure is drawn from.
 *
 * `experiments/exp_json/exp-human-comparison.json` is written by the experiment
 * run and committed; `presentation/figures/make_figures_human.py` (fig 9) reads
 * the same file. Importing it rather than restating the numbers is the point:
 * the page and the slide cannot drift apart, because there is one copy.
 *
 * This is per-series experiment output, NOT the per-run tone of the three
 * sample stories in `stories.ts`. Those answer different questions and must not
 * be mixed: this one is "across every run of every series, where did moderation
 * land relative to the human writers", and it has an n per row to say how much
 * each arrow is standing on.
 */

import raw from "@/experiments/exp_json/exp-human-comparison.json";

export interface HumanComparisonSeries {
  id: string;
  /** Display name, mirroring SERIES_LABEL in make_figures_human.py. */
  label: string;
  /** Mean alarmism of the machine's first draft, 1-5. */
  machineRaw: number;
  /** Mean alarmism after the moderator, 1-5. */
  machineModerated: number;
  /** Median alarmism of the human writers for this series. */
  humanMedian: number;
  /** Runs behind this row. Four of five series are a single run. */
  runs: number;
}

export interface HumanComparison {
  judge: string;
  humanStories: number;
  totalRuns: number;
  aggregate: {
    rawMean: number;
    moderatedMean: number;
    humanMedian: number;
  };
  series: HumanComparisonSeries[];
  caveats: string[];
}

/** Mirrors SERIES_LABEL in presentation/figures/make_figures_human.py. */
const SERIES_LABEL: Record<string, string> = {
  "pertussis-global": "Pertussis",
  "diphtheria-global": "Diphtheria",
  "under5-measles-deaths": "Under-5 measles deaths",
  "mumps-global": "Mumps",
  measles: "Measles",
};

interface RawSeries {
  human_alarmism_median: number;
  machine_raw_alarmism_mean: number;
  machine_moderated_alarmism_mean: number;
  n_runs: number;
}

const perSeries = raw.per_series as Record<string, RawSeries>;

export const humanComparison: HumanComparison = {
  judge: raw.judge,
  humanStories: raw.n_human_stories,
  totalRuns: raw.n_runs,
  aggregate: {
    rawMean: raw.aggregate.alarmism_raw_mean,
    moderatedMean: raw.aggregate.alarmism_moderated_mean,
    humanMedian: raw.aggregate.human_alarmism_median,
  },
  /* Most alarmist first, exactly as the figure orders it: the eye should meet
     the longest arrow at the top and read the effect shrinking down the page. */
  series: Object.entries(perSeries)
    .map(([id, s]) => ({
      id,
      label: SERIES_LABEL[id] ?? id,
      machineRaw: s.machine_raw_alarmism_mean,
      machineModerated: s.machine_moderated_alarmism_mean,
      humanMedian: s.human_alarmism_median,
      runs: s.n_runs,
    }))
    .sort((a, b) => b.machineRaw - a.machineRaw),
  caveats: raw.caveats,
};
