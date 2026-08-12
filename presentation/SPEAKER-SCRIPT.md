# Final presentation - speaker script

**7:00 of talk across four speakers, then a 3:30 demo.** 17 slides; the figure slides carry themselves, so on those you talk to the room, not to the screen.

Generated from the speaker notes inside `AI-Storytelling-Final-Talk.pptx` by `make_final_deck.py`. Edit the notes there and rebuild rather than editing this file, or the two will disagree by Sunday.

## Who speaks when

| Speaker | Slides | Words | At 150 wpm |
|---------|--------|-------|-----------|
| Mahmoud | 1-4 | 230 | 92s |
| Okasha | 5-8 | 269 | 108s |
| Elsaadani | 9-12 | 254 | 102s |
| Ramadan | 13-16 | 264 | 106s |
| **Talk total** | **1-16** | **1017** | **6:47** |
| Demo | after 16 | - | 3:30 |
| Close | 17 | 74 | 15s |

Assignments follow the interim deck's four-part split and are meant to be swapped - the script is written per section, not per person. Whoever drives the demo should not also be the one closing it; give the standby person the last slide.

## The script

### Slide 1 - layout

`SPEAKER 1 - Mahmoud   [0:15]   running total 0:15   ~40 words`

Good afternoon. We turn a public-health table into a written story. The part we want to defend today is the second agent: it reads that story and pulls the emotional tone back to what the evidence supports.

Four parts, then a live demo.

> **DELIVERY:** do not read the names, they are on the slide. Go straight to the sentence about the second agent.

### Slide 2 - section divider — hand over here

`SPEAKER 1 - Mahmoud   [0:05]   running total 0:20   ~15 words`

First: what the field already does, and the gap we found in it.

> **DELIVERY:** one line, then move. A divider is a beat, not a slide to present.

### Slide 3 - layout

`SPEAKER 1 - Mahmoud   [0:45]   running total 1:05   ~112 words`

We surveyed seven systems. On the left: the non-LLM baselines, then the ones closest to us - DataNarrative, Data Director, MDSF - all of which pair a generator with a critic agent.

On the right, the three we reproduced ourselves rather than cited. Kasner and Dušek's faithfulness method: a modern 12B model left about 18 percent of outputs with a semantic error where the paper reported over 80. DataTales, where reading operations climb steeply with model size. And DataNarrative's generate-and-verify architecture, which is the shape ours adapts.

That gave us the sentence at the bottom.

> **DELIVERY:** do not read the paper list. Say "seven surveyed, three we re-ran ourselves" and go to the bottom bar. That sentence is the slide.

### Slide 4 - layout

`SPEAKER 1 - Mahmoud   [0:40]   running total 1:45   ~98 words   >>> HAND TO OKASHA`

So here is the problem we noticed.

The critic is always a fact-checker. But Hullman and Diakopoulos showed that framing alone significantly changes how people read the same chart. Tone is not decoration - it is part of the claim.

[POINT] Both of these sentences are true to the table. A fact-checker passes both. The first catastrophises, the second is calibrated, and nothing in the literature can tell them apart.

Okasha will show you what we built for that.

> **DELIVERY:** read both quotes out loud, slowly. This is the motivation and it lands in ten seconds if you actually perform the contrast.

### Slide 5 - section divider — hand over here

`SPEAKER 2 - Okasha   [0:05]   running total 1:50   ~15 words`

Thank you. I will take the system itself, and then how we put a number on tone.

> **DELIVERY:** your first words as a new speaker. Say them to the room, not the screen.

### Slide 6 - layout

`SPEAKER 2 - Okasha   [0:33]   running total 2:23   ~82 words`

Three roles, but only two local models.

A generator writes the draft. Then the moderator - and in this project the moderator is the agentic role, so it does three jobs on the same weights: it rewrites the tone, that is our contribution, it fact-checks every number back against the table, and it picks the charts.

Same model, separate stages. That matters twice: a tone number still measures one change, and we pay one twenty-gigabyte model load per run instead of three.

Claude Opus judges, and only judges.

> **DELIVERY:** "one model, three jobs" is the line. Do not call chart selection a fourth model - it is not.

### Slide 7 - layout

`SPEAKER 2 - Okasha   [0:38]   running total 3:01   ~95 words`

To measure tone you need a scale. Every story gets two: alarmism and optimism, one to five each.

Both ends of each are failures. Five catastrophises, one is flat and hides real stakes. So an agent cannot win by draining the feeling out of a story.

Two honest notes. The rubric calls three calibrated, but our human writers sit at 2.0 and 2.5, so the human band is what we report against.

And blinding cost us: scoring each story alone doubles the calls and gives up the direct comparison.

> **DELIVERY:** "both ends are failures" must land. Pause after it. Point at the blue human marks on the second note.

### Slide 8 - layout

`SPEAKER 2 - Okasha   [0:28]   running total 3:29   ~70 words   >>> HAND TO ELSAADANI`

Four families of metric, and only the first one needs a model.

Tone is the contribution and it is judged. Faithfulness is computed in code, for free, on every run - including a cherry-picking check on which window the story chose. Similarity is against our human stories. And the operation accuracies come from the DataTales re-run.

Careful: two of these share the word trend. The footnote says which is which.

Elsaadani takes the reader-facing half.

> **DELIVERY:** do NOT read the metric names. Name the four families and the fact that three of them cost nothing to compute. The slide is the handout.

### Slide 9 - section divider — hand over here

`SPEAKER 3 - Elsaadani   [0:05]   running total 3:34   ~15 words`

My half: what a reader is actually shown, and how we picked the model pair.

> **DELIVERY:** a beat, then straight into the next slide.

### Slide 10 - layout

`SPEAKER 3 - Elsaadani   [0:24]   running total 3:58   ~60 words`

Not every metric is for us. These are for the reader.

The app shows the tone rating, the human band, and every emotive span the moderator removed, classified by what kind of edit it was. That is why the interface shows a diff rather than just a cleaner paragraph - a reader can audit the rewrite instead of trusting it.

The user-study axes are designed and not run.

> **DELIVERY:** this sets up the demo. Say "you will see these in a moment".

### Slide 11 - figure, full bleed

`SPEAKER 3 - Elsaadani   [0:24]   running total 4:22   ~60 words`

Now, how we picked the pair.

Fourteen generator-and-moderator combinations. Six tie on tone - all land on exactly 2.0 - so tone alone cannot choose between them. We broke the tie on faithfulness: how many of the raw story's figures survive the rewrite.

On one run each, qwen 4b looked best, 71 percent against llama 8b's 50.

> **DELIVERY:** do not read the table. Point at the green block of ties, then at the "figures kept" column.

### Slide 12 - figure, full bleed

`SPEAKER 3 - Elsaadani   [0:51]   running total 5:13   ~128 words   >>> HAND TO RAMADAN`

Then we ran both five times, at different seeds. It reverses.

Qwen averages 61%, llama averages 90%. Welch t of minus 2.70, p of 0.029, Cohen's d of 1.71. Our recommendation had been backwards, and one run per cell was never going to show us that.

Seeds have to differ, by the way. Two of our tiers were the same configuration at the same seed and produced byte-identical text - that is determinism, not a repeat.

So the pipeline we ship is llama3.1:8b generating and gemma4:31b moderating.

The lower half is the more interesting finding: the moderator lands on 2.10 either way. It converges on the same tone regardless of who wrote the draft.

> **DELIVERY:** the strongest slide in the deck. Own the mistake. "Our recommendation had been backwards" is the line - say it plainly.

### Slide 13 - section divider — hand over here

`SPEAKER 4 - Ramadan   [0:05]   running total 5:18   ~15 words`

Last part: where that lands against a person, and how the agent works inside.

> **DELIVERY:** a beat. Then fig9 is the payoff slide of the whole talk.

### Slide 14 - figure, full bleed

`SPEAKER 4 - Ramadan   [0:42]   running total 6:00   ~105 words`

This is the result. The four of us wrote 25 stories by hand from the same evidence packs, five per series, before seeing any machine output. The green band is where those human writers sit.

Red is the raw story, blue is after moderation. On every one of the five series the arrow lands on or inside the human band.

Overall 3.74 to 2.09, against a human median of 2.00, over 32 runs with a human counterpart.

The caveat is on the slide rather than hidden: our human stories carry no headline and the machine ones do, so every gap is a lower bound.

> **DELIVERY:** say the three numbers slowly, then stop talking.

### Slide 15 - layout

`SPEAKER 4 - Ramadan   [0:37]   running total 6:37   ~92 words`

The moderator's third job, briefly, because it is what people ask about.

Choosing a chart splits into three questions. Which forms can this table carry - closed, decided from column types in code, so it cannot hallucinate a map for a table with no geography. Which are worth showing - editorial, and that is the model. Is the result honest - closed again, and a rejected spec goes back for one retry.

That split is why a local model can do this reliably.

One honest note: the tool surface is specified and MCP-shaped. A design, not something running today.

> **DELIVERY:** say "specified, not wired" out loud. Someone will ask to see it.

### Slide 16 - layout

`SPEAKER 4 - Ramadan   [0:20]   running total 6:57   ~50 words   >>> DEMO`

That is the whole system. A table becomes an evidence pack, a local model writes the story, and the moderator model rewrites the tone, checks the numbers and picks the figures. Opus judges it blind.

Everything except the judge runs on this laptop.

Let me show you.

> **DELIVERY:** 20 seconds, then switch. The browser should ALREADY be open on the dataset page. Never click Generate and wait - see SPEAKER-SCRIPT.md.

### Slide 17 - layout

`CLOSING - whoever finishes the demo   [0:15]`

One sentence: a second agent can move a generated data story onto the tone level of a person writing from the same table, without losing the numbers, and at a cost in readability we can put a number on.

What we are not claiming is on the slide. One judge family, no user study, and a human baseline written by five writer slots rather than a controlled design.

Thank you. Happy to take questions.

> **DELIVERY:** read the limits line rather than skipping it. Volunteering it is what makes the rest credible. Q&A prep is at the end of SPEAKER-SCRIPT.md.

## The demo, minute by minute

A cold run of the shipping configuration takes between 194 and 550 seconds -
measured, not guessed (`exp-repeats-g4b-g8b.json`). **You cannot click Generate
on stage and wait.** Everything below exists to make sure you never have to.

> **Walk this path once, end to end, the day before.** It is written against the
> code as it stands after the chart-selection merge, and the screens were read
> out of the components rather than clicked. That is enough to know each screen
> exists; it is not enough to know what it looks like with your data in it.

### Before you leave

- `ollama pull llama3.1:8b` and `ollama pull gemma4:31b`, then run one throwaway
  generation so the weights are resident. A cold load on stage reads as a hang.
- Django on `:8000`, Next on `:3000`, both already serving.
- One browser window, no other tabs, zoom 125%, notifications off.
- A second window holding the screenshot folder, in the demo's own order.

### T-0, as slide 1 goes up

The standby person starts a real generation on the measles dataset in a
background tab. At the measured mean it finishes around slide 8. If it has not
finished by the time you switch over, you open a completed run instead and say
so - one sentence, no apology.

### The click path

Everything after the first step lives on `/generate`, which composes the dataset
picker, the pipeline runner and the comparison panel on one page.

| Time | Where | The one thing you say |
|------|-------|----------------------|
| 0:00-0:20 | `/datasets` | Real merged data: measles cases joined to MCV1 coverage on country and year, 9,959 rows, 1980 to 2024. |
| 0:20-0:55 | `/generate`, dataset picked | We do not let the frontend guess which charts to draw. The backend profiles the table and picks the forms it can honestly carry - and refuses a spec that would misrepresent it. |
| 0:55-1:45 | Pipeline runner, raw story | Read **one** alarmist sentence out loud, then show its tone reading. |
| 1:45-2:40 | Moderated story | Same numbers, different temperature. The red-line view marks every emotive span that came out, and the tone meter moves. |
| 2:40-3:10 | Comparison panel | This is one of the 25 stories we wrote by hand. Now the similarity and retention numbers. |
| 3:10-3:30 | Anywhere | That entire loop ran on this laptop. There is no API call in the generation path. |

**The gotcha:** the comparison panel scores against the human baseline *typed or
imported into the page*, so the metrics stay empty until you paste one in. Have
the measles story on the clipboard, or import it, before you switch to the
browser - not while the room is watching.

### When it breaks

- **Generation not finished.** Open a completed run from the list. "Here is one
  from this morning." Move on. Do not stand and watch a spinner.
- **Backend down.** Screenshots, same order, same words. The story does not
  depend on it being live.
- **A model got evicted.** Do not re-pull on stage. Screenshots.

## If you are running long

Cut slide 7, the reliability figure, and fold one sentence into slide 6: "we
rated every story three times and the judge agrees with itself to ICC 0.99, so
this gap is real." That buys 40 seconds and costs the least.

Do **not** cut slide 9. The reversal is the strongest thing in the deck.

## Questions to expect

**"There is only one judge."** Correct, and we say so on slide 10. The 0.991 is
self-consistency, not inter-rater agreement - an upper bound on what a different
judge would agree to. A second judge family is the next run. What supports the
result meanwhile is that two independent methods agree: the scalar scores and
the blind pairwise verdicts point the same way.

**"Why no user study?"** The brief allows metrics or a user study. We chose
metrics and went deep on them - reliability coefficients, five-seed repeats, a
significance test. Every preference in the deck is a model's, and a user study
is the natural continuation, not a gap we overlooked.

**"Why not just prompt the generator to write calmly?"** We ran that as a
configuration. Two reasons it is not the same thing. The separation is
measurable: a second pass that only sees the text can be evaluated on its own.
And the data says something a prompt cannot give you - the moderator lands on
2.10 whichever generator wrote the draft, so the tone is a property of the
moderating step, not of the writer.

**"Is 2.09 against a human 2.00 not just noise?"** Essentially yes, and that is
the claim. It lands on the human level rather than below it. For scale, the
judge's own disagreement with itself is 0.08.

**"Your human baseline is your own team."** Yes. Five writer slots per series,
written from the evidence packs before anyone saw machine output. It is a real
hand-written baseline, and it is not the controlled writer design a full study
would want. Both are on slide 10.
