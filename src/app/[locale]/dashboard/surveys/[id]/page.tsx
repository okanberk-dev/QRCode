// Survey detail page (CLAUDE.md §42): header actions + Share / Results tabs.
// SSR auth + data; the client component renders the tabs and loads the results
// numbers when that tab opens.

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canWriteForUserPayload, getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { getSurveyPublicBaseUrl, SURVEY_OWNER_SELECT } from '@/lib/surveys';
import SurveyDetailClient from '../_components/SurveyDetailClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Anket' : 'Survey',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string; new?: string; saved?: string }>;
}

export default async function SurveyDetailPage({ params, searchParams }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/surveys/${id}`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/surveys/${id}`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/surveys/${id}`);
  }

  const survey = await prisma.survey.findUnique({
    where: { id },
    select: SURVEY_OWNER_SELECT,
  });
  if (!survey) notFound();

  const tokenPayload = { userId: payload.userId, role: payload.role, email: payload.email };
  // IDOR: the survey's business must be one this user may see (team members
  // included — same scope as the survey APIs).
  const scopedIds = await getScopedRestaurantIdsForUserPayload(tokenPayload);
  if (!scopedIds.includes(survey.restaurantId)) notFound();
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: survey.restaurantId },
    select: { id: true, name: true, slug: true, primaryColor: true, isActive: true, surveysEnabled: true },
  });
  if (!restaurant) notFound();
  // Viewer = read-only team member: no edit / publish / duplicate / delete.
  const canWrite = await canWriteForUserPayload(tokenPayload);

  // Serialize Date instances → ISO strings for the client component.
  // `type` is a free-form string in DB; narrow to the literal union the
  // client component expects (legacy rows could theoretically carry an
  // unknown value, fall back to 'multi_step').
  const narrowedType: 'single' | 'multi_step' =
    survey.type === 'single' ? 'single' : 'multi_step';
  const serialized = {
    ...survey,
    type: narrowedType,
    publishedAt: survey.publishedAt ? survey.publishedAt.toISOString() : null,
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
    questions: survey.questions.map((q) => ({
      ...q,
      type: q.type as
        | 'rating'
        | 'nps'
        | 'short_text'
        | 'long_text'
        | 'multiple_choice',
      options: (q.options as string[] | null) ?? null,
    })),
  };

  // Default tab: right after creating → Share; otherwise Results as soon as the
  // survey has ever had a response (all time, not the 30-day window), else Share.
  const requestedTab = sp.tab === 'share' || sp.tab === 'results' ? sp.tab : null;
  const initialTab = requestedTab ?? (sp.new === '1' ? 'share' : survey._count.responses > 0 ? 'results' : 'share');

  return (
    <SurveyDetailClient
      locale={locale}
      survey={serialized}
      restaurant={restaurant}
      publicBaseUrl={getSurveyPublicBaseUrl()}
      canWrite={canWrite}
      initialTab={initialTab}
      justCreated={sp.new === '1'}
      justSaved={sp.saved === '1'}
    />
  );
}
