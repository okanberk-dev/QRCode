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
    <div className="divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
      {items.map((item, i) => (
        <details
          key={item.q}
          id={`${idPrefix}-${i + 1}`}
          open={openFirst && i === 0 ? true : undefined}
          className="group scroll-mt-24"
        >
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="bz-h-tight text-[17px] leading-[1.35] text-[#0A0A0A] sm:text-[18px]">{item.q}</span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D4D4D4] text-[18px] leading-none text-[#0A0A0A] transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
            >
              +
            </span>
          </summary>
          <p className="max-w-[680px] pb-6 pr-2 text-[15px] leading-[1.65] text-[#525252] sm:pr-12">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
