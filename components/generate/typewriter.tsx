"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveals a multi-paragraph string as if it were streaming from a model. Total
 * runtime is bounded (~duration ms) regardless of text length, then calls onDone.
 */
export function Typewriter({
  text,
  duration = 2200,
  className,
  paragraphClassName,
  onDone,
  running,
}: {
  text: string;
  duration?: number;
  className?: string;
  paragraphClassName?: string;
  onDone?: () => void;
  running: boolean;
}) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    setCount(0);
    doneRef.current = false;
    const tick = 16;
    const perTick = Math.max(1, Math.ceil(text.length / (duration / tick)));
    const id = setInterval(() => {
      setCount((c) => {
        const next = c + perTick;
        if (next >= text.length) {
          clearInterval(id);
          if (!doneRef.current) {
            doneRef.current = true;
            onDone?.();
          }
          return text.length;
        }
        return next;
      });
    }, tick);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, text, duration]);

  const shown = running || count > 0 ? text.slice(0, count) : "";
  const paragraphs = shown.split("\n\n");
  const isStreaming = running && count < text.length;

  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className={cn(
            "font-serif leading-relaxed text-ink/85",
            isStreaming && i === paragraphs.length - 1 && "caret",
            paragraphClassName,
          )}
        >
          {p}
        </p>
      ))}
    </div>
  );
}
