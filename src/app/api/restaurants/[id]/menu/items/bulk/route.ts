import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireMenuModuleAccess, touchMenuUpdated } from '@/lib/menu-access';
import { validateMenuItem } from '@/lib/validations';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { MENU_BULK_MAX_ITEMS } from '@/lib/menu-bulk-parse';

/**
 * POST /api/restaurants/[id]/menu/items/bulk — "Liste yapıştır".
 *
 * Adds up to 30 items to ONE category in a single atomic request, instead of
 * 30 sequential POSTs (each of which paid a membership check, an ordering
 * query, a `menu_updated_at` write and a cache revalidation, and could stop
 * half way). Either every item is created or none is.
 *
 * - Gate: write access + menu module switch (viewers 403, module off 403).
 * - The body shape is checked with Zod (`.strict()`: no stray fields); every
 *   item then goes through the SAME rules as the single-item POST
 *   (`validateMenuItem`) and only its cleaned output is written.
 * - Ordering is decided on the server: items are appended after the
 *   category's current last `sortOrder`, in the order they were sent, so a
 *   stale client can never collide with existing rows.
 */

const ItemSchema = z
  .object({
    // Length/whitespace rules live in `validateMenuItem` (the single source of
    // truth); this only bounds what we are willing to look at.
    name: z.string().max(1000),
    priceCents: z.number().int(),
  })
  .strict();

const BodySchema = z
  .object({
    categoryId: z.string().min(1).max(128),
    items: z.array(ItemSchema).min(1).max(MENU_BULK_MAX_ITEMS),
  })
  .strict();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireMenuModuleAccess(req, id);
  if (!gate.ok) return gate.res;

  const limit = await rateLimit(`menu:bulk:${gate.actor.id}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = validateBody(BodySchema, body);
  if (!parsed.ok) return parsed.response;
  const { categoryId, items } = parsed.data;

  // Same rules as the single-item POST; keep only the cleaned output.
  const cleaned: { name: string; priceCents: number }[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const result = validateMenuItem({
      name: items[index].name,
      priceCents: items[index].priceCents,
      categoryId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, index }, { status: 400 });
    }
    cleaned.push({ name: result.data.name!, priceCents: result.data.priceCents! });
  }

  const created = await prisma.$transaction(async (tx) => {
    const category = await tx.menuCategory.findUnique({
      where: { id: categoryId },
      select: { restaurantId: true, deletedAt: true }, // §14.1 defensive select
    });
    if (!category || category.restaurantId !== id || category.deletedAt) return null;

    const last = await tx.menuItem.findFirst({
      where: { categoryId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const base = last ? last.sortOrder + 10 : 0; // same rule as the single POST

    return tx.menuItem.createManyAndReturn({
      data: cleaned.map((item, i) => ({
        restaurantId: id,
        categoryId,
        name: item.name,
        priceCents: item.priceCents,
        currency: 'TRY',
        sortOrder: base + i * 10,
      })),
    });
  });

  if (!created) {
    return NextResponse.json({ error: 'Kategori bu restorana ait değil' }, { status: 400 });
  }

  // One revalidation for the whole batch.
  await touchMenuUpdated(id);

  created.sort((a, b) => a.sortOrder - b.sortOrder);
  return NextResponse.json({ items: created }, { status: 201 });
}
