// CLAUDE.md §42 Phase 4 — Audit response by-id (detay + manuel re-score).
//
// GET: full response + answers + questions (manuel inceleme için).
// PATCH: inceleme notu ve/veya manuel puan düzeltmesi.
//
// Spec §6.6 (A10) — yeniden hesaplama KURALLARI:
//   • YALNIZ gövdede `overrides` varsa (ve boş değilse) skor yeniden hesaplanır
//     (`shouldRecompute`). Salt inceleme notu kaydı `score / scorePercentage /
//     passed` alanlarına DOKUNMAZ — şablon sonradan düzenlendiyse eski bir
//     yanıtın puanı bir not kaydıyla sessizce değişmesin.
//   • Yeniden hesap, yanıtın GERÇEKTEN cevap satırı olan soruları üzerinden
//     yapılır (`questionsForRecompute`): yanıttan sonra denetime eklenen bir soru
//     eski yanıt için 0 sayılmaz, `passed`'i çevirmez.
//   • Güncel `passingScore` / `scoringMode` ile hesaplanır (override kaydeden
//     sahip yeni kurala göre sonuç ister).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { computeAuditScore, questionsForRecompute, shouldRecompute } from '@/lib/audits/score';
import { getAuditResponseDetail } from '@/lib/audits/queries';
import type { AuditQuestionType, AuditScoringMode } from '@/lib/audits/types';
import { withServerTiming } from '@/lib/server-timing';

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

async function handleGET(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, respId } = await ctx.params;
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

  // Sayfa (server hydration) ile AYNI sorgu — owner doğru cevabı görür (inceleme için).
  const response = await getAuditResponseDetail({ responseId: respId, restaurantIds: [id] });
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

  // Skoru YALNIZ override varsa yeniden hesapla (salt not kaydı puanı değiştirmez).
  const recompute = shouldRecompute(parsed.data);
  let scorePatch:
    | { score: number | null; scorePercentage: number | null; passed: boolean | null }
    | undefined;

  if (recompute) {
    // Yanıt gönderildiği anda var olan sorular (cevap satırı olanlar) üzerinden hesapla.
    const scoringQuestions = questionsForRecompute(
      response.template.questions,
      response.answers.map((a) => a.questionId),
    ).map((q) => ({
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
    scorePatch = {
      score: scoring.score,
      scorePercentage: scoring.scorePercentage,
      passed: scoring.passed,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    // Override yapılan answer'ları manualScore ile güncelle
    if (recompute) {
      for (const [qid, value] of Object.entries(overrides)) {
        const answer = answerByQid.get(qid);
        if (!answer) continue;
        await tx.auditAnswer.update({
          where: { id: answer.id },
          data: { manualScore: value },
          select: { id: true },
        });
      }
    }

    const updated = await tx.auditResponse.update({
      where: { id: respId },
      data: {
        ...(scorePatch ?? {}),
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

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
