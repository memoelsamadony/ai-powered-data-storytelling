#!/usr/bin/env python3
"""Build `who_gho_tidy.csv` from the WHO Global Health Observatory OData API.

Why this script exists
----------------------
The interface has always described its secondary dataset as under-five
mortality against life expectancy. The extract sitting in `datasets/`
("Causes of death for children less than 5 years.csv", indicator MORT_100) is a
real WHO download, but it is **death counts by cause**: it carries no
live-births denominator for a mortality rate and no life-expectancy series at
all, so neither declared measure can be derived from it.

Both measures are published by the same GHO, under different indicators:

* ``MDG_0000000007`` - under-five mortality rate, per 1000 live births
* ``WHOSIS_000001``  - life expectancy at birth, years

This fetches both, keeps the both-sexes series, joins them on (country, year)
and writes the tidy CSV the backend registry expects. Run it once; the output
is committed, so the pipeline never depends on the network.

    python3 emotional-tone-moderation/data/build_who_gho.py
"""

from __future__ import annotations

import csv
import json
import urllib.request
from pathlib import Path

API = "https://ghoapi.azureedge.net/api"
OUT = Path(__file__).resolve().parent / "who_gho_tidy.csv"

INDICATORS = {
    "under5_mortality": "MDG_0000000007",
    "life_expectancy": "WHOSIS_000001",
}
BOTH_SEXES = "SEX_BTSX"


def fetch(path: str) -> list[dict]:
    with urllib.request.urlopen(f"{API}/{path}", timeout=120) as response:
        return json.loads(response.read())["value"]


def country_names() -> dict[str, str]:
    """ISO3 -> display name. The fact tables carry only the code."""
    return {
        row["Code"]: row["Title"]
        for row in fetch("DIMENSION/COUNTRY/DimensionValues")
        if row.get("Code")
    }


def series(indicator: str) -> dict[tuple[str, int], float]:
    """(iso3, year) -> value, both sexes only.

    The API returns one row per sex; taking all of them would put three
    different numbers under the same country-year.
    """
    out: dict[tuple[str, int], float] = {}
    for row in fetch(indicator):
        if row.get("Dim1") not in (BOTH_SEXES, None):
            continue
        code, year, value = row.get("SpatialDim"), row.get("TimeDim"), row.get("NumericValue")
        kind = row.get("SpatialDimType")
        # Countries, plus WHO's own global figure. Regions and income groups are
        # dropped: they would sit in the table looking like countries.
        if kind not in ("COUNTRY", "GLOBAL") or value is None:
            continue
        # WHO publishes the world figure itself, so the aggregate is theirs
        # rather than something averaged here out of country rows (which would
        # need a births denominator this API does not carry).
        if kind == "GLOBAL":
            code = "WORLD"
        if code and year:
            out[(code, int(year))] = float(value)
    return out


def main() -> None:
    names = country_names()
    measures = {key: series(code) for key, code in INDICATORS.items()}
    keys = sorted(set().union(*(m.keys() for m in measures.values())))

    with OUT.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["country", "code", "year", "under5_mortality", "life_expectancy"])
        rows = 0
        for code, year in keys:
            values = [measures[key].get((code, year)) for key in INDICATORS]
            if all(v is None for v in values):
                continue
            writer.writerow(
                ["World" if code == "WORLD" else names.get(code, code), code, year]
                + ["" if v is None else round(v, 3) for v in values]
            )
            rows += 1

    print(f"wrote {OUT} ({rows} country-year rows)")
    for key, measure in measures.items():
        years = {y for _, y in measure}
        print(f"  {key}: {len(measure)} values, {min(years)}-{max(years)}")


if __name__ == "__main__":
    main()
