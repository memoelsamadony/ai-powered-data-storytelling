"use client";

/**
 * Bring your own table.
 *
 * A CSV can now be CHARTED and NARRATED. Charting needs only each column's
 * type, which a table answers about itself. Narrating needs to know which
 * column is the measure, which is the comparison and which row is the total -
 * and `upload_spec.infer` now decides that from the types rather than waiting
 * for a human to declare it.
 *
 * That decision is a guess, so the card prints it: one sentence naming what was
 * read as what, above the two things it enables. A guess a reader can check
 * before pressing Generate is a different object from a guess buried in a
 * prompt. When the file cannot carry a story at all - no time column, no second
 * measure the total row reports - `wired` is false and only the figures are
 * offered, with the backend's reason for it.
 *
 * Rejections are shown in the backend's own words. It already explains why a
 * file is not usable ("Only .csv files are accepted", "No numeric column found.
 * A data story needs at least one measure to talk about"), and rewriting those
 * into a generic failure would throw away the only part the reader can act on.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Loader2, Upload } from "lucide-react";
import { uploadDataset, UploadRejected, type UploadedDataset } from "@/lib/api";
import { cn } from "@/lib/utils";

type State =
  | { kind: "idle" }
  | { kind: "sending"; name: string }
  | { kind: "stored"; upload: UploadedDataset }
  | { kind: "rejected"; reason: string };

export function DatasetUpload({
  onSelect,
  selectedId,
}: {
  /** Choose this upload as the table the wizard runs on. */
  onSelect: (record: UploadedDataset) => void;
  selectedId: string | null;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const input = useRef<HTMLInputElement>(null);

  async function send(file: File) {
    setState({ kind: "sending", name: file.name });
    try {
      setState({ kind: "stored", upload: await uploadDataset(file) });
    } catch (err) {
      setState({
        kind: "rejected",
        reason:
          err instanceof UploadRejected
            ? err.message
            : "The backend could not be reached, so nothing was uploaded.",
      });
    } finally {
      // Let the same file be chosen again after a rejection; without this the
      // input holds the old value and re-picking it fires no change event.
      if (input.current) input.current.value = "";
    }
  }

  if (state.kind === "stored") {
    const { upload } = state;
    const active = upload.id === selectedId;
    return (
      <div
        className={cn(
          "flex flex-col rounded-2xl border bg-surface p-5",
          active ? "border-navy ring-1 ring-navy/20" : "border-hairline",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-calm-soft text-deep-teal">
            <Check className="h-4 w-4" />
          </span>
          <p className="truncate font-medium text-ink" title={upload.originalName}>
            {upload.originalName}
          </p>
        </div>

        <p className="mt-3 font-mono text-[0.68rem] text-faint">
          {upload.rows.toLocaleString()} rows · {upload.columns.length} columns
          {upload.yearRange && ` · ${upload.yearRange}`}
          {upload.countries !== null && ` · ${upload.countries} countries`}
        </p>

        {/* How the file was read, before anything is run on it. Above the
            buttons on purpose: it is the thing worth checking, and a reader who
            sees "read as population by year" when they meant deaths should find
            that out here rather than in a finished story. */}
        {upload.mapping && (
          <div className="mt-3 rounded-xl border border-hairline bg-surface-soft/50 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-muted">{upload.mapping}</p>
            {upload.mappingNotes.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {upload.mappingNotes.map((n) => (
                  <li key={n} className="text-[0.68rem] leading-relaxed text-faint">
                    · {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {upload.wired && (
            <button
              onClick={() => onSelect(upload)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy/90"
            >
              {active ? "Selected - continue below" : "Generate a story"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <Link
            href={`/results?upload=${upload.id}`}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              upload.wired
                ? "border border-hairline text-ink hover:border-brand-blue/40"
                : "bg-navy text-white hover:bg-navy/90",
            )}
          >
            See suggested figures
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* The backend's own wording, which for a file that cannot carry a
            story names the ingredient that was missing. */}
        <p className="mt-3 text-xs leading-relaxed text-faint">{upload.note}</p>

        <button
          onClick={() => setState({ kind: "idle" })}
          className="mt-3 self-start text-xs text-muted underline underline-offset-2 hover:text-ink"
        >
          Upload a different file
        </button>
      </div>
    );
  }

  const busy = state.kind === "sending";

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface-soft/40 p-5 text-center">
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void send(file);
        }}
      />

      <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-faint">
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-navy" />
        ) : (
          <Upload className="h-5 w-5" />
        )}
      </span>

      <h3 className="mt-4 font-serif text-lg text-navy">Upload your own</h3>

      {busy ? (
        <p className="mt-1.5 truncate text-xs text-muted" title={state.name}>
          Sending {state.name}…
        </p>
      ) : (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          A CSV with a time column and at least one number. We read each
          column&rsquo;s type from the data, then chart it and write a story from it.
        </p>
      )}

      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className="mt-4 rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand-blue/40 disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Choose a CSV"}
      </button>

      {state.kind === "rejected" && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-alarm/30 bg-alarm-soft/40 px-3 py-2.5 text-left text-xs leading-relaxed text-muted"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-alarm" />
          {state.reason}
        </p>
      )}
    </div>
  );
}
