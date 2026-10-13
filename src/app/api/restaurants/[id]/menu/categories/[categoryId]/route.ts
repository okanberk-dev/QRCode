import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMenuModuleAccess, touchMenuUpdated } from '@/lib/menu-access';
import { validateMenuCategory } from '@/lib/validations';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; categoryId: string }> }) {
  const { id, categoryId } = await params;
  const gate = await requireMenuModuleAccess(req, id);
  if (!gate.ok) return gate.res;

  const existing = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
  // Treat soft-deleted rows as not found — prevents zombie writes that
  // would silently revive a category the user thought was gone.
  if (!existing || existing.restaurantId !== id || existing.deletedAt) {
    return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const parsed = validateMenuCategory(body, { partial: true });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const category = await prisma.menuCategory.update({
    where: { id: categoryId },
    data: parsed.data,
  });
  await touchMenuUpdated(id);
  return NextResponse.json({ category });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; categoryId: string }> }) {
  const { id, categoryId } = await params;
  const gate = await requireMenuModuleAccess(req, id);
  if (!gate.ok) return gate.res;

  // Only the exact string 'true' opts in — anything else is ignored, so a
  // stray `?deleteItems=1` can never delete products by accident.
  const deleteItems = new URL(req.url).searchParams.get('deleteItems') === 'true';

  const existing = await prisma.menuCategory.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { items: { where: { deletedAt: null } } } } },
  });
  if (!existing || existing.restaurantId !== id || existing.deletedAt) {
    return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
  }

  if (deleteItems) {
    // Delete the category together with its products, atomically. Soft delete
    // like everywhere else in the menu (no restore UI; the confirmation tells
    // the owner it cannot be undone). Analytics events keep their product ids.
    const deletedAt = new Date();
    const [removedItems] = await prisma.$transaction([
      prisma.menuItem.updateMany({
        where: { categoryId, restaurantId: id, deletedAt: null },
        data: { deletedAt },
      }),
      prisma.menuCategory.update({
        where: { id: categoryId },
        data: { deletedAt },
        select: { id: true },
      }),
    ]);
    await touchMenuUpdated(id);
    return NextResponse.json({ success: true, deletedItems: removedItems.count });
  }

  if (existing._count.items > 0) {
    return NextResponse.json(
      {
        error: 'Kategoride aktif ürünler var. Önce taşıyın veya silin.',
        code: 'CATEGORY_NOT_EMPTY',
        itemCount: existing._count.items,
      },
      { status: 409 },
    );
  }

  // Soft delete to mirror MenuItem behavior; preserves history and avoids
  // FK churn on the Restrict relation. Hard delete is a separate ops job.
  await prisma.menuCategory.update({
    where: { id: categoryId },
    data: { deletedAt: new Date() },
  });
  await touchMenuUpdated(id);
  return NextResponse.json({ success: true });
}
