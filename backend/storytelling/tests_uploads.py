"""Tests for narrating an uploaded table.

These assert the properties the inference rests on rather than the numbers it
produces: that the pack contains nothing the file does not, that an aggregate
never enters a ranking of the entities it aggregates, that a missing ingredient
is a refusal rather than a default, and that a run on an uploaded table stays
out of the measured research record.

The last one is the load-bearing test of the lot. Everything else here fails
loudly; a leak into `results.measured()` would only ever show up as a number in
the report quietly drifting.

Run with `python manage.py test storytelling`.
"""

from __future__ import annotations

import tempfile
import uuid
from pathlib import Path
from unittest import mock

from django.test import TestCase

from . import datasets as ds
from . import ollama_client as oc
from . import results, services, upload_spec
from .models import Run, RunStatus, UploadedDataset

# An OWID export in miniature: names AND codes for the same dimension, an
# aggregate sharing the entity column with the countries, and a second measure
# the aggregate does not report. Every trap the real tuberculosis table sprang.
OWID_SHAPED = """Entity,Code,Year,Estimated incidence,Case detection rate
Afghanistan,AFG,2000,148.0,24.0
Afghanistan,AFG,2001,175.0,29.0
Kiribati,KIR,2000,500.0,40.0
Kiribati,KIR,2001,945.0,47.0
Germany,DEU,2000,8.0,90.0
Germany,DEU,2001,7.0,91.0
World,OWID_WRL,2000,187.4,
World,OWID_WRL,2001,186.5,
"""

NO_TIME = """Country,Population
Germany,84000000
France,68000000
"""

NO_AGGREGATE = """Country,Year,Cases,Coverage
Germany,2000,100,90.0
Germany,2001,120,91.0
France,2000,200,80.0
France,2001,240,81.0
"""


class UploadFixture(TestCase):
    """Stores a CSV the way the upload endpoint would, minus the HTTP."""

    def store(self, text: str, name: str = "table.csv") -> UploadedDataset:
        directory = Path(tempfile.mkdtemp())
        record_id = uuid.uuid4()
        path = directory / f"{record_id}.csv"
        path.write_text(text)
        record = UploadedDataset.objects.create(
            id=record_id, original_name=name, stored_path=str(path),
            rows=text.count("\n") - 1, columns=[], numeric_columns=[],
        )
        # The resolver caches per id, and every test builds a fresh id, but the
        # cache is process-wide and these run in one process.
        ds._upload_source.cache_clear()
        ds.load_frame.cache_clear()
        return record


class InferenceTests(UploadFixture):
    def test_entity_is_the_names_not_the_codes(self):
        """`Entity` and `Code` are one dimension; the pack must name countries.

        Picking `Code` is not cosmetic - the story then says "AFG" and every
        country the reader recognises disappears from it.
        """
        spec = ds.resolve_spec(str(self.store(OWID_SHAPED).id))
        self.assertIn("Kiribati", spec.spotlight)
        self.assertNotIn("KIR", spec.spotlight)

    def test_aggregate_row_is_found_not_ranked(self):
        record = self.store(OWID_SHAPED)
        spec = ds.resolve_spec(str(record.id))
        mapping = ds.upload_mapping(str(record.id))
        self.assertEqual(spec.aggregate_row, "World")
        self.assertEqual(mapping.aggregate_basis, "found")
        # An aggregate outranks every country it contains, so a spotlight that
        # keeps it is not a ranking of places.
        self.assertNotIn("World", spec.spotlight)

    def test_spotlight_is_ranked_by_the_measure(self):
        spec = ds.resolve_spec(str(self.store(OWID_SHAPED).id))
        self.assertEqual(spec.spotlight[0], "Kiribati")  # 945 at 2001

    def test_measure_absent_from_the_aggregate_is_not_offered(self):
        """Case detection is per-country only, as in the real WHO export.

        Keeping it would print "n/a" on every year line of the pack, and the
        generator narrates what it is handed.
        """
        record = self.store(OWID_SHAPED)
        spec = ds.resolve_spec(str(record.id))
        self.assertIsNone(spec.secondary_col)
        notes = " ".join(ds.upload_mapping(str(record.id)).notes)
        self.assertIn("Case detection rate", notes)
        self.assertIn("World", notes)

    def test_aggregate_is_computed_when_the_file_has_none(self):
        """Counts sum, rates average. Summing coverage gives 171%."""
        record = self.store(NO_AGGREGATE)
        spec = ds.resolve_spec(str(record.id))
        mapping = ds.upload_mapping(str(record.id))
        self.assertEqual(mapping.aggregate_basis, "computed")

        frame = ds.load_frame(str(record.id))
        row = frame[(frame["country"] == spec.aggregate_row) & (frame["year"] == 2001)]
        self.assertEqual(float(row.iloc[0]["Cases"]), 360.0)          # 120 + 240
        self.assertAlmostEqual(float(row.iloc[0]["Coverage"]), 86.0)  # (91 + 81) / 2

    def test_no_time_column_is_a_refusal_with_a_reason(self):
        with self.assertRaises(upload_spec.NotGeneratable) as caught:
            ds.resolve_spec(str(self.store(NO_TIME).id))
        self.assertIn("time column", str(caught.exception))

    def test_failure_mode_is_never_guessed(self):
        record = self.store(OWID_SHAPED)
        self.assertEqual(ds.get_dataset(str(record.id)).failure_mode, "unknown")

    def test_no_unit_is_invented(self):
        """"Estimated incidence" states no unit, so the pack must state none."""
        spec = ds.resolve_spec(str(self.store(OWID_SHAPED).id))
        self.assertEqual(spec.primary_unit, "")


class PackGroundingTests(UploadFixture):
    def test_every_number_in_the_pack_is_in_the_file(self):
        """The invariant the whole project rests on, for an inferred spec.

        `build_prompt_table` promises the agents cannot be handed a figure the
        dataset does not contain. Inference must not weaken that promise.
        """
        import re

        record = self.store(OWID_SHAPED)
        pack = ds.pack_text(str(record.id))
        frame = ds.load_frame(str(record.id))
        # Cleaned keys, not the original headers: `profile_frame` renames every
        # column to an identifier-safe key and the frame carries those.
        allowed = {
            round(float(v), 1)
            for column in ("Estimated_incidence", "Case_detection_rate")
            for v in frame[column].dropna().tolist()
        }
        allowed |= {float(y) for y in frame["year"].unique()}

        for token in re.findall(r"\d[\d,]*\.?\d*", pack):
            value = float(token.replace(",", ""))
            self.assertIn(
                round(value, 1), allowed, f"{value} appears in the pack but not the file",
            )

    def test_pack_says_when_the_unit_is_unknown(self):
        """The alternative is a model inventing one, which is measurable.

        Without this line qwen3.5:4b narrated the unit-less tuberculosis column
        as "187 cases every minute". It does not remove the invention, only its
        worst form - see the note in `build_prompt_table`.
        """
        pack = ds.pack_text(str(self.store(OWID_SHAPED).id))
        self.assertIn("states no unit", pack)

    def test_pack_never_offers_an_absent_value(self):
        pack = ds.pack_text(str(self.store(OWID_SHAPED).id))
        self.assertNotIn("n/a", pack)


class ResearchRecordTests(UploadFixture):
    """A demo upload must not be able to move a number the report cites."""

    def _finished(self, **kwargs) -> Run:
        return Run.objects.create(
            status=RunStatus.DONE, tier="demo",
            raw_title="r", raw_paragraphs=["r"], moderated_title="m",
            moderated_paragraphs=["m"], raw_alarmism=5.0, moderated_alarmism=2.0,
            **kwargs,
        )

    def test_upload_runs_are_excluded_from_measured(self):
        self._finished(dataset_id="measles")
        curated = results.measured()

        record = self.store(OWID_SHAPED)
        # An upload run scored at the opposite end: if it counted, the mean
        # would move, and nothing in the payload would say why.
        Run.objects.create(
            dataset_id=str(record.id), source_upload=record, status=RunStatus.DONE,
            tier="demo", raw_title="r", raw_paragraphs=["r"], moderated_title="m",
            moderated_paragraphs=["m"], raw_alarmism=1.0, moderated_alarmism=1.0,
        )
        after = results.measured()

        self.assertEqual(after.runs_total, curated.runs_total)
        self.assertEqual(after.alarmism_before, curated.alarmism_before)
        self.assertEqual(after.alarmism_after, curated.alarmism_after)

    def test_upload_run_has_no_human_baseline(self):
        record = self.store(OWID_SHAPED)
        run = self._finished(dataset_id=str(record.id), source_upload=record)
        self.assertIsNone(services.to_story_set(run).human)

    def test_registry_run_still_has_one(self):
        run = self._finished(dataset_id="measles", human_text="A baseline.")
        self.assertIsNotNone(services.to_story_set(run).human)


class UploadEndpointTests(UploadFixture):
    """The HTTP surface, with no model involved.

    Ollama is mocked to "everything installed" so these assert the routing and
    the refusals rather than whether this machine can run a tier.
    """

    def setUp(self):
        patcher = mock.patch.object(
            oc, "tier_plan", return_value={"runnable": True, "installed": []}
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_upload_reports_wired_and_its_mapping(self):
        directory = Path(tempfile.mkdtemp())
        path = directory / "owid.csv"
        path.write_text(OWID_SHAPED)
        with path.open("rb") as fh:
            response = self.client.post("/api/uploads", {"file": fh})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["wired"])
        self.assertTrue(body["chartable"])
        self.assertIn("Estimated incidence", body["mapping"])
        self.assertIn("not declared", body["mapping"])

    def test_upload_without_a_time_column_is_chartable_but_not_wired(self):
        directory = Path(tempfile.mkdtemp())
        path = directory / "flat.csv"
        path.write_text(NO_TIME)
        with path.open("rb") as fh:
            body = self.client.post("/api/uploads", {"file": fh}).json()

        self.assertFalse(body["wired"])
        self.assertTrue(body["chartable"])
        self.assertEqual(body["mapping"], "")
        # The reason, not a generic failure: it is the only part a reader can act on.
        self.assertIn("time column", body["note"])

    def test_run_can_be_created_on_an_upload(self):
        record = self.store(OWID_SHAPED)
        response = self.client.post(
            "/api/runs",
            data={"uploadId": str(record.id), "tier": "demo"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        run = Run.objects.get(id=response.json()["runId"])
        self.assertEqual(run.source_upload_id, record.id)
        self.assertEqual(run.dataset_id, str(record.id))

    def test_run_needs_exactly_one_source(self):
        record = self.store(OWID_SHAPED)
        for payload in (
            {"tier": "demo"},
            {"datasetId": "measles", "uploadId": str(record.id), "tier": "demo"},
        ):
            response = self.client.post(
                "/api/runs", data=payload, content_type="application/json"
            )
            self.assertEqual(response.status_code, 400, payload)

    def test_run_on_an_ungeneratable_upload_is_refused_before_it_starts(self):
        """A half-written run in the database is worse than a refusal."""
        record = self.store(NO_TIME)
        response = self.client.post(
            "/api/runs",
            data={"uploadId": str(record.id), "tier": "demo"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("time column", response.json()["detail"])
        self.assertEqual(Run.objects.count(), 0)

    def test_upload_is_served_as_an_ordinary_dataset(self):
        """One endpoint, one shape - which is what lets the wizard not care."""
        record = self.store(OWID_SHAPED)
        body = self.client.get(f"/api/datasets/{record.id}").json()
        self.assertEqual(body["id"], str(record.id))
        self.assertEqual(body["failureMode"], "unknown")
        self.assertTrue(body["series"])
        # No second measure survived, and an empty label is what tells the chart
        # not to draw a flat zero line for it.
        self.assertEqual(body["secondaryLabel"], "")
