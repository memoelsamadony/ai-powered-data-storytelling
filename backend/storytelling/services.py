"""Orchestration: run stages, record telemetry, assemble a StorySet.

The API layer stays thin; everything that knows about ordering, timing and
assembly lives here so the batch command and the HTTP endpoints share one path.
"""

from __future__ import annotations

import logging
import time
from typing import Callable, TypeVar

from . import agents
from . import ollama_client as oc
from .models import Run, RunStatus, StageResult
from .schemas import (
    ComparisonMetrics,
    EmotiveSpan,
    FactCheckItem,
    StorySet,
    TextSimilarity,
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


def do_generate(run: Run) -> Run:
    tier = oc.resolve_tier(run.tier)
    run.status = RunStatus.GENERATING
    run.save(update_fields=["status"])

    out = _timed(run, StageResult.Stage.GENERATE, tier.generator,
                 lambda: agents.run_generate(run.dataset_id, run.tier))
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


def run_full_pipeline(dataset_id: str, tier_id: str) -> Run:
    """All three stages back to back. Used by the batch command."""
    run = start_run(dataset_id, tier_id)
    try:
        do_generate(run)
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
        alarmism_rating=2.5,  # placeholder until the human story is judged too
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
            alarmism_rating=run.raw_alarmism or 3.0,
            paragraphs=run.raw_paragraphs,
        ),
        ai_moderated=ToneVariant(
            id="ai-moderated",
            label="LLM - tone-moderated",
            author=f"Agentic moderator ({tier.moderator})",
            title=run.moderated_title,
            alarmism_rating=run.moderated_alarmism or 2.0,
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


def _tokens(text: str) -> list[str]:
    return [t for t in "".join(c.lower() if c.isalnum() else " " for c in text).split() if t]


def _ngrams(tokens: list[str], n: int) -> list[tuple[str, ...]]:
    return [tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]


def _bleu(reference: str, candidate: str, max_n: int = 4) -> float:
    """Corpus-free BLEU with brevity penalty. Pure stdlib, no NLTK dependency."""
    ref, cand = _tokens(reference), _tokens(candidate)
    if not ref or not cand:
        return 0.0
    import math
    precisions = []
    for n in range(1, max_n + 1):
        cand_ng, ref_ng = _ngrams(cand, n), _ngrams(ref, n)
        if not cand_ng:
            precisions.append(0.0)
            continue
        ref_counts: dict[tuple[str, ...], int] = {}
        for g in ref_ng:
            ref_counts[g] = ref_counts.get(g, 0) + 1
        hits = 0
        for g in cand_ng:
            if ref_counts.get(g, 0) > 0:
                hits += 1
                ref_counts[g] -= 1
        precisions.append(hits / len(cand_ng))
    if min(precisions) == 0:
        return 0.0
    geo = math.exp(sum(math.log(p) for p in precisions) / max_n)
    bp = 1.0 if len(cand) > len(ref) else math.exp(1 - len(ref) / len(cand))
    return round(geo * bp, 4)


def _rouge_l(reference: str, candidate: str) -> float:
    ref, cand = _tokens(reference), _tokens(candidate)
    if not ref or not cand:
        return 0.0
    # LCS length via DP
    prev = [0] * (len(cand) + 1)
    for r in ref:
        cur = [0]
        for j, c in enumerate(cand):
            cur.append(prev[j] + 1 if r == c else max(cur[j], prev[j + 1]))
        prev = cur
    lcs = prev[-1]
    if lcs == 0:
        return 0.0
    prec, rec = lcs / len(cand), lcs / len(ref)
    return round(2 * prec * rec / (prec + rec), 4)


def _unigram_f1(reference: str, candidate: str) -> float:
    ref, cand = _tokens(reference), _tokens(candidate)
    if not ref or not cand:
        return 0.0
    overlap = len(set(ref) & set(cand))
    if overlap == 0:
        return 0.0
    prec, rec = overlap / len(set(cand)), overlap / len(set(ref))
    return round(2 * prec * rec / (prec + rec), 4)


def compare(run: Run, human_text: str = "") -> ComparisonMetrics:
    """Similarity of the moderated story against the human baseline."""
    reference = human_text or run.human_text
    candidate = "\n\n".join(run.moderated_paragraphs)
    return ComparisonMetrics(
        text_similarity=[
            TextSimilarity(metric="BLEU", value=_bleu(reference, candidate)),
            TextSimilarity(metric="ROUGE-L", value=_rouge_l(reference, candidate)),
            TextSimilarity(metric="Unigram F1", value=_unigram_f1(reference, candidate)),
        ],
        alarmism_before=run.raw_alarmism or 0.0,
        alarmism_after=run.moderated_alarmism or 0.0,
        emotive_spans_removed=len(run.emotive_spans),
        facts_preserved=not any(
            i.get("status") == "flagged" for i in run.factual_check
        ),
    )
