// Stage 98 — Duplicate a survey (clone questions + settings, fresh slug).
// Useful for owners running an A/B-style follow-up or seasonal variants.
//
// Phase 1: rate limited and audited (`owner.survey.duplicate`); the copy's
// type is derived from its question count like every other write.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { writePanelAuditLog } from '@/lib/audit-log';
import { deriveSurveyType, SURVEY_OWNER_SELECT } from '@/lib/surveys';
import { createWithUniqueSlug, surveyWriteLimitResponse } from '../../_shared';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const limited = await surveyWriteLimitResponse(actor.id);
  if (limited) return limited;

  const { id } = await params;
  const source = await prisma.survey.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      accentColor: true,
      thankYouMessage: true,
      // Stage B — kvkkText + collectMarketingConsent not selected during
      // duplicate; the copy uses Buaze-managed legal pages (§19.1).
      collectContact: true,
      couponCode: true,
      couponLabel: true,
      restaurantId: true,
      questions: {
        select: { text: true, type: true, options: true, required: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
      restaurant: { select: { userId: true, surveysEnabled: true } },
    },
  });
  if (!source) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const canWrite = await canWriteRestaurant(actor, source.restaurantId);
  if (!canWrite) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  // Admin master switch (feature-access → surveysEnabled). §5.2 pattern:
  // the owner keeps their surveys but cannot create/publish while it is off.
  if (!source.restaurant.surveysEnabled) {
    return NextResponse.json(
      {
        error: 'surveys_disabled',
        message: 'Anketler bu işletme için Buaze yönetimi tarafından kapatıldı.',
      },
      { status: 403 },
    );
  }

  const newTitle = `${source.title} (kopya)`.slice(0, 140);

  const created = await createWithUniqueSlug(newTitle, (slug) =>
    prisma.survey.create({
      data: {
        restaurantId: source.restaurantId,
        slug,
        title: newTitle,
        description: source.description,
        type: deriveSurveyType(source.questions.length),
        isPublished: false,
        accentColor: source.accentColor,
        thankYouMessage: source.thankYouMessage,
        collectContact: source.collectContact,
        couponCode: source.couponCode,
        couponLabel: source.couponLabel,
        questions: {
          create: source.questions.map((q) => ({
            text: q.text,
            type: q.type,
            options: q.options ?? undefined,
            required: q.required,
            sortOrder: q.sortOrder,
          })),
        },
      },
      select: SURVEY_OWNER_SELECT,
    }),
  );

  await writePanelAuditLog(actor, 'owner.survey.duplicate', source.restaurant.userId ?? null, {
    surveyId: created.id,
    sourceSurveyId: id,
    restaurantId: source.restaurantId,
  });

  return NextResponse.json({ survey: created }, { status: 201 });
}
