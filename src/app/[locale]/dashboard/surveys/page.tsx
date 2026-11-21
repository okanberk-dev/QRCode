// Surveys list page (CLAUDE.md §42, server hydration §40.10).
//
// Server: session + business scope + write permission + the first paint's
// surveys (the active business's list) + the public link origin. The client
// island paints those rows without a skeleton and only fetches when the shell
// switches to a business the server did not hydrate.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canWriteForUserPayload, getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import { getSurveyPublicBaseUrl } from '@/lib/surveys';
import { buildSurveyListWhere, listSurveys } from '@/lib/surveys-query';
import SurveysClient from './_components/SurveysClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Anketler' : 'Surveys',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restaurantId?: string; restaurant?: string }>;
}

export default async function OwnerSurveysPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/surveys`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/surveys`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/surveys`);
  }

  const tokenPayload = { userId: payload.userId, role: payload.role, email: payload.email };
  // Team members included — same scope the API layer resolves
  // (getScopedRestaurantIds). `userId: payload.userId` hid every
  // restaurant from invited team members.
  // A viewer may read and copy links but not create, publish or delete. The
  // API is the real gate; this only decides which buttons render. The two
  // lookups are independent and run at once.
  const [scopedIds, canWrite] = await Promise.all([
    getScopedRestaurantIdsForUserPayload(tokenPayload),
    canWriteForUserPayload(tokenPayload),
  ]);

  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: scopedIds }, isActive: true },
    select: { id: true, name: true, category: true, surveysEnabled: true },
    orderBy: { createdAt: 'asc' },
  });
  // The server cannot read localStorage: the active business is the URL's, else
  // the first one. The client re-resolves after mount and only trusts the
  // hydrated rows while both agree (`initialSurveysFor`).
  const initialActiveRestaurantId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: sp.restaurantId ?? sp.restaurant,
    storedRestaurantId: null,
  });
  // Needs the resolved business; the list helper runs its two reads at once.
  const initialSurveys = initialActiveRestaurantId
    ? await listSurveys(buildSurveyListWhere(scopedIds, initialActiveRestaurantId))
    : [];

  return (
    <SurveysClient
      locale={locale}
      restaurants={restaurants}
      initialActiveRestaurantId={initialActiveRestaurantId}
      initialSurveys={initialSurveys}
      initialSurveysFor={initialActiveRestaurantId}
      publicBaseUrl={getSurveyPublicBaseUrl()}
      canWrite={canWrite}
    />
  );
}
