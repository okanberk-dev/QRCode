// Stage 98 — Single survey CRUD (GET / PATCH / DELETE).
//
// PATCH never loses answers by accident. SurveyAnswer rows cascade away with
// their SurveyQuestion, and the old implementation deleted every question and
// re-created it. Now questions are matched by id and updated in place; a
// question is deleted only when the caller names it in `removedQuestionIds`;
// the counts that drive the type / option locks are read inside the same
// transaction, after the question rows are locked, so a public submission
// cannot slip in between planning and writing (see planQuestionSync).

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant, canAccessRestaurant } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { writePanelAuditLog } from '@/lib/audit-log';
import {
  SURVEY_QUESTION_TYPES,
  TITLE_MAX,
  DESCRIPTION_MAX,
  THANK_YOU_MAX,
  QUESTION_TEXT_MAX,
  OPTION_TEXT_MAX,
  MAX_QUESTIONS_PER_SURVEY,
  COUPON_LABEL_REQUIRED_MESSAGE,
  deriveSurveyType,
  isCouponLabelMissing,
  planFailureToHttp,
  planQuestionSync,
  SURVEY_OWNER_SELECT,
  type QuestionPlanFailure,
  type QuestionPlanSuccess,
} from '@/lib/surveys';
import { surveyWriteLimitResponse } from '../_shared';

const QuestionPatch = z
  .object({
    id: z.string().min(1).max(40).optional(), // existing question id (else new)
    text: z.string().trim().min(1).max(QUESTION_TEXT_MAX),
    type: z.enum(SURVEY_QUESTION_TYPES),
    options: z.array(z.string().max(OPTION_TEXT_MAX)).optional(),
    required: z.boolean().optional().default(true),
  })
  .strict();

const PatchBody = z
  .object({
    title: z.string().trim().min(1).max(TITLE_MAX).optional(),
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
    // Stored questions the user deliberately deleted in the editor. Without an
    // entry here the server refuses to drop a stored question (409).
    removedQuestionIds: z.array(z.string().max(40)).max(MAX_QUESTIONS_PER_SURVEY).optional(),
  })
  .strict();

/** Thrown inside the transaction so everything rolls back, caught right outside. */
class PlanFailed extends Error {
  constructor(readonly failure: QuestionPlanFailure) {
    super(failure.code);
  }
}

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

  const limited = await surveyWriteLimitResponse(actor.id);
  if (limited) return limited;

  const { id } = await params;
  const existing = await prisma.survey.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      couponCode: true,
      couponLabel: true,
      restaurant: { select: { userId: true } },
    },
  });
  if (!existing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const canWrite = await canWriteRestaurant(actor, existing.restaurantId);
  if (!canWrite) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof PatchBody>>(PatchBody, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // Coupon rule on the COMBINED result (request value, else what is stored),
  // and only when the request touches a coupon field — an old survey that has
  // a bare code stays editable until its owner changes the coupon.
  if (data.couponCode !== undefined || data.couponLabel !== undefined) {
    const finalCode = data.couponCode !== undefined ? data.couponCode : existing.couponCode;
    const finalLabel = data.couponLabel !== undefined ? data.couponLabel : existing.couponLabel;
    if (isCouponLabelMissing(finalCode, finalLabel)) {
      return NextResponse.json(
        { error: 'coupon_label_required', message: COUPON_LABEL_REQUIRED_MESSAGE },
        { status: 400 },
      );
    }
  }

  let result: {
    survey: Prisma.SurveyGetPayload<{ select: typeof SURVEY_OWNER_SELECT }> | null;
    removed: Array<{ id: string; answerCount: number }>;
  };
  try {
    // Interactive transaction, sequential awaits only (connection_limit=1,
    // CLAUDE.md §40.1 — no Promise.all inside).
    result = await prisma.$transaction(
      async (tx) => {
        let plan: QuestionPlanSuccess | null = null;

        if (data.questions) {
          // 1) Lock the question rows. A concurrent public submission takes a
          //    KEY SHARE lock on the question it answers (foreign key), which
          //    conflicts with FOR UPDATE: in-flight submissions finish first,
          //    new ones wait for this transaction. The counts below therefore
          //    cannot go stale before the writes.
          await tx.$queryRaw`SELECT id FROM survey_questions WHERE survey_id = ${id} FOR UPDATE`;

          // 2) Counts INSIDE the transaction.
          const stored = await tx.surveyQuestion.findMany({
            where: { surveyId: id },
            select: {
              id: true,
              type: true,
              options: true,
              _count: { select: { answers: true } },
            },
            orderBy: { sortOrder: 'asc' },
          });
          const usedRows = await tx.surveyAnswer.groupBy({
            by: ['questionId', 'optionValue'],
            where: {
              question: { surveyId: id, type: 'multiple_choice' },
              optionValue: { not: null },
            },
            _count: { _all: true },
          });
          const usedByQuestion = new Map<string, string[]>();
          for (const row of usedRows) {
            if (row.optionValue === null) continue;
            const list = usedByQuestion.get(row.questionId);
            if (list) list.push(row.optionValue);
            else usedByQuestion.set(row.questionId, [row.optionValue]);
          }

          const planned = planQuestionSync(
            stored.map((q) => ({
              id: q.id,
              type: q.type,
              options: q.options,
              answerCount: q._count.answers,
              usedOptions: usedByQuestion.get(q.id) ?? [],
            })),
            data.questions,
            data.removedQuestionIds ?? [],
          );
          if (!planned.ok) throw new PlanFailed(planned);
          plan = planned;
        }

        await tx.survey.update({
          where: { id },
          data: {
            ...(data.title !== undefined && { title: data.title }),
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
            // The type follows the question count; it is never chosen.
            ...(data.questions && { type: deriveSurveyType(data.questions.length) }),
          },
        });

        if (plan) {
          // Stored questions are updated IN PLACE: their answers stay.
          for (const q of plan.update) {
            await tx.surveyQuestion.updateMany({
              where: { id: q.id, surveyId: id },
              data: {
                text: q.text,
                type: q.type,
                options: q.options ?? Prisma.DbNull,
                required: q.required,
                sortOrder: q.sortOrder,
              },
            });
          }
          if (plan.create.length > 0) {
            await tx.surveyQuestion.createMany({
              data: plan.create.map((q) => ({
                surveyId: id,
                text: q.text,
                type: q.type,
                options: q.options ?? undefined,
                required: q.required,
                sortOrder: q.sortOrder,
              })),
            });
          }
          // Only what the caller explicitly asked to delete.
          if (plan.remove.length > 0) {
            await tx.surveyQuestion.deleteMany({
              where: { id: { in: plan.remove.map((r) => r.id) }, surveyId: id },
            });
          }
        }

        const survey = await tx.survey.findUnique({
          where: { id },
          select: SURVEY_OWNER_SELECT,
        });
        return { survey, removed: plan?.remove ?? [] };
      },
      { maxWait: 5_000, timeout: 20_000 },
    );
  } catch (err) {
    if (err instanceof PlanFailed) {
      const http = planFailureToHttp(err.failure);
      return NextResponse.json(http.body, { status: http.status });
    }
    // Deleted by someone else between the lookup above and the write.
    if ((err as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }
    throw err;
  }

  // An ordinary edit is not audited (the owner's activity log is a 100-row
  // transparency view; every save would push password / team events out of
  // it). Deleting questions that already had answers destroys customer data,
  // so that one is.
  const deletedAnswerCount = result.removed.reduce((sum, r) => sum + r.answerCount, 0);
  if (deletedAnswerCount > 0) {
    await writePanelAuditLog(actor, 'owner.survey.update', existing.restaurant.userId ?? null, {
      surveyId: id,
      restaurantId: existing.restaurantId,
      removedAnsweredQuestions: result.removed.filter((r) => r.answerCount > 0).length,
      deletedAnswerCount,
    });
  }

  return NextResponse.json({ survey: result.survey });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const limited = await surveyWriteLimitResponse(actor.id);
  if (limited) return limited;

  const { id } = await params;
  const existing = await prisma.survey.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      _count: { select: { responses: true } },
      restaurant: { select: { userId: true } },
    },
  });
  if (!existing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const canWrite = await canWriteRestaurant(actor, existing.restaurantId);
  if (!canWrite) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  await prisma.survey.delete({ where: { id } });

  await writePanelAuditLog(actor, 'owner.survey.delete', existing.restaurant.userId ?? null, {
    surveyId: id,
    restaurantId: existing.restaurantId,
    responseCount: existing._count.responses,
  });

  return NextResponse.json({ ok: true });
}
