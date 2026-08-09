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
  ArrowRight,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { StorySet, FactStatus } from "@/lib/data/stories";
import { pipelineStages, type StageId } from "@/lib/data/pipeline";
import { Typewriter } from "@/components/generate/typewriter";
import { AlarmismMeter } from "@/components/alarmism-meter";
import { cn } from "@/lib/utils";

type Phase = "idle" | "generate" | "moderate" | "factcheck" | "done";

const stageIcons = { generate: PenLine, moderate: Scale, factcheck: ShieldCheck } as const;

const factTone: Record<FactStatus, { className: string; icon: typeof Check; label: string }> = {
  verified: { className: "text-calm border-calm/30 bg-calm-soft/50", icon: Check, label: "Verified" },
  flagged: { className: "text-alarm border-alarm/30 bg-alarm-soft/50", icon: AlertTriangle, label: "Flagged" },
  corrected: { className: "text-brand-blue border-brand-blue/30 bg-brand-blue/5", icon: RotateCcw, label: "Corrected" },
};

export function PipelineRunner({
  story,
  stages,
  models,
  onComplete,
  onReset,
}: {
  story: StorySet;
  /**
   * When supplied, each stage is awaited against the real backend and the phase
   * advances when that stage actually finishes. Without it the component keeps
   * its original timed behaviour over mock data.
   */
  stages?: {
    generate: () => Promise<StorySet>;
    moderate: () => Promise<StorySet>;
    factcheck: () => Promise<StorySet>;
  };
  /** Actual model per stage, from the backend tier. Falls back to the static copy. */
  models?: Partial<Record<StageId, string>>;
  onComplete: () => void;
  onReset?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [live, setLive] = useState<StorySet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLive = !!stages;

  // Render whatever the backend has produced so far; fall back to the mock.
  const view = live ?? story;
  const rawBody = view.aiRaw.paragraphs.join("\n\n");

  const stageState = (id: keyof typeof stageIcons): "pending" | "running" | "done" => {
    const order: Phase[] = ["idle", "generate", "moderate", "factcheck", "done"];
    const map: Record<string, Phase> = { generate: "generate", moderate: "moderate", factcheck: "factcheck" };
    const stagePhase = map[id];
    if (phase === stagePhase) return "running";
    if (order.indexOf(phase) > order.indexOf(stagePhase)) return "done";
    return "pending";
  };

  // Advance moderate → factcheck → done with timed beats (mock mode only; in
  // live mode the awaited stage calls drive the phase instead).
  useEffect(() => {
    if (isLive) return;
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

  const run = async () => {
    setError(null);
    if (!stages) {
      setPhase("generate");
      return;
    }
    try {
      setPhase("generate");
      setLive(await stages.generate());
      setPhase("moderate");
      setLive(await stages.moderate());
      setPhase("factcheck");
      setLive(await stages.factcheck());
      setPhase("done");
      onComplete();
    } catch (err) {
      // Surface it. A silent failure here is indistinguishable from a slow model.
      setError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  };

  const reset = () => {
    setPhase("idle");
    setLive(null);
    setError(null);
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
                <p className="truncate font-mono text-[0.66rem] text-faint">
                  {models?.[stage.id] ?? stage.model}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          data-testid="pipeline-error"
          className="rounded-xl border border-alarm/40 bg-alarm-soft/50 px-4 py-3 text-sm text-alarm"
        >
          Pipeline failed: {error}
        </div>
      )}

      {isLive && phase !== "idle" && phase !== "done" && !live && (
        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-soft/40 px-4 py-3 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Running {phase} on a local model. Large models take minutes.
        </div>
      )}

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

      {/* Generation output */}
      {phase !== "idle" && (!isLive || live) && (
        <OutputCard
          accent="alarm"
          icon={PenLine}
          label="Stage 1 — General LLM"
          author={view.aiRaw.author}
        >
          <h3 className="font-serif text-xl text-navy">{view.aiRaw.title}</h3>
          <Typewriter
            text={rawBody}
            running={!isLive && phase === "generate"}
            duration={2600}
            className="mt-3 space-y-3 text-[0.975rem]"
            onDone={isLive ? undefined : () => setPhase("moderate")}
          />
          {phase !== "generate" && (
            <div className="mt-5 border-t border-hairline pt-4">
              <AlarmismMeter value={view.aiRaw.alarmismRating} size="sm" />
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
              author={view.aiModerated.author}
            >
              <h3 className="font-serif text-xl text-navy">{view.aiModerated.title}</h3>
              <div className="mt-3 space-y-3">
                {view.aiModerated.paragraphs.map((p, i) => (
                  <p key={i} className="font-serif text-[0.975rem] leading-relaxed text-ink/85">
                    {p}
                  </p>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-hairline bg-surface-soft/50 p-4">
                <p className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                  {view.emotiveSpans.length} emotive spans rebalanced
                </p>
                <ul className="mt-3 space-y-2">
                  {view.emotiveSpans.slice(0, 4).map((s, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.12 }}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="text-alarm line-through decoration-alarm/50">{s.text}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-faint" />
                      <span className="font-medium text-calm">{s.replacement}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 border-t border-hairline pt-4">
                <AlarmismMeter value={view.aiModerated.alarmismRating} size="sm" />
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
              <ul className="mt-4 space-y-3">
                {view.factualCheck.map((f, i) => {
                  const t = factTone[f.status];
                  const Icon = t.icon;
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.15 }}
                      className={cn("flex gap-3 rounded-xl border p-3.5", t.className)}
                    >
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/70">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink">
                          <span className="font-mono text-[0.7rem] uppercase tracking-wide opacity-70">
                            {t.label}
                          </span>{" "}
                          — {f.claim}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted">{f.note}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </OutputCard>
          </motion.div>
        )}
      </AnimatePresence>

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
