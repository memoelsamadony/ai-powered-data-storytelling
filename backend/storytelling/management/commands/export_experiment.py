"""Export one experiment as a single self-contained JSON file.

    python manage.py export_experiment --id e0-smoke --out experiments/

Everything needed to reproduce or audit the experiment lands in one file:
models and their digests, every prompt with its hash, the rubric id and hash,
the evidence pack and its hash, all decoding parameters including the seed,
the hardware probe, every stage with timings and token counts, the full story
texts, every metric, and the human baselines.

The rule from EXPERIMENT_PLAN.md section 10 is that no figure in the report may
exist only in a local database. `backend/db.sqlite3` is gitignored, so this file
is the committed artefact the analysis reads.
"""

from __future__ import annotations

import hashlib
import json
import platform
from pathlib import Path

from django.core.management.base import BaseCommand

from storytelling import agents, datasets as ds, metrics, textstats
from storytelling import ollama_client as oc
from storytelling.models import Run
from storytelling.services import _dataset_values, compare


def _h(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


class Command(BaseCommand):
    help = "Export runs, parameters, metrics and human baselines to one JSON file."

    def add_arguments(self, parser):
        parser.add_argument("--id", required=True, help="experiment id, e.g. e0-smoke")
        parser.add_argument("--out", default="experiments")
        parser.add_argument("--dataset", default=None)
        parser.add_argument("--tier", default=None)
        parser.add_argument("--stamp", default=None,
                            help="ISO timestamp; passed in so the export is deterministic")

    def handle(self, *args, **o):
        qs = Run.objects.filter(status="done").order_by("created_at")
        if o["dataset"]:
            qs = qs.filter(dataset_id=o["dataset"])
        if o["tier"]:
            qs = qs.filter(tier=o["tier"])
        runs = list(qs)
        if not runs:
            self.stdout.write(self.style.WARNING("no completed runs match; nothing exported"))
            return

        # ---- parameters shared by the whole experiment ----------------------
        tiers = sorted({r.tier for r in runs})
        datasets_used = sorted({r.dataset_id for r in runs})
        params = {
            "experiment_id": o["id"],
            "exported_at": o["stamp"],
            "code": {
                "rubric_id": agents.RUBRIC_ID,
                "rubric_sha256": agents.RUBRIC_SHA256,
                "prompts": {
                    "generate_system": {"sha256": _h(agents.GENERATE_SYSTEM),
                                        "text": agents.GENERATE_SYSTEM},
                    "generate_prompt": {"sha256": _h(agents.GENERATE_PROMPT),
                                        "text": agents.GENERATE_PROMPT},
                    "moderate_system": {"sha256": _h(agents.MODERATE_SYSTEM),
                                        "text": agents.MODERATE_SYSTEM},
                    "moderate_prompt": {"sha256": _h(agents.MODERATE_PROMPT),
                                        "text": agents.MODERATE_PROMPT},
                    "factcheck_system": {"sha256": _h(agents.FACTCHECK_SYSTEM),
                                         "text": agents.FACTCHECK_SYSTEM},
                    "factcheck_prompt": {"sha256": _h(agents.FACTCHECK_PROMPT),
                                         "text": agents.FACTCHECK_PROMPT},
                    "judge_system": {"sha256": _h(agents.JUDGE_SYSTEM),
                                     "text": agents.JUDGE_SYSTEM},
                    "judge_prompt": {"sha256": _h(agents.JUDGE_PROMPT),
                                     "text": agents.JUDGE_PROMPT},
                },
            },
            "tiers": {
                t: {
                    "models": oc.resolve_tier(t).models,
                    "digests": {m: oc.model_digest(m)
                                for m in oc.resolve_tier(t).distinct_models},
                    "plan": {k: v for k, v in oc.tier_plan(oc.resolve_tier(t)).items()
                             if k != "installed"},
                    # stated plainly: the judge must not be the moderator (P0.1)
                    "judge_is_moderator": (oc.resolve_tier(t).judge
                                           == oc.resolve_tier(t).moderator),
                } for t in tiers
            },
            "evidence_packs": {
                d: {"sha256": ds.pack_sha256(d), "text": ds.pack_text(d)}
                for d in datasets_used
            },
            "hardware": {
                "platform": platform.platform(),
                "machine": platform.machine(),
                "total_ram_gb": oc.TOTAL_RAM_GB,
                "gpu_wired_limit_gb": oc.gpu_wired_limit_gb(),
                "usable_gb": oc.usable_gb(),
            },
        }

        # ---- per-run detail --------------------------------------------------
        out_runs = []
        for r in runs:
            raw_text = "\n\n".join(r.raw_paragraphs)
            mod_text = "\n\n".join(r.moderated_paragraphs)
            try:
                values, years = _dataset_values(r.dataset_id)
            except Exception:  # noqa: BLE001
                values, years = [], []
            cmp_ = compare(r, r.human_text)
            out_runs.append({
                "run_id": str(r.id),
                "dataset_id": r.dataset_id,
                "tier": r.tier,
                "created_at": r.created_at.isoformat(),
                "evidence_pack_sha256": params["evidence_packs"].get(
                    r.dataset_id, {}).get("sha256"),
                "stories": {
                    "raw": {"title": r.raw_title, "paragraphs": r.raw_paragraphs,
                            "sha256": _h(raw_text), "alarmism": r.raw_alarmism},
                    "moderated": {"title": r.moderated_title,
                                  "paragraphs": r.moderated_paragraphs,
                                  "sha256": _h(mod_text),
                                  "alarmism": r.moderated_alarmism},
                    "human": {"title": r.human_title, "text": r.human_text,
                              "sha256": _h(r.human_text) if r.human_text else None,
                              "alarmism": r.human_alarmism},
                },
                "emotive_spans": r.emotive_spans,
                "factual_check": r.factual_check,
                "stages": [{
                    "stage": s.stage, "model": s.model, "duration_s": s.duration_s,
                    "usage": s.usage,
                } for s in r.stages.all()],
                "metrics": {
                    "similarity": [t.model_dump(by_alias=True) for t in cmp_.text_similarity],
                    "groundedness_raw": (cmp_.groundedness_raw.model_dump(by_alias=True)
                                         if cmp_.groundedness_raw else None),
                    "groundedness_moderated": (cmp_.groundedness_moderated.model_dump(by_alias=True)
                                               if cmp_.groundedness_moderated else None),
                    "textstats_raw": textstats.analyse(raw_text) if raw_text else None,
                    "textstats_moderated": textstats.analyse(mod_text) if mod_text else None,
                    "textstats_delta": (textstats.delta(raw_text, mod_text)
                                        if raw_text and mod_text else None),
                    "alarmism": {"before": r.raw_alarmism, "after": r.moderated_alarmism,
                                 "human": r.human_alarmism},
                },
            })

        # ---- human baselines, listed separately as well ----------------------
        baselines = [{
            "run_id": str(r.id), "dataset_id": r.dataset_id, "title": r.human_title,
            "text": r.human_text, "sha256": _h(r.human_text),
            "words": len(r.human_text.split()), "alarmism": r.human_alarmism,
            "textstats": textstats.analyse(r.human_text),
        } for r in runs if r.human_text]

        doc = {
            "parameters": params,
            "runs": out_runs,
            "human_baselines": baselines,
            "counts": {"runs": len(out_runs), "human_baselines": len(baselines)},
            "caveats": [
                "Alarmism is null where no judge result exists; nulls are excluded "
                "from analysis rather than defaulted (P0.7).",
                "groundedness is a support check against the evidence pack, not a "
                "truth check: a real value asserted in the wrong context passes. "
                "Use the windowed verifier in experiments/analysis/timeseries_claims.py "
                "for context correctness.",
            ],
        }
        outdir = Path(o["out"])
        if not outdir.is_absolute():
            outdir = ds.REPO_ROOT / outdir
        outdir.mkdir(parents=True, exist_ok=True)
        path = outdir / f"{o['id']}.json"
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False, default=str) + "\n")

        self.stdout.write(self.style.SUCCESS(f"wrote {path}"))
        self.stdout.write(f"  runs {len(out_runs)} | human baselines {len(baselines)} "
                          f"| {path.stat().st_size:,} bytes")
        for t, meta in params["tiers"].items():
            if meta["judge_is_moderator"]:
                self.stdout.write(self.style.WARNING(
                    f"  tier '{t}': judge == moderator, so the alarmism delta is "
                    f"self-assessed (P0.1 not yet satisfied)"))
