import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { sanitizeAuditPayload } from '@/lib/audit-log';

// Stage A3 §38.95 — admin audit log viewer endpoint.
//
// IDOR: superadmin OR `audit_logs:read` permission (Stage A2 §38.94).
// PII guard (CLAUDE.md §37.7): payload alanları viewer'a dönmeden önce
// `sanitizeAuditPayload` ile mask edilir (email/phone keyleri otomatik).
//
// Filter Zod `.strict()` (CLAUDE.md §28.3 disipline) — schema dışı field
// 400 reddedilir.
//
// Pagination: page/limit (max 100), default 50. Total count + filteredTotal.

export const dynamic = 'force-dynamic';

const QuerySchema = z
  .object({
    actorSource: z.enum(['all', 'admin', 'user']).optional().default('all'),
    action: z.string().max(100).optional().default(''),
    actorId: z.string().max(100).optional().default(''),
    targetId: z.string().max(100).optional().default(''),
    range: z.enum(['7d', '30d', '90d', 'custom']).optional().default('30d'),
    customStart: z.string().datetime().optional(),
    customEnd: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).max(10000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();

const RANGE_DAYS: Record<'7d' | '30d' | '90d', number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'audit_logs', 'read'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Parse + validate query.
  const queryObj = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(queryObj);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'validation_error',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  const q = parsed.data;

  // Date range — custom requires both endpoints; fallback to 30d on missing.
  let windowStart: Date;
  let windowEnd: Date = new Date();
  if (q.range === 'custom' && q.customStart && q.customEnd) {
    windowStart = new Date(q.customStart);
    windowEnd = new Date(q.customEnd);
    // Clamp custom range to max 365 days (DDoS guard).
    const ms = windowEnd.getTime() - windowStart.getTime();
    if (ms < 0) {
      return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
    }
    if (ms > 365 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'range_too_large' }, { status: 400 });
    }
  } else {
    const days = RANGE_DAYS[q.range as '7d' | '30d' | '90d'] || 30;
    windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  // Build where clause.
  const where: Prisma.AdminAuditLogWhereInput = {
    createdAt: { gte: windowStart, lte: windowEnd },
  };
  if (q.actorSource !== 'all') {
    where.actorSource = q.actorSource;
  }
  if (q.action) {
    where.action = { contains: q.action, mode: 'insensitive' };
  }
  if (q.actorId) {
    where.actorId = q.actorId;
  }
  if (q.targetId) {
    where.targetId = q.targetId;
  }

  let total = 0;
  let entries: Array<{
    id: string;
    // Stage A — actorId nullable (KVKK hard-delete sets NULL on anonymised
    // audit rows; the row survives so the trail stays continuous but the
    // PII actor reference is severed).
    actorId: string | null;
    actorSource: string;
    action: string;
    targetId: string | null;
    payload: unknown;
    createdAt: Date;
  }> = [];

  try {
    [total, entries] = await prisma.$transaction([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          actorId: true,
          actorSource: true,
          action: true,
          targetId: true,
          payload: true,
          createdAt: true,
        },
      }),
    ]);
  } catch (err) {
    console.error('[admin/audit-logs GET]', err);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  // Resolve actor names — bulk fetch User + AdminUser (avoid N+1).
  // Stage A — null actorId (anonimleştirilmiş kayıtlar) atlanır.
  const adminIds = Array.from(
    new Set(
      entries
        .filter((e) => e.actorSource === 'admin' && e.actorId)
        .map((e) => e.actorId as string),
    ),
  );
  const userIds = Array.from(
    new Set(
      entries
        .filter((e) => e.actorSource === 'user' && e.actorId)
        .map((e) => e.actorId as string),
    ),
  );

  let adminUsers: Array<{ id: string; username: string; email: string | null; role: string }> = [];
  let users: Array<{ id: string; email: string; name: string | null }> = [];
  try {
    [adminUsers, users] = await Promise.all([
      adminIds.length === 0
        ? Promise.resolve([] as typeof adminUsers)
        : prisma.adminUser.findMany({
            where: { id: { in: adminIds } },
            select: { id: true, username: true, email: true, role: true },
          }),
      userIds.length === 0
        ? Promise.resolve([] as typeof users)
        : prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          }),
    ]);
  } catch (err) {
    console.error('[admin/audit-logs actor resolve]', err);
    // Non-fatal — render entries with minimal actor info.
  }

  const adminMap = new Map(adminUsers.map((a) => [a.id, a]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json(
    {
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      data: entries.map((e) => {
        let actor: {
          id: string;
          label: string;
          email: string | null;
          role: string | null;
        } | null = null;
        if (e.actorSource === 'admin' && e.actorId) {
          const a = adminMap.get(e.actorId);
          if (a) {
            actor = { id: a.id, label: a.username, email: a.email, role: a.role };
          }
        } else if (e.actorSource === 'user' && e.actorId) {
          const u = userMap.get(e.actorId);
          if (u) {
            actor = { id: u.id, label: u.name || u.email, email: u.email, role: 'restaurant_owner' };
          }
        }
        return {
          id: e.id,
          actorId: e.actorId,
          actorSource: e.actorSource,
          actor,
          action: e.action,
          targetId: e.targetId,
          payload: sanitizeAuditPayload(e.payload),
          createdAt: e.createdAt.toISOString(),
        };
      }),
    },
    {
      headers: {
        // Owner-scoped IDOR-gated; short cache.
        'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=60',
      },
    },
  );
}
