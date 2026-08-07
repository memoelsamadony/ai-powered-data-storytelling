import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-hairline bg-surface",
        hover &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-[0_24px_60px_-30px_rgba(13,27,92,0.45)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
