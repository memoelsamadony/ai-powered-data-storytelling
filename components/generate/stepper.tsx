"use client";

/**
 * The studio's vertical step rail.
 *
 * Replaces the horizontal stepper, which showed one step at a time and threw
 * the previous one away. A pipeline is a sequence, and the point of this page
 * is that four things happen to the same numbers in order — so the whole flow
 * stays on screen, past steps included, and the rail is the navigation.
 *
 * Completed steps collapse to a one-line summary rather than unmounting: their
 * content stays in the DOM so a finished pipeline run is not re-run when you
 * fold it away and open it again.
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const generateSteps = ["Dataset", "Human story", "Generate", "Compare"] as const;

export type StepState = "done" | "active" | "pending";

export function StepNode({ index, state }: { index: number; state: StepState }) {
  return (
    <span
      className={cn(
        "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border font-mono text-sm font-semibold transition-all",
        state === "done" && "border-teal bg-teal text-white",
        state === "active" && "border-navy bg-navy text-white ring-4 ring-navy/10",
        state === "pending" && "border-hairline bg-surface text-faint",
      )}
    >
      {state === "done" ? <Check className="h-4 w-4" /> : index + 1}
    </span>
  );
}

/** The connector between one node and the next. */
export function StepRail({ filled }: { filled: boolean }) {
  return (
    <span
      className={cn(
        "mt-1 w-px flex-1 rounded-full transition-colors",
        filled ? "bg-teal/50" : "bg-hairline",
      )}
      aria-hidden
    />
  );
}
