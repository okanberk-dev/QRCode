// Phase 8c+ §38.34 — Analytics sayfasında AI İÇGÖRÜLER · BU HAFTA dark card
// için structured 3-segment helper. Tasarım kaynağı:
// .design-owner-2026/project/page-analytics.jsx line 285-315 (TREND/KAZANIM/
// RİSK 3-row dark card).
//
// CLAUDE.md §21.38 `extractWeeklyInsight` helper'ı pattern'i reuse:
//   - process-local cache (1 hafta TTL)
//   - fail-safe fallback (OpenAI key yok / parse fail / quota → empty)
//   - cost-aware (gpt-4o-mini)
//   - safeParseJson (CLAUDE.md §38.9)
//
// extractWeeklyInsight (mail için summary + recommendation) shape farklı;
// bu helper analytics page için özel 3-segment output.

import { chatCompletion, hasOpenAIKey } from '@/lib/openai';
import { AI_QUOTAS, AI_QUOTA_WEEK_MS, checkLayeredAiQuota } from '@/lib/ai-quota';
import { safeParseJson } from '@/lib/safe-json';

export interface StructuredInsight {
  /** "Servis hızı şikayetleri Cuma akşamları %42 artıyor — ek garson planı..." */
  trend: string;
  /** "Yeni mantar makarna menü öğesi %94 pozitif yorum aldı — Instagram'da öne çıkar." */
  win: string;
  /** "Park kelimesi 3 hafta üst üste negatif eğilim. Anlaşmalı park indirim..." */
  risk: string;
  source: 'openai' | 'fallback';
}

export interface StructuredInsightInput {
  /** Up to 50 yorum (rating + comment); helper internal MAX_COMMENTS slice. */
  comments: Array<{ rating: number; comment: string }>;
  /** Last 7 day rating breakdown (5/4/3/2/1 counts). UI için dağılım hint. */
  ratingDistribution?: Record<number, number>;
}

interface CacheEntry {
  result: StructuredInsight;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 hafta — pazartesi yeniler
const MAX_CACHE_SIZE = 200;
const MAX_COMMENTS_TO_SEND = 50;
const MIN_COMMENTS_FOR_AI = 5;

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function evictIfNeeded(): void {
  while (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

function emptyResult(source: StructuredInsight['source']): StructuredInsight {
  return { trend: '', win: '', risk: '', source };
}

const SYSTEM_PROMPT_TR = `Sen bir restoran müşteri-deneyim danışmanısın. Restoran sahibine bu haftaki yorumlardan 3 ayrı kategoride somut, aksiyon-odaklı çıkarım hazırlayacaksın.

Kurallar:
- Türkçe, profesyonel ve doğrudan ton. Emoji yok.
- "trend": 1 cümle. Haftada öne çıkan tekrarlanan örüntü (servis/lezzet/atmosfer/fiyat). Sayı + zaman bağlamı (örn. "Cuma akşamları", "%42 arttı"). Aksiyon önerisi içerir.
- "win": 1 cümle. Pozitif kazanım — yeni menü öğesi, müşteri yorumu, atmosfer iyileşmesi. Spesifik kelime + yüzde.
- "risk": 1 cümle. Negatif eğilim erken-uyarı — kelime + süreklilik (örn. "3 hafta üst üste"). Konkret çözüm önerisi içerir.
- Eğer yeterli sinyal yoksa o field'ı boş string bırak ("trend": "" gibi).

YALNIZCA aşağıdaki JSON formatında yanıt ver, başka açıklama yapma:
{"trend":"...","win":"...","risk":"..."}`;

const SYSTEM_PROMPT_EN = `You are a restaurant customer-experience consultant. You'll prepare 3 distinct concrete, action-oriented insights from this week's reviews for the restaurant owner.

Rules:
- English, professional and direct. No emojis.
- "trend": 1 sentence. The week's recurring pattern (service/taste/ambiance/price). Number + time context (e.g. "Friday evenings", "+42%"). Includes action suggestion.
- "win": 1 sentence. Positive gain — new menu item, customer remark, ambiance improvement. Specific keyword + percentage.
- "risk": 1 sentence. Negative trend early-warning — keyword + persistence (e.g. "3 weeks in a row"). Includes concrete remedy.
- If a field has insufficient signal, leave it as empty string ("trend": "" etc.).

Respond ONLY with this JSON, no other text:
{"trend":"...","win":"...","risk":"..."}`;

/**
 * Analytics sayfasında AI İÇGÖRÜLER · BU HAFTA dark card için 3-segment
 * structured çıkarım. Cache 1 hafta — Pazartesi yenilenir. Fail-safe;
 * key yok / parse fail → empty (UI kart gizlenir).
 *
 * cacheKey önerisi: `analytics-structured:${userId}:${ISO_WEEK}`
 */
/** Cached result only (no AI call): lets pages render without waiting (§58). */
export function getCachedStructuredInsight(cacheKey: string): StructuredInsight | null {
  const cached = cache.get(cacheKey);
  return cached && cached.expiresAt > Date.now() ? cached.result : null;
}

export async function extractStructuredInsight(
  input: StructuredInsightInput,
  locale: 'tr' | 'en',
  cacheKey: string,
  workspaceId?: string,
): Promise<StructuredInsight> {
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  if (input.comments.length < MIN_COMMENTS_FOR_AI || !hasOpenAIKey()) {
    return emptyResult('fallback');
  }

  // AI quota guard — weekly window (extractWeeklyInsight ile aynı bucket
  // çünkü cost benzer).
  const quotaLayers = workspaceId
    ? [
        {
          scope: 'weekly-insight:ws',
          identifier: workspaceId,
          dailyLimit: AI_QUOTAS.WEEKLY_INSIGHT_WORKSPACE_WEEK,
          windowMs: AI_QUOTA_WEEK_MS,
        },
        {
          scope: 'weekly-insight:global',
          identifier: 'global',
          dailyLimit: AI_QUOTAS.WEEKLY_INSIGHT_GLOBAL_WEEK,
          windowMs: AI_QUOTA_WEEK_MS,
        },
      ]
    : [
        {
          scope: 'weekly-insight:global',
          identifier: 'global',
          dailyLimit: AI_QUOTAS.WEEKLY_INSIGHT_GLOBAL_WEEK,
          windowMs: AI_QUOTA_WEEK_MS,
        },
      ];
  const quota = await checkLayeredAiQuota(quotaLayers);
  if (!quota.allowed) {
    return emptyResult('fallback');
  }

  const sample = input.comments.slice(0, MAX_COMMENTS_TO_SEND);
  const userBlock = sample
    .map((c) => `[${c.rating}★] ${c.comment.slice(0, 240)}`)
    .join('\n');
  const distHint = input.ratingDistribution
    ? `Rating dağılımı: ${Object.entries(input.ratingDistribution)
        .map(([r, n]) => `${r}★:${n}`)
        .join(' | ')}`
    : '';

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: locale === 'tr' ? SYSTEM_PROMPT_TR : SYSTEM_PROMPT_EN },
    { role: 'user', content: distHint ? `${distHint}\n\nYorumlar:\n${userBlock}` : userBlock },
  ];

  let raw: string | null = null;
  try {
    raw = await chatCompletion(messages, {
      maxTokens: 360,
      temperature: 0.4,
    });
  } catch {
    return emptyResult('fallback');
  }
  if (!raw) return emptyResult('fallback');

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed = safeParseJson<{ trend?: unknown; win?: unknown; risk?: unknown }>(
    cleaned,
    { source: 'weekly-structured-insight' },
  );
  if (!parsed || typeof parsed !== 'object') return emptyResult('fallback');

  const trend = typeof parsed.trend === 'string' ? parsed.trend.trim().slice(0, 280) : '';
  const win = typeof parsed.win === 'string' ? parsed.win.trim().slice(0, 280) : '';
  const risk = typeof parsed.risk === 'string' ? parsed.risk.trim().slice(0, 280) : '';

  if (!trend && !win && !risk) {
    return emptyResult('fallback');
  }

  const result: StructuredInsight = { trend, win, risk, source: 'openai' };
  pruneExpired();
  evictIfNeeded();
  cache.set(cacheKey, { result, expiresAt: Date.now() + TTL_MS });
  return result;
}

// Test exports — internal helper'ları test'te smoke için.
export const _testing = {
  emptyResult,
};
