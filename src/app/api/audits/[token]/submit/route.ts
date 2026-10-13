// CLAUDE.md §42 Phase 3 — Public audit response submit endpoint.
//
// Body: { answers: [{ questionId, value }], respondentName?, respondentEmail?,
//         respondentPhone?, hasKvkkConsent: true, hasMarketingConsent?: boolean }
//
// Paylaşım linkleri artık varsayılan olarak SÜREKLİ (spec A2): bir link
// kapatılana kadar birçok kişi doldurabilir. Bu yüzden link bir kez sızarsa tek
// koruma kalmasın diye bu rota sertleştirildi (spec §6.8):
//
//   1. Token validate (404 fingerprinting önleme, CLAUDE.md §13.5)
//   2. IP-bazlı rate-limit (20/dk — otel tabletleri tek NAT'tan çıkar)
//   3. Gövde boyut sınırı (3 MB → 413 PAYLOAD_TOO_LARGE)
//   4. KVKK consent zorunlu (audit form içeriği hassas, explicit onay)
//   5. Zod body validation (.strict)
//   6. Link bazlı rate-limit (30/dk + 300/gün) — 404 kontrollerinden SONRA,
//      geçersiz token anahtar üretmesin
//   7. Cevap doğrulama (fotoğraf/metin/çoklu seçim sınırları, tür uyuşmazlığı)
//   8. Replay (çift dokunuş / ağ tekrarı) → 200 { duplicate: true }
//   9. Tek seferlik link: atomik status flip (updateMany) — check-then-act yarışı yok
//  10. computeAuditScore — YALNIZ puanlanabilir sorular (spec §5.2)
//  11. Transaction: AuditResponse + AuditAnswers (+ assignment status)
//  12. Sahibe mail: yalnız SORUNLU yanıt veya TEST denetimi, saatte ≤1 / denetim
//
// Katılımcıya dönen skor: test (single/multi içeren) denetimlerde ve
// puanlanamayan formlarda `null` — skor üzerinden doğru cevaplar yoklanamaz.

import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { ApiErrors, getErrorCode } from '@/lib/api-errors';
import { computeAuditScore } from '@/lib/audits/score';
import { deriveAuditKind } from '@/lib/audits/kind';
import { countIssues } from '@/lib/audits/misses';
import { canAcceptSubmission, isReusable, nextAssignmentStatus } from '@/lib/audits/assignment-state';
import {
  OWNER_MAIL_RESTAURANT_DAILY_RULE,
  OWNER_MAIL_TEMPLATE_RULE,
  REPLAY_WINDOW_MS,
  REQUEST_MAX_BYTES,
  SUBMIT_ASSIGNMENT_DAILY_RULE,
  SUBMIT_ASSIGNMENT_RULE,
  SUBMIT_IP_RULE,
  findMissingRequired,
  isReplaySubmission,
  shouldNotifyOwner,
  validateAnswerPayload,
  visibleOutcome,
} from '@/lib/audits/submit-guards';
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

/** Atomik "tek seferlik link zaten kullanıldı" sinyali (transaction'ı geri alır). */
class AlreadyCompletedError extends Error {}

function tooManyRequests(retryAfter: number, scope?: 'daily') {
  return NextResponse.json(
    scope ? { error: 'rate_limited', scope, retryAfter } : { error: 'rate_limited', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

/**
 * Yanıt gönderildikten SONRA çalışacak iş (sahibe mail). Vercel'de dönen
 * response'tan sonra askıda kalan promise'lar kesilebilir; `after()` fonksiyonu
 * canlı tutar. İstek bağlamı dışında çağrılırsa (test) doğrudan çalıştırılır.
 */
function runAfterResponse(task: () => Promise<void>) {
  const safe = async () => {
    try {
      await task();
    } catch (err) {
      // Best-effort — submit zaten başarılı döndü. PII yok: yalnız hata mesajı.
      console.error('[audit] notify mail failed', (err as Error).message);
    }
  };
  try {
    after(safe);
  } catch {
    void safe();
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimit(`audit-submit:ip:${ip}`, SUBMIT_IP_RULE.max, SUBMIT_IP_RULE.windowMs);
  if (!ipLimit.allowed) {
    return tooManyRequests(60);
  }

  // Gövde boyutu: önce başlık (ucuz), sonra gerçek okunan metin (başlık
  // yoksa / yalansa). Fotoğraflar base64 data URL olarak gelir (§3).
  const declaredLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > REQUEST_MAX_BYTES) {
    return NextResponse.json(
      { error: 'Gönderilen veri çok büyük', code: 'PAYLOAD_TOO_LARGE' },
      { status: 413 },
    );
  }
  const rawText = await req.text().catch(() => '');
  if (Buffer.byteLength(rawText, 'utf8') > REQUEST_MAX_BYTES) {
    return NextResponse.json(
      { error: 'Gönderilen veri çok büyük', code: 'PAYLOAD_TOO_LARGE' },
      { status: 413 },
    );
  }
  let body: unknown = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }
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

  // Link bazlı sınırlar — yalnız geçerli bir link için anahtar üretilir.
  const asgLimit = await rateLimit(
    `audit-submit:asg:${assignment.id}`,
    SUBMIT_ASSIGNMENT_RULE.max,
    SUBMIT_ASSIGNMENT_RULE.windowMs,
  );
  if (!asgLimit.allowed) {
    return tooManyRequests(asgLimit.retryAfterSeconds || 60);
  }
  const asgDayLimit = await rateLimit(
    `audit-submit:asg-day:${assignment.id}`,
    SUBMIT_ASSIGNMENT_DAILY_RULE.max,
    SUBMIT_ASSIGNMENT_DAILY_RULE.windowMs,
  );
  if (!asgDayLimit.allowed) {
    return tooManyRequests(asgDayLimit.retryAfterSeconds || 3600, 'daily');
  }

  const questions = assignment.template.questions.map((q) => ({
    id: q.id,
    type: q.type as AuditQuestionType,
    correctAnswer: q.correctAnswer,
    weight: q.weight,
    isRequired: q.isRequired,
  }));
  const kind = deriveAuditKind(questions.map((q) => q.type));
  const reusable = isReusable(assignment.recurrence);

  // Cevap yükü: bilinmeyen soru id'si, tekrar eden soru, tür uyuşmazlığı,
  // data: URL sızdırma, fotoğraf boyutu (tek + toplam), dev diziler.
  const payloadCheck = validateAnswerPayload(questions, data.answers);
  if (!payloadCheck.ok) {
    return ApiErrors.badRequest(payloadCheck.message, payloadCheck.code);
  }

  // Zorunlu sorular yanıtlandı mı? (Denetim canlı düzenlenebildiği için
  // istemci eski soru setiyle gelmiş olabilir — istemci GET'i yenileyip devam eder.)
  const missingRequired = findMissingRequired(questions, data.answers);
  if (missingRequired.length > 0) {
    return ApiErrors.badRequest(
      `Zorunlu sorular yanıtsız (${missingRequired.length} soru)`,
      'MISSING_REQUIRED',
      { questionIds: missingRequired.map((q) => q.id) },
    );
  }

  // Katılımcı kimliği: kullanıcının yazdığı; yoksa YALNIZ tek seferlik linkte
  // sahibin link adı. Sürekli linkte sahibe özel link adı yanıta miras kalmaz.
  const respondentName = data.respondentName?.trim() || (reusable ? null : assignment.assigneeName) || null;
  const respondentEmail = data.respondentEmail?.trim() || (reusable ? null : assignment.assigneeEmail) || null;
  const respondentPhone = data.respondentPhone?.trim() || null;

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;
  const fileQuestionIds = new Set(questions.filter((q) => q.type === 'file').map((q) => q.id));
  const nonFileQuestionIds = questions.filter((q) => q.type !== 'file').map((q) => q.id);

  // Replay: aynı link + IP + User-Agent'tan ≤30 sn önce kaydedilmiş özdeş
  // gönderim = çift dokunuş / ağ tekrarı → yeni satır açma, mail atma.
  // `file` cevapları (base64) ASLA okunmaz; karşılaştırma her iki taraftan da
  // dışarıda bırakır. Tek seferlik linkte de önce bakılır: çift dokunuş
  // "zaten tamamlandı" yerine ilk yanıtın başarısını döner.
  const recent = await prisma.auditResponse.findMany({
    where: {
      assignmentId: assignment.id,
      ipAddress: ip,
      userAgent,
      createdAt: { gte: new Date(Date.now() - REPLAY_WINDOW_MS) },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      createdAt: true,
      respondentName: true,
      respondentEmail: true,
      respondentPhone: true,
      score: true,
      scorePercentage: true,
      passed: true,
      answers: {
        where: { questionId: { in: nonFileQuestionIds } },
        select: { questionId: true, value: true },
      },
    },
  });
  const incomingForReplay = {
    respondentName,
    respondentEmail,
    respondentPhone,
    answers: data.answers.map((a) => ({ questionId: a.questionId, value: a.value })),
  };
  const replayOf = recent.find((r) =>
    isReplaySubmission(r, incomingForReplay, { ignoreQuestionIds: fileQuestionIds }),
  );
  if (replayOf) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      ...visibleOutcome({
        score: replayOf.score,
        scorePercentage: replayOf.scorePercentage,
        passed: replayOf.passed,
        kind,
      }),
      responseId: replayOf.id,
    });
  }

  // Kullanılmış tek-seferlik link (veya iptal) → 409. (Atomik kontrol aşağıda,
  // transaction içinde tekrar yapılır; burası hızlı yol.)
  if (!canAcceptSubmission({ status: assignment.status, recurrence: assignment.recurrence, tokenRevoked: false })) {
    return NextResponse.json(
      { error: 'already_completed', message: 'Bu denetim zaten tamamlandı.' },
      { status: 409 },
    );
  }

  // Skor hesapla — yalnız puanlanabilir sorular (spec §5.2).
  const scoring = computeAuditScore(
    questions,
    data.answers.map((a) => ({ questionId: a.questionId, value: a.value })),
    assignment.template.scoringMode as AuditScoringMode,
    assignment.template.passingScore,
  );
  const scoringByQid = new Map(scoring.scoredAnswers.map((s) => [s.questionId, s]));

  const nextStatus = nextAssignmentStatus(assignment.recurrence);

  // Tek transaction: (tek seferlik ise atomik flip) + response + answers.
  let response: { id: string };
  try {
    response = await prisma.$transaction(
      async (tx) => {
        if (nextStatus === 'completed') {
          // Check-then-act yarışını kapat: yalnız hâlâ 'completed' olmayan satırı çevir.
          const flipped = await tx.auditAssignment.updateMany({
            where: { id: assignment.id, status: { not: 'completed' } },
            data: { status: 'completed' },
          });
          if (flipped.count === 0) throw new AlreadyCompletedError();
        } else if (assignment.status !== 'pending') {
          // Sürekli link bir sonraki yanıta hazır kalır.
          await tx.auditAssignment.update({
            where: { id: assignment.id },
            data: { status: 'pending' },
          });
        }

        const created = await tx.auditResponse.create({
          data: {
            templateId: assignment.templateId,
            assignmentId: assignment.id,
            restaurantId: assignment.restaurantId,
            respondentName,
            respondentEmail,
            respondentPhone,
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

        const answerRows = data.answers.map((a) => ({
          responseId: created.id,
          questionId: a.questionId,
          value: (a.value ?? undefined) as unknown as object,
          // Puanlanamayan soru için `null` (eskiden yanıltıcı 0 yazılıyordu).
          autoScore: scoringByQid.get(a.questionId)?.autoScore ?? null,
          manualScore: null,
        }));
        if (answerRows.length > 0) {
          await tx.auditAnswer.createMany({ data: answerRows });
        }

        return created;
      },
      { timeout: 10_000 },
    );
  } catch (err) {
    if (err instanceof AlreadyCompletedError) {
      return NextResponse.json(
        { error: 'already_completed', message: 'Bu denetim zaten tamamlandı.' },
        { status: 409 },
      );
    }
    // Sahip, biz yazarken bir soruyu sildi (canlı düzenleme): cevap satırı artık
    // var olmayan bir soruya işaret eder → FK ihlali. 500 yerine, istemcinin
    // zaten bildiği "soru seti değişti" yoluna düş (formu tazele, devam et).
    if (getErrorCode(err) === 'P2003') {
      return ApiErrors.badRequest('Denetim sen doldururken değişti', 'INVALID_QUESTION_ID');
    }
    throw err;
  }

  // Sahibe bildirim (best-effort, spec §6.8). Her yanıtta DEĞİL: yalnız yanıt
  // SORUNLU ise (geçme puanı altında / dikkat edilecek madde) ya da denetim bir
  // TEST ise; üstüne denetim başına saatte ≤1 ve işletme başına günde ≤20.
  // Temiz kontrol listesi yanıtı mail üretmez — sahibi Sonuçlar'da görür.
  const attentionCount =
    kind === 'checklist'
      ? countIssues(
          questions,
          data.answers.map((a) => ({ questionId: a.questionId, value: a.value })),
        )
      : 0;
  const ownerEmail = assignment.template.restaurant.notificationEmail;
  if (shouldNotifyOwner({ passed: scoring.passed, attentionCount, kind })) {
    if (!ownerEmail) {
      // Observability: owner bildirimi alamadığını fark etmeyebilir (PII yok).
      console.warn('[audit-completed] notify skipped — no notificationEmail', {
        restaurantId: assignment.restaurantId,
        templateId: assignment.template.id,
      });
    } else {
      const locale = assignment.template.locale === 'en' ? 'en' : 'tr';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.buaze.com';
      const respondentDisplay =
        respondentName ||
        respondentEmail ||
        // Sürekli linkte link adı yanıta yazılmaz ama sahibe giden mailde hangi
        // linkten geldiğini göstermek için kullanılır (yalnız sahibe gider).
        assignment.assigneeName ||
        assignment.assigneeEmail ||
        (assignment.assigneeType === 'team_member' ? (locale === 'en' ? 'Team member' : 'Ekip üyesi') : null);
      const mailPayload = {
        to: ownerEmail,
        restaurantName: assignment.template.restaurant.name,
        auditTitle: assignment.template.title,
        respondentName: respondentDisplay,
        score: scoring.score,
        passed: scoring.passed,
        passingScore: assignment.template.passingScore,
        attentionCount,
        locale,
        // Saat içindeki tüm yanıtlar tek yerde: sonuçlar sayfası.
        panelUrl: `${appUrl}/${locale}/dashboard/audits/${assignment.template.id}/results`,
      } as const;
      const templateId = assignment.template.id;
      const restaurantId = assignment.restaurantId;
      runAfterResponse(async () => {
        const perAudit = await rateLimit(
          `audit-mail:tpl:${templateId}`,
          OWNER_MAIL_TEMPLATE_RULE.max,
          OWNER_MAIL_TEMPLATE_RULE.windowMs,
        );
        if (!perAudit.allowed) return;
        const perRestaurant = await rateLimit(
          `audit-mail:day:${restaurantId}`,
          OWNER_MAIL_RESTAURANT_DAILY_RULE.max,
          OWNER_MAIL_RESTAURANT_DAILY_RULE.windowMs,
        );
        if (!perRestaurant.allowed) return;
        await sendAuditCompletedEmail(mailPayload);
      });
    }
  }

  return NextResponse.json({
    ok: true,
    ...visibleOutcome({
      score: scoring.score,
      scorePercentage: scoring.scorePercentage,
      passed: scoring.passed,
      kind,
    }),
    responseId: response.id,
  });
}
