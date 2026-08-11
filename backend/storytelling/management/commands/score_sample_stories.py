"""Score the sample stories in lib/data/stories.ts with the two-axis judge.

Those stories are hand-written prose - worked examples of what an alarmist
draft, a moderated draft and a human baseline look like. Their tone ratings
were hand-written too, and the home page prints one of them as "tone -2.5".

They do not have to be invented. The text is fixed, so it can be judged like
any other story, and then the number under it is a measurement of the words
above it. This prints the verdicts; paste them into stories.ts with the model
and date, the way a reproduction figure names its source.

    python manage.py score_sample_stories --dataset measles
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from storytelling import datasets as ds
from storytelling import judge

STORIES_TS = ds.REPO_ROOT / "lib" / "data" / "stories.ts"


def parse_stories(path: Path) -> dict[str, list[dict]]:
    """Pull (variant, title, paragraphs) out of the TS module.

    Reading the module rather than restating the prose here: a copy would drift
    the moment somebody edits a sentence, and then the rating would belong to a
    story nobody can see.
    """
    text = path.read_text()
    out: dict[str, list[dict]] = {}
    for block in re.finditer(
        r"const (\w+): StorySet = \{(.*?)\n\};", text, re.S
    ):
        name, body = block.group(1), block.group(2)
        variants = []
        for variant in re.finditer(
            r'\n  (\w+): \{\n(.*?)\n  \},', body, re.S
        ):
            key, fields = variant.group(1), variant.group(2)
            title = re.search(r'title: "(.*?)",', fields)
            paragraphs = re.search(r"paragraphs: \[(.*?)\n    \]", fields, re.S)
            if not title or not paragraphs:
                continue
            variants.append(
                {
                    "key": key,
                    "title": title.group(1),
                    "paragraphs": [
                        json.loads(m.group(0))
                        for m in re.finditer(r'"(?:[^"\\]|\\.)*"', paragraphs.group(1))
                    ],
                }
            )
        if variants:
            out[name] = variants
    return out


class Command(BaseCommand):
    help = "Judge the sample stories in lib/data/stories.ts on both tone axes."

    def add_arguments(self, parser):
        parser.add_argument("--dataset", default="", help="Only this StorySet (measles, who).")
        parser.add_argument("--model", default=judge.DEFAULT_MODEL)

    def handle(self, *args, **opts):
        if not judge.is_available():
            raise CommandError("The Claude CLI is not on PATH, so there is no judge to run.")

        sets = parse_stories(STORIES_TS)
        if not sets:
            raise CommandError(f"Parsed no stories out of {STORIES_TS}.")

        for name, variants in sets.items():
            if opts["dataset"] and opts["dataset"] not in name:
                continue
            dataset_id = "measles" if "measles" in name.lower() else "who-health"
            table = ds.build_prompt_table(dataset_id)
            self.stdout.write(self.style.MIGRATE_HEADING(f"\n{name} ({dataset_id})"))
            for variant in variants:
                score = judge.score_story(
                    table, variant["title"], variant["paragraphs"], model=opts["model"]
                )
                self.stdout.write(
                    f"  {variant['key']:<12} alarmism {score.alarmism:>4.1f} "
                    f"optimism {score.optimism:>4.1f}   {variant['title']}"
                )
                self.stdout.write(f"               {score.rationale}")
