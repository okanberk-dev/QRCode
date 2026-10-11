import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';
import type { LifecycleEmailType } from '@/lib/email/lifecycle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Admin lifecycle email log viewer (CLAUDE.md §21.37 + §23.7 Phase 11.31).
//
// Query params:
//   - type:  'qr_not_downloaded' | 'first_feedback_tips' | 'upgrade_suggestion' | 'inactive_reactivation'
//   - days:  7 | 30 | 90 (default 30)
//
// Response:
//   {
//     stats: { sent7d, sent30d, byType: { [type]: count }, total },
//     logs: [{ id, type, sentAt, user, restaurant, metadata }]  // last 50
//   }
//
// User + Restaurant FK'sı yok modelde (CLAUDE.md §21.34 — minimal) — manuel
// enrich (Promise.all + Map lookup).

// Every LifecycleEmailLog type, including the newer ones written by their
// own crons / sync triggers — the page filter offers all of them.
const VALID_TYPES = new Set<LifecycleEmailType>([
  'qr_not_downloaded',
  'first_feedback_tips',
  'upgrade_suggestion',
  'inactive_reactivation',
  'monthly_health_report',
  'first_feedback_celebration',
  'qr_no_scans_reminder',
  'rating_drop_alert',
  'first_reply_celebration',
]);

const VALID_DAYS = new Set([7, 30, 90]);

interface EnrichedLog {
  id: string;
  type: string;
  sentAt: string;
  user: { id: string; name: string | null; email: string } | null;
  restaurant: { id: string; name: string } | null;
  metadata: unknown;
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const url = new URL(req.url);
  const typeParam = url.searchParams.get('type');
  const type = typeParam && VALID_TYPES.has(typeParam as LifecycleEmailType) ? typeParam : null;
  const daysParam = parseInt(url.searchParams.get('days') ?? '30', 10);
  const days = VALID_DAYS.has(daysParam) ? daysParam : 30;

  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const logsWhere: { type?: string; sentAt: { gte: Date } } = { sentAt: { gte: since } };
  if (type) logsWhere.type = type;

  const [logs, sent7d, sent30d, byTypeRaw, total] = await Promise.all([
    prisma.lifecycleEmailLog.findMany({
      where: logsWhere,
      orderBy: { sentAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        sentAt: true,
        userId: true,
        restaurantId: true,
        metadata: true,
      },
    }),
    prisma.lifecycleEmailLog.count({ where: { sentAt: { gte: since7d } } }),
    prisma.lifecycleEmailLog.count({ where: { sentAt: { gte: since30d } } }),
    prisma.lifecycleEmailLog.groupBy({
      by: ['type'],
      where: { sentAt: { gte: since30d } },
      _count: { _all: true },
    }),
    prisma.lifecycleEmailLog.count(),
  ]);

  // Enrich user + restaurant (FK yok, manuel join)
  const userIds = Array.from(
    new Set(logs.map((l) => l.userId).filter((v): v is string => !!v)),
  );
  const restaurantIds = Array.from(
    new Set(logs.map((l) => l.restaurantId).filter((v): v is string => !!v)),
  );

  const [users, restaurants] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    restaurantIds.length
      ? prisma.restaurant.findMany({
          where: { id: { in: restaurantIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const restaurantMap = new Map(restaurants.map((r) => [r.id, r]));

  const enriched: EnrichedLog[] = logs.map((l) => ({
    id: l.id,
    type: l.type,
    sentAt: l.sentAt.toISOString(),
    user: l.userId ? userMap.get(l.userId) ?? null : null,
    restaurant: l.restaurantId ? restaurantMap.get(l.restaurantId) ?? null : null,
    metadata: l.metadata,
  }));

  const byType: Record<string, number> = Object.fromEntries(
    [...VALID_TYPES].map((t) => [t, 0]),
  );
  for (const row of byTypeRaw) {
    byType[row.type] = row._count._all;
  }

  return NextResponse.json({
    stats: { sent7d, sent30d, byType, total },
    logs: enriched,
    range: { type, days, windowStart: since.toISOString(), windowEnd: now.toISOString() },
  });
}
