"""HTTP surface. Mirrors ``lib/api.ts`` on the frontend.

Design note - why three stage endpoints instead of one "generate story" call
---------------------------------------------------------------------------
``components/generate/pipeline-runner.tsx`` drives a
``generate -> moderate -> factcheck -> done`` state machine on hardcoded timers
(2200 ms, 1900 ms) over text that has already arrived. A real run is 30 s to
several minutes, so that animation would be a lie and a single blocking call
would freeze the wizard.

Each stage here is one Ollama call and one endpoint. The frontend awaits each in
turn, so every beat of the animation ends exactly when the real work does - with
plain request/response, no SSE and no job polling. Streaming can be layered on
later for token-level typewriter output without changing this shape.

All calls are synchronous by design: only one model can be resident at a time on
this hardware (see ollama_client), so parallelism would thrash, not help.
"""

from __future__ import annotations

import logging
import re
import time

from django.shortcuts import get_object_or_404
from ninja import File, NinjaAPI, Query
from ninja.files import UploadedFile
from ninja.errors import HttpError

from . import datasets as ds
from . import judge as judge_mod
from .charts import http as charts_http
from .charts import select as charts_select
from . import ollama_client as oc
from . import results as results_mod
from . import services
from . import uploads as uploads_mod
from .models import Run, RunStatus, StageResult, UploadedDataset
from .schemas import (
    ComparisonMetrics,
    CompareIn,
    Dataset,
    EditCategoryCount,
    EditsOut,
    FactCheckItem,
    GenerateIn,
    HealthOut,
    HumanStoryIn,
    JudgeIn,
    JudgeOutcome,
    ModelInfo,
    ResultsOut,
    RunRef,
    StorySet,
    TierInfo,
    ToneVariant,
    UploadOut,
)

log = logging.getLogger(__name__)

api = NinjaAPI(title="AI-Powered Data Storytelling", version="0.1.0", docs_url="/docs")


# django-ninja resolves its own `by_alias` as `by_alias or False`, which silently
# overrides the `serialize_by_alias=True` in schemas.Schema and emits snake_case.
# These wrappers pin it on, so the camelCase contract with the TypeScript types is
# enforced in one place instead of on every decorator, where it is easy to forget.
def get(path: str, **kwargs):
    return api.get(path, by_alias=True, **kwargs)


def post(path: str, **kwargs):
    return api.post(path, by_alias=True, **kwargs)


@api.exception_handler(oc.OllamaError)
def on_ollama_error(request, exc):
    # Surface model/JSON failures as a real error instead of a plausible-looking
    # empty story. A silent fallback here would be indistinguishable from success.
    log.error("ollama failure: %s", exc)
    return api.create_response(request, {"detail": str(exc)}, status=502)


# --------------------------------------------------------------------------
# Capability
# --------------------------------------------------------------------------


@get("/health", response=HealthOut)
def health(request):
    """What this machine can actually run right now.

    The frontend can use this to disable tiers that are not pulled, instead of
    offering a run that will fail 40 seconds in.
    """
    tiers: list[TierInfo] = []
    for tier in oc.TIERS.values():
        plan = oc.tier_plan(tier)
        tiers.append(
            TierInfo(
                id=tier.id,
                label=tier.label,
                description=tier.description,
                runnable=plan["runnable"],
                peak_resident_gb=plan["peak_resident_gb"],
                sequential=plan["sequential"],
                models=[
                    ModelInfo(
                        role=role,
                        model=name,
                        available=name in plan["installed"],
                        size_gb=plan["sizes"].get(name),
                    )
                    for role, name in tier.models.items()
                ],
            )
        )
    return HealthOut(
        ollama_up=oc.is_up(),
        total_ram_gb=oc.TOTAL_RAM_GB,
        gpu_wired_limit_gb=oc.gpu_wired_limit_gb(),
        tiers=tiers,
    )


# --------------------------------------------------------------------------
# Results
# --------------------------------------------------------------------------


@get("/results", response=ResultsOut)
def results(request):
    """Evaluation figures, split by where each one comes from.

    `measured` is computed from the runs in this database and carries its own n.
    `faithfulness` is read from the committed reproduction CSVs. Figures that
    are neither are listed in `unavailable` rather than invented, so the
    interface can say what it is still showing from its own constants.
    """
    return results_mod.build()


# --------------------------------------------------------------------------
# Datasets
# --------------------------------------------------------------------------


@get("/datasets", response=list[Dataset])
def list_datasets(request):
    return ds.list_datasets()


@get("/datasets/{dataset_id}", response=Dataset)
def get_dataset(request, dataset_id: str):
    if dataset_id not in ds.SPECS:
        raise HttpError(404, f"Unknown dataset '{dataset_id}'")
    if not ds.is_available(ds.SPECS[dataset_id]):
        raise HttpError(404, f"Dataset '{dataset_id}' has no data file yet")
    return ds.get_dataset(dataset_id)


# Two different capabilities, and conflating them is what would mislead. Charts
# need the column TYPE, which the data answers for itself (charts/profile.py).
# The story pipeline needs to know which column is the measure, which is the
# comparison and what its class breaks are - editorial facts no table states -
# so it still waits on the configuration step.
UPLOAD_NOTE = (
    "Stored and validated. Figures can be suggested from it now: choosing a chart "
    "needs only each column's type, which is readable from the data. Generating a "
    "story is not available yet - the pipeline needs to know which column is the "
    "measure, which is the comparison, and what its class breaks are, and inferring "
    "that from column names is how an unlabelled figure ends up in front of a "
    "reader. The configuration step comes first."
)


@post("/uploads", response=UploadOut)
def upload_dataset(request, file: UploadedFile = File(...)):
    """Accept a CSV for later use, validating that it is one.

    Deliberately does not join the dataset registry; see UPLOAD_NOTE.
    """
    try:
        record = uploads_mod.store(file)
    except uploads_mod.UploadRejected as exc:
        raise HttpError(400, str(exc)) from exc
    return UploadOut(
        id=str(record.id),
        original_name=record.original_name,
        rows=record.rows,
        columns=record.columns,
        numeric_columns=record.numeric_columns,
        year_range=record.year_range,
        countries=record.countries,
        preview_rows=uploads_mod.preview(record),
        wired=False,
        chartable=True,
        note=UPLOAD_NOTE,
    )


@get("/uploads", response=list[UploadOut])
def list_uploads(request):
    return [
        UploadOut(
            id=str(r.id),
            original_name=r.original_name,
            rows=r.rows,
            columns=r.columns,
            numeric_columns=r.numeric_columns,
            year_range=r.year_range,
            countries=r.countries,
            wired=False,
            note=UPLOAD_NOTE,
        )
        for r in UploadedDataset.objects.all()[:50]
    ]


# --------------------------------------------------------------------------
# Pipeline stages
# --------------------------------------------------------------------------


@post("/runs", response=RunRef)
def create_run(request, payload: GenerateIn):
    if payload.dataset_id not in ds.SPECS:
        raise HttpError(404, f"Unknown dataset '{payload.dataset_id}'")
    plan = oc.tier_plan(oc.resolve_tier(payload.tier))
    if not plan["runnable"]:
        missing = [m for m in oc.resolve_tier(payload.tier).distinct_models
                   if m not in plan["installed"]]
        raise HttpError(409, f"Tier '{payload.tier}' needs models not pulled: {', '.join(missing)}")
    run = services.start_run(payload.dataset_id, payload.tier)
    return RunRef(run_id=str(run.id), dataset_id=run.dataset_id, tier=run.tier, status=run.status)


@post("/runs/{run_id}/generate", response=ToneVariant)
def stage_generate(request, run_id: str):
    run = services.do_generate(get_object_or_404(Run, id=run_id))
    return services.to_story_set(run).ai_raw


@post("/runs/{run_id}/moderate", response=StorySet)
def stage_moderate(request, run_id: str):
    run = get_object_or_404(Run, id=run_id)
    if not run.raw_paragraphs:
        raise HttpError(409, "Run has no generated story yet - call /generate first")
    return services.to_story_set(services.do_moderate(run))


@post("/runs/{run_id}/factcheck", response=list[FactCheckItem])
def stage_factcheck(request, run_id: str):
    run = get_object_or_404(Run, id=run_id)
    if not run.raw_paragraphs:
        raise HttpError(409, "Run has no story to check yet")
    run = services.do_factcheck(run)
    return services.to_story_set(run).factual_check


@get("/runs/{run_id}", response=StorySet)
def get_run(request, run_id: str):
    return services.to_story_set(get_object_or_404(Run, id=run_id))


@get("/runs", response=list[RunRef])
def list_runs(request, dataset_id: str = Query(None), tier: str = Query(None),
              completed_only: bool = Query(True)):
    """Cached runs. This is what the demo serves when Ollama is not on hand."""
    qs = Run.objects.all()
    if dataset_id:
        qs = qs.filter(dataset_id=dataset_id)
    if tier:
        qs = qs.filter(tier=tier)
    if completed_only:
        qs = qs.filter(status=RunStatus.DONE)
    return [RunRef(run_id=str(r.id), dataset_id=r.dataset_id, tier=r.tier, status=r.status)
            for r in qs[:50]]


# --------------------------------------------------------------------------
# The independent judge
# --------------------------------------------------------------------------


@api.exception_handler(judge_mod.JudgeUnavailable)
def on_judge_unavailable(request, exc):
    # 503 rather than 500: the pipeline is fine, the judge is simply not
    # reachable here, and the interface should say so rather than look broken.
    log.warning("independent judge unavailable: %s", exc)
    return api.create_response(request, {"detail": str(exc)}, status=503)


@post("/runs/{run_id}/judge", response=JudgeOutcome)
def stage_judge(request, run_id: str, payload: JudgeIn = None):
    """Score this run's two stories side by side, on both tone axes.

    The pipeline already scores each story as it is produced, but *blind* - the
    judge sees one story and does not know the other exists. This shows it both
    at once, so it is comparing rather than scoring twice. Same model, and the
    two readings are stored in separate fields because the gap between them is
    itself worth measuring: a judge that can see the moderated version may rate
    the raw one differently than it did on its own.
    """
    run = get_object_or_404(Run, id=run_id)
    model = (payload.model if payload else "opus").strip()
    # Nothing free-form reaches the argument list.
    if not re.fullmatch(r"[A-Za-z0-9._:-]{1,64}", model):
        raise HttpError(400, f"Unsupported judge model '{model}'")

    table = ds.build_prompt_table(run.dataset_id)
    run = judge_mod.judge_run(run, table, model=model)
    return JudgeOutcome(
        run_id=str(run.id),
        judge_model=f"claude/{run.opus_model}",
        raw_alarmism=run.opus_raw_alarmism,
        moderated_alarmism=run.opus_moderated_alarmism,
        raw_optimism=run.opus_raw_optimism,
        moderated_optimism=run.opus_moderated_optimism,
        delta=round(run.opus_moderated_alarmism - run.opus_raw_alarmism, 2),
        optimism_delta=round(run.opus_moderated_optimism - run.opus_raw_optimism, 2),
        rationale=run.opus_rationale,
        blind_raw_alarmism=run.raw_alarmism,
        blind_moderated_alarmism=run.moderated_alarmism,
        blind_raw_optimism=run.raw_optimism,
        blind_moderated_optimism=run.moderated_optimism,
        cost_usd=run.opus_cost_usd,
    )


# --------------------------------------------------------------------------
# The edits the moderator made
# --------------------------------------------------------------------------

# Labels mirror EDIT_CATEGORIES in lib/data/stories.ts.
EDIT_LABELS = {
    "intensity": "Intensity",
    "framing": "Framing",
    "overreach": "Overreach",
    "grounding": "Grounding",
}


@get("/runs/{run_id}/edits", response=EditsOut)
def run_edits(request, run_id: str):
    """The moderator's own edits, categorised.

    The story endpoints already carry these spans, but the taxonomy chart wants
    the counts across all four families, zeros included, and a caller that only
    wants the edits should not have to pull two full stories to get them.
    """
    run = get_object_or_404(Run, id=run_id)
    spans = services.emotive_spans_of(run)
    counts = [
        EditCategoryCount(
            category=key,  # type: ignore[arg-type]
            label=label,
            count=sum(1 for s in spans if s.category == key),
        )
        for key, label in EDIT_LABELS.items()
    ]
    return EditsOut(
        run_id=str(run.id),
        total=len(spans),
        counts=counts,
        spans=spans,
        moderator=oc.resolve_tier(run.tier).moderator,
    )


# --------------------------------------------------------------------------
# Human baseline + comparison
# --------------------------------------------------------------------------


@post("/runs/{run_id}/human", response=RunRef)
def save_human_story(request, run_id: str, payload: HumanStoryIn):
    """Persist the human baseline written in the interface, and judge it.

    Judged here rather than left unrated, because the human rating is not
    decoration: the comparison draws a target band of +/-0.5 around it, so an
    unrated baseline means the whole tone panel has no yardstick and reports
    nothing. It goes through the same blind single-story Claude call as the
    machine stories, which is what makes the three ratings comparable - any bias
    the judge has applies equally to all of them and cancels in the difference.

    Three behaviours worth stating, because each one is a way this could lie:

    * **Re-saving identical text does not re-judge.** A second opinion on the
      same words would differ by up to the judge's own wobble and look like an
      edit that never happened.
    * **Changed text clears the old ratings first.** If the judge is then
      unreachable, the row holds no rating at all rather than a rating of text
      that no longer exists.
    * **A judge failure is not a save failure.** The text is the user's work and
      is kept regardless; the rating is null and renders as "not measured".
    """
    run = get_object_or_404(Run, id=run_id)
    text, title = payload.human_text, payload.human_title
    unchanged = (text == run.human_text and title == run.human_title
                 and run.human_alarmism is not None)

    run.human_text, run.human_title = text, title
    if not unchanged:
        run.human_alarmism = run.human_optimism = None
    run.save(update_fields=["human_text", "human_title",
                            "human_alarmism", "human_optimism"])

    if text.strip() and not unchanged and judge_mod.is_available():
        started = time.perf_counter()
        try:
            score = judge_mod.score_story(
                ds.build_prompt_table(run.dataset_id),
                title,
                [p.strip() for p in text.split("\n\n") if p.strip()],
            )
        except judge_mod.JudgeUnavailable as exc:
            # Caught here on purpose. Letting it reach the module-level 503
            # handler would report a failed save for a save that committed.
            log.warning("human baseline left unjudged for run %s: %s", run.id, exc)
            StageResult.objects.create(
                run=run, stage=StageResult.Stage.JUDGE_OPUS_HUMAN,
                model=f"claude/{judge_mod.DEFAULT_MODEL}",
                duration_s=round(time.perf_counter() - started, 2),
                payload={"error": str(exc)},
            )
        else:
            run.human_alarmism = score.alarmism
            run.human_optimism = score.optimism
            run.save(update_fields=["human_alarmism", "human_optimism"])
            StageResult.objects.create(
                run=run, stage=StageResult.Stage.JUDGE_OPUS_HUMAN,
                model=f"claude/{judge_mod.DEFAULT_MODEL}",
                duration_s=round(score.duration_s, 2),
                payload={"alarmism": score.alarmism, "optimism": score.optimism,
                         "rationale": score.rationale},
                usage={"cost_usd": score.cost_usd} if score.cost_usd is not None else {},
            )
    return RunRef(run_id=str(run.id), dataset_id=run.dataset_id, tier=run.tier, status=run.status)


@post("/compare", response=ComparisonMetrics)
def compare(request, payload: CompareIn):
    """NOTE: deviates from lib/api.ts, which signs this as compareStories(datasetId).

    Real similarity scoring needs the human baseline text, which datasetId alone
    cannot supply. See backend/README.md, "Contract deviations".
    """
    run = get_object_or_404(Run, id=payload.run_id)
    if payload.human_text:
        run.human_text = payload.human_text
        run.save(update_fields=["human_text"])
    return services.compare(run, payload.human_text)


# --------------------------------------------------------------------------
# Charts
# --------------------------------------------------------------------------


@post("/charts/suggest", response=charts_http.ChartSuggestOut, exclude_none=True)
def suggest_charts(request, payload: charts_http.ChartSuggestIn):
    """Pick the figures worth drawing for a dataset, registry or uploaded.

    Deliberately NOT a stage on a run, and deliberately not part of
    ``/moderate``. The moderator rewrites a story's tone and is the thing the
    project measures; chart selection reads a table and chooses geometry. They
    share no input, no output and no failure mode, and folding one into the
    other would make every future tone number a measurement of two changes.

    ``exclude_none=True`` is load-bearing rather than tidiness. ``validateSpec``
    on the frontend rejects any modifier the form does not honour and tests for
    presence, not value, so a spec that carries ``stack: null`` for a line chart
    comes back as a refusal panel. See charts/spec.py for the measurement.
    """
    if bool(payload.dataset_id) == bool(payload.upload_id):
        raise HttpError(400, "Give exactly one of datasetId or uploadId.")

    tier = oc.resolve_tier(payload.tier)
    plan = oc.tier_plan(tier)
    if not plan["runnable"]:
        missing = [m for m in tier.distinct_models if m not in plan["installed"]]
        raise HttpError(
            409, f"Tier '{payload.tier}' needs models not pulled: {', '.join(missing)}"
        )

    if payload.dataset_id:
        if payload.dataset_id not in ds.SPECS:
            raise HttpError(404, f"Unknown dataset '{payload.dataset_id}'")
        sources = charts_http.sources_for_dataset(ds.get_dataset(payload.dataset_id))
        source_label = f"dataset:{payload.dataset_id}"
    else:
        record = get_object_or_404(UploadedDataset, id=payload.upload_id)
        sources = charts_http.sources_for_upload(record)
        source_label = f"upload:{record.original_name}"

    # The MODERATOR model, by design decision: in this project the moderator is
    # the agentic role - it moderates tone and runs the factual check - so the
    # agentic reading of a table belongs to it too. That is a choice about which
    # model runs, and it is NOT the same as folding chart selection into
    # ``stage_moderate``: the stages stay separate, so a tone measurement is
    # still a measurement of one change.
    #
    # Overridable so the two can be compared on the same table without editing
    # the tier, which is how the generator/moderator comparison was run.
    model = payload.model or tier.moderator

    selection = charts_select.select_charts(
        sources, model=model, n=max(1, min(payload.n, 6)), seed=payload.seed,
    )

    notes: list[str] = []
    for source in sources:
        notes.extend(source.profile.notes)

    return charts_http.ChartSuggestOut(
        charts=selection.charts,
        columns=charts_http.report_columns(sources),
        notes=notes,
        candidates_considered=selection.considered,
        model=model,
        source=source_label,
    )
