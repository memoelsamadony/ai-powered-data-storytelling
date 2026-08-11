#!/usr/bin/env python3
"""Shared word counter for baseline stories (the script BRIEF.md points at).

One counter for both story sets, so machine-written and human-written texts
are counted the same way: whitespace-separated tokens, BODY ONLY. The YAML
frontmatter block and the headline line are excluded. 120-160 is the target
the brief asks for, 110-170 is accepted without comment.

    python3 experiments/analysis/wordcount.py <story.md> [more.md ...]

Prints one line per file: "<count>\t<in-range marker>\t<path>".
"""

from __future__ import annotations

import sys
from pathlib import Path

TARGET = (120, 160)
ACCEPTED = (110, 170)


def split_story(text: str) -> tuple[str, str, str]:
    """Return (frontmatter, headline, body) from a story file.

    Frontmatter is an optional leading ``--- ... ---`` block. The headline is
    the first non-empty line after it when that line starts with ``#`` or with
    ``HEADLINE:``; everything after the headline is the body.
    """
    fm, rest = "", text
    if text.lstrip().startswith("---"):
        stripped = text.lstrip()
        parts = stripped.split("---", 2)
        if len(parts) == 3:
            fm, rest = parts[1], parts[2]
    lines = rest.lstrip("\n").split("\n")
    headline = ""
    if lines:
        first = lines[0].strip()
        if first.startswith("#"):
            headline = first.lstrip("#").strip()
            lines = lines[1:]
        elif first.upper().startswith("HEADLINE:"):
            headline = first[len("HEADLINE:"):].strip()
            lines = lines[1:]
    body = "\n".join(lines).strip()
    return fm, headline, body


def count_words(text: str) -> int:
    """Whitespace-separated tokens in the body only."""
    _, _, body = split_story(text)
    return len(body.split())


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    worst = 0
    for p in argv:
        n = count_words(Path(p).read_text(encoding="utf-8"))
        if TARGET[0] <= n <= TARGET[1]:
            mark = "ok"
        elif ACCEPTED[0] <= n <= ACCEPTED[1]:
            mark = "accepted"
        else:
            mark = "OUT-OF-RANGE"
            worst = 1
        print(f"{n}\t{mark}\t{p}")
    return worst


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
