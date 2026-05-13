// CLAUDE.md §42 Phase 4 — Audit responses CSV export.
//
// Rate-limit 5/dk/owner (CSV pahalı). UTF-8 BOM + Excel-friendly tek tek
// field escape.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';

type Params = { id: string; tplId: string };

function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (typeof value === 'string') s = value;
  else if (typeof value === 'number' || typeof value === 'boolean') s = String(value);
  else if (value instanceof Date) s = value.toISOString();
  else s = JSON.stringify(value);
  // Excel CSV escape: " → "", surround with "" if contains , " \r \n
  if (/[",\r\n]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

  const limit = await rateLimit(`audit-export:actor:${actor.id}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: 60 },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const tpl = await prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId: id },
    select: { id: true, title: true },
  });
  if (!tpl) return ApiErrors.notFound('Şablon bulunamadı');

  const rows = await prisma.auditResponse.findMany({
    where: { templateId: tplId, restaurantId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      respondentName: true,
      respondentEmail: true,
      respondentPhone: true,
      score: true,
      passed: true,
      startedAt: true,
      completedAt: true,
      assignmentId: true,
    },
    take: 5000,
  });

  const headers = [
    'response_id',
    'respondent_name',
    'respondent_email',
    'respondent_phone',
    'score',
    'passed',
    'started_at',
    'completed_at',
    'assignment_id',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.id,
        r.respondentName,
        r.respondentEmail,
        r.respondentPhone,
        r.score,
        r.passed,
        r.startedAt,
        r.completedAt,
        r.assignmentId,
      ]
        .map(csvField)
        .join(','),
    ),
  ];
  const body = '﻿' + lines.join('\r\n'); // UTF-8 BOM

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-${tplId}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
