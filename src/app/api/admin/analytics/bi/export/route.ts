import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';
import { buildBiCsv, getBiSnapshot } from '@/lib/admin-bi';
import { ApiErrors } from '@/lib/api-errors';

// Stage A5 §38.97 — BI CSV export (cross-workspace).
//
// GET /api/admin/analytics/bi/export?range=30d|90d|1y
//
// Single CSV with 4 sections (MRR / Churn / NPS / Cohort) separated by
// header rows — built by `buildBiCsv` (src/lib/admin-bi.ts). Excel TR-safe
// UTF-8 BOM (CLAUDE.md §38.50).
//
// Rate limit 5/dk/admin (CLAUDE.md §38.78 export rate-limit paterni).

export const dynamic = 'force-dynamic';

const RangeSchema = z.enum(['30d', '90d', '1y']);

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
    const csv = buildBiCsv(snapshot);
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
