// Stage 98 — Survey analytics aggregate.
// Range-scoped (7d / 30d / 90d / all). Returns:
//  - totals: { responses, completed, completionRate }
//  - perQuestion: per-question aggregate (rating avg, nps score,
//      option distribution, text responses count)
//  - trend: daily response count (chart)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { calculateNpsScore } from '@/lib/surveys';

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

  const [totalResponses, completedResponses, answers] = await prisma.$transaction([
    prisma.surveyResponse.count({ where: responseWhere }),
    prisma.surveyResponse.count({
      where: { ...responseWhere, completedAt: { not: null } },
    }),
    prisma.surveyAnswer.findMany({
      where: {
        response: { surveyId: id, ...(since && { createdAt: { gte: since } }) },
      },
      select: {
        questionId: true,
        textValue: true,
        numberValue: true,
        optionValue: true,
        createdAt: true,
      },
      take: 10_000,
    }),
  ]);

  // Per-question aggregation
  const perQuestion = survey.questions.map((q) => {
    const qAnswers = answers.filter((a) => a.questionId === q.id);
    const count = qAnswers.length;
    if (q.type === 'rating' || q.type === 'nps') {
      const numbers = qAnswers
        .map((a) => a.numberValue)
        .filter((n): n is number => typeof n === 'number');
      const avg =
        numbers.length > 0
          ? numbers.reduce((s, n) => s + n, 0) / numbers.length
          : null;
      const distribution: Record<string, number> = {};
      const bins =
        q.type === 'rating' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      bins.forEach((b) => {
        distribution[String(b)] = 0;
      });
      numbers.forEach((n) => {
        if (distribution[String(n)] !== undefined) distribution[String(n)] += 1;
      });
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        count,
        avg,
        npsScore: q.type === 'nps' ? calculateNpsScore(numbers) : null,
        distribution,
      };
    }
    if (q.type === 'multiple_choice') {
      const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
      const distribution: Record<string, number> = {};
      opts.forEach((o) => {
        distribution[o] = 0;
      });
      qAnswers.forEach((a) => {
        if (a.optionValue && distribution[a.optionValue] !== undefined) {
          distribution[a.optionValue] += 1;
        }
      });
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        count,
        distribution,
      };
    }
    // text answers — surface only the recent samples; full export is via /export
    const samples = qAnswers
      .filter((a) => a.textValue)
      .slice(0, 20)
      .map((a) => a.textValue as string);
    return {
      id: q.id,
      text: q.text,
      type: q.type,
      count,
      samples,
    };
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
