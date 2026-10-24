import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';

// Stage 94 §38.174 — force-dynamic → ISR. Blog list uses Prisma
// `findMany` (no cookies/headers); 1h cache acceptable for marketing
// surface, matches sitemap revalidate cadence.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr
    ? 'Blog & Rehberler — Yorum yönetimi & müşteri büyüme'
    : 'Blog & Guides — Review management & customer growth';
  const description = isTr
    ? 'Yorum yönetimi, müşteri psikolojisi, KVKK + Google policy uyumu, QR strateji ve büyüme taktikleri — restoran, otel ve klinikler için uzman rehberleri.'
    : 'Review management, customer psychology, KVKK + Google policy compliance, QR strategy and growth tactics — expert guides for restaurants, hotels & clinics.';
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `https://www.buaze.com/${locale}/blog`,
      languages: {
        tr: 'https://www.buaze.com/tr/blog',
        en: 'https://www.buaze.com/en/blog',
        'x-default': 'https://www.buaze.com/tr/blog',
      },
    },
    openGraph: {
      title,
      description,
      url: `https://www.buaze.com/${locale}/blog`,
      images: [{ url: isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: title }],
    },
  };
}

/**
 * 1:1 with .design/site/site-more.jsx:BlogPage (lines 236-303) —
 * eyebrow + "İtibar kütüphanesi." + filter chips, then featured post
 * (1.5fr/1fr split with lime pad + chart line overlay), then 3-col grid
 * with color-rotating pads and oversized numeric backdrop per card.
 */
/**
 * Filter chip → eşleşen tag varyantları. Admin yazı oluştururken hangi
 * dilde tag eklediğine göre filter yakalasın diye TR + EN listelenir.
 */
const FILTER_TAGS: Record<string, { label: { tr: string; en: string }; tags: string[] }> = {
  all: {
    label: { tr: 'Tümü', en: 'All' },
    tags: [],
  },
  strategy: {
    label: { tr: 'Strateji', en: 'Strategy' },
    tags: ['Strateji', 'strateji', 'Strategy', 'strategy', 'Büyüme', 'Growth'],
  },
  case: {
    label: { tr: 'Vaka', en: 'Case' },
    tags: ['Vaka', 'vaka', 'Case', 'case', 'Vaka çalışması', 'Case study'],
  },
  guide: {
    label: { tr: 'Rehber', en: 'Guide' },
    tags: ['Rehber', 'rehber', 'Guide', 'guide', 'Kılavuz'],
  },
  product: {
    label: { tr: 'Ürün', en: 'Product' },
    tags: ['Ürün', 'ürün', 'Product', 'product'],
  },
  industry: {
    label: { tr: 'Sektör', en: 'Industry' },
    tags: ['Sektör', 'sektör', 'Industry', 'industry'],
  },
};

export default async function BlogIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { locale } = await params;
  const { cat } = await searchParams;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const activeFilter = cat && FILTER_TAGS[cat] ? cat : 'all';
  const tagsToMatch = FILTER_TAGS[activeFilter]?.tags ?? [];

  const posts = await prisma.blogPost.findMany({
    where: {
      locale,
      isActive: true,
      ...(tagsToMatch.length > 0 ? { tags: { hasSome: tagsToMatch } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    // List fields only — the index never renders the post body, so loading
    // every article's full content on each request was wasted DB + memory.
    select: {
      id: true,
      slug: true,
      title: true,
      coverImage: true,
      author: true,
      date: true,
      readTime: true,
    },
  });

  const featured = posts[0];
  const rest = posts.slice(1);
  // Category color rotation for rest grid: first neutral, then greyscale
  const padColor = (i: number) => (i === 0 ? '#EAF9B8' : '#F5F5F5');

  const filterChips = (Object.keys(FILTER_TAGS) as Array<keyof typeof FILTER_TAGS>).map(
    (key) => ({
      key,
      label: FILTER_TAGS[key].label[isTr ? 'tr' : 'en'],
      href:
        key === 'all'
          ? `${base}/blog`
          : `${base}/blog?cat=${key}`,
      active: activeFilter === key,
    }),
  );

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Header */}
      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-10">
        <div className="max-w-[1200px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'BLOG' : 'BLOG'}
          </span>
          <h1
            className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
          >
            {isTr ? 'Yorum yönetimi blogu' : 'Review management blog'}
          </h1>
          <p className="mt-4 max-w-[560px] text-[16px] text-[#525252] leading-[1.55]">
            {isTr
              ? 'Yorum yönetimi, müşteri psikolojisi, büyüme taktikleri — haftalık uzman rehberleri.'
              : 'Review management, customer psychology, growth tactics — weekly expert guides.'}
          </p>

          {/* Filter chips — server-side filter via ?cat=... query param.
              Tag-based; admin yazıya tag eklediğinde filtre yakalar. */}
          <div className="mt-7 flex flex-wrap gap-2">
            {filterChips.map((c) => (
              <Link
                key={c.key}
                href={c.href}
                aria-current={c.active ? 'page' : undefined}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
                  c.active
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-white text-[#0A0A0A] border-[#EDEDED] hover:border-[#0A0A0A]'
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {posts.length === 0 ? (
        <section className="px-5 sm:px-10 pb-[60px] sm:pb-20">
          <div className="max-w-[1200px] mx-auto py-16 text-center">
            <p className="text-[15px] text-[#737373]">
              {activeFilter !== 'all'
                ? isTr
                  ? `"${FILTER_TAGS[activeFilter].label.tr}" kategorisinde henüz yazı yok.`
                  : `No posts in "${FILTER_TAGS[activeFilter].label.en}" yet.`
                : isTr
                  ? 'Henüz blog yazısı yok.'
                  : 'No blog posts yet.'}
            </p>
            {activeFilter !== 'all' && (
              <Link
                href={`${base}/blog`}
                className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4"
              >
                {isTr ? 'Tüm yazılara dön' : 'View all posts'}
              </Link>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* Featured post — 1.5fr / 1fr split · cover image if uploaded, else lime pad with chart */}
          {featured && (
            <section className="px-5 sm:px-10 pt-5">
              <div className="max-w-[1200px] mx-auto">
                <Link
                  href={`${base}/blog/${featured.slug}`}
                  className="group grid grid-cols-1 overflow-hidden rounded-[18px] border border-[#EDEDED] bg-[#FAFAFA] md:grid-cols-[1.5fr_1fr]"
                >
                  {/* Left pad — cover image overlay or lime fallback */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#C6F24E] md:aspect-auto md:min-h-[340px]">
                    {featured.coverImage ? (
                      <>
                        <Image
                          src={featured.coverImage}
                          alt={featured.title}
                          fill
                          sizes="(max-width: 767px) 100vw, 50vw"
                          priority
                          className="object-cover transition-transform duration-[600ms] group-hover:scale-[1.03]"
                        />
                        {/* Graphite gradient to keep FEATURED eyebrow readable */}
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/55 via-[#0A0A0A]/10 to-transparent"
                        />
                        {/* Lime accent corner chip */}
                        <span
                          className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-[#0A0A0A]"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A]" />
                          {isTr ? 'ÖNE ÇIKAN' : 'FEATURED'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          className="absolute left-6 top-6 text-[10px] font-semibold tracking-[0.14em] text-[#0A0A0A]"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {isTr ? 'ÖNE ÇIKAN' : 'FEATURED'}
                        </span>
                        <svg
                          viewBox="0 0 200 120"
                          className="absolute bottom-8 right-8 w-[70%] max-w-[280px]"
                          aria-hidden
                        >
                          <path
                            d="M0 90 L30 80 L60 85 L90 50 L120 60 L150 20 L200 30"
                            fill="none"
                            stroke="#0A0A0A"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="90" cy="50" r="5" fill="#0A0A0A" />
                          <circle cx="150" cy="20" r="6" fill="#0A0A0A" />
                        </svg>
                      </>
                    )}
                  </div>

                  {/* Right text */}
                  <div className="flex flex-col justify-center p-7 sm:p-8 lg:p-10">
                    <span
                      className="text-[10px] font-semibold tracking-[0.14em] text-[#737373]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {isTr ? 'STRATEJİ' : 'STRATEGY'}
                    </span>
                    <h2
                      className="mt-2.5 text-[24px] sm:text-[28px] lg:text-[32px] font-medium leading-[1.1] tracking-[-0.025em] text-[#0A0A0A] group-hover:text-[#0A0A0A]"
                    >
                      {featured.title}
                    </h2>
                    <div className="mt-3.5 text-[12px] text-[#737373]">
                      {featured.author} · {featured.date} · {featured.readTime}
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {/* Rest grid — 3-col · cover image if uploaded, else colored pad fallback */}
          {rest.length > 0 && (
            <section className="px-5 sm:px-10 pt-8 pb-[60px] sm:pb-24">
              <div className="max-w-[1200px] mx-auto grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`${base}/blog/${p.slug}`}
                    className="group flex flex-col"
                  >
                    <div
                      className="relative aspect-[4/3] overflow-hidden rounded-xl transition-transform duration-300 group-hover:-translate-y-1"
                      style={{ background: padColor(i) }}
                    >
                      {p.coverImage ? (
                        <>
                          <Image
                            src={p.coverImage}
                            alt={p.title}
                            fill
                            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                            className="object-cover transition-transform duration-[600ms] group-hover:scale-[1.04]"
                          />
                          <div
                            aria-hidden
                            className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/40 via-transparent to-transparent"
                          />
                        </>
                      ) : (
                        <span
                          className="absolute bottom-3 left-5 text-[72px] font-medium leading-none tracking-[-0.04em] text-[#0A0A0A] opacity-[0.12]"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          0{i + 2}
                        </span>
                      )}
                    </div>
                    <div className="mt-3.5">
                      <span
                        className="text-[10px] font-semibold tracking-[0.14em] text-[#737373]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {p.readTime}
                      </span>
                      <h3
                        className="mt-1.5 text-[18px] sm:text-[20px] font-medium leading-[1.25] tracking-[-0.02em] text-[#0A0A0A]"
                      >
                        {p.title}
                      </h3>
                      <div className="mt-2.5 text-[12px] text-[#737373]">
                        {p.author} · {p.date} · {p.readTime}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
