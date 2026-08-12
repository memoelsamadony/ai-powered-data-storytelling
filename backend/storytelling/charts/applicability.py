"""Which forms this frame can carry, decided in code rather than by a model.

The brief was "choose the graph types applicable to the dataset shape, then
choose the best 3". Those are two different jobs and only the second one wants a
language model.

Applicability is a **closed question over types**. ``FORM_RULES`` already states
which channels each form requires, ``validate.py`` already states which types
each channel accepts, and a frame already knows the type of every column. So the
set of drawable forms is computable, and computing it is strictly better than
asking: it is exhaustive, it is instant, it costs no tokens, and it cannot
hallucinate a choropleth for a table with no geographic column.

What is left for the model is the genuinely editorial part - which of the
drawable figures is worth a reader's attention, and why - and it arrives with
the impossible options already removed. That also shrinks the prompt from
seventeen forms with their rules to a handful of concrete, pre-validated
candidates, which is what makes this reliable on an 8B local model rather than
only on a frontier one.

Two rules here are about honesty rather than about types, and both were found by
running this over the repo's own data rather than by reading the spec:

**Incommensurable splits.** ``world_frame_of`` puts two measures in one ``value``
column, discriminated by ``measure``. That is the right long shape, but it means
a bar, box or beeswarm over ``value`` draws a case count and a coverage
percentage against one axis - the dual-axis defect section 3 of the contract
exists to forbid, arriving through the back door. Where the split's groups
differ in magnitude beyond ``INCOMMENSURABLE_RATIO``, only the indexed and
faceted forms are offered.

**Editorial cuts are declared, never applied quietly.** A dumbbell needs exactly
two x-values and a line chart of 211 countries needs the top handful. Each
candidate names its own cut and the caption reports it to the reader.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .frames import top_by, where_rows
from .profile import ColumnProfile, DatasetProfile
from .spec import FORM_RULES, ChartFrame, ChartSpec

#: How many candidates to put in front of the model. Past roughly this many the
#: prompt stops fitting the small tier's context alongside the column summary.
MAX_CANDIDATES = 14

#: A nominal column whose values are nearly all distinct is an identifier - a
#: row id, a free-text note - and splitting a series by it produces one series
#: per row. Judged as a RATIO rather than an absolute count, because the honest
#: version of "too many countries" is a top-N cut, not dropping the column: a
#: fixed ceiling of 200 silently discarded `country` at 211 distinct and left
#: `line` with no colour channel, which draws 211 countries as one zigzag.
MAX_SPLIT_RATIO = 0.6

#: Beyond this ratio between the peak values of two groups inside one measure
#: column, the groups must not share a linear axis untransformed.
#:
#: The number is a READABILITY threshold, not a units one, because units are not
#: always knowable from a frame. Reaching this test at all means the split is
#: already a measure discriminator by name, so the groups are different metrics
#: by construction. At 10x the smaller series is drawn inside the bottom tenth
#: of the axis and its shape - which is the whole reason it is on a chart - is
#: illegible; the larger one has simply annexed the plot.
#:
#: Calibrated against the repo's own data rather than guessed. Measles reported
#: cases peak at 3852 (thousands) against MCV1 coverage at 86 (%): a ratio of
#: 44.8, two plainly different units, and a first attempt at 50.0 let it through.
INCOMMENSURABLE_RATIO = 10.0

#: A split column with one of these names DISCRIMINATES MEASURES: its groups are
#: different metrics folded into one value column, which is what long format
#: does with two units. Magnitude alone cannot detect this, and trying is a bug:
#: `country` peaks range over four orders of magnitude and is still one unit
#: throughout, so a ratio test on its own reads every country table as mixed.
#: Both signals are required - the name says the groups COULD be different
#: quantities, the ratio says they demonstrably ARE.
_MEASURE_SPLIT = re.compile(
    r"^(measure|measures|metric|metrics|indicator|variable|series|statistic)$", re.I
)


@dataclass
class FrameSource:
    """One table the selector may draw from, and what to call it.

    A registry dataset offers two: the world trend and the country table. They
    are different shapes, not two views of one shape, so the candidate list is
    built across both and every candidate remembers which it came from. Without
    that, choosing a dataset would silently also choose which half of it the
    reader is allowed to see.
    """

    name: str
    frame: ChartFrame
    profile: DatasetProfile


@dataclass
class Candidate:
    """One drawable figure: a form, a concrete encoding, and any cut it needs."""

    form: str
    encoding: dict[str, object]
    #: Which FrameSource this draws from.
    source: str = ""
    #: "none" | "top_n" | "endpoints" | "latest"
    slice: str = "none"
    slice_arg: object = None
    #: Modifiers this candidate must carry to be honest (e.g. bump wants rank).
    transform: str | None = None
    #: Spec modifiers the candidate sets itself, e.g. a horizontal bar. Only
    #: ones FORM_RULES[form].allows, or validate_spec rejects the result.
    modifiers: dict[str, object] = field(default_factory=dict)
    #: Machine-written seed for the model's rationale. Not shown to the reader.
    because: str = ""
    notes: list[str] = field(default_factory=list)

    @property
    def key(self) -> str:
        parts = [self.source, self.form] + [
            f"{k}={v}" for k, v in sorted(self.encoding.items()) if v
        ]
        return "|".join(parts) + f"|{self.slice}|{self.transform or ''}"


def _is_category(c: ColumnProfile) -> bool:
    """A nominal column usable as a CATEGORY AXIS - the x of a bar chart.

    One bar per value, so one row per value is the ideal case rather than a
    disqualifying one.
    """
    return c.type in ("nominal", "geo") and c.distinct >= 2


def _is_series_split(c: ColumnProfile, row_count: int) -> bool:
    """A nominal column usable as a SERIES SPLIT - the colour of a line chart.

    Stricter than a category, and the distinction is not pedantry. A series
    needs several points to BE a line, so a column with one row per value gives
    one-point series: a legitimate bar chart and a meaningless line. Rejecting
    it here while `_is_category` still accepts it is what lets a snapshot table
    (one row per country, no time axis) get bars without also getting lines.

    High cardinality alone is not disqualifying - that is what the `top_n` cut
    exists for. Being an identifier is.
    """
    if not _is_category(c):
        return False
    return not (row_count and c.distinct > row_count * MAX_SPLIT_RATIO)


def _longest_value(frame: ChartFrame, key: str) -> int:
    """The longest label in a column, for deciding bar orientation."""
    longest = 0
    for row in frame.rows:
        value = row.get(key)
        if value is not None:
            longest = max(longest, len(str(value)))
    return longest


def _incommensurable_ratio(frame: ChartFrame, split: ColumnProfile,
                           measure_key: str) -> float | None:
    """How far apart the split's groups are, or None if they are comparable.

    Two signals, both required. The column must NAME a measure discriminator,
    and its groups must actually differ by orders of magnitude. Either alone is
    wrong: `country` differs hugely in magnitude while staying one unit, and a
    column called `metric` whose two metrics are both percentages shares an axis
    perfectly well.

    Returns the ratio rather than a bool so the caller can put the real number
    in front of the model. Measured: told only that the measures "differ in
    magnitude", qwen3.5:4b wrote "two measures differing by ~3,000x" into a
    reader-facing rationale for a table whose true ratio is 44.8. A model with
    no number will invent one, and this is the cheapest possible fix.
    """
    if not (_MEASURE_SPLIT.match(split.key) or _MEASURE_SPLIT.match(split.label)):
        return None

    split_key = split.key
    peaks: dict[str, float] = {}
    for row in frame.rows:
        value = row.get(measure_key)
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            continue
        if value != value:  # NaN
            continue
        group = str(row.get(split_key) or "")
        peaks[group] = max(peaks.get(group, 0.0), abs(float(value)))

    usable = [p for p in peaks.values() if p > 0]
    if len(usable) < 2:
        return None
    ratio = max(usable) / min(usable)
    return ratio if ratio > INCOMMENSURABLE_RATIO else None


def _split_candidate(form: str, encoding: dict[str, object],
                     split: ColumnProfile, measure: ColumnProfile,
                     *, because: str, cap: int | None = None) -> Candidate:
    """A candidate whose colour column may carry more series than the form can.

    The cut is declared on the candidate and disclosed in the caption, never
    applied quietly: which items survive is an editorial choice and the reader
    is owed it.
    """
    ceiling = cap or FORM_RULES[form].max_series or 8
    over = split.distinct > ceiling
    return Candidate(
        form=form, encoding=encoding,
        slice="top_n" if over else "none",
        slice_arg=(split.key, measure.key, ceiling),
        because=because,
        notes=([f"{split.distinct} {split.label.lower()} values exceed the {ceiling} "
                f"this form carries, so it shows the largest {ceiling} by "
                f"{measure.label}."] if over else []),
    )


def candidates_for(source: FrameSource) -> list[Candidate]:
    """Every form this frame's column types can honestly satisfy."""
    profile, frame = source.profile, source.frame
    measures = profile.measures
    temporal = profile.temporal
    geo = [c for c in profile.columns if c.type == "geo"]
    categories = [c for c in profile.columns if c.type == "nominal" and _is_category(c)]
    splits = [
        c for c in categories if _is_series_split(c, profile.row_count)
    ]

    out: list[Candidate] = []
    t = temporal[0] if temporal else None
    #: `split` colours a series; `category` is an axis of bars. Often the same
    #: column, but not on a snapshot table, where only the latter applies.
    split = splits[0] if splits else None
    category = categories[0] if categories else None

    # Does the split mix units inside one measure column? If so, every form that
    # shares one linear axis across it is off the table, the indexed one aside.
    ratio = (
        _incommensurable_ratio(frame, split, measures[0].key)
        if split and measures else None
    )
    mixed = ratio is not None
    shared_axis_ok = not mixed

    # --- Trend over time -------------------------------------------------
    if t and measures:
        if mixed and split:
            m = measures[0]
            # The contract's own worked example, section 8.
            spread = f"{ratio:.0f}x" if ratio else "orders of magnitude"
            out.append(Candidate(
                form="line",
                encoding={"x": t.key, "y": m.key, "color": split.key},
                transform="indexed",
                because=(f"the groups in {split.label} peak {spread} apart in "
                         f"{m.label}; indexing is what lets them share an axis. "
                         f"The measured ratio is {spread} - do not state another "
                         "number"),
                notes=[f"Each series is indexed to 100 at its first {t.label}, so they "
                       "share one axis and neither is rescaled to meet the other."],
            ))
            out.append(Candidate(
                form="line",
                encoding={"x": t.key, "y": m.key, "facet": split.key},
                because=(f"one panel per {split.label}, each on its own scale; they "
                         f"peak {spread} apart and cannot share one. The measured "
                         f"ratio is {spread} - do not state another number"),
            ))
        else:
            for m in measures[:2]:
                if split:
                    out.append(_split_candidate(
                        "line", {"x": t.key, "y": m.key, "color": split.key},
                        split, m,
                        because=f"{m.label} moves over {t.label}, split by {split.label}",
                    ))
                else:
                    out.append(Candidate(
                        form="line", encoding={"x": t.key, "y": m.key},
                        because=f"{m.label} moves over {t.label}",
                    ))

            if split:
                out.append(_split_candidate(
                    "area", {"x": t.key, "y": measures[0].key, "color": split.key},
                    split, measures[0], cap=6,
                    because=f"how {measures[0].label} composes across {split.label}",
                ))

    # --- Magnitude across categories -------------------------------------
    if category and measures and shared_axis_ok:
        m = measures[0]
        # "Horizontal is the only readable option once category names are long"
        # (MODIFIER_DOC in catalog.ts). Decided from the labels rather than left
        # to the model, which otherwise describes a horizontal bar in its
        # rationale while emitting a spec that draws a vertical one.
        long_names = _longest_value(frame, category.key) > 12
        for form in ("bar", "lollipop"):
            out.append(Candidate(
                form=form, encoding={"x": category.key, "y": m.key},
                modifiers={"orientation": "horizontal"} if long_names else {},
                slice="latest" if t else "none", slice_arg=(t.key if t else None),
                because=(f"{m.label} compared across {category.label}"
                         if form == "bar"
                         else f"a ranked comparison of {m.label}, where bar area "
                              "would overstate the difference"),
            ))

        if t:
            # The heatmap's `y` is the row dimension, not a series, so it takes
            # the category for the same reason the bar does.
            out.append(_split_candidate(
                "heatmap", {"x": t.key, "y": category.key, "color": m.key},
                category, m, cap=25,
                because=f"{category.label} x {t.label} at full resolution",
            ))

    # --- Change between two points ---------------------------------------
    if t and split and measures and shared_axis_ok:
        m = measures[0]
        for form in ("dumbbell", "slope"):
            out.append(Candidate(
                form=form,
                encoding={"x": t.key, "y": m.key, "color": split.key},
                slice="endpoints",
                slice_arg=(t.key, split.key, m.key, FORM_RULES[form].max_series or 10),
                because=f"{m.label} at the first and last {t.label}, per {split.label}",
            ))
        out.append(Candidate(
            form="bump",
            encoding={"x": t.key, "y": m.key, "color": split.key},
            transform="rank",
            slice="top_n", slice_arg=(split.key, m.key, 10),
            because=f"how the ORDER of {split.label} by {m.label} changed",
            notes=["Rank discards the magnitudes by design; this figure is about "
                   "position changing, not about the values."],
        ))

    # --- Relationship between measures ------------------------------------
    if len(measures) >= 2:
        a, b = measures[0], measures[1]
        enc: dict[str, object] = {"x": a.key, "y": b.key}
        if split:
            enc["color"] = split.key
        out.append(Candidate(
            form="scatter", encoding=dict(enc),
            slice="latest" if t else "none", slice_arg=(t.key if t else None),
            because=f"whether {a.label} and {b.label} travel together",
        ))
        if t and split:
            out.append(Candidate(
                form="connectedScatter",
                encoding={"x": a.key, "y": b.key, "color": split.key},
                slice="top_n", slice_arg=(split.key, a.key, 3),
                because=f"the trajectory of {a.label} against {b.label} through time",
            ))
    if len(measures) >= 3 and split:
        out.append(Candidate(
            form="parallelCoordinates",
            encoding={"measures": [m.key for m in measures[:5]], "color": split.key},
            slice="top_n", slice_arg=(split.key, measures[0].key, 8),
            because="one profile line per item across several measures",
        ))

    # --- Geography ---------------------------------------------------------
    if geo and measures:
        g = geo[0]
        enc = {"geo": g.key, "color": measures[0].key}
        if t:
            enc["x"] = t.key
        out.append(Candidate(
            form="choropleth", encoding=enc,
            because=f"{measures[0].label} by country",
        ))
        if len(measures) >= 2:
            out.append(Candidate(
                form="bivariateChoropleth",
                encoding={"geo": g.key, "color": measures[0].key,
                          "color2": measures[1].key},
                slice="latest" if t else "none", slice_arg=(t.key if t else None),
                because=(f"which places are high on {measures[0].label} and low on "
                         f"{measures[1].label}"),
            ))

    # --- Distribution ------------------------------------------------------
    # Meaningful only when y holds one kind of quantity, and only interesting
    # when each x-slice holds enough items to have a spread at all.
    if measures and shared_axis_ok:
        x = t or category
        m = measures[0]
        if x and profile.row_count >= 3 * max(1, x.distinct):
            for form in ("beeswarm", "box", "ridgeline"):
                out.append(Candidate(
                    form=form, encoding={"x": x.key, "y": m.key},
                    because=(f"the spread of {m.label} within each {x.label}, "
                             "which an average hides"),
                ))

    # --- Headline ----------------------------------------------------------
    if measures and shared_axis_ok:
        m = measures[0]
        enc = {"y": m.key}
        if t:
            enc["x"] = t.key
        out.append(Candidate(form="statTile", encoding=enc,
                             because=f"{m.label} as a single headline number"))

    seen: set[str] = set()
    unique: list[Candidate] = []
    for c in out:
        if c.key in seen:
            continue
        seen.add(c.key)
        unique.append(c)
    return unique


def candidates_across(sources: list[FrameSource]) -> list[Candidate]:
    """Candidates from every source, truncated by variety rather than by order.

    Two things go wrong with a plain concatenate-and-cut. One table generates
    far more candidates than another, so appending pushes the smaller table out
    entirely - including, for a registry dataset, the indexed two-measure line
    that is the contract's own worked example. And within one table the forms
    arrive grouped, so a naive cut hands the model three line charts and no map.

    So the fill walks the sources round-robin and, within each, takes the
    candidate whose form has been used least so far. Every table is represented,
    and every form the data can carry gets a slot before any form gets a second.
    """
    pools: list[list[Candidate]] = []
    for source in sources:
        pool = candidates_for(source)
        for c in pool:
            c.source = source.name
        pools.append(pool)

    # How many tables can offer each form. A form only one table can draw - the
    # choropleth, which needs the geo column the country table alone has - must
    # outrank a form both tables offer, or it loses every tie on list order and
    # never reaches the model. That is how the map went missing twice here.
    offered_by: dict[str, int] = {}
    for pool in pools:
        for form in {c.form for c in pool}:
            offered_by[form] = offered_by.get(form, 0) + 1

    used: dict[str, int] = {}
    out: list[Candidate] = []

    while len(out) < MAX_CANDIDATES and any(pools):
        progressed = False
        for pool in pools:
            if not pool or len(out) >= MAX_CANDIDATES:
                continue
            pool.sort(key=lambda c: (used.get(c.form, 0), offered_by.get(c.form, 1)))
            pick = pool.pop(0)
            used[pick.form] = used.get(pick.form, 0) + 1
            out.append(pick)
            progressed = True
        if not progressed:
            break
    return out


def apply_slice(frame: ChartFrame, candidate: Candidate) -> ChartFrame:
    """The cut a candidate declares. Editorial, and therefore never silent."""
    if candidate.slice == "none" or not frame.rows:
        return frame

    if candidate.slice == "latest":
        x_key = candidate.slice_arg
        if not x_key:
            return frame
        values = [r.get(x_key) for r in frame.rows if r.get(x_key) is not None]
        if not values:
            return frame
        newest = max(values, key=_sort_key)
        return where_rows(frame, lambda r: r.get(x_key) == newest)

    if candidate.slice == "top_n":
        item_key, measure, n = candidate.slice_arg
        keep = set(top_by(frame, item_key, measure, n))
        if not keep:
            return frame
        return where_rows(frame, lambda r: str(r.get(item_key) or "") in keep)

    if candidate.slice == "endpoints":
        x_key, item_key, measure, n = candidate.slice_arg
        values = [r.get(x_key) for r in frame.rows if r.get(x_key) is not None]
        if len({str(v) for v in values}) < 2:
            return frame
        first, last = min(values, key=_sort_key), max(values, key=_sort_key)
        ends = where_rows(frame, lambda r: r.get(x_key) in (first, last))
        keep = set(top_by(ends, item_key, measure, n))
        if keep:
            ends = where_rows(ends, lambda r: str(r.get(item_key) or "") in keep)
        return ends

    return frame


def _sort_key(value: object) -> tuple[int, float, str]:
    """Order values that may be numbers or strings without comparing across."""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return (0, float(value), "")
    return (1, 0.0, str(value))


def spec_of(candidate: Candidate, *, title: str, rationale: str, **copy) -> ChartSpec:
    """A candidate plus the model's copy, as a spec ready to validate."""
    encoding = dict(candidate.encoding)
    measures = encoding.pop("measures", [])
    return ChartSpec(
        form=candidate.form,
        encoding={**encoding, "measures": measures},  # type: ignore[arg-type]
        transform=candidate.transform,
        title=title,
        rationale=rationale,
        **candidate.modifiers,  # type: ignore[arg-type]
        **copy,
    )
