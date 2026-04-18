import { Dumbbell } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

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
    title: t.sol_gym_title,
    description: t.sol_gym_desc,
  };
}

export default async function GymSolutionPage({
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
      industryKey="gym"
      icon={<Dumbbell size={14} />}
      industryBadge={t.sol_gym_badge}
      h1Prefix={t.sol_gym_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_gym_h1.split(' ').slice(-1)[0]}
      description={t.sol_gym_p}
    />
  );
}
