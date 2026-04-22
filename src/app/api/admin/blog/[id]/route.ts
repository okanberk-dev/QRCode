import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';

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

// PUT - update existing post
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  try {
    const { id } = await params;
    const body = await req.json();
    const { slug, locale, title, description, content, date, readTime, author, coverImage, isActive } = body;

    const post = await prisma.blogPost.update({
      where: { id },
      data: { slug, locale, title, description, content, date, readTime, author, coverImage, isActive },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return ApiErrors.notFound('Blog yazısı bulunamadı');
    }
    console.error('[API blog PUT]', error);
    return ApiErrors.internalError('Blog yazısı güncellenemedi');
  }
}

// DELETE - remove post
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  try {
    const { id } = await params;
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return ApiErrors.notFound('Blog yazısı bulunamadı');
    }
    console.error('[API blog DELETE]', error);
    return ApiErrors.internalError('Blog yazısı silinemedi');
  }
}
