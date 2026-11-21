// Survey create page (CLAUDE.md §42). Server shell: auth, business scope, write
// permission and the starting point. The client editor handles the two phases
// (pick a template → edit with a live preview).

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canWriteForUserPayload, scopedRestaurantWhereForUserPayload } from '@/lib/panel-access';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import { getSurveyTemplate } from '@/lib/survey-templates';
import SurveyEditorClient from '../_components/SurveyEditorClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Yeni anket' : 'New survey',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restaurantId?: string; restaurant?: string; template?: string }>;
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

  const tokenPayload = { userId: payload.userId, role: payload.role, email: payload.email };
  // The write check and the business list are independent, so they run at
  // once; the redirects below keep their order. Team members included — same
  // scope the API layer resolves (owners filter on userId directly).
  const [canWrite, restaurants] = await Promise.all([
    canWriteForUserPayload(tokenPayload),
    (async () =>
      prisma.restaurant.findMany({
        where: { ...(await scopedRestaurantWhereForUserPayload(tokenPayload)), isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          primaryColor: true,
          category: true,
          surveysEnabled: true,
        },
        orderBy: { createdAt: 'asc' },
      }))(),
  ]);
  // A viewer (read-only team member) cannot create surveys; the API refuses too.
  if (!canWrite) {
    redirect(`/${locale}/dashboard/surveys`);
  }

  if (restaurants.length === 0) {
    redirect(`/${locale}/dashboard/restaurants`);
  }
  const initialRestaurantId =
    resolveActiveRestaurantId({
      restaurants: restaurants.map((r) => ({ id: r.id })),
      queryRestaurantId: sp.restaurantId ?? sp.restaurant,
      storedRestaurantId: null,
    }) ?? restaurants[0].id;

  // `?template=` is either `blank` or a known template id; anything else shows
  // the template picker.
  const initialTemplate =
    sp.template === 'blank' || getSurveyTemplate(sp.template) ? (sp.template ?? null) : null;

  return (
    <SurveyEditorClient
      mode="create"
      locale={locale}
      restaurants={restaurants}
      initialRestaurantId={initialRestaurantId}
      initialTemplate={initialTemplate}
    />
  );
}
