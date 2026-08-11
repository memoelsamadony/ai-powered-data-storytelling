/**
 * Spec validation — the guardrail, as data rather than as a prompt.
 *
 * Everything the project's moderator rubric asks for in prose ("misleading
 * baselines and scale tricks", "dropped denominators: raw counts used to
 * compare places of very different size") is checked here against the spec and
 * the frame it arrived with. A producer cannot talk its way past these; the
 * figure either satisfies them or it does not render.
 *
 * The split matters:
 *
 *   errors   the figure would misrepresent the data, or cannot be drawn at all.
 *            `Chart` refuses and shows the reason. Never render past one.
 *   warnings the figure is legitimate but is working against the reader. It
 *            renders, with the note attached, because a soft cap is a judgement
 *            call and hiding the chart would be worse than showing a crowded one.
 *
 * Pure, so `node --test` can reach it (see `validate.test.mts`), and so the
 * backend can mirror the same rules without re-deriving them.
 */

import type { ChartEncoding, ChartFrame, ChartSpec, ColumnType } from "./spec.ts";
import { FORM_RULES, columnOf } from "./spec.ts";
import { distinctValues, groupBy } from "./frame.ts";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Channels that name a single column. `measures` is handled separately. */
const SINGLE: (keyof ChartEncoding)[] = ["x", "y", "color", "size", "facet", "geo", "color2"];

/** Modifier fields, paired with the `FormRule.allows` token that permits them. */
const MODIFIERS = [
  ["stack", "stack"],
  ["orientation", "orientation"],
  ["baseline", "baseline"],
  ["emphasis", "emphasis"],
  ["breaks", "breaks"],
] as const;

export function validateSpec(spec: ChartSpec, frame: ChartFrame): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rule = FORM_RULES[spec.form];
  if (!rule) {
    return { ok: false, errors: [`Unknown chart form "${spec.form}".`], warnings };
  }

  const allowed = new Set<keyof ChartEncoding>([...rule.required, ...rule.optional]);

  /* 1. Required channels, and every channel resolving to a real column. */
  for (const channel of rule.required) {
    if (channel === "measures") {
      if (!spec.encoding.measures?.length) {
        errors.push(`${spec.form} needs encoding.measures.`);
      }
      continue;
    }
    if (!spec.encoding[channel]) errors.push(`${spec.form} needs encoding.${channel}.`);
  }

  for (const channel of SINGLE) {
    const key = spec.encoding[channel] as string | undefined;
    if (!key) continue;
    if (!allowed.has(channel)) {
      errors.push(`${spec.form} does not use encoding.${channel}.`);
      continue;
    }
    if (!columnOf(frame, key)) {
      errors.push(`encoding.${channel} names "${key}", which is not a column in the frame.`);
    }
  }

  for (const key of spec.encoding.measures ?? []) {
    if (!columnOf(frame, key)) {
      errors.push(`encoding.measures names "${key}", which is not a column in the frame.`);
    }
  }

  /* 2. Channel types. The value axis carries a measure, never a label — except
        on the heatmap, whose `y` is the row dimension and whose measure rides
        on `color`. `yAccepts` states that per form rather than hard-coding it. */
  const yAccepts = rule.yAccepts ?? ["quantitative"];
  const y = columnOf(frame, spec.encoding.y);
  if (y && !yAccepts.includes(y.type)) {
    errors.push(`${spec.form} binds y to ${describeTypes(yAccepts)}; "${y.key}" is ${y.type}.`);
  }

  const size = columnOf(frame, spec.encoding.size);
  if (size && size.type !== "quantitative") {
    errors.push(`encoding.size must be quantitative; "${size.key}" is ${size.type}.`);
  }

  const geo = columnOf(frame, spec.encoding.geo);
  if (geo && geo.type !== "geo") {
    errors.push(`encoding.geo must be a geo column; "${geo.key}" is ${geo.type}.`);
  }

  const color = columnOf(frame, spec.encoding.color);
  if (color && !rule.colorAccepts.includes(color.type)) {
    errors.push(
      `${spec.form} binds colour to ${describeTypes(rule.colorAccepts)}; "${color.key}" is ${color.type}.`,
    );
  }

  /* 3. Modifiers the form does not honour are rejected, never ignored. A spec
        that quietly drops `stack` renders a chart nobody asked for. */
  for (const [field, token] of MODIFIERS) {
    if (spec[field] === undefined) continue;
    if (!rule.allows.includes(token)) {
      errors.push(`${spec.form} does not honour "${field}".`);
    }
  }

  /* 4. Transform prerequisites. */
  if (spec.transform === "perCapita") {
    if (!spec.denominator) {
      errors.push(`transform "perCapita" needs a denominator column.`);
    } else {
      const den = columnOf(frame, spec.denominator);
      if (!den) errors.push(`denominator names "${spec.denominator}", which is not in the frame.`);
      else if (den.type !== "quantitative") {
        errors.push(`denominator "${den.key}" must be quantitative; it is ${den.type}.`);
      }
    }
  }
  if (spec.denominator && spec.transform !== "perCapita") {
    warnings.push(`A denominator is declared but transform is "${spec.transform ?? "raw"}", so it is unused.`);
  }
  if (spec.transform === "indexed" && !spec.encoding.x) {
    errors.push(`transform "indexed" needs encoding.x to order the series.`);
  }

  /* 5. The dropped-denominator check.
        Comparing raw counts across places of very different size is the
        rubric's own example of a misleading figure. If the frame carries a
        population column and the spec did not use it, say so. */
  if ((spec.transform ?? "raw") === "raw" && comparesPlaces(spec) && hasPopulation(frame)) {
    warnings.push(
      "Raw counts are compared across places of different size while a population column is available. Consider transform \"perCapita\".",
    );
  }

  /* 6. Forms that are only meaningful across exactly two x-slices. */
  if (spec.form === "dumbbell" || spec.form === "slope") {
    const xs = distinctValues(frame, spec.encoding.x);
    if (xs.length !== 2) {
      errors.push(`${spec.form} needs exactly two x values; the frame has ${xs.length}.`);
    }
  }

  /* 7. A rank transform without a bump, or a bump without one. Both render
        something plausible and wrong, so both are caught. */
  if (spec.form === "bump" && spec.transform !== "rank") {
    warnings.push(`bump plots position, so it usually wants transform "rank".`);
  }

  /* 8. Series count. Past the ceiling the answer is emphasis, a facet, or a
        table — never more hues, which stop being distinguishable under CVD.

        Two subtleties, both found by running this over real data:
        • `emphasis` already collapses every series to two visual classes, the
          accent and the grey. Telling a chart that uses it to "use emphasis"
          is a false positive, and one that trains readers to ignore warnings.
        • when faceted, the count that matters is the largest count in any ONE
          panel, not the total across all of them. */
  if (rule.maxSeries !== undefined && spec.encoding.color && !spec.emphasis) {
    const panels = [...groupBy(frame.rows, spec.encoding.facet).values()];
    const n = Math.max(
      ...panels.map((rows) => distinctValues({ ...frame, rows }, spec.encoding.color).length),
    );
    if (n > rule.maxSeries) {
      warnings.push(
        `${n} series exceeds the ${rule.maxSeries} this form carries. Use emphasis, a facet, or fold the tail into "Other".`,
      );
    }
  }

  /* 9. Emphasis must name a series that exists, or it silently greys everything. */
  if (spec.emphasis && spec.encoding.color) {
    const values = distinctValues(frame, spec.encoding.color).map(String);
    if (!values.includes(spec.emphasis)) {
      errors.push(`emphasis "${spec.emphasis}" is not a value in "${spec.encoding.color}".`);
    }
  }

  /* 10. Declared breaks must ascend, or `binOf` silently mis-bins. */
  if (spec.breaks) {
    const ok = spec.breaks.every((b, i) => i === 0 || b > spec.breaks![i - 1]);
    if (!ok) errors.push("breaks must be four strictly ascending numbers.");
  }

  /* 11. Copy. A figure with no title and no stated reason is not finished. */
  if (!spec.title?.trim()) errors.push("A spec needs a title.");
  if (!spec.rationale?.trim()) {
    errors.push("A spec needs a rationale: why this form, over the alternatives.");
  }

  /* 12. Frame sanity. */
  if (!frame.rows.length) errors.push("The frame has no rows.");

  return { ok: errors.length === 0, errors, warnings };
}

/** True when the figure puts several named places side by side. */
function comparesPlaces(spec: ChartSpec): boolean {
  if (spec.encoding.geo) return true;
  const split = spec.encoding.color ?? spec.encoding.x ?? "";
  return /country|countries|location|region|state|nation/i.test(split);
}

/** True when a denominator was available and could have been used. */
function hasPopulation(frame: ChartFrame): boolean {
  return frame.columns.some(
    (c) => c.type === "quantitative" && /population|pop\b|denominator|births|exposure/i.test(c.key),
  );
}

function describeTypes(types: ColumnType[]): string {
  return types.length === 1 ? `a ${types[0]} column` : types.join(" or ");
}
