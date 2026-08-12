/**
 * The figures a backend selector chose, rendered together.
 *
 * The chart contract stops at one figure: `<Chart>` takes one `ChartPayload`
 * and is deliberately incurious about where it came from. Nothing in the repo
 * rendered a SET of them - `/chart-preview` builds its own local array as a
 * development reference - so this is the missing piece between an endpoint that
 * returns three and a page that shows three.
 *
 * It stays a thin wrapper on purpose. Every figure is still one `<Chart>` with
 * one payload, so anything true of a single figure (validation refusals,
 * warnings, the table twin, the "Why this form:" line) is true here for free,
 * and a fourth figure costs nothing.
 *
 * What it adds is the part a single figure cannot carry: the provenance of the
 * SELECTION. How many figures were drawable, how each column got its type, and
 * what was done to the table's shape before charting. For an uploaded CSV those
 * types are inferred rather than declared, and an inference the reader cannot
 * see is one they cannot correct.
 */

import { Chart } from "@/components/charts/chart";
import type { ChartSuggestion } from "@/lib/api";

export function SuggestedCharts({
  suggestion,
  height = 320,
}: {
  suggestion: ChartSuggestion | null;
  height?: number;
}) {
  if (!suggestion) {
    return (
      <p className="rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-muted">
        The chart selector is unavailable, so no figures were chosen. This says
        nothing about the data - it means the model that picks the figures could
        not be reached.
      </p>
    );
  }

  if (!suggestion.charts.length) {
    return (
      <p className="rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-muted">
        No figure could be drawn from this table honestly. That usually means it
        has no measure, or no dimension to put one against.
      </p>
    );
  }

  const inferred = suggestion.columns.filter((c) => c.basis === "inferred");

  return (
    <div className="space-y-10">
      {suggestion.charts.map((payload, i) => (
        <Chart key={`${payload.spec.form}-${i}`} payload={payload} height={height} />
      ))}

      <footer className="space-y-3 border-t border-hairline pt-5 text-xs leading-relaxed text-faint">
        <p>
          {suggestion.charts.length} of {suggestion.candidatesConsidered} drawable
          figures, chosen by <code className="font-mono">{suggestion.model}</code>.
          Which forms were available was decided from the column types, not by the
          model; it ranked what it was given and wrote the reasoning under each
          figure.
        </p>

        {suggestion.notes.length > 0 && (
          <div>
            <p className="font-medium text-muted">Before charting:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {suggestion.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {inferred.length > 0 && (
          <div>
            <p className="font-medium text-muted">
              Column types read from the data rather than declared:
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {inferred.map((c) => (
                <li key={c.key}>
                  <code className="font-mono">{c.key}</code> treated as {c.type} -{" "}
                  {c.evidence}.
                </li>
              ))}
            </ul>
          </div>
        )}
      </footer>
    </div>
  );
}
