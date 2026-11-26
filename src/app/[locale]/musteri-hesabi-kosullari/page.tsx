import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import LegalDocumentPage from '@/components/marketing/LegalDocumentPage';
import { loadLoyaltyLegal } from '@/lib/legal/loyalty-legal';

// Loyalty / customer account legal text (CLAUDE.md §60, §61). General
// version: business placeholders read "the business that runs the
// programme"; /l/<slug>/kosullar and /aydinlatma show a business's own.
const KEY = 'musteri-hesabi-kosullari' as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const doc = await loadLoyaltyLegal(KEY, locale);
  return {
    title: doc.title,
    description: doc.description,
    alternates: {
      canonical: `/${locale}/${KEY}`,
      languages: { tr: `/tr/${KEY}`, en: `/en/${KEY}`, 'x-default': `/tr/${KEY}` },
    },
  };
}

export const revalidate = 86400;

export default async function CustomerAccountTermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const doc = await loadLoyaltyLegal(KEY, locale);
  return (
    <LegalDocumentPage
      locale={locale}
      t={getTranslations(locale)}
      doc={doc}
      eyebrow={locale === 'tr' ? 'MÜŞTERİ HESABI' : 'CUSTOMER ACCOUNT'}
    />
  );
}
