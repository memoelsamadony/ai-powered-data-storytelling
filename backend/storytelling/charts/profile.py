"""An arbitrary CSV -> typed columns. The step that was missing.

``uploads.py`` says plainly why nothing downstream could use an upload::

    Parked, not wired: ... an arbitrary table cannot join the dataset registry
    without a human first saying what its columns mean.

That is still true of the *registry*, and this module does not change it: an
upload does not become a ``Dataset``. What it does is supply the narrower thing
the chart contract actually needs, which is not meaning but **type**. Every rule
in ``validate.py`` turns on the four values of ``ColumnType`` - is ``y`` a
measure, is ``geo`` really geographic, is the colour column nominal - and none
of them need to know that a column is *measles cases* rather than *road deaths*.

So the human step ``uploads.py`` is waiting for is narrowed to a question the
data can answer for itself, and where it cannot, the column is typed ``nominal``
and simply carries fewer forms. Guessing wrong is not silent: the inferred type,
the confidence and the evidence go back in the response, so a wrong call shows
up as a visible column label rather than a chart that quietly means something
else.

Two shapes get normalised here as well, because they are shapes rather than
meanings: a **wide** table with one column per year is melted to long, and a
table longer than the row cap is thinned, both with a note saying so.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from .spec import ChartColumn, ChartFrame

#: Beyond this the payload stops being a chart and becomes a download. The cap
#: is applied by dropping whole x-slices, never by truncating, so a thinned
#: frame is still a complete picture at lower resolution rather than a series
#: that stops halfway across the axis for no reason the reader can see.
MAX_FRAME_ROWS = 6000

#: A four-digit number in this window is a year rather than a quantity. Bounded
#: on both sides on purpose: 1850 is a plausible year and 3200 is a plausible
#: count of something, and the whole point is to not read one as the other.
YEAR_MIN, YEAR_MAX = 1800, 2100

_GEO_NAME = re.compile(r"^(iso_?3|iso_?a3|iso|country_?code|adm0_?a3|geo)$", re.I)
_COUNTRY_NAME = re.compile(r"^(country|countries|location|nation|area|entity|state)$", re.I)
_TIME_NAME = re.compile(r"^(year|yr|date|period|time|month|quarter)$", re.I)
_ISO3 = re.compile(r"^[A-Z]{3}$")


@dataclass
class ColumnProfile:
    """One column, typed, with the evidence for the call."""

    key: str
    label: str
    type: str
    unit: str = ""
    decimals: int = 0
    #: "declared" when the header named it, "inferred" when the values did.
    basis: str = "inferred"
    evidence: str = ""
    missing: float = 0.0
    distinct: int = 0
    minimum: float | None = None
    maximum: float | None = None

    def as_column(self) -> ChartColumn:
        return ChartColumn(key=self.key, label=self.label, type=self.type,
                           unit=self.unit, decimals=self.decimals)


@dataclass
class DatasetProfile:
    """What ``describe_dataset`` in the contract's section 6 is supposed to return."""

    columns: list[ColumnProfile]
    row_count: int
    notes: list[str] = field(default_factory=list)

    @property
    def measures(self) -> list[ColumnProfile]:
        return [c for c in self.columns if c.type == "quantitative"]

    @property
    def dimensions(self) -> list[ColumnProfile]:
        return [c for c in self.columns if c.type in ("nominal", "geo")]

    @property
    def temporal(self) -> list[ColumnProfile]:
        return [c for c in self.columns if c.type == "temporal"]

    def magnitude_ratio(self) -> float | None:
        """Largest median over smallest, across the measures.

        This is the number that tells an agent it must index rather than plot
        two measures on one axis. Returning it is what makes the choice
        derivable from the data instead of guessed from a prompt.
        """
        medians = [
            abs(c.maximum) for c in self.measures
            if c.maximum is not None and abs(c.maximum) > 0
        ]
        if len(medians) < 2:
            return None
        return max(medians) / min(medians)


def is_country_code(value: object) -> bool:
    """Does this value look like an ISO3 country code?

    Used past the typing step to tell individual places apart from the
    aggregates published alongside them. A table of countries routinely carries
    "World", continents and income groups in the same column, and those rows
    are sums of the others rather than peers of them.
    """
    if value is None:
        return False
    return bool(_ISO3.fullmatch(str(value).strip()))


def _clean_key(name: str) -> str:
    key = re.sub(r"[^0-9a-zA-Z]+", "_", str(name).strip()).strip("_")
    return key or "column"


def _looks_like_year(series: pd.Series) -> bool:
    numeric = pd.to_numeric(series, errors="coerce").dropna()
    if numeric.empty:
        return False
    whole = (numeric % 1 == 0).all()
    inside = numeric.between(YEAR_MIN, YEAR_MAX).all()
    return bool(whole and inside)


def _looks_like_iso3(series: pd.Series) -> bool:
    values = series.dropna().astype(str).str.strip()
    if values.empty:
        return False
    hits = values.str.fullmatch(_ISO3.pattern).fillna(False)
    # Not "most of them": a column of three-letter codes with a stray blank is
    # still geographic, but one where a fifth of the values are words is a
    # nominal column that happens to contain some acronyms.
    return bool(hits.mean() >= 0.9)


def _type_of(name: str, series: pd.Series) -> tuple[str, str, str]:
    """(type, basis, evidence) for one column.

    Every test below runs over the column's PRESENT values. Missingness is
    reported separately and must not change a type: `mcv1_coverage` is absent
    for a third of country-years, and counting the gaps against it typed a
    measure as `nominal`, which made it unusable as `y` and quietly removed
    every form that needed a third measure. A sparse number is still a number.
    """
    key = str(name).strip()
    present = series.dropna()
    if present.empty:
        return "nominal", "inferred", "the column is empty"

    if _GEO_NAME.match(key):
        return "geo", "declared", f'the header "{key}" names a geographic code'
    if _looks_like_iso3(series):
        return "geo", "inferred", "at least 9 in 10 values are ISO3-shaped codes"
    if _COUNTRY_NAME.match(key):
        # A country NAME is nominal, not geo: the choropleth joins on a code,
        # and typing this geo would let a spec bind `geo` to something the map
        # cannot look up. Nominal still carries every categorical form.
        return "nominal", "declared", f'"{key}" names places, but by name rather than by code'
    if _TIME_NAME.match(key) or _looks_like_year(series):
        if _looks_like_year(series):
            return "temporal", ("declared" if _TIME_NAME.match(key) else "inferred"), \
                   f"whole numbers, all within {YEAR_MIN}-{YEAR_MAX}"
        parsed = pd.to_datetime(present, errors="coerce", format="mixed")
        if parsed.notna().mean() >= 0.9:
            return "temporal", "declared", f'the header "{key}" names a time axis'

    numeric = pd.to_numeric(present, errors="coerce")
    if numeric.notna().mean() >= 0.9:
        return "quantitative", "inferred", "at least 9 in 10 present values are numbers"

    return "nominal", "inferred", "values are not numeric, dated or geographic"


def _decimals_for(series: pd.Series) -> int:
    numeric = pd.to_numeric(series, errors="coerce").dropna()
    if numeric.empty:
        return 0
    if (numeric % 1 == 0).all():
        return 0
    return 1 if numeric.abs().max() >= 10 else 2


def _melt_wide_years(frame: pd.DataFrame) -> tuple[pd.DataFrame, str | None]:
    """A table with one column per year becomes one row per (item, year).

    Wide is a legitimate way to publish and an impossible way to chart: the
    contract is long format precisely so a producer need not know the
    cardinality of a split in advance.
    """
    year_cols = [c for c in frame.columns
                 if re.fullmatch(r"\s*(19|20)\d{2}(\.0)?\s*", str(c))]
    if len(year_cols) < 3:
        return frame, None

    id_cols = [c for c in frame.columns if c not in year_cols]
    if not id_cols:
        return frame, None

    melted = frame.melt(id_vars=id_cols, value_vars=year_cols,
                        var_name="year", value_name="value")
    melted["year"] = pd.to_numeric(melted["year"], errors="coerce").astype("Int64")
    melted = melted.dropna(subset=["year"])
    note = (f"{len(year_cols)} year columns were melted into `year` and `value`; "
            "the contract is long format.")
    return melted, note


def profile_frame(df: pd.DataFrame) -> tuple[DatasetProfile, pd.DataFrame]:
    """Type every column of a dataframe, normalising shape first."""
    notes: list[str] = []

    df, melt_note = _melt_wide_years(df)
    if melt_note:
        notes.append(melt_note)

    # Deduplicate keys: two headers cleaning to the same key would silently
    # overwrite each other in a row dict, which is a data loss no error reports.
    seen: dict[str, int] = {}
    profiles: list[ColumnProfile] = []
    renames: dict[str, str] = {}

    for name in df.columns:
        base = _clean_key(name)
        if base in seen:
            seen[base] += 1
            key = f"{base}_{seen[base]}"
            notes.append(f'Two columns cleaned to "{base}"; the later one is "{key}".')
        else:
            seen[base] = 0
            key = base
        renames[name] = key

        series = df[name]
        col_type, basis, evidence = _type_of(name, series)
        numeric = pd.to_numeric(series, errors="coerce")

        profiles.append(ColumnProfile(
            key=key,
            label=str(name).strip() or key,
            type=col_type,
            basis=basis,
            evidence=evidence,
            decimals=_decimals_for(series) if col_type == "quantitative" else 0,
            missing=round(float(series.isna().mean()), 4),
            distinct=int(series.nunique(dropna=True)),
            minimum=(None if numeric.dropna().empty else float(numeric.min())),
            maximum=(None if numeric.dropna().empty else float(numeric.max())),
        ))

    df = df.rename(columns=renames)
    return DatasetProfile(columns=profiles, row_count=int(len(df)), notes=notes), df


def _thin(df: pd.DataFrame, profile: DatasetProfile) -> tuple[pd.DataFrame, str | None]:
    """Bring a long table under the row cap by dropping whole x-slices."""
    if len(df) <= MAX_FRAME_ROWS:
        return df, None

    temporal = profile.temporal
    if temporal:
        key = temporal[0].key
        slices = sorted(df[key].dropna().unique())
        if len(slices) > 1:
            per_slice = max(1, len(df) // len(slices))
            keep_n = max(2, MAX_FRAME_ROWS // per_slice)
            step = max(1, math.ceil(len(slices) / keep_n))
            # Always keep the last slice: an axis that stops short of the most
            # recent year is a different claim from the one the data makes.
            kept = list(slices[::step])
            if slices[-1] not in kept:
                kept.append(slices[-1])
            thinned = df[df[key].isin(kept)]
            return thinned, (
                f"{len(df)} rows exceeded the {MAX_FRAME_ROWS}-row cap, so "
                f"{key} was sampled every {step} steps ({len(kept)} of "
                f"{len(slices)} kept, including the most recent)."
            )

    return df.head(MAX_FRAME_ROWS), (
        f"{len(df)} rows exceeded the {MAX_FRAME_ROWS}-row cap and no time axis "
        "was found to sample, so only the first rows are charted."
    )


def frame_from_dataframe(
    df: pd.DataFrame, *, source_note: str = ""
) -> tuple[ChartFrame, DatasetProfile]:
    """A typed ``ChartFrame`` plus the profile that explains every type."""
    profile, df = profile_frame(df)
    df, thin_note = _thin(df, profile)
    if thin_note:
        profile.notes.append(thin_note)
    profile.row_count = int(len(df))

    by_key = {c.key: c for c in profile.columns}
    rows: list[dict[str, float | str | None]] = []
    for record in df.to_dict(orient="records"):
        row: dict[str, float | str | None] = {}
        for key, value in record.items():
            column = by_key.get(key)
            if value is None or (isinstance(value, float) and math.isnan(value)):
                row[key] = None
            elif value is pd.NA or value is pd.NaT:
                row[key] = None
            elif column is not None and column.type in ("quantitative", "temporal"):
                number = pd.to_numeric(value, errors="coerce")
                row[key] = None if pd.isna(number) else float(number)
            else:
                row[key] = str(value)
        rows.append(row)

    frame = ChartFrame(
        columns=[c.as_column() for c in profile.columns],
        rows=rows,
        source_note=source_note,
    )
    return frame, profile


def frame_from_csv(path: str | Path, *, source_note: str = "") -> tuple[ChartFrame, DatasetProfile]:
    df = pd.read_csv(path)
    return frame_from_dataframe(df, source_note=source_note)


def profile_of_frame(frame: ChartFrame) -> DatasetProfile:
    """Profile a frame the server already built (a registry dataset).

    So a registry dataset and an upload reach the selector as the same kind of
    object, which is the only reason the parity test in ``tests.py`` can compare
    what the agent chooses for each.
    """
    profiles: list[ColumnProfile] = []
    for column in frame.columns:
        values = [r.get(column.key) for r in frame.rows]
        present = [v for v in values if v is not None]
        numbers = [float(v) for v in present if isinstance(v, (int, float))
                   and not isinstance(v, bool)]
        profiles.append(ColumnProfile(
            key=column.key, label=column.label, type=column.type,
            unit=column.unit, decimals=column.decimals,
            basis="declared", evidence="declared by the dataset registry",
            missing=round(1 - len(present) / len(values), 4) if values else 0.0,
            distinct=len({str(v) for v in present}),
            minimum=min(numbers) if numbers else None,
            maximum=max(numbers) if numbers else None,
        ))
    return DatasetProfile(columns=profiles, row_count=len(frame.rows))
