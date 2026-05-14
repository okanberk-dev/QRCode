import '../globals.css';
import { jsonLdString } from '@/lib/seo/json-ld';
import { ContactFloat } from '@/components/marketing/ContactFloat';
import type { Metadata } from 'next';
import { type Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/site-settings';

const VALID_LOCALES = ['tr', 'en'] as const;

// Stage 83 §38.163 — `force-dynamic` removed so marketing pages under
// `[locale]/*` can opt into ISR (`revalidate=N`) per route. Auth-aware
// surfaces (ContactFloat hide-when-logged-in, MarketingNavbar login chip,
// MobileBottomNav center CTA) moved from server-side `cookies()` reads to
// client-side `/api/auth/me` probe via `useMarketingAuth` hook. See
// CLAUDE.md §38.163 for the full structural rationale.
//
// Per-page `revalidate` directives only take effect when no ancestor
// touches `cookies()` / `headers()` — that's why this layout chain had to
// be cleaned up before the ISR rollout (Phase 2 of the same plan).
export const revalidate = 3600;

// Stage 83 §38.163 — declaring static params for the `[locale]` segment
// is what lets Next.js prerender each locale variant of every marketing
// page at build time (and serve subsequent visits from the Vercel CDN
// edge). Without this, dynamic-segment pages fall back to `ƒ` even when
// a `revalidate` directive is present. Locale list is fixed at two —
// adding a third (de, fr) requires extending VALID_LOCALES + the
// `tr/en` parallel translations object in `src/lib/translations.ts`.
export async function generateStaticParams() {
  return VALID_LOCALES.map((locale) => ({ locale }));
}

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
        // §38.106 — `?v=4` cache bust for circular favicon; CLAUDE.md
        // §34.14 disipline (immutable header + query string version bump).
        { url: s.faviconUrl || '/favicon.svg?v=4', type: 'image/svg+xml' },
      ],
      shortcut: s.faviconUrl || '/favicon.svg?v=4',
      apple: '/apple-touch-icon.svg?v=4',
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

  // Stage 83 §38.163 — auth-aware ContactFloat visibility moved to the
  // client-side `useMarketingAuth` probe inside the component. We always
  // mount the component here; it self-hides when the probe resolves an
  // authenticated user. This unblocks ISR for the entire `[locale]/*`
  // marketing tree without changing the visual outcome (anon users still
  // see the float; signed-in users still don't).

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
      // Service geography + company founding year — Google rich result
      // hints. `areaServed` doubles up at the contactPoint level (per-
      // channel) but the Organization-level signal is what knowledge-graph
      // entries pick up. CLAUDE.md §34.18.
      areaServed: 'TR',
      foundingDate: '2023',
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
      // Stage 94 §38.174 — `offers` removed (was hardcoded TRY 500;
      // drifted from /admin/plans actual prices Starter 499 / Growth
      // 899 / Pro 1499). Misleading-business-claim risk per Google.
      // SoftwareApplication remains valid without `offers`; rich
      // result skips price rendering until DB-driven plan injection.
    },
  ];

  return (
    <div className="antialiased bg-white text-[#0A0A0A] min-h-dvh flex flex-col">
      <script
        type="application/ld+json"
        // JSON-LD is safe to inject — it's a static, server-generated object.
        dangerouslySetInnerHTML={{ __html: jsonLdString(structuredData) }}
      />
      {children}
      {/* ContactFloat is only shown to visitors (unauthenticated users).
          Stage 83 §38.163 — gating moved client-side via useMarketingAuth so
          the entire marketing tree can ship as ISR. The component self-hides
          when an authenticated session is detected post-mount. */}
      <ContactFloat locale={locale} />
    </div>
  );
}
