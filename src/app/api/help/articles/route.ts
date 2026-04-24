import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const localeParam = searchParams.get('locale');
  const locale = localeParam === 'en' ? 'en' : 'tr';
  const category = searchParams.get('category')?.trim() || undefined;
  const slug = searchParams.get('slug')?.trim() || undefined;
  const search = searchParams.get('search')?.trim() || undefined;

  if (slug) {
    const article = await prisma.helpArticle.findUnique({
      where: { slug_locale: { slug, locale } },
    });
    if (!article || !article.isPublished) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ data: article });
  }

  // Search mode — return a flat result list, not grouped-by-category.
  if (search) {
    const q = search.toLowerCase();
    const results = await prisma.helpArticle.findMany({
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
    return NextResponse.json({ query: search, count: results.length, results });
  }

  const articles = await prisma.helpArticle.findMany({
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
