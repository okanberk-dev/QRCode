import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Locale, Translations } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { renderLegalContentWithToc } from '@/lib/legal/render';
import type { LegalDocumentSnapshot } from '@/lib/legal/loader';
import { SUPPORT_EMAIL } from '@/lib/company-constants';

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
  const { blocks, headings } = renderLegalContentWithToc(doc.content, locale === 'en' ? 'en' : 'tr');
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
    <div className="min-h-screen flex flex-col bg-white">
      <div className="legal-print-hide">
        <MarketingNavbar locale={locale} t={t} />
      </div>

      {/* The title is inside <main id="main-content"> so the skip link lands
          on it and no content sits outside a landmark. */}
      <main id="main-content" className="flex-1">
      {/* Hero — sade, breadcrumb + eyebrow + title + meta. Eski grid pattern
          kaldırıldı; yerine ince alt-border + N50 yumuşak alt-band kontrast. */}
      <section className="rt-sheet rt-sheet--cream">
        <div className="rt-container rt-page-head">
          <Link
            href={`/${locale}`}
            className="legal-print-hide inline-flex items-center gap-1.5 text-[12px] font-medium text-[#737373] hover:text-[#0A0A0A] transition-colors"
          >
            <ChevronLeft size={14} />
            {isTr ? 'Buaze ana sayfa' : 'Buaze home'}
          </Link>

          <div className="rt-page-head__text" style={{ marginTop: 24 }}>
            <span className="rt-eyebrow">{eyebrow}</span>
            <h1 className="rt-t-h1">
              {doc.title || fallbackTitle}
            </h1>
            {lastUpdatedLabel && (
              <div className="rt-eyebrow">{lastUpdatedLabel}</div>
            )}
          </div>
        </div>
      </section>

      <div className="py-10 sm:py-16">
        <div className="rt-container grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-10 lg:gap-14">
          {/* Content column */}
          <div className="min-w-0 max-w-[760px]">
            {doc.description && (
              <div className="mb-10 rounded-[var(--rt-r-lg)] bg-[var(--rt-cream)] p-6 sm:p-7">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'ÖZET' : 'SUMMARY'}
                </span>
                <p className="mt-2 text-[14px] sm:text-[15px] text-[#0A0A0A] leading-[1.7]">
                  {doc.description}
                </p>
              </div>
            )}

            <article className="prose-legal rt-prose">{blocks}</article>

            {/* Footer band — son güncelleme + iletişim. Stripe / Linear /
                Vercel pattern'i: minimal closure, ziyaretçi-facing teknik
                hint yok (admin kontrol notları admin panelinde). */}
            <div className="mt-14 pt-8 border-t border-[#EDEDED] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12.5px] text-[#737373]">
              <span>
                {isTr ? 'Sorularınız için ' : 'Questions? '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-medium text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-[3px] transition-colors hover:decoration-[#A8D62E]"
                >
                  {SUPPORT_EMAIL}
                </a>
              </span>
              {lastUpdatedLabel && (
                <span className="pulse-eyebrow text-[#737373] text-[10px]">
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
                className="sticky top-[96px] rounded-[var(--rt-r-sm)] bg-[var(--rt-cream)] p-5"
              >
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'İÇİNDEKİLER' : 'CONTENTS'}
                </span>
                <ol className="mt-3 space-y-2 text-[13px] leading-[1.5]">
                  {tocItems.map((h, idx) => (
                    <li key={h.id} className="flex gap-2">
                      <span className="bz-mono text-[11px] text-[#737373] tabular-nums shrink-0 mt-0.5">
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
      </div>
      </main>

      <div className="legal-print-hide">
        <MarketingFooter locale={locale} t={t} />
      </div>
    </div>
  );
}

export type { LegalDocumentSnapshot };
