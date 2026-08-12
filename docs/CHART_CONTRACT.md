# The chart contract

What the backend emits, and what the frontend draws. One schema, seventeen
geometries, no dual axes.

`lib/charts/spec.ts` is **canonical**, the same way `lib/data/datasets.ts` and
`lib/data/stories.ts` already are. The pydantic mirror in
`backend/storytelling/schemas.py` follows it, camelCase on the wire. If a type
changes here, the pydantic model changes in the same commit.

---

## 1. Why the existing payload could not carry this

`Dataset.series` is `{ year, primary, secondary }[]`. That shape can express
exactly one figure: two measures against a year. It is, structurally, the
dual-axis chart the repo keeps as an exhibit in `dataset-chart.tsx`.

Nothing can *choose* a chart while the payload can only describe one. So a
`ChartSpec` says what to draw, a `ChartFrame` carries the numbers, and they
travel together as a `ChartPayload`.

## 2. Twenty-four catalog names, seventeen geometries

Several of the twenty-four named chart types are the same geometry wearing a modifier:

| Catalog name | Geometry | Modifier |
| --- | --- | --- |
| small multiples | any form | `encoding.facet` |
| 100% stacked area | `area` | `stack: "percent"` |
| diverging bar | `bar` | `baseline: 0` |

Splitting geometry from modifier is what keeps this at seventeen renderers
instead of forty, and it means a combination nobody planned for (faceted
diverging bars) costs nothing.

**The seventeen `form` values**

`line` · `area` · `bar` · `lollipop` · `heatmap` · `dumbbell` · `slope` ·
`bump` · `scatter` · `connectedScatter` · `parallelCoordinates` · `choropleth` ·
`bivariateChoropleth` · `beeswarm` · `box` · `ridgeline` · `statTile`

**The twenty-four names** (`VISUALIZATION_NAMES` in `catalog.ts`, backed by
`CHART_PRESETS` in `spec.ts`) map catalog-friendly names onto form + modifiers,
so a tool enum can offer the name a model would actually reach for.
`applyPreset("stackedArea100", {...})` yields `{ form: "area", stack: "percent",
... }`, and caller fields always win.

`lib/charts/catalog.ts` is the single place that answers "what can I ask for,
what is it, and what object do I send". Each entry carries a description, a
`useWhen`, an `avoidWhen`, its channels and modifiers (derived from
`FORM_RULES`, never retyped), and a **complete worked example that the test
suite validates**. `jsonSchemaFor(form)` emits the same thing as JSON Schema,
usable directly as an MCP `inputSchema` or as Ollama's `format`.

## 3. What the schema makes unrepresentable

There is exactly one `y` channel and one value axis. **A second y-scale cannot
be described.** That is deliberate: the guardrail is in the type rather than in
a prompt asking a model nicely.

Two measures of different magnitude have three legitimate homes instead:
`transform: "indexed"`, a facet, or two figures.

## 4. The shapes

```ts
interface ChartPayload { spec: ChartSpec; frame: ChartFrame }

interface ChartFrame {
  columns: { key, label, type, unit?, decimals? }[]   // type: quantitative | temporal | nominal | geo
  rows: Record<string, number | string | null>[]      // LONG format, one row per observation
  sourceNote?: string
}

interface ChartSpec {
  form: ChartForm
  encoding: { x?, y?, color?, size?, facet?, geo?, color2?, measures? }  // all are column KEYS

  transform?: "raw" | "indexed" | "perCapita" | "share" | "rank"
  denominator?: string        // required when transform === "perCapita"
  perCapitaBase?: number      // 1_000_000 for "per million"
  indexBase?: number | string // the x-value that becomes 100

  stack?: "none" | "stacked" | "percent"     // area, bar
  orientation?: "vertical" | "horizontal"    // bar, lollipop, dumbbell
  baseline?: number                          // bar. 0 makes it diverge
  emphasis?: string                          // a VALUE in the color column, not a key
  polarity?: "higher-is-worse" | "higher-is-better"
  breaks?: [number, number, number, number]  // declared class breaks
  sort?: { by: "x" | "y" | "color", order: "asc" | "desc" }
  referenceLines?: { value, label, axis? }[]

  title: string       // required
  subtitle?: string
  caption?: string
  rationale: string   // required, and shown to the reader
}
```

**Long format is the contract.** Wide format cannot describe 194 countries
without naming 194 columns, and a producer should not need to know the
cardinality of a split in advance. `pivotToWide` handles the conversion once, at
the boundary, and is tested rather than trusted.

**`rationale` is required.** A producer that cannot say why it chose a form has
guessed rather than decided, and the reader is entitled to see which one
happened. It renders under the figure as "Why this form:".

## 5. Rules the backend should mirror

`validateSpec(spec, frame)` in `lib/charts/validate.ts` returns
`{ ok, errors, warnings }`. **Errors refuse to render.** Warnings render with the
chart, because a soft cap is a judgement call and hiding the figure would be
worse than showing a crowded one.

Mirroring these server-side means a bad spec is caught before it reaches a
browser, and the model can be handed the error to retry against.

| Check | Severity |
| --- | --- |
| Required encoding channel missing | error |
| A channel the form does not use | error (never silently ignored) |
| A channel naming a column not in the frame | error |
| `y` bound to a non-measure (except `heatmap`, whose `y` is the row dimension) | error |
| `color` bound to a type the form does not accept | error |
| A modifier the form does not honour (`stack` on a line) | error |
| `perCapita` with no `denominator`, or a non-quantitative one | error |
| `dumbbell` / `slope` without exactly two x-values | error |
| `emphasis` naming a series that does not exist | error |
| `breaks` not strictly ascending | error |
| No `title`, no `rationale`, or an empty frame | error |
| **Raw counts across places while a population column exists** | warning |
| More series than the form carries | warning |
| `bump` without `transform: "rank"` | warning |

That warning in bold is the rubric's own example of a misleading figure
("dropped denominators: raw counts used to compare places of very different
size"), checked against the data rather than requested in a prompt.

## 6. Suggested MCP tool surface

Seventeen tools is past what a local model selects reliably. Group by the
reader's job, put the form in an enum, and the model still makes a real
two-level decision.

**Chart tools (7)** — each returns a `ChartPayload`

| Tool | `form` enum |
| --- | --- |
| `plot_trend_over_time` | `line`, `area` (+ `stack`, `transform: "indexed"`, `emphasis`) |
| `plot_magnitude` | `bar`, `lollipop`, `heatmap` |
| `plot_change` | `dumbbell`, `slope`, `bump` (+ `baseline: 0` on `bar`) |
| `plot_relationship` | `scatter`, `connectedScatter`, `parallelCoordinates` |
| `plot_geographic` | `choropleth`, `bivariateChoropleth` |
| `plot_distribution` | `beeswarm`, `box`, `ridgeline` |
| `show_headline` | `statTile` |

`FORM_RULES[form].describe` in `spec.ts` is written to be reused verbatim as the
enum documentation, so the tool descriptions and the validator cannot drift.

**Read tools (3)** — these are what make it an agent rather than a classifier

| Tool | Returns |
| --- | --- |
| `describe_dataset(id)` | dimensions, measures, span, row count, missingness, magnitude ratio between measures |
| `get_series(id, measure, groupBy, filter, agg)` | a `ChartFrame` |
| `check_comparability(id, measure, across)` | whether a per-capita denominator exists and is needed |

Without them the model picks a form blind from a prompt string. With them it can
discover that two measures differ by 100x and *derive* that it needs
`transform: "indexed"` or a facet. They also retire `build_prompt_table`, whose
docstring already notes that context costs memory the large tier cannot spare.

## 7. Pydantic mirror

Drop into `backend/storytelling/schemas.py`, under the existing `Schema` base
(which already does snake_case in Python, camelCase on the wire):

```python
ChartForm = Literal[
    "line", "area", "bar", "lollipop", "heatmap", "dumbbell", "slope", "bump",
    "scatter", "connectedScatter", "parallelCoordinates", "choropleth",
    "bivariateChoropleth", "beeswarm", "box", "ridgeline", "statTile",
]
ColumnType = Literal["quantitative", "temporal", "nominal", "geo"]
Transform = Literal["raw", "indexed", "perCapita", "share", "rank"]


class ChartColumn(Schema):
    key: str
    label: str
    type: ColumnType
    unit: str = ""
    decimals: int = 0


class ChartFrame(Schema):
    columns: list[ChartColumn]
    rows: list[dict[str, float | str | None]]
    source_note: str = ""


class ChartEncoding(Schema):
    x: str | None = None
    y: str | None = None
    color: str | None = None
    size: str | None = None
    facet: str | None = None
    geo: str | None = None
    color2: str | None = None
    measures: list[str] = Field(default_factory=list)


class ChartSpec(Schema):
    form: ChartForm
    encoding: ChartEncoding
    transform: Transform | None = None
    denominator: str | None = None
    per_capita_base: float | None = None
    index_base: float | str | None = None
    # Modifiers default to None, NOT to their nominal value. See the warning
    # below: an eager default here refuses to render.
    stack: Literal["none", "stacked", "percent"] | None = None
    orientation: Literal["vertical", "horizontal"] | None = None
    baseline: float | None = None
    emphasis: str | None = None
    polarity: Literal["higher-is-worse", "higher-is-better"] | None = None
    breaks: list[float] | None = Field(default=None, min_length=4, max_length=4)
    sort: SpecSort | None = None
    reference_lines: list[ReferenceLine] | None = None
    title: str
    subtitle: str = ""
    caption: str = ""
    rationale: str


class ChartPayload(Schema):
    spec: ChartSpec
    frame: ChartFrame
```

**Do not give the modifiers eager defaults.** An earlier draft of this section
set `stack: "none"` and `orientation: "vertical"`, reasoning that pydantic
defaults reach an Ollama grammar as part of the JSON schema, so a model omitting
`stack` would emit `"none"` rather than a missing key. Both halves are wrong.

`validateSpec` rejects a modifier the form does not honour, and it tests for
**presence**, not for a meaningful value:

```ts
if (spec[field] === undefined) continue;
if (!rule.allows.includes(token)) errors.push(`${spec.form} does not honour ...`);
```

`line` allows only `emphasis`, so a payload carrying `stack: "none"` and
`orientation: "vertical"` comes back `{ok: false}` and renders as a refusal
panel. Measured against the real validator, that is every `line`, `area`,
`lollipop`, `heatmap`, `slope`, `bump`, `scatter`, `beeswarm`, `box`,
`ridgeline` and `statTile` figure. And nothing has to guess about a missing key:
the TypeScript field is optional and `prepare()` already reads an absent `stack`
as `"none"`.

So modifiers are `None` here, which is what `undefined` means, and the wire drops
them - `exclude_none=True` on the endpoint. The grammar still names every field,
so a local model can emit `null` explicitly rather than inventing a key.
`backend/storytelling/charts/spec.py` is the implementation and
`ModifierDefaultTests` pins it.

## 8. Worked example

Measles cases and MCV1 coverage, the pair that produced the dual-axis exhibit,
drawn honestly:

```json
{
  "spec": {
    "form": "line",
    "encoding": { "x": "year", "y": "value", "color": "measure" },
    "transform": "indexed",
    "title": "Measles cases and MCV1 coverage, 1980 to 2024",
    "caption": "Both series are indexed to 100 at 1980, so they share one axis and neither is rescaled to meet the other.",
    "rationale": "The two measures differ by four orders of magnitude. Indexing puts their rates of change on one axis; a second y-scale would let an arbitrary alignment invent a correlation."
  },
  "frame": {
    "columns": [
      { "key": "year", "label": "Year", "type": "temporal" },
      { "key": "measure", "label": "Measure", "type": "nominal" },
      { "key": "value", "label": "Value", "type": "quantitative" }
    ],
    "rows": [
      { "year": 1980, "measure": "Reported cases", "value": 3852242 },
      { "year": 1980, "measure": "MCV1 coverage", "value": 16 }
    ],
    "sourceNote": "OWID / WHO / WUENIC"
  }
}
```

Frontend side, that is the whole integration:

```tsx
import { Chart } from "@/components/charts/chart";

<Chart payload={payload} height={320} />
```

## 9. File map

| File | What it holds |
| --- | --- |
| `lib/charts/spec.ts` | the contract: types, `FORM_RULES`, `CHART_PRESETS` |
| `lib/charts/frame.ts` | pure reshape and transforms, `prepare()` |
| `lib/charts/validate.ts` | the guardrail, mirrored server-side |
| `lib/charts/scales.ts` | colour by job: categorical, sequential, emphasis, bivariate |
| `lib/charts/svg.ts` | scales, ticks, quartiles, histogram for the hand-drawn forms |
| `lib/charts/geo-adapter.ts` | frame → the shape `country-map.tsx` already speaks |
| `components/charts/chart.tsx` | `<Chart>`, the single entry point |
| `components/charts/chrome.tsx` | legend, table twin, figure, tooltip, refusal |
| `components/charts/forms/*` | one renderer per geometry |

Pure logic lives in `lib/` so `node --test` reaches it. Run `npm test`.
