import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import HelpSearchBar from '@/components/marketing/HelpSearchBar';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { HELP_CATEGORIES } from '@/lib/help-categories';
import { getStaticHelpCategoryCounts, getStaticPopularHelpArticles } from '@/lib/help-articles';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr
    ? 'Yardım Merkezi — Kurulum, QR, yorum yönetimi | Buaze'
    : 'Help Center — Setup, QR codes and review guides | Buaze';
  const description = isTr
    ? 'Buaze yardım merkezi: kurulum, QR kodları, yorum yönetimi, entegrasyonlar, ekip yönetimi ve güvenlik rehberleri. Sorunuzun cevabı burada.'
    : 'Buaze Help Center: setup, QR codes, review management, integrations, team roles, security and KVKK guides — your question, answered in seconds.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://www.buaze.com/${locale}/help`,
      languages: {
        tr: 'https://www.buaze.com/tr/help',
        en: 'https://www.buaze.com/en/help',
        'x-default': 'https://www.buaze.com/tr/help',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: isTr ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://www.buaze.com/${locale}/help`,
      images: [{ url: isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png'],
    },
  };
}

/**
 * 1:1 with .design/site/site-pages3.jsx:HelpCenterPage (lines 536-595).
 * Hero (eyebrow + H1 + search bar), 8-category grid, popular questions
 * list. Every card and question is a real link — category slug or
 * article slug. Counts come live from Prisma.
 */
export default async function HelpCenterPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  // Live counts per category
  let countBySlug: Record<string, number> = {};
  let popular: { slug: string; title: string; category: string }[] = [];
  const staticCounts = getStaticHelpCategoryCounts(locale);
  try {
    const counts = await prisma.helpArticle.groupBy({
      by: ['category'],
      where: { locale, isPublished: true },
      _count: { category: true },
    });
    countBySlug = Object.fromEntries(counts.map((c) => [c.category, c._count.category]));

    popular = await prisma.helpArticle.findMany({
      where: { locale, isPublished: true },
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      take: 5,
      select: { slug: true, title: true, category: true },
    });
  } catch {
    // If the table is missing (pre-first schema migration) fall back to
    // an empty state — the layout still renders "Coming soon".
  }
  countBySlug = { ...staticCounts, ...Object.fromEntries(Object.entries(countBySlug).filter(([, count]) => count > 0)) };
  if (popular.length === 0) {
    popular = getStaticPopularHelpArticles(locale).map((article) => ({
      slug: article.slug,
      title: article.title,
      category: article.category,
    }));
  }

  const helpUrl = `https://www.buaze.com/${locale}/help`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isTr ? 'Ana sayfa' : 'Home', item: `https://www.buaze.com/${locale}` },
          { '@type': 'ListItem', position: 2, name: isTr ? 'Yardım Merkezi' : 'Help Center', item: helpUrl },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: isTr ? 'Buaze Yardım Merkezi' : 'Buaze Help Center',
        url: helpUrl,
        inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
        isPartOf: { '@type': 'WebSite', name: 'Buaze', url: 'https://www.buaze.com' },
        about: HELP_CATEGORIES.map((cat) => ({
          '@type': 'Thing',
          name: cat[locale].title,
          description: cat[locale].desc,
          url: `https://www.buaze.com/${locale}/help/category/${cat.slug}`,
        })),
        hasPart: popular.map((p) => ({
          '@type': 'Article',
          headline: p.title,
          url: `https://www.buaze.com/${locale}/help/${p.slug}`,
          inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
        })),
      },
      {
        '@type': 'ItemList',
        name: isTr ? 'Yardım kategorileri' : 'Help categories',
        itemListElement: HELP_CATEGORIES.map((cat, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://www.buaze.com/${locale}/help/category/${cat.slug}`,
          name: cat[locale].title,
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-20 text-center">
        <div className="mx-auto max-w-[800px]">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'YARDIM MERKEZI' : 'HELP CENTER'}
          </span>
          <h1
            className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[64px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
          >
            {isTr ? 'Sorunuzun cevabı burada.' : 'Your answer is right here.'}
          </h1>
          <HelpSearchBar locale={locale} />
        </div>
      </section>

      {/* Categories grid */}
      <section className="px-5 sm:px-10 py-12 sm:py-16">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HELP_CATEGORIES.map((cat) => {
              const meta = cat[locale];
              const count = countBySlug[cat.slug] ?? 0;
              return (
                <Link
                  key={cat.slug}
                  href={`${base}/help/category/${cat.slug}`}
                  className="group flex flex-col rounded-[14px] border border-[#EDEDED] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#C6F24E] hover:shadow-[0_8px_24px_rgba(10,10,10,0.05)]"
                >
                  <span
                    className="text-[28px] leading-none text-[#0A0A0A]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                    aria-hidden
                  >
                    {cat.symbol}
                  </span>
                  <h3
                    className="mt-3 text-[18px] font-semibold tracking-[-0.015em] text-[#0A0A0A]"
                  >
                    {meta.title}
                  </h3>
                  <p className="mt-1 text-[12px] text-[#737373]">
                    {count > 0
                      ? isTr
                        ? `${count} makale`
                        : `${count} article${count === 1 ? '' : 's'}`
                      : isTr
                        ? 'Yakında'
                        : 'Coming soon'}
                  </p>
                  <p className="mt-3 text-[13px] leading-[1.55] text-[#525252]">{meta.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular questions */}
      {popular.length > 0 && (
        <section className="px-5 sm:px-10 pb-[60px] sm:pb-20">
          <div className="mx-auto max-w-[1200px]">
            <h2
              className="text-[28px] sm:text-[32px] font-medium leading-[1.1] tracking-[-0.02em] text-[#0A0A0A]"
            >
              {isTr ? 'Popüler sorular' : 'Popular questions'}
            </h2>
            <ul className="mt-5">
              {popular.map((p, i) => (
                <li
                  key={p.slug}
                  className={
                    i === 0
                      ? 'border-t-2 border-[#0A0A0A]'
                      : 'border-t border-[#EDEDED]'
                  }
                >
                  <Link
                    href={`${base}/help/${p.slug}`}
                    className="group flex items-center justify-between gap-4 py-[18px]"
                  >
                    <span
                      className="text-[16px] sm:text-[18px] font-medium tracking-[-0.015em] text-[#0A0A0A]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {p.title}
                    </span>
                    <span
                      aria-hidden
                      className="shrink-0 text-[14px] text-[#737373] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Contact CTA */}
      <section className="border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[720px] text-center">
          <h2
            className="text-[24px] sm:text-[28px] font-medium tracking-[-0.02em] text-[#0A0A0A]"
          >
            {isTr ? 'Cevabını bulamadın mı?' : "Still can't find it?"}
          </h2>
          <p className="mt-3 text-[15px] text-[#525252]">
            {isTr ? 'Destek ekibimize yaz, 2 saat içinde dönelim.' : 'Write to our support team — we reply within 2 hours.'}
          </p>
          <Link
            href={`${base}/contact`}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[14px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
          >
            {isTr ? 'Destek ekibine yaz' : 'Contact support'}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
