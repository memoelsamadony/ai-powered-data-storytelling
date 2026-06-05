import { cn } from "@/lib/utils";

type Tone = "neutral" | "alarm" | "calm" | "brand" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-soft text-muted border-hairline",
  alarm: "bg-alarm-soft text-alarm-ink border-alarm/30",
  calm: "bg-calm-soft text-calm-ink border-calm/30",
  brand: "bg-brand-blue/10 text-brand-blue border-brand-blue/25",
  dark: "bg-white/10 text-white/90 border-white/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium font-mono tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
