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

# The secondary dataset from the interim report (WHO Global Health Observatory:
# child mortality + life expectancy). Its failure mode is the opposite of
# measles - over-optimism - which is what proves the moderator calibrates in
# both directions. The CSV has not been collected yet; once it lands in
# DATA_DIR this registry entry starts serving with no other code change.
WHO_GHO = DatasetSpec(
    # The id matches lib/data/datasets.ts. The two sides used to disagree
    # ("who-gho" here, "who-health" there), which would have served the same
    # dataset under two ids the moment its CSV landed.
    id="who-health",
    name="Child Mortality × Life Expectancy",
    short_name="WHO child mortality",
    tagline="Real progress, with a reversal and a gap the headline hides.",
    role="secondary",
    failure_mode="over-optimism",
    failure_mode_label="Natural failure mode: over-optimism",
    year_range="1990-2023",
    granularity="country × year",
    sources=["WHO Global Health Observatory"],
    description=(
        "Under-five mortality and life expectancy trends. A hope/progress story whose "
        "failure mode is false reassurance, so the moderator must keep the gravity, "
        "the remaining inequality and the COVID-era reversal, rather than flatten it."
    ),
    csv="who_gho_tidy.csv",
    primary_label="Under-5 mortality",
    secondary_label="Life expectancy",
    primary_unit="per 1,000 live births",
    secondary_unit="years",
    primary_col="under5_mortality",
    secondary_col="life_expectancy",
    aggregate_row="World",
    country_years=[1990, 2000, 2010, 2019, 2022],
    country_metrics=[
        CountryMetric(
            key="under5_mortality",
            label="Under-5 mortality",
            unit="per 1,000 live births",
            polarity="higher-is-worse",
            breaks=(5, 15, 40, 80),
        ),
        CountryMetric(
            key="life_expectancy",
            label="Life expectancy",
            unit="years",
            polarity="higher-is-better",
            breaks=(60, 67, 73, 79),
            decimals=1,
        ),
    ],
    country_cols={
        "under5_mortality": "under5_mortality",
        "life_expectancy": "life_expectancy",
    },
    country_source_note="WHO Global Health Observatory / UN IGME: every reporting country",
)

SPECS: dict[str, DatasetSpec] = {s.id: s for s in (MEASLES, WHO_GHO)}


def csv_path(spec: DatasetSpec) -> Path:
    return DATA_DIR / spec.csv


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
    return pd.read_csv(path)


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
