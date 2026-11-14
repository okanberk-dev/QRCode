import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';
import { CATEGORY_BY_SLUG, HELP_CATEGORIES } from '@/lib/help-categories';
import {
  getStaticHelpArticle,
  getStaticHelpArticles,
  helpArticleSearchText,
  type StaticHelpArticle,
} from '@/lib/help-articles';
import { normalizeHelpSearchText } from '@/lib/help-search';

/**
 * Server-side data access for the help center pages.
 *
 * Articles come from two places: the static list in `src/lib/help-articles.ts`
 * and optional `help_articles` rows in the database. A database row with the
 * same slug replaces the static article (an unpublished row hides it). Rows
 * whose category no longer exists (for example the removed `api-webhook`
 * category) are ignored. Every query is wrapped in try/catch so the pages
 * still render from the static list when the table is missing.
 *
 * Wrapped in React `cache()` so generateMetadata and the page share one
 * lookup per request. Queries run one after another (Supabase pooler has
 * connection_limit=1, CLAUDE.md §14.1).
 */

export interface HelpArticleListItem {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  order: number;
  updatedAt: Date;
  /** Normalised text the client-side search matches against. */
  searchText: string;
}

export type LoadedHelpArticle =
  | { kind: 'static'; article: StaticHelpArticle }
  | {
      kind: 'db';
      article: {
        slug: string;
        category: string;
        title: string;
        excerpt: string;
        body: string;
        updatedAt: Date;
      };
    };

const CATEGORY_RANK = new Map(HELP_CATEGORIES.map((category, index) => [category.slug, index]));
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sortItems(a: HelpArticleListItem, b: HelpArticleListItem) {
  const rank = (CATEGORY_RANK.get(a.category) ?? 99) - (CATEGORY_RANK.get(b.category) ?? 99);
  return rank || a.order - b.order || a.title.localeCompare(b.title);
}

function fromStatic(article: StaticHelpArticle): HelpArticleListItem {
  return {
    slug: article.slug,
    category: article.category,
    title: article.title,
    excerpt: article.excerpt,
    order: article.order,
    updatedAt: article.updatedAt,
    searchText: helpArticleSearchText(article),
  };
}

export const loadHelpArticleList = cache(async (locale: Locale): Promise<HelpArticleListItem[]> => {
  const merged = new Map<string, HelpArticleListItem>();
  for (const article of getStaticHelpArticles(locale)) merged.set(article.slug, fromStatic(article));

  try {
    const rows = await prisma.helpArticle.findMany({
      where: { locale },
      select: {
        slug: true,
        category: true,
        title: true,
        excerpt: true,
        searchTags: true,
        order: true,
        isPublished: true,
        updatedAt: true,
      },
    });
    for (const row of rows) {
      if (!row.isPublished || !CATEGORY_RANK.has(row.category)) {
        merged.delete(row.slug);
        continue;
      }
      const excerpt = row.excerpt ?? '';
      merged.set(row.slug, {
        slug: row.slug,
        category: row.category,
        title: row.title,
        excerpt,
        order: row.order,
        updatedAt: row.updatedAt,
        searchText: normalizeHelpSearchText([row.title, excerpt, ...row.searchTags].join(' ')),
      });
    }
  } catch {
    // Table missing or database unreachable: the static list is complete.
  }

  return [...merged.values()].sort(sortItems);
});

export const loadHelpArticle = cache(async (locale: Locale, slug: string): Promise<LoadedHelpArticle | null> => {
  if (slug.length > 120 || !SLUG_RE.test(slug)) return null;

  let row: {
    slug: string;
    category: string;
    title: string;
    excerpt: string | null;
    body: string;
    isPublished: boolean;
    updatedAt: Date;
  } | null = null;
  try {
    row = await prisma.helpArticle.findUnique({
      where: { slug_locale: { slug, locale } },
      select: {
        slug: true,
        category: true,
        title: true,
        excerpt: true,
        body: true,
        isPublished: true,
        updatedAt: true,
      },
    });
  } catch {
    row = null;
  }

  if (row) {
    if (!row.isPublished || !CATEGORY_BY_SLUG[row.category]) return null;
    return {
      kind: 'db',
      article: {
        slug: row.slug,
        category: row.category,
        title: row.title,
        excerpt: row.excerpt ?? '',
        body: row.body,
        updatedAt: row.updatedAt,
      },
    };
  }

  const article = getStaticHelpArticle(locale, slug);
  return article ? { kind: 'static', article } : null;
});

/** Article count per category, from the merged list. */
export function countByCategory(items: HelpArticleListItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}

/**
 * `<title>` text (the locale layout adds " | Buaze"). Short titles get a
 * " — Yardım merkezi" suffix so the full title stays in the 45–60 range.
 */
export function helpArticleMetaTitle(title: string, locale: Locale): string {
  const suffix = locale === 'tr' ? ' — Yardım merkezi' : ' — Help center';
  return title.length < 37 && (title + suffix).length <= 52 ? title + suffix : title;
}

export function helpLabels(locale: Locale) {
  return locale === 'tr'
    ? {
        home: 'Ana sayfa',
        helpCenter: 'Yardım merkezi',
        breadcrumb: 'Sayfa yolu',
        articles: (n: number) => `${n} makale`,
        topics: (n: number) => `${n} konu`,
        readMore: 'Oku',
        seeAll: (n: number) => `Tümünü gör (${n})`,
      }
    : {
        home: 'Home',
        helpCenter: 'Help center',
        breadcrumb: 'Breadcrumb',
        articles: (n: number) => `${n} article${n === 1 ? '' : 's'}`,
        topics: (n: number) => `${n} topic${n === 1 ? '' : 's'}`,
        readMore: 'Read',
        seeAll: (n: number) => `See all (${n})`,
      };
}
