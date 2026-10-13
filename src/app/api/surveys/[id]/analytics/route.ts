// Stage 98 — Survey analytics aggregate.
// Range-scoped (7d / 30d / 90d / all). Returns:
//  - summary: the numbers behind the "Sonuçlar" cards (Phase 1)
//  - totals: { responses, completed, completionRate } — kept for old clients
//  - perQuestion: per-question aggregate (rating avg, nps score + segments,
//      option distribution, text answers newest first)
//  - trend: daily response count (chart)
//
// All arithmetic lives in lib/survey-analytics.ts; this route only fetches.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import {
  ANALYTICS_ANSWER_LIMIT,
  buildPerQuestionStats,
  buildSurveySummary,
} from '@/lib/survey-analytics';

type Range = '7d' | '30d' | '90d' | 'all';

function rangeToDate(range: Range): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const rangeRaw = searchParams.get('range') || '30d';
  const range: Range = (['7d', '30d', '90d', 'all'] as const).includes(rangeRaw as Range)
    ? (rangeRaw as Range)
    : '30d';
  const since = rangeToDate(range);

  const survey = await prisma.survey.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      restaurantId: true,
      collectContact: true,
      questions: {
        select: { id: true, text: true, type: true, options: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!survey) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const hasAccess = await canAccessRestaurant(actor, survey.restaurantId);
  if (!hasAccess) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const responseWhere = {
    surveyId: id,
    ...(since && { createdAt: { gte: since } }),
  };
  // Contact details only matter when the survey asks for them. When it does not,
  // the card is hidden, so skip the real count (an impossible filter is free).
  const contactWhere = survey.collectContact
    ? {
        ...responseWhere,
        OR: [{ email: { not: null } }, { phone: { not: null } }],
      }
    : { surveyId: id, id: { in: [] as string[] } };

  const [
    totalResponses,
    completedResponses,
    answers,
    responsesAllTime,
    latestResponse,
    contactResponses,
  ] = await prisma.$transaction([
    prisma.surveyResponse.count({ where: responseWhere }),
    prisma.surveyResponse.count({
      where: { ...responseWhere, completedAt: { not: null } },
    }),
    // Newest answers first: the free-text samples and the 10,000 cut-off both
    // mean "the latest". Without an order the "recent" comment was a guess.
    prisma.surveyAnswer.findMany({
      where: {
        response: { surveyId: id, ...(since && { createdAt: { gte: since } }) },
      },
      select: {
        questionId: true,
        responseId: true,
        textValue: true,
        numberValue: true,
        optionValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: ANALYTICS_ANSWER_LIMIT,
    }),
    // All time, not limited to the range — drives "none yet" vs "none in this
    // range" and "last response".
    prisma.surveyResponse.count({ where: { surveyId: id } }),
    prisma.surveyResponse.findFirst({
      where: { surveyId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.surveyResponse.count({ where: contactWhere }),
  ]);

  const perQuestion = buildPerQuestionStats(survey.questions, answers);
  const summary = buildSurveySummary({
    questions: survey.questions,
    answers,
    responses: totalResponses,
    responsesAllTime,
    collectContact: survey.collectContact,
    contactResponses,
    lastResponseAt: latestResponse?.createdAt ?? null,
  });

  // Trend — daily count last N days. Group in memory (simpler than groupBy date_trunc).
  const trendResponses = await prisma.surveyResponse.findMany({
    where: responseWhere,
    select: { createdAt: true, completedAt: true },
    take: 5000,
    orderBy: { createdAt: 'asc' },
  });

  const trendMap = new Map<string, { total: number; completed: number }>();
  trendResponses.forEach((r) => {
    const day = r.createdAt.toISOString().slice(0, 10);
    const entry = trendMap.get(day) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (r.completedAt) entry.completed += 1;
    trendMap.set(day, entry);
  });
  const trend = Array.from(trendMap.entries())
    .map(([date, v]) => ({ date, total: v.total, completed: v.completed }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(
    {
      range,
      since: since?.toISOString() ?? null,
      survey: { id: survey.id, title: survey.title, type: survey.type },
      totals: {
        responses: totalResponses,
        completed: completedResponses,
        completionRate:
          totalResponses === 0
            ? 0
            : Math.round((completedResponses / totalResponses) * 100),
      },
      summary,
      perQuestion,
      trend,
    },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
      },
    },
  );
}
