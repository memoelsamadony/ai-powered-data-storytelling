# Pilot stories — not the ASSIGNMENT.md human baseline set

25 stories (5 series x 5 anonymized writers, `L1`-`L5`), moved here from the
project's main directory. Each was produced by a person rewriting the
matching LLM draft (`source_draft` in the frontmatter) by hand — not written
from scratch, and not collected under the blind four-writer protocol in
`../ASSIGNMENT.md` / `../BRIEF.md`.

Concretely, this set differs from the real human baseline in three ways:

- **Not blind.** `BRIEF.md` rule 1 requires a writer to never see a
  machine-written story on their series before submitting. Every story here
  started from one.
- **Not from-scratch.** `BRIEF.md` rule 2 rules out any LLM involvement "at
  any point, for any part of it." These began as an LLM draft.
- **Wrong shape for `H`.** `ASSIGNMENT.md` S6 defines `H` as the median over
  four specific anchor stories, one per named writer, each writing exactly
  the series they were assigned (so no writer's habits get confounded with a
  series' direction of truth). This set has five interchangeable writer slots
  per series instead, with no cross-series identity — `L1` in `measles` is
  not necessarily `L1` in `diphtheria-global`.

**Do not point `build_baselines_json.py` at this directory, and do not feed
any of it into the `H` computation in `ASSIGNMENT.md` S6.** It exists for
exercising the pipeline (word counts, judge scoring, moderation) with
plausible human-shaped text while the real `stories/` submissions are still
being collected.

Several are outside the 110-170 accepted word range (see `word_count` in
each file's frontmatter) — expected, since they were never trimmed to
`BRIEF.md`'s length target. None of the 25 have a headline; `BRIEF.md`
requires one and none was added here, since writing one would mean an LLM
originating that piece of the text.
