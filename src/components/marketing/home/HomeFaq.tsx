import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';
import { HOME_FAQ } from './home-faq';
import SectionHeader from './SectionHeader';

/**
 * Homepage FAQ — six questions from HOME_FAQ (the same array feeds the
 * FAQPage JSON-LD). Native <details>/<summary>: keyboard-operable, no JS,
 * every answer is in the server HTML. The first item starts open.
 *
 * Grid order: on phones the questions come right after the header and the
 * "another question?" card closes the section; on large screens the card
 * sits under the header in the left column.
 */

const COPY = {
  tr: {
    eyebrow: 'Sık sorulan sorular',
    title: 'QR ile yorum toplama hakkında sorular',
    lead: 'Aradığınız yanıt burada yoksa tüm soruları inceleyebilir ya da bize yazabilirsiniz.',
    all: 'Tüm soruları görün',
    contactTitle: 'Başka bir sorunuz mu var?',
  },
  en: {
    eyebrow: 'FAQ',
    title: 'Questions about collecting reviews with QR codes',
    lead: "If your question isn't answered here, browse the full FAQ or write to us.",
    all: 'See all questions',
    contactTitle: 'Have another question?',
  },
} as const;

export default function HomeFaq({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const faqs = HOME_FAQ[locale];

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-white py-[60px] sm:py-24">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-10 px-5 sm:px-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8">
        <div className="lg:col-start-1 lg:row-start-1">
          <SectionHeader id="faq-title" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
          <Link
            href={`/${locale}/faq`}
            className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          >
            {copy.all}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="divide-y divide-[#EDEDED] rounded-[20px] border border-[#EDEDED] bg-white px-5 sm:px-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          {faqs.map((faq, index) => (
            <details key={faq.q} open={index === 0} className="group py-5 sm:py-6">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-start justify-between gap-4 rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
                <span className="pt-1.5 text-[17px] font-medium leading-[1.4] text-[#0A0A0A] sm:text-[19px]">
                  {faq.q}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4D4D4] text-[#0A0A0A] transition-colors group-open:border-[#0A0A0A] group-open:bg-[#0A0A0A] group-open:text-[#C6F24E]"
                >
                  <Plus
                    size={16}
                    strokeWidth={2}
                    className="transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                  />
                </span>
              </summary>
              <p className="mt-3 max-w-[640px] pr-2 text-[15px] leading-[1.7] text-[#525252] sm:pr-12 sm:text-[16px]">
                {faq.a}
              </p>
            </details>
          ))}
        </div>

        <div className="rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] p-6 lg:col-start-1 lg:row-start-2 lg:self-start">
          <p className="text-[16px] font-medium text-[#0A0A0A]">{copy.contactTitle}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-1 inline-flex min-h-[44px] items-center text-[15px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          >
            {SUPPORT_EMAIL}
          </a>
          <p className="mt-2 text-[14px] leading-[1.55] text-[#525252]">{SUPPORT_HOURS[locale]}</p>
        </div>
      </div>
    </section>
  );
}
