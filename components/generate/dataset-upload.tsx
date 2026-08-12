"use client";

/**
 * Bring your own table.
 *
 * The card this replaces said custom uploads were future work. Half of that is
 * still true and the half that is not is the point of the control: a CSV can be
 * CHARTED now, because choosing a form needs only each column's type and a
 * table answers that about itself, while GENERATING a story still needs
 * declared measures and class breaks that no table states.
 *
 * So the success state offers exactly one thing - see the figures - and says
 * plainly that the pipeline is not available for this file. An upload button
 * that dropped the reader into a wizard which then refused them would be worse
 * than the placeholder it replaced.
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

type State =
  | { kind: "idle" }
  | { kind: "sending"; name: string }
  | { kind: "stored"; upload: UploadedDataset }
  | { kind: "rejected"; reason: string };

export function DatasetUpload() {
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
    return (
      <div className="flex flex-col rounded-2xl border border-hairline bg-surface p-5">
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

        <Link
          href={`/results?upload=${upload.id}`}
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy/90"
        >
          See suggested figures
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        {/* The backend's own wording. It draws the line between charting this
            file and generating from it, and that line is the whole reason the
            button above goes to the figures and not into the wizard. */}
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
          A CSV with at least one number in it. We read each column&rsquo;s type from the
          data and suggest the figures it can honestly carry.
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
