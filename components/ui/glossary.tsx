/**
 * A compact definition list for the terminology a figure introduces.
 *
 * Charts in this project carry a lot of coined vocabulary — edit families, the
 * tone band, three overlap metrics — and a reader (or an examiner) should not
 * have to hover a tooltip to find out what a bar counts. Definitions go on the
 * page, under the figure they belong to.
 */

export interface GlossaryItem {
  term: string;
  def: string;
  /** An optional caveat — what the term does NOT tell you. */
  caveat?: string;
}

export function Glossary({
  items,
  title = "What these terms mean",
  className,
}: {
  items: GlossaryItem[];
  title?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">{title}</p>
      <dl className="mt-2.5 space-y-2">
        {items.map((it) => (
          <div key={it.term} className="text-[0.78rem] leading-relaxed">
            <dt className="inline font-medium text-navy">{it.term}</dt>
            <dd className="inline text-muted">
              {": "}
              {it.def}
              {it.caveat && <span className="text-faint"> {it.caveat}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
