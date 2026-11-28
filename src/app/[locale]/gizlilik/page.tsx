import { metaDescription } from '@/lib/seo/meta-description';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import LegalDocumentPage from '@/components/marketing/LegalDocumentPage';
import { loadActiveLegalDocumentRendered } from '@/lib/legal/loader';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const doc = await loadActiveLegalDocumentRendered('gizlilik-politikasi', locale);
  return {
    title: doc.title,
    description: metaDescription(doc.description),
    alternates: {
      canonical: locale === 'tr' ? '/tr/gizlilik' : '/en/privacy',
      languages: {
        tr: '/tr/gizlilik',
        en: '/en/privacy',
        'x-default': '/tr/gizlilik',
      },
    },
    openGraph: {
      type: 'article',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: locale === 'tr' ? `${SITE_URL}/tr/gizlilik` : `${SITE_URL}/en/privacy`,
      title: doc.title,
      description: metaDescription(doc.description),
      images: [{ url: locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: doc.title }],
    },
  };
}

// Stage 83 §38.163 — ISR (1 day) for legal/regulatory content. Save endpoints
// hook revalidatePath() to invalidate immediately on edit (CLAUDE.md §38.163).
export const revalidate = 86400;

export default async function GizlilikPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const doc = await loadActiveLegalDocumentRendered('gizlilik-politikasi', locale);

  return (
    <LegalDocumentPage
      locale={locale}
      t={t}
      doc={doc}
      eyebrow={locale === 'tr' ? 'GİZLİLİK' : 'PRIVACY'}
    />
  );
}
