"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { datasets as mockDatasets, type Dataset } from "@/lib/data/datasets";
import { getStorySet, type StorySet } from "@/lib/data/stories";
import * as api from "@/lib/api";
import { Stepper } from "@/components/generate/stepper";
import { DatasetPicker } from "@/components/generate/dataset-picker";
import { HumanStoryEditor } from "@/components/generate/human-story-editor";
import { PipelineRunner } from "@/components/generate/pipeline-runner";
import { Comparison } from "@/components/generate/comparison";
import { cn } from "@/lib/utils";

const stepMeta = [
  { title: "Choose a dataset", desc: "Pick the data your story is built from. Each one fails in a different tonal direction." },
  { title: "The human baseline", desc: "Write or import the human-authored story — the yardstick the LLM is measured against." },
  { title: "Run the agentic pipeline", desc: "Generate → moderate tone → factual check, all on the same numbers." },
  { title: "Compare & evaluate", desc: "Human, raw, and moderated stories side by side, with the metrics." },
];

export function GenerateExperience() {
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [humanText, setHumanText] = useState("");
  const [generated, setGenerated] = useState(false);

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
      setDatasets(ds);
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

  const go = (next: number) => {
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  };

  const canContinue =
    (step === 0 && !!datasetId) ||
    (step === 1 && humanText.trim().length > 0) ||
    (step === 2 && generated);

  return (
    <div>
      <div className="rounded-2xl border border-hairline bg-surface/70 p-4 backdrop-blur sm:p-5">
        <Stepper current={step} maxReached={maxReached} onSelect={go} />
      </div>

      {backendChecked && (
        <p
          data-testid="backend-status"
          data-live={isLive ? "true" : "false"}
          className="mt-3 font-mono text-[0.7rem] uppercase tracking-wider text-faint"
        >
          {isLive
            ? `Live backend - tier ${tier}`
            : "Mock data - backend unavailable"}
        </p>
      )}

      <div className="mt-8">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-semibold text-deep-teal">0{step + 1}</span>
          <h2 className="text-2xl text-navy sm:text-3xl">{stepMeta[step].title}</h2>
        </div>
        <p className="mt-2 max-w-2xl text-muted">{stepMeta[step].desc}</p>
      </div>

      <div className="mt-8">
        {step === 0 && (
          <DatasetPicker datasets={datasets} selectedId={datasetId} onSelect={selectDataset} />
        )}
        {step === 1 && (
          <HumanStoryEditor value={humanText} onChange={setHumanText} sampleText={sampleText} />
        )}
        {step === 2 && story && (
          <PipelineRunner
            story={story}
            stages={stages}
            models={stageModels}
            onComplete={() => {
              setGenerated(true);
              setMaxReached((m) => Math.max(m, 3));
            }}
            onReset={() => setGenerated(false)}
          />
        )}
        {step === 3 && story && <Comparison story={story} humanText={humanText} />}
      </div>

      {/* Nav */}
      <div className="mt-10 flex items-center justify-between border-t border-hairline pt-6">
        <button
          onClick={() => go(Math.max(0, step - 1))}
          disabled={step === 0}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
            step === 0 ? "cursor-not-allowed text-faint" : "text-muted hover:text-navy",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {step < 3 ? (
          <button
            onClick={() => canContinue && go(step + 1)}
            disabled={!canContinue}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all",
              canContinue
                ? "bg-navy text-white shadow-[0_10px_26px_-12px_rgba(13,27,92,0.7)] hover:-translate-y-0.5 hover:bg-deep-navy"
                : "cursor-not-allowed bg-surface-soft text-faint",
            )}
          >
            {step === 2 ? "See the comparison" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => {
              setStep(0);
              setDatasetId(null);
              setHumanText("");
              setGenerated(false);
              setMaxReached(0);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-navy"
          >
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
