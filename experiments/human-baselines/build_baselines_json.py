#!/usr/bin/env python3
"""Assemble the BRIEF.md human submissions into one combined JSON file.

It walks exactly one directory, ``stories/``, and writes ``baselines.json``
next to this script, recomputing every word count with the shared counter.

Two sibling sets are deliberately NOT read here:

* ``llm-drafts/`` held 25 model-drafted stories and was deleted on 2026-08-12
  (hashes in ``DELETED-LLM-DRAFTS.md``). Mixing machine text into a file named
  baselines.json only ever created a chance to forget which rows were which.
* ``pilot-stories/`` holds hand-rewrites of those drafts. Its own README bars
  it from this script and from the ``H`` computation in ASSIGNMENT.md S6,
  because the writers saw a machine draft first. Score it with
  ``experiments/score_human_baselines.py``, which keeps that caveat attached.

So every entry in ``baselines.json`` is a blind, from-scratch human story, and
a similarity metric computed against this file means what its name says.

    python3 experiments/human-baselines/build_baselines_json.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "analysis"))
from wordcount import ACCEPTED, count_words, split_story  # noqa: E402


def story_sha256(headline: str, body: str) -> str:
    """Hash of the story as text: headline, blank line, body."""
    return hashlib.sha256(f"{headline}\n\n{body}".encode("utf-8")).hexdigest()


def parse_frontmatter(fm: str) -> dict:
    """Minimal ``key: value`` YAML reader; enough for these files."""
    meta = {}
    for line in fm.splitlines():
        line = line.split("  #", 1)[0].rstrip()
        if ":" not in line or not line.strip() or line.startswith(" "):
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip().strip('"')
    return meta


def load_dir(directory: Path, source: str) -> list[dict]:
    entries = []
    for path in sorted(directory.glob("*.md")):
        if path.name.upper().startswith("README"):
            continue
        text = path.read_text(encoding="utf-8")
        fm, headline, body = split_story(text)
        meta = parse_frontmatter(fm)
        sha = story_sha256(headline, body)
        words = count_words(text)
        entries.append({
            "id": path.stem,
            "file": str(path.relative_to(HERE.parent.parent)),
            "source": source,
            "provenance": "human-written per BRIEF.md",
            "series": meta.get("series", path.stem.split("__")[0]),
            "writer": meta.get("writer", path.stem.split("__")[-1]),
            "persona": meta.get("persona"),
            "headline": headline,
            "text": body,
            "word_count": words,
            "word_count_in_range": ACCEPTED[0] <= words <= ACCEPTED[1],
            "datapack": meta.get("datapack"),
            "datapack_sha256": meta.get("datapack_sha256"),
            "story_sha256": sha,
        })
    return entries


def main() -> int:
    baselines = load_dir(HERE / "stories", "human") if (HERE / "stories").is_dir() else []
    if not baselines:
        print("no stories in stories/ yet; the blind track is still being collected")
        return 1

    out = {
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "note": ("Every entry is a blind, from-scratch human submission under "
                 "BRIEF.md. The model-drafted set was deleted (see "
                 "DELETED-LLM-DRAFTS.md) and the hand-rewritten pilot set is "
                 "scored separately, so nothing machine-originated is in here."),
        "counts": {"total": len(baselines), "human": len(baselines)},
        "baselines": baselines,
    }
    dest = HERE / "baselines.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")
    print(f"wrote {dest} ({len(baselines)} stories)")
    for b in baselines:
        flag = "" if b["word_count_in_range"] else "  <-- OUTSIDE 110-170"
        print(f"  {b['id']:<34} {b['source']:<9} {b['word_count']} words{flag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
