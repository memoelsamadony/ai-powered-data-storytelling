"use client";

/**
 * G6 — the annotated tone redline (FRONTEND_PLAN.md §4).
 *
 * Replaces the detached bullet list of emotive spans. A list makes the reader
 * re-find every phrase in the prose; marking them in place does not. This is
 * the "Red Pen" idea from the Quintd dashboard applied to tone.
 *
 * It renders the RAW story, because that is where the spans actually live: 16
 * of 16 `span.text` values occur verbatim (case-insensitively) in the raw
 * paragraphs, against 3 of 16 `span.replacement` values in the moderated ones.
 * Matching on the raw side is therefore reliable; matching on the moderated
 * side is not, and a redline that silently highlights nothing is worse than a
 * list.
 *
 * Two modes: `highlight` marks what the moderator caught, `rewrite` shows the
 * track-changes view (original struck through, replacement inserted).
 *
 * Colour: the validated alarm ↔ calm pair (removed ↔ replacement).
 */

import { useState } from "react";
import { Highlighter, Replace } from "lucide-react";
import type { EmotiveSpan, ToneVariant } from "@/lib/data/stories";
import { cn } from "@/lib/utils";

export interface Segment {
  text: string;
  span?: EmotiveSpan;
}

/**
 * Split a paragraph around the spans it contains. Longest span first, so a
 * short span nested inside a longer one cannot claim the match; overlapping
 * matches are dropped rather than allowed to interleave.
 */
export function segmentParagraph(paragraph: string, spans: EmotiveSpan[]): Segment[] {
  const haystack = paragraph.toLowerCase();
  const matches: { start: number; end: number; span: EmotiveSpan }[] = [];

  for (const span of [...spans].sort((a, b) => b.text.length - a.text.length)) {
    const start = haystack.indexOf(span.text.toLowerCase());
    if (start === -1) continue;
    const end = start + span.text.length;
    if (matches.some((m) => start < m.end && end > m.start)) continue;
    matches.push({ start, end, span });
  }

  matches.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) out.push({ text: paragraph.slice(cursor, m.start) });
    out.push({ text: paragraph.slice(m.start, m.end), span: m.span });
    cursor = m.end;
  }
  if (cursor < paragraph.length) out.push({ text: paragraph.slice(cursor) });
  return out;
}

type Mode = "highlight" | "rewrite";

export function Redline({
  variant,
  spans,
  className,
}: {
  variant: ToneVariant;
  spans: EmotiveSpan[];
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>("highlight");

  const segmented = variant.paragraphs.map((p) => segmentParagraph(p, spans));
  const located = new Set(segmented.flat().filter((s) => s.span).map((s) => s.span!.text));
  const unlocated = spans.filter((s) => !located.has(s.text));

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">
          {located.size} of {spans.length} edits marked in place
        </p>
        <div className="flex items-center gap-1" role="group" aria-label="Redline view">
          <ModeButton active={mode === "highlight"} onClick={() => setMode("highlight")} icon={Highlighter}>
            Highlight
          </ModeButton>
          <ModeButton active={mode === "rewrite"} onClick={() => setMode("rewrite")} icon={Replace}>
            Show rewrites
          </ModeButton>
        </div>
      </div>

      <div className="space-y-3">
        {segmented.map((segments, i) => (
          <p key={i} className="font-serif text-[0.975rem] leading-loose text-ink/85">
            {segments.map((s, j) =>
              s.span ? <Mark key={j} segment={s} span={s.span} mode={mode} /> : <span key={j}>{s.text}</span>,
            )}
          </p>
        ))}
      </div>

      {unlocated.length > 0 && (
        <div className="mt-4 rounded-lg border border-hairline bg-surface-soft/40 px-3 py-2">
          <p className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">
            Not locatable in this text
          </p>
          <ul className="mt-1 space-y-0.5">
            {unlocated.map((s) => (
              <li key={s.text} className="text-xs text-muted">
                <span className="line-through">{s.text}</span> → {s.replacement}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Mark({ segment, span, mode }: { segment: Segment; span: EmotiveSpan; mode: Mode }) {
  return (
    <span className="group relative inline">
      {mode === "highlight" ? (
        <span
          tabIndex={0}
          className="cursor-help rounded-[3px] bg-alarm-soft px-0.5 decoration-alarm/50 decoration-dotted underline-offset-4 [text-decoration-line:underline] focus:outline-none focus-visible:ring-2 focus-visible:ring-alarm/40"
        >
          {segment.text}
        </span>
      ) : (
        <span tabIndex={0} className="cursor-help focus:outline-none">
          <del className="text-alarm-ink/70 decoration-alarm/40">{segment.text}</del>{" "}
          <ins className="rounded-[3px] bg-calm-soft px-0.5 text-calm-ink no-underline">{span.replacement}</ins>
        </span>
      )}

      {/* Reason on hover/focus. */}
      <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-64 rounded-xl border border-hairline bg-surface/95 px-3 py-2.5 text-left shadow-lg backdrop-blur group-hover:block group-focus-within:block">
        <span className="block font-mono text-[0.6rem] uppercase tracking-wider text-deep-teal">
          {span.category}
        </span>
        <span className="mt-1 block font-sans text-xs leading-snug text-ink">
          <span className="text-alarm-ink line-through">{span.text}</span>
          <span className="mx-1.5 text-faint">→</span>
          {span.replacement}
        </span>
        <span className="mt-1.5 block font-sans text-[0.7rem] leading-snug text-muted">{span.reason}</span>
      </span>
    </span>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Highlighter;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-navy/20 bg-navy text-white"
          : "border-hairline bg-surface text-muted hover:border-brand-blue/40 hover:text-navy",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
