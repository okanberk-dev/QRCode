import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { blogPosts } from '@/lib/blogData';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: `${t.blog_title} — Buaze`,
    description: t.blog_desc,
    alternates: {
      canonical: `https://buaze.com/${locale}/blog`,
      languages: {
        tr: 'https://buaze.com/tr/blog',
        en: 'https://buaze.com/en/blog',
      },
    },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const posts = blogPosts[locale];

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* Header */}
      <section className="pt-20 pb-12 px-5 sm:px-8 bg-[#F7F4F0] border-b border-[#e8e4de]">
        <div className="max-w-[1000px] mx-auto text-center space-y-4">
          <h1 className="text-[44px] sm:text-[64px] font-black tracking-[-0.04em] text-[#1f1e1d]">
            {t.blog_title}<span className="text-[#ea580c]">.</span>
          </h1>
          <p className="text-[17px] sm:text-[20px] text-[#6b6760] font-medium max-w-[600px] mx-auto">
            {t.blog_desc}
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`${base}/blog/${post.slug}`}
              className="group bg-white p-6 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] hover:-translate-y-2 transition-transform duration-300 flex flex-col"
            >
              <div className="space-y-4 flex-grow">
                <div className="flex items-center gap-4 text-[12px] font-bold text-[#ada89f] uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Calendar size={14} /> {post.date}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {post.readTime}</span>
                </div>
                <h2 className="text-[22px] font-extrabold leading-tight text-[#1f1e1d] group-hover:text-[#ea580c] transition-colors">{post.title}</h2>
                <p className="text-[14px] text-[#6b6760] font-medium line-clamp-3 leading-relaxed">{post.description}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#e8e4de] flex flex-row items-center justify-between text-[13px] font-bold text-[#1f1e1d]">
                <span>{t.blog_readMore}</span>
                <div className="w-8 h-8 rounded-full bg-[#FCFBF7] border-2 border-[#1f1e1d] flex items-center justify-center group-hover:bg-[#FDBF1D] group-hover:-rotate-45 transition-all">
                  <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
