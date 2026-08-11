# Runs: pairings and metrics

Every completed run. `local_judge` is the cheap secondary rater that
runs inside the pipeline; the authoritative alarmism rating is Claude
Opus 5, applied blind offline (`export_for_judging.py`).

## A. Model pairing per run

| dataset | tier | generator | moderator | local judge | self-judging? | s |
|---|---|---|---|---|---|---|
| measles | `mid` | `llama3.1:8b` | `gemma4:31b` | `gemma4:31b` | **yes** | 623 |
| pertussis-global | `mid` | `llama3.1:8b` | `gemma4:31b` | `gemma4:31b` | **yes** | 292 |
| pertussis-global | `m31b-selfjudge` | `llama3.1:8b` | `gemma4:31b` | `gemma4:31b` | **yes** | 269 |
| pertussis-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | `qwen3.5:4b` | no | 273 |
| pertussis-global | `g1b` | `llama3.2:1b` | `gemma4:31b` | `qwen3.5:4b` | no | 222 |
| pertussis-global | `g3b` | `llama3.2:3b` | `gemma4:31b` | `qwen3.5:4b` | no | 261 |
| pertussis-global | `g4b` | `qwen3.5:4b` | `gemma4:31b` | `qwen3.5:4b` | no | 198 |
| pertussis-global | `m12b` | `llama3.1:8b` | `gemma4:12b` | `qwen3.5:4b` | no | 315 |
| pertussis-global | `m26b` | `llama3.1:8b` | `gemma4:26b` | `qwen3.5:4b` | no | 97 |
| measles | `g8b` | `llama3.1:8b` | `gemma4:31b` | `qwen3.5:4b` | no | 240 |
| mumps-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | `qwen3.5:4b` | no | 260 |
| diphtheria-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | `qwen3.5:4b` | no | 316 |
| under5-measles-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | `qwen3.5:4b` | no | 305 |
| under5-all-cause-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | `qwen3.5:4b` | no | 746 |
| under5-tetanus-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | `qwen3.5:4b` | no | 241 |
| pertussis-global | `x9b` | `llama3.1:8b` | `qwen3.5:9b` | `qwen3.5:4b` | no | 93 |
| pertussis-global | `x35b` | `llama3.1:8b` | `qwen3.6:35b` | `qwen3.5:4b` | no | 86 |
| pertussis-global | `q4b` | `qwen3.5:4b` | `gemma4:31b` | `qwen3.5:4b` | no | 231 |
| pertussis-global | `q9b` | `qwen3.5:9b` | `gemma4:31b` | `qwen3.5:4b` | no | 233 |
| pertussis-global | `q2b` | `qwen3.5:2b` | `gemma4:31b` | `qwen3.5:4b` | no | 265 |

## B. Tone, by both judges

The Opus columns are the authoritative rating: a blind call per story,
no label, no sibling to compare against, a vendor and family that
appear nowhere else in the pipeline. The local columns are the cheap
in-pipeline rater, kept so the two can be compared rather than because
either alone is trusted.

| dataset | tier | generator | moderator | opus raw | opus mod | **opus delta** | local raw | local mod | local delta | spans |
|---|---|---|---|---|---|---|---|---|---|---|
| measles | `mid` | `llama3.1:8b` | `gemma4:31b` | 2.2 | 2.5 | **+0.3** | 2.0 | 2.0 | 0.0 | 8 |
| pertussis-global | `mid` | `llama3.1:8b` | `gemma4:31b` | 4.0 | 2.5 | **-1.5** | 3.5 | 3.0 | -0.5 | 10 |
| pertussis-global | `m31b-selfjudge` | `llama3.1:8b` | `gemma4:31b` | 4.0 | 2.0 | **-2.0** | 4.0 | 2.0 | -2.0 | 8 |
| pertussis-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | 4.0 | 2.0 | **-2.0** | 3.0 | 2.0 | -1.0 | 8 |
| pertussis-global | `g1b` | `llama3.2:1b` | `gemma4:31b` | 4.3 | 2.0 | **-2.3** | 4.0 | 2.0 | -2.0 | 6 |
| pertussis-global | `g3b` | `llama3.2:3b` | `gemma4:31b` | 4.6 | 2.5 | **-2.1** | 4.0 | 3.0 | -1.0 | 8 |
| pertussis-global | `g4b` | `qwen3.5:4b` | `gemma4:31b` | 4.5 | 2.0 | **-2.5** | 4.5 | 3.0 | -1.5 | 5 |
| pertussis-global | `m12b` | `llama3.1:8b` | `gemma4:12b` | 4.0 | 2.0 | **-2.0** | 3.0 | 1.5 | -1.5 | 6 |
| pertussis-global | `m26b` | `llama3.1:8b` | `gemma4:26b` | 4.0 | 2.0 | **-2.0** | 3.0 | 2.0 | -1.0 | 5 |
| measles | `g8b` | `llama3.1:8b` | `gemma4:31b` | 2.0 | 1.5 | **-0.5** | 2.0 | 2.0 | 0.0 | 9 |
| mumps-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | 2.6 | 1.8 | **-0.8** | 1.5 | 2.0 | 0.5 | 8 |
| diphtheria-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | 3.5 | 2.5 | **-1.0** | 3.0 | 2.0 | -1.0 | 7 |
| under5-measles-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | 3.0 | 2.5 | **-0.5** | 2.0 | 2.0 | 0.0 | 6 |
| under5-all-cause-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | 2.3 | 2.3 | **+0.0** | 2.0 | 2.0 | 0.0 | 6 |
| under5-tetanus-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | 2.0 | 2.0 | **+0.0** | 1.5 | 2.0 | 0.5 | 5 |
| pertussis-global | `x9b` | `llama3.1:8b` | `qwen3.5:9b` | 4.0 | 2.0 | **-2.0** | 3.0 | 2.0 | -1.0 | 7 |
| pertussis-global | `x35b` | `llama3.1:8b` | `qwen3.6:35b` | 4.0 | 1.5 | **-2.5** | 3.0 | 2.0 | -1.0 | 5 |
| pertussis-global | `q4b` | `qwen3.5:4b` | `gemma4:31b` | 4.6 | 2.0 | **-2.6** | 4.5 | 3.0 | -1.5 | 5 |
| pertussis-global | `q9b` | `qwen3.5:9b` | `gemma4:31b` | 4.5 | 2.5 | **-2.0** | 4.0 | 3.0 | -1.0 | 7 |
| pertussis-global | `q2b` | `qwen3.5:2b` | `gemma4:31b` | 4.7 | 2.5 | **-2.2** | 4.0 | 4.0 | 0.0 | 10 |

### B1. Do the two judges agree?

- Ratings compared: **40** (every raw and moderated story).
- Pearson r between local and Opus ratings: **0.81**.
- Mean absolute difference: **0.49** points on a 1-5 scale.
- Mean rating: local **2.70**, Opus **2.89**.
- Mean moderation delta: local **-0.75**, Opus **-1.51** (Pearson r between the two deltas: **0.77**).
- Runs where the local judge understated the shift by more than 0.25 points: **16 of 20**.

## C. Faithfulness of the moderation

Retention is the share of the raw story's figures still present after
moderation. A large tone improvement with low retention is deletion,
not moderation. `added_unsup` counts figures the moderator invented.

| dataset | tier | generator | moderator | ground raw | ground mod | num.ret | yr.ret | added_unsup | rewrite | words |
|---|---|---|---|---|---|---|---|---|---|---|
| measles | `mid` | `llama3.1:8b` | `gemma4:31b` | 2/4 | 11/11 | 0.25 | 0.0 | 0 | 0.792 | 114->117 |
| pertussis-global | `mid` | `llama3.1:8b` | `gemma4:31b` | 4/4 | 6/6 | 0.75 | 0.75 | 0 | 0.714 | 149->145 |
| pertussis-global | `m31b-selfjudge` | `llama3.1:8b` | `gemma4:31b` | 2/6 | 6/7 | 0.5 | 1.0 | 0 | 0.776 | 125->116 |
| pertussis-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | 2/6 | 6/7 | 0.5 | 1.0 | 0 | 0.776 | 125->116 |
| pertussis-global | `g1b` | `llama3.2:1b` | `gemma4:31b` | 1/3 | 3/3 | 0.333 | 0.75 | 0 | 0.845 | 108->98 |
| pertussis-global | `g3b` | `llama3.2:3b` | `gemma4:31b` | 2/5 | 3/3 | 0.2 | 0.5 | 0 | 0.749 | 129->126 |
| pertussis-global | `g4b` | `qwen3.5:4b` | `gemma4:31b` | 7/7 | 6/6 | 0.714 | 1.0 | 0 | 0.608 | 77->71 |
| pertussis-global | `m12b` | `llama3.1:8b` | `gemma4:12b` | 2/6 | 4/5 | 0.5 | 1.0 | 0 | 0.775 | 125->150 |
| pertussis-global | `m26b` | `llama3.1:8b` | `gemma4:26b` | 2/6 | 5/5 | 0.333 | 1.0 | 0 | 0.778 | 125->118 |
| measles | `g8b` | `llama3.1:8b` | `gemma4:31b` | 7/8 | 7/8 | 1.0 | 1.0 | 0 | 0.551 | 126->110 |
| mumps-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | 4/5 | 6/6 | 0.6 | 1.0 | 0 | 0.745 | 123->112 |
| diphtheria-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | 4/6 | 8/8 | 0.667 | 0.75 | 0 | 0.595 | 114->108 |
| under5-measles-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | 3/4 | 4/5 | 0.75 | 1.0 | 0 | 0.683 | 105->97 |
| under5-all-cause-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | 2/6 | 5/8 | 0.75 | 1.0 | 1 | 0.659 | 114->97 |
| under5-tetanus-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | 4/6 | 5/7 | 0.5 | 1.0 | 0 | 0.826 | 107->77 |
| pertussis-global | `x9b` | `llama3.1:8b` | `qwen3.5:9b` | 2/6 | 6/6 | 0.333 | 0.875 | 1 | 0.906 | 125->129 |
| pertussis-global | `x35b` | `llama3.1:8b` | `qwen3.6:35b` | 2/6 | 9/10 | 0.333 | 0.75 | 1 | 0.843 | 125->92 |
| pertussis-global | `q4b` | `qwen3.5:4b` | `gemma4:31b` | 7/7 | 6/6 | 0.714 | 1.0 | 0 | 0.608 | 77->71 |
| pertussis-global | `q9b` | `qwen3.5:9b` | `gemma4:31b` | 4/4 | 8/8 | 0.5 | 0.75 | 0 | 0.871 | 126->107 |
| pertussis-global | `q2b` | `qwen3.5:2b` | `gemma4:31b` | 7/7 | 9/9 | 0.286 | 0.667 | 0 | 0.87 | 158->135 |

## D. Framing and style

`sel.ratio` compares the trend across the years the story cites with the
trend of the whole series: near 1 mirrors it, negative points the other way.

| dataset | tier | generator | moderator | sel.ratio raw | flipped | hedge r->m | superl r->m | num.dens r->m |
|---|---|---|---|---|---|---|---|---|
| measles | `mid` | `llama3.1:8b` | `gemma4:31b` | None | None | 0.0->1.98 | 0.92->1.98 | 4.59->17.82 |
| pertussis-global | `mid` | `llama3.1:8b` | `gemma4:31b` | 52.9144 | False | 2.16->0.76 | 0.0->0.0 | 7.19->12.88 |
| pertussis-global | `m31b-selfjudge` | `llama3.1:8b` | `gemma4:31b` | 1.0 | False | 0.0->0.0 | 1.82->0.0 | 15.45->20.59 |
| pertussis-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | 1.0 | False | 0.0->0.0 | 1.82->0.0 | 15.45->20.59 |
| pertussis-global | `g1b` | `llama3.2:1b` | `gemma4:31b` | -0.3932 | True | 0.0->1.14 | 1.0->2.27 | 8.0->12.5 |
| pertussis-global | `g3b` | `llama3.2:3b` | `gemma4:31b` | 1.0 | False | 0.0->0.0 | 1.69->1.72 | 11.02->9.48 |
| pertussis-global | `g4b` | `qwen3.5:4b` | `gemma4:31b` | 101.4906 | False | 2.9->3.17 | 0.0->0.0 | 20.29->19.05 |
| pertussis-global | `m12b` | `llama3.1:8b` | `gemma4:12b` | 1.0 | False | 0.0->0.0 | 1.82->0.0 | 15.45->16.42 |
| pertussis-global | `m26b` | `llama3.1:8b` | `gemma4:26b` | 1.0 | False | 0.0->0.0 | 1.82->0.0 | 15.45->21.36 |
| measles | `g8b` | `llama3.1:8b` | `gemma4:31b` | 1.0 | False | 0.0->0.0 | 0.0->0.0 | 10.43->12.12 |
| mumps-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | 0.5503 | False | 0.0->0.0 | 0.0->0.0 | 13.39->16.67 |
| diphtheria-global | `g8b` | `llama3.1:8b` | `gemma4:31b` | 1.0 | False | 0.99->0.0 | 1.98->1.08 | 13.86->21.51 |
| under5-measles-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | 1.0 | False | 1.02->0.0 | 0.0->0.0 | 10.2->13.48 |
| under5-all-cause-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | 1.0364 | False | 0.92->1.12 | 0.0->0.0 | 6.42->10.11 |
| under5-tetanus-deaths | `g8b` | `llama3.1:8b` | `gemma4:31b` | 1.0 | False | 2.11->1.52 | 0.0->0.0 | 17.89->25.76 |
| pertussis-global | `x9b` | `llama3.1:8b` | `qwen3.5:9b` | 1.0 | False | 0.0->0.88 | 1.82->0.0 | 15.45->18.58 |
| pertussis-global | `x35b` | `llama3.1:8b` | `qwen3.6:35b` | 1.0 | False | 0.0->0.0 | 1.82->0.0 | 15.45->35.62 |
| pertussis-global | `q4b` | `qwen3.5:4b` | `gemma4:31b` | 101.4906 | False | 2.9->3.17 | 0.0->0.0 | 20.29->19.05 |
| pertussis-global | `q9b` | `qwen3.5:9b` | `gemma4:31b` | 0.3851 | False | 0.0->3.16 | 1.68->2.11 | 8.4->17.89 |
| pertussis-global | `q2b` | `qwen3.5:2b` | `gemma4:31b` | 17.022 | False | 1.97->1.67 | 0.66->0.83 | 6.58->18.33 |
