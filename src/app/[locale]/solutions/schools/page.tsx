import { GraduationCap } from 'lucide-react';
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
    title: t.sol_sch_title,
    description: t.sol_sch_desc,
  };
}

export default async function SchoolSolutionPage({
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
      industryKey="sch"
      icon={<GraduationCap size={14} />}
      industryBadge={t.sol_sch_badge}
      h1Prefix={t.sol_sch_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_sch_h1.split(' ').slice(-1)[0]}
      description={t.sol_sch_p}
    />
  );
}
