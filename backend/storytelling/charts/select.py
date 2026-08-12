"""The chart-selection agent.

Note what this is **not**: it is not the moderator. ``services.moderate`` is the
project's contribution - it rewrites a story's emotional tone and is measured on
alarmism and optimism. Chart selection shares none of that: different input (a
table, not prose), different output, different failure mode. Hanging it off the
moderator would entangle the one novel claim the project makes with an unrelated
feature, and any tone number afterwards would be measuring two changes at once.

The division of labour, and the whole reason this is reliable on a local model:

    applicability.py  which forms the data can carry   - closed, computed, free
    select.py         which are worth showing, and why - open, editorial, a model
    validate.py       whether the result is honest     - closed, computed, free

The model never names a form from a list of seventeen. It picks an index out of
candidates that are already drawable, already encoded against real columns, and
already carry whatever cut they need. Its actual job is the ranking and the
prose, which is the part no rule table can supply.

A rejected spec is not dropped silently: the validator's own errors are handed
back for one retry, which is the reason for mirroring it server-side at all.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from pydantic import Field

from .. import ollama_client as oc
from ..schemas import Schema
from .applicability import (
    Candidate,
    FrameSource,
    apply_slice,
    candidates_across,
    spec_of,
)
from .profile import DatasetProfile
from .spec import FORM_RULES, ChartFrame, ChartPayload
from .validate import validate_spec

log = logging.getLogger(__name__)

DEFAULT_N = 3

SYSTEM = (
    "You are a data-visualisation editor. You are given a table's columns and a "
    "numbered list of figures that are already known to be drawable from it. "
    "You choose which are worth a reader's attention and write their copy. "
    "You never invent a figure that is not in the list, and you never pick the "
    "same index twice."
)


class Pick(Schema):
    """One chosen figure. ``index`` refers to the candidate list in the prompt."""

    #: What a reader walks away having answered. Declared BEFORE ``index`` on
    #: purpose: fields are decoded in schema order, so the model states a
    #: question and then finds a figure for it, instead of taking a figure and
    #: reverse-engineering a justification. Never shown to the reader - it
    #: exists so the model can see its own earlier questions while writing the
    #: next one, which is the only way "different question" is checkable from
    #: inside the generation. Asking for variety in prose could not do this:
    #: measured, qwen3.5:27b kept a choropleth and a bivariate choropleth of
    #: the same measure under an instruction that named the failure exactly.
    question: str
    index: int
    title: str
    subtitle: str = ""
    caption: str = ""
    rationale: str


class ChartPicks(Schema):
    picks: list[Pick] = Field(default_factory=list)


@dataclass
class Selection:
    """What was chosen, and what it was chosen from.

    The denominator is reported because "3 charts" alone cannot distinguish a
    considered pick from the only three figures the data could carry.
    """

    charts: list[ChartPayload] = field(default_factory=list)
    considered: int = 0
    rejected: list[str] = field(default_factory=list)


def _sources_summary(sources: list[FrameSource]) -> str:
    if len(sources) == 1:
        return f"COLUMNS ({sources[0].profile.row_count} rows)\n" + _column_summary(
            sources[0].profile
        )
    return "\n\n".join(
        f"TABLE {s.name} ({s.profile.row_count} rows)\n" + _column_summary(s.profile)
        for s in sources
    )


def _column_summary(profile: DatasetProfile) -> str:
    lines = []
    for c in profile.columns:
        bits = [f"- {c.key} ({c.type}, {c.label!r}"]
        if c.type == "quantitative" and c.minimum is not None:
            bits.append(f", range {c.minimum:g} to {c.maximum:g}")
        else:
            bits.append(f", {c.distinct} distinct")
        if c.missing:
            bits.append(f", {c.missing:.0%} missing")
        if c.basis == "inferred":
            bits.append(f", type inferred: {c.evidence}")
        lines.append("".join(bits) + ")")
    ratio = profile.magnitude_ratio()
    if ratio and ratio > 50:
        lines.append(
            f"NOTE: the measures differ by about {ratio:.0f}x, so any figure "
            "putting two of them on one axis must be indexed."
        )
    return "\n".join(lines)


def _candidate_list(candidates: list[Candidate]) -> str:
    lines = []
    for i, c in enumerate(candidates):
        enc = ", ".join(f"{k}={v}" for k, v in c.encoding.items() if v)
        where = f" from {c.source}" if c.source else ""
        line = f"{i}. {c.form}{where} [{enc}] - {FORM_RULES[c.form].describe}"
        settings = dict(c.modifiers)
        if c.transform:
            settings["transform"] = c.transform
        # The EFFECTIVE value, not just the explicitly set one. Stating only the
        # explicit settings leaves the model free to invent the rest: given a
        # bar with no orientation named, qwen3.5:4b wrote "Horizontal bars
        # provide an immediate ranking" under a spec that draws them vertically.
        # A default the model cannot see is a default it will guess at.
        if "orientation" in FORM_RULES[c.form].allows:
            settings.setdefault("orientation", "vertical")
        if settings:
            line += " (this figure will render with: " + ", ".join(
                f"{k}={v}" for k, v in settings.items()) + ")"
        line += f"\n   fits because: {c.because}"
        for note in c.notes:
            line += f"\n   note: {note}"
        lines.append(line)
    return "\n".join(lines)


def _prompt(sources: list[FrameSource], candidates: list[Candidate], n: int,
            retry_errors: list[str] | None = None) -> str:
    parts = [
        _sources_summary(sources),
        "",
        "DRAWABLE FIGURES",
        _candidate_list(candidates),
        "",
        f"Choose the {n} that tell this data's story best, most important first.",
        "Write each figure's question FIRST, then choose the figure that "
        "answers it. Every question must be different from the ones you have "
        "already written - check it against them before you commit to it. "
        "Sameness is about the question, not the shape: a map coloured by two "
        "measures and a scatter of those same two measures look nothing alike "
        "and both answer 'do these two move together', so at most one of them "
        "belongs. Two figures of the same measure over the same places are one "
        "question, however differently they are drawn.",
        "",
        "For each, write:",
        "  question   the one thing a reader answers from this figure, in a "
        "short sentence. Not shown to them; it is how you keep the three "
        "figures from collapsing into one.",
        "  title      plain, specific, no more than about 10 words",
        "  subtitle   optional, one clause",
        "  caption    optional, what the reader should notice",
        "  rationale  why THIS form over the alternatives, in one or two "
        "sentences. The page already prints the words 'Why this form:' above "
        "it, so do not repeat them; start with the reason itself. Write for the "
        "reader. Describe only what the figure will actually render with, as "
        "listed, and state no number that is not given above.",
    ]
    if retry_errors:
        parts += [
            "",
            "Your previous answer was rejected:",
            *[f"  - {e}" for e in retry_errors],
            "Choose different indices or fix the copy.",
        ]
    return "\n".join(parts)


def _build(candidate: Candidate, pick: Pick, frame: ChartFrame) -> tuple[ChartPayload | None, list[str]]:
    """A pick plus its candidate, validated against its own sliced frame."""
    sliced = apply_slice(frame, candidate)

    caption = pick.caption
    if candidate.notes:
        # The cut is disclosed to the reader, not buried in a server log.
        note = " ".join(candidate.notes)
        caption = f"{caption} {note}".strip()

    spec = spec_of(
        candidate,
        title=pick.title,
        rationale=pick.rationale,
        subtitle=pick.subtitle,
        caption=caption,
    )
    result = validate_spec(spec, sliced)
    if not result.ok:
        return None, [f"figure {pick.index} ({candidate.form}): {e}" for e in result.errors]

    for warning in result.warnings:
        log.info("chart warning (%s): %s", candidate.form, warning)

    return ChartPayload(spec=spec, frame=sliced), []


def select_charts(
    sources: list[FrameSource],
    *,
    model: str,
    n: int = DEFAULT_N,
    seed: int | None = None,
    temperature: float = 0.0,
) -> Selection:
    """Rank the drawable figures and return the best ``n`` as payloads.

    Raises ``OllamaError`` rather than falling back to a heuristic pick. A
    silent fallback would be indistinguishable from a working agent, which is
    the same reason ``api.py`` surfaces model failures as a 502 instead of
    serving an empty story.
    """
    candidates = candidates_across(sources)
    if not candidates:
        return Selection()

    by_source = {s.name: s.frame for s in sources}

    want = min(n, len(candidates))
    errors: list[str] = []
    payloads: list[ChartPayload] = []
    used: set[int] = set()

    for attempt in (1, 2):
        picks = oc.generate_json(
            model,
            SYSTEM,
            _prompt(sources, candidates, want, errors if attempt > 1 else None),
            ChartPicks,
            temperature=temperature,
            seed=seed,
            num_predict=1200,
        )

        errors = []
        for pick in picks.picks:
            if len(payloads) >= want:
                break
            if not 0 <= pick.index < len(candidates):
                errors.append(f"index {pick.index} is not in the list.")
                continue
            if pick.index in used:
                errors.append(f"index {pick.index} was already chosen.")
                continue
            candidate = candidates[pick.index]
            payload, problems = _build(
                candidate, pick, by_source.get(candidate.source, sources[0].frame)
            )
            if payload is None:
                errors.extend(problems)
                continue
            used.add(pick.index)
            payloads.append(payload)

        if len(payloads) >= want or not errors:
            break
        log.info("chart selection retry, %d rejected: %s", len(errors), errors[:3])

    return Selection(charts=payloads, considered=len(candidates), rejected=errors)
