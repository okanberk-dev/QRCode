import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { sanitizeBlogContent } from '@/lib/blog-content';
import { revalidateBlog } from '@/lib/marketing-revalidate';

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

function nullableText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const tag = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').slice(0, 40);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 12) break;
  }
  return out;
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

  // Optional public-render overrides — null when blank, fall back to defaults.
  const authorBio = nullableText(body.authorBio, 320);
  const authorRole = nullableText(body.authorRole, 60);
  const tags = normalizeTags(body.tags);
  const pullQuote = nullableText(body.pullQuote, 320);
  const pullQuoteAuthor = nullableText(body.pullQuoteAuthor, 80);
  const ctaTitle = nullableText(body.ctaTitle, 140);
  const ctaSubtitle = nullableText(body.ctaSubtitle, 200);
  const ctaButtonLabel = nullableText(body.ctaButtonLabel, 40);

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
    data: {
      slug,
      locale,
      title,
      description,
      content,
      date,
      readTime,
      author,
      coverImage,
      authorBio,
      authorRole,
      tags,
      pullQuote,
      pullQuoteAuthor,
      ctaTitle,
      ctaSubtitle,
      ctaButtonLabel,
    },
  };
}

// GET - list all posts
export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const locale = searchParams.get('locale');
    const search = searchParams.get('search')?.trim();
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {};
    if (locale && VALID_LOCALES.has(locale)) {
      where.locale = locale;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Stage 108 §38.188 — Promise.all → $transaction (CLAUDE.md §40.1
    // Supabase pooler connection_limit=1 disipline).
    const [posts, total] = await prisma.$transaction([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json(
      {
        posts,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          // Stage 108 §38.188 — admin list edge cache (CLAUDE.md §40.6).
          // Blog post list mutates on admin create/edit/publish + ISR
          // revalidation already triggers public surface refresh; 60s fresh
          // + 5min SWR is plenty for the admin list view.
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
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
    const payload = normalizeBlogPayload(body);

    if (!payload.ok) {
      return ApiErrors.badRequest(payload.error, 'INVALID_BLOG_PAYLOAD');
    }

    const post = await prisma.blogPost.create({
      data: payload.data,
    });

    // Stage 83 §38.163 — invalidate blog ISR caches so the new post
    // appears on /blog and /blog/[slug] without waiting for the 1h
    // window. Fail-soft (helper swallows errors).
    revalidateBlog(post.slug);

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return ApiErrors.conflict('Bu slug ve dil kombinasyonuyla bir yazı zaten mevcut');
    }
    console.error('[API blog POST]', error);
    return ApiErrors.internalError('Blog yazısı oluşturulamadı');
  }
}
