// CLAUDE.md §42 Phase 3 — Public audit response GET endpoint.
//
// Token ile public erişim. Template + sorular + assignment meta dönülür.
// IP-bazlı rate-limit (CLAUDE.md §37.2.D pattern). Cevap zaten verilmişse
// (completedAt dolu) UI thank-you ekranına geçer.
//
// Revoked/cancelled/expired durumda silent 404 (fingerprinting önleme).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import type {
  AuditQuestionType,
  AuditScoringMode,
  AuditSector,
} from '@/lib/audits/types';
import { normalizeQuestionOptions } from '@/lib/audits/options';

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Rate limit — 60 req/min/IP (browse + retry için yeterli, abuse'a kapalı)
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`audit-get:ip:${ip}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: 60 },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const assignment = await prisma.auditAssignment.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      tokenRevoked: true,
      assigneeType: true,
      assigneeName: true,
      assigneeEmail: true,
      dueAt: true,
      recurrence: true,
      template: {
        select: {
          id: true,
          title: true,
          description: true,
          sector: true,
          scoringMode: true,
          passingScore: true,
          locale: true,
          isPublished: true,
          isActive: true,
          restaurant: {
            select: { id: true, name: true, isActive: true, primaryColor: true, kvkkText: true },
          },
          questions: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              type: true,
              prompt: true,
              helpText: true,
              options: true,
              weight: true,
              isRequired: true,
              sortOrder: true,
              // correctAnswer KASTEN EKSIK — public response'ta görünmemeli
            },
          },
        },
      },
    },
  });

  // Silent 404 kontrolleri (fingerprinting önleme, CLAUDE.md §13.5):
  // - Token yok
  // - Revoked
  // - Cancelled
  // - Template silinmiş / aktif değil / yayında değil
  // - Restoran silinmiş / pasif
  if (
    !assignment ||
    assignment.tokenRevoked ||
    assignment.status === 'cancelled' ||
    !assignment.template ||
    !assignment.template.isActive ||
    !assignment.template.isPublished ||
    !assignment.template.restaurant ||
    !assignment.template.restaurant.isActive
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Tamamlanmış atama — UI thank-you state'i göstersin diye flag dön.
  const completed = assignment.status === 'completed';

  return NextResponse.json({
    completed,
    assignment: {
      id: assignment.id,
      status: assignment.status,
      assigneeType: assignment.assigneeType,
      assigneeName: assignment.assigneeName,
      assigneeEmail: assignment.assigneeEmail,
      dueAt: assignment.dueAt,
      recurrence: assignment.recurrence,
    },
    template: {
      id: assignment.template.id,
      title: assignment.template.title,
      description: assignment.template.description,
      sector: assignment.template.sector as AuditSector,
      scoringMode: assignment.template.scoringMode as AuditScoringMode,
      passingScore: assignment.template.passingScore,
      locale: assignment.template.locale,
    },
    restaurant: {
      id: assignment.template.restaurant.id,
      name: assignment.template.restaurant.name,
      primaryColor: assignment.template.restaurant.primaryColor,
      kvkkText: assignment.template.restaurant.kvkkText,
    },
    questions: assignment.template.questions.map((q) => ({
      id: q.id,
      type: q.type as AuditQuestionType,
      prompt: q.prompt,
      helpText: q.helpText,
      // Defansif normalize — yes_no/single/multi soruları için options
      // eksikse template locale'a göre default doldur. Seed legacy
      // veriler + admin tarafından eksik kaydedilmiş şablonlar için
      // safety net. correctAnswer KASTEN EKSİK kalır (public).
      options: normalizeQuestionOptions(
        q.type as AuditQuestionType,
        q.options,
        assignment.template.locale === 'en' ? 'en' : 'tr',
      ),
      weight: q.weight,
      isRequired: q.isRequired,
      sortOrder: q.sortOrder,
    })),
  });
}
