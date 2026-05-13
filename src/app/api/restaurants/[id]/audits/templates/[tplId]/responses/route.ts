// CLAUDE.md §42 Phase 4 — Owner audit responses list.
//
// Filter: range=7d|30d|all, status=completed|in_progress, passed=true|false|all,
// search (respondent name/email substring), teamMemberId.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';

type Params = { id: string; tplId: string };

function parseRange(range: string | null): Date | null {
  if (range === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (range === '90d') return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

  // Template bu restorana ait mi?
  const tpl = await prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId: id },
    select: { id: true, scoringMode: true, passingScore: true },
  });
  if (!tpl) return ApiErrors.notFound('Şablon bulunamadı');

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range');
  const status = searchParams.get('status'); // 'completed' | 'in_progress' | null=all
  const passed = searchParams.get('passed'); // 'true' | 'false' | null=all
  const search = searchParams.get('search')?.trim() || '';
  const teamMemberId = searchParams.get('teamMemberId');
  const rangeStart = parseRange(range);

  const where: Record<string, unknown> = { templateId: tplId, restaurantId: id };
  if (rangeStart) where.createdAt = { gte: rangeStart };
  if (status === 'completed') where.completedAt = { not: null };
  else if (status === 'in_progress') where.completedAt = null;
  if (passed === 'true') where.passed = true;
  if (passed === 'false') where.passed = false;
  if (teamMemberId) where.teamMemberId = teamMemberId;
  if (search) {
    where.OR = [
      { respondentName: { contains: search, mode: 'insensitive' } },
      { respondentEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [rows, summary] = await prisma.$transaction([
    prisma.auditResponse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        respondentName: true,
        respondentEmail: true,
        respondentPhone: true,
        teamMemberId: true,
        score: true,
        scorePercentage: true,
        passed: true,
        startedAt: true,
        completedAt: true,
        reviewedById: true,
        reviewedAt: true,
        assignmentId: true,
        createdAt: true,
      },
      take: 500,
    }),
    prisma.auditResponse.aggregate({
      where: { ...where, completedAt: { not: null } },
      _avg: { score: true },
      _count: { _all: true },
    }),
  ]);

  // Score distribution buckets (10'ar puanlık, 0-100). Histogram için.
  const completed = rows.filter((r) => r.completedAt && r.score != null);
  const distribution = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}-${i * 10 + 9}`,
    min: i * 10,
    max: i * 10 + 9,
    count: 0,
  }));
  // 100 puanı son bucket'a dahil et (9. bucket = 90-99 → 100 dahil)
  distribution[9].max = 100;
  distribution[9].bucket = '90-100';
  for (const r of completed) {
    if (r.score == null) continue;
    const idx = Math.min(9, Math.floor(r.score / 10));
    distribution[idx].count += 1;
  }

  const passedCount = completed.filter((r) => r.passed === true).length;

  return NextResponse.json({
    data: rows,
    summary: {
      total: rows.length,
      completed: completed.length,
      averageScore: summary._avg.score ?? null,
      passedCount,
      passingScore: tpl.passingScore,
    },
    distribution,
  });
}
