import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { getBiSnapshot, type BiSnapshot } from '@/lib/admin-bi';
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

// Stage 28 §38.104 Fix A4 — admin BI hot path process-local Map cache.
// HTTP Cache-Control (private/s-maxage=120) ZATEN var; Vercel CDN edge
// hit'lerini kapsar. Ama function cold-start sonrası ilk request veya
// cross-region (Vercel multi-edge) traffic compute path'ine düşer.
// Process-local Map 2dk TTL admin range chip toggle (30G→90G→1Y) +
// page reload hot path'inde 4-helper aggregate (getMrrTrend, getChurnTrend,
// getNpsDistribution, getCohortRetention) recompute'ünü atlar.
// CLAUDE.md §15.1 site-settings.ts paterni reuse.
// Trade-off: multi-instance Vercel'de 2dk drift kabul (NPS/MRR/churn
// saatlik basislere yansır; fresh data 2dk içinde ulaşır).
const biCache = new Map<string, { data: BiSnapshot; expiresAt: number }>();
const BI_CACHE_TTL_MS = 120_000; // 2dk

function getCachedBiSnapshot(range: string): BiSnapshot | null {
  const entry = biCache.get(range);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    biCache.delete(range);
    return null;
  }
  return entry.data;
}

function setCachedBiSnapshot(range: string, data: BiSnapshot): void {
  biCache.set(range, { data, expiresAt: Date.now() + BI_CACHE_TTL_MS });
}

/**
 * Manuel invalidation — admin cross-workspace destructive aksiyon
 * sonrası (örn. plan tier toplu güncelleme, bulk deactivate) caller bu
 * helper'ı çağırarak fresh fetch'i tetikler. Şu an wired callsite yok;
 * gelecek scope (CLAUDE.md §38.97 Stage A5 admin/restaurants/bulk
 * feature_override + admin/members/bulk send_email gibi yüksek-impact
 * mutation'lar drift uzatabilir).
 */
export function clearBiSnapshotCache(): void {
  biCache.clear();
}

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
    // Cache lookup — hit ise 4-helper aggregate compute atlanır.
    let snapshot = getCachedBiSnapshot(parsed.data);
    if (!snapshot) {
      snapshot = await getBiSnapshot(parsed.data);
      setCachedBiSnapshot(parsed.data, snapshot);
    }
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
