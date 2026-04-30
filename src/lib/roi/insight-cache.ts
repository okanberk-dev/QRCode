// AI insight cache — Upstash Redis (production) + in-memory fallback (dev /
// preview). Aynı senaryo değerleri için tek bir OpenAI çağrısı (24 saat
// TTL); aynı kullanıcı 2 kez form doldurursa farklı insight gelmez —
// hem maliyet (OpenAI token) hem tutarlılık kazanımı.
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

const TTL_SECONDS = 24 * 60 * 60; // 24 saat

// In-memory fallback (cold start'ta sıfırlanır; tek-instance lifetime'i
// yeterli — hot reload'larda yine cache hit alırız).
const memCache = new Map<string, { insight: RoiInsight; expiresAt: number }>();

/**
 * Cache key — kullanıcının kimliği (email > restaurant name) +
 * insight'ı belirleyen 6 girdi + 7 hesap çıktısı + locale. Slider'larda
 * tek bir piksel oynama bile yeni hesap üretir (RoiPdfData zaten
 * round'lanmış değerlerle gelir, dolayısıyla hash stable).
 */
export function buildInsightCacheKey(
  data: RoiPdfData,
  locale: 'tr' | 'en',
): string {
  const parts = [
    `loc:${locale}`,
    `id:${(data.email || data.restaurantName).toLowerCase().trim()}`,
    `sec:${data.sector}`,
    `cust:${data.monthlyCustomers}`,
    `tick:${data.avgTicket}`,
    `goo:${data.currentGoogle.toFixed(1)}`,
    `low:${data.lowRatingsPerMonth}`,
    `pl:${[...data.platforms].sort().join(',')}`,
    `plan:${data.plan}`,
    // Hesap çıktıları cache key'e dahil — projeksiyon farklıysa farklı
    // insight; aynıysa aynı.
    `rev:${Math.round(data.reviewers)}`,
    `flt:${Math.round(data.filteredLowReviews)}`,
    `pgo:${data.projectedGoogle.toFixed(1)}`,
    `roi:${data.roiMultiple.toFixed(1)}`,
  ];
  const raw = parts.join('|');
  // SHA-256 → 16-char hex prefix; collision pratikte sıfır.
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
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
  // In-memory cache temizlik — Map sınırsız büyümesin (Vercel serverless
  // tek instance ~50 MB heap; her entry ~500 bytes, 100K entry rahat).
  // Yine de küçük bir cap koyalım: 5000 entry sonrası en eski silinir.
  if (memCache.size > 5_000) {
    const firstKey = memCache.keys().next().value;
    if (firstKey) memCache.delete(firstKey);
  }
}

// Lead deduplication: insight cache hit'i zaten "bu senaryo son 24 saatte
// gelmişti" anlamına gelir; ayrı API gerek yok — caller `getCachedInsight`
// dönüşünü `cached !== null` ile kontrol eder.
