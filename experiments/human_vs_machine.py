#!/usr/bin/env python3
"""Score every run against the team's human stories, and rank the combinations.

Until the provenance label was corrected (see LOOPHOLES L2) the human set was
believed to be machine-derived, so no similarity metric against it was allowed
to mean anything. It is genuine human writing, which makes two questions
answerable for the first time:

1. **Where does a moderated machine story sit relative to a person writing from
   the same evidence pack**, on tone and on wording.
2. **Which generator/moderator pairing gets closest**, which is the question the
   whole tier ladder exists to answer.

Two design decisions that the numbers depend on, both deliberate:

* **Ranking uses pertussis-global only.** Every ladder rung was run on that
  series and nothing else, while `demo`/`mid`/`g8b` also have runs on calmer
  series. Ranking across whatever series a tier happened to touch would hand a
  tier with a measles run a free tone advantage, because measles writes calm
  (raw ~2.1) and pertussis writes hot (raw ~4.3). Other series are used for the
  human-level tables, never for the ranking.
* **Similarity strips machine headlines.** The human stories have none, so
  leaving the headline in would score a machine story against a human story on
  text the human never had the chance to write.

Writes ``experiments/exp_json/*.json``, one per experiment, each naming the
figure it feeds.

    python3 experiments/human_vs_machine.py
"""

from __future__ import annotations

import argparse
import json
import os
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402

django.setup()
sys.path.insert(0, str(HERE))
from safe_write import add_force_flag, write_json, write_text  # noqa: E402
from storytelling import faithfulness, metrics, ollama_client as oc  # noqa: E402
from storytelling.models import Run, StageResult  # noqa: E402
from storytelling.services import _dataset_values  # noqa: E402

PILOT = HERE / "human-baselines" / "pilot-stories"
OUTDIR = HERE / "exp_json"
RANK_SERIES = "pertussis-global"


def human_stories() -> dict[str, list[dict]]:
    """series -> [{writer, body}], the team's own writing."""
    out: dict[str, list[dict]] = defaultdict(list)
    for p in sorted(PILOT.glob("*__human.md")):
        text = p.read_text(encoding="utf-8")
        meta, body = {}, text
        if text.startswith("---"):
            _, front, body = text.split("---", 2)
            for line in front.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.split("#")[0].strip()
        out[meta.get("series", "")].append(
            {"writer": meta.get("writer", p.stem), "body": body.strip(),
             "file": str(p.relative_to(HERE.parent))}
        )
    return dict(out)


HUMANS = human_stories()
_SCORES = json.loads((HERE / "human_baseline_scores.json").read_text())
HUMAN_TONE: dict[str, dict] = {}
for s in _SCORES["stories"]:
    HUMAN_TONE.setdefault(s["series"], {"alarmism": [], "optimism": []})
    if s.get("opus_alarmism") is not None:
        HUMAN_TONE[s["series"]]["alarmism"].append(s["opus_alarmism"])
    if s.get("opus_optimism") is not None:
        HUMAN_TONE[s["series"]]["optimism"].append(s["opus_optimism"])


def similarity_to_humans(machine_body: str, series: str) -> dict:
    """Against each human story on the series. Max and mean, never just one.

    Mean punishes the humans for disagreeing with each other; max answers the
    question actually being asked, which is whether the machine landed near
    *any* human way of telling this story.
    """
    people = HUMANS.get(series) or []
    if not (people and machine_body.strip()):
        return {}
    per = []
    for h in people:
        m = metrics.all_metrics(h["body"], machine_body)
        per.append({"writer": h["writer"], "chrf": round(m["chrf++"], 4),
                    "rouge_l": round(m["rouge_l"], 4),
                    "bleu2": round(m["bleu2"], 4)})
    return {
        "n_humans": len(per),
        "chrf_max": round(max(p["chrf"] for p in per), 4),
        "chrf_mean": round(st.fmean(p["chrf"] for p in per), 4),
        "rouge_l_max": round(max(p["rouge_l"] for p in per), 4),
        "rouge_l_mean": round(st.fmean(p["rouge_l"] for p in per), 4),
        "closest_writer": max(per, key=lambda p: p["chrf"])["writer"],
        "per_writer": per,
    }


def row(run: Run) -> dict:
    tier = oc.resolve_tier(run.tier)
    raw = "\n\n".join(run.raw_paragraphs or [])
    mod = "\n\n".join(run.moderated_paragraphs or [])
    vals, years = _dataset_values(run.dataset_id)
    ht = HUMAN_TONE.get(run.dataset_id, {})
    h_alarm = st.median(ht["alarmism"]) if ht.get("alarmism") else None
    h_optim = st.median(ht["optimism"]) if ht.get("optimism") else None
    ret = faithfulness.retention(raw, mod)
    inj = faithfulness.injection(mod, raw, vals)
    secs = {s.stage: round(s.duration_s or 0, 1)
            for s in StageResult.objects.filter(run=run)}
    ollama_s = round(sum(v for k, v in secs.items() if not k.startswith("judge_opus")), 1)

    def gap(v, h):
        return None if (v is None or h is None) else round(abs(v - h), 3)

    return {
        "run": str(run.id),
        "dataset": run.dataset_id,
        "tier": run.tier,
        "generator": tier.generator,
        "moderator": tier.moderator,
        "alarmism": {"raw": run.opus_raw_alarmism, "moderated": run.opus_moderated_alarmism,
                     "human_median": h_alarm,
                     "gap_raw": gap(run.opus_raw_alarmism, h_alarm),
                     "gap_moderated": gap(run.opus_moderated_alarmism, h_alarm)},
        "optimism": {"raw": run.opus_raw_optimism, "moderated": run.opus_moderated_optimism,
                     "human_median": h_optim,
                     "gap_raw": gap(run.opus_raw_optimism, h_optim),
                     "gap_moderated": gap(run.opus_moderated_optimism, h_optim)},
        "similarity_to_human": {
            "raw": similarity_to_humans(raw, run.dataset_id),
            "moderated": similarity_to_humans(mod, run.dataset_id),
        },
        "faithfulness": {
            "numeric_retention": (None if ret["numeric_retention"] is None
                                  else round(ret["numeric_retention"], 3)),
            "added_unsupported": inj["added_unsupported"],
            "groundedness_raw": metrics.groundedness(raw, vals, years)["groundedness"],
            "groundedness_moderated": metrics.groundedness(mod, vals, years)["groundedness"],
        },
        "emotive_spans": len(run.emotive_spans or []),
        "seconds_ollama": ollama_s,
    }


def write(name: str, payload: dict) -> None:
    write_json(OUTDIR / f"{name}.json", payload, force=ARGS.force)


def main() -> int:
    global ARGS
    ap = argparse.ArgumentParser()
    add_force_flag(ap)
    ARGS = ap.parse_args()
    runs = [r for r in Run.objects.all().order_by("created_at")
            if r.raw_paragraphs and r.moderated_paragraphs and r.opus_raw_alarmism is not None]
    rows = [row(r) for r in runs]
    write_json(HERE / "human_vs_machine.json",
               {"n_runs": len(rows), "rank_series": RANK_SERIES,
                "similarity_excludes_machine_headline": True, "runs": rows},
               force=ARGS.force)
    print()

    ladder = [r for r in rows if r["dataset"] == RANK_SERIES]
    ladder.sort(key=lambda r: (r["alarmism"]["gap_moderated"] is None,
                               r["alarmism"]["gap_moderated"] or 0))

    print(f"Ranking on {RANK_SERIES} only ({len(ladder)} runs, one per combination)\n")
    print(f"{'tier':16s}{'generator':16s}{'moderator':15s}"
          f"{'mod':>5}{'|Δhuman|':>9}{'chrF max':>10}{'ret':>6}{'inj':>5}{'sec':>7}")
    for r in ladder:
        a = r["alarmism"]
        sim = r["similarity_to_human"]["moderated"]
        f = r["faithfulness"]
        print(f"{r['tier']:16s}{r['generator']:16s}{r['moderator']:15s}"
              f"{a['moderated']:>5}{a['gap_moderated']:>9}"
              f"{sim.get('chrf_max', 0):>10.3f}{f['numeric_retention'] or 0:>6.2f}"
              f"{f['added_unsupported']:>5}{r['seconds_ollama']:>7.0f}")

    # ---- per-experiment files ------------------------------------------
    gens = {"g1b", "g3b", "g4b", "g8b", "q2b", "q4b", "q9b"}
    mods = {"m12b", "m26b", "x9b", "x35b", "g8b"}
    human_series = sorted(HUMANS)

    write("exp-human-comparison", {
        "experiment": "Machine stories against the team's human stories",
        "question": "After moderation, how far is a machine story from a person "
                    "writing from the same evidence pack, on tone and on wording?",
        "judge": "claude/opus, blind, one call per story, two axes",
        "series": human_series,
        "n_human_stories": sum(len(v) for v in HUMANS.values()),
        "n_runs": len([r for r in rows if r["dataset"] in HUMANS]),
        "aggregate": {
            "alarmism_raw_mean": round(st.fmean(r["alarmism"]["raw"] for r in rows), 3),
            "alarmism_moderated_mean": round(st.fmean(r["alarmism"]["moderated"] for r in rows), 3),
            "optimism_raw_mean": round(st.fmean(r["optimism"]["raw"] for r in rows), 3),
            "optimism_moderated_mean": round(st.fmean(r["optimism"]["moderated"] for r in rows), 3),
            "human_alarmism_median": round(st.median(
                [v for s in HUMAN_TONE.values() for v in s["alarmism"]]), 3),
            "human_optimism_median": round(st.median(
                [v for s in HUMAN_TONE.values() for v in s["optimism"]]), 3),
        },
        "per_series": {
            s: {
                "human_alarmism_median": round(st.median(HUMAN_TONE[s]["alarmism"]), 2),
                "human_optimism_median": round(st.median(HUMAN_TONE[s]["optimism"]), 2),
                "machine_raw_alarmism_mean": round(st.fmean(
                    [r["alarmism"]["raw"] for r in rows if r["dataset"] == s]), 2),
                "machine_moderated_alarmism_mean": round(st.fmean(
                    [r["alarmism"]["moderated"] for r in rows if r["dataset"] == s]), 2),
                "n_runs": len([r for r in rows if r["dataset"] == s]),
            } for s in human_series if any(r["dataset"] == s for r in rows)
        },
        "caveats": [
            "The human stories carry no headline; machine stories are judged with one. "
            "Headlines concentrate alarmism, so the human column is flattered and the "
            "gap is a lower bound.",
            "Similarity is computed on bodies only, for the same reason.",
            "Five interchangeable writer slots per series, not the four named writers "
            "ASSIGNMENT.md S6 wants, so this is not H.",
        ],
        "figure": "presentation/figures/fig9.svg",
    })

    write("exp-combination-ranking", {
        "experiment": "Which generator and which moderator get closest to human tone",
        "question": "Ranked on distance from the human median alarmism, on one series.",
        "dataset": RANK_SERIES,
        "n_per_cell": 1,
        "grid_shape": "L-shaped, not factorial: generators were varied against "
                      "gemma4:31b and moderators against llama3.1:8b, so the "
                      "best-generator x best-moderator cell was never run.",
        "generator_arm": [r for r in ladder if r["tier"] in gens],
        "moderator_arm": [r for r in ladder if r["tier"] in mods],
        "ranking": [{"tier": r["tier"], "generator": r["generator"],
                     "moderator": r["moderator"],
                     "moderated_alarmism": r["alarmism"]["moderated"],
                     "gap_to_human": r["alarmism"]["gap_moderated"],
                     "chrf_max_to_human": r["similarity_to_human"]["moderated"].get("chrf_max"),
                     "numeric_retention": r["faithfulness"]["numeric_retention"],
                     "added_unsupported": r["faithfulness"]["added_unsupported"],
                     "seconds": r["seconds_ollama"]} for r in ladder],
        "caveats": [
            "n=1 per cell. No variance, so no ranking here is significant.",
            "One series. pertussis-global is the hottest-writing series in the set.",
            "Ranking deliberately excludes runs on other series: measles writes calm, "
            "so a tier that happened to run there would win on difficulty, not merit.",
        ],
        "figure": "presentation/figures/fig10.svg",
    })
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
