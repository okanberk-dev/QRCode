// CLAUDE.md §42 Phase 4 — Audit response by-id (detay + manuel re-score).
//
// GET: full response + answers + questions (manuel inceleme için).
// PATCH: manuel score override + reviewer note. autoScore intact; manualScore
//        override aggregate'i tekrar hesaplar (score helper saf, transaction
//        içinde recompute).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { computeAuditScore } from '@/lib/audits/score';
import type { AuditQuestionType, AuditScoringMode } from '@/lib/audits/types';

type Params = { id: string; respId: string };

const PatchBody = z
  .object({
    // Soru başına manuel skor override. null = override kaldır, undefined = dokunma.
    overrides: z
      .record(z.string(), z.number().int().min(0).max(100).nullable())
      .optional(),
    reviewNote: z.string().max(2000).nullable().optional(),
  })
  .strict();

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, respId } = await ctx.params;
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

  const response = await prisma.auditResponse.findFirst({
    where: { id: respId, restaurantId: id },
    select: {
      id: true,
      templateId: true,
      assignmentId: true,
      restaurantId: true,
      respondentName: true,
      respondentEmail: true,
      respondentPhone: true,
      teamMemberId: true,
      hasKvkkConsent: true,
      hasMarketingConsent: true,
      score: true,
      scorePercentage: true,
      passed: true,
      startedAt: true,
      completedAt: true,
      reviewedById: true,
      reviewedAt: true,
      reviewNote: true,
      createdAt: true,
      updatedAt: true,
      template: {
        select: {
          id: true,
          title: true,
          scoringMode: true,
          passingScore: true,
          locale: true,
          questions: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              type: true,
              prompt: true,
              helpText: true,
              options: true,
              correctAnswer: true, // owner görür (yanıt incelemesi için)
              weight: true,
              isRequired: true,
              sortOrder: true,
            },
          },
        },
      },
      answers: {
        select: {
          id: true,
          questionId: true,
          value: true,
          autoScore: true,
          manualScore: true,
        },
      },
    },
  });

  if (!response) return ApiErrors.notFound('Yanıt bulunamadı');

  return NextResponse.json({ data: response });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, respId } = await ctx.params;
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof PatchBody>>(PatchBody, body);
  if (!parsed.ok) return parsed.response;

  const response = await prisma.auditResponse.findFirst({
    where: { id: respId, restaurantId: id },
    select: {
      id: true,
      templateId: true,
      template: {
        select: {
          scoringMode: true,
          passingScore: true,
          questions: {
            select: {
              id: true,
              type: true,
              correctAnswer: true,
              weight: true,
              isRequired: true,
            },
          },
        },
      },
      answers: {
        select: { id: true, questionId: true, value: true, autoScore: true, manualScore: true },
      },
    },
  });

  if (!response) return ApiErrors.notFound('Yanıt bulunamadı');

  const overrides = parsed.data.overrides ?? {};
  // Cross-template tampering guard
  const validQids = new Set(response.template.questions.map((q) => q.id));
  for (const qid of Object.keys(overrides)) {
    if (!validQids.has(qid)) {
      return ApiErrors.badRequest('Bilinmeyen soru id', 'INVALID_QUESTION_ID');
    }
  }

  // Mevcut answer'lara override'ları map'le
  const answerByQid = new Map(response.answers.map((a) => [a.questionId, a]));

  // Recompute score: caller manualScore'ları yeni override + mevcut intact
  const scoringQuestions = response.template.questions.map((q) => ({
    id: q.id,
    type: q.type as AuditQuestionType,
    correctAnswer: q.correctAnswer,
    weight: q.weight,
    isRequired: q.isRequired,
  }));
  const scoringAnswers = response.answers.map((a) => {
    const overridden = Object.prototype.hasOwnProperty.call(overrides, a.questionId)
      ? overrides[a.questionId]
      : a.manualScore;
    return {
      questionId: a.questionId,
      value: a.value as unknown,
      manualScore: overridden,
    };
  });

  const scoring = computeAuditScore(
    scoringQuestions,
    scoringAnswers,
    response.template.scoringMode as AuditScoringMode,
    response.template.passingScore,
  );

  const result = await prisma.$transaction(async (tx) => {
    // Override yapılan answer'ları manualScore ile güncelle
    for (const [qid, value] of Object.entries(overrides)) {
      const answer = answerByQid.get(qid);
      if (!answer) continue;
      await tx.auditAnswer.update({
        where: { id: answer.id },
        data: { manualScore: value },
      });
    }

    const updated = await tx.auditResponse.update({
      where: { id: respId },
      data: {
        score: scoring.score,
        scorePercentage: scoring.scorePercentage,
        passed: scoring.passed,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote === undefined ? undefined : parsed.data.reviewNote,
      },
      select: {
        id: true,
        score: true,
        scorePercentage: true,
        passed: true,
        reviewedAt: true,
        reviewNote: true,
      },
    });

    return updated;
  });

  return NextResponse.json({ data: result });
}
