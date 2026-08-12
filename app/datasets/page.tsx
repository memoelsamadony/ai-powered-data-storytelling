import type { Metadata } from "next";
import { AlertTriangle, TrendingUp, Database, Calendar, Layers, BookOpen } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Container, Section } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StoryChart } from "@/components/charts/story-chart";
import { CountryMap } from "@/components/charts/country-map";
import { HumanConvergence } from "@/components/charts/human-convergence";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import { type Dataset } from "@/lib/data/datasets";
import { humanComparison, type HumanComparisonSeries } from "@/lib/data/human-comparison";
import { getDatasets } from "@/lib/api";

/**
 * The tone figure is the experiment's own per-series output, read from
 * `experiments/exp_json/exp-human-comparison.json` (the file the presentation's
 * fig 9 is drawn from), not from the three sample stories in `stories.ts`.
 *
 * It used to be built by looking up a story set per dataset. That silently
 * borrowed the measles story for every dataset that had none, so once the
 * backend served eight datasets the chart drew six rows of identical ratings
 * under other datasets' names. The experiment file carries one row per series
 * it actually measured, with the n behind each, so there is nothing to invent.
 */
function singleRunNote(series: HumanComparisonSeries[]): string {
  const single = series.filter((s) => s.runs === 1).length;
  if (single === 0) return "";
  return `n=1 per cell on ${single} of ${series.length} series, so those arrows are one run rather than a mean of repeats.`;
}

// The dataset payload is read per request, so the page is server-rendered on
// demand. Declared rather than inferred: without it Next attempts a prerender,
// and the attempt only resolves through a thrown framework error.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Datasets",
  description:
    "Two real-world datasets chosen so tone fails in opposite directions: measles × vaccination (alarmism) and WHO child mortality (over-optimism).",
};

export default async function DatasetsPage() {
  // Falls back to the generated snapshot when the backend is down, so the page
  // is never dead. Both carry the same figures, read from the same CSVs; the
  // fallback can only be older, and the source note under each map names the
  // table either way.
  const datasets = await getDatasets();

  return (
    <>
      <PageHero
        kicker="The data"
        title={
          <>
            Two datasets, two opposite ways to get the <span className="brand-gradient-text italic">tone</span> wrong.
          </>
        }
        intro="Because tone failure is two-sided, we deliberately use a story that tempts alarmism and one that tempts false reassurance, proving the moderator calibrates in both directions."
      />

      <Section>
        <Container>
          <div className="space-y-16">
            {datasets.map((d, i) => (
              <Reveal key={d.id}>
                <DatasetBlock dataset={d} reversed={i % 2 === 1} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-t border-hairline bg-surface-soft/40">
        <Container>
          <Reveal>
            <Card className="p-6 sm:p-10">
              <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy text-white">
                  <Layers className="h-6 w-6" />
                </span>
                <div>
                  <span className="kicker text-deep-teal">The whole argument, in one axis</span>
                  <h2 className="mt-2 text-2xl text-navy">
                    Moderation moves machine stories onto the human level
                  </h2>
                  <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-muted">
                    Alarmism 1 to 5, {humanComparison.judge.split(",")[0]} judging blind, one story at a
                    time. Overall{" "}
                    <strong className="font-medium text-navy">
                      {humanComparison.aggregate.rawMean.toFixed(2)} →{" "}
                      {humanComparison.aggregate.moderatedMean.toFixed(2)}
                    </strong>
                    , against a human median of {humanComparison.aggregate.humanMedian.toFixed(2)} across{" "}
                    {humanComparison.humanStories} human stories and {humanComparison.totalRuns} runs.
                  </p>
                </div>
              </div>

              <div className="mt-8 border-t border-hairline pt-8">
                <HumanConvergence series={humanComparison.series} />
              </div>

              <p className="mt-6 max-w-3xl text-pretty text-sm leading-relaxed text-muted">
                Alarmism is an LLM-judge rating where{" "}
                <strong className="font-medium text-navy">both ends are failures</strong>: 1 is flat and
                hides the stakes, 5 is manipulative catastrophising. The reference on each row is that
                series&rsquo; own human writers, so the claim is relative rather than editorial.{" "}
                {singleRunNote(humanComparison.series)} {humanComparison.caveats[0]}
              </p>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}

function DatasetBlock({ dataset, reversed }: { dataset: Dataset; reversed: boolean }) {
  const alarm = dataset.failureMode === "alarmism";
  const meta = [
    { icon: Database, label: `${dataset.rows.toLocaleString()} rows` },
    { icon: Calendar, label: dataset.yearRange },
    { icon: Layers, label: dataset.granularity },
    { icon: BookOpen, label: dataset.sources.join(" · ") },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
      <div className={reversed ? "lg:order-2" : ""}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={dataset.role === "primary" ? "brand" : "neutral"}>{dataset.role}</Badge>
          <Badge tone={alarm ? "alarm" : "calm"}>
            {alarm ? <AlertTriangle className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {alarm ? "alarmism" : "over-optimism"}
          </Badge>
        </div>
        <h2 className="mt-4 font-serif text-3xl leading-tight text-navy">{dataset.name}</h2>
        <p className="mt-2 text-lg italic text-deep-teal">{dataset.tagline}</p>
        <p className="mt-4 text-pretty leading-relaxed text-muted">{dataset.description}</p>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          {meta.map((m) => (
            <div key={m.label} className="flex items-center gap-2.5 rounded-xl border border-hairline bg-surface px-4 py-3">
              <m.icon className="h-4 w-4 shrink-0 text-faint" />
              <span className="text-sm text-ink">{m.label}</span>
            </div>
          ))}
        </dl>
      </div>

      <Card className={`p-5 sm:p-6 ${reversed ? "lg:order-1" : ""}`}>
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[0.7rem] uppercase tracking-wider text-faint">
            {dataset.yearRange} · shared timeline
          </span>
        </div>
        <StoryChart dataset={dataset} height={340} />

        {dataset.countryYears && dataset.countryMetrics && dataset.countryStats && (
          <div className="mt-5 border-t border-hairline pt-5">
            <CountryMap
              years={dataset.countryYears}
              metrics={dataset.countryMetrics}
              stats={dataset.countryStats}
              sourceNote={dataset.countrySourceNote}
            />
          </div>
        )}

        <p className="mt-4 border-t border-hairline pt-4 text-xs leading-relaxed text-muted">
          Two panels on one timeline rather than two y-axes on one plot: a dual axis lets the
          two lines be slid into any apparent relationship, which is the inference our own
          fact-checker flags the model for making.
        </p>
      </Card>
    </div>
  );
}
