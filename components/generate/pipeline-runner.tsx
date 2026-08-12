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
import { pipelineStages, type StageId } from "@/lib/data/pipeline";
import { Typewriter } from "@/components/generate/typewriter";
import { TonePair, humanBands } from "@/components/tone-meter";
import { StoryChart } from "@/components/charts/story-chart";
import { SuggestedCharts } from "@/components/charts/suggested-charts";
import type { ChartSuggestion } from "@/lib/api";
import { Redline } from "@/components/story/redline";
import { FactCheckGutter } from "@/components/story/fact-check-gutter";
import { cn } from "@/lib/utils";

/**
 * `charts` sits between the draft and the moderation because that is the order
 * the work happens in: the moderator reads the table and picks the figures,
 * then reads the prose and moderates it. It is not one of the three stage
 * cards - those describe what happens to the STORY - so it advances the phase
 * without appearing in `stageIcons`.
 */
type Phase = "idle" | "generate" | "charts" | "moderate" | "factcheck" | "done";

const stageIcons = { generate: PenLine, moderate: Scale, factcheck: ShieldCheck } as const;

export function PipelineRunner({
  story,
  dataset,
  stages,
  models,
  source,
  onSourceChange,
  cachedCount = 0,
  onComplete,
  onReset,
}: {
  /**
   * The story to show before the run produces one - the mock, for a registry
   * dataset. Null for an uploaded table, which has no mock and cannot have one:
   * `getStorySet` answers an unknown id with the measles story, and showing that
   * under an uploaded file's name is the failure this project exists to catch.
   *
   * Nullable rather than required, because this component is what STARTS the
   * run. Requiring a story to render it meant an upload could never be run at
   * all: no story until the pipeline goes, and no way to start the pipeline
   * until there is a story.
   */
  story: StorySet | null;
  dataset: Dataset;
  /**
   * When supplied, each stage is awaited against the real backend and the phase
   * advances when that stage actually finishes. Without it the component keeps
   * its timed behaviour over mock data.
   */
  stages?: {
    generate: () => Promise<StorySet>;
    /** Resolves null when the selector is unreachable; the run continues. */
    selectCharts?: () => Promise<ChartSuggestion | null>;
    moderate: () => Promise<StorySet>;
    factcheck: () => Promise<StorySet>;
  };
  /** Actual model per stage, from the backend tier. Falls back to the static copy. */
  models?: Partial<Record<StageId, string>>;
  /** Which source the next run uses. Cached replays a stored run. */
  source?: "cached" | "live";
  onSourceChange?: (s: "cached" | "live") => void;
  /** Stored runs available for this dataset and tier. Zero disables cached. */
  cachedCount?: number;
  onComplete: () => void;
  onReset?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [live, setLive] = useState<StorySet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charts, setCharts] = useState<ChartSuggestion | null>(null);
  const isLive = !!stages;

  // Render whatever the backend has produced so far; fall back to the mock,
  // which an uploaded table does not have. Everything that reads it sits behind
  // the `view &&` gate below, which in live mode waits for the first stage.
  const view = live ?? story;
  // No band without a judged human baseline: the band is drawn *around* that
  // rating, so inventing one would draw a target where none was measured. An
  // uploaded table has no baseline at all, which is the same absence.
  const bands: ReturnType<typeof humanBands> = view?.human
    ? humanBands(view.human)
    : { alarmism: undefined, optimism: undefined };

  const rawBody = view?.aiRaw.paragraphs.join("\n\n") ?? "";

  const stageState = (id: keyof typeof stageIcons): "pending" | "running" | "done" => {
    const order: Phase[] = ["idle", "generate", "charts", "moderate", "factcheck", "done"];
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
      if (stages.selectCharts) {
        setPhase("charts");
        setCharts(await stages.selectCharts());
      }
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
    setCharts(null);
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
          {/*
            The source is chosen before the run, not reported after it. A live
            run on this hardware is minutes; a stored one is seconds. Which of
            those is about to happen is the single most useful thing to know
            standing in front of an audience, so it is a control rather than a
            badge, and it says what it will do rather than what it did.
          */}
          {onSourceChange && (
            <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-hairline bg-surface p-1">
              {(["cached", "live"] as const).map((opt) => {
                const disabled = opt === "cached" && cachedCount === 0;
                const active = source === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => onSourceChange(opt)}
                    disabled={disabled}
                    title={
                      disabled
                        ? "No stored run for this dataset and tier yet"
                        : opt === "cached"
                          ? "Replay a stored run: same text every time, no model"
                          : "Run every stage on a local model now"
                    }
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      active ? "bg-navy text-white" : "text-muted hover:text-navy",
                      disabled && "cursor-not-allowed opacity-40 hover:text-muted",
                    )}
                  >
                    {opt === "cached" ? "Cached" : "Live"}
                  </button>
                );
              })}
            </div>
          )}

          {onSourceChange && (
            <p className="mt-2 font-mono text-[0.66rem] uppercase tracking-wide text-faint">
              {source === "cached" && cachedCount > 0
                ? "Replays a stored run - seconds, and the same text every time"
                : "Runs every stage on a local model - minutes on this hardware"}
            </p>
          )}

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
      {phase !== "idle" && (!isLive || live) && view && (
        <div className="grid gap-6 lg:grid-cols-[1fr_310px] lg:items-start">
          <div className="min-w-0 space-y-6">

      {/* Generation output */}
      {(
        <OutputCard
          accent="alarm"
          icon={PenLine}
          label="Stage 1: General LLM"
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
              <TonePair
                alarmism={view.aiRaw.alarmismRating}
                optimism={view.aiRaw.optimismRating}
                bands={bands}
              />
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
              label="Stage 2: Tone moderator"
              author={view.aiModerated.author}
            >
              <h3 className="font-serif text-xl text-navy">{view.aiModerated.title}</h3>

              {/* G6 — the edits marked in place, rather than a list of four of
                  them that makes the reader re-find each phrase in the prose. */}
              <Redline variant={view.aiRaw} spans={view.emotiveSpans} className="mt-4" />

              <div className="mt-5 border-t border-hairline pt-4">
                <TonePair
                  alarmism={view.aiModerated.alarmismRating}
                  optimism={view.aiModerated.optimismRating}
                  before={{
                    alarmism: view.aiRaw.alarmismRating,
                    optimism: view.aiRaw.optimismRating,
                  }}
                  bands={bands}
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
            <OutputCard accent="brand" icon={ShieldCheck} label="Stage 3: Factual check" author="grounding pass">
              <p className="text-sm text-muted">
                A tone agent is not a fact-checker. Here, the moderator silently re-grounded a
                hallucinated number without flagging it, so a separate pass audits every claim.
              </p>
              {/* G7 — status marks in a gutter, each with an icon and a label. */}
              <FactCheckGutter items={view.factualCheck} className="mt-4" />
            </OutputCard>
          </motion.div>
        )}
      </AnimatePresence>

          </div>

          {/*
            The panel is the dataset's own trend line until the moderator has
            picked its figures, then it becomes those figures. Sticky only
            while it holds the single compact chart - three figures are taller
            than the viewport, and pinning them would trap the reader in a
            column that cannot scroll to its own end.
          */}
          <aside className={cn(!charts && "lg:sticky lg:top-24")}>
            <div className="rounded-2xl border border-hairline bg-surface p-4">
              {charts ? (
                <>
                  {/*
                    Not "chosen by the moderator": selection can run on a larger
                    model than the tier moderates with, so naming the role here
                    would be wrong on exactly the runs that matter. The footer
                    under the figures prints the model that actually ran.
                  */}
                  <p className="mb-1 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                    Figures chosen for this table
                  </p>
                  <p className="mb-4 text-xs leading-relaxed text-muted">
                    Which forms this table can carry was computed from its column
                    types. The moderator ranked those and wrote the reasoning under
                    each figure; it could not reach for a form the data cannot hold.
                  </p>
                  <SuggestedCharts suggestion={charts} height={220} />
                </>
              ) : (
                <>
                  <p className="mb-3 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                    The data · {dataset.yearRange}
                  </p>
                  <StoryChart dataset={dataset} height={260} compact />
                  {phase === "charts" && (
                    <p className="mt-3 flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      The moderator is choosing figures
                    </p>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {phase === "done" && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-calm/30 bg-calm-soft/40 px-5 py-4">
          <p className="text-sm font-medium text-calm-ink">
            Pipeline complete: three stages run on the same data.
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
