// Stage 29 §38.105 — admin in-app notification feed endpoint.
//
// AdminNotificationBell (Phase H) bu endpoint'i polling ile (60s) tüketir.
// Owner /api/notifications (CLAUDE.md §38.100) paterni paralel: private 15s/60sw
// cache, mark-as-read endpoint ayrı `[id]/read`, bulk mark-all POST burada.
//
// Auth: getAdminFromRequest only (no RBAC — kendine + broadcast notifications,
// her admin kendi feed'ini görür). Filter: WHERE adminId=actor.id OR
// adminId IS NULL (broadcast).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { serializeAdminNotificationReadAt } from '@/lib/admin-notification-read-state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const QuerySchema = z
  .object({
    unreadOnly: z.enum(['true', 'false']).optional().default('false'),
    page: z.coerce.number().int().min(1).max(10000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strict();

const ADMIN_FEED_CACHE_HEADER = 'private, s-maxage=15, stale-while-revalidate=60';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const queryRaw = {
    unreadOnly: url.searchParams.get('unreadOnly') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  };
  const parsed = QuerySchema.safeParse(queryRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { unreadOnly, page, limit } = parsed.data;

  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) {
    return NextResponse.json({ error: 'invalid_actor' }, { status: 401 });
  }

  const feedWhere: Prisma.AdminNotificationWhereInput = {
    OR: [{ adminId }, { adminId: null }],
  };
  const unreadWhere: Prisma.AdminNotificationWhereInput = {
    OR: [
      { adminId, readAt: null },
      { adminId: null, reads: { none: { adminId } } },
    ],
  };
  const where = unreadOnly === 'true' ? unreadWhere : feedWhere;

  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        adminId: true,
        type: true,
        title: true,
        body: true,
        payload: true,
        readAt: true,
        createdAt: true,
        reads: {
          where: { adminId },
          select: { readAt: true },
          take: 1,
        },
      },
    }),
    prisma.adminNotification.count({ where }),
    prisma.adminNotification.count({ where: unreadWhere }),
  ]);

  return NextResponse.json(
    {
      notifications: notifications.map((n) => ({
        id: n.id,
        adminId: n.adminId,
        type: n.type,
        title: n.title,
        body: n.body,
        payload: n.payload,
        readAt: serializeAdminNotificationReadAt(n),
        createdAt: n.createdAt.toISOString(),
      })),
      page,
      limit,
      total,
      unreadCount,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    {
      headers: { 'Cache-Control': ADMIN_FEED_CACHE_HEADER },
    },
  );
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) {
    return NextResponse.json({ error: 'invalid_actor' }, { status: 401 });
  }
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const targeted = await tx.adminNotification.updateMany({
      where: { adminId, readAt: null },
      data: { readAt: now },
    });
    const broadcastUnread = await tx.adminNotification.findMany({
      where: {
        adminId: null,
        reads: { none: { adminId } },
      },
      select: { id: true },
    });
    if (broadcastUnread.length > 0) {
      await tx.adminNotificationRead.createMany({
        data: broadcastUnread.map((notification) => ({
          notificationId: notification.id,
          adminId,
          readAt: now,
        })),
        skipDuplicates: true,
      });
    }
    return {
      targetedCount: targeted.count,
      broadcastCount: broadcastUnread.length,
    };
  });

  return NextResponse.json({
    ok: true,
    updatedCount: result.targetedCount + result.broadcastCount,
  });
}
