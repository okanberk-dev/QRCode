// AI insight cache — Upstash Redis (production) + in-memory fallback (dev /
// preview). One OpenAI call per identical estimate (24 h TTL): the same
// visitor submitting the same values twice gets the same summary — saves
// tokens and keeps the report consistent.
//
// CLAUDE.md §15 ROI insight + §14.2 Upstash pattern.

import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import type { RoiInsight } from './generate-insight';
import type { RoiPdfData } from './RoiPdf';

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const redis: Redis | null =
  REST_URL && REST_TOKEN ? new Redis({ url: REST_URL, token: REST_TOKEN }) : null;

const TTL_SECONDS = 24 * 60 * 60; // 24 h

// In-memory fallback (reset on cold start; one instance lifetime is enough).
const memCache = new Map<string, { insight: RoiInsight; expiresAt: number }>();

/**
 * Cache key — who asked (email, else business name), the business name (it
 * appears in the summary text), sector, plan and every calculator input. The
 * inputs are already normalised and rounded by roi-model, so the hash is
 * stable. `v:2` keeps entries from the old projection model out.
 */
export function buildInsightCacheKey(
  data: RoiPdfData,
  locale: 'tr' | 'en',
): string {
  const { inputs } = data;
  const parts = [
    'v:2',
    `loc:${locale}`,
    `id:${(data.email || data.restaurantName).toLowerCase().trim()}`,
    `name:${data.restaurantName.toLowerCase().trim()}`,
    `sec:${data.sector}`,
    `plan:${data.planName ?? ''}:${inputs.planMonthlyUsd ?? 'none'}`,
    `c:${inputs.monthlyCustomers}`,
    `r:${inputs.ratingRatePct}`,
    `s:${inputs.replySharePct}`,
    `m:${inputs.minutesManual}`,
    `d:${inputs.minutesWithDraft}`,
    `h:${inputs.hourlyCostUsd}`,
  ];
  // SHA-256 → 16-char hex prefix; collisions are practically impossible.
  const hash = createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
  return `roi:insight:${hash}`;
}

export async function getCachedInsight(key: string): Promise<RoiInsight | null> {
  if (redis) {
    try {
      const value = await redis.get<RoiInsight>(key);
      return value ?? null;
    } catch (err) {
      console.error('[roi/insight-cache] redis get failed', err);
      // Fall through to in-memory.
    }
  }
  const entry = memCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memCache.delete(key);
    return null;
  }
  return entry.insight;
}

export async function setCachedInsight(
  key: string,
  insight: RoiInsight,
): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, insight, { ex: TTL_SECONDS });
      return;
    } catch (err) {
      console.error('[roi/insight-cache] redis set failed', err);
      // Fall through to in-memory.
    }
  }
  memCache.set(key, {
    insight,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
  // Keep the in-memory map bounded: drop the oldest entry past 5,000.
  if (memCache.size > 5_000) {
    const firstKey = memCache.keys().next().value;
    if (firstKey) memCache.delete(firstKey);
  }
}

// Lead de-duplication: a cache hit already means "this estimate arrived in the
// last 24 h"; callers check `getCachedInsight(...) !== null`.
