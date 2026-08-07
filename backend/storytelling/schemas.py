"""Pydantic schemas mirroring the frontend's TypeScript types.

The TypeScript definitions in ``lib/data/stories.ts`` and ``lib/data/datasets.ts``
are canonical. Every schema here serialises to **camelCase** so a response can be
dropped straight into the shapes the React components already consume, with no
mapping layer on either side.

If you change a field here, change it in the matching ``.ts`` file in the same
commit. That pairing is the only thing keeping the contract honest.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Schema(BaseModel):
    """Base: snake_case in Python, camelCase on the wire."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


# --------------------------------------------------------------------------
# Datasets  (mirrors lib/data/datasets.ts)
# --------------------------------------------------------------------------

FailureMode = Literal["alarmism", "over-optimism"]


class DatasetSeriesPoint(Schema):
    year: int
    primary: float
    secondary: float


class DatasetPreviewRow(Schema):
    country: str
    year: int
    cases: str
    coverage: str


class ReferenceLine(Schema):
    value: float
    label: str


class Dataset(Schema):
    id: str
    name: str
    tagline: str
    role: Literal["primary", "secondary"]
    failure_mode: FailureMode
    failure_mode_label: str
    rows: int
    year_range: str
    granularity: str
    sources: list[str]
    description: str
    primary_label: str
    secondary_label: str
    primary_unit: str
    secondary_unit: str
    reference_line: ReferenceLine | None = None
    series: list[DatasetSeriesPoint]
    preview_rows: list[DatasetPreviewRow]


# --------------------------------------------------------------------------
# Stories  (mirrors lib/data/stories.ts)
# --------------------------------------------------------------------------

StoryVariantId = Literal["human", "ai-raw", "ai-moderated"]
FactStatus = Literal["verified", "flagged", "corrected"]


class ToneVariant(Schema):
    id: StoryVariantId
    label: str
    author: str
    title: str
    alarmism_rating: float = Field(ge=1, le=5, description="1 = flat, 5 = manipulative")
    paragraphs: list[str]


class EmotiveSpan(Schema):
    text: str
    replacement: str
    reason: str


class TonePhrase(Schema):
    text: str
    accent: bool = False


class TwoTones(Schema):
    alarmist: list[TonePhrase]
    calibrated: list[TonePhrase]


class FactCheckItem(Schema):
    claim: str
    status: FactStatus
    note: str


class StorySet(Schema):
    dataset_id: str
    human: ToneVariant
    ai_raw: ToneVariant
    ai_moderated: ToneVariant
    emotive_spans: list[EmotiveSpan]
    two_tones: TwoTones
    factual_check: list[FactCheckItem]


# --------------------------------------------------------------------------
# Agent outputs — the JSON schemas we force Ollama to emit
# --------------------------------------------------------------------------
# These are deliberately NARROWER than the wire schemas above: an agent returns
# only what it can actually know. The service layer assembles the StorySet.


class GenerateOut(Schema):
    """What the generator agent must return."""

    title: str
    paragraphs: list[str] = Field(min_length=2, max_length=6)


class ModerateOut(Schema):
    """What the tone-moderation agent must return."""

    title: str
    paragraphs: list[str] = Field(min_length=2, max_length=6)
    # Bounded on purpose: `maxItems` reaches the decoder as a grammar constraint, so
    # the model is forced to close the array instead of emitting spans until it hits
    # the token cap and truncates the JSON.
    emotive_spans: list[EmotiveSpan] = Field(max_length=12)


class FactCheckOut(Schema):
    """What the factual-consistency agent must return."""

    items: list[FactCheckItem] = Field(max_length=15)


class JudgeOut(Schema):
    """What the tone judge must return for a single story."""

    alarmism_rating: float = Field(ge=1, le=5)
    rationale: str


# --------------------------------------------------------------------------
# API request / response bodies
# --------------------------------------------------------------------------


class TextSimilarity(Schema):
    metric: str
    value: float


class ComparisonMetrics(Schema):
    """Mirrors ComparisonMetrics in lib/api.ts.

    NOTE: the frontend facade currently signs this as ``compareStories(datasetId)``,
    but real similarity scoring needs the human baseline text, which today lives
    only in React state. This schema therefore hangs off a ``run_id`` plus the
    submitted human text. See backend/README.md, "Contract deviations".
    """

    text_similarity: list[TextSimilarity]
    alarmism_before: float
    alarmism_after: float
    emotive_spans_removed: int
    facts_preserved: bool


class GenerateIn(Schema):
    dataset_id: str
    tier: str = "demo"


class StageIn(Schema):
    run_id: str


class CompareIn(Schema):
    run_id: str
    human_text: str = ""


class HumanStoryIn(Schema):
    """Body for POST /runs/{id}/human - the run is already in the path."""

    human_text: str
    human_title: str = ""


class RunRef(Schema):
    run_id: str
    dataset_id: str
    tier: str
    status: str


class ModelInfo(Schema):
    role: str
    model: str
    available: bool
    size_gb: float | None = None


class TierInfo(Schema):
    id: str
    label: str
    description: str
    runnable: bool
    peak_resident_gb: float
    sequential: bool
    models: list[ModelInfo]


class HealthOut(Schema):
    ollama_up: bool
    total_ram_gb: float
    gpu_wired_limit_gb: float | None
    tiers: list[TierInfo]
