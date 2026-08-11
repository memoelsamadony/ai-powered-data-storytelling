"""The four agents of the pipeline.

Stage order mirrors ``lib/data/pipeline.ts`` so the frontend stepper and the
backend agree on what is happening:

    generate  -> a general LLM writes a first-draft data story
    moderate  -> the tone agent rebalances emotional framing   (the contribution)
    factcheck -> a separate lightweight verifier checks the numbers

Two prompt rules below come directly from the project's own judge verdict on the
first real run, and are the reason this is not a straight port of
``emotional-tone-moderation/pipeline.py``:

1. The moderator over-corrected into flatness and dropped the genuinely useful
   "coverage below 95% for a decade" insight. So it is now told to *preserve
   legitimate urgency*, not merely to remove heat.
2. Neither model used per-capita rates when comparing countries of very
   different size. That is now an explicit item in the moderator's rubric.

The factual check exists as its own stage because that same run showed the tone
agent silently correcting a hallucinated number without flagging it. A tone
agent is not a fact checker.
"""

from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path

from . import ollama_client as oc
from .datasets import pack_text, pack_sha256
from .schemas import FactCheckOut, GenerateOut, JudgeOut, ModerateOut

log = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Prompts
# --------------------------------------------------------------------------

GENERATE_SYSTEM = (
    "You are a data journalist who writes short, vivid, attention-grabbing stories "
    "for a general audience."
)

GENERATE_PROMPT = """{table}

Write a SHORT data story (120-160 words) about this data using ONLY the numbers above.
Make it engaging and memorable. Give it a headline.

Return JSON: a "title" and "paragraphs" (2 to 4 short paragraphs)."""


MODERATE_SYSTEM = (
    "You are an EMOTIONAL-TONE MODERATION agent for data stories. You detect "
    "exaggerated, alarmist, manipulative, falsely reassuring or numbingly detached "
    "tone, and you rewrite the story so the tone is calibrated and faithful to the "
    "data.\n"
    "You must NOT remove factual substance or legitimate gravity, and you must NOT "
    "add any facts or numbers that are not in the provided data.\n"
    "Reduce manipulation while PRESERVING legitimate urgency and the most "
    "informative framing. A story stripped of all weight is a failure, not a success."
)

MODERATE_PROMPT = """{table}

Here is a data story produced by another model:
\"\"\"
{story}
\"\"\"

Moderate its emotional tone. Look specifically for:
- exaggeration and intensity verbs ("exploding", "skyrocketed", "roars back")
- fear framing and catastrophising
- misleading baselines and scale tricks (e.g. "from 10 to 645" without context)
- overstated causation presented as established fact
- dropped denominators: raw counts used to compare places of very different size,
  where a per-capita rate is available and more honest
- unsupported predictions
- the opposite failure: false reassurance, or a tone so flat it hides real stakes

Return JSON with:
- "title": a calibrated headline
- "paragraphs": the rewritten story, same length, faithful to the data
- "emotiveSpans": every phrase you changed, as {{"text": the original phrase,
  "replacement": what you replaced it with, "reason": the short tone problem it had,
  "category": which of the four families the problem belongs to}}

The four categories, exactly one per edit:
- "intensity": a verb or adjective dialled up beyond what the data says
- "framing": fear, doom, false reassurance or complacency
- "overreach": a causal or predictive claim the table cannot support
- "grounding": a vague or invented figure replaced with the real one"""


FACTCHECK_SYSTEM = (
    "You are a factual-consistency checker for data stories. You verify each "
    "quantitative or factual claim in a story strictly against the supplied data "
    "table. You do not judge tone, style or wording - only whether claims are "
    "supported by the data."
)

FACTCHECK_PROMPT = """{table}

Check this data story against the table above:
\"\"\"
{story}
\"\"\"

For every specific claim (numbers, trends, comparisons, causal statements), decide:
- "verified": the data supports it
- "flagged": the data contradicts it, or it is a causal/predictive claim the data
  cannot support
- "corrected": it restates a figure that differs from an earlier draft but now
  matches the data

Be strict about causal claims: "driven by", "amid", "because of" are almost never
supported by a table of counts and coverage.

Return JSON: "items", each {{"claim": the claim as stated, "status": one of
verified/flagged/corrected, "note": one sentence of justification citing the data}}."""


# --------------------------------------------------------------------------
# P0.12: the judge and the human raters use ONE rubric, loaded from ONE file.
# --------------------------------------------------------------------------
# EXPERIMENT_PLAN.md section 8 requires raters to use "the identical rubric
# given to the judges". Copying the text into this file would satisfy that on
# the day it was copied and drift silently afterwards, so the rubric is read
# from `experiments/human-baselines/RUBRIC.md` at import time and its id and
# sha256 are recorded with every judgment. If the two ever differ, the
# validation study would report agreement for an instrument the experiment
# never used.

_RUBRIC_PATH = (Path(__file__).resolve().parents[2]
                / "experiments" / "human-baselines" / "RUBRIC.md")
_RUBRIC_RE = re.compile(
    r"<!--\s*BEGIN VERBATIM RUBRIC\s*(?P<id>[^>]*?)\s*-->(?P<body>.*?)"
    r"<!--\s*END VERBATIM RUBRIC[^>]*-->",
    re.S)


def load_rubric(path: Path | None = None) -> tuple[str, str, str]:
    """Return (rubric_id, text, sha256) from the single source of truth."""
    p = path or _RUBRIC_PATH
    m = _RUBRIC_RE.search(p.read_text())
    if not m:
        raise RuntimeError(
            f"No verbatim rubric block found in {p}. The judge refuses to run on an "
            "ad hoc scale: see P0.12 in EXPERIMENT_PLAN_ADDENDUM.md."
        )
    body = m.group("body").strip()
    return m.group("id").strip(), body, hashlib.sha256(body.encode()).hexdigest()


RUBRIC_ID, RUBRIC_TEXT, RUBRIC_SHA256 = load_rubric()

JUDGE_SYSTEM = (
    "You are an impartial judge rating the emotional tone of data journalism.\n\n"
    + RUBRIC_TEXT
)

JUDGE_PROMPT = """Rate the alarmism of this data story.

\"\"\"
{story}
\"\"\"

Return JSON: "alarmismRating" (1 to 5 in half-point steps: 1, 1.5, 2, 2.5, 3, 3.5, 4,
4.5 or 5) and "rationale" (one sentence naming the phrasing that drove the score)."""


# --------------------------------------------------------------------------
# Stage runners
# --------------------------------------------------------------------------


def _exclusive(plan: dict) -> bool:
    """On a sequential tier a stage must evict any *other* resident model first.

    Note this is not the same as unloading after every call. moderate, judge and
    factcheck all run on the moderator, so once it is loaded it stays loaded and
    the 19-23 GB load is paid once per run, not once per stage.
    """
    return bool(plan["sequential"])


def _story_text(title: str, paragraphs: list[str]) -> str:
    return f"{title}\n\n" + "\n\n".join(paragraphs)


def run_generate(dataset_id: str, tier_id: str, seed: int | None = None) -> GenerateOut:
    tier = oc.resolve_tier(tier_id)
    plan = oc.tier_plan(tier)
    table = pack_text(dataset_id)
    out = oc.generate_json(
        tier.generator,
        GENERATE_SYSTEM,
        GENERATE_PROMPT.format(table=table),
        GenerateOut,
        temperature=0.6,  # the generator is meant to reach for drama
        num_predict=450,  # 120-160 words + JSON overhead; caps downstream cost too
        seed=seed,
        exclusive=_exclusive(plan),
    )
    return out


def run_moderate(dataset_id: str, tier_id: str, title: str, paragraphs: list[str]) -> ModerateOut:
    tier = oc.resolve_tier(tier_id)
    plan = oc.tier_plan(tier)
    out = oc.generate_json(
        tier.moderator,
        MODERATE_SYSTEM,
        MODERATE_PROMPT.format(
            table=pack_text(dataset_id),
            story=_story_text(title, paragraphs),
        ),
        ModerateOut,
        temperature=0.0,
        # the largest output of the run: a full rewrite plus every changed span
        num_predict=3000,
        exclusive=_exclusive(plan),
    )
    return out


def run_judge(tier_id: str, title: str, paragraphs: list[str]) -> JudgeOut:
    """The cheap in-pipeline tone rating, from a local Ollama model.

    Kept after the Claude judge landed, rather than replaced by it. The two
    ratings live in different columns and disagreeing is the point: comparing
    them is what showed the local rater compresses the moderation effect to
    about 57% of its measured size. Overwriting `raw_alarmism` with Claude
    scores would also mix two instruments inside one column, so runs recorded
    before and after the change would no longer be comparable.
    """
    tier = oc.resolve_tier(tier_id)
    plan = oc.tier_plan(tier)
    return oc.generate_json(
        tier.judge,
        JUDGE_SYSTEM,
        JUDGE_PROMPT.format(story=_story_text(title, paragraphs)),
        JudgeOut,
        temperature=0.0,
        num_predict=250,
        exclusive=_exclusive(plan),
    )


def run_factcheck(dataset_id: str, tier_id: str, title: str, paragraphs: list[str]) -> FactCheckOut:
    tier = oc.resolve_tier(tier_id)
    plan = oc.tier_plan(tier)
    return oc.generate_json(
        tier.moderator,  # same weight class as the moderator; it must catch what tone missed
        FACTCHECK_SYSTEM,
        FACTCHECK_PROMPT.format(
            table=pack_text(dataset_id),
            story=_story_text(title, paragraphs),
        ),
        FactCheckOut,
        temperature=0.0,
        num_predict=1500,
        exclusive=_exclusive(plan),
    )