import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { notFound } from 'next/navigation';
import { ChevronRight, ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { CATEGORY_BY_SLUG } from '@/lib/help-categories';
import { getStaticHelpArticle, getStaticHelpArticles, type StaticHelpArticle, type BodyInput } from '@/lib/help-articles';
import { sanitizeBlogContent } from '@/lib/blog-content';
import { buildHowToSchema, type HowToStep } from '@/lib/seo/howto-schema';
import { getSiteSettings } from '@/lib/site-settings';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

interface PageParams {
  params: Promise<{ locale: Locale; slug: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  let article: { title: string; excerpt: string | null } | null = null;
  try {
    article = await prisma.helpArticle.findUnique({
      where: { slug_locale: { slug, locale } },
      select: { title: true, excerpt: true },
    });
  } catch {
    /* table may not exist yet */
  }
  article = article ?? getStaticHelpArticle(locale, slug);
  if (!article) return { title: locale === 'tr' ? 'Makale bulunamadı' : 'Article not found' };
  const title = `${article.title} — ${locale === 'tr' ? 'Yardım' : 'Help'} | Buaze`;
  const description =
    article.excerpt ||
    (locale === 'tr'
      ? 'Buaze yardım merkezi makalesi.'
      : 'Buaze help center article.');
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/help/${slug}`,
      languages: {
        tr: `https://buaze.com/tr/help/${slug}`,
        en: `https://buaze.com/en/help/${slug}`,
      },
    },
    openGraph: { type: 'article', url: `https://buaze.com/${locale}/help/${slug}`, title, description },
  };
}

function extractHeadings(html: string) {
  const matches = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
  return matches
    .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((text) => ({ text, id: slugifyHeading(text) }));
}

function slugifyHeading(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function addHeadingAnchors(html: string) {
  return html.replace(/<h2>(.*?)<\/h2>/gi, (_match, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return `<h2 id="${slugifyHeading(text)}">${inner}</h2>`;
  });
}

/**
 * Help article detail — breadcrumb, prose body, related articles.
 * Follows the blog/[slug] pattern with category eyebrow, TOC sidebar,
 * and related list below.
 */
export default async function HelpArticlePage({ params }: PageParams) {
  const { locale, slug } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';
  const s = await getSiteSettings();

  let article: Awaited<ReturnType<typeof prisma.helpArticle.findUnique>> | StaticHelpArticle | null = null;
  try {
    article = await prisma.helpArticle.findUnique({
      where: { slug_locale: { slug, locale } },
    });
  } catch {
    article = null;
  }
  article = article ?? getStaticHelpArticle(locale, slug);
  if (!article || !article.isPublished) notFound();

  const cat = CATEGORY_BY_SLUG[article.category];
  const categoryLabel = cat ? cat[locale].title : article.category;

  // Related — same category, excluding the current article
  let related: { slug: string; title: string; excerpt: string | null }[] = [];
  try {
    related = await prisma.helpArticle.findMany({
      where: {
        locale,
        category: article.category,
        isPublished: true,
        NOT: { id: article.id },
      },
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      take: 3,
      select: { slug: true, title: true, excerpt: true },
    });
  } catch {
    /* ignore */
  }
  if (related.length === 0) {
    related = getStaticHelpArticles(locale, article.category)
      .filter((item) => item.slug !== article.slug)
      .slice(0, 3)
      .map((item) => ({ slug: item.slug, title: item.title, excerpt: item.excerpt }));
  }

  const contentWithAnchors = addHeadingAnchors(sanitizeBlogContent(article.body));
  const tocItems = extractHeadings(contentWithAnchors);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? '',
    datePublished: article.updatedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
    image: s.ogImageUrl || 'https://buaze.com/favicon.svg',
    author: { '@type': 'Organization', name: 'Buaze', url: 'https://buaze.com' },
    publisher: {
      '@type': 'Organization',
      name: 'Buaze',
      url: 'https://buaze.com',
      logo: { '@type': 'ImageObject', url: s.logoUrl || 'https://buaze.com/favicon.svg' },
    },
    mainEntityOfPage: `https://buaze.com/${locale}/help/${slug}`,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Yardım' : 'Help', item: `https://buaze.com/${locale}/help` },
      { '@type': 'ListItem', position: 3, name: categoryLabel, item: `https://buaze.com/${locale}/help/category/${article.category}` },
      { '@type': 'ListItem', position: 4, name: article.title, item: `https://buaze.com/${locale}/help/${slug}` },
    ],
  };

  // HowTo schema — only emitted for static articles where the structured
  // body is preserved (CLAUDE.md §22). DB articles ship without HowTo
  // until a structured-body migration lands. Helper drops the node when
  // step count < 2 (Google validator threshold).
  const struct: BodyInput | undefined = (article as StaticHelpArticle).bodyStruct;
  const howToSteps: HowToStep[] = struct
    ? struct.sections
        .filter((section) => (section.paragraphs?.length ?? 0) > 0 || (section.items?.length ?? 0) > 0)
        .map((section) => ({
          name: section.title,
          text: [
            ...(section.paragraphs ?? []),
            ...(section.items?.length ? [section.items.join(' ')] : []),
          ]
            .join(' ')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim(),
        }))
        .filter((step) => step.text.length > 0)
    : [];
  const howToJsonLd = struct
    ? buildHowToSchema({
        locale,
        name: article.title,
        description: article.excerpt ?? struct.lead.replace(/<[^>]+>/g, '').slice(0, 160),
        url: `https://buaze.com/${locale}/help/${slug}`,
        steps: howToSteps,
      })
    : null;

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }}
      />
      {howToJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(howToJsonLd) }}
        />
      )}
      <MarketingNavbar locale={locale} t={t} />

      {/* Header — breadcrumb + category + title */}
      <section className="border-b border-[#EDEDED] bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1000px]">
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
            <Link
              href={`${base}/help/category/${article.category}`}
              className="hover:text-[#0A0A0A] transition-colors"
            >
              {categoryLabel}
            </Link>
          </nav>

          <span className="pulse-eyebrow text-[#737373]">
            {(cat ? cat.symbol + '  ' : '') + categoryLabel.toUpperCase()}
          </span>
          <h1
            className="mt-3 text-[28px] sm:text-[44px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]"
          >
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-4 max-w-[640px] text-[16px] leading-[1.6] text-[#525252] sm:text-[17px]">
              {article.excerpt}
            </p>
          )}
          <p className="mt-5 text-[12px] text-[#737373]">
            {isTr ? 'Güncelleme: ' : 'Updated: '}
            <time dateTime={article.updatedAt.toISOString()}>
              {article.updatedAt.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </p>
        </div>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-[1000px] px-5 sm:px-10 py-[60px] sm:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          {/* Left - TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              {tocItems.length > 0 && (
                <nav aria-label={isTr ? 'İçindekiler' : 'Table of Contents'}>
                  <div className="pulse-eyebrow text-[#737373] mb-3.5">
                    {isTr ? 'İçindekiler' : 'Contents'}
                  </div>
                  <div className="flex flex-col border-l border-[#EDEDED]">
                    {tocItems.map((item, index) => (
                      <a
                        key={`${item.id}-${index}`}
                        href={`#${item.id}`}
                        className={`relative -ml-px py-2.5 pl-4 text-[13px] leading-[1.4] transition-colors border-l-2 ${
                          index === 0
                            ? 'border-[#C6F24E] font-semibold text-[#0A0A0A]'
                            : 'border-transparent text-[#737373] hover:text-[#0A0A0A]'
                        }`}
                      >
                        <span
                          className="mr-2 text-[10px] tracking-[0.08em] text-[#A3A3A3]"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {item.text}
                      </a>
                    ))}
                  </div>
                </nav>
              )}
            </div>
          </aside>

          {/* Right - Content */}
          <div className="min-w-0">
            <article
              className="pulse-blog-content prose prose-lg max-w-none
                prose-headings:font-medium prose-headings:text-[#0A0A0A] prose-headings:tracking-[-0.02em]
                prose-h2:text-[26px] sm:prose-h2:text-[32px] prose-h2:mt-12 prose-h2:mb-4
                prose-h3:text-[20px] prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-[#525252] prose-p:leading-[1.75] prose-p:mb-6 prose-p:text-[16px]
                prose-strong:font-semibold prose-strong:text-[#0A0A0A]
                prose-a:text-[#0A0A0A] prose-a:font-medium prose-a:underline prose-a:decoration-[#C6F24E] prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:text-[#A8D62E]
                prose-li:text-[#525252] prose-li:leading-[1.7]
                prose-blockquote:border-l-2 prose-blockquote:border-[#C6F24E] prose-blockquote:pl-5 prose-blockquote:text-[#525252] prose-blockquote:not-italic
                prose-img:rounded-2xl prose-img:border prose-img:border-[#EDEDED]
                prose-hr:border-[#EDEDED]
                break-words"
              style={{ fontFamily: 'var(--font-body)' }}
              dangerouslySetInnerHTML={{ __html: contentWithAnchors }}
            />

            {/* Contact CTA (footer-of-article) */}
            <div className="mt-16 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-6 sm:p-7">
              <h2 className="text-[20px] font-medium tracking-[-0.015em] text-[#0A0A0A]">
                {isTr ? 'Sorun çözülmedi mi?' : 'Did this not solve it?'}
              </h2>
              <p className="mt-2 text-[14px] text-[#525252]">
                {isTr
                  ? 'Destek ekibimize yaz, 2 saat içinde dönelim. Ortalama yanıt süremiz 12 dakika.'
                  : "Write to our support team — we reply within 2 hours. Our median reply time is 12 minutes."}
              </p>
              <Link
                href={`${base}/contact`}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {isTr ? 'İletişime geç' : 'Contact support'}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-14">
          <div className="mx-auto max-w-[1100px]">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2
                className="text-[22px] sm:text-[26px] font-medium tracking-[-0.02em] text-[#0A0A0A]"
              >
                {isTr ? 'Aynı kategoride' : 'In this category'}
              </h2>
              <Link
                href={`${base}/help/category/${article.category}`}
                className="pulse-eyebrow inline-flex items-center gap-1 text-[#737373] hover:text-[#0A0A0A] transition-colors"
              >
                {isTr ? 'TÜMÜNÜ GÖR' : 'SEE ALL'} <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`${base}/help/${r.slug}`}
                  className="group flex flex-col rounded-2xl border border-[#EDEDED] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#C6F24E]"
                >
                  <h3
                    className="text-[16px] font-semibold leading-[1.3] tracking-[-0.015em] text-[#0A0A0A]"
                  >
                    {r.title}
                  </h3>
                  {r.excerpt && (
                    <p className="mt-2 line-clamp-3 text-[13px] leading-[1.55] text-[#525252]">
                      {r.excerpt}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-[#737373] transition-colors group-hover:text-[#0A0A0A]">
                    {isTr ? 'Oku' : 'Read'}
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
