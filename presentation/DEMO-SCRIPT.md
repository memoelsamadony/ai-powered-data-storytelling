# Demo script - 3:30, cached throughout

Fills the demo slot after slide 18 in `SPEAKER-SCRIPT.md`, and hands to slide 19.

**Nothing in this route waits on a model.** Every run is replayed from the
database and every figure is served from a stored selection. Measured on this
machine: a full four-stage run completes in **4.6 seconds**, and its backend log
shows four requests and zero model calls. The same route live is around two and
a half minutes, most of it one moderation stage.

**Timing, measured rather than estimated.** The spoken lines total 538 words:
about **3:35** at 150 wpm, or **3:03** if you drop section 4, which is marked as
the cut. Pointing takes longer than reading, so rehearse it once with a timer.

The one thing that can still break this is a cold cache, so the pre-flight is
not optional.

---

## Pre-flight (do this before you walk in)

```bash
cd backend
.venv/bin/python manage.py migrate                 # 0007 and 0008 must be applied
.venv/bin/python manage.py loaddata cached_runs    # 28 runs, 145 stage results
.venv/bin/python manage.py runserver 8000
```

```bash
npm run dev                                        # must be port 3000, see below
```

Then warm the figures. Each dataset is cached **per model**, and the studio and
the results page ask different models, so all four keys are needed:

```bash
for d in measles who-health; do
  for m in gemma4:31b gemma4:12b; do
    curl -s -o /dev/null -X POST http://localhost:8000/api/charts/suggest \
      -H 'Content-Type: application/json' \
      -d "{\"datasetId\":\"$d\",\"tier\":\"demo\",\"n\":3,\"model\":\"$m\"}"
  done
done
```

Cold this takes about two minutes, most of it loading `gemma4:31b`. Warm it is
under a tenth of a second. Verify before you trust it:

```bash
sqlite3 backend/db.sqlite3 'select source, model from storytelling_chartselection;'
```

Four rows for the two datasets means the demo is safe. Fewer means a figure will
be computed live in front of the room.

**Port 3000 is not a preference.** The backend only allows that origin, and on
any other port the interface silently falls back to sample data and looks
completely normal while showing nothing real.

### Last checks

- `http://localhost:3000/generate` open, **measles selected, both Continues
  pressed**, sitting on the idle panel with the toggle visible. The toggle only
  exists before a run starts.
- The toggle reads **Cached**, dark. If it is grey, `loaddata` did not run.
- A second tab on `http://localhost:3000/results`.

---

## The route

| | Screen | Budget |
|---|---|---|
| 1 | `/generate` - the cached run | 1:50 |
| 2 | `/generate` - the figures panel | 0:35 |
| 3 | `/results` - what this machine produced | 0:40 |
| 4 | `/reproductions` - where the problem came from | 0:25 - **cut first** |

---

### 1 - The run (1:50)

Press **Run the pipeline**. It completes in about five seconds; talk over it.

> This is the studio. I picked measles, and I am replaying a stored run rather
> than generating one - live is two and a half minutes on this laptop. Every
> number on screen came out of a real run.

Point at the three stage cards.

> Three stages, and the model each used. A four-billion model drafts; a
> twelve-billion one moderates the tone and checks the numbers.

Stage 2, the redlines. **This is the centre of the demo - spend the time here.**

> This is the contribution. Every highlighted span is an edit the moderator made
> and had to justify. The headline went from "The Vaccine Gap: Why High Coverage
> Doesn't Always Mean Safety" to something flat. "Plummeted" became "decreased".
> A "staggering 15,000" became "higher infection rates".

Then point at the last edit, the long one.

> This is the one I would look at. The draft compared raw case counts between
> countries of completely different sizes. The moderator caught the dropped
> denominator and rewrote it per capita: Nigeria 65.8 per million, Germany 7.6,
> India 12.9.
>
> That is not softening language. That is catching a comparison that was not
> valid.

The tone numbers.

> The draft came in at 1.5 on our in-pipeline judge, the moderated story is 2.0.
> The single arrow is not the point - **eight of the nine measles runs in this
> database land on exactly 2.0**, from drafts ranging 1.5 to 4.0. It converges
> rather than softens.

Stage 3.

> Then a separate pass checks every claim against the table. Five verified, one
> flagged. Flagged claims are usually causal, and a table of cases and coverage
> cannot support a because. That is the reproduction finding, showing up live.

> **DELIVERY:** do not read the story text aloud. Point at the denominator edit
> and the tone bar; those two carry the whole section. If asked why the draft
> scored 1.5, the blind Opus judge put that same draft at 3.4 - the disagreement
> is why we report both.

### 2 - The figures (0:35)

Point at the right-hand panel.

> While that ran, the moderator also read the table and chose these figures.
> Not from a prompt - the system computes which of seventeen forms the columns
> can honestly carry, and the model ranks what it is given.

Point at the footer line.

> Three of fourteen drawable figures, and it names the model that chose them.
> Each carries why that form. This one says the two measures peak forty-five
> times apart, so it must be indexed rather than raw.

> **DELIVERY:** this is the newest work, so it is worth the thirty seconds.
> If asked: the figures come from `gemma4:31b` while the story is moderated by
> `gemma4:12b`, because choosing a figure is one short structured call and can
> afford the bigger model.

### 3 - What this machine produced (0:40)

Second tab, `/results`, scroll to **This deployment**.

> Not the study - these are the runs actually executed on this laptop. Thirty
> complete runs. Alarmism 2.92 before moderation, 2.17 after. Roughly seven
> edits a run.
>
> And facts preserved is 33 percent, which we show rather than hide. Two thirds
> of moderated stories still carry a claim the table does not support. The tone
> agent is not a fact-checker - which is why there is a third stage.

> **DELIVERY:** volunteer the 33 percent. Being the one to point at your own
> weakest number is what makes the rest credible.

### 4 - Where the problem came from (0:25) - CUT THIS IF LATE

Third tab or nav, `/reproductions`.

> The evidence that started this. We reproduced two published systems on local
> models. Faithfulness improves with a modern model - eighty percent of outputs
> carried an error in the paper, eighteen here.
>
> But look at the causal column: zero, for both models. A table of prices and
> volumes cannot confirm a cause however good the model is. So the gap was never
> "can it read the numbers". It was everything the numbers do not contain -
> which is where tone lives.

Hand to slide 19.

---

## If something goes wrong

| What you see | Do this |
|---|---|
| **Cached** is grey | `loaddata cached_runs` did not run. Switch to another dataset, or talk to the slides. Do **not** press Live. |
| A figure panel spins | That cache key is cold. Keep talking about the story; the panel fills itself. Never wait in silence. |
| Interface looks right but numbers are wrong | Next is not on port 3000, so it is on sample data. Say so, and move to the slides. |
| A stage errors | Press **Run again** and switch the toggle to the other dataset. |
| Anything else | Slide 19 exists. A demo that ends early and honestly beats one that is debugged in front of the room. |

**Never press Live on stage.** It is there so you can prove the cached run is
real if someone challenges it - and if that happens, start it, say "this is the
same pipeline computing rather than replaying, it takes about two minutes", and
go back to the slides while it runs.

---

## Questions this route invites

**"Is the cached run real, or a recording?"**
It is a real run, stored. Same rows the interface would write live, replayed
from the database. Press Live and the identical code path computes instead.

**"Why does the moderated tone always land on 2.0?"**
That is the finding, not a constant. Eight of nine measles runs land there from
drafts spanning 1.5 to 4.0. Across all five series with human counterparts,
3.74 to 2.09 against a human median of 2.00.

**"Your judge and your moderator are both Gemma."**
Not for the numbers we report. The authoritative rating is Claude Opus judging
blind, one story at a time, a family that appears nowhere else in the pipeline.
The local judge is kept as a cheap second rater so the two can be compared.

**"Does it work on a table you have not seen?"**
Figures, yes - upload a CSV and it types the columns and chooses forms. A story,
not yet: the generator needs to be told which column is the measure and which is
the comparison, and guessing that from column names is how you get a confident
story about the wrong number.
