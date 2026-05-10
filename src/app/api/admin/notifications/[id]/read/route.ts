// Stage 29 §38.105 — admin notification single mark-as-read endpoint.
//
// AdminNotificationBell dropdown panel'inde notification click → mark-as-read
// + click-through. Broadcast notifications use per-admin read receipts so one
// admin reading a broadcast does not hide it for everyone else.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Notification must be admin's own OR broadcast (admin görebileceği). Aksi
  // halde 403 (başka admin'in targeted notification'ı).
  const notification = await prisma.adminNotification.findUnique({
    where: { id },
    select: {
      id: true,
      adminId: true,
      readAt: true,
      reads: {
        where: { adminId: typeof admin.id === 'string' ? admin.id : '' },
        select: { readAt: true },
        take: 1,
      },
    },
  });
  if (!notification) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) {
    return NextResponse.json({ error: 'invalid_actor' }, { status: 401 });
  }
  if (notification.adminId !== null && notification.adminId !== adminId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (notification.adminId === null) {
    if (notification.reads[0]?.readAt) {
      return NextResponse.json({ ok: true, alreadyRead: true });
    }
    await prisma.adminNotificationRead.upsert({
      where: {
        notificationId_adminId: {
          notificationId: id,
          adminId,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        notificationId: id,
        adminId,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (notification.readAt) {
    return NextResponse.json({ ok: true, alreadyRead: true });
  }
  await prisma.adminNotification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
