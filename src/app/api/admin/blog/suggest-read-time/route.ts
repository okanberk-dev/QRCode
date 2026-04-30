import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { chatCompletion, hasOpenAIKey } from '@/lib/openai';

/**
 * Okuma süresi öneri endpoint'i — kelime sayısı + içerik karmaşıklığını
 * (görsel, link, kod bloğu, başlık sıklığı) hesaba katar. AI yoksa
 * deterministik 180 wpm fallback (BlogPostEditor.estimateReadTime ile aynı).
 */

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deterministicReadTime(content: string, locale: 'tr' | 'en'): string {
  const text = stripHtml(content);
  const words = text ? text.split(' ').length : 1;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return locale === 'en' ? `${minutes} min read` : `${minutes} dk okuma`;
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const rl = await rateLimit(`admin:blog:readtime:${admin.id}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen birazdan tekrar deneyin.' },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const rawContent = String(body?.content || '');
  const locale: 'tr' | 'en' = body?.locale === 'en' ? 'en' : 'tr';

  const fallback = deterministicReadTime(rawContent, locale);

  if (!rawContent.trim()) {
    return NextResponse.json({ readTime: fallback, source: 'fallback' });
  }

  if (!hasOpenAIKey()) {
    return NextResponse.json({ readTime: fallback, source: 'fallback' });
  }

  const text = stripHtml(rawContent);
  const wordCount = text ? text.split(' ').length : 0;
  const imageCount = (rawContent.match(/<img\b/gi) || []).length;
  const linkCount = (rawContent.match(/<a\b/gi) || []).length;
  const codeBlockCount = (rawContent.match(/<pre\b|<code\b/gi) || []).length;
  const h2Count = (rawContent.match(/<h2\b/gi) || []).length;

  const system =
    'You estimate honest reading time for blog posts based on word count plus complexity ' +
    '(images, code blocks, embedded links, heading density). For Turkish, base rate ~170 wpm; ' +
    'for English, ~200 wpm. Add ~10 seconds per image or code block. Round up to whole minutes ' +
    '(min 1). Reply ONLY with the formatted phrase, e.g. "5 dk okuma" for Turkish or ' +
    '"5 min read" for English. No explanation, no quotes.';

  const user =
    `Locale: ${locale}\n` +
    `Word count: ${wordCount}\n` +
    `Images: ${imageCount}\n` +
    `Links: ${linkCount}\n` +
    `Code blocks: ${codeBlockCount}\n` +
    `H2 sections: ${h2Count}\n` +
    `Return the reading time:`;

  const aiResult = await chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.2, maxTokens: 16 },
  );

  if (!aiResult) {
    return NextResponse.json({ readTime: fallback, source: 'fallback' });
  }

  // Normalize: AI bazen quote/punctuation döner.
  const cleaned = aiResult.replace(/["'`]/g, '').trim();

  // Sanity guard — beklenen format "<sayı> dk okuma" veya "<sayı> min read".
  const valid =
    locale === 'tr'
      ? /^\d{1,2}\s*dk(?:\s*okuma)?$/.test(cleaned)
      : /^\d{1,2}\s*min(?:\s*read)?$/.test(cleaned);

  return NextResponse.json({
    readTime: valid ? cleaned : fallback,
    source: valid ? 'openai' : 'fallback',
  });
}
