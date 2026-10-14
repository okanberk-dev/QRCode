// Helpers shared by the owner survey write endpoints (POST /api/surveys, PATCH
// / DELETE /api/surveys/[id], publish, duplicate). Not a route: Next.js only
// treats `route.ts` as a handler, so this file is just a module.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { randomSuffix, resolveUniqueSlug, slugifyTitle } from '@/lib/surveys';

/** Every write endpoint shares one budget per actor (CLAUDE.md §40.4.C). */
export const SURVEY_WRITE_LIMIT = 30;
export const SURVEY_WRITE_WINDOW_MS = 60_000;

/**
 * Returns the 429 response when the actor is over the shared write budget, or
 * null when the call may proceed. Call it right after authentication.
 */
export async function surveyWriteLimitResponse(actorId: string): Promise<NextResponse | null> {
  const limit = await rateLimit(
    `surveys-write:${actorId}`,
    SURVEY_WRITE_LIMIT,
    SURVEY_WRITE_WINDOW_MS,
  );
  if (limit.allowed) return null;
  return NextResponse.json(
    { error: 'rate_limit', message: 'Çok fazla istek, lütfen biraz bekleyin.' },
    { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
  );
}

/**
 * Create a row with a free slug. The `findMany` only narrows the choice; two
 * requests can still pick the same slug at the same moment (a double click, or
 * more than 200 slugs sharing the prefix), so a unique-constraint failure
 * (Prisma P2002) retries with a random suffix instead of turning into a 500.
 */
export async function createWithUniqueSlug<T>(
  title: string,
  create: (slug: string) => Promise<T>,
): Promise<T> {
  const baseSlug = slugifyTitle(title);
  const taken = await prisma.survey.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
    take: 200,
  });
  let slug = resolveUniqueSlug(baseSlug, new Set(taken.map((s) => s.slug)));
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await create(slug);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002' && attempt < 3) {
        slug = `${baseSlug}-${randomSuffix()}`;
        continue;
      }
      throw err;
    }
  }
}
