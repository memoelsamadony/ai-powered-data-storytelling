"use client";

import { ArrowDownRight, ShieldCheck, Scissors } from "lucide-react";
import type { StorySet, ToneVariant } from "@/lib/data/stories";
import { StoryPanel } from "@/components/story-panel";
import { AlarmismMeter } from "@/components/alarmism-meter";
import { SimpleBarChart } from "@/components/charts/metric-charts";

export function Comparison({ story, humanText }: { story: StorySet; humanText: string }) {
  const human: ToneVariant = {
    ...story.human,
    paragraphs: humanText.trim()
      ? humanText.trim().split(/\n{2,}/).map((p) => p.trim())
      : story.human.paragraphs,
  };

  const delta = +(story.aiRaw.alarmismRating - story.aiModerated.alarmismRating).toFixed(1);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <StoryPanel variant={human} />
        <StoryPanel variant={story.aiRaw} />
        <StoryPanel variant={story.aiModerated} />
      </div>

      {/* Metrics */}
      <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
        <span className="kicker text-deep-teal">Evaluation</span>
        <h3 className="mt-2 font-serif text-2xl text-navy">How the stories compare</h3>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {/* Tone calibration */}
          <div className="rounded-xl border border-hairline bg-surface-soft/40 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-navy">Tone calibration</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-calm-soft px-2.5 py-1 font-mono text-[0.66rem] font-semibold text-calm-ink">
                <ArrowDownRight className="h-3 w-3" />
                −{delta}
              </span>
            </div>
            <p className="mt-1 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
              Alarmism · 1–5 LLM judge
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-1 text-xs text-muted">LLM — raw</p>
                <AlarmismMeter value={story.aiRaw.alarmismRating} size="sm" />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted">Tone-moderated</p>
                <AlarmismMeter value={story.aiModerated.alarmismRating} size="sm" />
              </div>
            </div>
          </div>

          {/* Editing footprint */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-soft/40 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-alarm-soft text-alarm-ink">
                <Scissors className="h-5 w-5" />
              </span>
              <div>
                <p className="font-serif text-3xl font-semibold text-navy">{story.emotiveSpans.length}</p>
                <p className="text-xs text-muted">emotive spans rebalanced by the moderator</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-calm/30 bg-calm-soft/40 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-calm text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-serif text-lg font-semibold text-calm-ink">Facts preserved</p>
                <p className="text-xs text-calm-ink/80">
                  Retained numbers re-verified after moderation
                </p>
              </div>
            </div>
          </div>

          {/* Text similarity */}
          <div className="rounded-xl border border-hairline bg-surface-soft/40 p-5">
            <p className="text-sm font-medium text-navy">Text similarity</p>
            <p className="mt-1 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
              Moderated vs human · illustrative
            </p>
            <div className="mt-2">
              <SimpleBarChart
                data={[
                  { label: "BLEU", value: 0.31 },
                  { label: "ROUGE-L", value: 0.48 },
                  { label: "METEOR", value: 0.41 },
                ]}
                color="#1e66b8"
                domainMax={1}
                decimals={2}
                height={170}
              />
            </div>
          </div>
        </div>

        <p className="mt-6 text-pretty text-sm leading-relaxed text-muted">
          Surface-overlap scores reward wording overlap, not faithfulness or tone — which is exactly
          why the project pairs them with a tone-calibration metric and a planned user study on trust,
          engagement, and human-vs-LLM preference.
        </p>
      </div>
    </div>
  );
}
