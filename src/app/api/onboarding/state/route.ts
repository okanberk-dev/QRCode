import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor || actor.source !== 'user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const row = await prisma.onboardingProgress.findUnique({
    where: { userId: actor.id },
  });

  // Stage 87 §38.167 — onboarding progress polling; cache header
  // private 15s/60sw (yüksek refresh frequency owner active flow,
  // PATCH frequency anlık). §38.100 paterni reuse — short fresh +
  // SWR 1min owner adımlar arası geçiş smooth.
  return NextResponse.json(
    {
      step: row?.step ?? 1,
      data: row?.data ?? null,
      completedAt: row?.completedAt ?? null,
    },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=60',
      },
    },
  );
}

export async function PATCH(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor || actor.source !== 'user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const raw: unknown = await req.json().catch(() => null);
  // Non-object bodies (`null`, arrays, primitives) used to crash on
  // `body.step` → 500; treat them as malformed.
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  // Size cap (parity with /api/onboarding/complete) — `data` is free-form
  // wizard state stored verbatim in onboarding_progress.data; bound it so an
  // authenticated user can't stuff a multi-MB blob into the JSON column.
  if (JSON.stringify(raw).length > 50_000) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
  }
  const body = raw as { step?: number; data?: unknown };

  const step =
    typeof body.step === 'number' && body.step >= 1 && body.step <= 10
      ? Math.floor(body.step)
      : undefined;
  const data = body.data === undefined ? undefined : (body.data as object | null);

  const row = await prisma.onboardingProgress.upsert({
    where: { userId: actor.id },
    create: {
      userId: actor.id,
      step: step ?? 1,
      data: data === undefined ? undefined : (data ?? undefined),
    },
    update: {
      ...(step !== undefined ? { step } : {}),
      ...(data === undefined ? {} : { data: data ?? undefined }),
    },
  });

  return NextResponse.json({
    step: row.step,
    data: row.data,
    completedAt: row.completedAt,
  });
}
