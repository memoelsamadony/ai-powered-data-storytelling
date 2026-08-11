"""An independent tone judge, run through the Claude CLI as a subprocess.

Why a subprocess and not an API call: the CLI is already installed and
authenticated on the machines this project runs on, so no key has to be put in
a settings file or a .env that the repo then has to keep out of git.

Why an independent judge at all: on the mid and large tiers the local judge and
the moderator are the same model (``gemma4:31b``), so the tone delta, the
project's novel metric, is self-assessed. A judge from a different family and a
different vendor is the control for that. Its scores are stored beside the
local ones and never replace them, because the comparison is the measurement.

Why two axes: see the note above ``SYSTEM``. Both are scored in one call.

Cost: the CLI reports `total_cost_usd`, which is the equivalent API list price
of the tokens used, not money charged. On a Claude subscription these calls draw
against the plan's limits rather than being billed per call. What the flags
below actually buy is a smaller draw: about 16k cache-creation tokens per call
against 67k with the CLI's defaults, because the harness system prompt and its
tool definitions are stripped and a judge uses neither.
"""

from __future__ import annotations

import json
import logging
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass

from .models import Run, StageResult

log = logging.getLogger(__name__)

BINARY = "claude"
DEFAULT_MODEL = "opus"
TIMEOUT_S = 180

# Two axes, because the project's two datasets fail in opposite directions and
# one axis can only see one of them. Measles tempts alarmism; WHO child
# mortality tempts false reassurance, and a story that glosses over the
# countries still burying one child in twenty scores a calm 2.0 for alarmism
# while being exactly as miscalibrated. Scoring only alarmism left the
# over-optimism dataset's own failure mode unmeasured.
#
# Both scales keep the same shape - 3 is calibrated, both ends are failures -
# so the existing anchors, the 2.0-3.0 calibrated band and `humanBand` all
# still mean what they meant. Alarmism's definition is deliberately unchanged:
# runs already stored were scored against it.
#
# They are not each other's inverse and the prompt says so. A story can be low
# on both (flat, no stance) or high on both ("catastrophe averted!", which
# catastrophises the past while over-reassuring about the present), and those
# divergent cases are most of what the second axis buys.
SYSTEM = (
    "You are an impartial evaluator of the emotional tone of data journalism. "
    "You rate two independent axes, each 1-5, where on both axes BOTH ends are "
    "failures and 3 is calibrated.\n"
    "ALARMISM: 1 = flat, numbing, hides real stakes; 3 = calibrated; "
    "5 = manipulative catastrophising.\n"
    "OPTIMISM: 1 = bleak, denies real progress the data shows; 3 = calibrated; "
    "5 = false reassurance, glosses over remaining harm.\n"
    "The axes are independent, not opposites. A flat, stance-free story is low "
    "on both. A story that catastrophises what happened while implying the "
    "danger has passed is high on both. Score each on its own terms.\n"
    "You judge tone only, never factual accuracy. You reply with JSON and nothing else."
)

# Every tool the CLI would otherwise define in the system prompt. A judge reads
# one prompt and answers; loading the agent toolset costs tokens for nothing.
_UNUSED_TOOLS = [
    "Bash", "Read", "Write", "Edit", "Glob", "Grep", "WebFetch", "WebSearch",
    "Task", "TodoWrite", "NotebookEdit", "Agent", "Skill",
]

ONE_STORY_PROMPT = """Rate the emotional tone of this data story on both axes.

It was written from this data:
{table}

--- STORY ---
{title}

{body}

Reply with exactly this JSON and nothing else:
{{"alarmism": <1-5, one decimal>, "optimism": <1-5, one decimal>,
  "rationale": "<one sentence naming the phrasing that set each>"}}"""

# There is deliberately no paired prompt here. Earlier versions showed the judge
# both stories in one call, labelled "VERSION A (unmoderated)" and "VERSION B
# (after tone moderation)", always in that order. That names the treatment to
# the rater, so any gap it reports is confounded with its expectation that B
# should be calmer, and the fixed order adds position bias on top. judge_run
# now makes two independent ONE_STORY_PROMPT calls instead.


class JudgeUnavailable(RuntimeError):
    """The CLI is missing, unauthenticated, or did not return usable JSON."""


def is_available() -> bool:
    return shutil.which(BINARY) is not None


def _extract_json(text: str) -> dict:
    """Parse the judge's reply, tolerating a fenced or prose-wrapped object."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.+?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        brace = re.search(r"\{.*\}", text, re.S)
        if not brace:
            raise JudgeUnavailable(f"judge returned no JSON: {text[:200]}")
        return json.loads(brace.group(0))


def run_cli(prompt: str, model: str = DEFAULT_MODEL,
            system: str = SYSTEM) -> tuple[str, float | None, float]:
    """Invoke the CLI headless. Returns (reply text, cost in USD, duration in s).

    The prompt goes in on stdin rather than as an argument, so nothing in a
    story can be read as a flag, and there is no shell to quote for:
    ``shell=False`` with an argument list throughout.

    ``system`` defaults to the two-axis tone rubric because that is what this
    module exists for, but a caller asking a different question must pass its
    own. The default ends with "judge tone only, never factual accuracy", which
    silently gags a caller asking about factual accuracy: that happened to the
    pairwise evaluator and cost it a criterion.
    """
    if not is_available():
        raise JudgeUnavailable(
            f"'{BINARY}' is not on PATH. Install the Claude CLI to use the independent judge."
        )
    cmd = [
        BINARY,
        "-p",
        "--output-format", "json",
        "--model", model,
        "--system-prompt", system,
        # Load no user, project or local settings, and no MCP servers: this is
        # a judge, and inheriting a developer's config would make the score
        # depend on whose machine it ran on.
        "--setting-sources", "",
        "--strict-mcp-config",
        "--disallowed-tools", *_UNUSED_TOOLS,
    ]
    # A scratch cwd, so no repo CLAUDE.md or skill is picked up as context.
    with tempfile.TemporaryDirectory() as neutral_cwd:
        try:
            proc = subprocess.run(
                cmd,
                input=prompt,
                capture_output=True,
                text=True,
                timeout=TIMEOUT_S,
                cwd=neutral_cwd,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise JudgeUnavailable(f"judge timed out after {TIMEOUT_S}s") from exc

    if proc.returncode != 0:
        raise JudgeUnavailable(f"judge exited {proc.returncode}: {proc.stderr.strip()[:300]}")

    try:
        envelope = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise JudgeUnavailable(f"judge returned non-JSON envelope: {proc.stdout[:200]}") from exc

    if envelope.get("is_error"):
        raise JudgeUnavailable(f"judge reported an error: {str(envelope.get('result'))[:300]}")
    return (
        envelope.get("result", ""),
        envelope.get("total_cost_usd"),
        (envelope.get("duration_ms") or 0) / 1000,
    )


def _rating(verdict: dict, key: str, reply: str) -> float:
    try:
        value = float(verdict[key])
    except (KeyError, TypeError, ValueError) as exc:
        raise JudgeUnavailable(f"judge omitted '{key}': {reply[:200]}") from exc
    return max(1.0, min(5.0, value))


@dataclass(frozen=True)
class StoryScore:
    """Both axes for one story, from one call."""

    alarmism: float
    optimism: float
    rationale: str
    cost_usd: float | None
    duration_s: float


def score_story(
    table: str, title: str, paragraphs: list[str], model: str = DEFAULT_MODEL
) -> StoryScore:
    """Rate one story on both axes, in a single call.

    One call rather than two, and not only to halve the cost: the two ratings
    are then made by the same reader against each other in one context, so
    "3.8 alarmist" and "1.9 optimistic" are a coherent pair rather than two
    independent readings that may not describe the same story.

    This is what the pipeline calls at the end of the generate and moderate
    stages, in place of the Ollama judge. Raises JudgeUnavailable rather than
    guessing, so an unjudged story is recorded as unjudged.
    """
    reply, cost, duration = run_cli(
        ONE_STORY_PROMPT.format(table=table, title=title, body="\n\n".join(paragraphs)),
        model=model,
    )
    verdict = _extract_json(reply)
    return StoryScore(
        alarmism=_rating(verdict, "alarmism", reply),
        optimism=_rating(verdict, "optimism", reply),
        rationale=str(verdict.get("rationale", ""))[:1000],
        cost_usd=cost,
        duration_s=duration,
    )


def judge_run(run: Run, table: str, model: str = DEFAULT_MODEL) -> Run:
    """Score one run's two stories with the independent judge and persist it.

    Two calls, one per story, not one call showing both. The two axes stay
    together in a single call, because that argument holds: alarmism and
    optimism are two readings of one story and a single reader should make them
    against each other. It does not extend to the two *stories*. Showing both
    at once means labelling which is which, and the label is the treatment.

    So the judge never learns that these two stories belong to one run, which
    of them was moderated, or that a moderation step exists. The delta is
    arithmetic done here, from two independently produced pairs of numbers.
    """
    if not run.raw_paragraphs:
        raise JudgeUnavailable("run has no generated story to judge")
    if not run.moderated_paragraphs:
        raise JudgeUnavailable("run has not been moderated yet, so there is nothing to compare")

    scored = {
        kind: score_story(table, title, paragraphs, model=model)
        for kind, title, paragraphs in (
            ("raw", run.raw_title, run.raw_paragraphs),
            ("moderated", run.moderated_title, run.moderated_paragraphs),
        )
    }
    costs = [s.cost_usd for s in scored.values() if s.cost_usd is not None]

    run.opus_raw_alarmism = scored["raw"].alarmism
    run.opus_raw_optimism = scored["raw"].optimism
    run.opus_moderated_alarmism = scored["moderated"].alarmism
    run.opus_moderated_optimism = scored["moderated"].optimism
    run.opus_rationale = (f"raw: {scored['raw'].rationale}\n"
                          f"moderated: {scored['moderated'].rationale}")[:2000]
    run.opus_model = model
    run.opus_cost_usd = sum(costs) if costs else None
    run.save(
        update_fields=[
            "opus_raw_alarmism",
            "opus_raw_optimism",
            "opus_moderated_alarmism",
            "opus_moderated_optimism",
            "opus_rationale",
            "opus_model",
            "opus_cost_usd",
        ]
    )
    seconds = sum(s.duration_s for s in scored.values())
    StageResult.objects.create(
        run=run,
        stage="judge_independent",
        model=f"claude/{model}",
        duration_s=round(seconds, 2),
        payload={"blind": True, "calls": 2,
                 **{k: {"alarmism": s.alarmism, "optimism": s.optimism,
                        "rationale": s.rationale} for k, s in scored.items()}},
        usage={"cost_usd": run.opus_cost_usd} if costs else {},
    )
    log.info("independent judge (%s) scored run %s blind in %.1fs", model, run.id, seconds)
    return run
