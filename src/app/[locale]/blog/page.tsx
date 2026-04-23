import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: {
      absolute: locale === 'tr' ? 'Blog & Rehberler | Buaze' : 'Blog & Guides | Buaze',
    },
    description: locale === 'tr'
      ? 'Dijital itibar yönetimi ve müşteri deneyimi üzerine güncel içerikler.'
      : 'Latest articles on digital reputation management and customer experience.',
    openGraph: {
      title: locale === 'tr' ? 'Blog & Rehberler | Buaze' : 'Blog & Guides | Buaze',
      description: locale === 'tr' ? 'İtibar yönetimi rehberleri.' : 'Reputation management guides.',
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
  const isTr = locale === 'tr';

  const posts = await prisma.blogPost.findMany({
    where: { locale, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-16 sm:pt-20 pb-12 border-b border-[#EDEDED]">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="blogGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#blogGrid)" />
        </svg>
        <div className="relative max-w-[1000px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Blog & rehberler' : 'Blog & guides'}
          </span>
          <h1 className="mt-4 text-[40px] sm:text-[56px] lg:text-[64px] font-medium tracking-[-0.035em] text-[#0A0A0A] leading-[1]">
            {t.blog_title}
            <span className="text-[#C6F24E]">.</span>
          </h1>
          <p className="mt-5 text-[17px] sm:text-[18px] text-[#525252] font-normal max-w-[620px] leading-relaxed">
            {t.blog_desc}
          </p>
        </div>
      </section>

      {/* ─── Blog Grid ─── */}
      <section className="px-6 sm:px-10 py-16 sm:py-20">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-[#737373] text-[15px]">
            {isTr ? 'Henüz blog yazısı yok.' : 'No blog posts yet.'}
          </div>
        ) : (
          <div className="max-w-[1200px] mx-auto space-y-16">
            {featured && (
              <Link
                href={`${base}/blog/${featured.slug}`}
                className="group block bg-white rounded-3xl border border-[#EDEDED] overflow-hidden md:grid md:grid-cols-[1.1fr_1fr] hover:border-[#C6F24E] transition-colors"
              >
                <div className="relative aspect-[16/9] md:aspect-auto md:min-h-[340px] overflow-hidden border-b md:border-b-0 md:border-r border-[#EDEDED]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.coverImage}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <span className="pulse-eyebrow text-[#A8D62E]">
                    {isTr ? 'ÖNE ÇIKAN' : 'FEATURED'}
                  </span>
                  <h2 className="mt-4 text-[28px] lg:text-[36px] font-medium text-[#0A0A0A] tracking-[-0.025em] leading-[1.1]">
                    {featured.title}
                  </h2>
                  <p className="mt-4 text-[15px] text-[#525252] leading-[1.65] line-clamp-3">
                    {featured.description}
                  </p>
                  <div className="mt-6 flex items-center gap-4 text-[12px] text-[#737373]">
                    <span>{featured.date}</span>
                    <span>·</span>
                    <span>{featured.readTime}</span>
                  </div>
                  <div className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#0A0A0A] group-hover:text-[#A8D62E] transition-colors">
                    {t.blog_readMore}
                    <span aria-hidden className="group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((post) => (
                  <Link
                    key={post.id}
                    href={`${base}/blog/${post.slug}`}
                    className="group bg-white rounded-3xl border border-[#EDEDED] hover:border-[#C6F24E] transition-colors flex flex-col overflow-hidden"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden border-b border-[#EDEDED]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    </div>
                    <div className="p-7 flex flex-col flex-1">
                      <div className="pulse-eyebrow text-[#737373] flex items-center gap-3">
                        <span>{post.date}</span>
                        <span>·</span>
                        <span>{post.readTime}</span>
                      </div>
                      <h2 className="mt-4 text-[20px] font-medium text-[#0A0A0A] tracking-[-0.02em] leading-[1.2]">
                        {post.title}
                      </h2>
                      <p className="mt-3 text-[14px] text-[#525252] leading-[1.6] line-clamp-3 flex-1">
                        {post.description}
                      </p>
                      <div className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] group-hover:text-[#A8D62E] transition-colors">
                        {t.blog_readMore}
                        <span aria-hidden className="group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
