import '../globals.css';
import { ContactFloat } from '@/components/marketing/ContactFloat';
import type { Metadata } from 'next';
import { getTranslations, type Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';

const VALID_LOCALES = ['tr', 'en'] as const;

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === 'tr' ? 'tr' : 'en';
  const s = await getSiteSettings();

  const title = locale === 'tr' ? s.titleDefaultTr : s.titleDefaultEn;
  const description = locale === 'tr' ? s.descriptionTr : s.descriptionEn;
  const keywords = locale === 'tr' ? s.keywordsTr : s.keywordsEn;
  const ogImage = locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';

  return {
    metadataBase: new URL('https://buaze.com'),
    title: {
      default: title,
      template: s.titleTemplate,
    },
    description,
    keywords,
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
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: '@buaze',
      creator: '@buaze',
      images: [ogImage],
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
      icon: [
        { url: s.faviconUrl ? `${s.faviconUrl}?v=3` : '/favicon.svg?v=3', type: 'image/svg+xml' },
      ],
      shortcut: s.faviconUrl ? `${s.faviconUrl}?v=3` : '/favicon.svg?v=3',
      apple: '/apple-touch-icon.svg?v=3',
    },
    manifest: '/site.webmanifest?v=3',
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;

  if (!VALID_LOCALES.includes(rawLocale as typeof VALID_LOCALES[number])) {
    notFound();
  }
  const locale = rawLocale as Locale;

  const t = getTranslations(locale);
  const s = await getSiteSettings();
  const siteUrl = 'https://buaze.com';

  // Detect whether the visitor is authenticated so we can hide chat-style
  // floating support affordances (the ContactFloat) for signed-in users —
  // they have proper in-app support channels from the dashboard.
  let isLoggedIn = false;
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (token) {
    const payload = await verifyJwt(token);
    if (payload && typeof payload.userId === 'string') {
      isLoggedIn = true;
    }
  }

  // JSON-LD structured data for richer search-engine appearance
  // (Organization + WebSite + SoftwareApplication schemas).
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Buaze',
      url: siteUrl,
      logo: s.logoUrl || `${siteUrl}/favicon.svg`,
      description: locale === 'tr' ? s.descriptionTr : s.descriptionEn,
      sameAs: [
        'https://www.instagram.com/buazerating',
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
    <div className="antialiased bg-white text-[#0A0A0A] min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        // JSON-LD is safe to inject — it's a static, server-generated object.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {children}
      {/* ContactFloat is only shown to visitors (unauthenticated users). */}
      {!isLoggedIn && <ContactFloat locale={locale} />}
    </div>
  );
}
