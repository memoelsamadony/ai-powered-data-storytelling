"""Validation and storage for user-uploaded CSVs.

Parked, not wired: see ``UploadedDataset`` for why an arbitrary table cannot
join the dataset registry without a human first saying what its columns mean.

What this does enforce is that a stored file is a readable CSV of a plausible
shape, so the configuration step that eventually reads it is working with
something real rather than discovering at pipeline time that it was handed a
PDF or a 400 MB export.
"""

from __future__ import annotations

import uuid
from pathlib import Path

import pandas as pd
from django.conf import settings

from .models import UploadedDataset

MAX_BYTES = 20 * 1024 * 1024
# Enough rows to see the shape; the file itself is kept whole.
PREVIEW_ROWS = 5
UPLOAD_DIR = Path(settings.BASE_DIR) / "uploads"


class UploadRejected(ValueError):
    """The file is not something the pipeline could ever read."""


def _detect_year_range(frame: pd.DataFrame) -> str:
    for name in ("year", "Year", "period", "Period"):
        if name in frame.columns:
            years = pd.to_numeric(frame[name], errors="coerce").dropna()
            if not years.empty:
                return f"{int(years.min())}-{int(years.max())}"
    return ""


def _detect_countries(frame: pd.DataFrame) -> int | None:
    for name in ("country", "Country", "location", "Location"):
        if name in frame.columns:
            return int(frame[name].nunique())
    return None


def store(upload) -> UploadedDataset:
    """Validate an uploaded file and keep it. Raises UploadRejected."""
    name = (getattr(upload, "name", "") or "").strip()
    if not name.lower().endswith(".csv"):
        raise UploadRejected("Only .csv files are accepted.")
    size = getattr(upload, "size", 0) or 0
    if size > MAX_BYTES:
        raise UploadRejected(f"File is {size / 1e6:.1f} MB; the limit is {MAX_BYTES / 1e6:.0f} MB.")
    if size == 0:
        raise UploadRejected("File is empty.")

    # The stored name is the id, never the client's: a name like
    # "../../settings.py" must not be able to choose where this lands.
    dataset_id = uuid.uuid4()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path = UPLOAD_DIR / f"{dataset_id}.csv"
    with path.open("wb") as fh:
        for chunk in upload.chunks():
            fh.write(chunk)

    try:
        frame = pd.read_csv(path)
    except Exception as exc:  # pandas raises a family of parse errors
        path.unlink(missing_ok=True)
        raise UploadRejected(f"Could not parse as CSV: {exc}") from exc

    if frame.empty:
        path.unlink(missing_ok=True)
        raise UploadRejected("The CSV has no rows.")

    numeric = [c for c in frame.columns if pd.api.types.is_numeric_dtype(frame[c])]
    if not numeric:
        path.unlink(missing_ok=True)
        raise UploadRejected(
            "No numeric column found. A data story needs at least one measure to talk about."
        )

    return UploadedDataset.objects.create(
        id=dataset_id,
        original_name=Path(name).name[:255],
        stored_path=str(path),
        rows=int(len(frame)),
        columns=[str(c) for c in frame.columns],
        numeric_columns=[str(c) for c in numeric],
        year_range=_detect_year_range(frame),
        countries=_detect_countries(frame),
    )


def preview(record: UploadedDataset) -> list[dict]:
    frame = pd.read_csv(record.stored_path, nrows=PREVIEW_ROWS)
    return [
        {str(k): ("" if pd.isna(v) else str(v)) for k, v in row.items()}
        for row in frame.to_dict(orient="records")
    ]
