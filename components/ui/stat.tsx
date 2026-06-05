import { cn } from "@/lib/utils";

export function Stat({
  value,
  label,
  sub,
  tone = "default",
  className,
}: {
  value: React.ReactNode;
  label: string;
  sub?: string;
  tone?: "default" | "light";
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "font-serif text-4xl font-semibold tracking-tight sm:text-5xl",
          tone === "light" ? "text-white" : "text-navy",
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-2 text-sm font-medium",
          tone === "light" ? "text-white/80" : "text-ink",
        )}
      >
        {label}
      </div>
      {sub && (
        <div className={cn("mt-1 text-xs leading-relaxed", tone === "light" ? "text-white/45" : "text-muted")}>
          {sub}
        </div>
      )}
    </div>
  );
}
