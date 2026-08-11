"use client";

/**
 * G7 — the fact-check gutter (FRONTEND_PLAN.md §4).
 *
 * Status marks in the story's margin instead of a detached list below it.
 *
 * Honest limitation, worth keeping in view: the plan asks for each mark to be
 * aligned to *the claim it refers to*, and that is not yet possible. The
 * `claim` strings are quoted fragments — 0 of 6 occur verbatim in the moderated
 * paragraphs, and several quote the RAW story instead (the hallucinated
 * "2.3 million cases in 2024" never survives into the moderated text). So there
 * is nothing to anchor to by string match. Exact anchoring needs the character
 * offsets or `dataRefs` that Phase 2 adds to the backend schema; until then the
 * gutter runs alongside the story rather than pointing into it.
 *
 * Colour: the reserved status scale, never a series hue, and every mark ships
 * with an icon AND a text label — status never carries meaning by colour alone
 * (contract item 3).
 */

import { CheckCircle2, AlertTriangle, PencilLine } from "lucide-react";
import type { FactCheckItem, FactStatus } from "@/lib/data/stories";
import * as t from "@/lib/charts/tokens";

const STATUS: Record<FactStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  verified: { label: "Verified", color: t.status.verified, icon: CheckCircle2 },
  flagged: { label: "Flagged", color: t.status.flagged, icon: AlertTriangle },
  corrected: { label: "Corrected", color: t.status.corrected, icon: PencilLine },
};

export function FactCheckGutter({ items, className }: { items: FactCheckItem[]; className?: string }) {
  const counts = (Object.keys(STATUS) as FactStatus[]).map((k) => ({
    k,
    n: items.filter((i) => i.status === k).length,
  }));

  return (
    <aside className={className} aria-label="Fact check">
      <p className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">Fact check</p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {counts
          .filter((c) => c.n > 0)
          .map(({ k, n }) => {
            const s = STATUS[k];
            const Icon = s.icon;
            return (
              <span key={k} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: s.color }} />
                <span className="font-mono font-medium text-ink">{n}</span> {s.label.toLowerCase()}
              </span>
            );
          })}
      </div>

      <ul className="mt-3 space-y-2.5">
        {items.map((item) => {
          const s = STATUS[item.status];
          const Icon = s.icon;
          return (
            <li key={item.claim} className="flex gap-2.5 border-l-2 pl-3" style={{ borderColor: s.color }}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: s.color }} aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink">
                  <span className="sr-only">{s.label}: </span>
                  {item.claim}
                </p>
                <p className="mt-0.5 text-[0.7rem] leading-snug text-muted">
                  <span className="font-mono uppercase tracking-wider" style={{ color: s.color }}>
                    {s.label}
                  </span>
                  <span className="mx-1.5 text-faint">·</span>
                  {item.note}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
