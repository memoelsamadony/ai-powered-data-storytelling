#!/usr/bin/env python3
"""Dependency-light loader for Quintd-1 inputs.

Replicates EXACTLY the per-domain ``get_data()`` serialization from the paper's
``data/dataset.py`` (github.com/kasnerz/quintd), minus the ``render()`` methods
that pull in ``json2table``/``tinyhtml`` (not installed, and unused for
generation/judging). The serialized output of each ``get_data`` here is
byte-for-byte the structure that the original code feeds into the model prompt.
"""
import json
from pathlib import Path
from datetime import datetime
import dateutil.parser

# repo_root/data/quintd-1/data
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "quintd-1" / "data"

DOMAINS = ["openweather", "gsmarena", "ice_hockey", "owid", "wikidata"]


def _openweather(split):
    with open(DATA_DIR / "openweather" / f"{split}.json") as f:
        data = json.load(f)
    forecasts = data["forecasts"]
    out = []
    units = {"temp": "°C", "wind": "m/s", "pressure": "hPa", "rain": "mm", "snow": "mm"}
    for forecast in forecasts:
        city = forecast["city"]
        timezone_shift_sec = city["timezone"]
        for key in ["sunrise", "sunset", "population", "timezone"]:
            city.pop(key, None)
        lst_filtered = []
        for i, f in enumerate(forecast["list"]):
            if i % 2 != 0:  # 6-hour intervals
                continue
            f = {k: v for k, v in f.items() if k not in ["dt", "pop", "sys", "visibility"]}
            f["main"] = {k: v for k, v in f["main"].items()
                         if k not in ["temp_kf", "humidity", "sea_level", "grnd_level"]}
            local_dt = dateutil.parser.parse(f["dt_txt"]).timestamp() + timezone_shift_sec
            f["dt_txt"] = datetime.fromtimestamp(local_dt).strftime("%Y-%m-%d %H:%M:%S")
            lst_filtered.append(f)
        out.append({"city": city, "units": units, "list": lst_filtered})
    return out


def _ice_hockey(split):
    with open(DATA_DIR / "ice_hockey" / f"{split}.json") as f:
        data = json.load(f)

    def recursive_remove_key(d, key_to_remove):
        if isinstance(d, dict):
            d.pop(key_to_remove, None)
            for k, v in d.items():
                d[k] = recursive_remove_key(v, key_to_remove)
        elif isinstance(d, list):
            d = [recursive_remove_key(item, key_to_remove) for item in d]
        return d

    for game in data:
        start_timestamp = game["startTimestamp"]
        for key in ["changes", "crowdsourcingDataDisplayEnabled", "crowdsourcingEnabled",
                    "customId", "finalResultOnly", "hasEventPlayerStatistics",
                    "hasGlobalHighlights", "isEditor", "periods", "status", "time",
                    "roundInfo", "tournament", "winnerCode"]:
            game.pop(key, None)
        game["season"].pop("editor", None)
        for key in ["current", "slug", "sport", "teamColors", "subTeams", "userCount",
                    "type", "disabled", "national"]:
            recursive_remove_key(game, key)
        for key in ["homeTeam", "awayTeam"]:
            if isinstance(game[key].get("country"), dict) and "name" in game[key]["country"]:
                country_name = game[key]["country"]["name"]
                game[key].pop("country")
                game[key]["country"] = country_name
        game["startDatetime"] = datetime.fromtimestamp(start_timestamp).strftime("%Y-%m-%d %H:%M:%S")
    return data


def _gsmarena(split):
    # base Dataset.get_data: returns the raw list as-is
    with open(DATA_DIR / "gsmarena" / f"{split}.json") as f:
        return json.load(f)


def _owid(split):
    out = []
    split_dir = DATA_DIR / "owid" / split
    filenames = sorted(split_dir.iterdir(), key=lambda x: int(x.stem.split("-")[0]))
    for filename in filenames:
        with open(filename) as f:
            out.append(f.read())
    return out


def _wikidata(split):
    with open(DATA_DIR / "wikidata" / f"{split}.json") as f:
        data = json.load(f)
    examples = []
    for example in data:
        entity = example["entity"]
        properties = example["properties"]
        table = entity + "\n---\n"
        table += "\n".join([f"- {prop}: {subj}" for prop, subj in properties])
        examples.append(table)
    return examples


_LOADERS = {
    "openweather": _openweather,
    "ice_hockey": _ice_hockey,
    "gsmarena": _gsmarena,
    "owid": _owid,
    "wikidata": _wikidata,
}


def get_data(domain, split):
    return _LOADERS[domain](split)


if __name__ == "__main__":
    for d in DOMAINS:
        data = get_data(d, "test")
        print(f"{d}: {len(data)} examples; first item type={type(data[0]).__name__}")
