# Final Judge (Opus 4.7) — measles tone-moderation pipeline run (2026-06-23)

Pipeline: **qwen3.5:4b** (generator) → **gemma4:12b** (emotional moderator) → **Opus 4.7** (judge), on the real
merged measles/MCV1 data. Raw outputs in `pipeline_run.txt`.

## Scorecard

| Criterion | Story A (qwen3.5:4b) | Moderated (gemma4:12b) |
|---|---|---|
| Factual faithfulness | ⚠️ 1 serious hallucination | ✅ clean |
| Tone calibration | ⚠️ over-emotive | ✅ calibrated (slightly flat) |
| Kept legitimate gravity | ✅ (good herd-immunity framing) | ⚠️ partly lost it |
| Honest comparison (rates) | ❌ raw counts only | ❌ raw counts only |

## Key findings

1. **The small model hallucinated a number.** Story A: *"Nigeria … driving cases up by over a million"* —
   the real figure is **14,999**. A ~100,000× fabrication. Consistent with your earlier DataTales finding
   (small models, sub-30% number faithfulness).
2. **Moderation removed the alarmism well.** gemma correctly flagged "skyrocketed / exploded / dangerously
   low / returning with full force" and the from-10-to-645 scale trick, and rewrote to a calibrated tone.
3. **Moderation silently FIXED the hallucination.** Because gemma re-grounded the rewrite in the supplied
   data, the false "over a million" became the correct "14,999" — even though it did **not** list the
   hallucination in its ISSUES. So tone moderation improved faithfulness as a side effect, but did not
   *detect* the factual error.

## Weaknesses to fix (these are your project's findings)

- **Tone agent ≠ fact checker.** gemma missed the false number explicitly → confirms you need a **separate
  light factual-consistency check** alongside the emotional moderator (matches your literature: DataNarrative
  verifier + Kasner/Dušek). Two agents, two jobs.
- **Over-correction toward flatness.** The moderator stripped genuinely useful gravity (the "below 95% for a
  decade" insight). Better instruction: *"reduce manipulation, but preserve legitimate urgency and the most
  informative framing."*
- **Neither used rates.** The honest comparison fix (Germany ~8/million vs Nigeria ~66/million) was available
  in the data and ignored. Add to the moderator's rubric: *"prefer per-capita rates over raw counts when
  comparing places of different size."*

## Verdict

**The architecture works and the demo is compelling.** Small model = fluent but emotive + 1 hallucination;
big model = calibrated + faithful (bonus fact-fix) but a touch dry and still count-based. This single run
already evidences the project's core thesis *and* the need for a paired factual check — strong material for
the report and presentation.
