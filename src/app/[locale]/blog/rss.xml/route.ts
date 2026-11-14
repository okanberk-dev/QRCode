import { prisma } from '@/lib/prisma';
import { escapeHtml } from '@/lib/email/escape';
import type { Locale } from '@/lib/translations';
import { SITE_URL } from '@/lib/site';
import { blogDateToIso } from '@/lib/blog-date';
import { displayBlogAuthor } from '../_lib/author';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const FEED_LIMIT = 50;

const FEED_META: Record<Locale, { title: string; description: string }> = {
  tr: {
    title: 'Buaze Blog',
    description:
      'Müşteri yorumları, QR ile geri bildirim toplama ve dijital itibar yönetimi üzerine yazılar.',
  },
  en: {
    title: 'Buaze Blog',
    description:
      'Insights on customer reviews, QR-based feedback flows, and digital reputation management.',
  },
};

function toRfc822(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Fall back to "now" if the string was unparseable; never emit Invalid Date.
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

/**
 * Publication date of a post. `date` is a display string ("3 Haziran 2026"),
 * which `new Date()` cannot parse, so it goes through the blog date parser;
 * the row's creation time is the fallback.
 */
function publishedAt(post: { date: string; createdAt: Date }): Date {
  const iso = post.date ? blogDateToIso(post.date) : null;
  return iso ? new Date(iso) : post.createdAt;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> }
): Promise<Response> {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === 'en' ? 'en' : 'tr';
  const meta = FEED_META[locale];
  const feedUrl = `${SITE_URL}/${locale}/blog/rss.xml`;
  const channelLink = `${SITE_URL}/${locale}/blog`;

  let posts: Array<{
    slug: string;
    title: string;
    description: string;
    date: string;
    createdAt: Date;
    updatedAt: Date;
    author: string;
  }> = [];

  try {
    posts = await prisma.blogPost.findMany({
      where: { isActive: true, locale },
      // `date` is a display string and sorts alphabetically; creation time
      // gives the real publishing order.
      orderBy: { createdAt: 'desc' },
      take: FEED_LIMIT,
      select: {
        slug: true,
        title: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        author: true,
      },
    });
  } catch (error) {
    console.error('RSS feed fetch error:', error);
  }

  const items = posts
    .map((post) => {
      const link = `${SITE_URL}/${locale}/blog/${post.slug}`;
      const pubDate = toRfc822(publishedAt(post));
      return [
        '    <item>',
        `      <title>${escapeHtml(post.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        // RSS 2.0 <author> must be an e-mail address; a name goes in dc:creator.
        `      <dc:creator>${escapeHtml(displayBlogAuthor(post.author, locale))}</dc:creator>`,
        `      <description>${escapeHtml(post.description)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const lastBuildDate = posts.length > 0 ? toRfc822(posts[0].updatedAt) : new Date().toUTCString();

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeHtml(meta.title)}</title>`,
    `    <link>${channelLink}</link>`,
    `    <description>${escapeHtml(meta.description)}</description>`,
    `    <language>${locale}</language>`,
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n');

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
