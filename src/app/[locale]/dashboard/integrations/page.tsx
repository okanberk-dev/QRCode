import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';

// Faz 2 — Tek başına /integrations sayfası kaldırıldı. Per-restaurant settings
// hub'ında entegrasyon yönetimi: /dashboard/restaurants/[id]/settings#integrations
export const dynamic = 'force-dynamic';

export default async function OwnerIntegrationsRedirect({
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

  const userId = (payload.sub || (payload as { id?: string }).id) as string | undefined;
  if (!userId) redirect(`/${locale}/auth/login`);

  const first = await prisma.restaurant.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (!first) redirect(`/${locale}/dashboard/restaurants`);
  redirect(`/${locale}/dashboard/restaurants/${first.id}/settings?section=integrations`);
}
