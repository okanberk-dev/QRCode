import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const body: unknown = await req.json().catch(() => null);
  // JSON `null` / primitives parsed fine but then crashed on
  // `(null).menuPublished` → 500.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
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
    select: { id: true, slug: true, menuPublished: true, menuEnabled: true, menuUpdatedAt: true },
  });
  // Stage 27 §38.103 Fix M2 — publish state public menu görünürlük değişimi
  // (menuPublished false → true / true → false). 1 saat ISR window stale
  // kalmasın diye instant invalidate. touchMenuUpdated kullanılmadığı için
  // inline çağrı (CLAUDE.md §7 — bu callsite-specific durum, helper drift
  // gerekmiyor).
  if (updated.slug) {
    revalidatePath(`/menu/${updated.slug}`);
  }
  return NextResponse.json({ restaurant: updated });
}
