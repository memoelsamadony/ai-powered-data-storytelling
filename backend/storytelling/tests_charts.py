"""Tests for the chart contract, server side.

The important one is ``ChartSchemaParityTests``. ``lib/charts/spec.ts`` is
canonical and this package is a hand-written mirror of it, which is exactly the
kind of pairing that rots quietly. ``docs/chart-schema.json`` is generated from
the TypeScript by ``scripts/build-chart-schema.mjs``, so pinning the mirror
against that file turns "remember to change both" into a failing test.

The rest cover the two things that are genuinely new here rather than ported:
inferring column types from an arbitrary CSV, and deciding which forms a frame
can honestly carry.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from django.test import TestCase

from . import datasets as ds
from .charts import http as charts_http
from .charts.applicability import (
    INCOMMENSURABLE_RATIO,
    MAX_BARS,
    MAX_CANDIDATES,
    FrameSource,
    apply_slice,
    candidates_across,
    candidates_for,
    spec_of,
)
from .charts.frames import country_frame_of, world_frame_of
from .charts.profile import MAX_FRAME_ROWS, frame_from_dataframe, profile_of_frame
from .charts.spec import CHART_FORMS, FORM_RULES, ChartFrame, ChartSpec
from .charts.validate import validate_spec

SCHEMA_PATH = Path(__file__).resolve().parents[2] / "docs" / "chart-schema.json"


def _schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text())


def _frame(columns, rows) -> ChartFrame:
    return ChartFrame(columns=columns, rows=rows)


TREND_FRAME = _frame(
    [
        {"key": "year", "label": "Year", "type": "temporal"},
        {"key": "value", "label": "Value", "type": "quantitative"},
        {"key": "measure", "label": "Measure", "type": "nominal"},
    ],
    [
        {"year": 1980, "value": 10.0, "measure": "A"},
        {"year": 1990, "value": 20.0, "measure": "A"},
        {"year": 1980, "value": 5.0, "measure": "B"},
        {"year": 1990, "value": 7.0, "measure": "B"},
    ],
)


def _spec(**kwargs) -> ChartSpec:
    base = dict(
        form="line",
        encoding={"x": "year", "y": "value"},
        title="T",
        rationale="R",
    )
    base.update(kwargs)
    return ChartSpec(**base)


class ChartSchemaParityTests(TestCase):
    """The pydantic mirror against the schema generated from the TypeScript."""

    def test_the_schema_file_is_present(self):
        self.assertTrue(
            SCHEMA_PATH.exists(),
            f"{SCHEMA_PATH} is missing. Regenerate it with "
            "`node --experimental-strip-types scripts/build-chart-schema.mjs`.",
        )

    def test_every_form_exists_on_both_sides(self):
        self.assertEqual(set(_schema()["forms"]), set(CHART_FORMS))
        self.assertEqual(set(FORM_RULES), set(CHART_FORMS))

    def test_the_geometry_count_matches_the_contract(self):
        self.assertEqual(_schema()["summary"]["geometries"], len(CHART_FORMS))

    def test_required_and_optional_channels_match(self):
        for form, entry in _schema()["forms"].items():
            with self.subTest(form=form):
                rule = FORM_RULES[form]
                required = {c["channel"] for c in entry["channels"] if c["required"]}
                optional = {c["channel"] for c in entry["channels"] if not c["required"]}
                self.assertEqual(required, set(rule.required))
                self.assertEqual(optional, set(rule.optional))

    def test_channel_types_match(self):
        for form, entry in _schema()["forms"].items():
            rule = FORM_RULES[form]
            for channel in entry["channels"]:
                accepts = channel["accepts"]
                if accepts == "any":
                    continue
                with self.subTest(form=form, channel=channel["channel"]):
                    if channel["channel"] == "color":
                        self.assertEqual(set(accepts), set(rule.color_accepts))
                    elif channel["channel"] == "y":
                        self.assertEqual(set(accepts), set(rule.y_accepts))

    def test_modifiers_match(self):
        for form, entry in _schema()["forms"].items():
            with self.subTest(form=form):
                names = {m["name"] for m in entry["modifiers"]}
                self.assertEqual(names, set(FORM_RULES[form].allows))

    def test_series_ceilings_match(self):
        for form, entry in _schema()["forms"].items():
            with self.subTest(form=form):
                self.assertEqual(entry.get("maxSeries"), FORM_RULES[form].max_series)

    def test_form_descriptions_match(self):
        """These are reused verbatim as tool-enum docs, so drift is user-visible."""
        for form, entry in _schema()["forms"].items():
            with self.subTest(form=form):
                self.assertEqual(entry["description"], FORM_RULES[form].describe)


class ModifierDefaultTests(TestCase):
    """Why this mirror departs from CHART_CONTRACT.md section 7.

    Section 7 gives the modifiers eager defaults so an Ollama grammar always
    emits them. Doing that makes the frontend refuse to draw a line chart, which
    is a worse failure than the missing key it was trying to prevent.
    """

    def test_a_modifier_the_form_ignores_is_an_error_when_present(self):
        result = validate_spec(_spec(stack="none"), TREND_FRAME)
        self.assertFalse(result.ok)
        self.assertIn('line does not honour "stack".', result.errors)

    def test_section_7_defaults_would_break_every_line_chart(self):
        result = validate_spec(_spec(stack="none", orientation="vertical"), TREND_FRAME)
        self.assertFalse(result.ok)
        self.assertEqual(len(result.errors), 2)

    def test_omitting_them_is_valid(self):
        self.assertTrue(validate_spec(_spec(), TREND_FRAME).ok)

    def test_none_is_absent_rather_than_a_value(self):
        self.assertTrue(validate_spec(_spec(stack=None), TREND_FRAME).ok)

    def test_the_wire_drops_absent_modifiers(self):
        dumped = _spec().model_dump(by_alias=True, exclude_none=True)
        for absent in ("stack", "orientation", "baseline", "emphasis", "breaks"):
            self.assertNotIn(absent, dumped)
        self.assertEqual(dumped["title"], "T")


class ChartValidatorTests(TestCase):
    """The rules of validate.ts, mirrored. Section numbers match that file."""

    def test_a_missing_required_channel_is_an_error(self):
        result = validate_spec(_spec(encoding={"x": "year"}), TREND_FRAME)
        self.assertIn("line needs encoding.y.", result.errors)

    def test_a_channel_the_form_does_not_use_is_an_error(self):
        result = validate_spec(
            _spec(encoding={"x": "year", "y": "value", "geo": "value"}), TREND_FRAME
        )
        self.assertIn("line does not use encoding.geo.", result.errors)

    def test_a_channel_naming_an_absent_column_is_an_error(self):
        result = validate_spec(
            _spec(encoding={"x": "year", "y": "nope"}), TREND_FRAME
        )
        self.assertTrue(any("not a column in the frame" in e for e in result.errors))

    def test_y_must_be_a_measure(self):
        result = validate_spec(
            _spec(encoding={"x": "year", "y": "measure"}), TREND_FRAME
        )
        self.assertTrue(any("binds y to" in e for e in result.errors))

    def test_heatmap_y_may_be_the_row_dimension(self):
        spec = _spec(
            form="heatmap",
            encoding={"x": "year", "y": "measure", "color": "value"},
        )
        self.assertTrue(validate_spec(spec, TREND_FRAME).ok)

    def test_per_capita_needs_a_denominator(self):
        result = validate_spec(_spec(transform="perCapita"), TREND_FRAME)
        self.assertIn('transform "perCapita" needs a denominator column.', result.errors)

    def test_dumbbell_needs_exactly_two_x_values(self):
        three = _frame(
            TREND_FRAME.columns,
            TREND_FRAME.rows + [{"year": 2000, "value": 9.0, "measure": "A"}],
        )
        spec = _spec(
            form="dumbbell",
            encoding={"x": "year", "y": "value", "color": "measure"},
        )
        self.assertTrue(validate_spec(spec, TREND_FRAME).ok)
        self.assertFalse(validate_spec(spec, three).ok)

    def test_emphasis_must_name_a_real_series(self):
        spec = _spec(
            encoding={"x": "year", "y": "value", "color": "measure"}, emphasis="Z"
        )
        self.assertTrue(any("is not a value in" in e for e in validate_spec(spec, TREND_FRAME).errors))

    def test_breaks_must_ascend(self):
        spec = _spec(form="choropleth", encoding={"geo": "g", "color": "value"},
                     breaks=[4.0, 3.0, 2.0, 1.0])
        self.assertIn("breaks must be four strictly ascending numbers.",
                      validate_spec(spec, TREND_FRAME).errors)

    def test_title_and_rationale_are_required(self):
        result = validate_spec(_spec(title="  ", rationale=""), TREND_FRAME)
        self.assertIn("A spec needs a title.", result.errors)
        self.assertTrue(any("rationale" in e for e in result.errors))

    def test_an_empty_frame_is_an_error(self):
        empty = _frame(TREND_FRAME.columns, [])
        self.assertIn("The frame has no rows.", validate_spec(_spec(), empty).errors)

    def test_dropped_denominator_is_a_warning_not_an_error(self):
        frame = _frame(
            [
                {"key": "country", "label": "Country", "type": "nominal"},
                {"key": "cases", "label": "Cases", "type": "quantitative"},
                {"key": "population", "label": "Population", "type": "quantitative"},
            ],
            [
                {"country": "A", "cases": 10.0, "population": 100.0},
                {"country": "B", "cases": 20.0, "population": 9000.0},
            ],
        )
        spec = _spec(form="bar", encoding={"x": "country", "y": "cases"})
        result = validate_spec(spec, frame)
        self.assertTrue(result.ok, result.errors)
        self.assertTrue(any("perCapita" in w for w in result.warnings))

    def test_a_year_read_as_a_float_keys_the_same_slice_as_an_int(self):
        """pandas hands back 1980.0; JavaScript renders that "1980"."""
        floaty = _frame(
            TREND_FRAME.columns,
            [
                {"year": 1980.0, "value": 10.0, "measure": "A"},
                {"year": 1990.0, "value": 20.0, "measure": "A"},
            ],
        )
        spec = _spec(form="dumbbell",
                     encoding={"x": "year", "y": "value", "color": "measure"})
        self.assertTrue(validate_spec(spec, floaty).ok)


class ColumnProfileTests(TestCase):
    """Inferring types from an arbitrary CSV - the step uploads.py was missing."""

    def test_iso3_codes_are_typed_geo(self):
        df = pd.DataFrame({"iso3": ["NGA", "FRA", "DEU"], "cases": [1, 2, 3]})
        _, profile = frame_from_dataframe(df)
        by_key = {c.key: c for c in profile.columns}
        self.assertEqual(by_key["iso3"].type, "geo")
        self.assertEqual(by_key["cases"].type, "quantitative")

    def test_a_country_name_column_is_nominal_not_geo(self):
        """The map joins on a code; typing a name `geo` would let a spec bind
        `geo` to something the map cannot look up."""
        df = pd.DataFrame({"country": ["Nigeria", "France"], "v": [1, 2]})
        _, profile = frame_from_dataframe(df)
        self.assertEqual(profile.columns[0].type, "nominal")

    def test_a_year_column_is_temporal_not_quantitative(self):
        df = pd.DataFrame({"year": [1990, 2000, 2010], "v": [1.0, 2.0, 3.0]})
        _, profile = frame_from_dataframe(df)
        self.assertEqual(profile.columns[0].type, "temporal")

    def test_a_four_digit_count_outside_the_year_window_stays_quantitative(self):
        df = pd.DataFrame({"n": [3200, 4100, 5000], "label": list("abc")})
        _, profile = frame_from_dataframe(df)
        self.assertEqual(profile.columns[0].type, "quantitative")

    def test_a_wide_year_table_is_melted_to_long(self):
        df = pd.DataFrame({
            "country": ["A", "B"],
            "1990": [1.0, 2.0], "2000": [3.0, 4.0], "2010": [5.0, 6.0],
        })
        frame, profile = frame_from_dataframe(df)
        keys = {c.key for c in frame.columns}
        self.assertEqual(keys, {"country", "year", "value"})
        self.assertEqual(len(frame.rows), 6)
        self.assertTrue(any("melted" in n for n in profile.notes))

    def test_duplicate_headers_do_not_overwrite_each_other(self):
        df = pd.DataFrame([[1, 2]], columns=["a b", "a-b"])
        frame, profile = frame_from_dataframe(df)
        self.assertEqual(len({c.key for c in frame.columns}), 2)
        self.assertTrue(any("cleaned to" in n for n in profile.notes))

    def test_a_long_table_is_thinned_and_says_so(self):
        years = list(range(1, 400))
        df = pd.DataFrame({
            "year": [y for y in years for _ in range(30)],
            "item": [f"i{i}" for _ in years for i in range(30)],
            "v": [float(i) for _ in years for i in range(30)],
        })
        frame, profile = frame_from_dataframe(df)
        self.assertLessEqual(len(frame.rows), MAX_FRAME_ROWS)
        self.assertTrue(any("cap" in n for n in profile.notes))

    def test_thinning_keeps_the_most_recent_slice(self):
        years = list(range(1, 400))
        df = pd.DataFrame({
            "year": [y for y in years for _ in range(30)],
            "item": [f"i{i}" for _ in years for i in range(30)],
            "v": [float(i) for _ in years for i in range(30)],
        })
        frame, _ = frame_from_dataframe(df)
        self.assertIn(399.0, {r["year"] for r in frame.rows})

    def test_an_inferred_type_reports_its_evidence(self):
        """A header the naming rules do not recognise, typed from its values."""
        df = pd.DataFrame({"code": ["NGA", "FRA", "DEU"], "v": [1, 2, 3]})
        _, profile = frame_from_dataframe(df)
        self.assertEqual(profile.columns[0].type, "geo")
        self.assertEqual(profile.columns[0].basis, "inferred")
        self.assertTrue(profile.columns[0].evidence)

    def test_a_declared_type_says_so(self):
        df = pd.DataFrame({"iso3": ["NGA", "FRA"], "v": [1, 2]})
        _, profile = frame_from_dataframe(df)
        self.assertEqual(profile.columns[0].basis, "declared")

    def test_missingness_does_not_change_a_type(self):
        """A third of mcv1_coverage is absent; it is still a measure."""
        df = pd.DataFrame({"v": [1.0, None, 3.0, None, 5.0, None]})
        _, profile = frame_from_dataframe(df)
        self.assertEqual(profile.columns[0].type, "quantitative")
        self.assertAlmostEqual(profile.columns[0].missing, 0.5)


class ApplicabilityTests(TestCase):
    def _source(self, frame: ChartFrame, name="t") -> FrameSource:
        return FrameSource(name=name, frame=frame, profile=profile_of_frame(frame))

    def test_no_geo_column_means_no_map(self):
        frame = _frame(
            [
                {"key": "country", "label": "Country", "type": "nominal"},
                {"key": "year", "label": "Year", "type": "temporal"},
                {"key": "v", "label": "V", "type": "quantitative"},
            ],
            [{"country": "A", "year": 1990, "v": 1.0},
             {"country": "B", "year": 1990, "v": 2.0},
             {"country": "A", "year": 2000, "v": 3.0},
             {"country": "B", "year": 2000, "v": 4.0}],
        )
        forms = {c.form for c in candidates_for(self._source(frame))}
        self.assertNotIn("choropleth", forms)
        self.assertIn("line", forms)

    def test_a_geo_column_offers_a_map(self):
        source = self._source(country_frame_of(ds.get_dataset("measles")))
        self.assertIn("choropleth", {c.form for c in candidates_for(source)})

    def test_every_candidate_validates_against_its_own_slice(self):
        """The point of pre-computing candidates: none can be undrawable."""
        sources = charts_http.sources_for_dataset(ds.get_dataset("measles"))
        for candidate in candidates_across(sources):
            frame = next(s.frame for s in sources if s.name == candidate.source)
            # spec_of, not a hand-built ChartSpec: it is what select.py calls,
            # so this covers the candidate's own modifiers too. A modifier the
            # form does not allow is an error, not a silent drop.
            spec = spec_of(candidate, title="T", rationale="R")
            result = validate_spec(spec, apply_slice(frame, candidate))
            with self.subTest(form=candidate.form, source=candidate.source):
                self.assertTrue(result.ok, f"{candidate.form}: {result.errors}")

    def test_a_candidate_only_sets_modifiers_its_form_allows(self):
        sources = charts_http.sources_for_dataset(ds.get_dataset("measles"))
        for candidate in candidates_across(sources):
            for name in candidate.modifiers:
                with self.subTest(form=candidate.form, modifier=name):
                    self.assertIn(name, FORM_RULES[candidate.form].allows)

    def test_long_category_names_get_a_horizontal_bar(self):
        """Otherwise the model describes one and the spec draws the other."""
        frame = _frame(
            [
                {"key": "country", "label": "Country", "type": "nominal"},
                {"key": "v", "label": "V", "type": "quantitative"},
            ],
            [{"country": "Democratic Republic of the Congo", "v": 1.0},
             {"country": "United Republic of Tanzania", "v": 2.0}],
        )
        source = FrameSource("t", frame, profile_of_frame(frame))
        bar = next(c for c in candidates_for(source) if c.form == "bar")
        self.assertEqual(bar.modifiers.get("orientation"), "horizontal")

    def test_short_category_names_leave_orientation_unset(self):
        frame = _frame(
            [
                {"key": "country", "label": "Country", "type": "nominal"},
                {"key": "v", "label": "V", "type": "quantitative"},
            ],
            [{"country": "Chad", "v": 1.0}, {"country": "Peru", "v": 2.0}],
        )
        source = FrameSource("t", frame, profile_of_frame(frame))
        bar = next(c for c in candidates_for(source) if c.form == "bar")
        self.assertEqual(bar.modifiers, {})

    def test_a_measure_split_of_mixed_units_only_offers_indexed_and_faceted(self):
        """The dual-axis defect, arriving through long format."""
        source = self._source(world_frame_of(ds.get_dataset("measles")))
        candidates = candidates_for(source)
        self.assertTrue(candidates)
        for c in candidates:
            with self.subTest(form=c.form):
                self.assertEqual(c.form, "line")
                self.assertTrue(c.transform == "indexed" or c.encoding.get("facet"))

    def test_countries_are_not_mistaken_for_mixed_units(self):
        """Same unit, wildly different magnitudes. A ratio test alone gets this
        wrong and suppresses every form on every country table."""
        source = self._source(country_frame_of(ds.get_dataset("measles")))
        forms = {c.form for c in candidates_for(source)}
        self.assertIn("bar", forms)
        self.assertIn("choropleth", forms)

    def test_a_high_cardinality_split_is_cut_rather_than_dropped(self):
        source = self._source(country_frame_of(ds.get_dataset("measles")))
        lines = [c for c in candidates_for(source) if c.form == "line"]
        self.assertTrue(lines)
        self.assertTrue(all(c.encoding.get("color") for c in lines))
        self.assertTrue(any(c.slice == "top_n" for c in lines))

    def test_a_declared_cut_is_disclosed_to_the_reader(self):
        source = self._source(country_frame_of(ds.get_dataset("measles")))
        cut = next(c for c in candidates_for(source) if c.slice == "top_n" and c.notes)
        self.assertTrue(any("exceed" in n for n in cut.notes))

    def test_an_identifier_column_is_not_used_as_a_split(self):
        frame = _frame(
            [
                {"key": "row_id", "label": "Row", "type": "nominal"},
                {"key": "year", "label": "Year", "type": "temporal"},
                {"key": "v", "label": "V", "type": "quantitative"},
            ],
            [{"row_id": f"r{i}", "year": 1990 + i, "v": float(i)} for i in range(20)],
        )
        for c in candidates_for(self._source(frame)):
            self.assertNotEqual(c.encoding.get("color"), "row_id")

    def test_the_candidate_list_is_deterministic(self):
        sources = charts_http.sources_for_dataset(ds.get_dataset("measles"))
        first = [c.key for c in candidates_across(sources)]
        second = [c.key for c in candidates_across(
            charts_http.sources_for_dataset(ds.get_dataset("measles"))
        )]
        self.assertEqual(first, second)

    def test_both_tables_reach_the_model(self):
        sources = charts_http.sources_for_dataset(ds.get_dataset("measles"))
        used = {c.source for c in candidates_across(sources)}
        self.assertEqual(used, {s.name for s in sources})

    def test_the_menu_is_varied_rather_than_one_form_repeated(self):
        sources = charts_http.sources_for_dataset(ds.get_dataset("measles"))
        candidates = candidates_across(sources)
        self.assertLessEqual(len(candidates), MAX_CANDIDATES)
        self.assertGreaterEqual(len({c.form for c in candidates}), 8)

    def test_endpoint_slice_keeps_exactly_two_x_values(self):
        source = self._source(country_frame_of(ds.get_dataset("measles")))
        dumbbell = next(c for c in candidates_for(source) if c.form == "dumbbell")
        sliced = apply_slice(source.frame, dumbbell)
        self.assertEqual(len({r["year"] for r in sliced.rows}), 2)


class RealUploadShapeTests(TestCase):
    """Two defects that only a real third-party table exposed.

    Built from the shape of an OWID country-year export (227 entities, 2000-2024,
    world/continent/income-group aggregates in the same column as the countries).
    Neither registry dataset has that shape, so neither could have caught these.
    """

    def _owid_shaped(self) -> FrameSource:
        columns = [
            {"key": "Entity", "label": "Entity", "type": "nominal"},
            {"key": "Code", "label": "Code", "type": "geo"},
            {"key": "Year", "label": "Year", "type": "temporal"},
            {"key": "incidence", "label": "Incidence", "type": "quantitative"},
        ]
        rows = []
        for i in range(40):  # countries, with ISO3-SHAPED codes: letters only
            code = "A" + chr(ord("A") + i // 26) + chr(ord("A") + i % 26)
            for year in (2000, 2012, 2024):
                rows.append({"Entity": f"Country {i}", "Code": code,
                             "Year": year, "incidence": float(i * 3)})
        for name, code in (("World", "OWID_WRL"), ("Africa", "OWID_AFR"),
                           ("High-income countries", "OWID_HIC")):
            for year in (2000, 2012, 2024):
                # An aggregate is larger than any of its parts, which is exactly
                # why it captures the top of a ranking.
                rows.append({"Entity": name, "Code": code, "Year": year,
                             "incidence": 9000.0})
        frame = ChartFrame(columns=columns, rows=rows)
        return FrameSource("uploaded table", frame, profile_of_frame(frame))

    def _bar(self):
        source = self._owid_shaped()
        bar = next(c for c in candidates_for(source) if c.form == "bar")
        return source, bar, apply_slice(source.frame, bar)

    def test_a_crowded_category_axis_is_cut(self):
        """maxSeries governs colour, not x, so nothing capped the bars."""
        _, _, sliced = self._bar()
        self.assertLessEqual(len({r["Entity"] for r in sliced.rows}), MAX_BARS)

    def test_the_cut_is_disclosed(self):
        _, bar, _ = self._bar()
        self.assertTrue(any("highest" in n for n in bar.notes))

    def test_aggregates_are_not_ranked_beside_countries(self):
        """"World" outranks every country it contains, by construction."""
        _, _, sliced = self._bar()
        entities = {r["Entity"] for r in sliced.rows}
        for aggregate in ("World", "Africa", "High-income countries"):
            self.assertNotIn(aggregate, entities)

    def test_dropping_aggregates_is_disclosed(self):
        _, bar, _ = self._bar()
        self.assertTrue(any("not individual countries" in n for n in bar.notes))

    def test_the_ranking_is_taken_from_the_latest_year(self):
        """Rank first and take the latest year after, and it ranks on the wrong
        number while looking entirely convincing."""
        _, _, sliced = self._bar()
        self.assertEqual({r["Year"] for r in sliced.rows}, {2024})

    def test_a_table_of_only_regions_is_left_alone(self):
        """Dropping every row would be worse than charting regions as regions."""
        columns = [
            {"key": "Entity", "label": "Entity", "type": "nominal"},
            {"key": "Code", "label": "Code", "type": "geo"},
            {"key": "v", "label": "V", "type": "quantitative"},
        ]
        rows = [{"Entity": n, "Code": c, "v": 1.0} for n, c in
                (("World", "OWID_WRL"), ("Africa", "OWID_AFR"), ("Asia", "OWID_ASI"))]
        frame = ChartFrame(columns=columns, rows=rows)
        source = FrameSource("t", frame, profile_of_frame(frame))
        bar = next(c for c in candidates_for(source) if c.form == "bar")
        self.assertTrue(apply_slice(frame, bar).rows)

    def test_aggregates_go_from_every_form_that_draws_places_as_marks(self):
        """The first pass covered bar/lollipop/heatmap only, which left "World"
        as a point in the middle of a 225-country scatter."""
        source = self._owid_shaped()
        for candidate in candidates_for(source):
            if candidate.form in ("choropleth", "bivariateChoropleth"):
                continue
            with self.subTest(form=candidate.form):
                entities = {
                    r["Entity"] for r in apply_slice(source.frame, candidate).rows
                }
                self.assertNotIn("World", entities)

    def test_the_exclusion_is_justified_by_peerhood_not_by_rank(self):
        """The note used to say an aggregate outranks every country inside it.
        True of a count, false of a rate: TB incidence per 100k puts World 59th
        of 225, below Kiribati. The reason is that it is not a peer."""
        source = self._owid_shaped()
        bar = next(c for c in candidates_for(source) if c.form == "bar")
        note = next(n for n in bar.notes if "not individual countries" in n)
        self.assertIn("not peers of them", note)
        self.assertNotIn("outranks", note)

    def test_a_scatter_of_many_places_drops_the_colour_channel(self):
        """225 hues is not a legend. Cutting to the 3 the form carries would
        throw away the relationship the figure exists to show, so colour goes
        and every point stays."""
        source = self._owid_shaped()
        scatter = next(
            (c for c in candidates_for(source) if c.form == "scatter"), None
        )
        if scatter is not None:
            self.assertIsNone(scatter.encoding.get("color"))

    def test_a_scatter_of_few_places_keeps_it(self):
        columns = [
            {"key": "place", "label": "Place", "type": "nominal"},
            {"key": "a", "label": "A", "type": "quantitative"},
            {"key": "b", "label": "B", "type": "quantitative"},
        ]
        rows = [{"place": p, "a": float(i), "b": float(i * 2)}
                for i, p in enumerate(("X", "Y"))
                for _ in range(3)]
        frame = ChartFrame(columns=columns, rows=rows)
        source = FrameSource("t", frame, profile_of_frame(frame))
        scatter = next(c for c in candidates_for(source) if c.form == "scatter")
        self.assertEqual(scatter.encoding.get("color"), "place")

    def test_every_cut_says_so(self):
        """A figure that silently drops most of the table is the failure this
        module exists to avoid."""
        source = self._owid_shaped()
        for candidate in candidates_for(source):
            if candidate.slice == "none":
                continue
            with self.subTest(form=candidate.form, cut=candidate.slice):
                self.assertTrue(
                    candidate.notes,
                    f"{candidate.form} cuts with '{candidate.slice}' and says nothing",
                )

    def test_a_latest_only_figure_names_the_year(self):
        """The bivariate map showed 2024 alone under an empty caption."""
        source = self._owid_shaped()
        latest = next(
            c for c in candidates_for(source)
            if c.slice in ("latest", "ranked_latest")
        )
        self.assertTrue(any("2024" in n for n in latest.notes), latest.notes)

    def test_the_map_still_sees_every_row(self):
        """Aggregates are dropped only where places are RANKED. A choropleth
        looks each code up and simply fails to match the ones that are not
        countries, so nothing needs removing."""
        source = self._owid_shaped()
        chor = next(c for c in candidates_for(source) if c.form == "choropleth")
        self.assertIsNone(chor.drop_aggregates_on)
        self.assertEqual(len(apply_slice(source.frame, chor).rows),
                         len(source.frame.rows))


class SourceParityTests(TestCase):
    """A registry dataset and the same table uploaded reach the same conclusions.

    This is the check Ahmed asked for, at the layer where it can actually hold.
    It cannot be an equality assertion on the model's three picks: the project's
    own measurement (experiments/MODELS.md) is that a fixed seed reproduces
    output only while the model stays resident, and every run here evicts. What
    IS deterministic is everything up to the model - the typing, the candidate
    set and the validation - so that is what gets pinned.
    """

    def _round_trip(self, frame: ChartFrame) -> FrameSource:
        """The registry frame, written to CSV and re-typed by inference."""
        df = pd.DataFrame(frame.rows)
        rebuilt, profile = frame_from_dataframe(df)
        return FrameSource(name="uploaded table", frame=rebuilt, profile=profile)

    def test_inference_recovers_the_declared_types(self):
        declared = country_frame_of(ds.get_dataset("measles"))
        inferred = self._round_trip(declared).profile
        declared_types = {c.key: c.type for c in declared.columns}
        inferred_types = {c.key: c.type for c in inferred.columns}
        self.assertEqual(declared_types, inferred_types)

    def test_the_same_table_offers_the_same_forms_either_way(self):
        declared = country_frame_of(ds.get_dataset("measles"))
        registry = FrameSource("country table", declared, profile_of_frame(declared))
        uploaded = self._round_trip(declared)
        self.assertEqual(
            {c.form for c in candidates_for(registry)},
            {c.form for c in candidates_for(uploaded)},
        )

    def test_an_uploaded_table_still_refuses_a_dishonest_shared_axis(self):
        world = world_frame_of(ds.get_dataset("measles"))
        uploaded = self._round_trip(world)
        for c in candidates_for(uploaded):
            self.assertTrue(c.transform == "indexed" or c.encoding.get("facet"))


class ChartEndpointTests(TestCase):
    """Only the paths that stop before a model call; the rest needs Ollama."""

    def test_exactly_one_source_is_required(self):
        for body in ({}, {"datasetId": "measles", "uploadId": "x"}):
            with self.subTest(body=body):
                response = self.client.post(
                    "/api/charts/suggest", data=json.dumps(body),
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, 400)

    def test_an_unknown_dataset_is_a_404(self):
        response = self.client.post(
            "/api/charts/suggest",
            data=json.dumps({"datasetId": "nope", "tier": "demo"}),
            content_type="application/json",
        )
        self.assertIn(response.status_code, (404, 409))


class IncommensurableThresholdTests(TestCase):
    def test_the_threshold_is_documented_where_it_bites(self):
        """Measles is 44.8x. A first pass at 50.0 let it through."""
        world = world_frame_of(ds.get_dataset("measles"))
        peaks: dict[str, float] = {}
        for row in world.rows:
            group = str(row["measure"])
            peaks[group] = max(peaks.get(group, 0.0), abs(float(row["value"])))
        ratio = max(peaks.values()) / min(peaks.values())
        self.assertGreater(ratio, INCOMMENSURABLE_RATIO)
