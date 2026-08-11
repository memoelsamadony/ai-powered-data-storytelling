import type { Metadata } from "next";
import { GraduationCap, Users, BookMarked, ArrowUpRight, Building2 } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Container, Section, SectionHeader } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import { GithubIcon } from "@/components/icons";
import { surveyedSystems, references } from "@/lib/data/literature";
import { team, supervisors, course } from "@/lib/data/team";

export const metadata: Metadata = {
  title: "About & team",
  description:
    "A TU Dresden CMS Team Project surveying AI data storytelling and contributing an agent that moderates the emotional tone of data narratives.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        kicker="About the project"
        title={
          <>
            Surveying AI data storytelling, and adding the piece it&apos;s{" "}
            <span className="brand-gradient-text italic">missing</span>.
          </>
        }
        intro="Data storytelling combines analysis, visualization, and narrative. LLMs can now generate such stories automatically, but fluent text is not necessarily faithful, and framing changes how an audience interprets the data. We contribute the capability the literature does not yet address: an agent that moderates a narrative's emotional tone."
      />

      {/* Contribution */}
      <Section>
        <Container>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { n: "01", t: "Survey", d: "Review AI and agentic data-story tools; map where verification stops at facts." },
              { n: "02", t: "Build", d: "An interactive interface hosting both the human and LLM-moderated stories on the same data." },
              { n: "03", t: "Moderate & compare", d: "Add a tone-moderation agent, then evaluate human vs LLM with metrics and a user study." },
            ].map((c, i) => (
              <Reveal key={c.n} delay={i * 0.08}>
                <Card hover className="h-full p-7">
                  <span className="font-mono text-3xl font-semibold text-surface-soft">{c.n}</span>
                  <h3 className="mt-3 text-xl text-navy">{c.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{c.d}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Literature */}
      <Section className="border-y border-hairline bg-surface-soft/40">
        <Container>
          <Reveal>
            <SectionHeader
              kicker="Literature survey"
              title="The systems we build on"
              intro="A multi-source check confirmed the gap: across these systems, agentic verification always targets facts, never the affective tone of the narrative."
            />
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="mt-10 overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-hairline bg-surface-soft/60">
                    <tr className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                      <th className="px-5 py-3.5 font-medium">System</th>
                      <th className="px-5 py-3.5 font-medium">Year · venue</th>
                      <th className="px-5 py-3.5 font-medium">Type</th>
                      <th className="px-5 py-3.5 font-medium">Role in our context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {surveyedSystems.map((s) => (
                      <tr key={s.name} className="align-top transition-colors hover:bg-surface-soft/40">
                        <td className="px-5 py-4 font-serif text-base font-semibold text-navy">{s.name}</td>
                        <td className="px-5 py-4 font-mono text-xs text-muted">{s.yearVenue}</td>
                        <td className="px-5 py-4 text-muted">{s.type}</td>
                        <td className="px-5 py-4 text-ink">{s.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <div className="mt-10">
              <div className="mb-5 flex items-center gap-2 text-deep-teal">
                <BookMarked className="h-4 w-4" />
                <span className="font-mono text-[0.7rem] font-medium uppercase tracking-wider">References</span>
              </div>
              <ol className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
                {references.map((r) => (
                  <li key={r.id} className="flex gap-3 text-sm">
                    <span className="font-mono text-xs text-faint">[{r.id}]</span>
                    <span className="text-muted">
                      <span className="text-ink">{r.authors}</span>, {r.title}.{" "}
                      <span className="italic">{r.venue}</span>.
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Team */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeader kicker="The team" title="Four students, one interface" />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m, i) => (
              <Reveal key={m.matrikel} delay={i * 0.06}>
                <Card hover className="flex h-full flex-col items-start p-6">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy font-serif text-xl font-semibold text-white">
                    {m.initials}
                  </span>
                  <h3 className="mt-5 font-serif text-lg text-navy">{m.name}</h3>
                  <p className="mt-1 font-mono text-xs text-faint">Mat.-Nr. {m.matrikel}</p>
                </Card>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <Card className="p-6">
                <div className="flex items-center gap-2 text-brand-blue">
                  <Users className="h-4 w-4" />
                  <span className="font-mono text-[0.7rem] font-medium uppercase tracking-wider">Supervisors</span>
                </div>
                <ul className="mt-4 space-y-3">
                  {supervisors.map((s) => (
                    <li key={s.name}>
                      <p className="font-medium text-navy">{s.name}</p>
                      <a href={`mailto:${s.email}`} className="font-mono text-xs text-muted hover:text-brand-blue">
                        {s.email}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 text-brand-blue">
                  <GraduationCap className="h-4 w-4" />
                  <span className="font-mono text-[0.7rem] font-medium uppercase tracking-wider">Chair</span>
                </div>
                <p className="mt-4 font-medium text-navy">{course.chair}</p>
                <p className="mt-1 text-sm text-muted">{course.lab}</p>
                <p className="mt-3 text-sm text-muted">{course.unit}</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 text-brand-blue">
                  <Building2 className="h-4 w-4" />
                  <span className="font-mono text-[0.7rem] font-medium uppercase tracking-wider">Programme</span>
                </div>
                <p className="mt-4 font-medium text-navy">{course.university}</p>
                <p className="mt-1 text-sm text-muted">{course.faculty}</p>
                <p className="mt-3 text-sm text-muted">{course.program}</p>
                <p className="mt-1 font-mono text-xs text-faint">{course.term}</p>
                <a
                  href={course.github}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:text-navy"
                >
                  <GithubIcon className="h-4 w-4" />
                  Code & data
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Card>
            </div>
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}
