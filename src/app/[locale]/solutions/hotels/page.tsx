import { BedDouble } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: `${t.sol_hot_title} — Buaze`,
    description: t.sol_hot_desc,
  };
}

export default async function HotelSolutionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="hot"
      icon={<BedDouble size={14} />}
      industryBadge={locale === 'tr' ? 'OTEL & KONAKLAMA İÇİN' : 'FOR HOTELS & HOSPITALITY'}
      h1Prefix={t.sol_hot_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_hot_h1.split(' ').slice(-1)[0]}
      description={t.sol_hot_p}
    />
  );
}
