// Denetim Merkezi — yanıt incelemesi (spec §3.7). Sunucudan yüklenir
// (CLAUDE.md §40.10): tek başına dönen bir yükleniyor simgesi yok.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getAuditResponseDetail } from '@/lib/audits/queries';
import AuditResponseDetailClient from '@/components/audits/AuditResponseDetailClient';
import { requireOwnerAuditContext } from '@/components/audits/owner-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Denetim yanıtı — Buaze' : 'Audit response — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string; respId: string }>;
}

export default async function AuditResponseDetailPage({ params }: PageProps) {
  const { locale: localeParam, id, respId } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

  const ctx = await requireOwnerAuditContext(
    locale,
    `/${locale}/dashboard/audits/${id}/responses/${respId}`,
  );

  // Kapsam: ekip üyeleri dahil (API'nin çözdüğü kapsamın aynısı).
  const response = await getAuditResponseDetail({
    responseId: respId,
    restaurantIds: ctx.scopedIds,
    templateId: id,
  });
  if (!response) notFound();

  return <AuditResponseDetailClient locale={locale} detail={response} canWrite={ctx.canWrite} />;
}
