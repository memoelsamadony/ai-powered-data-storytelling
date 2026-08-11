# Country Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic country choropleth to the datasets page and the generate studio's comparison step, driven entirely by data each dataset declares, and absent when a dataset has no country data.

**Architecture:** A one-shot Node script projects Natural Earth country polygons into SVG paths and commits the result as a plain TypeScript module, so no map library ever reaches the browser. A pure-logic module handles binning and joining and is unit-tested with Node's built-in test runner. One client component renders the SVG, a metric toggle, and a year scrubber; it returns `null` when handed no country data, so neither call site needs a guard.

**Tech Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind v4 · `node --test` · build-time only: `world-atlas`, `topojson-client`, `d3-geo`, `i18n-iso-countries`

**Spec:** `docs/superpowers/specs/2026-08-11-country-maps-design.md`

## Global Constraints

- **No hex literals in chart components.** Every colour comes from `lib/charts/tokens.ts`. This is an existing repo rule (`FRONTEND_PLAN.md §2 item 2`, defect D5) enforced by review, not tooling.
- **`lib/data/world-geo.ts` must stay under 120 KB.** Verified achievable at 93.2 KB. If a change pushes it over, stop and reconsider rather than shipping it.
- **Equal-area projection only.** `geoEqualEarth`. Never Mercator — it inflates high-latitude countries 3–14×, misstating the quantity the colour encodes.
- **Class breaks are declared per metric, never computed from the visible year.** With a year scrubber, recomputed bins recolour a country whose value did not move. This is the single most important correctness rule in this plan.
- **"No data" is never a pale fill.** It is a hatch pattern. Measured contrast between the palest bin (`#fdeeea`) and any pale grey is 1.04 — indistinguishable. Absence must not read as a low value.
- **Dashes are reserved.** The repo permits exactly one dashed line (the herd-immunity threshold in `story-chart.tsx`). Do not introduce dashed strokes.
- **The app is light-only.** No `prefers-color-scheme` handling; `globals.css` defines one token set by decision.
- **Country figures are illustrative.** They must be labelled as such in the UI and in each source file's header comment, exactly as `series` and `previewRows` already are.
- Node 24.15.0, npm 11.12.1 confirmed on this machine.

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json` | Gains `"type": "module"`, a `test` script, and four devDependencies |
| `scripts/build-world-map.mjs` | **Create.** One-shot generator: TopoJSON → projected SVG paths. Never imported by app code. |
| `lib/data/world-geo.ts` | **Create (generated, committed).** `WORLD_VIEWBOX` + `worldShapes`. Do not hand-edit. |
| `lib/charts/tokens.ts` | **Modify.** Add two 5-step sequential ramps and the no-data colours. |
| `lib/charts/choropleth.ts` | **Create.** Pure logic: bin assignment, stat lookup, legend labels, value formatting. No React. |
| `lib/charts/choropleth.test.mts` | **Create.** Node `--test` unit tests for the above. |
| `lib/data/datasets.ts` | **Modify.** Add `CountryMetric` / `CountryStat` types and three optional `Dataset` fields. Types and wiring only — no bulk data. |
| `lib/data/country-stats/measles.ts` | **Create.** The measles country figures. |
| `lib/data/country-stats/who-health.ts` | **Create.** The WHO country figures. |
| `components/charts/country-map.tsx` | **Create.** The component. Contains no dataset-specific knowledge. |
| `app/datasets/page.tsx` | **Modify.** Render the map inside `DatasetBlock`'s chart card. |
| `components/generate/comparison.tsx` | **Modify.** Render the map inside the existing shared-data card. |

The country figures live in their own modules rather than in `datasets.ts` because that file is currently 131 readable lines and would grow past 1,000. This is a refinement of the spec, which named `datasets.ts` for the *types*.

---

### Task 1: Test harness and ESM switch

Node 24 runs TypeScript natively, so unit tests need no new runtime dependency — but an `.mts` test can only import a `.ts` source module when the package is ESM. Verified: a full `npm run build` passes with `"type": "module"` on this project.

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `lib/charts/choropleth.test.mts` (placeholder test, replaced in Task 4)

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs `node --test "lib/**/*.test.mts"`

- [ ] **Step 0: Allow `.ts` import extensions**

Node resolves `import { x } from "./choropleth.ts"` literally, but TypeScript rejects that specifier by default. Verified: without this flag `tsc` fails with `TS5097`, which would break `npm run build` (Next runs TypeScript as part of the build). The flag requires `noEmit`, which this project already sets.

In `tsconfig.json`, add to `compilerOptions`:

```json
    "allowImportingTsExtensions": true,
```

- [ ] **Step 1: Add `"type": "module"` and the test script**

In `package.json`, add `"type": "module"` directly after `"private": true`, and add the `test` script:

```json
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "node --test \"lib/**/*.test.mts\""
  },
```

- [ ] **Step 2: Write a failing test proving the harness works**

Create `lib/charts/choropleth.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { binOf } from "./choropleth.ts";

test("harness resolves the choropleth module", () => {
  assert.equal(typeof binOf, "function");
});
```

- [ ] **Step 3: Run it and confirm it fails for the right reason**

Run: `npm test`
Expected: FAIL — `Cannot find module` / `does not provide an export named 'binOf'`. It must fail because `choropleth.ts` does not exist yet, **not** because of an ESM parse error. If you see `SyntaxError: Cannot use import statement outside a module`, `"type": "module"` was not applied.

- [ ] **Step 4: Create the module stub so the harness goes green**

Create `lib/charts/choropleth.ts`:

```ts
/** Pure choropleth logic — no React, no colour, unit-tested in choropleth.test.mts. */
export function binOf(): number {
  return 0;
}
```

- [ ] **Step 5: Confirm the harness passes**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 6: Confirm the ESM switch broke neither build nor lint**

Run: `npm run build`
Expected: `✓ Compiled successfully`, all 9 routes prerendered.

Run: `npx eslint <the files this task touched>`
Expected: no output.

**Do not run `npx eslint .` and expect zero problems.** This repo has a pre-existing lint baseline of **2 errors and 8 warnings**, none of them related to this work:
- `components/generate/typewriter.tsx` — `react-hooks/set-state-in-effect` (2 errors)
- `components/ui/button.tsx` — 8 `@typescript-eslint/no-unused-vars` warnings on intentionally-discarded `_v` / `_s` / `_c` / `_ch` bindings

Lint the files you touched, not the whole repo, and leave that baseline alone — fixing it is not in scope for this plan.

**Allow up to 5 minutes** — the first ESLint run on this repo is slow and has timed out at 2 minutes before. Also beware `eslint … | tail`: that reports `tail`'s exit code, not ESLint's. Use `${PIPESTATUS[0]}` or don't pipe.

**Rollback criterion:** if `npm run build` or lint fails and cannot be fixed within this task, revert `"type": "module"` and `allowImportingTsExtensions`, delete `choropleth.test.mts`, drop the `test` script, and note that Task 4's tests become manual verification. Everything else in this plan works unchanged without the test harness — no other task imports it.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json lib/charts/choropleth.ts lib/charts/choropleth.test.mts
git commit -m "chore(test): add zero-dependency node --test harness

Node 24 strips TypeScript natively, so unit tests need no new runtime
dependency. An .mts test can only import a .ts source module when the
package is ESM, so package.json gains type: module; a full next build was
verified to pass under it."
```

---

### Task 2: Generate the world geometry

**Files:**
- Create: `scripts/build-world-map.mjs`
- Create (by running the script): `lib/data/world-geo.ts`
- Modify: `package.json` (devDependencies)

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export const WORLD_VIEWBOX: string;              // "0 0 2000 992"
  export interface WorldShape { id: string; name: string; d: string }
  export const worldShapes: WorldShape[];          // 177 entries, unique ISO-3166-1 alpha-3 ids
  ```

**Facts already verified — do not re-derive:**
- `world-atlas/countries-110m.json` has 177 country geometries under `objects.countries`.
- Their `id` is a **UN M49 numeric code as a string**, *not* ISO alpha-3. `properties` carries only `name`.
- Three geometries have no `id` at all: `N. Cyprus`, `Somaliland`, `Kosovo`. They have no M49 code and must be mapped by name.
- All 177 resolve to unique alpha-3 ids with the name overrides below.
- At width 2000 with integer coordinates the output is 93.2 KB (34.2 KB gzipped) — smaller *and* more precise than width 1000 at one decimal place.

- [ ] **Step 1: Install the build-time dependencies**

```bash
npm install --save-dev world-atlas topojson-client d3-geo i18n-iso-countries
```

These are `devDependencies`. Application code must never import them; only `scripts/build-world-map.mjs` does.

- [ ] **Step 2: Write the generator**

Create `scripts/build-world-map.mjs`:

```js
/**
 * Generates lib/data/world-geo.ts from Natural Earth 110m country polygons.
 *
 * Run by hand — the output is committed, so CI never needs this script and no
 * map library reaches the browser:
 *
 *   node scripts/build-world-map.mjs
 *
 * Equal Earth, not Mercator. Mercator inflates high-latitude countries by
 * 3-14x, which on a choropleth misstates the very quantity the colour encodes.
 *
 * Coordinates are rounded to integers in a 2000-unit-wide viewBox: ~0.35px of
 * precision at a 700px render width, and adjacent countries round to identical
 * vertices so shared borders cannot open up hairline gaps.
 */
import fs from "node:fs";
import path from "node:path";
import { feature } from "topojson-client";
import { geoEqualEarth, geoPath } from "d3-geo";
import countries from "i18n-iso-countries";

const WIDTH = 2000;
const PAD = 4;
const OUT = path.join(process.cwd(), "lib/data/world-geo.ts");
const MAX_BYTES = 120 * 1024;

/** Territories with no UN M49 code, matched by Natural Earth's own name. */
const NO_M49 = { "N. Cyprus": "XNC", Somaliland: "XSO", Kosovo: "XKX" };

const topo = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "node_modules/world-atlas/countries-110m.json"), "utf8"),
);
const fc = feature(topo, topo.objects.countries);

/* Fit to width, then shift the projected bounds to the viewBox origin. */
const projection = geoEqualEarth();
projection.fitWidth(WIDTH - PAD * 2, fc);
const [[x0, y0], [, y1]] = geoPath(projection).bounds(fc);
const [tx, ty] = projection.translate();
projection.translate([tx - x0 + PAD, ty - y0 + PAD]);
const height = Math.ceil(y1 - y0 + PAD * 2);

const toPath = geoPath(projection);
const shapes = [];
const skipped = [];

for (const f of fc.features) {
  const iso3 = f.id ? countries.numericToAlpha3(String(f.id)) : NO_M49[f.properties.name];
  if (!iso3) {
    skipped.push(f.properties.name);
    continue;
  }
  const d = toPath(f);
  if (!d) {
    skipped.push(f.properties.name);
    continue;
  }
  shapes.push({ id: iso3, name: f.properties.name, d: d.replace(/-?\d+\.?\d*/g, (n) => String(Math.round(+n))) });
}

const dupes = shapes.map((s) => s.id).filter((id, i, all) => all.indexOf(id) !== i);
if (dupes.length) throw new Error(`Duplicate ISO3 ids, which would break React keys: ${dupes.join(", ")}`);

const body = shapes
  .map((s) => `  { id: ${JSON.stringify(s.id)}, name: ${JSON.stringify(s.name)}, d: ${JSON.stringify(s.d)} },`)
  .join("\n");

const out = `/**
 * GENERATED by scripts/build-world-map.mjs — do not edit by hand.
 *
 * Natural Earth 110m country polygons (public domain, via world-atlas),
 * projected once with Equal Earth. Ids are ISO 3166-1 alpha-3 and join to
 * Dataset.countryStats[].iso3.
 */
export const WORLD_VIEWBOX = ${JSON.stringify(`0 0 ${WIDTH} ${height}`)};

export interface WorldShape {
  /** ISO 3166-1 alpha-3. XNC / XSO / XKX for the three territories with no M49 code. */
  id: string;
  name: string;
  /** Projected SVG path, in WORLD_VIEWBOX coordinates. */
  d: string;
}

export const worldShapes: WorldShape[] = [
${body}
];
`;

fs.writeFileSync(OUT, out);
const bytes = Buffer.byteLength(out);
console.log(`wrote ${OUT}`);
console.log(`  ${shapes.length} shapes, ${(bytes / 1024).toFixed(1)} KB, viewBox 0 0 ${WIDTH} ${height}`);
if (skipped.length) console.log(`  skipped: ${skipped.join(", ")}`);
if (bytes > MAX_BYTES) {
  console.error(`  FAIL: ${(bytes / 1024).toFixed(1)} KB exceeds the ${MAX_BYTES / 1024} KB budget`);
  process.exit(1);
}
```

- [ ] **Step 3: Run it**

Run: `node scripts/build-world-map.mjs`
Expected, exactly:

```
wrote .../lib/data/world-geo.ts
  177 shapes, 93.2 KB, viewBox 0 0 2000 992
```

No `skipped:` line. If any country is skipped, the `NO_M49` table is wrong — fix it rather than accepting a hole in the map.

- [ ] **Step 4: Verify the output is sane**

```bash
node -e "import('./lib/data/world-geo.ts').then(m=>{const s=m.worldShapes;console.log('shapes',s.length);console.log('viewBox',m.WORLD_VIEWBOX);console.log('unique',new Set(s.map(x=>x.id)).size);const need=['NGA','IND','USA','RUS','BRA','CHN','AUS','DEU','ZAF','ARG'];console.log('join keys',need.filter(n=>s.some(x=>x.id===n)).length+'/'+need.length);console.log('all paths start with M:',s.every(x=>x.d.startsWith('M')));})"
```

Expected: `shapes 177`, `viewBox 0 0 2000 992`, `unique 177`, `join keys 10/10`, `all paths start with M: true`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/build-world-map.mjs lib/data/world-geo.ts
git commit -m "feat(data): generate Equal Earth world geometry

world-atlas ids are UN M49 numeric codes, not ISO alpha-3, and three
territories carry no code at all, so the script maps both. Output is 177
unique alpha-3 shapes at 93.2 KB with integer coordinates; the map libraries
stay devDependencies and never reach the browser."
```

---

### Task 3: Sequential colour ramps

**Files:**
- Modify: `lib/charts/tokens.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export const rampAlarm: readonly [string, string, string, string, string];
  export const rampCalm: readonly [string, string, string, string, string];
  export const noDataStroke: string;
  export const countryStroke: string;
  export function rampFor(polarity: "higher-is-worse" | "higher-is-better"): readonly string[];
  ```

These ramps were computed by interpolating in OKLab between the existing `--color-alarm-soft` / `--color-alarm-ink` and `--color-calm-soft` / `--color-calm-ink` token pairs, so they stay inside the established palette. Adjacent-step contrast is 1.49–1.80 throughout and lightness is monotonic — verified.

- [ ] **Step 1: Append the ramps to `lib/charts/tokens.ts`**

Add at the end of the file:

```ts
/* ── Sequential ramps for the choropleth ────────────────────────────────────
 *
 * Five bins each, interpolated in OKLab between the alarm-soft/alarm-ink and
 * calm-soft/calm-ink token pairs so they stay inside the existing palette.
 * Lightness is monotonic and adjacent-step contrast runs 1.49–1.80.
 *
 * Contrast vs #ffffff, light → dark:
 *   alarm  1.13  1.74  2.83  4.97  8.93
 *   calm   1.13  1.68  2.65  4.34  7.52
 *
 * The palest bin sits at 1.13 against the surface, which is why "no data" is a
 * hatch and never a pale fill — a pale grey scores 1.04 against it and the two
 * would be indistinguishable. Absence must not read as a low value.
 */
export const rampAlarm = ["#fdeeea", "#e5bbb2", "#cb897d", "#ae5649", "#8f1d12"] as const;
export const rampCalm = ["#e4f5f2", "#b0cec9", "#7ea7a2", "#4b837d", "#0a5f59"] as const;

/** Diagonal hatch stroke for countries with no figure. Fill stays `surface`. */
export const noDataStroke = "#b3bfcd";
/** Border between countries — the hairline, so shapes read even in the palest bin. */
export const countryStroke = hairline;

export type Polarity = "higher-is-worse" | "higher-is-better";

/** Higher-is-worse ramps toward alarm; higher-is-better ramps toward calm. */
export function rampFor(polarity: Polarity): readonly string[] {
  return polarity === "higher-is-worse" ? rampAlarm : rampCalm;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/charts/tokens.ts
git commit -m "feat(charts): add sequential choropleth ramps to tokens

Interpolated in OKLab between the existing alarm/calm soft-to-ink token pairs
so the map stays inside the established palette. No-data gets a hatch stroke
rather than a pale fill: a pale grey scores 1.04 against the palest bin, so
absence would have read as a low value."
```

---

### Task 4: Pure choropleth logic

All the arithmetic lives here so it can be tested without a browser. The component in Task 7 renders; it does not decide.

**Files:**
- Modify: `lib/charts/choropleth.ts` (replacing the Task 1 stub)
- Modify: `lib/charts/choropleth.test.mts` (replacing the Task 1 placeholder)

**Interfaces:**
- Consumes: `Polarity` from `lib/charts/tokens.ts`
- Produces:
  ```ts
  export interface Binnable { breaks: readonly number[]; polarity: Polarity }
  export function binOf(value: number | null | undefined, breaks: readonly number[]): number | null;
  export function legendLabels(breaks: readonly number[], decimals?: number): string[];
  export function formatValue(value: number | null | undefined, decimals?: number): string;
  export function valueAt(stat: CountryStatLike, metricKey: string, yearIndex: number): number | null;
  export function statsByIso(stats: readonly CountryStatLike[]): Map<string, CountryStatLike>;
  export interface CountryStatLike { iso3: string; name: string; series: Record<string, (number | null)[]> }
  ```

- [ ] **Step 1: Write the failing tests**

Replace `lib/charts/choropleth.test.mts` entirely:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { binOf, legendLabels, formatValue, valueAt, statsByIso } from "./choropleth.ts";

const BREAKS = [1, 10, 50, 200];

test("binOf: below the first break is bin 0", () => {
  assert.equal(binOf(0, BREAKS), 0);
  assert.equal(binOf(0.9, BREAKS), 0);
});

test("binOf: a value exactly on a break belongs to the higher bin", () => {
  assert.equal(binOf(1, BREAKS), 1);
  assert.equal(binOf(10, BREAKS), 2);
  assert.equal(binOf(50, BREAKS), 3);
  assert.equal(binOf(200, BREAKS), 4);
});

test("binOf: values above the top break clamp into the last bin", () => {
  assert.equal(binOf(200_000, BREAKS), 4);
});

test("binOf: absent values are null, not bin 0 — absence is not a low value", () => {
  assert.equal(binOf(null, BREAKS), null);
  assert.equal(binOf(undefined, BREAKS), null);
});

test("binOf: is independent of the data it is called with", () => {
  // The scrubber correctness rule: the same value must land in the same bin
  // regardless of what other values exist, so a country cannot change colour
  // because the year changed rather than its own figure.
  assert.equal(binOf(37, BREAKS), 2);
  assert.equal(binOf(37, BREAKS), 2);
});

test("legendLabels: one label per boundary, top bin marked open-ended", () => {
  assert.deepEqual(legendLabels(BREAKS), ["0", "1", "10", "50", "200+"]);
});

test("legendLabels: honours decimals", () => {
  assert.deepEqual(legendLabels([4.5, 9], 1), ["0.0", "4.5", "9.0+"]);
});

test("formatValue: thousands separators and fixed decimals", () => {
  assert.equal(formatValue(42938), "42,938");
  assert.equal(formatValue(71.66, 1), "71.7");
});

test("formatValue: absent values render as an en dash, never as zero", () => {
  assert.equal(formatValue(null), "—");
  assert.equal(formatValue(undefined), "—");
});

const STATS = [
  { iso3: "NGA", name: "Nigeria", series: { cov: [54, 33, 41, 54, 62] } },
  { iso3: "IND", name: "India", series: { cov: [56, 56, 74, 89, 93] } },
];

test("valueAt: reads the metric at the year index", () => {
  assert.equal(valueAt(STATS[0], "cov", 0), 54);
  assert.equal(valueAt(STATS[0], "cov", 4), 62);
});

test("valueAt: unknown metric or out-of-range year is null, not a throw", () => {
  assert.equal(valueAt(STATS[0], "nope", 0), null);
  assert.equal(valueAt(STATS[0], "cov", 99), null);
  assert.equal(valueAt(STATS[0], "cov", -1), null);
});

test("statsByIso: builds a lookup keyed by iso3", () => {
  const map = statsByIso(STATS);
  assert.equal(map.size, 2);
  assert.equal(map.get("IND")?.name, "India");
  assert.equal(map.get("ZZZ"), undefined);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL — `binOf` returns 0 for everything and the other four exports do not exist.

- [ ] **Step 3: Implement**

Replace `lib/charts/choropleth.ts` entirely:

```ts
/**
 * Pure choropleth logic — no React, no colour, no DOM.
 *
 * Everything the map computes lives here so it can be tested with
 * `node --test`. The component renders; it does not decide.
 */
import type { Polarity } from "./tokens";

export type { Polarity };

export interface CountryStatLike {
  iso3: string;
  name: string;
  /** metric key → one value per index of the dataset's countryYears. */
  series: Record<string, (number | null)[]>;
}

/**
 * Which of the five bins a value falls in, or null when there is no value.
 *
 * `breaks` are the four ascending boundaries; a value sitting exactly on a
 * boundary belongs to the higher bin. Values above the top break clamp into
 * the last bin rather than overflowing.
 *
 * Deliberately a pure function of (value, breaks) and nothing else. Breaks are
 * declared per metric and never derived from the visible year — otherwise
 * scrubbing would recolour a country whose own figure had not moved.
 */
export function binOf(value: number | null | undefined, breaks: readonly number[]): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  let bin = 0;
  for (const b of breaks) if (value >= b) bin += 1;
  return bin;
}

/** Formats a value for display. Absent values are an en dash, never a zero. */
export function formatValue(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Legend edge labels: one per bin, the last marked open-ended. */
export function legendLabels(breaks: readonly number[], decimals = 0): string[] {
  const edges = [0, ...breaks];
  return edges.map((e, i) => (i === edges.length - 1 ? `${formatValue(e, decimals)}+` : formatValue(e, decimals)));
}

/** The value of one metric for one country at one year index, or null. */
export function valueAt(stat: CountryStatLike, metricKey: string, yearIndex: number): number | null {
  const row = stat.series[metricKey];
  if (!row || yearIndex < 0 || yearIndex >= row.length) return null;
  const v = row[yearIndex];
  return v === null || v === undefined || Number.isNaN(v) ? null : v;
}

/** Lookup keyed by ISO alpha-3, so the render loop is O(1) per shape. */
export function statsByIso<T extends CountryStatLike>(stats: readonly T[]): Map<string, T> {
  return new Map(stats.map((s) => [s.iso3, s]));
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, 12 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add lib/charts/choropleth.ts lib/charts/choropleth.test.mts
git commit -m "feat(charts): pure choropleth logic with unit tests

Binning is a pure function of (value, breaks) and nothing else, which is what
makes the year scrubber honest: a country can only change colour when its own
figure moves, never because the scale was recomputed for a different year.
Absent values return null rather than bin 0 so absence never reads as low."
```

---

### Task 5: Country data types

Types and wiring only. The figures themselves arrive in Tasks 6 and 7, so this task stays reviewable on its own.

**Files:**
- Modify: `lib/data/datasets.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export interface CountryMetric {
    key: string; label: string; unit: string;
    polarity: "higher-is-worse" | "higher-is-better";
    breaks: [number, number, number, number];
    decimals?: number;
    mappable?: boolean;
  }
  export interface CountryStat { iso3: string; name: string; series: Record<string, (number | null)[]> }
  // new optional Dataset fields:
  //   countryYears?: number[]
  //   countryMetrics?: CountryMetric[]
  //   countryStats?: CountryStat[]
  //   countrySourceNote?: string
  ```

- [ ] **Step 1: Add the types**

In `lib/data/datasets.ts`, insert directly above `export interface Dataset {`:

```ts
/** One mapped or disclosed measure in a dataset's country table. */
export interface CountryMetric {
  /** Stable key; indexes into CountryStat.series. */
  key: string;
  label: string;
  unit: string;
  /** Picks the colour ramp: alarm-ward or calm-ward. */
  polarity: "higher-is-worse" | "higher-is-better";
  /**
   * Four ascending class breaks -> five bins. Declared, never computed from the
   * visible year: with a year scrubber, recomputed bins would make a country
   * change colour because the scale moved rather than because its value did.
   */
  breaks: [number, number, number, number];
  /** Decimal places for display. Default 0. */
  decimals?: number;
  /** false = shown in the tooltip and table, never mapped. Default true. */
  mappable?: boolean;
}

/** One country's figures, columnar: metric key -> value per countryYears index. */
export interface CountryStat {
  /** ISO 3166-1 alpha-3 - joins to WorldShape.id in lib/data/world-geo.ts. */
  iso3: string;
  name: string;
  series: Record<string, (number | null)[]>;
}
```

- [ ] **Step 2: Add the optional fields to `Dataset`**

Inside `export interface Dataset { ... }`, directly after the `previewRows` field:

```ts
  /**
   * The map's own timeline - deliberately coarser than `series`, because the
   * country figures are anchored to years with published values rather than
   * interpolated across every point of the world trend.
   */
  countryYears?: number[];
  countryMetrics?: CountryMetric[];
  countryStats?: CountryStat[];
  /** Attribution shown under the map. */
  countrySourceNote?: string;
```

All four are optional: a dataset with no country data stays valid and simply gets no map.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Nothing sets the new fields yet, which is fine — they are optional.

- [ ] **Step 4: Commit**

```bash
git add lib/data/datasets.ts
git commit -m "feat(data): add country metric and stat types"
```

---

### Task 6: Measles country figures

32 countries chosen for landmass coverage, so the map reads as a map rather than as scattered dots. Five anchor years.

**Files:**
- Create: `lib/data/country-stats/measles.ts`
- Modify: `lib/data/datasets.ts` (wire it into the `measles` dataset)

**Interfaces:**
- Consumes: `CountryMetric`, `CountryStat` from `lib/data/datasets.ts`
- Produces: `measlesYears: number[]`, `measlesMetrics: CountryMetric[]`, `measlesCountryStats: CountryStat[]`

Raw case counts are `mappable: false` on purpose. A choropleth of case counts is a population map — India and Nigeria are darkest in every year regardless of what happened — so the rate is mapped and the count is disclosed in the tooltip and table.

- [ ] **Step 1: Create the data module**

Create `lib/data/country-stats/measles.ts`:

```ts
/**
 * Country-level measles figures for the map.
 *
 * ILLUSTRATIVE SAMPLE, exactly like `series` and `previewRows` in datasets.ts:
 * anchored to published WHO/WUENIC and Our World in Data values where those are
 * known, and plausibly interpolated where they are not. The real pipeline reads
 * the full merged table. Do not cite these numbers.
 *
 * Columnar: each array is one value per index of `measlesYears`.
 */
import type { CountryMetric, CountryStat } from "../datasets";

export const measlesYears = [1990, 2000, 2010, 2019, 2023];

export const measlesMetrics: CountryMetric[] = [
  {
    key: "cases_per_million",
    label: "Reported measles cases",
    unit: "per million people",
    polarity: "higher-is-worse",
    breaks: [1, 10, 50, 200],
  },
  {
    key: "mcv1_coverage",
    label: "MCV1 coverage",
    unit: "%",
    polarity: "higher-is-better",
    breaks: [70, 85, 92, 95],
  },
  {
    key: "cases",
    label: "Reported cases",
    unit: "cases",
    polarity: "higher-is-worse",
    breaks: [100, 1000, 10000, 50000],
    /* Never mapped: a choropleth of counts is a population map. */
    mappable: false,
  },
];

export const measlesCountryStats: CountryStat[] = [
  { iso3: "NGA", name: "Nigeria", series: {
    cases_per_million: [606, 233, 116, 231, 193],
    mcv1_coverage: [54, 33, 41, 54, 62],
    cases: [57600, 28100, 18400, 46500, 42938] } },
  { iso3: "ETH", name: "Ethiopia", series: {
    cases_per_million: [190, 95, 47, 75, 62],
    mcv1_coverage: [38, 33, 66, 60, 71],
    cases: [9100, 6400, 4300, 8600, 7600] } },
  { iso3: "COD", name: "DR Congo", series: {
    cases_per_million: [420, 210, 165, 350, 210],
    mcv1_coverage: [38, 46, 68, 57, 61],
    cases: [15400, 10200, 10900, 30500, 21400] } },
  { iso3: "EGY", name: "Egypt", series: {
    cases_per_million: [95, 12, 3, 1, 1],
    mcv1_coverage: [86, 98, 96, 94, 96],
    cases: [5400, 790, 250, 110, 105] } },
  { iso3: "ZAF", name: "South Africa", series: {
    cases_per_million: [61, 9, 38, 2, 4],
    mcv1_coverage: [79, 77, 65, 83, 85],
    cases: [2200, 400, 1900, 120, 250] } },
  { iso3: "KEN", name: "Kenya", series: {
    cases_per_million: [145, 40, 21, 16, 35],
    mcv1_coverage: [78, 75, 86, 89, 90],
    cases: [3400, 1300, 890, 840, 1950] } },
  { iso3: "TZA", name: "Tanzania", series: {
    cases_per_million: [130, 35, 9, 5, 11],
    mcv1_coverage: [81, 78, 91, 87, 89],
    cases: [3300, 1200, 410, 300, 730] } },
  { iso3: "SDN", name: "Sudan", series: {
    cases_per_million: [210, 88, 34, 60, 120],
    mcv1_coverage: [57, 47, 82, 88, 67],
    cases: [4900, 2600, 1200, 2600, 5700] } },
  { iso3: "AGO", name: "Angola", series: {
    cases_per_million: [260, 130, 52, 30, 44],
    mcv1_coverage: [38, 41, 75, 57, 63],
    cases: [2900, 2000, 1300, 960, 1600] } },
  { iso3: "IND", name: "India", series: {
    cases_per_million: [99, 62, 24, 14, 9],
    mcv1_coverage: [56, 56, 74, 89, 93],
    cases: [86000, 64300, 29300, 19500, 12800] } },
  { iso3: "CHN", name: "China", series: {
    cases_per_million: [70, 46, 7, 0, 0],
    mcv1_coverage: [98, 85, 99, 99, 95],
    cases: [80000, 58000, 9900, 580, 380] } },
  { iso3: "PAK", name: "Pakistan", series: {
    cases_per_million: [155, 90, 36, 50, 47],
    mcv1_coverage: [50, 59, 80, 75, 82],
    cases: [16500, 12800, 6100, 11200, 11600] } },
  { iso3: "IDN", name: "Indonesia", series: {
    cases_per_million: [95, 38, 70, 10, 4],
    mcv1_coverage: [58, 76, 78, 77, 91],
    cases: [17300, 8100, 17000, 2700, 1200] } },
  { iso3: "BGD", name: "Bangladesh", series: {
    cases_per_million: [175, 60, 10, 4, 15],
    mcv1_coverage: [65, 74, 94, 97, 93],
    cases: [18500, 7900, 1500, 680, 2600] } },
  { iso3: "PHL", name: "Philippines", series: {
    cases_per_million: [130, 33, 10, 440, 18],
    mcv1_coverage: [85, 79, 80, 68, 81],
    cases: [8200, 2600, 960, 48500, 2100] } },
  { iso3: "AFG", name: "Afghanistan", series: {
    cases_per_million: [320, 175, 110, 200, 260],
    mcv1_coverage: [20, 27, 62, 64, 70],
    cases: [3900, 3500, 3200, 7700, 11000] } },
  { iso3: "YEM", name: "Yemen", series: {
    cases_per_million: [280, 130, 55, 210, 830],
    mcv1_coverage: [49, 71, 60, 66, 67],
    cases: [3400, 2300, 1300, 6400, 31406] } },
  { iso3: "JPN", name: "Japan", series: {
    cases_per_million: [40, 3, 6, 6, 0],
    mcv1_coverage: [73, 96, 95, 98, 98],
    cases: [4900, 380, 740, 740, 28] } },
  { iso3: "KAZ", name: "Kazakhstan", series: {
    cases_per_million: [85, 14, 9, 120, 700],
    mcv1_coverage: [86, 99, 99, 98, 95],
    cases: [1400, 220, 150, 2300, 13800] } },
  { iso3: "DEU", name: "Germany", series: {
    cases_per_million: [60, 7, 9, 6, 0],
    mcv1_coverage: [85, 91, 96, 97, 96],
    cases: [4700, 580, 780, 500, 23] } },
  { iso3: "FRA", name: "France", series: {
    cases_per_million: [75, 17, 8, 40, 1],
    mcv1_coverage: [71, 84, 90, 90, 95],
    cases: [4300, 1000, 520, 2700, 83] } },
  { iso3: "GBR", name: "United Kingdom", series: {
    cases_per_million: [22, 2, 6, 3, 6],
    mcv1_coverage: [87, 88, 89, 92, 89],
    cases: [1300, 100, 380, 200, 380] } },
  { iso3: "ITA", name: "Italy", series: {
    cases_per_million: [90, 9, 15, 27, 1],
    mcv1_coverage: [43, 74, 90, 94, 94],
    cases: [5100, 520, 890, 1600, 43] } },
  { iso3: "UKR", name: "Ukraine", series: {
    cases_per_million: [55, 76, 1, 130, 7],
    mcv1_coverage: [90, 99, 56, 93, 85],
    cases: [2800, 3700, 45, 5600, 250] } },
  { iso3: "RUS", name: "Russia", series: {
    cases_per_million: [160, 22, 0, 30, 9],
    mcv1_coverage: [84, 97, 98, 97, 97],
    cases: [23700, 3200, 60, 4400, 1300] } },
  { iso3: "USA", name: "United States", series: {
    cases_per_million: [110, 0, 0, 4, 0],
    mcv1_coverage: [90, 91, 92, 92, 92],
    cases: [27800, 86, 63, 1274, 59] } },
  { iso3: "CAN", name: "Canada", series: {
    cases_per_million: [45, 6, 2, 3, 0],
    mcv1_coverage: [85, 96, 93, 90, 92],
    cases: [1200, 200, 99, 113, 12] } },
  { iso3: "MEX", name: "Mexico", series: {
    cases_per_million: [730, 0, 0, 1, 0],
    mcv1_coverage: [75, 96, 95, 99, 99],
    cases: [62000, 30, 0, 180, 7] } },
  { iso3: "BRA", name: "Brazil", series: {
    cases_per_million: [425, 4, 0, 91, 0],
    mcv1_coverage: [78, 99, 99, 93, 96],
    cases: [62000, 700, 68, 19300, 12] } },
  { iso3: "ARG", name: "Argentina", series: {
    cases_per_million: [60, 1, 0, 4, 0],
    mcv1_coverage: [93, 99, 95, 91, 94],
    cases: [1900, 40, 3, 180, 0] } },
  { iso3: "AUS", name: "Australia", series: {
    cases_per_million: [55, 6, 3, 9, 1],
    mcv1_coverage: [86, 91, 94, 95, 94],
    cases: [950, 110, 70, 240, 26] } },
  { iso3: "PNG", name: "Papua New Guinea", series: {
    cases_per_million: [240, 110, 30, 35, 55],
    mcv1_coverage: [67, 62, 56, 37, 46],
    cases: [1000, 600, 200, 310, 540] } },
];
```

- [ ] **Step 2: Wire it into the dataset**

At the top of `lib/data/datasets.ts`, add the import:

```ts
import { measlesYears, measlesMetrics, measlesCountryStats } from "./country-stats/measles";
```

Inside the `measles` dataset object, directly after its `previewRows` array:

```ts
    countryYears: measlesYears,
    countryMetrics: measlesMetrics,
    countryStats: measlesCountryStats,
    countrySourceNote: "WHO / WUENIC · illustrative country sample",
```

- [ ] **Step 3: Verify every country joins to a shape**

An unmatched ISO code silently vanishes from the map, so this check is not optional.

```bash
node -e "Promise.all([import('./lib/data/world-geo.ts'),import('./lib/data/country-stats/measles.ts')]).then(([g,m])=>{const ids=new Set(g.worldShapes.map(s=>s.id));console.log('countries',m.measlesCountryStats.length);console.log('unmatched',m.measlesCountryStats.filter(s=>!ids.has(s.iso3)).map(b=>b.iso3));console.log('wrong-length',m.measlesCountryStats.filter(s=>Object.values(s.series).some(a=>a.length!==m.measlesYears.length)).map(w=>w.iso3));})"
```

Expected: `countries 32`, `unmatched []`, `wrong-length []`.

- [ ] **Step 4: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; 12 tests still pass.

- [ ] **Step 5: Commit**

```bash
git add lib/data/country-stats/measles.ts lib/data/datasets.ts
git commit -m "feat(data): add measles country figures"
```

---

### Task 7: WHO child-mortality country figures

**Files:**
- Create: `lib/data/country-stats/who-health.ts`
- Modify: `lib/data/datasets.ts` (wire it into the `who-health` dataset)

**Interfaces:**
- Consumes: `CountryMetric`, `CountryStat` from `lib/data/datasets.ts`
- Produces: `whoYears: number[]`, `whoMetrics: CountryMetric[]`, `whoCountryStats: CountryStat[]`

Both metrics here are already rates, so unlike measles both are mappable and there is no disclosure-only column.

- [ ] **Step 1: Create the data module**

Create `lib/data/country-stats/who-health.ts`:

```ts
/**
 * Country-level child-mortality and life-expectancy figures for the map.
 *
 * ILLUSTRATIVE SAMPLE, exactly like `series` and `previewRows` in datasets.ts:
 * anchored to published WHO GHO and UN IGME values where those are known, and
 * plausibly interpolated where they are not. Do not cite these numbers.
 *
 * Both measures are already rates, so both are mappable.
 * Columnar: each array is one value per index of `whoYears`.
 */
import type { CountryMetric, CountryStat } from "../datasets";

export const whoYears = [1990, 2000, 2010, 2019, 2022];

export const whoMetrics: CountryMetric[] = [
  {
    key: "under5_mortality",
    label: "Under-5 mortality",
    unit: "per 1,000 live births",
    polarity: "higher-is-worse",
    breaks: [5, 15, 40, 80],
  },
  {
    key: "life_expectancy",
    label: "Life expectancy",
    unit: "years",
    polarity: "higher-is-better",
    breaks: [60, 67, 73, 79],
    decimals: 1,
  },
];

export const whoCountryStats: CountryStat[] = [
  { iso3: "NGA", name: "Nigeria", series: {
    under5_mortality: [213, 185, 137, 117, 107],
    life_expectancy: [46.1, 46.3, 51.3, 54.8, 53.6] } },
  { iso3: "ETH", name: "Ethiopia", series: {
    under5_mortality: [202, 143, 76, 50, 44],
    life_expectancy: [46.9, 51.9, 62.1, 67.8, 67.3] } },
  { iso3: "COD", name: "DR Congo", series: {
    under5_mortality: [186, 161, 111, 81, 76],
    life_expectancy: [48.0, 50.1, 56.5, 61.4, 62.4] } },
  { iso3: "EGY", name: "Egypt", series: {
    under5_mortality: [85, 47, 27, 21, 19],
    life_expectancy: [64.6, 68.6, 70.4, 71.9, 70.2] } },
  { iso3: "ZAF", name: "South Africa", series: {
    under5_mortality: [58, 74, 49, 34, 33],
    life_expectancy: [63.0, 55.9, 59.9, 65.6, 61.5] } },
  { iso3: "KEN", name: "Kenya", series: {
    under5_mortality: [99, 100, 59, 43, 38],
    life_expectancy: [57.7, 51.4, 62.6, 66.7, 63.7] } },
  { iso3: "TZA", name: "Tanzania", series: {
    under5_mortality: [165, 130, 75, 50, 45],
    life_expectancy: [50.9, 51.1, 61.0, 66.2, 66.9] } },
  { iso3: "SDN", name: "Sudan", series: {
    under5_mortality: [128, 106, 81, 59, 55],
    life_expectancy: [55.3, 59.1, 63.1, 65.3, 64.4] } },
  { iso3: "AGO", name: "Angola", series: {
    under5_mortality: [224, 204, 105, 73, 67],
    life_expectancy: [42.3, 46.5, 56.2, 62.2, 61.6] } },
  { iso3: "IND", name: "India", series: {
    under5_mortality: [126, 91, 58, 33, 29],
    life_expectancy: [58.5, 62.5, 67.0, 70.9, 67.2] } },
  { iso3: "CHN", name: "China", series: {
    under5_mortality: [54, 37, 16, 8, 7],
    life_expectancy: [68.9, 72.0, 75.2, 77.4, 78.6] } },
  { iso3: "PAK", name: "Pakistan", series: {
    under5_mortality: [139, 112, 89, 67, 62],
    life_expectancy: [60.1, 62.4, 65.1, 66.3, 66.4] } },
  { iso3: "IDN", name: "Indonesia", series: {
    under5_mortality: [84, 52, 33, 23, 21],
    life_expectancy: [62.6, 66.3, 68.4, 71.3, 68.3] } },
  { iso3: "BGD", name: "Bangladesh", series: {
    under5_mortality: [143, 88, 49, 30, 28],
    life_expectancy: [58.4, 65.4, 70.2, 73.6, 74.3] } },
  { iso3: "PHL", name: "Philippines", series: {
    under5_mortality: [57, 40, 31, 27, 25],
    life_expectancy: [65.3, 67.3, 68.6, 70.5, 69.3] } },
  { iso3: "AFG", name: "Afghanistan", series: {
    under5_mortality: [178, 130, 93, 62, 55],
    life_expectancy: [45.9, 55.0, 61.5, 63.6, 62.9] } },
  { iso3: "YEM", name: "Yemen", series: {
    under5_mortality: [122, 95, 60, 60, 58],
    life_expectancy: [57.6, 63.0, 67.1, 66.6, 63.8] } },
  { iso3: "JPN", name: "Japan", series: {
    under5_mortality: [6, 5, 3, 2, 2],
    life_expectancy: [78.8, 81.1, 82.9, 84.4, 84.0] } },
  { iso3: "KAZ", name: "Kazakhstan", series: {
    under5_mortality: [53, 44, 19, 10, 9],
    life_expectancy: [66.7, 64.9, 68.4, 73.2, 70.5] } },
  { iso3: "DEU", name: "Germany", series: {
    under5_mortality: [9, 5, 4, 4, 4],
    life_expectancy: [75.3, 78.2, 80.1, 81.3, 80.7] } },
  { iso3: "FRA", name: "France", series: {
    under5_mortality: [9, 5, 4, 4, 4],
    life_expectancy: [76.9, 79.1, 81.7, 82.9, 82.3] } },
  { iso3: "GBR", name: "United Kingdom", series: {
    under5_mortality: [10, 7, 5, 4, 4],
    life_expectancy: [75.7, 77.9, 80.4, 81.3, 80.4] } },
  { iso3: "ITA", name: "Italy", series: {
    under5_mortality: [9, 6, 4, 3, 3],
    life_expectancy: [77.1, 79.8, 82.0, 83.4, 82.8] } },
  { iso3: "UKR", name: "Ukraine", series: {
    under5_mortality: [19, 17, 11, 8, 7],
    life_expectancy: [70.1, 67.9, 70.3, 73.0, 68.6] } },
  { iso3: "RUS", name: "Russia", series: {
    under5_mortality: [22, 23, 12, 6, 5],
    life_expectancy: [68.9, 65.3, 68.9, 73.2, 69.4] } },
  { iso3: "USA", name: "United States", series: {
    under5_mortality: [11, 8, 7, 6, 6],
    life_expectancy: [75.3, 76.6, 78.5, 78.8, 76.4] } },
  { iso3: "CAN", name: "Canada", series: {
    under5_mortality: [8, 6, 5, 5, 4],
    life_expectancy: [77.4, 79.2, 81.2, 82.2, 81.7] } },
  { iso3: "MEX", name: "Mexico", series: {
    under5_mortality: [46, 27, 18, 14, 13],
    life_expectancy: [70.8, 74.1, 74.4, 75.1, 70.2] } },
  { iso3: "BRA", name: "Brazil", series: {
    under5_mortality: [62, 35, 19, 14, 14],
    life_expectancy: [65.3, 70.1, 73.4, 75.9, 72.8] } },
  { iso3: "ARG", name: "Argentina", series: {
    under5_mortality: [28, 20, 14, 9, 8],
    life_expectancy: [71.6, 74.1, 75.6, 76.6, 75.4] } },
  { iso3: "AUS", name: "Australia", series: {
    under5_mortality: [9, 6, 5, 4, 4],
    life_expectancy: [77.0, 79.6, 81.9, 83.0, 83.2] } },
  { iso3: "PNG", name: "Papua New Guinea", series: {
    under5_mortality: [89, 74, 56, 45, 42],
    life_expectancy: [57.5, 62.0, 64.5, 65.6, 65.4] } },
];
```

- [ ] **Step 2: Wire it into the dataset**

At the top of `lib/data/datasets.ts`, add:

```ts
import { whoYears, whoMetrics, whoCountryStats } from "./country-stats/who-health";
```

Inside the `who-health` dataset object, directly after its `previewRows` array:

```ts
    countryYears: whoYears,
    countryMetrics: whoMetrics,
    countryStats: whoCountryStats,
    countrySourceNote: "WHO Global Health Observatory / UN IGME · illustrative country sample",
```

- [ ] **Step 3: Verify the join and the array lengths**

```bash
node -e "Promise.all([import('./lib/data/world-geo.ts'),import('./lib/data/country-stats/who-health.ts')]).then(([g,w])=>{const ids=new Set(g.worldShapes.map(s=>s.id));console.log('countries',w.whoCountryStats.length);console.log('unmatched',w.whoCountryStats.filter(s=>!ids.has(s.iso3)).map(b=>b.iso3));console.log('wrong-length',w.whoCountryStats.filter(s=>Object.values(s.series).some(a=>a.length!==w.whoYears.length)).map(x=>x.iso3));})"
```

Expected: `countries 32`, `unmatched []`, `wrong-length []`.

- [ ] **Step 4: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/data/country-stats/who-health.ts lib/data/datasets.ts
git commit -m "feat(data): add WHO child-mortality country figures"
```

---

### Task 8: The CountryMap component

The only file that renders. It contains no dataset-specific knowledge — it draws whatever metrics it is handed.

**Files:**
- Create: `components/charts/country-map.tsx`

**Interfaces:**
- Consumes: `WORLD_VIEWBOX`, `worldShapes` from `lib/data/world-geo.ts`; `binOf`, `formatValue`, `legendLabels`, `valueAt`, `statsByIso` from `lib/charts/choropleth.ts`; `rampFor`, `noDataStroke`, `countryStroke`, plus existing tokens from `lib/charts/tokens.ts`; `CountryMetric`, `CountryStat` from `lib/data/datasets.ts`
- Produces:
  ```ts
  export function CountryMap(props: {
    years: number[];
    metrics: CountryMetric[];
    stats: CountryStat[];
    sourceNote?: string;
    compact?: boolean;
    showTable?: boolean;
  }): React.ReactElement | null;
  ```

Design rules this component must honour, all from the spec:
- Returns `null` when there is nothing to draw, so call sites never guard.
- Bins come from `binOf(value, metric.breaks)` only — never from the visible year's value range.
- No-data is `fill: surface` plus a hatch `<pattern>`, never a pale fill.
- Every country is focusable and carries an `aria-label`.
- Play button is not rendered under `prefers-reduced-motion: reduce`.

- [ ] **Step 1: Create the component**

Create `components/charts/country-map.tsx`:

```tsx
"use client";

/**
 * G15 - the country choropleth.
 *
 * Generic by construction: it renders whatever metrics the dataset declares and
 * knows nothing about measles or child mortality. If it is handed no country
 * data it renders nothing, so `app/datasets/page.tsx` and the comparison step
 * can both call it unconditionally.
 *
 * Two rules carry the honesty of this figure:
 *
 *  1. Bins come from the metric's declared `breaks` and nothing else. If they
 *     were recomputed per visible year, scrubbing would recolour a country
 *     whose own figure had not moved - the animated cousin of the dual-axis
 *     defect kept as an exhibit in `dataset-chart.tsx`.
 *  2. "No data" is a hatch, not a pale fill. The palest bin sits at 1.13
 *     contrast against the surface and a pale grey scores 1.04 against it, so
 *     a grey fill would read as a low value rather than as an absent one.
 *
 * The geometry is an Equal Earth projection, generated at build time by
 * `scripts/build-world-map.mjs`. Mercator is never used: it inflates
 * high-latitude countries 3-14x, misstating the quantity the colour encodes.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { WORLD_VIEWBOX, worldShapes } from "@/lib/data/world-geo";
import type { CountryMetric, CountryStat } from "@/lib/data/datasets";
import { binOf, formatValue, legendLabels, statsByIso, valueAt } from "@/lib/charts/choropleth";
import * as t from "@/lib/charts/tokens";

/** One frame per this many ms while playing. */
const FRAME_MS = 900;

interface HoverState {
  iso3: string;
  name: string;
  x: number;
  y: number;
}

export function CountryMap({
  years,
  metrics,
  stats,
  sourceNote,
  compact = false,
  showTable = true,
}: {
  years: number[];
  metrics: CountryMetric[];
  stats: CountryStat[];
  sourceNote?: string;
  /** Drop the heading where the surrounding card already names the data. */
  compact?: boolean;
  showTable?: boolean;
}) {
  const mappable = useMemo(() => metrics.filter((m) => m.mappable !== false), [metrics]);
  const [metricKey, setMetricKey] = useState(() => mappable[0]?.key ?? "");
  const [yearIndex, setYearIndex] = useState(() => Math.max(0, years.length - 1));
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const patternId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!playing || years.length < 2) return;
    const id = window.setInterval(() => setYearIndex((i) => (i + 1) % years.length), FRAME_MS);
    return () => window.clearInterval(id);
  }, [playing, years.length]);

  const byIso = useMemo(() => statsByIso(stats), [stats]);
  const metric = mappable.find((m) => m.key === metricKey) ?? mappable[0];

  /* The one guard both call sites rely on. */
  if (!stats.length || !metric || !years.length) return null;

  const ramp = t.rampFor(metric.polarity);
  const labels = legendLabels(metric.breaks, metric.decimals ?? 0);
  const year = years[yearIndex];
  const hovered = hover ? byIso.get(hover.iso3) : undefined;
  const anyValueThisYear = stats.some((s) => valueAt(s, metric.key, yearIndex) !== null);

  return (
    <figure className="m-0">
      {!compact && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-ink">{metric.label} by country</span>
          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-faint">{year}</span>
        </div>
      )}

      {/* ── Metric toggle. Hidden when the dataset declares only one map layer. */}
      {mappable.length > 1 && (
        <div role="group" aria-label="Metric" className="mb-3 flex flex-wrap gap-1.5">
          {mappable.map((m) => {
            const on = m.key === metric.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetricKey(m.key)}
                aria-pressed={on}
                className={`rounded-lg border px-2.5 py-1 text-[0.72rem] transition-colors ${
                  on
                    ? "border-navy bg-navy text-white"
                    : "border-hairline bg-surface text-muted hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── The map. */}
      <div ref={wrapRef} className="relative" onMouseLeave={() => setHover(null)}>
        <svg
          viewBox={WORLD_VIEWBOX}
          className="block h-auto w-full"
          role="img"
          aria-label={`${metric.label} by country, ${year}. ${stats.length} countries with data.`}
        >
          <defs>
            <pattern
              id={`nodata-${patternId}`}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill={t.surface} />
              <line x1="0" y1="0" x2="0" y2="6" stroke={t.noDataStroke} strokeWidth="1.4" />
            </pattern>
          </defs>

          {worldShapes.map((shape) => {
            const stat = byIso.get(shape.id);
            const value = stat ? valueAt(stat, metric.key, yearIndex) : null;
            const bin = binOf(value, metric.breaks);
            const name = stat?.name ?? shape.name;
            const hasData = bin !== null;
            return (
              <path
                key={shape.id}
                d={shape.d}
                fill={hasData ? ramp[bin] : `url(#nodata-${patternId})`}
                stroke={hover?.iso3 === shape.id ? t.navy : t.countryStroke}
                strokeWidth={hover?.iso3 === shape.id ? 3 : 1}
                tabIndex={hasData ? 0 : -1}
                role={hasData ? "button" : undefined}
                aria-label={
                  hasData
                    ? `${name}, ${metric.label} ${formatValue(value, metric.decimals ?? 0)} ${metric.unit}, ${year}`
                    : `${name}, no data`
                }
                className="outline-none transition-[fill] duration-500"
                onMouseMove={(e) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  if (!box) return;
                  setHover({ iso3: shape.id, name, x: e.clientX - box.left, y: e.clientY - box.top });
                }}
                onFocus={(e) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  const own = e.currentTarget.getBoundingClientRect();
                  if (!box) return;
                  setHover({
                    iso3: shape.id,
                    name,
                    x: own.left - box.left + own.width / 2,
                    y: own.top - box.top,
                  });
                }}
                onBlur={() => setHover(null)}
              />
            );
          })}
        </svg>

        {hover && hovered && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[15rem] -translate-x-1/2 -translate-y-full rounded-xl border border-hairline bg-surface/95 px-3 py-2.5 text-xs shadow-lg backdrop-blur"
            style={{ left: hover.x, top: hover.y - 8 }}
            role="status"
          >
            <p className="font-mono text-[0.7rem] font-semibold text-navy">
              {hovered.name} <span className="text-faint">· {year}</span>
            </p>
            <div className="mt-2 space-y-1.5">
              {metrics.map((m) => (
                <div key={m.key} className="flex items-center gap-3">
                  <span className="text-muted">{m.label}</span>
                  <span className="ml-auto font-mono font-medium text-ink [font-variant-numeric:tabular-nums]">
                    {formatValue(valueAt(hovered, m.key, yearIndex), m.decimals ?? 0)}
                    <span className="ml-1 text-faint">{m.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Year scrubber. */}
      {years.length > 1 && (
        <div className="mt-3 flex items-center gap-3">
          {!reduceMotion && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause the year animation" : "Play the year animation"}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-hairline bg-surface text-muted transition-colors hover:text-ink"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}
          <input
            type="range"
            min={0}
            max={years.length - 1}
            step={1}
            value={yearIndex}
            onChange={(e) => {
              setPlaying(false);
              setYearIndex(Number(e.target.value));
            }}
            aria-label="Year"
            aria-valuetext={String(year)}
            className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-hairline accent-navy"
          />
          <span className="w-10 shrink-0 text-right font-mono text-[0.7rem] text-ink [font-variant-numeric:tabular-nums]">
            {year}
          </span>
        </div>
      )}

      {/* ── Legend. Bin edges, then the no-data swatch. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-end gap-0">
          {ramp.map((c, i) => (
            <div key={c} className="flex flex-col items-start">
              <span className="block h-3 w-9" style={{ background: c }} />
              <span className="mt-1 font-mono text-[0.6rem] text-faint">{labels[i]}</span>
            </div>
          ))}
          <span className="ml-2 self-start font-mono text-[0.6rem] text-faint">{metric.unit}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="16" height="12" aria-hidden="true">
            <rect width="16" height="12" fill={`url(#nodata-${patternId})`} stroke={t.countryStroke} />
          </svg>
          <span className="font-mono text-[0.6rem] text-faint">no data</span>
        </div>
      </div>

      {!anyValueThisYear && (
        <p className="mt-2 text-[0.7rem] text-muted">No country reported {metric.label} in {year}.</p>
      )}

      {sourceNote && <p className="mt-2 font-mono text-[0.6rem] text-faint">{sourceNote}</p>}

      {showTable && (
        <CountryTable metrics={metrics} stats={stats} metricKey={metric.key} yearIndex={yearIndex} year={year} />
      )}
    </figure>
  );
}

/** The table-view twin every chart owes under the chart contract (item 7). */
function CountryTable({
  metrics,
  stats,
  metricKey,
  yearIndex,
  year,
}: {
  metrics: CountryMetric[];
  stats: CountryStat[];
  metricKey: string;
  yearIndex: number;
  year: number;
}) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(
    () =>
      [...stats].sort((a, b) => (valueAt(b, metricKey, yearIndex) ?? -Infinity) - (valueAt(a, metricKey, yearIndex) ?? -Infinity)),
    [stats, metricKey, yearIndex],
  );

  return (
    <div className="mt-3 border-t border-hairline pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[0.65rem] uppercase tracking-wider text-faint transition-colors hover:text-muted"
        aria-expanded={open}
      >
        {open ? "Hide table" : "Show as table"}
      </button>
      {open && (
        <div className="scroll-slim mt-2 max-h-56 overflow-auto">
          <table className="w-full border-collapse text-left text-xs">
            <caption className="sr-only">Country figures for {year}</caption>
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-hairline">
                <th className="py-1.5 pr-4 font-medium text-muted">Country</th>
                {metrics.map((m) => (
                  <th key={m.key} className="py-1.5 pr-4 font-medium text-muted">
                    {m.label} <span className="text-faint">({m.unit})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono [font-variant-numeric:tabular-nums]">
              {rows.map((s) => (
                <tr key={s.iso3} className="border-b border-hairline/60">
                  <td className="py-1.5 pr-4 text-ink">{s.name}</td>
                  {metrics.map((m) => (
                    <td key={m.key} className="py-1.5 pr-4 text-ink">
                      {formatValue(valueAt(s, m.key, yearIndex), m.decimals ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Confirm no hex literal slipped in**

```bash
grep -nE "#[0-9a-fA-F]{3,8}\b" components/charts/country-map.tsx || echo "clean - no hex literals"
```

Expected: `clean - no hex literals`. Every colour must come through `t.*`.

- [ ] **Step 4: Commit**

```bash
git add components/charts/country-map.tsx
git commit -m "feat(charts): add the generic country choropleth

Renders whatever metrics the dataset declares and returns null when handed
none, so both call sites can render it unconditionally. Bins come from the
metric's declared breaks alone, which is what lets the year scrubber animate
without recolouring a country whose own figure did not move."
```

---

### Task 9: Render it on both pages

**Files:**
- Modify: `app/datasets/page.tsx`
- Modify: `components/generate/comparison.tsx`

**Interfaces:**
- Consumes: `CountryMap` from `components/charts/country-map.tsx`
- Produces: nothing

Both call sites render unconditionally and rely on the component's own `null`. Do not add `countryStats?.length` checks — that duplicates the rule the component already owns.

- [ ] **Step 1: Add the map to the datasets page**

In `app/datasets/page.tsx`, add the import beside the other chart imports:

```tsx
import { CountryMap } from "@/components/charts/country-map";
```

In `DatasetBlock`, inside the `<Card>`, replace the closing explanatory paragraph block so the map sits between the chart and that note. The card body becomes:

```tsx
        <StoryChart dataset={dataset} height={340} />

        {dataset.countryYears && dataset.countryMetrics && dataset.countryStats && (
          <div className="mt-5 border-t border-hairline pt-5">
            <CountryMap
              years={dataset.countryYears}
              metrics={dataset.countryMetrics}
              stats={dataset.countryStats}
              sourceNote={dataset.countrySourceNote}
            />
          </div>
        )}

        <p className="mt-4 border-t border-hairline pt-4 text-xs leading-relaxed text-muted">
          Two panels on one timeline rather than two y-axes on one plot: a dual axis lets the
          two lines be slid into any apparent relationship, which is the inference our own
          fact-checker flags the model for making.
        </p>
```

The `&&` here is a TypeScript narrowing requirement, not a duplicate guard — the three props are optional on `Dataset`, so they must be narrowed before being passed. The component still owns the empty-data rule.

- [ ] **Step 2: Add the map to the comparison step**

In `components/generate/comparison.tsx`, add the import beside the other chart imports:

```tsx
import { CountryMap } from "@/components/charts/country-map";
```

Then, inside the existing "The data all three stories describe" card, directly after `<StoryChart dataset={dataset} height={300} />`:

```tsx
        {dataset.countryYears && dataset.countryMetrics && dataset.countryStats && (
          <div className="mt-5 border-t border-hairline pt-5">
            <CountryMap
              years={dataset.countryYears}
              metrics={dataset.countryMetrics}
              stats={dataset.countryStats}
              sourceNote={dataset.countrySourceNote}
              compact
            />
          </div>
        )}
```

- [ ] **Step 3: Build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; `✓ Compiled successfully`; all 9 routes prerendered.

- [ ] **Step 4: Check the map in a browser**

Run: `npm run dev`, then open `http://localhost:3000/datasets`.

Confirm, for **both** dataset blocks:

1. A world map renders below each line chart.
2. The 32 listed countries are coloured; every other country shows the diagonal hatch and reads as absent, not as a low value.
3. The metric toggle switches ramps: **MCV1 coverage / life expectancy ramp teal** (higher is better) and **case rate / under-5 mortality ramp red** (higher is worse). If a high-coverage country renders red, `polarity` is wrong.
4. Drag the scrubber. Colours change. Then check the fixed-breaks rule directly: Germany's `under5_mortality` is `4` at 2019 and `4` at 2022 — its colour must be **identical** at both years. If it shifts, breaks are being recomputed and Task 4's rule has been violated.
5. Hover a country: the tooltip lists every metric, including the non-mappable raw `cases` on the measles map.
6. Press Tab into the map: focus moves country to country and the tooltip follows focus.
7. Click "Show as table": rows appear, sorted by the active metric, matching the visible year.
8. Play/pause advances the years and loops.

Then open `http://localhost:3000/generate`, run through to the comparison step, and confirm the map appears in the shared-data card in its `compact` form.

- [ ] **Step 5: Check it at 360 px wide**

In DevTools, set the viewport to 360 px. Confirm the page does not scroll horizontally on `/datasets` and that the metric toggle wraps above the scrubber rather than overflowing.

- [ ] **Step 6: Commit**

```bash
git add app/datasets/page.tsx components/generate/comparison.tsx
git commit -m "feat(viz): put a country map beside both datasets

The datasets are country x year tables, but the interface only ever showed the
world aggregate. The map appears on the datasets page and in the comparison
step's shared-data card, and stays absent for any dataset with no country data."
```

---

### Task 10: Final verification and docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run everything**

```bash
npm test
npx tsc --noEmit
npm run build
npx eslint . --max-warnings=0
```

Expected: 12 tests pass; no type errors; build succeeds; lint clean. Give ESLint up to 5 minutes.

- [ ] **Step 2: Re-check the size budget**

```bash
node -e "console.log((require('fs').statSync('lib/data/world-geo.ts').size/1024).toFixed(1)+' KB')"
```

Expected: `93.2 KB`, and in all cases under 120 KB.

- [ ] **Step 3: Update the README**

In the "Project structure" block, add the two new entries under `lib/`:

```
  charts/               Chart tokens + pure choropleth logic
  data/country-stats/   Per-country figures backing the maps
scripts/                One-shot build tools (world map geometry)
```

In the "Tech" paragraph, append to the end of the existing sentence about the stack:

```
Country maps are plain inline SVG on an Equal Earth projection, generated at
build time by `scripts/build-world-map.mjs` — no map library ships to the browser.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(README): note the country maps and the geometry build step"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
| --- | --- |
| `scripts/build-world-map.mjs`, Equal Earth, devDependencies | 2 |
| `lib/data/world-geo.ts`, 120 KB budget | 2, 10 |
| `CountryMetric` / `CountryStat` / optional `Dataset` fields | 5 |
| Measles country data, non-mappable raw counts | 6 |
| WHO country data, both metrics mappable | 7 |
| `CountryMap`, returns `null`, metric toggle, scrubber, ramps, hatch, a11y, legend, table twin | 8 |
| Datasets page + comparison integration | 9 |
| Error/edge-case table (no stats, null year, unmatched iso3, clamping, all-null year, SSR) | 4 (logic) + 8 (render) + 9 (browser checks) |
| Testing checklist items 1–9 | 9, 10 |

**Deviations from the spec, and why**

1. **Country data lives in `lib/data/country-stats/*.ts`, not in `datasets.ts`.** That file is 131 readable lines today and would exceed 1,000. The spec named `datasets.ts` for the *types*, which is where they stay.
2. **32 countries, not ~45.** Chosen for landmass coverage rather than count — the set includes every large landmass, which is what makes the map read. Adding more is purely additive to `country-stats/*.ts`.
3. **`"type": "module"` in `package.json` and `allowImportingTsExtensions` in `tsconfig.json`** (Task 1). Not in the spec. Together they are what make zero-dependency native TypeScript unit tests possible. Both were verified against this project: a full `npm run build` passes with `"type": "module"`, and without `allowImportingTsExtensions` the build fails with `TS5097`. Task 1 carries an explicit rollback if lint disagrees.
4. **`i18n-iso-countries` is a fourth devDependency.** The spec assumed `world-atlas` carried ISO alpha-3 ids; it carries UN M49 numeric codes instead, and three territories carry none at all.

**Placeholder scan:** none — every code step carries its full content, every verification step carries its command and expected output.

**Type consistency:** `binOf`, `formatValue`, `legendLabels`, `valueAt`, `statsByIso` are defined in Task 4 and used with those exact names and signatures in Task 8. `rampFor` / `noDataStroke` / `countryStroke` are defined in Task 3 and used in Task 8. `measlesYears` / `measlesMetrics` / `measlesCountryStats` and the `who*` triple are defined in Tasks 6 and 7 and consumed by the `Dataset` fields added in Task 5. `WorldShape.id` (Task 2) joins to `CountryStat.iso3` (Task 5) and the join is asserted in Tasks 6 and 7.
