import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireMenuModuleAccess } from '@/lib/menu-access';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';

// Client-side limit is 5 MB (raw upload); server-side we enforce the same
// plus a post-optimize hard cap to keep the encoded data URL well under
// Prisma/Postgres-friendly sizes.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_OPTIMIZED_BYTES = 220 * 1024; // ~300KB base64 after encode

// Kinds affect target dimensions. "logo" is square-ish, "item" is card-sized,
// "favicon" is small square (browser tab icon), "cover" is 16:9 hero image.
type UploadKind = 'item' | 'logo' | 'favicon' | 'cover';

const DIMENSIONS: Record<UploadKind, { width: number; height: number | null; fit: 'cover' | 'inside' }> = {
  item: { width: 1200, height: null, fit: 'inside' },
  logo: { width: 512, height: 512, fit: 'cover' },
  favicon: { width: 256, height: 256, fit: 'cover' },
  // Section 2 — Marka Kimliği kapak görseli. 16:9 (Pulse 2026-04 hero).
  cover: { width: 1600, height: 900, fit: 'cover' },
};

// Cover'lar logo/item/favicon'dan büyük base64 üretir; bu kind için ayrı tavan.
const MAX_OPTIMIZED_BY_KIND: Partial<Record<UploadKind, number>> = {
  cover: 380 * 1024, // ~500KB base64 sonrası
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  maybeSweep();
  const { id } = await params;

  const gate = await requireMenuModuleAccess(req, id);
  if (!gate.ok) return gate.res;

  // 60 uploads/min/user. Normal workflow is well below this; abuse needs a
  // bigger ceiling.
  const rl = await rateLimit(`menu:upload:${gate.actor!.id}`, 60, 60 * 1000);
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
  const kindRaw = form.get('kind');
  const kind: UploadKind =
    kindRaw === 'logo'
      ? 'logo'
      : kindRaw === 'favicon'
        ? 'favicon'
        : kindRaw === 'cover'
          ? 'cover'
          : 'item';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Sadece görsel dosyası yüklenebilir' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Görsel 5 MB\'dan büyük olamaz' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dims = DIMENSIONS[kind];

  let optimized: Buffer;
  try {
    optimized = await sharp(buffer)
      .rotate() // honor EXIF orientation then strip it
      .resize({ width: dims.width, height: dims.height ?? undefined, fit: dims.fit, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (err) {
    console.error('[MenuUpload] sharp failed:', (err as Error).message);
    return NextResponse.json({ error: 'Görsel işlenemedi' }, { status: 400 });
  }

  const cap = MAX_OPTIMIZED_BY_KIND[kind] ?? MAX_OPTIMIZED_BYTES;
  if (optimized.byteLength > cap) {
    // Rare — very complex image that didn't compress below cap. Reduce quality and retry once.
    try {
      optimized = await sharp(buffer)
        .rotate()
        .resize({ width: dims.width, height: dims.height ?? undefined, fit: dims.fit, withoutEnlargement: true })
        .webp({ quality: 60 })
        .toBuffer();
    } catch {
      return NextResponse.json({ error: 'Görsel işlenemedi' }, { status: 400 });
    }
    if (optimized.byteLength > cap) {
      return NextResponse.json({ error: 'Görsel çok büyük. Daha düşük çözünürlükte tekrar deneyin.' }, { status: 413 });
    }
  }

  const dataUrl = `data:image/webp;base64,${optimized.toString('base64')}`;
  return NextResponse.json({ url: dataUrl, bytes: optimized.byteLength, kind });
}
