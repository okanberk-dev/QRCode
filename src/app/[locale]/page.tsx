import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { ORGANIZATION_ID } from '@/lib/company-facts';
import { jsonLdString } from '@/lib/seo/json-ld';
import { getTranslations, type Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import HeroCinematic from '@/components/marketing/heroes/HeroCinematic';
import HomeHowItWorks from '@/components/marketing/home/HomeHowItWorks';
import HomeFeatures from '@/components/marketing/home/HomeFeatures';
import HomePlatforms from '@/components/marketing/home/HomePlatforms';
import HomeBeyondReviews from '@/components/marketing/home/HomeBeyondReviews';
import HomeTrust from '@/components/marketing/home/HomeTrust';
import HomeSectors from '@/components/marketing/home/HomeSectors';
import HomeQrTeaser from '@/components/marketing/home/HomeQrTeaser';
import HomeFaq from '@/components/marketing/home/HomeFaq';
import HomeFinalCta from '@/components/marketing/home/HomeFinalCta';
import { HOME_FAQ } from '@/components/marketing/home/home-faq';

/**
 * Homepage (/tr, /en). Statically generated: ISR (`revalidate = 3600`) is
 * inherited from [locale]/layout.tsx, and nothing here reads headers(),
 * cookies() or searchParams (CLAUDE.md §35.12.3).
 *
 * One idea per section, each feature said once (spec 2026-11):
 * hero → how it works → features → platform links (dark, three.js orbit) →
 * Audit Center + Surveys → trust (Google rules + KVKK) → industries →
 * free QR generator → FAQ → final CTA. All copy is server-rendered HTML; the
 * only client islands are the hero's sample stage and the 3D orbit.
 */

const VALID_LOCALES = ['tr', 'en'] as const;

const META = {
  tr: {
    title: 'QR kod ile Google yorum toplama ve geri bildirim',
    description:
      'QR kodla geri bildirim ve Google yorumu toplayın. Her müşteri yorum bağlantınızı görür; eşiğin altındaki puanlarda önce size yazabilir. 14 gün ücretsiz.',
  },
  en: {
    title: 'Collect Google reviews and feedback with QR codes',
    description:
      'Collect feedback and Google reviews with QR codes. Every customer sees your review link; below your threshold, they can write to you first. Free 14-day trial.',
  },
} as const;

function isLocale(value: string): value is (typeof VALID_LOCALES)[number] {
  return (VALID_LOCALES as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'tr';
  const { title, description } = META[lang];
  const ogImage = lang === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        tr: '/tr',
        en: '/en',
        'x-default': '/tr',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  // Only what the page shows: the service it describes and the visible FAQ.
  // The Organization node (ORGANIZATION_ID) is emitted once by the locale
  // layout and referenced here by @id.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${SITE_URL}/${locale}#service`,
        name: isTr
          ? 'QR kodla müşteri geri bildirimi ve Google yorum toplama'
          : 'QR code customer feedback and Google review collection',
        serviceType: isTr
          ? 'Müşteri geri bildirimi ve yorum yönetimi yazılımı'
          : 'Customer feedback and review management software',
        description: isTr
          ? "İşletmelerin QR kodla müşteri geri bildirimi toplamasını, 10 yorum platformundaki bağlantılarını yönetmesini ve Pulse AI'ın hazırladığı yanıt taslaklarını onaylayarak göndermesini sağlayan yazılım."
          : 'Software that lets businesses collect customer feedback with QR codes, manage their links on 10 review platforms and reply with Pulse AI drafts they approve first.',
        provider: { '@id': ORGANIZATION_ID },
        url: `${SITE_URL}/${locale}`,
        inLanguage: isTr ? 'tr-TR' : 'en-US',
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/${locale}#faq`,
        inLanguage: isTr ? 'tr-TR' : 'en-US',
        mainEntity: HOME_FAQ[locale].map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40 selection:text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      <MarketingNavbar locale={locale} t={t} />

      <main id="main-content">
        <HeroCinematic locale={locale} />
        <HomeHowItWorks locale={locale} />
        <HomeFeatures locale={locale} />
        <HomePlatforms locale={locale} />
        <HomeBeyondReviews locale={locale} />
        <HomeTrust locale={locale} />
        <HomeSectors locale={locale} />
        <HomeQrTeaser locale={locale} />
        <HomeFaq locale={locale} />
        <HomeFinalCta locale={locale} />
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
