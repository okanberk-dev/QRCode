import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: {
      absolute: locale === 'tr' ? 'Blog & Rehberler | Buaze' : 'Blog & Guides | Buaze',
    },
    description: locale === 'tr' 
      ? 'Dijital itibar yönetimi ve müşteri deneyimi üzerine güncel içerikler.'
      : 'Latest articles on digital reputation management and customer experience.',
    openGraph: {
      title: locale === 'tr' ? 'Blog & Rehberler | Buaze' : 'Blog & Guides | Buaze',
      description: locale === 'tr' ? 'İtibar yönetimi rehberleri...' : 'Reputation management guides...',
    },
    alternates: {
      canonical: `https://buaze.com/${locale}/blog`,
      languages: {
        tr: 'https://buaze.com/tr/blog',
        en: 'https://buaze.com/en/blog',
      },
    },
  };
}


export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;

  const posts = await prisma.blogPost.findMany({
    where: { locale, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-[#1A2332] font-sans pt-[64px] selection:bg-[#F4B400]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero Header */}
      <section className="pt-24 pb-16 px-5 sm:px-8 bg-[#F8F6F1] relative overflow-hidden border-b border-[#E8ECF2]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F4B400]/5 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F4B400]/5 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3" />
        
        <div className="max-w-[1000px] mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl border border-[#1A2332] shadow-md mb-4">
            <BookOpen size={28} className="text-[#F4B400]" />
          </div>
          <h1 className="text-[48px] sm:text-[72px] font-extrabold tracking-[-0.04em] text-[#1A2332] leading-[0.95]">
            {t.blog_title}<span className="text-[#F4B400]">.</span>
          </h1>
          <p className="text-[18px] sm:text-[22px] text-[#2A3444] font-medium max-w-[650px] mx-auto leading-relaxed">
            {t.blog_desc}
          </p>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-20 px-5 sm:px-8">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-[#6B7280] text-lg font-medium">
            {locale === 'tr' ? 'Henüz blog yazısı yok.' : 'No blog posts yet.'}
          </div>
        ) : (
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`${base}/blog/${post.slug}`}
                className="group bg-white rounded-3xl border border-[#1A2332] shadow-md hover:-translate-y-2 transition-transform duration-300 flex flex-col overflow-hidden"
              >
                <div className="relative w-full h-[220px] border-b-[2.5px] border-[#1A2332] overflow-hidden">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="p-8 space-y-5 flex-grow flex flex-col">
                  <div className="flex items-center gap-4 text-[12px] font-bold text-[#F4B400] uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {post.date}</span>
                    <span className="flex items-center gap-1.5 text-[#6B7280]"><Clock size={14} /> {post.readTime}</span>
                  </div>
                  
                  <h2 className="text-[24px] font-extrabold leading-[1.2] text-[#1A2332] group-hover:text-[#F4B400] transition-colors">
                    {post.title}
                  </h2>
                  
                  <p className="text-[15px] text-[#2A3444] font-medium line-clamp-3 leading-relaxed flex-grow">
                    {post.description}
                  </p>
                  
                  <div className="mt-4 pt-5 border-t border-[#E8ECF2] flex flex-row items-center justify-between text-[14px] font-bold text-[#1A2332]">
                    <span className="uppercase tracking-wider">{t.blog_readMore}</span>
                    <div className="w-10 h-10 rounded-full bg-[#F8F6F1] border-2 border-[#1A2332] flex items-center justify-center group-hover:bg-[#F4B400] group-hover:-rotate-45 transition-all">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
