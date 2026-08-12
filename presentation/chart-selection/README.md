# Chart selection — figures and speaker reference

Companion to `../figures/`, which covers the tone-moderation results. This directory
covers the chart-selection work: the backend that decides which figures an arbitrary
table can carry, the three claims we corrected while building it, and five experiments.

- `reference.pdf` — 18 pages. The session record in the order the work happened, every
  figure inline, speaker script at the back. **This is the thing to read.**
- `reference.html` — its source. Figures are pulled in at build time from the SVGs.
- `figS*.svg` — 1600 × 900 vector sources.
- `figS*.png` — 3200 × 1800, drop straight onto a slide (deck master is white, Arial).
- `make_figures.py` — regenerates the SVGs. `render.sh` re-renders the PNGs.
- `build.sh` — inlines the SVGs into the HTML and prints the PDF via headless Chrome.

```bash
python3 make_figures.py && ./render.sh && ./build.sh
```

## Where the numbers come from

Every figure is transcribed from a run recorded on 2026-08-12 against local Ollama on the
project M1 Max. Sixteen selection runs in total: two models (`qwen3.5:27b`, `gemma4:31b`)
× two tables (an uploaded WHO tuberculosis CSV, the measles registry set) × three prompt
variants, plus the four baseline runs of the smaller pair.

Two measurement notes are drawn on the figures themselves rather than left to the speaker:

- **Wall clock was contaminated.** Another session held the same GPU for the first
  measurement set. Ollama's `prompt_eval_duration` and `eval_duration` are unaffected and
  are what the compute figures use; the wall-clock bars in figS3 exist to show the size of
  the error, not to compare models.
- **Correlations are computed, not quoted.** figS4 checks three model-written titles
  against the project's own measles frame at 2023, the year those figures slice to.

## Timing

Roughly 4 minutes of content plus a 1-minute demo beat, designed to slot beside the
existing Results section rather than replace any of it. Section 11 of the PDF has the
beat-by-beat script, the caveats to state out loud, and the expected questions.
