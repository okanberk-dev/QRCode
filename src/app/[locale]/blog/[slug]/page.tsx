import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import NewsletterSignup from '@/components/marketing/NewsletterSignup';
import BlogReadingProgress from '@/components/marketing/BlogReadingProgress';
import BlogCopyLinkButton from '@/components/marketing/BlogCopyLinkButton';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { sanitizeBlogContent } from '@/lib/blog-content';
import { blogDateToIso } from '@/lib/blog-date';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

// Brand SVGs — lucide-react dropped Twitter/Linkedin/Whatsapp icons; inline
// glyph paths keep the share row dependency-free and recolour via currentColor.
const SHARE_ICONS = {
  twitter: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.11 2.06 2.06 0 0 1 0 4.11zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  ),
};

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  {
    params,
  }: {
    params: Promise<{ locale: Locale; slug: string }>;
  },
): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug_locale: { slug, locale } },
  });

  if (!post) return { title: 'Post Not Found' };

  const ogImage = post.coverImage?.trim() || `/images/open-graph-${locale}.png`;
  const keywords = getBlogKeywords(post.title, post.description, locale);

  return {
    title: `${post.title} — Buaze Blog`,
    description: post.description,
    keywords,
    authors: [{ name: post.author, url: 'https://buaze.com' }],
    publisher: 'Buaze',
    category: locale === 'tr' ? 'İtibar yönetimi' : 'Reputation management',
    alternates: {
      canonical: `https://buaze.com/${locale}/blog/${slug}`,
      languages: {
        tr: `https://buaze.com/tr/blog/${slug}`,
        en: `https://buaze.com/en/blog/${slug}`,
        'x-default': `https://buaze.com/en/blog/${slug}`,
      },
    },
    robots: {
      index: Boolean(post.isActive),
      follow: true,
      googleBot: {
        index: Boolean(post.isActive),
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'geo.region': 'TR-34',
      'geo.placename': 'Ataşehir, İstanbul',
      'geo.position': '40.9923;29.1244',
      ICBM: '40.9923, 29.1244',
      'article:section': locale === 'tr' ? 'İtibar Yönetimi' : 'Reputation Management',
      'article:tag': keywords.join(', '),
    },
    openGraph: {
      type: 'article',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: `https://buaze.com/${locale}/blog/${slug}`,
      siteName: 'Buaze',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: [post.author],
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

function authorInitials(name: string) {
  return name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
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
      ? ['itibar yönetimi', 'google yorum', 'restoran yorum yönetimi', 'müşteri deneyimi', 'QR yorum sistemi', 'Buaze']
      : ['reputation management', 'Google reviews', 'restaurant review management', 'customer experience', 'QR feedback system', 'Buaze'];

  const sourceWords = `${title} ${description}`
    .toLocaleLowerCase(locale === 'tr' ? 'tr-TR' : 'en-US')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4)
    .slice(0, 10);

  return Array.from(new Set([...base, ...sourceWords]));
}

/**
 * 1:1 with .design/site/site-pages4.jsx:BlogPostPage (lines 448-533):
 * lime hero + eyebrow (read time) + big title + author row, 2-col content grid
 * (article + sticky TOC/author sidebar), dark CTA box.
 */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const post = await prisma.blogPost.findUnique({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { slug_locale: { slug, locale }, isActive: true } as any,
  });

  if (!post) notFound();

  const relatedPosts = await prisma.blogPost.findMany({
    where: { locale, isActive: true, slug: { not: slug } },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { slug: true, title: true, readTime: true, author: true, date: true },
  });

  // Fire-and-forget view counter — atomic increment, swallow P2022 (column
  // not migrated yet on first deploy after schema change).
  prisma.blogPost
    .update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    })
    .catch((err) => {
      const code = (err as { code?: string })?.code;
      if (code !== 'P2022') console.error('[blog viewCount]', err);
    });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `https://buaze.com/${locale}/blog/${slug}#article`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://buaze.com/${locale}/blog/${slug}`,
    },
    headline: post.title,
    description: post.description,
    image: [post.coverImage?.trim() || `https://buaze.com/images/open-graph-${locale}.png`],
    author: [{ '@type': 'Organization', name: post.author, url: 'https://buaze.com' }],
    publisher: {
      '@type': 'Organization',
      name: 'Buaze',
      logo: {
        '@type': 'ImageObject',
        url: 'https://buaze.com/favicon.svg',
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Ataşehir',
        addressRegion: 'İstanbul',
        addressCountry: 'TR',
      },
    },
    // Google Article schema requires ISO 8601. `post.date` is the human-
    // readable form ("March 15, 2026" / "15 Mart 2026"); fall back to the
    // DB createdAt if parsing fails.
    datePublished:
      blogDateToIso(post.date)
      ?? post.createdAt?.toISOString?.()
      ?? post.date,
    dateModified:
      post.updatedAt?.toISOString?.()
      ?? blogDateToIso(post.date)
      ?? post.date,
    inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
    isAccessibleForFree: true,
    articleSection: isTr ? 'İtibar Yönetimi' : 'Reputation Management',
    keywords: getBlogKeywords(post.title, post.description, locale),
    wordCount: stripHtml(post.content).split(' ').filter(Boolean).length,
    about: [
      { '@type': 'Thing', name: isTr ? 'Restoran itibar yönetimi' : 'Restaurant reputation management' },
      { '@type': 'Thing', name: 'Google Reviews' },
      { '@type': 'Thing', name: 'QR feedback' },
    ],
    spatialCoverage: {
      '@type': 'Place',
      name: 'Türkiye',
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 40.9923,
        longitude: 29.1244,
      },
    },
  };

  const content = addHeadingAnchors(sanitizeBlogContent(post.content));
  const tocItems = extractHeadings(content);

  return (
    <div id="top" className="min-h-screen bg-white text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* ─── Hero · lime bg + eyebrow + title + author row + ECG decoration ─── */}
      <section className="relative overflow-hidden bg-[#C6F24E] px-5 sm:px-10 pt-[60px] sm:pt-16 pb-[60px] sm:pb-24">
        <svg
          aria-hidden
          viewBox="0 0 300 200"
          className="pointer-events-none absolute bottom-0 right-6 sm:right-12 w-[260px] sm:w-[400px] opacity-[0.15]"
        >
          <path
            d="M0 150 L40 120 L80 140 L120 90 L160 100 L200 60 L240 80 L280 40 L300 30"
            fill="none"
            stroke="#0A0A0A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="200" cy="60" r="12" fill="#0A0A0A" />
          <circle cx="280" cy="40" r="8" fill="#0A0A0A" />
        </svg>

        <div className="relative max-w-[1200px] mx-auto">
          <Link
            href={`${base}/blog`}
            className="pulse-eyebrow inline-flex items-center gap-2 text-[#0A0A0A]/70 hover:text-[#0A0A0A] mb-7 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {t.blog_backToBlog.toUpperCase()}
          </Link>

          <div className="max-w-[800px]">
            <div
              className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {(isTr ? 'BUAZE' : 'BUAZE')} · {post.readTime.toUpperCase()}
            </div>
            <h1
              className="mt-3 sm:mt-4 text-[32px] sm:text-[48px] lg:text-[56px] font-medium leading-[1] tracking-[-0.03em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {post.title}
            </h1>

            <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]">
                  {authorInitials(post.author)}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#0A0A0A]">{post.author}</div>
                  <div className="text-[12px] text-[#0A0A0A]/70">
                    {post.authorRole || (isTr ? 'Buaze · Yazar' : 'Buaze · Author')}
                  </div>
                </div>
              </div>
              <div className="text-[12px] text-[#0A0A0A]/70">{post.date}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Content grid · 3-col (TOC + article + meta) ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20">
        {(() => {
          const postUrl = `https://buaze.com/${locale}/blog/${slug}`;
          // Admin override → manual tag list, fallback → keyword auto-derive.
          const tags = (post.tags && post.tags.length > 0)
            ? post.tags.slice(0, 6)
            : getBlogKeywords(post.title, post.description, locale).slice(0, 6);
          const takeaways = tocItems.slice(0, 4);
          const shareText = encodeURIComponent(post.title);
          const shareUrl = encodeURIComponent(postUrl);
          const authorRole = post.authorRole || (isTr ? 'Buaze · Yazar' : 'Buaze · Author');
          const authorBio = post.authorBio || (isTr
            ? 'Buaze ekibinden, restoran ve perakende için itibar yönetimi üzerine yazıyor.'
            : 'Writes about restaurant and retail reputation management for the Buaze team.');
          const ctaTitle = post.ctaTitle || (isTr
            ? 'Google politikalarına uyumlu büyümeye hazır mısın?'
            : 'Ready to grow the Google-compliant way?');
          const ctaSubtitle = post.ctaSubtitle || (isTr
            ? '14 gün ücretsiz · kredi kartı gerekmez · 5 dakikada kurulum'
            : '14 days free · no card required · 5-minute setup');
          const ctaButtonLabel = post.ctaButtonLabel || (isTr ? 'Ücretsiz başla' : 'Start free');
          const pullQuoteAuthorName = post.pullQuoteAuthor || post.author;

          return (
            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:gap-14">
              {/* ── LEFT — TOC + Reading progress + Share (desktop only) ── */}
              <aside className="hidden lg:block">
                <div className="sticky top-24 flex flex-col gap-5">
                  {tocItems.length > 0 && (
                    <div>
                      <div className="pulse-eyebrow text-[#737373]">
                        {isTr ? 'İçindekiler' : 'Contents'}
                      </div>
                      <nav className="mt-3.5 flex flex-col border-l border-[#EDEDED]">
                        {tocItems.map((item, index) => (
                          <a
                            key={`${item.id}-${index}`}
                            href={`#${item.id}`}
                            className={`relative -ml-px py-2.5 pl-4 text-[13px] leading-[1.4] transition-colors ${
                              index === 0
                                ? 'border-l-2 border-[#C6F24E] font-semibold text-[#0A0A0A]'
                                : 'border-l-2 border-transparent text-[#737373] hover:text-[#0A0A0A]'
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
                      </nav>
                    </div>
                  )}

                  <BlogReadingProgress readTime={post.readTime} locale={locale} />

                  <div className="border-t border-[#EDEDED] pt-5">
                    <div className="pulse-eyebrow text-[#737373]">
                      {isTr ? 'Paylaş' : 'Share'}
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <a
                        href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={isTr ? "X'te paylaş" : 'Share on X'}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                      >
                        {SHARE_ICONS.twitter}
                      </a>
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={isTr ? "LinkedIn'de paylaş" : 'Share on LinkedIn'}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                      >
                        {SHARE_ICONS.linkedin}
                      </a>
                      <a
                        href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={isTr ? "WhatsApp'ta paylaş" : 'Share on WhatsApp'}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                      >
                        {SHARE_ICONS.whatsapp}
                      </a>
                      <BlogCopyLinkButton url={postUrl} locale={locale} />
                    </div>
                  </div>
                </div>
              </aside>

              {/* ── CENTER — Article ── */}
              <article id="article-body" className="lg:max-w-[680px]">
                <div className="pulse-blog-lead">{post.description}</div>

                <div
                  className="pulse-blog-content prose prose-lg max-w-none
                    prose-headings:font-medium prose-headings:text-[#0A0A0A] prose-headings:tracking-[-0.02em]
                    prose-h2:text-[26px] sm:prose-h2:text-[32px] prose-h2:mt-12 prose-h2:mb-4
                    prose-h3:text-[20px] prose-h3:mt-8 prose-h3:mb-3
                    prose-p:text-[#525252] prose-p:leading-[1.75] prose-p:mb-6 prose-p:text-[16px]
                    prose-strong:font-semibold prose-strong:text-[#0A0A0A]
                    prose-a:text-[#0A0A0A] prose-a:font-medium prose-a:underline prose-a:decoration-[#C6F24E] prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:text-[#A8D62E]
                    prose-li:text-[#525252] prose-li:leading-[1.7]
                    prose-blockquote:not-italic
                    prose-img:rounded-2xl prose-img:border prose-img:border-[#EDEDED]
                    prose-hr:border-[#EDEDED]
                    break-words"
                  style={{ fontFamily: 'var(--font-body)' }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />

                {post.pullQuote && (
                  <div className="my-14 border-y border-[#0A0A0A] py-9">
                    <blockquote
                      className="text-[22px] sm:text-[28px] font-medium leading-[1.25] tracking-[-0.02em] text-[#0A0A0A]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      <span className="mr-1.5 text-[#A8D62E]">&ldquo;</span>
                      {post.pullQuote}
                      <span className="ml-1 text-[#A8D62E]">&rdquo;</span>
                    </blockquote>
                    <div className="mt-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]">
                        {authorInitials(pullQuoteAuthorName)}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-[#0A0A0A]">{pullQuoteAuthorName}</div>
                        <div className="text-[12px] text-[#737373]">{authorRole}</div>
                      </div>
                    </div>
                  </div>
                )}

                {takeaways.length > 0 && (
                  <div className="mt-14 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-7 sm:p-8">
                    <div className="pulse-eyebrow text-[#737373]">
                      {isTr ? 'Özet · Yanına alacakların' : 'Takeaways · For your back pocket'}
                    </div>
                    <h3
                      className="mt-3 text-[22px] sm:text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0A]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {isTr ? `${takeaways.length} başlık, 1 sayfada.` : `${takeaways.length} ideas, on one page.`}
                    </h3>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {takeaways.map((item, i) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className="flex items-center gap-3 rounded-xl border border-[#EDEDED] bg-white px-4 py-3.5 text-[14px] font-medium text-[#0A0A0A] transition-colors hover:border-[#0A0A0A]"
                        >
                          <span
                            className="text-[10px] tracking-[0.1em] text-[#737373]"
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="line-clamp-2 leading-[1.35]">{item.text}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-10 grid grid-cols-1 gap-6 rounded-[18px] bg-[#0A0A0A] p-7 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-9">
                  <div>
                    <div className="pulse-eyebrow text-[#C6F24E]">
                      {isTr ? 'Hemen başla' : 'Get started'}
                    </div>
                    <h3
                      className="mt-2.5 text-[24px] sm:text-[28px] font-medium leading-[1.15] tracking-[-0.02em]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {ctaTitle}
                    </h3>
                    <p className="mt-2 text-[13px] text-white/65">{ctaSubtitle}</p>
                  </div>
                  <Link
                    href={`${base}/auth/register`}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#C6F24E] px-6 py-3.5 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] sm:self-auto"
                  >
                    {ctaButtonLabel}
                    <span aria-hidden>→</span>
                  </Link>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-2">
                  <span className="pulse-eyebrow text-[#737373] mr-1">
                    {isTr ? 'Etiketler' : 'Tags'}
                  </span>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#F2F2F2] px-3 py-1.5 text-[12px] tracking-[0.04em] text-[#525252]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </article>

              {/* ── RIGHT — Author + Related + Newsletter ── */}
              <aside>
                <div className="lg:sticky lg:top-24 flex flex-col gap-5">
                  <div className="rounded-[14px] border border-[#EDEDED] bg-white p-5">
                    <div className="pulse-eyebrow text-[#737373]">
                      {isTr ? 'Yazar' : 'Author'}
                    </div>
                    <div className="mt-3.5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0A0A0A] text-[14px] font-semibold text-[#C6F24E]">
                        {authorInitials(post.author)}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-[#0A0A0A]">{post.author}</div>
                        <div className="text-[12px] text-[#525252]">{authorRole}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] leading-[1.55] text-[#525252]">{authorBio}</p>
                  </div>

                  {relatedPosts.length > 0 && (
                    <div className="rounded-[14px] border border-[#EDEDED] bg-white p-5">
                      <div className="pulse-eyebrow text-[#737373]">
                        {isTr ? 'İlgili yazılar' : 'Related posts'}
                      </div>
                      <ul className="mt-3.5 flex flex-col gap-3">
                        {relatedPosts.map((rp, i) => (
                          <li
                            key={rp.slug}
                            className={i < relatedPosts.length - 1 ? 'border-b border-[#EDEDED] pb-3' : ''}
                          >
                            <Link href={`${base}/blog/${rp.slug}`} className="group block">
                              <div
                                className="text-[14px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#0A0A0A] group-hover:underline group-hover:decoration-[#C6F24E] group-hover:decoration-2 group-hover:underline-offset-4"
                                style={{ fontFamily: 'var(--font-heading)' }}
                              >
                                {rp.title}
                              </div>
                              <div
                                className="mt-1.5 text-[10px] tracking-[0.08em] text-[#737373]"
                                style={{ fontFamily: 'var(--font-mono)' }}
                              >
                                {rp.readTime} · {rp.date}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-[14px] bg-[#0A0A0A] p-5 text-white">
                    <div className="pulse-eyebrow text-[#C6F24E]">
                      {isTr ? 'Bülten' : 'Newsletter'}
                    </div>
                    <div
                      className="mt-2 text-[18px] font-medium leading-[1.2] tracking-[-0.015em]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {isTr ? 'Haftada bir, sadece taktik.' : 'One email a week. Pure tactics.'}
                    </div>
                    <p className="mt-2 text-[12px] leading-[1.55] text-white/60">
                      {isTr
                        ? 'Spam yok, sadece test edilmiş öneriler.'
                        : 'No spam — only field-tested ideas.'}
                    </p>
                    <div className="mt-3.5">
                      <NewsletterSignup locale={locale} source="blog_inline" stacked />
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          );
        })()}
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
