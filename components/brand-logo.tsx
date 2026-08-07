import { cn } from "@/lib/utils";

/**
 * Inline brand mark — a speech bubble holding a bar chart and a rising arrow,
 * redrawn in the exact brand palette so it stays crisp at any size and matches
 * the project logo in source-materials/.
 */
export function BrandMark({
  className,
  variant = "color",
}: {
  className?: string;
  variant?: "color" | "mono-light";
}) {
  const bubble = variant === "mono-light" ? "#ffffff" : "#0D1B5C";
  const bar1 = variant === "mono-light" ? "#ffffff" : "url(#bm-blue)";
  const bar2 = variant === "mono-light" ? "#ffffff" : "url(#bm-blue)";
  const bar3 = variant === "mono-light" ? "#ffffff" : "url(#bm-teal)";
  const arrow = variant === "mono-light" ? "#ffffff" : "url(#bm-teal)";

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      fill="none"
      role="img"
      aria-label="AI-Powered Data Storytelling logo"
    >
      <defs>
        <linearGradient id="bm-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2B78C6" />
          <stop offset="100%" stopColor="#1B5FB6" />
        </linearGradient>
        <linearGradient id="bm-teal" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0E8F86" />
          <stop offset="100%" stopColor="#23D2B1" />
        </linearGradient>
      </defs>
      {/* speech bubble */}
      <path
        d="M14 8h36a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H30l-12 9v-9h-4a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6Z"
        stroke={bubble}
        strokeWidth="3.2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* bars */}
      <rect x="19" y="30" width="6" height="11" rx="1.5" fill={bar1} />
      <rect x="29" y="24" width="6" height="17" rx="1.5" fill={bar2} />
      <rect x="39" y="19" width="6" height="22" rx="1.5" fill={bar3} />
      {/* rising arrow */}
      <path
        d="M18 35l9-7 7 5 12-12"
        stroke={arrow}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M41 21h6v6" stroke={arrow} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandLogo({
  className,
  variant = "color",
  showText = true,
}: {
  className?: string;
  variant?: "color" | "mono-light";
  showText?: boolean;
}) {
  const textColor = variant === "mono-light" ? "text-white" : "text-navy";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark variant={variant} className="h-9 w-9 shrink-0" />
      {showText && (
        <span className={cn("flex flex-col leading-none", textColor)}>
          <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] opacity-70">
            AI-Powered
          </span>
          <span className="font-serif text-[1.05rem] font-semibold tracking-tight">
            Data Storytelling
          </span>
        </span>
      )}
    </span>
  );
}
