// Stage 98 — Publish/unpublish toggle. Separate endpoint from PATCH so
// the UI can wire a single explicit action button without bundling field
// validation. Also future-proofs for publish gating (e.g. require ≥1
// question).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';

const Body = z.object({ publish: z.boolean() }).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

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
      _count: { select: { questions: true } },
    },
  });
  if (!survey) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const canWrite = await canWriteRestaurant(actor, survey.restaurantId);
  if (!canWrite) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  if (parsed.data.publish && survey._count.questions === 0) {
    return NextResponse.json(
      { error: 'no_questions', message: 'Yayına almadan önce en az 1 soru ekleyin.' },
      { status: 400 },
    );
  }

  const updated = await prisma.survey.update({
    where: { id },
    data: {
      isPublished: parsed.data.publish,
      publishedAt: parsed.data.publish ? new Date() : null,
    },
    select: { id: true, isPublished: true, publishedAt: true },
  });

  return NextResponse.json({ survey: updated });
}
