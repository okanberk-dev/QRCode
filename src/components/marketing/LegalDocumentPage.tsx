import type { Locale, Translations } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { renderLegalContent } from '@/lib/legal/render';
import type { LegalDocumentSnapshot } from '@/lib/legal/loader';

/**
 * DB-driven hukuki metin sayfa shell'i (CLAUDE.md §32). Eski
 * `LegalPageLayout` template-bazlıydı; bu component admin paneli
 * tarafından yönetilen tek bir markdown-lite içeriği render eder.
 */
export default function LegalDocumentPage({
  locale,
  t,
  doc,
  eyebrow,
  fallbackTitle,
}: {
  locale: Locale;
  t: Translations;
  doc: LegalDocumentSnapshot;
  eyebrow: string;
  fallbackTitle?: string;
}) {
  const isTr = locale === 'tr';
  const effective = doc.effectiveAt ?? doc.updatedAt ?? null;

  const lastUpdatedLabel = (() => {
    if (!effective) return '';
    const date = new Date(effective).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const prefix = isTr ? 'YÜRÜRLÜK' : 'EFFECTIVE';
    return `${prefix} · ${date.toUpperCase()}${doc.version > 0 ? ` · v${doc.version}` : ''}`;
  })();

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <MarketingNavbar locale={locale} t={t} />

      <section className="relative overflow-hidden px-5 sm:px-10 pt-[60px] sm:pt-20 pb-10 border-b border-[#EDEDED]">
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
          <h1 className="mt-4 text-[28px] sm:text-[44px] font-medium leading-[1.02] tracking-[-0.03em] text-[#0A0A0A]">
            {doc.title || fallbackTitle}
          </h1>
          {lastUpdatedLabel && (
            <div className="mt-4 pulse-eyebrow text-[#A3A3A3]">{lastUpdatedLabel}</div>
          )}
        </div>
      </section>

      <main className="flex-1 px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[760px]">
          {doc.description && (
            <div className="bg-[#EAF9B8] border border-[#C6F24E] rounded-2xl p-6 sm:p-7 text-[14px] sm:text-[15px] text-[#0A0A0A] leading-[1.7] mb-10">
              {doc.description}
            </div>
          )}

          <article className="prose-legal">
            {renderLegalContent(doc.content)}
          </article>

          {doc.source === 'default' && (
            <div className="mt-10 rounded-2xl border border-dashed border-[#A3A3A3] bg-[#FAFAFA] p-5 text-[12.5px] text-[#737373]">
              {isTr
                ? 'Bu metin henüz yönetici tarafından kaydedilmedi; varsayılan taslak gösteriliyor.'
                : 'This document has not been finalised by an admin yet; the default draft is shown.'}
            </div>
          )}
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
