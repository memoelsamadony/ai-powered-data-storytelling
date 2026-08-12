# The team's human-written stories

25 stories, 5 series x 5 anonymized authors (`L1`-`L5`), written by the project
team from the evidence packs in `../datapacks/`.

**These are human writing.** An earlier version of this README described them as
hand-rewrites of machine drafts, and every file carried a `source_draft:`
pointer into the since-deleted `llm-drafts/` directory. That was wrong. The
claim was never verified against the authors, it propagated into `LOOPHOLES.md`,
`OPUS-JUDGE-RESULTS.md` and `BRIEF.md`, and it was corrected on 2026-08-12 on the
authors' word. The `source_draft:` lines are gone; `datapack:` is the real
source each author worked from.

Why the correction matters rather than being bookkeeping: a reference set
described as machine-derived cannot carry a similarity metric. Every "distance
to human writing" number was suppressed on the strength of that label, and the
tone figures were published with a leakage caveat they did not need.

## What is still true about this set

- **Not the `ASSIGNMENT.md` S6 shape.** That protocol wants four named writers
  with a stable identity across series, so no author's habits get confounded
  with one series' direction of truth. This set has five interchangeable slots
  per series: `L1` in `measles` is not necessarily `L1` in `diphtheria-global`.
  Nothing here computes `H`, and `build_baselines_json.py` still reads only
  `../stories/`.
- **No headlines.** `BRIEF.md` asks for one and none was written. The judge
  therefore scores these on body text while machine stories are scored on
  headline plus body, and headlines are where alarmism concentrates. Recorded
  rather than equalised.
- **Lengths vary.** Several sit outside the 110-170 word range in `BRIEF.md`
  (see `word_count` per file); they were not trimmed to a target.

## How they are used

`experiments/score_human_baselines.py` scores all 25 on the same blind two-axis
Claude judge as the machine stories, and prints them beside the machine means.
Results in `../../OPUS-JUDGE-RESULTS.md`.
