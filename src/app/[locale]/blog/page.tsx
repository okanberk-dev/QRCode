import type { Metadata } from 'next';
import { Rss } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { ORGANIZATION_ID, WEBSITE_ID } from '@/lib/company-constants';
import { blogDateToIso } from '@/lib/blog-date';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';
import BlogIndexList, { type BlogCard } from './_components/BlogIndexList';
import { displayBlogAuthor } from './_lib/author';

/**
 * /blog — statically generated (ISR, 1 h). The category filter runs on the
 * client over the full, server-rendered list, so the page never reads
 * searchParams (that used to force a render on every request and linked to
 * robots-blocked ?cat= URLs). Posts and bylines come from the DB.
 */

export const revalidate = 3600;

type Lang = 'tr' | 'en';

const META = {
  tr: {
    title: 'Blog: yorum yönetimi ve QR geri bildirim rehberleri',
    description:
      'Restoran, otel, klinik ve mağazalar için yorum yönetimi, QR kodla müşteri geri bildirimi toplama ve müşteri deneyimi üzerine rehberler ve yazılar.',
  },
  en: {
    title: 'Blog: guides to review management and QR feedback',
    description:
      'Guides and articles for restaurants, hotels, clinics and shops on review management, collecting customer feedback with QR codes and customer experience.',
  },
} as const;

const COPY = {
  tr: {
    eyebrow: 'Blog',
    h1: 'Yorum yönetimi blogu',
    lead: 'Restoran, otel, klinik ve mağazalar için yorum yönetimi, QR kodla geri bildirim toplama ve müşteri deneyimi üzerine yazılar.',
    rss: 'RSS ile takip edin',
    all: 'Tümü',
    filterGroup: 'Kategoriye göre filtrele',
    latest: 'En yeni yazı',
    results: '{n} yazı gösteriliyor',
    empty: 'Henüz yayımlanmış bir yazı yok.',
    home: 'Ana sayfa',
  },
  en: {
    eyebrow: 'Blog',
    h1: 'Review management blog',
    lead: 'Articles for restaurants, hotels, clinics and shops on review management, collecting feedback with QR codes and customer experience.',
    rss: 'Follow via RSS',
    all: 'All',
    filterGroup: 'Filter by category',
    latest: 'Latest post',
    results: 'Showing {n} posts',
    empty: 'No posts have been published yet.',
    home: 'Home',
  },
} as const;

/** Filter key → tag variants (TR + EN, whichever language the admin tagged in). */
const FILTER_TAGS: Record<string, { label: { tr: string; en: string }; tags: string[] }> = {
  guide: { label: { tr: 'Rehber', en: 'Guide' }, tags: ['rehber', 'guide', 'kılavuz'] },
  strategy: { label: { tr: 'Strateji', en: 'Strategy' }, tags: ['strateji', 'strategy', 'büyüme', 'growth'] },
  industry: { label: { tr: 'Sektör', en: 'Industry' }, tags: ['sektör', 'industry'] },
  product: { label: { tr: 'Ürün', en: 'Product' }, tags: ['ürün', 'product'] },
};

/**
 * The site-wide default share image is not a post cover (it is a generic
 * brand graphic); cards without a real cover get the plain branded pad.
 */
const DEFAULT_SHARE_IMAGE = /\/images\/open-graph-(tr|en)\.png$/;

function coverFor(raw: string | null | undefined): string {
  const url = raw?.trim() ?? '';
  return url && !DEFAULT_SHARE_IMAGE.test(url) ? url : '';
}

function categoriesFor(tags: string[]): string[] {
  const lower = tags.map((t) => t.toLocaleLowerCase('tr-TR').trim());
  return Object.entries(FILTER_TAGS)
    .filter(([, def]) => def.tags.some((tag) => lower.includes(tag)))
    .map(([key]) => key);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang: Lang = locale === 'en' ? 'en' : 'tr';
  const { title, description } = META[lang];
  const ogImage = lang === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/blog`,
      languages: { tr: '/tr/blog', en: '/en/blog', 'x-default': '/tr/blog' },
      types: { 'application/rss+xml': `${SITE_URL}/${lang}/blog/rss.xml` },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/blog`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const lang: Lang = locale === 'en' ? 'en' : 'tr';
  const copy = COPY[lang];
  const pageUrl = `${SITE_URL}/${lang}/blog`;

  // No catch on purpose: if a revalidation fails, ISR keeps serving the last
  // good page instead of caching an empty list for an hour.
  const rows = await prisma.blogPost.findMany({
    where: { locale: lang, isActive: true },
    orderBy: { createdAt: 'desc' },
    // List fields only — the index never renders the post body.
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      coverImage: true,
      author: true,
      date: true,
      readTime: true,
      tags: true,
    },
  });

  const posts: BlogCard[] = rows.map((row) => {
    const categories = categoriesFor(row.tags ?? []);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description ?? '',
      coverImage: coverFor(row.coverImage),
      author: displayBlogAuthor(row.author, lang),
      date: row.date,
      dateIso: blogDateToIso(row.date),
      readTime: row.readTime,
      categories,
      categoryLabel: categories[0] ? FILTER_TAGS[categories[0]].label[lang] : null,
    };
  });

  const filters = Object.entries(FILTER_TAGS)
    .filter(([key]) => posts.some((p) => p.categories.includes(key)))
    .map(([key, def]) => ({ key, label: def.label[lang] }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${pageUrl}#blog`,
        url: pageUrl,
        name: copy.h1,
        description: META[lang].description,
        inLanguage: lang === 'tr' ? 'tr-TR' : 'en-US',
        isPartOf: { '@id': WEBSITE_ID },
        publisher: { '@id': ORGANIZATION_ID },
        ...(posts.length > 0
          ? {
              blogPost: posts.map((p) => ({
                '@type': 'BlogPosting',
                headline: p.title,
                url: `${SITE_URL}/${lang}/blog/${p.slug}`,
                ...(p.dateIso ? { datePublished: p.dateIso } : {}),
              })),
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: copy.home, item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: copy.eyebrow, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={lang} />
      <main id="main-content" className="pb-[60px] sm:pb-24">
        <section aria-labelledby="blog-title" className="pt-[60px] pb-8 sm:pt-20 sm:pb-10">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <div className="max-w-[720px]">
              <p className="pulse-eyebrow text-[#737373]">{copy.eyebrow}</p>
              <h1
                id="blog-title"
                className="mt-4 text-balance text-[38px] leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[56px] md:text-[52px] lg:text-[64px]"
              >
                {copy.h1}
              </h1>
              <p className="mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
                {copy.lead}
              </p>
              <a
                href={`/${lang}/blog/rss.xml`}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-[14px] font-semibold text-[#0A0A0A] underline decoration-[#5D3EBC] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2"
              >
                <Rss size={15} aria-hidden="true" />
                {copy.rss}
              </a>
            </div>
          </div>
        </section>

        {posts.length > 0 ? (
          <BlogIndexList
            locale={lang}
            posts={posts}
            filters={filters}
            labels={{ all: copy.all, filterGroup: copy.filterGroup, latest: copy.latest, results: copy.results }}
          />
        ) : (
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <p className="rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] px-6 py-14 text-center text-[16px] text-[#525252]">
              {copy.empty}
            </p>
          </div>
        )}
      </main>
      <MarketingFooter locale={lang} />
    </div>
  );
}
