"""Dataset registry and the CSV data layer.

This replaces the hardcoded ``DATA = \"\"\"...\"\"\"`` blob in
``emotional-tone-moderation/pipeline.py``. Every number an agent sees is read
from the merged CSV at request time, so a story can never be grounded in a
figure that is not actually in the data.

Two artefacts come out of here:

* :func:`get_dataset` - the ``Dataset`` payload the React charts consume.
* :func:`build_prompt_table` - the compact, human-readable table the LLM reads.
  Keep it small: it is prepended to every agent prompt, and context costs
  memory that the large model tier does not have to spare.
"""

from __future__ import annotations

import functools
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from .schemas import (
    CountryMetric,
    CountryStat,
    Dataset,
    DatasetPreviewRow,
    DatasetSeriesPoint,
    ReferenceLine,
)

# backend/storytelling/datasets.py -> repo root
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "emotional-tone-moderation" / "data"
# Raw source downloads, as published. The WHO extract lives here rather than in
# DATA_DIR because nothing has been merged or derived to produce it.
RAW_DIR = REPO_ROOT / "datasets"


@dataclass(frozen=True)
class DatasetSpec:
    """Static metadata + how to read the underlying table."""

    id: str
    name: str
    short_name: str
    tagline: str
    role: str
    failure_mode: str
    failure_mode_label: str
    year_range: str
    granularity: str
    sources: list[str]
    description: str
    csv: str
    primary_label: str
    secondary_label: str
    primary_unit: str
    secondary_unit: str
    primary_col: str
    secondary_col: str
    aggregate_row: str
    reference_line: tuple[float, str] | None = None
    spotlight: list[str] = field(default_factory=list)
    series_years: list[int] = field(default_factory=list)
    # Country map. `country_years` are anchor years read straight from the table,
    # never interpolated here; the frontend fills the gaps at render time and
    # marks every filled year as an estimate. `country_cols` maps each declared
    # metric key to the CSV column it is read from, so the map and the agent
    # prompts are grounded in the same table.
    country_years: list[int] = field(default_factory=list)
    country_metrics: list[CountryMetric] = field(default_factory=list)
    country_cols: dict[str, str] = field(default_factory=dict)
    country_source_note: str = ""
    # Where the CSV lives, and how to read it. A spec whose source is not
    # already tidy supplies a reader that returns the tidy frame the rest of
    # this module expects: country, code, year, and one column per measure.
    data_dir: Path | None = None
    reader: Callable[[Path], "pd.DataFrame"] | None = None


MEASLES = DatasetSpec(
    id="measles",
    name="Measles × Vaccination Coverage",
    short_name="Measles × MCV1",
    tagline="Coverage stalled below herd immunity, and cases came back.",
    role="primary",
    failure_mode="alarmism",
    failure_mode_label="Natural failure mode: alarmism",
    year_range="1980-2024",
    granularity="country × year",
    sources=["Our World in Data", "WHO", "WUENIC (MCV1)"],
    description=(
        "Merged measles case counts with first-dose measles vaccine (MCV1) coverage "
        "and population, by country and year. Global coverage has plateaued below the "
        "~95% herd-immunity threshold, and case counts rebounded, a story whose "
        "natural failure mode is alarmism, so the moderator must pull an over-alarmist "
        "narrative down without losing real urgency."
    ),
    csv="measles_merged_tidy.csv",
    primary_label="Reported measles cases",
    secondary_label="MCV1 coverage",
    primary_unit="thousands",
    secondary_unit="%",
    primary_col="measles_cases",
    secondary_col="mcv1_pct",
    aggregate_row="World",
    reference_line=(95, "~95% herd-immunity line"),
    spotlight=["Germany", "Nigeria", "United States", "India"],
    series_years=[1980, 1985, 1990, 1995, 2000, 2005, 2010,
                  2015, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    country_years=[1990, 2000, 2010, 2019, 2023],
    country_metrics=[
        CountryMetric(
            key="cases_per_million",
            label="Reported measles cases",
            unit="per million people",
            polarity="higher-is-worse",
            breaks=(1, 10, 50, 200),
            # One decimal, unlike the sample data this replaces: the real table
            # runs down to 0.1 per million, and rounding those to "0" would
            # report an outbreak-free claim the figure does not make.
            decimals=1,
        ),
        CountryMetric(
            key="mcv1_coverage",
            label="MCV1 coverage",
            unit="%",
            polarity="higher-is-better",
            breaks=(70, 85, 92, 95),
        ),
        CountryMetric(
            key="cases",
            label="Reported cases",
            unit="cases",
            polarity="higher-is-worse",
            breaks=(100, 1000, 10000, 50000),
            # Never mapped: a choropleth of raw counts is a population map,
            # where India and Nigeria are darkest whatever happened that year.
            mappable=False,
        ),
    ],
    country_cols={
        "cases_per_million": "incidence_per_million",
        "mcv1_coverage": "mcv1_pct",
        "cases": "measles_cases",
    },
    country_source_note="OWID / WHO / WUENIC, merged project table: every reporting country",
)

# --------------------------------------------------------------------------
# WHO GHO: under-five deaths by cause
# --------------------------------------------------------------------------

# The nine causes in the extract that are unambiguously infectious. The two
# "Other ..." buckets are deliberately excluded from the numerator: each mixes
# communicable with perinatal or noncommunicable causes, so counting them would
# make the share mean something the label does not say. Named explicitly for the
# same reason, so the metric is exactly "these nine causes, as a share of all".
INFECTIOUS_CAUSES = frozenset({
    "Acute lower respiratory infections",
    "Diarrhoeal diseases",
    "HIV/AIDS",
    "Malaria",
    "Measles",
    "Meningitis/encephalitis",
    "Sepsis and other infectious conditions of the newborn",
    "Tetanus",
    "Tuberculosis",
})

# The extract carries three overlapping age groups: "0-4 years" is the total and
# "0-27 days" plus "1-59 months" are its two halves, which sum to it exactly
# (9,942,150 against 9,942,151 for 2000, the difference being rounding). Reading
# all three would double every figure, so only the total is used.
_TOTAL_AGE_GROUP = "0-4 years"


def read_who_gho(path: Path) -> pd.DataFrame:
    """Reshape the WHO GHO cause-of-death extract into the tidy frame.

    One row per country-year, carrying total under-five deaths and the share of
    them from the named infectious causes. A World row is appended by summing
    the countries, because the extract has no aggregate row of its own; that is
    disclosed in the dataset's source note.
    """
    raw = pd.read_csv(
        path,
        low_memory=False,
        usecols=["SpatialDimValueCode", "Location", "Period", "Dim2", "Dim3", "FactValueNumeric"],
    )
    raw = raw[(raw["Dim2"] == _TOTAL_AGE_GROUP) & raw["FactValueNumeric"].notna()]
    raw = raw.rename(columns={"SpatialDimValueCode": "code", "Location": "country", "Period": "year"})
    raw["infectious"] = raw["FactValueNumeric"].where(raw["Dim3"].isin(INFECTIOUS_CAUSES), 0.0)

    by_country = (
        raw.groupby(["code", "country", "year"], as_index=False)
        .agg(under5_deaths=("FactValueNumeric", "sum"), infectious=("infectious", "sum"))
    )
    world = (
        by_country.groupby("year", as_index=False)
        .agg(under5_deaths=("under5_deaths", "sum"), infectious=("infectious", "sum"))
        .assign(code="WORLD", country="World")
    )
    tidy = pd.concat([by_country, world], ignore_index=True)
    # Guard against a country-year with no deaths recorded at all: a 0/0 share
    # is not 0% infectious, it is unknown, and must stay missing.
    tidy["infectious_share"] = (
        tidy["infectious"].div(tidy["under5_deaths"]).where(tidy["under5_deaths"] > 0) * 100
    ).round(1)
    return tidy.drop(columns=["infectious"])


# The secondary dataset: WHO Global Health Observatory, under-five deaths by
# cause (indicator MORT_100). Its failure mode is the opposite of measles,
# over-optimism, which is what proves the moderator calibrates in both
# directions: deaths nearly halved between 2000 and 2021, and a story can ride
# that fall straight past the ten million children still dying each year.
#
# NOTE, and it matters for the report: lib/data/datasets.ts describes this
# dataset as under-five mortality against life expectancy. The extract in the
# repo carries neither. It has death counts by cause, with no live-births
# denominator for a mortality rate and no life-expectancy series at all, so the
# measures below are what the data can actually support. The mock keeps the old
# identity for whichever mode is not live; the two now differ, deliberately.
WHO_GHO = DatasetSpec(
    id="who-health",
    name="Under-Five Deaths × Cause",
    short_name="WHO child deaths",
    tagline="Deaths nearly halved, and the ones left behind are the preventable ones.",
    role="secondary",
    failure_mode="over-optimism",
    failure_mode_label="Natural failure mode: over-optimism",
    year_range="2000-2021",
    granularity="country × year × cause",
    sources=["WHO Global Health Observatory (MORT_100)"],
    description=(
        "Deaths in children under five, by cause, for 194 countries. A progress "
        "story whose failure mode is false reassurance: the total fell by nearly "
        "half between 2000 and 2021, and celebrating that alone hides both the "
        "ten million children still dying each year and the gap in what they die "
        "of. Infectious causes are a fifth of under-five deaths in some countries "
        "and two thirds in others, so the moderator has to keep the gravity "
        "rather than flatten it."
    ),
    csv="Causes of death for children less than 5 years.csv",
    data_dir=RAW_DIR,
    reader=read_who_gho,
    primary_label="Under-5 deaths",
    secondary_label="Deaths from named infectious causes",
    primary_unit="thousands",
    secondary_unit="%",
    primary_col="under5_deaths",
    secondary_col="infectious_share",
    aggregate_row="World",
    spotlight=["Nigeria", "India", "Germany", "Brazil"],
    series_years=[2000, 2003, 2006, 2009, 2012, 2015, 2018, 2019, 2020, 2021],
    country_years=[2000, 2005, 2010, 2015, 2021],
    country_metrics=[
        CountryMetric(
            key="infectious_share",
            label="Deaths from named infectious causes",
            unit="% of under-5 deaths",
            polarity="higher-is-worse",
            # A share of the country's own deaths, so it is comparable across
            # countries without a population denominator the extract lacks.
            breaks=(10, 20, 30, 45),
            decimals=1,
        ),
        CountryMetric(
            key="under5_deaths",
            label="Under-5 deaths",
            unit="deaths",
            polarity="higher-is-worse",
            breaks=(1000, 10000, 50000, 200000),
            # Same reason raw measles cases are never mapped: a choropleth of
            # counts is a population map.
            mappable=False,
        ),
    ],
    country_cols={
        "infectious_share": "infectious_share",
        "under5_deaths": "under5_deaths",
    },
    country_source_note=(
        "WHO Global Health Observatory (MORT_100), 194 countries. "
        "World totals are summed from the countries; the extract has no World row."
    ),
)


SPECS: dict[str, DatasetSpec] = {s.id: s for s in (MEASLES, WHO_GHO)}


def csv_path(spec: DatasetSpec) -> Path:
    return (spec.data_dir or DATA_DIR) / spec.csv


def is_available(spec: DatasetSpec) -> bool:
    return csv_path(spec).exists()


@functools.lru_cache(maxsize=4)
def load_frame(dataset_id: str) -> pd.DataFrame:
    spec = SPECS[dataset_id]
    path = csv_path(spec)
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset '{dataset_id}' expects {path.name} in {DATA_DIR}. "
            "It has not been collected yet - see backend/README.md."
        )
    return spec.reader(path) if spec.reader else pd.read_csv(path)


def _fmt_int(value: float | None) -> str:
    if value is None or pd.isna(value):
        return "n/a"
    return f"{int(round(value)):,}"


def _fmt_pct(value: float | None) -> str:
    if value is None or pd.isna(value):
        return "n/a"
    return f"{value:g}%"


# --------------------------------------------------------------------------
# Country figures for the map
# --------------------------------------------------------------------------

# A country row, as opposed to the aggregates sharing the table. Every aggregate
# in the merged CSV is coded OWID_*, WHO_* or left blank (the UNICEF regions), so
# an exact three-letter code is what separates a country from a region. Checked
# against the data rather than assumed: 212 codes match, and none of them is an
# aggregate.
_ISO3 = r"[A-Z]{3}"


@functools.lru_cache(maxsize=4)
def country_payload(
    dataset_id: str,
) -> tuple[list[int], list[CountryMetric], list[CountryStat], str] | None:
    """Per-country figures at the spec's anchor years, read from the CSV.

    Returns ``None`` when the dataset declares no country table or the table
    cannot supply one, which is what makes the frontend render no map rather
    than an empty one.

    Nothing is interpolated here. Only years the source actually publishes are
    sent, and a gap stays ``None`` so the map can hatch it as missing instead of
    colouring it with a guess.
    """
    spec = SPECS[dataset_id]
    if not spec.country_years or not spec.country_metrics:
        return None

    try:
        df = load_frame(dataset_id)
    except FileNotFoundError:
        # A registered dataset whose CSV has not been collected yet. Callers
        # reach this through get_dataset, which raises first, but the contract
        # above says "cannot supply one" and a missing table is exactly that.
        return None
    if "code" not in df.columns:
        return None

    # Tolerate a table that does not carry every declared measure yet: drop the
    # metrics it cannot fill rather than failing the whole dataset endpoint.
    metrics = [m for m in spec.country_metrics if spec.country_cols.get(m.key) in df.columns]
    if not metrics:
        return None

    years = spec.country_years
    rows = df[df["code"].astype(str).str.fullmatch(_ISO3) & df["year"].isin(years)]
    rows = rows.drop_duplicates(subset=["code", "year"], keep="last")

    stats: list[CountryStat] = []
    for code, group in rows.groupby("code"):
        indexed = group.set_index("year")
        series: dict[str, list[float | None]] = {}
        has_value = False
        for metric in metrics:
            column = spec.country_cols[metric.key]
            values: list[float | None] = []
            for year in years:
                value = indexed[column].get(year) if year in indexed.index else None
                if value is None or pd.isna(value):
                    values.append(None)
                else:
                    values.append(round(float(value), metric.decimals))
                    has_value = True
            series[metric.key] = values
        if not has_value:
            continue  # a country present in the table but blank at every anchor year
        stats.append(CountryStat(iso3=str(code), name=str(group["country"].iloc[0]), series=series))

    if not stats:
        return None
    stats.sort(key=lambda c: c.name)
    return years, metrics, stats, spec.country_source_note


# --------------------------------------------------------------------------
# The Dataset payload the frontend charts consume
# --------------------------------------------------------------------------


def get_dataset(dataset_id: str) -> Dataset:
    spec = SPECS[dataset_id]
    df = load_frame(dataset_id)
    agg = df[df["country"] == spec.aggregate_row]

    years = spec.series_years or sorted(agg["year"].unique().tolist())
    series: list[DatasetSeriesPoint] = []
    for year in years:
        row = agg[agg["year"] == year]
        if row.empty:
            continue
        primary = row.iloc[0][spec.primary_col]
        secondary = row.iloc[0][spec.secondary_col]
        if pd.isna(primary):
            continue
        # The chart plots measles cases in thousands; keep the unit contract.
        scaled = round(float(primary) / 1000, 1) if spec.primary_unit == "thousands" else float(primary)
        series.append(
            DatasetSeriesPoint(
                year=int(year),
                primary=scaled,
                secondary=0.0 if pd.isna(secondary) else float(secondary),
            )
        )

    latest = int(df["year"].max())
    preview: list[DatasetPreviewRow] = []
    for country in spec.spotlight:
        row = df[(df["country"] == country) & (df["year"] == latest)]
        if row.empty:
            continue
        r = row.iloc[0]
        preview.append(
            DatasetPreviewRow(
                country=country,
                year=latest,
                cases=_fmt_int(r[spec.primary_col]),
                coverage=_fmt_pct(r[spec.secondary_col]),
            )
        )

    countries = country_payload(dataset_id)

    return Dataset(
        id=spec.id,
        name=spec.name,
        short_name=spec.short_name,
        tagline=spec.tagline,
        role=spec.role,  # type: ignore[arg-type]
        failure_mode=spec.failure_mode,  # type: ignore[arg-type]
        failure_mode_label=spec.failure_mode_label,
        rows=int(len(df)),
        year_range=spec.year_range,
        granularity=spec.granularity,
        sources=spec.sources,
        description=spec.description,
        primary_label=spec.primary_label,
        secondary_label=spec.secondary_label,
        primary_unit=spec.primary_unit,
        secondary_unit=spec.secondary_unit,
        reference_line=(
            ReferenceLine(value=spec.reference_line[0], label=spec.reference_line[1])
            if spec.reference_line
            else None
        ),
        series=series,
        preview_rows=preview,
        country_years=countries[0] if countries else None,
        country_metrics=countries[1] if countries else None,
        country_stats=countries[2] if countries else None,
        country_source_note=countries[3] if countries else None,
    )


def list_datasets() -> list[Dataset]:
    """Only datasets whose CSV is actually present are served."""
    return [get_dataset(sid) for sid, spec in SPECS.items() if is_available(spec)]


# --------------------------------------------------------------------------
# The table the LLM reads
# --------------------------------------------------------------------------


def build_prompt_table(dataset_id: str) -> str:
    """A compact, fully-grounded table for the agent prompts.

    Every figure is read from the CSV. Nothing is hardcoded, so the agents
    cannot be handed a number the dataset does not contain.
    """
    spec = SPECS[dataset_id]
    df = load_frame(dataset_id)
    agg = df[df["country"] == spec.aggregate_row]
    latest = int(df["year"].max())

    lines = [
        f"REAL DATA - {spec.name} ({spec.sources[0]} and others; {spec.granularity}).",
        f"{spec.aggregate_row} by year -> {spec.primary_label} | {spec.secondary_label} ({spec.secondary_unit}):",
    ]
    for year in (spec.series_years or sorted(agg["year"].unique().tolist())):
        row = agg[agg["year"] == year]
        if row.empty:
            continue
        r = row.iloc[0]
        if pd.isna(r[spec.primary_col]):
            continue
        lines.append(
            f"  {int(year)}: {_fmt_int(r[spec.primary_col])} | {_fmt_pct(r[spec.secondary_col])}"
        )

    if spec.spotlight:
        lines.append(f"Country detail ({latest}):")
        for country in spec.spotlight:
            row = df[(df["country"] == country) & (df["year"] == latest)]
            if row.empty or pd.isna(row.iloc[0][spec.primary_col]):
                continue  # never hand an agent an "n/a" it might narrate around
            r = row.iloc[0]
            rate = r.get("incidence_per_million")
            rate_txt = "" if rate is None or pd.isna(rate) else f", {float(rate):.1f} per million"
            lines.append(
                f"  {country}: {_fmt_int(r[spec.primary_col])} cases, "
                f"MCV1 {_fmt_pct(r[spec.secondary_col])}{rate_txt}"
            )

    if spec.reference_line:
        lines.append(
            f"Context: herd immunity needs ~{spec.reference_line[0]:g}% first-dose coverage. "
            "Compare places of different size using the per-million rate, not raw counts."
        )
    return "\n".join(lines)
