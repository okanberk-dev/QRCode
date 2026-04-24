// AI Co-Pilot reply suggestion. Calls OpenAI when `OPENAI_API_KEY` is
// set; otherwise falls back to a deterministic template so the UI keeps
// working in dev/preview without the secret.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { buildReplyTemplate } from '@/lib/scaffolding';
import { chatCompletion, hasOpenAIKey } from '@/lib/openai';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limit = rateLimit(`ai-suggest:${actor.id}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const { id } = await params;
  let body: { locale?: 'tr' | 'en' } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const locale: 'tr' | 'en' = body.locale === 'en' ? 'en' : 'tr';

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      rating: true,
      comment: true,
      name: true,
      platform: true,
      restaurantId: true,
      restaurant: { select: { name: true, category: true } },
    },
  });

  if (!feedback || !feedback.restaurantId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (!(await canAccessRestaurant(actor, feedback.restaurantId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const fallback = buildReplyTemplate({
    name: feedback.name,
    rating: feedback.rating,
    locale,
  });

  if (!hasOpenAIKey()) {
    return NextResponse.json({
      feedbackId: id,
      suggestion: fallback,
      source: 'template',
    });
  }

  const systemPrompt =
    locale === 'tr'
      ? `Sen bir restoran itibar yönetim uzmanısın. Restoran sahibinin müşteri yorumuna yanıt taslağı yazıyorsun. Kurallar:
- Samimi, profesyonel, kısa (2-4 cümle, maks. 80 kelime).
- Olumlu yorumlar için teşekkür et, yeniden ağırlamaya davet et.
- Olumsuz yorumlar için önce özür dile, sorumluluğu kabul et, somut düzeltme sözü ver (ücretsiz ikramdan bahsetme), tekrar gelme fırsatı ver.
- Emoji kullanma. Klişelerden kaçın. Müşteri adını varsa ilk adıyla kullan.
- Sadece yanıt metnini yaz; "İşte yanıt:" gibi ön söz ekleme.`
      : `You're a restaurant reputation expert drafting replies to customer reviews. Rules:
- Warm, professional, short (2-4 sentences, max 80 words).
- For positive reviews: thank them, invite them back.
- For negative reviews: apologize first, acknowledge specifics, promise a concrete fix (do NOT offer free items), invite them to give you another chance.
- No emojis. Avoid clichés. Use the customer's first name if available.
- Output ONLY the reply text; no "Here's the reply:" preamble.`;

  const userPrompt = [
    locale === 'tr' ? 'İşletme:' : 'Business:',
    `${feedback.restaurant?.name ?? '—'}${feedback.restaurant?.category ? ` (${feedback.restaurant.category})` : ''}`,
    '',
    locale === 'tr' ? 'Müşteri:' : 'Customer:',
    feedback.name ?? (locale === 'tr' ? 'Bilinmiyor' : 'Unknown'),
    '',
    locale === 'tr' ? 'Puan:' : 'Rating:',
    `${feedback.rating}/5`,
    '',
    locale === 'tr' ? 'Platform:' : 'Platform:',
    feedback.platform ?? (locale === 'tr' ? 'Doğrudan' : 'Direct'),
    '',
    locale === 'tr' ? 'Yorum:' : 'Comment:',
    feedback.comment ?? (locale === 'tr' ? '(yorum yazmamış)' : '(no comment)'),
  ].join('\n');

  const suggestion = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 300 },
  );

  if (!suggestion) {
    return NextResponse.json({
      feedbackId: id,
      suggestion: fallback,
      source: 'template-fallback',
    });
  }

  return NextResponse.json({
    feedbackId: id,
    suggestion,
    source: 'openai',
  });
}
