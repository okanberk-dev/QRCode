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
  /** Force a specific campaign from the admin "Şimdi gönder" path. */
  campaignId?: string;
}

export async function runMonthlyNewsletter(options: RunMonthlyNewsletterOptions = {}): Promise<MonthlyNewsletterResult> {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const issueNumber = monthsSinceEpoch();

  const campaign = await pickCampaign(options.campaignId);
  const { postsTr, postsEn, campaignTitle, campaignIntro } = await loadPostPools(campaign);

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

      if (campaign && campaign.locale !== 'both' && campaign.locale !== locale) {
        skipped++;
        continue;
      }

      const sourcePosts = locale === 'en' ? postsEn : postsTr;
      if (sourcePosts.length === 0) {
        skipped++;
        continue;
      }

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

      // Resend free tier rate limit is **2 req/sec**. Earlier code throttled
      // at 120ms (~8 req/sec) under the assumption of the paid 10 req/sec
      // tier — production logs (1 May 2026 monthly-newsletter run) showed
      // `Resend HTTP 429: rate_limit_exceeded` and partial sends.
      // CLAUDE.md §38.12 documents the audit. 600ms (~1.6 req/sec) keeps
      // a 20% safety margin under the free cap. Upgrade to Resend Pro
      // (10 req/sec) → tune back to ~150ms.
      await new Promise((r) => setTimeout(r, 600));
    }
  } finally {
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

function monthsSinceEpoch(): number {
  const now = new Date();
  return (now.getUTCFullYear() - 2026) * 12 + (now.getUTCMonth() + 1);
}
