# Presentation figures — final talk

Eight 16:9 figures for the Results section of `AI-Storytelling-Final-Presentation.pptx`,
which currently has a section header (slide 16) and no content slides behind it.

- `figN.png` — 3200 × 1800, drop straight onto a slide (the deck master is white, Arial).
- `figN.svg` — 1600 × 900 vector source, if anyone wants to edit a label.
- `make_figures.py` — regenerates all SVGs. `render.sh` re-renders the PNGs via headless Chrome.

**Every number is transcribed from `RESULTS.md`.** No figure invents a value, and where
RESULTS.md attaches a caveat to a number the caveat is drawn on the figure itself (sample
size, self-assessed judge, small denominators, unbacked Zephyr row) rather than left to
whoever is speaking. Part A (reproductions) and Part B/D (our pipeline) use different
models and are never mixed in one chart, because RESULTS.md says they are not comparable.

## Timing

7 min of content → 3.5 min frontend demo → 3.5 min questions. Roughly 14 minutes on the
clock. Three speakers share the content at about 2 minutes each; the fourth owns the demo.

## Four-person split

| Who | Slot | Owns | Figures |
|---|---|---|---|
| **Speaker 1** | 0:00 – 2:00 | The gap, and what the two reproductions settled | `fig1`, `fig2` |
| **Speaker 2** | 2:00 – 4:15 | What we built, and what it actually does | `fig5`, `fig8` |
| **Speaker 3** | 4:15 – 7:00 | What we measured, and what is still open | `fig3`, `fig4`, `fig6` |
| **Speaker 4** | 7:00 – 10:30 | Live frontend demo | — |
| All four | Q&A · 3.5 min | Answer from the index at the bottom | `fig7` + any shown figure |

## Talk track, one figure at a time

**fig1 — Faithfulness is largely solved. Tone is not.** *(Speaker 1, ~60 s)*
"We reproduced the Quintd benchmark. The paper reports that over 80% of outputs contain at
least one semantic error. On a modern 12B model we measure 18%. So the problem the field is
optimising is largely handled. What is not handled is how the story *sounds*."
→ Caveat to state: the 87% bar is quoted from the paper, we have no CSV backing it.

**fig2 — Bigger models compute better. They do not reason causally.** *(Speaker 1, ~60 s)*
The second reproduction. Scale lifts every reading and computing operation — trend 40.5% →
87.3%. Causal accuracy stays at exactly 0% for both models. A capability wall, not a size
problem, and the reason the fact-checker is a separate agent from the tone agent.
→ Caveat: the two faded bars rest on 5 and 9 claims, so they are not a ranking.

**fig5 — The pipeline, and where the time goes.** *(Speaker 2, ~70 s)*
Five stages, each writing a database row. Generator writes, judge rates alarmism, moderator
rewrites emotive spans *with a stated reason for each*, judge re-rates, fact-checker verifies.
Moderation is 52% of the run — the tone agent is the expensive part, not an add-on.

**fig8 — What the tone agent actually did.** *(Speaker 2, ~65 s)*
Seven spans on one real run, each with a reason. Two are substantive: a vague figure became
the exact value from the table, and a causal claim was downgraded to a correlational one.
Then the fact-checker flagged the moderator's *own* new phrasing.
→ Point worth making: alarmism did not move on this run, yet seven spans changed. The delta
alone under-describes what the agent does.

**fig3 — The novel metric.** *(Speaker 3, ~60 s)*
Alarmism 1–5, before and after. On the rising pertussis series 3.5 → 3.0, the first non-zero
delta in the project. On the falling measles series nothing moved — the honest finding: the
moderator can only remove alarmism the generator actually produced.
→ Say both caveats out loud: **n = 2**, and **the judge is the same model as the moderator**.

**fig4 — Groundedness.** *(Speaker 3, ~60 s)*
The strongest slide. The raw measles story stated 4 figures and 2 were unsupported; the
moderated story states 11 and all 11 are supported. The tone agent made the prose *more*
data-bound. Computed in Python against the evidence pack — no model in the loop, so it is
not exposed to the judge caveat above.

**fig6 — Where the experiments stand.** *(Speaker 3, ~45 s, hands over to the demo)*
Instruments built and verified; E1–E6 specified and ready to run; two things blocked and we
name them ourselves — an independent judge, and the human baselines. Then hand to the demo.

**fig7 — The hardware ceiling.** *(held back for Q&A)*
32 GB, ~22 GB usable, the two big models total 43.8 GB, so every run is load → infer → evict
→ load. Also why a fixed seed does not reproduce across stages.

## Question → figure index

Most answers are a figure you already showed — jump back to it rather than describing it.

| If asked | Go to | The answer |
|---|---|---|
| "Isn't the judge grading its own rewrite?" | `fig4` | Yes — known defect, protocol item P0.1. Then: groundedness has no judge in it. |
| "n = 2, why believe any of it?" | `fig1`, `fig2` | You shouldn't yet. The reproductions (n = 100, n = 30) carry the evidence. |
| "Where are the human baselines?" | `fig6` | 25 model-drafted reference stories with provenance; the human track is deliberately empty. |
| "Why so slow / why local models?" | `fig7` | The only unshown figure. 43.8 GB of models, 22 GB of usable memory. |
| "Does the tone agent break the facts?" | `fig4`, `fig8` | It improved grounding and downgraded an unsupported causal claim. |
| "What is genuinely new here?" | `fig3` | Prior work verifies facts; none moderates emotional tone. This metric is ours. |
