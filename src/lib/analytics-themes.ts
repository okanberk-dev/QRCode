import { chatCompletion, hasOpenAIKey } from '@/lib/openai';
import { AI_QUOTAS, checkLayeredAiQuota } from '@/lib/ai-quota';
import { safeParseJson } from '@/lib/safe-json';

export interface ThemeItem {
  theme: string;
  count: number;
  /**
   * Phase 8c+ (CLAUDE.md §38.20) — tasarım .design-owner-2026/page-analytics
   * Topics sentiment progress paterni. 0-100 range; OpenAI prompt model'in
   * "bu tema yorumlarda ne kadar olumlu" yargısı. Optional — eski cache
   * entry'lerde yok, UI graceful skip yapar.
   */
  sentimentPositivePct?: number;
  /**
   * §38.58 — `a/` bundle parity (a/page-dashboard.jsx:294-298 SIK BAHSEDİLEN
   * 3-segment stacked bar pos/**neu**/neg). Tasarım birebir için neutral +
   * negative ayrı yüzde gerek. Toplam pos+neu+neg = 100. Model uymadıysa 3
   * field birden undefined kalır → UI 2-segment fallback'a düşer.
   */
  sentimentNeutralPct?: number;
  sentimentNegativePct?: number;
}

export interface ThemesResult {
  /** Top 5 ortak temalar — rating bağımsız, müşterilerin en sık dile getirdiği. */
  themes: ThemeItem[];
  /** AI tarafından üretilen kısa çıkarım/sentez (1-2 cümle). Boş olabilir. */
  synthesis: string;
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
// Owner panelin uzun süredir AI'ı tetikleyemediği şikayeti — eski 8 eşiği
// çoğu küçük restoranda hiç tetiklenmiyordu. 4 yoruma indirildi (Buaze
// kohortunda restoran başına ortalama yorum hacmi düşük).
const MIN_COMMENTS_FOR_AI = 4;

// Cache key version prefix — §38.58 `a/` bundle parity (3-segment sentiment:
// pos/neu/neg) için v2 → v3 bump. Eski v2 cache entry'lerinde sadece
// sentimentPositivePct vardı; yeni v3'te neu + neg de gelir. Çağıranlar cache
// key değiştirmez; helper otomatik prefix'ler.
const CACHE_KEY_VERSION = 'v3';

const SYSTEM_PROMPT_TR = `Sen bir restoran müşteri-deneyim analistisin. Aşağıda yorumları rating + metin formatında alacaksın.

Görev:
1. **themes**: Tüm yorumları (rating bağımsız) tarayıp müşterilerin en sık dile getirdiği 5 ortak temayı çıkar. Tema KISA olmalı (2-4 kelime), nötr veya hafif yönlü ifade et (örn. "Bekleme süresi", "Lezzet", "Personel ilgisi", "Fiyat/performans"). Aynı temayı farklı yorumlarda say (count = kaç yorumda geçtiğini tahmin et).
2. **sentimentPositivePct + sentimentNeutralPct + sentimentNegativePct**: Her tema için bu temadan bahseden yorumların duygu dağılımı (0-100 arası 3 tam sayı, TOPLAM 100 OLMALI). pozitif = övgü/memnuniyet, nötr = ne övgü ne şikayet (yorum, gözlem, beklenti), negatif = şikayet/eleştiri. Rating + metin tonu birlikte dikkate al.
3. **synthesis**: 1-2 cümlelik genel çıkarım. Restoran sahibine pratik bir bilgi: hangi konu öne çıkıyor, ne yöne işaret ediyor. "Müşteriler genellikle…", "Temel sinyal…" gibi başlat. Övgü ve eleştiri varsa dengeli özetle.

Yanıtını YALNIZCA aşağıdaki JSON formatında ver, başka açıklama yapma:
{"themes":[{"theme":"...","count":N,"sentimentPositivePct":X,"sentimentNeutralPct":Y,"sentimentNegativePct":Z}, ...max 5 madde],"synthesis":"..."}

Yorum yetersizse boş array + boş synthesis döndür.`;

const SYSTEM_PROMPT_EN = `You are a restaurant customer-experience analyst. You'll receive comments as rating + text.

Task:
1. **themes**: Across all comments (rating-agnostic) extract the top 5 most-mentioned topics. Themes must be SHORT (2-4 words), neutral or lightly-toned (e.g. "Wait time", "Taste", "Staff attentiveness", "Price/value"). Estimate count = how many comments mention each theme.
2. **sentimentPositivePct + sentimentNeutralPct + sentimentNegativePct**: For each theme, the sentiment breakdown of comments mentioning it (3 integers 0-100, MUST SUM TO 100). positive = praise/satisfaction, neutral = neither praise nor complaint (observation, expectation), negative = complaint/criticism. Consider rating + text tone together.
3. **synthesis**: A 1-2 sentence overall inference. Practical info for the owner: which topic stands out, what direction it points to. Start with "Customers mostly…" or "Key signal…". If both praise and criticism exist, summarize balanced.

Respond with ONLY this JSON, no other text:
{"themes":[{"theme":"...","count":N,"sentimentPositivePct":X,"sentimentNeutralPct":Y,"sentimentNegativePct":Z}, ...max 5 items],"synthesis":"..."}

Empty array + empty synthesis if not enough comments.`;

function emptyResult(source: ThemesResult['source']): ThemesResult {
  return { themes: [], synthesis: '', source };
}

function parseLLMJson(raw: string): { themes: ThemeItem[]; synthesis: string } | null {
  // Model bazen ```json ... ``` ile sarar, bazen ham JSON. İkisini de tolere et.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  // safeParseJson tags `kind: json-parse-failure` to Sentry on a `�`-style
  // malformed response so the next occurrence is debuggable from the
  // dashboard alone (CLAUDE.md §38.8 + Görev G).
  const parsed = safeParseJson<{ themes?: unknown; synthesis?: unknown }>(
    cleaned,
    { source: 'analytics-themes' },
  );
  if (!parsed || typeof parsed !== 'object') return null;
  const themesIn = Array.isArray(parsed.themes) ? parsed.themes : [];
  const themes: ThemeItem[] = themesIn
    .filter((x: unknown): x is {
      theme: string;
      count: number;
      sentimentPositivePct?: number;
      sentimentNeutralPct?: number;
      sentimentNegativePct?: number;
    } => {
      if (!x || typeof x !== 'object') return false;
      const o = x as Record<string, unknown>;
      return typeof o.theme === 'string' && typeof o.count === 'number';
    })
    .map((x: {
      theme: string;
      count: number;
      sentimentPositivePct?: number;
      sentimentNeutralPct?: number;
      sentimentNegativePct?: number;
    }) => {
      const item: ThemeItem = {
        theme: String(x.theme).trim().slice(0, 60),
        count: Math.max(0, Math.min(999, Math.round(x.count))),
      };
      // §38.58 — 3-segment sentiment (pos/neu/neg). Model çoğunlukla 3 alanı
      // birden döner; toplam 100'e normalize edilir (model arada drift edebilir
      // — örn. pos=70 + neu=20 + neg=15 = 105). En az pos set'liyse alanlar
      // tutulur; eksik alanlar 0 farsayılır + son alan complement (toplam 100)
      // ile dengelenir.
      const pos = typeof x.sentimentPositivePct === 'number' && Number.isFinite(x.sentimentPositivePct)
        ? Math.max(0, Math.min(100, Math.round(x.sentimentPositivePct)))
        : null;
      const neu = typeof x.sentimentNeutralPct === 'number' && Number.isFinite(x.sentimentNeutralPct)
        ? Math.max(0, Math.min(100, Math.round(x.sentimentNeutralPct)))
        : null;
      const neg = typeof x.sentimentNegativePct === 'number' && Number.isFinite(x.sentimentNegativePct)
        ? Math.max(0, Math.min(100, Math.round(x.sentimentNegativePct)))
        : null;
      if (pos !== null) {
        item.sentimentPositivePct = pos;
        // Eksik alanlar 0 fallback; toplam 100'e clamp.
        const neuVal = neu ?? 0;
        const negVal = neg ?? Math.max(0, 100 - pos - neuVal);
        const total = pos + neuVal + negVal;
        // Toplam 100'den sapıyorsa (drift): pos sabit, neu sabit, neg = 100 - pos - neu.
        if (total !== 100) {
          item.sentimentNeutralPct = neuVal;
          item.sentimentNegativePct = Math.max(0, Math.min(100 - pos - neuVal, 100 - pos));
        } else {
          item.sentimentNeutralPct = neuVal;
          item.sentimentNegativePct = negVal;
        }
      }
      return item;
    })
    .filter((x: ThemeItem) => x.theme.length > 0)
    .slice(0, 5);
  const synthesis = typeof parsed.synthesis === 'string'
    ? parsed.synthesis.trim().slice(0, 320)
    : '';
  return { themes, synthesis };
}

export async function extractThemes(
  comments: Array<{ rating: number; comment: string }>,
  locale: 'tr' | 'en',
  cacheKey: string,
  /** Workspace owner identifier (CLAUDE.md §15.1 ai-quota.ts layered cap).
   *  cacheKey'in workspace prefix'i olabilir; opsiyonel — verilmezse sadece
   *  global cap uygulanır. */
  workspaceId?: string,
): Promise<ThemesResult> {
  // Phase 8c+ (CLAUDE.md §38.20) — version prefix sentiment field eklenince
  // eski cache entry'leri (sentiment yok) invalidate eder. Çağıranların
  // cache key'i değiştirmesine gerek yok; helper otomatik bumplar.
  const versionedKey = `${CACHE_KEY_VERSION}:${cacheKey}`;

  // Cache hit
  const cached = cache.get(versionedKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  // Yetersiz veri veya OpenAI key yoksa empty fallback
  if (comments.length < MIN_COMMENTS_FOR_AI || !hasOpenAIKey()) {
    return emptyResult('fallback');
  }

  // AI quota guard — cache miss ve veri eşiği geçildikten sonra OpenAI
  // çağrısı öncesi. Quota dolarsa empty fallback (UI'da AI section gizli).
  const quotaLayers = workspaceId
    ? [
        { scope: 'analytics-themes:ws', identifier: workspaceId, dailyLimit: AI_QUOTAS.ANALYTICS_THEMES_WORKSPACE_DAY },
        { scope: 'analytics-themes:global', identifier: 'global', dailyLimit: AI_QUOTAS.ANALYTICS_THEMES_GLOBAL_DAY },
      ]
    : [
        { scope: 'analytics-themes:global', identifier: 'global', dailyLimit: AI_QUOTAS.ANALYTICS_THEMES_GLOBAL_DAY },
      ];
  const quota = await checkLayeredAiQuota(quotaLayers);
  if (!quota.allowed) {
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
    themes: parsed.themes,
    synthesis: parsed.synthesis,
    source: 'openai',
  };

  // Prune + evict insert öncesi (yeni entry için yer aç)
  insertCounter += 1;
  if (insertCounter % PRUNE_INTERVAL === 0) pruneExpired();
  evictIfNeeded();
  cache.set(versionedKey, { result, expiresAt: Date.now() + TTL_MS });
  return result;
}
