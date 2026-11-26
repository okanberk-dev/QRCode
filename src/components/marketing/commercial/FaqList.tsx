export interface FaqEntry {
  q: string;
  a: string;
}

/**
 * FAQ list built on native <details>/<summary>: keyboard and screen-reader
 * support come from the browser, no JavaScript is needed, and every answer
 * is in the server HTML. Pages build their FAQPage JSON-LD from the same
 * array, so the structured data always matches what is on screen.
 */
export default function FaqList({
  items,
  idPrefix,
  openFirst = true,
}: {
  items: readonly FaqEntry[];
  /** Unique prefix for the anchors (#prefix-1, #prefix-2, …). */
  idPrefix: string;
  openFirst?: boolean;
}) {
  return (
    <div className="rt-faqd">
      {items.map((item, i) => (
        <details key={item.q} id={`${idPrefix}-${i + 1}`} open={openFirst && i === 0 ? true : undefined} className="scroll-mt-24">
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
