/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * The reproduction half of the results, written by
 * `python manage.py build_frontend_data` from the committed aggregate CSVs
 * under reproductions/, through the same functions `GET /results` serves.
 *
 * These figures are static - they come from evaluations that have already run,
 * not from this deployment - so a build-time snapshot is the honest form for
 * them, and the results page needs no backend to show them. The *measured*
 * half is the opposite and is fetched per request.
 *
 * Regenerate rather than edit:
 *     cd backend && python manage.py build_frontend_data
 */

import type {
  FaithfulnessResults,
  MaskedNumberResults,
  PerOperationResults,
} from "../metrics";

export const generatedFaithfulness: FaithfulnessResults =
  {
    "caption": "Re-running the reference-free error-span method on the released Quintd-1 inputs. A modern 12B model is far more faithful than the paper's baseline; a 4B model regresses. Both size and recency matter.",
    "unit": "% of outputs with >=1 semantic error",
    "source": "reproductions/paper5-quintd/metrics.csv, metrics_qwen3.csv",
    "series": [
      {
        "model": "Paper baseline",
        "value": 80.0,
        "note": "> 80% in the original study, 2023-era 7B models",
        "tone": "bad",
      },
      {"model": "qwen3.5:4b", "value": 52.0, "note": "a 2026 4B model regresses", "tone": "warn"},
      {"model": "gemma4:12b", "value": 18.0, "note": "modern 12B, fairly faithful", "tone": "good"},
    ],
  };

export const generatedPerOperation: PerOperationResults =
  {
    "caption": "Reproducing the DataTales finding that accuracy falls as analytical complexity rises, on 30 equity-market reports judged against the source table. Scale closes the gap on reading and computing - trend goes from 40.5% to 87.3% between the 4B and the 12B - but the causal operation stays at 0% for both. That is a capability wall, not a size problem.",
    "unit": "accuracy %, correct of attempted",
    "source": "reproductions/paper9-datatales/per_operation.csv",
    "models": ["qwen3.5:4b", "gemma4:12b"],
    "rows": [
      {
        "model": "qwen3.5:4b",
        "operation": "lookup",
        "label": "Lookup",
        "correct": 69,
        "total": 80,
        "pct": 86.2,
      },
      {
        "model": "gemma4:12b",
        "operation": "lookup",
        "label": "Lookup",
        "correct": 81,
        "total": 87,
        "pct": 93.1,
      },
      {
        "model": "qwen3.5:4b",
        "operation": "comparison",
        "label": "Comparison",
        "correct": 66,
        "total": 89,
        "pct": 74.2,
      },
      {
        "model": "gemma4:12b",
        "operation": "comparison",
        "label": "Comparison",
        "correct": 88,
        "total": 96,
        "pct": 91.7,
      },
      {
        "model": "qwen3.5:4b",
        "operation": "subtraction",
        "label": "Subtraction",
        "correct": 13,
        "total": 28,
        "pct": 46.4,
      },
      {
        "model": "gemma4:12b",
        "operation": "subtraction",
        "label": "Subtraction",
        "correct": 4,
        "total": 5,
        "pct": 80.0,
      },
      {
        "model": "qwen3.5:4b",
        "operation": "rate_of_change",
        "label": "Rate of change",
        "correct": 13,
        "total": 30,
        "pct": 43.3,
      },
      {
        "model": "gemma4:12b",
        "operation": "rate_of_change",
        "label": "Rate of change",
        "correct": 8,
        "total": 9,
        "pct": 88.9,
      },
      {
        "model": "qwen3.5:4b",
        "operation": "trend",
        "label": "Trend",
        "correct": 17,
        "total": 42,
        "pct": 40.5,
      },
      {
        "model": "gemma4:12b",
        "operation": "trend",
        "label": "Trend",
        "correct": 69,
        "total": 79,
        "pct": 87.3,
      },
      {
        "model": "qwen3.5:4b",
        "operation": "causal",
        "label": "Causal",
        "correct": 0,
        "total": 13,
        "pct": 0.0,
      },
      {
        "model": "gemma4:12b",
        "operation": "causal",
        "label": "Causal",
        "correct": 0,
        "total": 8,
        "pct": 0.0,
      },
      {
        "model": "qwen3.5:4b",
        "operation": "predictive",
        "label": "Predictive",
        "correct": 0,
        "total": 1,
        "pct": 0.0,
      },
    ],
  };

export const generatedMaskedNumber: MaskedNumberResults =
  {
    "caption": "The paper's own factuality metric, reimplemented: give the model the table and the human report up to a number, and check whether it predicts that number exactly. The same 115 gold targets for both of ours, so they are directly comparable. Everything lands in the paper's sub-30% regime, which is the claim that reproduces.",
    "unit": "% of masked numbers predicted exactly",
    "source": "reproductions/paper9-datatales/masked_number.csv",
    "series": [
      {"model": "GPT-4 (paper)", "value": 25.2, "correct": null, "total": null, "source": "paper"},
      {
        "model": "LlaMa2-13B (paper)",
        "value": 20.7,
        "correct": null,
        "total": null,
        "source": "paper",
      },
      {"model": "LlaMa2-7B (paper)", "value": 18.8, "correct": null, "total": null, "source": "paper"},
      {"model": "GPT-3.5 (paper)", "value": 14.6, "correct": null, "total": null, "source": "paper"},
      {"model": "qwen3.5:4b", "value": 0.9, "correct": 1, "total": 115, "source": "ours"},
      {"model": "gemma4:12b", "value": 12.2, "correct": 14, "total": 115, "source": "ours"},
    ],
  };
