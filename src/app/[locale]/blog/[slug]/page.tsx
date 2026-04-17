import type { Metadata, ResolvingMetadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { blogPosts } from '@/lib/blogData';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { notFound } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}, parent: ResolvingMetadata): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = blogPosts[locale].find(p => p.slug === slug);
  
  if (!post) {
    return { title: 'Post Not Found' };
  }

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
    },
  };
}

export function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  
  ['tr', 'en'].forEach((locale) => {
    const posts = blogPosts[locale as 'tr' | 'en'];
    posts.forEach((post) => {
      params.push({ locale, slug: post.slug });
    });
  });

  return params;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  
  const post = blogPosts[locale].find(p => p.slug === slug);
  if (!post) notFound();

  // JsonLd Article Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    author: [{
      '@type': 'Organization',
      name: post.author,
      url: 'https://buaze.com',
    }],
    datePublished: post.date,
  };

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px] selection:bg-[#FDBF1D]/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      <main className="py-12 sm:py-20 px-5 sm:px-8 max-w-[800px] mx-auto">
        <Link href={`${base}/blog`} className="inline-flex items-center gap-2 text-[14px] font-bold text-[#ada89f] hover:text-[#1f1e1d] transition-colors mb-8 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {t.blog_backToBlog}
        </Link>
        
        <article>
          <header className="mb-10 space-y-6">
            <h1 className="text-[36px] sm:text-[48px] font-black leading-[1.1] tracking-[-0.03em] text-[#1f1e1d]">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[13px] font-bold text-[#6b6760] border-y border-[#e8e4de] py-4">
              <span className="flex items-center gap-1.5"><Calendar size={16} className="text-[#ea580c]"/> {post.date}</span>
              <span className="flex items-center gap-1.5"><Clock size={16} className="text-[#FDBF1D]"/> {post.readTime}</span>
              <span className="flex items-center gap-1.5"><User size={16} className="text-[#10b981]"/> {post.author}</span>
            </div>
          </header>

          <div
            className="prose prose-lg max-w-none 
            prose-headings:font-black prose-headings:text-[#1f1e1d] prose-headings:tracking-[-0.02em]
            prose-h2:text-[28px] prose-h2:mt-12 prose-h2:mb-6
            prose-h3:text-[22px] prose-h3:mt-8 prose-h3:mb-4
            prose-p:text-[#6b6760] prose-p:font-medium prose-p:leading-relaxed prose-p:mb-6
            prose-strong:font-extrabold prose-strong:text-[#1f1e1d]
            prose-a:text-[#ea580c] prose-a:font-bold hover:prose-a:text-[#c2410c]
            prose-li:text-[#6b6760] prose-li:font-medium
            break-words"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-16 pt-10 border-t-2 border-[#1f1e1d] flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#F7F4F0] p-8 rounded-2xl">
            <div className="space-y-2 text-center sm:text-left">
              <h4 className="text-[20px] font-black">{locale === 'tr' ? 'Google Puanınızı Artırmaya Hazır mısınız?' : 'Ready to Boost Your Google Rating?'}</h4>
              <p className="text-[14px] text-[#6b6760] font-medium">{locale === 'tr' ? 'Buaze ile ilk ayınızda ortalama 0.5 puan artış yakalayın.' : 'Achieve an average 0.5 rating boost in your first month with Buaze.'}</p>
            </div>
            <Link
              href={`${base}/auth/register`}
              className="px-6 py-3 bg-[#1f1e1d] text-white text-[14px] font-extrabold rounded-xl border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#000] hover:bg-[#111] active:translate-y-1 active:shadow-none transition-all flex-shrink-0"
            >
              {locale === 'tr' ? 'Ücretsiz Başla' : 'Start for Free'}
            </Link>
          </div>
        </article>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
