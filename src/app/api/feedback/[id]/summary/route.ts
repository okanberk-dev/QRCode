import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { hasOpenAIKey, chatCompletion } from '@/lib/openai';
import { rateLimit } from '@/lib/rate-limit';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { safeParseJson } from '@/lib/safe-json';

// §38.53 — Pulse AI feedback özet (3-sinyal). Tasarım kaynağı:
// .design-owner-2026/page-feedbacks.jsx "AI ÖZET" card (Pozitif / İyileştirme /
// Tekrar gelme niyeti).
//
// Mevcut /api/feedback/[id]/suggest-reply yanıt taslağı üretir; bu endpoint
// 3-segment yapılandırılmış özet üretir. JSON output ile UI render güvenli.
//
// Cache: process-local 24h Map (feedback content değişmez, idempotent).
// Rate limit: 30/dk/owner — suggest-reply ile aynı paterni (CLAUDE.md §15).
// Empty state: yorum boş veya OpenAI key yok → fallback empty result.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SummaryResult {
  positives: string[];
  improvements: string[];
  returnIntent: 'high' | 'medium' | 'low';
  source: 'openai' | 'fallback';
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { result: SummaryResult; expiresAt: number }>();

function getCached(feedbackId: string): SummaryResult | null {
  const entry = cache.get(feedbackId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(feedbackId);
    return null;
  }
  return entry.result;
}

function setCached(feedbackId: string, result: SummaryResult) {
  cache.set(feedbackId, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

const FALLBACK: SummaryResult = {
  positives: [],
  improvements: [],
  returnIntent: 'medium',
  source: 'fallback',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // IDOR — feedback'i fetch et + restaurant access check.
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      rating: true,
      comment: true,
    },
  });
  if (!feedback) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (!feedback.restaurantId || !(await canAccessRestaurant(actor, feedback.restaurantId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Cache check
  const cached = getCached(id);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Empty content — fallback (yorum yoksa AI çağrısı maliyetsiz)
  if (!feedback.comment || feedback.comment.trim().length < 10) {
    const result = { ...FALLBACK };
    setCached(id, result);
    return NextResponse.json(result);
  }

  // Rate limit per workspace owner
  const ownerId = (await resolveOwnerUserId(actor)) ?? actor.id;
  const rl = await rateLimit(`feedback:summary:${ownerId}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ...FALLBACK, error: 'rate_limited' },
      { status: 429 },
    );
  }

  // OpenAI key check
  if (!hasOpenAIKey()) {
    const result = { ...FALLBACK };
    setCached(id, result);
    return NextResponse.json(result);
  }

  // Locale detect — TR default
  const url = new URL(req.url);
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';

  const systemPrompt = isTr
    ? 'Restoran müşteri yorumlarını analiz eden uzman bir asistansın. Yorumdan 3 sinyal çıkar: pozitif yönler (1-3 madde), iyileştirme önerileri (0-3 madde), tekrar gelme niyeti (high/medium/low). Madde başına max 8 kelime. JSON formatında dön.'
    : 'You are an expert assistant analyzing restaurant customer reviews. Extract 3 signals from the comment: positives (1-3 items), improvements (0-3 items), return intent (high/medium/low). Max 8 words per item. Respond in JSON format.';

  const userPrompt = isTr
    ? `Yorum (${feedback.rating}/5): "${feedback.comment}"\n\nJSON formatı: {"positives": [...], "improvements": [...], "returnIntent": "high"|"medium"|"low"}`
    : `Review (${feedback.rating}/5): "${feedback.comment}"\n\nJSON format: {"positives": [...], "improvements": [...], "returnIntent": "high"|"medium"|"low"}`;

  try {
    const content = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        maxTokens: 300,
        temperature: 0.3,
      },
    );

    if (!content) {
      const result = { ...FALLBACK };
      setCached(id, result);
      return NextResponse.json(result);
    }

    const parsed = safeParseJson<{
      positives?: unknown;
      improvements?: unknown;
      returnIntent?: unknown;
    }>(content, {
      source: 'feedback-summary',
    });

    if (!parsed) {
      const result = { ...FALLBACK };
      setCached(id, result);
      return NextResponse.json(result);
    }

    const positives = Array.isArray(parsed.positives)
      ? parsed.positives.filter((p): p is string => typeof p === 'string').slice(0, 3)
      : [];
    const improvements = Array.isArray(parsed.improvements)
      ? parsed.improvements.filter((p): p is string => typeof p === 'string').slice(0, 3)
      : [];
    const returnIntent: SummaryResult['returnIntent'] =
      parsed.returnIntent === 'high' || parsed.returnIntent === 'low'
        ? parsed.returnIntent
        : 'medium';

    const result: SummaryResult = {
      positives,
      improvements,
      returnIntent,
      source: 'openai',
    };
    setCached(id, result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[feedback-summary]', { feedbackId: id, error: error instanceof Error ? error.message : String(error) });
    const result = { ...FALLBACK };
    setCached(id, result);
    return NextResponse.json(result);
  }
}
