import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHART_CATALOG,
  EXAMPLE_FRAME,
  VISUALIZATION_NAMES,
  allJsonSchemas,
  catalogByJob,
  jsonSchemaFor,
} from "./catalog.ts";
import { CHART_FORMS, CHART_PRESETS, FORM_RULES } from "./spec.ts";
import { validateSpec } from "./validate.ts";

/* ── Completeness ────────────────────────────────────────────────────────── */

test("every geometry has a catalog entry, and none has a stray one", () => {
  assert.deepEqual(Object.keys(CHART_CATALOG).sort(), [...CHART_FORMS].sort());
});

test("there are 17 geometries and 24 names to ask for", () => {
  // 17 geometries, plus 7 names that are a geometry wearing a modifier:
  // indexedLine, emphasisLine, smallMultiples, stackedArea, stackedArea100,
  // rankedBar and divergingBar, minus the geometries those already covered.
  assert.equal(CHART_FORMS.length, 17);
  assert.equal(VISUALIZATION_NAMES.length, 24);
});

test("every entry carries prose a reader could act on", () => {
  for (const entry of Object.values(CHART_CATALOG)) {
    assert.ok(entry.label.length > 2, `${entry.form} has no label`);
    assert.ok(entry.description.length > 20, `${entry.form} has no description`);
    assert.ok(entry.useWhen.length > 20, `${entry.form} has no useWhen`);
  }
});

test("every name resolves to a real geometry and explains what it supplies", () => {
  for (const v of VISUALIZATION_NAMES) {
    assert.ok(CHART_FORMS.includes(v.form), `${v.name} resolves to unknown form ${v.form}`);
    assert.ok(v.description.length > 20, `${v.name} has no description`);
    assert.ok(v.supplies.length > 10, `${v.name} does not say what it supplies`);
  }
});

test("every preset appears under exactly one geometry's entry", () => {
  const listed = Object.values(CHART_CATALOG).flatMap((e) => e.presets);
  assert.deepEqual(listed.sort(), Object.keys(CHART_PRESETS).sort());
});

/* ── The examples are the proof ──────────────────────────────────────────── */

test("EVERY documented example is a valid spec against EXAMPLE_FRAME", () => {
  // This is what makes the catalog trustworthy: the object shape it documents
  // is not prose about the shape, it is a shape that provably renders.
  for (const entry of Object.values(CHART_CATALOG)) {
    const result = validateSpec(entry.example, EXAMPLE_FRAME);
    assert.equal(
      result.ok,
      true,
      `${entry.form} example is invalid: ${result.errors.join(" | ")}`,
    );
  }
});

test("every example declares the form it is filed under", () => {
  for (const [form, entry] of Object.entries(CHART_CATALOG)) {
    assert.equal(entry.example.form, form);
  }
});

test("every example states a rationale, because the schema requires one", () => {
  for (const entry of Object.values(CHART_CATALOG)) {
    assert.ok(entry.example.rationale.length > 30, `${entry.form} rationale is too thin`);
  }
});

/* ── Derivation, so the catalog cannot drift from the validator ──────────── */

test("channels are derived from FORM_RULES, never retyped", () => {
  for (const entry of Object.values(CHART_CATALOG)) {
    const rule = FORM_RULES[entry.form];
    const required = entry.channels.filter((c) => c.required).map((c) => c.channel);
    const optional = entry.channels.filter((c) => !c.required).map((c) => c.channel);
    assert.deepEqual(required, rule.required, `${entry.form} required channels drifted`);
    assert.deepEqual(optional, rule.optional, `${entry.form} optional channels drifted`);
  }
});

test("modifiers are derived from FORM_RULES too", () => {
  for (const entry of Object.values(CHART_CATALOG)) {
    assert.deepEqual(entry.modifiers, FORM_RULES[entry.form].allows);
  }
});

test("catalogByJob covers every entry exactly once", () => {
  const grouped = Object.values(catalogByJob()).flat();
  assert.equal(grouped.length, CHART_FORMS.length);
});

/* ── The machine-readable shape ──────────────────────────────────────────── */

test("a form's schema exposes only the modifiers it honours", () => {
  const line = jsonSchemaFor("line").properties as Record<string, unknown>;
  // A line chart has no stack, so a model given this schema cannot emit one.
  assert.equal("stack" in line, false);
  assert.equal("emphasis" in line, true);

  const area = jsonSchemaFor("area").properties as Record<string, unknown>;
  assert.equal("stack" in area, true);
});

test("a form's encoding schema requires exactly what the validator requires", () => {
  for (const form of CHART_FORMS) {
    const schema = jsonSchemaFor(form).properties as Record<string, { required?: string[] }>;
    assert.deepEqual(schema.encoding.required, FORM_RULES[form].required, form);
  }
});

test("no schema admits a channel its form does not use", () => {
  for (const form of CHART_FORMS) {
    const encoding = (jsonSchemaFor(form).properties as Record<string, { properties: object }>)
      .encoding;
    const allowed = [...FORM_RULES[form].required, ...FORM_RULES[form].optional].sort();
    assert.deepEqual(Object.keys(encoding.properties).sort(), allowed, form);
  }
});

test("title and rationale are required on every form", () => {
  for (const form of CHART_FORMS) {
    const required = jsonSchemaFor(form).required as string[];
    assert.ok(required.includes("title"), form);
    assert.ok(required.includes("rationale"), form);
  }
});

test("a second value axis is unrepresentable: no schema admits one", () => {
  for (const form of CHART_FORMS) {
    const encoding = (jsonSchemaFor(form).properties as Record<string, { properties: object }>)
      .encoding;
    const keys = Object.keys(encoding.properties);
    assert.equal(keys.filter((k) => k === "y" || k === "y2").length <= 1, true, form);
    assert.equal(keys.includes("y2"), false, form);
  }
});

test("allJsonSchemas returns one schema per geometry", () => {
  assert.deepEqual(Object.keys(allJsonSchemas()).sort(), [...CHART_FORMS].sort());
});
