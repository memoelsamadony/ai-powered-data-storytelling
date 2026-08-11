"""Regenerate the frontend's dataset module from the real tables.

The React app has to render before, and without, a backend: the datasets page
is served statically, and ``getDatasets()`` falls back to a typed module when
Django is unreachable. That module used to be a *hand-written illustrative
sample* - 32 countries whose figures were anchored to published values where
those were known and interpolated where they were not, with a header saying so.

Two problems with that, and the second is the serious one. The numbers
disagreed with the table the pipeline actually reads (Nigeria's 2000 measles
incidence is 1678.9 per million, the sample said 233), and some of them existed
for years the source publishes nothing at all (France 1990). A map is a claim
about places, and the disclaimer sat in a code comment no reader of the map
ever sees.

So the fallback is now a build-time snapshot of exactly what the API serves.
This command calls the same ``get_dataset`` the endpoint calls and dumps the
same pydantic payload through the same camelCase aliases, so the static path
cannot drift from the wire format by construction - a field renamed in
``schemas.py`` moves here in the same regeneration.

    python manage.py build_frontend_data
    python manage.py build_frontend_data --check   # CI / test: fail on drift

Rerun it whenever a CSV or a DatasetSpec changes, and commit the result.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from storytelling import datasets as ds
from storytelling import results

# backend/storytelling/management/commands/ -> repo root
REPO_ROOT = Path(__file__).resolve().parents[4]
GENERATED = REPO_ROOT / "lib" / "data" / "generated"
DATASETS_TARGET = GENERATED / "datasets.generated.ts"
RESULTS_TARGET = GENERATED / "results.generated.ts"

HEADER = '''/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Written by `python manage.py build_frontend_data` from the merged CSVs in
 * emotional-tone-moderation/data/, through the same `get_dataset()` the API
 * serves. Every figure here is read from those tables; none is illustrative,
 * interpolated or hand-written, and a year the source does not publish is
 * `null` rather than a plausible number.
 *
 * This is the offline fallback for `getDatasets()`. It can only be *stale*
 * (a CSV changed and nobody regenerated), never invented - and
 * `test_generated_frontend_data_is_current` fails the build if it is stale.
 *
 * Regenerate rather than edit:
 *     cd backend && python manage.py build_frontend_data
 */

import type { Dataset } from "../datasets";

export const generatedDatasets: Dataset[] = '''

RESULTS_HEADER = '''/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * The reproduction half of the results, written by
 * `python manage.py build_frontend_data` from the committed aggregate CSVs
 * under reproductions/, through the same functions `GET /results` serves.
 *
 * These figures are static - they come from evaluations that have already run,
 * not from this deployment - so a build-time snapshot is the honest form for
 * them, and the results page needs no backend to show them. The *measured*
 * half is the opposite and is fetched per request.
 *
 * Regenerate rather than edit:
 *     cd backend && python manage.py build_frontend_data
 */

import type {
  FaithfulnessResults,
  MaskedNumberResults,
  PerOperationResults,
} from "../metrics";

'''

FOOTER = ";\n"

# Wide enough that a country's five-year series stays on one line, narrow
# enough that the dataset metadata above it still reads as a record.
INLINE_LIMIT = 96


def _ts(value) -> str:
    """JSON is a subset of TS object-literal syntax, so this is mostly json.dumps.

    The one thing worth writing by hand is the line breaking: `indent=2`
    everywhere turns 212 countries into 20,000 lines of one number each, and
    `separators` everywhere turns them into one unreadable line. So a node is
    emitted inline when it fits, and expanded when it does not.
    """
    compact = json.dumps(value, ensure_ascii=False, separators=(", ", ": "))
    if len(compact) <= INLINE_LIMIT or not isinstance(value, (dict, list)):
        return compact
    return None  # signals "expand", handled by _emit


def _emit(value, indent: int = 0) -> str:
    pad = "  " * indent
    inner = "  " * (indent + 1)

    inline = _ts(value)
    if inline is not None:
        return inline

    if isinstance(value, dict):
        parts = [f"{inner}{json.dumps(k)}: {_emit(v, indent + 1)}" for k, v in value.items()]
        return "{\n" + ",\n".join(parts) + f",\n{pad}}}"
    parts = [f"{inner}{_emit(v, indent + 1)}" for v in value]
    return "[\n" + ",\n".join(parts) + f",\n{pad}]"


def _drop_none(payload: dict) -> dict:
    """Drop only *top-level* absent fields, never nulls inside a series.

    The optional keys on the TS `Dataset` (`referenceLine?`, `countryStats?`)
    must be absent rather than null. The nulls inside `CountryStat.series` mean
    the opposite - the source published nothing for that anchor year - and the
    map hatches them as missing. A blanket `exclude_none` would strip those too
    and silently shorten the arrays out of alignment with `countryYears`, which
    is the kind of error that shows up as a country wearing its neighbour's
    figure rather than as a crash.
    """
    return {k: v for k, v in payload.items() if v is not None}


def render_datasets() -> str:
    payloads = [
        _drop_none(ds.get_dataset(sid).model_dump(by_alias=True))
        for sid, spec in ds.SPECS.items()
        if ds.is_available(spec)
    ]
    if not payloads:
        raise CommandError(
            "No dataset CSV is present, so there is nothing to generate. "
            "Overwriting the fallback with an empty list would take the "
            "datasets page down with it."
        )
    return HEADER + _emit(payloads) + FOOTER


def render_results() -> str:
    """The reproduction blocks only. `measured` is per-deployment and is fetched."""
    blocks = [
        ("generatedFaithfulness", "FaithfulnessResults", results.faithfulness()),
        ("generatedPerOperation", "PerOperationResults", results.per_operation()),
        ("generatedMaskedNumber", "MaskedNumberResults", results.masked_number()),
    ]
    missing = [name for name, _, value in blocks if value is None]
    if missing:
        raise CommandError(
            f"No aggregate file for: {', '.join(missing)}. Generating anyway would "
            "replace a real figure with an absent one. Run the reproduction's "
            "export_aggregates.py first."
        )
    body = "\n\n".join(
        f"export const {name}: {kind} =\n  " + _emit(value.model_dump(by_alias=True), 1) + ";"
        for name, kind, value in blocks
    )
    return RESULTS_HEADER + body + "\n"


class Command(BaseCommand):
    help = "Regenerate lib/data/generated/datasets.generated.ts from the CSVs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--check",
            action="store_true",
            help="Exit non-zero if the committed file differs, without writing.",
        )

    def handle(self, *args, **opts):
        targets = {
            DATASETS_TARGET: render_datasets(),
            RESULTS_TARGET: render_results(),
        }

        if opts["check"]:
            stale = [
                path
                for path, content in targets.items()
                if (path.read_text() if path.exists() else "") != content
            ]
            if stale:
                names = ", ".join(str(p.relative_to(REPO_ROOT)) for p in stale)
                raise CommandError(
                    f"Out of date: {names}. "
                    "Run: cd backend && python manage.py build_frontend_data"
                )
            self.stdout.write(self.style.SUCCESS("Generated frontend data is current."))
            return

        GENERATED.mkdir(parents=True, exist_ok=True)
        for path, content in targets.items():
            path.write_text(content)

        for sid, spec in ds.SPECS.items():
            if not ds.is_available(spec):
                self.stdout.write(self.style.WARNING(f"  {sid}: no CSV, skipped"))
                continue
            payload = ds.get_dataset(sid)
            self.stdout.write(
                f"  {sid}: {payload.rows:,} rows, {len(payload.series)} series points, "
                f"{len(payload.country_stats or [])} countries"
            )
        for path, content in targets.items():
            self.stdout.write(
                self.style.SUCCESS(
                    f"Wrote {path.relative_to(REPO_ROOT)} ({len(content):,} bytes)"
                )
            )
