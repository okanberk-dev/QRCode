// CLAUDE.md §40.2 — Owner "Varsayılana sıfırla" endpoint'i (Phase 5).
//
// Kullanım: owner panel detail sayfasında, fork edilmiş ve yanıt almamış
// bir template için görünür. Bu endpoint:
//
//   1. Owner template'inin `forkedFromId`'sini okur. NULL ise → 409 (sıfırdan
//      yapılmış template'lerde reset semantiği yok).
//   2. Kaynak global template'i (restaurantId=null + isPublished=true +
//      isActive=true) bulur. Bulamazsa → 410 GONE (kaynak silinmiş /
//      yayından alınmış; reset butonu UI'da bu durumda gizli olmalı).
//   3. Yanıt sayısı varsa → 409 (CLAUDE.md §40.2 response lock; soru
//      değişikliği yapacağımız için PATCH'teki kuralla simetrik).
//   4. Tek transaction içinde:
//      - Owner template'in scoring + locale + sector + categoryId'sini
//        kaynaktan kopyalar (owner-set title ve description **korunur** —
//        bunlar identity, scoring değil).
//      - Mevcut tüm `AuditQuestion` kayıtlarını siler ve kaynaktan tekrar
//        kopyalar (sortOrder dahil).
//      - `isPublished=false` zorlanır — reset sonrası owner gözden geçirip
//        yayınlamalı.
//
// IDOR: `canWriteRestaurant` (CLAUDE.md §40.4 B). Rate limit: per-owner
// 10/dk (CLAUDE.md §40.4 C — destructive op).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

type Params = { id: string; tplId: string };

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const rl = await rateLimit(`audits:reset:${actor.id}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla sıfırlama isteği. Lütfen biraz bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const existing = await prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId: id },
    select: {
      id: true,
      forkedFromId: true,
      isPublished: true,
    },
  });
  if (!existing) return ApiErrors.notFound('Şablon bulunamadı');
  if (!existing.forkedFromId) {
    return ApiErrors.conflict(
      'Bu şablonun fork kaynağı yok; varsayılana sıfırlanamaz.',
      'NO_FORK_SOURCE',
    );
  }

  const responseCount = await prisma.auditResponse.count({ where: { templateId: tplId } });
  if (responseCount > 0) {
    return ApiErrors.conflict(
      'Yanıt almış şablon sıfırlanamaz. Yeni versiyon için şablonu çoğaltın.',
      'RESPONSES_LOCK_RESET',
    );
  }

  const source = await prisma.auditTemplate.findFirst({
    where: {
      id: existing.forkedFromId,
      restaurantId: null,
      isActive: true,
    },
    select: {
      id: true,
      sector: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
      categoryId: true,
      isPublished: true,
      questions: {
        orderBy: { sortOrder: 'asc' },
        select: {
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
    },
  });
  if (!source || !source.isPublished) {
    return NextResponse.json(
      {
        error:
          'Fork kaynağı artık mevcut değil veya yayından kaldırılmış. Sıfırlama yapılamaz.',
        code: 'FORK_SOURCE_GONE',
      },
      { status: 410 },
    );
  }

  // Tek transaction'da soruları + scoring meta'yı yeniden senkronize et.
  // Owner-set `title` + `description` korunur (identity); `sector` /
  // `scoringMode` / `passingScore` / `locale` / `categoryId` kaynaktan
  // yenilenir. `isPublished=false` zorlanır — reset sonrası owner gözden
  // geçirip yeniden yayınlamalı.
  const result = await prisma.$transaction(async (tx) => {
    await tx.auditQuestion.deleteMany({ where: { templateId: tplId } });
    if (source.questions.length > 0) {
      await tx.auditQuestion.createMany({
        data: source.questions.map((q) => ({
          templateId: tplId,
          type: q.type,
          prompt: q.prompt,
          helpText: q.helpText,
          options: q.options === null ? undefined : (q.options as unknown as object),
          correctAnswer:
            q.correctAnswer === null ? undefined : (q.correctAnswer as unknown as object),
          weight: q.weight,
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
        })),
      });
    }
    return tx.auditTemplate.update({
      where: { id: tplId },
      data: {
        sector: source.sector,
        scoringMode: source.scoringMode,
        passingScore: source.passingScore,
        locale: source.locale,
        categoryId: source.categoryId,
        isPublished: false,
        publishedAt: null,
      },
      select: { id: true, title: true, isPublished: true, updatedAt: true },
    });
  });

  return NextResponse.json({
    data: result,
    questionsRestored: source.questions.length,
  });
}
