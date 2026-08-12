#!/usr/bin/env python3
"""Refuse to replace a results file with a poorer one.

Three artifacts were destroyed in a single afternoon, all the same way and none
of them noisily:

* ``score_human_baselines.py --no-judge`` rewrote ``human_baseline_scores.json``
  with 25 unjudged rows over 25 judged ones. Recovered from git.
* ``run_repeats.py --tier q27b`` wrote one run into ``exp-repeats.json`` on top
  of a finished ten-run set. Rebuilt from the database.
* ``build_results_table.py`` against a database missing its Opus ratings would
  have silently rewritten ``RUNS.md`` with null columns and an agreement
  statistic computed over 4 runs instead of 40.

None of these was a crash. Each produced a valid, plausible, smaller file, and
the only thing standing between that and a wrong number in the report was
someone noticing. The pattern is that measurement scripts overwrite by default
and a partial run looks exactly like a complete one.

So: count the measured values in what is about to be written and in what is
already there, and refuse to shrink the file without ``--force``. A count is a
crude proxy for "how much measurement is in here", and crude is the point - it
needs no schema and works on every artifact in this directory.

    from safe_write import write_json, add_force_flag
    add_force_flag(parser)
    write_json(dest, payload, force=args.force)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


class WouldLoseData(RuntimeError):
    """The new payload measures less than the file it would replace."""


def measured_values(node: Any) -> int:
    """Count the numbers in a structure, ignoring nulls and bookkeeping.

    Counts numbers rather than bytes because prose grows and shrinks for
    reasons that carry no measurement: a longer caveat is not more data. A
    null is not counted at all, which is what makes an unjudged rerun read as
    the loss it is.
    """
    if isinstance(node, bool) or node is None:
        return 0
    if isinstance(node, (int, float)):
        return 1
    if isinstance(node, dict):
        return sum(measured_values(v) for k, v in node.items()
                   if k not in {"generated_at", "built_at", "cost_usd", "seconds",
                                "duration_s", "n", "n_runs", "n_stories", "passes"})
    if isinstance(node, (list, tuple)):
        return sum(measured_values(v) for v in node)
    return 0


def write_json(dest: Path | str, payload: Any, *, force: bool = False,
               quiet: bool = False) -> Path:
    """Write JSON, unless that would replace a richer file. Returns the path."""
    dest = Path(dest)
    new = measured_values(payload)
    if dest.exists() and not force:
        try:
            old = measured_values(json.loads(dest.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            old = 0                      # unreadable is not worth protecting
        if new < old:
            raise WouldLoseData(
                f"{dest.name} already holds {old} measured values and this run "
                f"produced {new}. Refusing to overwrite.\n"
                f"  If the smaller file is what you want, pass --force.\n"
                f"  If not, the likely cause is a partial run: a --no-judge pass, "
                f"a single tier where the file holds several, or a database that "
                f"lost its ratings."
            )
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")
    if not quiet:
        print(f"wrote {dest.name} ({new} measured values)")
    return dest


def write_text(dest: Path | str, text: str, *, force: bool = False,
               min_lines: int | None = None, quiet: bool = False) -> Path:
    """Same idea for a generated markdown table, measured in table rows."""
    dest = Path(dest)
    rows = sum(1 for ln in text.splitlines() if ln.startswith("| "))
    if dest.exists() and not force:
        old = sum(1 for ln in dest.read_text(encoding="utf-8").splitlines()
                  if ln.startswith("| "))
        floor = min_lines if min_lines is not None else old
        if rows < floor:
            raise WouldLoseData(
                f"{dest.name} already holds {old} table rows and this run produced "
                f"{rows}. Refusing to overwrite. Pass --force to replace it anyway."
            )
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding="utf-8")
    if not quiet:
        print(f"wrote {dest.name} ({rows} table rows)")
    return dest


def add_force_flag(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--force", action="store_true",
        help="overwrite an existing artifact even if this run measured less")


def _self_test() -> int:
    import tempfile
    ok = True
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "a.json"
        write_json(p, {"stories": [{"score": 1.0}, {"score": 2.0}]}, quiet=True)
        # a poorer payload is refused
        try:
            write_json(p, {"stories": [{"score": None}, {"score": None}]}, quiet=True)
            print("FAIL: shrinking write was allowed"); ok = False
        except WouldLoseData:
            pass
        # ...and allowed with --force
        write_json(p, {"stories": [{"score": None}]}, force=True, quiet=True)
        # a richer payload is always fine
        write_json(p, {"stories": [{"score": 1.0}, {"score": 2.0}, {"score": 3.0}]},
                   quiet=True)
        # prose does not count as measurement
        assert measured_values({"note": "a long caveat", "v": 1}) == 1
        # nulls do not count, which is the whole point
        assert measured_values({"a": None, "b": 2.0}) == 1
        # bools are not measurements
        assert measured_values({"blind": True, "x": 5}) == 1
    print("safe_write self-test:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(_self_test())
