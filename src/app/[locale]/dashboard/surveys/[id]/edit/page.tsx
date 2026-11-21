// Survey edit page (CLAUDE.md §42). Server shell: auth, business scope, write
// permission, and — per question — how many answers it has and which choice
// options were actually picked. The client editor uses those numbers for the
// type / option locks and for the "answers will be deleted" warning.

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canWriteForUserPayload, getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { SURVEY_EDIT_SELECT, type SurveyQuestionType } from '@/lib/surveys';
import SurveyEditorClient from '../../_components/SurveyEditorClient';
import type { StoredEditorSurvey } from '../../_components/survey-editor-state';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Anketi düzenle' : 'Edit survey',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditSurveyPage({ params }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const loginNext = `/${locale}/auth/login?next=/${locale}/dashboard/surveys/${id}/edit`;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(loginNext);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') redirect(loginNext);
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) redirect(loginNext);

  const tokenPayload = { userId: payload.userId, role: payload.role, email: payload.email };
  // The survey row, the token holder's scope and the write check are
  // independent reads, so they run at once; the checks below run in the same
  // order as before.
  const [survey, scopedIds, canWrite] = await Promise.all([
    prisma.survey.findUnique({
      where: { id },
      select: SURVEY_EDIT_SELECT,
    }),
    getScopedRestaurantIdsForUserPayload(tokenPayload),
    canWriteForUserPayload(tokenPayload),
  ]);
  if (!survey) notFound();

  // IDOR: the survey's business must be one this user may see (team members
  // included — same scope as the survey APIs).
  if (!scopedIds.includes(survey.restaurantId)) notFound();

  // A viewer (read-only team member) reads results but cannot edit.
  if (!canWrite) {
    redirect(`/${locale}/dashboard/surveys/${id}`);
  }

  // The business, and the choice options that responses actually picked —
  // run at once (was an array $transaction).
  const [restaurant, usedRows] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: survey.restaurantId },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        category: true,
        surveysEnabled: true,
      },
    }),
    prisma.surveyAnswer.groupBy({
      by: ['questionId', 'optionValue'],
      where: {
        question: { surveyId: id, type: 'multiple_choice' },
        optionValue: { not: null },
      },
      _count: { _all: true },
      orderBy: { questionId: 'asc' },
    }),
  ]);
  if (!restaurant) notFound();

  const usedByQuestion = new Map<string, string[]>();
  for (const row of usedRows) {
    if (row.optionValue === null) continue;
    const list = usedByQuestion.get(row.questionId);
    if (list) list.push(row.optionValue);
    else usedByQuestion.set(row.questionId, [row.optionValue]);
  }

  const stored: StoredEditorSurvey = {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    isPublished: survey.isPublished,
    accentColor: survey.accentColor,
    thankYouMessage: survey.thankYouMessage,
    collectContact: survey.collectContact,
    couponCode: survey.couponCode,
    couponLabel: survey.couponLabel,
    responseCount: survey._count.responses,
    questions: survey.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type as SurveyQuestionType,
      options: Array.isArray(q.options) ? (q.options as unknown[]).filter((o): o is string => typeof o === 'string') : null,
      required: q.required,
      answerCount: q._count.answers,
      usedOptions: usedByQuestion.get(q.id) ?? [],
    })),
  };

  return (
    <SurveyEditorClient
      mode="edit"
      locale={locale}
      restaurants={[restaurant]}
      initialRestaurantId={restaurant.id}
      survey={stored}
    />
  );
}
