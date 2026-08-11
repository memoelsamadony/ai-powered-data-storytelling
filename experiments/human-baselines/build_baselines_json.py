#!/usr/bin/env python3
"""Assemble every baseline story into one combined JSON file.

Run this AFTER editing the drafts in ``llm-drafts/``. It walks two directories:

* ``llm-drafts/``  - LLM-drafted reference stories (source: "llm-draft")
* ``stories/``     - genuine human submissions per BRIEF.md (source: "human")

and writes ``baselines.json`` next to this script. For every draft it
recomputes the word count with the shared counter and compares the current
story hash against the ``original_story_sha256`` recorded at generation time,
so an edited draft is labelled ``edited: true`` automatically. Provenance is
carried into every entry on purpose: once a story passes through
``manage.py set_human`` the run record cannot tell a human story from an
LLM-drafted one, so this file is where that distinction survives.

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
        # The frontmatter records a 12-char prefix of the hash at generation
        # time, so an unedited draft matches by prefix, not full equality.
        original = meta.get("original_story_sha256", "")
        edited = bool(original) and not sha.startswith(original)
        words = count_words(text)
        if source == "llm-draft":
            provenance = ("claude-draft, human-edited" if edited
                          else "claude-draft, UNEDITED")
        else:
            provenance = "human-written per BRIEF.md"
        entries.append({
            "id": path.stem,
            "file": str(path.relative_to(HERE.parent.parent)),
            "source": source,
            "provenance": provenance,
            "edited": edited,
            "series": meta.get("series", path.stem.split("__")[0]),
            "writer": meta.get("writer", path.stem.split("__")[-1]),
            "persona": meta.get("persona"),
            "headline": headline,
            "text": body,
            "word_count": words,
            "word_count_in_range": ACCEPTED[0] <= words <= ACCEPTED[1],
            "datapack": meta.get("datapack"),
            "datapack_sha256": meta.get("datapack_sha256"),
            "original_story_sha256": original or None,
            "story_sha256": sha,
        })
    return entries


def main() -> int:
    baselines = []
    baselines += load_dir(HERE / "llm-drafts", "llm-draft") if (HERE / "llm-drafts").is_dir() else []
    baselines += load_dir(HERE / "stories", "human") if (HERE / "stories").is_dir() else []
    if not baselines:
        print("no stories found in llm-drafts/ or stories/")
        return 1

    unedited = [b["id"] for b in baselines
                if b["source"] == "llm-draft" and not b["edited"]]
    out = {
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "note": ("LLM-drafted entries are a model-authored reference set "
                 "(Claude Opus subagents, one isolated context per story, "
                 "construct-free pack-only prompt). They are NOT independent "
                 "human baselines in the sense of BRIEF.md; similarity metrics "
                 "computed against them measure distance to (edited) Claude "
                 "text. Entries from stories/ are the genuine human track."),
        "counts": {
            "total": len(baselines),
            "llm_drafts": sum(1 for b in baselines if b["source"] == "llm-draft"),
            "human": sum(1 for b in baselines if b["source"] == "human"),
            "llm_drafts_unedited": len(unedited),
        },
        "baselines": baselines,
    }
    dest = HERE / "baselines.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")
    print(f"wrote {dest} ({len(baselines)} stories)")
    for b in baselines:
        flag = "" if b["word_count_in_range"] else "  <-- OUTSIDE 110-170"
        print(f"  {b['id']:<34} {b['source']:<9} edited={str(b['edited']):<5} "
              f"{b['word_count']} words{flag}")
    if unedited:
        print(f"\nWARNING: {len(unedited)} LLM draft(s) are byte-identical to "
              "the generated original (no human edit yet):")
        for name in unedited:
            print(f"  - {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
