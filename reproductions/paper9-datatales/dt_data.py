#!/usr/bin/env python3
"""Data layer for the DataTales equity-slice evaluation.

Reads the DataTales release (../paper9-datatales) and assembles, for each
equity-market report, a same-day(+prior session) OHLCV table for the major
equity entities, paired with the gold human report. Mirrors the paper's
data-narration input (Fig. 1): a small tabular block per report.
"""
import csv
from collections import defaultdict
from pathlib import Path

csv.field_size_limit(10 ** 7)

DT = Path(__file__).resolve().parent.parent / "paper9-datatales" / "data"

# equity entities present in source_data_long.csv (symbol -> display name),
# matching the reference's "equity market" instrument list
EQUITY = {
    "SPX": "S&P 500", "IXIC": "Nasdaq Composite", "DJI": "Dow Jones Industrial Average",
    "NDX": "Nasdaq 100", "RUT": "Russell 2000", "SOX": "PHLX Semiconductor",
    "VIX": "CBOE Volatility Index (VIX)",
    "AAPL": "Apple", "AMZN": "Amazon", "GOOGL": "Alphabet",
    "META": "Meta Platforms", "MSFT": "Microsoft", "NVDA": "Nvidia",
}


def _opent(path):
    raw = open(path, "rb").read(2)
    enc = "utf-16" if raw in (b"\xff\xfe", b"\xfe\xff") else "utf-8-sig"
    return open(path, encoding=enc)


def _iso(d):
    d = d.split(" ")[0]
    m, dd, y = d.split("/")
    return f"{int(y):04d}-{int(m):02d}-{int(dd):02d}"


_SERIES = None


def _series():
    """symbol -> sorted list of (isodate, row) for equity entities."""
    global _SERIES
    if _SERIES is None:
        tmp = defaultdict(dict)
        with _opent(DT / "source_data_long.csv") as f:
            for row in csv.DictReader(f):
                if row["Symbol"] in EQUITY:
                    tmp[row["Symbol"]][_iso(row["Date"])] = row
        _SERIES = {s: sorted(v.items()) for s, v in tmp.items()}
    return _SERIES


def _split_map():
    with _opent(DT / "references" / "split_ref.csv") as f:
        return {(r["source"], r["market"], r["date"]): r["split"]
                for r in csv.DictReader(f)}


def reports(market="equity market", split=None):
    sm = _split_map()
    with _opent(DT / "reports" / "reports.tsv") as f:
        out = []
        for r in csv.DictReader(f, delimiter="\t"):
            if r["market"] != market:
                continue
            if split and sm.get((r["source"], r["market"], r["date"])) != split:
                continue
            out.append(r)
    return out


def _fmt(v):
    try:
        return f"{float(v):,.2f}"
    except (ValueError, TypeError):
        return str(v)


def table_for(date_iso, entities=None):
    """Linearize a same-day(+prior session) OHLCV table for `date_iso`.
    Returns a text block (one entity per group, two dated rows)."""
    entities = entities or list(EQUITY)
    ser = _series()
    lines = ["Entity | Date | Open | High | Low | Close | Volume"]
    used = 0
    for s in entities:
        seq = ser.get(s, [])
        # index of the report date (or latest trading day <= date)
        idx = None
        for i, (d, _) in enumerate(seq):
            if d <= date_iso:
                idx = i
            else:
                break
        if idx is None:
            continue
        rows = [seq[idx]]
        if idx - 1 >= 0:
            rows.insert(0, seq[idx - 1])
        for d, r in rows:
            lines.append(f"{EQUITY[s]} | {d} | {_fmt(r['Open'])} | {_fmt(r['High'])} | "
                         f"{_fmt(r['Low'])} | {_fmt(r['Close'])} | {r['Volume']}")
        used += 1
    return ("\n".join(lines), used)


def example_report():
    """A single train-split equity report used as the format guide in the prompt."""
    sm = _split_map()
    with _opent(DT / "reports" / "reports.tsv") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            if (r["market"] == "equity market"
                    and sm.get((r["source"], r["market"], r["date"])) == "train"
                    and 400 < len(r["passage"]) < 900):
                return r["passage"]
    return ""


if __name__ == "__main__":
    test = reports(split="test")
    print(f"equity test reports: {len(test)}")
    t, n = table_for(test[0]["date"])
    print(f"\nexample table for {test[0]['date']} ({n} entities):\n{t[:600]}")
    print(f"\ngold report:\n{test[0]['passage'][:300]}")
