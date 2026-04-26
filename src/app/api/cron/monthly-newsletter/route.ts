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
  campaignId: string | null;
  campaignTitle: string | null;
}

export interface RunMonthlyNewsletterOptions {
  /** Force a specific campaign (admin "Şimdi gönder" yolu). When omitted the
   *  cron picks an active scheduled/draft campaign or falls back to last 3
   *  blog posts. */
  campaignId?: string;
}

/**
 * Run the monthly newsletter send. Used by the cron GET handler and the
 * admin "Şimdi gönder" trigger; calling it via HTTP self-fetch on Vercel
 * serverless is flaky (cold start + 10s gateway timeout) so direct invoke.
 *
 * Precedence:
 *  1. options.campaignId — explicit, no further lookup
 *  2. Earliest `scheduled` campaign with scheduledAt <= now
 *  3. No campaign → fallback to "last 3 active blog posts" (legacy)
 *
 * Throttle: ~120 ms between sends to stay under Resend's 10 req/s limit.
 */
export async function runMonthlyNewsletter(options: RunMonthlyNewsletterOptions = {}): Promise<MonthlyNewsletterResult> {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const issueNumber = monthsSinceEpoch();

  // Resolve which campaign to send (if any).
  const campaign = await pickCampaign(options.campaignId);

  // Pre-fetch the post pool the campaign or fallback needs. We resolve TR
  // and EN separately so a "both"-locale campaign serves the right posts
  // to each subscriber without an extra query per row.
  const { postsTr, postsEn, campaignTitle, campaignIntro } = await loadPostPools(campaign);

  // Mark campaign as sending so a manual re-trigger doesn't double-send.
  if (campaign) {
    await prisma.newsletterCampaign.update({
      where: { id: campaign.id },
      data: { status: 'sending' },
    });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    for (const sub of subscribers) {
      const locale: 'tr' | 'en' = sub.locale === 'en' ? 'en' : 'tr';

      // Locale-specific campaign exclusion: if campaign locale is 'tr' or 'en'
      // then subscribers of the other locale are skipped (audience filter).
      if (campaign && campaign.locale !== 'both' && campaign.locale !== locale) {
        skipped++;
        continue;
      }

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
        // Custom title/intro override the template's default copy.
        title: campaignTitle ?? undefined,
        intro: campaignIntro ?? undefined,
      });
      if (ok) {
        sent++;
      } else {
        failed++;
        console.error('[MONTHLY_NEWSLETTER] send failed', {
          email: sub.email,
          locale,
          postsCount: posts.length,
          issueNumber,
          campaignId: campaign?.id ?? null,
        });
      }

      await new Promise((r) => setTimeout(r, 120));
    }
  } finally {
    // Always finalize campaign state — even partial failure marks it 'sent'
    // so it doesn\'t fire again. Counts capture how the run actually went.
    if (campaign) {
      await prisma.newsletterCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          sentCount: sent,
          failedCount: failed,
        },
      });
    }
  }

  return {
    ok: true,
    sent,
    failed,
    skipped,
    total: subscribers.length,
    issueNumber,
    campaignId: campaign?.id ?? null,
    campaignTitle: campaign?.title ?? null,
  };
}

async function pickCampaign(campaignId?: string) {
  if (campaignId) {
    return prisma.newsletterCampaign.findUnique({ where: { id: campaignId } });
  }
  // Earliest scheduled campaign whose moment has passed.
  return prisma.newsletterCampaign.findFirst({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

async function loadPostPools(campaign: { postIds: string[]; title?: string | null; intro?: string | null } | null) {
  if (campaign && campaign.postIds.length > 0) {
    // Campaign explicitly chose posts. Filter by id; isActive guard ensures
    // a soft-removed post doesn't slip into a delivered email. Phantom ids
    // (post deleted between authoring and send) are silently dropped.
    const all = await prisma.blogPost.findMany({
      where: { id: { in: campaign.postIds }, isActive: true },
    });
    const orderById = new Map(campaign.postIds.map((id, i) => [id, i]));
    all.sort((a, b) => (orderById.get(a.id) ?? 999) - (orderById.get(b.id) ?? 999));
    const postsTr = all.filter((p) => p.locale === 'tr');
    const postsEn = all.filter((p) => p.locale === 'en');
    return {
      postsTr,
      postsEn,
      campaignTitle: campaign.title ?? null,
      campaignIntro: campaign.intro ?? null,
    };
  }
  // Fallback: last 3 active blog posts per locale.
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
  return { postsTr, postsEn, campaignTitle: null, campaignIntro: null };
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
