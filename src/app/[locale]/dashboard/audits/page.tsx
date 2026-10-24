// Denetim Merkezi — owner liste sayfası (server hydration, CLAUDE.md §40.10).
//
// Sunucu: oturum + işletme kapsamı + etkin işletmenin denetimleri + hazır şablon
// kataloğu + yazma yetkisi. İstemci (AuditListClient) bunları ilk boyamada
// iskelet göstermeden çizer; başka işletmeye geçince yalnız o işletmeyi çeker.

import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import { listCatalogForOwner, listOwnerAuditTemplates } from '@/lib/audits/queries';
import AuditListClient from '@/components/audits/AuditListClient';
import { requireOwnerAuditContext, resolveAuditAppUrl } from '@/components/audits/owner-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Denetim Merkezi' : 'Audit Center',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restaurantId?: string; restaurant?: string }>;
}

export default async function OwnerAuditsPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;

  const ctx = await requireOwnerAuditContext(locale, `/${locale}/dashboard/audits`);

  // Ekip üyeleri dahil kapsam (`userId` filtresi davetli üyelerden işletmeleri gizlerdi).
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: ctx.scopedIds }, isActive: true },
    select: { id: true, name: true, category: true },
    orderBy: { createdAt: 'asc' },
  });
  // Sunucu localStorage'ı okuyamaz → etkin işletme yalnız URL'den (yoksa ilk işletme).
  // Kabuk `?restaurantId`'yi boyamadan sonra ekler; istemci önbelleği bununla uyumlu.
  const activeId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: sp.restaurantId ?? sp.restaurant,
    storedRestaurantId: null,
  });

  // Her fonksiyon kendi içinde tek `$transaction`/sorgu kullanır; aralarında
  // `Promise.all` YOK (Supabase pooler connection_limit=1, CLAUDE.md §40.1).
  const initialTemplates = activeId ? await listOwnerAuditTemplates(activeId) : [];
  const { data: catalog } = await listCatalogForOwner();
  const appUrl = await resolveAuditAppUrl();

  return (
    <AuditListClient
      locale={locale}
      restaurants={restaurants}
      hydratedRestaurantId={activeId}
      initialTemplates={initialTemplates}
      catalog={catalog}
      canWrite={ctx.canWrite}
      appUrl={appUrl}
    />
  );
}
