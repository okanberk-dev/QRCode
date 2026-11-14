import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface CtaLink {
  href: string;
  label: string;
  /** rel="nofollow" — for /auth/* and /api/* targets (spec §5). */
  nofollow?: boolean;
}

/**
 * Closing lime band, the same visual language as the homepage's final CTA:
 * one H2, an optional lead or short list of verifiable facts, at most two
 * calls to action. Server component.
 */
export default function CtaBand({
  id,
  title,
  lead,
  facts,
  primary,
  secondary,
}: {
  id: string;
  title: string;
  lead?: string;
  facts?: readonly string[];
  primary: CtaLink;
  secondary?: CtaLink;
}) {
  const focus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#C6F24E]';
  return (
    <section aria-labelledby={id} className="bg-[#C6F24E] py-[60px] sm:py-24">
      <div className="mx-auto w-full max-w-[880px] px-5 text-center sm:px-10">
        <h2
          id={id}
          className="text-balance text-[30px] leading-[1.06] text-[#0A0A0A] sm:text-[44px] lg:text-[52px]"
        >
          {title}
        </h2>
        {lead ? (
          <p className="mx-auto mt-5 max-w-[620px] text-pretty text-[16px] leading-[1.6] text-[#1A1A1A] sm:text-[17px]">
            {lead}
          </p>
        ) : null}
        {facts && facts.length > 0 ? (
          <ul className="mx-auto mt-5 flex max-w-[680px] flex-col items-center justify-center gap-x-3 gap-y-1 text-[16px] leading-[1.6] text-[#1A1A1A] sm:flex-row sm:flex-wrap sm:text-[17px]">
            {facts.map((fact, i) => (
              <li key={fact} className="inline-flex items-center gap-3">
                {i > 0 ? (
                  <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-[#0A0A0A]/50 sm:inline-block" />
                ) : null}
                {fact}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={primary.href}
            rel={primary.nofollow ? 'nofollow' : undefined}
            className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] ${focus}`}
          >
            {primary.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          {secondary ? (
            <Link
              href={secondary.href}
              rel={secondary.nofollow ? 'nofollow' : undefined}
              className={`inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-[#0A0A0A] px-7 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white ${focus}`}
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
