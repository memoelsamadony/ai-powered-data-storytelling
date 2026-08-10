# LLM-drafted reference stories (not the human track)

These 25 stories were drafted by isolated Claude Opus subagents on 2026-08-10:
a crossed grid of 5 writer personas (L1 wire service, L2 newsletter explainer,
L3 magazine feature, L4 data columnist, L5 daily news) x 5 series. Each agent
saw one evidence pack (byte-identical to the generator input), the
construct-free rules from BRIEF.md, a persona and a length target - and
nothing else: no rubric, no study construct, no other draft.

They are **not** independent human baselines in the sense of BRIEF.md, which
requires no model anywhere in the chain. They exist to be personally edited;
after editing they form a hybrid reference (`claude-draft, human-edited`), and
similarity metrics computed against them measure distance to edited Claude
text, not to independent human writing. `stories/` stays reserved for the
genuine human track, and results based on these drafts must say which
reference set they used.

Workflow: edit the story body and headline in place (frontmatter stays),
then run `python3 experiments/human-baselines/build_baselines_json.py`.
It recounts words with the shared counter, detects edits by comparing against
`original_story_sha256`, and writes the combined `baselines.json` with
provenance labels. If a draft is ever judged via `manage.py set_human`
without editing, prefix its `--title` with `[LLM-draft]` so the run record
keeps the label.

`drafts-manifest.json` records, per draft: persona, targets, word count, pack
sha, original story sha, and a groundedness screen run with the production
checker. Flagged figures were manually verified on 2026-08-10: all are
derived arithmetic the brief allows (differences, percentage changes, sums)
or extraction artifacts ("26 years", "under-5"), none are fabrications. The
screen deliberately does not credit pairwise derivations, so re-run it after
editing and expect the same classes of flags.
