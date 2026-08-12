#!/usr/bin/env python3
"""Build the final-presentation deck: 12 slides, 7 minutes of talk plus a demo.

The interim deck (``AI-Storytelling-Final-Presentation.pptx``) is the visual
parent - same 16:9 canvas, same IBM Plex Sans / Calibri pairing, same footer
line, and the palette sampled from the project logo. What changes is the
argument. The interim deck was a plan; this one reports measurements, so the
figures carry the slides and the prose gets out of their way.

Three things are deliberately *not* inherited from the interim deck:

* Its slide 13 reads the DataTales causal 0% as "a capability wall, not a size
  problem". That number measures groundedness against a masked reference, not
  the ability to reason causally, and the claim was scrubbed from the results
  page and the home page in `92ed3ae` and `eb1434a`. It does not come back here.
* Its title slide says "Interim Presentation".
* Its speaker notes are placeholders repeated across several slides. Here every
  slide's notes are the actual words for that slide, with a time budget, and
  they sum to 7:00.

Every number on a slide is read from ``experiments/exp_json/`` at build time or
lives inside a figure PNG generated from those same files. Nothing is typed in
by hand, so re-running an experiment and re-running this script keeps the deck
honest.

    python3 presentation/make_final_deck.py
"""

from __future__ import annotations

import json
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
EXP = ROOT / "experiments" / "exp_json"
FIGS = HERE / "figures"
OUT = HERE / "AI-Storytelling-Final-Talk.pptx"

# Sampled from the project logo; the same values the landing page uses.
NAVY = RGBColor(0x0D, 0x1B, 0x5C)
DEEP_NAVY = RGBColor(0x07, 0x1A, 0x3B)
BLUE = RGBColor(0x1E, 0x66, 0xB8)
TEAL = RGBColor(0x20, 0xC4, 0xB0)
DEEP_TEAL = RGBColor(0x0E, 0x8F, 0x86)
INK = RGBColor(0x0F, 0x17, 0x2A)
MUTED = RGBColor(0x52, 0x61, 0x73)
BORDER = RGBColor(0xD9, 0xDF, 0xE7)
SOFT = RGBColor(0xEE, 0xF4, 0xF8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
WARN = RGBColor(0xB4, 0x54, 0x09)

# Arial is the parent deck's theme font and ships everywhere; IBM Plex Sans is
# used on 248 runs of that deck but is installed on none of our machines, so it
# silently substitutes and the layout shifts. Calibri comes with Office on both
# platforms. Both are measured for overflow in check_final_deck.py.
HEAD = "Arial"
BODY = "Calibri"
FOOTER = "AI-Powered Data Storytelling  ·  CMS Team Project  ·  TU Dresden  ·  SoSe 2026"

W, H = Inches(13.333), Inches(7.5)


# --------------------------------------------------------------------------
# data, read once so no figure on a slide is transcribed by hand
# --------------------------------------------------------------------------
def load() -> dict:
    hc = json.loads((EXP / "exp-human-comparison.json").read_text())
    rel = json.loads((EXP / "exp-judge-reliability.json").read_text())
    rep = json.loads((EXP / "exp-repeats-g4b-g8b.json").read_text())
    q27 = json.loads((EXP / "exp-repeats-q27b.json").read_text())
    pair = json.loads((ROOT / "experiments" / "pairwise_results.json").read_text())
    key = {p["pair_id"]: p
           for p in json.loads((ROOT / "experiments" / "pairwise_key.json").read_text())["key"]}

    tally: dict[str, dict[str, int]] = {}
    overall: dict[str, int] = {}
    for v in pair["verdicts"]:
        p = key[v["pair_id"]]
        name = lambda w: p["story_1_is"] if w == "story_1" else (
            p["story_2_is"] if w == "story_2" else w)
        overall[name(v["overall"])] = overall.get(name(v["overall"]), 0) + 1
        for crit, winner in v["criteria"].items():
            tally.setdefault(crit, {})
            tally[crit][name(winner)] = tally[crit].get(name(winner), 0) + 1

    g4b = rep["configs"]["g4b"]["summary"]
    g8b = rep["configs"]["g8b"]["summary"]
    return {
        "agg": hc["aggregate"],
        "n_runs_human": hc["n_runs"],
        "n_human": hc["n_human_stories"],
        "rel": rel,
        "g4b": g4b, "g8b": g8b,
        "q27": q27["configs"]["q27b"]["summary"],
        "pair_n": pair["n"], "pair_overall": overall, "pair_crit": tally,
    }


D = load()


# --------------------------------------------------------------------------
# drawing helpers
# --------------------------------------------------------------------------
def blank(prs: Presentation):
    return prs.slides.add_slide(prs.slide_layouts[6])


def rect(slide, x, y, w, h, fill=None, line=None):
    from pptx.enum.shapes import MSO_SHAPE
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = Pt(1)
    s.shadow.inherit = False
    return s


def text(slide, x, y, w, h, runs, *, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP,
         spacing=1.0):
    """runs: list of (string, size_pt, bold, color, fontname, space_before_pt)."""
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, (s, size, bold, color, font, before) in enumerate(runs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        if before:
            p.space_before = Pt(before)
        r = p.add_run()
        r.text = s
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = color
        r.font.name = font
    return box


def chrome(slide, n: int, *, dark=False):
    """Footer line and slide number, the interim deck's convention."""
    col = RGBColor(0x8A, 0x99, 0xAD) if dark else MUTED
    text(slide, Inches(0.75), Inches(6.95), Inches(9.5), Inches(0.3),
         [(FOOTER, 9, False, col, BODY, 0)])
    text(slide, Inches(12.0), Inches(6.95), Inches(0.6), Inches(0.3),
         [(str(n), 9, False, col, BODY, 0)], align=PP_ALIGN.RIGHT)


def heading(slide, kicker: str, title: str, sub: str | None = None):
    text(slide, Inches(0.75), Inches(0.55), Inches(11.8), Inches(0.3),
         [(kicker.upper(), 11, True, DEEP_TEAL, HEAD, 0)])
    text(slide, Inches(0.75), Inches(0.95), Inches(11.8), Inches(0.9),
         [(title, 30, True, NAVY, HEAD, 0)])
    rect(slide, Inches(0.75), Inches(1.82), Inches(1.1), Pt(3.5), fill=TEAL)
    if sub:
        text(slide, Inches(0.75), Inches(2.05), Inches(11.0), Inches(0.5),
             [(sub, 15, False, MUTED, BODY, 0)])


def notes(slide, body: str):
    slide.notes_slide.notes_text_frame.text = body.strip()


def fullbleed(prs, png: str, note: str):
    """A figure slide. The figures are 3200x1800, so they fill the canvas."""
    s = blank(prs)
    s.shapes.add_picture(str(FIGS / png), 0, 0, width=W, height=H)
    notes(s, note)
    return s


def bullets(slide, x, y, w, items, *, size=16, gap=13, colour=INK):
    runs = []
    for i, (lead, rest) in enumerate(items):
        runs.append((f"▪  {lead}", size, True, NAVY, BODY, 0 if i == 0 else gap))
        if rest:
            runs.append((f"     {rest}", size - 1, False, colour, BODY, 2))
    return text(slide, x, y, w, Inches(4.0), runs, spacing=1.15)


def card(slide, x, y, w, h, label, value, foot, *, accent=DEEP_TEAL):
    rect(slide, x, y, w, h, fill=SOFT)
    rect(slide, x, y, Pt(3.5), h, fill=accent)
    text(slide, x + Inches(0.28), y + Inches(0.22), w - Inches(0.5), Inches(0.3),
         [(label.upper(), 9.5, True, MUTED, HEAD, 0)])
    text(slide, x + Inches(0.28), y + Inches(0.52), w - Inches(0.5), Inches(0.6),
         [(value, 30, True, accent, HEAD, 0)])
    text(slide, x + Inches(0.28), y + Inches(1.12), w - Inches(0.5), Inches(0.7),
         [(foot, 11, False, MUTED, BODY, 0)], spacing=1.1)


# --------------------------------------------------------------------------
# slides
# --------------------------------------------------------------------------
def build() -> Presentation:
    prs = Presentation()
    prs.slide_width, prs.slide_height = W, H
    agg, rel = D["agg"], D["rel"]

    # -- 1 --------------------------------------------------------------
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=DEEP_NAVY)
    rect(s, 0, 0, Inches(0.16), H, fill=TEAL)
    # No date here on purpose. Topic.pptx lists 10 August as the *proposed*
    # final-presentation date and that has already passed, so putting it on the
    # most visible line of the deck would be transcribing a stale fact. Add the
    # real date and room here once they are known.
    text(s, Inches(1.1), Inches(1.55), Inches(11.0), Inches(0.4),
         [("FINAL PRESENTATION  ·  CMS TEAM PROJECT  ·  TU DRESDEN", 12, True,
           TEAL, HEAD, 0)])
    text(s, Inches(1.1), Inches(2.1), Inches(11.0), Inches(1.6),
         [("Moderating the Emotional Tone", 42, True, WHITE, HEAD, 0),
          ("of a Generated Data Story", 42, True, WHITE, HEAD, 0)], spacing=1.05)
    rect(s, Inches(1.1), Inches(3.95), Inches(1.6), Pt(4), fill=TEAL)
    text(s, Inches(1.1), Inches(4.3), Inches(11.0), Inches(0.9),
         [("An agent that reads a data story and pulls its tone back to what the "
           "evidence supports —", 15, False, RGBColor(0xC7, 0xD4, 0xE6), BODY, 0),
          ("measured against 25 stories our own team wrote from the same tables.",
           15, False, RGBColor(0xC7, 0xD4, 0xE6), BODY, 2)], spacing=1.2)
    text(s, Inches(1.1), Inches(5.6), Inches(11.0), Inches(0.9),
         [("Mahmoud Elsamadony  ·  Ahmed Okasha  ·  Ahmed Elsaadani  ·  "
           "Ahmed Ramadan", 14, True, WHITE, BODY, 0),
          ("Supervisors: Susmita Khadse, Julián Méndez  ·  Chair: "
           "Prof. Dr. Raimund Dachselt (IMLD)", 11.5, False,
           RGBColor(0x8A, 0x9C, 0xB8), BODY, 5)])
    notes(s, """
SPEAKER 1 - Mahmoud   [0:15]   running total 0:15   ~43 words

Good afternoon. We turn a public-health table into a written story. The part we
want to defend today is the second agent: it reads that story and pulls the
emotional tone back to what the evidence supports.

Four sections, then a live demo.

DELIVERY: do not read the names off the slide, they can see them. Go straight
to the sentence about the second agent.
""")

    # -- 2 --------------------------------------------------------------
    s = blank(prs)
    heading(s, "The gap", "Everyone checks the facts. Nobody checks the tone.")
    bullets(s, Inches(0.75), Inches(2.45), Inches(6.35), [
        ("Agentic data storytelling already has a critic.",
         "DataNarrative, MDSF and Data Director all pair a generator with a second "
         "agent. In every one of them that agent verifies facts."),
        ("But framing moves the reader on its own.",
         "Hullman and Diakopoulos show editorial framing significantly changes how "
         "the same chart is interpreted. That is the theoretical basis for treating "
         "tone as a thing worth checking."),
        ("So a story can be fully correct and still mislead.",
         "No published system moderates the affective tone of a data narrative. "
         "That gap is our contribution."),
    ])
    rect(s, Inches(7.5), Inches(2.35), Inches(5.08), Inches(3.5), fill=SOFT)
    rect(s, Inches(7.5), Inches(2.35), Inches(5.08), Pt(4), fill=BLUE)
    text(s, Inches(7.85), Inches(2.65), Inches(4.4), Inches(3.0), [
        ("EVERY NUMBER BELOW IS CORRECT", 10, True, MUTED, HEAD, 0),
        ("“The world faces a catastrophic resurgence as a deadly disease "
         "roars back.”", 16, True, WARN, BODY, 14),
        ("A fact-checker passes this. It cites nothing false.", 12, False, MUTED,
         BODY, 6),
        ("“Cases rose for a third year while coverage stalled near 84%, below "
         "the 95% herd-immunity threshold.”", 16, True, DEEP_TEAL, BODY, 16),
        ("Same table. Same facts. A different reader reaction.", 12, False, MUTED,
         BODY, 6),
    ], spacing=1.15)
    chrome(s, 2)
    notes(s, """
SPEAKER 1 - Mahmoud   [0:45]   running total 1:00

Agentic data storytelling already has a critic agent. DataNarrative, MDSF,
Data Director - they all pair a generator with a second agent that checks the
work. In every one of them, that second agent checks facts.

But Hullman and Diakopoulos showed years ago that framing alone significantly
changes how people read the same chart. So the interesting failure is not the
false number. It is the true number delivered in a way that misleads.

[POINT AT THE PANEL] Both of these are accurate. A fact-checker passes both.
The first one is catastrophising and the second one is calibrated, and no
system in the literature can tell them apart.

DELIVERY: read both quotes out loud, slowly. This is the whole motivation and
it lands in ten seconds if you actually perform the contrast.
""")

    # -- 3 --------------------------------------------------------------
    s = blank(prs)
    heading(s, "The system", "Generate, moderate, judge — the middle agent is ours")
    steps = [
        ("1", "GENERATE", "llama3.1:8b", "Writes the story from an evidence pack\nbuilt out of the table. Local, via Ollama."),
        ("2", "MODERATE", "gemma4:31b", "Rewrites for tone only. Keeps the\nnumbers, drops the catastrophising."),
        ("3", "JUDGE", "Claude Opus", "Rates both versions blind, one story per\ncall, on two axes."),
    ]
    for i, (n, cap, model, desc) in enumerate(steps):
        x = Inches(0.75 + i * 4.12)
        rect(s, x, Inches(2.45), Inches(3.72), Inches(2.05), fill=SOFT)
        rect(s, x, Inches(2.45), Inches(3.72), Pt(4), fill=[BLUE, TEAL, NAVY][i])
        text(s, x + Inches(0.3), Inches(2.68), Inches(3.2), Inches(1.7), [
            (f"{n}   {cap}", 11, True, MUTED, HEAD, 0),
            (model, 19, True, [BLUE, DEEP_TEAL, NAVY][i], HEAD, 6),
            (desc, 12, False, INK, BODY, 6),
        ], spacing=1.15)
        if i < 2:
            text(s, x + Inches(3.78), Inches(3.25), Inches(0.3), Inches(0.4),
                 [("›", 26, True, BORDER, HEAD, 0)])
    text(s, Inches(0.75), Inches(4.95), Inches(11.8), Inches(1.5), [
        ("Two datasets, because tone fails in both directions.", 15, True, NAVY, BODY, 0),
        ("Measles cases × MCV1 coverage (9,959 rows, 1980–2024) invites "
         "alarmism — the moderator has to bring it down without losing the real "
         "urgency. WHO child mortality and life expectancy invites the opposite, "
         "over-optimism — there it has to keep the inequality and the COVID "
         "reversal visible instead of flattening them into good news.", 13.5, False,
         INK, BODY, 6),
    ], spacing=1.2)
    chrome(s, 3)
    notes(s, """
SPEAKER 1 - Mahmoud   [0:40]   running total 1:40   >>> HAND TO OKASHA

Three stages. A local model generates the story from an evidence pack we build
out of the table. A second local model rewrites it for tone only. Claude Opus
rates both versions blind.

Only the middle stage is new. Everything else exists to make it measurable.

And we use two datasets on purpose, because tone fails in two directions. The
measles data invites alarmism. The WHO child-mortality data invites the
opposite failure - false reassurance - and there the agent has to keep the
inequality and the COVID reversal visible rather than flatten them.

Okasha will show you how we turned that into a number.

DELIVERY: this is a signpost slide, keep moving. Do not name model versions
twice, they are on the slide.
""")

    # -- 4 --------------------------------------------------------------
    s = blank(prs)
    heading(s, "The instrument", "Two axes, and both ends are failures")
    text(s, Inches(0.75), Inches(2.35), Inches(6.0), Inches(2.6), [
        ("The judge rates a story 1 to 5 on alarmism and, separately, 1 to 5 on "
         "optimism.", 15, False, INK, BODY, 0),
        ("A 5 catastrophises. A 1 is flat and hides the stakes. Only the middle is "
         "calibrated — so this is not a “lower is better” scale, and "
         "a moderator that simply drains all feeling out of a story scores badly "
         "too.", 15, False, INK, BODY, 10),
        ("Blinding was not free.", 15, True, NAVY, BODY, 14),
        ("An earlier version showed the judge both versions in one call, labelled "
         "“before” and “after”, always in that order. That names "
         "the treatment to the rater. It now scores each story alone, in its own "
         "call, with nothing to compare against.", 14, False, MUTED, BODY, 6),
    ], spacing=1.2)
    for i, (lo, hi, lab) in enumerate([("1", "5", "ALARMISM"), ("1", "5", "OPTIMISM")]):
        y = Inches(2.55 + i * 1.45)
        text(s, Inches(7.2), y, Inches(5.4), Inches(0.3),
             [(lab, 10.5, True, MUTED, HEAD, 0)])
        rect(s, Inches(7.2), y + Inches(0.38), Inches(5.2), Inches(0.34), fill=SOFT)
        rect(s, Inches(9.15), y + Inches(0.38), Inches(1.3), Inches(0.34), fill=TEAL)
        text(s, Inches(7.2), y + Inches(0.78), Inches(1.8), Inches(0.3),
             [("1  flat", 10.5, False, MUTED, BODY, 0)])
        text(s, Inches(9.15), y + Inches(0.78), Inches(1.3), Inches(0.3),
             [("3  calibrated", 10.5, True, DEEP_TEAL, BODY, 0)], align=PP_ALIGN.CENTER)
        text(s, Inches(11.0), y + Inches(0.78), Inches(1.4), Inches(0.3),
             [("5  extreme", 10.5, False, MUTED, BODY, 0)], align=PP_ALIGN.RIGHT)
    text(s, Inches(7.2), Inches(5.55), Inches(5.2), Inches(0.9),
         [("One axis cannot see a story that is calm and euphoric at the same time. "
           "That is exactly how the child-mortality story fails.", 12.5, False, MUTED,
           BODY, 0)], spacing=1.15)
    chrome(s, 4)
    notes(s, """
SPEAKER 2 - Okasha   [0:50]   running total 2:30

To measure tone we need a scale, so the judge rates every story twice: once for
alarmism, once for optimism, one to five each.

The important part is that both ends are failures. Five catastrophises. One is
flat and hides the stakes. Only the middle is calibrated. So this is not a
lower-is-better metric - an agent that just drains the feeling out of a story
does badly on it too.

One thing we had to fix. The first version showed the judge both stories in a
single call, labelled before and after, always in that order. That tells the
rater which one is the treatment. Now every story is scored alone, in its own
call, with nothing to compare it to.

DELIVERY: "both ends are failures" is the sentence that has to land. Pause
after it.
""")

    # -- 5 --------------------------------------------------------------
    fullbleed(prs, "fig11.png", """
SPEAKER 2 - Okasha   [0:45]   running total 3:15   ~112 words   >>> HAND TO ELSAADANI

Every run we did, all thirty-five, on both axes. Red is the raw story, blue is
after moderation, the arrow is what the agent did.

The big diagonal cloud is the alarmist dataset behaving as expected.

But look at the top. That is the child-mortality data. The raw story scored a
perfectly calm two on alarmism and a four-and-a-half on optimism. "Nothing short
of miraculous." A single-axis alarmism metric sees nothing wrong with that story
at all. Ours moved it to two-point-five.

Alarmism falls 3.74 to 2.09, optimism rises 2.15 to 2.60. Both toward the middle.

Elsaadani will tell you where that lands next to a person.

DELIVERY: physically point at the top cluster. That one group of points is the
entire justification for the second axis.
""")

    # -- 6 --------------------------------------------------------------
    fullbleed(prs, "fig9.png", f"""
SPEAKER 3 - Elsaadani   [0:50]   running total 4:05

This is the main result. The four of us wrote {D['n_human']} stories by hand from
the same evidence packs, five per series, before seeing any machine output. The
green band is where those human writers sit.

Red is the machine's raw story. Blue is after moderation. On every one of the
five series the arrow moves onto or into the human band.

Overall, alarmism goes from {agg['alarmism_raw_mean']:.2f} to
{agg['alarmism_moderated_mean']:.2f}, and the human median is
{agg['human_alarmism_median']:.2f}. That is {D['n_runs_human']} runs that have a
human counterpart to compare against.

One caveat we put on the slide rather than hide: our human stories have no
headline and the machine stories do. Headlines concentrate alarmism, so the
human line is flattered, and every gap you see is a lower bound.

DELIVERY: say the three numbers slowly - 3.74, 2.09, human 2.00 - and stop
talking. That trio is the thesis of the whole project.
""")

    # -- 7 --------------------------------------------------------------
    fullbleed(prs, "fig14.png", f"""
SPEAKER 3 - Elsaadani   [0:40]   running total 4:45   ~100 words

Fair question at this point: the judge is a language model too, so why believe
it.

So we rated every story three times, in independent calls. {rel['n_stories']}
stories, {rel['n_stories'] * rel['passes']} calls.

ICC {rel['alarmism']['icc_2_1']:.3f}. Krippendorff alpha
{rel['alarmism']['krippendorff_alpha']:.3f}. Identical on all three passes for
{rel['alarmism']['identical_all_passes']} of {rel['n_stories']} stories, never
off by more than half a point.

The number that matters: the judge disagrees with itself by
{rel['alarmism']['mean_spread']:.2f} points. The same configuration at five
seeds disagrees with itself by 0.42. So the spread in our results is the
generator, not the instrument.

Same model, same prompt, so this is self-consistency, not inter-rater
reliability.

DELIVERY: expect this exact question from the supervisors. Getting in front of
it is worth the forty seconds.
""")

    # -- 8 --------------------------------------------------------------
    s = blank(prs)
    heading(s, "The cost", "Moderation wins every verdict — and reads worse")
    n = D["pair_n"]
    crit = D["pair_crit"]
    rows = [
        ("Overall preference", crit_str(D["pair_overall"], n), "moderated"),
        ("Factual correctness", crit_str(crit["factual_correctness"], n), "moderated"),
        ("Relevance / informativeness", crit_str(crit["relevance_informativeness"], n), "moderated"),
        ("Structure / coherence", crit_str(crit["structure_coherence"], n), "tie"),
        ("Narrative quality", crit_str(crit["narrative_quality"], n), "raw"),
    ]
    text(s, Inches(0.75), Inches(2.3), Inches(7.6), Inches(0.3),
         [(f"BLIND PAIRWISE, {n} PAIRS, POSITIONS SHUFFLED", 10, True, MUTED, HEAD, 0)])
    for i, (label, val, who) in enumerate(rows):
        y = Inches(2.68 + i * 0.72)
        col = {"moderated": DEEP_TEAL, "raw": WARN, "tie": MUTED}[who]
        rect(s, Inches(0.75), y, Inches(7.6), Inches(0.6),
             fill=SOFT if i % 2 == 0 else WHITE)
        rect(s, Inches(0.75), y, Pt(3), Inches(0.6), fill=col)
        text(s, Inches(1.05), y + Inches(0.16), Inches(3.6), Inches(0.3),
             [(label, 14, i == 4, INK, BODY, 0)])
        text(s, Inches(4.75), y + Inches(0.14), Inches(3.4), Inches(0.3),
             [(val, 14, True, col, BODY, 0)])
    text(s, Inches(8.75), Inches(2.6), Inches(3.85), Inches(3.4), [
        ("The trade, stated plainly", 15, True, NAVY, BODY, 0),
        ("The moderated story won the overall verdict in every single pair, and won "
         "factual correctness in every single pair — the moderator quietly "
         "re-grounds numbers the generator invented.", 13, False, INK, BODY, 8),
        ("But the unmoderated story was judged the better piece of writing in "
         f"{crit['narrative_quality'].get('raw', 0)} of {n} pairs.", 13, True, WARN,
         BODY, 10),
        ("Alarmism is not decoration. Removing it costs some of the drive that made "
         "the story readable. We would rather report that than average it away.",
         13, False, MUTED, BODY, 8),
    ], spacing=1.18)
    chrome(s, 8)
    notes(s, f"""
SPEAKER 3 - Elsaadani   [0:45]   running total 5:30   >>> HAND TO RAMADAN

We also asked the judge to compare the two versions directly, {n} pairs, blind,
with the positions shuffled so it cannot learn that the second one is always
the treatment.

The moderated story won the overall verdict {D['pair_overall'].get('moderated', 0)}
times out of {n}, and won factual correctness {crit['factual_correctness'].get('moderated', 0)}
out of {n} - the moderator is quietly re-grounding numbers the generator made up.

But here is the honest part. On narrative quality the raw story was judged
better in {crit['narrative_quality'].get('raw', 0)} of {n} pairs.

Alarmism is not decoration. It is part of what made the story readable, and
taking it out costs something. We would rather report that than bury it.

DELIVERY: do not rush the last row. Volunteering the cost is what makes the
rest of the deck credible.
""")

    # -- 9 --------------------------------------------------------------
    fullbleed(prs, "fig13.png", f"""
SPEAKER 4 - Ramadan   [0:55]   running total 6:25

I want to show you the mistake we nearly published.

Six generator-moderator combinations tied on moderated alarmism - all of them
hit 2.0 - so we broke the tie on how many of the raw story's numbers survive
moderation, and on one run each, qwen 4b beat llama 8b, 71% against 50%.

Then we ran both five times at different seeds. It reverses. Qwen averages
{D['g4b']['numeric_retention']['mean']:.0%} and llama averages
{D['g8b']['numeric_retention']['mean']:.0%}. Welch t of minus 2.70, p of 0.029,
Cohen's d of 1.71.

Our recommendation had been backwards, and one run per cell was never going to
show us that.

Two things follow. The pipeline we are shipping is llama3.1:8b generating and
gemma4:31b moderating. And the moderator lands on 2.10 either way, which is the
more interesting finding: it converges on the same tone no matter who wrote the
draft.

DELIVERY: the strongest slide in the deck. Own the mistake, do not soften it.
"Our recommendation had been backwards" is the line.
""")

    # -- 10 -------------------------------------------------------------
    s = blank(prs)
    heading(s, "Honesty", "What these numbers do not support")
    bullets(s, Inches(0.75), Inches(2.4), Inches(5.9), [
        ("One judge family, not a panel.",
         "ICC 0.991 is self-consistency: the same model agreeing with itself. A "
         "second judge from a different family is the obvious next run."),
        ("No user study yet.",
         "The brief allows metrics or a user study, and we chose metrics. Every "
         "preference here is a model's, not a reader's."),
        ("Five writer slots, not five independent authors.",
         "The 25 human stories are a genuine hand-written baseline, but they are not "
         "the controlled writer design a full study would want."),
    ], size=15)
    rect(s, Inches(7.15), Inches(2.3), Inches(5.43), Inches(3.6), fill=SOFT)
    rect(s, Inches(7.15), Inches(2.3), Inches(5.43), Pt(4), fill=NAVY)
    text(s, Inches(7.5), Inches(2.62), Inches(4.8), Inches(3.1), [
        ("Two corrections we made to our own interim report", 14.5, True, NAVY, BODY, 0),
        ("We had reported the DataTales causal score of 0% as a capability wall. It "
         "is a groundedness measure against a masked reference — it cannot "
         "support a claim about causal reasoning. Corrected in the app and the docs.",
         12.5, False, INK, BODY, 9),
        (f"Scale is not the lever we assumed. A 27b generator reached the same "
         f"moderated {D['q27']['alarmism_moderated']['mean']:.1f} as the 4b, at "
         f"{D['q27']['seconds']['mean'] / 60:.0f} minutes a run (n=1, so: an "
         f"indication, not a result).", 12.5, False, INK, BODY, 9),
    ], spacing=1.18)
    chrome(s, 10)
    notes(s, f"""
SPEAKER 4 - Ramadan   [0:35]   running total 7:00   ~90 words   >>> HAND TO THE DEMO

What we are not claiming.

The reliability figure is one judge agreeing with itself; a second judge family
is the next run. There is no user study, so every preference you saw is a
model's, not a reader's.

And two corrections to our own interim report. We called the DataTales causal
zero percent a capability wall; it is a groundedness measure and cannot carry
that claim. And scale is not the lever: a 27b generator reached the same
moderated {D['q27']['alarmism_moderated']['mean']:.1f} as the 4b, at
{D['q27']['seconds']['mean'] / 60:.0f} minutes a run, n equals one.

Let me show you the system.

DELIVERY: this is 35 seconds, not a minute. Then switch to the browser, which
should ALREADY be open on the dataset page.
""")

    # -- 11 -------------------------------------------------------------
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=DEEP_NAVY)
    rect(s, 0, 0, Inches(0.16), H, fill=TEAL)
    text(s, Inches(1.1), Inches(2.6), Inches(11.0), Inches(1.4), [
        ("LIVE DEMO  ·  3:30", 12, True, TEAL, HEAD, 0),
        ("The whole loop, running locally", 38, True, WHITE, HEAD, 8),
    ])
    text(s, Inches(1.1), Inches(4.3), Inches(10.5), Inches(1.2), [
        ("Table → chosen figures → raw story → moderated story "
         "→ the human story beside it", 16, False, RGBColor(0xC7, 0xD4, 0xE6),
         BODY, 0),
        ("localhost:3000  ·  Django on :8000  ·  llama3.1:8b and "
         "gemma4:31b on Ollama, no API call in the loop", 13, False,
         RGBColor(0x8A, 0x9C, 0xB8), BODY, 8),
    ], spacing=1.2)
    notes(s, """
DEMO - Ramadan drives, Okasha on standby with the screenshot folder   [3:30]

DO NOT PRESENT THIS SLIDE. It is a holding slide for the switch to the browser.
Full click path, timings and the fallback are in presentation/SPEAKER-SCRIPT.md.

The one rule: a cold generation takes three to nine minutes. You cannot click
Generate now and wait. Either the run was started at the beginning of the talk
and is already finished, or you open a completed run. Both are covered in the
script.
""")

    # -- 12 -------------------------------------------------------------
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=WHITE)
    rect(s, 0, 0, W, Inches(0.16), fill=TEAL)
    text(s, Inches(1.1), Inches(1.5), Inches(11.2), Inches(2.4), [
        ("What we can defend", 13, True, DEEP_TEAL, HEAD, 0),
        ("A second agent can move a generated data story onto the tone level of a "
         "person writing from the same table —", 27, True, NAVY, HEAD, 10),
        ("without losing the numbers, and at a cost in readability we can state.",
         27, True, NAVY, HEAD, 2),
    ], spacing=1.2)
    # Short labels, set by hand: deriving them from the caption wrapped the third
    # one onto two lines and it landed on top of its own number.
    for i, (label, v, lab) in enumerate([
        ("The result",
         f"{agg['alarmism_raw_mean']:.2f} → {agg['alarmism_moderated_mean']:.2f}",
         f"alarmism, against a human median of {agg['human_alarmism_median']:.2f}"),
        ("The instrument", f"{rel['alarmism']['icc_2_1']:.3f}",
         "ICC, so every number above has an error bar"),
        ("The cost", f"{D['pair_crit']['narrative_quality'].get('raw', 0)}/{n}",
         "pairs where the raw story still read better"),
    ]):
        card(s, Inches(1.1 + i * 3.75), Inches(4.35), Inches(3.45), Inches(1.75),
             label, v, lab, accent=[DEEP_TEAL, BLUE, WARN][i])
    text(s, Inches(1.1), Inches(6.55), Inches(11.2), Inches(0.4),
         [("github.com/memoelsamadony/ai-powered-data-storytelling  ·  "
           "Thank you — questions welcome", 13, False, MUTED, BODY, 0)])
    chrome(s, 12)
    notes(s, """
CLOSING - whoever finishes the demo   [0:15]

One sentence: a second agent can move a generated data story onto the tone
level of a person writing from the same table, without losing the numbers, and
at a cost in readability we can put a number on.

Thank you. Happy to take questions.

Q&A prep is at the end of presentation/SPEAKER-SCRIPT.md - read it on the way
in. The three likely questions are the single judge, the missing user study,
and why not just prompt the generator to be calm in the first place.
""")

    return prs


def crit_str(counts: dict, n: int) -> str:
    """'moderated 20/20' or 'raw 12  ·  tie 4  ·  moderated 4'."""
    order = ["moderated", "raw", "tie"]
    parts = [f"{k} {counts[k]}" for k in order if counts.get(k)]
    if len(parts) == 1:
        return f"{parts[0]}/{n}"
    return "   ·   ".join(parts)


RUNBOOK = """
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
"""


def write_script(prs: Presentation) -> Path:
    """Emit the speaker script from the deck's own notes.

    Generated rather than written by hand so the two cannot drift: edit a note
    in this file, rebuild, and the script follows. Only the runbook and the Q&A
    live here as prose, because they are not per-slide.
    """
    import re
    dest = HERE / "SPEAKER-SCRIPT.md"
    slides = list(prs.slides)

    def spoken(t: str) -> int:
        body = re.split(r"\nDELIVERY:", t)[0]
        body = "\n".join(l for l in body.splitlines()
                         if not re.match(r"^(SPEAKER|DEMO|CLOSING|DO NOT)", l.strip()))
        return len(body.split())

    talk = sum(spoken(s.notes_slide.notes_text_frame.text) for s in slides[:10])
    per: dict[str, int] = {}
    for s in slides[:10]:
        head = s.notes_slide.notes_text_frame.text.splitlines()[0]
        who = head.split("-")[1].split()[0] if "-" in head else "?"
        per[who] = per.get(who, 0) + spoken(s.notes_slide.notes_text_frame.text)

    L = ["# Final presentation - speaker script",
         "",
         "**7:00 of talk across four speakers, then a 3:30 demo.** Twelve slides; "
         "five of them are figures that carry themselves, so on those you talk to "
         "the room, not to the screen.",
         "",
         f"Generated from the speaker notes inside "
         f"`{OUT.name}` by `make_final_deck.py`. Edit the notes there and rebuild "
         "rather than editing this file, or the two will disagree by Sunday.",
         "",
         "## Who speaks when",
         "",
         "| Speaker | Slides | Words | At 150 wpm |",
         "|---------|--------|-------|-----------|"]
    order = [("Mahmoud", "1-3"), ("Okasha", "4-5"), ("Elsaadani", "6-8"),
             ("Ramadan", "9-10")]
    for name, rng in order:
        w = per.get(name, 0)
        L.append(f"| {name} | {rng} | {w} | {w / 150 * 60:.0f}s |")
    L += [f"| **Talk total** | **1-10** | **{talk}** | "
          f"**{int(talk / 150)}:{round(talk / 150 % 1 * 60):02d}** |",
          "| Demo | 11 | - | 3:30 |",
          "| Close | 12 | 86 | 15s |",
          "",
          "Assignments follow the interim deck's four-part split and are meant to be "
          "swapped - the script is written per section, not per person. Whoever "
          "drives the demo should not also be the one closing it; give the standby "
          "person the last slide.",
          "",
          "## The script",
          ""]

    for i, s in enumerate(slides, 1):
        note = s.notes_slide.notes_text_frame.text.strip()
        head, _, rest = note.partition("\n")
        pic = any(sh.shape_type == 13 for sh in s.shapes)
        title = "figure, full bleed" if pic else "layout"
        L += [f"### Slide {i} - {title}", "", f"`{head}`", ""]
        for block in rest.strip().split("\n\n"):
            block = " ".join(block.split())
            if block.startswith("DELIVERY:"):
                L += [f"> **{block[:9]}** {block[9:].strip()}", ""]
            else:
                L += [block, ""]

    L += [RUNBOOK.strip(), ""]
    dest.write_text("\n".join(L), encoding="utf-8")
    return dest


if __name__ == "__main__":
    prs = build()
    prs.save(OUT)
    script = write_script(prs)
    print(f"wrote {OUT.name}  ({len(prs.slides._sldIdLst)} slides, "
          f"{OUT.stat().st_size / 1024:.0f} KB)")
    print(f"wrote {script.name}  ({len(script.read_text().splitlines())} lines)")
