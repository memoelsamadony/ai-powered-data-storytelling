"""Deterministic verification of time-series claims, and judge-free framing metrics.

Two ideas, and the split between them is the point.

1. **Extraction is a parsing task; verification is a judgement.** A model may
   extract structured claims from a story, because that is transcription and is
   cheap to spot-check. Whether a claim is TRUE is then decided here, in Python,
   against the CSV. No model votes on correctness.

2. **Framing can be measured arithmetically.** Cherry-picking a window, anchoring
   to a trough, dropping a denominator and inflating a superlative are all
   decidable from the series plus the window the story cited. That gives the
   project a tone signal that does not depend on an LLM judge at all, which is
   its single largest methodological risk.

Claim schema produced by the extractor (one JSON object per claim):

    {"type": "direction", "series": "measles-global",
     "window": [2016, 2019], "value": null, "unit": null,
     "text": "cases climbed back above 860,000",
     "compares": null, "superlative": null}

`window` is [start_year, end_year]; a point claim uses [y, y]. `value` is the
number as stated. `compares` is a list of series or location names for
cross-population claims. Types are listed in CLAIM_TYPES.

Pure stdlib, Python 3.9 compatible. `python3 timeseries_claims.py` runs the
self-test against the real measles series.
"""

from __future__ import annotations

import csv
import statistics
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

CLAIM_TYPES = (
    "point", "direction", "magnitude_abs", "magnitude_rel", "extremum",
    "trend_window", "turning_point", "aggregate", "cross_series",
    "normalisation", "causal", "predictive",
)

# Claim types the table cannot decide. Counting these is itself a measure.
UNVERIFIABLE = ("causal", "predictive")

REL_TOLERANCE_PP = 1.0     # percentage points, for magnitude_rel
AGG_TOLERANCE_PCT = 1.0    # percent, for aggregate


@dataclass
class Series:
    """One annual series: year -> value, plus an optional rate column."""
    slug: str
    values: Dict[int, float]
    rates: Dict[int, float] = field(default_factory=dict)

    @property
    def years(self) -> List[int]:
        return sorted(self.values)

    def span(self) -> Tuple[int, int]:
        ys = self.years
        return ys[0], ys[-1]

    def window(self, a: Optional[int], b: Optional[int]) -> List[int]:
        lo, hi = self.span()
        a = lo if a is None else max(a, lo)
        b = hi if b is None else min(b, hi)
        return [y for y in self.years if a <= y <= b]

    def direction(self, a: Optional[int] = None, b: Optional[int] = None) -> int:
        """Sign of the endpoint difference over the window: 1, -1 or 0."""
        ys = self.window(a, b)
        if len(ys) < 2:
            return 0
        d = self.values[ys[-1]] - self.values[ys[0]]
        return (d > 0) - (d < 0)

    def slope_sign(self, a: Optional[int] = None, b: Optional[int] = None) -> int:
        """Sign of the OLS slope over the window. Less endpoint-sensitive."""
        ys = self.window(a, b)
        if len(ys) < 3:
            return self.direction(a, b)
        mx = sum(ys) / len(ys)
        my = sum(self.values[y] for y in ys) / len(ys)
        num = sum((y - mx) * (self.values[y] - my) for y in ys)
        den = sum((y - mx) ** 2 for y in ys)
        if den == 0:
            return 0
        s = num / den
        return (s > 0) - (s < 0)

    def extremum(self, kind: str, a=None, b=None) -> Tuple[int, float]:
        ys = self.window(a, b)
        f = max if kind == "max" else min
        y = f(ys, key=lambda y: self.values[y])
        return y, self.values[y]

    def yoy_sd(self) -> float:
        ys = self.years
        diffs = [self.values[b] - self.values[a] for a, b in zip(ys, ys[1:])]
        return statistics.pstdev(diffs) if len(diffs) > 1 else 0.0


def load_datapack(path: str) -> Dict[str, Series]:
    """Read the tidy datapack: series,year,cases,incidence_per_million."""
    out: Dict[str, Series] = {}
    with open(path) as fh:
        for row in csv.DictReader(fh):
            slug = row["series"]
            s = out.setdefault(slug, Series(slug, {}, {}))
            try:
                year = int(float(row["year"]))
            except (TypeError, ValueError):
                continue
            v = (row.get("cases") or "").replace(",", "").strip()
            if v:
                s.values[year] = float(v)
            r = (row.get("incidence_per_million") or "").replace(",", "").strip()
            if r:
                s.rates[year] = float(r)
    return out


# --------------------------------------------------------------------------
# Verification
# --------------------------------------------------------------------------

@dataclass
class Verdict:
    claim_type: str
    decidable: bool
    correct: Optional[bool]
    detail: str


def verify(claim: dict, series: Series) -> Verdict:
    t = claim.get("type")
    if t in UNVERIFIABLE:
        return Verdict(t, False, None, "not decidable from the table; auto-flagged")

    w = claim.get("window") or [None, None]
    a, b = (w + [None, None])[:2]
    stated = claim.get("value")

    if t == "point":
        y = a if a is not None else b
        if y not in series.values:
            return Verdict(t, True, False, "year %s not in the series" % y)
        actual = series.values[y]
        ok = stated is not None and abs(actual - float(stated)) < 0.5
        return Verdict(t, True, ok, "stated %s, actual %s" % (stated, actual))

    if t == "direction":
        ok = _sign_of(stated) == series.direction(a, b)
        return Verdict(t, True, ok, "series direction %+d over %s-%s"
                       % (series.direction(a, b), a, b))

    if t == "magnitude_abs":
        ys = series.window(a, b)
        if len(ys) < 2:
            return Verdict(t, True, False, "window too short")
        actual = series.values[ys[-1]] - series.values[ys[0]]
        ok = stated is not None and abs(abs(actual) - abs(float(stated))) < 0.5
        return Verdict(t, True, ok, "actual change %s" % actual)

    if t == "magnitude_rel":
        ys = series.window(a, b)
        if len(ys) < 2 or series.values[ys[0]] == 0:
            return Verdict(t, True, False, "window too short or zero baseline")
        actual = 100.0 * (series.values[ys[-1]] - series.values[ys[0]]) / series.values[ys[0]]
        ok = stated is not None and abs(abs(actual) - abs(float(stated))) <= REL_TOLERANCE_PP
        return Verdict(t, True, ok, "actual %.1f%%" % actual)

    if t == "extremum":
        # `window` is the year being CALLED extreme; `scope` is the range the
        # superlative ranges over ("worst since 2010"), defaulting to the whole
        # series. Scoping the superlative to its own year would make every
        # "worst year on record" trivially true, which is the failure mode this
        # metric exists to catch.
        sup = (claim.get("superlative") or "").lower()
        kind = "min" if sup.startswith(("low", "least", "few", "best")) else "max"
        scope = claim.get("scope") or [None, None]
        y_true, v_true = series.extremum(kind, scope[0], scope[1])
        claimed_year = a if a is not None else b
        ok = claimed_year == y_true
        return Verdict(t, True, ok, "%s over %s-%s is %s (%s); claim said %s"
                       % (kind, scope[0] or "start", scope[1] or "end",
                          y_true, v_true, claimed_year))

    if t == "trend_window":
        ok = _sign_of(stated) == series.slope_sign(a, b)
        return Verdict(t, True, ok, "OLS slope sign %+d" % series.slope_sign(a, b))

    if t == "turning_point":
        ys = series.years
        turns = [ys[i] for i in range(1, len(ys) - 1)
                 if (series.values[ys[i]] - series.values[ys[i - 1]] > 0)
                 != (series.values[ys[i + 1]] - series.values[ys[i]] > 0)]
        ok = a in turns
        return Verdict(t, True, ok, "turning points: %s" % turns[:8])

    if t == "aggregate":
        ys = series.window(a, b)
        if not ys:
            return Verdict(t, True, False, "empty window")
        actual = sum(series.values[y] for y in ys) / len(ys)
        ok = stated is not None and actual != 0 and \
            abs(actual - float(stated)) / actual * 100 <= AGG_TOLERANCE_PCT
        return Verdict(t, True, ok, "actual mean %.1f" % actual)

    if t == "normalisation":
        used_rate = bool(claim.get("unit")) and "million" in str(claim["unit"]).lower()
        return Verdict(t, True, used_rate,
                       "cross-population comparison %s a rate"
                       % ("uses" if used_rate else "does NOT use"))

    return Verdict(t or "unknown", False, None, "unrecognised claim type")


def _sign_of(v) -> int:
    if isinstance(v, (int, float)):
        return (v > 0) - (v < 0)
    s = str(v or "").lower()
    if any(w in s for w in ("rose", "rise", "increase", "up", "climb", "grew", "+")):
        return 1
    if any(w in s for w in ("fell", "fall", "decrease", "down", "decline", "drop", "-")):
        return -1
    return 0


def score(claims: Sequence[dict], series: Series) -> dict:
    """Numeric accuracy, per-type accuracy and the unverifiable rate."""
    per_type: Dict[str, List[bool]] = {}
    decidable = correct = 0
    unver = 0
    for c in claims:
        v = verify(c, series)
        if not v.decidable:
            unver += 1
            continue
        decidable += 1
        correct += bool(v.correct)
        per_type.setdefault(v.claim_type, []).append(bool(v.correct))
    return {
        "claims_total": len(claims),
        "decidable": decidable,
        "correct": correct,
        "numeric_accuracy": (correct / decidable) if decidable else None,
        "unverifiable": unver,
        "unverifiable_rate": (unver / len(claims)) if claims else None,
        "per_type": {k: (sum(v), len(v)) for k, v in sorted(per_type.items())},
    }


# --------------------------------------------------------------------------
# Judge-free framing metrics
# --------------------------------------------------------------------------

def framing_metrics(claims: Sequence[dict], series: Series) -> dict:
    """Rhetorical framing measured from the series. No model involved."""
    windows = [c["window"] for c in claims
               if c.get("window") and c["window"][0] is not None
               and c["window"][1] is not None and c["window"][0] != c["window"][1]]
    lo, hi = series.span()
    full_dir = series.direction()
    trough_year, _ = series.extremum("min")
    span = max(hi - lo, 1)

    contradicting = [w for w in windows if series.direction(w[0], w[1]) not in (0, full_dir)]
    wsi = (len(contradicting) / len(windows)) if windows else 0.0

    starts = [w[0] for w in windows]
    anchor = (min(abs(s - trough_year) for s in starts) / span) if starts else None

    cross = [c for c in claims if c.get("type") in ("normalisation", "cross_series")
             or c.get("compares")]
    complied = [c for c in cross
                if "million" in str(c.get("unit") or "").lower()]
    denom = (len(complied) / len(cross)) if cross else None

    ext = [c for c in claims if c.get("type") == "extremum"]
    ext_ok = [c for c in ext if verify(c, series).correct]
    extremum_inflation = (1 - len(ext_ok) / len(ext)) if ext else None

    sd = series.yoy_sd()
    noisy = 0
    trend_claims = [c for c in claims if c.get("type") in ("direction", "trend_window")]
    for c in trend_claims:
        w = c.get("window") or [None, None]
        ys = series.window(w[0], w[1])
        if len(ys) >= 2 and sd > 0:
            if abs(series.values[ys[-1]] - series.values[ys[0]]) < sd:
                noisy += 1
    volatility = (noisy / len(trend_claims)) if trend_claims else None

    return {
        "window_selection_index": round(wsi, 4),
        "contradicting_windows": contradicting,
        "baseline_anchor_distance": round(anchor, 4) if anchor is not None else None,
        "denominator_compliance": round(denom, 4) if denom is not None else None,
        "extremum_inflation": round(extremum_inflation, 4) if extremum_inflation is not None else None,
        "volatility_framing": round(volatility, 4) if volatility is not None else None,
        "series_full_direction": full_dir,
        "series_trough_year": trough_year,
        "yoy_sd": round(sd, 1),
    }


# --------------------------------------------------------------------------
# Self-test against the real measles World series
# --------------------------------------------------------------------------

def _self_test() -> int:
    import os
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..",
                            "emotional-tone-moderation", "data", "measles_merged_tidy.csv")
    vals, rates = {}, {}
    with open(csv_path) as fh:
        for row in csv.DictReader(fh):
            if row["country"] != "World":
                continue
            y = int(float(row["year"]))
            if row["measles_cases"]:
                vals[y] = float(row["measles_cases"])
            if row["incidence_per_million"]:
                rates[y] = float(row["incidence_per_million"])
    s = Series("measles-global", vals, rates)
    lo, hi = s.span()
    print("measles-global: %s-%s, %d years, full direction %+d, trough %s, YoY sd %.0f"
          % (lo, hi, len(s.years), s.direction(), s.extremum("min")[0], s.yoy_sd()))

    # An alarmist narration that cherry-picks the 2016-2019 rebound inside a
    # falling series, and compares countries by raw count.
    alarmist = [
        {"type": "point", "window": [2019, 2019], "value": 873373, "text": "873,373 in 2019"},
        {"type": "direction", "window": [2016, 2019], "value": "rose", "text": "cases exploded"},
        {"type": "magnitude_rel", "window": [2016, 2019], "value": 559.0, "text": "up 559%"},
        {"type": "extremum", "window": [2019, 2019], "superlative": "highest",
         "value": None, "text": "the worst year on record"},
        {"type": "normalisation", "window": [2024, 2024], "unit": "cases",
         "compares": ["Nigeria", "Germany"], "text": "Nigeria had 14,999 to Germany's 645"},
        {"type": "causal", "window": [2016, 2019], "text": "driven by vaccine hesitancy"},
    ]
    # A calibrated narration over the full span, using rates.
    calibrated = [
        {"type": "point", "window": [2024, 2024], "value": 675533, "text": "675,533 in 2024"},
        {"type": "direction", "window": [1980, 2024], "value": "fell", "text": "cases fell"},
        {"type": "trend_window", "window": [1980, 2024], "value": "fell", "text": "a long decline"},
        {"type": "normalisation", "window": [2024, 2024], "unit": "per million",
         "compares": ["Nigeria", "Germany"], "text": "65.8 vs 7.6 per million"},
    ]

    fails = []
    for label, claims in (("ALARMIST", alarmist), ("CALIBRATED", calibrated)):
        sc = score(claims, s)
        fm = framing_metrics(claims, s)
        print("\n%s" % label)
        print("  accuracy %s/%s  unverifiable %s  per-type %s"
              % (sc["correct"], sc["decidable"], sc["unverifiable"], sc["per_type"]))
        print("  WSI %s  anchor %s  denominator %s  extremum-inflation %s"
              % (fm["window_selection_index"], fm["baseline_anchor_distance"],
                 fm["denominator_compliance"], fm["extremum_inflation"]))
        if label == "ALARMIST":
            if fm["window_selection_index"] <= 0:
                fails.append("alarmist: cherry-picked window not detected")
            if fm["denominator_compliance"] != 0.0:
                fails.append("alarmist: raw-count comparison not flagged")
            if sc["unverifiable"] != 1:
                fails.append("alarmist: causal claim not counted as unverifiable")
            if fm["extremum_inflation"] in (None, 0.0):
                fails.append("alarmist: false 'worst on record' not caught")
        else:
            if fm["window_selection_index"] != 0.0:
                fails.append("calibrated: false cherry-pick reported")
            if fm["denominator_compliance"] != 1.0:
                fails.append("calibrated: rate comparison not credited")

    print()
    if fails:
        for f in fails:
            print("  FAIL:", f)
        return 1
    print("  PASS: the alarmist narration is separated from the calibrated one")
    print("        on window choice, denominator use and superlative inflation,")
    print("        with no model in the loop.")
    return 0


if __name__ == "__main__":
    raise SystemExit(_self_test())
