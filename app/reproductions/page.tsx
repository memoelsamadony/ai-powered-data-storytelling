import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container, Section, SectionHeader } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { FaithfulnessChart, OperationChart, SimpleBarChart } from "@/components/charts/metric-charts";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import {
  faithfulness as staticFaithfulness,
  perOperation as staticPerOperation,
  maskedNumber as staticMaskedNumber,
} from "@/lib/data/metrics";
import { getResults } from "@/lib/api";

export const metadata: Metadata = {
  title: "Reproductions & model comparison",
  description:
    "Offline reproductions of two prior data-storytelling systems, re-run on local models: faithfulness, masked-number prediction and per-operation analytical accuracy, each with what it measures and what it cannot tell you.",
};

// Read per request so a re-run reproduction appears without a redeploy.
export const dynamic = "force-dynamic";

/**
 * The reproduction figures, on their own page.
 *
 * These lived at the bottom of `/results` next to the live pipeline numbers,
 * which put a reader who arrived asking "what can my uploaded table show?" in
 * front of an evaluation of two other papers. They are a different kind of
 * claim from anything the running app produces - offline, batch, quoted partly
 * from the source papers - and separating them says so structurally instead of
 * relying on the reader to notice.
 */
export default async function ReproductionsPage() {
  const live = await getResults();

  // The backend reads the committed CSVs per request; the generated module is
  // those same functions snapshotted at build time. Preferring the live copy
  // means a re-run appears without a redeploy; falling back to the snapshot
  // means the page never reaches for a constant nobody measured.
  const faith = live?.faithfulness ?? staticFaithfulness;
  const ops = live?.perOperation ?? staticPerOperation;
  const masked = live?.maskedNumber ?? staticMaskedNumber;
  const sourceNote = (source: string) => `Computed from ${source}.`;

  // Rule of three: with no successes in n trials the 95% upper bound is ~3/n.
  const causalTotal = ops.rows
    .filter((r) => r.operation === "causal")
    .reduce((n, r) => n + r.total, 0);
  const causalCeiling = causalTotal ? Math.round((3 / causalTotal) * 100) : 0;

  return (
    <>
      <PageHero
        kicker="Reproductions & model comparison"
        title={
          <>
            What the <span className="brand-gradient-text italic">prior systems</span> do,
            re-run on local models.
          </>
        }
        intro="Three offline reproductions of two published data-storytelling systems, re-run here on local Ollama models. Each figure states what it measures and, just as important, what it cannot tell you. Muted bars are quoted from the source paper; the others were run on this machine."
      />
      <Section>
        <Container>
          <Reveal>
            <SectionHeader
              kicker="Faithfulness & analytical correctness"
              title="Modern models state data well, then reach outside it for causes"
            />
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <Reveal>
              <MetricCard
                title="Faithfulness"
                unit={faith.unit}
                caption={`${faith.caption} ${sourceNote(faith.source)}`}
                hint="Lower is better"
                explain={{
                  measures: (
                    <>
                      The share of generated outputs holding{" "}
                      <span className="font-medium text-ink">at least one</span> span a
                      reference-free detector marks as a semantic error, re-run on the
                      released Quintd-1 inputs.
                    </>
                  ),
                  blind: (
                    <>
                      How wrong an output is. One misplaced word and a fabricated
                      statistic both count once, and an output with five errors counts
                      the same as an output with one, so this rises with the
                      <span className="font-medium text-ink"> reach</span> of error and
                      says nothing about its severity.
                    </>
                  ),
                }}
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
                explain={{
                  measures: (
                    <>
                      How often a model recovers a number that was deleted from the
                      reference text, given the table it came from. A cloze test for
                      whether the figures are being read rather than guessed.
                    </>
                  ),
                  blind: (
                    <>
                      Whether the numbers a model writes{" "}
                      <span className="font-medium text-ink">unprompted</span> are right,
                      which is the separate factuality figure. The muted bars are quoted
                      from the paper and the others were re-run here, so read each group
                      against itself rather than as one ranking.
                    </>
                  ),
                }}
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
                explain={{
                  measures: (
                    <>
                      Every analytical claim in a report is typed &mdash; lookup,
                      comparison, subtraction, rate of change, trend, causal &mdash; and
                      checked against the source table it was written from. The bar is
                      the share of claims of that type the table supports.
                    </>
                  ),
                  blind: (
                    <>
                      Whether an unsupported claim is{" "}
                      <span className="font-medium text-ink">false</span>. That matters
                      most in the causal row, which is {causalTotal} claims across both
                      runs and none supported. The table is same-day prices and volumes,
                      and causation is not a column in it, so &ldquo;fell amid inflation
                      concerns&rdquo; points somewhere the table cannot follow and cannot
                      score above zero however good the model is. Read it as
                      groundedness, not reasoning: both models state off-table causes as
                      confidently as on-table facts, which is the thing a factual check
                      downstream has to catch. The counts are small enough to be careful
                      with too &mdash; none correct out of {causalTotal} is still
                      consistent with a true rate near {causalCeiling}%.
                    </>
                  ),
                }}
              >
                <OperationChart results={ops} />
              </MetricCard>
            </div>
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}

/**
 * One metric: the figure, the caption that sources it, and what it means.
 *
 * `explain` is not decoration. Every metric on this page is a proxy for
 * something a reader actually cares about, and each proxy is wrong in its own
 * specific way - a per-output rate that ignores severity, a score quoted from
 * two different provenances, a check that a table cannot perform. A number
 * shown without that is a number a reader will over-read, so the "what it
 * cannot tell you" half is the part that earns the space.
 */
function MetricCard({
  title,
  unit,
  caption,
  hint,
  explain,
  children,
}: {
  title: string;
  unit: string;
  caption: string;
  hint?: string;
  explain?: { measures: React.ReactNode; blind: React.ReactNode };
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
      {explain && (
        <dl className="mt-5 space-y-2.5 border-t border-hairline pt-4 text-sm leading-relaxed">
          <div>
            <dt className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">
              What it measures
            </dt>
            <dd className="mt-1 text-muted">{explain.measures}</dd>
          </div>
          <div>
            <dt className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">
              What it cannot tell you
            </dt>
            <dd className="mt-1 text-muted">{explain.blind}</dd>
          </div>
        </dl>
      )}
    </Card>
  );
}
