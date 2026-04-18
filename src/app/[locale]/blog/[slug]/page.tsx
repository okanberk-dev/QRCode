import type { Metadata, ResolvingMetadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  const posts = await prisma.blogPost.findMany({
    select: { locale: true, slug: true },
  });

  return posts.map((post) => ({
    locale: post.locale as Locale,
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}, _parent: ResolvingMetadata): Promise<Metadata> {
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
  
  const post = await prisma.blogPost.findUnique({
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
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px] selection:bg-[#FDBF1D]/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* Article Hero */}
      <div className="w-full bg-[#1f1e1d] relative pt-16 pb-32 px-5 sm:px-8 overflow-hidden z-0">
        <div className="absolute inset-0 opacity-40">
          <img src={post.coverImage} alt="Background" className="w-full h-full object-cover blur-sm scale-105" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="max-w-[800px] mx-auto relative z-10">
          <Link href={`${base}/blog`} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-[13px] font-bold text-white transition-all mb-8 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {t.blog_backToBlog}
          </Link>
          
          <h1 className="text-[36px] sm:text-[56px] font-black leading-[1.05] tracking-[-0.03em] text-white mb-8">
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[14px] font-bold text-white/80">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-md"><Calendar size={16} className="text-[#FDBF1D]"/> {post.date}</span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-md"><Clock size={16} className="text-[#10b981]"/> {post.readTime}</span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-md"><User size={16} className="text-[#ea580c]"/> {post.author}</span>
          </div>
        </div>
      </div>

      <main className="px-5 sm:px-8 max-w-[800px] mx-auto -mt-16 relative z-10 pb-20">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border-[2.5px] border-[#1f1e1d] shadow-[8px_10px_0_0_#1f1e1d]">
          <div className="w-full h-[300px] sm:h-[400px] rounded-2xl overflow-hidden border-[2.5px] border-[#1f1e1d] mb-12 shadow-[4px_4px_0_0_#1f1e1d]">
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
          </div>

          <article
            className="prose prose-lg max-w-none 
            prose-headings:font-black prose-headings:text-[#1f1e1d] prose-headings:tracking-[-0.02em]
            prose-h2:text-[28px] prose-h2:mt-12 prose-h2:mb-6
            prose-h3:text-[22px] prose-h3:mt-8 prose-h3:mb-4
            prose-p:text-[#6b6760] prose-p:font-medium prose-p:leading-relaxed prose-p:mb-6 prose-p:text-[17px]
            prose-strong:font-extrabold prose-strong:text-[#1f1e1d]
            prose-a:text-[#ea580c] prose-a:font-bold hover:prose-a:text-[#c2410c]
            prose-li:text-[#6b6760] prose-li:font-medium
            prose-img:border-[2.5px] prose-img:border-[#1f1e1d] prose-img:shadow-[4px_4px_0_0_#1f1e1d]
            break-words"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-16 pt-10 border-t-2 border-[#e8e4de] flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#FCFBF7] p-8 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_4px_0_0_#FDBF1D]">
            <div className="space-y-2 text-center sm:text-left">
              <h4 className="text-[22px] font-black">{locale === 'tr' ? 'Dijitalde Rekabeti Geride Bırakın' : 'Leave the Competition Behind'}</h4>
              <p className="text-[15px] text-[#6b6760] font-medium">{locale === 'tr' ? '14 günlük ücretsiz deneme ile dijital itibarınızı hemen güçlendirmeye başlayın.' : 'Start strengthening your digital reputation instantly with a 14-day free trial.'}</p>
            </div>
            <Link
              href={`${base}/auth/register`}
              className="px-8 py-4 bg-[#ea580c] text-white text-[15px] font-extrabold rounded-xl border-[2.5px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#c2410c] active:translate-y-1 active:shadow-none transition-all flex border flex-shrink-0 gap-2 items-center"
            >
              {locale === 'tr' ? 'Ücretsiz Başla' : 'Start for Free'} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
