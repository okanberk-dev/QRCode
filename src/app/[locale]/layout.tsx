import '../globals.css';
import { ContactFloat } from '@/components/marketing/ContactFloat';
import type { Metadata } from 'next';
import { type Locale } from '@/lib/translations';
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
        { url: s.faviconUrl || '/favicon.svg', type: 'image/svg+xml' },
      ],
      shortcut: s.faviconUrl || '/favicon.svg',
      apple: '/apple-touch-icon.svg',
    },
    manifest: '/site.webmanifest',
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
  // NOTE: aggregateRating is intentionally omitted from SoftwareApplication.
  // Google requires AggregateRating to be backed by verifiable, on-page review
  // data; hardcoded numbers are a Manual Action risk. Re-add only when
  // computed from real Feedback aggregates surfaced on this page.
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Buaze',
      legalName: 'Buaze Bilişim A.Ş.',
      alternateName: ['Buaze (the company)', 'Buaze SaaS'],
      url: siteUrl,
      logo: s.logoUrl || `${siteUrl}/favicon.svg`,
      description: locale === 'tr' ? s.descriptionTr : s.descriptionEn,
      // sameAs disambiguates the Buaze SaaS entity from the Securidaca
      // longipedunculata plant (Chichewa "buaze") in dictionaries. Social
      // profiles are fixed; Wikidata / G2 / Crunchbase / Capterra come from
      // SiteSettings so ops can plug them in without a code deploy.
      sameAs: [
        'https://www.instagram.com/buazerating',
        'https://twitter.com/buaze',
        'https://www.linkedin.com/company/buaze',
        'https://www.youtube.com/@buaze',
        s.wikidataUrl,
        s.g2Url,
        s.crunchbaseUrl,
        s.capterraUrl,
      ].filter((u): u is string => typeof u === 'string' && u.length > 0),
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@buaze.com',
          availableLanguage: ['Turkish', 'English'],
          areaServed: 'TR',
        },
        {
          '@type': 'ContactPoint',
          contactType: 'sales',
          email: 'sales@buaze.com',
          availableLanguage: ['Turkish', 'English'],
        },
      ],
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Workinton Maslak, Floor 4',
        addressLocality: 'Maslak',
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
      operatingSystem: 'Web, iOS, Android',
      offers: {
        '@type': 'Offer',
        price: '500',
        priceCurrency: 'TRY',
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
