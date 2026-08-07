import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-20 sm:py-28", className)}>
      {children}
    </section>
  );
}

export function Kicker({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "light";
}) {
  return (
    <span
      className={cn(
        "kicker inline-flex items-center gap-2",
        tone === "light" ? "text-teal" : "text-deep-teal",
        className,
      )}
    >
      <span
        className={cn("h-px w-6", tone === "light" ? "bg-teal/60" : "bg-deep-teal/50")}
        aria-hidden
      />
      {children}
    </span>
  );
}

export function SectionHeader({
  kicker,
  title,
  intro,
  align = "left",
  tone = "default",
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: "left" | "center";
  tone?: "default" | "light";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {kicker && <Kicker tone={tone}>{kicker}</Kicker>}
      <h2
        className={cn(
          "mt-5 text-3xl sm:text-4xl leading-[1.08] text-balance",
          tone === "light" ? "text-white" : "text-navy",
        )}
      >
        {title}
      </h2>
      {intro && (
        <p
          className={cn(
            "mt-5 text-lg leading-relaxed text-pretty",
            tone === "light" ? "text-white/70" : "text-muted",
          )}
        >
          {intro}
        </p>
      )}
    </div>
  );
}
