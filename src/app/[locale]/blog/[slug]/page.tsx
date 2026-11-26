import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { jsonLdString } from '@/lib/seo/json-ld';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { sanitizeBlogContent } from '@/lib/blog-content';
import { blogDateToIso } from '@/lib/blog-date';
import { resolveBlogPairFromDb } from '@/lib/blog-translation-pairs';
import { SITE_URL } from '@/lib/site';
import { ORGANIZATION_ID } from '@/lib/company-constants';
import { displayBlogAuthor, isTeamAuthor } from '../_lib/author';
import BlogPostView from '../_components/BlogPostView';

// Cache each blog post after its first request (ISR, revalidate from the
// [locale] layout). Without generateStaticParams a dynamic segment renders on
// every request: slower for crawlers and no CDN copy. An empty list means
// "nothing prerendered at build, everything cached on first visit".
export async function generateStaticParams() {
  return [];
}

// generateMetadata and the page both need the post; React `cache` makes the
// second call reuse the first query within the same request.
const getBlogPost = cache((slug: string, locale: string) =>
  prisma.blogPost.findUnique({ where: { slug_locale: { slug, locale } } }),
);

export async function generateMetadata(
  {
    params,
  }: {
    params: Promise<{ locale: Locale; slug: string }>;
  },
): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getBlogPost(slug, locale);

  if (!post || !post.isActive) return { title: locale === 'tr' ? 'Yazı bulunamadı' : 'Post not found' };

  const lang: 'tr' | 'en' = locale === 'en' ? 'en' : 'tr';
  const author = displayBlogAuthor(post.author, lang);
  const ogImage = post.coverImage?.trim() || `/images/open-graph-${lang}.png`;
  const keywords = getBlogKeywords(post.title, post.description, lang);
  const publishedIso = blogDateToIso(post.date) ?? post.createdAt?.toISOString?.();

  // hreflang — paired posts may use a different slug in the other locale.
  // DB-aware lookup (translationGroupId) + static map fallback.
  const otherLocale: Locale = lang === 'tr' ? 'en' : 'tr';
  const pairedSlug = await resolveBlogPairFromDb(slug, lang, otherLocale);
  // Only advertise the other language when that post really exists and is
  // live — falling back to the same slug pointed hreflang at 404s/redirects.
  const counterpart = await prisma.blogPost.findUnique({
    where: { slug_locale: { slug: pairedSlug ?? slug, locale: otherLocale } },
    select: { slug: true, isActive: true },
  });
  const languages: Record<string, string> = {
    [lang]: `${SITE_URL}/${lang}/blog/${slug}`,
  };
  if (counterpart?.isActive) {
    languages[otherLocale] = `${SITE_URL}/${otherLocale}/blog/${counterpart.slug}`;
  }
  languages['x-default'] = languages.tr ?? languages[lang];

  return {
    // The layout template appends " | Buaze" (8 chars). Long post titles keep
    // their own wording instead, so the <title> stays near 60 characters.
    title: post.title.length > 52 ? { absolute: post.title } : post.title,
    description: post.description,
    keywords,
    authors: [{ name: author, url: `${SITE_URL}/${lang}/about` }],
    category: lang === 'tr' ? 'İtibar yönetimi' : 'Reputation management',
    alternates: {
      canonical: `${SITE_URL}/${lang}/blog/${slug}`,
      languages,
      types: { 'application/rss+xml': `${SITE_URL}/${lang}/blog/rss.xml` },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'article:section': lang === 'tr' ? 'İtibar yönetimi' : 'Reputation management',
      'article:tag': keywords.join(', '),
    },
    openGraph: {
      type: 'article',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/blog/${slug}`,
      siteName: 'Buaze',
      title: post.title,
      description: post.description,
      ...(publishedIso ? { publishedTime: publishedIso } : {}),
      authors: [author],
      tags: keywords,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

function extractHeadings(html: string) {
  const matches = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
  return matches
    .map(match => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 8)
    .map(text => ({ text, id: slugifyHeading(text) }));
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

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getBlogKeywords(title: string, description: string, locale: Locale) {
  const base =
    locale === 'tr'
      ? ['itibar yönetimi', 'google yorum', 'müşteri geri bildirimi', 'müşteri deneyimi', 'QR yorum sistemi', 'Buaze']
      : ['reputation management', 'Google reviews', 'customer feedback', 'customer experience', 'QR feedback system', 'Buaze'];

  const sourceWords = `${title} ${description}`
    .toLocaleLowerCase(locale === 'tr' ? 'tr-TR' : 'en-US')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4)
    .slice(0, 10);

  return Array.from(new Set([...base, ...sourceWords]));
}

/**
 * Blog post: lime hero (title + byline), three-column layout on desktop
 * (contents + reading progress · article · author / related / newsletter).
 * Bylines come from the DB; a missing or placeholder author is shown as the
 * Buaze team (spec D3). The Organization is referenced by @id, not repeated.
 */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const lang: 'tr' | 'en' = locale === 'en' ? 'en' : 'tr';
  const t = getTranslations(lang);
  const isTr = lang === 'tr';

  const found = await getBlogPost(slug, lang);
  const post = found && found.isActive ? found : null;

  if (!post) {
    // Fallback 1: the slug belongs to the other locale's post — redirect to
    // this locale's paired slug (DB translationGroupId + static map).
    const otherLocale: Locale = lang === 'tr' ? 'en' : 'tr';
    const pairedInThisLocale = await resolveBlogPairFromDb(slug, otherLocale, lang);
    if (pairedInThisLocale && pairedInThisLocale !== slug) {
      redirect(`/${lang}/blog/${pairedInThisLocale}`);
    }
    // Fallback 2: the same slug is live only in the other locale.
    const sameSlugOther = await prisma.blogPost.findUnique({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { slug_locale: { slug, locale: otherLocale }, isActive: true } as any,
      select: { id: true },
    });
    if (sameSlugOther) {
      redirect(`/${otherLocale}/blog/${slug}`);
    }
    notFound();
  }

  const relatedPosts = await prisma.blogPost.findMany({
    where: { locale: lang, isActive: true, slug: { not: slug } },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { slug: true, title: true, readTime: true, date: true },
  });

  // Fire-and-forget view counter. Raw SQL on purpose: prisma.update() would also
  // rewrite the @updatedAt column on every render, which made BlogPosting.dateModified,
  // the sitemap lastmod and the RSS date move to "now" with no content change.
  // Swallow P2010/P2022-style errors (column not migrated yet on first deploy).
  prisma
    .$executeRaw`UPDATE "blog_posts" SET "view_count" = "view_count" + 1 WHERE "id" = ${post.id}`
    .catch((err) => {
      const code = (err as { code?: string })?.code;
      if (code !== 'P2022' && code !== 'P2010') console.error('[blog viewCount]', err);
    });

  const author = displayBlogAuthor(post.author, lang);
  // A role or bio written for a placeholder name (spec D3) would describe an
  // invented person under the "Buaze team" byline, so it is dropped with it.
  const authorReplaced = author !== (post.author ?? '').trim();
  const authorRole = authorReplaced ? null : post.authorRole?.trim() || null;
  const authorBio = authorReplaced ? null : post.authorBio?.trim() || null;
  const pullQuoteAuthor = post.pullQuoteAuthor?.trim()
    ? displayBlogAuthor(post.pullQuoteAuthor, lang)
    : author;
  const coverUrl = post.coverImage?.trim() || '';
  const imageUrl = coverUrl
    ? coverUrl.startsWith('/') ? `${SITE_URL}${coverUrl}` : coverUrl
    : `${SITE_URL}/images/open-graph-${lang}.png`;
  const postUrl = `${SITE_URL}/${lang}/blog/${slug}`;
  const publishedIso = blogDateToIso(post.date) ?? post.createdAt?.toISOString?.() ?? null;
  const content = addHeadingAnchors(sanitizeBlogContent(post.content));
  const tocItems = extractHeadings(content);

  // Admin override → manual tag list, fallback → keyword auto-derive.
  const tags = (post.tags && post.tags.length > 0)
    ? post.tags.slice(0, 6)
    : getBlogKeywords(post.title, post.description, lang).slice(0, 6);
  const ctaTitle = post.ctaTitle?.trim() || (isTr ? "Buaze'yi 14 gün ücretsiz deneyin" : 'Try Buaze free for 14 days');
  const ctaSubtitle = post.ctaSubtitle?.trim() || (isTr
    ? 'Kredi kartı gerekmez. Kurulum sihirbazıyla QR kodunuzu ve platform bağlantılarınızı adım adım hazırlarsınız.'
    : 'No credit card needed. The setup wizard walks you through your QR code and platform links.');
  const ctaButtonLabel = post.ctaButtonLabel?.trim() || (isTr ? 'Ücretsiz deneyin' : 'Start free trial');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${postUrl}#article`,
        mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
        isPartOf: { '@id': `${SITE_URL}/${lang}/blog#blog` },
        headline: post.title,
        description: post.description,
        image: [imageUrl],
        author: [
          isTeamAuthor(author)
            ? { '@type': 'Organization', name: author, url: `${SITE_URL}/${lang}/about` }
            : { '@type': 'Person', name: author },
        ],
        publisher: { '@id': ORGANIZATION_ID },
        // Google requires ISO 8601; `post.date` is human-readable
        // ("15 Mart 2026" / "March 15, 2026"), so parse it and fall back to
        // the DB timestamps.
        ...(publishedIso ? { datePublished: publishedIso } : {}),
        dateModified: post.updatedAt?.toISOString?.() ?? publishedIso ?? undefined,
        inLanguage: isTr ? 'tr-TR' : 'en-US',
        isAccessibleForFree: true,
        articleSection: isTr ? 'İtibar yönetimi' : 'Reputation management',
        keywords: getBlogKeywords(post.title, post.description, lang),
        wordCount: stripHtml(post.content).split(' ').filter(Boolean).length,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isTr ? 'Ana sayfa' : 'Home', item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/${lang}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
        ],
      },
    ],
  };

  return (
    <div id="top" className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={lang} />
      <main id="main-content">
        <BlogPostView
          lang={lang}
          backLabel={t.blog_backToBlog}
          post={{
            title: post.title,
            description: post.description,
            readTime: post.readTime,
            date: post.date,
            pullQuote: post.pullQuote?.trim() || null,
          }}
          publishedIso={publishedIso}
          author={author}
          authorRole={authorRole}
          authorBio={authorBio}
          pullQuoteAuthor={pullQuoteAuthor}
          content={content}
          tocItems={tocItems}
          tags={tags}
          postUrl={postUrl}
          ctaTitle={ctaTitle}
          ctaSubtitle={ctaSubtitle}
          ctaButtonLabel={ctaButtonLabel}
          relatedPosts={relatedPosts}
        />
      </main>
      <MarketingFooter locale={lang} />
    </div>
  );
}
