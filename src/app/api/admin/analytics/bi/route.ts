import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { getBiSnapshot } from '@/lib/admin-bi';
import { ApiErrors } from '@/lib/api-errors';

// Stage A5 §38.97 — cross-workspace BI snapshot.
//
// GET /api/admin/analytics/bi?range=30d|90d|1y
//
// Auth: superadmin OR analytics:read permission. Cross-workspace data
// (MRR + churn + NPS + cohort) — BI scope superadmin-typical, manager
// için explicit grant gerek (CLAUDE.md §38.94).
//
// Cache: private, s-maxage=120, swr=600 — owner-scoped değil ama
// global aggregate öyle ki dakika seviyesinde freshness yeterli; CDN
// strip için private + revalidate ile.
//
// Response: BiSnapshot (CLAUDE.md §38.97 admin-bi.ts).

export const dynamic = 'force-dynamic';

const RangeSchema = z.enum(['30d', '90d', '1y']);

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized('Yetkisiz');
  if (!(await hasPermission(admin.id, 'analytics', 'read'))) {
    return ApiErrors.forbidden('Yetki yok');
  }

  const { searchParams } = new URL(req.url);
  const parsed = RangeSchema.safeParse(searchParams.get('range') || '90d');
  if (!parsed.success) {
    return ApiErrors.badRequest('Geçersiz aralık (30d|90d|1y)', 'INVALID_RANGE');
  }

  try {
    const snapshot = await getBiSnapshot(parsed.data);
    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'private, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('[admin/analytics/bi]', err);
    return ApiErrors.internalError('BI verisi alınamadı');
  }
}
