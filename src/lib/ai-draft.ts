// Pulse AI draft generation helpers (CLAUDE.md §15). Shared by:
//   - /api/feedback/[id]/suggest-reply       — on-demand draft
//   - /api/feedback POST                      — auto-trigger when owner opted in
//
// Auto-send is intentionally NOT supported. Owner approval gate is hard
// (KVKK + brand voice). Helpers here only generate text + persist it as a
// pending FeedbackAiDraft row; consumption (delete) happens in the reply
// endpoint when the owner sends.
import { prisma } from '@/lib/prisma';
import { chatCompletion, hasOpenAIKey } from '@/lib/openai';
import { buildReplyTemplate } from '@/lib/scaffolding';

export type AiDraftTone = 'warm' | 'formal' | 'apologetic';
export type AiDraftLocale = 'tr' | 'en';

const TONE_VALUES: AiDraftTone[] = ['warm', 'formal', 'apologetic'];

export function isValidTone(value: unknown): value is AiDraftTone {
  return typeof value === 'string' && (TONE_VALUES as string[]).includes(value);
}

export function coerceTone(value: unknown, fallback: AiDraftTone = 'warm'): AiDraftTone {
  return isValidTone(value) ? value : fallback;
}

// System prompt — single source of truth for both on-demand and auto modes.
// Tone-specific guidance layered on top of common rules so behavior stays
// consistent across surfaces.
export function buildReplySystemPrompt(tone: AiDraftTone, locale: AiDraftLocale): string {
  if (locale === 'tr') {
    const common = [
      'Sen bir restoran itibar yönetim uzmanısın. Restoran sahibinin müşteri yorumuna yanıt taslağı yazıyorsun.',
      'Kurallar:',
      '- 2-4 cümle, maksimum 80 kelime.',
      '- Olumsuz yorumlarda ücretsiz ikram, indirim veya hediye vaat etme.',
      '- Emoji kullanma. Klişelerden kaçın. Müşteri adını varsa ilk adıyla kullan.',
      '- Sadece yanıt metnini yaz; "İşte yanıt:" gibi ön söz ekleme.',
    ];
    const toneLine =
      tone === 'formal'
        ? '- Ton: kurumsal ve mesafeli ama saygılı. "Sayın" hitabı kullan, samimiyetten kaçın.'
        : tone === 'apologetic'
          ? '- Ton: önce içten bir özür, somut sorumluluk kabulü, telafi adımı ve tekrar gelme daveti. Savunmacı olma.'
          : '- Ton: samimi ve profesyonel. "Merhaba" hitabı uygun. Olumlu yorumlara teşekkür + tekrar davet, olumsuz yorumlarda dinleme + somut düzeltme.';
    return [...common, toneLine].join('\n');
  }
  const common = [
    "You're a restaurant reputation expert drafting replies to customer reviews.",
    'Rules:',
    '- 2-4 sentences, max 80 words.',
    '- Never offer free items, discounts, or gifts in negative-rating replies.',
    "- No emojis. Avoid clichés. Use the customer's first name if available.",
    '- Output ONLY the reply text; no "Here\'s the reply:" preamble.',
  ];
  const toneLine =
    tone === 'formal'
      ? '- Tone: corporate and reserved yet respectful. Use formal address, avoid casual language.'
      : tone === 'apologetic'
        ? '- Tone: lead with a sincere apology, acknowledge specific responsibility, promise a concrete fix, invite them back. Do not get defensive.'
        : "- Tone: warm and professional. Greet politely. For positive reviews: thank + invite back; for negatives: listen + concrete fix.";
  return [...common, toneLine].join('\n');
}

interface FeedbackContext {
  restaurantName: string;
  restaurantCategory?: string | null;
  customerName?: string | null;
  rating: number;
  platform?: string | null;
  comment?: string | null;
}

export function buildReplyUserPrompt(ctx: FeedbackContext, locale: AiDraftLocale): string {
  const isTr = locale === 'tr';
  return [
    isTr ? 'İşletme:' : 'Business:',
    `${ctx.restaurantName}${ctx.restaurantCategory ? ` (${ctx.restaurantCategory})` : ''}`,
    '',
    isTr ? 'Müşteri:' : 'Customer:',
    ctx.customerName ?? (isTr ? 'Bilinmiyor' : 'Unknown'),
    '',
    isTr ? 'Puan:' : 'Rating:',
    `${ctx.rating}/5`,
    '',
    isTr ? 'Platform:' : 'Platform:',
    ctx.platform ?? (isTr ? 'Doğrudan' : 'Direct'),
    '',
    isTr ? 'Yorum:' : 'Comment:',
    ctx.comment ?? (isTr ? '(yorum yazmamış)' : '(no comment)'),
  ].join('\n');
}

export interface GeneratedDraft {
  body: string;
  source: 'ai_copilot' | 'template_fallback';
  latencyMs: number;
}

// Single-shot generator. Returns the AI draft when OpenAI succeeds, falls
// back to the deterministic template otherwise. Caller decides whether to
// persist (auto-trigger) or just return the text (suggest-reply endpoint).
export async function generateReplyDraft(
  ctx: FeedbackContext,
  tone: AiDraftTone,
  locale: AiDraftLocale,
): Promise<GeneratedDraft> {
  const fallback = buildReplyTemplate({
    name: ctx.customerName ?? null,
    rating: ctx.rating,
    locale,
  });
  if (!hasOpenAIKey()) {
    return { body: fallback, source: 'template_fallback', latencyMs: 0 };
  }
  const t0 = Date.now();
  const text = await chatCompletion(
    [
      { role: 'system', content: buildReplySystemPrompt(tone, locale) },
      { role: 'user', content: buildReplyUserPrompt(ctx, locale) },
    ],
    { temperature: 0.7, maxTokens: 300 },
  );
  const latencyMs = Date.now() - t0;
  if (!text) {
    return { body: fallback, source: 'template_fallback', latencyMs };
  }
  return { body: text, source: 'ai_copilot', latencyMs };
}

// Background trigger fired from feedback POST when owner has opted in.
// Persists the draft into FeedbackAiDraft (upsert by feedbackId — phantom
// re-trigger overrides). Throws nothing; caller fires-and-forgets and logs.
export async function generateAiDraftBackground(
  feedbackId: string,
  tone: AiDraftTone,
  locale: AiDraftLocale,
): Promise<void> {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: {
      rating: true,
      name: true,
      comment: true,
      platform: true,
      restaurant: { select: { name: true, category: true } },
    },
  });
  if (!feedback || !feedback.restaurant) return;

  const draft = await generateReplyDraft(
    {
      restaurantName: feedback.restaurant.name,
      restaurantCategory: feedback.restaurant.category,
      customerName: feedback.name,
      rating: feedback.rating,
      platform: feedback.platform,
      comment: feedback.comment,
    },
    tone,
    locale,
  );

  await prisma.feedbackAiDraft.upsert({
    where: { feedbackId },
    create: {
      feedbackId,
      body: draft.body,
      tone,
      source: draft.source,
      latencyMs: draft.latencyMs,
    },
    update: {
      body: draft.body,
      tone,
      source: draft.source,
      latencyMs: draft.latencyMs,
      generatedAt: new Date(),
    },
  });
}
