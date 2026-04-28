import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiErrors, getErrorCode } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { sanitizeBlogContent } from '@/lib/blog-content';

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

// GET - fetch one post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  try {
    const { id } = await params;
    // Explicit select — admin blog edit form consumes every field, but
    // pinning them keeps this route resilient to schema/DB drift on
    // unrelated columns added in future migrations (CLAUDE.md §14.1).
    const post = await prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        locale: true,
        title: true,
        description: true,
        content: true,
        date: true,
        readTime: true,
        author: true,
        coverImage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!post) {
      return ApiErrors.notFound('Blog yazısı bulunamadı');
    }
    return NextResponse.json({ post });
  } catch (error) {
    console.error('[API blog GET id]', error);
    return ApiErrors.internalError('Blog yazısı çekilemedi');
  }
}

const VALID_LOCALES = new Set(['tr', 'en']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function estimateReadTime(content: string, locale: string) {
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 1;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return locale === 'en' ? `${minutes} min read` : `${minutes} dk okuma`;
}

function normalizeBlogPayload(body: Record<string, unknown>) {
  const slug = normalizeText(body.slug).toLowerCase();
  const locale = normalizeText(body.locale, 'tr').toLowerCase();
  const title = normalizeText(body.title);
  const description = normalizeText(body.description);
  const content = sanitizeBlogContent(normalizeText(body.content));
  const date = normalizeText(
    body.date,
    new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  );
  const readTime = normalizeText(body.readTime, estimateReadTime(content, locale));
  const author = normalizeText(body.author, 'Buaze İçerik Ekibi');
  const coverImage = normalizeText(body.coverImage);
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

  if (!slug || !locale || !title || !description || !content) {
    return { ok: false as const, error: 'Slug, dil, başlık, açıklama ve içerik zorunludur.' };
  }
  if (!VALID_LOCALES.has(locale)) {
    return { ok: false as const, error: 'Dil sadece tr veya en olabilir.' };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false as const, error: 'Slug sadece küçük harf, sayı ve tire içermeli.' };
  }
  if (title.length > 180 || description.length > 280 || author.length > 120) {
    return { ok: false as const, error: 'Başlık, açıklama veya yazar alanı çok uzun.' };
  }
  if (coverImage && !/^https?:\/\//i.test(coverImage) && !coverImage.startsWith('/')) {
    return { ok: false as const, error: 'Kapak görseli http(s) veya site içi / yoluyla başlamalı.' };
  }

  return {
    ok: true as const,
    data: { slug, locale, title, description, content, date, readTime, author, coverImage, isActive },
  };
}

// PUT - update existing post
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  try {
    const { id } = await params;
    const body = await req.json();
    const payload = normalizeBlogPayload(body);

    if (!payload.ok) {
      return ApiErrors.badRequest(payload.error, 'INVALID_BLOG_PAYLOAD');
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: payload.data,
    });

    return NextResponse.json({ post });
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
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
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return ApiErrors.notFound('Blog yazısı bulunamadı');
    }
    console.error('[API blog DELETE]', error);
    return ApiErrors.internalError('Blog yazısı silinemedi');
  }
}
