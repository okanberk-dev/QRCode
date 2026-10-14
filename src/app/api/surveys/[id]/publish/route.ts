// Stage 98 — Publish/unpublish toggle. Separate endpoint from PATCH so
// the UI can wire a single explicit action button without bundling field
// validation. Also future-proofs for publish gating (e.g. require ≥1
// question).
//
// Phase 1: rate limited and audited (`owner.survey.publish` /
// `owner.survey.unpublish`). Only a real state change is written or audited —
// a double click on "Publish" neither moves `publishedAt` nor adds a second
// activity-log row.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { writePanelAuditLog } from '@/lib/audit-log';
import { surveyWriteLimitResponse } from '../../_shared';

const Body = z.object({ publish: z.boolean() }).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const limited = await surveyWriteLimitResponse(actor.id);
  if (limited) return limited;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;

  const survey = await prisma.survey.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      isPublished: true,
      publishedAt: true,
      _count: { select: { questions: true } },
      restaurant: { select: { userId: true, surveysEnabled: true } },
    },
  });
  if (!survey) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const canWrite = await canWriteRestaurant(actor, survey.restaurantId);
  if (!canWrite) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  if (parsed.data.publish) {
    // Admin master switch (feature-access → surveysEnabled). §5.2 pattern:
    // the owner keeps their surveys but cannot create/publish while it is off.
    if (!survey.restaurant.surveysEnabled) {
      return NextResponse.json(
        {
          error: 'surveys_disabled',
          message: 'Anketler bu işletme için Buaze yönetimi tarafından kapatıldı.',
        },
        { status: 403 },
      );
    }

    if (survey._count.questions === 0) {
      return NextResponse.json(
        { error: 'no_questions', message: 'Yayına almadan önce en az 1 soru ekleyin.' },
        { status: 400 },
      );
    }
  }

  // Already in the requested state: nothing to write, nothing to log.
  if (survey.isPublished === parsed.data.publish) {
    return NextResponse.json({
      survey: {
        id: survey.id,
        isPublished: survey.isPublished,
        publishedAt: survey.publishedAt,
      },
    });
  }

  const updated = await prisma.survey.update({
    where: { id },
    data: {
      isPublished: parsed.data.publish,
      publishedAt: parsed.data.publish ? new Date() : null,
    },
    select: { id: true, isPublished: true, publishedAt: true },
  });

  await writePanelAuditLog(
    actor,
    parsed.data.publish ? 'owner.survey.publish' : 'owner.survey.unpublish',
    survey.restaurant.userId ?? null,
    { surveyId: id, restaurantId: survey.restaurantId },
  );

  return NextResponse.json({ survey: updated });
}
