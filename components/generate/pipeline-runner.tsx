"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Loader2,
  Check,
  PenLine,
  Scale,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import type { StorySet } from "@/lib/data/stories";
import type { Dataset } from "@/lib/data/datasets";
import { pipelineStages } from "@/lib/data/pipeline";
import { Typewriter } from "@/components/generate/typewriter";
import { AlarmismMeter, humanBand } from "@/components/alarmism-meter";
import { StoryChart } from "@/components/charts/story-chart";
import { Redline } from "@/components/story/redline";
import { FactCheckGutter } from "@/components/story/fact-check-gutter";
import { cn } from "@/lib/utils";

type Phase = "idle" | "generate" | "moderate" | "factcheck" | "done";

const stageIcons = { generate: PenLine, moderate: Scale, factcheck: ShieldCheck } as const;

export function PipelineRunner({
  story,
  dataset,
  onComplete,
  onReset,
}: {
  story: StorySet;
  dataset: Dataset;
  onComplete: () => void;
  onReset?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const band = humanBand(story.human.alarmismRating);

  const rawBody = story.aiRaw.paragraphs.join("\n\n");

  const stageState = (id: keyof typeof stageIcons): "pending" | "running" | "done" => {
    const order: Phase[] = ["idle", "generate", "moderate", "factcheck", "done"];
    const map: Record<string, Phase> = { generate: "generate", moderate: "moderate", factcheck: "factcheck" };
    const stagePhase = map[id];
    if (phase === stagePhase) return "running";
    if (order.indexOf(phase) > order.indexOf(stagePhase)) return "done";
    return "pending";
  };

  // Advance moderate → factcheck → done with timed beats.
  useEffect(() => {
    if (phase === "moderate") {
      const t = setTimeout(() => setPhase("factcheck"), 2200);
      return () => clearTimeout(t);
    }
    if (phase === "factcheck") {
      const t = setTimeout(() => {
        setPhase("done");
        onComplete();
      }, 1900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const run = () => setPhase("generate");
  const reset = () => {
    setPhase("idle");
    onReset?.();
  };

  return (
    <div className="space-y-6">
      {/* Stage status bar */}
      <div className="grid gap-3 sm:grid-cols-3">
        {pipelineStages.map((stage) => {
          const state = stageState(stage.id as keyof typeof stageIcons);
          const Icon = stageIcons[stage.id as keyof typeof stageIcons];
          return (
            <div
              key={stage.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition-colors",
                state === "running" && "border-navy/40 ring-1 ring-navy/10",
                state === "done" && "border-calm/30",
                state === "pending" && "border-hairline opacity-70",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                  state === "done" ? "bg-calm text-white" : state === "running" ? "bg-navy text-white" : "bg-surface-soft text-faint",
                )}
              >
                {state === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : state === "done" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy">{stage.name}</p>
                <p className="truncate font-mono text-[0.66rem] text-faint">{stage.model}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Idle: run button */}
      {phase === "idle" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface-soft/40 px-6 py-14 text-center">
          <p className="max-w-md text-pretty text-muted">
            Run the pipeline to watch the general model write a story, the agentic moderator
            rebalance its tone, and the factual check audit the numbers.
          </p>
          <button
            onClick={run}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3.5 font-medium text-white shadow-[0_12px_30px_-12px_rgba(13,27,92,0.7)] transition-all hover:-translate-y-0.5 hover:bg-deep-navy"
          >
            <Play className="h-4 w-4" />
            Run the pipeline
          </button>
        </div>
      )}

      {/* Once the run starts, the data stays on screen beside every stage —
          the chart is no longer a dataset preview that vanishes (defect D2). */}
      {phase !== "idle" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_310px] lg:items-start">
          <div className="min-w-0 space-y-6">

      {/* Generation output */}
      {(
        <OutputCard
          accent="alarm"
          icon={PenLine}
          label="Stage 1 — General LLM"
          author={story.aiRaw.author}
        >
          <h3 className="font-serif text-xl text-navy">{story.aiRaw.title}</h3>
          <Typewriter
            text={rawBody}
            running={phase === "generate"}
            duration={2600}
            className="mt-3 space-y-3 text-[0.975rem]"
            onDone={() => setPhase("moderate")}
          />
          {phase !== "generate" && (
            <div className="mt-5 border-t border-hairline pt-4">
              <AlarmismMeter value={story.aiRaw.alarmismRating} band={band} size="sm" />
            </div>
          )}
        </OutputCard>
      )}

      {/* Moderation output */}
      <AnimatePresence>
        {(phase === "moderate" || phase === "factcheck" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <OutputCard
              accent="calm"
              icon={Scale}
              label="Stage 2 — Tone moderator"
              author={story.aiModerated.author}
            >
              <h3 className="font-serif text-xl text-navy">{story.aiModerated.title}</h3>

              {/* G6 — the edits marked in place, rather than a list of four of
                  them that makes the reader re-find each phrase in the prose. */}
              <Redline variant={story.aiRaw} spans={story.emotiveSpans} className="mt-4" />

              <div className="mt-5 border-t border-hairline pt-4">
                <AlarmismMeter
                  value={story.aiModerated.alarmismRating}
                  before={story.aiRaw.alarmismRating}
                  band={band}
                  size="sm"
                />
              </div>
            </OutputCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Factual check */}
      <AnimatePresence>
        {(phase === "factcheck" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <OutputCard accent="brand" icon={ShieldCheck} label="Stage 3 — Factual check" author="grounding pass">
              <p className="text-sm text-muted">
                A tone agent is not a fact-checker. Here, the moderator silently re-grounded a
                hallucinated number without flagging it — so a separate pass audits every claim.
              </p>
              {/* G7 — status marks in a gutter, each with an icon and a label. */}
              <FactCheckGutter items={story.factualCheck} className="mt-4" />
            </OutputCard>
          </motion.div>
        )}
      </AnimatePresence>

          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-hairline bg-surface p-4">
              <p className="mb-3 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                The data · {dataset.yearRange}
              </p>
              <StoryChart dataset={dataset} height={260} compact />
            </div>
          </aside>
        </div>
      )}

      {phase === "done" && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-calm/30 bg-calm-soft/40 px-5 py-4">
          <p className="text-sm font-medium text-calm-ink">
            Pipeline complete — three stages run on the same data.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-navy"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Run again
          </button>
        </div>
      )}
    </div>
  );
}

function OutputCard({
  accent,
  icon: Icon,
  label,
  author,
  children,
}: {
  accent: "alarm" | "calm" | "brand";
  icon: typeof PenLine;
  label: string;
  author: string;
  children: React.ReactNode;
}) {
  const bar = accent === "alarm" ? "bg-alarm" : accent === "calm" ? "bg-calm" : "bg-brand-blue";
  const chip =
    accent === "alarm"
      ? "bg-alarm-soft text-alarm-ink"
      : accent === "calm"
        ? "bg-calm-soft text-calm-ink"
        : "bg-brand-blue/10 text-brand-blue";
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
      <div className={cn("h-1 w-full", bar)} />
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[0.68rem] font-medium uppercase tracking-wide", chip)}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
          <span className="font-mono text-[0.68rem] text-faint">{author}</span>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
