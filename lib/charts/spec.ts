/**
 * The chart contract — one schema, every figure.
 *
 * This file is CANONICAL. The backend mirrors it in `backend/storytelling/
 * schemas.py` as camelCase pydantic models, same as `datasets.ts` and
 * `stories.ts` already do. If you change a type here, change the pydantic model
 * in the same commit; that pairing is the only thing keeping the contract
 * honest.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * `Dataset.series` is `{ year, primary, secondary }[]`. That shape can express
 * exactly one figure: two measures against a year. It is, structurally, the
 * dual-axis chart this repo keeps as an exhibit (defect D1). Nothing downstream
 * can choose a chart while the payload can only describe one.
 *
 * A `ChartSpec` says *what to draw*; a `ChartFrame` carries *the numbers*. They
 * travel together as a `ChartPayload`. A chart-selection agent emits the spec
 * and the frame; the renderer dispatches on `spec.form` and decides nothing.
 *
 * ── Why geometry and modifiers are separate fields ─────────────────────────
 *
 * The catalog names 20 chart types, but three of them are the same geometry
 * wearing a modifier:
 *
 *   small multiples      = any form + `encoding.facet`
 *   100% stacked area    = `area` + `stack: "percent"`
 *   diverging bar        = `bar`  + `baseline: 0`
 *
 * So there are 17 geometries and 3 orthogonal switches. Splitting them keeps
 * one renderer per geometry instead of one per named chart, and it means a new
 * combination (faceted diverging bars) costs nothing. `CHART_PRESETS` at the
 * bottom maps the 23 catalog-friendly names back onto (form + modifiers), so a
 * tool enum can still offer the names a human or a model would reach for.
 *
 * ── What the schema makes unrepresentable ──────────────────────────────────
 *
 * There is exactly one `y` channel and one value axis. A second y-scale cannot
 * be expressed, so the dual-axis chart is not a thing this contract can
 * describe. That is the point: the guardrail lives in the type, not in a prompt
 * asking nicely.
 */

/* ── Values & frame ──────────────────────────────────────────────────────── */

/** A cell. `null` means "not reported", and never renders as zero. */
export type ChartValue = number | string | null;

/** One record. Keys are `ChartColumn.key`. */
export type ChartRow = Record<string, ChartValue>;

/**
 * How a column may be used. `temporal` is kept distinct from `quantitative`
 * because a year is orderable but its *magnitude* is meaningless: indexing or
 * per-capita transforms must never be applied to it.
 */
export type ColumnType = "quantitative" | "temporal" | "nominal" | "geo";

export interface ChartColumn {
  /** Stable key, matches the keys in every `ChartRow`. */
  key: string;
  /** Human label for axes, legends, tooltips and the table twin. */
  label: string;
  type: ColumnType;
  /** Displayed after the value. Empty for counts. */
  unit?: string;
  /** Decimal places for display. Default 0. */
  decimals?: number;
}

/**
 * The data, long-format. One row per observation, never one column per series.
 *
 * Long format is the contract because wide format cannot describe 194 countries
 * without naming 194 columns, and because an agent emitting the frame should
 * not have to know the cardinality of the split in advance. `pivotToWide` in
 * `frame.ts` turns it into what Recharts wants, and is tested separately.
 */
export interface ChartFrame {
  columns: ChartColumn[];
  rows: ChartRow[];
  /** Optional provenance line rendered under the figure. */
  sourceNote?: string;
}

/* ── Encoding ────────────────────────────────────────────────────────────── */

/**
 * Which column plays which visual role. Every value is a `ChartColumn.key`.
 *
 * `color` is deliberately polymorphic, as in Vega-Lite: bound to a nominal
 * column it splits into categorical series; bound to a quantitative column it
 * drives a sequential ramp. `validateSpec` enforces which of the two a given
 * form will accept, so the polymorphism never reaches a renderer unchecked.
 */
export interface ChartEncoding {
  /** Position along the horizontal axis, or the category for a bar. */
  x?: string;
  /** The single measure on the single value axis. There is no second one. */
  y?: string;
  /** Series identity (nominal) or magnitude ramp (quantitative). */
  color?: string;
  /** Mark radius. Turns `scatter` into a bubble chart. */
  size?: string;
  /** Splits the figure into small multiples, one panel per distinct value. */
  facet?: string;
  /** ISO 3166-1 alpha-3 column, joins to `WorldShape.id` in `world-geo.ts`. */
  geo?: string;
  /** Second measure. Only `bivariateChoropleth` uses it. */
  color2?: string;
  /** Parallel axes. Only `parallelCoordinates` uses it. */
  measures?: string[];
}

/* ── Modifiers ───────────────────────────────────────────────────────────── */

/**
 * A value transform applied before rendering, in `frame.ts`.
 *
 * `perCapita` is the one that matters editorially: comparing raw counts across
 * places of very different size is the "dropped denominator" the moderator's
 * rubric already polices in prose. Here it is a declared field, so a figure
 * either states its denominator or does not have one.
 */
export type Transform =
  | "raw"
  /** Every series rescaled to 100 at its first point. Puts unlike magnitudes on one axis. */
  | "indexed"
  /** `y / denominator`, scaled by `perCapitaBase`. Requires `denominator`. */
  | "perCapita"
  /** Each point as a share of its x-slice total. */
  | "share"
  /** Position within the x-slice, 1 = largest. Feeds `bump`. */
  | "rank";

export type Stack = "none" | "stacked" | "percent";
export type Orientation = "vertical" | "horizontal";

/** Reuses the ramp choice already declared in `tokens.ts`. */
export type Polarity = "higher-is-worse" | "higher-is-better";

export interface SpecReferenceLine {
  value: number;
  label: string;
  /** Only a real threshold earns a dashed line (contract item 4). */
  axis?: "x" | "y";
}

export interface SpecSort {
  by: "x" | "y" | "color";
  order: "asc" | "desc";
}

/* ── Forms ───────────────────────────────────────────────────────────────── */

/**
 * The 17 geometries. One renderer each.
 *
 * Ordered by the reader's job, matching how the backend groups its tools:
 * trend, magnitude, change, relationship, geography, distribution, headline.
 */
export type ChartForm =
  /* trend over time */
  | "line"
  | "area"
  /* magnitude */
  | "bar"
  | "lollipop"
  | "heatmap"
  /* change between two points */
  | "dumbbell"
  | "slope"
  | "bump"
  /* relationship */
  | "scatter"
  | "connectedScatter"
  | "parallelCoordinates"
  /* geography */
  | "choropleth"
  | "bivariateChoropleth"
  /* distribution */
  | "beeswarm"
  | "box"
  | "ridgeline"
  /* headline */
  | "statTile";

export const CHART_FORMS: readonly ChartForm[] = [
  "line",
  "area",
  "bar",
  "lollipop",
  "heatmap",
  "dumbbell",
  "slope",
  "bump",
  "scatter",
  "connectedScatter",
  "parallelCoordinates",
  "choropleth",
  "bivariateChoropleth",
  "beeswarm",
  "box",
  "ridgeline",
  "statTile",
] as const;

/* ── The spec ────────────────────────────────────────────────────────────── */

export interface ChartSpec {
  form: ChartForm;
  encoding: ChartEncoding;

  /** Default `"raw"`. */
  transform?: Transform;
  /** Column to divide by. Required when `transform === "perCapita"`. */
  denominator?: string;
  /** Multiplier after dividing, e.g. 1_000_000 for "per million". Default 1. */
  perCapitaBase?: number;
  /** x-value that becomes 100 under `"indexed"`. Default: each series' first. */
  indexBase?: ChartValue;

  /** Area and bar only. Default `"none"`. */
  stack?: Stack;
  /** Bar and lollipop only. Default `"vertical"`. */
  orientation?: Orientation;
  /** Bars grow from here. Set 0 for a diverging bar. Default: the axis floor. */
  baseline?: number;

  /**
   * The one series that is the point; everything else greys out.
   *
   * Matches a value in the `color` column, not a column key. Emphasis is the
   * honest answer to "this chart has too many series", and is preferred over
   * seating more categorical hues.
   */
  emphasis?: string;

  /** Picks the sequential ramp for quantitative colour. Default higher-is-worse. */
  polarity?: Polarity;
  /**
   * Four ascending class breaks for binned colour (heatmap, choropleth).
   * Declared, never derived from the visible slice: recomputed bins would
   * recolour a country because the scale moved rather than its value.
   */
  breaks?: [number, number, number, number];

  sort?: SpecSort;
  referenceLines?: SpecReferenceLine[];

  /** Figure title. The renderer never invents one. */
  title: string;
  subtitle?: string;
  /** Prose under the figure. Say what the axis means if it is not literal. */
  caption?: string;
  /**
   * Why this form was chosen over the alternatives.
   *
   * Required, and surfaced in the UI. A chart-selection agent that cannot say
   * why it picked a form has not made a decision, it has guessed, and the
   * reader is entitled to see which one happened.
   */
  rationale: string;
}

/** What travels over the wire, and what a renderer takes. */
export interface ChartPayload {
  spec: ChartSpec;
  frame: ChartFrame;
}

/* ── Per-form rules ──────────────────────────────────────────────────────── */

/**
 * What each geometry needs and what it will accept.
 *
 * `validateSpec` reads this table, so adding a form means adding a row here and
 * a renderer, and nothing else. Keeping it as data rather than a switch is what
 * lets the backend mirror the same rules without re-deriving them.
 */
export interface FormRule {
  /** Encoding channels that must be present. */
  required: (keyof ChartEncoding)[];
  /** Channels that are meaningful. Anything else is rejected as a mistake. */
  optional: (keyof ChartEncoding)[];
  /** What `color` may be bound to. */
  colorAccepts: ColumnType[];
  /**
   * What `y` may be bound to. Defaults to quantitative, because on almost every
   * form `y` IS the value axis. The exception is the heatmap, where `y` is the
   * row dimension and the measure rides on `color` instead.
   */
  yAccepts?: ColumnType[];
  /** Modifiers this form honours. Others are rejected rather than ignored. */
  allows: ("stack" | "orientation" | "baseline" | "emphasis" | "breaks")[];
  /** Soft ceiling on distinct `color` values before the form stops working. */
  maxSeries?: number;
  /** One-line description, reused as the MCP tool's enum documentation. */
  describe: string;
}

const TREND: ColumnType[] = ["nominal"];

export const FORM_RULES: Record<ChartForm, FormRule> = {
  line: {
    required: ["x", "y"],
    optional: ["color", "facet"],
    colorAccepts: TREND,
    allows: ["emphasis"],
    maxSeries: 8,
    describe: "Trend over time. Add color for several series, emphasis when one is the point.",
  },
  area: {
    required: ["x", "y"],
    optional: ["color", "facet"],
    colorAccepts: TREND,
    allows: ["stack", "emphasis"],
    maxSeries: 8,
    describe: "Trend with volume. stack='stacked' for part-to-whole, 'percent' for share.",
  },
  bar: {
    required: ["x", "y"],
    optional: ["color", "facet"],
    colorAccepts: TREND,
    allows: ["stack", "orientation", "baseline", "emphasis"],
    maxSeries: 8,
    describe:
      "Compare magnitude across categories. orientation='horizontal' for long names, baseline=0 to diverge.",
  },
  lollipop: {
    required: ["x", "y"],
    optional: ["color", "facet"],
    colorAccepts: TREND,
    allows: ["orientation", "baseline", "emphasis"],
    maxSeries: 1,
    describe: "A ranked bar with the ink removed. Use when the bar length is not itself the point.",
  },
  heatmap: {
    required: ["x", "y", "color"],
    optional: ["facet"],
    colorAccepts: ["quantitative"],
    yAccepts: ["nominal", "temporal", "geo"],
    allows: ["breaks"],
    describe: "A dense grid, colour = magnitude. The form for country x year at full resolution.",
  },
  dumbbell: {
    required: ["x", "y", "color"],
    optional: ["facet"],
    colorAccepts: TREND,
    allows: ["orientation", "emphasis"],
    describe: "Before and after per item. x must hold exactly two values.",
  },
  slope: {
    required: ["x", "y", "color"],
    optional: ["facet"],
    colorAccepts: TREND,
    allows: ["emphasis"],
    maxSeries: 12,
    describe: "Direction between two points, one line per item. x must hold exactly two values.",
  },
  bump: {
    required: ["x", "y", "color"],
    optional: ["facet"],
    colorAccepts: TREND,
    allows: ["emphasis"],
    maxSeries: 12,
    describe: "How rank changes over time. Pair with transform='rank'.",
  },
  scatter: {
    required: ["x", "y"],
    optional: ["color", "size", "facet"],
    colorAccepts: ["nominal", "quantitative"],
    allows: ["emphasis"],
    maxSeries: 3,
    describe: "Relationship between two measures. Add size for a bubble chart.",
  },
  connectedScatter: {
    required: ["x", "y"],
    optional: ["color", "facet"],
    colorAccepts: TREND,
    allows: ["emphasis"],
    maxSeries: 3,
    describe: "Two measures against each other, joined in time order. Shows a trajectory.",
  },
  parallelCoordinates: {
    required: ["measures"],
    optional: ["color", "facet"],
    colorAccepts: TREND,
    allows: ["emphasis"],
    maxSeries: 8,
    describe: "One line per item across many measures. For profiles, not for trends.",
  },
  choropleth: {
    required: ["geo", "color"],
    /* `x` is the map's own timeline: `CountryMap` carries a year scrubber and
       the 1/3/5/10-year step tabs, and `frameToCountryData` reads x to build
       it. Without x the map renders a single slice, which is also valid. */
    optional: ["facet", "x"],
    colorAccepts: ["quantitative"],
    allows: ["breaks"],
    describe: "Magnitude by country. Absence is hatched, never a pale fill.",
  },
  bivariateChoropleth: {
    required: ["geo", "color", "color2"],
    optional: [],
    colorAccepts: ["quantitative"],
    allows: ["breaks"],
    describe: "Two measures per country on one 3x3 grid. Answers 'high on one, low on the other'.",
  },
  beeswarm: {
    required: ["x", "y"],
    optional: ["color", "size", "facet"],
    colorAccepts: TREND,
    allows: ["emphasis"],
    maxSeries: 8,
    describe: "Every item as a dot, grouped by category. Shows the spread an average hides.",
  },
  box: {
    required: ["x", "y"],
    optional: ["color", "facet"],
    colorAccepts: TREND,
    allows: ["emphasis"],
    maxSeries: 4,
    describe: "Distribution per x-slice as quartiles. Use when the spread is the finding.",
  },
  ridgeline: {
    required: ["x", "y"],
    optional: ["color", "facet"],
    colorAccepts: TREND,
    allows: [],
    describe: "Stacked density curves, one per x-slice. Shows a distribution shifting over time.",
  },
  statTile: {
    required: ["y"],
    optional: ["x", "color", "facet"],
    colorAccepts: TREND,
    allows: [],
    describe: "A headline number with its delta and a sparkline. Facet it for a KPI row.",
  },
};

/* ── Presets ─────────────────────────────────────────────────────────────── */

/**
 * The catalog's 23 friendly names, mapped onto (form + modifiers).
 *
 * The backend's MCP tools can expose these as their `form` enum, so a model
 * picks "stackedArea100" rather than assembling `area` + `stack: "percent"`
 * itself. `applyPreset` merges the fragment under a caller's own fields, so a
 * preset is a starting point and never overrides an explicit choice.
 */
export type ChartPresetName =
  | "line"
  | "indexedLine"
  | "emphasisLine"
  | "smallMultiples"
  | "stackedArea"
  | "stackedArea100"
  | "rankedBar"
  | "divergingBar"
  | "lollipop"
  | "heatmap"
  | "dumbbell"
  | "slope"
  | "bump"
  | "scatter"
  | "bubble"
  | "connectedScatter"
  | "parallelCoordinates"
  | "choropleth"
  | "bivariateChoropleth"
  | "beeswarm"
  | "box"
  | "ridgeline"
  | "statTile"
  | "kpiRow";

/** A preset contributes a form plus defaults; it never carries data or copy. */
export type PresetFragment = Partial<Omit<ChartSpec, "title" | "rationale" | "encoding">> & {
  form: ChartForm;
};

export const CHART_PRESETS: Record<ChartPresetName, PresetFragment> = {
  line: { form: "line" },
  indexedLine: { form: "line", transform: "indexed" },
  emphasisLine: { form: "line" },
  smallMultiples: { form: "line" },
  stackedArea: { form: "area", stack: "stacked" },
  stackedArea100: { form: "area", stack: "percent" },
  rankedBar: { form: "bar", orientation: "horizontal", sort: { by: "y", order: "desc" } },
  divergingBar: { form: "bar", orientation: "horizontal", baseline: 0 },
  lollipop: { form: "lollipop", orientation: "horizontal", sort: { by: "y", order: "desc" } },
  heatmap: { form: "heatmap" },
  dumbbell: { form: "dumbbell", orientation: "horizontal" },
  slope: { form: "slope" },
  bump: { form: "bump", transform: "rank" },
  scatter: { form: "scatter" },
  bubble: { form: "scatter" },
  connectedScatter: { form: "connectedScatter" },
  parallelCoordinates: { form: "parallelCoordinates" },
  choropleth: { form: "choropleth" },
  bivariateChoropleth: { form: "bivariateChoropleth" },
  beeswarm: { form: "beeswarm" },
  box: { form: "box" },
  ridgeline: { form: "ridgeline" },
  statTile: { form: "statTile" },
  kpiRow: { form: "statTile" },
};

/**
 * Builds a spec from a preset name plus the caller's own fields.
 *
 * Caller fields win. `emphasisLine` without an `emphasis` is just a line chart,
 * and `smallMultiples` without `encoding.facet` is just whatever form it wraps:
 * a preset cannot invent a column it was not given.
 */
export function applyPreset(
  preset: ChartPresetName,
  spec: Omit<ChartSpec, "form"> & Partial<Pick<ChartSpec, "form">>,
): ChartSpec {
  return { ...CHART_PRESETS[preset], ...spec } as ChartSpec;
}

/** Column lookup by key, for renderers and the validator. */
export function columnOf(frame: ChartFrame, key: string | undefined): ChartColumn | undefined {
  if (!key) return undefined;
  return frame.columns.find((c) => c.key === key);
}
