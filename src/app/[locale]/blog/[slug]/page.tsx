import type { Metadata, ResolvingMetadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
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
      images: [{ url: post.coverImage, width: 1200, height: 600, alt: post.title }],
    },
  };
}

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
    image: [post.coverImage],
    author: [{ '@type': 'Organization', name: post.author, url: 'https://buaze.com' }],
    datePublished: post.date,
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* Header */}
      <section className="px-6 sm:px-10 pt-16 sm:pt-20 pb-10 border-b border-[#EDEDED]">
        <div className="max-w-[760px] mx-auto">
          <Link
            href={`${base}/blog`}
            className="pulse-eyebrow inline-flex items-center gap-2 text-[#737373] hover:text-[#0A0A0A] mb-8 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {t.blog_backToBlog.toUpperCase()}
          </Link>

          <div className="pulse-eyebrow text-[#737373] flex items-center gap-3 flex-wrap">
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readTime}</span>
            <span>·</span>
            <span>{post.author}</span>
          </div>

          <h1 className="mt-5 text-[34px] sm:text-[52px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
            {post.title}
          </h1>

          <p className="mt-5 text-[17px] text-[#525252] leading-[1.6] max-w-[640px]">
            {post.description}
          </p>
        </div>
      </section>

      {/* Cover */}
      <section className="px-6 sm:px-10 pt-10">
        <div className="max-w-[880px] mx-auto aspect-[16/9] overflow-hidden rounded-3xl border border-[#EDEDED]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
        </div>
      </section>

      {/* Body */}
      <main className="px-6 sm:px-10 py-14 max-w-[720px] mx-auto">
        <article
          className="prose prose-lg max-w-none
            prose-headings:font-medium prose-headings:text-[#0A0A0A] prose-headings:tracking-[-0.02em]
            prose-h2:text-[26px] prose-h2:mt-12 prose-h2:mb-5
            prose-h3:text-[20px] prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-[#0A0A0A] prose-p:leading-[1.7] prose-p:mb-6 prose-p:text-[17px]
            prose-strong:font-medium prose-strong:text-[#0A0A0A]
            prose-a:text-[#0A0A0A] prose-a:font-medium prose-a:underline prose-a:decoration-[#C6F24E] prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:text-[#A8D62E]
            prose-li:text-[#0A0A0A] prose-li:leading-[1.7]
            prose-blockquote:border-l-2 prose-blockquote:border-[#C6F24E] prose-blockquote:pl-5 prose-blockquote:text-[#525252] prose-blockquote:not-italic
            prose-img:rounded-2xl prose-img:border prose-img:border-[#EDEDED]
            break-words"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </main>

      {/* CTA */}
      <section className="px-6 sm:px-10 pb-20">
        <div className="max-w-[880px] mx-auto bg-[#0A0A0A] rounded-3xl p-8 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h3 className="text-[22px] sm:text-[26px] font-medium text-white tracking-[-0.02em] leading-tight">
              {isTr ? 'Dijitalde rekabeti geride bırakın.' : 'Leave the competition behind.'}
            </h3>
            <p className="mt-2 text-[14px] text-white/70">
              {isTr ? '14 günlük ücretsiz deneme, kredi kartı gerekmez.' : '14-day free trial, no card required.'}
            </p>
          </div>
          <Link
            href={`${base}/auth/register`}
            className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#A8D62E] transition-colors shrink-0"
          >
            {isTr ? 'Ücretsiz başla' : 'Start for free'}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
