import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { validateAnnouncement } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return { ok: false as const, res: NextResponse.json({ error: 'Yetkisiz erişim' }, { status: admin ? 403 : 401 }) };
  }
  return { ok: true as const, admin };
}

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const announcements = await prisma.announcement.findMany({
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const result = validateAnnouncement(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const createdBy = typeof gate.admin.id === 'string' ? gate.admin.id : null;
    const announcement = await prisma.announcement.create({
      data: { ...result.data, createdBy },
    });
    revalidatePath('/[locale]/dashboard', 'layout');
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('[API announcements POST]', error);
    return NextResponse.json({ error: 'Duyuru oluşturulamadı' }, { status: 500 });
  }
}
