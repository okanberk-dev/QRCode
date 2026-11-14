import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { ORGANIZATION_ID } from '@/lib/company-constants';

/**
 * Metadata + JSON-LD for the /features hub and the feature pages
 * (spec D11 / D12). One builder per concern so every feature page emits the
 * same shape:
 *
 * - Metadata: SITE_URL-relative canonical + tr/en/x-default hreflang, and a
 *   page-level openGraph that keeps type/siteName/locale/url (a page-level
 *   openGraph object replaces the layout's wholesale). No page-level
 *   `twitter`: the layout's card/site/creator stay, X falls back to og:*.
 * - JSON-LD: one @graph per page. The organization is referenced by @id
 *   (the locale layout declares it), never re-declared. HowTo and FAQPage are
 *   built from the same arrays the page renders, so structured data can only
 *   describe what is on screen. No hasOfferCatalog, no rating markup.
 *
 * Every block goes out through `jsonLdString()` at the call site.
 */

export type FeatureLocale = 'tr' | 'en';

/** Path under /{locale}: '' = the /features hub, otherwise /features/{slug}. */
export function featurePath(slug: string): string {
  return slug ? `/features/${slug}` : '/features';
}

export function featureUrl(locale: FeatureLocale, slug: string): string {
  return `${SITE_URL}/${locale}${featurePath(slug)}`;
}

export function buildFeatureMetadata({
  locale,
  slug,
  title,
  description,
}: {
  locale: FeatureLocale;
  /** '' for the hub. */
  slug: string;
  /** ≤ 52 characters: the layout template appends " | Buaze". */
  title: string;
  /** 140–160 characters. */
  description: string;
}): Metadata {
  const path = featurePath(slug);
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
      url: featureUrl(locale, slug),
      title,
      description,
      images: [{ url: `/images/open-graph-${locale}.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

interface Crumb {
  name: string;
  /** Absolute URL. */
  item: string;
}

function breadcrumbNode(id: string, crumbs: readonly Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': id,
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

function homeAndHubCrumbs(locale: FeatureLocale): Crumb[] {
  return [
    { name: locale === 'tr' ? 'Ana sayfa' : 'Home', item: `${SITE_URL}/${locale}` },
    { name: locale === 'tr' ? 'Özellikler' : 'Features', item: featureUrl(locale, '') },
  ];
}

export interface FeatureSchemaInput {
  locale: FeatureLocale;
  slug: string;
  /** Visible product name, e.g. "Pulse AI". */
  name: string;
  serviceType: string;
  /** Same meaning as the hero lead. */
  description: string;
  /** The visible "how it works" steps (rendered with id="step-N"). */
  steps: readonly { title: string; body: string }[];
  howToName: string;
  /** The visible FAQ. */
  faqs: readonly { q: string; a: string }[];
}

/** Service + BreadcrumbList + HowTo (visible steps) + FAQPage (visible FAQ). */
export function buildFeaturePageJsonLd(input: FeatureSchemaInput) {
  const { locale, slug, name, serviceType, description, steps, howToName, faqs } = input;
  const url = featureUrl(locale, slug);
  const inLanguage = locale === 'tr' ? 'tr-TR' : 'en-US';

  const graph: object[] = [
    {
      '@type': 'Service',
      '@id': `${url}#service`,
      name,
      serviceType,
      description,
      url,
      provider: { '@id': ORGANIZATION_ID },
    },
    breadcrumbNode(`${url}#breadcrumb`, [...homeAndHubCrumbs(locale), { name, item: url }]),
  ];

  if (steps.length >= 2) {
    graph.push({
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: howToName,
      inLanguage,
      step: steps.map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: step.title,
        text: step.body,
        url: `${url}#step-${i + 1}`,
      })),
    });
  }

  if (faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/** /features hub: ItemList of every surface (with URLs) + BreadcrumbList. */
export function buildFeatureHubJsonLd({
  locale,
  listName,
  items,
}: {
  locale: FeatureLocale;
  listName: string;
  /** Absolute URLs. */
  items: readonly { name: string; description: string; url: string }[];
}) {
  const url = featureUrl(locale, '');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        '@id': `${url}#list`,
        name: listName,
        url,
        numberOfItems: items.length,
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          description: item.description,
          url: item.url,
        })),
      },
      breadcrumbNode(`${url}#breadcrumb`, homeAndHubCrumbs(locale)),
    ],
  };
}

/** Route guard for /[locale]/features/*: only tr and en render. */
export function isFeatureLocale(value: string): value is FeatureLocale {
  return value === 'tr' || value === 'en';
}
