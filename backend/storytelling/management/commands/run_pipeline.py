"""Run the pipeline offline and cache the result.

This is the entry point for the large tier. A ``qwen3.6:35b`` -> ``gemma4:31b``
run cannot happen inside a web request on 32 GB: the two models are 43 GB
together, so each stage loads and unloads and a single story takes minutes.

Run it ahead of a presentation, then the interface serves the finished Run from
the database instantly.

    python manage.py run_pipeline --dataset measles --tier large
    python manage.py run_pipeline --dataset measles --tier mid --repeat 3
"""

from __future__ import annotations

import time

from django.core.management.base import BaseCommand, CommandError

from storytelling import datasets as ds
from storytelling import ollama_client as oc
from storytelling import services


class Command(BaseCommand):
    help = "Run generate -> moderate -> factcheck offline and cache the result."

    def add_arguments(self, parser):
        parser.add_argument("--dataset", default="measles")
        parser.add_argument("--tier", default="mid", choices=list(oc.TIERS))
        parser.add_argument("--repeat", type=int, default=1,
                            help="Runs to perform. Repeats measure variance at a tier.")
        parser.add_argument("--seed", type=int, default=None,
                            help="Pin the generator seed (P0.6). With --repeat, seeds "
                                 "increment from this value so each run is distinct and "
                                 "reproducible.")

    def handle(self, *args, **opts):
        dataset, tier_id, repeat = opts["dataset"], opts["tier"], opts["repeat"]

        if dataset not in ds.SPECS:
            raise CommandError(f"Unknown dataset '{dataset}'. Known: {', '.join(ds.SPECS)}")
        if not ds.is_available(ds.SPECS[dataset]):
            raise CommandError(f"Dataset '{dataset}' has no CSV yet.")
        if not oc.is_up():
            raise CommandError("Ollama is not responding on localhost:11434.")

        tier = oc.resolve_tier(tier_id)
        plan = oc.tier_plan(tier)
        if not plan["runnable"]:
            missing = [m for m in tier.distinct_models if m not in plan["installed"]]
            raise CommandError(f"Tier '{tier_id}' needs: {', '.join(missing)}. Pull them first.")

        self.stdout.write(f"tier={tier_id}  peak={plan['peak_resident_gb']} GB  "
                          f"sequential={plan['sequential']}")
        if plan["needs_raised_limit"]:
            self.stdout.write(self.style.WARNING(
                f"  {tier.generator} alone exceeds the usable GPU limit "
                f"({plan['peak_resident_gb']} GB > {oc.usable_gb()} GB). It will spill to CPU "
                f"and crawl. Raise it first:\n"
                f"    sudo sysctl iogpu.wired_limit_mb=28672"
            ))

        for i in range(repeat):
            self.stdout.write(f"\n--- run {i + 1}/{repeat} ---")
            start = time.perf_counter()
            seed = None if opts["seed"] is None else opts["seed"] + i
            try:
                run = services.run_full_pipeline(dataset, tier_id, seed=seed)
            except Exception as exc:  # noqa: BLE001
                raise CommandError(f"run failed: {exc}") from exc
            total = time.perf_counter() - start

            self.stdout.write(self.style.SUCCESS(
                f"  run {run.id} done in {total:.0f}s"
                + (f" (seed {seed})" if seed is not None else " (seed unpinned)")))
            for s in run.stages.all():
                self.stdout.write(f"    {s.stage:<16} {s.model:<14} {s.duration_s:>7.1f}s")
            self.stdout.write(
                f"  alarmism {run.raw_alarmism} -> {run.moderated_alarmism} "
                f"| optimism {run.raw_optimism} -> {run.moderated_optimism} "
                f"| {len(run.emotive_spans)} emotive spans "
                f"| {sum(1 for f in run.factual_check if f.get('status') == 'flagged')} flagged claims"
            )
