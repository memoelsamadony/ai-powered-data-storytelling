"use client";

import { useState } from "react";
import { FileText, FileUp, Eraser, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function HumanStoryEditor({
  value,
  onChange,
  sampleText,
}: {
  value: string;
  onChange: (v: string) => void;
  sampleText: string;
}) {
  const [importedName, setImportedName] = useState<string | null>(null);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  const importSample = (ext: string) => {
    onChange(sampleText);
    setImportedName(`human-baseline.${ext}`);
  };

  return (
    <div className="rounded-2xl border border-hairline bg-surface">
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
          Imported <span className="font-mono font-medium">{importedName}</span> — a sample human story you can edit.
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
