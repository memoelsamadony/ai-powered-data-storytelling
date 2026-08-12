"use client";

/**
 * `choropleth` and `bivariateChoropleth` — magnitude by place.
 *
 * The single-measure map is NOT reimplemented here. `country-map.tsx` is
 * already generic by construction and carries a lot of earned behaviour:
 * declared bins, the hatch for absent values, the Equal Earth projection, the
 * 1/3/5/10-year step tabs and the scrubber. `frameToCountryData` adapts a frame
 * into the shape it takes, so a spec-driven map inherits all of it and there is
 * no second map to drift out of sync.
 *
 * The bivariate map does need its own renderer, because a 3x3 grid is not
 * something a five-bin ramp can express.
 */

import { useId, useMemo, useState } from "react";
import { WORLD_VIEWBOX, worldShapes } from "@/lib/data/world-geo";
import { asNumber, binOf, fallbackBreaks, formatCell } from "@/lib/charts/frame";
import { BIVARIATE, bivariateColor, terciles } from "@/lib/charts/scales";
import { columnOf } from "@/lib/charts/spec";
import { frameToCountryData } from "@/lib/charts/geo-adapter";
import * as t from "@/lib/charts/tokens";
import { ChartTooltipCard } from "../chrome";
import { CountryMap } from "../country-map";
import type { FormProps } from "./props";

/* ── Choropleth ──────────────────────────────────────────────────────────── */

export function ChoroplethForm({ spec, frame }: FormProps) {
  const { years, metrics, stats } = useMemo(
    () => frameToCountryData(frame, spec),
    [frame, spec],
  );
  if (!stats.length) return null;
  return (
    <CountryMap
      years={years}
      metrics={metrics}
      stats={stats}
      sourceNote={frame.sourceNote}
      compact
      /* The figure wrapper already owns the table twin; a second one inside the
         map would give the reader two buttons that do the same thing. */
      showTable={false}
    />
  );
}

/* ── Bivariate choropleth ────────────────────────────────────────────────── */

interface Hover {
  name: string;
  a: number | null;
  b: number | null;
  x: number;
  y: number;
}

export function BivariateChoroplethForm({ spec, frame, height }: FormProps) {
  const patternId = useId();
  const [hover, setHover] = useState<Hover | null>(null);

  const geoKey = spec.encoding.geo!;
  const aKey = spec.encoding.color!;
  const bKey = spec.encoding.color2!;
  const aCol = columnOf(frame, aKey);
  const bCol = columnOf(frame, bKey);
  const nameKey = frame.columns.find((c) => c.type === "nominal" && c.key !== geoKey)?.key;

  const aBreaks = spec.breaks ?? fallbackBreaks(frame, aKey);
  const bBreaks = fallbackBreaks(frame, bKey);

  /** Last row wins per country: a bivariate map shows one slice, not a series. */
  const byIso = useMemo(() => {
    const m = new Map<string, { name: string; a: number | null; b: number | null }>();
    for (const row of frame.rows) {
      const iso = row[geoKey];
      if (iso === null || iso === undefined) continue;
      m.set(String(iso), {
        name: nameKey ? String(row[nameKey] ?? iso) : String(iso),
        a: asNumber(row[aKey]),
        b: asNumber(row[bKey]),
      });
    }
    return m;
  }, [frame.rows, geoKey, aKey, bKey, nameKey]);

  return (
    <div className="relative">
      <BivariateKey aLabel={aCol?.label ?? aKey} bLabel={bCol?.label ?? bKey} />

      <svg viewBox={WORLD_VIEWBOX} width="100%" height={height} role="img" aria-label={spec.title}>
        <defs>
          <pattern
            id={`bv-nd-${patternId}`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke={t.noDataStroke} strokeWidth="2" />
          </pattern>
        </defs>

        {worldShapes.map((shape) => {
          const hit = byIso.get(shape.id);
          const fill =
            hit && aBreaks && bBreaks
              ? bivariateColor(binOf(hit.a, aBreaks), binOf(hit.b, bBreaks))
              : null;
          return (
            <path
              key={shape.id}
              d={shape.d}
              /* Absence is hatched, never a pale fill: a pale grey scores 1.04
                 against the palest bin and would read as a low value. */
              fill={fill ?? `url(#bv-nd-${patternId})`}
              stroke={t.countryStroke}
              strokeWidth={0.5}
              onMouseMove={(e) =>
                hit &&
                setHover({
                  ...hit,
                  x: e.nativeEvent.offsetX,
                  y: e.nativeEvent.offsetY,
                })
              }
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10"
          style={{ left: Math.min(hover.x + 12, 480), top: Math.max(0, hover.y - 8) }}
        >
          <ChartTooltipCard
            heading={hover.name}
            lines={[
              { label: aCol?.label ?? aKey, value: formatCell(hover.a, aCol) },
              { label: bCol?.label ?? bKey, value: formatCell(hover.b, bCol) },
            ]}
          />
        </div>
      )}
    </div>
  );
}

/**
 * The 3x3 key, which this form cannot do without.
 *
 * A bivariate map is unreadable without its legend: no reader infers "dark
 * corner means high on both" from the map alone. It is rendered at size, not as
 * a tooltip.
 */
function BivariateKey({ aLabel, bLabel }: { aLabel: string; bLabel: string }) {
  return (
    <div className="mb-3 flex items-end gap-2">
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[0.6rem] text-faint [writing-mode:vertical-rl] [transform:rotate(180deg)]">
          {aLabel} →
        </span>
      </div>
      <div>
        <div className="flex flex-col-reverse gap-px">
          {BIVARIATE.map((row, ri) => (
            <div key={ri} className="flex gap-px">
              {row.map((c, ci) => (
                <span key={ci} className="block h-4 w-4" style={{ background: c }} />
              ))}
            </div>
          ))}
        </div>
        <span className="mt-1 block font-mono text-[0.6rem] text-faint">{bLabel} →</span>
      </div>
      <span className="pb-4 font-mono text-[0.6rem] text-faint">
        darkest corner: high on both
      </span>
    </div>
  );
}

/** Exposed for tests and for anything that needs the same tercile rule. */
export { terciles };
