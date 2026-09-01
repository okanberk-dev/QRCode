import type { Metadata } from 'next';
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
    description: doc.description,
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: {
        tr: '/tr/privacy',
        en: '/en/privacy',
        'x-default': '/tr/privacy',
      },
    },
    openGraph: {
      type: 'article',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: `https://buaze.com/${locale}/privacy`,
      title: doc.title,
      description: doc.description,
      images: [{ url: locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: doc.title }],
    },
  };
}

// Stage 83 §38.163 — ISR (1 day) for legal/regulatory content. Save endpoints
// hook revalidatePath() to invalidate immediately on edit (CLAUDE.md §38.163).
export const revalidate = 86400;

export default async function PrivacyPage({
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
