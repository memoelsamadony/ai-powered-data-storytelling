/**
 * Minimal scales for the forms Recharts does not draw.
 *
 * Seven of the seventeen geometries (heatmap, dumbbell, slope, beeswarm, box,
 * ridgeline, parallel coordinates) are hand-drawn SVG. They need scales and
 * ticks and nothing else, so this is ~80 lines rather than a d3-scale
 * dependency, and being pure it is testable with `node --test`.
 */

export interface LinearScale {
  (value: number): number;
  domain: [number, number];
  range: [number, number];
  ticks: (count?: number) => number[];
}

/**
 * Maps a numeric domain onto a pixel range.
 *
 * A zero-width domain maps everything to the range midpoint rather than
 * dividing by zero, so a single-value series renders one centred mark instead
 * of vanishing or throwing.
 */
export function linear(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const fn = ((v: number) =>
    span === 0 ? (r0 + r1) / 2 : r0 + ((v - d0) / span) * (r1 - r0)) as LinearScale;
  fn.domain = domain;
  fn.range = range;
  fn.ticks = (count = 5) => niceTicks(d0, d1, count);
  return fn;
}

export interface BandScale {
  (value: string): number;
  bandwidth: number;
  step: number;
  domain: string[];
}

/**
 * Evenly spaces categories across a pixel range.
 *
 * `padding` is the fraction of each step left empty. It is never zero: adjacent
 * fills need a surface gap between them, and a band scale that packs bars flush
 * would force every caller to subtract one.
 */
export function band(values: string[], range: [number, number], padding = 0.2): BandScale {
  const [r0, r1] = range;
  const n = Math.max(1, values.length);
  const step = (r1 - r0) / n;
  const bandwidth = step * (1 - padding);
  const index = new Map(values.map((v, i) => [v, i]));
  const fn = ((v: string) => r0 + (index.get(v) ?? 0) * step + (step - bandwidth) / 2) as BandScale;
  fn.bandwidth = Math.max(1, bandwidth);
  fn.step = step;
  fn.domain = values;
  return fn;
}

/**
 * Round tick values covering [min, max].
 *
 * Chooses a 1/2/5 x 10^n interval, which is what reads as "round" to a person.
 * Returns the endpoints alone when the range is degenerate.
 */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const raw = (max - min) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  /* Snap the mantissa UP to the next nice value, never past it. `norm` sits in
     [1, 10), so a raw step of exactly 2 must round to 2 and not to 5: rounding
     up at the boundary doubles every interval and halves the tick count the
     caller asked for. */
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) {
    /* Re-round each step: repeated addition accumulates float error and prints
       ticks like 0.30000000000000004. */
    out.push(Number(v.toFixed(12)));
  }
  return out;
}

/**
 * Pads a domain outward so marks do not sit on the axis.
 *
 * A domain that already includes zero keeps zero as its floor: nudging it below
 * would put the baseline off the axis and make every bar look truncated.
 */
export function padDomain([lo, hi]: [number, number], fraction = 0.05): [number, number] {
  if (lo === hi) return lo === 0 ? [0, 1] : [Math.min(0, lo), hi * 1.1];
  const pad = (hi - lo) * fraction;
  return [lo >= 0 ? Math.max(0, lo - pad) : lo - pad, hi + pad];
}

/** An SVG path through points, breaking at nulls rather than drawing across them. */
export function linePath(points: ({ x: number; y: number } | null)[]): string {
  let out = "";
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    out += `${pen ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    pen = true;
  }
  return out;
}

/** Quartiles for a box plot. Nulls are dropped, never treated as zero. */
export interface Quartiles {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  n: number;
}

export function quartiles(values: (number | null)[]): Quartiles | null {
  const v = values.filter((n): n is number => n !== null).sort((a, b) => a - b);
  if (!v.length) return null;
  /* Linear interpolation between order statistics (the "R type 7" definition),
     so a four-value sample does not report a quartile it does not have. */
  const at = (q: number) => {
    const pos = (v.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return v[lo] + (v[hi] - v[lo]) * (pos - lo);
  };
  return { min: v[0], q1: at(0.25), median: at(0.5), q3: at(0.75), max: v[v.length - 1], n: v.length };
}

/**
 * Counts per equal-width bin across `domain`, for the ridgeline's density.
 *
 * A histogram rather than a kernel estimate: the bandwidth of a KDE is a free
 * parameter that changes how many modes the curve appears to have, and a figure
 * whose shape depends on an undisclosed knob is one the reader cannot check.
 * Values outside the domain clamp into the end bins rather than disappearing.
 */
export function histogram(
  values: (number | null)[],
  bins: number,
  domain: [number, number],
): number[] {
  const out = new Array(bins).fill(0) as number[];
  const [lo, hi] = domain;
  const span = hi - lo;
  for (const v of values) {
    if (v === null) continue;
    const i = span === 0 ? 0 : Math.floor(((v - lo) / span) * bins);
    out[Math.max(0, Math.min(bins - 1, i))] += 1;
  }
  return out;
}

/**
 * Beeswarm offsets: dots nudged off the centre line until they stop overlapping.
 *
 * A simple greedy pass rather than a force simulation. It is deterministic,
 * which matters because a chart that jitters differently on every render is one
 * a reader cannot compare with the one they saw a moment ago.
 */
export function swarmOffsets(positions: number[], radius: number): number[] {
  const placed: { pos: number; off: number }[] = [];
  const gap = radius * 2;
  return positions.map((pos) => {
    let off = 0;
    let step = 0;
    /* Alternate sides, widening, until the slot is clear. */
    while (placed.some((p) => Math.abs(p.pos - pos) < gap && Math.abs(p.off - off) < gap)) {
      step += 1;
      off = (step % 2 === 1 ? 1 : -1) * Math.ceil(step / 2) * gap;
    }
    placed.push({ pos, off });
    return off;
  });
}
