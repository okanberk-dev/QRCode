import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { validateAnnouncement } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { ApiErrors } from '@/lib/api-errors';

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return { ok: false as const, res: ApiErrors.unauthorized() };
  }
  if (admin.role !== 'superadmin') {
    return { ok: false as const, res: ApiErrors.forbidden() };
  }
  return { ok: true as const, admin };
}

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;

  try {
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.announcement.count(),
    ]);

    return NextResponse.json({
      announcements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('[API announcements GET]', error);
    return ApiErrors.internalError('Duyurular çekilemedi');
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.badRequest('Geçersiz JSON', 'INVALID_JSON');
  }

  const result = validateAnnouncement(body);
  if (!result.ok) return ApiErrors.badRequest(result.error, 'VALIDATION_ERROR');

  try {
    const createdBy = typeof gate.admin.id === 'string' ? gate.admin.id : null;
    const announcement = await prisma.announcement.create({
      data: { ...result.data, createdBy },
    });
    revalidatePath('/[locale]/dashboard', 'layout');
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('[API announcements POST]', error);
    return ApiErrors.internalError('Duyuru oluşturulamadı');
  }
}
