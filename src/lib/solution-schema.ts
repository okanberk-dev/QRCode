import type { Locale } from '@/lib/translations';

interface SolutionSchemaArgs {
  locale: Locale;
  /** Full sector slug, e.g. "restaurants", "hotels". */
  slug: string;
  /** Localized industry display label, e.g. "Restoranlar", "Hotels". */
  industryLabel: string;
  /** Page H1 / service title — full sentence used as service name. */
  serviceName: string;
  /** Service description (= meta description usually). */
  description: string;
  /** Optional FAQ pairs to emit a FAQPage block. */
  faqs?: Array<{ q: string; a: string }>;
}

/**
 * Returns BreadcrumbList + Service (+ optional FAQPage) JSON-LD nodes for a
 * sector solution page. Mirrors the shape already used by
 * `SolutionPageLayout.tsx` so layout-using and custom-layout pages emit the
 * same SEO surface. Keep additions backwards-compatible — Google tolerates
 * extra fields but rejects breaking ones.
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
  const canonicalUrl = `https://www.buaze.com/${locale}/solutions/${slug}`;

  const schemas: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://www.buaze.com/${locale}` },
        { '@type': 'ListItem', position: 2, name: isTr ? 'Çözümler' : 'Solutions', item: `https://www.buaze.com/${locale}/solutions` },
        { '@type': 'ListItem', position: 3, name: industryLabel, item: canonicalUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: serviceName,
      description,
      provider: { '@type': 'Organization', name: 'Buaze', url: 'https://www.buaze.com' },
      areaServed: { '@type': 'Country', name: 'Turkey' },
      serviceType: isTr ? 'İtibar yönetimi yazılımı' : 'Reputation management software',
      audience: { '@type': 'BusinessAudience', audienceType: industryLabel },
      url: canonicalUrl,
      inLanguage: isTr ? 'tr-TR' : 'en-US',
    },
  ];

  if (faqs && faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return schemas;
}
