// Surveys Phase 1 — the survey list query, shared by GET /api/surveys and the
// server-rendered list page (server hydration, CLAUDE.md §40.10).
//
// Server-only (Prisma). Everything returned is JSON-safe: dates are ISO strings,
// so the API response and the page's `initialSurveys` prop have the same shape.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Never show more than this many surveys in the list. */
export const SURVEY_LIST_LIMIT = 200;

export const SURVEY_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  type: true,
  isActive: true,
  isPublished: true,
  publishedAt: true,
  accentColor: true,
  createdAt: true,
  updatedAt: true,
  restaurantId: true,
  restaurant: { select: { id: true, name: true, slug: true } },
  _count: { select: { responses: true, questions: true } },
} satisfies Prisma.SurveyDefaultArgs['select'];

export interface SurveyListRow {
  id: string;
  slug: string;
  title: string;
  /** Free-form column; the UI no longer shows it. */
  type: string;
  isActive: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  accentColor: string | null;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  restaurant: { id: string; name: string; slug: string };
  _count: { responses: number; questions: number };
  /** Time of the newest response, ISO; null = no responses yet. */
  latestResponseAt: string | null;
}

/**
 * Scope for the list: the requested restaurant when the actor may see it,
 * otherwise everything they may see. Callers pass the actor's scoped ids.
 */
export function buildSurveyListWhere(
  scopedRestaurantIds: ReadonlyArray<string>,
  requestedRestaurantId?: string | null,
): Prisma.SurveyWhereInput {
  if (requestedRestaurantId && scopedRestaurantIds.includes(requestedRestaurantId)) {
    return { restaurantId: requestedRestaurantId };
  }
  return { restaurantId: { in: [...scopedRestaurantIds] } };
}

/**
 * Surveys matching `where`, newest first, each with the time of its latest
 * response. One transaction (one connection under `connection_limit=1`,
 * CLAUDE.md §40.1): the list and the per-survey `_max(createdAt)` grouping.
 */
export async function listSurveys(where: Prisma.SurveyWhereInput): Promise<SurveyListRow[]> {
  const [rows, latest] = await prisma.$transaction([
    prisma.survey.findMany({
      where,
      select: SURVEY_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: SURVEY_LIST_LIMIT,
    }),
    prisma.surveyResponse.groupBy({
      by: ['surveyId'],
      where: { survey: where },
      _max: { createdAt: true },
    }),
  ]);

  const latestBySurvey = new Map<string, string>();
  for (const entry of latest) {
    const at = entry._max?.createdAt;
    if (at) latestBySurvey.set(entry.surveyId, at.toISOString());
  }

  return rows.map(({ publishedAt, createdAt, updatedAt, ...rest }) => ({
    ...rest,
    publishedAt: publishedAt ? publishedAt.toISOString() : null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    latestResponseAt: latestBySurvey.get(rest.id) ?? null,
  }));
}
