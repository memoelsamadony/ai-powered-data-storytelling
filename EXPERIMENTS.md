# Experiment plan — model scale vs tone moderation

> **Superseded by [`EXPERIMENT_PLAN.md`](EXPERIMENT_PLAN.md).** This file names the right
> questions but specifies no control condition, no independent judge, no sample size and
> no statistical test, so it cannot produce a defensible result on its own. The protocol
> operationalises E1–E5 below, adds a paraphrase control and a judge-validation study, and
> fixes the instrumentation defects that make the current Part B numbers uninterpretable.
> Kept here as the design rationale.

Turns the four metric families on slide 13 of the interim presentation into runs the
backend can execute and record. Every experiment below writes `Run` + `StageResult`
rows, so the numbers come out as queries rather than manual bookkeeping.

## The metrics we committed to

| Family | Metric | Where it comes from |
|---|---|---|
| Faithfulness | % outputs with ≥1 semantic error; % of stated numbers correct | Quintd reproduction |
| Analytical correctness | per-operation accuracy: lookup, comparison, trend, rate, causal | DataTales reproduction |
| **Tone calibration (novel)** | alarmism 1–5 before vs after; emotive spans removed; faithfulness re-checked after moderation | ours |
| Human comparison | BLEU / ROUGE-L / METEOR vs the human story; user study on trust, engagement, readability, preference | slides 9 and 16 |

## The confound to design around

**Scaling the generator and the moderator together tells us nothing.** If a 35B
generator paired with a 31B moderator produces a calmer final story than a 4B/12B
pair, we cannot say whether the generator wrote something better or the moderator
fixed it better. Every experiment below therefore varies **one** of the two.

Two methodological rules that follow:

1. **Fix the raw stories across moderator conditions.** Generate once per generator,
   persist it, and feed the *same* raw story to every moderator variant. Otherwise
   generator sampling variance swamps the moderation effect we are trying to measure.
2. **The judge must not be the moderator.** On the `mid` and `large` tiers today
   `judge == moderator == gemma4:31b`, so the model grades its own rewrite. For every
   experiment set the judge to a different family (`qwen3.6:35b`) — or keep Opus 4.7
   for the reported numbers, as the reproductions did, and use a local judge only for
   the live demo.

---

## E1 — Generator × moderator factorial (the core experiment)

| | moderator `gemma4:12b` | moderator `gemma4:31b` |
|---|---|---|
| generator `qwen3.5:4b` | cell A | cell B |
| generator `llama3.1:8b` | cell C | cell D |
| generator `qwen3.6:35b` | cell E | cell F |

n = 10 stories per cell. Record per run: `alarmism_before`, `alarmism_after`,
`Δalarmism`, spans removed, % numbers correct before and after, causal claims flagged.

**Hypotheses**

* **H1** `alarmism_before` falls as generator size rises. Bigger models are more
  measured unprompted, so there is less for the moderator to do.
* **H2 (the interesting one)** `Δalarmism` is *largest* in cell B: small generator,
  large moderator. If it holds, the claim is
  **"tone moderation substitutes for generator scale"** — a 4B generator plus a
  strong moderator lands in the same tone band as a 35B generator, at a fraction of
  the memory. That is a practical result, it fits on a laptop, and it is the
  strongest argument for the architecture.
* **H3** The moderator's *incidental* fact correction grows with moderator size
  (see E4).
* **H4** Causal claims flagged stays high in every cell. Both reproductions put
  causal accuracy at 0% for 4B and 12B; if 31B/35B does not move it, the capability
  wall is confirmed at scale and the separate factual/causal checker is justified
  everywhere, not just for small models.

**Cost.** ~3–5 min per run at the measured 9.5 tok/s for the 31B models → 60 runs ≈
3–4 h. Run overnight with `--repeat`.

```bash
python manage.py run_pipeline --dataset measles --tier demo --repeat 10
python manage.py run_pipeline --dataset measles --tier mid  --repeat 10
python manage.py run_pipeline --dataset measles --tier large --repeat 10
```

(The three shipped tiers cover the diagonal. Cells B, C and E need a tier entry with
that generator/moderator pair — one dict literal in `ollama_client.TIERS`.)

---

## E2 — Specificity and idempotence (cheap, high value)

The report already claims the agent is *specific*: "many edits on the alarmist story,
few on the already-measured one." That is currently asserted, not measured.

Run the moderator on three inputs and count spans removed:

| Input | Prediction |
|---|---|
| the raw alarmist LLM story | many spans |
| the human baseline story | few spans |
| **the already-moderated story** | ≈ zero spans |

The third row is an **idempotence test** and it is the one worth running first. If
moderating an already-moderated story keeps stripping content, we have quantified the
over-correction failure the project's own judge verdict flagged qualitatively
("the moderator stripped genuinely useful gravity"). Either result is publishable:
specificity confirmed, or a named failure mode with a number attached.

**Cost.** ~20 moderation calls, well under an hour.

---

## E3 — Prompt ablation: does the rubric matter, or is it just scale?

Three moderator prompts, same raw stories, same model:

* **V0** the original `pipeline.py` instruction ("detect and rewrite alarmist tone")
* **V1** V0 + *"preserve legitimate urgency and the most informative framing"*
* **V2** V1 + *"prefer per-capita rates over raw counts when comparing places of
  different size"*

Measure Δalarmism, **insight retention** (did the rewrite keep the ~95% herd-immunity
point?), and **rate usage** (did it compare Germany and Nigeria per-million rather
than by raw counts?).

This tests exactly the two fixes the project's own judge verdict recommended, and it
separates "the agent works" from "the big model works". If V2 beats V0 at constant
model size, the contribution is the *rubric*, not the parameter count — a much better
story for a course project than "we used a bigger model".

**Cost.** 3 variants × 10 stories, moderator only ≈ 1.5 h.

---

## E4 — Silent fact correction (quantifying the headline finding)

The project's most striking qualitative result: the moderator corrected a hallucinated
number ("over a million" → 14,999) **without flagging it**. Measure it at scale.

For every run in E1, compare the numbers stated in the raw story against the moderated
story and against the data:

* numeric accuracy before vs after moderation
* **silent-correction count**: a figure that changed and became correct, but appears in
  neither `emotiveSpans` nor `factualCheck`

A high silent-correction rate is the empirical case for a separate factual checker,
which is currently argued from a single anecdote. This costs nothing extra — it is
derived from artefacts E1 already produces.

---

## E5 — Both directions of miscalibration

The two-dataset argument is that the agent *calibrates* rather than merely *suppresses*:
it should pull an alarmist story down **and** hold a falsely reassuring one up.

The WHO GHO dataset is not collected yet, but this does not have to block: **the measles
data already supports both framings.** Cases fell from 3.85 M (1980) to 675 k (2024) —
a genuine progress story — while coverage stalled below 95% — a genuine alarm story.
Prompt the generator for each framing from the same table:

| Framing prompt | Expect the moderator to |
|---|---|
| "write an urgent warning" | *lower* alarmism, keep the coverage-gap fact |
| "write an optimistic progress story" | *raise* gravity, restore the stalled-coverage caveat |

If alarmism moves toward the middle from both sides on one dataset, the calibration
claim is evidenced now, and the GHO dataset later becomes confirmation rather than the
only evidence.

---

## Human-written stories: yes, and here is the cheapest version that works

They are not optional — task (c)/(e) in the report, slides 9 and 16. Three concrete
reasons beyond "we promised":

1. **BLEU / ROUGE / METEOR are undefined without a reference.** Slide 16 promises these
   numbers; they cannot be computed at all until a human story exists.
2. **The alarmism scale has no anchor without one.** "2.1 after moderation" means
   nothing on its own. Judge the human story on the *same* 1–5 scale and it defines the
   target band. The headline result then becomes
   **"moderation moves the LLM story into the human tone band"** — which is a far
   stronger claim than "the number went down", and it uses the novel metric directly.
3. The user study needs a human condition to compare against.

**Design, ~2 hours of team time total**

* **3 stories per dataset, one each from three different team members.** One story is
  an anecdote; three give a spread and let you report human variance — which matters,
  because if humans disagree by 1.5 points on the alarmism scale, a 0.4-point LLM
  difference is noise.
* **Write them before seeing any LLM output.** Otherwise the human baseline anchors to
  the machine's framing and the comparison is contaminated.
* Judge each human story with the same judge and prompt as the LLM stories.
* In the user study, present conditions unlabelled and counterbalance the order.

**One caveat to state up front in the report.** Expect BLEU to be *low* — the
DataTales reproduction here measured 1.54 and 2.17, and the paper's own zero-shot
models sat in the same band. That is style divergence, not failure. Report the n-gram
metrics for completeness, but do not let them carry the argument; the tone-band result
and the user study are the real evidence.

---

## Suggested order

1. **E2 idempotence** — one hour, may immediately expose the over-correction failure.
2. **Human stories** — unblocks every comparison metric, and the team can write them in
   parallel with runs executing.
3. **E1 factorial** — overnight; E4 falls out of it for free.
4. **E3 ablation** — the "it is the rubric, not the model size" result.
5. **E5 both directions** — on measles now, on WHO GHO once collected.
