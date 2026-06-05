/**
 * Tiny className combiner. Filters out falsy values and joins with spaces.
 * Avoids an extra dependency; we control all class strings in this project.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

/** Format a large integer with thin-space-style grouping (e.g. 9 959). */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
