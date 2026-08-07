import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { BrandMark } from "@/components/brand-logo";
import { GithubIcon } from "@/components/icons";
import { course } from "@/lib/data/team";

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-navy">
      <div className="glow-teal pointer-events-none absolute inset-0 opacity-80" />
      <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-50" />
      <div className="grain pointer-events-none absolute inset-0" />
      <Container className="relative py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <BrandMark variant="mono-light" className="mx-auto h-12 w-12" />
          <h2 className="mt-7 text-balance text-3xl text-white sm:text-4xl">
            See the same data told two ways.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-white/65">
            Pick a dataset, write a human story, then watch the pipeline generate, moderate
            its tone, and lay both narratives side by side with the metrics.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/generate" size="lg" variant="dark">
              Generate a story
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href={course.github} size="lg" variant="ghost" className="text-white/80 hover:bg-white/10">
              <GithubIcon className="h-4 w-4" />
              The repository
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
