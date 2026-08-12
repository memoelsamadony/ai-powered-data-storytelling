# Final presentation - speaker script

**7:00 of talk across four speakers, then a 3:30 demo.** 20 slides; the figure slides carry themselves, so on those you talk to the room, not to the screen.

Generated from the speaker notes inside `AI-Storytelling-Final-Talk.pptx` by `make_final_deck.py`. Edit the notes there and rebuild rather than editing this file, or the two will disagree by Sunday.

## Who speaks when

| Speaker | Slides | Words | At 150 wpm |
|---------|--------|-------|-----------|
| Mahmoud | 1-5 | 261 | 104s |
| Okasha | 6-9 | 243 | 97s |
| Elsaadani | 10-14 | 267 | 107s |
| Saleh | 15-18 | 279 | 112s |
| **Talk total** | **1-18** | **1050** | **7:00** |
| Demo | after 18 | - | 3:30 |
| Close | 19 | 68 | 15s |
| Questions | 20 | - | stays up |

Assignments follow the interim deck's four-part split and are meant to be swapped - the script is written per section, not per person. Whoever drives the demo should not also be the one closing it; give the standby person the last slide.

## The script

### Slide 1 - layout

`SPEAKER 1 - Mahmoud   [0:15]   running total 0:15   ~40 words`

Good afternoon. We turn a public-health table into a written story. The part we want to defend today is the second agent: it reads that story and pulls the emotional tone back to what the evidence supports.

Four parts, then a live demo.

> **DELIVERY:** do not read the names, they are on the slide. Go straight to the sentence about the second agent.

### Slide 2 - layout

`SPEAKER 1 - Mahmoud   [0:20]   running total 0:35   ~38 words`

Four parts. What the research told us and the problem it exposed. What we built and how we measure it. What a reader sees, and how we picked the model pair. Then the result and the system itself, and we finish live in the app.

> **DELIVERY:** fifteen seconds. Read the four part names, point at the claim on the right, move on. Do not explain the claim here - the whole talk is the explanation.

### Slide 3 - section divider - hand over here

`SPEAKER 1 - Mahmoud   [0:05]   running total 0:40   ~15 words`

First: what the field already does, and the gap we found in it.

> **DELIVERY:** one line, then move. A divider is a beat, not a slide to present.

### Slide 4 - layout

`SPEAKER 1 - Mahmoud   [0:35]   running total 1:15   ~100 words`

We surveyed the field, and the report lists it. These are the three we re-ran ourselves, because they shaped what we built.

Kasner and Dušek: are open models faithful? Re-running their method, a 12B model left an error in about 18 percent of outputs where the paper reported over 80.

DataTales: which claims are hard? Stating a number is not the hard part. Explaining it is.

DataNarrative gave us the architecture - one agent writes, a second checks.

Together, that is the bar at the bottom. Another fact-checker is not the gap.

> **DELIVERY:** three cards, one sentence each, then the bottom bar. If asked about the wider survey, it is in the interim report.

### Slide 5 - layout

`SPEAKER 1 - Mahmoud   [0:30]   running total 1:45   ~98 words   >>> HAND TO OKASHA`

So here is the problem we noticed.

The critic is always a fact-checker. But Hullman and Diakopoulos showed framing alone significantly changes how people read the same chart. Tone is part of the claim.

[POINT] Both sentences are true to the table. A fact-checker passes both. One catastrophises, one is calibrated, and nothing in the literature tells them apart.

Okasha will show you what we built for that.

> **DELIVERY:** read both quotes out loud, slowly. This is the motivation and it lands in ten seconds if you actually perform the contrast.

### Slide 6 - section divider - hand over here

`SPEAKER 2 - Okasha   [0:05]   running total 1:50   ~15 words`

Thank you. I will take the system itself, and then how we put a number on tone.

> **DELIVERY:** your first words as a new speaker. Say them to the room, not the screen.

### Slide 7 - layout

`SPEAKER 2 - Okasha   [0:33]   running total 2:23   ~82 words`

Three roles, but only two local models.

A generator writes the draft. Then the moderator - the agentic role here - does three jobs on the same weights: it rewrites the tone, that is our contribution, it fact-checks every number, and it picks the charts.

Same model, separate stages. That matters twice: a tone number still measures one change, and we pay one twenty-gigabyte model load per run instead of three.

Claude Opus judges, and only judges.

> **DELIVERY:** "one model, three jobs" is the line. Do not call chart selection a fourth model - it is not.

### Slide 8 - layout

`SPEAKER 2 - Okasha   [0:33]   running total 2:56   ~95 words`

To measure tone you need a scale. Every story gets two: alarmism and optimism, one to five each.

Both ends are failures. Five catastrophises, one is flat and hides real stakes. So an agent cannot win by draining the feeling out of a story.

Two honest notes. The rubric calls three calibrated, but our human writers sit at 2.0 and 2.5, so the human band is what we report against.

And blinding cost us: scoring each story alone doubles the calls.

> **DELIVERY:** "both ends are failures" must land. Pause after it. Point at the blue human marks on the second note.

### Slide 9 - layout

`SPEAKER 2 - Okasha   [0:28]   running total 3:24   ~70 words   >>> HAND TO ELSAADANI`

Four families of metric, and only the first one needs a model.

Tone is the contribution and it is judged. Faithfulness is computed in code, for free, including a cherry-picking check on the window the story chose. Similarity is against our human stories. The operation accuracies come from DataTales.

Careful: two of these share the word trend. The footnote says which is which.

Elsaadani takes the reader-facing half.

> **DELIVERY:** do NOT read the metric names. Name the four families and the fact that three of them cost nothing to compute. The slide is the handout.

### Slide 10 - section divider - hand over here

`SPEAKER 3 - Elsaadani   [0:05]   running total 3:29   ~15 words`

My half: what a reader is actually shown, and how we picked the model pair.

> **DELIVERY:** a beat, then straight into the next slide.

### Slide 11 - layout

`SPEAKER 3 - Elsaadani   [0:24]   running total 3:53   ~60 words`

Not every metric is for us. These are for the reader.

The app shows the tone rating, the human band, and every emotive span the moderator removed, classified by kind. That is why the interface shows a diff rather than a cleaner paragraph - a reader can audit the rewrite.

The user-study axes are designed and not run.

> **DELIVERY:** this sets up the demo. Say "you will see these in a moment".

### Slide 12 - layout

`SPEAKER 3 - Elsaadani   [0:28]   running total 4:21   ~65 words`

How we actually chose the pair, in four steps.

Build a grid of generator and moderator combinations. Score every run the same way, on the same dataset. Tone does not decide it - six land on exactly 2.0.

So break the tie on faithfulness, then repeat the top two at different seeds, because one run cannot separate a model from a draft.

The next two slides are steps three and four.

> **DELIVERY:** this is the method slide. Say the four steps, then let the two figures carry the evidence.

### Slide 13 - figure, full bleed

`SPEAKER 3 - Elsaadani   [0:20]   running total 4:41   ~50 words`

Step three. Fourteen runs. The green rows all tie on tone at exactly 2.0, so we rank them on the "figures kept" column instead.

Now look at the three rows that read llama3.1:8b times gemma4:31b. Same models, three separate runs: 50 percent, 75 percent, 100 percent.

> **DELIVERY:** point at those three rows. That is the moment the audience should distrust the table, and it sets up the next slide.

### Slide 14 - figure, full bleed

`SPEAKER 3 - Elsaadani   [0:35]   running total 5:16   ~80 words   >>> HAND TO RAMADAN`

Step four. Both configurations, five runs each, at distinct seeds.

It reverses. Qwen averages 61%, llama averages 90%. Welch t of minus 2.70, p of 0.029. Our recommendation had been backwards, and one run per cell was never going to show us that.

So we ship llama3.1:8b generating and gemma4:31b moderating.

And the lower half is the more interesting finding: moderated tone is 2.10 either way. The moderator converges on the same tone whoever wrote the draft.

> **DELIVERY:** "our recommendation had been backwards" is the line. Say it plainly.

### Slide 15 - section divider - hand over here

`SPEAKER 4 - Saleh   [0:05]   running total 5:21   ~15 words`

Last part: where that lands against a person, and how the agent works inside.

> **DELIVERY:** a beat. Then fig9 is the payoff slide of the whole talk.

### Slide 16 - figure, full bleed

`SPEAKER 4 - Saleh   [0:38]   running total 5:59   ~105 words`

This is the result. We wrote 25 stories by hand from the same evidence packs, before seeing any machine output. The green band is where those human writers sit.

Red is raw, blue is after moderation. On every one of the five series the arrow lands on or inside the human band.

Overall 3.74 to 2.09, against a human median of 2.00, over 32 runs with a human counterpart.

The caveat is on the slide rather than hidden: our human stories carry no headline and the machine ones do, so every gap is a lower bound.

> **DELIVERY:** say the three numbers slowly, then stop talking.

### Slide 17 - layout

`SPEAKER 4 - Saleh   [0:40]   running total 6:39   ~100 words`

How the model actually decides which figures to draw.

Seventeen flat chart types is past what a local model picks reliably. So the contract groups them into seven tools by the reader's job - trend over time, magnitude, change, relationship, geographic, distribution, headline - and puts the geometry in an enum inside each. That is a two-level decision, and it is one a local model makes well.

The three read tools on the right are what make this an agent rather than a classifier. Without them the model picks a form blind from a prompt string. With them it can look at the table first, find that two measures differ by a hundred times, and derive that it needs an indexed transform.

> **DELIVERY:** name the seven tools as a group, do not read them one by one. Spend the time on the read tools - that is the interesting half. If asked whether the MCP server is running: it is not, the selector makes one structured call today and the tool loop is the next step.

### Slide 18 - layout

`SPEAKER 4 - Saleh   [0:21]   running total 7:00   ~50 words   >>> DEMO`

That is the whole system. A table becomes an evidence pack, a local model writes the story, and the moderator model rewrites the tone, checks the numbers and picks the figures. Opus judges it blind.

Everything except the judge runs on this laptop.

Let me show you.

> **DELIVERY:** 20 seconds, then switch. The browser should ALREADY be open on the dataset page. Never click Generate and wait - see SPEAKER-SCRIPT.md.

### Slide 19 - layout

`CLOSING - whoever finishes the demo   [0:15]`

One sentence: a second agent can move a generated data story onto the tone level of a person writing from the same table, without losing the numbers, and at a cost in readability we can put a number on.

What we are not claiming is on the slide. One judge family, no user study, and a human baseline written by five writer slots rather than a controlled design.

> **DELIVERY:** read the limits line rather than skipping it. Volunteering it is what makes the rest credible. Q&A prep is at the end of SPEAKER-SCRIPT.md.

### Slide 20 - layout

`QUESTIONS - all four speakers stay at the front`

Leave this slide up for the whole Q&A. It holds the names and the repository link, which is what anyone wanting to follow up needs.

The four questions to expect, with answers, are at the end of presentation/SPEAKER-SCRIPT.md. Read them on the way in. Short forms:

- Only one judge? Yes, and slide 19 says so. 0.991 is self-consistency, not inter-rater. Two independent methods agree though: the scalar scores and the blind pairwise verdicts. - Why no user study? The brief allows metrics or a user study. We chose metrics and went deep: reliability, repeats, a significance test. - Why not just prompt the generator to be calm? Because a separate pass is measurable on its own, and because the moderator lands on 2.10 whichever generator wrote the draft. - Is 2.09 against a human 2.00 just noise? Essentially yes, and that is the claim: it lands on the human level. The judge's own disagreement is 0.08.

> **DELIVERY:** whoever is nearest the laptop takes questions first, then hand to whoever owns that section. Nobody answers over anybody.

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
background tab. At the measured mean it finishes around slide 16. If it has not
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

Cut **slide 13**, the n=1 ranking table, and fold its point into slide 12 step
three: "six combinations tied on tone, so we ranked them on faithfulness." That
buys about 20 seconds and costs the least, because slide 14 restates the
comparison anyway.

Next cheapest is **slide 12** itself, compressed to two sentences.

Do **not** cut slide 14. The reversal is the strongest thing in the deck.

## Questions to expect

**"There is only one judge."** Correct, and we say so on slide 19. The 0.991 is
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
would want. Both are on slide 19.
