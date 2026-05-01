// Lifecycle email rules (CLAUDE.md §21.34 + §23.7 Phase 11.30).
//
// Per user × restaurant 4 lifecycle email kuralı:
//   1. qr_not_downloaded      — account ≥ 1 gün, qrGenerationCount=0, lifetime
//   2. first_feedback_tips    — qrGenerationCount>0, feedbackCount=0, ≥ 2 gün QR sonrası, lifetime
//   3. upgrade_suggestion     — feedbackCount ≥ 50, plan ∈ {trial, starter}, 30g cooldown
//   4. inactive_reactivation  — daysSinceLastActivity ≥ 14, 30g cooldown
//
// Her kural fail-soft: bir kural fırlatırsa diğerleri devam eder.

import { prisma } from '@/lib/prisma';
import {
  alreadySent,
  recordSent,
  type LifecycleEmailType,
} from './email/lifecycle';
import {
  sendQrNotDownloadedEmail,
  sendFirstFeedbackTipsEmail,
  sendUpgradeSuggestionEmail,
  sendInactiveReactivationEmail,
} from './email';

export interface LifecycleUserContext {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  locale: 'tr' | 'en';
  createdAt: Date;
  /** Last activity timestamp — user.updatedAt veya last feedback'in createdAt'i. */
  lastActivityAt: Date;
}

export interface LifecycleRestaurantContext {
  id: string;
  name: string;
  qrGenerationCount: number;
  qrFirstDownloadAt: Date | null;
  feedbackCount: number;
}

export interface LifecycleApplyParams {
  user: LifecycleUserContext;
  restaurant: LifecycleRestaurantContext;
  /** Tetik anında (test için override edilebilir). */
  now?: Date;
  /** Public app URL — CTA links. */
  appUrl: string;
}

export interface LifecycleResult {
  type: LifecycleEmailType;
  sent: boolean;
  skipped?: 'already_sent' | 'condition_not_met';
  error?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

export async function applyLifecycleRules(
  params: LifecycleApplyParams,
): Promise<LifecycleResult[]> {
  const now = params.now ?? new Date();
  const { user, restaurant, appUrl } = params;
  const localeRoot = `${appUrl}/${user.locale}`;

  const daysSinceCreated = daysBetween(now, user.createdAt);
  const daysSinceQr = restaurant.qrFirstDownloadAt
    ? daysBetween(now, restaurant.qrFirstDownloadAt)
    : null;
  const daysSinceLastActivity = daysBetween(now, user.lastActivityAt);

  const results: LifecycleResult[] = [];

  // Rule 1: qr_not_downloaded
  // Account ≥ 1 gün, hâlâ 0 QR — onboarding sonrası QR'a hiç dokunmayan owner.
  // Lifetime once (idempotent skip if log exists).
  await runRule({
    type: 'qr_not_downloaded',
    condition: () =>
      daysSinceCreated >= 1 && restaurant.qrGenerationCount === 0,
    log: {
      userId: user.id,
      restaurantId: restaurant.id,
      type: 'qr_not_downloaded',
    },
    send: () =>
      sendQrNotDownloadedEmail({
        to: user.email,
        firstName: user.name,
        restaurantName: restaurant.name,
        qrUrl: `${localeRoot}/dashboard/qr`,
        locale: user.locale,
      }),
    results,
    log_recordParams: { userId: user.id, restaurantId: restaurant.id, type: 'qr_not_downloaded' },
  });

  // Rule 2: first_feedback_tips
  // QR indirildi (≥ 2 gün önce) ama hâlâ feedback yok. Lifetime once.
  await runRule({
    type: 'first_feedback_tips',
    condition: () =>
      restaurant.qrGenerationCount > 0 &&
      restaurant.feedbackCount === 0 &&
      daysSinceQr !== null &&
      daysSinceQr >= 2,
    log: {
      userId: user.id,
      restaurantId: restaurant.id,
      type: 'first_feedback_tips',
    },
    send: () =>
      sendFirstFeedbackTipsEmail({
        to: user.email,
        firstName: user.name,
        restaurantName: restaurant.name,
        dashboardUrl: `${localeRoot}/dashboard`,
        locale: user.locale,
      }),
    results,
    log_recordParams: { userId: user.id, restaurantId: restaurant.id, type: 'first_feedback_tips' },
  });

  // Rule 3: upgrade_suggestion
  // Feedback ≥ 50 + trial/starter plan + 30 gün cooldown.
  await runRule({
    type: 'upgrade_suggestion',
    condition: () =>
      restaurant.feedbackCount >= 50 &&
      ['trial', 'starter'].includes(user.plan),
    log: {
      userId: user.id,
      restaurantId: restaurant.id,
      type: 'upgrade_suggestion',
      cooldownDays: 30,
    },
    send: () =>
      sendUpgradeSuggestionEmail({
        to: user.email,
        firstName: user.name,
        restaurantName: restaurant.name,
        feedbackCount: restaurant.feedbackCount,
        pricingUrl: `${localeRoot}/pricing`,
        locale: user.locale,
      }),
    results,
    log_recordParams: { userId: user.id, restaurantId: restaurant.id, type: 'upgrade_suggestion' },
  });

  // Rule 4: inactive_reactivation
  // 14 gün+ activity yok + 30 gün cooldown.
  // user-level (restaurantId tracking yok — user'ın tümü inaktif olabilir).
  await runRule({
    type: 'inactive_reactivation',
    condition: () => daysSinceLastActivity >= 14,
    log: {
      userId: user.id,
      type: 'inactive_reactivation',
      cooldownDays: 30,
    },
    send: () =>
      sendInactiveReactivationEmail({
        to: user.email,
        firstName: user.name,
        daysInactive: daysSinceLastActivity,
        dashboardUrl: `${localeRoot}/dashboard`,
        locale: user.locale,
      }),
    results,
    log_recordParams: { userId: user.id, type: 'inactive_reactivation' },
  });

  return results;
}

interface RunRuleParams {
  type: LifecycleEmailType;
  condition: () => boolean;
  log: {
    userId?: string;
    restaurantId?: string;
    type: LifecycleEmailType;
    cooldownDays?: number;
  };
  send: () => Promise<boolean>;
  results: LifecycleResult[];
  log_recordParams: {
    userId?: string;
    restaurantId?: string;
    type: LifecycleEmailType;
  };
}

async function runRule(p: RunRuleParams): Promise<void> {
  if (!p.condition()) {
    p.results.push({ type: p.type, sent: false, skipped: 'condition_not_met' });
    return;
  }
  if (await alreadySent(p.log)) {
    p.results.push({ type: p.type, sent: false, skipped: 'already_sent' });
    return;
  }
  try {
    const ok = await p.send();
    if (ok) {
      await recordSent(p.log_recordParams);
      p.results.push({ type: p.type, sent: true });
    } else {
      p.results.push({ type: p.type, sent: false, error: 'send_failed' });
    }
  } catch (err) {
    p.results.push({
      type: p.type,
      sent: false,
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
}

/**
 * Build aggregate context for a user. Caller (cron) batch'le çeker; bu helper
 * her user × restaurant için derived context inşa eder.
 */
export async function buildLifecycleContexts(
  userIds: string[],
  appUrl: string,
): Promise<LifecycleApplyParams[]> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      locale: true,
      createdAt: true,
      updatedAt: true,
      restaurants: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Per-restaurant aggregate (qr count, qr first download, feedback count + last)
  const contexts: LifecycleApplyParams[] = [];
  for (const u of users) {
    const userLocale: 'tr' | 'en' = u.locale === 'en' ? 'en' : 'tr';
    for (const r of u.restaurants) {
      const [qrFirst, qrCount, feedbackCount, lastFeedback] = await Promise.all([
        prisma.qrGeneration.findFirst({
          where: { restaurantId: r.id },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
        prisma.qrGeneration.count({ where: { restaurantId: r.id } }),
        prisma.feedback.count({ where: { restaurantId: r.id } }),
        prisma.feedback.findFirst({
          where: { restaurantId: r.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      // Last activity = max(user.updatedAt, last feedback) — user kendi
      // panel'e girdi mi yoksa müşteriler hâlâ aktif mi.
      const lastActivityAt =
        lastFeedback && lastFeedback.createdAt > u.updatedAt
          ? lastFeedback.createdAt
          : u.updatedAt;

      contexts.push({
        user: {
          id: u.id,
          email: u.email,
          name: u.name,
          plan: u.plan,
          locale: userLocale,
          createdAt: u.createdAt,
          lastActivityAt,
        },
        restaurant: {
          id: r.id,
          name: r.name,
          qrGenerationCount: qrCount,
          qrFirstDownloadAt: qrFirst?.createdAt ?? null,
          feedbackCount,
        },
        appUrl,
      });
    }
  }

  return contexts;
}
