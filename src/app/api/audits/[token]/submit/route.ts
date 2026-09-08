// CLAUDE.md §42 Phase 3 — Public audit response submit endpoint.
//
// Body: { answers: [{ questionId, value }], respondentName?, respondentEmail?,
//         respondentPhone?, hasKvkkConsent: true, hasMarketingConsent?: boolean }
//
// Akış:
//   1. Token validate (404 fingerprinting önleme, CLAUDE.md §13.5)
//   2. IP-bazlı rate-limit (5/dk — submit normal akışta tek)
//   3. KVKK consent zorunlu (CLAUDE.md §19.1, action implies consent reddedildi —
//      audit form içeriği daha hassas, explicit onay alınır)
//   4. Zod body validation (.strict)
//   5. Aynı assignment'a duplicate submit engelle (idempotent guard)
//   6. computeAuditScore (src/lib/audits/score.ts) ile autoScore
//   7. Transaction: AuditResponse + AuditAnswers + AuditAssignment status
//   8. Owner'a notify mail (best-effort, non-fatal)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { ApiErrors } from '@/lib/api-errors';
import { computeAuditScore } from '@/lib/audits/score';
import { sendAuditCompletedEmail } from '@/lib/email';
import type { AuditQuestionType, AuditScoringMode } from '@/lib/audits/types';

const Body = z
  .object({
    answers: z
      .array(
        z
          .object({
            questionId: z.string().min(1),
            value: z.unknown(),
          })
          .strict(),
      )
      .max(200),
    respondentName: z.string().max(200).nullable().optional(),
    respondentEmail: z.string().email().nullable().optional().or(z.literal('')),
    respondentPhone: z.string().max(40).nullable().optional(),
    hasKvkkConsent: z.boolean(),
    hasMarketingConsent: z.boolean().optional().default(false),
  })
  .strict();

type ParsedBody = z.infer<typeof Body>;

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`audit-submit:ip:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: 60 },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<ParsedBody>(Body, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (!data.hasKvkkConsent) {
    return ApiErrors.badRequest('KVKK onayı zorunlu', 'NO_KVKK_CONSENT');
  }

  const assignment = await prisma.auditAssignment.findUnique({
    where: { token },
    select: {
      id: true,
      templateId: true,
      restaurantId: true,
      assigneeType: true,
      assigneeName: true,
      assigneeEmail: true,
      assigneeTeamMemberId: true,
      status: true,
      tokenRevoked: true,
      recurrence: true,
      template: {
        select: {
          id: true,
          title: true,
          scoringMode: true,
          passingScore: true,
          locale: true,
          isPublished: true,
          isActive: true,
          restaurant: {
            select: { id: true, name: true, isActive: true, notificationEmail: true },
          },
          questions: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              type: true,
              correctAnswer: true,
              weight: true,
              isRequired: true,
              options: true,
            },
          },
        },
      },
    },
  });

  if (
    !assignment ||
    assignment.tokenRevoked ||
    assignment.status === 'cancelled' ||
    !assignment.template?.isActive ||
    !assignment.template.isPublished ||
    !assignment.template.restaurant?.isActive
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Idempotency: aynı atama 'once' recurrence ile zaten tamamlanmışsa reddet.
  if (assignment.recurrence === 'once' && assignment.status === 'completed') {
    return NextResponse.json(
      { error: 'already_completed', message: 'Bu denetim zaten tamamlandı.' },
      { status: 409 },
    );
  }

  const questions = assignment.template.questions.map((q) => ({
    id: q.id,
    type: q.type as AuditQuestionType,
    correctAnswer: q.correctAnswer,
    weight: q.weight,
    isRequired: q.isRequired,
  }));

  // Zorunlu sorular yanıtlandı mı? Yanıtlanmamış zorunlu varsa reddet.
  const answersByQid = new Map(data.answers.map((a) => [a.questionId, a]));
  const missingRequired = questions
    .filter((q) => q.isRequired)
    .filter((q) => {
      const a = answersByQid.get(q.id);
      if (!a) return true;
      if (a.value === null || a.value === undefined || a.value === '') return true;
      if (Array.isArray(a.value) && a.value.length === 0) return true;
      return false;
    });
  if (missingRequired.length > 0) {
    return ApiErrors.badRequest(
      `Zorunlu sorular yanıtsız (${missingRequired.length} soru)`,
      'MISSING_REQUIRED',
    );
  }

  // Soru id'leri bu şablona ait mi? (cross-template tampering guard)
  const validQids = new Set(questions.map((q) => q.id));
  const stray = data.answers.find((a) => !validQids.has(a.questionId));
  if (stray) {
    return ApiErrors.badRequest('Geçersiz soru id', 'INVALID_QUESTION_ID');
  }

  // Photo answers (type 'file') — value must be a small inline image data URL
  // (client compresses; base64-in-DB per §3). Cap server-side so the JSON
  // column / request body can't be bloated. Non-file answers can't carry a
  // data URL (prevents stuffing a huge blob into a text/scale answer).
  const typeByQid = new Map(questions.map((q) => [q.id, q.type]));
  const PHOTO_MAX_BYTES = 800 * 1024; // generous ceiling above client cap
  for (const a of data.answers) {
    const qType = typeByQid.get(a.questionId);
    if (qType === 'file') {
      if (a.value === null || a.value === undefined || a.value === '') continue; // optional
      if (typeof a.value !== 'string' || !a.value.startsWith('data:image/')) {
        return ApiErrors.badRequest('Geçersiz fotoğraf', 'INVALID_PHOTO');
      }
      if (a.value.length > PHOTO_MAX_BYTES) {
        return ApiErrors.badRequest('Fotoğraf çok büyük', 'PHOTO_TOO_LARGE');
      }
    } else if (typeof a.value === 'string' && a.value.startsWith('data:')) {
      return ApiErrors.badRequest('Geçersiz cevap', 'INVALID_ANSWER');
    }
  }

  // Skor hesapla
  const scoring = computeAuditScore(
    questions,
    data.answers.map((a) => ({ questionId: a.questionId, value: a.value })),
    assignment.template.scoringMode as AuditScoringMode,
    assignment.template.passingScore,
  );

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

  // Tek transaction: response + answers + assignment status update
  const response = await prisma.$transaction(async (tx) => {
    const created = await tx.auditResponse.create({
      data: {
        templateId: assignment.templateId,
        assignmentId: assignment.id,
        restaurantId: assignment.restaurantId,
        respondentName: data.respondentName ?? assignment.assigneeName ?? null,
        respondentEmail:
          (data.respondentEmail || null) ?? assignment.assigneeEmail ?? null,
        respondentPhone: data.respondentPhone ?? null,
        teamMemberId: assignment.assigneeTeamMemberId,
        hasKvkkConsent: true,
        hasMarketingConsent: Boolean(data.hasMarketingConsent),
        score: scoring.score,
        scorePercentage: scoring.scorePercentage,
        passed: scoring.passed,
        startedAt: new Date(),
        completedAt: new Date(),
        ipAddress: ip,
        userAgent,
      },
      select: { id: true },
    });

    // Answers
    const answerRows = data.answers.map((a) => {
      const scored = scoring.scoredAnswers.find((s) => s.questionId === a.questionId);
      return {
        responseId: created.id,
        questionId: a.questionId,
        value: (a.value ?? undefined) as unknown as object,
        autoScore: scored ? scored.autoScore : null,
        manualScore: null,
      };
    });
    if (answerRows.length > 0) {
      await tx.auditAnswer.createMany({ data: answerRows });
    }

    // 'once' recurrence → status=completed; recurring → status=pending (next cycle)
    await tx.auditAssignment.update({
      where: { id: assignment.id },
      data: {
        status: assignment.recurrence === 'once' ? 'completed' : 'pending',
      },
    });

    return created;
  });

  // Owner notification (best-effort). notificationEmail boşsa skip + uyar.
  // Observability: ops monitoring için sessiz skip yerine log düş — owner
  // bildirim alamadığını fark etmeyebilir (Phase 1-3 audit FIX).
  const ownerEmail = assignment.template.restaurant.notificationEmail;
  if (!ownerEmail) {
    console.warn('[audit-completed] notify skipped — no notificationEmail', {
      restaurantId: assignment.restaurantId,
      templateId: assignment.template.id,
    });
  }
  if (ownerEmail) {
    const respondentDisplay =
      data.respondentName ||
      data.respondentEmail ||
      assignment.assigneeName ||
      assignment.assigneeEmail ||
      (assignment.assigneeType === 'team_member' ? 'Ekip üyesi' : 'Anonim');
    void sendAuditCompletedEmail({
      to: ownerEmail,
      restaurantName: assignment.template.restaurant.name,
      auditTitle: assignment.template.title,
      respondentName: respondentDisplay,
      score: scoring.score,
      passed: scoring.passed,
      passingScore: assignment.template.passingScore,
      locale: assignment.template.locale === 'en' ? 'en' : 'tr',
      // Owner panel detay URL — fork edilmiş template → restaurantId üzerinden
      panelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.buaze.com'}/${assignment.template.locale === 'en' ? 'en' : 'tr'}/dashboard/audits/${assignment.template.id}`,
    }).catch((err: unknown) => {
      // Best-effort — submit yine başarılı dönsün.
      console.error('[audit] notify mail failed', (err as Error).message);
    });
  }

  return NextResponse.json({
    ok: true,
    score: scoring.score,
    scorePercentage: scoring.scorePercentage / 100,
    passed: scoring.passed,
    responseId: response.id,
  });
}
