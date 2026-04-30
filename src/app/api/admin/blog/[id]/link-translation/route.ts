import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Link two blog posts as TR/EN translations of each other.
 * They will share a translationGroupId so the public locale switcher
 * and 404 fallback can resolve the counterpart from the DB.
 *
 * Constraints (enforced):
 *  - Both posts exist
 *  - Posts must be in different locales (one TR, one EN)
 *  - If either post is already in a group, it gets reassigned to the new
 *    pair (old links are broken — admin gets the latest intent).
 *
 * Body: { otherId: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const otherId = typeof body?.otherId === 'string' ? body.otherId : '';

  if (!otherId) {
    return NextResponse.json({ error: 'otherId zorunludur.' }, { status: 400 });
  }
  if (otherId === id) {
    return NextResponse.json(
      { error: 'Yazıyı kendisine bağlayamazsınız.' },
      { status: 400 },
    );
  }

  try {
    const [a, b] = await Promise.all([
      prisma.blogPost.findUnique({ where: { id }, select: { id: true, locale: true } }),
      prisma.blogPost.findUnique({ where: { id: otherId }, select: { id: true, locale: true } }),
    ]);
    if (!a || !b) {
      return ApiErrors.notFound('Yazılardan biri bulunamadı');
    }
    if (a.locale === b.locale) {
      return NextResponse.json(
        { error: 'Aynı dildeki iki yazı eşleştirilemez.' },
        { status: 400 },
      );
    }

    const groupId = randomBytes(12).toString('hex');
    await prisma.$transaction([
      prisma.blogPost.update({ where: { id: a.id }, data: { translationGroupId: groupId } }),
      prisma.blogPost.update({ where: { id: b.id }, data: { translationGroupId: groupId } }),
    ]);
    return NextResponse.json({ success: true, translationGroupId: groupId });
  } catch (error) {
    console.error('[blog link-translation] failed', error);
    return ApiErrors.internalError('Eşleştirilemedi');
  }
}

/** Unlink — clears translationGroupId on this post only (the counterpart
 *  keeps the group as orphaned single-post; admin can re-link it later). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { id } = await params;
  try {
    await prisma.blogPost.update({
      where: { id },
      data: { translationGroupId: null },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2025') return ApiErrors.notFound('Yazı bulunamadı');
    console.error('[blog unlink-translation] failed', error);
    return ApiErrors.internalError('Bağlantı kaldırılamadı');
  }
}
