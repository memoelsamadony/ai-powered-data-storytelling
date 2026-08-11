/**
 * /chart-preview — every geometry, drawn from real repo data.
 *
 * A development reference, not a product page. It exists to do the one thing a
 * typecheck cannot: put all seventeen renderers on screen at once so geometry
 * bugs (collided labels, overflow, a mark drawn off its axis) are visible.
 *
 * It also doubles as the target the backend can check its output against: every
 * figure below is a `ChartPayload` and nothing more, so anything that produces
 * one of these objects renders identically.
 *
 * Data is `lib/data/country-stats/measles.ts`, which is an ILLUSTRATIVE SAMPLE.
 * Do not cite the numbers.
 *
 * Delete this route and nothing else breaks. Nothing imports it.
 */

import type { Metadata } from "next";
import { Chart } from "@/components/charts/chart";
import { getDataset } from "@/lib/data/datasets";
import { countryFrameOf, topBy, whereRows, worldFrameOf } from "@/lib/charts/dataset-frame";
import { CHART_CATALOG } from "@/lib/charts/catalog";
import type { ChartForm, ChartPayload } from "@/lib/charts/spec";

export const metadata: Metadata = {
  title: "Chart forms",
  robots: { index: false, follow: false },
};

export default function ChartPreviewPage() {
  const measles = getDataset("measles");
  if (!measles) return null;

  const country = countryFrameOf(measles);
  const world = worldFrameOf(measles);

  const years = measles.countryYears ?? [];
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  const latest = whereRows(country, (r) => r.year === lastYear);
  const endpoints = whereRows(country, (r) => r.year === firstYear || r.year === lastYear);

  /* Which items survive a categorical cut is an editorial choice, so it is made
     here at the call site rather than folded silently inside a renderer. */
  const worst = topBy(country, "country", "cases_per_million", 12);
  const top4 = topBy(country, "country", "cases", 4);
  const top6 = topBy(country, "country", "cases", 6);
  const trio = topBy(country, "country", "cases_per_million", 3);

  const only = (names: string[]) => (r: { country?: unknown }) => names.includes(String(r.country));

  const figures: ChartPayload[] = [
    {
      spec: {
        form: "line",
        encoding: { x: "year", y: "value", color: "measure" },
        transform: "indexed",
        title: "Measles cases and MCV1 coverage, indexed",
        caption:
          "Both series read 100 at 1980, so they share one axis without either being rescaled to meet the other.",
        rationale:
          "The measures differ by four orders of magnitude. Indexing compares their rates of change; a second y-scale would let an arbitrary alignment invent a correlation.",
      },
      frame: world,
    },
    {
      spec: {
        form: "area",
        encoding: { x: "year", y: "cases", color: "country" },
        stack: "stacked",
        title: "Reported cases, four highest-count countries",
        rationale:
          "Part-to-whole over time, where the total and each country's contribution to it are both the point.",
      },
      frame: whereRows(country, only(top4)),
    },
    {
      spec: {
        form: "area",
        encoding: { x: "year", y: "cases", color: "country" },
        stack: "percent",
        title: "Share of reported cases",
        caption: "Bands sum to 100%, so this shows composition rather than volume.",
        rationale:
          "The question is who accounts for the total, not how big the total is, so the total is removed from the axis.",
      },
      frame: whereRows(country, only(top4)),
    },
    {
      spec: {
        form: "bar",
        encoding: { x: "country", y: "cases_per_million" },
        orientation: "horizontal",
        sort: { by: "y", order: "desc" },
        polarity: "higher-is-worse",
        title: `Incidence per million, ${lastYear}`,
        rationale:
          "Magnitude across named categories. Horizontal because country names do not fit beneath vertical bars.",
      },
      frame: whereRows(latest, only(worst)),
    },
    {
      spec: {
        form: "lollipop",
        encoding: { x: "country", y: "mcv1_coverage" },
        orientation: "horizontal",
        sort: { by: "y", order: "asc" },
        referenceLines: [{ value: 95, label: "~95% herd immunity", axis: "x" }],
        title: `Coverage against the herd-immunity threshold, ${lastYear}`,
        rationale:
          "The reader compares each value to a threshold rather than summing areas, so a filled bar would carry misleading weight.",
      },
      frame: whereRows(latest, only(worst)),
    },
    {
      spec: {
        form: "heatmap",
        encoding: { x: "year", y: "country", color: "cases_per_million" },
        polarity: "higher-is-worse",
        breaks: [1, 10, 50, 200],
        title: "Incidence per million, every country and year",
        rationale:
          "Two dimensions and one measure across 32 rows. Colour is the only channel that scales this far without seating a hue per country.",
      },
      frame: country,
    },
    {
      spec: {
        form: "dumbbell",
        encoding: { x: "year", y: "mcv1_coverage", color: "country" },
        title: `MCV1 coverage, ${firstYear} against ${lastYear}`,
        rationale:
          "Before and after per country, where the length of each gap is the finding. One hue in two shades, because the ends are one measure at two times.",
      },
      frame: whereRows(endpoints, only(worst)),
    },
    {
      spec: {
        form: "slope",
        encoding: { x: "year", y: "mcv1_coverage", color: "country" },
        title: "Which countries gained coverage, and which lost it",
        rationale:
          "Direction between two points across a few items. Crossing lines are the finding, and only this form shows them.",
      },
      frame: whereRows(endpoints, only(top6)),
    },
    {
      spec: {
        form: "bump",
        encoding: { x: "year", y: "cases", color: "country" },
        transform: "rank",
        title: "Rank by reported cases",
        caption: "Rank 1 is the highest count. A year with no reported figure has no rank.",
        rationale:
          "The finding is a change in order rather than in level, so the magnitudes are deliberately dropped.",
      },
      frame: whereRows(country, only(top6)),
    },
    {
      spec: {
        form: "scatter",
        encoding: { x: "mcv1_coverage", y: "cases_per_million", size: "cases" },
        title: `Coverage against incidence, sized by case count, ${lastYear}`,
        rationale:
          "The honest form for 'do these move together', stated as x against y rather than implied by aligning two y-scales.",
      },
      frame: latest,
    },
    {
      spec: {
        form: "connectedScatter",
        encoding: { x: "mcv1_coverage", y: "cases_per_million", color: "country" },
        title: "The path three countries took",
        rationale:
          "Time becomes the path rather than an axis, which is the only way to show a trajectory that doubles back.",
      },
      frame: whereRows(country, only(trio)),
    },
    {
      spec: {
        form: "parallelCoordinates",
        encoding: {
          measures: ["mcv1_coverage", "cases_per_million", "cases"],
          color: "country",
        },
        title: `Country profiles across three measures, ${lastYear}`,
        caption: "Each axis is scaled to its own range, so this compares shape and not magnitude.",
        rationale:
          "Several measures per item, where the profile is the finding rather than any single value.",
      },
      frame: whereRows(latest, only(top6)),
    },
    {
      spec: {
        form: "choropleth",
        encoding: { geo: "iso3", color: "cases_per_million", x: "year" },
        polarity: "higher-is-worse",
        breaks: [1, 10, 50, 200],
        title: "Incidence per million by country",
        rationale: "The measure is geographic and the reader's question is 'where', which no ranked bar answers.",
      },
      frame: country,
    },
    {
      spec: {
        form: "bivariateChoropleth",
        encoding: { geo: "iso3", color: "cases_per_million", color2: "mcv1_coverage" },
        title: `Incidence against coverage, ${lastYear}`,
        rationale:
          "Two measures on one map, so 'high incidence despite high coverage' becomes a colour the reader can name.",
      },
      frame: latest,
    },
    {
      spec: {
        form: "beeswarm",
        encoding: { x: "year", y: "mcv1_coverage" },
        title: "Coverage by year, one dot per country",
        rationale:
          "A global average conceals the countries at the bottom, which are the ones the story is about. Nothing is aggregated away.",
      },
      frame: country,
    },
    {
      spec: {
        form: "box",
        encoding: { x: "year", y: "mcv1_coverage" },
        title: "Spread of national coverage",
        rationale:
          "The finding is convergence, which a single mean line hides completely and quartiles state directly.",
      },
      frame: country,
    },
    {
      spec: {
        form: "ridgeline",
        encoding: { x: "year", y: "mcv1_coverage" },
        title: "How the distribution of coverage moved",
        caption:
          "Ridges share one vertical scale, so a taller curve means more countries and not just a narrower spread.",
        rationale: "The shape of the distribution is the finding, and it is moving over time.",
      },
      frame: country,
    },
    {
      spec: {
        form: "statTile",
        encoding: { y: "value", x: "year", color: "measure" },
        polarity: "higher-is-worse",
        title: "Latest world figures",
        rationale:
          "The answer is two numbers with their change. A one-bar bar chart would spend a whole plot saying one of them.",
      },
      frame: world,
    },
    {
      spec: {
        form: "line",
        encoding: { x: "year", y: "cases_per_million", facet: "country" },
        title: "Incidence per million, one panel per country",
        rationale:
          "Six series on one axis would need six hues past the four that validate. Faceting keeps every panel a single series.",
      },
      frame: whereRows(country, only(top6)),
    },
    {
      spec: {
        form: "line",
        encoding: { x: "year", y: "cases_per_million", color: "country" },
        emphasis: trio[0],
        title: `Incidence per million, with ${trio[0]} highlighted`,
        rationale:
          "One country is the point and the rest are context, which is emphasis rather than a categorical palette.",
      },
      frame: whereRows(country, only(worst)),
    },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="border-b border-hairline pb-6">
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-faint">
          Development reference
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Chart forms</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Every geometry the chart contract can draw, rendered from{" "}
          <code className="font-mono text-xs">lib/data/country-stats/measles.ts</code>. Each figure
          below is a <code className="font-mono text-xs">ChartPayload</code> and nothing more, so
          anything that emits one of these objects renders identically. The numbers are an
          illustrative sample and are not for citation.
        </p>
      </header>

      <div className="mt-10 space-y-14">
        {figures.map((payload, i) => (
          <section key={`${payload.spec.form}-${i}`}>
            <FormHeading form={payload.spec.form} />
            <Chart payload={payload} height={payload.spec.encoding.facet ? 200 : 300} />
          </section>
        ))}
      </div>
    </main>
  );
}

function FormHeading({ form }: { form: ChartForm }) {
  const entry = CHART_CATALOG[form];
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-base font-semibold text-ink">{entry.label}</h2>
        <code className="font-mono text-[0.7rem] text-faint">form: &quot;{form}&quot;</code>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{entry.useWhen}</p>
      {entry.avoidWhen && (
        <p className="mt-0.5 text-xs leading-relaxed text-faint">Avoid when: {entry.avoidWhen}</p>
      )}
    </div>
  );
}
