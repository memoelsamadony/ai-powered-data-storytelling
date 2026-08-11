import type { Metadata } from "next";
import { ArrowDownRight, ArrowRight, Scissors, ShieldCheck, Sparkles, Clock } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Section, SectionHeader } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlarmismMeter } from "@/components/alarmism-meter";
import { FaithfulnessChart, OperationChart, SimpleBarChart } from "@/components/charts/metric-charts";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import {
  faithfulness as staticFaithfulness,
  perOperation as staticPerOperation,
  maskedNumber as staticMaskedNumber,
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

  // The reproduction blocks exist twice, and both are the same numbers: the
  // backend reads the committed CSVs per request, the generated module is
  // those same functions snapshotted at build time. Preferring the live copy
  // means a re-run reproduction appears without a redeploy; falling back to
  // the snapshot means the page never has to reach for a constant nobody
  // measured. `sourceNote` names the file either way.
  const faith = live?.faithfulness ?? staticFaithfulness;
  const ops = live?.perOperation ?? staticPerOperation;
  const masked = live?.maskedNumber ?? staticMaskedNumber;
  const sourceNote = (source: string) => `Computed from ${source}.`;

  const measured = live?.measured ?? null;
  const toneMeasured =
    measured && measured.alarmismBefore !== null && measured.alarmismAfter !== null;
  const causal = ops.rows.find((r) => r.operation === "causal");

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
                unit={faith.unit}
                caption={`${faith.caption} ${sourceNote(faith.source)}`}
                hint="Lower is better"
              >
                <FaithfulnessChart data={faith.series} />
              </MetricCard>
            </Reveal>
            <Reveal delay={0.1}>
              <MetricCard
                title="Masked-number prediction"
                unit={masked.unit}
                caption={`${masked.caption} ${sourceNote(masked.source)}`}
                hint="Higher is better"
              >
                <SimpleBarChart
                  data={masked.series.map((point) => ({
                    label: point.model,
                    value: point.value,
                    // The paper's four models are quoted from Fig. 5, ours were
                    // rerun here. Same axis, different provenance, so they are
                    // drawn apart rather than blended into one ranking.
                    muted: point.source === "paper",
                  }))}
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
                unit={ops.unit}
                caption={`${ops.caption} ${sourceNote(ops.source)}`}
                hint="Higher is better"
              >
                <OperationChart results={ops} />
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-alarm/30 bg-alarm-soft/40 p-4">
                  <span className="mt-0.5 font-mono text-2xl font-semibold text-alarm">
                    {causal ? `${causal.pct}%` : "0%"}
                  </span>
                  <p className="text-sm leading-relaxed text-muted">
                    The <span className="font-medium text-ink">causal</span> operation scores zero for
                    both model sizes
                    {causal && (
                      <>
                        {" "}
                        &mdash; not one of the{" "}
                        {ops.rows
                          .filter((r) => r.operation === "causal")
                          .reduce((n, r) => n + r.total, 0)}{" "}
                        causal claims across both runs was supported by the table
                      </>
                    )}
                    . Causal reasoning is a capability wall, not a size problem. It&rsquo;s why a
                    lightweight causal/factual check sits beside the tone agent.
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
                  <p className="mt-4 text-pretty leading-relaxed text-muted">
                    The novel metric: an independent LLM judge rates tone on a 1&ndash;5 scale before
                    and after moderation, and the emotive spans the moderator rewrote are counted and
                    categorised, with faithfulness re-checked afterwards to confirm the edit preserved
                    the facts.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Stat
                      icon={Scissors}
                      value={measured?.editsPerRun !== null && measured ? String(measured.editsPerRun) : "—"}
                      label="emotive spans rewritten per run"
                      tone="alarm"
                    />
                    <Stat
                      icon={ShieldCheck}
                      value={
                        measured?.factsPreservedRate !== null && measured
                          ? `${measured.factsPreservedRate}%`
                          : "—"
                      }
                      label="of runs with no flagged claim after moderation"
                      tone="calm"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-hairline bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy">Alarmism, before &rarr; after</span>
                    {toneMeasured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-calm-soft px-2.5 py-1 font-mono text-xs font-semibold text-calm-ink">
                        <ArrowDownRight className="h-3 w-3" />
                        {(measured!.alarmismAfter! - measured!.alarmismBefore!).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="mb-1.5 text-xs text-muted">Raw LLM output</p>
                      <AlarmismMeter value={toneMeasured ? measured!.alarmismBefore : null} />
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs text-muted">Tone-moderated</p>
                      <AlarmismMeter value={toneMeasured ? measured!.alarmismAfter : null} />
                    </div>
                  </div>
                  {/* The figure used to be a pair of constants, 4.6 → 2.1, that no
                      run produced. It is now the mean over the judged runs in this
                      deployment, and it says so - a mean over a handful of demo
                      runs is not a study result and must not read like one. */}
                  <p className="mt-5 border-t border-hairline pt-4 text-xs leading-relaxed text-muted">
                    {toneMeasured ? (
                      <>
                        Mean over <span className="font-mono">n = {measured!.alarmismN}</span> judged
                        runs in this deployment, scored by the independent judge. A small local
                        sample, not a study result.
                      </>
                    ) : (
                      <>
                        No judged run is stored here yet, so there is nothing to plot. Run the
                        pipeline in the studio and this fills in with its own sample size.
                      </>
                    )}
                  </p>
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
              <Card className="flex h-full flex-col p-6 sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl text-navy">Text-similarity metrics</h3>
                    <p className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                      moderated vs human baseline
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface-soft px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-wide text-faint">
                    Per run
                  </span>
                </div>
                {/* This card used to plot BLEU 0.31 / ROUGE-L 0.48 / METEOR 0.41,
                    three numbers flagged `illustrative: true` in the source and
                    then drawn as a chart. There is no aggregate to replace them
                    with: the score is against the baseline a reader typed, so it
                    exists per run and nowhere else. */}
                <p className="mt-5 text-sm leading-relaxed text-muted">
                  BLEU, ROUGE-L and unigram F1 are scored against the baseline you write, so they
                  exist per run rather than as a study figure. The studio computes them live at
                  step 4 and shows them beside the moderated story.
                </p>
                <p className="mt-4 rounded-lg border border-hairline bg-surface-soft/70 px-3 py-2.5 text-[0.72rem] leading-relaxed text-muted">
                  <strong className="font-medium text-navy">Read them with care.</strong> All three
                  score <em>wording overlap</em>, not truth or tone. A factually perfect story
                  worded differently scores near zero, which is why the metric set above does not
                  stop here. Expect BLEU near <span className="font-mono">0.0</span> on a single
                  short pair: it is the geometric mean of the 1&ndash;4-gram precisions, and two
                  texts sharing no 4-gram collapse the product to zero.
                </p>
                <Link
                  href="/generate"
                  className="mt-5 inline-flex items-center gap-1.5 self-start font-mono text-[0.7rem] uppercase tracking-wider text-brand-blue hover:underline"
                >
                  Score a run in the studio <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Card>
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
