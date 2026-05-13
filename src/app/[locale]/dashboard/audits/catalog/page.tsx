// CLAUDE.md §42 Phase 2 — Owner global audit catalog browse + fork.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import AuditCatalogClient from '@/components/audits/AuditCatalogClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Şablon kataloğu — Buaze' : 'Template catalog — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restaurantId?: string }>;
}

export default async function OwnerAuditCatalogPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/catalog`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/catalog`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/catalog`);
  }

  const restaurants = await prisma.restaurant.findMany({
    where: { userId: payload.userId, isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
  const activeId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: sp.restaurantId,
    storedRestaurantId: null,
  });

  return (
    <AuditCatalogClient
      locale={locale}
      restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
      initialActiveRestaurantId={activeId}
    />
  );
}
