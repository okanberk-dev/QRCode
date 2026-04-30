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
  const doc = await loadActiveLegalDocumentRendered('kvkk-aydinlatma', locale);
  return {
    title: `${doc.title} - Buaze`,
    description: doc.description,
  };
}

export const dynamic = 'force-dynamic';

export default async function KvkkPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const doc = await loadActiveLegalDocumentRendered('kvkk-aydinlatma', locale);

  return (
    <LegalDocumentPage
      locale={locale}
      t={t}
      doc={doc}
      eyebrow={locale === 'tr' ? 'YASAL UYARI' : 'LEGAL NOTICE'}
      fallbackTitle={locale === 'tr' ? 'KVKK aydınlatma metni' : 'KVKK privacy notice'}
    />
  );
}
