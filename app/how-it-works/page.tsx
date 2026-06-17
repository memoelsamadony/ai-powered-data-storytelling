import type { Metadata } from "next";
import { AlertTriangle, TrendingUp, RotateCcw } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Container, Section, SectionHeader, Kicker } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { PipelineDiagram } from "@/components/pipeline-diagram";
import { ToneToggle } from "@/components/tone-toggle";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import { pipelineGap } from "@/lib/data/pipeline";
import { getStorySet } from "@/lib/data/stories";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "A generator–critic pipeline retrained from fact-checking to tone: generate a data story, moderate its emotional framing, and run a separate factual check.",
};

export default function HowItWorksPage() {
  const measles = getStorySet("measles");
  const who = getStorySet("who-health");

  return (
    <>
      <PageHero
        kicker="How it works"
        title={
          <>
            A generator–critic pipeline, retrained for <span className="brand-gradient-text italic">tone</span>.
          </>
        }
        intro="We follow the generate-then-verify pattern of prior systems — but swap the factual verifier for a moderator that audits emotional framing, with a lightweight factual check kept alongside."
      />

      {/* The gap */}
      <Section>
        <Container>
          <Reveal>
            <Card className="relative overflow-hidden border-navy/10 bg-navy p-8 text-white sm:p-12">
              <div className="glow-teal pointer-events-none absolute inset-0 opacity-70" />
              <div className="relative max-w-3xl">
                <Kicker tone="light">The gap we fill</Kicker>
                <h2 className="mt-5 text-balance text-3xl text-white sm:text-4xl">
                  {pipelineGap.headline}
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-white/70">{pipelineGap.body}</p>
              </div>
            </Card>
          </Reveal>
        </Container>
      </Section>

      {/* Full pipeline */}
      <Section className="border-y border-hairline bg-surface-soft/40 pt-0">
        <Container>
          <Reveal>
            <SectionHeader
              kicker="The three stages"
              title="Generate → moderate → fact-check"
              intro="Each stage is a distinct agent with a single job. The moderator is the novel piece; the factual check exists because a tone agent is not a fact-checker."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-12">
              <PipelineDiagram detailed />
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Two-sided tone */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeader
              align="center"
              kicker="Calibration goes both ways"
              title="Tone fails in two opposite directions"
              intro="That's why we deliberately use two datasets. One tempts the model toward alarmism; the other toward false reassurance. A good moderator pulls each back toward the center."
              className="mx-auto"
            />
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <Reveal>
              <Card className="h-full p-7">
                <div className="flex items-center gap-2 text-alarm">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-mono text-[0.7rem] font-medium uppercase tracking-wider">
                    Measles × vaccination · alarmism
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Cases rebounded as coverage stalled. The pull is toward panic — so the moderator
                  must remove the alarmism without erasing the real urgency.
                </p>
                <div className="mt-6 border-t border-hairline pt-6">
                  <ToneToggle alarmist={measles.twoTones.alarmist} calibrated={measles.twoTones.calibrated} />
                </div>
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="h-full p-7">
                <div className="flex items-center gap-2 text-brand-blue">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-mono text-[0.7rem] font-medium uppercase tracking-wider">
                    Child mortality · over-optimism
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Decades of genuine progress tempt the model toward triumph. Here the moderator must
                  keep the gravity — the remaining gap, the COVID-era reversal — not flatten it.
                </p>
                <div className="mt-6 border-t border-hairline pt-6">
                  <ToneToggle alarmist={who.twoTones.alarmist} calibrated={who.twoTones.calibrated} />
                </div>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Real run / why factual check */}
      <Section className="border-t border-hairline bg-surface-soft/40">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <Reveal>
              <div>
                <Kicker>A real run</Kicker>
                <h2 className="mt-5 text-3xl text-navy sm:text-4xl">
                  A tone agent is not a fact-checker.
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted">
                  In one real run on the measles data, the small model wrote fluent but emotive text —
                  and hallucinated a case count. The moderator stripped the alarmism and, by
                  re-grounding the narrative, quietly corrected the number.
                </p>
                <p className="mt-4 text-lg leading-relaxed text-muted">
                  But it never <em className="not-italic text-ink">flagged</em> the error. That blind
                  spot is exactly why a separate, lightweight factual check sits beside the tone agent.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="overflow-hidden p-0">
                <div className="border-b border-hairline bg-surface-soft/60 px-6 py-4">
                  <span className="font-mono text-[0.7rem] font-medium uppercase tracking-wider text-faint">
                    Factual check · flagged
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-3 rounded-xl border border-alarm/30 bg-alarm-soft/50 p-4">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/70 text-alarm">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{measles.factualCheck[0].claim}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">
                        {measles.factualCheck[0].note}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-deep-teal">
                    <RotateCcw className="h-4 w-4" />
                    Re-grounded silently by the moderator — caught explicitly by the factual check.
                  </div>
                </div>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}
