#!/usr/bin/env python3
"""Measles tone-moderation pipeline:
   qwen3.5:4b (small)  -> generate story
   gemma4:12b (big)    -> moderate emotional tone
   Opus 4.7              -> final judge (done outside this script)
"""
import json, re, requests, sys

API = "http://localhost:11434/api/generate"

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


def ollama(model, system, prompt, temperature):
    r = requests.post(API, json={
        "model": model, "system": system, "prompt": prompt,
        "stream": False, "think": False,
        "options": {"temperature": temperature, "num_ctx": 8192},
    }, timeout=600)
    r.raise_for_status()
    out = r.json().get("response", "")
    return re.sub(r"<think>.*?</think>", "", out, flags=re.S).strip()


# ---------- 1) GENERATION (small model) ----------
gen_sys = "You are a data journalist who writes short, vivid, attention-grabbing stories for a general audience."
gen_prompt = f"""{DATA}

Write a SHORT data story (120-160 words) about global measles and vaccination using ONLY the numbers above.
Make it engaging and memorable. Give it a headline."""
print(">>> GENERATING with qwen3.5:4b ...", file=sys.stderr)
story = ollama("qwen3.5:4b", gen_sys, gen_prompt, 0.6)

# ---------- 2) MODERATION (big model) ----------
mod_sys = ("You are an EMOTIONAL-TONE MODERATION agent for data stories. You detect exaggerated, alarmist, "
           "or manipulative emotional tone and rewrite the story so the tone is calibrated and faithful to "
           "the data. You must NOT remove factual substance or legitimate gravity, and you must NOT add any "
           "facts or numbers that are not in the provided data.")
mod_prompt = f"""{DATA}

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
print(">>> MODERATING with gemma4:12b ...", file=sys.stderr)
moderated = ollama("gemma4:12b", mod_sys, mod_prompt, 0.0)

# ---------- output ----------
result = (f"================ STORY A — qwen3.5:4b (generator) ================\n{story}\n\n"
          f"================ gemma4:12b (emotional moderation) ================\n{moderated}\n")
print(result)
open("pipeline_run.txt", "w").write(result)
print(">>> saved pipeline_run.txt", file=sys.stderr)
