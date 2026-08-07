import Link from "next/link";
import { ArrowRight, PenLine, Scale, BarChart3, Quote } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { ToneToggle } from "@/components/tone-toggle";
import { PipelineDiagram } from "@/components/pipeline-diagram";
import { CtaBand } from "@/components/cta-band";
import { Container, Section, SectionHeader, Kicker } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Reveal } from "@/components/reveal";
import { getStorySet } from "@/lib/data/stories";
import { headlineStats } from "@/lib/data/metrics";

const features = [
  {
    icon: PenLine,
    title: "Generate",
    body: "A general LLM turns a real dataset into a fluent, first-draft data narrative — the way most AI storytelling stops today.",
  },
  {
    icon: Scale,
    title: "Moderate tone",
    body: "An agentic LLM detects manipulative fear, false reassurance, or numbing detachment and rebalances the framing — our novel contribution.",
  },
  {
    icon: BarChart3,
    title: "Compare & evaluate",
    body: "Lay the human and the LLM-moderated story side by side, with faithfulness, tone-calibration, and text-similarity metrics.",
  },
];

export default function HomePage() {
  const measles = getStorySet("measles");

  return (
    <>
      <Hero />

      {/* Motivation */}
      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <SectionHeader
                kicker="Why tone matters"
                title={
                  <>
                    Fluent text is not the same as <em className="text-brand-blue not-italic">faithful</em> text.
                  </>
                }
                intro="Raw data is hard to read, so we let models narrate it. But the way a story is framed measurably changes how people interpret it — and a model can mislead even when every number is correct. Engagement and trustworthiness pull in opposite directions; tone is where they meet."
              />
            </Reveal>

            <Reveal delay={0.1}>
              <Card className="relative overflow-hidden p-8">
                <Quote className="absolute -right-3 -top-3 h-24 w-24 text-surface-soft" />
                <p className="relative font-serif text-2xl leading-relaxed text-navy">
                  &ldquo;The emotional framing of a data story changes how it is received — and can
                  mislead even when every number is correct.&rdquo;
                </p>
                <p className="relative mt-6 font-mono text-xs uppercase tracking-wider text-faint">
                  The gap our project fills — no published system moderates the affective tone of a
                  data narrative.
                </p>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Signature: same numbers, two tones */}
      <Section className="border-y border-hairline bg-surface-soft/50 py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <Reveal>
              <div>
                <Kicker>The core idea</Kicker>
                <h2 className="mt-5 text-3xl text-navy sm:text-4xl">Same numbers, two tones.</h2>
                <p className="mt-5 text-lg leading-relaxed text-muted">
                  Both sentences describe the exact same measles data. One manufactures panic; the
                  other keeps the urgency honest. Flip the switch to feel the difference the
                  moderator is trained to make.
                </p>
                <Link
                  href="/generate"
                  className="mt-6 inline-flex items-center gap-1.5 font-medium text-brand-blue transition-colors hover:text-navy"
                >
                  Try it on a full story
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <Card className="p-7 sm:p-9">
                <ToneToggle alarmist={measles.twoTones.alarmist} calibrated={measles.twoTones.calibrated} />
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Features */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeader
              align="center"
              kicker="What the app does"
              title="Three moves, one interface"
              intro="Built around the project's pipeline — generate a story, moderate its tone, then compare it to a human baseline."
              className="mx-auto"
            />
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <Card hover className="h-full p-7">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy text-white">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-6 text-xl text-navy">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Pipeline overview */}
      <Section className="border-t border-hairline bg-surface-soft/40">
        <Container>
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <SectionHeader
                kicker="The pipeline"
                title="Generate → moderate → fact-check"
                intro="A generator–critic architecture, with the critic retrained from fact-checking to tone."
              />
              <Link
                href="/how-it-works"
                className="inline-flex shrink-0 items-center gap-1.5 font-medium text-brand-blue transition-colors hover:text-navy"
              >
                See the full pipeline
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-12">
              <PipelineDiagram />
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Credibility stats */}
      <Section className="bg-deep-navy text-white">
        <Container>
          <Reveal>
            <SectionHeader
              tone="light"
              align="center"
              kicker="Grounded in reproductions"
              title="What we already measured"
              intro="Before building, we reproduced three prior systems offline to ground the design — and the numbers told us tone, not facts, is the open problem."
              className="mx-auto"
            />
          </Reveal>
          <div className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {headlineStats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <Stat tone="light" value={s.value} label={s.label} sub={s.sub} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}
