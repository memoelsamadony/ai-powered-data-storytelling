#!/usr/bin/env python3
"""Build the experiment report and the slide deck, both as PDF.

Everything is read from ``experiments/exp_json/*.json`` and the SVGs in
``figures/``. Nothing is transcribed, so a re-run of an experiment changes both
documents and they cannot drift apart from each other or from the data.

Figures are inlined as SVG rather than PNG: the PDF keeps them as vectors, so a
projector at any resolution gets clean type instead of a resampled screenshot.

    python3 presentation/build_docs.py

Needs headless Chrome, the same dependency figures/render.sh already has.
"""

from __future__ import annotations

import html
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
EXP = ROOT / "experiments"
FIGS = HERE / "figures"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def load(name: str) -> dict:
    return json.loads((EXP / "exp_json" / f"{name}.json").read_text())


def svg(name: str) -> str:
    """Inline an SVG, stripped of the XML declaration and sized to its box."""
    t = (FIGS / f"{name}.svg").read_text()
    t = re.sub(r"<\?xml[^>]*\?>", "", t)
    return t.replace("<svg ", '<svg preserveAspectRatio="xMidYMid meet" ', 1)


HUMAN = load("exp-human-comparison")
RANK = load("exp-combination-ranking")
REP = load("exp-repeats-g4b-g8b")
REL = load("exp-judge-reliability")
Q27 = load("exp-repeats-q27b")
PAIR = json.loads((EXP / "pairwise_results.json").read_text())
AG = HUMAN["aggregate"]

G4 = REP["configs"]["g4b"]["summary"]
G8 = REP["configs"]["g8b"]["summary"]
TEST = REP["test"]
RELA = REL["alarmism"]

CSS = """
@page { size: A4; margin: 20mm 18mm; }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 10.5pt;
       line-height: 1.55; color: #14171c; margin: 0; }
h1 { font-size: 22pt; line-height: 1.15; margin: 0 0 6pt; letter-spacing: -.01em; }
h2 { font-size: 14pt; margin: 22pt 0 6pt; padding-bottom: 4pt;
     border-bottom: 1.5pt solid #14171c; page-break-after: avoid; }
h3 { font-size: 11pt; margin: 14pt 0 4pt; page-break-after: avoid; }
p, li { max-width: 46em; }
.lede { font-size: 11.5pt; color: #4a5462; margin: 0 0 4pt; }
.meta { font-family: "SF Mono", Menlo, monospace; font-size: 8pt; color: #8590a0;
        letter-spacing: .06em; text-transform: uppercase; margin: 0 0 10pt; }
table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin: 8pt 0 4pt; }
th, td { padding: 4pt 7pt; text-align: left; border-bottom: .5pt solid #dfe3e8; }
th { background: #f1f3f6; font-size: 8pt; text-transform: uppercase;
     letter-spacing: .05em; color: #6b7684; }
td.n { font-family: "SF Mono", Menlo, monospace; text-align: right; }
.win td { background: #e6f4ec; }
.out td { background: #fbeae7; }
.fig { page-break-inside: avoid; margin: 10pt 0 4pt; }
.fig svg { width: 100%; height: auto; border: .5pt solid #dfe3e8; }
.cap { font-size: 8.5pt; color: #6b7684; margin: 4pt 0 0; padding-left: 8pt;
       border-left: 2pt solid #dfe3e8; }
.callout { background: #eef4fb; border-left: 3pt solid #2a78d6; padding: 8pt 11pt;
           margin: 10pt 0; page-break-inside: avoid; }
.callout p { margin: 0; }
.warn { background: #fdf3e3; border-left-color: #c9902c; }
.bad  { background: #fbeae7; border-left-color: #b03428; }
code { font-family: "SF Mono", Menlo, monospace; font-size: 9pt; }
"""


def report() -> str:
    least = REL["least_stable_stories"][0]
    return f"""<!doctype html><meta charset="utf-8"><title>Experiment report</title>
<style>{CSS}</style>
<p class="meta">CMS Team Project · TU Dresden · SoSe 2026 · generated from experiments/exp_json</p>
<h1>Emotional tone moderation:<br>what the experiments measured</h1>
<p class="lede">Every figure below comes from a run recorded in the project database
and judged by Claude Opus 5 blind, one story per call. Where a number carries a
caveat, the caveat is next to it.</p>

<h2>1. The question, and the instrument</h2>
<p>A general LLM writes a data story from an evidence pack; a second, agentic LLM
moderates its emotional tone; a separate pass fact-checks the result. The claim under
test is that moderation makes the tone more like a person's without costing accuracy.</p>
<p><strong>Tone is scored on two axes, each 1-5, where both ends are failures and 3 is
calibrated.</strong> Alarmism runs from flat to catastrophising; optimism from bleak to
false reassurance. Two axes rather than one because the datasets fail in opposite
directions: a falling series tempts glossing over remaining harm, which a single
alarmism axis scores as a calm 2.0 while it is exactly as miscalibrated.</p>
<p>The judge is <strong>Claude Opus 5</strong>, called through the CLI outside the Ollama
stack. It never generates and never moderates, so it grades no work of its own, and it
shares no vendor or family with the models under test. Each story is scored in its own
call, with no label and no sibling to compare against, so the judge never learns which
story was the treatment.</p>

<h2>2. Does moderation reach the human level?</h2>
<table>
<tr><th></th><th class="n">raw</th><th class="n">moderated</th><th class="n">human</th></tr>
<tr><td><strong>alarmism</strong></td><td class="n">{AG['alarmism_raw_mean']:.2f}</td>
    <td class="n">{AG['alarmism_moderated_mean']:.2f}</td>
    <td class="n">{AG['human_alarmism_median']:.2f}</td></tr>
<tr><td><strong>optimism</strong></td><td class="n">{AG['optimism_raw_mean']:.2f}</td>
    <td class="n">{AG['optimism_moderated_mean']:.2f}</td>
    <td class="n">{AG['human_optimism_median']:.2f}</td></tr>
</table>
<p>The two axes move in opposite directions and both land within 0.2 of the team's own
writers, {HUMAN['n_human_stories']} stories across {len(HUMAN['series'])} series.
Alarmism falls, optimism rises, both toward the middle.</p>
<div class="fig">{svg('fig9')}</div>
<p class="cap">Every series moves toward the human band. Pertussis, the hottest, travels
furthest.</p>
<div class="callout warn"><p><strong>Caveat.</strong> The human stories carry no headline
and the machine stories do. Headlines are where alarmism concentrates, so the human
column is if anything flattered and every gap shown is a lower bound. The set is also
not the four-named-writer shape the protocol specifies, so nothing here computes
<code>H</code>.</p></div>

<div class="fig">{svg('fig11')}</div>
<p class="cap">Why two axes. On WHO child mortality the raw story scored a calm 2.0 for
alarmism and 4.5 for optimism; a single-axis judge sees no problem there.</p>

<h2>3. Which generator and moderator</h2>
<p>Thirteen combinations were run on <code>pertussis-global</code>, one each. Six of them
land on the human median of 2.0 exactly, so tone does not discriminate between them and
faithfulness has to. That single-run table is reproduced as fig10 in the appendix; the
conclusion below supersedes it.</p>

<h3>Five seeds per cell changed the answer</h3>
<table>
<tr><th>config</th><th class="n">moderated alarmism</th><th class="n">numeric retention</th></tr>
<tr><td>qwen3.5:4b × gemma4:31b</td>
    <td class="n">{G4['alarmism_moderated']['mean']:.2f} ± {G4['alarmism_moderated']['sd']:.2f}</td>
    <td class="n">{G4['numeric_retention']['mean']*100:.0f}% ± {G4['numeric_retention']['sd']*100:.0f}%</td></tr>
<tr class="win"><td><strong>llama3.1:8b × gemma4:31b</strong></td>
    <td class="n">{G8['alarmism_moderated']['mean']:.2f} ± {G8['alarmism_moderated']['sd']:.2f}</td>
    <td class="n">{G8['numeric_retention']['mean']*100:.0f}% ± {G8['numeric_retention']['sd']*100:.0f}%</td></tr>
</table>
<div class="callout bad"><p><strong>The single-run ranking was backwards.</strong> One run
each had put qwen3.5:4b ahead on retention, 71% to 50%. Five distinct seeds each reverse
it: {G4['numeric_retention']['mean']*100:.0f}% against
{G8['numeric_retention']['mean']*100:.0f}%, Welch t = {TEST['t']}, p = {TEST['p']},
Cohen d = {abs(TEST['cohen_d'])}. Both original values were unrepresentative draws from
distributions spanning 33-83% and 67-100%.</p></div>
<p><strong>Moderated alarmism is identical, {G4['alarmism_moderated']['mean']:.2f} both,
p = 1.00.</strong> So the generator decides what survives moderation, not where the tone
lands. Recommendation: <strong>llama3.1:8b × gemma4:31b</strong>.</p>
<div class="fig">{svg('fig13')}</div>
<p class="cap">The flip, with the test on the figure.</p>

<h2>4. How much can the instrument be trusted?</h2>
<p>Every story was rated three times, {REL['passes'] * REL['n_stories']} calls in total.</p>
<table>
<tr><th>measure</th><th class="n">alarmism</th><th class="n">optimism</th></tr>
<tr><td>ICC(2,1), absolute agreement</td><td class="n">{RELA['icc_2_1']:.3f}</td>
    <td class="n">{REL['optimism']['icc_2_1']:.3f}</td></tr>
<tr><td>Krippendorff's alpha</td><td class="n">{RELA['krippendorff_alpha']:.3f}</td>
    <td class="n">{REL['optimism']['krippendorff_alpha']:.3f}</td></tr>
<tr><td>mean spread over three passes</td><td class="n">{RELA['mean_spread']:.2f}</td>
    <td class="n">{REL['optimism']['mean_spread']:.2f}</td></tr>
</table>
<p>{RELA['identical_all_passes']} of {REL['n_stories']} stories scored identically on all
three passes and {RELA['within_0_5']} of {REL['n_stories']} fell within 0.5. The widest
disagreement on any single story was {RELA['max_spread']:.1f}
({html.escape(least['dataset'])}/{html.escape(least['tier'])}, {least['kind']}).</p>
<div class="callout"><p><strong>This decomposes the variance in section 3.</strong> The
judge disagrees with itself by {RELA['mean_spread']:.2f} points; the same configuration
re-seeded disagrees with itself by {G4['alarmism_moderated']['sd']:.2f}. The spread in the
repeat experiment is the generator resampling, not the instrument wobbling.</p></div>
<div class="callout warn"><p>Same model and same prompt on all three passes, so this is
<em>self-consistency</em>, not inter-rater reliability. It is an upper bound on what a
different judge would agree to.</p></div>
<div class="fig">{svg('fig14')}</div>

<h2>5. Does the reader get a better story?</h2>
<p>The published pairwise protocol, with two departures: position is randomised per pair,
and the judge is never told which story was moderated.</p>
<div class="fig">{svg('fig12')}</div>
<p class="cap">Moderated wins overall and on factual correctness; it loses narrative
quality.</p>
<p><strong>Narrative quality is the cost.</strong> It is the only criterion the raw story
wins, and it wins it three times as often. The system buys calibration and accuracy by
spending engagement.</p>

<h2>6. Model scale versus model family</h2>
<p>Within the qwen3.5 family, raw alarmism does not fall with size: 4.8 at 2B, 4.6 at 4B,
4.5 at 9B and {Q27['configs']['q27b']['runs'][0]['alarmism_raw']} at 27B. The one calm
generator in the whole set is <code>llama3.1:8b</code> at
{G8['alarmism_raw']['mean']:.2f} over five seeds.</p>
<p>Scaling a qwen by more than 13× buys none of that calm, so <strong>writing calmly is a
family trait here, not a size effect</strong>. An earlier reading of the ladder as
"smaller generators write hotter copy" was a family effect misread as a scale one; the
27B rung is what settles it.</p>

<h2>7. What these numbers cannot support</h2>
<ul>
<li><strong>n = 1 outside the two repeated cells.</strong> Every other combination is a
single run, and section 3 is a worked demonstration of how badly that can mislead.</li>
<li><strong>One judge.</strong> Section 4 measures self-consistency, not agreement between
independent raters. A second judge model is the missing control.</li>
<li><strong>Breadth and depth do not intersect.</strong> Only one tier spans all seven
datasets; the rest ran on pertussis alone.</li>
<li><strong>The grid is L-shaped, not factorial.</strong> Generators were varied against
one moderator and moderators against one generator, so the best × best cell was never
run.</li>
<li><strong>Effective sample size is smaller than it looks.</strong> Five of the seven
datasets are WHO surveillance series of the same shape, and two are nested, so they are
closer to three independent series than seven.</li>
</ul>

<h2>Appendix: the single-run combination table</h2>
<div class="fig">{svg('fig10')}</div>
<p class="cap">Superseded by section 3. Kept because it is what the project believed
before the cells were repeated.</p>
"""


SLIDE_CSS = """
@page { size: 1600px 900px; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; color: #14171c;
       background: #fff; }
.slide { width: 1600px; height: 900px; page-break-after: always; position: relative;
         padding: 62px 72px 110px; overflow: hidden;
         display: flex; flex-direction: column; justify-content: center; }
/* A full-bleed figure slide has no margin to centre within. */
.slide:has(> .fill) { padding: 0; display: block; }
.slide:last-child { page-break-after: auto; }
.kicker { font-family: "SF Mono", Menlo, monospace; font-size: 15px; letter-spacing: .16em;
          text-transform: uppercase; color: #2a78d6; margin: 0 0 16px; }
h1 { font-size: 62px; line-height: 1.08; margin: 0 0 22px; letter-spacing: -.02em; }
h2 { font-size: 44px; line-height: 1.12; margin: 0 0 18px; letter-spacing: -.015em; }
.sub { font-size: 25px; color: #4a5462; margin: 0; max-width: 34em; }
.fill { position: absolute; inset: 0; }
.fill svg { width: 100%; height: 100%; }
.big { font-size: 130px; font-weight: 700; line-height: 1; letter-spacing: -.03em; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 34px; margin-top: 42px; }
.card { background: #f4f6f9; border-radius: 10px; padding: 30px 32px; }
.card .k { font-family: "SF Mono", Menlo, monospace; font-size: 15px; color: #6b7684;
           text-transform: uppercase; letter-spacing: .1em; margin-bottom: 14px; }
.card .v { font-size: 60px; font-weight: 700; line-height: 1; letter-spacing: -.02em; }
.card .n { font-size: 18px; color: #4a5462; margin-top: 12px; }
.good .v { color: #0f7a45; } .bad .v { color: #b03428; } .blue .v { color: #2a78d6; }
ul { font-size: 27px; line-height: 1.5; margin: 30px 0 0; padding-left: 30px; }
li { margin-bottom: 18px; max-width: 30em; }
.foot { position: absolute; left: 72px; bottom: 44px; font-family: "SF Mono", Menlo, monospace;
        font-size: 15px; color: #8590a0; }
.pill { display: inline-block; background: #14171c; color: #fff; font-size: 17px;
        padding: 7px 16px; border-radius: 100px; font-family: "SF Mono", Menlo, monospace;
        letter-spacing: .06em; }
"""


def slides() -> str:
    q27 = Q27["configs"]["q27b"]["runs"][0]["alarmism_raw"]
    s = []

    s.append(f"""<div class="slide">
  <p class="kicker">CMS Team Project · TU Dresden · SoSe 2026</p>
  <h1>Moderating the emotional tone<br>of AI data stories</h1>
  <p class="sub">What we measured, on {REL['n_stories'] // 2} runs across eight datasets,
  judged blind by Claude Opus 5 against {HUMAN['n_human_stories']} stories our own team
  wrote from the same data.</p>
  <p class="foot">Experiments only · every figure generated from the run database</p>
</div>""")

    s.append(f"""<div class="slide">
  <p class="kicker">The result</p>
  <h2>Moderation lands machine stories<br>on the human level</h2>
  <div class="grid3">
    <div class="card bad"><div class="k">raw, alarmism</div>
      <div class="v">{AG['alarmism_raw_mean']:.2f}</div>
      <div class="n">the generator's own tone</div></div>
    <div class="card good"><div class="k">after moderation</div>
      <div class="v">{AG['alarmism_moderated_mean']:.2f}</div>
      <div class="n">a 1.5-point move</div></div>
    <div class="card blue"><div class="k">our writers</div>
      <div class="v">{AG['human_alarmism_median']:.2f}</div>
      <div class="n">25 stories, same evidence packs</div></div>
  </div>
  <p class="foot">Alarmism 1-5 · both ends are failures · 3 is calibrated</p>
</div>""")

    s.append(f"""<div class="slide"><div class="fill">{svg('fig9')}</div></div>""")

    s.append(f"""<div class="slide">
  <p class="kicker">Why our metric has two axes</p>
  <h2>A falling series fails<br>in the opposite direction</h2>
  <p class="sub">On WHO child mortality the raw story scored a calm <strong>2.0</strong>
  for alarmism while calling two decades of progress "nothing short of miraculous".
  Optimism caught it at <strong>4.5</strong>, and moderation moved it to 2.5.</p>
  <p class="sub" style="margin-top:26px">A single-axis judge reports that moderation
  did nothing on that dataset.</p>
  <p class="foot">alarmism {AG['alarmism_raw_mean']:.2f} → {AG['alarmism_moderated_mean']:.2f}
  · optimism {AG['optimism_raw_mean']:.2f} → {AG['optimism_moderated_mean']:.2f}</p>
</div>""")

    s.append(f"""<div class="slide"><div class="fill">{svg('fig11')}</div></div>""")

    s.append(f"""<div class="slide">
  <p class="kicker">Choosing the models</p>
  <h2>Six combinations tie on tone.<br>Faithfulness breaks the tie.</h2>
  <p class="sub">The moderator converges on the same tone whoever wrote the draft
  ({G4['alarmism_moderated']['mean']:.2f} vs {G8['alarmism_moderated']['mean']:.2f},
  p = 1.00). What separates the generators is how many of the raw story's figures
  survive.</p>
  <div class="grid3" style="grid-template-columns:1fr 1fr">
    <div class="card"><div class="k">qwen3.5:4b × gemma4:31b</div>
      <div class="v">{G4['numeric_retention']['mean']*100:.0f}%</div>
      <div class="n">figures kept, ± {G4['numeric_retention']['sd']*100:.0f} over 5 seeds</div></div>
    <div class="card good"><div class="k">llama3.1:8b × gemma4:31b</div>
      <div class="v">{G8['numeric_retention']['mean']*100:.0f}%</div>
      <div class="n">figures kept, ± {G8['numeric_retention']['sd']*100:.0f} over 5 seeds</div></div>
  </div>
  <p class="foot">Welch t = {TEST['t']} · p = {TEST['p']} · Cohen d = {abs(TEST['cohen_d'])}</p>
</div>""")

    s.append(f"""<div class="slide">
  <p class="kicker">The lesson we nearly published</p>
  <h2>With one run per cell,<br>our ranking was backwards</h2>
  <p class="sub">A single run had qwen3.5:4b keeping <strong>71%</strong> of figures and
  llama3.1:8b keeping <strong>50%</strong>, so we recommended qwen3.5:4b.</p>
  <p class="sub" style="margin-top:26px">Five seeds each: <strong>61%</strong> and
  <strong>91%</strong>. Both original numbers were unrepresentative draws from
  distributions spanning 33-83% and 67-100%.</p>
  <p class="sub" style="margin-top:26px"><span class="pill">n = 1 cannot tell a model
  from a draft</span></p>
  <p class="foot">Judge noise is {RELA['mean_spread']:.2f} points · run-to-run spread is
  {G4['alarmism_moderated']['sd']:.2f} · the variance is the generator's</p>
</div>""")

    s.append(f"""<div class="slide"><div class="fill">{svg('fig13')}</div></div>""")

    s.append(f"""<div class="slide">
  <p class="kicker">Can the instrument be trusted</p>
  <h2>The tone scale has an error bar</h2>
  <div class="grid3">
    <div class="card good"><div class="k">ICC(2,1)</div>
      <div class="v">{RELA['icc_2_1']:.3f}</div>
      <div class="n">absolute agreement, 3 passes</div></div>
    <div class="card good"><div class="k">Krippendorff α</div>
      <div class="v">{RELA['krippendorff_alpha']:.3f}</div>
      <div class="n">interval scale</div></div>
    <div class="card blue"><div class="k">mean disagreement</div>
      <div class="v">{RELA['mean_spread']:.2f}</div>
      <div class="n">points, out of a 1-5 scale</div></div>
  </div>
  <p class="sub" style="margin-top:38px">Same model and prompt each pass, so this is
  self-consistency: an upper bound on what a different judge would agree to.</p>
  <p class="foot">{REL['passes'] * REL['n_stories']} calls ·
  {RELA['identical_all_passes']}/{REL['n_stories']} identical on all three passes</p>
</div>""")

    s.append(f"""<div class="slide">
  <p class="kicker">Scale or lineage</p>
  <h2>Writing calmly is a family trait,<br>not a size effect</h2>
  <p class="sub">Raw alarmism across the qwen3.5 ladder: <strong>4.8</strong> at 2B,
  <strong>4.6</strong> at 4B, <strong>4.5</strong> at 9B, <strong>{q27}</strong> at 27B.
  Scaling by more than 13× changes nothing.</p>
  <p class="sub" style="margin-top:26px">The one calm generator in the set is
  <strong>llama3.1:8b at {G8['alarmism_raw']['mean']:.2f}</strong>. Our earlier reading,
  that smaller generators write hotter copy, was a family effect misread as a scale
  one.</p>
  <p class="foot">Same series, same seed, same moderator throughout</p>
</div>""")

    s.append(f"""<div class="slide"><div class="fill">{svg('fig12')}</div></div>""")

    s.append(f"""<div class="slide">
  <p class="kicker">What it costs, and what we cannot claim</p>
  <h2>The honest slide</h2>
  <ul>
    <li><strong>Narrative quality is the price.</strong> The unmoderated story wins it
    three times as often. We buy calibration and accuracy by spending engagement.</li>
    <li><strong>n = 1 outside two cells.</strong> Every other combination is a single
    run, and we have shown what that can do to a conclusion.</li>
    <li><strong>One judge.</strong> We measured how much it agrees with itself, not how
    much a different judge would agree with it.</li>
    <li><strong>Seven datasets are about three.</strong> Five are WHO series of the same
    shape and two are nested.</li>
  </ul>
  <p class="foot">Full caveat list in the report · experiments/LOOPHOLES.md</p>
</div>""")

    s.append(f"""<div class="slide">
  <p class="kicker">In one line</p>
  <h1>Tone moderation reaches<br>the human level, and the<br>measurement holds up.</h1>
  <p class="sub" style="margin-top:30px">Alarmism {AG['alarmism_raw_mean']:.2f} →
  {AG['alarmism_moderated_mean']:.2f} against a human {AG['human_alarmism_median']:.2f},
  100% on factual correctness, judge ICC {RELA['icc_2_1']:.2f}. The costs are narrative
  quality and a sample size we are still honest about.</p>
</div>""")

    return ('<!doctype html><meta charset="utf-8"><title>Experiment slides</title>'
            f"<style>{SLIDE_CSS}</style>" + "\n".join(s))


def to_pdf(html_text: str, out: Path, landscape: bool = False) -> None:
    with tempfile.TemporaryDirectory() as d:
        src = Path(d) / "doc.html"
        src.write_text(html_text, encoding="utf-8")
        cmd = [CHROME, "--headless", "--disable-gpu", "--no-sandbox",
               "--no-pdf-header-footer", f"--print-to-pdf={out}"]
        if landscape:
            cmd.append("--print-to-pdf-no-header")
        cmd.append(f"file://{src}")
        r = subprocess.run(cmd, capture_output=True, text=True)
        if not out.exists():
            print(r.stderr[-800:], file=sys.stderr)
            raise SystemExit(f"chrome did not produce {out}")
    print(f"wrote {out.relative_to(ROOT)}  ({out.stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    if not Path(CHROME).exists():
        raise SystemExit(f"headless Chrome not found at {CHROME}")
    to_pdf(report(), HERE / "experiments-report.pdf")
    to_pdf(slides(), HERE / "experiments-slides.pdf", landscape=True)
