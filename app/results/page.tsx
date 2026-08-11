import type { Metadata } from "next";
import { ArrowDownRight, Scissors, ShieldCheck, Sparkles, Clock } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Container, Section, SectionHeader } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlarmismMeter } from "@/components/alarmism-meter";
import { FaithfulnessChart, OperationChart, SimpleBarChart } from "@/components/charts/metric-charts";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import {
  faithfulness,
  perOperation,
  maskedNumber,
  toneCalibration,
  textSimilarity,
  userStudy,
} from "@/lib/data/metrics";
import { getResults } from "@/lib/api";

export const metadata: Metadata = {
  title: "Results & evaluation",
  description:
    "Faithfulness, analytical correctness, the novel tone-calibration metric, text-similarity scores, and a planned user study, all grounded in offline reproductions.",
};

// The measured block is read per request; the reproduction figures are static
// but arrive on the same call.
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const live = await getResults();
  // Backend figures win where they exist. Where they do not, the page keeps its
  // own constants, and `sourceNote` says which of the two the reader is looking
  // at rather than leaving them to assume.
  const faith = live?.faithfulness ?? null;
  const faithSeries = faith?.series ?? faithfulness.series;
  const faithSourceNote = faith
    ? `Computed from ${faith.source}`
    : "Figures from the interim report; the backend is not reachable.";

  return (
    <>
      <PageHero
        kicker="Results & evaluation"
        title={
          <>
            The numbers that told us <span className="brand-gradient-text italic">tone</span> is the open problem.
          </>
        }
        intro="Reproducing prior systems offline showed modern open models are already fairly faithful at stating data, but they confabulate causal claims, and nothing yet checks how a story feels. Our metric set follows from exactly that."
      />

      {/* Faithfulness + masked number */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeader
              kicker="Faithfulness & analytical correctness"
              title="Modern models state data well, and reason causally badly"
            />
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <Reveal>
              <MetricCard
                title="Faithfulness"
                unit={faith?.unit ?? faithfulness.unit}
                caption={`${faith?.caption ?? faithfulness.caption} ${faithSourceNote}`}
                hint="Lower is better"
              >
                <FaithfulnessChart data={faithSeries} />
              </MetricCard>
            </Reveal>
            <Reveal delay={0.1}>
              <MetricCard
                title="Masked-number prediction"
                unit={maskedNumber.unit}
                caption={maskedNumber.caption}
                hint="Higher is better"
              >
                <SimpleBarChart
                  data={maskedNumber.series.map((s) => ({ label: s.model, value: s.value }))}
                  color="#1e66b8"
                  domainMax={30}
                  suffix="%"
                  decimals={1}
                  height={240}
                />
              </MetricCard>
            </Reveal>
          </div>

          <Reveal>
            <div className="mt-5">
              <MetricCard
                title="Per-operation accuracy"
                unit={perOperation.unit}
                caption={perOperation.caption}
                hint="Higher is better"
              >
                <OperationChart
                  data={perOperation.operations}
                  smallLabel={perOperation.smallLabel}
                  largeLabel={perOperation.largeLabel}
                />
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-alarm/30 bg-alarm-soft/40 p-4">
                  <span className="mt-0.5 font-mono text-2xl font-semibold text-alarm">0%</span>
                  <p className="text-sm leading-relaxed text-muted">
                    The <span className="font-medium text-ink">causal</span> operation scores zero for
                    both model sizes: causal reasoning is a capability wall, not a size problem. It's
                    why a lightweight causal/factual check sits beside the tone agent.
                  </p>
                </div>
              </MetricCard>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Tone calibration — the novel metric */}
      <Section className="border-y border-hairline bg-surface-soft/50">
        <Container>
          <Reveal>
            <Card className="overflow-hidden border-calm/30 p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-calm-soft/40 px-6 py-4 sm:px-8">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-deep-teal" />
                  <span className="font-mono text-[0.7rem] font-medium uppercase tracking-wider text-calm-ink">
                    The novel metric
                  </span>
                </div>
                <Badge tone="calm">tone calibration</Badge>
              </div>

              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                <div>
                  <h2 className="text-2xl text-navy sm:text-3xl">Measuring the edit, not just the output</h2>
                  <p className="mt-4 text-pretty leading-relaxed text-muted">{toneCalibration.caption}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Stat icon={Scissors} value={`${toneCalibration.emotiveSpansRemoved}`} label="emotive spans removed" tone="alarm" />
                    <Stat icon={ShieldCheck} value="✓" label="facts preserved after moderation" tone="calm" />
                  </div>
                </div>

                <div className="rounded-2xl border border-hairline bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy">Alarmism, before → after</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-calm-soft px-2.5 py-1 font-mono text-xs font-semibold text-calm-ink">
                      <ArrowDownRight className="h-3 w-3" />
                      −{(toneCalibration.alarmismBefore - toneCalibration.alarmismAfter).toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="mb-1.5 text-xs text-muted">Raw LLM output</p>
                      <AlarmismMeter value={toneCalibration.alarmismBefore} max={toneCalibration.scaleMax} />
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs text-muted">Tone-moderated</p>
                      <AlarmismMeter value={toneCalibration.alarmismAfter} max={toneCalibration.scaleMax} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>
        </Container>
      </Section>

      {/* Text similarity + user study */}
      <Section>
        <Container>
          <div className="grid gap-5 lg:grid-cols-2">
            <Reveal>
              <MetricCard
                title="Text-similarity metrics"
                unit="moderated vs human baseline"
                caption={textSimilarity.caption}
                hint="Illustrative"
              >
                <SimpleBarChart
                  data={textSimilarity.series.map((s) => ({ label: s.metric, value: s.value }))}
                  color="#0e8f86"
                  domainMax={1}
                  decimals={2}
                  height={240}
                />
              </MetricCard>
            </Reveal>

            <Reveal delay={0.1}>
              <Card className="flex h-full flex-col p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl text-navy">User study</h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-soft px-3 py-1 font-mono text-[0.66rem] font-medium uppercase tracking-wide text-faint">
                    <Clock className="h-3 w-3" /> planned
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{userStudy.caption}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {userStudy.dimensions.map((dim) => (
                    <div key={dim.name} className="rounded-xl border border-dashed border-hairline bg-surface-soft/30 p-4">
                      <p className="font-medium text-navy">{dim.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{dim.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Everything above is study evidence. This is what the runs on this
          machine actually show, kept separate and carrying its own n, because a
          mean over a handful of demo runs is not a result and must not be able
          to read like one. */}
      {live && live.measured.runsComplete > 0 && (
        <Section className="border-t border-hairline bg-surface-soft/40">
          <Container>
            <Reveal>
              <SectionHeader
                kicker="This deployment"
                title="What the runs on this machine show"
                intro="Measured from the pipeline runs stored in the backend, not from the study. Small samples, shown with their sample size."
              />
              <Card className="mt-8 p-6 sm:p-8">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <RunStat
                    label="Completed runs"
                    value={String(live.measured.runsComplete)}
                    sub={live.measured.byTier.map((t) => `${t.runs} ${t.tier}`).join(" · ")}
                  />
                  <RunStat
                    label="Alarmism, before → after"
                    value={
                      live.measured.alarmismBefore !== null
                        ? `${live.measured.alarmismBefore} → ${live.measured.alarmismAfter}`
                        : "not measured"
                    }
                    sub={`mean over n = ${live.measured.alarmismN}`}
                  />
                  <RunStat
                    label="Edits per run"
                    value={live.measured.editsPerRun !== null ? String(live.measured.editsPerRun) : "—"}
                    sub={live.measured.editsByCategory
                      .filter((c) => c.count > 0)
                      .map((c) => `${c.label} ${c.count}`)
                      .join(" · ")}
                  />
                  <RunStat
                    label="Facts preserved"
                    value={
                      live.measured.factsPreservedRate !== null
                        ? `${live.measured.factsPreservedRate}%`
                        : "—"
                    }
                    sub={`of n = ${live.measured.factsCheckedN} checked runs`}
                  />
                </div>

                {live.measured.stageTimings.length > 0 && (
                  <div className="mt-8 border-t border-hairline pt-6">
                    <p className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                      Median seconds per stage
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                      {live.measured.stageTimings.map((t) => (
                        <span key={`${t.stage}-${t.model}`} className="text-sm text-muted">
                          <span className="text-navy">{t.stage}</span>{" "}
                          <span className="font-mono text-xs">{t.medianSeconds}s</span>{" "}
                          <span className="text-faint">
                            ({t.model}, n={t.runs})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {live.unavailable.map((note) => (
                  <p
                    key={note}
                    className="mt-6 rounded-lg border border-hairline bg-surface-soft/70 px-3 py-2.5 text-[0.72rem] leading-relaxed text-muted"
                  >
                    <strong className="font-medium text-navy">Not served here.</strong> {note}
                  </p>
                ))}
              </Card>
            </Reveal>
          </Container>
        </Section>
      )}

      <CtaBand />
    </>
  );
}

/** Plain figure with its sample size. Distinct from `Stat` below, which is the
 *  icon-and-tone badge the study sections use. */
function RunStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1.5 font-serif text-2xl text-navy">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function MetricCard({
  title,
  unit,
  caption,
  hint,
  children,
}: {
  title: string;
  unit: string;
  caption: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl text-navy">{title}</h3>
          <p className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-wider text-faint">{unit}</p>
        </div>
        {hint && (
          <span className="shrink-0 rounded-full bg-surface-soft px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-wide text-faint">
            {hint}
          </span>
        )}
      </div>
      <div className="mt-5">{children}</div>
      <p className="mt-5 text-sm leading-relaxed text-muted">{caption}</p>
    </Card>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Scissors;
  value: string;
  label: string;
  tone: "alarm" | "calm";
}) {
  const cls = tone === "alarm" ? "bg-alarm-soft text-alarm-ink" : "bg-calm-soft text-calm-ink";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${cls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-serif text-xl font-semibold leading-none text-navy">{value}</p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}
