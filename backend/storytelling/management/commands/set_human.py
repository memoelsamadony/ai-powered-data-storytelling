"""Attach a human baseline to a run and judge it on the same rubric (P0.2).

    python manage.py set_human --run <uuid> --file path/to/story.md --title "..."

The human story is rated by the same judge, with the same rubric, as every model
story. Previously `_human_variant` returned a hardcoded 2.5, which the interface
rendered as though it were a measurement. Without a judged human story the
alarmism scale has no anchor and H1 has nothing to measure distance to.
"""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from storytelling import agents
from storytelling.models import Run, StageResult
from storytelling.services import _timed


class Command(BaseCommand):
    help = "Store a human baseline and judge it on the shared rubric."

    def add_arguments(self, parser):
        parser.add_argument("--run", required=True)
        parser.add_argument("--file", required=True)
        parser.add_argument("--title", default="")
        parser.add_argument("--no-judge", action="store_true")

    def handle(self, *args, **o):
        try:
            run = Run.objects.get(id=o["run"])
        except Run.DoesNotExist:
            raise CommandError(f"no run {o['run']}")
        path = Path(o["file"])
        if not path.exists():
            raise CommandError(f"no such file: {path}")

        text = path.read_text(encoding="utf-8").strip()
        words = len(text.split())
        if not 90 <= words <= 200:
            self.stdout.write(self.style.WARNING(
                f"  {words} words: outside the 110-170 the brief asks for. "
                "Stored anyway; flag it in the analysis."))

        run.human_text = text
        run.human_title = o["title"]
        run.save(update_fields=["human_text", "human_title"])
        self.stdout.write(f"stored {words} words on run {run.id}")

        if o["no_judge"]:
            self.stdout.write("  skipped judging (--no-judge); human_alarmism stays null")
            return

        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        tier = agents.oc.resolve_tier(run.tier)
        judged = _timed(run, StageResult.Stage.JUDGE_RAW, tier.judge,
                        lambda: agents.run_judge(run.tier, o["title"] or "Human baseline",
                                                 paragraphs))
        run.human_alarmism = judged.alarmism_rating
        run.save(update_fields=["human_alarmism"])
        self.stdout.write(self.style.SUCCESS(
            f"  human alarmism {judged.alarmism_rating} "
            f"(rubric {agents.RUBRIC_ID}, sha {agents.RUBRIC_SHA256[:12]})"))
