#!/usr/bin/env python3
"""Reconstruct the EXACT inputs sent to each model + their outputs (no re-run)."""

# --- identical constants to pipeline.py ---
DATA = """REAL DATA (reported measles cases; MCV1 = first-dose coverage, WUENIC):
World by year -> cases | MCV1%
  2000: 853,479 | 71
  2010: 343,806 | 84
  2016: 132,490 | 85   (recent low point)
  2019: 873,373 | 86   (large spike at high coverage)
  2021: 123,152 | 81   (low - pandemic reduced transmission AND reporting)
  2023: 669,083 | 83
  2024: 675,533 | 84
Germany -> 2021: 10 cases, MCV1 98%, 0.12/million ; 2024: 645 cases, MCV1 96%, 7.6/million (highest since 2017)
Nigeria -> 2024: 14,999 cases, MCV1 57%, 65.8/million
Context: herd immunity needs ~95% coverage; global MCV1 has sat in the low 80s for a decade."""

GEN_SYS = "You are a data journalist who writes short, vivid, attention-grabbing stories for a general audience."
GEN_PROMPT = f"""{DATA}

Write a SHORT data story (120-160 words) about global measles and vaccination using ONLY the numbers above.
Make it engaging and memorable. Give it a headline."""

MOD_SYS = ("You are an EMOTIONAL-TONE MODERATION agent for data stories. You detect exaggerated, alarmist, "
           "or manipulative emotional tone and rewrite the story so the tone is calibrated and faithful to "
           "the data. You must NOT remove factual substance or legitimate gravity, and you must NOT add any "
           "facts or numbers that are not in the provided data.")

# --- recover the exact Story A + moderated output from the saved run ---
run = open("pipeline_run.txt").read()
g_tag = "================ STORY A — qwen3.5:4b (generator) ================\n"
m_tag = "\n================ gemma4:12b (emotional moderation) ================\n"
story = run.split(m_tag)[0].replace(g_tag, "").strip()
moderated = run.split(m_tag)[1].strip()

MOD_PROMPT = f"""{DATA}

Here is a data story produced by another model:
\"\"\"
{story}
\"\"\"

Do two things, with these exact headings:
ISSUES:
- (bullet list of specific tone problems: exaggeration, misleading baseline, overstated causation, dropped
  denominator / raw-count vs rate, unsupported prediction, emotional manipulation)

MODERATED STORY:
(the rewritten story, same length, calibrated tone, faithful to the data, keep a headline)"""

md = f"""# Exact model I/O — measles tone-moderation run

Both calls used the Ollama `/api/generate` endpoint with `stream=false`, `think=false`, `num_ctx=8192`.

==================================================================
# MODEL 1 (GENERATOR) — qwen3.5:4b   |   temperature = 0.6
==================================================================

----- SYSTEM -----
{GEN_SYS}

----- PROMPT -----
{GEN_PROMPT}

----- OUTPUT (Story A) -----
{story}


==================================================================
# MODEL 2 (EMOTIONAL MODERATOR) — gemma4:12b   |   temperature = 0.0
==================================================================

----- SYSTEM -----
{MOD_SYS}

----- PROMPT (note: it embeds Story A verbatim) -----
{MOD_PROMPT}

----- OUTPUT -----
{moderated}
"""
open("exact_io.txt", "w").write(md)
print(md)
