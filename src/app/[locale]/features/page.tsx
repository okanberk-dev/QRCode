import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import {
  IllusCompass,
  IllusInbox,
  IllusChart,
  IllusShield,
} from '@/components/marketing/PulseIllustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';

const VALID_LOCALES = ['tr', 'en'] as const;

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'QR yorum yönetimi özellikleri — Buaze Pulse AI, gelen kutusu, analitik'
      : 'QR review management features — Buaze Pulse AI, inbox, analytics';
  const description =
    locale === 'tr'
      ? 'Tüm platformları tek gelen kutuda yönetin: Buaze Pulse AI taslak yanıt, QR stüdyosu, çoklu platform yönlendirme, canlı analitik ve haftalık rapor.'
      : 'Manage every platform in one inbox: Buaze Pulse AI reply drafts, QR studio, multi-platform routing, live analytics and weekly reports.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/features`,
      languages: {
        tr: 'https://buaze.com/tr/features',
        en: 'https://buaze.com/en/features',
        'x-default': 'https://buaze.com/en/features',
      },
    },
    openGraph: {
      title,
      description,
      url: `https://buaze.com/${locale}/features`,
      images: [{ url: '/images/open-graph-en.png', width: 1200, height: 630, alt: 'Buaze' }],
    },
  };
}

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    notFound();
  }
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const features = isTr
    ? [
        {
          n: '01',
          t: 'Yorum gelen kutusu',
          d: 'Google, Yelp, Yemeksepeti — tüm platformlardan gelen yorumlar tek bir inbox\'ta. Atama, SLA, arşivleme.',
          Ill: IllusInbox,
          href: `${base}/features/review-management`,
        },
        {
          n: '02',
          t: 'Buaze Pulse AI yanıt',
          d: 'Her yoruma 30 sn\'de markanıza özel yanıt. Buaze Pulse AI işletmenizin tonunu öğrenir.',
          Ill: IllusShield,
          href: `${base}/features/pulse-ai`,
        },
        {
          n: '03',
          t: 'QR kod stüdyosu',
          d: 'Masa başına, paket içine, hizmet sonrası. Branded, izlenebilir, yeniden basılabilir.',
          Ill: IllusCompass,
          href: `${base}/solutions/qr-generator`,
        },
        {
          n: '04',
          t: 'Analiz & raporlama',
          d: 'NPS, duygu, personel performansı, konum karşılaştırma. Haftalık e-posta raporu.',
          Ill: IllusChart,
          href: `${base}/features/analytics-reports`,
        },
      ]
    : [
        {
          n: '01',
          t: 'Unified review inbox',
          d: 'Google, Yelp, Yemeksepeti — reviews from every platform in a single inbox. Assign, SLA, archive.',
          Ill: IllusInbox,
          href: `${base}/features/review-management`,
        },
        {
          n: '02',
          t: 'Buaze Pulse AI replies',
          d: 'Brand-tone response to every review in 30 seconds. Buaze Pulse AI learns your business voice.',
          Ill: IllusShield,
          href: `${base}/features/pulse-ai`,
        },
        {
          n: '03',
          t: 'QR studio',
          d: 'Per table, per package, per service — branded, trackable, reprintable.',
          Ill: IllusCompass,
          href: `${base}/solutions/qr-generator`,
        },
        {
          n: '04',
          t: 'Analytics & reporting',
          d: 'NPS, sentiment, staff performance, location benchmarks. Weekly email digest.',
          Ill: IllusChart,
          href: `${base}/features/analytics-reports`,
        },
      ];

  const canonicalUrl = `https://buaze.com/${locale}/features`;
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isTr ? 'Buaze özellikleri' : 'Buaze features',
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    url: canonicalUrl,
    numberOfItems: features.length,
    itemListElement: features.map((feature, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: feature.t,
      description: feature.d,
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Özellikler' : 'Features', item: canonicalUrl },
    ],
  };

  const howToSchema = buildHowToSchema({
    locale,
    name: isTr ? 'Buaze ile yorum yönetimine başlama' : 'Get started with Buaze review management',
    description: isTr
      ? 'Buaze’in dört özelliğini tek panelde çalıştırmak için adımlar.'
      : 'Steps to run all four Buaze features from a single panel.',
    url: canonicalUrl,
    steps: features.map((feature) => ({
      name: feature.t,
      text: feature.d,
      url: `https://buaze.com${feature.href}`,
    })),
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      {howToSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(howToSchema) }} />
      )}
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-8">
        <div className="max-w-[1200px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Ürün' : 'Product'}
          </span>
          <h1 className="mt-4 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em] max-w-[900px]">
            {isTr ? (
              <>
                Bir panel. Her yorum.{' '}
                <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                  Her platform.
                </span>
              </>
            ) : (
              <>
                One panel. Every review.{' '}
                <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                  Every platform.
                </span>
              </>
            )}
          </h1>
          <p className="mt-5 text-[15px] sm:text-[16px] text-[#525252] max-w-[620px] leading-[1.6]">
            {isTr
              ? 'Buaze\'in tüm özellikleri nabız metaforunda buluşuyor: topla, yönet, iyileştir, büyü.'
              : 'Every Buaze feature meets in the pulse metaphor: collect, manage, improve, grow.'}
          </p>
        </div>
      </section>

      <section className="px-5 sm:px-10 pb-[60px] sm:pb-20">
        <div className="max-w-[1200px] mx-auto">
          {features.map((f, i) => (
            <div
              key={f.n}
              className={`grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-14 items-center py-10 sm:py-14 lg:py-16 ${
                i === 0 ? 'border-t-2 border-[#0A0A0A]' : 'border-t border-[#EDEDED]'
              }`}
            >
              <div className={i % 2 === 0 ? 'order-1' : 'order-1 lg:order-2'}>
                <span className="pulse-eyebrow text-[#A8D62E]">
                  {isTr ? 'ÖZELLİK' : 'FEATURE'} {f.n}
                </span>
                <h2 className="mt-3 text-[26px] sm:text-[44px] lg:text-[52px] font-medium leading-[1.02] tracking-[-0.03em]">
                  {f.t}
                </h2>
                <p className="mt-4 text-[15px] sm:text-[16px] text-[#525252] leading-[1.6] max-w-[480px]">
                  {f.d}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href={f.href}
                    className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-5 py-3 rounded-full text-[13px] font-medium hover:bg-[#1A1A1A] transition-colors"
                  >
                    {isTr ? 'Detaylı bak' : 'Take a closer look'}
                    <span aria-hidden>→</span>
                  </Link>
                  <Link
                    href={`${base}/contact`}
                    className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-5 py-3 rounded-full text-[13px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
                  >
                    {isTr ? 'Canlı demo' : 'Live demo'}
                  </Link>
                </div>
              </div>
              <div
                className={`flex items-center justify-center bg-[#FAFAFA] rounded-2xl p-8 sm:p-12 aspect-[5/3] ${
                  i % 2 === 0 ? 'order-2' : 'order-2 lg:order-1'
                }`}
              >
                <f.Ill size={200} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#C6F24E] px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
            {isTr
              ? 'Tüm özellikler, ilk dakikadan itibaren.'
              : 'Every feature, from the first minute.'}
          </h2>
          <p className="mt-4 text-[16px] text-[#1A1A1A]">
            {isTr
              ? '14 gün ücretsiz · Kredi kartı gerekmez'
              : '14-day free trial · No credit card required'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
            >
              {isTr ? 'Ücretsiz başla' : 'Start free'}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/pricing`}
              className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              {isTr ? 'Fiyatları gör' : 'See pricing'}
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
