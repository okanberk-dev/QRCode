import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { chatCompletion, hasOpenAIKey } from '@/lib/openai';

/**
 * Slug öneri endpoint'i — başlık + içerik bağlamından SEO uyumlu, kısa,
 * kebab-case slug üretir. AI yoksa veya hata verirse deterministik fallback
 * çalışır (başlığı ASCII'leştir + kebab-case).
 *
 * UI tarafı (BlogPostEditor): Wand2 butonu → POST → response.slug.
 */

function asciiSlug(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  // 30 öneri / dk / admin — abuse'a karşı tipik bir limit.
  const rl = await rateLimit(`admin:blog:slug:${admin.id}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen birazdan tekrar deneyin.' },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || '').trim().slice(0, 200);
  const rawContent = String(body?.content || '');
  const locale = body?.locale === 'en' ? 'en' : 'tr';

  if (!title) {
    return NextResponse.json({ error: 'Başlık zorunlu.' }, { status: 400 });
  }

  // Deterministik fallback — AI yoksa veya hata verirse buna düşer.
  const fallback = asciiSlug(title);

  if (!hasOpenAIKey()) {
    return NextResponse.json({ slug: fallback, source: 'fallback' });
  }

  // İçeriğin ilk 800 karakterlik özetini context olarak geçeriz; tam yazı
  // gönderirsek hem maliyet artar hem alakasız bağlam slug'ı kirletir.
  const contentExcerpt = stripHtml(rawContent).slice(0, 800);

  const system =
    'You are an SEO-aware editor for a B2B SaaS blog. You produce one URL slug per request. ' +
    'Rules: ASCII only (no diacritics), kebab-case, 3-7 words, lowercase, no leading/trailing dashes, ' +
    'no stopwords like "the", "a", "and", "or" unless essential. Match the language of the title ' +
    '(English title → English slug; Turkish title → Turkish-derived ASCII slug). ' +
    'Return ONLY the slug, no explanation, no quotes, no punctuation other than dashes.';

  const user =
    `Locale: ${locale}\nTitle: ${title}\n` +
    (contentExcerpt ? `Content excerpt: ${contentExcerpt}\n` : '') +
    `Suggest the best slug:`;

  const aiResult = await chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.4, maxTokens: 40 },
  );

  if (!aiResult) {
    return NextResponse.json({ slug: fallback, source: 'fallback' });
  }

  // AI bazen quote, dot veya açıklama döner; yine de aggressive normalize.
  const cleaned = asciiSlug(aiResult.replace(/[`'"\n\r]/g, ' '));
  const slug = cleaned || fallback;

  return NextResponse.json({ slug, source: cleaned ? 'openai' : 'fallback' });
}
