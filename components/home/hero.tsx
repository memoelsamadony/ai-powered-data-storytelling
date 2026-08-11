"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons";
import { Container } from "@/components/ui/layout";
import { ToneMeter } from "@/components/tone-meter";
import { course } from "@/lib/data/team";
import { getStorySet } from "@/lib/data/stories";

const ease = [0.22, 1, 0.36, 1] as const;

/* The two cards quote the measles sample story, so they read its judged
   ratings rather than repeating them as literals. They were literals, 4.6 and
   2.1, and they had drifted from the story they sat under. */
const sample = getStorySet("measles")!;
const rawTone = sample.aiRaw.alarmismRating;
const moderatedTone = sample.aiModerated.alarmismRating;
const toneMove =
  rawTone !== null && moderatedTone !== null ? +(moderatedTone - rawTone).toFixed(1) : null;

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-hairline">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(110%_90%_at_50%_0%,black,transparent_72%)]" />
      <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-teal/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-brand-blue/10 blur-3xl" />

      <Container className="relative grid items-center gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-muted backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
            </span>
            <span className="font-mono tracking-wide">CMS Team Project · TU Dresden · SoSe 2026</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.08 }}
            className="mt-6 text-balance text-5xl leading-[1.02] text-navy sm:text-6xl"
          >
            Same numbers,
            <br />
            <span className="brand-gradient-text italic">two very different</span> stories.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.16 }}
            className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted"
          >
            A general LLM writes a data story. An agentic LLM moderates its{" "}
            <span className="font-medium text-ink">emotional tone</span>, pulling alarmism
            down without losing real urgency, while a factual check keeps the numbers honest.
            It&apos;s the capability the literature doesn&apos;t yet address.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.24 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button href="/generate" size="lg">
              Generate a story
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/how-it-works" size="lg" variant="secondary">
              How it works
            </Button>
            <Button href={course.github} size="lg" variant="ghost">
              <GithubIcon className="h-4 w-4" />
              Repository
            </Button>
          </motion.div>
        </div>

        <HeroVisual />
      </Container>
    </section>
  );
}

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease, delay: 0.2 }}
      className="relative mx-auto w-full max-w-md lg:mr-0"
    >
      {/* Raw / alarmist card */}
      <motion.div
        initial={{ rotate: -5 }}
        animate={{ rotate: -5, y: [0, -6, 0] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -left-2 top-4 w-[88%] rounded-2xl border border-alarm/25 bg-surface p-5 shadow-[0_30px_60px_-35px_rgba(224,57,43,0.5)]"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-alarm-soft px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-wide text-alarm-ink">
            <Sparkles className="h-3 w-3" /> LLM: raw
          </span>
        </div>
        <p className="mt-3 font-serif text-lg leading-snug text-ink">
          A deadly disease <span className="font-semibold italic text-alarm">roars back</span> as our
          defenses <span className="font-semibold italic text-alarm">collapse</span>.
        </p>
        <div className="mt-4">
          <ToneMeter value={rawTone} size="sm" />
        </div>
      </motion.div>

      {/* Moderated / calibrated card */}
      <motion.div
        initial={{ rotate: 3 }}
        animate={{ rotate: 3, y: [0, 6, 0] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 } }}
        className="relative ml-auto mt-32 w-[92%] rounded-2xl border border-calm/30 bg-surface p-5 shadow-[0_40px_80px_-40px_rgba(13,27,92,0.55)]"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-calm-soft px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-wide text-calm-ink">
            <ShieldCheck className="h-3 w-3" /> Tone-moderated
          </span>
        </div>
        <p className="mt-3 font-serif text-lg leading-snug text-ink">
          Cases <span className="font-semibold italic text-calm">rose</span> as{" "}
          <span className="font-semibold italic text-calm">coverage stalled</span>.
        </p>
        <div className="mt-4">
          <ToneMeter value={moderatedTone} size="sm" />
        </div>
        {toneMove !== null && (
          <div className="absolute -right-3 -top-3 rounded-full border border-calm/30 bg-surface px-3 py-1 font-mono text-xs font-semibold text-calm shadow-sm">
            tone {toneMove > 0 ? "+" : "−"}
            {Math.abs(toneMove).toFixed(1)}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
