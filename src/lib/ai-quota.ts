// AI quota guard — Buaze platform genelinde OpenAI ya da diğer LLM
// çağrılarına 3-katmanlı koruma:
//   1. Per-user/day  — kötü niyetli oturum hızlı abuse'u engellesin
//   2. Per-workspace/day — owner credentials sızıntısında ws-level cap
//   3. Per-global/day — tüm sitede günlük "spend ceiling" (cost guard)
//
// Bu mevcut `rateLimit()` Upstash backend'ini reuse eder (CLAUDE.md §14.2);
// yeni dep yok, schema yok. Cache miss'ten sonra çağrılır — cache hit'lerde
// quota harcanmaz (extractThemes / extractWeeklyInsight zaten cache-first).
//
// Kullanım pattern:
//   const quota = await checkLayeredAiQuota([
//     { scope: 'suggest-reply:user', identifier: actor.userId, dailyLimit: 100 },
//     { scope: 'suggest-reply:ws',   identifier: workspaceOwnerId, dailyLimit: 300 },
//     { scope: 'suggest-reply:global', identifier: 'global', dailyLimit: 2000 },
//   ]);
//   if (!quota.allowed) {
//     // fail-safe fallback: template/empty result, kullanıcıya graceful degrade
//     return emptyResult('fallback');
//   }
//
// Quota aşıldığında Sentry warning + retryAfter saniye döner. Limit
// dolduğunda **hata değil** fallback bekleniyor — UI hâlâ çalışsın.

import * as Sentry from '@sentry/nextjs';
import { rateLimit } from './rate-limit';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Önerilen kanonik limitler. Tek source — yeni AI callsite eklerken bu
 * tablodan kopyala, gerekirse override et. Limit'ler "üst sınır", normal
 * kullanımda yarısı bile ulaşılmaz.
 */
export const AI_QUOTAS = {
  // Suggest-reply: owner panel / admin reviews — gpt-4o-mini ~$0.0001/call
  // 100/user/day = 10K user × full daily cap → $1/gün worst-case
  SUGGEST_REPLY_USER_DAY: 100,
  SUGGEST_REPLY_WORKSPACE_DAY: 300, // multi-team workspace için
  SUGGEST_REPLY_GLOBAL_DAY: 2000,

  // Background auto-draft (feedback-autodraft + google-reviews-autodraft cron
  // + feedback POST opt-in). Separate pool from interactive suggest-reply so
  // a runaway cron can't starve owners' on-demand drafts, and vice versa.
  // Checked per OpenAI call (audit §38.B H3 — was previously uncapped). On
  // overflow → template fallback / skip, never an HTTP error.
  AUTODRAFT_WORKSPACE_DAY: 200,
  AUTODRAFT_GLOBAL_DAY: 4000,

  // Analytics themes — server component refresh, 1h cache hit oranı yüksek
  // 50/workspace/day → cache miss × refresh × restoran sayısı
  ANALYTICS_THEMES_WORKSPACE_DAY: 50,
  ANALYTICS_THEMES_GLOBAL_DAY: 500,

  // Weekly insight — cron, 24h cache, haftada 1 cron call/restaurant
  // 20/workspace/week + retry margin
  WEEKLY_INSIGHT_WORKSPACE_WEEK: 20,
  WEEKLY_INSIGHT_GLOBAL_WEEK: 200,

  // Admin tools (blog slug, read time) — düşük volume, mevcut 30/dk yeterli
  ADMIN_BLOG_TOOLS_USER_DAY: 100,
  ADMIN_BLOG_TOOLS_GLOBAL_DAY: 500,

  // ROI insight — public form (reCAPTCHA gated), yeni kullanıcı/gün
  ROI_INSIGHT_GLOBAL_DAY: 200,

  // Feedback summary (§38.53) — owner detail panel'de AI ÖZET 3-sinyal.
  // 24h cache hit oranı yüksek (her feedback için tek seferlik). Owner
  // panel kullanımı suggest-reply'a göre daha düşük (her detail tıklamada
  // değil, sadece comment ≥10 char + AI key var).
  // 50/user/day = ~10K user × full daily cap → marjinal cost (~$0.0001/call).
  FEEDBACK_SUMMARY_USER_DAY: 50,
  FEEDBACK_SUMMARY_WORKSPACE_DAY: 200,
  FEEDBACK_SUMMARY_GLOBAL_DAY: 1000,
} as const;

export interface AiQuotaLayer {
  /** Logical scope — observability label, Upstash key prefix. */
  scope: string;
  /** Caller identifier (userId / workspaceOwnerId / 'global'). */
  identifier: string;
  /** Allowed count within window. */
  dailyLimit: number;
  /** Window in ms (default DAY_MS). */
  windowMs?: number;
}

export interface AiQuotaCheck {
  allowed: boolean;
  /** Hangi scope reddetti (ilk failing layer). 'all' = hepsi geçti. */
  scope: string;
  retryAfterSeconds?: number;
}

/**
 * Tek katman quota check. Increment + ceiling kontrolü atomik (Upstash
 * sliding window). Fail durumunda Sentry warning + retryAfter döner.
 *
 * Caller fail durumunda fail-safe fallback dönmeli (template/empty); HTTP
 * error fırlatmamalıdır — kullanıcı UI'da AI yokken bile akışı tamamlar.
 */
export async function checkAiQuota(layer: AiQuotaLayer): Promise<AiQuotaCheck> {
  const { scope, identifier, dailyLimit, windowMs } = layer;
  const key = `ai-quota:${scope}:${identifier}`;
  const result = await rateLimit(key, dailyLimit, windowMs ?? DAY_MS);
  if (!result.allowed) {
    Sentry.captureMessage(`AI quota exceeded: ${scope}`, {
      level: 'warning',
      tags: { service: 'ai-quota', scope },
      extra: {
        identifier,
        dailyLimit,
        retryAfterSeconds: result.retryAfterSeconds,
      },
    });
  }
  return {
    allowed: result.allowed,
    scope,
    retryAfterSeconds: result.retryAfterSeconds,
  };
}

/**
 * Sıralı çoklu-katman check. İlk reddeden katmanda durur; aşılan limit'in
 * sebebini caller bilerek log/notify eder.
 *
 * Sıra: en spesifikten en geneline (user → workspace → global). Bir katman
 * fail edince diğerlerine bakılmaz (kısa devre + Upstash istek sayısı düşer).
 */
export async function checkLayeredAiQuota(layers: AiQuotaLayer[]): Promise<AiQuotaCheck> {
  for (const layer of layers) {
    const check = await checkAiQuota(layer);
    if (!check.allowed) return check;
  }
  return { allowed: true, scope: 'all' };
}

export { DAY_MS as AI_QUOTA_DAY_MS, WEEK_MS as AI_QUOTA_WEEK_MS };
