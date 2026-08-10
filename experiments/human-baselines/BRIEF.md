# Writing brief - human baseline stories

**Version:** v1.1 (2026-08-10) | **Audience:** the four writers named in the assignment note
**Your packet is:** this file, and the two data packs named in your assignment note.
Nothing else. There are other documents in this directory; none of them are yours yet.

---

## Why a human writes this and a model must not

Your two stories are the **independent human reference** that the machine-written stories
in this study get compared against. Everything the study concludes rests on that reference
having been produced by a person working from the data, with no model anywhere in the
chain.

If a language model writes, drafts, rewrites, shortens, polishes or "improves" any part of
one of these stories, the reference stops being independent: the study then compares model
output against model output and concludes something about itself. That cannot be repaired
afterwards and it cannot be detected in the finished text. It rests entirely on the four of
you following the rules below.

The same logic covers reading. A person who has just read a machine's version of the same
numbers writes differently: the sentence shapes, the choice of which figure to lead with
and the order of the argument drift toward what they read. The reference then partly
measures the thing it is supposed to be independent of.

This brief deliberately tells you very little about what happens to your story next. You
are not writing toward anything. You are writing the thing that other writing gets held up
against, and the less you know about the comparison, the better that works.

---

## The task

You write **two short data stories**, one per data pack, in the order given in your
assignment note. Each story is written from one pack of numbers and nothing else.

Write for a **general audience**: someone reading a news app or a newsletter, with no
background in the subject and no interest in methodology. Write the story you would write
if it carried your byline. There is no house style to match and you are not being asked for
any particular register or tone: write it as you naturally would.

**Budget about 4 hours in total**, across two separate sittings. That is roughly 40 minutes
of real work per story, plus reading this brief once, setting up, and the submission checks.

---

## Form and length

| | |
|---|---|
| Headline | one line, plain text, sentence case, no length requirement |
| Body | **120-160 words**, in **2 to 4 short paragraphs** |
| Counted | body only. The headline is **not** counted |
| Format | plain Markdown. No bold, no italics, no bullet lists, no sub-headings |

The range and the paragraph shape are not stylistic preferences. They are exactly what the
machine-written stories are asked for, and length is one of the strongest giveaways when
two sets of text are later compared without labels.

Word counts are produced by one shared script so that both sets are counted the same way
(whitespace-separated tokens, body only):

```bash
python3 experiments/analysis/wordcount.py experiments/human-baselines/stories/mumps-global__ME.md
```

Put the number it prints in your frontmatter. **110-170 is accepted without comment**;
120-160 is the target. Only a story outside 110-170 comes back to you, with the word count
and nothing else.

---

## Rules

**1. Do not read any machine-written story before you have submitted both of yours.**
Not for your series, not for any other. During the writing window, do not open:

- `RESULTS.md` Part B, and especially §B3, which is a complete machine-written story on one
  of these series, with its headline and a table of rewritten phrases;
- `experiments/human-baselines/llm-drafts/`, which holds 25 machine-drafted stories on
  exactly your series - reading even one of them before you submit poisons your story;
- `backend/storytelling/agents.py`, which contains the instructions the machine writer is
  given;
- `emotional-tone-moderation/pipeline.py`, `lib/data/`, or any demo story in the frontend;
- anything under `experiments/e1-*/`, `experiments/e2-*/`, or any exported run;
- the running app, the `/api/generate` endpoint, or any pipeline you start yourself.

**2. No language model, at any point, for any part of it.**
No ChatGPT, Claude, Gemini, Copilot or local model. No AI grammar or rewriting tool:
Grammarly's rewrite, Notion AI, Apple Writing Tools, Word's Editor rewrites. No AI
autocomplete in your editor, so turn Copilot inline suggestions off before you start. No AI
translation from another language. A plain text editor with ordinary spell-check is the
safe setup. You sign a declaration about this in the submission, and there is an amnesty
clause at the end of this brief if something slips.

**3. Only what is in your pack.**
Your pack is a small text table: the series by year, plus whatever context lines the table
carries. Every figure in your story must be in it, or derivable from it by arithmetic you
do yourself: differences, percentage changes, ratios, per-million rates, "roughly a third",
"the highest year in the series". Do not open the underlying CSV or spreadsheet, do not
look the topic up, do not add a number from memory. Check every figure against the pack
before you submit.

**4. No outside facts and no outside explanations.**
Do not mention the pandemic, vaccine hesitancy, funding, conflict, reporting changes,
health policy, seasons, or anything else the pack does not contain, even when you are sure
it is true and even as background colour.

To be straight about the reason: this is not because the machine writer knows less than you
do. It has read most of the internet and it knows perfectly well what measles is. What has
to match between the two sets is **what reaches the page**, because that is the only part
anyone can check against the data. An explanation neither of you can support from the pack
is unverifiable in both directions.

You may of course use ordinary words for what the numbers do: "rose", "fell", "the highest
since 2019". What you may not do is say **why**.

**5. Your pack is the only data file you open.**
It lives in `experiments/human-baselines/datapacks/`. Open nothing at all under
`experiments/datapacks/`, which holds the analyst's copies of the same series.
`experiments/datapacks/FACTSHEET.md` in particular is an analyst's file: it names the
direction of every series, the biggest jumps, and the sub-windows that contradict the
overall trend. Reading it hands you a framing instead of letting you find one.

**6. Use whatever window and whatever framing you honestly think is right.**
The whole span, the last five years, one turning point: your call, as long as it is honest
and supported by the pack. Properties of the finished text get measured afterwards, and you
are not told which ones, on purpose. Write the story, not the measurement.

**7. Work alone until both stories are in.**
Do not discuss the data, your angle or your draft with the other writers, and do not read
anyone else's story before you have submitted your own.

---

## Time budget per story

| Step | Time |
|---|---|
| Read the pack, look at the numbers, decide your angle | ~10 min |
| Write | ~20 min |
| Trim to length, re-check every figure against the pack, fill in the frontmatter | ~10 min |

Roughly 40 minutes, with 60 as the hard stop. Do not rush it in five: a clipped, telegraphic
story is as unrepresentative of how you write as an over-polished one. One sitting per
story, with a real break between them.

---

## Worked example of the form

This shows the **shape only**: a headline, a body of 120-160 words in short paragraphs,
every figure taken from one small table. The topic is unrelated to anything in the study
and the numbers are invented.

> # Northvale's library loans move from shelves to screens
>
> Northvale's four public libraries lent 412,000 items last year, down from 468,000 in
> 2019. Almost the whole of that fall came from print, which dropped from 356,000 loans
> to 268,000 over the five years.
>
> Digital borrowing went the other way. E-books and audiobooks rose from 112,000 to
> 144,000, and they now make up 35 per cent of everything the system lends, against 24
> per cent in 2019. The switch has been steady rather than sudden: digital gained ground
> in each of the five years.
>
> The branches are not moving together. Riverside, the largest, lent 149,000 items last
> year; Hilltop, the smallest, lent 31,000. Hilltop is also the only branch that lent
> more than it did in 2019, on the back of 9,000 extra loans of children's titles.

**Do not copy any of it beyond the shape.** Specifically, do not take from it: the
three-paragraph structure (two and four are equally fine), the habit of opening on the
overall total, the use of percentages, the move from aggregate to detail, or its flat and
unhurried register.

That last point is worth being honest about. This example reads plainly, and a plain
example quietly suggests writing plainly. A livelier example would suggest the opposite.
There is no register-free example, so rather than pretend this one is neutral: **read it
once, close this file, and draft from the pack.** Come back to it only to check the shape.

---

## How to submit

One file per story, at:

```
experiments/human-baselines/stories/<series-slug>__<initials>.md
```

for example `experiments/human-baselines/stories/mumps-global__ME.md`. Your slugs and
initials are in your assignment note. Use this exact template:

```markdown
---
writer: Mahmoud Elsamadony
initials: ME
series: mumps-global
datapack: experiments/human-baselines/datapacks/mumps-global.txt
datapack_sha256: 9f2c1ab77d04            # first 12 chars, command below
written_at: 2026-08-12T14:05+02:00
minutes_spent: 38
word_count: 141                          # from wordcount.py, body only
story_order: 1                           # 1 = your first pack, 2 = the second
returned: false                          # set true if this story came back for length
declarations:
  no_llm_assistance: true                # rule 2
  no_machine_story_seen: true            # rule 1
  pack_only: true                        # rules 3 and 4
  factsheet_not_opened: true             # rule 5
prior_exposure: "read RESULTS.md Part B in July; have seen the app demo story"
---

# Your headline here

First paragraph.

Second paragraph.
```

Hash your pack with:

```bash
shasum -a 256 experiments/human-baselines/datapacks/mumps-global.txt | cut -c1-12
```

`prior_exposure` is a free-text, honest note about what you had already read before this
exercise began. Everyone has some; nobody is penalised for it; it is reported next to the
results rather than pretended away. Write "none" only if it is true.

### Before you submit, check

- [ ] Body is 110-170 words (target 120-160), headline excluded, 2 to 4 paragraphs.
- [ ] Every number appears in the pack or follows from it by arithmetic, re-checked once
      against the pack.
- [ ] No claim about a cause, a reason, or the future.
- [ ] No word of it came from a model or an AI writing tool.
- [ ] Frontmatter complete and every declaration honest.
- [ ] Filename and slug match your assignment note.

### Amnesty

If you realise that something slipped, say so. Autocomplete was on, you pasted a sentence
through a rewrite tool, you had `RESULTS.md` open in another tab and read §B3. Tell
whoever is collecting the stories and that one story is dropped and rewritten by you in a
fresh sitting from a different angle. Nothing else follows from it. A disclosed slip costs
forty minutes; an undisclosed one costs the study its reference point, and nobody would
ever know.

---

## What happens to your story afterwards

It joins the study's story set and gets read and scored, both by the automated judges and,
in a later session, by the four of you under a protocol you will be given at the time.
Before that, every story in the set - machine-written and human-written alike - goes
through a mechanical normalisation step (quote characters, dashes, spacing, headline case,
stray formatting) so that nobody can spot the source from the typography. **Nothing is ever
reworded.** Your sentences stay your sentences, and every change made is logged.

You will not get feedback on your story at any point, and you will not be told how it
scored until the study is finished. That is deliberate. Feedback would train the next
baseline you write.

---

## Note for whoever assembles the packs (not for writers)

The writer packs are `experiments/human-baselines/datapacks/<series>.txt`, each the exact
string returned by `build_prompt_table(<series>)` and byte-identical to what the generator
is given, with `sha256(pack) == sha256(generator string)` as the acceptance criterion
(addendum item P0.13). **Read the two implementation notes in `ASSIGNMENT.md` §7 before
wiring that up**: call `build_prompt_table` once and hold the string, and watch the
trailing newline, or the criterion passes on the day it is written and stops meaning
anything afterwards. As of 2026-08-10 both dependencies exist: all five series have
`DatasetSpec` entries, the packs in `datapacks/` are generated by
`manage.py make_packs` with their hashes in `datapacks/index.json`, and
`experiments/analysis/wordcount.py` is the shared counter. Re-run `make_packs` after
any `DatasetSpec` change and re-check the hashes.
