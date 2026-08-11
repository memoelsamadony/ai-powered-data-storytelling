import type { ChartFrame, ChartSpec } from "@/lib/charts/spec";

/**
 * What every form renderer receives.
 *
 * `frame` arrives PREPARED: `prepare()` has already applied the transform and
 * the sort, and the dispatcher has already sliced it to one facet. A renderer
 * therefore does no arithmetic on values and no filtering of rows. It positions
 * marks, and that is all.
 */
export interface FormProps {
  spec: ChartSpec;
  frame: ChartFrame;
  height: number;
}
