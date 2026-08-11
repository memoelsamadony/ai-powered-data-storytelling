import { cn } from "@/lib/utils";
import * as t from "@/lib/charts/tokens";

/**
 * G8 — the 1–5 tone meter, re-anchored (FRONTEND_PLAN.md §4).
 *
 * Serves either tone axis. Both have the same shape — 3 is calibrated, both
 * ends are failures — so one meter, one band and one calibrated range work for
 * each; only the pole labels differ, and they come from `TONE_AXES` below
 * rather than being passed in as free text, so the two ends of a scale cannot
 * be labelled inconsistently in two places.
 *
 * Two things were wrong with the original. It ran a teal→red gradient from 1 to
 * 5, which encodes "low is good" — false here, because both poles are failures
 * (1 = flat and hides the stakes, 5 = manipulative catastrophising). On the
 * over-optimism dataset that inverted the result: a falsely reassuring story
 * scored 1.4, sat in the teal zone and read as well calibrated, while moderating
 * it *upward* to 2.3 read as a regression. It also mapped `value/max`, putting
 * 1.0 at 20% instead of 0% on a scale that starts at 1.
 *
 * Now the target is the **human tone band** — a shaded region derived from the
 * human baseline rather than an arbitrary midpoint — and `before`/`after` render
 * as two ticks joined by a connector. The meter then answers the project's
 * primary question at a glance: did moderation move the story into the band the
 * human author occupies?
 */

const MIN = 1;
/** Half-width of the band drawn around the human baseline, in scale units. */
const BAND_HALF_WIDTH = 0.5;

export type ToneAxisId = "alarmism" | "optimism";

/**
 * The two axes the judge scores in one call.
 *
 * `low`/`high` name the failure at each end, never "good"/"bad": on both
 * scales the middle is the target and both poles are wrong. `under`/`over` are
 * the verdicts printed when a story sits outside the human band.
 */
export const TONE_AXES: Record<
  ToneAxisId,
  { label: string; low: string; high: string; under: string; over: string }
> = {
  alarmism: {
    label: "Alarmism",
    low: "Numbing",
    high: "Catastrophising",
    under: "flattens the stakes",
    over: "overstates",
  },
  optimism: {
    label: "Optimism",
    low: "Bleak",
    high: "Falsely reassuring",
    under: "denies the progress",
    over: "over-reassures",
  },
};

export interface ToneBand {
  from: number;
  to: number;
}

/** The band around a human baseline, clamped to the scale. */
export function humanBand(humanValue: number, max = 5): ToneBand {
  return {
    from: Math.max(MIN, humanValue - BAND_HALF_WIDTH),
    to: Math.min(max, humanValue + BAND_HALF_WIDTH),
  };
}

export function ToneMeter({
  value,
  before,
  band,
  axis = "alarmism",
  max = 5,
  size = "md",
  showScale = true,
  className,
}: {
  /** The rating to mark. With `before` set, this is the "after". */
  value: number | null;
  /** Which axis this meter is showing. Sets the pole labels and the verdict. */
  axis?: ToneAxisId;
  /** Optional earlier rating — renders as a hollow tick with a connector. */
  before?: number;
  /** The human tone band. Omit to show the track without a target. */
  band?: ToneBand;
  max?: number;
  size?: "sm" | "md";
  showScale?: boolean;
  className?: string;
}) {
  const span = max - MIN;
  const pos = (v: number) => (Math.max(MIN, Math.min(max, v)) - MIN) / span;
  const pct = (v: number) => `${pos(v) * 100}%`;

  // No judge was reachable for this story. Say that, rather than draw a marker
  // somewhere on the scale: every position on this track is a claim, and the
  // middle of it is the specific claim "calibrated", which is the one thing an
  // unmeasured story must not be shown as.
  const poles = TONE_AXES[axis];

  if (value === null) {
    return (
      <div className={className}>
        <div className="h-1.5 w-full rounded-full border border-dashed border-hairline bg-surface-soft/60" />
        <p className="mt-2 font-mono text-[0.66rem] uppercase tracking-wider text-faint">
          {poles.label} not measured
        </p>
      </div>
    );
  }

  const inBand = band ? value >= band.from && value <= band.to : undefined;
  const verdict =
    inBand === undefined
      ? null
      : inBand
        ? "in the human band"
        : value < band!.from
          ? poles.under
          : poles.over;

  const dotSize = size === "sm" ? 12 : 16;

  return (
    <div className={cn("w-full", className)}>
      {showScale && (
        <div className="mb-1.5 flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-wider text-faint">
          <span>{poles.low}</span>
          <span>{poles.high}</span>
        </div>
      )}

      <div className={cn("relative w-full rounded-full bg-surface-soft", size === "sm" ? "h-1.5" : "h-2")}>
        {band && (
          <div
            className="absolute inset-y-0 rounded-full bg-calm-soft ring-1 ring-inset ring-calm/25"
            style={{ left: pct(band.from), width: `${(pos(band.to) - pos(band.from)) * 100}%` }}
            title="Human tone band"
          />
        )}

        {/* Connector: how far moderation moved the story, and which way. */}
        {before !== undefined && (
          <div
            className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full transition-all duration-700"
            style={{
              left: pct(Math.min(before, value)),
              width: `${Math.abs(pos(value) - pos(before)) * 100}%`,
              background: t.faint,
            }}
          />
        )}

        {/* Before — hollow, so shape distinguishes it from the after tick. */}
        {before !== undefined && (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface transition-all duration-700"
            style={{
              left: pct(before),
              width: dotSize - 2,
              height: dotSize - 2,
              border: `2.5px solid ${t.alarm}`,
            }}
          />
        )}

        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-all duration-700"
          style={{
            left: pct(value),
            width: dotSize,
            height: dotSize,
            background: before !== undefined ? t.calm : t.navy,
          }}
        />
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">{verdict}</span>
        <span>
          {before !== undefined && (
            <span className="font-mono text-xs text-faint">{before.toFixed(1)} → </span>
          )}
          <span className="font-mono text-sm font-semibold text-navy">{value.toFixed(1)}</span>
          <span className="font-mono text-xs text-faint">/{max}</span>
        </span>
      </div>
    </div>
  );
}

/** The band around a human baseline on each axis, where one was measured. */
export function humanBands(human: { alarmismRating: number | null; optimismRating: number | null }) {
  return {
    alarmism: human.alarmismRating === null ? undefined : humanBand(human.alarmismRating),
    optimism: human.optimismRating === null ? undefined : humanBand(human.optimismRating),
  };
}

/**
 * Both axes, stacked, because a story is only calibrated if it is calibrated on
 * both. The raw measles story reads 5.0 alarmism and 1.0 optimism; the raw WHO
 * story reads 1.2 and 5.0. Either one alone looks fine on the axis it is not
 * failing, which is the reason to draw them together rather than pick the one
 * matching the dataset's declared failure mode.
 */
export function TonePair({
  alarmism,
  optimism,
  before,
  bands,
  size = "sm",
  showScale = false,
  className,
}: {
  alarmism: number | null;
  optimism: number | null;
  /** The earlier reading, when this meter is showing a moderated story. */
  before?: { alarmism: number | null; optimism: number | null };
  bands?: { alarmism?: ToneBand; optimism?: ToneBand };
  size?: "sm" | "md";
  showScale?: boolean;
  className?: string;
}) {
  const rows: { axis: ToneAxisId; value: number | null; from: number | null }[] = [
    { axis: "alarmism", value: alarmism, from: before?.alarmism ?? null },
    { axis: "optimism", value: optimism, from: before?.optimism ?? null },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {rows.map(({ axis, value, from }) => (
        <div key={axis}>
          <p className="mb-1.5 font-mono text-[0.62rem] font-medium uppercase tracking-wider text-muted">
            {TONE_AXES[axis].label}
          </p>
          <ToneMeter
            value={value}
            before={from ?? undefined}
            band={bands?.[axis]}
            axis={axis}
            size={size}
            showScale={showScale}
          />
        </div>
      ))}
    </div>
  );
}
