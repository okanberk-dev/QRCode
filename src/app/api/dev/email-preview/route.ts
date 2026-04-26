import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  renderForgotPassword,
  renderWelcome,
  renderFormConfirmation,
  renderLowRatingAlert,
  renderNewReview,
  renderWeeklyReport,
  renderNewsletter,
  renderCustomerReply,
  renderTrialEnding,
} from '@/lib/email/templates';
import { isPreviewTemplate, SEEDS, type PreviewTemplate } from './seeds';
import { getUnsubscribeUrl } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Dev-only email preview endpoint. Renders any of the 9 Pulse templates with
 * realistic seed data so a dev (or admin) can eyeball layout in a real
 * browser without staging traffic. Disabled in production deploys (incl.
 * Vercel preview, where NODE_ENV is also 'production') so the route can't
 * leak content from canonical sender domains.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const url = new URL(req.url);
  const template = url.searchParams.get('template') ?? '';
  const locale: 'tr' | 'en' = url.searchParams.get('locale') === 'en' ? 'en' : 'tr';
  const format = url.searchParams.get('format') === 'text' ? 'text' : 'html';

  if (!isPreviewTemplate(template)) {
    return NextResponse.json(
      { error: 'invalid_template', allowed: Object.keys(SEEDS) },
      { status: 400 },
    );
  }

  const rendered = await renderTemplate(template, locale, url.searchParams);

  if (format === 'text') {
    return new NextResponse(rendered.text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return new NextResponse(rendered.html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function renderTemplate(
  template: PreviewTemplate,
  locale: 'tr' | 'en',
  searchParams?: URLSearchParams,
): Promise<{ subject: string; html: string; text: string }> {
  switch (template) {
    case 'forgot-password':
      return renderForgotPassword(SEEDS['forgot-password'](), locale);
    case 'welcome':
      return renderWelcome(SEEDS.welcome(), locale);
    case 'form-confirmation':
      return renderFormConfirmation(SEEDS['form-confirmation'](), locale);
    case 'low-rating-alert':
      return renderLowRatingAlert(SEEDS['low-rating-alert'](), locale);
    case 'new-review':
      return renderNewReview(SEEDS['new-review'](), locale);
    case 'weekly-report':
      return renderWeeklyReport(SEEDS['weekly-report'](), locale);
    case 'newsletter': {
      // Newsletter accepts compose-time overrides so the admin editor's
      // "Önizle" button shows authored content rather than seed posts.
      const customTitle = searchParams?.get('title')?.trim() || null;
      const customIntro = searchParams?.get('intro')?.trim() || null;
      const postIdsCsv = searchParams?.get('postIds')?.trim() || '';
      const postIds = postIdsCsv ? postIdsCsv.split(',').filter(Boolean) : [];
      const baseSeed = SEEDS.newsletter();
      let posts = baseSeed.posts;
      if (postIds.length > 0) {
        const dbPosts = await prisma.blogPost.findMany({
          where: { id: { in: postIds }, isActive: true },
        });
        if (dbPosts.length > 0) {
          const orderById = new Map(postIds.map((id, i) => [id, i]));
          dbPosts.sort((a, b) => (orderById.get(a.id) ?? 999) - (orderById.get(b.id) ?? 999));
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
          posts = dbPosts.map((p) => ({
            title: p.title,
            excerpt: p.description,
            url: `${appUrl}/${p.locale}/blog/${p.slug}`,
            category: p.author,
            readMinutes: parseInt(p.readTime, 10) || null,
          }));
        }
      }
      return renderNewsletter(
        {
          ...baseSeed,
          posts,
          customTitle,
          customIntro,
          // Stable preview token — never sent over the wire, just keeps the
          // unsubscribe link from showing as broken in the rendered HTML.
          unsubscribeUrl: getUnsubscribeUrl('PREVIEW_TOKEN_DEV_ONLY'),
        },
        locale,
      );
    }
    case 'customer-reply':
      return renderCustomerReply(SEEDS['customer-reply'](), locale);
    case 'trial-ending':
      return renderTrialEnding(SEEDS['trial-ending'](), locale);
  }
}
