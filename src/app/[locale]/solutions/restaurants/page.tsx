import { Utensils } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: `${t.sol_res_title} — Buaze`,
    description: t.sol_res_desc,
  };
}

export default async function RestaurantSolutionPage({
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
      industryKey="res"
      icon={<Utensils size={14} />}
      industryBadge={locale === 'tr' ? 'RESTORAN & KAFELER İÇİN' : 'FOR RESTAURANTS & CAFES'}
      h1Prefix={t.sol_res_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_res_h1.split(' ').slice(-1)[0]}
      description={t.sol_res_p}
    />
  );
}
