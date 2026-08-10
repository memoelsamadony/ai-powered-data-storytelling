# Experiment protocol — emotional-tone moderation

**Status:** pre-registration. Written before the runs it describes.
**Scope:** the experiments that produce the numbers in the final report.
**Supersedes:** the sketches E1–E5 in [`EXPERIMENTS.md`](EXPERIMENTS.md), which named the
right questions but specified no control condition, no independent judge, no sample
size and no statistical test. This document operationalises them.

Everything in [`RESULTS.md`](RESULTS.md) Part B is a **smoke test of the pipeline, not a
result**, and should be cited as such until this protocol has been executed. Part A (the
Quintd and DataTales reproductions) is unaffected and stands.

---

## 0. Why a new protocol

`RESULTS.md` reports three pipeline runs. They demonstrate that the system works
end to end. They cannot support a claim about whether tone moderation works, for
seven separate reasons — five of them defects in the measuring instrument rather
than in the pipeline.

| # | Problem | Where | Consequence |
|---|---|---|---|
| 1 | **The judge is the moderator.** `demo` is gemma4:12b/gemma4:12b; `mid` and `large` are gemma4:31b/gemma4:31b | `backend/storytelling/ollama_client.py`, `TIERS` | The novel metric is self-assessed in *every* runnable configuration |
| 2 | **No control condition** | — | Any LLM rewrite might lower alarmism. Nothing separates "the rubric works" from "a rewrite happened" |
| 3 | **Δalarmism is confounded with the generator** | `RESULTS.md` §B1 | All three runs converge on 2.0; Δ measures how alarmist the generator happened to be |
| 4 | **BLEU is structurally zero** — unsmoothed, sentence-level, single-pair | `services.py`, `_bleu`: `if min(precisions) == 0: return 0.0` | Reported as 0.0 in both compare rows; not comparable to Part A's corpus BLEU |
| 5 | **`factsPreserved` is not a measurement** — `not any(status == "flagged")` | `services.py`, `compare` | Restates the fact-checker's own output; carries no independent information |
| 6 | **The human baseline's alarmism is a hardcoded `2.5`** | `services.py`, `_human_variant` | The scale has no anchor, and a fabricated constant is rendered in the interface |
| 7 | **n = 3, one dataset, no intervals, no seed** | — | No inference is possible; generation is not reproducible |

Two further items block reproduction rather than inference:

- `backend/db.sqlite3` is in `.gitignore`, and it is the cited source for every Part B
  number. Those figures currently cannot be re-derived from the repository — the exact
  defect `RESULTS.md` flags for Zephyr's 87%.
- `to_story_set` substitutes `3.0` and `2.0` when an alarmism rating is missing
  (`run.raw_alarmism or 3.0`). A missing measurement is indistinguishable from a real one.

Phase 0 fixes all of the above. Nothing in Phase 1 runs before it lands.

---

## 1. Design principles

Four commitments that the rest of the document follows from.

**1.1 The judge is never the moderator.** The primary judge is **Opus 4.7**, using a
fixed rubric, for consistency with both reproductions in Part A. A secondary local judge
from a different family (`qwen3.6:35b`, or `qwen3.5:9b` on the small machine) rates every
story as well, so inter-judge agreement is reported rather than assumed.

**1.2 Everything is paired.** Raw stories are generated **once**, persisted, and the
*identical* raw story is fed to every downstream condition. Generator sampling variance
otherwise swamps the moderation effect. This is what makes the tests paired, and pairing
is where the statistical power comes from at n = 30.

**1.3 Every treatment has a control.** A tone-moderation condition is only interpretable
against a rewrite that carries no tone instruction. See C1 below.

**1.4 The unit of analysis is the story.** One story contributes one observation per
condition. Multiple judgments of the same story are averaged (or modelled), never counted
as independent samples.

---

## 2. Phase 0 — instrumentation (blocking)

Each item has an acceptance criterion. Phase 1 does not start until all nine pass.

| # | Change | File | Accept when |
|---|---|---|---|
| P0.1 | Split `judge` out of the tier config; allow an external judge (Opus 4.7) and a distinct local judge. Judge model recorded per `StageResult` | `ollama_client.py`, `services.py` | No experiment run has `judge == moderator` |
| P0.2 | Judge the human baseline on the same 1–5 rubric; delete the hardcoded `2.5` | `services.py` `_human_variant` | `Run.human_alarmism` is populated from a judge call |
| P0.3 | Replace `factsPreserved` with **numeric accuracy computed in Python against the CSV**: extract every figure from the text, match against `measles_merged_tidy.csv`, report correct/total | new `metrics.py` | No LLM in the factual-accuracy path |
| P0.4 | BLEU: add Chen & Cherry smoothing (method 1) **and** report BLEU-1/BLEU-2 separately; aggregate corpus-level across runs | `services.py` `_bleu` | A 120-word pair returns a non-zero, interpretable value |
| P0.5 | `--from-run` on the moderate stage, so one persisted raw story feeds many conditions | `run_pipeline.py`, `services.py` | The same `raw_paragraphs` hash appears under ≥2 condition labels |
| P0.6 | Pin `seed` (and record `temperature`, `num_ctx`, `num_predict`, model digest) in the Ollama options and in `StageResult.usage` | `ollama_client.py` `_one_call` | Two runs with the same seed and prompt produce identical text |
| P0.7 | Remove the fabricated fallbacks `or 3.0` / `or 2.0`; missing means `None` and is excluded from analysis | `services.py` `to_story_set` | A run with no judge result cannot render a number |
| P0.8 | Export runs + stages + judgments to `experiments/<id>/runs.jsonl` and commit them; drop `backend/db.sqlite3` from the analysis path | new management command, `.gitignore` | Every reported figure is re-derivable from committed files |
| P0.9 | Portable hardware probe — replace `TOTAL_RAM_GB = 32.0` and the macOS `sysctl iogpu.wired_limit_mb` call with real detection per platform | `ollama_client.py` | `/api/health` reports correct memory on a 16 GB Linux machine |

P0.9 is not cosmetic: on the small machine the backend currently reports 32 GB / 24 GB
usable and would mark tiers co-resident that cannot be, skipping eviction and thrashing.

---

## 3. Materials

**Dataset.** `emotional-tone-moderation/data/measles_merged_tidy.csv` — 9,959 rows,
1980–2024, country × year, columns `mcv1_pct`, `measles_cases`, `population`,
`incidence_per_million`. The prompt table is built by `datasets.build_prompt_table`.

Measles alone supports **both** directions of miscalibration, so the calibration claim can
be tested now rather than waiting on the WHO GHO secondary dataset:

- cases fell 3.85 M (1980) → 675 k (2024) — a genuine progress story, whose failure mode
  is false reassurance;
- MCV1 coverage has sat at ~81–84% against a ~95% herd-immunity threshold — a genuine
  alarm story.

**Framing conditions (F).** The same table, three generator system prompts:

| Code | Framing prompt intent |
|---|---|
| `F-alarm` | "write an urgent warning" |
| `F-neutral` | the current prompt ("short, vivid, attention-grabbing") |
| `F-hope` | "write an optimistic progress story" |

This is the fix for defect #3. Spontaneous generations cluster; framing spreads
`alarmism_before` across the scale so there is something for the moderator to move.

**Moderator conditions (M).**

| Code | What it is | Purpose |
|---|---|---|
| `C0` | no rewrite; the raw story judged a second time | judge test–retest → the noise floor |
| `C1` | **paraphrase control** — "rewrite this story in your own words", no tone instruction, same model, same temperature, same length target | separates *the rubric* from *a rewrite happened* |
| `C2` | the tone-moderation agent (current V2 rubric) | the treatment |

**Rubric variants (V), for the ablation.**

| Code | Prompt |
|---|---|
| `V0` | the original `emotional-tone-moderation/pipeline.py` instruction — "detect and rewrite alarmist tone" |
| `V1` | V0 + "preserve legitimate urgency and the most informative framing" |
| `V2` | V1 + "prefer per-capita rates over raw counts when comparing places of different size" |

`C2` and `V2` are the same condition; it is run once and used in both analyses.

**Human baselines.** Three stories, one each from three different team members, written
**before seeing any model output** and with the chart and table on screen. Judged on the
same 1–5 rubric by the same judges. Their median defines the *human tone band*, which is
the anchor for the primary hypothesis. Without this the alarmism scale has no zero point.

---

## 4. Hypotheses

### Primary — pre-registered, one test

> **H1 (calibration).** Tone moderation moves a data story *toward* the human tone band,
> from either direction.
>
> Let `d_before = |alarmism_before − H|` and `d_after = |alarmism_after − H|`, where `H`
> is the median alarmism of the three human baselines.
>
> **H1:** `d_after < d_before`.
> **Test:** Wilcoxon signed-rank, paired, one-tailed, α = .05, n = 30 stories pooled
> across the three framings, condition `C2`.

This is the primary because it states the project's actual claim. "Alarmism went down" is
compatible with a moderator that simply flattens everything — the failure mode the
project's own judge verdict already observed. Distance-to-band is direction-agnostic, so a
falsely reassuring story must be pulled *up* to count as a success.

### Manipulation check — runs before H1

> **M1.** `alarmism_before` differs across `F-alarm` / `F-neutral` / `F-hope`.
> **Test:** Kruskal–Wallis, α = .05.

If M1 fails, the framings did not induce the spread and H1 is untestable as designed.
That outcome is reported, not hidden, and the fallback is §7 E5 (pair a weak generator
with a strong moderator instead).

### Secondary — Holm–Bonferroni corrected family

| ID | Hypothesis | Test |
|---|---|---|
| **H2** | The rubric beats a plain rewrite: `Δd(C2) > Δd(C1)` | Wilcoxon signed-rank on the paired difference (both derive from the same raw story) |
| **H3** | The effect is *calibration*, not drift: regressing `Δalarmism` on `alarmism_before` gives slope **b < 0**, steeper than the slope produced by judge noise alone in `C0` | OLS + permutation test of `b(C2) − b(C0)` |
| **H4** | Moderation does not damage factual accuracy | **McNemar** on paired per-claim numeric correctness, before vs after. Non-inferiority margin pre-set at **5 percentage points** |
| **H5** | The rubric matters more than model size: `V2 > V1 > V0` at constant model | Friedman across the three variants, post-hoc Wilcoxon with Holm |
| **H6** | The moderator is *specific*, not indiscriminate: moderating an already-moderated story removes fewer spans than the first pass | Wilcoxon signed-rank on span counts (idempotence) |
| **H7** | Moderation reduces unsupported causal claims | McNemar on per-claim causal-flag status, before vs after |
| **H8** | Scale changes the moderation effect | Mann–Whitney U on `Δd` between the `demo` and `mid` tiers |
| **H9** | Chart tone moves with text tone (see §8) | Wilcoxon signed-rank on chart alarmism, before vs after |

Every test reports an **effect size and a bootstrap 95% CI**, not just a p-value:
matched-pairs rank-biserial *r* for Wilcoxon, Cliff's δ for Mann–Whitney, Kendall's *W*
for Friedman, odds ratio for McNemar. 10,000 BCa resamples.

---

## 5. Sample size

n = **30 stories per cell** (10 per framing × 3 framings).

Paired Wilcoxon at α = .05, two-tailed, 80% power detects **d ≈ 0.54** at n = 30 (paired
*t* requires n ≈ 34 for d = 0.5; the Wilcoxon ARE of 0.955 puts it at effectively the same
place). A moderator that reliably shifts alarmism by ~0.5 points on a 5-point scale is at
the edge of detectability at n = 30 — which is the honest reason not to run n = 10.

For H4 and H7 the unit is the *claim*, not the story: 30 stories × ~8 numeric claims
≈ 240 paired observations, which is ample for McNemar.

---

## 6. Machine allocation

The two development machines have disjoint capabilities and disjoint installed models.
The split below is deliberate, not incidental.

| | Machine A | Machine B |
|---|---|---|
| Hardware | RTX 4050 laptop, 6 GB VRAM, 15 GB RAM | Apple M1 Max, 32 GB unified |
| Tier | `demo` — qwen3.5:4b → gemma4:12b | `mid` — llama3.1:8b → gemma4:31b |
| Role | **primary**: E1–E4, E6 | **scale axis**: E5 |
| Est. throughput | ~2–3 min per full run | ~4–6 min per full run (measured 228–362 s) |

**Run the primary experiments on the `demo` tier.** qwen3.5:4b and gemma4:12b are the
exact models characterised in Part A — 52.0% and 18.0% Quintd error rate, 0.9% and 12.2%
masked-number factuality, 0% causal accuracy for both. Running Part B on the same models
collapses two disconnected halves of the report into one argument: *the same models we
characterised behave like this under tone moderation.* At present Part A and Part B share
no models and cannot be compared at all (`RESULTS.md`, limitation 4).

`large` (qwen3.6:35b) is batch-only and out of scope here; it stays a future-work note.

---

## 7. The experiments

### E1 — Calibration (the core experiment)

**Question.** Does the moderator move stories toward the human tone band from both
directions, and does it do so more than a plain rewrite?

**Design.** 3 framings × 10 stories = 30 raw stories, generated once and persisted.
Each raw story then goes through `C0`, `C1` and `C2`. Fully within-subjects.

**Procedure.**
1. Generate 30 raw stories on Machine A, seeds `0..9` per framing. Persist.
2. Judge each raw story: primary judge ×2 (test–retest → `C0`), secondary judge ×1.
3. `C1`: paraphrase each raw story. Judge.
4. `C2`: moderate each raw story with `V2`. Judge.
5. Fact-check raw and moderated with the Python numeric checker (P0.3) and the LLM
   fact-check agent (kept separate — they measure different things).

**Records per story.** framing, seed, generator, moderator, judge, `alarmism_before`,
`alarmism_after` ×2 judges, `d_before`, `d_after`, spans removed, numeric claims
correct/total before and after, causal claims flagged, wall-clock, tokens, decoding path.

**Analysis.** M1, then H1, then H2 and H3.

**Cost.** 30 generate + 30 paraphrase + 30 moderate + 60 fact-check ≈ 150 local calls
≈ 4–6 h on Machine A. ~210 judgments.

---

### E2 — Rubric ablation

**Question.** Is the contribution the rubric or the model size?

**Design.** The same 30 raw stories from E1 → `V0`, `V1`, `V2`, same model, same
temperature. `V2` is reused from E1, so only `V0` and `V1` are new.

**Measures.** Δalarmism; **insight retention** — does the rewrite keep the ~95%
herd-immunity point?; **rate usage** — does it compare Germany and Nigeria per-million
rather than by raw counts? Both are checkable against the CSV rather than judged.

**Analysis.** H5.

**Why it matters.** If `V2` beats `V0` at constant model size, the contribution is the
rubric — a far better result for this project than "we used a bigger model." Both fixes in
`V1`/`V2` came from the project's own judge verdict, so this closes that loop with a number.

**Cost.** 60 moderation calls, 120 judgments. ~2 h.

---

### E3 — Specificity and idempotence

**Question.** Does the moderator edit *selectively*, or does it flatten whatever it is
given? The report currently asserts specificity; it has never been measured.

**Design.** Run the moderator on three input types and count spans removed:

| Input | Prediction |
|---|---|
| raw `F-alarm` story | many spans |
| human baseline story | few spans |
| **already-moderated story** | ≈ zero spans |

The third row is the idempotence test and is the one to run first. If moderating an
already-moderated story keeps stripping content, the over-correction failure the project's
own judge verdict flagged qualitatively now has a number attached. Either outcome is
reportable: specificity confirmed, or a named failure mode quantified.

**Analysis.** H6.

**Cost.** 30 + 3 moderation calls. ~1 h. Run this first — it is cheap and it can
invalidate assumptions the other experiments rest on.

---

### E4 — Silent fact correction

**Question.** How often does the *tone* agent correct a number without flagging it?

This is the project's most striking qualitative finding — the moderator changed "over a
million" to 14,999 and did not report it — and it is currently argued from a single
anecdote. It is also the empirical case for keeping the fact-checker separate.

**Design.** No new model calls. Derived from E1/E2 artefacts:

- numeric accuracy before vs after moderation (Python, against the CSV);
- **silent-correction count** — a figure that changed *and became correct* but appears in
  neither `emotiveSpans` nor `factualCheck`;
- **silent-corruption count** — the mirror case: a figure that changed and became *wrong*.
  This must be reported with equal prominence.

**Analysis.** H4, plus descriptive rates with exact binomial CIs.

---

### E5 — Generator × moderator scale

**Question.** Does moderator scale substitute for generator scale?

**Design.** Repeat E1's `C2` arm on Machine B at the `mid` tier (llama3.1:8b →
gemma4:31b), 30 stories, same three framings, same seeds.

The interesting cell is **small generator + large moderator**. If `Δd` there matches what a
much larger generator achieves unaided, the claim is *tone moderation substitutes for
generator scale* — a 4B generator plus a strong moderator landing in the same tone band as
a 35B generator, at a fraction of the memory. That is a practical result, it fits on a
laptop, and it is the strongest available argument for the architecture.

**Analysis.** H8.

**Cost.** ~120 calls, ~4 h on Machine B.

---

### E6 — Visual tone (depends on the chart-spec work)

**Question.** Do the same rhetorical failure modes appear in the *chart*, and does the
same rubric correct them?

The moderator's rubric already contains visualisation critique applied to prose —
*"misleading baselines and scale tricks"* and *"dropped denominators: raw counts used to
compare places of very different size."* Those are y-axis truncation and per-capita
normalisation. The agent is reasoning about chart design and then editing only the sentence.

**Design.** Generator and moderator each emit a **chart spec** alongside the story:

| Field | Alarmist choice | Calibrated choice |
|---|---|---|
| `yDomain` | truncated | zero-baselined |
| `transform` | raw counts | per-million |
| `yearWindow` | 2021–2024 (the rebound) | 1980–2024 (the full arc) |
| `palette` | alarm | neutral |
| `annotations` | the 2024 spike only | spike + 95% line + 1980 baseline |
| `aggregation` | Nigeria vs Germany, raw | both per-capita |

The moderator rewrites the spec exactly as it rewrites prose, with the same
`{original, replacement, reason}` structure. A judge rates the *rendered chart* on the same
1–5 alarmism rubric.

**Measures.** chart alarmism before/after; agreement between text tone and chart tone;
count of specs where the moderator zero-baselines a truncated axis or switches raw counts
to per-capita.

**Analysis.** H9.

**Dependency.** Requires the `dataRefs` schema field and the chart-spec plumbing. Scoped
separately; listed here so the measurement design exists before the feature is built.

---

## 8. Judge validation study

The novel metric is model-assigned. Its credibility rests entirely on showing the
instrument is reliable — more than on any additional runs.

**Design.** All four team members independently rate the same **30 stories** (a stratified
sample across framings and conditions, presented unlabelled and in randomised order) on the
identical 1–5 alarmism rubric given to the judges.

**Reported.**

| Quantity | Statistic |
|---|---|
| Human ↔ LLM-judge agreement | Spearman ρ, and **ICC(2,k)** two-way random, absolute agreement |
| Agreement between the two LLM judges | Krippendorff's α (ordinal) |
| Judge self-consistency (test–retest, `C0`) | ICC(2,1) |
| Human inter-rater spread | ICC(2,1) across the four raters |

**Pre-committed interpretation rule.** If human ↔ judge ICC(2,k) < 0.50, the alarmism
metric is reported as **exploratory only** and the primary claim is downgraded to
descriptive. Stating this in advance is what makes the eventual number meaningful.

The human spread matters independently: if four people disagree by 1.5 points on the same
story, a 0.4-point model difference is noise, and the report must say so.

---

## 9. User study

Task (e) in the brief; also the condition that gives the viz work its own evidence.

**Design.** Between-subjects on presentation, within-subjects on story variant.
Conditions presented unlabelled, order counterbalanced:

- human baseline
- LLM raw
- LLM tone-moderated

**Presentation arms** (the visualisation manipulation): *text only* vs *text + linked
chart*. This lets the study answer a question no prior system asks: **does a calibrated
chart change trust more than calibrated text?**

**Measures.** 7-point Likert on trust, engagement, readability, perceived
objectivity; forced-choice preference; and a comprehension check with items answerable only
from the data (guards against fluency being mistaken for understanding).

**Analysis.** Friedman across the three variants per measure, post-hoc Wilcoxon with Holm;
Mann–Whitney between presentation arms. Target n ≥ 24 participants.

---

## 10. Analysis and artefacts

Everything is derived by one committed script, from committed inputs. No figure in the
report may exist only in a local database.

```
experiments/
  protocol.md -> this file
  e1-calibration/
    config.json          # models, seeds, temps, num_ctx, prompt hashes, model digests
    raw_stories.jsonl    # the 30 persisted generations
    conditions.jsonl     # C0 / C1 / C2 outputs, keyed by raw-story hash
    judgments.jsonl      # every rating: story id, judge, rubric version, score, rationale
    facts.jsonl          # per-claim numeric checks against the CSV
  e2-ablation/ ...
  e3-idempotence/ ...
  e5-scale/ ...
  human-baselines/
  judge-validation/
  analysis/
    analyse.py           # reads the jsonl, writes every table and figure
    results.csv
    figures/
```

**Reproducibility record per run:** model tag **and digest**, seed, temperature, `num_ctx`,
`num_predict`, prompt hash, rubric version, decoding path (grammar vs fallback), wall-clock,
token counts. `StageResult` already carries most of this; P0.6 and P0.8 finish it.

**Reporting rules.**

1. Effect size and 95% CI beside every p-value.
2. Holm–Bonferroni across the secondary family; the primary test stands alone.
3. Null and negative results reported with equal prominence — including the
   silent-corruption count in E4 and any framing that failed its manipulation check.
4. Every number traceable to a committed file. If it cannot be re-derived, it does not
   go in the report.

---

## 11. Execution order

| Order | Step | Blocking? | Est. |
|---|---|---|---|
| 1 | **Phase 0** — all nine instrumentation fixes | yes | ~1 day |
| 2 | **Human baselines** — 3 stories, written before any model output is seen | yes (anchors H1) | ~2 h team time |
| 3 | **E3 idempotence** — cheapest, may expose over-correction immediately | no | ~1 h |
| 4 | **E1 calibration** — the core run | yes | overnight, Machine A |
| 5 | **E2 ablation** | no | ~2 h |
| 6 | **E4** — derived from E1/E2, no new calls | no | analysis only |
| 7 | **E5 scale** — Machine B, parallel with 5–6 | no | overnight |
| 8 | **Judge validation** — 4 raters × 30 stories | yes (gates the claim) | ~2 h team time |
| 9 | **E6 visual tone** — after the chart-spec feature lands | no | — |
| 10 | **User study** | no | separate schedule |

Steps 2 and 8 are the only ones needing all four members. They are also the two that
convert the alarmism metric from *"we asked a model"* into *"we used a validated
instrument"*, so they should be scheduled first, not last.

---

## 12. Threats to validity

Stated in advance, and each carries its mitigation.

1. **LLM-as-judge.** Every tone number is model-assigned. Mitigated by an independent
   judge family, test–retest, and the human agreement study in §8 — with a pre-committed
   downgrade rule if agreement is poor.
2. **Single dataset.** All conclusions are measles × MCV1. The WHO GHO secondary dataset
   would make the calibration claim cross-domain; until it is collected, the both-directions
   result rests on framing prompts over one table. Scope claims accordingly.
3. **The framing manipulation may not take.** M1 tests this explicitly. A generator that
   writes calmly regardless — which `llama3.1:8b` already did once — invalidates the E1
   design; the fallback is E5's weak-generator/strong-moderator pairing.
4. **Regression to the mean mimics calibration.** A noisy judge alone produces a negative
   slope in H3. Mitigated by estimating the noise slope from `C0` and testing the
   difference, not the raw slope.
5. **Paraphrase control may be an imperfect placebo.** A large model asked to "rewrite in
   your own words" may reduce alarmism incidentally. This makes H2 *conservative* — if the
   rubric still wins, the result is stronger, not weaker.
6. **English only, one language, one domain.** Stated as a limitation; not addressed.
7. **Fact-checking is partly automated.** The Python numeric checker handles figures
   present in the table. Claims about relationships and causality remain LLM-judged, and no
   human agreement study covers those.
8. **Small n on human baselines.** Three human stories define the target band. Three is
   enough to report a spread, not enough to characterise a population; the band is reported
   with its range, never as a point.

---

## 13. What this protocol will and will not support

**Will support**, if the results come out:

- Tone moderation moves stories toward a human-anchored tone band from both directions
  (H1), and does so more than a plain rewrite (H2, H3).
- The rubric, not the parameter count, carries the effect (H5).
- Moderation does not damage — and may incidentally improve — factual accuracy (H4, E4).
- The moderator edits selectively rather than flattening (H6).
- A validated tone metric with a reported human-agreement coefficient (§8).

**Will not support**, regardless of outcome:

- Any cross-domain generalisation. One dataset.
- Any claim about causal-reasoning capability beyond what Part A already measured.
- Any per-condition claim to better than roughly ±0.5 alarmism points at n = 30.
- Human preference or trust — that requires §9, on its own schedule.
