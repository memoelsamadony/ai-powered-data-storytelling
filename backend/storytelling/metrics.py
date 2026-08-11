"""Surface-similarity metrics for story-vs-human-baseline comparison.

Replaces the `_bleu` in `backend/storytelling/services.py`, which returns 0.0 for
essentially every real pair because it is unsmoothed, sentence-level and
single-pair:

    if min(precisions) == 0:
        return 0.0

At ~120 words two paraphrases of the same content routinely share no 3-gram, so
one zero precision collapses the geometric mean. The zero is a property of the
estimator at this length, not of the stories.

`chrF++` is the primary metric here: it scores character n-grams, so it degrades
gracefully at short lengths instead of collapsing. BLEU is retained in smoothed
and per-order form for continuity with the DataTales reproduction and the
interim presentation.

Pure stdlib, Python 3.9 compatible. Run `python3 similarity.py` for the
self-test, which reproduces the table in EXPERIMENT_PLAN_ADDENDUM.md A4.1.
"""
import math
from collections import Counter

def toks(t): return [w for w in "".join(c.lower() if c.isalnum() else " " for c in t).split() if w]
def ngrams(xs, n): return [tuple(xs[i:i+n]) for i in range(len(xs)-n+1)]

def _clipped(ref, cand, n):
    """Clipped n-gram hit count and candidate total."""
    rc, cc = Counter(ngrams(ref, n)), Counter(ngrams(cand, n))
    hits = sum(min(c, rc[g]) for g, c in cc.items())
    return hits, max(sum(cc.values()), 0)

def bleu_n(ref_t, cand_t, n):
    h, t = _clipped(ref_t, cand_t, n)
    return (h / t) if t else 0.0

def bleu(ref, cand, max_n=4, smoothing="none"):
    """smoothing: none | epsilon (Chen&Cherry m1) | exp (m3, NIST geometric)"""
    r, c = toks(ref), toks(cand)
    if not r or not c: return 0.0
    ps = []
    invcnt = 1
    for n in range(1, max_n + 1):
        h, t = _clipped(r, c, n)
        if t == 0: p = 0.0
        elif h > 0: p = h / t
        elif smoothing == "epsilon": p = 0.1 / t
        elif smoothing == "exp":
            invcnt *= 2
            p = 1.0 / (invcnt * t)
        else: p = 0.0
        ps.append(p)
    if min(ps) == 0: return 0.0
    geo = math.exp(sum(math.log(p) for p in ps) / max_n)
    bp = 1.0 if len(c) > len(r) else math.exp(1 - len(r) / max(len(c), 1))
    return geo * bp

def chrf(ref, cand, char_n=6, word_n=2, beta=2.0):
    """chrF++ : char n-gram F-beta plus word n-grams. Robust at short lengths."""
    def f(rs, cs):
        rc, cc = Counter(rs), Counter(cs)
        hits = sum(min(v, rc[k]) for k, v in cc.items())
        p = hits / sum(cc.values()) if cc else 0.0
        rr = hits / sum(rc.values()) if rc else 0.0
        return p, rr
    rch, cch = " ".join(toks(ref)), " ".join(toks(cand))
    ps, rs_ = [], []
    for n in range(1, char_n + 1):
        p, r = f(ngrams(list(rch), n), ngrams(list(cch), n)); ps.append(p); rs_.append(r)
    for n in range(1, word_n + 1):
        p, r = f(ngrams(toks(ref), n), ngrams(toks(cand), n)); ps.append(p); rs_.append(r)
    P, R = sum(ps)/len(ps), sum(rs_)/len(rs_)
    if P + R == 0: return 0.0
    b2 = beta ** 2
    return (1 + b2) * P * R / (b2 * P + R)

def rouge_l(ref, cand):
    r, c = toks(ref), toks(cand)
    if not r or not c: return 0.0
    prev = [0]*(len(c)+1)
    for x in r:
        cur=[0]
        for j, y in enumerate(c): cur.append(prev[j]+1 if x==y else max(cur[j], prev[j+1]))
        prev=cur
    l = prev[-1]
    if not l: return 0.0
    p, rr = l/len(c), l/len(r)
    return 2*p*rr/(p+rr)

def meteor_lite(ref, cand):
    """METEOR without stemming/synonyms: unigram F_mean(alpha=.9) with fragmentation penalty."""
    r, c = toks(ref), toks(cand)
    rc = Counter(r); matches=[]
    for i, w in enumerate(c):
        if rc[w] > 0: rc[w]-=1; matches.append(i)
    m = len(matches)
    if m == 0: return 0.0
    p, rr = m/len(c), m/len(r)
    fmean = p*rr/(0.9*p + 0.1*rr)
    chunks = 1 + sum(1 for a, b in zip(matches, matches[1:]) if b != a+1)
    pen = 0.5 * (chunks/m)**3
    return fmean * (1-pen)

def corpus_bleu(pairs, max_n=4):
    """Aggregate n-gram counts across all pairs before dividing. This is what Part A did."""
    num=[0]*max_n; den=[0]*max_n; rl=cl=0
    for ref, cand in pairs:
        r, c = toks(ref), toks(cand); rl+=len(r); cl+=len(c)
        for n in range(1, max_n+1):
            h, t = _clipped(r, c, n); num[n-1]+=h; den[n-1]+=t
    ps=[(num[i]/den[i]) if den[i] else 0.0 for i in range(max_n)]
    if min(ps)==0: return 0.0, ps
    geo=math.exp(sum(math.log(p) for p in ps)/max_n)
    bp=1.0 if cl>rl else math.exp(1-rl/max(cl,1))
    return geo*bp, ps


# --------------------------------------------------------------------------
# Convenience: the full reported set for one pair
# --------------------------------------------------------------------------

def all_metrics(reference: str, candidate: str) -> dict:
    """Every similarity number reported for a single story pair."""
    r, c = toks(reference), toks(candidate)
    return {
        "chrf++": round(chrf(reference, candidate), 4),          # primary
        "bleu1": round(bleu_n(r, c, 1), 4),
        "bleu2": round(bleu_n(r, c, 2), 4),
        "bleu4_smooth_eps": round(bleu(reference, candidate, smoothing="epsilon"), 4),
        "bleu4_smooth_exp": round(bleu(reference, candidate, smoothing="exp"), 4),
        "bleu4_unsmoothed": round(bleu(reference, candidate), 4),  # kept to show the zero
        "rouge_l": round(rouge_l(reference, candidate), 4),
        "meteor_lite": round(meteor_lite(reference, candidate), 4),
        "ref_tokens": len(r),
        "cand_tokens": len(c),
    }


# --------------------------------------------------------------------------
# Self-test: reproduces EXPERIMENT_PLAN_ADDENDUM.md A4.1
# --------------------------------------------------------------------------

_HUMAN = (
    "For two decades, measles looked like a problem the world was solving. Between 2000 "
    "and 2016, reported cases fell by more than half as first-dose vaccination climbed "
    "from 72% into the mid-80s. The trend line pointed in one direction.\n\n"
    "Then it stopped. Coverage settled in the low-to-mid 80s and never reached the roughly "
    "95% needed to hold the virus back. In 2019, before the pandemic disrupted reporting, "
    "cases climbed back above 860,000, the worst year in a generation.\n\n"
    "The pattern is not mysterious. Measles is among the most contagious diseases we know, "
    "and it finds the gaps we leave. Where coverage holds, it retreats; where coverage "
    "slips, it returns. The data is less a warning than a reminder of how little margin "
    "there is."
)

_MODERATED = (
    "Reported measles cases worldwide have decreased since the 1980s, falling from over "
    "3.8 million in 1980 to 675,533 in 2024. During this period, MCV1 vaccine coverage "
    "increased from 16% to 84%, though it has remained relatively stable since 2015.\n\n"
    "Current data shows varying levels of coverage and impact across countries. Germany "
    "and India have high first-dose coverage at 96% and 97% respectively, with case rates "
    "of 7.6 and 12.9 per million people. Nigeria has lower coverage at 57%, which "
    "corresponds with a higher rate of 65.8 cases per million.\n\n"
    "These figures underscore the gap between current global coverage and the "
    "approximately 95% first-dose threshold required for herd immunity."
)


def _self_test() -> int:
    r, c = toks(_HUMAN), toks(_MODERATED)
    print("Real pair: run 056795c4 moderated story vs the 125-word human baseline")
    print(f"  reference {len(r)} tokens, candidate {len(c)} tokens\n")
    print("  per-order precision")
    for n in (1, 2, 3, 4):
        print(f"    {n}-gram: {100 * bleu_n(r, c, n):6.2f}%")
    m = all_metrics(_HUMAN, _MODERATED)
    print("\n  metrics")
    for k in ("bleu4_unsmoothed", "bleu4_smooth_eps", "bleu4_smooth_exp",
              "bleu1", "bleu2", "chrf++", "rouge_l", "meteor_lite"):
        flag = "   <- the zero this module fixes" if k == "bleu4_unsmoothed" else ""
        flag = "   <- primary" if k == "chrf++" else flag
        print(f"    {k:<20} {m[k]:.4f}{flag}")

    failures = []
    if m["bleu4_unsmoothed"] != 0.0:
        failures.append("expected the unsmoothed BLEU-4 to still be 0.0 on this pair")
    for k in ("chrf++", "bleu1", "rouge_l", "meteor_lite",
              "bleu4_smooth_eps", "bleu4_smooth_exp"):
        if m[k] <= 0.0:
            failures.append(f"{k} returned {m[k]}, expected non-zero")
    if not (0.30 < m["chrf++"] < 0.33):
        failures.append(f"chrF++ {m['chrf++']} outside the documented 0.3140 +/- 0.015")

    print()
    if failures:
        for f in failures:
            print("  FAIL:", f)
        return 1
    print("  PASS: every reported metric is non-zero and interpretable;")
    print("        the unsmoothed BLEU-4 still returns 0.0, which is the documented defect.")
    return 0


if __name__ == "__main__":
    raise SystemExit(_self_test())


# --------------------------------------------------------------------------
# Numeric accuracy, computed against the data. No LLM in this path.
# --------------------------------------------------------------------------
#
# Replaces `factsPreserved`, which was `not any(status == "flagged")` and so
# only restated the fact-checker's own output.
#
# A stated figure counts as SUPPORTED if it matches, within tolerance, either
#   (a) a value the model was actually given, or
#   (b) a quantity derivable from two given values: a difference, a percentage
#       change, a ratio, or a sum.
# Anything else is UNSUPPORTED. This is deliberately a support check, not a
# truth check: it asks whether the number is grounded in the supplied evidence,
# which is the property the pipeline can actually be held to.

import re as _re

_YEAR_LO, _YEAR_HI = 1500, 2100
_QUAL = (r"(?:(over|more than|nearly|almost|about|around|roughly|approximately|"
         r"under|fewer than|less than|up to)\s+)?")
_NUM = _re.compile(
    _QUAL + r"(?<![\w.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?|a|an|one|half a)\s*"
            r"(%|percent|million|billion|thousand)?",
    _re.I)

# "over a million" carries a magnitude even though it has no digits, and it is
# exactly the shape of the hallucination this project already documented: the
# generator wrote that Nigeria's cases rose "by over a million" when the figure
# was 14,999. A checker that only sees digits misses the one error the project
# most wants caught.
_WORD_QTY = {"a": 1.0, "an": 1.0, "one": 1.0, "half a": 0.5}


def extract_numbers(text: str):
    """Every figure a reader would take as a claim, with years separated out.

    Captures the approximation qualifier ("over 3.8 million", "nearly 700,000")
    and the significant figures as written, because both change what counts as a
    match. "3.8 million" against a true 3,852,242 is a correct rounded reference,
    not a wrong number, and a check that calls it wrong will flag honest prose.
    """
    stated, years = [], []
    for m in _NUM.finditer(text):
        qual, raw, unit = (m.group(1) or "").lower(), m.group(2), (m.group(3) or "").lower()
        word = raw.lower() in _WORD_QTY
        if word:
            if not unit:            # a bare "a"/"one" is an article, not a quantity
                continue
            v, sig = _WORD_QTY[raw.lower()], 1
        else:
            v = float(raw.replace(",", ""))
            digits = raw.replace(",", "").replace(".", "").lstrip("0")
            sig = len(digits.rstrip("0")) or 1
        if (not word and not unit and not qual and float(v).is_integer()
                and _YEAR_LO <= v <= _YEAR_HI and "," not in raw):
            years.append(int(v))
            continue
        scale = {"million": 1e6, "billion": 1e9, "thousand": 1e3}.get(unit, 1.0)
        v *= scale
        if word:
            step = scale
        else:
            step = (10 ** (len(raw.replace(",", "").split(".")[0]) - sig)) * scale
            if "." in raw:
                step = (10 ** -len(raw.split(".")[1])) * scale
        stated.append({
            "value": v,
            "unit": "%" if unit in ("%", "percent") else None,
            "qualifier": qual.strip() or None,
            "round_tol": max(step / 2.0, 0.5),
            "text": m.group(0).strip(),
        })
    return stated, years


def supported_values(values):
    """Only the values actually supplied, plus first-to-last aggregates.

    An earlier version added every pairwise difference, ratio, percentage change
    and sum. With ~100 supplied values that is ~40,000 derived numbers, dense
    enough that a 1% tolerance accepts almost any figure: a test story claiming
    "2.3 million cases" and "coverage collapsed to 41%" scored 3/3 supported.
    A support check that accepts everything measures nothing.

    Relational claims (a difference or a percentage change over a stated window)
    are NOT handled here, because whether they are correct depends on which
    window the text cited. Those go through
    `experiments/analysis/timeseries_claims.verify`, which is given the window.
    """
    base = sorted({round(float(v), 4) for v in values if v is not None})
    out = set(base)
    if len(base) >= 2:
        lo, hi = base[0], base[-1]
        out.add(round(abs(hi - lo), 4))
        if lo:
            out.add(round(100.0 * (hi - lo) / lo, 2))
            out.add(round(abs(100.0 * (hi - lo) / lo), 2))
    return out


def support_density(values, span=None):
    """Diagnostic: supported values per unit of range. High means a weak test."""
    s = sorted(supported_values(values))
    if len(s) < 2:
        return 0.0
    rng = (span or (s[-1] - s[0])) or 1.0
    return len(s) / rng


def groundedness(text: str, values, years=(), rel_tol=0.01, pp_tol=1.0):
    """Share of stated figures that the supplied evidence supports.

    This is a GROUNDEDNESS check, not a truth check, and the distinction matters.
    It asks whether a figure appears in the data the model was given. It cannot
    catch a real value asserted in the wrong context: global MCV1 coverage was
    41% in the mid-1980s, so "coverage has collapsed to 41%" written about today
    is false but perfectly grounded. Catching that requires knowing which window
    the sentence refers to, which is what
    `experiments/analysis/timeseries_claims.verify` does with an explicit window.

    Use both. Groundedness is cheap, needs no claim extraction, and catches
    invention. The windowed verifier is the one that catches misattribution.
    """
    stated, cited_years = extract_numbers(text)
    supported = supported_values(values)
    yearset = set(int(y) for y in years)
    results = []
    for s in stated:
        v, tol = s["value"], s["round_tol"]
        if s["unit"] == "%":
            ok = any(abs(v - c) <= max(pp_tol, tol) for c in supported if abs(c) <= 1000)
        else:
            ok = any(abs(v - c) <= max(rel_tol * abs(c), tol) for c in supported)
            if not ok and s["qualifier"] in ("over", "more than"):
                ok = any(c > v and (c - v) <= 0.2 * max(v, 1) for c in supported)
            if not ok and s["qualifier"] in ("nearly", "almost", "under", "fewer than", "less than", "up to"):
                ok = any(c < v and (v - c) <= 0.2 * max(v, 1) for c in supported)
        results.append({**s, "supported": bool(ok)})
    bad_years = [y for y in cited_years if yearset and y not in yearset]
    n = len(results)
    ok_n = sum(1 for r in results if r["supported"])
    return {
        "stated": n,
        "supported": ok_n,
        "groundedness": (ok_n / n) if n else None,
        "unsupported_examples": [r["text"] for r in results if not r["supported"]][:8],
        "years_cited": sorted(set(cited_years)),
        "years_out_of_range": bad_years,
    }


# Backwards-compatible alias. The old name overclaimed.
numeric_accuracy = groundedness
