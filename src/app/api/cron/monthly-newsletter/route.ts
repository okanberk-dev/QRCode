import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendNewsletterEmail, getUnsubscribeUrl } from '@/lib/email';

export interface MonthlyNewsletterResult {
  ok: true;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  issueNumber: number;
}

/**
 * Run the monthly newsletter send. Exposed as a plain function so the cron
 * GET handler and the admin "Şimdi gönder" trigger can both invoke it
 * without going through HTTP — Vercel serverless self-fetch is flaky and
 * cold starts can push the round-trip past the 10s gateway timeout.
 *
 * Throttle: ~120 ms between sends to stay under Resend's 10 req/s limit.
 */
export async function runMonthlyNewsletter(): Promise<MonthlyNewsletterResult> {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  // Pull recent posts per locale once — avoid re-querying per subscriber.
  const [postsTr, postsEn] = await Promise.all([
    prisma.blogPost.findMany({
      where: { isActive: true, locale: 'tr' },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.blogPost.findMany({
      where: { isActive: true, locale: 'en' },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const issueNumber = monthsSinceEpoch();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const locale: 'tr' | 'en' = sub.locale === 'en' ? 'en' : 'tr';
    const sourcePosts = locale === 'en' ? postsEn : postsTr;
    if (sourcePosts.length === 0) {
      skipped++;
      continue;
    }

    // Backfill unsubscribe token for legacy rows that pre-date the field.
    let token = sub.unsubscribeToken;
    if (!token) {
      token = crypto.randomBytes(24).toString('hex');
      await prisma.newsletterSubscriber.update({
        where: { id: sub.id },
        data: { unsubscribeToken: token },
      });
    }

    const posts = sourcePosts.map((p) => ({
      title: p.title,
      excerpt: p.description,
      url: `${appUrl}/${locale}/blog/${p.slug}`,
      category: p.author,
      readMinutes: parseInt(p.readTime, 10) || null,
    }));

    const ok = await sendNewsletterEmail({
      to: sub.email,
      posts,
      unsubscribeUrl: getUnsubscribeUrl(token),
      issueNumber,
      locale,
    });
    if (ok) {
      sent++;
    } else {
      failed++;
      // Resend already logs the upstream HTTP body in src/lib/email.ts.
      // Add subscriber context here so failures are correlatable in
      // Vercel/console without dumping the full email payload.
      console.error('[MONTHLY_NEWSLETTER] send failed', {
        email: sub.email,
        locale,
        postsCount: posts.length,
        issueNumber,
      });
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  return {
    ok: true,
    sent,
    failed,
    skipped,
    total: subscribers.length,
    issueNumber,
  };
}

/**
 * Monthly newsletter cron.
 *
 * Schedule: 0 9 1 * * (Vercel Cron, see vercel.json) — first of every month.
 * Auth: Bearer CRON_SECRET (Vercel Cron sets this header automatically).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runMonthlyNewsletter();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[MONTHLY_NEWSLETTER]', error);
    return NextResponse.json(
      { error: 'newsletter_failed', message: (error as Error).message },
      { status: 500 },
    );
  }
}

function monthsSinceEpoch(): number {
  // Pulse #01 anchored at 2026-01. Stable issue numbering across replays.
  const now = new Date();
  return (now.getUTCFullYear() - 2026) * 12 + (now.getUTCMonth() + 1);
}
