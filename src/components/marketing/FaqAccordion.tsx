'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';

export interface FaqItem {
  q: string;
  a: string;
  /**
   * Optional "read more" links shown under the answer. Only the answer text
   * (`a`) goes into FAQPage JSON-LD; the links are navigation, not answer.
   */
  links?: ReadonlyArray<{ href: string; label: string }>;
}

interface Props {
  faqs: ReadonlyArray<FaqItem>;
  /** Indices open by default. Defaults to [0, 1]. */
  defaultOpen?: number[];
  /**
   * Wrap each question button in a heading of this level (WAI-ARIA accordion
   * pattern). Omit on pages where the accordion sits under no heading of the
   * level above, so the heading order stays h1 → h2 → h3.
   */
  headingLevel?: 2 | 3 | 4;
}

/**
 * FAQ accordion — rounded +/− button, Space Grotesk question, neutral answer,
 * a hairline between rows. Answers are always in the server HTML (collapsed
 * with [hidden], not unmounted): the FAQPage JSON-LD has to match visible
 * content and non-JS crawlers only see what is in the markup. Ids come from
 * useId so several accordions can share one page.
 */
export default function FaqAccordion({ faqs, defaultOpen = [0, 1], headingLevel }: Props) {
  const [open, setOpen] = useState<Set<number>>(new Set(defaultOpen));
  const uid = useId();
  const Heading = headingLevel ? (`h${headingLevel}` as const) : null;

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
        const panelId = `${uid}-panel-${i}`;
        const buttonId = `${uid}-button-${i}`;
        const button = (
          <button
            type="button"
            id={buttonId}
            onClick={() => toggle(i)}
            aria-expanded={isOpen}
            aria-controls={panelId}
            className="flex w-full items-start justify-between gap-5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-4"
          >
            <span
              className="text-[18px] sm:text-[20px] font-medium leading-[1.25] tracking-[-0.015em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {f.q}
            </span>
            {/* SVG, not a "+"/"−" character: a text glyph would end up in the
                heading's text content that crawlers index. */}
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#0A0A0A] text-[#0A0A0A]"
            >
              {isOpen ? <Minus size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
            </span>
          </button>
        );
        return (
          <div key={i} className="py-[22px]">
            {Heading ? <Heading className="m-0">{button}</Heading> : button}
            <div id={panelId} hidden={!isOpen} className="mt-3 max-w-[680px] pr-12">
              <p className="text-[15px] leading-[1.65] text-[#525252] sm:text-[16px]">{f.a}</p>
              {f.links && f.links.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                  {f.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-[#0A0A0A] underline decoration-[#5D3EBC] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
