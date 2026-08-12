"""The guardrail, mirroring ``lib/charts/validate.ts`` rule for rule.

Same split as the frontend: **errors** mean the figure would misrepresent the
data or cannot be drawn, and nothing renders past one; **warnings** mean the
figure is legitimate but working against the reader, and it renders with the
note attached.

Running it here buys two things the frontend copy cannot. A bad spec is caught
before it reaches a browser, and - the point of having it at generation time -
the errors are text a model can be handed to retry against. ``select.py`` does
exactly that, so a local model gets a second attempt with its own mistake
quoted back at it rather than the reader getting a refusal panel.

The numbered comments match the numbered sections of validate.ts. If a rule
changes there, change it here in the same commit; ``ChartValidatorParityTests``
checks the shared cases but cannot invent a rule that only exists on one side.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .spec import (
    FORM_RULES,
    SINGLE_CHANNELS,
    ChartFrame,
    ChartSpec,
    column_of,
)

#: Spec field paired with the ``FormRule.allows`` token that permits it.
MODIFIERS: tuple[tuple[str, str], ...] = (
    ("stack", "stack"),
    ("orientation", "orientation"),
    ("baseline", "baseline"),
    ("emphasis", "emphasis"),
    ("breaks", "breaks"),
)

_PLACE = re.compile(r"country|countries|location|region|state|nation", re.I)
_DENOMINATOR = re.compile(r"population|pop\b|denominator|births|exposure", re.I)


@dataclass
class ValidationResult:
    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def distinct_values(frame: ChartFrame, key: str | None) -> list[object]:
    """Mirrors ``distinctValues``: first-seen order, nulls skipped."""
    if not key:
        return []
    seen: set[str] = set()
    out: list[object] = []
    for row in frame.rows:
        value = row.get(key)
        if value is None:
            continue
        as_key = _js_str(value)
        if as_key in seen:
            continue
        seen.add(as_key)
        out.append(value)
    return out


def group_by(rows: list[dict], key: str | None) -> dict[str, list[dict]]:
    """Mirrors ``groupBy``: a single "" bucket when no key is given."""
    if not key:
        return {"": rows}
    out: dict[str, list[dict]] = {}
    for row in rows:
        value = row.get(key)
        bucket = "" if value is None else _js_str(value)
        out.setdefault(bucket, []).append(row)
    return out


def _js_str(value: object) -> str:
    """``String(v)`` as JavaScript would render it.

    Only floats differ in a way that matters here: JS prints 1980.0 as "1980",
    so a year read out of a CSV by pandas must key the same bucket as a year
    that arrived as an int, or a facet count silently doubles.
    """
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def validate_spec(spec: ChartSpec, frame: ChartFrame) -> ValidationResult:
    errors: list[str] = []
    warnings: list[str] = []

    rule = FORM_RULES.get(spec.form)
    if rule is None:
        return ValidationResult(False, [f'Unknown chart form "{spec.form}".'], warnings)

    allowed = set(rule.required) | set(rule.optional)
    enc = spec.encoding

    # 1. Required channels, and every channel resolving to a real column.
    for channel in rule.required:
        if channel == "measures":
            if not enc.measures:
                errors.append(f"{spec.form} needs encoding.measures.")
            continue
        if not getattr(enc, channel, None):
            errors.append(f"{spec.form} needs encoding.{channel}.")

    for channel in SINGLE_CHANNELS:
        key = getattr(enc, channel, None)
        if not key:
            continue
        if channel not in allowed:
            errors.append(f"{spec.form} does not use encoding.{channel}.")
            continue
        if column_of(frame, key) is None:
            errors.append(
                f'encoding.{channel} names "{key}", which is not a column in the frame.'
            )

    for key in enc.measures:
        if column_of(frame, key) is None:
            errors.append(
                f'encoding.measures names "{key}", which is not a column in the frame.'
            )

    # 2. Channel types. The value axis carries a measure, never a label - except
    #    on the heatmap, whose `y` is the row dimension.
    y = column_of(frame, enc.y)
    if y is not None and y.type not in rule.y_accepts:
        errors.append(
            f"{spec.form} binds y to {_describe_types(rule.y_accepts)}; "
            f'"{y.key}" is {y.type}.'
        )

    size = column_of(frame, enc.size)
    if size is not None and size.type != "quantitative":
        errors.append(f'encoding.size must be quantitative; "{size.key}" is {size.type}.')

    geo = column_of(frame, enc.geo)
    if geo is not None and geo.type != "geo":
        errors.append(f'encoding.geo must be a geo column; "{geo.key}" is {geo.type}.')

    color = column_of(frame, enc.color)
    if color is not None and color.type not in rule.color_accepts:
        errors.append(
            f"{spec.form} binds colour to {_describe_types(rule.color_accepts)}; "
            f'"{color.key}" is {color.type}.'
        )

    # 3. Modifiers the form does not honour are rejected, never ignored. A spec
    #    that quietly drops `stack` renders a chart nobody asked for.
    for field_name, token in MODIFIERS:
        if getattr(spec, field_name, None) is None:
            continue
        if token not in rule.allows:
            errors.append(f'{spec.form} does not honour "{field_name}".')

    # 4. Transform prerequisites.
    if spec.transform == "perCapita":
        if not spec.denominator:
            errors.append('transform "perCapita" needs a denominator column.')
        else:
            den = column_of(frame, spec.denominator)
            if den is None:
                errors.append(
                    f'denominator names "{spec.denominator}", which is not in the frame.'
                )
            elif den.type != "quantitative":
                errors.append(
                    f'denominator "{den.key}" must be quantitative; it is {den.type}.'
                )
    if spec.denominator and spec.transform != "perCapita":
        warnings.append(
            f'A denominator is declared but transform is "{spec.transform or "raw"}", '
            "so it is unused."
        )
    if spec.transform == "indexed" and not enc.x:
        errors.append('transform "indexed" needs encoding.x to order the series.')

    # 5. The dropped-denominator check. Comparing raw counts across places of
    #    very different size is the rubric's own example of a misleading figure.
    if (spec.transform or "raw") == "raw" and _compares_places(spec) and _has_population(frame):
        warnings.append(
            "Raw counts are compared across places of different size while a population "
            'column is available. Consider transform "perCapita".'
        )

    # 6. Forms that are only meaningful across exactly two x-slices.
    if spec.form in ("dumbbell", "slope"):
        xs = distinct_values(frame, enc.x)
        if len(xs) != 2:
            errors.append(
                f"{spec.form} needs exactly two x values; the frame has {len(xs)}."
            )

    # 7. A bump without a rank transform renders something plausible and wrong.
    if spec.form == "bump" and spec.transform != "rank":
        warnings.append('bump plots position, so it usually wants transform "rank".')

    # 8. Series count. Past the ceiling the answer is emphasis, a facet or a
    #    table, never more hues. `emphasis` already collapses the series to two
    #    visual classes, so a chart using it is exempt; and when faceted the
    #    count that matters is the largest in any ONE panel, not the total.
    if rule.max_series is not None and enc.color and not spec.emphasis:
        panels = group_by(frame.rows, enc.facet).values()
        counts = [
            len(distinct_values(ChartFrame(columns=frame.columns, rows=rows), enc.color))
            for rows in panels
        ]
        n = max(counts) if counts else 0
        if n > rule.max_series:
            warnings.append(
                f"{n} series exceeds the {rule.max_series} this form carries. "
                'Use emphasis, a facet, or fold the tail into "Other".'
            )

    # 9. Emphasis must name a series that exists, or it silently greys everything.
    if spec.emphasis and enc.color:
        values = [_js_str(v) for v in distinct_values(frame, enc.color)]
        if spec.emphasis not in values:
            errors.append(f'emphasis "{spec.emphasis}" is not a value in "{enc.color}".')

    # 10. Declared breaks must ascend, or the binning silently mis-bins.
    if spec.breaks:
        ascending = all(
            i == 0 or b > spec.breaks[i - 1] for i, b in enumerate(spec.breaks)
        )
        if not ascending:
            errors.append("breaks must be four strictly ascending numbers.")

    # 11. Copy. A figure with no title and no stated reason is not finished.
    if not (spec.title or "").strip():
        errors.append("A spec needs a title.")
    if not (spec.rationale or "").strip():
        errors.append("A spec needs a rationale: why this form, over the alternatives.")

    # 12. Frame sanity.
    if not frame.rows:
        errors.append("The frame has no rows.")

    return ValidationResult(ok=not errors, errors=errors, warnings=warnings)


def _compares_places(spec: ChartSpec) -> bool:
    """True when the figure puts several named places side by side."""
    if spec.encoding.geo:
        return True
    split = spec.encoding.color or spec.encoding.x or ""
    return bool(_PLACE.search(split))


def _has_population(frame: ChartFrame) -> bool:
    """True when a denominator was available and could have been used."""
    return any(
        c.type == "quantitative" and _DENOMINATOR.search(c.key) for c in frame.columns
    )


def _describe_types(types: tuple[str, ...]) -> str:
    return f"a {types[0]} column" if len(types) == 1 else " or ".join(types)
