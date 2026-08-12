"use client";

/**
 * `heatmap` — a dense grid where colour carries magnitude.
 *
 * Hand-drawn SVG rather than Recharts, which has no cell geometry. The form
 * exists because it is the only one that shows 200 countries x 45 years without
 * either aggregating them away or seating 200 hues.
 *
 * Two rules it inherits from the map, so a value that reads dark on one reads
 * dark on the other:
 *   • bins come from declared `breaks`, or from quantiles over the WHOLE frame.
 *     Never from the visible facet, or a cell would change colour because its
 *     neighbours changed.
 *   • absence is a hatch, never a pale fill. The palest bin sits at 1.13 against
 *     the surface, so a pale grey would read as a low value.
 */

import { useId, useState } from "react";
import { asNumber, binOf, breaksFor, distinctValues, formatCell } from "@/lib/charts/frame";
import { rampColor, rampFor } from "@/lib/charts/scales";
import { columnOf } from "@/lib/charts/spec";
import { legendLabels } from "@/lib/charts/choropleth";
import * as t from "@/lib/charts/tokens";
import { ChartTooltipCard, RampLegend } from "../chrome";
import type { FormProps } from "./props";

const LABEL_W = 108;
const AXIS_H = 22;
const MIN_CELL = 10;

interface Hover {
  x: number;
  y: number;
  row: string;
  col: string;
  value: number | null;
}

export function HeatmapChart({ spec, frame, height }: FormProps) {
  const patternId = useId();
  const [hover, setHover] = useState<Hover | null>(null);

  const xKey = spec.encoding.x!;
  const yKey = spec.encoding.y!;
  const cKey = spec.encoding.color!;
  const cols = distinctValues(frame, xKey).map(String);
  const rows = distinctValues(frame, yKey).map(String);
  const breaks = breaksFor(frame, spec);
  const ramp = rampFor(spec.polarity);
  const colorCol = columnOf(frame, cKey);

  /* One lookup pass, so the render loop is O(1) per cell rather than a scan. */
  const values = new Map<string, number | null>();
  for (const row of frame.rows) {
    values.set(`${row[yKey]}\0${row[xKey]}`, asNumber(row[cKey]));
  }

  /* Decided HERE and not while drawing: the legend renders before the cells do,
     so a flag raised inside the cell loop would never reach it and the hatch key
     would silently go missing. A cell is absent two ways and both count:
     reported as null, or not present in the frame at all. */
  const anyMissing =
    values.size < rows.length * cols.length || [...values.values()].some((v) => v === null);

  const cellW = Math.max(MIN_CELL, 24);
  const gridW = LABEL_W + cols.length * cellW;
  const plotH = Math.max(0, height - AXIS_H);
  const cellH = rows.length ? plotH / rows.length : 0;

  /* Column labels thin out rather than overlap: every nth, where n is whatever
     keeps ~40px between them. */
  const labelEvery = Math.max(1, Math.ceil(cols.length / 14));

  return (
    <div className="relative">
      <RampLegend
        ramp={ramp}
        labels={breaks ? legendLabels(breaks, colorCol?.decimals ?? 0) : []}
        unit={colorCol?.unit || colorCol?.label}
        hasNoData={anyMissing}
      />

      <div className="scroll-slim overflow-x-auto">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${gridW} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={spec.title}
        >
          <defs>
            <pattern
              id={`hm-nd-${patternId}`}
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="4" stroke={t.noDataStroke} strokeWidth="1" />
            </pattern>
          </defs>

          {rows.map((r, ri) => (
            <text
              key={r}
              x={LABEL_W - 8}
              y={ri * cellH + cellH / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="var(--font-plex-mono)"
              fill={t.muted}
            >
              {r.length > 16 ? `${r.slice(0, 15)}…` : r}
            </text>
          ))}

          {rows.map((r, ri) =>
            cols.map((c, ci) => {
              const v = values.get(`${r}\0${c}`) ?? null;
              const fill = breaks ? rampColor(binOf(v, breaks), spec.polarity) : null;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={LABEL_W + ci * cellW}
                  y={ri * cellH}
                  /* The 2px surface gap between fills, taken out of the cell
                     rather than drawn as a border around it. */
                  width={Math.max(1, cellW - 2)}
                  height={Math.max(1, cellH - 2)}
                  fill={fill ?? `url(#hm-nd-${patternId})`}
                  onMouseEnter={(e) =>
                    setHover({
                      x: e.nativeEvent.offsetX,
                      y: e.nativeEvent.offsetY,
                      row: r,
                      col: c,
                      value: v,
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              );
            }),
          )}

          {cols.map((c, ci) =>
            ci % labelEvery === 0 ? (
              <text
                key={c}
                x={LABEL_W + ci * cellW + cellW / 2}
                y={height - 6}
                fontSize={10}
                fontFamily="var(--font-plex-mono)"
                fill={t.faint}
              >
                {c}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute z-10"
          style={{ left: Math.min(hover.x + 12, 520), top: Math.max(0, hover.y - 8) }}
        >
          <ChartTooltipCard
            heading={`${hover.row} · ${hover.col}`}
            lines={[
              {
                label: colorCol?.label ?? "Value",
                value: formatCell(hover.value, colorCol),
                color: breaks ? (rampColor(binOf(hover.value, breaks), spec.polarity) ?? t.faint) : t.faint,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
