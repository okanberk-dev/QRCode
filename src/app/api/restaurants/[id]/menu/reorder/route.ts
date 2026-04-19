import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess, touchMenuUpdated } from '@/lib/menu-access';
import { validateReorder } from '@/lib/validations';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const parsed = validateReorder(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { categories, items } = parsed;
  if (categories.length === 0 && items.length === 0) {
    return NextResponse.json({ success: true });
  }

  try {
    await prisma.$transaction([
      ...categories.map((c) =>
        prisma.menuCategory.updateMany({
          where: { id: c.id, restaurantId: id },
          data: { sortOrder: c.sortOrder },
        }),
      ),
      ...items.map((it) =>
        prisma.menuItem.updateMany({
          where: { id: it.id, restaurantId: id },
          data: { sortOrder: it.sortOrder },
        }),
      ),
    ]);
    await touchMenuUpdated(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[menu reorder]', error);
    return NextResponse.json({ error: 'Sıralama güncellenemedi' }, { status: 500 });
  }
}
