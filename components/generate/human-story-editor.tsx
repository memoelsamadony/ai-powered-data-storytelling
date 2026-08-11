"use client";

import { useState } from "react";
import { FileText, FileUp, Eraser, User } from "lucide-react";
import type { Dataset } from "@/lib/data/datasets";
import { StoryChart } from "@/components/charts/story-chart";
import { cn } from "@/lib/utils";

/**
 * Phase 1 closes a confound as well as a layout gap (FRONTEND_PLAN.md §1.2):
 * the human author previously wrote the baseline with no chart and no table on
 * screen, while the generator received the full prompt table. The two arms of
 * the comparison did not have equal access to the data, which weakened the
 * comparison before a single measurement was taken. The chart and the rows now
 * sit beside the editor.
 */
export function HumanStoryEditor({
  value,
  onChange,
  sampleText,
  dataset,
}: {
  value: string;
  onChange: (v: string) => void;
  sampleText: string;
  dataset: Dataset;
}) {
  const [importedName, setImportedName] = useState<string | null>(null);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  const importSample = (ext: string) => {
    onChange(sampleText);
    setImportedName(`human-baseline.${ext}`);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
    <div className="min-w-0 rounded-2xl border border-hairline bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
        <span className="inline-flex items-center gap-2 font-mono text-[0.7rem] font-medium uppercase tracking-wide text-navy">
          <User className="h-3.5 w-3.5" /> Human baseline
        </span>
        <div className="flex items-center gap-1.5">
          <ToolButton onClick={() => importSample("docx")} icon={FileUp}>
            Import .docx
          </ToolButton>
          <ToolButton onClick={() => importSample("txt")} icon={FileText}>
            Import .txt
          </ToolButton>
          <ToolButton
            onClick={() => {
              onChange("");
              setImportedName(null);
            }}
            icon={Eraser}
          >
            Clear
          </ToolButton>
        </div>
      </div>

      {importedName && (
        <div className="flex items-center gap-2 border-b border-hairline bg-calm-soft/50 px-5 py-2 text-xs text-calm-ink">
          <FileText className="h-3.5 w-3.5" />
          Imported <span className="font-mono font-medium">{importedName}</span>, a sample human story you can edit.
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write the human-authored story for this dataset, or import a .docx / .txt file to start from a sample…"
        className="scroll-slim min-h-[16rem] w-full resize-y bg-transparent px-5 py-5 font-serif text-[1.02rem] leading-relaxed text-ink outline-none placeholder:text-faint"
      />

      <div className="flex items-center justify-between border-t border-hairline px-5 py-3 font-mono text-[0.7rem] text-faint">
        <span>{words} words</span>
        <span>This baseline is what the LLM-moderated story is judged against.</span>
      </div>
    </div>

      <aside className="lg:sticky lg:top-24">
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <p className="mb-3 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
            The same data the model gets
          </p>
          <StoryChart dataset={dataset} height={250} compact />
        </div>
      </aside>
    </div>
  );
}

function ToolButton({
  children,
  icon: Icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: typeof FileText;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand-blue/40 hover:text-navy",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
