"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { datasets } from "@/lib/data/datasets";
import { getStorySet } from "@/lib/data/stories";
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

  const story = useMemo(() => (datasetId ? getStorySet(datasetId) : null), [datasetId]);
  const sampleText = story ? story.human.paragraphs.join("\n\n") : "";

  const selectDataset = (id: string) => {
    setDatasetId(id);
    setHumanText(getStorySet(id).human.paragraphs.join("\n\n"));
    setGenerated(false);
  };

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
