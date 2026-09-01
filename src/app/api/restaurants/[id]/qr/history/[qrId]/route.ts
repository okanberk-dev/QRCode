import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';

/**
 * Delete a QR history signature. The QrGeneration table is an audit log
 * of QRs the panel produced — removing rows only hides them from the
 * panel's "Son üretilenler" list. The QR image and the URL it encodes
 * (e.g. `/r/<slug>?platform=...&table=...`) keep working independently;
 * a printed QR sticker in the field is unaffected.
 *
 * IDOR-safe: caller must satisfy `canAccessRestaurant`, and we verify
 * the row's restaurantId matches the path param so a cross-tenant id
 * smuggled into the URL can't delete someone else's history.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qrId: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { id, qrId } = await params;

  try {
    // §38.238 — this is a DELETE, so it needs the write gate.
    // `canAccessRestaurant` is a read scope check that passes `viewer`
    // team members, who could therefore erase QR history rows.
    // `canWriteRestaurant` applies the established `role !== 'viewer'` rule.
    const hasAccess = await canWriteRestaurant(actor, id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const row = await prisma.qrGeneration.findUnique({
      where: { id: qrId },
      select: {
        id: true,
        restaurantId: true,
        tableNumber: true,
        platform: true,
        serviceType: true,
        type: true,
      },
    });
    if (!row) {
      return NextResponse.json({ error: 'QR kaydı bulunamadı' }, { status: 404 });
    }
    if (row.restaurantId !== id) {
      // Cross-tenant access attempt — same shape as 404 to avoid leaking
      // existence of foreign rows.
      return NextResponse.json({ error: 'QR kaydı bulunamadı' }, { status: 404 });
    }

    await prisma.qrGeneration.deleteMany({
      where: {
        restaurantId: id,
        tableNumber: row.tableNumber,
        platform: row.platform,
        serviceType: row.serviceType,
        type: row.type,
      },
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // P2025 — concurrent delete (already gone). Idempotent: report success.
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ success: true }, { status: 200 });
    }
    console.error('QR delete error:', error);
    return NextResponse.json({ error: 'QR silinemedi' }, { status: 500 });
  }
}
