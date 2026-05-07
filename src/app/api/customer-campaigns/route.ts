// CLAUDE.md §38.99 — Customer email campaigns owner endpoint (list + create).
//
// Namespace: /api/customer-campaigns/* (NOT /api/campaigns — QR placement
// domain ayrı, CLAUDE.md §38.99 disipline). Bu endpoint owner panel
// `/dashboard/campaigns` UI tarafından tüketilir.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, getScopedRestaurantIds } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { writeAdminAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_SIZE = 20;
// Stage 29 §38.105 — moderation pipeline status'ları eklendi.
// 'draft'              owner kampanyayı yeni oluşturdu, henüz onaya
//                      göndermedi (compose modal kaydet)
// 'pending_approval'   owner submit etti, admin queue'da bekliyor
// 'approved'           admin onayladı, transient state — Resend pipeline
//                      çalışmaya başlar (kısa süreli, hızlıca 'sending')
// 'rejected'           admin reddetti, reviewerNote gerekçeyi taşır;
//                      owner revize edip yeniden submit edebilir (status
//                      transition: 'rejected' → 'draft' → 'pending_approval')
// 'sending'            Resend pipeline aktif, throttle ile teslim ediliyor
// 'sent'               tüm recipient'lere gönderildi (kısmi failedCount OK)
// 'failed'             pipeline fail (Resend outage, helper exception)
const VALID_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'sending',
  'sent',
  'failed',
] as const;

const ListQuerySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  status: z.enum(VALID_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1).optional(),
});

const CreateBodySchema = z
  .object({
    restaurantId: z.string().min(1),
    subject: z.string().min(1).max(150),
    body: z.string().min(1).max(10000),
    locale: z.enum(['tr', 'en']).default('tr').optional(),
  })
  .strict();

type CreateBody = z.infer<typeof CreateBodySchema>;

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const scopedIds = await getScopedRestaurantIds(actor);
  if (scopedIds === null || scopedIds.length === 0) {
    return NextResponse.json({ campaigns: [], page: 1, total: 0, pageSize: PAGE_SIZE });
  }

  const url = new URL(req.url);
  const queryRaw = {
    restaurantId: url.searchParams.get('restaurantId') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
  };
  const parsed = ListQuerySchema.safeParse(queryRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { restaurantId, status, page = 1 } = parsed.data;

  // IDOR — restaurantId filter zorunlu olarak scopedIds whitelist'inde olmalı.
  if (restaurantId && !scopedIds.includes(restaurantId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const where = {
    restaurantId: restaurantId ? restaurantId : { in: scopedIds },
    ...(status ? { status } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.customerEmailCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        restaurantId: true,
        subject: true,
        status: true,
        recipientCount: true,
        sentCount: true,
        failedCount: true,
        scheduledAt: true,
        sentAt: true,
        createdAt: true,
        restaurant: { select: { name: true } },
      },
    }),
    prisma.customerEmailCampaign.count({ where }),
  ]);

  const campaigns = items.map((c) => ({
    id: c.id,
    restaurantId: c.restaurantId,
    restaurantName: c.restaurant?.name ?? null,
    subject: c.subject,
    status: c.status,
    recipientCount: c.recipientCount,
    sentCount: c.sentCount,
    failedCount: c.failedCount,
    deliveryRate:
      c.recipientCount > 0
        ? Math.round((c.sentCount / Math.max(c.recipientCount - c.failedCount, 1)) * 1000) / 10
        : 0,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    sentAt: c.sentAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));

  return NextResponse.json(
    { campaigns, page, total, pageSize: PAGE_SIZE },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = validateBody<CreateBody>(CreateBodySchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // IDOR
  const access = await canAccessRestaurant(actor, data.restaurantId);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Admin master flag gate (CLAUDE.md §5.2 + §38.98).
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: data.restaurantId },
    select: { id: true, campaignsEnabled: true, name: true },
  });
  if (!restaurant) return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });
  if (!restaurant.campaignsEnabled) {
    return NextResponse.json({ error: 'campaigns_disabled' }, { status: 403 });
  }

  const campaign = await prisma.customerEmailCampaign.create({
    data: {
      restaurantId: data.restaurantId,
      subject: data.subject.trim(),
      body: data.body,
      status: 'draft',
      createdById: actor.id,
    },
    select: {
      id: true,
      restaurantId: true,
      subject: true,
      body: true,
      status: true,
      createdAt: true,
    },
  });

  await writeAdminAuditLog({
    actorId: actor.id,
    actorSource: actor.source,
    action: 'owner.campaigns.create',
    targetId: campaign.id,
    payload: {
      restaurantId: data.restaurantId,
      subjectPreview: data.subject.slice(0, 80),
    },
  }).catch(() => undefined);

  return NextResponse.json({ campaign }, { status: 201 });
}
