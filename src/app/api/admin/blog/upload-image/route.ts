import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';

/**
 * Blog cover image upload — superadmin only. Accepts a multipart file,
 * resizes to 1600x900 (16:9 hero), encodes as WebP, returns a base64 data
 * URL that the BlogPostEditor stores into BlogPost.coverImage.
 *
 * Mirrors the menu upload pattern (CLAUDE.md §3). DB column is @db.Text
 * so the data URL fits without truncation.
 */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB raw
const MAX_OPTIMIZED_BYTES = 380 * 1024; // ~500KB base64 ceiling

export async function POST(req: NextRequest) {
  maybeSweep();

  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const rl = await rateLimit(`admin:blog:upload:${admin.id}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla yükleme. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Geçersiz form verisi' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Sadece görsel dosyası yüklenebilir' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Görsel 5 MB'dan büyük olamaz" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const transform = (quality: number) =>
    sharp(buffer)
      .rotate() // honour EXIF orientation
      .resize({ width: 1600, height: 900, fit: 'cover', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

  let optimized: Buffer;
  try {
    optimized = await transform(80);
  } catch (err) {
    console.error('[BlogUpload] sharp failed:', (err as Error).message);
    return NextResponse.json({ error: 'Görsel işlenemedi' }, { status: 400 });
  }

  if (optimized.byteLength > MAX_OPTIMIZED_BYTES) {
    try {
      optimized = await transform(60);
    } catch {
      return NextResponse.json({ error: 'Görsel işlenemedi' }, { status: 400 });
    }
    if (optimized.byteLength > MAX_OPTIMIZED_BYTES) {
      return NextResponse.json(
        { error: 'Görsel çok büyük. Daha düşük çözünürlükte tekrar deneyin.' },
        { status: 413 },
      );
    }
  }

  const dataUrl = `data:image/webp;base64,${optimized.toString('base64')}`;
  return NextResponse.json({ url: dataUrl, bytes: optimized.byteLength });
}
