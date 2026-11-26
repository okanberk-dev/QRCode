import { SITE_URL, SOCIAL_PROFILES } from '@/lib/site';
import { jsonLdString } from '@/lib/seo/json-ld';
import ContactFloat from '@/components/marketing/LazyContactFloat';
import type { Metadata, Viewport } from 'next';
import { type Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/site-settings';
import { getCompanyFacts, ORGANIZATION_ID, WEBSITE_ID } from '@/lib/company-facts';
import RootHtml from '@/components/root/RootHtml';
import { APP_METADATA, ROOT_VIEWPORT, siteIcons } from '@/lib/root-metadata';

const VALID_LOCALES = ['tr', 'en'] as const;

// This is a root layout: it renders <html lang={locale}> so /en pages are
// served as English from the server (RootHtml explains the root layout
// split). Language switches between /tr and /en stay client-side
// navigations; React updates the `lang` attribute.
export const viewport: Viewport = ROOT_VIEWPORT;

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
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: s.titleTemplate,
    },
    description,
    keywords,
    authors: [{ name: 'Buaze', url: SITE_URL }],
    creator: 'Buaze',
    publisher: 'Buaze',
    applicationName: 'Buaze',
    generator: 'Next.js',
    classification: 'B2B SaaS',
    category: 'Business',
    // Region only. No street or coordinates here: the published address
    // comes from admin → Hukuki metinler (getCompanyFacts, NAP parity
    // §19.1.2), and hard-coded coordinates would claim an office the admin
    // never confirmed.
    other: {
      'geo.region': 'TR-34',
      'geo.placename': 'İstanbul',
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
    // Only site-wide defaults live here. Page-specific fields (title,
    // description, og:url, canonical, hreflang) must come from each page:
    // anything set here is inherited by every page that omits it, which used
    // to give those pages the homepage's og:url / twitter title. Next fills
    // twitter title/description/images from the page's openGraph.
    openGraph: {
      type: 'website',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      siteName: 'Buaze',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@buaze',
      creator: '@buaze',
    },
    icons: siteIcons(s.faviconUrl),
    manifest: '/site.webmanifest',
    ...APP_METADATA,
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
  const company = await getCompanyFacts();
  const siteUrl = SITE_URL;

  // Stage 83 §38.163 — auth-aware ContactFloat visibility moved to the
  // client-side `useMarketingAuth` probe inside the component. We always
  // mount the component here; it self-hides when the probe resolves an
  // authenticated user. This unblocks ISR for the entire `[locale]/*`
  // marketing tree without changing the visual outcome (anon users still
  // see the float; signed-in users still don't).

  // JSON-LD structured data (Organization + WebSite). There is deliberately
  // no SoftwareApplication node: Google only accepts it with a price and an
  // aggregateRating backed by verifiable on-page reviews — without both it
  // is reported as an invalid item on every page, and invented ratings are
  // a manual-action risk.
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: 'Buaze',
      ...(company.legalName ? { legalName: company.legalName } : {}),
      // Registry facts of the operating company (same as the footer).
      ...(company.registry
        ? {
            taxID: company.registry.taxNo,
            identifier: {
              '@type': 'PropertyValue',
              propertyID: 'MERSİS',
              value: company.registry.mersisNo,
            },
          }
        : {}),
      // "buaze" is also the Chichewa name of the Securidaca longipedunculata
      // plant; this tells search engines the two are different entities.
      disambiguatingDescription:
        locale === 'tr'
          ? "Buaze, işletmeler için QR geri bildirim ve online itibar yazılımı geliştiren bir yazılım şirketidir; Çiçewa dilinde 'buaze' adıyla bilinen Securidaca longipedunculata bitkisiyle ilgisi yoktur."
          : "Buaze is a software company that makes QR feedback and online reputation software for businesses; it is not related to the Securidaca longipedunculata plant, known as 'buaze' in Chichewa.",
      url: siteUrl,
      logo: s.logoUrl || `${siteUrl}/favicon.svg`,
      description: locale === 'tr' ? s.descriptionTr : s.descriptionEn,
      // sameAs disambiguates the Buaze SaaS entity from the Securidaca
      // longipedunculata plant (Chichewa "buaze") in dictionaries. Social
      // profiles come from SOCIAL_PROFILES (same list as the footer icons);
      // Wikidata / G2 / Crunchbase / Capterra come from SiteSettings so ops
      // can plug them in without a code deploy.
      sameAs: [
        ...SOCIAL_PROFILES.map((profile) => profile.url),
        s.wikidataUrl,
        s.g2Url,
        s.crunchbaseUrl,
        s.capterraUrl,
      ].filter((u): u is string => typeof u === 'string' && u.length > 0),
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: company.supportEmail,
          availableLanguage: ['Turkish', 'English'],
          areaServed: 'TR',
        },
      ],
      // Same facts as the footer <address> (getCompanyFacts, NAP parity).
      address: company.postalAddress,
      areaServed: 'TR',
      foundingDate: '2023',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: 'Buaze',
      url: siteUrl,
      inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
      publisher: { '@id': ORGANIZATION_ID },
      // No SearchAction: Google retired the sitelinks search box (2024) and
      // the target (/help/search) is noindex + robots-disallowed anyway.
    },
  ];

  return (
    <RootHtml lang={locale}>
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
    </RootHtml>
  );
}
