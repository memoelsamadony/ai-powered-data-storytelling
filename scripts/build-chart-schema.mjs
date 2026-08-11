/**
 * Emits `docs/chart-schema.json` from `lib/charts/catalog.ts`.
 *
 * The TypeScript catalog is canonical. This is the handover artifact: a single
 * JSON file the backend can read without a TypeScript toolchain, holding the
 * available names, a description of each, and the exact object shape every
 * chart form takes.
 *
 * Regenerate with:
 *   node --experimental-strip-types scripts/build-chart-schema.mjs
 *
 * It is generated rather than hand-maintained for the usual reason: a
 * hand-copied schema drifts from the validator that enforces it, and the drift
 * is invisible until something renders wrong.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  CHART_CATALOG,
  JOB_DESCRIPTION,
  MODIFIER_DOC,
  VISUALIZATION_NAMES,
  catalogByJob,
  jsonSchemaFor,
} from "../lib/charts/catalog.ts";
import { CHART_FORMS } from "../lib/charts/spec.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs", "chart-schema.json");

const doc = {
  $comment:
    "Generated from lib/charts/catalog.ts. Do not edit by hand. Regenerate: node --experimental-strip-types scripts/build-chart-schema.mjs",
  summary: {
    geometries: CHART_FORMS.length,
    names: VISUALIZATION_NAMES.length,
    note:
      "There are more names than geometries because several names are a geometry wearing a modifier: smallMultiples is any form + encoding.facet, stackedArea100 is area + stack:'percent', divergingBar is bar + baseline:0, bubble is scatter with size bound, kpiRow is a faceted statTile.",
  },

  /* 1. What can I ask for, and what is each one. */
  visualizations: VISUALIZATION_NAMES.map((v) => ({
    name: v.name,
    form: v.form,
    description: v.description,
    supplies: v.supplies,
  })),

  /* 2. The reader's job each geometry serves. The natural tool grouping. */
  jobs: Object.fromEntries(
    Object.entries(catalogByJob()).map(([job, entries]) => [
      job,
      {
        description: JOB_DESCRIPTION[job],
        forms: entries.map((e) => e.form),
      },
    ]),
  ),

  /* 3. The object shape, per geometry: prose, channels, modifiers, a worked
        example, and the machine-readable JSON Schema. */
  forms: Object.fromEntries(
    CHART_FORMS.map((form) => {
      const e = CHART_CATALOG[form];
      return [
        form,
        {
          label: e.label,
          job: e.job,
          description: e.description,
          useWhen: e.useWhen,
          avoidWhen: e.avoidWhen ?? null,
          maxSeries: e.maxSeries ?? null,
          names: e.presets,
          channels: e.channels,
          modifiers: e.modifiers.map((m) => ({
            name: m,
            values: MODIFIER_DOC[m].values,
            description: MODIFIER_DOC[m].description,
          })),
          example: e.example,
          jsonSchema: jsonSchemaFor(form),
        },
      ];
    }),
  ),

  /* 4. The frame that travels with every spec. */
  frame: {
    description:
      "The data, long format. One row per observation, never one column per series. Long is the contract because wide cannot describe 194 countries without naming 194 columns.",
    jsonSchema: {
      type: "object",
      required: ["columns", "rows"],
      properties: {
        columns: {
          type: "array",
          items: {
            type: "object",
            required: ["key", "label", "type"],
            properties: {
              key: { type: "string", description: "Matches the keys in every row." },
              label: { type: "string", description: "Shown on axes, legends, tooltips and the table." },
              type: {
                enum: ["quantitative", "temporal", "nominal", "geo"],
                description:
                  "temporal is distinct from quantitative because a year is orderable but its magnitude is meaningless: it must never be indexed or divided.",
              },
              unit: { type: "string" },
              decimals: { type: "integer" },
            },
          },
        },
        rows: {
          type: "array",
          description:
            "Each row maps column key to value. null means not reported, and never renders as zero.",
          items: { type: "object" },
        },
        sourceNote: { type: "string" },
      },
    },
  },
};

writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
console.log(
  `docs/chart-schema.json written: ${CHART_FORMS.length} forms, ${VISUALIZATION_NAMES.length} names.`,
);
