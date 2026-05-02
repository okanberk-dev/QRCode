import { chatCompletion, hasOpenAIKey } from '@/lib/openai';

export interface WeeklyInsightInput {
  restaurantName: string;
  total: number;
  avgRating: number;
  highRatings: number;
  lowRatings: number;
  distribution: Record<number, number>;
  aspects: { food: number | null; service: number | null; atmosphere: number | null };
  /** Up to 30 yorum metni (rating + comment). Boş array kabul. */
  comments: Array<{ rating: number; comment: string }>;
}

export interface WeeklyInsight {
  /** 2-3 cümlelik özet ve anlam çıkarımı. Restoran sahibi için pratik. */
  summary: string;
  /** 1 actionable öneri (örn. "Hafta sonu personeli artırarak…"). */
  recommendation: string;
  source: 'openai' | 'fallback';
}

interface CacheEntry {
  result: WeeklyInsight;
  expiresAt: number;
}

// Process-local cache — cron çalışmasıyla 24h TTL. Aynı restoran için
// Pazartesi mailini birden fazla tetiklersek (manuel test, replay) OpenAI
// faturasını tekrar yakmayız. CLAUDE.md §15 + §34.9 analytics-themes ile
// aynı disiplin. Vercel serverless cold start'ta sıfırlanır, kabul edilen
// drift (worst-case duplicate API call).
const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 saat
const MAX_CACHE_SIZE = 200;
let insertCounter = 0;
const PRUNE_INTERVAL = 50;

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

const MAX_COMMENTS_TO_SEND = 30;
// Haftalık raporda yorum az olsa bile genel istatistikten anlamlı çıkarım
// yapılabiliyor (avg + distribution + aspects). 0 yorumda bile total > 0
// ise AI bağlam kurabilir. Yine de gürültü/cost dengesi için min 1 yorum.
const MIN_TOTAL_FOR_AI = 1;

const SYSTEM_PROMPT_TR = `Sen bir restoran müşteri-deneyim danışmanısın. Restoran sahibine 7 günlük özet rapor için kısa, doğrudan ve aksiyon-odaklı bir AI çıkarımı hazırlayacaksın.

Kurallar:
- Türkçe yaz, profesyonel ve sıcak ton.
- "summary": 2-3 cümle. Haftanın genel görüntüsü + öne çıkan sinyal. Numerik tekrar etme (mail zaten istatistikleri gösteriyor); yorumlardan + kategorilerden çıkarım yap.
- "recommendation": 1 cümle. Önümüzdeki haftaya somut bir aksiyon önerisi. Genel ("hizmet kalitesini artırın") değil, spesifik ("hafta sonu öğle servisinde ekibi takviye edin").
- Emoji kullanma. "Bence", "sanırım" gibi belirsizlik ifadelerinden kaçın. Doğrudan konuş.

Yanıtını YALNIZCA aşağıdaki JSON formatında ver, başka açıklama yapma:
{"summary":"...","recommendation":"..."}`;

const SYSTEM_PROMPT_EN = `You are a restaurant customer-experience consultant. You'll prepare a short, direct, action-oriented AI inference for the owner's 7-day summary.

Rules:
- English, professional warm tone.
- "summary": 2-3 sentences. The week's general picture + standout signal. Don't repeat numerics (mail already shows them); infer from comments and aspects.
- "recommendation": 1 sentence. A concrete action for next week. Not generic ("improve quality") but specific ("reinforce weekend lunch staff").
- No emojis. No hedging ("I think", "maybe"). Speak directly.

Respond ONLY with this JSON, no other text:
{"summary":"...","recommendation":"..."}`;

function emptyResult(source: WeeklyInsight['source']): WeeklyInsight {
  return { summary: '', recommendation: '', source };
}

function parseLLMJson(raw: string): { summary: string; recommendation: string } | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return null;
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 400) : '';
    const recommendation = typeof parsed.recommendation === 'string' ? parsed.recommendation.trim().slice(0, 240) : '';
    if (!summary && !recommendation) return null;
    return { summary, recommendation };
  } catch {
    return null;
  }
}

/**
 * Restoran 7-günlük dataset'inden Pulse AI çıkarımı çıkarır. Haftalık digest
 * mailine inline gömülür. CLAUDE.md §15 helper pattern'i — process-local
 * cache, fail-safe fallback, cost-aware (gpt-4o-mini, ~$0.0002/istek).
 *
 * cacheKey: önerilen format `${restaurantId}:${ISO-week}` — aynı haftada
 * cron retry'larında tekrar API çağırılmaz.
 */
export async function extractWeeklyInsight(
  input: WeeklyInsightInput,
  locale: 'tr' | 'en',
  cacheKey: string,
): Promise<WeeklyInsight> {
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  if (input.total < MIN_TOTAL_FOR_AI || !hasOpenAIKey()) {
    return emptyResult('fallback');
  }

  const aspectsSummary = [
    input.aspects.food !== null ? `yemek ${input.aspects.food.toFixed(1)}` : null,
    input.aspects.service !== null ? `servis ${input.aspects.service.toFixed(1)}` : null,
    input.aspects.atmosphere !== null ? `atmosfer ${input.aspects.atmosphere.toFixed(1)}` : null,
  ].filter(Boolean).join(', ');

  const distLine = [5, 4, 3, 2, 1]
    .map((s) => `${s}★:${input.distribution[s] || 0}`)
    .join(' ');

  const commentSamples = input.comments
    .slice(0, MAX_COMMENTS_TO_SEND)
    .map((c) => `[${c.rating}★] ${c.comment.slice(0, 220).replace(/\s+/g, ' ').trim()}`)
    .join('\n');

  const userPayload = locale === 'tr'
    ? `Restoran: ${input.restaurantName}
Hafta: 7 gün
Toplam yorum: ${input.total}
Ortalama: ${input.avgRating}
Dağılım: ${distLine}
Yüksek puan: ${input.highRatings} · Düşük puan: ${input.lowRatings}
${aspectsSummary ? `Boyut ortalamaları: ${aspectsSummary}` : ''}

Yorumlar (sample, en fazla ${MAX_COMMENTS_TO_SEND}):
${commentSamples || '(metinli yorum yok — istatistik üzerinden çıkarım yap)'}`
    : `Restaurant: ${input.restaurantName}
Week: 7 days
Total reviews: ${input.total}
Average: ${input.avgRating}
Distribution: ${distLine}
High: ${input.highRatings} · Low: ${input.lowRatings}
${aspectsSummary ? `Aspect averages: ${aspectsSummary}` : ''}

Comments (sample, up to ${MAX_COMMENTS_TO_SEND}):
${commentSamples || '(no text comments — infer from stats)'}`;

  const systemPrompt = locale === 'tr' ? SYSTEM_PROMPT_TR : SYSTEM_PROMPT_EN;

  const raw = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPayload },
    ],
    { temperature: 0.4, maxTokens: 380, timeoutMs: 12_000 },
  );

  if (!raw) {
    return emptyResult('fallback');
  }

  const parsed = parseLLMJson(raw);
  if (!parsed) {
    console.error('[weekly-insight] LLM JSON parse failed', raw.slice(0, 200));
    return emptyResult('fallback');
  }

  const result: WeeklyInsight = {
    summary: parsed.summary,
    recommendation: parsed.recommendation,
    source: 'openai',
  };

  insertCounter += 1;
  if (insertCounter % PRUNE_INTERVAL === 0) pruneExpired();
  evictIfNeeded();
  cache.set(cacheKey, { result, expiresAt: Date.now() + TTL_MS });
  return result;
}
