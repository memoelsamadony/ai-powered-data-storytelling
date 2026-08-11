#!/usr/bin/env python3
"""Build normalised tidy datapacks for the storytelling experiments.

Reads the medical time-series sources in ``datasets/`` plus the merged measles
panel in ``emotional-tone-moderation/data/`` and writes one tidy CSV per series
to ``experiments/datapacks/<slug>.csv`` with the columns::

    series,year,cases,incidence_per_million

Series produced
---------------
measles-global            WHO/OWID merged panel, ``World`` rows (1980-)
mumps-global              WHO VPD surveillance xlsx, ``Global`` row (2000-)
pertussis-global          WHO VPD surveillance xlsx, ``Global`` row (2000-)
diphtheria-global         WHO VPD surveillance xlsx, ``Global`` row (2000-)
under5-measles-deaths     global under-5 measles deaths (deaths in ``cases``)
under5-all-cause-deaths   global under-5 deaths, all 16 causes summed

For the two death series the ``cases`` column holds deaths and
``incidence_per_million`` is left blank.

Stdlib only (no openpyxl / pandas), Python 3.9 compatible. The xlsx files are
read straight out of the OOXML zip with ``zipfile`` + ``re``.

Run from the repository root::

    python3 experiments/datapacks/build_datapacks.py
"""

import csv
import hashlib
import re
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent
REPO_ROOT = OUT_DIR.parents[1]
DATASETS = REPO_ROOT / "datasets"

MEASLES_PANEL = (
    REPO_ROOT / "emotional-tone-moderation" / "data" / "measles_merged_tidy.csv"
)
DEATHS_WIDE = DATASETS / "deaths_by_year_and_disease.csv"
DEATHS_LONG = DATASETS / "Causes of death for children less than 5 years.csv"

VPD_FILES = [
    ("mumps-global", DATASETS / "Mumps reported cases and incidence 2026-05-08 12-40 UTC.xlsx"),
    ("pertussis-global", DATASETS / "Pertussis reported cases and incidence 2026-05-08 10-53 UTC.xlsx"),
    ("diphtheria-global", DATASETS / "Diphtheria reported cases and incidence 2026-09-08 00-02 UTC.xlsx"),
]

HEADER = ["series", "year", "cases", "incidence_per_million"]

# ---------------------------------------------------------------------------
# small helpers
# ---------------------------------------------------------------------------


def parse_number(raw):
    """'1,234' -> 1234.0, '' / None / '-' -> None. Handles NBSP thousands seps."""
    if raw is None:
        return None
    s = str(raw).replace(" ", "").replace(" ", "").strip()
    s = s.replace(",", "")
    if s in ("", "-", "--", "NA", "N/A", "ND", "NR"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def fmt_num(value):
    """Shortest faithful text form; float noise like 66.400000000000006 -> 66.4."""
    if value is None:
        return ""
    text = repr(round(float(value), 6))
    if text.endswith(".0"):
        text = text[:-2]
    return text


def fmt_int(value):
    if value is None:
        return ""
    return str(int(round(float(value))))


# ---------------------------------------------------------------------------
# xlsx reading (stdlib only)
# ---------------------------------------------------------------------------

_SI_RE = re.compile(r"<si>(.*?)</si>", re.S)
_T_RE = re.compile(r"<t[^>]*>(.*?)</t>", re.S)
_ROW_RE = re.compile(r"<row[^>]*>(.*?)</row>", re.S)
_CELL_RE = re.compile(r'<c r="([A-Z]+)(\d+)"([^>]*?)(?:/>|>(.*?)</c>)', re.S)
_V_RE = re.compile(r"<v>(.*?)</v>", re.S)
_T_ATTR_RE = re.compile(r't="([^"]+)"')

_XML_ENTITIES = (
    ("&lt;", "<"),
    ("&gt;", ">"),
    ("&quot;", '"'),
    ("&apos;", "'"),
    ("&amp;", "&"),
)


def _unescape(text):
    for entity, char in _XML_ENTITIES:
        text = text.replace(entity, char)
    return text


def read_shared_strings(zf):
    try:
        blob = zf.read("xl/sharedStrings.xml").decode("utf-8")
    except KeyError:
        return []
    return [_unescape("".join(_T_RE.findall(chunk))) for chunk in _SI_RE.findall(blob)]


def read_sheet_rows(path):
    """Return Sheet1 as a list of {column_letter: text} dicts, in row order."""
    with zipfile.ZipFile(path) as zf:
        shared = read_shared_strings(zf)
        blob = zf.read("xl/worksheets/sheet1.xml").decode("utf-8")
        rows = []
        for row_xml in _ROW_RE.findall(blob):
            cells = {}
            for match in _CELL_RE.finditer(row_xml):
                col, _rownum, attrs, body = match.groups()
                value_match = _V_RE.search(body or "")
                value = value_match.group(1) if value_match else ""
                type_match = _T_ATTR_RE.search(attrs or "")
                cell_type = type_match.group(1) if type_match else None
                if cell_type == "s" and value != "":
                    value = shared[int(value)]
                elif cell_type == "inlineStr":
                    value = _unescape("".join(_T_RE.findall(body or "")))
                cells[col] = _unescape(value) if isinstance(value, str) else value
            rows.append(cells)
        return rows, shared


# ---------------------------------------------------------------------------
# series builders
# ---------------------------------------------------------------------------


def build_vpd_series(slug, path):
    """WHO VPD surveillance workbook -> [(year, cases, incidence_per_million)].

    Sheet1 layout: row 1 header (A 'Country / Region', B 'Disease', then years
    descending), one row whose A cell is 'Global' carrying comma-formatted case
    counts, and one row whose B cell starts with 'Incidence rate' carrying the
    rate. The incidence row's A cell is an export timestamp, not 'Global', so
    the two rows must be keyed on different columns.
    """
    rows, shared = read_sheet_rows(path)
    if not rows:
        raise ValueError("%s: Sheet1 has no rows" % path.name)

    year_cols = {}
    for col, raw in rows[0].items():
        text = str(raw).strip()
        if re.fullmatch(r"(19|20)\d{2}", text):
            year_cols[col] = int(text)
    if not year_cols:
        raise ValueError("%s: no year columns found in the header row" % path.name)

    cases_row = None
    incidence_row = None
    incidence_label = None
    for cells in rows[1:]:
        if str(cells.get("A", "")).strip() == "Global" and cases_row is None:
            cases_row = cells
        label = str(cells.get("B", "")).strip()
        if label.lower().startswith("incidence rate") and incidence_row is None:
            incidence_row = cells
            incidence_label = label
    if cases_row is None:
        raise ValueError("%s: no 'Global' row found on Sheet1" % path.name)
    if incidence_row is None:
        raise ValueError("%s: no 'Incidence rate ...' row found on Sheet1" % path.name)

    # The row label is unreliable (the diphtheria export says "per 1000 total
    # population"); the workbook metadata is the authority. Verify it here so a
    # future export with a genuinely different denominator is not silently
    # written into a per-million column.
    per_million = any("divided by 1,000,000" in s for s in shared)
    if not per_million:
        raise ValueError(
            "%s: metadata does not state a 1,000,000 incidence denominator "
            "(row label was %r) - refusing to write incidence_per_million"
            % (path.name, incidence_label)
        )
    if "1000000" not in incidence_label.replace(",", "").replace(" ", ""):
        sys.stderr.write(
            "  note: %s row label reads %r but the workbook metadata states "
            "'divided by 1,000,000 total population' - treated as per million\n"
            % (path.name, incidence_label)
        )

    records = []
    for col, year in sorted(year_cols.items(), key=lambda kv: kv[1]):
        cases = parse_number(cases_row.get(col))
        incidence = parse_number(incidence_row.get(col))
        if cases is None and incidence is None:
            continue
        records.append((year, cases, incidence))
    return records, incidence_label


def build_measles_global():
    """Aggregate the 'World' rows of the merged measles panel by year."""
    by_year = defaultdict(lambda: {"cases": 0.0, "pop": 0.0, "inc": [], "n": 0})
    with open(MEASLES_PANEL, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row.get("country", "").strip() != "World":
                continue
            year = parse_number(row.get("year"))
            if year is None:
                continue
            bucket = by_year[int(year)]
            bucket["n"] += 1
            cases = parse_number(row.get("measles_cases"))
            if cases is not None:
                bucket["cases"] += cases
            population = parse_number(row.get("population"))
            if population is not None:
                bucket["pop"] += population
            incidence = parse_number(row.get("incidence_per_million"))
            if incidence is not None:
                bucket["inc"].append(incidence)
    if not by_year:
        raise ValueError("%s: no 'World' rows found" % MEASLES_PANEL.name)

    records = []
    for year in sorted(by_year):
        bucket = by_year[year]
        if bucket["n"] == 1:
            # Single World row for the year: keep the published rate verbatim.
            incidence = bucket["inc"][0] if bucket["inc"] else None
        elif bucket["pop"] > 0:
            # Several rows would have to be pooled, so recompute the rate from
            # the summed numerator/denominator rather than averaging rates.
            incidence = round(bucket["cases"] / bucket["pop"] * 1e6, 2)
        else:
            incidence = None
        records.append((year, bucket["cases"], incidence))
    return records


def build_under5_death_series():
    """Wide under-5 deaths CSV -> (measles deaths, all-cause deaths) per year."""
    with open(DEATHS_WIDE, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        cause_cols = [c for c in reader.fieldnames if c != "Period"]
        if "Measles" not in cause_cols:
            raise ValueError("%s: no 'Measles' column" % DEATHS_WIDE.name)
        measles, all_cause = [], []
        for row in reader:
            year = parse_number(row.get("Period"))
            if year is None:
                continue
            year = int(year)
            values = [parse_number(row.get(c)) for c in cause_cols]
            present = [v for v in values if v is not None]
            total = sum(present) if present else None
            measles.append((year, parse_number(row.get("Measles")), None))
            all_cause.append((year, total, None))
    measles.sort()
    all_cause.sort()
    return measles, all_cause, cause_cols


def crosscheck_gho(measles_wide, all_cause_wide):
    """Independent aggregate of the 194-country GHO long file, for provenance.

    Not written to any datapack: it is a different population from the wide
    global file and the task fixes the death series to the wide file.
    """
    if not DEATHS_LONG.exists():
        sys.stderr.write("  note: %s missing - cross-check skipped\n" % DEATHS_LONG.name)
        return {}
    totals = defaultdict(float)
    measles = defaultdict(float)
    locations = set()
    with open(DEATHS_LONG, newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            # Dim2 holds overlapping age bands (0-4 years = 0-27 days plus
            # 1-59 months); summing all three would double count.
            if row.get("Dim2") != "0-4 years":
                continue
            value = parse_number(row.get("FactValueNumeric"))
            if value is None:
                continue
            year = parse_number(row.get("Period"))
            if year is None:
                continue
            year = int(year)
            locations.add(row.get("Location"))
            totals[year] += value
            if row.get("Dim3") == "Measles":
                measles[year] += value

    wide_measles = dict((y, v) for y, v, _ in measles_wide)
    wide_all = dict((y, v) for y, v, _ in all_cause_wide)
    print("\nCross-check: wide global CSV vs GHO long file (%d countries, "
          "Dim2='0-4 years')" % len(locations))
    print("  %-6s %12s %12s %12s %12s %8s" % (
        "year", "wide_measles", "gho_measles", "wide_all", "gho_all", "all_ratio"))
    ratios = []
    for year in sorted(wide_all):
        gho_all = totals.get(year)
        gho_measles = measles.get(year)
        ratio = (wide_all[year] / gho_all) if gho_all else None
        if ratio:
            ratios.append(ratio)
        print("  %-6d %12s %12s %12s %12s %8s" % (
            year,
            fmt_int(wide_measles.get(year)), fmt_int(gho_measles),
            fmt_int(wide_all[year]), fmt_int(gho_all),
            ("%.4f" % ratio) if ratio else "-"))
    if ratios:
        print("  wide/GHO all-cause ratio: min %.4f, max %.4f -> the two sources "
              "are NOT interchangeable" % (min(ratios), max(ratios)))
    return {"gho_all": dict(totals), "gho_measles": dict(measles),
            "countries": len(locations)}


# ---------------------------------------------------------------------------
# output
# ---------------------------------------------------------------------------


def write_series(slug, records, integer_cases=True):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / ("%s.csv" % slug)
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADER)
        for year, cases, incidence in records:
            writer.writerow([
                slug,
                year,
                fmt_int(cases) if integer_cases else fmt_num(cases),
                fmt_num(incidence),
            ])
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    years = [r[0] for r in records]
    print("  %-24s %4d rows  %d-%d  sha256:%s"
          % (path.name, len(records), min(years), max(years), digest[:16]))
    return path


def main():
    print("Building datapacks into %s" % OUT_DIR)

    written = []
    measles = build_measles_global()
    written.append(write_series("measles-global", measles))

    for slug, path in VPD_FILES:
        if not path.exists():
            raise SystemExit("missing input: %s" % path)
        records, label = build_vpd_series(slug, path)
        written.append(write_series(slug, records))

    measles_deaths, all_cause_deaths, cause_cols = build_under5_death_series()
    written.append(write_series("under5-measles-deaths", measles_deaths))
    written.append(write_series("under5-all-cause-deaths", all_cause_deaths))
    print("  (all-cause = sum of %d cause columns)" % len(cause_cols))

    crosscheck_gho(measles_deaths, all_cause_deaths)

    print("\nWrote %d series." % len(written))
    return 0


if __name__ == "__main__":
    sys.exit(main())
