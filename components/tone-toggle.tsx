"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Scale } from "lucide-react";
import type { TonePhrase } from "@/lib/data/stories";
import { cn } from "@/lib/utils";

type Tone = "alarmist" | "calibrated";

/**
 * The signature interaction: the same data sentence morphs between an alarmist
 * and a calibrated framing. Accent words carry the tone colour (warm red ↔ teal).
 */
export function ToneToggle({
  alarmist,
  calibrated,
  className,
}: {
  alarmist: TonePhrase[];
  calibrated: TonePhrase[];
  className?: string;
}) {
  const [tone, setTone] = useState<Tone>("alarmist");
  const uid = useId();
  const phrases = tone === "alarmist" ? alarmist : calibrated;
  const accent = tone === "alarmist" ? "text-alarm" : "text-calm";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-4">
        <span className="kicker text-faint">Same data · same numbers</span>
        <Switch tone={tone} onChange={setTone} uid={uid} />
      </div>

      <div className="relative mt-6 min-h-[7.5rem] sm:min-h-[6rem]">
        <AnimatePresence mode="wait">
          <motion.p
            key={tone}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-2xl leading-snug text-ink sm:text-3xl"
          >
            {phrases.map((p, i) => (
              <span key={i} className={cn(p.accent && cn(accent, "font-semibold italic"))}>
                {p.text}
              </span>
            ))}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-muted">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full transition-colors",
            tone === "alarmist" ? "bg-alarm" : "bg-calm",
          )}
        />
        {tone === "alarmist"
          ? "Manipulative urgency — technically defensible, emotionally loaded."
          : "Measured framing — the urgency stays, the manipulation goes."}
      </div>
    </div>
  );
}

function Switch({ tone, onChange, uid }: { tone: Tone; onChange: (t: Tone) => void; uid: string }) {
  const options: { id: Tone; label: string; icon: typeof Flame }[] = [
    { id: "alarmist", label: "Alarmist", icon: Flame },
    { id: "calibrated", label: "Calibrated", icon: Scale },
  ];
  return (
    <div className="relative inline-flex rounded-full border border-hairline bg-surface p-1">
      {options.map((opt) => {
        const active = tone === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative z-10 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4",
              active ? "text-white" : "text-muted hover:text-ink",
            )}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId={`tone-switch-${uid}`}
                className={cn(
                  "absolute inset-0 rounded-full",
                  opt.id === "alarmist" ? "bg-alarm" : "bg-calm",
                )}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
