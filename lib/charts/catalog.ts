/**
 * The catalog — every visualization the app can draw, what it is for, and the
 * exact object it takes.
 *
 * One file answers three questions:
 *
 *   1. What can I ask for?          `VISUALIZATION_NAMES`, 24 names
 *   2. What is each one?            `.description` and `.useWhen`
 *   3. What object do I send?       `.channels`, `.modifiers`, `.example`,
 *                                   and `jsonSchemaFor(form)` for the machine
 *                                   readable version
 *
 * ── This file adds, it never restates ─────────────────────────────────────
 *
 * The RULES live in `FORM_RULES` (spec.ts) and are enforced by `validateSpec`
 * (validate.ts). This catalog imports them and layers documentation on top, so
 * a channel can never be documented as optional here while the validator treats
 * it as required. If the two ever disagree, `catalog.test.mts` fails.
 *
 * Every `example` below is a COMPLETE, VALID spec, checked against
 * `EXAMPLE_FRAME` by that same test. Copy one, swap the column keys for your
 * own, and it renders.
 */

import type {
  ChartEncoding,
  ChartForm,
  ChartFrame,
  ChartPresetName,
  ChartSpec,
  ColumnType,
} from "./spec.ts";
import { CHART_FORMS, CHART_PRESETS, FORM_RULES } from "./spec.ts";

/* ── Grouping ────────────────────────────────────────────────────────────── */

/**
 * The reader's job, which is what should pick a form.
 *
 * These are also the natural grouping for a backend tool surface: seven tools,
 * one per job, each with its forms as an enum, rather than seventeen tools a
 * model has to tell apart.
 */
export type ChartJob =
  | "trend"
  | "magnitude"
  | "change"
  | "relationship"
  | "geography"
  | "distribution"
  | "headline";

export const JOB_DESCRIPTION: Record<ChartJob, string> = {
  trend: "How something moved over time.",
  magnitude: "How big things are next to each other.",
  change: "What moved between two points, and in which direction.",
  relationship: "Whether two or more measures travel together.",
  geography: "How a measure varies by place.",
  distribution: "The spread that an average hides.",
  headline: "A single number, where a chart would be furniture.",
};

/* ── Channel documentation ───────────────────────────────────────────────── */

/** What each encoding channel means, before any form-specific override. */
const CHANNEL_DOC: Record<keyof ChartEncoding, string> = {
  x: "Horizontal position, or the category a mark belongs to.",
  y: "The single measure on the single value axis. There is no second one.",
  color: "Series identity when bound to a nominal column, magnitude when bound to a quantitative one.",
  size: "Mark radius, scaled by area. Turns a scatter into a bubble chart.",
  facet: "Splits the figure into small multiples, one panel per distinct value.",
  geo: "ISO 3166-1 alpha-3 code. Joins to the world geometry in lib/data/world-geo.ts.",
  color2: "The second measure of a bivariate map.",
  measures: "The parallel axes, in the order they should appear.",
};

/** Where a channel means something different from the default above. */
const CHANNEL_OVERRIDE: Partial<Record<ChartForm, Partial<Record<keyof ChartEncoding, string>>>> = {
  heatmap: {
    y: "The ROW dimension, and the one place y is not the measure. Magnitude rides on `color`.",
    x: "The column dimension of the grid.",
    color: "The MEASURE. Binned into five steps of one hue, light to dark. Absence is hatched, never a pale fill.",
  },
  choropleth: {
    color: "The measure filling each country, binned into five steps of one hue.",
    x: "Optional. Supplies the map's own timeline, driving the scrubber and the 1/3/5/10-year step tabs.",
  },
  bivariateChoropleth: {
    color: "The FIRST measure, binned into three. Reads down the 3x3 key.",
    color2: "The SECOND measure, binned into three. Reads across the 3x3 key.",
  },
  dumbbell: {
    x: "Must hold EXACTLY two values: the before and the after.",
    color: "One row per distinct value. The two ends share a hue in two shades, because they are one measure at two times.",
  },
  slope: {
    x: "Must hold exactly two values.",
    color: "One line per distinct value, direct-labelled at both ends.",
  },
  bump: {
    y: 'Position, normally produced by transform: "rank". Rank 1 draws at the top.',
  },
  bar: {
    x: "The category. Use orientation: \"horizontal\" when the names are long.",
  },
  statTile: {
    y: "The measure. Its last non-null value becomes the headline number, and the first sets the delta.",
    x: "Optional. Supplies the span shown beside the delta and the sparkline's order.",
    color: "Optional. One tile per distinct value, which is how you get a KPI row.",
  },
  beeswarm: { x: "The grouping category. Every row becomes its own dot within it." },
  box: { x: "The slice whose quartiles are drawn, usually a year." },
  ridgeline: { x: "The slice whose distribution is drawn, one ridge per value." },
  scatter: { x: "The first measure. Unlike every other form, this axis is quantitative." },
  connectedScatter: {
    x: "The first measure. Time becomes the path, not an axis, which is the only way to show a trajectory that doubles back.",
  },
};

/* ── Modifier documentation ──────────────────────────────────────────────── */

export type ModifierName = "stack" | "orientation" | "baseline" | "emphasis" | "breaks";

export const MODIFIER_DOC: Record<ModifierName, { values: string; description: string }> = {
  stack: {
    values: '"none" | "stacked" | "percent"',
    description: '"stacked" makes it part-to-whole, "percent" makes it composition. This is what turns `area` into the catalog\'s stacked and 100% stacked area.',
  },
  orientation: {
    values: '"vertical" | "horizontal"',
    description: "Horizontal is the only readable option once category names are long.",
  },
  baseline: {
    values: "number",
    description: "Bars grow from here instead of the axis floor. Setting 0 is what makes a bar chart diverge, with marks taking the warm or cool pole by side.",
  },
  emphasis: {
    values: "string",
    description: "A VALUE in the color column, not a column key. One series takes the accent and every other becomes the same grey. The honest answer to a crowded chart.",
  },
  breaks: {
    values: "[number, number, number, number]",
    description: "Four ascending class breaks, giving five bins. Declared rather than derived, so scrubbing a year cannot recolour a country whose own figure never moved.",
  },
};

/* ── The example frame ───────────────────────────────────────────────────── */

/**
 * One frame every example below is valid against.
 *
 * Deliberately two years, not more: `dumbbell` and `slope` require exactly two
 * x-values, and a single shared frame keeps the examples checkable in one pass.
 * Everything else reads fine at two points.
 */
export const EXAMPLE_FRAME: ChartFrame = {
  columns: [
    { key: "year", label: "Year", type: "temporal" },
    { key: "country", label: "Country", type: "nominal" },
    { key: "iso3", label: "ISO3", type: "geo" },
    { key: "region", label: "WHO region", type: "nominal" },
    { key: "cases", label: "Reported cases", type: "quantitative" },
    { key: "coverage", label: "MCV1 coverage", type: "quantitative", unit: "%" },
    { key: "population", label: "Population", type: "quantitative" },
    { key: "incidence", label: "Incidence", type: "quantitative", unit: "per million", decimals: 1 },
  ],
  rows: [
    { year: 2015, country: "Nigeria", iso3: "NGA", region: "AFR", cases: 25_000, coverage: 51, population: 181_000_000, incidence: 138.1 },
    { year: 2023, country: "Nigeria", iso3: "NGA", region: "AFR", cases: 42_938, coverage: 62, population: 223_000_000, incidence: 192.5 },
    { year: 2015, country: "India", iso3: "IND", region: "SEAR", cases: 30_000, coverage: 84, population: 1_310_000_000, incidence: 22.9 },
    { year: 2023, country: "India", iso3: "IND", region: "SEAR", cases: 39_617, coverage: 89, population: 1_429_000_000, incidence: 27.7 },
    { year: 2015, country: "Yemen", iso3: "YEM", region: "EMR", cases: 2_000, coverage: 71, population: 26_000_000, incidence: 76.9 },
    { year: 2023, country: "Yemen", iso3: "YEM", region: "EMR", cases: 31_406, coverage: 67, population: 34_000_000, incidence: 923.7 },
  ],
  sourceNote: "Illustrative sample. Not for citation.",
};

/* ── Entries ─────────────────────────────────────────────────────────────── */

export interface ChannelDoc {
  channel: keyof ChartEncoding;
  required: boolean;
  accepts: ColumnType[] | "any";
  description: string;
}

export interface CatalogEntry {
  form: ChartForm;
  /** Human name, for a picker or a heading. */
  label: string;
  job: ChartJob;
  /** One line: what the reader sees. */
  description: string;
  /** One line: when to pick this over its neighbours. */
  useWhen: string;
  /** Why NOT to pick it, where there is a common mistake. */
  avoidWhen?: string;
  channels: ChannelDoc[];
  modifiers: ModifierName[];
  /** Catalog names that resolve to this geometry. */
  presets: ChartPresetName[];
  /** Distinct `color` values past which the form stops working. */
  maxSeries?: number;
  /** A complete, valid spec. Checked against EXAMPLE_FRAME by catalog.test.mts. */
  example: ChartSpec;
}

/** Per-form prose. The channel and modifier lists are derived, never typed twice. */
const PROSE: Record<
  ChartForm,
  { label: string; job: ChartJob; useWhen: string; avoidWhen?: string; example: ChartSpec }
> = {
  line: {
    label: "Line chart",
    job: "trend",
    useWhen: "A measure moves over time and the shape of the movement is the point.",
    avoidWhen: "Two measures of very different magnitude share it untransformed. Index them, or use two figures.",
    example: {
      form: "line",
      encoding: { x: "year", y: "cases", color: "country" },
      title: "Reported measles cases by country",
      rationale: "A trend over time with a handful of named series, so a line per country reads directly.",
    },
  },
  area: {
    label: "Area chart",
    job: "trend",
    useWhen: "A trend where the volume under it matters, or a composition that shifts over time.",
    avoidWhen: "Series overlap without stacking; the fills hide each other.",
    example: {
      form: "area",
      encoding: { x: "year", y: "cases", color: "country" },
      stack: "percent",
      title: "Share of reported cases by country",
      caption: "Each band is that country's share of the total, so the chart shows composition rather than volume.",
      rationale: "Part-to-whole over time. Percent stacking answers 'who accounts for the total' rather than 'how big is the total'.",
    },
  },
  bar: {
    label: "Bar chart",
    job: "magnitude",
    useWhen: "Comparing a measure across categories, ranked or diverging.",
    avoidWhen: "There is only one bar. That is a stat tile.",
    example: {
      form: "bar",
      encoding: { x: "country", y: "incidence" },
      orientation: "horizontal",
      sort: { by: "y", order: "desc" },
      title: "Measles incidence per million, latest year",
      rationale: "Magnitude across a handful of named categories. Horizontal because country names do not fit under vertical bars.",
    },
  },
  lollipop: {
    label: "Lollipop chart",
    job: "magnitude",
    useWhen: "A ranked comparison where the bar's area would overstate the difference.",
    avoidWhen: "Values start at zero and the length genuinely is the quantity. Use a bar.",
    example: {
      form: "lollipop",
      encoding: { x: "country", y: "coverage" },
      orientation: "horizontal",
      sort: { by: "y", order: "desc" },
      referenceLines: [{ value: 95, label: "~95% herd immunity", axis: "x" }],
      title: "MCV1 coverage against the herd-immunity threshold",
      rationale: "The reader is comparing each value to a threshold, not summing areas, so the ink of a full bar would be misleading weight.",
    },
  },
  heatmap: {
    label: "Heatmap",
    job: "magnitude",
    useWhen: "Two dimensions and one measure, at a density no other form survives: country x year at full resolution.",
    avoidWhen: "There are under ~5 rows. A grouped bar reads better.",
    example: {
      form: "heatmap",
      encoding: { x: "year", y: "country", color: "incidence" },
      polarity: "higher-is-worse",
      title: "Measles incidence by country and year",
      rationale: "Two dimensions and one measure across many rows. Colour is the only channel that scales to this density without seating a hue per country.",
    },
  },
  dumbbell: {
    label: "Dumbbell chart",
    job: "change",
    useWhen: "Before and after per item, where the SIZE of each gap is the finding.",
    avoidWhen: "The items cross over. A slope chart shows crossing; a dumbbell hides it.",
    example: {
      form: "dumbbell",
      encoding: { x: "year", y: "coverage", color: "country" },
      title: "MCV1 coverage, 2015 against 2023",
      rationale: "Before and after per country, where the length of each gap is the point. One hue in two shades, because the ends are one measure at two times.",
    },
  },
  slope: {
    label: "Slope chart",
    job: "change",
    useWhen: "Direction between two points, especially when items cross.",
    avoidWhen: "More than about a dozen items. The labels collide.",
    example: {
      form: "slope",
      encoding: { x: "year", y: "coverage", color: "country" },
      title: "Which countries gained coverage, and which lost it",
      rationale: "Direction between two points across a few items. Crossing lines are the finding, and only this form shows them.",
    },
  },
  bump: {
    label: "Bump chart",
    job: "change",
    useWhen: "The ORDER changed, which is a different claim from the values changing.",
    avoidWhen: "The magnitudes matter. Rank throws them away by design.",
    example: {
      form: "bump",
      encoding: { x: "year", y: "cases", color: "country" },
      transform: "rank",
      title: "Rank by reported cases",
      caption: "Rank 1 is the highest count. Equal counts share no rank, and an unreported year has none.",
      rationale: "The finding is a change in order rather than in level, so position is ranked and the magnitudes are deliberately dropped.",
    },
  },
  scatter: {
    label: "Scatter plot",
    job: "relationship",
    useWhen: "Two measures per item, asking whether they travel together.",
    avoidWhen: "One of the axes is time. That is a line chart.",
    example: {
      form: "scatter",
      encoding: { x: "coverage", y: "incidence", color: "region", size: "population" },
      title: "Coverage against incidence, sized by population",
      rationale: "The honest form for 'do these two move together', stated as x against y rather than implied by aligning two y-scales.",
    },
  },
  connectedScatter: {
    label: "Connected scatter plot",
    job: "relationship",
    useWhen: "Two measures over time, where the path doubles back on itself.",
    avoidWhen: "The trajectory is monotonic. Two aligned panels are easier to read.",
    example: {
      form: "connectedScatter",
      encoding: { x: "coverage", y: "incidence", color: "country" },
      title: "The path each country took",
      rationale: "Time is the path rather than an axis, which is the only way to show a trajectory that reverses.",
    },
  },
  parallelCoordinates: {
    label: "Parallel coordinates",
    job: "relationship",
    useWhen: "One item's profile across several measures at once.",
    avoidWhen: "The measures are the same thing at different times. That is a line chart.",
    example: {
      form: "parallelCoordinates",
      encoding: { measures: ["coverage", "incidence", "population"], color: "country" },
      title: "Country profiles across three measures",
      caption: "Each axis is scaled to its own range, so the chart compares shape rather than magnitude.",
      rationale: "Several measures per item, where the profile is the finding. Each axis is independently scaled and says so.",
    },
  },
  choropleth: {
    label: "Choropleth map",
    job: "geography",
    useWhen: "A measure varies by country and where matters.",
    avoidWhen: "Raw counts across countries of very different size. Use transform: \"perCapita\".",
    example: {
      form: "choropleth",
      encoding: { geo: "iso3", color: "incidence", x: "year" },
      polarity: "higher-is-worse",
      title: "Measles incidence per million by country",
      rationale: "The measure is geographic and the reader's question is 'where', which no ranked bar answers.",
    },
  },
  bivariateChoropleth: {
    label: "Bivariate choropleth",
    job: "geography",
    useWhen: "Two measures per country, and the interesting cases are high on one and low on the other.",
    avoidWhen: "One measure would do. The 3x3 key costs the reader real effort.",
    example: {
      form: "bivariateChoropleth",
      encoding: { geo: "iso3", color: "incidence", color2: "coverage" },
      title: "Incidence against coverage, by country",
      rationale: "Two measures on one map, so 'high incidence despite high coverage' becomes a colour the reader can name.",
    },
  },
  beeswarm: {
    label: "Beeswarm plot",
    job: "distribution",
    useWhen: "Every item should stay visible, and the group average is hiding them.",
    avoidWhen: "There are thousands of items. Use a box plot or a ridgeline.",
    example: {
      form: "beeswarm",
      encoding: { x: "region", y: "coverage" },
      title: "Coverage by WHO region, one dot per country",
      rationale: "A regional average conceals the countries at the bottom, which are the ones the story is about. Nothing is aggregated away.",
    },
  },
  box: {
    label: "Box plot",
    job: "distribution",
    useWhen: "The spread per slice is the finding and the individual items are not.",
    avoidWhen: "Fewer than about five items per slice. Quartiles of four points mislead.",
    example: {
      form: "box",
      encoding: { x: "year", y: "coverage" },
      title: "Spread of national coverage",
      rationale: "The finding is convergence, which a global mean line hides completely and quartiles state directly.",
    },
  },
  ridgeline: {
    label: "Ridgeline plot",
    job: "distribution",
    useWhen: "A whole distribution shifts over time.",
    avoidWhen: "There are only two or three slices. Overlaid curves are clearer.",
    example: {
      form: "ridgeline",
      encoding: { x: "year", y: "coverage" },
      title: "How the distribution of national coverage moved",
      caption: "Ridges share one vertical scale, so a taller curve means more countries and not just a narrower spread.",
      rationale: "The shape of the distribution is the finding, and it is moving, which is exactly what this form is for.",
    },
  },
  statTile: {
    label: "Stat tile",
    job: "headline",
    useWhen: "The answer is one number, with its change and maybe a sparkline.",
    avoidWhen: "Never as a one-bar bar chart or a two-slice pie. This IS that chart, done right.",
    example: {
      form: "statTile",
      encoding: { y: "cases", x: "year", color: "country" },
      polarity: "higher-is-worse",
      title: "Latest reported cases",
      rationale: "A headline figure with its delta. A one-bar bar chart would spend a whole plot saying one number.",
    },
  },
};

/** Which preset names resolve to each geometry. Derived, so it cannot drift. */
function presetsFor(form: ChartForm): ChartPresetName[] {
  return (Object.keys(CHART_PRESETS) as ChartPresetName[]).filter(
    (name) => CHART_PRESETS[name].form === form,
  );
}

function channelsFor(form: ChartForm): ChannelDoc[] {
  const rule = FORM_RULES[form];
  const describe = (channel: keyof ChartEncoding, required: boolean): ChannelDoc => ({
    channel,
    required,
    accepts:
      channel === "color"
        ? rule.colorAccepts
        : channel === "y"
          ? (rule.yAccepts ?? ["quantitative"])
          : channel === "size"
            ? ["quantitative"]
            : channel === "geo"
              ? ["geo"]
              : "any",
    description: CHANNEL_OVERRIDE[form]?.[channel] ?? CHANNEL_DOC[channel],
  });
  return [
    ...rule.required.map((c) => describe(c, true)),
    ...rule.optional.map((c) => describe(c, false)),
  ];
}

/** The catalog. One entry per geometry, rules derived from `FORM_RULES`. */
export const CHART_CATALOG: Record<ChartForm, CatalogEntry> = Object.fromEntries(
  CHART_FORMS.map((form) => {
    const rule = FORM_RULES[form];
    const prose = PROSE[form];
    return [
      form,
      {
        form,
        label: prose.label,
        job: prose.job,
        description: rule.describe,
        useWhen: prose.useWhen,
        avoidWhen: prose.avoidWhen,
        channels: channelsFor(form),
        modifiers: rule.allows as ModifierName[],
        presets: presetsFor(form),
        maxSeries: rule.maxSeries,
        example: prose.example,
      } satisfies CatalogEntry,
    ];
  }),
) as Record<ChartForm, CatalogEntry>;

/** Every entry, grouped by the reader's job. The natural shape for a tool surface. */
export function catalogByJob(): Record<ChartJob, CatalogEntry[]> {
  const out = {} as Record<ChartJob, CatalogEntry[]>;
  for (const entry of Object.values(CHART_CATALOG)) {
    (out[entry.job] ??= []).push(entry);
  }
  return out;
}

/* ── The names ───────────────────────────────────────────────────────────── */

export interface VisualizationName {
  /** What you ask for. */
  name: ChartPresetName;
  /** The geometry it resolves to. */
  form: ChartForm;
  /** Short: what the reader sees. */
  description: string;
  /** The modifiers the preset supplies on top of the bare form. */
  supplies: string;
}

/** What each preset adds beyond its geometry, in words. */
const PRESET_NOTE: Record<ChartPresetName, string> = {
  line: "A line per series.",
  indexedLine: 'Every series rescaled to 100 at its first point, so unlike magnitudes share one axis. The honest replacement for a dual axis.',
  emphasisLine: "One series in the accent, every other in the same grey. Set `emphasis` to a series name.",
  smallMultiples: "One panel per value. Set `encoding.facet`. Works with any geometry, not just lines.",
  stackedArea: "Bands sum to the total: part-to-whole over time.",
  stackedArea100: "Bands sum to 100%: composition over time, with the total removed.",
  rankedBar: "Horizontal bars, sorted largest first.",
  divergingBar: "Bars growing either side of zero, warm one way and cool the other.",
  lollipop: "A stem and a dot instead of a filled bar.",
  heatmap: "A grid of cells, colour by magnitude.",
  dumbbell: "Two dots joined by a line, one row per item.",
  slope: "Two columns joined by a line per item, labelled at both ends.",
  bump: "Rank over time, 1 at the top. Supplies transform: \"rank\".",
  scatter: "One dot per item, two measures.",
  bubble: "A scatter with `size` bound, so the dot area carries a third measure.",
  connectedScatter: "A scatter joined in time order.",
  parallelCoordinates: "One line per item across several independently scaled axes.",
  choropleth: "Countries filled by magnitude, absence hatched.",
  bivariateChoropleth: "Countries filled from a 3x3 grid of two measures.",
  beeswarm: "Every item a dot, nudged apart within its group.",
  box: "Quartiles, median and extremes per slice.",
  ridgeline: "Overlapping density curves, one per slice.",
  statTile: "A headline number, its delta, and a sparkline.",
  kpiRow: "Several stat tiles side by side. Set `encoding.color` to split them.",
};

/**
 * The 24 names a caller may ask for.
 *
 * More names than geometries, because several are a geometry wearing a modifier
 * (`stackedArea100` is `area` + `stack: "percent"`, `bubble` is `scatter` with
 * `size` bound, `kpiRow` is a faceted `statTile`). `applyPreset(name, spec)` in
 * spec.ts expands one into a full spec, and the caller's own fields always win.
 */
export const VISUALIZATION_NAMES: VisualizationName[] = (
  Object.keys(CHART_PRESETS) as ChartPresetName[]
).map((name) => ({
  name,
  form: CHART_PRESETS[name].form,
  description: CHART_CATALOG[CHART_PRESETS[name].form].description,
  supplies: PRESET_NOTE[name],
}));

/* ── Machine-readable shape ──────────────────────────────────────────────── */

type JsonSchema = Record<string, unknown>;

/**
 * A JSON Schema for one form's spec object.
 *
 * Usable directly as an MCP tool `inputSchema`, or as Ollama's `format` for
 * grammar-constrained decoding. Only the channels and modifiers the form
 * actually honours appear, so a model literally cannot emit `stack` on a line
 * chart or a second value axis on anything.
 */
export function jsonSchemaFor(form: ChartForm): JsonSchema {
  const entry = CHART_CATALOG[form];
  const rule = FORM_RULES[form];

  const encodingProps: JsonSchema = {};
  for (const c of entry.channels) {
    encodingProps[c.channel] =
      c.channel === "measures"
        ? { type: "array", items: { type: "string" }, description: c.description }
        : { type: "string", description: `${c.description} (a column key)` };
  }

  const props: JsonSchema = {
    form: { const: form, description: entry.description },
    encoding: {
      type: "object",
      description: "Which column plays which visual role. Every value is a column key.",
      required: rule.required,
      properties: encodingProps,
      additionalProperties: false,
    },
    transform: {
      enum: ["raw", "indexed", "perCapita", "share", "rank"],
      default: "raw",
      description:
        'Value transform. "perCapita" also needs `denominator`, and is what a comparison across places of different size requires.',
    },
    denominator: { type: "string", description: 'Column to divide by. Required when transform is "perCapita".' },
    perCapitaBase: { type: "number", description: "Multiplier after dividing, e.g. 1000000 for per million." },
    polarity: {
      enum: ["higher-is-worse", "higher-is-better"],
      description: "Picks the colour ramp direction and which side of a baseline reads as alarm.",
    },
    sort: {
      type: "object",
      properties: { by: { enum: ["x", "y", "color"] }, order: { enum: ["asc", "desc"] } },
    },
    referenceLines: {
      type: "array",
      description: "Only a real threshold earns one. They render dashed; nothing else in the app does.",
      items: {
        type: "object",
        required: ["value", "label"],
        properties: {
          value: { type: "number" },
          label: { type: "string" },
          axis: { enum: ["x", "y"] },
        },
      },
    },
    title: { type: "string", description: "Required. The renderer never invents one." },
    subtitle: { type: "string" },
    caption: { type: "string", description: "Say what the axis means whenever it is not literal." },
    rationale: {
      type: "string",
      description:
        "Required, and shown to the reader. Why this form over the alternatives. A producer that cannot say why has guessed rather than decided.",
    },
  };

  for (const m of entry.modifiers) {
    props[m] =
      m === "breaks"
        ? {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "number" },
            description: MODIFIER_DOC.breaks.description,
          }
        : m === "baseline"
          ? { type: "number", description: MODIFIER_DOC.baseline.description }
          : m === "emphasis"
            ? { type: "string", description: MODIFIER_DOC.emphasis.description }
            : m === "stack"
              ? { enum: ["none", "stacked", "percent"], description: MODIFIER_DOC.stack.description }
              : { enum: ["vertical", "horizontal"], description: MODIFIER_DOC.orientation.description };
  }

  return {
    type: "object",
    title: entry.label,
    description: `${entry.description} Use when: ${entry.useWhen}`,
    required: ["form", "encoding", "title", "rationale"],
    properties: props,
    additionalProperties: false,
  };
}

/** Every form's schema at once, for building a tool surface in one pass. */
export function allJsonSchemas(): Record<ChartForm, JsonSchema> {
  return Object.fromEntries(CHART_FORMS.map((f) => [f, jsonSchemaFor(f)])) as Record<
    ChartForm,
    JsonSchema
  >;
}
