'use client';

import { useState } from 'react';

export interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  faqs: FaqItem[];
  /** Indices open by default. Defaults to [0, 1] matching the design spec. */
  defaultOpen?: number[];
}

/**
 * 1:1 with .design/site/site-pages3.jsx:FAQPage accordion column —
 * 28×28 rounded circle button with +/− glyph, 20px Space Grotesk question,
 * 14px neutral answer, bordered between rows.
 */
export default function FaqAccordion({ faqs, defaultOpen = [0, 1] }: Props) {
  const [open, setOpen] = useState<Set<number>>(new Set(defaultOpen));

  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="divide-y divide-[#EDEDED]">
      {faqs.map((f, i) => {
        const isOpen = open.has(i);
        return (
          <div key={i} className="py-[22px]">
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              className="flex w-full items-start justify-between gap-5 text-left"
            >
              <span
                className="text-[18px] sm:text-[20px] font-medium leading-[1.25] tracking-[-0.015em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {f.q}
              </span>
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#0A0A0A] text-[16px] leading-none text-[#0A0A0A] transition-transform"
              >
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {/* Always rendered, collapsed with [hidden]: the answer text must ship in the
                server HTML (it is also in the FAQPage JSON-LD, which has to match visible
                content, and non-JS crawlers only see what is in the markup). */}
            <p
              id={`faq-panel-${i}`}
              hidden={!isOpen}
              className="mt-2.5 max-w-[560px] text-[14px] leading-[1.6] text-[#525252]"
            >
              {f.a}
            </p>
          </div>
        );
      })}
    </div>
  );
}
