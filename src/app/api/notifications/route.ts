import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFS = {
  lowRatingEmail: true,
  dailyDigestEmail: false,
  weeklyReport: true,
};

const PreferencesBody = z.object({
  lowRatingEmail: z.boolean().optional(),
  dailyDigestEmail: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
}).strict();

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = await resolveOwnerUserId(actor);
  if (!userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const row = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: {
      lowRatingEmail: true,
      dailyDigestEmail: true,
      weeklyReport: true,
    },
  });
  // Edge cache (CLAUDE.md §38.100 Stage 24). NotificationBell client-side
  // 60s polling ile birleşir; `private` directive Vercel CDN'de user-isolated.
  const CACHE_HEADER = 'private, s-maxage=15, stale-while-revalidate=60';
  if (!row) {
    return NextResponse.json(DEFAULT_PREFS, {
      headers: { 'Cache-Control': CACHE_HEADER },
    });
  }

  return NextResponse.json(
    {
      lowRatingEmail: row.lowRatingEmail,
      dailyDigestEmail: row.dailyDigestEmail,
      weeklyReport: row.weeklyReport,
    },
    {
      headers: { 'Cache-Control': CACHE_HEADER },
    },
  );
}

export async function PUT(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // CLAUDE.md §37.2.C + §40.4.C — privileged write endpoint'leri
  // `rateLimit('endpoint:actor:${actor.id}', N, 60_000)` ile gate edilmeli.
  // Owner-scoped preference write; 20/dk slider/checkbox burst için yeterli.
  const rl = await rateLimit(`notifications-prefs:${actor.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const userId = await resolveOwnerUserId(actor);
  if (!userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = validateBody(PreferencesBody, body);
  if (!parsed.ok) return parsed.response;

  const current = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: {
      lowRatingEmail: true,
      dailyDigestEmail: true,
      weeklyReport: true,
    },
  });

  const next = {
    lowRatingEmail: parsed.data.lowRatingEmail ?? current?.lowRatingEmail ?? DEFAULT_PREFS.lowRatingEmail,
    dailyDigestEmail: parsed.data.dailyDigestEmail ?? current?.dailyDigestEmail ?? DEFAULT_PREFS.dailyDigestEmail,
    weeklyReport: parsed.data.weeklyReport ?? current?.weeklyReport ?? DEFAULT_PREFS.weeklyReport,
  };

  const row = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...next },
    update: next,
  });

  return NextResponse.json(
    {
      lowRatingEmail: row.lowRatingEmail,
      dailyDigestEmail: row.dailyDigestEmail,
      weeklyReport: row.weeklyReport,
    },
    {
      // Stage 108 §38.188 — mutation response MUST bypass any CDN/browser
      // cache; GET response sets `private, s-maxage=15, stale-while-
      // revalidate=60` so without `no-store` the toggle's prior value can
      // linger in the edge cache for up to 75s after a flip. CLAUDE.md
      // §40.6 mutation row.
      headers: { 'Cache-Control': 'no-store, must-revalidate' },
    },
  );
}
