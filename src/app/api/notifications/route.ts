import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';

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
  if (!row) return NextResponse.json(DEFAULT_PREFS);

  return NextResponse.json({
    lowRatingEmail: row.lowRatingEmail,
    dailyDigestEmail: row.dailyDigestEmail,
    weeklyReport: row.weeklyReport,
  });
}

export async function PUT(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

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

  return NextResponse.json({
    lowRatingEmail: row.lowRatingEmail,
    dailyDigestEmail: row.dailyDigestEmail,
    weeklyReport: row.weeklyReport,
  });
}
