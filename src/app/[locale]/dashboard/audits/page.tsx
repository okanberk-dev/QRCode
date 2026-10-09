// CLAUDE.md §42 Phase 2 — Owner audit list page.
// Server shell: auth + restoran listesi. Client island: liste + filter + CTA.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import AuditListClient from '@/components/audits/AuditListClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Denetim Merkezi — Buaze' : 'Audit Center — Buaze',
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

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits`);
  }

  // Team members included — same scope the API layer resolves
  // (getScopedRestaurantIds). `userId: payload.userId` hid every
  // restaurant from invited team members.
  const scopedIds = await getScopedRestaurantIdsForUserPayload({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: scopedIds }, isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
  const activeId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: sp.restaurantId ?? sp.restaurant,
    storedRestaurantId: null,
  });

  return (
    <AuditListClient
      locale={locale}
      restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
      initialActiveRestaurantId={activeId}
    />
  );
}
