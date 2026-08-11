/**
 * What the moderator actually changed.
 *
 * The comparison view previously rendered `emotiveSpans.length` — a single
 * integer — which is the least informative possible use of the richest data the
 * pipeline produces. Each span carries an original, a replacement and the
 * moderator's stated reason; this shows the shape of the edits and then the
 * edits themselves.
 *
 * Nominal categories, one series → every bar takes the same hue (the moderator's
 * teal) and the heading names the series, so there is no legend box. Values are
 * direct-labelled at the tip; the reader never needs a tooltip to read one.
 */

import { EDIT_CATEGORIES, type EmotiveSpan } from "@/lib/data/stories";
import * as t from "@/lib/charts/tokens";

const BAR = t.calm;
const EMPTY = t.grid;
/** Mark spec: bars stay thin and never fill their slot. */
const BAR_H = 18;

export function EditTaxonomy({ spans, className }: { spans: EmotiveSpan[]; className?: string }) {
  const counts = EDIT_CATEGORIES.map((c) => ({
    ...c,
    n: spans.filter((s) => s.category === c.id).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.n));

  return (
    <div className={className}>
      {/* No `title` tooltips here: the families are defined in a Glossary under
          the chart, where the text cannot be clipped by the card edge. */}
      <div className="space-y-2.5">
        {counts.map((c) => (
          <div key={c.id} className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
            <span className="text-right text-xs text-muted">{c.label}</span>
            <div className="flex items-center gap-2">
              {/* Track is implicit — the bar grows from a single baseline. */}
              <div className="min-w-0 flex-1">
                <div
                  className="rounded-r-[4px] transition-all duration-700"
                  style={{
                    width: c.n === 0 ? 2 : `${(c.n / max) * 100}%`,
                    height: BAR_H,
                    background: c.n === 0 ? EMPTY : BAR,
                  }}
                />
              </div>
              <span className="w-4 shrink-0 font-mono text-xs text-ink [font-variant-numeric:tabular-nums]">
                {c.n}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-hairline pt-2 text-right">
        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-faint">
          {spans.length} edits in total
        </span>
      </div>
    </div>
  );
}

/**
 * The edits themselves, grouped by family. Grouping under headings carries the
 * category, so no second colour scale is needed for it.
 */
export function EditList({ spans, className }: { spans: EmotiveSpan[]; className?: string }) {
  const groups = EDIT_CATEGORIES.map((c) => ({
    ...c,
    items: spans.filter((s) => s.category === c.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className={className}>
      <div className="scroll-slim max-h-80 space-y-5 overflow-y-auto pr-2">
        {groups.map((g) => (
          <div key={g.id}>
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-deep-teal">
              {g.label}
              <span className="ml-2 text-faint">{g.blurb}</span>
            </p>
            <ul className="mt-2 space-y-2">
              {g.items.map((s) => (
                <li key={s.text} className="rounded-lg border border-hairline bg-surface-soft/40 px-3 py-2">
                  <p className="text-sm leading-snug">
                    <span className="text-alarm-ink line-through decoration-alarm/40">{s.text}</span>
                    <span className="mx-2 font-mono text-xs text-faint">→</span>
                    <span className="text-ink">{s.replacement}</span>
                  </p>
                  <p className="mt-1 text-[0.7rem] text-muted">{s.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
