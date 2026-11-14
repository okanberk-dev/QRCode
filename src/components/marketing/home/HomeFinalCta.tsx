import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Closing lime band. Two CTAs only; facts are verifiable (14-day trial, no
 * card at sign-up, cancel any time with access to the end of the period).
 * Register links carry rel="nofollow" (spec §5: /auth/* is noindex).
 */

const COPY = {
  tr: {
    title: 'QR kodla geri bildirim toplamaya ücretsiz başlayın',
    facts: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal edebilirsiniz'],
    primary: 'Ücretsiz deneyin',
    secondary: 'Fiyatları inceleyin',
  },
  en: {
    title: 'Start collecting feedback with QR codes for free',
    facts: ['14-day free trial', 'No credit card', 'Cancel anytime'],
    primary: 'Start free trial',
    secondary: 'See pricing',
  },
} as const;

export default function HomeFinalCta({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];

  return (
    <section aria-labelledby="final-cta-title" className="bg-[#C6F24E] py-[60px] sm:py-24">
      <div className="mx-auto w-full max-w-[880px] px-5 text-center sm:px-10">
        <h2
          id="final-cta-title"
          className="text-balance text-[30px] leading-[1.06] text-[#0A0A0A] sm:text-[44px] lg:text-[52px]"
        >
          {copy.title}
        </h2>
        <ul className="mx-auto mt-5 flex max-w-[680px] flex-col items-center justify-center gap-x-3 gap-y-1 text-[16px] leading-[1.6] text-[#1A1A1A] sm:flex-row sm:flex-wrap sm:text-[17px]">
          {copy.facts.map((fact, i) => (
            <li key={fact} className="inline-flex items-center gap-3">
              {i > 0 ? (
                <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-[#0A0A0A]/50 sm:inline-block" />
              ) : null}
              {fact}
            </li>
          ))}
        </ul>
        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={`/${locale}/auth/register`}
            rel="nofollow"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#C6F24E]"
          >
            {copy.primary}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-[#0A0A0A] px-7 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#C6F24E]"
          >
            {copy.secondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
