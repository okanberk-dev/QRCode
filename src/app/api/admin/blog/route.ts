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

// GET - list all posts
export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const locale = searchParams.get('locale');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (locale) {
      where.locale = locale;
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('[API blog GET]', error);
    return ApiErrors.internalError('Blog yazıları çekilemedi');
  }
}

// POST - create new post
export async function POST(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  try {
    const body = await req.json();
    const { slug, locale, title, description, content, date, readTime, author, coverImage } = body;

    if (!slug || !locale || !title || !content) {
      return ApiErrors.badRequest('Gerekli alanlar eksik', 'MISSING_FIELDS');
    }

    const post = await prisma.blogPost.create({
      data: { slug, locale, title, description, content, date, readTime, author, coverImage },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return ApiErrors.conflict('Bu slug ve dil kombinasyonuyla bir yazı zaten mevcut');
    }
    console.error('[API blog POST]', error);
    return ApiErrors.internalError('Blog yazısı oluşturulamadı');
  }
}
