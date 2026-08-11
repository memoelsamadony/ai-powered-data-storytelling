import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container, Section } from "@/components/ui/layout";
import { GenerateExperience } from "@/components/generate/generate-experience";

export const metadata: Metadata = {
  title: "Generate a story",
  description:
    "Pick a dataset, write a human baseline, then run the agentic pipeline (generate, moderate tone, and fact-check) and compare the stories with metrics.",
};

export default function GeneratePage() {
  return (
    <>
      <PageHero
        kicker="The interface"
        title={
          <>
            Generate, moderate, and <span className="brand-gradient-text italic">compare</span> a
            data story.
          </>
        }
        intro="A four-step studio that runs the project pipeline. With the Django backend up, the models named on each stage card are the ones that actually wrote what you read; without it the studio falls back to sample stories and says so above."
      />
      <Section className="py-14 sm:py-16">
        <Container>
          <GenerateExperience />
        </Container>
      </Section>
    </>
  );
}
