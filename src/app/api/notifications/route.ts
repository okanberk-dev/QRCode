import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFS = {
  lowRatingEmail: true,
  dailyDigestEmail: false,
  weeklyReport: true,
};

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

  let body: {
    lowRatingEmail?: unknown;
    dailyDigestEmail?: unknown;
    weeklyReport?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const toBool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

  const current = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: {
      lowRatingEmail: true,
      dailyDigestEmail: true,
      weeklyReport: true,
    },
  });

  const next = {
    lowRatingEmail: toBool(body.lowRatingEmail, current?.lowRatingEmail ?? DEFAULT_PREFS.lowRatingEmail),
    dailyDigestEmail: toBool(body.dailyDigestEmail, current?.dailyDigestEmail ?? DEFAULT_PREFS.dailyDigestEmail),
    weeklyReport: toBool(body.weeklyReport, current?.weeklyReport ?? DEFAULT_PREFS.weeklyReport),
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
