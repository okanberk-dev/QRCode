import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { SITE_URL } from '@/lib/site';
import { ORGANIZATION_ID } from '@/lib/company-constants';

/**
 * Metadata + JSON-LD for the /solutions/<sector> pages (spec D11 / D12).
 *
 * Structured data describes only what the page shows:
 * - BreadcrumbList with plain names ("Diş klinikleri", not the uppercase
 *   eyebrow);
 * - one Service node whose provider is the site organization by `@id` (the
 *   locale layout declares that Organization; it is never re-declared here);
 * - FAQPage built from the same array the page renders.
 * No HowTo (Google retired the rich result, and the old steps were never
 * rendered), no hasOfferCatalog capability lists, no rating markup, no
 * areaServed (the product is used outside Türkiye too).
 *
 * Every block goes out through `jsonLdString()` at the call site.
 */

/** Path under /{locale}, e.g. "/solutions/dentists". */
export function solutionPath(slug: string): string {
  return `/solutions/${slug}`;
}

/** Absolute URL of a sector page. */
export function solutionUrl(locale: Locale, slug: string): string {
  return `${SITE_URL}/${locale}${solutionPath(slug)}`;
}

/**
 * Page metadata: SITE_URL-relative canonical + tr/en/x-default hreflang, and
 * a full page-level openGraph (a page-level openGraph replaces the layout's
 * wholesale, so type/siteName/locale/url/title/description/images all stay).
 * No page-level `twitter`: the layout keeps card/site/creator and Next fills
 * the rest from openGraph.
 */
export function buildSolutionMetadata({
  locale,
  slug,
  title,
  description,
}: {
  locale: Locale;
  slug: string;
  /** ≤ 52 characters: the layout template appends " | Buaze". */
  title: string;
  /** 140–160 characters. */
  description: string;
}): Metadata {
  const path = solutionPath(slug);
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        tr: `/tr${path}`,
        en: `/en${path}`,
        'x-default': `/tr${path}`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: solutionUrl(locale, slug),
      title,
      description,
      images: [{ url: `/images/open-graph-${locale}.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

interface SolutionSchemaArgs {
  locale: Locale;
  /** Full sector slug, e.g. "restaurants", "hotels". */
  slug: string;
  /** Plain sector name for the breadcrumb and the audience, e.g. "Diş klinikleri". */
  industryLabel: string;
  /** Descriptive service name (not a slogan), e.g. the page H1. */
  serviceName: string;
  /** Service description (usually the hero lead or the meta description). */
  description: string;
  /** The visible FAQ; emits a FAQPage block when non-empty. */
  faqs?: ReadonlyArray<{ q: string; a: string }>;
}

/**
 * Returns BreadcrumbList + Service (+ FAQPage) JSON-LD nodes for a sector
 * page. The signature is unchanged since the first version, so every sector
 * page (layout-based and custom) gets the same, smaller output.
 */
export function buildSolutionSchema({
  locale,
  slug,
  industryLabel,
  serviceName,
  description,
  faqs,
}: SolutionSchemaArgs): object[] {
  const isTr = locale === 'tr';
  const url = solutionUrl(locale, slug);
  const inLanguage = isTr ? 'tr-TR' : 'en-US';

  const schemas: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: isTr ? 'Ana sayfa' : 'Home', item: `${SITE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: isTr ? 'Çözümler' : 'Solutions', item: `${SITE_URL}/${locale}/solutions` },
        { '@type': 'ListItem', position: 3, name: industryLabel, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': `${url}#service`,
      name: serviceName,
      description,
      serviceType: isTr
        ? 'QR ile müşteri geri bildirimi ve yorum toplama yazılımı'
        : 'QR customer feedback and review collection software',
      provider: { '@id': ORGANIZATION_ID },
      audience: { '@type': 'BusinessAudience', audienceType: industryLabel },
      url,
      inLanguage,
    },
  ];

  if (faqs && faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return schemas;
}
