import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { notFound } from 'next/navigation';
import { ChevronRight, ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import HelpSearchBar from '@/components/marketing/HelpSearchBar';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { CATEGORY_BY_SLUG } from '@/lib/help-categories';
import { getStaticHelpArticles } from '@/lib/help-articles';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

interface PageParams {
  params: Promise<{ locale: Locale; slug: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = CATEGORY_BY_SLUG[slug];
  if (!cat) return { title: 'Not Found' };
  const meta = cat[locale];
  const title = `${meta.title} — ${locale === 'tr' ? 'Yardım Merkezi' : 'Help Center'} | Buaze`;
  return {
    title,
    description: meta.desc,
    alternates: {
      canonical: `https://buaze.com/${locale}/help/category/${slug}`,
      languages: {
        tr: `https://buaze.com/tr/help/category/${slug}`,
        en: `https://buaze.com/en/help/category/${slug}`,
        'x-default': `https://buaze.com/tr/help/category/${slug}`,
      },
    },
    openGraph: { title, description: meta.desc, url: `https://buaze.com/${locale}/help/category/${slug}` },
  };
}

/**
 * Category listing — shows all published articles in one category
 * ordered by (order ASC, updatedAt DESC). If the category slug is
 * unknown, 404s.
 */
export default async function HelpCategoryPage({ params }: PageParams) {
  const { locale, slug } = await params;
  const cat = CATEGORY_BY_SLUG[slug];
  if (!cat) notFound();
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';
  const meta = cat[locale];

  let articles: { slug: string; title: string; excerpt: string | null; updatedAt: Date }[] = [];
  try {
    articles = await prisma.helpArticle.findMany({
      where: { locale, category: slug, isPublished: true },
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      select: { slug: true, title: true, excerpt: true, updatedAt: true },
    });
  } catch {
    /* table may not exist yet; render empty state */
  }
  if (articles.length === 0) {
    articles = getStaticHelpArticles(locale, slug).map((article) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      updatedAt: article.updatedAt,
    }));
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Yardım' : 'Help', item: `https://buaze.com/${locale}/help` },
      { '@type': 'ListItem', position: 3, name: meta.title, item: `https://buaze.com/${locale}/help/category/${slug}` },
    ],
  };

  const itemListJsonLd =
    articles.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: meta.title,
          description: meta.desc,
          itemListElement: articles.map((a, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://buaze.com/${locale}/help/${a.slug}`,
            name: a.title,
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(itemListJsonLd) }}
        />
      )}
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1200px]">
          {/* Breadcrumb */}
          <nav
            aria-label={isTr ? 'Site yolu' : 'Breadcrumb'}
            className="mb-6 flex flex-wrap items-center gap-1.5 text-[12px] text-[#737373]"
          >
            <Link href={base} className="hover:text-[#0A0A0A] transition-colors">
              {isTr ? 'Ana sayfa' : 'Home'}
            </Link>
            <ChevronRight size={12} className="text-[#A3A3A3]" aria-hidden />
            <Link href={`${base}/help`} className="hover:text-[#0A0A0A] transition-colors">
              {isTr ? 'Yardım' : 'Help'}
            </Link>
            <ChevronRight size={12} className="text-[#A3A3A3]" aria-hidden />
            <span className="font-medium text-[#0A0A0A]">{meta.title}</span>
          </nav>

          <div className="flex flex-col items-start gap-3">
            <span
              className="text-[36px] leading-none text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
              aria-hidden
            >
              {cat.symbol}
            </span>
            <h1
              className="text-[32px] sm:text-[48px] lg:text-[56px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
            >
              {meta.title}
            </h1>
            <p className="max-w-[620px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">{meta.desc}</p>
            <p className="pulse-eyebrow text-[#737373]">
              {articles.length > 0
                ? isTr
                  ? `${articles.length} MAKALE`
                  : `${articles.length} ARTICLE${articles.length === 1 ? '' : 'S'}`
                : isTr
                  ? 'YAKINDA'
                  : 'COMING SOON'}
            </p>
          </div>

          <div className="mt-7 max-w-[580px]">
            <HelpSearchBar locale={locale} size="compact" />
          </div>
        </div>
      </section>

      {/* Article list */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[900px]">
          {articles.length === 0 ? (
            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
              <p className="text-[16px] text-[#525252]">
                {isTr
                  ? 'Bu kategoride henüz yayımlanmış makale yok. Yakında ekleyeceğiz.'
                  : 'No published articles in this category yet. Coming soon.'}
              </p>
              <Link
                href={`${base}/help`}
                className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#0A0A0A] px-5 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white"
              >
                {isTr ? 'Yardım merkezine dön' : 'Back to help center'}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#EDEDED] border-t-2 border-[#0A0A0A]">
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`${base}/help/${a.slug}`}
                    className="group flex flex-col gap-1.5 py-[22px] sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                  >
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-[17px] sm:text-[19px] font-medium tracking-[-0.015em] text-[#0A0A0A]"
                      >
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="mt-1.5 max-w-[620px] text-[13px] leading-[1.55] text-[#525252]">
                          {a.excerpt}
                        </p>
                      )}
                    </div>
                    <span
                      aria-hidden
                      className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#737373] transition-colors group-hover:text-[#0A0A0A]"
                    >
                      {isTr ? 'Oku' : 'Read'}
                      <ArrowRight
                        size={14}
                        strokeWidth={2}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-14">
        <div className="mx-auto max-w-[720px] text-center">
          <h2
            className="text-[22px] sm:text-[26px] font-medium tracking-[-0.02em] text-[#0A0A0A]"
          >
            {isTr ? 'Yardımcı olamadık mı?' : 'Still stuck?'}
          </h2>
          <p className="mt-2 text-[14px] text-[#525252]">
            {isTr ? 'Destek ekibimize yaz, 2 saat içinde dönelim.' : 'Write to our support team — we reply within 2 hours.'}
          </p>
          <Link
            href={`${base}/contact`}
            className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
          >
            {isTr ? 'İletişime geç' : 'Contact support'}
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
