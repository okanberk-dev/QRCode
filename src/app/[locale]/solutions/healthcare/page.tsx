import { HeartPulse } from 'lucide-react';
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
    title: `${t.sol_hea_title} — Buaze`,
    description: t.sol_hea_desc,
  };
}

export default async function HealthcareSolutionPage({
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
      industryKey="hea"
      icon={<HeartPulse size={14} />}
      industryBadge={locale === 'tr' ? 'KLİNİK & SAĞLIK İÇİN' : 'FOR CLINICS & HEALTHCARE'}
      h1Prefix={t.sol_hea_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_hea_h1.split(' ').slice(-1)[0]}
      description={t.sol_hea_p}
    />
  );
}
