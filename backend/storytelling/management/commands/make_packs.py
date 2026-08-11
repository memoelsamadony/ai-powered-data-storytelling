"""P0.13: generate the evidence packs. One artefact, two consumers.

    python manage.py make_packs

The generator's prompt table and the human writer's data pack are the SAME
string. `build_prompt_table` is called once per series; the returned object is
written to disk and its sha256 is recorded. The experiment export then asserts
that the string handed to the generator has that same digest, so parity is a
property of the code rather than something a test re-establishes.

Without this the model sees MCV1 coverage and the herd-immunity threshold while
a writer working from the CSV does not, and H1 measures an information gap and
calls it tone.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from django.core.management.base import BaseCommand

from storytelling import datasets as ds

PACK_DIR = ds.REPO_ROOT / "experiments" / "human-baselines" / "datapacks"


pack_text = ds.pack_text  # the shared builder; see datasets.pack_text


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class Command(BaseCommand):
    help = "Write the shared evidence packs and their digests (P0.13)."

    def handle(self, *args, **opts):
        PACK_DIR.mkdir(parents=True, exist_ok=True)
        index = {}
        for slug, spec in ds.SPECS.items():
            if not ds.is_available(spec):
                self.stdout.write(f"  skip {slug}: no data file yet")
                continue
            text = pack_text(slug)          # called ONCE
            digest = sha(text)
            out = PACK_DIR / f"{slug}.txt"
            out.write_text(text, encoding="utf-8")
            # read back: catches encoding or newline drift at write time
            assert sha(out.read_text(encoding="utf-8")) == digest, f"{slug}: pack drifted on write"
            index[slug] = {"file": f"{out.parent.name}/{out.name}",
                           "sha256": digest, "chars": len(text),
                           "lines": text.count("\n")}
            self.stdout.write(self.style.SUCCESS(
                f"  {slug:<24} {digest[:16]}  {len(text):>5} chars"))
        (PACK_DIR / "index.json").write_text(json.dumps(index, indent=2) + "\n")
        self.stdout.write(f"\n{len(index)} packs written to {PACK_DIR}")
        self.stdout.write("Writers and the generator now read the identical string.")
