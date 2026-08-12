"""An uploaded CSV -> the same ``DatasetSpec`` the registry declares by hand.

``uploads.py`` parked uploads because a story pipeline needs to know which
column is the measure, which is the comparison and which row is the aggregate,
and a table states none of that about itself. ``charts/profile.py`` then showed
that the narrower question - each column's TYPE - the data does answer, which
was enough to draw figures.

This module takes the remaining step by DECIDING the editorial part from the
types rather than asking a human for it. That is a real loss of certainty and
the reason every choice here is recorded in an :class:`InferredMapping` and
rendered next to the story: a guess a reader can see and overrule at a glance is
a different object from a guess buried in a prompt.

Two rules keep the guess from becoming a claim:

* **Nothing is invented.** A unit is used only when the column name states one,
  a reference line is never synthesised, and the failure mode stays
  ``"unknown"`` rather than being assigned by vibe.
* **A missing ingredient is a refusal, not a default.** No time column or no
  measure means the file is chartable but not generatable, and says so.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

import pandas as pd

from .charts.profile import ColumnProfile, is_country_code, profile_frame

# An entity row that stands for all the others. Checked against the values of
# the entity column, not the header: OWID ships "World" in the same column as
# every country, which is exactly the trap the chart work hit when a bar chart
# ranked "World" as a peer of Nigeria.
_AGGREGATE_NAME = re.compile(
    r"^\s*(world|global|worldwide|total|all|overall|all countries|"
    r"all entities|sum|aggregate)\s*$",
    re.I,
)

# A measure whose name says it is already a rate, a share or an index. Such a
# column is AVERAGED to form an aggregate row; anything else is SUMMED. Getting
# this backwards is not a rounding error - a summed vaccination coverage over
# 200 countries reads as 17,000%.
_RATE_NAME = re.compile(
    r"(rate|pct|percent|percentage|coverage|share|ratio|index|per_?\d|"
    r"per_?(hundred|thousand|million|capita)|average|mean|median|expectancy|"
    r"score|density)",
    re.I,
)

# A unit the column name states outright. Never guessed from the values: a
# column of numbers between 0 and 100 is not necessarily a percentage, and
# labelling it one would put a unit in the agent's prompt that the source never
# claimed.
_UNIT_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"(pct|percent|percentage|coverage|share)", re.I), "%"),
    (re.compile(r"per_?100_?000|per_?100k", re.I), "per 100,000"),
    (re.compile(r"per_?1_?000_?000|per_?million", re.I), "per million"),
    (re.compile(r"per_?1_?000|per_?thousand", re.I), "per 1,000"),
    (re.compile(r"per_?capita", re.I), "per capita"),
    (re.compile(r"\busd\b|dollar", re.I), "USD"),
    (re.compile(r"\byears?\b", re.I), "years"),
]

#: The prompt table is prepended to every agent call, so it stays small. The
#: registry specs list 15 years by hand; an upload gets the same budget, first
#: and last always included so the span the story talks about is never clipped.
MAX_SERIES_YEARS = 15

#: How many entities the "country detail" block names. Three keeps the pack
#: short; the registry specs use four for a dataset a human curated.
SPOTLIGHT_SIZE = 3


class NotGeneratable(ValueError):
    """The file can be charted but cannot carry a data story.

    Raised with the reason in the reader's terms, because it is shown verbatim
    the same way ``UploadRejected`` is.
    """


@dataclass(frozen=True)
class InferredMapping:
    """Every editorial decision taken on the reader's behalf, and its basis."""

    time_col: str
    entity_col: str | None
    aggregate_row: str
    #: "found"    the table already contained an aggregate row
    #: "computed" one was derived by summing or averaging the entities
    #: "single"   the table describes one entity, which is its own aggregate
    aggregate_basis: str
    aggregate_rule: str
    primary_col: str
    primary_label: str
    primary_unit: str
    secondary_col: str | None
    secondary_label: str
    secondary_unit: str
    spotlight: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def sentence(self) -> str:
        """The one line the interface prints under an uploaded table.

        Written as a claim about how the file was READ, not about what it
        means, so a wrong inference reads as a wrong reading and not as a fact
        about the world.
        """
        parts = [f"Read as: {self.primary_label} by {self.time_col}"]
        if self.secondary_col:
            parts.append(f", compared with {self.secondary_label}")
        if self.aggregate_basis == "found":
            parts.append(f'; the row "{self.aggregate_row}" taken as the total')
        elif self.aggregate_basis == "computed":
            parts.append(f"; no total row in the file, so one was {self.aggregate_rule}")
        else:
            parts.append("; the file describes a single series")
        parts.append(". Inferred from column types, not declared.")
        return "".join(parts)


def _unit_of(column: ColumnProfile) -> str:
    if column.unit:
        return column.unit
    for pattern, unit in _UNIT_PATTERNS:
        if pattern.search(column.key) or pattern.search(column.label):
            return unit
    return ""


def _is_rate(column: ColumnProfile) -> bool:
    """Does this measure describe a rate rather than a count?

    Name first, then range. The name is the stronger signal and the only one
    that survives a column whose values happen to sit under 100 by accident.
    """
    if _RATE_NAME.search(column.key) or _RATE_NAME.search(column.label):
        return True
    return bool(
        column.minimum is not None
        and column.maximum is not None
        and column.minimum >= 0
        and column.maximum <= 100
        and column.decimals > 0
    )


def _pick_time(profile) -> ColumnProfile:
    temporal = profile.temporal
    if not temporal:
        raise NotGeneratable(
            "No time column found. A data story needs a year or date column to "
            "describe a trend; the figures below do not."
        )
    # Most complete wins: a table with both a year and a sparse survey date
    # should narrate on the one that covers the table.
    return sorted(temporal, key=lambda c: (c.missing, -c.distinct))[0]


def _holds_codes(df: pd.DataFrame, key: str) -> bool:
    """Is this column ISO3 codes rather than names?

    OWID exports ship both: `Entity` = "Afghanistan", `Code` = "AFG". They are
    the same dimension, and picking the wrong one is not cosmetic - the pack
    reads "AFG: 148" and the story then names a country nobody says out loud.
    """
    values = df[key].dropna().astype(str).unique()[:50]
    if len(values) == 0:
        return False
    return sum(is_country_code(v) for v in values) / len(values) > 0.8


def _pick_entity(profile, df: pd.DataFrame, time_key: str) -> ColumnProfile | None:
    """The column naming the thing each row is about, if there is one."""
    candidates = [
        c for c in profile.dimensions
        if c.key != time_key and 1 < c.distinct < max(2, len(df))
    ]
    if not candidates:
        return None
    # Names before codes, then the column with the most values: a country column
    # carries more of the table's structure than a two-valued sex or a
    # three-valued region does. A code column is not discarded - `_spotlight`
    # uses it to tell countries from the aggregates sharing the same column.
    return sorted(
        candidates,
        key=lambda c: (_holds_codes(df, c.key), -c.distinct),
    )[0]


def _pick_measures(profile, time_key: str) -> tuple[ColumnProfile, list[ColumnProfile]]:
    measures = [c for c in profile.measures if c.key != time_key]
    if not measures:
        raise NotGeneratable(
            "No numeric column left once the time column is set aside. A data "
            "story needs at least one measure to talk about."
        )
    # Completeness first: a column present for a third of the rows makes a
    # story of gaps. Ties break on spread, because a column that never moves
    # gives a narrator nothing to narrate.
    def rank(c: ColumnProfile) -> tuple[float, float]:
        spread = 0.0
        if c.minimum is not None and c.maximum is not None:
            spread = abs(c.maximum - c.minimum)
        return (c.missing, -spread)

    ordered = sorted(measures, key=rank)
    primary = ordered[0]
    # The comparison is more informative on a different scale from the headline
    # measure - counts against coverage is the pairing both registry datasets
    # use - so measures of the opposite kind come first. A LIST rather than one
    # pick, because whether a candidate is usable is not knowable until the
    # aggregate row exists: see the coverage check in `infer`.
    rest = ordered[1:]
    opposite = [c for c in rest if _is_rate(c) != _is_rate(primary)]
    same = [c for c in rest if _is_rate(c) == _is_rate(primary)]
    return primary, opposite + same


def _series_years(years: list[int]) -> list[int]:
    """At most ``MAX_SERIES_YEARS``, always keeping the first and the last."""
    if len(years) <= MAX_SERIES_YEARS:
        return years
    step = (len(years) - 1) / (MAX_SERIES_YEARS - 1)
    picked = {years[round(i * step)] for i in range(MAX_SERIES_YEARS)}
    picked.update({years[0], years[-1]})
    return sorted(picked)


def _aggregate(
    df: pd.DataFrame,
    entity_key: str | None,
    primary: ColumnProfile,
    secondary: ColumnProfile | None,
) -> tuple[pd.DataFrame, str, str, str]:
    """Return the frame with an aggregate row guaranteed, and how it got one."""
    if entity_key is None:
        df = df.copy()
        df["country"] = "This table"
        return df, "This table", "single", ""

    names = df[entity_key].dropna().astype(str).unique().tolist()
    found = [n for n in names if _AGGREGATE_NAME.match(n)]
    if found:
        # Longest match wins so "All countries" beats "All" when a table has
        # both, which is the more specific of the two.
        return df, sorted(found, key=len, reverse=True)[0], "found", ""
    if len(names) == 1:
        return df, names[0], "single", ""

    rules: list[str] = []
    frames: dict[str, pd.Series] = {}
    grouped = df.groupby("year", dropna=True)
    for column in (c for c in (primary, secondary) if c is not None):
        if _is_rate(column):
            frames[column.key] = grouped[column.key].mean()
            rules.append(f"{column.label} averaged")
        else:
            frames[column.key] = grouped[column.key].sum(min_count=1)
            rules.append(f"{column.label} summed")

    label = "All entities (computed)"
    computed = pd.DataFrame(frames).reset_index()
    computed[entity_key] = label
    df = pd.concat([df, computed], ignore_index=True)
    return df, label, "computed", " and ".join(rules) + " across every row of each year"


def _spotlight(
    df: pd.DataFrame,
    profile,
    original_entity_key: str | None,
    aggregate_row: str,
    primary_key: str,
    latest: int,
) -> list[str]:
    """The entities the pack names, largest first, aggregates excluded.

    The exclusion is the same defect the chart work found in the OWID tables:
    an aggregate outranks every country it contains, so a "biggest three" that
    keeps World, Africa and the income groups is not a ranking of places.
    """
    if original_entity_key is None:
        return []
    rows = df[(df["year"] == latest) & (df["country"] != aggregate_row)]
    rows = rows.dropna(subset=[primary_key])
    if rows.empty:
        return []

    # The companion code column, if the table ships one. Compared against the
    # ORIGINAL key: the entity column was renamed to "country" by `_normalise`,
    # so matching on the new name would find the entity column itself and
    # filter the ranking against the very thing being ranked.
    geo = next(
        (c for c in profile.columns
         if c.type == "geo" and c.key != original_entity_key and c.key in rows.columns),
        None,
    )
    if geo is not None:
        coded = rows[rows[geo.key].apply(is_country_code)]
        if not coded.empty:
            rows = coded
    else:
        rows = rows[~rows["country"].astype(str).str.match(_AGGREGATE_NAME)]

    ranked = rows.sort_values(primary_key, ascending=False)
    return [str(v) for v in ranked["country"].head(SPOTLIGHT_SIZE).tolist()]


def _normalise(df: pd.DataFrame, time_key: str, entity_key: str | None) -> pd.DataFrame:
    """Rename the chosen columns onto the frame convention the registry uses.

    Every consumer downstream - the prompt table, the chart series, the
    groundedness values - reads ``country`` and ``year``. Renaming here is what
    lets an upload travel the registry's code path instead of a parallel one
    that would drift from it.
    """
    df = df.copy()
    # A column already sitting on one of the reserved names, which was not the
    # one chosen, would be silently overwritten by the rename below.
    for reserved, chosen in (("year", time_key), ("country", entity_key)):
        if reserved in df.columns and reserved != chosen:
            df = df.rename(columns={reserved: f"{reserved}_original"})
    renames = {time_key: "year"}
    if entity_key is not None:
        renames[entity_key] = "country"
    df = df.rename(columns=renames)

    years = pd.to_numeric(df["year"], errors="coerce")
    if years.dropna().empty:
        raise NotGeneratable(
            f'The time column "{time_key}" holds no numbers a year can be read '
            "from, so there is no trend to narrate."
        )
    df = df.loc[years.notna()].copy()
    df["year"] = years.dropna().astype(int)
    return df


def infer(record) -> tuple[object, pd.DataFrame, InferredMapping]:
    """An ``UploadedDataset`` -> ``(DatasetSpec, frame, mapping)``.

    Imported lazily inside :mod:`datasets` rather than the other way round, so
    the registry stays the module that knows nothing about uploads.
    """
    from .datasets import DatasetSpec

    raw = pd.read_csv(record.stored_path)
    profile, df = profile_frame(raw)

    time = _pick_time(profile)
    entity = _pick_entity(profile, df, time.key)
    primary, candidates = _pick_measures(profile, time.key)

    df = _normalise(df, time.key, entity.key if entity else None)
    entity_key = "country" if entity else None
    df, aggregate_row, aggregate_basis, aggregate_rule = _aggregate(
        df, entity_key, primary, candidates[0] if candidates else None
    )

    agg = df[df["country"] == aggregate_row].dropna(subset=[primary.key])

    # A comparison column the aggregate row does not report is worse than no
    # comparison column: the pack would promise two measures in its header and
    # then print "n/a" on every line, and the generator narrates what it is
    # given. OWID's tuberculosis export is exactly this - case detection is
    # published per country and not for World. So the first candidate the
    # AGGREGATE actually carries wins, and if none does there is no second
    # measure and the notes say why.
    secondary = None
    rejected: list[str] = []
    for candidate in candidates:
        if candidate.key in agg.columns and agg[candidate.key].notna().any():
            secondary = candidate
            break
        rejected.append(candidate.label)
    years = sorted({int(y) for y in agg["year"].tolist()})
    if not years:
        raise NotGeneratable(
            f'No year of "{primary.label}" survives for {aggregate_row}, so the '
            "pack would be empty."
        )
    latest = years[-1]
    spotlight = _spotlight(
        df, profile, entity.key if entity else None, aggregate_row, primary.key, latest
    )

    primary_unit = _unit_of(primary)
    secondary_unit = _unit_of(secondary) if secondary else ""
    notes = list(profile.notes)
    if aggregate_basis == "computed":
        notes.append(f"No total row in the file; one was {aggregate_rule}.")
    if secondary is None and rejected:
        notes.append(
            f"{', '.join(rejected)} is not reported for {aggregate_row}, so the story "
            "is told from one measure."
        )
    elif secondary is None:
        notes.append("Only one measure in the file, so the pack has no comparison column.")

    spec = DatasetSpec(
        id=str(record.id),
        name=record.original_name,
        short_name=record.original_name.removesuffix(".csv")[:40],
        tagline=f"Uploaded table, read as {primary.label} by year.",
        role="secondary",
        # Not inferable and not invented. Both tone axes are judged and drawn
        # for every story anyway, so nothing downstream needs this to be one of
        # the two declared modes - it only needs to not lie about which.
        failure_mode="unknown",
        failure_mode_label="Failure mode not declared - uploaded table",
        year_range=f"{years[0]}-{years[-1]}",
        granularity="entity x year" if entity else "year",
        sources=[f"Uploaded file: {record.original_name}"],
        description=(
            f"An uploaded CSV of {len(df):,} rows. Its columns were typed from the "
            "data and its measures chosen automatically; nothing about what they "
            "mean was declared by a human."
        ),
        csv="",
        primary_label=primary.label,
        secondary_label=secondary.label if secondary else "",
        primary_unit=primary_unit,
        secondary_unit=secondary_unit,
        primary_col=primary.key,
        secondary_col=secondary.key if secondary else None,
        aggregate_row=aggregate_row,
        primary_col_unit=primary_unit,
        # Never synthesised: a reference line is an editorial claim about where
        # a threshold sits, and no table states one.
        reference_line=None,
        spotlight=spotlight,
        series_years=_series_years(years),
    )
    mapping = InferredMapping(
        time_col=time.label,
        entity_col=entity.label if entity else None,
        aggregate_row=aggregate_row,
        aggregate_basis=aggregate_basis,
        aggregate_rule=aggregate_rule,
        primary_col=primary.key,
        primary_label=primary.label,
        primary_unit=primary_unit,
        secondary_col=secondary.key if secondary else None,
        secondary_label=secondary.label if secondary else "",
        secondary_unit=secondary_unit,
        spotlight=spotlight,
        notes=notes,
    )
    return spec, df, mapping
