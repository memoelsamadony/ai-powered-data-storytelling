"use client";

import { ShieldCheck, ShieldAlert, MoveRight } from "lucide-react";
import type * as api from "@/lib/api";
import type { Dataset } from "@/lib/data/datasets";
import type { StorySet, ToneVariant } from "@/lib/data/stories";
import { StoryPanel } from "@/components/story-panel";
import { SimpleBarChart } from "@/components/charts/metric-charts";
import { ToneAxis, type ToneAxisRow } from "@/components/charts/tone-axis";
import { StoryChart } from "@/components/charts/story-chart";
import { CountryMap } from "@/components/charts/country-map";
import { EditTaxonomy } from "@/components/charts/edit-taxonomy";
import { Redline } from "@/components/story/redline";
import { FactCheckGutter } from "@/components/story/fact-check-gutter";
import { humanBand } from "@/components/alarmism-meter";
import { Glossary, type GlossaryItem } from "@/components/ui/glossary";

/* ── Terminology, defined on the page rather than in a tooltip ──────────── */

const TONE_TERMS: GlossaryItem[] = [
  {
    term: "Alarmism rating",
    def: "a 1–5 score an LLM judge assigns to a story's emotional pitch. 1 is flat and hides the stakes; 5 is manipulative catastrophising.",
    caveat: "Both ends are failures. This is not a scale where low is good.",
  },
  {
    term: "Human tone band",
    def: "the target zone, set ±0.5 around the human author's own rating. It is the yardstick, not an absolute standard.",
  },
  {
    term: "Numbing / catastrophising",
    def: "the two opposite ways tone goes wrong. Numbing flattens a real problem into reassurance; catastrophising inflates it into panic.",
  },
  {
    term: "Emotive span",
    def: "one phrase the moderator rewrote, carrying its original wording, its replacement, and the moderator's stated reason.",
  },
  {
    term: "Verified / flagged / corrected",
    def: "the separate fact-checker's verdict per claim: supported by the table, unsupported, or silently changed by the moderator without being reported.",
  },
];

const EDIT_FAMILY_TERMS: GlossaryItem[] = [
  {
    term: "Intensity",
    def: "verbs and adjectives dialled up past what the numbers support: \"exploding\", \"cratered\", \"tore through\".",
  },
  {
    term: "Framing",
    def: "how the situation is characterised rather than what is claimed: fear, doom, false reassurance, complacency, or absolutes like \"all but conquered\".",
  },
  {
    term: "Overreach",
    def: "causal or predictive claims the table cannot support: \"resulting in\", \"hurtling toward\", \"victory is assured\".",
    caveat: "The most consequential family: both paper reproductions measured causal accuracy at 0%.",
  },
  {
    term: "Grounding",
    def: "a vague or invented figure replaced with the real one from the data, the fact-improving side effect of a tone pass.",
  },
];

const SIMILARITY_TERMS: GlossaryItem[] = [
  {
    term: "BLEU",
    def: "counts how many word sequences (n-grams) the story shares with the human baseline, up to 4 words long. Built for machine translation; rewards matching phrasing.",
  },
  {
    term: "ROUGE-L",
    def: "finds the longest run of words appearing in both texts in the same order, without needing them adjacent. More forgiving than BLEU on short texts.",
  },
  {
    term: "METEOR",
    def: "matches words allowing for stems and synonyms, then balances precision and recall with a penalty for scrambled word order. Tracks human judgement better than BLEU.",
  },
];

/** What a scored run actually plots. The backend computes no METEOR. */
const SCORED_TERMS: GlossaryItem[] = [
  SIMILARITY_TERMS[0],
  SIMILARITY_TERMS[1],
  {
    term: "Unigram F1",
    def: "counts the single words the two texts share, balancing how many of the story's words appear in the baseline against how many of the baseline's appear in the story. Ignores word order entirely, so it is the most forgiving of the three.",
  },
];

export function Comparison({
  story,
  humanText,
  dataset,
  metrics,
}: {
  story: StorySet;
  humanText: string;
  dataset: Dataset;
  /**
   * Scored by the backend against the human baseline actually typed above.
   * Null while that call is in flight, or whenever there is no backend, and the
   * panel then shows the placeholder figures and says so.
   */
  metrics?: api.ComparisonMetrics | null;
}) {
  const human: ToneVariant = {
    ...story.human,
    paragraphs: humanText.trim()
      ? humanText.trim().split(/\n{2,}/).map((p) => p.trim())
      : story.human.paragraphs,
  };

  const raw = story.aiRaw.alarmismRating;
  const moderated = story.aiModerated.alarmismRating;

  /**
   * Signed, not absolute. The old version computed `raw - moderated` and always
   * rendered it as a reduction with a downward arrow, so the over-optimism
   * dataset — where moderation correctly moves the rating *up* — displayed a
   * negative "improvement". Which direction the story was pulled is the finding,
   * so it is stated rather than hidden behind a minus sign.
   */
  // Every figure below is a difference between two judged ratings, so all three
  // have to exist before any of it can be stated. When the judge was
  // unreachable the panel says so instead of computing a move that was never
  // measured, which on this page would be the headline claim.
  const humanRating = story.human.alarmismRating;
  const scored = raw !== null && moderated !== null && humanRating !== null;
  const band = humanRating === null ? undefined : humanBand(humanRating);
  const moved = scored ? +(moderated! - raw!).toFixed(1) : null;
  const pulledUp = moved !== null && moved > 0;
  const landedInBand =
    scored && band ? moderated! >= band.from && moderated! <= band.to : false;

  const toneRow: ToneAxisRow | null = scored
    ? {
        id: dataset.id,
        label: dataset.shortName,
        tempts: `tempts ${dataset.failureMode}`,
        human: { value: humanRating!, title: human.title, author: human.author },
        raw: { value: raw!, title: story.aiRaw.title, author: story.aiRaw.author },
        moderated: {
          value: moderated!,
          title: story.aiModerated.title,
          author: story.aiModerated.author,
        },
      }
    : null;

  /* Derived from the fact-checker's own output rather than hardcoded. */
  const flagged = story.factualCheck.filter((f) => f.status === "flagged").length;
  const corrected = story.factualCheck.filter((f) => f.status === "corrected").length;
  const verified = story.factualCheck.filter((f) => f.status === "verified").length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <StoryPanel variant={human} band={band} compact />
        <StoryPanel variant={story.aiRaw} band={band} compact />
        <StoryPanel variant={story.aiModerated} band={band} compact />
      </div>

      {/* One chart for all three panels. The three stories are three tellings of
          the SAME numbers — that is the whole point of the comparison — so
          repeating the chart in each panel repeated the data three times and
          shrank it to the point of illegibility. */}
      <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-navy">The data all three stories describe</p>
          <p className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">
            {dataset.shortName} · {dataset.yearRange}
          </p>
        </div>
        <StoryChart dataset={dataset} height={300} />

        {dataset.countryYears && dataset.countryMetrics && dataset.countryStats && (
          <div className="mt-5 border-t border-hairline pt-5">
            <CountryMap
              years={dataset.countryYears}
              metrics={dataset.countryMetrics}
              stats={dataset.countryStats}
              sourceNote={dataset.countrySourceNote}
              compact
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
        <span className="kicker text-deep-teal">Evaluation</span>
        <h3 className="mt-2 font-serif text-2xl text-navy">How the stories compare</h3>

        {/* ── Tone calibration ─────────────────────────────────────────── */}
        <section className="mt-7 rounded-xl border border-hairline bg-surface-soft/30 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <div>
              <p className="text-sm font-medium text-navy">Tone calibration</p>
              <p className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                Alarmism · 1–5 LLM judge · the project&rsquo;s novel metric
              </p>
            </div>
            {moved === null ? (
              <p className="text-sm text-muted">
                No judge was reachable for this run, so the tone was not measured.
              </p>
            ) : (
              <p className="text-sm text-muted">
                Pulled <strong className="font-medium text-navy">{pulledUp ? "up" : "down"}</strong>{" "}
                <span className="font-mono text-navy">{Math.abs(moved).toFixed(1)}</span>{" "}
                {pulledUp ? "out of false reassurance" : "out of catastrophising"}
                {landedInBand && <span className="text-muted"> and into the calibrated band</span>}
              </p>
            )}
          </div>

          {toneRow && (
            <div className="mt-5">
              <ToneAxis rows={[toneRow]} />
            </div>
          )}

          <Glossary className="mt-5 border-t border-hairline pt-4" items={TONE_TERMS} />
        </section>

        {/* ── What changed, and how faithful it stayed ─────────────────── */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-hairline bg-surface-soft/30 p-5">
            <p className="text-sm font-medium text-navy">What the moderator changed</p>
            <p className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
              Edits by family
            </p>
            <EditTaxonomy spans={story.emotiveSpans} className="mt-5" />

            <Glossary
              className="mt-5 border-t border-hairline pt-4"
              title="The four edit families"
              items={EDIT_FAMILY_TERMS}
            />
          </section>

          <div className="flex flex-col gap-5">
            <section
              className={`flex items-start gap-3 rounded-xl border p-5 ${
                flagged > 0 ? "border-alarm/25 bg-alarm-soft/30" : "border-calm/30 bg-calm-soft/40"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  flagged > 0 ? "bg-alarm text-white" : "bg-calm text-white"
                }`}
              >
                {flagged > 0 ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg font-semibold text-navy">
                  {flagged > 0 ? `${flagged} claim${flagged > 1 ? "s" : ""} flagged` : "Facts preserved"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  The separate fact-check returned {verified} verified
                  {corrected > 0 && `, ${corrected} silently corrected`}
                  {flagged > 0 && `, ${flagged} flagged`} across {story.factualCheck.length} claims.
                </p>
                <FactCheckGutter items={story.factualCheck} className="mt-4" />
              </div>
            </section>

            <section className="rounded-xl border border-hairline bg-surface-soft/30 p-5">
              <p className="text-sm font-medium text-navy">Text similarity</p>
              <p className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                {metrics ? "Moderated vs your baseline · scored" : "Moderated vs human · illustrative"}
              </p>
              <div className="mt-2">
                <SimpleBarChart
                  data={
                    metrics
                      ? metrics.textSimilarity.map((m) => ({ label: m.metric, value: m.value }))
                      : [
                          { label: "BLEU", value: 0.31 },
                          { label: "ROUGE-L", value: 0.48 },
                          { label: "METEOR", value: 0.41 },
                        ]
                  }
                  color="#1e66b8"
                  domainMax={1}
                  decimals={2}
                  height={150}
                />
              </div>

              <Glossary
                className="mt-4 border-t border-hairline pt-4"
                title="The three similarity metrics"
                items={metrics ? SCORED_TERMS : SIMILARITY_TERMS}
              />

              <p className="mt-4 rounded-lg border border-hairline bg-surface-soft/70 px-3 py-2.5 text-[0.72rem] leading-relaxed text-muted">
                <strong className="font-medium text-navy">Read these with care.</strong> All three
                score <em>wording overlap</em>, not truth or tone. A factually perfect story worded
                differently scores near zero, so a low number here is not a quality verdict.{" "}
                {metrics ? (
                  <>
                    These are scored by the backend on the baseline you typed against the moderated
                    text. Expect BLEU near <span className="font-mono">0.0</span>: it is computed on
                    a single short pair without smoothing, and because it is the geometric mean of
                    the 1–4-gram precisions, two texts sharing no 4-gram collapse the product to
                    zero.
                  </>
                ) : (
                  <>
                    The values above are illustrative placeholders. In the real runs BLEU-4 came out
                    at exactly <span className="font-mono">0.0</span>, because it is computed on a
                    single ~120-word pair without smoothing: BLEU is the geometric mean of the
                    1–4-gram precisions, the two texts share no 4-gram, and one zero collapses the
                    product. The backend also returns <span className="font-mono">unigram F1</span>,
                    not METEOR.
                  </>
                )}
              </p>
            </section>
          </div>
        </div>

        {/* ── The edits themselves ─────────────────────────────────────── */}
        <section className="mt-5 rounded-xl border border-hairline bg-surface-soft/30 p-5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-navy">Every edit, marked in the text</p>
            <MoveRight className="h-4 w-4 text-faint" />
          </div>
          <Redline variant={story.aiRaw} spans={story.emotiveSpans} className="mt-4" />
        </section>

        <p className="mt-6 text-pretty text-sm leading-relaxed text-muted">
          Surface-overlap scores reward wording overlap, not faithfulness or tone, which is exactly
          why the project pairs them with the tone-calibration metric above and a planned user study
          on trust, engagement, and human-vs-LLM preference.
        </p>
      </div>
    </div>
  );
}
