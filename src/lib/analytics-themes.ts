import { chatCompletion, hasOpenAIKey } from '@/lib/openai';

export interface ThemeItem {
  theme: string;
  count: number;
}

export interface ThemesResult {
  complaints: ThemeItem[];
  praises: ThemeItem[];
  source: 'openai' | 'fallback';
}

interface CacheEntry {
  result: ThemesResult;
  expiresAt: number;
}

// Process-local cache — Vercel serverless cold start'ta sıfırlanır, kabul
// edilen drift. OpenAI maliyetini azaltır (~$0.0005/istek): owner panel
// refresh'inde 1 saat içinde aynı (restaurant + window + filter) sorgusu
// cache'den dönülür.
//
// Map JavaScript spec gereği insertion order korur → FIFO eviction
// MAX_CACHE_SIZE'ı aştığımızda en eski entry silinir. Ek olarak her
// PRUNE_INTERVAL insert'te expired entry'ler temizlenir (long-lived
// instance'da unbounded growth + memory leak önleme).
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000; // 1 saat
const MAX_CACHE_SIZE = 200; // ~10MB üst sınır (50KB/entry × 200)
const PRUNE_INTERVAL = 50; // her N insert'te expired temizliği
let insertCounter = 0;

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function evictIfNeeded(): void {
  // FIFO eviction — Map iterator ilk eklenen key'i döner.
  while (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

const MAX_COMMENTS_TO_SEND = 80; // ~500-700 token; gpt-4o-mini'de hızlı
const MIN_COMMENTS_FOR_AI = 8; // 8'den az yorum varsa AI çağrısı anlamsız

const SYSTEM_PROMPT_TR = `Sen bir restoran müşteri-deneyim analistisin. Aşağıda yorumları rating + metin formatında alacaksın. Görevin:

1. **complaints**: Düşük puan (≤3★) yorumlardan en sık tekrarlanan 5 ortak tema/şikayet konusu çıkar. Tema KISA olmalı (2-4 kelime), eyleme dönük (örn. "Bekleme süresi uzun", "Yemek soğuk", "Personel ilgisiz"). Aynı temayı farklı yorumlarda say (count = kaç yorumda geçtiğini tahmin et).
2. **praises**: Yüksek puan (≥4★) yorumlardan en sık övülen 5 tema (örn. "Lezzet", "Hızlı servis", "Atmosfer").

Yanıtını YALNIZCA aşağıdaki JSON formatında ver, başka açıklama yapma:
{"complaints":[{"theme":"...","count":N}, ...5 madde],"praises":[{"theme":"...","count":N}, ...5 madde]}

Eğer ilgili kategoride yorum yoksa boş array döndür.`;

const SYSTEM_PROMPT_EN = `You are a restaurant customer-experience analyst. You'll receive feedback as rating + text. Task:

1. **complaints**: From low ratings (≤3★) extract the top 5 recurring complaint themes. Themes must be SHORT (2-4 words), actionable (e.g. "Long wait time", "Cold food", "Inattentive staff"). Estimate count = how many comments mention each theme.
2. **praises**: From high ratings (≥4★) extract the top 5 praised themes (e.g. "Taste", "Fast service", "Atmosphere").

Respond with ONLY this JSON, no other text:
{"complaints":[{"theme":"...","count":N}, ...5 items],"praises":[{"theme":"...","count":N}, ...5 items]}

Empty array if no comments in category.`;

function emptyResult(source: ThemesResult['source']): ThemesResult {
  return { complaints: [], praises: [], source };
}

function parseLLMJson(raw: string): { complaints: ThemeItem[]; praises: ThemeItem[] } | null {
  // Model bazen ```json ... ``` ile sarar, bazen ham JSON. İkisini de tolere et.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return null;
    const complaints = Array.isArray(parsed.complaints) ? parsed.complaints : [];
    const praises = Array.isArray(parsed.praises) ? parsed.praises : [];
    const sanitize = (arr: unknown[]): ThemeItem[] =>
      arr
        .filter((x): x is { theme: string; count: number } => {
          if (!x || typeof x !== 'object') return false;
          const o = x as Record<string, unknown>;
          return typeof o.theme === 'string' && typeof o.count === 'number';
        })
        .map((x) => ({
          theme: String(x.theme).trim().slice(0, 60),
          count: Math.max(0, Math.min(999, Math.round(x.count))),
        }))
        .filter((x) => x.theme.length > 0)
        .slice(0, 5);
    return { complaints: sanitize(complaints), praises: sanitize(praises) };
  } catch {
    return null;
  }
}

export async function extractThemes(
  comments: Array<{ rating: number; comment: string }>,
  locale: 'tr' | 'en',
  cacheKey: string,
): Promise<ThemesResult> {
  // Cache hit
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  // Yetersiz veri veya OpenAI key yoksa empty fallback
  if (comments.length < MIN_COMMENTS_FOR_AI || !hasOpenAIKey()) {
    return emptyResult('fallback');
  }

  // Prompt için yorumları kısalt: max 80 yorum, her yorum max 200 char.
  const sample = comments
    .slice(0, MAX_COMMENTS_TO_SEND)
    .map((c) => `[${c.rating}★] ${c.comment.slice(0, 200).replace(/\s+/g, ' ').trim()}`)
    .join('\n');

  const systemPrompt = locale === 'tr' ? SYSTEM_PROMPT_TR : SYSTEM_PROMPT_EN;

  const raw = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: sample },
    ],
    { temperature: 0.3, maxTokens: 500, timeoutMs: 12_000 },
  );

  if (!raw) {
    return emptyResult('fallback');
  }

  const parsed = parseLLMJson(raw);
  if (!parsed) {
    console.error('[analytics-themes] LLM JSON parse failed', raw.slice(0, 200));
    return emptyResult('fallback');
  }

  const result: ThemesResult = {
    complaints: parsed.complaints,
    praises: parsed.praises,
    source: 'openai',
  };

  // Prune + evict insert öncesi (yeni entry için yer aç)
  insertCounter += 1;
  if (insertCounter % PRUNE_INTERVAL === 0) pruneExpired();
  evictIfNeeded();
  cache.set(cacheKey, { result, expiresAt: Date.now() + TTL_MS });
  return result;
}
