"""An independent tone judge, run through the Claude CLI as a subprocess.

Why a subprocess and not an API call: the CLI is already installed and
authenticated on the machines this project runs on, so no key has to be put in
a settings file or a .env that the repo then has to keep out of git.

Why an independent judge at all: on the mid and large tiers the local judge and
the moderator are the same model (``gemma4:31b``), so the alarmism delta, the
project's novel metric, is self-assessed. A judge from a different family and a
different vendor is the control for that. Its scores are stored beside the
local ones and never replace them, because the comparison is the measurement.

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

from .models import Run, StageResult

log = logging.getLogger(__name__)

BINARY = "claude"
DEFAULT_MODEL = "opus"
TIMEOUT_S = 180

SYSTEM = (
    "You are an impartial evaluator of the emotional tone of data journalism. "
    "You rate alarmism on a 1-5 scale where BOTH ends are failures: 1 is flat "
    "and hides real stakes, 3 is calibrated, 5 is manipulative catastrophising. "
    "You judge tone only, never factual accuracy. You reply with JSON and nothing else."
)

# Every tool the CLI would otherwise define in the system prompt. A judge reads
# one prompt and answers; loading the agent toolset costs tokens for nothing.
_UNUSED_TOOLS = [
    "Bash", "Read", "Write", "Edit", "Glob", "Grep", "WebFetch", "WebSearch",
    "Task", "TodoWrite", "NotebookEdit", "Agent", "Skill",
]

ONE_STORY_PROMPT = """Rate the emotional tone of this data story.

It was written from this data:
{table}

--- STORY ---
{title}

{body}

Reply with exactly this JSON and nothing else:
{{"alarmism": <1-5, one decimal>, "rationale": "<one sentence naming what set it>"}}"""

# There is deliberately no paired prompt here. An earlier version showed the
# judge both stories at once, labelled "VERSION A (unmoderated)" and
# "VERSION B (after tone moderation)". That names the treatment to the rater, so
# any gap it reports is confounded with its expectation that B should be calmer,
# and the fixed A-then-B order adds position bias on top. Both stories are now
# scored by separate calls to ONE_STORY_PROMPT, which carries no label and no
# sibling to compare against; the two calls share no context, so neither can
# anchor the other.


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

    ``system`` defaults to the alarmism rubric because that is what this module
    exists for, but any caller asking a different question must pass its own.
    The default tells the model to judge "tone only, never factual accuracy",
    which would quietly gag a caller asking about factual accuracy.
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


def score_story(
    table: str, title: str, paragraphs: list[str], model: str = DEFAULT_MODEL
) -> tuple[float, str, float | None, float]:
    """Rate one story. Returns (rating, rationale, cost estimate, seconds).

    This is what the pipeline calls at the end of the generate and moderate
    stages, in place of the Ollama judge. Raises JudgeUnavailable rather than
    guessing, so an unjudged story is recorded as unjudged.
    """
    reply, cost, duration = run_cli(
        ONE_STORY_PROMPT.format(table=table, title=title, body="\n\n".join(paragraphs)),
        model=model,
    )
    verdict = _extract_json(reply)
    try:
        rating = float(verdict["alarmism"])
    except (KeyError, TypeError, ValueError) as exc:
        raise JudgeUnavailable(f"judge omitted 'alarmism': {reply[:200]}") from exc
    return max(1.0, min(5.0, rating)), str(verdict.get("rationale", ""))[:1000], cost, duration


def judge_run(run: Run, table: str, model: str = DEFAULT_MODEL) -> Run:
    """Score one run's two stories with the independent judge and persist it.

    Two blind calls, not one paired call. The judge never learns that these two
    stories belong to the same run, which of them is the treatment, or that a
    treatment exists at all: it sees one story and the table it came from, and
    the delta is computed here from two independently produced numbers.
    """
    if not run.raw_paragraphs:
        raise JudgeUnavailable("run has no generated story to judge")
    if not run.moderated_paragraphs:
        raise JudgeUnavailable("run has not been moderated yet, so there is nothing to compare")

    scored = {}
    for kind, title, paragraphs in (
        ("raw", run.raw_title, run.raw_paragraphs),
        ("moderated", run.moderated_title, run.moderated_paragraphs),
    ):
        rating, rationale, cost, duration = score_story(table, title, paragraphs, model=model)
        scored[kind] = {"rating": rating, "rationale": rationale,
                        "cost_usd": cost, "seconds": round(duration, 2)}

    costs = [s["cost_usd"] for s in scored.values() if s["cost_usd"] is not None]
    run.opus_raw_alarmism = scored["raw"]["rating"]
    run.opus_moderated_alarmism = scored["moderated"]["rating"]
    run.opus_rationale = (
        f"raw: {scored['raw']['rationale']}\n"
        f"moderated: {scored['moderated']['rationale']}"
    )[:2000]
    run.opus_model = model
    run.opus_cost_usd = sum(costs) if costs else None
    run.save(
        update_fields=[
            "opus_raw_alarmism",
            "opus_moderated_alarmism",
            "opus_rationale",
            "opus_model",
            "opus_cost_usd",
        ]
    )
    seconds = sum(s["seconds"] for s in scored.values())
    StageResult.objects.create(
        run=run,
        stage="judge_independent",
        model=f"claude/{model}",
        duration_s=round(seconds, 2),
        payload={"blind": True, "calls": 2, **scored},
        usage={"cost_usd": run.opus_cost_usd} if costs else {},
    )
    log.info("independent judge (%s) scored run %s blind in %.1fs", model, run.id, seconds)
    return run
