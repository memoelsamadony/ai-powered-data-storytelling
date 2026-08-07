import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import { Container, Kicker } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/generate", label: "Open the studio" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/datasets", label: "Datasets" },
  { href: "/results", label: "Results" },
];

export default function NotFound() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden border-b border-hairline bg-surface">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(100%_80%_at_50%_0%,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-3xl" />
      <Container className="relative py-20 sm:py-28">
        <Kicker>Error 404</Kicker>
        <p className="mt-6 font-mono text-7xl font-medium leading-none text-navy/15 sm:text-8xl">
          404
        </p>
        <h1 className="mt-5 max-w-2xl text-balance text-4xl leading-[1.05] text-navy sm:text-5xl">
          This page wandered <span className="brand-gradient-text italic">off the chart</span>.
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted">
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you
          back to a story that adds up.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href="/" size="lg">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to home
          </Button>
          <Button href="/generate" variant="secondary" size="lg">
            <Compass className="h-4 w-4" aria-hidden />
            Open the studio
          </Button>
        </div>

        <nav className="mt-10 border-t border-hairline pt-6" aria-label="Suggested pages">
          <p className="kicker text-deep-teal">Or jump to</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[0.95rem] text-navy underline-offset-4 transition-colors hover:text-brand-blue hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </section>
  );
}
