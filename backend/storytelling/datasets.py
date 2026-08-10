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


MEASLES = DatasetSpec(
    id="measles",
    name="Measles × Vaccination Coverage",
    tagline="Coverage stalled below herd immunity - and cases came back.",
    role="primary",
    failure_mode="alarmism",
    failure_mode_label="Natural failure mode: alarmism",
    year_range="1980-2024",
    granularity="country × year",
    sources=["Our World in Data", "WHO", "WUENIC (MCV1)"],
    description=(
        "Merged measles case counts with first-dose measles vaccine (MCV1) coverage "
        "and population, by country and year. Global coverage has plateaued below the "
        "~95% herd-immunity threshold, and case counts rebounded - a story whose "
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
)

# The secondary dataset from the interim report (WHO Global Health Observatory:
# child mortality + life expectancy). Its failure mode is the opposite of
# measles - over-optimism - which is what proves the moderator calibrates in
# both directions. The CSV has not been collected yet; once it lands in
# DATA_DIR this registry entry starts serving with no other code change.
WHO_GHO = DatasetSpec(
    id="who-gho",
    name="Child Mortality × Life Expectancy",
    tagline="Real progress - with a reversal and a gap the headline hides.",
    role="secondary",
    failure_mode="over-optimism",
    failure_mode_label="Natural failure mode: over-optimism",
    year_range="1990-2023",
    granularity="country × year",
    sources=["WHO Global Health Observatory"],
    description=(
        "Under-five mortality and life expectancy trends. A hope/progress story whose "
        "failure mode is false reassurance, so the moderator must keep the gravity - "
        "the remaining inequality and the COVID-era reversal - rather than flatten it."
    ),
    csv="who_gho_tidy.csv",
    primary_label="Under-5 mortality",
    secondary_label="Life expectancy",
    primary_unit="per 1,000 live births",
    secondary_unit="years",
    primary_col="under5_mortality",
    secondary_col="life_expectancy",
    aggregate_row="World",
)



def _vpd(slug: str, name: str, disease: str, tagline: str, failure: str,
         label: str, years: str, note: str) -> DatasetSpec:
    """A WHO vaccine-preventable-disease surveillance series from the datapacks."""
    return DatasetSpec(
        id=slug, name=name, tagline=tagline, role="secondary",
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

SPECS: dict[str, DatasetSpec] = {
    s.id: s for s in (
        MEASLES, MUMPS, PERTUSSIS, DIPHTHERIA, UNDER5_MEASLES, WHO_GHO)
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
    if value is None or pd.isna(value):
        return "n/a"
    return f"{int(round(value)):,}"


def _fmt_pct(value: float | None) -> str:
    if value is None or pd.isna(value):
        return "n/a"
    return f"{value:g}%"


def _fmt_secondary(value: float | None, spec: "DatasetSpec") -> str:
    """Format the secondary column in ITS OWN unit.

    An earlier version applied percent formatting unconditionally, so the VPD
    series rendered an incidence of 33.5 per million as "33.5%". Feeding a
    wrong unit to the generator is the exact failure this project measures.
    """
    if value is None or pd.isna(value):
        return "n/a"
    if spec.secondary_unit == "%":
        return f"{value:g}%"
    return f"{value:g} {spec.secondary_unit}".strip()


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
                coverage=_fmt_secondary(r[spec.secondary_col], spec),
            )
        )

    return Dataset(
        id=spec.id,
        name=spec.name,
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
            f"{_fmt_secondary(r[spec.secondary_col], spec)}"
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
                f"{spec.secondary_label} {_fmt_secondary(r[spec.secondary_col], spec)}{rate_txt}"
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
