import '../globals.css';
import { ContactFloat } from '@/components/marketing/ContactFloat';
import type { Metadata } from 'next';
import { getTranslations, type Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';

const VALID_LOCALES = ['tr', 'en'] as const;

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);

  return {
    metadataBase: new URL('https://buaze.com'),
    title: {
      default: `${t.siteName} | ${locale === 'tr' ? 'Dijital İtibar ve Geri Bildirim Yönetimi' : 'Digital Reputation and Feedback Management'}`,
      template: `%s | ${t.siteName}`,
    },
    description: t.siteDescription,
    keywords: locale === 'tr'
      ? ['Dijital itibar yönetimi', 'Google haritalar geri bildirim toplama', 'Geri bildirim operasyonları', 'QR yorum sistemi', 'restoran itibar yönetimi', 'dijital itibar', 'müşteri deneyimi yönetimi', 'müşteri memnuniyeti', 'buaze']
      : ['Digital reputation management', 'Increase Google Maps feedback', 'Feedback operations', 'QR review system', 'reputation management', 'digital reputation', 'Google review collection', 'customer feedback', 'buaze'],
    authors: [{ name: 'Buaze', url: 'https://buaze.com' }],
    creator: 'Buaze',
    publisher: 'Buaze',
    applicationName: 'Buaze',
    generator: 'Next.js',
    classification: 'B2B SaaS',
    category: 'Business',
    // GEO Tags
    other: {
      'geo.region': 'TR-34',
      'geo.placename': 'Ataşehir, İstanbul',
      'geo.position': '40.9923;29.1244',
      'ICBM': '40.9923, 29.1244',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: `https://buaze.com/${locale}`,
      siteName: 'Buaze',
      title: `${t.siteName} | ${locale === 'tr' ? 'Dijital İtibar ve Geri Bildirim Yönetimi' : 'Digital Reputation and Feedback Management'}`,
      description: t.siteDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t.siteName} | ${locale === 'tr' ? 'Dijital İtibar ve Geri Bildirim Yönetimi' : 'Digital Reputation and Feedback Management'}`,
      description: t.siteDescription,
      site: '@buaze',
      creator: '@buaze',
    },
    alternates: {
      canonical: `https://buaze.com/${locale}`,
      languages: {
        'tr': 'https://buaze.com/tr',
        'en': 'https://buaze.com/en',
        'x-default': 'https://buaze.com/en',
      },
    },
    icons: {
      icon: '/favicon.svg',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    notFound();
  }

  const t = getTranslations(locale);
  const siteUrl = 'https://buaze.com';

  // JSON-LD structured data for richer search-engine appearance
  // (Organization + WebSite + SoftwareApplication schemas).
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Buaze',
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
      description: t.siteDescription,
      sameAs: [
        'https://twitter.com/buaze',
        'https://www.linkedin.com/company/buaze',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        availableLanguage: ['Turkish', 'English'],
        areaServed: 'TR',
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Ataşehir',
        addressRegion: 'İstanbul',
        addressCountry: 'TR',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Buaze',
      url: siteUrl,
      inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/${locale}/blog?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Buaze',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '500',
        priceCurrency: 'TRY',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '142',
      },
    },
  ];

  return (
    <div className="antialiased bg-white text-[#111827] min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        // JSON-LD is safe to inject — it's a static, server-generated object.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {children}
      <ContactFloat locale={locale} />
    </div>
  );
}
