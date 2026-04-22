import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { validateAnnouncement } from '@/lib/validations';

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return { ok: false as const, res: NextResponse.json({ error: 'Yetkisiz erişim' }, { status: admin ? 403 : 401 }) };
  }
  return { ok: true as const };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const result = validateAnnouncement(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const announcement = await prisma.announcement.update({
      where: { id },
      data: result.data,
    });
    return NextResponse.json({ announcement });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Duyuru bulunamadı' }, { status: 404 });
    }
    console.error('[API announcements PATCH]', error);
    return NextResponse.json({ error: 'Duyuru güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const { id } = await params;
  try {
    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Duyuru bulunamadı' }, { status: 404 });
    }
    console.error('[API announcements DELETE]', error);
    return NextResponse.json({ error: 'Duyuru silinemedi' }, { status: 500 });
  }
}
