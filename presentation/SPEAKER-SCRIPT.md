# Final presentation - speaker script

**7:00 of talk across four speakers, then a 3:30 demo.** Twelve slides; five of them are figures that carry themselves, so on those you talk to the room, not to the screen.

Generated from the speaker notes inside `AI-Storytelling-Final-Talk.pptx` by `make_final_deck.py`. Edit the notes there and rebuild rather than editing this file, or the two will disagree by Sunday.

## Who speaks when

| Speaker | Slides | Words | At 150 wpm |
|---------|--------|-------|-----------|
| Mahmoud | 1-3 | 256 | 102s |
| Okasha | 4-5 | 229 | 92s |
| Elsaadani | 6-8 | 333 | 133s |
| Ramadan | 9-10 | 236 | 94s |
| **Talk total** | **1-10** | **1054** | **7:02** |
| Demo | 11 | - | 3:30 |
| Close | 12 | 86 | 15s |

Assignments follow the interim deck's four-part split and are meant to be swapped - the script is written per section, not per person. Whoever drives the demo should not also be the one closing it; give the standby person the last slide.

## The script

### Slide 1 - layout

`SPEAKER 1 - Mahmoud   [0:15]   running total 0:15   ~43 words`

Good afternoon. We turn a public-health table into a written story. The part we want to defend today is the second agent: it reads that story and pulls the emotional tone back to what the evidence supports.

Four sections, then a live demo.

> **DELIVERY:** do not read the names off the slide, they can see them. Go straight to the sentence about the second agent.

### Slide 2 - layout

`SPEAKER 1 - Mahmoud   [0:45]   running total 1:00`

Agentic data storytelling already has a critic agent. DataNarrative, MDSF, Data Director - they all pair a generator with a second agent that checks the work. In every one of them, that second agent checks facts.

But Hullman and Diakopoulos showed years ago that framing alone significantly changes how people read the same chart. So the interesting failure is not the false number. It is the true number delivered in a way that misleads.

[POINT AT THE PANEL] Both of these are accurate. A fact-checker passes both. The first one is catastrophising and the second one is calibrated, and no system in the literature can tell them apart.

> **DELIVERY:** read both quotes out loud, slowly. This is the whole motivation and it lands in ten seconds if you actually perform the contrast.

### Slide 3 - layout

`SPEAKER 1 - Mahmoud   [0:40]   running total 1:40   >>> HAND TO OKASHA`

Three stages. A local model generates the story from an evidence pack we build out of the table. A second local model rewrites it for tone only. Claude Opus rates both versions blind.

Only the middle stage is new. Everything else exists to make it measurable.

And we use two datasets on purpose, because tone fails in two directions. The measles data invites alarmism. The WHO child-mortality data invites the opposite failure - false reassurance - and there the agent has to keep the inequality and the COVID reversal visible rather than flatten them.

Ahmed will show you how we turned that into a number.

> **DELIVERY:** this is a signpost slide, keep moving. Do not name model versions twice, they are on the slide.

### Slide 4 - layout

`SPEAKER 2 - Okasha   [0:50]   running total 2:30`

To measure tone we need a scale, so the judge rates every story twice: once for alarmism, once for optimism, one to five each.

The important part is that both ends are failures. Five catastrophises. One is flat and hides the stakes. Only the middle is calibrated. So this is not a lower-is-better metric - an agent that just drains the feeling out of a story does badly on it too.

One thing we had to fix. The first version showed the judge both stories in a single call, labelled before and after, always in that order. That tells the rater which one is the treatment. Now every story is scored alone, in its own call, with nothing to compare it to.

> **DELIVERY:** "both ends are failures" is the sentence that has to land. Pause after it.

### Slide 5 - figure, full bleed

`SPEAKER 2 - Okasha   [0:45]   running total 3:15   ~112 words   >>> HAND TO ELSAADANI`

Every run we did, all thirty-five, on both axes. Red is the raw story, blue is after moderation, the arrow is what the agent did.

The big diagonal cloud is the alarmist dataset behaving as expected.

But look at the top. That is the child-mortality data. The raw story scored a perfectly calm two on alarmism and a four-and-a-half on optimism. "Nothing short of miraculous." A single-axis alarmism metric sees nothing wrong with that story at all. Ours moved it to two-point-five.

Alarmism falls 3.74 to 2.09, optimism rises 2.15 to 2.60. Both toward the middle.

Ahmed will tell you where that lands next to a person.

> **DELIVERY:** physically point at the top cluster. That one group of points is the entire justification for the second axis.

### Slide 6 - figure, full bleed

`SPEAKER 3 - Elsaadani   [0:50]   running total 4:05`

This is the main result. The four of us wrote 25 stories by hand from the same evidence packs, five per series, before seeing any machine output. The green band is where those human writers sit.

Red is the machine's raw story. Blue is after moderation. On every one of the five series the arrow moves onto or into the human band.

Overall, alarmism goes from 3.74 to 2.09, and the human median is 2.00. That is 32 runs that have a human counterpart to compare against.

One caveat we put on the slide rather than hide: our human stories have no headline and the machine stories do. Headlines concentrate alarmism, so the human line is flattered, and every gap you see is a lower bound.

> **DELIVERY:** say the three numbers slowly - 3.74, 2.09, human 2.00 - and stop talking. That trio is the thesis of the whole project.

### Slide 7 - figure, full bleed

`SPEAKER 3 - Elsaadani   [0:40]   running total 4:45   ~100 words`

Fair question at this point: the judge is a language model too, so why believe it.

So we rated every story three times, in independent calls. 64 stories, 192 calls.

ICC 0.991. Krippendorff alpha 0.991. Identical on all three passes for 41 of 64 stories, never off by more than half a point.

The number that matters: the judge disagrees with itself by 0.08 points. The same configuration at five seeds disagrees with itself by 0.42. So the spread in our results is the generator, not the instrument.

Same model, same prompt, so this is self-consistency, not inter-rater reliability.

> **DELIVERY:** expect this exact question from the supervisors. Getting in front of it is worth the forty seconds.

### Slide 8 - layout

`SPEAKER 3 - Elsaadani   [0:45]   running total 5:30   >>> HAND TO RAMADAN`

We also asked the judge to compare the two versions directly, 20 pairs, blind, with the positions shuffled so it cannot learn that the second one is always the treatment.

The moderated story won the overall verdict 20 times out of 20, and won factual correctness 20 out of 20 - the moderator is quietly re-grounding numbers the generator made up.

But here is the honest part. On narrative quality the raw story was judged better in 12 of 20 pairs.

Alarmism is not decoration. It is part of what made the story readable, and taking it out costs something. We would rather report that than bury it.

> **DELIVERY:** do not rush the last row. Volunteering the cost is what makes the rest of the deck credible.

### Slide 9 - figure, full bleed

`SPEAKER 4 - Ramadan   [0:55]   running total 6:25`

I want to show you the mistake we nearly published.

Six generator-moderator combinations tied on moderated alarmism - all of them hit 2.0 - so we broke the tie on how many of the raw story's numbers survive moderation, and on one run each, qwen 4b beat llama 8b, 71% against 50%.

Then we ran both five times at different seeds. It reverses. Qwen averages 61% and llama averages 90%. Welch t of minus 2.70, p of 0.029, Cohen's d of 1.71.

Our recommendation had been backwards, and one run per cell was never going to show us that.

Two things follow. The pipeline we are shipping is llama3.1:8b generating and gemma4:31b moderating. And the moderator lands on 2.10 either way, which is the more interesting finding: it converges on the same tone no matter who wrote the draft.

> **DELIVERY:** the strongest slide in the deck. Own the mistake, do not soften it. "Our recommendation had been backwards" is the line.

### Slide 10 - layout

`SPEAKER 4 - Ramadan   [0:35]   running total 7:00   ~90 words   >>> HAND TO THE DEMO`

What we are not claiming.

The reliability figure is one judge agreeing with itself; a second judge family is the next run. There is no user study, so every preference you saw is a model's, not a reader's.

And two corrections to our own interim report. We called the DataTales causal zero percent a capability wall; it is a groundedness measure and cannot carry that claim. And scale is not the lever: a 27b generator reached the same moderated 2.0 as the 4b, at 5 minutes a run, n equals one.

Let me show you the system.

> **DELIVERY:** this is 35 seconds, not a minute. Then switch to the browser, which should ALREADY be open on the dataset page.

### Slide 11 - layout

`DEMO - Ramadan drives, Okasha on standby with the screenshot folder   [3:30]`

DO NOT PRESENT THIS SLIDE. It is a holding slide for the switch to the browser. Full click path, timings and the fallback are in presentation/SPEAKER-SCRIPT.md.

The one rule: a cold generation takes three to nine minutes. You cannot click Generate now and wait. Either the run was started at the beginning of the talk and is already finished, or you open a completed run. Both are covered in the script.

### Slide 12 - layout

`CLOSING - whoever finishes the demo   [0:15]`

One sentence: a second agent can move a generated data story onto the tone level of a person writing from the same table, without losing the numbers, and at a cost in readability we can put a number on.

Thank you. Happy to take questions.

Q&A prep is at the end of presentation/SPEAKER-SCRIPT.md - read it on the way in. The three likely questions are the single judge, the missing user study, and why not just prompt the generator to be calm in the first place.

## The demo, minute by minute

A cold run takes between 92 and 550 seconds - that is measured, not guessed
(`exp-repeats-g4b-g8b.json`). **You cannot click Generate on stage and wait.**
Everything below exists to make sure you never have to.

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

| Time | Screen | The one thing you say |
|------|--------|----------------------|
| 0:00-0:20 | Datasets | Real merged data: measles cases joined to MCV1 coverage on country and year, 9,959 rows, 1980 to 2024. |
| 0:20-0:55 | Chosen figures | We do not let the frontend guess. The backend profiles the table and picks the forms it can honestly carry - and refuses specs that would misrepresent it. |
| 0:55-1:45 | Raw story | Read **one** alarmist sentence out loud, then show its alarmism score. |
| 1:45-2:40 | Moderated story | Same numbers, different temperature. Show the highlighted emotive spans and the score moving. |
| 2:40-3:10 | Human story beside it | This is one of the 25 we wrote by hand. Show the similarity and retention row. |
| 3:10-3:30 | Anywhere | That entire loop ran on this laptop. There is no API call in the generation path. |

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
