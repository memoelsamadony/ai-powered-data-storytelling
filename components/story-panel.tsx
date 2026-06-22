import { User, Sparkles, ShieldCheck } from "lucide-react";
import type { ToneVariant } from "@/lib/data/stories";
import { AlarmismMeter } from "@/components/alarmism-meter";
import { cn } from "@/lib/utils";

const accents = {
  human: { ring: "border-navy/15", chip: "bg-surface-soft text-navy", icon: User, bar: "bg-navy" },
  "ai-raw": { ring: "border-alarm/25", chip: "bg-alarm-soft text-alarm-ink", icon: Sparkles, bar: "bg-alarm" },
  "ai-moderated": { ring: "border-calm/30", chip: "bg-calm-soft text-calm-ink", icon: ShieldCheck, bar: "bg-calm" },
} as const;

export function StoryPanel({
  variant,
  showMeter = true,
  className,
  compact = false,
}: {
  variant: ToneVariant;
  showMeter?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const a = accents[variant.id];
  const Icon = a.icon;
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border bg-surface",
        a.ring,
        className,
      )}
    >
      <div className={cn("h-1 w-full", a.bar)} />
      <div className={cn("flex flex-col gap-4", compact ? "p-5" : "p-6")}>
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[0.68rem] font-medium uppercase tracking-wide",
              a.chip,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {variant.label}
          </span>
          <span className="font-mono text-[0.68rem] text-faint">{variant.author}</span>
        </div>

        <h3 className={cn("font-serif leading-tight text-navy", compact ? "text-xl" : "text-2xl")}>
          {variant.title}
        </h3>

        <div className={cn("scroll-slim space-y-3 overflow-y-auto pr-1", compact ? "max-h-56" : "")}>
          {variant.paragraphs.map((p, i) => (
            <p key={i} className="font-serif text-[0.975rem] leading-relaxed text-ink/85">
              {p}
            </p>
          ))}
        </div>

        {showMeter && (
          <div className="mt-auto border-t border-hairline pt-4">
            <AlarmismMeter value={variant.alarmismRating} size="sm" />
          </div>
        )}
      </div>
    </article>
  );
}
