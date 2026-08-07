import { Container } from "@/components/ui/layout";
import { Kicker } from "@/components/ui/layout";

export function PageHero({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-hairline bg-surface">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(100%_80%_at_50%_0%,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-3xl" />
      <Container className="relative py-16 sm:py-20">
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-5 max-w-3xl text-balance text-4xl leading-[1.05] text-navy sm:text-5xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted">{intro}</p>
        )}
        {children}
      </Container>
    </section>
  );
}
