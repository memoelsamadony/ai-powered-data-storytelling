"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, RotateCcw } from "lucide-react";
import { datasets as mockDatasets, type Dataset } from "@/lib/data/datasets";
import { getStorySet, type StorySet } from "@/lib/data/stories";
import * as api from "@/lib/api";
import { StepNode, StepRail, type StepState } from "@/components/generate/stepper";
import { DatasetPicker } from "@/components/generate/dataset-picker";
import { HumanStoryEditor } from "@/components/generate/human-story-editor";
import { PipelineRunner } from "@/components/generate/pipeline-runner";
import { Comparison } from "@/components/generate/comparison";
import { cn } from "@/lib/utils";

const stepMeta = [
  { title: "Choose a dataset", desc: "Pick the data your story is built from. Each one fails in a different tonal direction." },
  { title: "The human baseline", desc: "Write or import the human-authored story, the yardstick the LLM is measured against." },
  { title: "Run the agentic pipeline", desc: "Generate → moderate tone → factual check, all on the same numbers." },
  { title: "Compare & evaluate", desc: "Human, raw, and moderated stories side by side, with the metrics." },
];

const LAST = stepMeta.length - 1;

export function GenerateExperience() {
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [openSteps, setOpenSteps] = useState<number[]>([0]);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [humanText, setHumanText] = useState("");
  const [generated, setGenerated] = useState(false);

  const sectionRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Backend state. `tier` is the first tier this machine can actually run;
  // `null` health means no backend, so everything stays on mock data.
  const [datasets, setDatasets] = useState<Dataset[]>(mockDatasets);
  const [health, setHealth] = useState<api.Health | null>(null);
  const [backendChecked, setBackendChecked] = useState(false);
  const [liveStory, setLiveStory] = useState<StorySet | null>(null);
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [h, ds] = await Promise.all([api.getHealth(), api.getDatasets()]);
      if (cancelled) return;
      setHealth(h);
      // The backend predates `shortName`, which the charts label rows with, so
      // fall back to the full name instead of rendering a blank legend.
      setDatasets(ds.map((d) => ({ ...d, shortName: d.shortName ?? d.name })));
      setBackendChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tier = useMemo(
    () => health?.tiers.find((t) => t.runnable)?.id ?? null,
    [health],
  );
  const isLive = !!health?.ollamaUp && !!tier;

  /** Map the running tier's models onto the pipeline stages for display. */
  const stageModels = useMemo(() => {
    const t = health?.tiers.find((x) => x.id === tier);
    if (!t) return undefined;
    const by = (role: string) => t.models.find((m) => m.role === role)?.model;
    return {
      generate: by("generator"),
      moderate: by("moderator"),
      factcheck: by("moderator"),
    };
  }, [health, tier]);

  const mockStory = useMemo(() => (datasetId ? getStorySet(datasetId) : null), [datasetId]);
  const story = liveStory ?? mockStory;
  const dataset = useMemo(
    () => datasets.find((d) => d.id === datasetId) ?? null,
    [datasets, datasetId],
  );
  const sampleText = mockStory ? mockStory.human.paragraphs.join("\n\n") : "";

  const selectDataset = (id: string) => {
    setDatasetId(id);
    setHumanText(getStorySet(id).human.paragraphs.join("\n\n"));
    setGenerated(false);
    setLiveStory(null);
    runIdRef.current = null;
  };

  /** Real backend stages. Undefined when there is no runnable backend. */
  const stages = useMemo(() => {
    if (!isLive || !datasetId || !tier) return undefined;
    return {
      generate: async () => {
        const run = await api.createRun(datasetId, tier);
        runIdRef.current = run.runId;
        if (humanText.trim()) {
          await api.saveHumanStory(run.runId, humanText);
        }
        const s = await api.stageGenerate(run.runId);
        setLiveStory(s);
        return s;
      },
      moderate: async () => {
        const s = await api.stageModerate(runIdRef.current!);
        setLiveStory(s);
        return s;
      },
      factcheck: async () => {
        const s = await api.stageFactcheck(runIdRef.current!);
        setLiveStory(s);
        return s;
      },
    };
  }, [isLive, datasetId, tier, humanText]);

  const isOpen = useCallback((i: number) => openSteps.includes(i), [openSteps]);

  const toggle = (i: number) =>
    setOpenSteps((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  /** Advance: reveal the next step, fold the one we came from, scroll to it. */
  const go = (next: number) => {
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
    setOpenSteps((s) => [...new Set([...s.filter((x) => x !== next - 1), next])]);
    requestAnimationFrame(() =>
      sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const reset = () => {
    setStep(0);
    setMaxReached(0);
    setOpenSteps([0]);
    setDatasetId(null);
    setHumanText("");
    setGenerated(false);
    setLiveStory(null);
    runIdRef.current = null;
    requestAnimationFrame(() =>
      sectionRefs.current[0]?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const canContinue = (i: number) =>
    (i === 0 && !!datasetId) ||
    (i === 1 && humanText.trim().length > 0) ||
    (i === 2 && generated);

  /** The one-line recap a folded step shows, so the rail stays readable. */
  const summary = (i: number): string | null => {
    if (i > maxReached) return null;
    if (i === 0) return dataset ? dataset.name : "No dataset chosen";
    if (i === 1) {
      const words = humanText.trim() ? humanText.trim().split(/\s+/).length : 0;
      return words ? `${words} words` : "Not written yet";
    }
    if (i === 2) return generated ? "Pipeline complete: 3 stages" : "Not run yet";
    if (i === 3 && story) {
      const moved = story.aiModerated.alarmismRating - story.aiRaw.alarmismRating;
      return `Tone pulled ${moved > 0 ? "up" : "down"} ${Math.abs(moved).toFixed(1)}`;
    }
    return null;
  };

  const stateOf = (i: number): StepState =>
    i < step ? "done" : i === step ? "active" : "pending";

  return (
    <div>
      {backendChecked && (
        <p
          data-testid="backend-status"
          data-live={isLive ? "true" : "false"}
          className="mb-8 font-mono text-[0.7rem] uppercase tracking-wider text-faint"
        >
          {isLive ? `Live backend - tier ${tier}` : "Mock data - backend unavailable"}
        </p>
      )}

      <ol className="space-y-0">
        {stepMeta.map((meta, i) => {
          const state = stateOf(i);
          const reached = i <= maxReached;
          const open = reached && isOpen(i);
          const recap = summary(i);

          return (
            <li
              key={meta.title}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              className="grid grid-cols-[2.25rem_1fr] gap-x-4 scroll-mt-24 sm:gap-x-5"
            >
              {/* Rail column */}
              <div className="flex flex-col items-center">
                <StepNode index={i} state={state} />
                {i < LAST && <StepRail filled={i < step} />}
              </div>

              {/* Content column */}
              <div className={cn("min-w-0", i < LAST && "pb-10")}>
                <button
                  onClick={() => reached && toggle(i)}
                  disabled={!reached}
                  aria-expanded={open}
                  className={cn(
                    "group flex w-full items-start justify-between gap-4 text-left",
                    reached ? "cursor-pointer" : "cursor-not-allowed",
                  )}
                >
                  <div className="min-w-0">
                    <h2
                      className={cn(
                        "text-xl leading-tight sm:text-2xl",
                        state === "pending" ? "text-faint" : "text-navy",
                      )}
                    >
                      {meta.title}
                    </h2>
                    {open ? (
                      <p className="mt-1.5 max-w-2xl text-sm text-muted">{meta.desc}</p>
                    ) : (
                      recap && (
                        <p className="mt-1 font-mono text-[0.72rem] text-deep-teal">{recap}</p>
                      )
                    )}
                  </div>

                  {reached && (
                    <ChevronDown
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-faint transition-transform group-hover:text-navy",
                        open && "rotate-180",
                      )}
                    />
                  )}
                </button>

                {/* Kept mounted while folded: collapsing a finished run must not
                    discard it, and re-opening must not replay the animation. */}
                {reached && (
                  <div className={cn("mt-6", !open && "hidden")}>
                    {i === 0 && (
                      <DatasetPicker datasets={datasets} selectedId={datasetId} onSelect={selectDataset} />
                    )}
                    {i === 1 && dataset && (
                      <HumanStoryEditor
                        value={humanText}
                        onChange={setHumanText}
                        sampleText={sampleText}
                        dataset={dataset}
                      />
                    )}
                    {i === 2 && story && dataset && (
                      <PipelineRunner
                        story={story}
                        dataset={dataset}
                        stages={stages}
                        models={stageModels}
                        onComplete={() => {
                          setGenerated(true);
                          setMaxReached((m) => Math.max(m, 3));
                        }}
                        onReset={() => setGenerated(false)}
                      />
                    )}
                    {i === 3 && story && dataset && (
                      <Comparison story={story} humanText={humanText} dataset={dataset} />
                    )}

                    {/* Advance from the step you are on. */}
                    {i === step && i < LAST && (
                      <div className="mt-8 border-t border-hairline pt-6">
                        <button
                          onClick={() => canContinue(i) && go(i + 1)}
                          disabled={!canContinue(i)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all",
                            canContinue(i)
                              ? "bg-navy text-white shadow-[0_10px_26px_-12px_rgba(13,27,92,0.7)] hover:-translate-y-0.5 hover:bg-deep-navy"
                              : "cursor-not-allowed bg-surface-soft text-faint",
                          )}
                        >
                          {i === 2 ? "See the comparison" : "Continue"}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {i === LAST && (
                      <div className="mt-8 border-t border-hairline pt-6">
                        <button
                          onClick={reset}
                          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-navy"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Start over
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
