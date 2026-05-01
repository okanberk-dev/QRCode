import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { ApiErrors } from '@/lib/api-errors';

/**
 * POST /api/admin/restaurants/bulk — superadmin only toplu aktif/pasif.
 *
 * Auth: panel actor + role kontrol (superadmin). Manager bulk yapamaz —
 *   kendi restoranı zaten birkaç tane, tek tek toggle yeter; toplu pasif
 *   sadece operator'ün operasyonel ihtiyacı (CLAUDE.md §4 IDOR + role).
 * Rate limit: 10 / dk / actor (mass-action abuse koruması §14.2).
 * Batch limit: 50 id (mantıklı UI selection üst sınırı).
 *
 * Body shape (Zod):
 *   { ids: string[] (1..50), action: 'activate' | 'deactivate' }
 *   - 'activate'   → isActive=true updateMany
 *   - 'deactivate' → isActive=false updateMany
 *
 * Response: { processed: number, action }
 */
const Body = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  action: z.enum(['activate', 'deactivate']),
});

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized('Yetkisiz');

  // Owner panel + manager bulk yapamaz — superadmin only
  if (actor.role !== 'superadmin') {
    return ApiErrors.forbidden('Bu işlem için süperadmin yetkisi gerekli');
  }

  const rl = await rateLimit(`restaurants-bulk:${actor.id}`, 10, 60_000);
  if (!rl.allowed) {
    return ApiErrors.tooManyRequests(
      'Çok fazla toplu işlem. Lütfen biraz bekleyin.',
      'RATE_LIMIT_EXCEEDED',
      60,
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const { ids, action } = parsed.data;

  const result = await prisma.restaurant.updateMany({
    where: { id: { in: ids } },
    data: { isActive: action === 'activate' },
  });

  return NextResponse.json({ processed: result.count, action });
}
