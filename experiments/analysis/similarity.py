"""Shim: the similarity metrics live with the backend so there is one implementation.

Kept so `experiments/` scripts can import them without installing Django.
Run `python3 backend/storytelling/metrics.py` for the self-test.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "backend" / "storytelling"))

from metrics import (  # noqa: E402,F401
    all_metrics, bleu, bleu_n, chrf, corpus_bleu, meteor_lite, ngrams, rouge_l, toks,
    extract_numbers, numeric_accuracy, supported_values,
)
