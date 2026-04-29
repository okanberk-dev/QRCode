import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';

// Faz 2 — Bildirim ayarları artık /dashboard/account#notifications içinde.
// 308 redirect → mevcut bookmark'lar + e-posta linkleri kırılmaz.
// OwnerNotificationsForm component'i Section 6 içinden kullanılmaya devam ediyor.
export const dynamic = 'force-dynamic';

export default async function OwnerNotificationsRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/account?section=notifications`);
}
