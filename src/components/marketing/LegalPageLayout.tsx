import { ReactNode } from 'react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import type { Locale, Translations } from '@/lib/translations';

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

interface LegalPageLayoutProps {
  locale: Locale;
  t: Translations;
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro?: ReactNode;
  sections: LegalSection[];
  /** Optional custom footer block; defaults to "questions? email hello@buaze.com". */
  footerBlock?: ReactNode;
}

export default function LegalPageLayout({
  locale,
  t,
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections,
  footerBlock,
}: LegalPageLayoutProps) {
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-14 sm:pt-20 pb-10 border-b border-[#EDEDED]">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="legalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#legalGrid)" />
        </svg>
        <div className="relative max-w-[760px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">{eyebrow}</span>
          <h1 className="mt-4 text-[36px] sm:text-[52px] font-medium leading-[1.02] tracking-[-0.03em] text-[#0A0A0A]">
            {title}
          </h1>
          <div className="mt-4 pulse-eyebrow text-[#A3A3A3]">{lastUpdated}</div>
        </div>
      </section>

      {/* ─── Body ─── */}
      <main className="flex-1 px-6 sm:px-10 py-12 sm:py-16">
        <div className="max-w-[760px] mx-auto">
          {intro && (
            <div className="bg-[#EAF9B8] border border-[#C6F24E] rounded-2xl p-6 sm:p-7 text-[15px] text-[#0A0A0A] leading-[1.7] mb-12">
              {intro}
            </div>
          )}

          <div className="space-y-10">
            {sections.map((s, i) => (
              <section key={i} className="scroll-mt-24" id={`sec-${i + 1}`}>
                <h2 className="text-[22px] sm:text-[26px] font-medium tracking-[-0.02em] text-[#0A0A0A] leading-tight">
                  {s.heading}
                </h2>
                <div className="mt-4 text-[15px] sm:text-[16px] text-[#525252] leading-[1.75] space-y-4 [&_a]:text-[#0A0A0A] [&_a]:underline [&_a]:decoration-[#C6F24E] [&_a]:decoration-2 [&_a]:underline-offset-4 hover:[&_a]:decoration-[#A8D62E] [&_strong]:text-[#0A0A0A] [&_strong]:font-medium [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_li]:pl-1">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          {footerBlock !== null && (
            <div className="mt-16 pt-10 border-t border-[#EDEDED]">
              {footerBlock ?? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div>
                    <span className="pulse-eyebrow text-[#737373]">
                      {isTr ? 'SORULARINIZ İÇİN' : 'FOR QUESTIONS'}
                    </span>
                    <p className="mt-2 text-[14px] text-[#525252]">
                      {isTr ? 'hello@buaze.com adresine yazın.' : 'Write to hello@buaze.com.'}
                    </p>
                  </div>
                  <a
                    href="mailto:hello@buaze.com"
                    className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#1A1A1A] transition-colors"
                  >
                    hello@buaze.com
                    <span aria-hidden>→</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
