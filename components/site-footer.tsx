import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { GithubIcon } from "@/components/icons";
import { course, supervisors } from "@/lib/data/team";

const explore = [
  { href: "/generate", label: "Generate a story" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/datasets", label: "Datasets" },
  { href: "/results", label: "Results & evaluation" },
  { href: "/about", label: "About & team" },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-deep-navy text-white/70">
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <BrandLogo variant="mono-light" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              An agentic approach to moderating the emotional tone of data narratives.
              A general LLM generates, an agentic LLM moderates, and a factual check keeps
              it honest.
            </p>
            <a
              href={course.github}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
            >
              <GithubIcon className="h-4 w-4" />
              View the repository
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div>
            <h3 className="kicker text-teal">Explore</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {explore.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/65 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="kicker text-teal">Project</h3>
            <ul className="mt-5 space-y-3 text-sm text-white/65">
              <li>{course.program}</li>
              <li>{course.unit}</li>
              <li>{course.university}</li>
              <li>{course.term}</li>
            </ul>
            <p className="mt-5 text-xs uppercase tracking-wider text-white/40">Supervisors</p>
            <ul className="mt-2 space-y-1 text-sm text-white/65">
              {supervisors.map((s) => (
                <li key={s.name}>{s.name}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center">
          <p>© {course.term.match(/\d{4}/)?.[0] ?? "2026"} · {course.university} · {course.unit}</p>
          <p className="font-mono">Built with Next.js · Django and Ollama behind the studio</p>
        </div>
      </div>
    </footer>
  );
}
