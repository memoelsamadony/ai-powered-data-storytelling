/**
 * Chart colour — the single source (FRONTEND_PLAN.md §2 item 2, defect D5).
 *
 * Chart components must import from here and never inline a hex literal, so a
 * palette change reaches every figure. Each value mirrors a token in
 * `app/globals.css`; the comment names its counterpart. They are duplicated as
 * literals rather than read from CSS at runtime because Recharts needs resolved
 * colours (and because the palette validator needs literals to check).
 *
 * ── Validation (dataviz `scripts/validate_palette.js`, light, surface #ffffff)
 *
 *   SERIES, all-pairs   #1e66b8, #e0392b, #0e8f86
 *     lightness PASS · chroma PASS · CVD ΔE 13.9 (deutan) · normal 16.2 · contrast PASS
 *
 *   SERIES pair (one hue, two shades) #1e66b8, #5a97dd
 *     CVD ΔE 15.5 (protan) · normal 15.6 · contrast PASS
 *     `#5a97dd` replaces `#9cc2e8`, which FAILED twice: L 0.80 (band 0.43–0.77)
 *     and C 0.068 (floor 0.10 — it read as gray), with contrast 1.86:1.
 *
 *   CATEGORICAL 4  #e0392b, #e8a33d, #0e8f86, #1e66b8
 *     all checks PASS; amber sits at 2.16:1, so anywhere it appears needs
 *     direct labels or a table view as relief.
 *
 *   STATUS is a fixed reserved scale, NOT a categorical palette. It is not held
 *   to the series ΔE bar — several status-vs-series pairs sit below it by
 *   design. The mitigation is that status always ships with an icon AND a text
 *   label, never colour alone (§2 item 3).
 *
 * Re-run before changing anything here:
 *   node scripts/validate_palette.js "<hex,…>" --mode light --surface "#ffffff"
 *
 * Theming note: the app is light-only by decision — `globals.css` defines one
 * token set with no `prefers-color-scheme` block (FRONTEND_PLAN.md §2).
 */

/* ── Surfaces & ink ─────────────────────────────────────────────────────── */
export const surface = "#ffffff"; // --color-surface
export const surfaceSoft = "#eef4f8"; // --color-surface-soft
export const ink = "#0f172a"; // --color-ink
export const muted = "#526173"; // --color-muted
export const faint = "#8493a5"; // --color-faint
export const navy = "#0d1b5c"; // --color-navy

/* ── Lines. Solid hairlines only; dashes are reserved for reference lines
      that mark a real threshold (§2 item 4, defect D4). ─────────────────── */
export const hairline = "#d9dfe7"; // --color-hairline
export const grid = "#e6ebf1"; // one step off surface, lighter than hairline

/* ── Series (identity) ──────────────────────────────────────────────────── */
export const alarm = "#e0392b"; // --color-alarm
export const calm = "#0e8f86"; // --color-deep-teal
export const brandBlue = "#1e66b8"; // --color-brand-blue
export const brandBlueLight = "#5a97dd"; // validated replacement for #9cc2e8
export const amber = "#e8a33d"; // needs label/table relief (2.16:1)

/** The three story variants, wherever they are plotted together. */
export const variant = {
  human: brandBlue,
  raw: alarm,
  moderated: calm,
} as const;

/** Diverging poles for tone. Warm ↔ cool, neutral-capable midpoint. */
export const tone = {
  alarmist: alarm,
  calibrated: calm,
  band: surfaceSoft,
} as const;

/* ── Status (reserved — fact-check state only, always with icon + label) ── */
export const status = {
  verified: "#0ca30c", // good
  corrected: "#fab219", // warning — the moderator changed a figure silently
  flagged: "#d03b3b", // critical
} as const;

export type StatusKey = keyof typeof status;

/* ── Shared chart chrome ────────────────────────────────────────────────── */
export const monoTick = {
  fontFamily: "var(--font-plex-mono)",
  fontSize: 11,
  fill: faint,
} as const;

/** Axis/grid props shared by every Recharts plot, so D4 cannot regress. */
export const gridProps = { stroke: grid, strokeDasharray: undefined } as const;
export const axisLineProps = { stroke: hairline } as const;
