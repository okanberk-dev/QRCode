// Denetim Merkezi — owner denetim detayı (server hydration, CLAUDE.md §40.10).
//
// Şablon + (yalnız yazma yetkisi olanlara) link token'ları + son yanıtlar sunucuda
// okunur; istemci ilk boyamada iskelet göstermez. Kapsam, API'nin çözdüğü kapsamın
// aynısıdır (ekip üyeleri dahil).

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getAuditDetail } from '@/lib/audits/queries';
import AuditDetailClient from '@/components/audits/AuditDetailClient';
import { requireOwnerAuditContext, resolveAuditAppUrl } from '@/components/audits/owner-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Denetim — Buaze' : 'Audit — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AuditDetailPage({ params }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

  const ctx = await requireOwnerAuditContext(locale, `/${locale}/dashboard/audits/${id}`);

  // `includeTokens`: salt-okunur üyeler link token'ı ALMAZ.
  const detail = await getAuditDetail({
    templateId: id,
    restaurantIds: ctx.scopedIds,
    includeTokens: ctx.canWrite,
  });
  if (!detail) notFound();

  const appUrl = await resolveAuditAppUrl();

  return <AuditDetailClient locale={locale} detail={detail} appUrl={appUrl} canWrite={ctx.canWrite} />;
}
