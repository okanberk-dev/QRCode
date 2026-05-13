// Stage 98 — Survey wizard entry (CLAUDE.md §42). Server shell: auth +
// restaurant scope. Client wizard handles the 5-step flow.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import SurveyWizardClient from '../_components/SurveyWizardClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Yeni anket — Buaze' : 'New survey — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restaurantId?: string }>;
}

export default async function NewSurveyPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/surveys/new`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/surveys/new`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/surveys/new`);
  }

  const restaurants = await prisma.restaurant.findMany({
    where: { userId: payload.userId, isActive: true },
    select: { id: true, name: true, primaryColor: true },
    orderBy: { createdAt: 'asc' },
  });
  if (restaurants.length === 0) {
    redirect(`/${locale}/dashboard/restaurants`);
  }
  const initialActiveRestaurantId = resolveActiveRestaurantId({
    restaurants: restaurants.map((r) => ({ id: r.id })),
    queryRestaurantId: sp.restaurantId,
    storedRestaurantId: null,
  });

  return (
    <SurveyWizardClient
      locale={locale}
      restaurants={restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        primaryColor: r.primaryColor,
      }))}
      initialRestaurantId={initialActiveRestaurantId || restaurants[0].id}
    />
  );
}
