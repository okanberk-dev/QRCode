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
  const doc = await loadActiveLegalDocumentRendered('veri-ihlali-mudahale', locale);
  return { title: `${doc.title} — Buaze`, description: doc.description };
}

export const dynamic = 'force-dynamic';

export default async function BreachPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const doc = await loadActiveLegalDocumentRendered('veri-ihlali-mudahale', locale);

  return (
    <LegalDocumentPage
      locale={locale}
      t={t}
      doc={doc}
      eyebrow={locale === 'tr' ? 'VERİ İHLALİ' : 'DATA BREACH'}
    />
  );
}
