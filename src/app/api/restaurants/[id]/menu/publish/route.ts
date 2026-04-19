import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';

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

  const b = body as { menuPublished?: unknown };
  if (typeof b.menuPublished !== 'boolean') {
    return NextResponse.json({ error: 'menuPublished zorunludur' }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { id }, select: { menuEnabled: true } });
  if (!restaurant) return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });

  if (b.menuPublished && !restaurant.menuEnabled) {
    return NextResponse.json({ error: 'Menü özelliği yönetici tarafından devre dışı bırakıldı' }, { status: 403 });
  }

  const updated = await prisma.restaurant.update({
    where: { id },
    data: {
      menuPublished: b.menuPublished,
      menuUpdatedAt: new Date(),
    },
    select: { id: true, menuPublished: true, menuEnabled: true, menuUpdatedAt: true },
  });
  return NextResponse.json({ restaurant: updated });
}
