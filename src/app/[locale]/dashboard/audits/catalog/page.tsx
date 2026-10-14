// Denetim Merkezi — eski ayrı katalog sayfası artık listedeki "Hazır şablonlar"
// sekmesidir (spec §4.3). Eski bağlantılar / yer imleri çalışmaya devam etsin
// diye burada yalnız yönlendirilir; oturum / yetki kontrolünü hedef sayfa yapar.

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restaurantId?: string; restaurant?: string }>;
}

export default async function OwnerAuditCatalogRedirect({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;

  const qs = new URLSearchParams({ tab: 'ready' });
  const restaurantId = sp.restaurantId ?? sp.restaurant;
  if (restaurantId) qs.set('restaurantId', restaurantId);

  redirect(`/${locale}/dashboard/audits?${qs.toString()}`);
}
