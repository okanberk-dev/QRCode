// CLAUDE.md §38.99 — Owner panel campaigns page (server shell + client island).

import type { Locale } from '@/lib/translations';
import { CampaignsClient } from './_components/CampaignsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerCampaignsPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

  return <CampaignsClient locale={locale} />;
}
