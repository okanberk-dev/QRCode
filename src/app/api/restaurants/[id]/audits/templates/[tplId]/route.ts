// CLAUDE.md §42 — Owner audit template by-id (Phase 2).
//
// GET: detay (sorular dahil) — builder edit + detay sayfa.
// PATCH: meta + soru listesi. Spec §6.3 (A3): YAYINDAKİ denetim linkleri
//        kapatılmadan, soru id'leri değiştirilmeden düzenlenir.
//          • eski "yayındaki şablon düzenlenemez" (PUBLISHED_LOCKED) ve "yanıt
//            alınca sorular kilitli" (RESPONSES_LOCK_QUESTIONS) kuralları BU
//            rotadan kalktı (admin rotası kendi kuralını korur)
//          • "hepsini sil + yeniden oluştur" yerine kalıcı id'li DIFF
//            (`planQuestionDiff`): id'li soru güncellenir, id'siz/yabancı id'li
//            oluşturulur, eksik olan (yanıtsızsa) silinir, yanıt almış sorunun
//            türü/seçenekleri/doğru cevabı/ağırlığı DEĞİŞTİRİLEMEZ
//          • `AuditAnswer` satırlarına ASLA dokunulmaz
// DELETE: hard delete yalnız sıfır yanıt olunca; aksi halde isActive=false
//         soft-disable (history korunur) — UI bunu "Arşivlendi" gösterir.

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors, getErrorCode, getErrorMessage } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { AuditTemplatePatchSchema, type AuditTemplatePatchInput } from '@/lib/audits/wizard-state';
import {
  describeQuestionDiffError,
  planQuestionDiff,
  type ExistingQuestionRow,
  type QuestionDiffError,
  type QuestionDiffPlan,
  type QuestionWriteData,
} from '@/lib/audits/question-diff';
import { deriveAuditKind } from '@/lib/audits/kind';

type Params = { id: string; tplId: string };

/** Transaction'ı geri alıp istemciye bu yanıtı döndürmek için fırlatılır. */
class PatchAbort extends Error {
  constructor(readonly response: NextResponse) {
    super('patch-abort');
  }
}

async function gate(req: NextRequest, restaurantId: string, write: boolean) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { ok: false as const, res: ApiErrors.unauthorized() };
  const allowed = write
    ? await canWriteRestaurant(actor, restaurantId)
    : await canAccessRestaurant(actor, restaurantId);
  if (!allowed) return { ok: false as const, res: ApiErrors.forbidden() };
  return { ok: true as const, actor };
}

async function findTemplate(tplId: string, restaurantId: string) {
  return prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId },
    select: {
      id: true,
      restaurantId: true,
      isPublished: true,
      forkedFromId: true,
    },
  });
}

/** Json kolonuna `null` yazmak için `Prisma.DbNull` gerekir (düz null reddedilir). */
function jsonOrDbNull(v: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue);
}

/** Plan hatasını API yanıtına çevirir (400 + madde numarası). */
function diffErrorResponse(err: QuestionDiffError): NextResponse {
  const d = describeQuestionDiffError(err);
  return ApiErrors.badRequest(d.message, d.code, {
    itemNumber: d.itemNumber,
    ...(err.code === 'QUESTION_LOCKED' ? { fields: err.fields } : {}),
  });
}

function toCreateRow(templateId: string, d: QuestionWriteData) {
  return {
    templateId,
    type: d.type,
    prompt: d.prompt,
    helpText: d.helpText,
    options: jsonOrDbNull(d.options),
    correctAnswer: jsonOrDbNull(d.correctAnswer),
    weight: d.weight,
    isRequired: d.isRequired,
    sortOrder: d.sortOrder,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;
  const g = await gate(req, id, false);
  if (!g.ok) return g.res;

  const [tpl, answered] = await prisma.$transaction([
    prisma.auditTemplate.findFirst({
      where: { id: tplId, restaurantId: id },
      select: {
        id: true,
        restaurantId: true,
        categoryId: true,
        title: true,
        description: true,
        sector: true,
        scoringMode: true,
        passingScore: true,
        locale: true,
        isPublished: true,
        publishedAt: true,
        isActive: true,
        createdBy: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        forkedFromId: true,
        // Reset CTA UI'da görünür mü kararı: forkedFromId varsa + kaynak
        // hâlâ yayında ise. `forkedFrom.isPublished` zaten public; ekstra
        // restaurantId leak'i yok (global template = restaurantId null).
        forkedFrom: {
          select: { id: true, title: true, isPublished: true, isActive: true },
        },
        category: { select: { id: true, slug: true, labelTr: true, labelEn: true } },
        questions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            type: true,
            prompt: true,
            helpText: true,
            options: true,
            correctAnswer: true,
            weight: true,
            isRequired: true,
            sortOrder: true,
          },
        },
        _count: { select: { assignments: true, responses: true } },
      },
    }),
    // Yanıt almış (kilitli) soru id'leri — builder bunlarla alanları kapatır.
    prisma.auditAnswer.groupBy({
      by: ['questionId'],
      where: { question: { templateId: tplId, template: { restaurantId: id } } },
    }),
  ]);

  if (!tpl) return ApiErrors.notFound('Şablon bulunamadı');
  return NextResponse.json({
    data: {
      ...tpl,
      // Türetilmiş (saklanmaz): 'checklist' | 'quiz'.
      kind: deriveAuditKind(tpl.questions.map((q) => q.type)),
      answeredQuestionIds: answered.map((a) => a.questionId),
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;
  const g = await gate(req, id, true);
  if (!g.ok) return g.res;

  const rl = await rateLimit(`audits:tpl-patch:${g.actor.id}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfterSeconds || 60 },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds || 60) } },
    );
  }

  const existing = await findTemplate(tplId, id);
  if (!existing) return ApiErrors.notFound('Şablon bulunamadı');

  const body = await req.json().catch(() => null);
  const parsed = validateBody<AuditTemplatePatchInput>(AuditTemplatePatchSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (data.categoryId !== undefined && data.categoryId !== null) {
    const cat = await prisma.auditCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!cat) return ApiErrors.badRequest('Geçersiz kategori', 'INVALID_CATEGORY');
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Aynı şablonu aynı anda düzenleyen iki isteği sıraya koy (stale kontrolü
        // ve diff atomik olsun). `NO KEY UPDATE` kasıtlı: public submit'in
        // `audit_responses` → şablon FK'sı (KEY SHARE) ile ÇAKIŞMAZ, yani bir
        // düzenleme sırasında link doldurulabilir.
        await tx.$queryRaw`SELECT id FROM audit_templates WHERE id = ${tplId} FOR NO KEY UPDATE`;

        const row = await tx.auditTemplate.findFirst({
          where: { id: tplId, restaurantId: id },
          select: { id: true, isActive: true, isPublished: true, updatedAt: true },
        });
        if (!row) throw new PatchAbort(ApiErrors.notFound('Şablon bulunamadı'));

        // Arşivlenmiş (yanıt aldığı için silinmeyip kapatılmış) denetim düzenlenmez.
        if (!row.isActive) {
          throw new PatchAbort(
            ApiErrors.conflict('Bu denetim arşivlendi; düzenlenemez.', 'ARCHIVED'),
          );
        }

        // Optimistik eşzamanlılık: bayat bir editör, başkasının az önce eklediği
        // soruları sessizce silmesin. Yalnız `questions` gönderiliyorsa.
        if (data.questions && data.expectedUpdatedAt) {
          if (new Date(data.expectedUpdatedAt).getTime() !== row.updatedAt.getTime()) {
            throw new PatchAbort(
              ApiErrors.conflict(
                'Bu denetim sen düzenlerken değişti. Sayfayı yenileyip tekrar dene.',
                'STALE_EDIT',
              ),
            );
          }
        }

        // ── Soru diff'i ────────────────────────────────────────────────
        let plan: QuestionDiffPlan | null = null;
        let questionCount: number;
        if (data.questions) {
          const existingQs: ExistingQuestionRow[] = await tx.auditQuestion.findMany({
            where: { templateId: tplId },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            select: {
              id: true,
              type: true,
              prompt: true,
              helpText: true,
              options: true,
              correctAnswer: true,
              weight: true,
              isRequired: true,
              sortOrder: true,
            },
          });
          const answeredRows = await tx.auditAnswer.groupBy({
            by: ['questionId'],
            where: { question: { templateId: tplId } },
          });
          const answeredSet = new Set(answeredRows.map((a) => a.questionId));

          let diff = planQuestionDiff(existingQs, data.questions, answeredSet);

          if (diff.ok) {
            // Yarış koruması: silinecek / kilitli alanı değişecek soruları kilitle,
            // sonra yanıtlarını TAZE oku. (Biz planlarken bir katılımcı o soruya
            // cevap göndermiş olabilir; silmek `onDelete: Cascade` ile o cevabı
            // sessizce yok ederdi.) Kilit, uçuştaki bir submit commit olana kadar
            // bekler; sonraki okuma onun cevabını görür.
            const risky = [
              ...diff.plan.deletes,
              ...diff.plan.updates
                .filter((u) => u.lockedFieldsChanged.length > 0)
                .map((u) => u.id),
            ];
            if (risky.length > 0) {
              await tx.$queryRaw(
                Prisma.sql`SELECT id FROM audit_questions WHERE id IN (${Prisma.join(risky)}) FOR UPDATE`,
              );
              const fresh = await tx.auditAnswer.groupBy({
                by: ['questionId'],
                where: { questionId: { in: risky } },
              });
              if (fresh.length > 0) {
                for (const f of fresh) answeredSet.add(f.questionId);
                diff = planQuestionDiff(existingQs, data.questions, answeredSet);
              }
            }
          }

          if (!diff.ok) throw new PatchAbort(diffErrorResponse(diff.error));
          plan = diff.plan;
          questionCount = data.questions.length;
        } else {
          questionCount = await tx.auditQuestion.count({ where: { templateId: tplId } });
        }

        // Yayın için en az 1 soru (eskiden boş taslak yayınlanabiliyordu).
        if (data.publish === true && questionCount === 0) {
          throw new PatchAbort(ApiErrors.badRequest('Yayın için en az 1 soru gerekli', 'NO_QUESTIONS'));
        }

        // ── Yazma ──────────────────────────────────────────────────────
        const hasQuestionChanges =
          plan !== null && plan.creates.length + plan.updates.length + plan.deletes.length > 0;
        const publishChanged = data.publish !== undefined && data.publish !== row.isPublished;

        const updated = await tx.auditTemplate.update({
          where: { id: tplId },
          data: {
            categoryId: data.categoryId === undefined ? undefined : data.categoryId,
            title: data.title,
            description: data.description,
            sector: data.sector,
            scoringMode: data.scoringMode,
            passingScore: data.passingScore,
            locale: data.locale,
            ...(publishChanged
              ? {
                  isPublished: data.publish,
                  publishedAt: data.publish ? new Date() : null,
                }
              : {}),
            // Yalnız soru değişikliği şablonun @updatedAt'ini tetiklemez → açıkça yaz.
            ...(hasQuestionChanges ? { updatedAt: new Date() } : {}),
          },
          select: { id: true, title: true, isPublished: true, updatedAt: true },
        });

        let questionIds: string[] | null = null;
        if (plan) {
          if (plan.deletes.length > 0) {
            await tx.auditQuestion.deleteMany({
              where: { id: { in: plan.deletes }, templateId: tplId },
            });
          }
          for (const u of plan.updates) {
            const { options, correctAnswer, ...rest } = u.data;
            await tx.auditQuestion.update({
              where: { id: u.id },
              data: {
                ...rest,
                ...(options !== undefined ? { options: jsonOrDbNull(options) } : {}),
                ...(correctAnswer !== undefined
                  ? { correctAnswer: jsonOrDbNull(correctAnswer) }
                  : {}),
              },
              select: { id: true },
            });
          }
          if (plan.creates.length > 0) {
            await tx.auditQuestion.createMany({
              data: plan.creates.map((c) => toCreateRow(tplId, c.data)),
            });
          }
          // Gelen sıradaki kalıcı id'ler — builder yeni soruların id'sini bununla öğrenir.
          const finalQs = await tx.auditQuestion.findMany({
            where: { templateId: tplId },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            select: { id: true },
          });
          questionIds = finalQs.map((q) => q.id);
        }

        return { ...updated, questionIds };
      },
      { timeout: 15_000, maxWait: 5_000 },
    );

    return NextResponse.json({
      data: {
        id: result.id,
        title: result.title,
        isPublished: result.isPublished,
        updatedAt: result.updatedAt.toISOString(),
        ...(result.questionIds ? { questionIds: result.questionIds } : {}),
      },
    });
  } catch (err) {
    if (err instanceof PatchAbort) return err.response;

    // Prisma exception → 400/409 ayrımı + Sentry capture (KVKK: actor.id +
    // restaurantId log'lanır, payload PII içermez).
    const code = getErrorCode(err);
    const message = getErrorMessage(err);
    console.error('[audit] templates PATCH failed', { code, message: message.slice(0, 300) });
    Sentry.captureException(err, {
      tags: { route: 'restaurants/audits/templates/[tplId]', method: 'PATCH', prismaCode: code },
      extra: { restaurantId: id, templateId: tplId, actorId: g.actor.id, prismaMessage: message.slice(0, 500) },
    });
    if (code === 'P2002') return ApiErrors.conflict('Çakışan kayıt mevcut', 'UNIQUE_VIOLATION');
    if (code === 'P2003') return ApiErrors.badRequest('İlişkili kayıt bulunamadı', 'FK_VIOLATION');
    if (code === 'P2025') return ApiErrors.notFound('Kayıt bulunamadı');
    return NextResponse.json(
      { error: 'Denetim kaydedilemedi', code: code || 'INTERNAL_SERVER_ERROR' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;
  const g = await gate(req, id, true);
  if (!g.ok) return g.res;

  const existing = await findTemplate(tplId, id);
  if (!existing) return ApiErrors.notFound('Şablon bulunamadı');

  const responseCount = await prisma.auditResponse.count({ where: { templateId: tplId } });

  if (responseCount > 0) {
    // Soft-disable — history korunur.
    await prisma.auditTemplate.update({
      where: { id: tplId },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true, mode: 'soft-disabled', responses: responseCount });
  }

  await prisma.auditTemplate.delete({ where: { id: tplId } });
  return NextResponse.json({ ok: true, mode: 'deleted' });
}
