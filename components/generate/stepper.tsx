"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const generateSteps = ["Dataset", "Human story", "Generate", "Compare"] as const;

export function Stepper({
  current,
  maxReached,
  onSelect,
}: {
  current: number;
  maxReached: number;
  onSelect: (i: number) => void;
}) {
  return (
    <ol className="flex w-full items-center gap-1 sm:gap-2">
      {generateSteps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= maxReached;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <button
              disabled={!reachable}
              onClick={() => reachable && onSelect(i)}
              className={cn(
                "group flex items-center gap-2.5 rounded-full py-1 pr-2 text-left transition-colors",
                reachable ? "cursor-pointer" : "cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-sm font-semibold transition-all",
                  done && "border-teal bg-teal text-white",
                  active && "border-navy bg-navy text-white",
                  !done && !active && "border-hairline bg-surface text-faint",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  active ? "text-navy" : done ? "text-deep-teal" : "text-faint",
                )}
              >
                {label}
              </span>
            </button>
            {i < generateSteps.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 rounded-full transition-colors",
                  i < current ? "bg-teal" : "bg-hairline",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
