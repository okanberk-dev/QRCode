import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';
import { getBiSnapshot, type BiSnapshot } from '@/lib/admin-bi';
import { ApiErrors } from '@/lib/api-errors';

// Stage A5 §38.97 — BI CSV export (cross-workspace).
//
// GET /api/admin/analytics/bi/export?range=30d|90d|1y
//
// Single CSV with 4 sections (MRR / Churn / NPS / Cohort) separated by
// header rows. Excel TR-safe UTF-8 BOM (CLAUDE.md §38.50).
//
// Rate limit 5/dk/admin (CLAUDE.md §38.78 export rate-limit paterni).

export const dynamic = 'force-dynamic';

const RangeSchema = z.enum(['30d', '90d', '1y']);

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function buildCsv(snapshot: BiSnapshot): string {
  const lines: string[] = [];

  // Section 1: MRR trend
  lines.push('# MRR TRENDI');
  lines.push(['Ay', 'Toplam (TRY)', 'Pro', 'Growth', 'Starter', 'Monthly', 'Yearly'].map(csvEscape).join(','));
  for (const p of snapshot.mrr) {
    lines.push([
      p.month,
      p.total,
      p.byPlan.pro || 0,
      p.byPlan.growth || 0,
      p.byPlan.starter || 0,
      p.byPlan.monthly || 0,
      p.byPlan.yearly || 0,
    ].map(csvEscape).join(','));
  }
  lines.push('');

  // Section 2: Churn
  lines.push('# CHURN ORANI');
  lines.push(['Ay', 'Pasifleşen', 'Aktif (denominator)', 'Oran %'].map(csvEscape).join(','));
  for (const p of snapshot.churn) {
    lines.push([p.month, p.churned, p.active, p.ratePct].map(csvEscape).join(','));
  }
  lines.push('');

  // Section 3: NPS
  lines.push('# NPS DAGILIMI');
  lines.push(['Promoter (5)', 'Passive (3-4)', 'Detractor (1-2)', 'Toplam', 'Skor'].map(csvEscape).join(','));
  lines.push([
    snapshot.nps.promoters,
    snapshot.nps.passives,
    snapshot.nps.detractors,
    snapshot.nps.total,
    snapshot.nps.score,
  ].map(csvEscape).join(','));
  lines.push('');

  // Section 4: Cohort retention
  lines.push('# KOHORT RETENTION (signup ayı bazlı)');
  lines.push(['Kohort Ayı', 'Kayıt', 'Aktif (paid)', 'Trial', 'Retention %'].map(csvEscape).join(','));
  for (const p of snapshot.cohort) {
    lines.push([p.cohortMonth, p.signups, p.retainedActive, p.retainedTrial, p.retentionPct].map(csvEscape).join(','));
  }
  lines.push('');

  // Footer
  lines.push(`# Olusturma: ${snapshot.generatedAt}`);
  lines.push(`# Aralik: ${snapshot.range} (${snapshot.months} ay)`);

  return '﻿' + lines.join('\n');
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized('Yetkisiz');
  if (!(await hasPermission(admin.id, 'analytics', 'read'))) {
    return ApiErrors.forbidden('Yetki yok');
  }

  const rl = await rateLimit(`bi-export:${admin.id}`, 5, 60_000);
  if (!rl.allowed) {
    return ApiErrors.tooManyRequests('Çok fazla export. Lütfen bekleyin.', 'RATE_LIMIT_EXCEEDED', 60);
  }

  const { searchParams } = new URL(req.url);
  const parsed = RangeSchema.safeParse(searchParams.get('range') || '90d');
  if (!parsed.success) {
    return ApiErrors.badRequest('Geçersiz aralık (30d|90d|1y)', 'INVALID_RANGE');
  }

  try {
    const snapshot = await getBiSnapshot(parsed.data);
    const csv = buildCsv(snapshot);
    const filename = `buaze-bi-${parsed.data}-${snapshot.generatedAt.slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[admin/analytics/bi/export]', err);
    return ApiErrors.internalError('BI export başarısız');
  }
}
