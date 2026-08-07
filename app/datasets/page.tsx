import type { Metadata } from "next";
import { AlertTriangle, TrendingUp, Database, Calendar, Layers, BookOpen } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Container, Section } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DatasetChart } from "@/components/charts/dataset-chart";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import { datasets, type Dataset } from "@/lib/data/datasets";

export const metadata: Metadata = {
  title: "Datasets",
  description:
    "Two real-world datasets chosen so tone fails in opposite directions: measles × vaccination (alarmism) and WHO child mortality (over-optimism).",
};

export default function DatasetsPage() {
  return (
    <>
      <PageHero
        kicker="The data"
        title={
          <>
            Two datasets, two opposite ways to get the <span className="brand-gradient-text italic">tone</span> wrong.
          </>
        }
        intro="Because tone failure is two-sided, we deliberately use a story that tempts alarmism and one that tempts false reassurance — proof the moderator calibrates in both directions."
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
          <Card className="p-8 sm:p-10">
            <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy text-white">
                <Layers className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-2xl text-navy">Why two datasets matter</h2>
                <p className="mt-2 text-pretty leading-relaxed text-muted">
                  Together they show the agent is calibrated and specific — many edits on the alarmist
                  story, far fewer on the already-measured one. A moderator that only ever softens text
                  would fail the second dataset; a good one keeps the gravity where gravity is due.
                </p>
              </div>
            </div>
          </Card>
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
            {dataset.primaryLabel} vs {dataset.secondaryLabel}
          </span>
        </div>
        <DatasetChart dataset={dataset} height={300} />
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-hairline pt-4 text-xs text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-full bg-alarm" /> {dataset.primaryLabel} ({dataset.primaryUnit})
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-full bg-brand-blue" /> {dataset.secondaryLabel} ({dataset.secondaryUnit})
          </span>
        </div>
      </Card>
    </div>
  );
}
