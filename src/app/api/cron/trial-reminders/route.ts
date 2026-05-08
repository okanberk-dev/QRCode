import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTrialEndingEmail } from '@/lib/email';

// CRITICAL — without these directives Vercel Pro defaults to a 60s function
// timeout. trial-reminders fans out per-user mail sends (Resend HTTP layer);
// once trial cohort grows past ~200 users that 60s ceiling gets hit and the
// cron silently 504s. CLAUDE.md §38.11 cron checklist.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Trial reminder cron.
 *
 * Schedule: 0 9 * * * (every day 09:00 UTC) — see vercel.json.
 *
 * Sends at most 2 emails per user across their trial: one when 3 days remain
 * (decision window) and one when 1 day remains (last call). Other days are
 * skipped to keep the inbox quiet — saturating users with 4 daily reminders
 * was rejected as spammy. The `lastTrialReminderAt` field doubles as a
 * 20-hour safety against the cron firing twice in a day.
 *
 * Auth: Bearer ${CRON_SECRET} — same pattern as weekly-digest.
 */
const TRIAL_REMINDER_DAYS = [1, 3] as const;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const maxWindow = Math.max(...TRIAL_REMINDER_DAYS);
    const windowEnd = new Date(now.getTime() + (maxWindow + 1) * 24 * 60 * 60 * 1000);
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    const candidates = await prisma.user.findMany({
      where: {
        plan: 'trial',
        isActive: true,
        trialEndsAt: { gte: now, lte: windowEnd },
        OR: [
          { lastTrialReminderAt: null },
          { lastTrialReminderAt: { lt: twentyHoursAgo } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        trialEndsAt: true,
        restaurants: {
          select: { id: true, slug: true },
          take: 1,
        },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
    const dayBuckets: Record<string, number> = Object.fromEntries(
      TRIAL_REMINDER_DAYS.map((d) => [String(d), 0]),
    );
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of candidates) {
      if (!user.email || !user.trialEndsAt) {
        skipped++;
        continue;
      }

      const msLeft = user.trialEndsAt.getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

      // Only mail on the configured threshold days. SQL window is wider so
      // a single migration of trialEndsAt doesn't accidentally skip a user;
      // we filter precisely here.
      if (!TRIAL_REMINDER_DAYS.includes(daysLeft as 1 | 3)) {
        skipped++;
        continue;
      }
      dayBuckets[String(daysLeft)] = (dayBuckets[String(daysLeft)] || 0) + 1;

      const usage = await collectUsage(user.restaurants[0]?.id);
      const userLocale: 'tr' | 'en' = user.locale === 'en' ? 'en' : 'tr';
      // CLAUDE.md §38.132 — /dashboard/billing route YOK; account tab
      // section deeplink (CLAUDE.md §38.51 SettingsLayout 7 tab — billing
      // tab profile/security/notifications/ai/billing/team/legal).
      const upgradeUrl = `${appUrl}/${userLocale}/dashboard/account?section=billing`;

      try {
        const ok = await sendTrialEndingEmail({
          to: user.email,
          locale: userLocale,
          firstName: user.name,
          daysLeft,
          usage,
          upgradeUrl,
        });
        if (ok) {
          sent++;
          await prisma.user.update({
            where: { id: user.id },
            data: { lastTrialReminderAt: now },
          });
        } else {
          failed++;
          // PII redaction (CLAUDE.md §37 KVKK / Sentry minimization): log
          // userId, never the e-mail. Sentry auto-captures `extra` from
          // console.error and the rough match for "trial reminder send
          // failed" is the user.id — operators can pull the row from DB.
          console.error('[TRIAL_REMINDERS] send failed', { userId: user.id, daysLeft, locale: userLocale });
        }
      } catch (err) {
        failed++;
        console.error('[TRIAL_REMINDERS] exception', { userId: user.id, err });
      }

      // Resend free-tier rate limit is 10 req/sec; 120 ms keeps us well under.
      await new Promise((r) => setTimeout(r, 120));
    }

    return NextResponse.json({
      ok: true,
      sent,
      skipped,
      failed,
      total: candidates.length,
      dayBuckets,
    });
  } catch (error) {
    console.error('[TRIAL_REMINDERS]', error);
    return NextResponse.json({ error: 'cron_failed' }, { status: 500 });
  }
}

async function collectUsage(restaurantId: string | undefined): Promise<{
  reviews: number | null;
  avgRating: number | null;
  aiReplies: number | null;
  growthPct: number | null;
}> {
  if (!restaurantId) {
    return { reviews: null, avgRating: null, aiReplies: null, growthPct: null };
  }
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  const [recent, recentAgg, prior, aiRepliesRaw] = await Promise.all([
    prisma.feedback.count({
      where: { restaurantId, createdAt: { gte: fourteenDaysAgo } },
    }),
    prisma.feedback.aggregate({
      _avg: { rating: true },
      where: { restaurantId, createdAt: { gte: fourteenDaysAgo } },
    }),
    prisma.feedback.count({
      where: {
        restaurantId,
        createdAt: { gte: twentyEightDaysAgo, lt: fourteenDaysAgo },
      },
    }),
    // FeedbackReply.source filter — only Pulse AI approved replies count.
    // `.catch` keeps the cron alive if Prisma hasn't seen the column yet
    // (e.g. fresh deploy where schema migration lagged behind code rollout).
    prisma.feedbackReply
      .count({
        where: {
          feedback: { restaurantId },
          createdAt: { gte: fourteenDaysAgo },
          source: 'ai_copilot',
        },
      })
      .catch(() => null),
  ]);

  const aiReplies = aiRepliesRaw;

  const growthPct = prior > 0
    ? Math.round(((recent - prior) / prior) * 100)
    : recent > 0
      ? 100
      : null;

  return {
    reviews: recent,
    avgRating: recentAgg._avg.rating ? parseFloat(recentAgg._avg.rating.toFixed(1)) : null,
    aiReplies,
    growthPct,
  };
}
