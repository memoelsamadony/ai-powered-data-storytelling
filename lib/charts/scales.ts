/**
 * Colour assignment — pure, so the rule is testable rather than eyeballed.
 *
 * Three jobs, three rules, and nothing else gets a hue:
 *
 *   identity   a fixed categorical order, assigned by entity and never cycled
 *   magnitude  the sequential ramp already declared in `tokens.ts`
 *   emphasis   one entity in the accent, every other entity in the same grey
 *
 * The categorical set is the four validated in `tokens.ts` ("CATEGORICAL 4,
 * all checks PASS"). Only the ORDER differs here, and reordering is safe: those
 * checks are all-pairs over the set, so they hold under any permutation. The
 * order is changed on purpose. In this project the alarm hue *means* something,
 * and defaulting every chart's first series to it would assert alarm about data
 * that has not earned it. Slot 1 is the brand blue.
 *
 * Past four series there is no fifth validated hue, and inventing one is the
 * documented way to break every check at once. `foldTail` folds the remainder
 * into a single "Other" instead. That is the honest answer, and the validator
 * has already warned the producer before we get here.
 */

import * as t from "./tokens.ts";
import type { ChartSpec, Polarity } from "./spec.ts";

/** The fixed categorical order. Assigned by entity, never by rank. */
export const CATEGORICAL = [t.brandBlue, t.alarm, t.calm, t.amber] as const;

/** Everything that is not the point, when one series is. */
export const DEEMPHASIS = t.hairline;
/** Ink for a de-emphasised label, which still has to be readable. */
export const DEEMPHASIS_INK = t.faint;

/** The bucket the tail folds into once the categorical slots run out. */
export const OTHER_LABEL = "Other";

/**
 * Keeps the first `max` series and folds the rest into one "Other".
 *
 * First rather than largest, because the frame's order is the producer's
 * declared order and re-ranking here would mean colour followed rank. A reader
 * who learned "Nigeria is blue" must not find it repainted because a filter
 * changed which series is biggest.
 */
export function foldTail(series: string[], max = CATEGORICAL.length): string[] {
  if (series.length <= max) return series;
  return [...series.slice(0, max - 1), OTHER_LABEL];
}

/** Maps a raw series name to its folded bucket. */
export function bucketOf(name: string, kept: string[]): string {
  return kept.includes(name) ? name : OTHER_LABEL;
}

/**
 * Series name → hue.
 *
 * With `spec.emphasis` set, exactly one series carries the accent and every
 * other is the same grey. That is a different rule from "assign four hues and
 * dim three", and it is the one that makes a crowded chart readable.
 *
 * Without it, the first four series take the four slots in order and anything
 * past the fourth is grey. A renderer must NOT fold the tail itself: folding
 * means summing series, which changes what the figure says, and that is a
 * producer's decision. `validateSpec` has already told the producer to fold,
 * facet or emphasise; until it does, the surplus renders honestly as grey
 * rather than wearing a hue that was never validated.
 */
export function colorsFor(spec: ChartSpec, series: string[]): Map<string, string> {
  const out = new Map<string, string>();

  if (spec.emphasis) {
    for (const name of series) {
      out.set(name, name === spec.emphasis ? t.brandBlue : DEEMPHASIS);
    }
    return out;
  }

  series.forEach((name, i) => {
    out.set(name, i < CATEGORICAL.length ? CATEGORICAL[i] : DEEMPHASIS_INK);
  });
  return out;
}

/** Draw order: the emphasised series goes last so it sits on top. */
export function drawOrder(spec: ChartSpec, series: string[]): string[] {
  if (!spec.emphasis) return series;
  return [...series.filter((s) => s !== spec.emphasis), spec.emphasis];
}

/** Stroke width: the emphasised series is thicker, so identity is not colour-only. */
export function strokeWidthFor(spec: ChartSpec, name: string): number {
  if (!spec.emphasis) return 2;
  return name === spec.emphasis ? 2.5 : 1.25;
}

/* ── Magnitude ───────────────────────────────────────────────────────────── */

export function rampFor(polarity: Polarity | undefined): readonly string[] {
  return t.rampFor(polarity ?? "higher-is-worse");
}

/**
 * Bin index → fill. Absent values return null, and the caller hatches them.
 *
 * Absence must never render as a pale fill: the palest bin sits at 1.13 against
 * the surface and a pale grey scores 1.04 against it, so the two would be
 * indistinguishable and "no data" would read as "a low value".
 */
export function rampColor(bin: number | null, polarity?: Polarity): string | null {
  if (bin === null) return null;
  const ramp = rampFor(polarity);
  return ramp[Math.max(0, Math.min(ramp.length - 1, bin))];
}

/* ── Bivariate ───────────────────────────────────────────────────────────── */

/**
 * The 3x3 grid for a bivariate choropleth, built from the two existing ramps.
 *
 * Rows are the first measure (calm-ward), columns the second (alarm-ward). The
 * corner where both are high is the darkest cell, which is the whole point of
 * the form: "high on one and low on the other" is a colour a reader can name.
 * Indexed `[row][col]`, both 0-2, using every third step of the five-bin ramps
 * so the grid stays inside the validated palette.
 */
export const BIVARIATE: readonly (readonly string[])[] = [
  ["#e8eef2", "#cfd9dd", "#e5bbb2"],
  ["#b0cec9", "#9db3b3", "#cb897d"],
  ["#4b837d", "#6d8580", "#8f1d12"],
] as const;

/** Three bins from four breaks: low / mid / high, collapsing the five-bin scale. */
export function terciles(bin: number | null): number | null {
  if (bin === null) return null;
  if (bin <= 1) return 0;
  if (bin <= 2) return 1;
  return 2;
}

export function bivariateColor(binA: number | null, binB: number | null): string | null {
  const a = terciles(binA);
  const b = terciles(binB);
  if (a === null || b === null) return null;
  return BIVARIATE[a][b];
}
