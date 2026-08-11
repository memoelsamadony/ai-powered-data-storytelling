"""Tests for the country figures the map is drawn from.

These assert the properties the map's honesty rests on, not the figures
themselves: that aggregates never reach it, that a gap stays a gap, and that
the payload matches the contract declared in lib/data/datasets.ts. They read
the committed CSV, so they exercise the real table rather than a fixture that
could drift away from it.

Run with `python manage.py test storytelling`.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase

from . import datasets as ds
from . import results
from .management.commands import build_frontend_data


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
        # The datasets page prints this under the map. It is the only thing on
        # screen naming the table the colours came from.
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

    def test_both_datasets_are_served(self):
        # Both, and it matters: the project's argument needs a story that tempts
        # alarmism and one that tempts false reassurance. who-health used to be
        # a stub and is now read from the WHO extract.
        served = [d.id for d in ds.list_datasets()]
        self.assertIn("measles", served)
        self.assertIn("who-health", served)

    def test_a_dataset_whose_file_is_missing_has_no_country_payload(self):
        """Documented contract: None rather than an exception.

        That is what makes the frontend render no map instead of an empty one,
        and it is the state any newly registered dataset sits in until its file
        is collected.
        """
        from dataclasses import replace

        absent = replace(ds.SPECS["measles"], id="not-collected", csv="nothing_here.csv")
        with mock.patch.dict(ds.SPECS, {"not-collected": absent}):
            ds.country_payload.cache_clear()
            self.assertFalse(ds.is_available(absent))
            self.assertIsNone(ds.country_payload("not-collected"))
        ds.country_payload.cache_clear()


class WhoGhoTests(SimpleTestCase):
    """The WHO dataset, built by build_who_gho.py from two GHO indicators.

    The extract in datasets/ (MORT_100) is a different indicator and carries
    neither of these measures; these tests are what stops the two being
    confused again.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.frame = ds.load_frame("who-health")
        cls.dataset = ds.get_dataset("who-health")

    def test_it_carries_the_measures_the_interface_declares(self):
        self.assertIn("under5_mortality", self.frame.columns)
        self.assertIn("life_expectancy", self.frame.columns)

    def test_the_world_row_is_who_s_own_global_figure(self):
        """Not an average of the country rows.

        A mortality *rate* cannot be averaged across countries without a
        live-births denominator, which this API does not carry, so the global
        series has to be the one WHO publishes.
        """
        world = self.frame[(self.frame["code"] == "WORLD") & (self.frame["year"] == 2021)]
        self.assertEqual(len(world), 1)
        self.assertAlmostEqual(float(world["under5_mortality"].iloc[0]), 39.6, delta=0.5)
        self.assertAlmostEqual(float(world["life_expectancy"].iloc[0]), 71.4, delta=0.5)

    def test_the_figures_are_in_their_units(self):
        """Deaths per 1,000 live births, and years. Not percentages.

        The upper bound is the definitional one, 1,000, not a plausible-looking
        one: the series reaches 780.9 for South Sudan in 1988 and 551.3 for
        Cambodia in 1976, which are real UN IGME estimates of real catastrophes.
        A tighter bound here would be this suite asserting an assumption.
        """
        mortality = self.frame["under5_mortality"].dropna()
        life = self.frame["life_expectancy"].dropna()
        self.assertTrue(((mortality > 0) & (mortality <= 1000)).all())
        self.assertTrue(((life >= 20) & (life <= 95)).all())

    def test_one_row_per_country_year(self):
        # The API returns a row per sex; keeping all three would put three
        # different numbers under the same country-year.
        pairs = self.frame[["code", "year"]]
        self.assertEqual(len(pairs), len(pairs.drop_duplicates()))

    def test_the_map_covers_the_reporting_world(self):
        self.assertGreater(len(self.dataset.country_stats), 150)

    def test_metric_contract_matches_the_frontend(self):
        by_key = {m.key: m for m in self.dataset.country_metrics}
        self.assertEqual(set(by_key), {"under5_mortality", "life_expectancy"})
        self.assertEqual(list(by_key["under5_mortality"].breaks), [5, 15, 40, 80])
        self.assertEqual(list(by_key["life_expectancy"].breaks), [60, 67, 73, 79])
        self.assertEqual(by_key["under5_mortality"].polarity, "higher-is-worse")
        self.assertEqual(by_key["life_expectancy"].polarity, "higher-is-better")

    def test_the_preview_year_has_both_measures(self):
        """Mortality runs to 2024, life expectancy stops at 2021.

        Taking the newest year in the table would show every spotlight country
        with a blank second column.
        """
        self.assertTrue(self.dataset.preview_rows)
        for row in self.dataset.preview_rows:
            self.assertNotEqual(row.coverage, "n/a", row.country)

    def test_the_prompt_table_states_each_measure_in_its_own_unit(self):
        # The generator reads this. "66.8%" for a life expectancy in years is a
        # unit error handed straight into the story.
        table = ds.build_prompt_table("who-health")
        self.assertIn("years", table)
        self.assertNotRegex(table, r"7[0-9]\.[0-9]%")


EDIT_IDS = {"intensity", "framing", "overreach", "grounding"}


class EditCategoryTests(SimpleTestCase):
    """Spans stored before the categorised schema still have to land in a bar."""

    def test_the_moderator_s_own_reason_picks_the_family(self):
        from .services import categorise_span

        cases = {
            "exaggerated verb, dialled up beyond the data": "intensity",
            "implies a causal link the table cannot support": "overreach",
            "fear-based framing": "framing",
            "vague figure replaced with the real one": "grounding",
        }
        for reason, expected in cases.items():
            self.assertEqual(categorise_span({"reason": reason}), expected, reason)

    def test_an_unrecognised_reason_still_gets_a_valid_family(self):
        # Never a fifth bucket: the chart counts exactly four ids, so an
        # invented one would vanish from it rather than show as uncategorised.
        from .services import categorise_span

        self.assertIn(categorise_span({"reason": "???"}), EDIT_IDS)


class JudgeParsingTests(SimpleTestCase):
    """The judge's reply, without spending a penny to get one."""

    def test_plain_json(self):
        from .judge import _extract_json

        self.assertEqual(_extract_json('{"rawAlarmism": 4}')["rawAlarmism"], 4)

    def test_fenced_json(self):
        from .judge import _extract_json

        self.assertEqual(_extract_json('```json\n{"a": 1}\n```')["a"], 1)

    def test_json_wrapped_in_prose(self):
        from .judge import _extract_json

        self.assertEqual(_extract_json('Sure!\n{"a": 2}\nHope that helps.')["a"], 2)

    def test_a_reply_with_no_json_is_an_error_not_a_score(self):
        from .judge import JudgeUnavailable, _extract_json

        with self.assertRaises(JudgeUnavailable):
            _extract_json("I cannot rate this.")

    def test_the_cli_is_invoked_without_a_shell(self):
        """Story text reaches the judge on stdin, never as an argument.

        A shell, or the prompt as an argv entry, is how a story containing
        something flag-shaped would start choosing the command's options.
        """
        import subprocess
        from unittest import mock

        from . import judge as judge_mod

        completed = subprocess.CompletedProcess(
            args=[], returncode=0,
            stdout=json.dumps({"is_error": False, "result": '{"ok":1}', "duration_ms": 10}),
            stderr="",
        )
        with mock.patch("shutil.which", return_value="/usr/bin/claude"), mock.patch(
            "subprocess.run", return_value=completed
        ) as run:
            judge_mod.run_cli("the story text")
        kwargs = run.call_args.kwargs
        self.assertEqual(kwargs["input"], "the story text")
        self.assertNotIn("shell", kwargs)
        self.assertIsInstance(run.call_args.args[0], list)
        self.assertEqual(kwargs["timeout"], judge_mod.TIMEOUT_S)

    def test_a_missing_cli_is_reported_not_crashed(self):
        from unittest import mock

        from .judge import JudgeUnavailable, run_cli

        with mock.patch("shutil.which", return_value=None):
            with self.assertRaises(JudgeUnavailable):
                run_cli("x")


class ResultsTests(SimpleTestCase):
    def test_error_rate_is_pooled_by_n_not_averaged_over_domains(self):
        """Matches the figure the reproduction report states, 18.0%."""
        from .results import QUINTD_DIR, _pooled_error_rate

        self.assertEqual(_pooled_error_rate(QUINTD_DIR / "metrics.csv"), 18.0)
        self.assertEqual(_pooled_error_rate(QUINTD_DIR / "metrics_qwen3.csv"), 52.0)

    def test_a_missing_artifact_is_absent_not_zero(self):
        from pathlib import Path

        from .results import _pooled_error_rate

        self.assertIsNone(_pooled_error_rate(Path("/nonexistent/metrics.csv")))

    def test_faithfulness_names_the_file_it_came_from(self):
        from .results import faithfulness

        block = faithfulness()
        self.assertIn("reproductions/paper5-quintd", block.source)


class UploadTests(TestCase):
    """What may be stored, and under what name."""

    @staticmethod
    def _file(name: str, body: str):
        from django.core.files.uploadedfile import SimpleUploadedFile

        return SimpleUploadedFile(name, body.encode(), content_type="text/csv")

    def test_a_valid_csv_is_stored_and_described(self):
        from .uploads import store

        record = store(self._file("m.csv", "country,code,year,cases\nKenya,KEN,2020,5\n"))
        self.assertEqual(record.rows, 1)
        self.assertIn("cases", record.numeric_columns)
        self.assertEqual(record.year_range, "2020-2020")
        self.assertEqual(record.countries, 1)

    def test_the_stored_filename_is_the_id_not_the_client_s(self):
        """A name like ../../settings.py must not choose where the file lands."""
        from pathlib import Path

        from .uploads import store

        record = store(
            self._file("../../../etc/passwd.csv", "country,year,n\nX,2020,1\n")
        )
        self.assertEqual(Path(record.stored_path).name, f"{record.id}.csv")
        self.assertEqual(record.original_name, "passwd.csv")

    def test_a_non_csv_is_rejected(self):
        from .uploads import UploadRejected, store

        with self.assertRaises(UploadRejected):
            store(self._file("notes.txt", "hello"))

    def test_a_table_with_no_measure_is_rejected(self):
        # A data story needs something to say a number about.
        from .uploads import UploadRejected, store

        with self.assertRaises(UploadRejected):
            store(self._file("words.csv", "name,note\nfoo,bar\n"))

    def test_a_rejected_file_is_not_left_on_disk(self):
        from pathlib import Path

        from .uploads import UPLOAD_DIR, UploadRejected, store

        before = set(UPLOAD_DIR.glob("*.csv")) if UPLOAD_DIR.exists() else set()
        with self.assertRaises(UploadRejected):
            store(self._file("bad.csv", "name,note\nfoo,bar\n"))
        after = set(UPLOAD_DIR.glob("*.csv")) if UPLOAD_DIR.exists() else set()
        self.assertEqual(before, after)


class WhoDimensionTests(SimpleTestCase):
    """The GHO cube trap, pinned.

    ``MDG_0000000007`` publishes six rows per country-year wherever survey data
    exists: the national rate plus five wealth quintiles. The build script kept
    whichever the API returned last, so Nigeria's 2010 figure was 100.5 - its
    *fourth quintile* - against a national rate of 126.3, and the series that
    reached the map ran 157.9 -> 76.6 -> 100.5 -> 154.5. Only countries with
    quintile data were affected, which is the set of countries the map exists
    to show.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.df = ds.load_frame("who-health")

    def test_one_row_per_country_year(self):
        pairs = self.df.groupby(["code", "year"]).size()
        self.assertEqual(int(pairs.max()), 1, "a dimension is collapsing into duplicates")

    def test_the_national_rate_not_a_quintile(self):
        # The national figure WHO publishes for Nigeria in 2010. A quintile
        # would land on 64.9, 100.5, 137.1, 163.9 or 165.3 instead.
        row = self.df[(self.df["code"] == "NGA") & (self.df["year"] == 2010)]
        self.assertAlmostEqual(float(row.iloc[0]["under5_mortality"]), 126.34, places=1)

    def test_child_mortality_falls_over_the_plotted_period(self):
        # Not a smoothness assertion: conflict and COVID genuinely reverse this
        # in individual countries. But a series walking the income distribution
        # rather than time shows up as a majority of countries with no trend at
        # all, which is what this catches.
        rising = 0
        countries = 0
        frame = self.df[self.df["year"].between(2000, 2021) & (self.df["code"] != "WORLD")]
        for _, group in frame.groupby("code"):
            series = group.sort_values("year")["under5_mortality"].dropna()
            if len(series) < 10:
                continue
            countries += 1
            if series.iloc[-1] >= series.iloc[0]:
                rising += 1
        self.assertGreater(countries, 150)
        self.assertLess(rising / countries, 0.1, "under-five mortality should be falling almost everywhere")


class ReproductionResultsTests(SimpleTestCase):
    def test_per_operation_carries_the_denominator(self):
        # A percentage without its n invites 80% off 4-of-5 to be read beside
        # 93.1% off 81-of-87 as an equal.
        block = results.per_operation()
        self.assertIsNotNone(block)
        for row in block.rows:
            self.assertGreater(row.total, 0)
            self.assertLessEqual(row.correct, row.total)

    def test_per_operation_reproduces_the_complexity_gradient(self):
        block = results.per_operation()
        by_key = {(r.model, r.operation): r.pct for r in block.rows}
        for model in block.models:
            self.assertEqual(by_key[(model, "causal")], 0.0)
            self.assertGreater(by_key[(model, "lookup")], 80.0)

    def test_per_operation_labels_the_models_it_measured(self):
        # A chart of qwen3.5:4b's numbers legended "gemma 4B" shipped once.
        self.assertEqual(results.per_operation().models, ["qwen3.5:4b", "gemma4:12b"])

    def test_masked_number_separates_quoted_from_rerun(self):
        block = results.masked_number()
        ours = [p for p in block.series if p.source == "ours"]
        paper = [p for p in block.series if p.source == "paper"]
        self.assertTrue(ours and paper)
        # The paper's figures are quoted, so they carry no denominator of ours.
        self.assertTrue(all(p.total is None for p in paper))
        self.assertTrue(all(p.total == 115 for p in ours))

    def test_everything_stays_in_the_sub_30_regime(self):
        # The claim being reproduced is a regime, not a number.
        self.assertTrue(all(p.value < 30 for p in results.masked_number().series))


class ResultsAssemblyTests(TestCase):
    """`build()` reads the Run table, so it needs a database."""

    def test_a_missing_aggregate_is_named_not_faked(self):
        with mock.patch.object(results, "DATATALES_DIR", Path("/nonexistent")):
            out = results.build()
        self.assertIsNone(out.per_operation)
        self.assertIsNone(out.masked_number)
        self.assertEqual(len(out.unavailable), 2)


class GeneratedFrontendDataTests(SimpleTestCase):
    """The generated modules are the offline fallback, so staleness is the risk.

    They cannot hold an invented figure - they are written from `get_dataset`
    and the results functions - but they can hold last month's. This fails the
    build when they do.
    """

    def test_generated_dataset_module_is_current(self):
        call_command("build_frontend_data", "--check")

    def test_the_generated_module_carries_the_real_country_figures(self):
        text = (build_frontend_data.DATASETS_TARGET).read_text()
        # Nigeria's 1990 measles incidence, as the merged table has it. The
        # sample this replaced said 606.
        self.assertIn("1191.1", text)

    def test_a_year_the_source_does_not_publish_stays_null(self):
        text = (build_frontend_data.DATASETS_TARGET).read_text()
        # France has no 1990 measles figure. The sample invented 75 for it.
        self.assertRegex(text, r'"iso3": "FRA",\s*\n\s*"name": "France",\s*\n\s*"series": \{\s*\n\s*"cases_per_million": \[null,')

    def test_optional_fields_are_absent_not_null(self):
        # `referenceLine?:` on the TS side. `null` would typecheck as absent
        # only by accident and reads as "there is one, and it is nothing".
        text = (build_frontend_data.DATASETS_TARGET).read_text()
        self.assertNotIn(": null,\n", text.replace('"cases_per_million"', ""))

    def test_the_generator_refuses_to_emit_an_empty_dataset_list(self):
        with mock.patch.object(ds, "is_available", return_value=False):
            with self.assertRaises(CommandError):
                build_frontend_data.render_datasets()
