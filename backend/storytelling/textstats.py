"""Text-only tone and style metrics. No data, no model, no judge.

Three instruments now measure tone in this project, and they fail in different
ways, which is the point of having three:

1. `metrics.py` and `timeseries_claims.py` measure framing RELATIVE TO THE DATA
   (cherry-picked windows, dropped denominators, ungrounded figures).
2. This module measures tone IN THE TEXT ALONE (hedging, intensity, emotive
   vocabulary, causal assertiveness, readability).
3. The LLM judge gives a holistic 1-5 alarmism rating.

Agreement between 2 and 3 is evidence the judge is tracking something real.
Divergence is informative rather than embarrassing: if the judge's rating moves
and none of these do, the judge is likely responding to style or to fluency
rather than to the rhetorical properties the project claims to moderate.

Every measure is a rate per 100 words unless stated, so stories of different
lengths compare directly. All lexicons are small, explicit and editable: they
are stated here rather than hidden in a model, so a reviewer can dispute them.

Pure stdlib. `python3 textstats.py` runs the self-test.
"""

from __future__ import annotations

import re
from typing import Dict, List

# --------------------------------------------------------------------------
# Lexicons. Deliberately short, auditable and domain-neutral.
# --------------------------------------------------------------------------

HEDGES = {
    "may", "might", "could", "appears", "appear", "suggests", "suggest", "seems",
    "seem", "likely", "unlikely", "possibly", "possible", "probably", "roughly",
    "approximately", "about", "around", "estimated", "estimate", "tends", "tend",
    "partly", "somewhat", "relatively", "generally", "often", "sometimes",
}

BOOSTERS = {
    "clearly", "obviously", "undeniably", "certainly", "definitely", "must",
    "will", "always", "never", "proves", "proven", "shows", "demonstrates",
    "confirms", "undoubtedly", "inevitably", "unquestionably", "guaranteed",
}

INTENSIFIERS = {
    "dramatically", "sharply", "massively", "enormously", "drastically",
    "explosively", "staggering", "staggeringly", "alarmingly", "shockingly",
    "extremely", "severely", "catastrophically", "wildly", "vastly", "hugely",
    "skyrocketing", "plummeting", "soaring", "surging", "exploding", "roaring",
    "devastating", "terrifying", "horrifying",
}

FEAR = {
    "crisis", "catastrophe", "catastrophic", "disaster", "disastrous", "threat",
    "danger", "dangerous", "deadly", "killer", "epidemic", "outbreak", "collapse",
    "collapsing", "spiralling", "spiraling", "rampant", "unchecked", "grim",
    "alarming", "terrifying", "devastating", "emergency", "warning", "risk",
}

REASSURANCE = {
    "safe", "success", "successful", "triumph", "victory", "solved", "eradicated",
    "eliminated", "under control", "reassuring", "encouraging", "remarkable",
    "impressive", "excellent", "thriving", "flourishing",
}

CAUSAL = {
    "because", "due", "driven", "caused", "causing", "owing", "thanks", "amid",
    "attributable", "resulting", "results", "stems", "led", "leads", "responsible",
    "explains", "explained", "reflects", "blame", "blamed",
}

SUPERLATIVE_WORDS = {
    "most", "least", "highest", "lowest", "worst", "best", "largest", "smallest",
    "greatest", "record", "unprecedented", "historic", "all-time", "ever",
}

_WORD = re.compile(r"[A-Za-z][A-Za-z'\-]*")
_SENT = re.compile(r"[^.!?]+[.!?]?")
_PASSIVE = re.compile(
    r"\b(?:is|are|was|were|been|being|be)\s+(?:\w+ly\s+)?(\w+(?:ed|en))\b", re.I)


def words(text: str) -> List[str]:
    return [w.lower() for w in _WORD.findall(text)]


def sentences(text: str) -> List[str]:
    return [s.strip() for s in _SENT.findall(text) if s.strip()]


def _syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    if w.endswith("e") and not w.endswith(("le", "ee")):
        w = w[:-1]
    groups = re.findall(r"[aeiouy]+", w)
    return max(len(groups), 1)


def _rate(n: int, total: int) -> float:
    return round(100.0 * n / total, 2) if total else 0.0


def analyse(text: str) -> Dict[str, float]:
    """Every text-only measure for one story."""
    ws, ss = words(text), sentences(text)
    nw, ns = len(ws), len(ss)
    if not nw:
        return {}

    syl = sum(_syllables(w) for w in ws)
    wps = nw / ns if ns else nw
    # Flesch Reading Ease: higher is easier. ~60-70 is plain English.
    flesch = 206.835 - 1.015 * wps - 84.6 * (syl / nw)
    fk_grade = 0.39 * wps + 11.8 * (syl / nw) - 15.59

    hedge = sum(1 for w in ws if w in HEDGES)
    boost = sum(1 for w in ws if w in BOOSTERS)
    intens = sum(1 for w in ws if w in INTENSIFIERS)
    fear = sum(1 for w in ws if w in FEAR)
    reass = sum(1 for w in ws if w in REASSURANCE)
    causal = sum(1 for w in ws if w in CAUSAL)
    sup = sum(1 for w in ws if w in SUPERLATIVE_WORDS) + sum(
        1 for w in ws if len(w) > 5 and w.endswith("est"))

    nums = len(re.findall(r"(?<![\w.])\d", text))
    passive = len(_PASSIVE.findall(text))
    types = len(set(ws))

    lens = [len(words(s)) for s in ss] or [0]
    mean_len = sum(lens) / len(lens)
    var = sum((x - mean_len) ** 2 for x in lens) / len(lens)

    anchored = sum(1 for s in ss if re.search(r"\b(19|20)\d{2}\b", s) or re.search(r"\d", s))

    return {
        "words": nw,
        "sentences": ns,
        # readability: the presentation lists readability as a user-study measure;
        # this is the cheap automatic proxy for it
        "flesch_reading_ease": round(flesch, 1),
        "flesch_kincaid_grade": round(fk_grade, 1),
        # certainty: hedges soften a claim, boosters harden it. The ratio is the
        # single most direct lexical correlate of the alarmism construct.
        "hedge_rate": _rate(hedge, nw),
        "booster_rate": _rate(boost, nw),
        "certainty_ratio": round((boost + 1) / (hedge + 1), 3),
        # intensity: adverbs and verbs of degree. "rose" vs "skyrocketed".
        "intensifier_rate": _rate(intens, nw),
        # emotive vocabulary, in both directions. The project claims to correct
        # over-alarm AND false reassurance, so both are counted.
        "fear_rate": _rate(fear, nw),
        "reassurance_rate": _rate(reass, nw),
        "affect_balance": round(_rate(fear, nw) - _rate(reass, nw), 2),
        # causal assertiveness: both reproductions put causal accuracy at 0%, so
        # the density of causal language is a proxy for unsupported explanation
        "causal_rate": _rate(causal, nw),
        # superlatives invite extremum inflation, checked for truth elsewhere
        "superlative_rate": _rate(sup, nw),
        # how data-grounded the prose is on its surface
        "numeric_density": _rate(nums, nw),
        "anchored_sentence_rate": _rate(anchored, ns),
        # style
        "type_token_ratio": round(types / nw, 3),
        "mean_sentence_length": round(mean_len, 1),
        "sentence_length_variance": round(var, 1),
        "passive_rate": _rate(passive, ns),
    }


def delta(before: str, after: str) -> Dict[str, float]:
    """Paired change for every measure. Positive means the value rose."""
    a, b = analyse(before), analyse(after)
    return {k: round(b[k] - a[k], 3) for k in a if isinstance(a.get(k), (int, float))}


# --------------------------------------------------------------------------
# Self-test on the real pair from run 056795c4
# --------------------------------------------------------------------------

_RAW = (
    "Measles Cases Plummet, But Vaccine Coverage Plateaus. "
    "The number of reported measles cases worldwide has dropped dramatically since the "
    "1980s. In 1980, there were over 3.8 million cases; by 2024, that number had fallen to "
    "just under 675,000. However, vaccine coverage has stalled at around 84% for the past "
    "few years. Germany and India are shining examples of effective vaccination efforts, "
    "with nearly all children receiving their first dose. In contrast, Nigeria lags behind, "
    "with only 57% of children vaccinated, resulting in a significantly higher measles rate "
    "per million people."
)

_MODERATED = (
    "Measles Trends: Vaccination Coverage and Case Rates. "
    "Reported measles cases worldwide have decreased since the 1980s, falling from over 3.8 "
    "million in 1980 to 675,533 in 2024. During this period, MCV1 vaccine coverage increased "
    "from 16% to 84%, though it has remained relatively stable since 2015. Current data shows "
    "varying levels of coverage and impact across countries. Germany and India have high "
    "first-dose coverage at 96% and 97% respectively, with case rates of 7.6 and 12.9 per "
    "million people. Nigeria has lower coverage at 57%, which corresponds with a higher rate "
    "of 65.8 cases per million."
)


def _self_test() -> int:
    a, b = analyse(_RAW), analyse(_MODERATED)
    keys = ["flesch_reading_ease", "hedge_rate", "booster_rate", "certainty_ratio",
            "intensifier_rate", "fear_rate", "causal_rate", "superlative_rate",
            "numeric_density", "anchored_sentence_rate", "mean_sentence_length"]
    print("Real pair, run 056795c4 (llama3.1:8b raw -> gemma4:31b moderated)\n")
    print("  %-28s %10s %10s %9s" % ("measure", "raw", "moderated", "delta"))
    for k in keys:
        print("  %-28s %10.2f %10.2f %+9.2f" % (k, a[k], b[k], b[k] - a[k]))

    fails = []
    if b["intensifier_rate"] > a["intensifier_rate"]:
        fails.append("moderation raised intensifier rate")
    if b["causal_rate"] > a["causal_rate"]:
        fails.append("moderation raised causal assertion rate")
    if b["numeric_density"] < a["numeric_density"]:
        fails.append("moderation reduced numeric density")
    print()
    if fails:
        for f in fails:
            print("  FAIL:", f)
        return 1
    print("  PASS: on the real pair the moderator lowered intensity and causal")
    print("        assertiveness while raising numeric grounding, with no judge.")
    return 0


if __name__ == "__main__":
    raise SystemExit(_self_test())
