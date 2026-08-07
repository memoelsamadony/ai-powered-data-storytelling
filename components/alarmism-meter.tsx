import { cn } from "@/lib/utils";

/** A 1–5 alarmism gauge: calm (teal) on the left, alarmist (red) on the right. */
export function AlarmismMeter({
  value,
  max = 5,
  size = "md",
  className,
}: {
  value: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-wider text-faint">
        <span>Calibrated</span>
        <span>Alarmist</span>
      </div>
      <div
        className={cn(
          "relative w-full rounded-full",
          size === "sm" ? "h-1.5" : "h-2",
        )}
        style={{
          background: "linear-gradient(90deg, #0e8f86 0%, #e8a33d 55%, #e0392b 100%)",
        }}
      >
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-navy shadow-md transition-all duration-700"
          style={{ left: `${pct}%`, width: size === "sm" ? 12 : 16, height: size === "sm" ? 12 : 16 }}
        />
      </div>
      <div className="mt-1.5 text-right">
        <span className="font-mono text-sm font-semibold text-navy">{value.toFixed(1)}</span>
        <span className="font-mono text-xs text-faint">/{max}</span>
      </div>
    </div>
  );
}
