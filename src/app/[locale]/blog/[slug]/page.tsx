import type { Metadata, ResolvingMetadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { sanitizeBlogContent } from '@/lib/blog-content';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  {
    params,
  }: {
    params: Promise<{ locale: Locale; slug: string }>;
  },
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug_locale: { slug, locale } },
  });

  if (!post) return { title: 'Post Not Found' };

  const ogImage = post.coverImage?.trim() || `/images/open-graph-${locale}.png`;

  return {
    title: `${post.title} — Buaze Blog`,
    description: post.description,
    alternates: {
      canonical: `https://buaze.com/${locale}/blog/${slug}`,
    },
    openGraph: {
      type: 'article',
      url: `https://buaze.com/${locale}/blog/${slug}`,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
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
    .slice(0, 6);
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: [post.coverImage?.trim() || `https://buaze.com/images/open-graph-${locale}.png`],
    author: [{ '@type': 'Organization', name: post.author, url: 'https://buaze.com' }],
    datePublished: post.date,
  };

  const content = sanitizeBlogContent(post.content);
  const tocItems = extractHeadings(content);

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero · lime bg + eyebrow + title + author row + ECG decoration ─── */}
      <section className="relative overflow-hidden bg-[#C6F24E] px-6 sm:px-10 pt-12 sm:pt-16 pb-16 sm:pb-24">
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
              className="mt-3 sm:mt-4 text-[36px] sm:text-[48px] lg:text-[56px] font-medium leading-[1] tracking-[-0.03em] text-[#0A0A0A]"
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
                    {isTr ? 'Buaze · Yazar' : 'Buaze · Author'}
                  </div>
                </div>
              </div>
              <div className="text-[12px] text-[#0A0A0A]/70">{post.date}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Content grid · main article + sticky TOC/author sidebar ─── */}
      <section className="px-6 sm:px-10 py-[60px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-10 lg:gap-12">
          {/* Main column */}
          <div>
            {/* Lead (description) */}
            <p className="text-[18px] sm:text-[20px] leading-[1.6] text-[#0A0A0A]">
              {post.description}
            </p>

            {/* Body */}
            <article
              className="pulse-blog-content mt-8 prose prose-lg max-w-none
                prose-headings:font-medium prose-headings:text-[#0A0A0A] prose-headings:tracking-[-0.02em]
                prose-h2:text-[26px] sm:prose-h2:text-[28px] prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-[20px] prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-[#525252] prose-p:leading-[1.7] prose-p:mb-6 prose-p:text-[16px]
                prose-strong:font-semibold prose-strong:text-[#0A0A0A]
                prose-a:text-[#0A0A0A] prose-a:font-medium prose-a:underline prose-a:decoration-[#C6F24E] prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:text-[#A8D62E]
                prose-li:text-[#525252] prose-li:leading-[1.7]
                prose-blockquote:not-italic
                prose-img:rounded-2xl prose-img:border prose-img:border-[#EDEDED]
                break-words"
              style={{ fontFamily: 'var(--font-body)' }}
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* CTA box (from design) */}
            <div className="mt-12 rounded-[18px] bg-[#0A0A0A] text-white p-7 sm:p-9">
              <h3
                className="text-[24px] sm:text-[28px] font-medium leading-[1.15] tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr
                  ? 'Google politikalarına uyumlu büyümeye hazır mısınız?'
                  : 'Ready to grow in a Google-policy-safe way?'}
              </h3>
              <p className="mt-2 text-[14px] text-white/70">
                {isTr
                  ? 'Buaze, akışın her adımını denetler. 14 gün ücretsiz başlayın.'
                  : 'Buaze monitors every step of the flow. Start free for 14 days.'}
              </p>
              <Link
                href={`${base}/auth/register`}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#C6F24E] px-5 py-3 text-[14px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
              >
                {isTr ? 'Ücretsiz başla' : 'Start free'}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* Sidebar · meta + author (sticky on desktop) */}
          <aside className="lg:pl-2">
            <div className="lg:sticky lg:top-24 flex flex-col gap-5">
              <div className="rounded-[14px] border border-[#EDEDED] bg-[#FAFAFA] p-5">
                <div
                  className="text-[10px] font-semibold tracking-[0.14em] text-[#737373]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {isTr ? 'İÇERİK' : 'CONTENT'}
                </div>
                <ul className="mt-4 space-y-3">
                  {(tocItems.length ? tocItems : [post.title]).map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className={`text-[13px] leading-5 ${
                        index === 0 ? 'font-semibold text-[#0A0A0A]' : 'font-medium text-[#737373]'
                      }`}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[14px] bg-[#EAF9B8] p-5">
                <div
                  className="text-[10px] font-semibold tracking-[0.14em] text-[#737373]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {isTr ? 'YAZAR' : 'AUTHOR'}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]">
                    {authorInitials(post.author)}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#0A0A0A]">{post.author}</div>
                    <div className="text-[12px] text-[#525252]">
                      {isTr ? 'Buaze · Yazar' : 'Buaze · Author'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
