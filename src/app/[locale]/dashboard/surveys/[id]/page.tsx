// Stage 98 — Survey detail page (CLAUDE.md §42). Manage tab + analytics
// preview + QR + delete. SSR auth + fetch; client component renders tabs.

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SURVEY_OWNER_SELECT } from '@/lib/surveys';
import SurveyDetailClient from '../_components/SurveyDetailClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Anket — Buaze' : 'Survey — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function SurveyDetailPage({ params }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

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

  // IDOR: confirm restaurant belongs to user.
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: survey.restaurantId },
    select: { id: true, name: true, userId: true },
  });
  if (!restaurant || restaurant.userId !== payload.userId) notFound();

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const normalizedEnvUrl = envAppUrl?.replace(/\/+$/, '');
  const hasLocalhostEnv = normalizedEnvUrl
    ? /localhost|127\.0\.0\.1/i.test(normalizedEnvUrl)
    : false;
  const appUrl =
    !hasLocalhostEnv && normalizedEnvUrl ? normalizedEnvUrl : 'https://www.buaze.com';
  const publicUrl = `${appUrl}/s/${survey.slug}`;

  // Serialize Date instances → ISO strings for client component.
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

  return (
    <SurveyDetailClient
      locale={locale}
      survey={serialized}
      restaurantName={restaurant.name}
      publicUrl={publicUrl}
    />
  );
}
