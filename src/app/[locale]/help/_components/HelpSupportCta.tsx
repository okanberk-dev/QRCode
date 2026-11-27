import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';
import type { Locale } from '@/lib/translations';

const COPY = {
  tr: {
    sectionTitle: 'Aradığınızı bulamadınız mı?',
    cardTitle: 'Hâlâ bir sorunuz mu var?',
    before: 'Bize',
    after: 'adresinden yazın ya da iletişim formunu kullanın.',
    primary: 'İletişime geçin',
    secondary: 'Sık sorulan sorular',
  },
  en: {
    sectionTitle: 'Didn’t find what you need?',
    cardTitle: 'Still have a question?',
    before: 'Write to us at',
    after: 'or use the contact form.',
    primary: 'Contact us',
    secondary: 'Read the FAQ',
  },
} as const;

const LINK_CLASS =
  'font-medium text-[#0A0A0A] underline decoration-[#5D3EBC] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2';
const PRIMARY_CLASS =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2';
const SECONDARY_CLASS =
  'inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#D4D4D4] bg-white px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2';

/**
 * Support promise shared by every help page: the one public mailbox and the
 * published hours (CLAUDE.md §19.1.2, company-constants). No response-time
 * claims beyond SUPPORT_HOURS.
 */
export default function HelpSupportCta({
  locale,
  variant = 'section',
}: {
  locale: Locale;
  variant?: 'section' | 'card';
}) {
  const lang = locale === 'en' ? 'en' : 'tr';
  const copy = COPY[lang];
  const body = (
    <>
      {copy.before}{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK_CLASS}>
        {SUPPORT_EMAIL}
      </a>{' '}
      {copy.after}
    </>
  );

  if (variant === 'card') {
    return (
      <aside aria-labelledby="help-article-support" className="rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] p-6 sm:p-8">
        <h2 id="help-article-support" className="text-balance text-[22px] leading-[1.2] tracking-[-0.02em] text-[#0A0A0A] sm:text-[26px]">
          {copy.cardTitle}
        </h2>
        <p className="mt-3 text-pretty text-[16px] leading-[1.65] text-[#525252]">{body}</p>
        <p className="mt-2 text-[14px] leading-[1.6] text-[#737373]">{SUPPORT_HOURS[lang]}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={`/${lang}/contact`} className={PRIMARY_CLASS}>
            {copy.primary}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href={`/${lang}/faq`} className={SECONDARY_CLASS}>
            {copy.secondary}
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <section aria-labelledby="help-support-title" className="border-t border-[#EDEDED] py-[60px] sm:py-24">
      <div className="mx-auto w-full max-w-[880px] px-5 text-center sm:px-10">
        <h2
          id="help-support-title"
          className="text-balance text-[28px] leading-[1.08] tracking-[-0.02em] text-[#0A0A0A] sm:text-[40px]"
        >
          {copy.sectionTitle}
        </h2>
        <p className="mx-auto mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
          {body}
        </p>
        <p className="mx-auto mt-2 max-w-[640px] text-[14px] leading-[1.6] text-[#737373]">{SUPPORT_HOURS[lang]}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link href={`/${lang}/contact`} className={PRIMARY_CLASS}>
            {copy.primary}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href={`/${lang}/faq`} className={SECONDARY_CLASS}>
            {copy.secondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
