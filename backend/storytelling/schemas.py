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


class CountryMetric(Schema):
    """One mapped or disclosed measure in a dataset's country table.

    Mirrors ``CountryMetric`` in lib/data/datasets.ts. ``breaks`` are declared
    here rather than computed from the visible year: the map has a year
    scrubber, and recomputed bins would recolour a country because the scale
    moved rather than because its own figure did.
    """

    key: str
    label: str
    unit: str
    polarity: Literal["higher-is-worse", "higher-is-better"]
    breaks: tuple[float, float, float, float]
    decimals: int = 0
    mappable: bool = True


class CountryStat(Schema):
    """One country's figures, columnar: metric key -> value per country_years index."""

    iso3: str
    name: str
    series: dict[str, list[float | None]]


class Dataset(Schema):
    id: str
    name: str
    short_name: str
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
    # The map's own timeline, coarser than `series`: country figures are anchored
    # to years the source publishes rather than interpolated across every point.
    # Absent (None) for a dataset with no country table, which is what tells the
    # frontend to render no map at all.
    country_years: list[int] | None = None
    country_metrics: list[CountryMetric] | None = None
    country_stats: list[CountryStat] | None = None
    country_source_note: str | None = None


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
    # None means no judge was reachable, which is a fact about the run and not a
    # middling score. Anything that filled it with a default would report a
    # measurement that was never taken.
    #
    # Two axes because the two datasets fail in opposite directions. Both keep
    # the same shape: 3 is calibrated and both ends are failures, so a single
    # meter, band and calibrated range serve either one.
    alarmism_rating: float | None = Field(
        default=None, ge=1, le=5, description="1 = flat, 5 = manipulative; None = not measured"
    )
    optimism_rating: float | None = Field(
        default=None, ge=1, le=5, description="1 = bleak, 5 = false reassurance; None = not measured"
    )
    paragraphs: list[str]


# Mirrors EDIT_CATEGORIES in lib/data/stories.ts, where the taxonomy chart
# counts spans by exactly these four ids. The frontend type requires the field,
# so a span without one is not a missing label, it is a bar that reads zero.
EditCategory = Literal["intensity", "framing", "overreach", "grounding"]


class EmotiveSpan(Schema):
    text: str
    replacement: str
    reason: str
    # Declared on the wire schema so it reaches the decoder as a grammar
    # constraint: the moderator has to pick one of the four while writing,
    # which beats inferring it from prose afterwards.
    category: EditCategory = "intensity"


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


# --------------------------------------------------------------------------
# API request / response bodies
# --------------------------------------------------------------------------


class JudgeOut(Schema):
    """What the local Ollama tone judge returns for a single story.

    One axis, unlike the Claude judge's two. The local judge is retained as the
    cheap secondary rater so the two instruments can be compared, and it was
    never given an optimism rubric; ``raw_optimism`` and ``moderated_optimism``
    therefore stay null on locally-judged runs rather than being invented.
    """

    alarmism_rating: float = Field(ge=1, le=5)
    rationale: str


class TextSimilarity(Schema):
    metric: str
    value: float


class TextStats(Schema):
    """Text-only tone measures. See storytelling/textstats.py."""

    flesch_reading_ease: float
    hedge_rate: float
    booster_rate: float
    certainty_ratio: float
    intensifier_rate: float
    fear_rate: float
    reassurance_rate: float
    affect_balance: float
    causal_rate: float
    superlative_rate: float
    numeric_density: float
    anchored_sentence_rate: float
    type_token_ratio: float
    mean_sentence_length: float
    passive_rate: float


class Groundedness(Schema):
    """Share of stated figures the supplied data supports. No LLM in this path."""

    stated: int
    supported: int
    groundedness: float | None = None
    unsupported_examples: list[str] = []
    years_out_of_range: list[int] = []


class ComparisonMetrics(Schema):
    """Mirrors ComparisonMetrics in lib/api.ts.

    NOTE: the frontend facade currently signs this as ``compareStories(datasetId)``,
    but real similarity scoring needs the human baseline text, which today lives
    only in React state. This schema therefore hangs off a ``run_id`` plus the
    submitted human text. See backend/README.md, "Contract deviations".
    """

    text_similarity: list[TextSimilarity]
    alarmism_before: float | None = None
    alarmism_after: float | None = None
    alarmism_human: float | None = None
    optimism_before: float | None = None
    optimism_after: float | None = None
    emotive_spans_removed: int
    # Replaces the old `facts_preserved` boolean, which was
    # `not any(status == "flagged")` and so only restated the fact-checker.
    groundedness_raw: Groundedness | None = None
    groundedness_moderated: Groundedness | None = None
    textstats_raw: TextStats | None = None
    textstats_moderated: TextStats | None = None


class EditCategoryCount(Schema):
    category: EditCategory
    label: str
    count: int


class EditsOut(Schema):
    """What the moderator changed, and the shape of those changes.

    `counts` covers all four families including the zeros, so the chart does
    not have to decide whether an absent family means none or means unknown.
    """

    run_id: str
    total: int
    counts: list[EditCategoryCount]
    spans: list[EmotiveSpan]
    moderator: str


# --------------------------------------------------------------------------
# Results
# --------------------------------------------------------------------------
# Split by provenance, and the split is the point. `measured` is computed from
# the runs in this database and carries its own n, so a mean over three demo
# runs cannot be read as a study result. `reproduction` is read from committed
# artifacts and names the file it came from. A figure that is neither is not
# served at all rather than being dressed as one of them.


class TierRuns(Schema):
    tier: str
    runs: int


class StageTiming(Schema):
    stage: str
    model: str
    runs: int
    median_seconds: float


class MeasuredResults(Schema):
    """Computed from the Run table. Every figure carries the n behind it."""

    runs_total: int
    runs_complete: int
    by_tier: list[TierRuns]
    # None, not zero, when no completed run carries a judged rating.
    alarmism_before: float | None = None
    alarmism_after: float | None = None
    optimism_before: float | None = None
    optimism_after: float | None = None
    # Two counts, not one. Both axes come from the same judge call, so any run
    # scored since has both - but runs judged before the second axis existed
    # carry alarmism only, and printing the alarmism n beside an optimism mean
    # taken over fewer runs is the kind of inflation this module exists to
    # avoid. They converge as the old runs age out.
    alarmism_n: int = 0
    optimism_n: int = 0
    edits_per_run: float | None = None
    edits_by_category: list[EditCategoryCount] = []
    facts_preserved_rate: float | None = None
    facts_checked_n: int = 0
    stage_timings: list[StageTiming] = []


class FaithfulnessPoint(Schema):
    model: str
    value: float
    note: str
    tone: Literal["good", "warn", "bad"]


class ReproductionResults(Schema):
    """Read from the committed reproduction artifacts, not from any run here."""

    caption: str
    unit: str
    source: str
    series: list[FaithfulnessPoint]


class OperationAccuracy(Schema):
    """One model's accuracy on one analytical operation.

    ``correct``/``total`` travel with the percentage on purpose. gemma4:12b
    scores 80% on subtraction off four correct answers out of five, and a bar
    that prints only "80%" invites that to be read next to its 93.1% on
    lookup (81/87) as though the two were equally established.
    """

    model: str
    operation: str
    label: str
    correct: int
    total: int
    pct: float


class PerOperationResults(Schema):
    caption: str
    unit: str
    source: str
    #: Model labels in the order the chart should draw them, smallest first.
    models: list[str]
    rows: list[OperationAccuracy]


class MaskedNumberPoint(Schema):
    model: str
    value: float
    #: Absent for the paper's own figures, which are quoted, not recomputed.
    correct: int | None = None
    total: int | None = None
    source: Literal["ours", "paper"]


class MaskedNumberResults(Schema):
    caption: str
    unit: str
    source: str
    series: list[MaskedNumberPoint]


class ResultsOut(Schema):
    measured: MeasuredResults
    faithfulness: ReproductionResults | None = None
    per_operation: PerOperationResults | None = None
    masked_number: MaskedNumberResults | None = None
    # Named so the frontend can say what it is still showing from its own
    # constants rather than quietly mixing the two.
    unavailable: list[str] = []


class JudgeIn(Schema):
    # Only a model alias, never a path or a flag: this reaches a subprocess.
    model: str = "opus"


class JudgeOutcome(Schema):
    """A paired verdict: both stories and both axes, scored side by side.

    The pipeline already scores each story on its own as it is produced, which
    is a *blind* reading - the judge has not seen the other version. This
    endpoint shows the judge both at once. Same model, deliberately different
    method, and the `paired_` / `blind_` pair is the comparison.

    These fields were named `local_*` when the pipeline judge was gemma4:12b.
    That judge is gone, so a field called "local" now holds a Claude score and
    would print under the moderator's name in the interface.
    """

    run_id: str
    judge_model: str
    raw_alarmism: float
    moderated_alarmism: float
    raw_optimism: float
    moderated_optimism: float
    #: Change in alarmism, kept for the headline the interface already prints.
    delta: float
    optimism_delta: float
    rationale: str
    # What the same judge said about each story alone, during the run.
    blind_raw_alarmism: float | None = None
    blind_moderated_alarmism: float | None = None
    blind_raw_optimism: float | None = None
    blind_moderated_optimism: float | None = None
    cost_usd: float | None = None


class UploadOut(Schema):
    """A stored upload.

    Two separate capabilities, deliberately not collapsed into one flag:

    ``wired``     the story pipeline can generate from it. Still false; that
                  needs declared measures and class breaks, which are editorial
                  facts no table states about itself.
    ``chartable`` figures can be suggested from it. True, because choosing a
                  form needs only each column's TYPE, and a table does answer
                  that about itself.

    Reporting one number for both is what would let the interface imply the file
    is ready to generate from when it is only ready to draw.
    """

    id: str
    original_name: str
    rows: int
    columns: list[str]
    numeric_columns: list[str]
    year_range: str = ""
    countries: int | None = None
    preview_rows: list[dict[str, str]] = []
    wired: bool = False
    chartable: bool = True
    note: str = ""


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
