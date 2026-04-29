import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ShieldCheck, TrendingUp } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { CUSTOMER_STORIES, getCustomerStory, storyText } from '@/lib/customer-stories';

const VALID_LOCALES = ['tr', 'en'] as const;

export function generateStaticParams() {
  return VALID_LOCALES.flatMap((locale) =>
    CUSTOMER_STORIES.map((story) => ({
      locale,
      slug: story.slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const story = getCustomerStory(slug);
  if (!story || !VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    return { title: 'Customer story · Buaze' };
  }

  const title = `${storyText(story.title, locale)} | Buaze`;
  const description = storyText(story.description, locale);

  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/customer-stories/${slug}`,
      languages: {
        tr: `/tr/customer-stories/${slug}`,
        en: `/en/customer-stories/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `https://buaze.com/${locale}/customer-stories/${slug}`,
      images: [{ url: story.image, width: 1400, height: 900, alt: story.brand }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [story.image],
    },
  };
}

export default async function CustomerStoryPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) notFound();

  const story = getCustomerStory(slug);
  if (!story) notFound();

  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';
  const sector = storyText(story.sector, locale);
  const title = storyText(story.title, locale);
  const description = storyText(story.description, locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: story.image,
    author: { '@type': 'Organization', name: 'Buaze' },
    publisher: {
      '@type': 'Organization',
      name: 'Buaze',
      logo: { '@type': 'ImageObject', url: 'https://buaze.com/favicon.svg' },
    },
    mainEntityOfPage: `https://buaze.com/${locale}/customer-stories/${slug}`,
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    about: [
      sector,
      isTr ? 'Google yorum yönetimi' : 'Google review management',
      isTr ? 'QR geri bildirim sistemi' : 'QR feedback system',
    ],
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      <section className="border-b border-[#EDEDED] bg-[#FAFAFA] px-5 py-4 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <Link
            href={`${base}/customer-stories`}
            className="pulse-eyebrow inline-flex items-center gap-2 text-[#737373] transition-colors hover:text-[#0A0A0A]"
          >
            <ArrowLeft size={14} />
            {isTr ? 'TÜM BAŞARI HİKAYELERİ' : 'ALL CUSTOMER STORIES'}
          </Link>
        </div>
      </section>

      <section className="px-5 sm:px-10 py-[56px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="pulse-eyebrow rounded-full bg-[#EAF9B8] px-3 py-1 text-[#0A0A0A]">
                {sector} · {story.location}
              </span>
              <span className="pulse-eyebrow rounded-full border border-[#EDEDED] px-3 py-1 text-[#737373]">
                {isTr ? 'Google uyumlu akış' : 'Google-compliant flow'}
              </span>
            </div>
            <h1
              className="mt-5 text-[34px] font-medium leading-[0.98] tracking-[-0.035em] text-[#0A0A0A] sm:text-[52px] lg:text-[68px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {title}
            </h1>
            <p className="mt-6 max-w-[680px] text-[17px] leading-[1.65] text-[#525252] sm:text-[19px]">
              {storyText(story.hero, locale)}
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-[620px] sm:gap-5">
              {story.stats.map((stat) => (
                <div key={storyText(stat.label, locale)} className="border-t-2 border-[#0A0A0A] pt-3">
                  <div
                    className="text-[24px] font-medium leading-none tracking-[-0.03em] sm:text-[34px]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {stat.value}
                  </div>
                  <div className="pulse-eyebrow mt-2 text-[#737373]">
                    {storyText(stat.label, locale)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute -left-4 -top-4 h-28 w-28 rounded-full"
              style={{ backgroundColor: story.color }}
            />
            <div className="relative overflow-hidden rounded-[28px] border border-[#EDEDED] bg-white shadow-[0_28px_70px_-50px_rgba(10,10,10,0.55)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={story.image} alt={story.brand} className="aspect-[4/3] w-full object-cover" />
              <div className="p-6 sm:p-7">
                <p className="pulse-eyebrow text-[#737373]">{story.brand}</p>
                <blockquote
                  className="mt-2 text-[22px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0A] sm:text-[28px]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  &ldquo;{storyText(story.quote, locale)}&rdquo;
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 sm:px-10 py-[56px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 lg:grid-cols-3">
          {[
            {
              eyebrow: isTr ? 'MEYDAN OKUMA' : 'CHALLENGE',
              title: isTr ? 'Dağınık deneyim sinyali' : 'Fragmented experience signals',
              body: storyText(story.challenge, locale),
            },
            {
              eyebrow: isTr ? 'ÇÖZÜM' : 'SOLUTION',
              title: isTr ? 'Tek ve tarafsız QR akışı' : 'One neutral QR flow',
              body: storyText(story.solution, locale),
            },
            {
              eyebrow: isTr ? 'SONUÇ' : 'OUTCOME',
              title: isTr ? 'Politika uyumlu büyüme' : 'Policy-aligned growth',
              body: storyText(story.outcome, locale),
            },
          ].map((item) => (
            <article key={item.eyebrow} className="rounded-[18px] border border-[#EDEDED] bg-white p-6 sm:p-7">
              <p className="pulse-eyebrow text-[#A8D62E]">{item.eyebrow}</p>
              <h2
                className="mt-3 text-[24px] font-medium leading-[1.1] tracking-[-0.02em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {item.title}
              </h2>
              <p className="mt-4 text-[14px] leading-[1.7] text-[#525252]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 sm:px-10 py-[56px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'UYGULAMA PLANI' : 'IMPLEMENTATION PLAN'}
            </span>
            <h2
              className="mt-4 text-[30px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[44px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isTr ? 'Yorum değil, operasyon kuruldu.' : 'Not just reviews, an operation.'}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.7] text-[#525252]">
              {isTr
                ? 'Buaze akışı, Google yorumlarını manipüle etmek için değil; gerçek müşteri deneyimini düzenli, ölçülebilir ve aksiyona dönüşür hale getirmek için tasarlandı.'
                : 'The Buaze flow is designed not to manipulate Google reviews, but to make genuine customer experience regular, measurable, and actionable.'}
            </p>
          </div>

          <div className="space-y-4">
            {story.steps.map((step, index) => (
              <div key={storyText(step.title, locale)} className="grid grid-cols-[auto_1fr] gap-4 rounded-[18px] border border-[#EDEDED] bg-white p-5 sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C6F24E] text-[13px] font-semibold text-[#0A0A0A]">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3
                    className="text-[20px] font-medium leading-tight tracking-[-0.02em] text-[#0A0A0A]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {storyText(step.title, locale)}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.65] text-[#525252]">
                    {storyText(step.body, locale)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0A0A0A] px-5 sm:px-10 py-[56px] sm:py-20 text-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#C6F24E] px-3 py-1 text-[#0A0A0A]">
              <ShieldCheck size={16} />
              <span className="pulse-eyebrow text-[#0A0A0A]">
                {isTr ? 'GOOGLE POLİTİKA NOTU' : 'GOOGLE POLICY NOTE'}
              </span>
            </div>
            <h2
              className="mt-5 text-[30px] font-medium leading-[1.02] tracking-[-0.035em] text-white sm:text-[44px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isTr ? 'Her müşteriye aynı şeffaf yol.' : 'The same transparent path for every customer.'}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              isTr
                ? 'QR veya link ile yorum istemek mümkündür; dil tarafsız olmalıdır.'
                : 'Review links or QR codes are allowed; request language should stay neutral.',
              isTr
                ? 'İndirim, hediye veya ödeme karşılığı yorum istenmez.'
                : 'No discounts, gifts, or payments are offered in exchange for reviews.',
              isTr
                ? 'Negatif yorumlar caydırılmaz; özel geri bildirim ayrıca çözüm akışına alınır.'
                : 'Negative reviews are not discouraged; private feedback is also routed for resolution.',
              isTr
                ? 'Yanıtlar kısa, profesyonel ve satış baskısı olmadan hazırlanır.'
                : 'Replies stay short, professional, and free of sales pressure.',
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[16px] border border-white/10 bg-white/5 p-4">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#C6F24E]" />
                <p className="text-[14px] leading-[1.55] text-white/78">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-10 py-[56px] sm:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'DİĞER HİKAYELER' : 'MORE STORIES'}
              </span>
              <h2
                className="mt-3 text-[28px] font-medium tracking-[-0.025em] text-[#0A0A0A] sm:text-[38px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr ? 'Farklı sektörlerden örnekler' : 'Examples from other sectors'}
              </h2>
            </div>
            <Link href={`${base}/auth/register`} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3 text-[14px] font-medium text-white hover:bg-[#1A1A1A]">
              {isTr ? 'Ücretsiz başla' : 'Start free'} →
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
            {CUSTOMER_STORIES.filter((item) => item.slug !== story.slug).slice(0, 3).map((item) => (
              <Link
                key={item.slug}
                href={`${base}/customer-stories/${item.slug}`}
                className="rounded-[18px] border border-[#EDEDED] bg-[#FAFAFA] p-5 transition-colors hover:border-[#0A0A0A]"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#A8D62E]" />
                  <span className="pulse-eyebrow text-[#737373]">
                    {storyText(item.sector, locale)}
                  </span>
                </div>
                <h3
                  className="mt-3 text-[21px] font-medium tracking-[-0.02em] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {item.brand}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.55] text-[#525252] line-clamp-2">
                  {storyText(item.description, locale)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
