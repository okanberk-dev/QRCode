import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';

// Faz 2 — Tek başına /platforms sayfası kaldırıldı. Per-restaurant settings
// hub'ı `/dashboard/restaurants/[id]/settings#integrations` artık tüm
// platform yönetimini içeriyor (DefaultRedirectPicker + 6 yorum platformu +
// 4 sosyal medya). Owner burada landing page bekliyorsa ilk restoranının
// entegrasyon sekmesine; restoran yoksa restaurants listesine yönlendir.
export const dynamic = 'force-dynamic';

export default async function OwnerPlatformsRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);
  const payload = await verifyJwt(token);
  if (!payload) redirect(`/${locale}/auth/login`);

  // JWT payload login route'da `userId` field'ı ile imzalanır (auth.ts signJwt
  // çağrısında {userId: user.id, ...}). Önceki implementasyon yanlışlıkla
  // payload.sub / payload.id okuyordu → undefined → /auth/login redirect →
  // middleware /dashboard'a geri yolluyordu (kullanıcı raporu).
  const userId = typeof payload.userId === 'string' ? payload.userId : null;
  if (!userId) redirect(`/${locale}/auth/login`);

  const first = await prisma.restaurant.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (!first) redirect(`/${locale}/dashboard/restaurants`);
  redirect(`/${locale}/dashboard/restaurants/${first.id}/settings?section=integrations`);
}
