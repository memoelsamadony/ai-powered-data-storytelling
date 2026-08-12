"""The chart spec, mirroring ``lib/charts/spec.ts``.

Types, ``FORM_RULES`` and the presets, in the same order as the TypeScript so a
reader can hold the two side by side.

Where this deliberately departs from CHART_CONTRACT.md section 7
----------------------------------------------------------------
Section 7 gives the modifier fields eager defaults (``stack: "none"``,
``orientation: "vertical"``, ``per_capita_base: 1``, ``transform: "raw"``), on
the reasoning that "a model that omits ``stack`` gets ``"none"`` rather than a
missing key the frontend has to guess about".

Transcribed literally that makes the frontend refuse to draw most of the
catalogue. ``validateSpec`` rejects any modifier the form does not honour, and
it tests for *presence*, not for a meaningful value::

    for (const [field, token] of MODIFIERS) {
      if (spec[field] === undefined) continue;
      if (!rule.allows.includes(token)) errors.push(...);
    }

``line`` allows only ``emphasis``. A payload carrying ``stack: "none"`` and
``orientation: "vertical"`` therefore comes back
``{ok: false, errors: ['line does not honour "stack"',
'line does not honour "orientation"']}`` and renders as a refusal. Verified
against the real validator, not reasoned about: every ``line``, ``area``,
``lollipop``, ``heatmap``, ``slope``, ``bump``, ``scatter``, ``beeswarm``,
``box``, ``ridgeline`` and ``statTile`` figure would have been a blank panel.

The premise is wrong too: nothing on the frontend has to guess about a missing
key, because the TypeScript field is optional and ``prepare()`` reads an absent
``stack`` as "none" already.

So modifiers default to ``None`` here, which is what TypeScript's ``undefined``
means, and the wire drops them (``exclude_none=True`` on the endpoint). The
grammar still names every field, so a local model can emit ``null`` explicitly
rather than inventing a key.
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from ..schemas import Schema

# --------------------------------------------------------------------------
# Vocabulary
# --------------------------------------------------------------------------

ChartForm = Literal[
    "line", "area", "bar", "lollipop", "heatmap", "dumbbell", "slope", "bump",
    "scatter", "connectedScatter", "parallelCoordinates", "choropleth",
    "bivariateChoropleth", "beeswarm", "box", "ridgeline", "statTile",
]

ColumnType = Literal["quantitative", "temporal", "nominal", "geo"]
Transform = Literal["raw", "indexed", "perCapita", "share", "rank"]
Stack = Literal["none", "stacked", "percent"]
Orientation = Literal["vertical", "horizontal"]
Polarity = Literal["higher-is-worse", "higher-is-better"]
Channel = Literal["x", "y", "color", "size", "facet", "geo", "color2", "measures"]
Modifier = Literal["stack", "orientation", "baseline", "emphasis", "breaks"]

#: The seventeen geometries, in the order CHART_CONTRACT.md lists them.
CHART_FORMS: tuple[str, ...] = (
    "line", "area", "bar", "lollipop", "heatmap", "dumbbell", "slope", "bump",
    "scatter", "connectedScatter", "parallelCoordinates", "choropleth",
    "bivariateChoropleth", "beeswarm", "box", "ridgeline", "statTile",
)

#: Channels naming exactly one column. ``measures`` is a list and handled apart.
SINGLE_CHANNELS: tuple[str, ...] = ("x", "y", "color", "size", "facet", "geo", "color2")


# --------------------------------------------------------------------------
# The shapes
# --------------------------------------------------------------------------


class ChartColumn(Schema):
    key: str
    label: str
    type: ColumnType
    unit: str = ""
    decimals: int = 0


class ChartFrame(Schema):
    """Long format: one row per observation, never one column per series.

    Wide format cannot describe 194 countries without naming 194 columns, and a
    producer should not have to know the cardinality of a split in advance.
    """

    columns: list[ChartColumn]
    rows: list[dict[str, float | str | None]]
    source_note: str = ""


class ChartEncoding(Schema):
    """Every field names a column KEY in the frame, never a value.

    The one exception in the whole contract is ``ChartSpec.emphasis``, which
    names a *value* in the colour column. It lives on the spec rather than here
    for exactly that reason.
    """

    x: str | None = None
    y: str | None = None
    color: str | None = None
    size: str | None = None
    facet: str | None = None
    geo: str | None = None
    color2: str | None = None
    measures: list[str] = Field(default_factory=list)


class SpecSort(Schema):
    by: Literal["x", "y", "color"]
    order: Literal["asc", "desc"] = "desc"


class SpecReferenceLine(Schema):
    value: float
    label: str
    axis: Literal["x", "y"] | None = None


class ChartSpec(Schema):
    """What to draw. Note there is exactly one ``y`` and one value axis.

    A second y-scale is not expressible, deliberately: the guardrail lives in
    the type instead of in a prompt asking a model nicely. Two measures of
    different magnitude have three honest homes - ``transform="indexed"``, a
    facet, or two figures.
    """

    form: ChartForm
    encoding: ChartEncoding

    transform: Transform | None = None
    denominator: str | None = None
    per_capita_base: float | None = None
    index_base: float | str | None = None

    stack: Stack | None = None
    orientation: Orientation | None = None
    baseline: float | None = None
    emphasis: str | None = None
    polarity: Polarity | None = None
    breaks: list[float] | None = Field(default=None, min_length=4, max_length=4)
    sort: SpecSort | None = None
    reference_lines: list[SpecReferenceLine] | None = None

    title: str
    subtitle: str = ""
    caption: str = ""
    #: Required. A producer that cannot say why it chose a form has guessed
    #: rather than decided, and the reader is entitled to see which happened.
    rationale: str


class ChartPayload(Schema):
    spec: ChartSpec
    frame: ChartFrame


# --------------------------------------------------------------------------
# FORM_RULES - the mirror of spec.ts
# --------------------------------------------------------------------------

#: What `color` may carry on the forms that split a trend into series. Colour
#: there is an identity, not a magnitude, so a continuous ramp would be a
#: category error. Named TREND in spec.ts; kept literal here so a diff lines up.
TREND: tuple[str, ...] = ("nominal",)


class FormRule:
    """One row of FORM_RULES. Plain object; there is no reason to validate it."""

    __slots__ = ("required", "optional", "color_accepts", "y_accepts", "allows",
                 "max_series", "describe")

    def __init__(
        self,
        *,
        required: tuple[str, ...],
        optional: tuple[str, ...],
        color_accepts: tuple[str, ...],
        allows: tuple[str, ...],
        describe: str,
        y_accepts: tuple[str, ...] | None = None,
        max_series: int | None = None,
    ) -> None:
        self.required = required
        self.optional = optional
        self.color_accepts = color_accepts
        # Defaults to quantitative because on almost every form `y` IS the value
        # axis. The heatmap is the exception: its `y` is the row dimension and
        # the measure rides on `color`.
        self.y_accepts = y_accepts or ("quantitative",)
        self.allows = allows
        self.max_series = max_series
        self.describe = describe


FORM_RULES: dict[str, FormRule] = {
    "line": FormRule(
        required=("x", "y"), optional=("color", "facet"), color_accepts=TREND,
        allows=("emphasis",), max_series=8,
        describe="Trend over time. Add color for several series, emphasis when one is the point.",
    ),
    "area": FormRule(
        required=("x", "y"), optional=("color", "facet"), color_accepts=TREND,
        allows=("stack", "emphasis"), max_series=8,
        describe="Trend with volume. stack='stacked' for part-to-whole, 'percent' for share.",
    ),
    "bar": FormRule(
        required=("x", "y"), optional=("color", "facet"), color_accepts=TREND,
        allows=("stack", "orientation", "baseline", "emphasis"), max_series=8,
        describe=("Compare magnitude across categories. orientation='horizontal' for long names, "
                  "baseline=0 to diverge."),
    ),
    "lollipop": FormRule(
        required=("x", "y"), optional=("color", "facet"), color_accepts=TREND,
        allows=("orientation", "baseline", "emphasis"), max_series=1,
        describe="A ranked bar with the ink removed. Use when the bar length is not itself the point.",
    ),
    "heatmap": FormRule(
        required=("x", "y", "color"), optional=("facet",),
        color_accepts=("quantitative",), y_accepts=("nominal", "temporal", "geo"),
        allows=("breaks",),
        describe="A dense grid, colour = magnitude. The form for country x year at full resolution.",
    ),
    "dumbbell": FormRule(
        required=("x", "y", "color"), optional=("facet",), color_accepts=TREND,
        allows=("orientation", "emphasis"),
        describe="Before and after per item. x must hold exactly two values.",
    ),
    "slope": FormRule(
        required=("x", "y", "color"), optional=("facet",), color_accepts=TREND,
        allows=("emphasis",), max_series=12,
        describe="Direction between two points, one line per item. x must hold exactly two values.",
    ),
    "bump": FormRule(
        required=("x", "y", "color"), optional=("facet",), color_accepts=TREND,
        allows=("emphasis",), max_series=12,
        describe="How rank changes over time. Pair with transform='rank'.",
    ),
    "scatter": FormRule(
        required=("x", "y"), optional=("color", "size", "facet"),
        color_accepts=("nominal", "quantitative"), allows=("emphasis",), max_series=3,
        describe="Relationship between two measures. Add size for a bubble chart.",
    ),
    "connectedScatter": FormRule(
        required=("x", "y"), optional=("color", "facet"), color_accepts=TREND,
        allows=("emphasis",), max_series=3,
        describe="Two measures against each other, joined in time order. Shows a trajectory.",
    ),
    "parallelCoordinates": FormRule(
        required=("measures",), optional=("color", "facet"), color_accepts=TREND,
        allows=("emphasis",), max_series=8,
        describe="One line per item across many measures. For profiles, not for trends.",
    ),
    "choropleth": FormRule(
        # `x` is the map's own timeline: CountryMap carries a year scrubber and
        # the step tabs, and frameToCountryData reads x to build it. Without x
        # the map renders a single slice, which is also valid.
        required=("geo", "color"), optional=("facet", "x"),
        color_accepts=("quantitative",), allows=("breaks",),
        describe="Magnitude by country. Absence is hatched, never a pale fill.",
    ),
    "bivariateChoropleth": FormRule(
        required=("geo", "color", "color2"), optional=(),
        color_accepts=("quantitative",), allows=("breaks",),
        describe="Two measures per country on one 3x3 grid. Answers 'high on one, low on the other'.",
    ),
    "beeswarm": FormRule(
        required=("x", "y"), optional=("color", "size", "facet"), color_accepts=TREND,
        allows=("emphasis",), max_series=8,
        describe="Every item as a dot, grouped by category. Shows the spread an average hides.",
    ),
    "box": FormRule(
        required=("x", "y"), optional=("color", "facet"), color_accepts=TREND,
        allows=("emphasis",), max_series=4,
        describe="Distribution per x-slice as quartiles. Use when the spread is the finding.",
    ),
    "ridgeline": FormRule(
        required=("x", "y"), optional=("color", "facet"), color_accepts=TREND,
        allows=(),
        describe="Stacked density curves, one per x-slice. Shows a distribution shifting over time.",
    ),
    "statTile": FormRule(
        required=("y",), optional=("x", "color", "facet"), color_accepts=TREND,
        allows=(),
        describe="A headline number with its delta and a sparkline. Facet it for a KPI row.",
    ),
}


def column_of(frame: ChartFrame, key: str | None) -> ChartColumn | None:
    """The column a channel names, or None. Mirrors ``columnOf`` in spec.ts."""
    if not key:
        return None
    for column in frame.columns:
        if column.key == key:
            return column
    return None


def describe_form(form: str) -> str:
    """``FORM_RULES[form].describe``, written to be reused verbatim as enum docs."""
    rule = FORM_RULES.get(form)
    return rule.describe if rule else ""
