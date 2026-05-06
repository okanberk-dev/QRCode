import crypto from 'node:crypto';
import { prisma } from './prisma';
import type { AutomationRule } from '@prisma/client';

// Stage 12 §38.82 — webhook automation fan-out helper.
//
// HMAC-SHA256 signature: `X-Buaze-Signature: <base64url(hmac(JWT_SECRET, ruleId+":"+payload))>`
// Receiver verifies via `verifyWebhookSignature(rawBody, ruleId, signature)`.
// JWT_SECRET reuse paterni — email-customer-campaign.ts §38.48 Wave 2 ile aynı
// (per-rule secret schema migration olmadan; CLAUDE.md §38.82 disipline).
//
// Retry: 3-attempt exponential backoff [100ms, 500ms, 1000ms]. 5s timeout per attempt.
// Retriable status: 5xx + 429. Non-retriable 4xx exits early.
//
// Persist: AutomationRule.lastFiredAt + lastFireStatus + lastFireResponseMs (cheap UI
// badge query) + AdminAuditLog `automation.fire.${ok|fail}` entry (activity log
// tarihçesi). Atomic transaction (CLAUDE.md §28.4 paterni — audit drift olmaz).

const HMAC_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';
const RETRY_BACKOFF_MS = [100, 500, 1000];
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;
const HEADER_SIGNATURE = 'X-Buaze-Signature';
const HEADER_RULE_ID = 'X-Buaze-Rule-Id';
const HEADER_SOURCE = 'X-Buaze-Source';
const USER_AGENT = 'Buaze-Webhook/1.0';

export interface DispatchInput {
  ruleId: string;
  webhookUrl: string;
  payload: Record<string, unknown>;
  source?: string;
  ruleOwnerRef: string; // ownerRef format ("userid" or "admin:userid")
  feedbackId?: string;
}

export interface DispatchResult {
  ok: boolean;
  httpStatus: number | null;
  responseMs: number;
  attempts: number;
  errorReason?: string;
  signatureSent: string;
}

function signPayload(payload: string, ruleId: string): string {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(`${ruleId}:${payload}`)
    .digest('base64url');
}

function isRetriableStatus(status: number | null): boolean {
  if (status === null) return true;
  return status >= 500 || status === 429;
}

function parseOwnerRef(ownerRef: string): { actorId: string; actorSource: 'admin' | 'user' } {
  if (ownerRef.startsWith('admin:')) {
    return { actorId: ownerRef.slice(6), actorSource: 'admin' };
  }
  return { actorId: ownerRef, actorSource: 'user' };
}

export async function dispatchWebhook(input: DispatchInput): Promise<DispatchResult> {
  const payloadJson = JSON.stringify(input.payload);
  const signature = signPayload(payloadJson, input.ruleId);
  const startTime = Date.now();

  let attempts = 0;
  let lastStatus: number | null = null;
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    attempts++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(input.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [HEADER_SIGNATURE]: signature,
          [HEADER_RULE_ID]: input.ruleId,
          [HEADER_SOURCE]: input.source || 'feedback',
          'User-Agent': USER_AGENT,
        },
        body: payloadJson,
        signal: controller.signal,
      });
      lastStatus = res.status;

      if (res.ok) {
        clearTimeout(timeoutId);
        const responseMs = Date.now() - startTime;
        await persistFireResult(input, true, res.status, responseMs);
        return {
          ok: true,
          httpStatus: res.status,
          responseMs,
          attempts,
          signatureSent: signature,
        };
      }

      if (!isRetriableStatus(res.status)) {
        clearTimeout(timeoutId);
        break;
      }
    } catch (err) {
      lastStatus = null;
      lastError = err instanceof Error ? err.message : 'unknown_network_error';
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS[attempt] ?? 2000));
    }
  }

  const responseMs = Date.now() - startTime;
  await persistFireResult(input, false, lastStatus, responseMs, lastError);
  return {
    ok: false,
    httpStatus: lastStatus,
    responseMs,
    attempts,
    errorReason: lastError ?? `http_${lastStatus}`,
    signatureSent: signature,
  };
}

async function persistFireResult(
  input: DispatchInput,
  ok: boolean,
  httpStatus: number | null,
  responseMs: number,
  errorReason?: string,
): Promise<void> {
  const status = ok
    ? 'ok'
    : httpStatus !== null
      ? `http_${httpStatus}`
      : 'network_error';
  const { actorId, actorSource } = parseOwnerRef(input.ruleOwnerRef);

  try {
    await prisma.$transaction([
      prisma.automationRule.update({
        where: { id: input.ruleId },
        data: {
          lastFiredAt: new Date(),
          lastFireStatus: status,
          lastFireResponseMs: responseMs,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          actorId,
          actorSource,
          action: `automation.fire.${ok ? 'ok' : 'fail'}`,
          targetId: input.ruleId,
          payload: {
            ruleId: input.ruleId,
            httpStatus,
            responseMs,
            errorReason: errorReason ?? null,
            source: input.source ?? null,
            feedbackId: input.feedbackId ?? null,
          },
        },
      }),
    ]);
  } catch (err) {
    console.error('[webhook-fanout] persistFireResult failed:', err);
  }
}

export const WEBHOOK_HEADERS = {
  signature: HEADER_SIGNATURE,
  ruleId: HEADER_RULE_ID,
  source: HEADER_SOURCE,
} as const;

export function verifyWebhookSignature(
  rawBody: string,
  ruleId: string,
  signature: string,
): boolean {
  const expected = signPayload(rawBody, ruleId);
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Feedback-aware fan-out (called from /api/feedback POST after insert success)
// ────────────────────────────────────────────────────────────────────────────

interface FeedbackContext {
  feedbackId: string;
  restaurantId: string;
  restaurantOwnerUserId: string;
  restaurantName: string;
  rating: number;
  comment?: string | null;
  platform?: string | null;
  branch?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}

export function ruleMatchesFeedback(
  rule: Pick<AutomationRule, 'trigger' | 'threshold'>,
  feedback: { rating: number; comment?: string | null; platform?: string | null },
): boolean {
  switch (rule.trigger) {
    case 'rating_lte': {
      const t = Number.parseInt(rule.threshold || '0', 10);
      return Number.isFinite(t) && feedback.rating <= t;
    }
    case 'rating_gte': {
      const t = Number.parseInt(rule.threshold || '5', 10);
      return Number.isFinite(t) && feedback.rating >= t;
    }
    case 'keyword': {
      if (!rule.threshold || !feedback.comment) return false;
      return feedback.comment.toLowerCase().includes(rule.threshold.toLowerCase());
    }
    case 'platform': {
      if (!rule.threshold || !feedback.platform) return false;
      return feedback.platform === rule.threshold;
    }
    default:
      return false;
  }
}

export async function dispatchMatchingRulesForFeedback(
  ctx: FeedbackContext,
): Promise<{ matched: number; dispatched: number; failed: number }> {
  // Owner reference paterni: ownerRef = restaurantOwnerUserId for direct user owner.
  // Admin-managed restaurants would need separate lookup; out of scope for Stage 12
  // (admin-managed automation entries kullanıcı paneli dışı kalır).
  const rules = await prisma.automationRule.findMany({
    where: {
      userId: ctx.restaurantOwnerUserId,
      isActive: true,
      action: 'webhook',
      OR: [{ restaurantId: ctx.restaurantId }, { restaurantId: null }],
    },
    take: 50,
  });

  const matching = rules.filter((r) =>
    ruleMatchesFeedback(r, {
      rating: ctx.rating,
      comment: ctx.comment,
      platform: ctx.platform,
    }),
  );

  if (matching.length === 0) {
    return { matched: 0, dispatched: 0, failed: 0 };
  }

  const eventName =
    ctx.rating <= 3
      ? 'feedback.low_rating'
      : ctx.rating >= 4
        ? 'feedback.high_rating'
        : 'feedback.neutral';

  const payload = {
    event: eventName,
    feedbackId: ctx.feedbackId,
    restaurantId: ctx.restaurantId,
    restaurantName: ctx.restaurantName,
    rating: ctx.rating,
    comment: ctx.comment ?? null,
    platform: ctx.platform ?? null,
    branch: ctx.branch ?? null,
    customerName: ctx.customerName ?? null,
    customerEmail: ctx.customerEmail ?? null,
    timestamp: new Date().toISOString(),
  };

  // Promise.allSettled (CLAUDE.md §28.4 per-row isolation): tek rule fail
  // diğer rule'ları engellemez, feedback save edilmiş zaten — webhook
  // best-effort fan-out.
  const results = await Promise.allSettled(
    matching.map((rule) =>
      dispatchWebhook({
        ruleId: rule.id,
        webhookUrl: rule.target!,
        payload,
        source: eventName,
        ruleOwnerRef: rule.userId,
        feedbackId: ctx.feedbackId,
      }),
    ),
  );

  let dispatched = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.ok) dispatched++;
    else failed++;
  }
  return { matched: matching.length, dispatched, failed };
}
