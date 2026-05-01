import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Locale, Translations } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { renderLegalContentWithToc } from '@/lib/legal/render';
import type { LegalDocumentSnapshot } from '@/lib/legal/loader';

/**
 * DB-driven hukuki metin sayfa shell'i (CLAUDE.md §32). Eski `LegalPageLayout`
 * template-bazlıydı; bu component admin paneli tarafından yönetilen tek bir
 * markdown-lite içeriği render eder. 13 public legal sayfası bu shell'i
 * paylaşır — değişiklikler hepsini etkiler.
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
  const { blocks, headings } = renderLegalContentWithToc(doc.content);
  const tocItems = headings.filter((h) => h.level === 2);

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
      <div className="legal-print-hide">
        <MarketingNavbar locale={locale} t={t} />
      </div>

      {/* Hero — sade, breadcrumb + eyebrow + title + meta. Eski grid pattern
          kaldırıldı; yerine ince alt-border + N50 yumuşak alt-band kontrast. */}
      <section className="relative px-5 sm:px-10 pt-10 sm:pt-14 pb-10 border-b border-[#EDEDED] bg-[#FAFAFA]">
        <div className="relative max-w-[1100px] mx-auto">
          <Link
            href={`/${locale}`}
            className="legal-print-hide inline-flex items-center gap-1.5 text-[12px] font-medium text-[#737373] hover:text-[#0A0A0A] transition-colors"
          >
            <ChevronLeft size={14} />
            {isTr ? 'Buaze ana sayfa' : 'Buaze home'}
          </Link>

          <div className="mt-6 max-w-[760px]">
            <span className="pulse-eyebrow text-[#A8D62E]">{eyebrow}</span>
            <h1 className="bz-h-tight mt-3 text-[28px] sm:text-[44px] leading-[1.02] tracking-[-0.03em] text-[#0A0A0A]">
              {doc.title || fallbackTitle}
            </h1>
            {lastUpdatedLabel && (
              <div className="mt-4 pulse-eyebrow text-[#A3A3A3]">{lastUpdatedLabel}</div>
            )}
          </div>
        </div>
      </section>

      <main className="flex-1 px-5 sm:px-10 py-10 sm:py-14">
        <div className="mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-10 lg:gap-14">
          {/* Content column */}
          <div className="min-w-0 max-w-[760px]">
            {doc.description && (
              <div className="bz-card-soft p-6 sm:p-7 mb-10">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'ÖZET' : 'SUMMARY'}
                </span>
                <p className="mt-2 text-[14px] sm:text-[15px] text-[#0A0A0A] leading-[1.7]">
                  {doc.description}
                </p>
              </div>
            )}

            <article className="prose-legal">{blocks}</article>

            {/* Footer band — son güncelleme + iletişim. Stripe / Linear /
                Vercel pattern'i: minimal closure, ziyaretçi-facing teknik
                hint yok (admin kontrol notları admin panelinde). */}
            <div className="mt-14 pt-8 border-t border-[#EDEDED] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12.5px] text-[#737373]">
              <span>
                {isTr ? 'Sorularınız için ' : 'Questions? '}
                <a
                  href="mailto:legal@buaze.com"
                  className="font-medium text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-[3px] transition-colors hover:decoration-[#A8D62E]"
                >
                  legal@buaze.com
                </a>
              </span>
              {lastUpdatedLabel && (
                <span className="pulse-eyebrow text-[#A3A3A3] text-[10px]">
                  {lastUpdatedLabel}
                </span>
              )}
            </div>
          </div>

          {/* TOC aside — sticky on lg+, hidden under */}
          {tocItems.length > 1 && (
            <aside className="legal-print-hide hidden lg:block">
              <nav
                aria-label={isTr ? 'İçindekiler' : 'Table of contents'}
                className="sticky top-[88px] bz-card p-5"
              >
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'İÇİNDEKİLER' : 'CONTENTS'}
                </span>
                <ol className="mt-3 space-y-2 text-[13px] leading-[1.5]">
                  {tocItems.map((h, idx) => (
                    <li key={h.id} className="flex gap-2">
                      <span className="bz-mono text-[11px] text-[#A3A3A3] tabular-nums shrink-0 mt-0.5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <a
                        href={`#${h.id}`}
                        className="text-[#525252] hover:text-[#0A0A0A] transition-colors line-clamp-2"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}
        </div>
      </main>

      <div className="legal-print-hide">
        <MarketingFooter locale={locale} t={t} />
      </div>
    </div>
  );
}

export type { LegalDocumentSnapshot };
