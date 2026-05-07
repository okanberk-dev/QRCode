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

  // Feed scope: admin'e atanan + broadcast (adminId IS NULL).
  const where: Prisma.AdminNotificationWhereInput = {
    OR: [{ adminId }, { adminId: null }],
    ...(unreadOnly === 'true' ? { readAt: null } : {}),
  };

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
      },
    }),
    prisma.adminNotification.count({ where }),
    prisma.adminNotification.count({
      where: {
        OR: [{ adminId }, { adminId: null }],
        readAt: null,
      },
    }),
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
        readAt: n.readAt?.toISOString() ?? null,
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

// Mark all admin's unread notifications as read. Broadcast notifications
// (adminId=null) için per-admin readAt state taşıyamıyoruz (single row
// shared); bu MVP scope dışı (gelecek: AdminNotificationRead pivot tablo).
// Şu an mark-all sadece per-admin notifications (adminId=actor.id) için
// readAt set eder; broadcast intact (her admin için unread görünebilir
// ama listede göründüğü için actually read accept edilir UX-wise).
//
// Pratik trade-off: broadcast notifications mark-as-read state cross-admin
// drift olur; gerçek hayatta campaign moderation broadcast'i 1-2 saatte bir
// tetiklenir, drift kabul edilebilir.
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) {
    return NextResponse.json({ error: 'invalid_actor' }, { status: 401 });
  }
  const result = await prisma.adminNotification.updateMany({
    where: { adminId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true, updatedCount: result.count });
}
