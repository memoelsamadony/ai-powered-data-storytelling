"""Judge-free metrics for what moderation actually did to a story.

Everything already in the pipeline scores the raw story and the moderated story
*separately* and subtracts. That cannot distinguish the two ways of lowering an
alarmism rating:

    1. rewrite "cases exploded" as "cases rose", keeping every fact, or
    2. delete the sentence with the alarming number in it.

Both move the rating down. Only the first is moderation; the second is
information loss dressed as calm. `retention` below separates them, and it needs
no model to do it.

The second gap is the opposite failure: a moderator that *adds* a figure the raw
story never contained and the evidence pack does not support. `injection`
catches that.

The third is selection. A story can be perfectly grounded and still mislead by
choosing which years to talk about, so `trend_selection` compares the trend
across the years a story actually cites against the trend of the whole series.

All three are computed in Python from text plus the evidence pack. No judge, no
quota, deterministic.
"""

from __future__ import annotations

import difflib
from typing import Dict, Iterable, List, Sequence

from .metrics import chrf, extract_numbers, supported_values


def _vals(text: str) -> List[float]:
    stated, _ = extract_numbers(text)
    return [s["value"] for s in stated]


def _years(text: str) -> List[int]:
    _, years = extract_numbers(text)
    return sorted(set(years))


def _close(a: float, b: float, rel_tol: float = 0.01) -> bool:
    return abs(a - b) <= max(rel_tol * abs(b), 0.05)


def _match_counts(src: Sequence[float], dst: Sequence[float]) -> int:
    """How many of `src` have a partner in `dst`, each partner used once."""
    pool = list(dst)
    hits = 0
    for v in src:
        for i, w in enumerate(pool):
            if _close(v, w):
                pool.pop(i)
                hits += 1
                break
    return hits


def retention(raw: str, moderated: str) -> Dict[str, float | int]:
    """Did moderation keep the facts, or quietly drop them?

    `numeric_retention` is the share of figures stated in the raw story that
    still appear in the moderated one. A moderator that lowers the alarmism
    rating while retaining 0.4 of the numbers has not calmed the story, it has
    removed most of it.
    """
    r, m = _vals(raw), _vals(moderated)
    kept = _match_counts(r, m)
    ry, my = set(_years(raw)), set(_years(moderated))
    return {
        "raw_figures": len(r),
        "moderated_figures": len(m),
        "figures_kept": kept,
        "numeric_retention": (kept / len(r)) if r else None,
        "raw_years": len(ry),
        "years_kept": len(ry & my),
        "year_retention": (len(ry & my) / len(ry)) if ry else None,
        "word_ratio": (len(moderated.split()) / len(raw.split())) if raw.split() else None,
    }


def injection(moderated: str, raw: str, values: Iterable[float]) -> Dict[str, object]:
    """Figures the moderator introduced that the raw story never stated.

    Split into supported (fine: the moderator reached into the evidence pack for
    context) and unsupported (a fabrication created by the moderation step
    itself, which is the worst failure this system can have).
    """
    supported = supported_values(values)
    r = _vals(raw)
    added_ok, added_bad = [], []
    for s in extract_numbers(moderated)[0]:
        v = s["value"]
        if any(_close(v, w) for w in r):
            continue
        if any(_close(v, c) for c in supported):
            added_ok.append(s["text"])
        else:
            added_bad.append(s["text"])
    return {
        "added_supported": len(added_ok),
        "added_unsupported": len(added_bad),
        "added_unsupported_examples": added_bad[:8],
        "injection_rate": (len(added_bad) / max(len(_vals(moderated)), 1)),
    }


def rewrite_intensity(raw: str, moderated: str) -> Dict[str, float]:
    """How much text actually changed.

    A near-zero alarmism delta means something different when the moderator
    rewrote 60% of the story than when it changed three words. Reported
    alongside every delta so "no effect" and "no edit" stay distinguishable.
    """
    sm = difflib.SequenceMatcher(None, raw.split(), moderated.split())
    return {
        "chrf_raw_vs_moderated": chrf(raw, moderated),
        "token_similarity": sm.ratio(),
        "rewrite_fraction": 1.0 - sm.ratio(),
    }


def trend_selection(text: str, series: Dict[int, float]) -> Dict[str, object]:
    """Does the story's chosen window point the same way as the whole series?

    `series` maps year to value. The story cites some subset of years; we fit the
    simple first-to-last direction over the cited years and over everything, and
    report both. A story that cites only 2021-2024 of a falling series is not
    lying, but it is telling the opposite story, and that is invisible to every
    groundedness check.

    `selection_ratio` near 1 means the chosen window mirrors the full trend;
    negative means the story's window points the other way.
    """
    cited = sorted(y for y in _years(text) if y in series)
    if len(cited) < 2 or len(series) < 2:
        return {"cited_years": cited, "insufficient": True}
    allyears = sorted(series)

    def slope(ys: Sequence[int]) -> float:
        span = ys[-1] - ys[0]
        return (series[ys[-1]] - series[ys[0]]) / span if span else 0.0

    s_cited, s_all = slope(cited), slope(allyears)
    ratio = (s_cited / s_all) if s_all else None
    return {
        "cited_years": cited,
        "coverage": len(cited) / len(allyears),
        "span_fraction": (cited[-1] - cited[0]) / max(allyears[-1] - allyears[0], 1),
        "cited_slope": round(s_cited, 4),
        "full_slope": round(s_all, 4),
        "selection_ratio": round(ratio, 4) if ratio is not None else None,
        "direction_flipped": bool(s_all and s_cited and (s_cited > 0) != (s_all > 0)),
    }


def cv_sentence_length(text: str) -> float | None:
    """Scale-free rhythm variation.

    Raw sentence-length variance falls whenever mean length falls, so it cannot
    tell "more uniform" from "uniformly shorter". This divides by the mean. The
    pass-2 humanize experiment needed exactly this distinction: variance dropped
    26.65 -> 23.83 while the mean also dropped, so the raw number was ambiguous.
    """
    from .textstats import sentences
    lens = [len(s.split()) for s in sentences(text) if s.split()]
    if len(lens) < 2:
        return None
    mean = sum(lens) / len(lens)
    if not mean:
        return None
    var = sum((x - mean) ** 2 for x in lens) / len(lens)
    return round((var ** 0.5) / mean, 4)


def _self_test() -> int:
    raw = ("Cases exploded to 941,893 in 2024, nearly six times the 163,400 of 2023. "
           "The 2021 low was 30,402.")
    calm = "Cases rose to 941,893 in 2024, up from 163,400 in 2023."
    gutted = "Cases rose in 2024."
    fabricated = "Cases rose to 941,893 in 2024, and deaths reached 55,000."
    ok = True

    r_calm = retention(raw, calm)
    r_gut = retention(raw, gutted)
    # The calm rewrite keeps most figures; the gutted one keeps almost none.
    if not (r_calm["numeric_retention"] > 0.5 >= r_gut["numeric_retention"]):
        print("FAIL retention", r_calm["numeric_retention"], r_gut["numeric_retention"])
        ok = False

    pack = [941893.0, 163400.0, 30402.0, 2024.0, 2023.0, 2021.0]
    inj = injection(fabricated, raw, pack)
    if inj["added_unsupported"] < 1:
        print("FAIL injection did not catch 55,000", inj)
        ok = False
    if injection(calm, raw, pack)["added_unsupported"] != 0:
        print("FAIL injection false positive on a clean rewrite")
        ok = False

    ri = rewrite_intensity(raw, calm)
    if not 0.0 < ri["rewrite_fraction"] < 1.0:
        print("FAIL rewrite_intensity", ri)
        ok = False

    # A falling series described only over its rising tail must flip.
    series = {y: v for y, v in zip(range(2000, 2011), range(100, 45, -5))}
    series[2009], series[2010] = 60, 80
    ts = trend_selection("From 2009 to 2010 the count rose.", series)
    if not ts.get("direction_flipped"):
        print("FAIL trend_selection did not flag the flip", ts)
        ok = False

    if cv_sentence_length("One two three. Four five six seven eight nine ten.") is None:
        print("FAIL cv_sentence_length")
        ok = False

    print("faithfulness self-test:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(_self_test())
