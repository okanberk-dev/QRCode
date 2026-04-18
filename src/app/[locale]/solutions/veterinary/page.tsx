import { PawPrint } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: t.sol_vet_title,
    description: t.sol_vet_desc,
  };
}

export default async function VeterinarySolutionPage({
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
      industryKey="vet"
      icon={<PawPrint size={14} />}
      industryBadge={t.sol_vet_badge}
      h1Prefix={t.sol_vet_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_vet_h1.split(' ').slice(-1)[0]}
      description={t.sol_vet_p}
    />
  );
}
