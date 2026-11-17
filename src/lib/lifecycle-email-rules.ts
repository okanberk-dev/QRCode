// Lifecycle email rules (CLAUDE.md §21.34 + §23.7 Phase 11.30).
//
// Per user × active restaurant 3 lifecycle email kuralı:
//   1. qr_not_downloaded      — account ≥ 1 gün, qrGenerationCount=0, lifetime
//   2. first_feedback_tips    — qrGenerationCount>0, feedbackCount=0, ≥ 2 gün QR sonrası, lifetime
//   3. upgrade_suggestion     — feedbackCount ≥ 50, plan ∈ {trial, starter}, 30g cooldown
//
// 2026-11 (CLAUDE.md §21.39): inactive_reactivation kaldırıldı — "aktivite"
// user.updatedAt'ten okunuyordu (giriş bunu güncellemez), panele her gün
// giren sahiplere "uzun süredir görüşemedik" gidiyordu.
//
// Her kural fail-soft: bir kural fırlatırsa diğerleri devam eder.

import { prisma } from '@/lib/prisma';
import {
  alreadySent,
  recordSent,
  type LifecycleEmailType,
} from './email/lifecycle';
import { notifyOpsOfMailFailure } from './email/ops-alert';
import {
  sendQrNotDownloadedEmail,
  sendFirstFeedbackTipsEmail,
  sendUpgradeSuggestionEmail,
} from './email';

export interface LifecycleUserContext {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  locale: 'tr' | 'en';
  createdAt: Date;
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
    recipient: user.email,
    userLocale: user.locale,
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
    recipient: user.email,
    userLocale: user.locale,
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
    recipient: user.email,
    userLocale: user.locale,
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
  /** Owner e-posta adresi — retry sonrası fail durumunda ops alert için. */
  recipient: string;
  /** Owner panel locale — ops alert mail body'si TR/EN parity (Phase 11.34). */
  userLocale: 'tr' | 'en';
}

// Retry config (Phase 11.33 — Wave 3+ B). Resend transient errors (5xx,
// network) ~%80-90 1-2 attempt'ta kurtulur. Conservative tutuyoruz çünkü
// cron sequential işliyor; agresif retry total cron timeout'unu artırır.
//   - MAX_RETRIES = 1 → total 2 attempt (initial + 1 retry)
//   - RETRY_DELAY_MS = 3000 → 3sn wait
// Worst-case extra time: failed_count × 3sn. Resend uptime ~99.9% +
// 1000 user × ~0.1% fail = ~1 fail × 3s = marjinal.
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 3000;

async function sendWithRetry(
  send: () => Promise<boolean>,
): Promise<{ ok: boolean; attempts: number; lastError?: string }> {
  let lastError: string | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ok = await send();
      if (ok) return { ok: true, attempts: attempt + 1 };
      lastError = 'send returned false';
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'unknown';
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  return { ok: false, attempts: MAX_RETRIES + 1, lastError };
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

  const result = await sendWithRetry(p.send);

  if (result.ok) {
    await recordSent(p.log_recordParams);
    p.results.push({ type: p.type, sent: true });
    return;
  }

  // Final fail (initial + 1 retry) — ops alert (CLAUDE.md §21.33).
  // notifyOpsOfMailFailure rate-limited (10/template/5dk) — Resend outage
  // sırasında inbox bombalanmaz. Helper içinde swallow edilir, throw etmez.
  await notifyOpsOfMailFailure({
    template: `lifecycle:${p.type}`,
    recipient: p.recipient,
    reason: result.lastError ?? 'send_failed_after_retry',
    userLocale: p.userLocale,
    metadata: {
      userId: p.log_recordParams.userId ?? null,
      restaurantId: p.log_recordParams.restaurantId ?? null,
      attempts: result.attempts,
    },
  });

  p.results.push({
    type: p.type,
    sent: false,
    error: result.lastError ?? 'send_failed_after_retry',
  });
}

/**
 * Build the per user × active restaurant context for the rules above.
 *
 * Two grouped queries cover every restaurant in the batch (QR count + first
 * QR date, feedback count) instead of four queries per restaurant — the
 * daily cron used to issue ~4 × restaurants round trips.
 */
export async function buildLifecycleContexts(
  userIds: string[],
  appUrl: string,
): Promise<LifecycleApplyParams[]> {
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      isActive: true,
      // §38.197 — Hesabı silinmek üzere planlanmış kullanıcıya lifecycle
      // mail gönderme. Owner cancel ederse scheduledDeletionAt → null, akış
      // kaldığı yerden devam eder.
      scheduledDeletionAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      locale: true,
      createdAt: true,
      // Durdurulmuş işletme için "QR'ını indir" hatırlatması anlamsız.
      restaurants: { where: { isActive: true }, select: { id: true, name: true } },
    },
  });

  const restaurantIds = users.flatMap((u) => u.restaurants.map((r) => r.id));
  if (restaurantIds.length === 0) return [];

  const qrGroups = await prisma.qrGeneration.groupBy({
    by: ['restaurantId'],
    where: { restaurantId: { in: restaurantIds } },
    _count: { _all: true },
    _min: { createdAt: true },
  });
  const feedbackGroups = await prisma.feedback.groupBy({
    by: ['restaurantId'],
    where: { restaurantId: { in: restaurantIds } },
    _count: { _all: true },
  });
  const qrByRestaurant = new Map(
    qrGroups.map((g) => [g.restaurantId, { count: g._count._all, first: g._min.createdAt }]),
  );
  const feedbackByRestaurant = new Map(
    feedbackGroups.map((g) => [g.restaurantId, g._count._all]),
  );

  const contexts: LifecycleApplyParams[] = [];
  for (const u of users) {
    const userLocale: 'tr' | 'en' = u.locale === 'en' ? 'en' : 'tr';
    for (const r of u.restaurants) {
      const qr = qrByRestaurant.get(r.id);
      contexts.push({
        user: {
          id: u.id,
          email: u.email,
          name: u.name,
          plan: u.plan,
          locale: userLocale,
          createdAt: u.createdAt,
        },
        restaurant: {
          id: r.id,
          name: r.name,
          qrGenerationCount: qr?.count ?? 0,
          qrFirstDownloadAt: qr?.first ?? null,
          feedbackCount: feedbackByRestaurant.get(r.id) ?? 0,
        },
        appUrl,
      });
    }
  }

  return contexts;
}

/** Newest users first, so recent signups (the ones these rules target) are always covered. */
const LIFECYCLE_USER_BATCH = 1000;

export interface LifecycleSummary {
  usersChecked: number;
  contextsProcessed: number;
  sent: Record<ActiveLifecycleRule, number>;
  skipped: number;
  failures: number;
  durationMs: number;
}

type ActiveLifecycleRule = 'qr_not_downloaded' | 'first_feedback_tips' | 'upgrade_suggestion';

/**
 * Daily lifecycle rules for every active user (CLAUDE.md §21.34). Shared by
 * the cron and the admin "run now" button (§21.13 — no self-fetch).
 */
export async function runLifecycleEmails(): Promise<LifecycleSummary> {
  const start = Date.now();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';

  const users = await prisma.user.findMany({
    where: { isActive: true },
    take: LIFECYCLE_USER_BATCH,
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  let contexts: LifecycleApplyParams[] = [];
  try {
    contexts = await buildLifecycleContexts(userIds, appUrl);
  } catch (err) {
    console.error('[lifecycle-emails] buildLifecycleContexts failed', {
      errName: err instanceof Error ? err.name : 'unknown',
    });
  }

  const sent: Record<ActiveLifecycleRule, number> = {
    qr_not_downloaded: 0,
    first_feedback_tips: 0,
    upgrade_suggestion: 0,
  };
  let skipped = 0;
  let failures = 0;

  for (const ctx of contexts) {
    try {
      const results = await applyLifecycleRules(ctx);
      for (const r of results) {
        if (r.sent) sent[r.type as ActiveLifecycleRule] = (sent[r.type as ActiveLifecycleRule] ?? 0) + 1;
        else if (r.error) failures++;
        else skipped++;
      }
    } catch (err) {
      console.error('[lifecycle-emails] applyLifecycleRules failed', {
        restaurantId: ctx.restaurant.id,
        errName: err instanceof Error ? err.name : 'unknown',
      });
      failures++;
    }
  }

  return {
    usersChecked: userIds.length,
    contextsProcessed: contexts.length,
    sent,
    skipped,
    failures,
    durationMs: Date.now() - start,
  };
}
