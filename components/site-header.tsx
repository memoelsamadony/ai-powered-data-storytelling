"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { GithubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { course } from "@/lib/data/team";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/datasets", label: "Datasets" },
  { href: "/results", label: "Results" },
  { href: "/reproductions", label: "Reproductions" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline/80 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group" aria-label="Home" onClick={() => setOpen(false)}>
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active ? "text-navy" : "text-muted hover:text-navy",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-teal" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <a
            href={course.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-soft hover:text-navy"
          >
            <GithubIcon className="h-[18px] w-[18px]" />
          </a>
          <Button href="/generate" size="sm">
            Generate a story
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-full text-navy lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-hairline bg-canvas lg:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-4 sm:px-8">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-4 py-3 text-base font-medium",
                  pathname === item.href ? "bg-surface-soft text-navy" : "text-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button href="/generate" className="mt-2 w-full" onClick={() => setOpen(false)}>
              Generate a story
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
