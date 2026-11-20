import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireMenuModuleAccess, touchMenuUpdated } from '@/lib/menu-access';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { canRestore, restoreCutoff, type RestoreSkipCode } from '@/lib/menu-restore';

/**
 * POST /api/restaurants/[id]/menu/restore — "Geri al" for menu deletes.
 *
 * Menu items and categories are soft-deleted. For 30 minutes after a delete
 * (`MENU_RESTORE_WINDOW_MS`) the builder's undo can bring them back:
 *
 * - `{ categoryId }` restores a deleted category together with exactly the
 *   items that were deleted WITH it (the `?deleteItems=true` cascade writes one
 *   shared `deletedAt` in one transaction). Items deleted earlier on their own
 *   stay deleted. Already active → 200 (idempotent). Window passed → 410
 *   `RESTORE_EXPIRED`. Missing / other restaurant → 404 `NOT_FOUND`.
 * - `{ itemIds }` (1..100, a bulk delete) restores each item that can be
 *   restored and reports the rest in `skipped` (`NOT_FOUND`, `RESTORE_EXPIRED`,
 *   `CATEGORY_DELETED`). Restored items keep their `categoryId` and `sortOrder`.
 *
 * Gate: write access + menu module switch (viewer 403 `forbidden_role`,
 * module off 403 `MENU_MODULE_DISABLED`, admins bypass the switch).
 * Every query is scoped to the restaurant in the URL and uses an explicit select.
 */

const BodySchema = z.union([
  z.object({ itemIds: z.array(z.string().min(1).max(128)).min(1).max(100) }).strict(),
  z.object({ categoryId: z.string().min(1).max(128) }).strict(),
]);

type RestoreBody = z.infer<typeof BodySchema>;

const ITEM_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
  priceCents: true,
  currency: true,
  imageUrl: true,
  badges: true,
  allergens: true,
  isAvailable: true,
  isOutOfStock: true,
  sortOrder: true,
} as const;

const ITEM_ORDER = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireMenuModuleAccess(req, id);
  if (!gate.ok) return gate.res;

  const limit = await rateLimit(`menu:restore:${gate.actor.id}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = validateBody<RestoreBody>(BodySchema, body);
  if (!parsed.ok) return parsed.response;

  const now = new Date();
  if ('categoryId' in parsed.data) {
    return restoreCategory(id, parsed.data.categoryId, now);
  }
  return restoreItems(id, parsed.data.itemIds, now);
}

async function loadCategory(restaurantId: string, categoryId: string) {
  return prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      sortOrder: true,
      isVisible: true,
      items: { where: { deletedAt: null }, orderBy: ITEM_ORDER, select: ITEM_SELECT },
    },
  });
}

async function restoreCategory(restaurantId: string, categoryId: string, now: Date) {
  const existing = await prisma.menuCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, restaurantId: true, deletedAt: true },
  });
  if (!existing || existing.restaurantId !== restaurantId) {
    return NextResponse.json({ error: 'Kategori bulunamadı', code: 'NOT_FOUND' }, { status: 404 });
  }

  const check = canRestore(existing.deletedAt, now);
  if (check === 'expired') {
    return NextResponse.json({ error: 'Geri alma süresi doldu', code: 'RESTORE_EXPIRED' }, { status: 410 });
  }

  if (check === 'ok' && existing.deletedAt) {
    const deletedAt = existing.deletedAt;
    await prisma.$transaction([
      // Only the cascade: rows deleted in the same transaction share this exact timestamp.
      prisma.menuItem.updateMany({
        where: { categoryId, restaurantId, deletedAt },
        data: { deletedAt: null },
      }),
      prisma.menuCategory.updateMany({
        where: { id: categoryId, restaurantId, deletedAt },
        data: { deletedAt: null },
      }),
    ]);
    await touchMenuUpdated(restaurantId);
  }

  const category = await loadCategory(restaurantId, categoryId);
  if (!category) {
    // Deleted again between the update and the read.
    return NextResponse.json({ error: 'Kategori bulunamadı', code: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.json({ category });
}

async function restoreItems(restaurantId: string, requestedIds: string[], now: Date) {
  const ids = Array.from(new Set(requestedIds));
  const rows = await prisma.menuItem.findMany({
    where: { id: { in: ids }, restaurantId },
    select: { id: true, deletedAt: true, category: { select: { deletedAt: true } } },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  const eligible: string[] = [];
  const alreadyActive: string[] = [];
  const skipped: { id: string; code: RestoreSkipCode }[] = [];

  for (const itemId of ids) {
    const row = byId.get(itemId);
    if (!row) {
      skipped.push({ id: itemId, code: 'NOT_FOUND' });
      continue;
    }
    const check = canRestore(row.deletedAt, now);
    if (check === 'active') alreadyActive.push(itemId);
    else if (check === 'expired') skipped.push({ id: itemId, code: 'RESTORE_EXPIRED' });
    else if (row.category.deletedAt) skipped.push({ id: itemId, code: 'CATEGORY_DELETED' });
    else eligible.push(itemId);
  }

  if (eligible.length > 0) {
    const result = await prisma.menuItem.updateMany({
      where: {
        id: { in: eligible },
        restaurantId,
        // Same rules as the classification above, re-checked in the write.
        deletedAt: { not: null, gte: restoreCutoff(now) },
        category: { deletedAt: null },
      },
      data: { deletedAt: null },
    });
    if (result.count > 0) await touchMenuUpdated(restaurantId);
  }

  const order = [...eligible, ...alreadyActive];
  const restored =
    order.length > 0
      ? await prisma.menuItem.findMany({
          where: { id: { in: order }, restaurantId, deletedAt: null },
          select: ITEM_SELECT,
        })
      : [];
  const position = new Map(order.map((itemId, index) => [itemId, index]));
  restored.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));

  return NextResponse.json({ items: restored, skipped });
}
