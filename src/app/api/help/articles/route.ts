import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaticHelpArticle, getStaticHelpArticles, searchStaticHelpArticles } from '@/lib/help-articles';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const localeParam = searchParams.get('locale');
  const locale = localeParam === 'en' ? 'en' : 'tr';
  const category = searchParams.get('category')?.trim() || undefined;
  const slug = searchParams.get('slug')?.trim() || undefined;
  // Cap length (audit §38.B) — bounds the ILIKE term passed to Postgres.
  const search = searchParams.get('search')?.trim().slice(0, 100) || undefined;

  if (slug) {
    let article = null;
    try {
      article = await prisma.helpArticle.findUnique({
        where: { slug_locale: { slug, locale } },
      });
    } catch {
      article = null;
    }
    article = article ?? getStaticHelpArticle(locale, slug);
    if (!article || !article.isPublished) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ data: article });
  }

  // Search mode — return a flat result list, not grouped-by-category.
  if (search) {
    const q = search.toLowerCase();
    let results: {
      id: string;
      slug: string;
      locale: string;
      category: string;
      title: string;
      excerpt: string | null;
      updatedAt: Date;
    }[] = [];
    try {
      results = await prisma.helpArticle.findMany({
        where: {
          isPublished: true,
          locale,
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { excerpt: { contains: search, mode: 'insensitive' } },
            { searchTags: { has: q } },
          ],
        },
        orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
        take: 30,
        select: {
          id: true,
          slug: true,
          locale: true,
          category: true,
          title: true,
          excerpt: true,
          updatedAt: true,
        },
      });
    } catch {
      results = [];
    }
    if (results.length === 0) {
      results = searchStaticHelpArticles(locale, search).map((article) => ({
        id: article.id,
        slug: article.slug,
        locale: article.locale,
        category: article.category,
        title: article.title,
        excerpt: article.excerpt,
        updatedAt: article.updatedAt,
      }));
    }
    return NextResponse.json({ query: search, count: results.length, results });
  }

  let articles: {
    id: string;
    slug: string;
    locale: string;
    category: string;
    title: string;
    excerpt: string | null;
    order: number;
    updatedAt: Date;
  }[] = [];
  try {
    articles = await prisma.helpArticle.findMany({
      where: {
        isPublished: true,
        locale,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
      select: {
        id: true,
        slug: true,
        locale: true,
        category: true,
        title: true,
        excerpt: true,
        order: true,
        updatedAt: true,
      },
    });
  } catch {
    articles = [];
  }
  if (articles.length === 0) {
    articles = getStaticHelpArticles(locale, category).map((article) => ({
      id: article.id,
      slug: article.slug,
      locale: article.locale,
      category: article.category,
      title: article.title,
      excerpt: article.excerpt,
      order: article.order,
      updatedAt: article.updatedAt,
    }));
  }

  const categoryMap = new Map<string, typeof articles>();
  for (const article of articles) {
    const bucket = categoryMap.get(article.category) ?? [];
    bucket.push(article);
    categoryMap.set(article.category, bucket);
  }

  const categories = Array.from(categoryMap.entries()).map(([slug, items]) => ({
    slug,
    count: items.length,
    articles: items,
  }));

  return NextResponse.json({ locale, categories });
}
