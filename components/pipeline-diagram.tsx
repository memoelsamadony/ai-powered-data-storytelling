import { PenLine, Scale, ShieldCheck, ArrowRight } from "lucide-react";
import { pipelineStages, type StageId } from "@/lib/data/pipeline";
import { cn } from "@/lib/utils";

const stageStyles: Record<
  StageId,
  { icon: typeof PenLine; border: string; chip: string; num: string; dot: string }
> = {
  generate: {
    icon: PenLine,
    border: "hover:border-brand-blue/40",
    chip: "bg-brand-blue/10 text-brand-blue",
    num: "text-brand-blue",
    dot: "bg-brand-blue",
  },
  moderate: {
    icon: Scale,
    border: "hover:border-teal/50",
    chip: "bg-calm-soft text-calm-ink",
    num: "text-deep-teal",
    dot: "bg-teal",
  },
  factcheck: {
    icon: ShieldCheck,
    border: "hover:border-alarm/40",
    chip: "bg-alarm-soft text-alarm-ink",
    num: "text-alarm",
    dot: "bg-alarm",
  },
};

export function PipelineDiagram({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
      {pipelineStages.map((stage, i) => {
        const s = stageStyles[stage.id];
        const Icon = s.icon;
        return (
          <div key={stage.id} className="contents">
            <div
              className={cn(
                "group relative flex flex-col rounded-2xl border border-hairline bg-surface p-6 transition-all duration-300 hover:-translate-y-1",
                s.border,
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("grid h-11 w-11 place-items-center rounded-xl", s.chip)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={cn("font-mono text-3xl font-semibold opacity-30", s.num)}>
                  0{stage.index}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-xl text-navy">{stage.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.7rem] text-faint">
                <span className={cn("inline-flex items-center gap-1.5")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                  {stage.agent}
                </span>
                <span aria-hidden>·</span>
                <span>{stage.model}</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {detailed ? stage.detail : stage.summary}
              </p>
            </div>

            {i < pipelineStages.length - 1 && (
              <div className="flex items-center justify-center py-2 lg:py-0">
                <svg width="40" height="24" viewBox="0 0 40 24" className="rotate-90 text-hairline lg:rotate-0">
                  <line x1="2" y1="12" x2="30" y2="12" stroke="currentColor" strokeWidth="2" className="dash-flow" />
                </svg>
                <ArrowRight className="-ml-3 h-4 w-4 rotate-90 text-faint lg:rotate-0" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
