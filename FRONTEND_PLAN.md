# Frontend and visualisation plan

**Companion to** [`EXPERIMENT_PLAN.md`](EXPERIMENT_PLAN.md). That document specifies what
gets measured; this one specifies what gets *shown*, and builds the charts that render its
hypotheses.

**Driver.** The interim-presentation feedback was that the visualisation is not present
enough and belongs *next to story generation*. This document takes that literally, and
also takes it further: the project's own thesis is that framing can mislead while staying
technically true, and that argument applies to charts at least as strongly as to sentences.

Every colour claim below was produced by running the palette validator, not by eye. The
measured output is in §1.3.

---

## 1. Current state

### 1.1 Inventory

| Page | Story shown? | Chart of the data? |
|---|---|---|
| `/` home | excerpt via `ToneToggle` | no |
| `/datasets` | no | **yes** — `DatasetChart` |
| `/how-it-works` | excerpt via `ToneToggle` ×2 | no |
| `/generate` 01 · pick dataset | no | **yes** — `DatasetChart` |
| `/generate` 02 · write human story | yes (the user writes it) | **no** |
| `/generate` 03 · pipeline runs | yes | **no** |
| `/generate` 04 · comparison | yes ×3 | no — metric bars only |
| `/results` | no | metric bars only |

Chart components today: `charts/dataset-chart.tsx` (one `ComposedChart`) and
`charts/metric-charts.tsx` (`FaithfulnessChart`, `OperationChart`, `SimpleBarChart`).
Library: Recharts 3.9.

### 1.2 The structural problem

**Every screen with a chart has no story; every screen with a story has no chart.** It is
not a styling gap — `StoryPanel` takes a `ToneVariant` and `HumanStoryEditor` takes a
string, so neither component can reach the dataset even if asked. The chart is a *dataset
preview* that disappears the moment generation starts and never returns.

A side effect worth naming: in step 02 the human writes the baseline story with no chart
and no table on screen, while the generator receives the full `build_prompt_table()` output.
The two conditions in the comparison do not have equal access to the data, which weakens
tasks (c) and (e) before a single measurement is taken.

### 1.3 Six defects, measured

**D1 — `DatasetChart` is a dual-axis chart.** It plots measles cases on a left axis
(auto domain, rescaled to thousands) against MCV1 coverage on a right axis (`domain={[0,
100]}`). Two y-scales, one plot.

This is the single most consequential item in this document. The alignment between two
independent y-scales is arbitrary, so a dual-axis chart *manufactures* a correlation that
may not be in the data — the reader sees two lines converge or diverge because of a scale
choice, not because of a relationship. It is the canonical misleading-chart technique.

For this project specifically it is an own goal. The moderator's own rubric instructs it to
find *"misleading baselines and scale tricks"*; the fact-checker flagged the moderated
story's phrase *"which corresponds with a higher rate of 65.8 cases per million"* as an
unsupported causal-adjacent link ([`RESULTS.md`](RESULTS.md) §B3). The pipeline caught that
claim in the prose — and the chart beside it asserts the same link visually, unchallenged.
The same figure is reproduced as `presentation/assets/measles_chart.png` in the interim deck.

**D2 — the chart is never beside a story.** §1.2.

**D3 — a shipped chart colour fails two palette checks.** `OperationChart` uses `#9cc2e8`
for the small-model series. Measured:

```
[FAIL] Lightness band   #9cc2e8 L 0.80   (band 0.43–0.77)
[FAIL] Chroma floor     #9cc2e8 C 0.068  (floor 0.10 — reads gray)
[WARN] Contrast         #9cc2e8 1.86:1   (below 3:1)
```

Replacement: **`#5a97dd`**, which passes every check against a white surface — lightness
and chroma in band, adjacent ΔE 15.5 protan / 15.6 normal against `#1e66b8`, contrast ≥ 3:1.

**D4 — dashed gridlines everywhere.** All four charts use `strokeDasharray="3 4"` on
`CartesianGrid`. Dashing reads as *threshold* or *projection*; on a plain grid it is noise.
Worse, `DatasetChart` also dashes the 95% herd-immunity `ReferenceLine` — where dashing is
exactly right, because that line genuinely *is* a threshold. Dashing both destroys the
distinction. Grid becomes a solid hairline; dashes are reserved for reference lines.

**D5 — colours are hardcoded hex, duplicating the tokens.** `#e0392b`, `#1e66b8`,
`#0e8f86`, `#d9dfe7`, `#8493a5` are literals inside the chart components, while
`app/globals.css` already defines `--color-alarm`, `--color-brand-blue`,
`--color-deep-teal`, `--color-hairline`, `--color-faint` with the same values. Two sources
of truth; a token change silently fails to reach the charts.

**D6 — no table view on any chart.** Every value is reachable only through a tooltip.
That fails the accessibility floor and, separately, it means no chart in the report can be
audited against the CSV without opening the code.

### 1.4 One thing that is already right

The project's alarm/calm motif validates cleanly as a diverging pair:

```
#e0392b ↔ #0e8f86 :  lightness PASS · chroma PASS
                     CVD ΔE 13.9 (deutan) / 35.0 (tritan) · normal ΔE 30.1 · contrast PASS
```

Warm ↔ cool, neutral-capable midpoint, comfortably separable under colour-vision
deficiency. Every before/after and alarmist/calibrated encoding in this plan uses it. The
4-hue categorical set (`#e0392b`, `#e8a33d`, `#0e8f86`, `#1e66b8`) also passes, with one
caveat: amber sits at 2.16:1 against white, so wherever it appears it needs direct labels
or a table view as relief — which `FaithfulnessChart` already provides.

---

## 2. The chart contract

Applies to every chart added or changed from here on. Short enough to check in review.

1. **One y-axis per plot.** Two measures of different scale → two stacked panels sharing
   the x-axis, small multiples, or both indexed to a common base. Never two scales.
2. **Colour from tokens**, via one `lib/charts/tokens.ts` module. No hex literals in
   components.
3. **Colour by job:** categorical = identity, sequential = magnitude, diverging = polarity,
   status = state. Status colours (verified / flagged / corrected) are reserved for
   fact-check state and never reused as a series colour, and always ship with an icon and a
   label — never colour alone.
4. **Solid hairline grid and axes.** Dashes only on reference lines that mark a real
   threshold.
5. **Legend whenever there are ≥ 2 series**; direct-label selectively (the endpoint, the
   extreme, the series that carries the point) — never a number on every mark.
6. **Hover by default:** crosshair + tooltip on line/area, per-mark tooltip on bar/dot.
   Hit targets ≥ 24px.
7. **A table-view twin for every chart**, toggleable, with the underlying rows. Doubles as
   the audit trail the experiment plan requires.
8. **One filter row above the charts** it scopes (country, year range) — never a filter
   inside a chart card.
9. **Validate any new palette** with the checker before shipping. Do not eyeball it.

**Theming decision to record:** the app has no dark mode — `globals.css` defines a single
light token set with no `prefers-color-scheme` or `data-theme` block. That is a legitimate
choice for a print-and-present academic project, but it should be a *stated* choice rather
than an omission, because charts built with hardcoded light-surface colours cannot be
retrofitted cheaply. Either commit to light-only in the README, or introduce dark tokens
now, before fourteen charts exist.

---

## 3. Phases

### Phase 1 — put the chart beside the story
*Answers the interim feedback directly. Everything else is optional; this is not.*

- Thread `dataset` through `GenerateExperience` → `HumanStoryEditor`, `PipelineRunner`,
  `Comparison`, and add a `dataset` prop to `StoryPanel`.
- Replace `DatasetChart` with the two-panel form (**G1**) so what lands beside the story is
  not the dual-axis chart.
- Step 02 gets the chart and a scrollable data table, so the human baseline is written with
  the same access to the data the generator has.

**Touches:** `generate-experience.tsx`, `human-story-editor.tsx`, `pipeline-runner.tsx`,
`comparison.tsx`, `story-panel.tsx`, `charts/dataset-chart.tsx`.
**Effort:** ~1 day. **Depends on:** nothing.

### Phase 2 — link the text to the chart
*The standard visualisation contribution, and it buys a metric for free.*

Hovering a sentence, an emotive span or a fact-check claim highlights the data points it
refers to; clicking a chart point scrolls to the sentence about it.

Do this from **agent-emitted references**, not a regex. Add `dataRefs: {country, yearFrom,
yearTo, field}[]` to `EmotiveSpan` and `FactCheckItem` in `backend/storytelling/schemas.py`.
The agents already read a table keyed exactly that way, and grammar-constrained decoding
will enforce the shape.

The payoff is double: the linking works, **and** a reference to a country/year/field that
does not exist in `measles_merged_tidy.csv` is a hallucination detectable in pure Python.
That becomes a grounding-accuracy metric neither Quintd nor DataTales has, and it slots
into the experiment plan as a McNemar test on before/after moderation.

**Touches:** `schemas.py`, `agents.py`, new `lib/charts/linking.ts`, `story-panel.tsx`,
`dataset-chart.tsx`.
**Effort:** ~2 days. **Depends on:** Phase 1.

### Phase 3 — chart specs and visual-tone moderation
*The contribution. Renders E6 in the experiment plan.*

The moderator's rubric already contains chart critique applied to prose — *"misleading
baselines and scale tricks"*, *"dropped denominators: raw counts used to compare places of
very different size."* Those are y-axis truncation and per-capita normalisation. The agent
is reasoning about chart design and then editing only the sentence.

Give both agents a **chart spec** to emit alongside the story:

| Field | Alarmist choice | Calibrated choice |
|---|---|---|
| `yDomain` | truncated | zero-baselined |
| `transform` | raw counts | per-million |
| `yearWindow` | 2021–2024 (the rebound) | 1980–2024 (the full arc) |
| `palette` | alarm | neutral |
| `annotations` | the 2024 spike only | spike + 95% line + 1980 baseline |
| `aggregation` | Nigeria vs Germany, raw | both per-capita |

Every field maps to a prop Recharts already accepts. The moderator rewrites the spec with
the same `{original, replacement, reason}` structure it uses for prose, and a judge rates
the *rendered chart* on the same 1–5 alarmism rubric.

**The current dual-axis chart is not deleted — it is promoted.** It becomes the canonical
alarmist exemplar in **G13**, beside the calibrated version of the same data. The defect in
D1 turns into the demo.

**Touches:** `schemas.py`, `agents.py`, new `charts/spec-chart.tsx`, `charts/chart-diff.tsx`.
**Effort:** ~3 days. **Depends on:** Phase 1; independent of Phase 2.

### Phase 4 — evidence charts
*Renders the experiment plan's hypotheses. Build after the runs produce data.*

G3, G4, G5, G11, G12 below. These are what turn "we ran experiments" into a results
section a reader can check.

**Effort:** ~2 days. **Depends on:** `EXPERIMENT_PLAN.md` Phase 1 having produced
`experiments/*/`.

---

## 4. Recommended graphs

Form chosen by the reader's job, then colour. Where a form replaces something that exists,
the reason is stated.

### Story surface

**G1 · Measles and coverage — two stacked panels** *(replaces the dual-axis chart)*
Two plots sharing one x-axis (year), vertically aligned. Top: incidence per million, area,
single hue. Bottom: MCV1 coverage %, line, with a **dashed** 95% reference line — the only
dashing on the page. Same visual juxtaposition as today, no invented correlation.
*Form:* trend over time ×2. *Colour:* one hue per panel. *Lives:* `/datasets`, generate
steps 01–04, beside every story panel.

**G2 · Coverage → incidence connected scatter**
x = MCV1 coverage %, y = incidence per million, one point per year, connected in time
order, endpoints labelled 1980 and 2024. This is the *analytically correct* form for the
question the story keeps asking — "does coverage relate to cases?" — and it shows the
trajectory and its reversals rather than asserting a relationship through scale alignment.
*Form:* relationship + time path. *Colour:* sequential ramp along time, single hue.
*Lives:* `/how-it-works`, `/datasets` as the secondary view.

**G6 · Annotated tone redline** *(not a chart — an inline diff)*
The moderated story rendered with each `emotiveSpan` shown inline: original struck through,
replacement in place, reason on hover. Replaces the detached bullet list in
`pipeline-runner.tsx`. This is the "Red Pen" idea from the Quintd dashboard applied to tone,
and it is far more legible than a list that makes the reader re-find each phrase.
*Colour:* alarm for removed, calm for replacement — the validated pair from §1.4.

**G7 · Fact-check gutter**
Verified / flagged / corrected rendered as status marks in the story's margin, aligned to
the claim, rather than as a separate list below. *Colour:* status tokens, each with an icon
and a text label — never colour alone.

**G8 · Alarmism meter, re-anchored** *(rework of `alarmism-meter.tsx`)*
Keep the 1–5 track; add the **human tone band** as a shaded region on it, and show *before*
and *after* as two ticks with a connector. The meter then renders the primary hypothesis at
a glance: did moderation move the story into the human band? Today the meter shows a number
with nothing to compare it to.
*Form:* meter against a limit. *Colour:* alarm → calm, band in neutral.

### Evidence surface

**G3 · Tone-shift dumbbell** — *the headline chart of the report*
One row per story (n = 30), x = alarmism 1–5. Two dots per row: `before` in alarm,
`after` in calm, joined by a line. Rows sorted by `alarmism_before`. The human tone band is
a shaded vertical strip.

This *is* hypothesis H1 rendered. Alarmist stories move left, falsely reassuring stories
move right, and both converge on the band — calibration made visible in one figure, in a
way no bar chart of means can achieve. It also shows the failures honestly: a story that
did not move is a dot pair on top of each other.
*Form:* before → after per item (dumbbell). *Colour:* the validated alarm↔calm pair.
*Build:* custom — Recharts has no dumbbell; compose `Scatter` + a custom shape, or plain SVG.

**G4 · Calibration scatter**
x = `alarmism_before`, y = `Δalarmism`, one point per story, fitted line, plus the `C0`
judge-noise slope as a grey reference. Renders H3: a slope significantly steeper than the
noise line is calibration rather than regression to the mean. A y = 0 rule marks "no change".
*Form:* relationship. *Colour:* one hue + grey for the control.

**G5 · Condition slopegraph**
Three columns — `C0` no rewrite, `C1` paraphrase control, `C2` tone moderation — with one
line per story connecting its distance-to-band across conditions. Renders H2. A slopegraph
is right here because the reader's question is *which condition moves stories further*, and
paired lines answer it directly where three box plots would not.

**G9 · Per-operation dumbbell** *(replaces `OperationChart`'s grouped bars)*
Seven operations, dot at the small model's accuracy → dot at the large model's, sorted by
gap. The story in this data is the *gap* (trend 40.5 → 87.3, rate 43.3 → 88.9) and,
above all, that **causal sits at 0% → 0%** — which in a dumbbell is a degenerate
zero-length mark pinned at the far left, impossible to miss. Grouped bars bury exactly that
point among fourteen similar rectangles.
*Form:* before → after per item. *Colour:* one hue, two shades — `#1e66b8` and `#5a97dd`
(the validated replacement for the failing `#9cc2e8`).

**G10 · Faithfulness with provenance** *(rework of `FaithfulnessChart`)*
Three models, error rate. Switch from status colours to **emphasis**: the model that
carries the argument in the accent hue, the others in de-emphasis grey. Add a provenance
mark on the Zephyr bar — `RESULTS.md` states its 87% has no backing artefact in the
repository, and a chart that renders a re-derived number and a quoted number identically is
making a claim the repo cannot support. A hatch fill plus a footnote is enough.

**G11 · Effect-size forest plot** — *the significance chart*
One row per hypothesis (H1…H9), x = effect size, a point estimate with its 95% CI whisker,
a vertical rule at zero. Rows whose interval crosses zero render in grey.

This is the standard way to present a family of results with their uncertainty, and it is
the direct answer to "we need to report significance." A table of p-values says which tests
passed; a forest plot says *how large the effects are and how confident we are* — which is
the thing a reviewer actually asks. Recharts `ErrorBar` makes it cheap.
*Form:* estimate + interval. *Colour:* one hue + grey; the zero rule does the work.

**G12 · Judge agreement**
x = mean human rating, y = LLM judge rating, one point per story, identity line, ICC and
Spearman ρ printed in the corner. Renders §8 of the experiment plan. Without this figure the
alarmism metric is an assertion; with it, it is an instrument with a known error.
*Form:* agreement scatter. *Colour:* single hue; the identity line is the reference.

**G13 · Alarmist vs calibrated chart pair** — *the E6 exhibit*
The same data rendered from the generator's chart spec and the moderator's, side by side,
with the changed spec fields listed between them exactly as emotive spans are listed for
prose. Truncated axis and raw counts on the left; zero baseline and per-million on the
right. Extend `ToneToggle` — already the homepage centrepiece and already described in its
own docstring as "the signature interaction" — so the switch flips **both** the sentence and
the chart. Same data, same numbers, both framings, one control.

**G14 · Table view**
Not a chart: the toggleable twin required by contract item 7, for every figure above.
Doubles as the per-figure audit trail the experiment plan requires, and as the "download
the rows behind this chart" affordance for the report.

---

## 5. Component work

| Action | Component | Note |
|---|---|---|
| new | `lib/charts/tokens.ts` | single source for chart colour, pulled from the CSS tokens (D5) |
| new | `charts/story-chart.tsx` | G1, the two-panel replacement |
| new | `charts/connected-scatter.tsx` | G2 |
| new | `charts/dumbbell.tsx` | G3 and G9 share one implementation |
| new | `charts/forest-plot.tsx` | G11 |
| new | `charts/table-view.tsx` | G14, wraps any chart |
| new | `charts/spec-chart.tsx` | G13, renders a chart spec |
| new | `story/redline.tsx` | G6, inline annotated diff |
| change | `charts/dataset-chart.tsx` | demote to the alarmist exemplar for G13; stop using it as the default |
| change | `charts/metric-charts.tsx` | solid grid (D4), tokens (D5), `#9cc2e8` → `#5a97dd` (D3), emphasis colouring for G10 |
| change | `alarmism-meter.tsx` | add the human band and before/after ticks (G8) |
| change | `story-panel.tsx` | accept `dataset`; render G1 alongside |
| change | `generate/*.tsx` | thread `dataset` through steps 02–04 |
| change | `tone-toggle.tsx` | flip the chart as well as the sentence (G13) |

---

## 6. Sequencing

| # | Step | Blocking | Effort |
|---|---|---|---|
| 1 | Chart contract + `lib/charts/tokens.ts`; fix D3, D4, D5 across existing charts | — | ~0.5 day |
| 2 | **Phase 1** — G1 built, chart threaded beside every story | answers the feedback | ~1 day |
| 3 | G6 redline + G7 gutter + G8 re-anchored meter | — | ~1 day |
| 4 | **Phase 2** — `dataRefs` + linking (G2 lands here too) | needs backend schema change | ~2 days |
| 5 | **Phase 3** — chart spec, G13, `ToneToggle` extension | the contribution | ~3 days |
| 6 | G14 table views across the set | accessibility floor | ~0.5 day |
| 7 | **Phase 4** — G3, G4, G5, G9, G10, G11, G12 | needs experiment data | ~2 days |

Steps 1–3 answer the interim feedback on their own and depend on nothing. Step 5 is what
makes this a visualisation contribution rather than a chart added to an NLP project.

---

## 7. What this plan does and does not do

**Does:**

- Puts a chart beside every story, which is what was actually asked for.
- Removes a misleading-by-construction chart from the project whose subject is misleading
  framing, and repurposes it as the exemplar it should always have been.
- Gives the tone-moderation contribution a visual form — and a measurable one, via E6.
- Produces the figures that carry the statistical claims (G3, G4, G5, G11, G12) rather than
  leaving them as tables of p-values.
- Equalises the data available to the human author and the generator, closing a confound in
  tasks (c) and (e).

**Does not:**

- Add dark mode. §2 records that as a decision to make, not a task in this plan.
- Add a charting dependency. Everything above is Recharts 3.9 plus custom SVG for the
  dumbbell and forest plot.
- Address the user study's interface needs beyond the presentation arms named in
  `EXPERIMENT_PLAN.md` §9.
- Produce any figure from data that does not exist yet — Phase 4 is gated on the runs.
