// Stage 98 — Single survey CRUD (GET / PATCH / DELETE).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant, canAccessRestaurant } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import {
  SURVEY_QUESTION_TYPES,
  TITLE_MAX,
  DESCRIPTION_MAX,
  THANK_YOU_MAX,
  QUESTION_TEXT_MAX,
  OPTION_TEXT_MAX,
  MAX_QUESTIONS_PER_SURVEY,
  OPTIONS_MIN,
  OPTIONS_MAX,
  validateOptions,
  SURVEY_OWNER_SELECT,
} from '@/lib/surveys';

const QuestionPatch = z
  .object({
    id: z.string().optional(), // existing question id (else new)
    text: z.string().min(1).max(QUESTION_TEXT_MAX),
    type: z.enum(SURVEY_QUESTION_TYPES),
    options: z.array(z.string().max(OPTION_TEXT_MAX)).optional(),
    required: z.boolean().optional().default(true),
  })
  .strict();

const PatchBody = z
  .object({
    title: z.string().min(1).max(TITLE_MAX).optional(),
    description: z.string().max(DESCRIPTION_MAX).nullable().optional(),
    accentColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
    thankYouMessage: z.string().max(THANK_YOU_MAX).nullable().optional(),
    // Stage B — kvkkText + collectMarketingConsent removed from owner UI/API.
    // Schema columns retained as @deprecated (CLAUDE.md §40.2 nullable +
    // default preview deploy safety); no writes from new code paths.
    collectContact: z.boolean().optional(),
    couponCode: z.string().max(40).nullable().optional(),
    couponLabel: z.string().max(120).nullable().optional(),
    isActive: z.boolean().optional(),
    questions: z.array(QuestionPatch).min(1).max(MAX_QUESTIONS_PER_SURVEY).optional(),
  })
  .strict();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { id } = await params;
  const survey = await prisma.survey.findUnique({
    where: { id },
    select: SURVEY_OWNER_SELECT,
  });
  if (!survey) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const hasAccess = await canAccessRestaurant(actor, survey.restaurantId);
  if (!hasAccess) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  return NextResponse.json({ survey });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.survey.findUnique({
    where: { id },
    select: { id: true, restaurantId: true, type: true },
  });
  if (!existing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const canWrite = await canWriteRestaurant(actor, existing.restaurantId);
  if (!canWrite) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof PatchBody>>(PatchBody, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // Single-type still requires exactly one question if questions provided.
  if (data.questions && existing.type === 'single' && data.questions.length !== 1) {
    return NextResponse.json(
      { error: 'single_requires_one', message: 'Tek soruluk anket için tam 1 soru girin.' },
      { status: 400 },
    );
  }

  // Per-type question option validation.
  if (data.questions) {
    for (const q of data.questions) {
      if (q.type === 'multiple_choice') {
        const valid = validateOptions(q.options);
        if (!valid) {
          return NextResponse.json(
            {
              error: 'invalid_options',
              message: `Çoktan seçmeli soru için ${OPTIONS_MIN}-${OPTIONS_MAX} seçenek gereklidir.`,
              question: q.text,
            },
            { status: 400 },
          );
        }
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.survey.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.accentColor !== undefined && { accentColor: data.accentColor || null }),
        ...(data.thankYouMessage !== undefined && {
          thankYouMessage: data.thankYouMessage?.trim() || null,
        }),
        ...(data.collectContact !== undefined && {
          collectContact: data.collectContact,
        }),
        ...(data.couponCode !== undefined && {
          couponCode: data.couponCode?.trim() || null,
        }),
        ...(data.couponLabel !== undefined && {
          couponLabel: data.couponLabel?.trim() || null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    if (data.questions) {
      // Replace questions: delete then create. Survey responses kept.
      // SurveyAnswer rows cascade-delete with the parent SurveyQuestion —
      // an explicit owner action (question edit). UI confirms before save.
      await tx.surveyQuestion.deleteMany({ where: { surveyId: id } });
      await tx.surveyQuestion.createMany({
        data: data.questions.map((q, idx) => ({
          surveyId: id,
          text: q.text.trim(),
          type: q.type,
          options:
            q.type === 'multiple_choice'
              ? (validateOptions(q.options) as string[])
              : undefined,
          required: q.required ?? true,
          sortOrder: idx * 10,
        })),
      });
    }
  });

  const updated = await prisma.survey.findUnique({
    where: { id },
    select: SURVEY_OWNER_SELECT,
  });
  return NextResponse.json({ survey: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.survey.findUnique({
    where: { id },
    select: { id: true, restaurantId: true },
  });
  if (!existing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const canWrite = await canWriteRestaurant(actor, existing.restaurantId);
  if (!canWrite) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  await prisma.survey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
