"""Orchestration: run stages, record telemetry, assemble a StorySet.

The API layer stays thin; everything that knows about ordering, timing and
assembly lives here so the batch command and the HTTP endpoints share one path.
"""

from __future__ import annotations

import logging
import time
from typing import Callable, TypeVar

from . import agents
from . import metrics
from . import ollama_client as oc
from . import textstats
from .models import Run, RunStatus, StageResult
from .schemas import (
    ComparisonMetrics,
    EmotiveSpan,
    Groundedness,
    FactCheckItem,
    StorySet,
    TextSimilarity,
    TextStats,
    TonePhrase,
    ToneVariant,
    TwoTones,
)

log = logging.getLogger(__name__)

T = TypeVar("T")


def _timed(run: Run, stage: str, model: str, fn: Callable[[], T]) -> T:
    start = time.perf_counter()
    result = fn()
    elapsed = time.perf_counter() - start
    payload = result.model_dump(by_alias=True) if hasattr(result, "model_dump") else {}
    usage = getattr(result, "__dict__", {}).get("_usage") or {}
    StageResult.objects.create(
        run=run, stage=stage, model=model, duration_s=round(elapsed, 2),
        payload=payload, usage=usage,
    )
    log.info("%s on %s took %.1fs", stage, model, elapsed)
    return result


# --------------------------------------------------------------------------
# Stages
# --------------------------------------------------------------------------


def start_run(dataset_id: str, tier_id: str) -> Run:
    oc.resolve_tier(tier_id)  # validate early
    return Run.objects.create(dataset_id=dataset_id, tier=tier_id)


def do_generate(run: Run, seed: int | None = None) -> Run:
    tier = oc.resolve_tier(run.tier)
    run.status = RunStatus.GENERATING
    run.save(update_fields=["status"])

    out = _timed(run, StageResult.Stage.GENERATE, tier.generator,
                 lambda: agents.run_generate(run.dataset_id, run.tier, seed=seed))
    judged = _timed(run, StageResult.Stage.JUDGE_RAW, tier.judge,
                    lambda: agents.run_judge(run.tier, out.title, out.paragraphs))

    run.raw_title = out.title
    run.raw_paragraphs = out.paragraphs
    run.raw_alarmism = judged.alarmism_rating
    run.save()
    return run


def do_moderate(run: Run) -> Run:
    tier = oc.resolve_tier(run.tier)
    run.status = RunStatus.MODERATING
    run.save(update_fields=["status"])

    out = _timed(run, StageResult.Stage.MODERATE, tier.moderator,
                 lambda: agents.run_moderate(run.dataset_id, run.tier,
                                             run.raw_title, run.raw_paragraphs))
    judged = _timed(run, StageResult.Stage.JUDGE_MODERATED, tier.judge,
                    lambda: agents.run_judge(run.tier, out.title, out.paragraphs))

    run.moderated_title = out.title
    run.moderated_paragraphs = out.paragraphs
    run.emotive_spans = [s.model_dump(by_alias=True) for s in out.emotive_spans]
    run.moderated_alarmism = judged.alarmism_rating
    run.save()
    return run


def do_factcheck(run: Run) -> Run:
    tier = oc.resolve_tier(run.tier)
    run.status = RunStatus.FACTCHECKING
    run.save(update_fields=["status"])

    out = _timed(run, StageResult.Stage.FACTCHECK, tier.moderator,
                 lambda: agents.run_factcheck(run.dataset_id, run.tier,
                                              run.moderated_title or run.raw_title,
                                              run.moderated_paragraphs or run.raw_paragraphs))
    run.factual_check = [i.model_dump(by_alias=True) for i in out.items]
    run.status = RunStatus.DONE
    run.save()
    return run


def run_full_pipeline(dataset_id: str, tier_id: str, seed: int | None = None) -> Run:
    """All three stages back to back. Used by the batch command."""
    run = start_run(dataset_id, tier_id)
    try:
        do_generate(run, seed=seed)
        do_moderate(run)
        do_factcheck(run)
    except Exception as exc:  # noqa: BLE001 - the failure must be visible, not swallowed
        run.status = RunStatus.FAILED
        run.error = f"{type(exc).__name__}: {exc}"
        run.save(update_fields=["status", "error"])
        raise
    return run


# --------------------------------------------------------------------------
# Assembly
# --------------------------------------------------------------------------


def _human_variant(run: Run) -> ToneVariant:
    paragraphs = [p.strip() for p in run.human_text.split("\n\n") if p.strip()]
    return ToneVariant(
        id="human",
        label="Human baseline",
        author="Human author",
        title=run.human_title or "Human baseline",
        alarmism_rating=run.human_alarmism,
        paragraphs=paragraphs or ["No human baseline has been written yet."],
    )


def to_story_set(run: Run) -> StorySet:
    tier = oc.resolve_tier(run.tier)
    spans = [EmotiveSpan.model_validate(s) for s in run.emotive_spans]
    return StorySet(
        dataset_id=run.dataset_id,
        human=_human_variant(run),
        ai_raw=ToneVariant(
            id="ai-raw",
            label="LLM - raw",
            author=f"General LLM ({tier.generator})",
            title=run.raw_title,
            alarmism_rating=run.raw_alarmism,
            paragraphs=run.raw_paragraphs,
        ),
        ai_moderated=ToneVariant(
            id="ai-moderated",
            label="LLM - tone-moderated",
            author=f"Agentic moderator ({tier.moderator})",
            title=run.moderated_title,
            alarmism_rating=run.moderated_alarmism,
            paragraphs=run.moderated_paragraphs,
        ),
        emotive_spans=spans,
        two_tones=TwoTones(
            alarmist=[TonePhrase(text=s.text, accent=True) for s in spans[:4]],
            calibrated=[TonePhrase(text=s.replacement, accent=True) for s in spans[:4]],
        ),
        factual_check=[FactCheckItem.model_validate(i) for i in run.factual_check],
    )


# --------------------------------------------------------------------------
# Comparison metrics
# --------------------------------------------------------------------------


def _dataset_values(dataset_id: str):
    """Every figure the generator was given for this dataset, plus its years."""
    import pandas as pd
    from .datasets import SPECS, load_frame
    spec = SPECS[dataset_id]
    df = load_frame(dataset_id)
    agg = df[df["country"] == spec.aggregate_row]
    values, years = [], []
    for _, r in agg.iterrows():
        for col in (spec.primary_col, spec.secondary_col):
            v = r.get(col)
            if v is not None and not pd.isna(v):
                values.append(float(v))
        years.append(int(r["year"]))
    latest = int(df["year"].max())
    for country in spec.spotlight:
        row = df[(df["country"] == country) & (df["year"] == latest)]
        if row.empty:
            continue
        for col in (spec.primary_col, spec.secondary_col, "incidence_per_million"):
            v = row.iloc[0].get(col)
            if v is not None and not pd.isna(v):
                values.append(float(v))
    if spec.reference_line:
        values.append(float(spec.reference_line[0]))
    return values, sorted(set(years))


def compare(run: Run, human_text: str = "") -> ComparisonMetrics:
    """Similarity, groundedness and text-only tone measures.

    Three changes from the first version, all because the old numbers were not
    measurements:

    * BLEU-4 was unsmoothed, sentence-level and single-pair, so it returned 0.0
      on essentially every real comparison. chrF++ is now primary.
    * `facts_preserved` was `not any(status == "flagged")`, which restated the
      fact-checker and carried no independent information. It is replaced by a
      groundedness check computed in Python against the dataset.
    * Missing alarmism ratings were rendered as 0.0. They are now None.
    """
    reference = human_text or run.human_text
    candidate = "\n\n".join(run.moderated_paragraphs)
    raw_text = "\n\n".join(run.raw_paragraphs)

    sim = metrics.all_metrics(reference, candidate) if reference and candidate else {}
    similarity = [
        TextSimilarity(metric="chrF++", value=sim.get("chrf++", 0.0)),
        TextSimilarity(metric="BLEU-1", value=sim.get("bleu1", 0.0)),
        TextSimilarity(metric="BLEU-2", value=sim.get("bleu2", 0.0)),
        TextSimilarity(metric="BLEU-4 (smoothed)", value=sim.get("bleu4_smooth_exp", 0.0)),
        TextSimilarity(metric="ROUGE-L", value=sim.get("rouge_l", 0.0)),
        TextSimilarity(metric="METEOR", value=sim.get("meteor_lite", 0.0)),
    ]

    ground_raw = ground_mod = None
    try:
        values, years = _dataset_values(run.dataset_id)
        if raw_text:
            ground_raw = Groundedness(**metrics.groundedness(raw_text, values, years))
        if candidate:
            ground_mod = Groundedness(**metrics.groundedness(candidate, values, years))
    except Exception as exc:  # noqa: BLE001 - visible, never silently zeroed
        log.warning("groundedness unavailable for %s: %s", run.dataset_id, exc)

    return ComparisonMetrics(
        text_similarity=similarity,
        alarmism_before=run.raw_alarmism,
        alarmism_after=run.moderated_alarmism,
        alarmism_human=run.human_alarmism,
        emotive_spans_removed=len(run.emotive_spans),
        groundedness_raw=ground_raw,
        groundedness_moderated=ground_mod,
        textstats_raw=TextStats(**{k: v for k, v in textstats.analyse(raw_text).items()
                                   if k in TextStats.model_fields}) if raw_text else None,
        textstats_moderated=TextStats(**{k: v for k, v in textstats.analyse(candidate).items()
                                         if k in TextStats.model_fields}) if candidate else None,
    )
