// CLAUDE.md §42 Phase 4 — Owner audit responses list.
//
// Filter: range=7d|30d|90d|all, status=completed|in_progress, passed=true|false|all,
// search (respondent name/email substring), teamMemberId, page, pageSize.
//
// Spec §6.5 (C5) — GERÇEK toplamlar: eskiden `take: 500` ve `summary.total =
// rows.length`, histogram/geçti sayısı kesilmiş satırlardan, ortalama ise tam
// aggregate'ten geliyordu (rakamlar birbirini tutmuyordu). Artık:
//   • satırlar `skip/take` ile sayfalanır (varsayılan 50, en çok 100)
//   • summary.total/completed/passedCount + histogram TÜM filtrelenmiş
//     kümeden aggregate ile hesaplanır (tek `$transaction`)
//   • `meta: { page, pageSize, hasMore }` eklendi
// Sayfa (server hydration) ve bu rota AYNI sorguyu (`queryAuditResponses`) çağırır.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { parsePaging } from '@/lib/audits/results';
import { queryAuditResponses } from '@/lib/audits/queries';
import { withServerTiming } from '@/lib/server-timing';

type Params = { id: string; tplId: string };

async function handleGET(req: NextRequest, ctx: { params: Promise<Params> }) {
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
  const { page, pageSize } = parsePaging(searchParams.get('page'), searchParams.get('pageSize'));

  const body = await queryAuditResponses(tpl, {
    restaurantId: id,
    templateId: tplId,
    range: searchParams.get('range'),
    status: searchParams.get('status'), // 'completed' | 'in_progress' | null=hepsi (UI artık göndermez)
    passed: searchParams.get('passed'), // 'true' | 'false' | null/'all'=hepsi
    search: searchParams.get('search')?.trim().slice(0, 100) || null,
    teamMemberId: searchParams.get('teamMemberId'),
    page,
    pageSize,
  });

  return NextResponse.json(body);
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
