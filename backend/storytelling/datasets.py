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
import hashlib
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
DATAPACK_DIR = REPO_ROOT / "experiments" / "datapacks"


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
    # "merged" = the wide country x year CSV; "datapack" = the normalised
    # series,year,cases,incidence_per_million files under experiments/datapacks.
    source: str = "merged"
    # Country map. `country_years` are anchor years read straight from the table,
    # never interpolated here; the frontend fills the gaps at render time and
    # marks every filled year as an estimate. `country_cols` maps each declared
    # metric key to the CSV column it is read from, so the map and the agent
    # prompts are grounded in the same table.
    country_years: list[int] = field(default_factory=list)
    country_metrics: list[CountryMetric] = field(default_factory=list)
    country_cols: dict[str, str] = field(default_factory=dict)
    country_source_note: str = ""
    # `primary_unit` is how the *chart* labels the series, which for measles is
    # thousands because the series is divided by 1000. The country detail prints
    # the column's own raw value, so it needs the column's own unit: 14,999
    # cases, not 14,999 thousands. Defaults to primary_unit when they agree.
    primary_col_unit: str = ""


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
    primary_col_unit="cases",
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

# The secondary dataset: WHO Global Health Observatory, under-five mortality
# against life expectancy. Its failure mode is the opposite of measles,
# over-optimism, which is what proves the moderator calibrates in both
# directions: both lines are good news, and a story can ride them straight past
# the countries still burying one child in twenty.
#
# Built by emotional-tone-moderation/data/build_who_gho.py from two GHO
# indicators, MDG_0000000007 and WHOSIS_000001. The cause-of-death extract in
# datasets/ is a different indicator (MORT_100) and carries neither measure.
WHO_GHO = DatasetSpec(
    id="who-health",
    name="Child Mortality × Life Expectancy",
    short_name="WHO child mortality",
    tagline="Decades of progress, with a remaining gap and a COVID-era reversal.",
    role="secondary",
    failure_mode="over-optimism",
    failure_mode_label="Natural failure mode: over-optimism",
    year_range="2000-2021",
    granularity="country × year",
    sources=["WHO Global Health Observatory", "UN IGME"],
    description=(
        "Under-five mortality and life expectancy by country and year. A hope "
        "and progress story whose failure mode is false reassurance: global "
        "under-five mortality nearly halved between 2000 and 2021 and life "
        "expectancy rose, while the gap between countries stayed enormous and "
        "COVID reversed part of it. The moderator has to keep that gravity "
        "rather than flatten it."
    ),
    csv="who_gho_tidy.csv",
    primary_label="Under-5 mortality",
    secondary_label="Life expectancy",
    primary_unit="per 1,000 live births",
    secondary_unit="years",
    primary_col="under5_mortality",
    secondary_col="life_expectancy",
    aggregate_row="World",
    spotlight=["Nigeria", "India", "Germany", "Brazil"],
    # Both measures overlap on 2000-2021; life expectancy is not published
    # before 2000, and a series that quietly starts one measure earlier than the
    # other would put a gap where the reader sees a trend.
    series_years=[2000, 2003, 2006, 2009, 2012, 2015, 2018, 2019, 2020, 2021],
    country_years=[2000, 2005, 2010, 2015, 2021],
    country_metrics=[
        # Keys, breaks and polarity mirror lib/data/country-stats/who-health.ts,
        # so the map bins identically whichever source is on screen.
        CountryMetric(
            key="under5_mortality",
            label="Under-5 mortality",
            unit="per 1,000 live births",
            polarity="higher-is-worse",
            breaks=(5, 15, 40, 80),
            decimals=1,
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
    country_source_note=(
        "WHO Global Health Observatory (MDG_0000000007, WHOSIS_000001) / UN IGME, "
        "every reporting country"
    ),
)



def _vpd(slug: str, name: str, disease: str, tagline: str, failure: str,
         label: str, years: str, note: str) -> DatasetSpec:
    """A WHO vaccine-preventable-disease surveillance series from the datapacks."""
    return DatasetSpec(
        id=slug, name=name, short_name=disease, tagline=tagline, role="secondary",
        failure_mode=failure,
        failure_mode_label=("Natural failure mode: alarmism" if failure == "alarmism"
                            else "Natural failure mode: over-optimism"),
        year_range=years, granularity="global total x year",
        sources=["WHO vaccine-preventable diseases surveillance"],
        description=note,
        csv=f"{slug}.csv",
        primary_label=label, secondary_label="Incidence per million",
        primary_unit="cases", secondary_unit="per million",
        primary_col="cases", secondary_col="incidence_per_million",
        aggregate_row=slug, source="datapack",
    )


MUMPS = _vpd("mumps-global", "Mumps (global)", "Mumps",
             "Cases roughly halved since 2000, but not smoothly.",
             "over-optimism", "Reported mumps cases", "2000-2025",
             "Global reported mumps cases and incidence per million. Falling across the "
             "span, which makes false reassurance the natural failure mode.")

PERTUSSIS = _vpd("pertussis-global", "Pertussis (global)", "Pertussis",
                 "Cases higher in 2025 than in 2000, after a pandemic-era collapse.",
                 "alarmism", "Reported pertussis cases", "2000-2025",
                 "Global reported pertussis cases and incidence per million. Rising across "
                 "the span, with a very low 2021 that makes any recent baseline dramatic.")

DIPHTHERIA = _vpd("diphtheria-global", "Diphtheria (global)", "Diphtheria",
                  "Cases up more than twofold since 2000.",
                  "alarmism", "Reported diphtheria cases", "2000-2025",
                  "Global reported diphtheria cases and incidence per million. Rising "
                  "across the span.")

UNDER5_MEASLES = _vpd("under5-measles-deaths", "Under-5 measles deaths (global)", "Measles",
                      "Deaths down about 80% since 2000, with a recent reversal.",
                      "over-optimism", "Under-5 measles deaths", "2000-2021",
                      "Global deaths from measles in children under five. Falling steeply "
                      "across the span while rising over the last five years, so a truthful "
                      "progress story and a truthful alarm story are both available.")

UNDER5_ALL_CAUSE = _vpd("under5-all-cause-deaths", "Under-5 deaths, all causes (global)",
                        "All causes",
                        "Under-five deaths down by roughly half since 2000.",
                        "over-optimism", "Under-5 deaths (all causes)", "2000-2021",
                        "Global deaths from all causes in children under five. The "
                        "denominator series for the cause-specific tables: falling "
                        "steadily, which makes false reassurance the natural failure mode.")

UNDER5_TETANUS = _vpd("under5-tetanus-deaths", "Under-5 tetanus deaths (global)", "Tetanus",
                      "Deaths down about 80% since 2000.",
                      "over-optimism", "Under-5 tetanus deaths", "2000-2021",
                      "Global deaths from tetanus in children under five. The steepest "
                      "sustained decline in the set, so an over-optimistic 'solved problem' "
                      "framing is the natural failure mode.")

SPECS: dict[str, DatasetSpec] = {
    s.id: s for s in (
        MEASLES, MUMPS, PERTUSSIS, DIPHTHERIA, UNDER5_MEASLES,
        UNDER5_ALL_CAUSE, UNDER5_TETANUS, WHO_GHO)
}


def csv_path(spec: DatasetSpec) -> Path:
    return (DATAPACK_DIR if spec.source == "datapack" else DATA_DIR) / spec.csv


def is_available(spec: DatasetSpec) -> bool:
    return csv_path(spec).exists()


@functools.lru_cache(maxsize=4)
def load_frame(dataset_id: str) -> pd.DataFrame:
    spec = SPECS[dataset_id]
    path = csv_path(spec)
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset '{dataset_id}' expects {path.name} in {path.parent}. "
            "It has not been collected yet - see backend/README.md."
        )
    df = pd.read_csv(path)
    if spec.source == "datapack":
        # Map the normalised schema onto the wide one so one code path serves both.
        df = df.rename(columns={"series": "country", "cases": "cases",
                                "incidence_per_million": "incidence_per_million"})
        df["mcv1_pct"] = float("nan")
    return df


def _fmt_int(value: float | None) -> str:
    """Whole numbers for counts, one decimal for anything that is not one.

    Measles cases are counts and read best as 42,938. An under-five mortality
    rate of 60.4 per 1,000 is not a count, and rounding it to 60 throws away a
    figure the source publishes.
    """
    if value is None or pd.isna(value):
        return "n/a"
    if float(value).is_integer():
        return f"{int(value):,}"
    return f"{value:,.1f}"


def _fmt_pct(value: float | None) -> str:
    if value is None or pd.isna(value):
        return "n/a"
    return f"{value:g}%"


def _fmt_secondary(value: float | None, unit: str) -> str:
    """The secondary column in its own unit, rather than always a percentage."""
    if value is None or pd.isna(value):
        return "n/a"
    if unit == "%":
        return _fmt_pct(value)
    return f"{value:,.1f} {unit}".strip()


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

    # The last year the spec actually plots, not the last in the table. The two
    # differ when the measures end at different times: under-five mortality runs
    # to 2024 while life expectancy stops at 2021, so the newest row in the file
    # would show every spotlight country with a blank second column, and would
    # hand the agent that same blank.
    latest = int(spec.series_years[-1]) if spec.series_years else int(df["year"].max())
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
                coverage=_fmt_secondary(r[spec.secondary_col], spec.secondary_unit),
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
    # The last year the spec actually plots, not the last in the table. The two
    # differ when the measures end at different times: under-five mortality runs
    # to 2024 while life expectancy stops at 2021, so the newest row in the file
    # would show every spotlight country with a blank second column, and would
    # hand the agent that same blank.
    latest = int(spec.series_years[-1]) if spec.series_years else int(df["year"].max())

    lines = [
        f"REAL DATA - {spec.name} ({spec.sources[0]} and others; {spec.granularity}).",
        f"{spec.aggregate_row} by year -> {spec.primary_label} | "
        f"{spec.secondary_label} ({spec.secondary_unit}):",
    ]
    for year in (spec.series_years or sorted(agg["year"].unique().tolist())):
        row = agg[agg["year"] == year]
        if row.empty:
            continue
        r = row.iloc[0]
        if pd.isna(r[spec.primary_col]):
            continue
        lines.append(
            f"  {int(year)}: {_fmt_int(r[spec.primary_col])} | "
            f"{_fmt_secondary(r[spec.secondary_col], spec.secondary_unit)}"
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
                f"  {country}: {_fmt_int(r[spec.primary_col])} "
                f"{spec.primary_col_unit or spec.primary_unit}, "
                f"{spec.secondary_label} "
                f"{_fmt_secondary(r[spec.secondary_col], spec.secondary_unit)}{rate_txt}"
            )

    if spec.reference_line:
        lines.append(
            f"Context: herd immunity needs ~{spec.reference_line[0]:g}% first-dose coverage. "
            "Compare places of different size using the per-million rate, not raw counts."
        )
    return "\n".join(lines)


# --------------------------------------------------------------------------
# P0.13: the one string both the generator and the human writer receive
# --------------------------------------------------------------------------

def pack_text(dataset_id: str) -> str:
    """The evidence pack. Trailing newline normalised so digests are stable.

    Both `agents.run_generate` and `manage.py make_packs` call THIS function, so
    the writer's `.txt` and the generator's prompt are the same string by
    construction rather than by a test that compares two separate builds.
    """
    return build_prompt_table(dataset_id).rstrip("\n") + "\n"


def pack_sha256(dataset_id: str) -> str:
    return hashlib.sha256(pack_text(dataset_id).encode("utf-8")).hexdigest()
