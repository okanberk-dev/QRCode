import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess, touchMenuUpdated } from '@/lib/menu-access';
import { validateMenuItem } from '@/lib/validations';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const existing = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.restaurantId !== id || existing.deletedAt) {
    return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const parsed = validateMenuItem(body, { partial: true });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (parsed.data.categoryId) {
    const cat = await prisma.menuCategory.findUnique({ where: { id: parsed.data.categoryId } });
    if (!cat || cat.restaurantId !== id) {
      return NextResponse.json({ error: 'Kategori bu restorana ait değil' }, { status: 400 });
    }
  }

  // When moving an item to a different category, drop it at the end of the
  // target category unless an explicit sortOrder was supplied. Otherwise the
  // item keeps its old numeric sortOrder which may collide with existing ones.
  const targetCategoryId = parsed.data.categoryId;
  if (targetCategoryId && targetCategoryId !== existing.categoryId && parsed.data.sortOrder === undefined) {
    const last = await prisma.menuItem.findFirst({
      where: { categoryId: targetCategoryId, deletedAt: null, id: { not: itemId } },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    parsed.data.sortOrder = last ? last.sortOrder + 1 : 0;
  }

  const item = await prisma.menuItem.update({
    where: { id: itemId },
    data: parsed.data,
  });
  await touchMenuUpdated(id);
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const existing = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.restaurantId !== id) {
    return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
  }

  await prisma.menuItem.update({
    where: { id: itemId },
    data: { deletedAt: new Date() },
  });
  await touchMenuUpdated(id);
  return NextResponse.json({ success: true });
}
