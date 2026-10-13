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

  if (b.menuPublished) {
    // Publishing: besides the module switch, the menu must show customers at
    // least one item — otherwise the QR leads to "Bu menüde henüz ürün yok".
    // "Shows" mirrors the public page's own filter (visible category, available
    // item; sold-out items are shown). One batch → one pooled connection
    // (CLAUDE.md §40.1).
    const [restaurant, publishableItems] = await prisma.$transaction([
      prisma.restaurant.findUnique({ where: { id }, select: { menuEnabled: true } }),
      prisma.menuItem.count({
        where: {
          restaurantId: id,
          deletedAt: null,
          isAvailable: true,
          category: { isVisible: true, deletedAt: null },
        },
      }),
    ]);
    if (!restaurant) return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
    if (!restaurant.menuEnabled) {
      // Same machine-readable code every other menu write returns while the
      // module is switched off, so the builder shows its "module closed" text.
      return NextResponse.json(
        { error: 'Menü özelliği yönetici tarafından devre dışı bırakıldı', code: 'MENU_MODULE_DISABLED' },
        { status: 403 },
      );
    }
    if (publishableItems === 0) {
      return NextResponse.json(
        { error: 'Yayına almak için en az bir ürün ekle.', code: 'MENU_EMPTY' },
        { status: 409 },
      );
    }
  } else {
    // Unpublishing is always allowed (even for an empty or disabled menu).
    const restaurant = await prisma.restaurant.findUnique({ where: { id }, select: { menuEnabled: true } });
    if (!restaurant) return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
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
