import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';

// Faz 2 — Bildirim ayarları artık /dashboard/account#notifications içinde.
// 308 redirect → mevcut bookmark'lar + e-posta linkleri kırılmaz.
// OwnerNotificationsForm component'i Section 6 içinden kullanılmaya devam ediyor.
//
// Stage 108 §38.188 — `force-dynamic` removed: the redirect target is a
// pure function of `params.locale`, no `cookies()` / `headers()` access.
// Letting Next.js statically prerender both /tr + /en variants (default
// behaviour without a `dynamic` export) eliminates per-request validation
// overhead — the redirect now serves from the edge as a 308 with no
// runtime branch.
export default async function OwnerNotificationsRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/account?section=notifications`);
}
