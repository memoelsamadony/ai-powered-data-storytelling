"""Tests for the country figures the map is drawn from.

These assert the properties the map's honesty rests on, not the figures
themselves: that aggregates never reach it, that a gap stays a gap, and that
the payload matches the contract declared in lib/data/datasets.ts. They read
the committed CSV, so they exercise the real table rather than a fixture that
could drift away from it.

Run with `python manage.py test storytelling`.
"""

from __future__ import annotations

import re

from django.test import SimpleTestCase

from . import datasets as ds


class CountryPayloadTests(SimpleTestCase):
    """`country_payload` against the real merged measles table."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        payload = ds.country_payload("measles")
        assert payload is not None, "measles CSV is committed; payload should exist"
        cls.years, cls.metrics, cls.stats, cls.note = payload

    def test_serves_every_reporting_country(self):
        # The point of reading the CSV at all: an order of magnitude more
        # countries than the 32-country sample this replaced.
        self.assertGreater(len(self.stats), 150)

    def test_no_aggregate_reaches_the_map(self):
        """World, the OWID_/WHO_ regions and the blank-coded UNICEF ones.

        Colouring a country shape with a regional total would misstate every
        country in that region at once.
        """
        names = {c.name for c in self.stats}
        for aggregate in ("World", "Africa", "Europe", "Asia", "High-income countries"):
            self.assertNotIn(aggregate, names)

    def test_every_id_is_an_iso3_code(self):
        # The join key to WorldShape.id in lib/data/world-geo.ts. Anything else
        # silently fails to match and the country goes missing from the map.
        for country in self.stats:
            self.assertRegex(country.iso3, r"^[A-Z]{3}$")

    def test_ids_are_unique(self):
        codes = [c.iso3 for c in self.stats]
        self.assertEqual(len(codes), len(set(codes)))

    def test_every_series_lines_up_with_the_years(self):
        # The frontend indexes series by position in country_years; a short
        # array would read as a different year's value.
        for country in self.stats:
            for key, values in country.series.items():
                self.assertEqual(len(values), len(self.years), f"{country.iso3}.{key}")

    def test_a_missing_year_stays_missing(self):
        """Gaps are None, never zero and never carried forward.

        Zero would be drawn as the palest bin, which reads as "measured, and
        low" for a country that reported nothing at all.
        """
        gaps = [c for c in self.stats if any(v is None for v in c.series["cases_per_million"])]
        self.assertTrue(gaps, "the real table has gaps; the payload should preserve them")
        for country in gaps:
            for value in country.series["cases_per_million"]:
                self.assertTrue(value is None or isinstance(value, float))

    def test_a_country_blank_at_every_year_is_dropped(self):
        for country in self.stats:
            self.assertTrue(
                any(v is not None for values in country.series.values() for v in values),
                f"{country.iso3} carries no value at any anchor year",
            )

    def test_incidence_keeps_one_decimal(self):
        """Rounding to whole numbers would print 0 for a country at 0.3.

        That is an outbreak-free claim the figure does not make.
        """
        metric = next(m for m in self.metrics if m.key == "cases_per_million")
        self.assertEqual(metric.decimals, 1)
        values = [
            v for c in self.stats for v in c.series["cases_per_million"] if v is not None
        ]
        self.assertTrue(any(0 < v < 1 for v in values), "sub-1.0 rates exist and must survive")
        for value in values:
            self.assertEqual(value, round(value, 1))

    def test_raw_counts_are_never_mapped(self):
        # A choropleth of counts is a population map: India and Nigeria are
        # darkest every year regardless of what happened.
        counts = next(m for m in self.metrics if m.key == "cases")
        self.assertFalse(counts.mappable)

    def test_breaks_are_declared_and_ascending(self):
        # Declared, never computed from the visible year: recomputed bins would
        # recolour a country because the scale moved rather than its own figure.
        for metric in self.metrics:
            self.assertEqual(len(metric.breaks), 4)
            self.assertEqual(list(metric.breaks), sorted(metric.breaks))

    def test_years_are_ascending(self):
        self.assertEqual(self.years, sorted(self.years))

    def test_the_note_says_the_figures_are_real(self):
        # The datasets page shows this under the map, and it is the only thing
        # distinguishing these figures from the illustrative sample.
        self.assertIn("every reporting country", self.note)


class DatasetPayloadTests(SimpleTestCase):
    def test_dataset_carries_short_name(self):
        # The charts label rows with it; without it the legend renders blank.
        self.assertEqual(ds.get_dataset("measles").short_name, "Measles × MCV1")

    def test_dataset_carries_the_country_payload(self):
        dataset = ds.get_dataset("measles")
        self.assertIsNotNone(dataset.country_stats)
        self.assertIsNotNone(dataset.country_years)
        self.assertIsNotNone(dataset.country_metrics)

    def test_metric_contract_matches_the_frontend(self):
        """Keys, breaks and polarity mirror lib/data/datasets.ts.

        The frontend bins on these values, so a drift here recolours the map
        rather than failing loudly.
        """
        by_key = {m.key: m for m in ds.get_dataset("measles").country_metrics}
        self.assertEqual(set(by_key), {"cases_per_million", "mcv1_coverage", "cases"})
        self.assertEqual(list(by_key["cases_per_million"].breaks), [1, 10, 50, 200])
        self.assertEqual(list(by_key["mcv1_coverage"].breaks), [70, 85, 92, 95])
        self.assertEqual(by_key["cases_per_million"].polarity, "higher-is-worse")
        self.assertEqual(by_key["mcv1_coverage"].polarity, "higher-is-better")

    def test_secondary_dataset_id_matches_the_frontend(self):
        # It was `who-gho` here and `who-health` there, which would have served
        # one dataset under two ids the moment its CSV lands.
        self.assertIn("who-health", ds.SPECS)

    def test_only_collected_datasets_are_served(self):
        served = [d.id for d in ds.list_datasets()]
        self.assertIn("measles", served)
        self.assertNotIn("who-health", served)

    def test_an_uncollected_dataset_has_no_country_payload(self):
        # Documented contract: None rather than an exception, so the frontend
        # renders no map instead of an empty one.
        self.assertIsNone(ds.country_payload("who-health"))
