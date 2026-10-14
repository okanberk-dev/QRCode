import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireMenuModuleAccess, requireRestaurantAccess } from '@/lib/menu-access';
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
  // Product photos are shown on a phone as cards (≤ ~600 CSS px wide, the
  // detail view a bit more). 720px keeps them sharp there and is roughly a
  // third of the 1200px/q80 files we stored before — every photo is
  // downloaded by every guest.
  item: { width: 720, height: null, fit: 'inside' },
  logo: { width: 512, height: 512, fit: 'cover' },
  favicon: { width: 256, height: 256, fit: 'cover' },
  // Section 2 — Marka Kimliği kapak görseli. 16:9 (Pulse 2026-04 hero).
  cover: { width: 1600, height: 900, fit: 'cover' },
};

// WebP quality per kind: [first attempt, fallback when the result is over the
// cap]. Item photos are tuned for weight, brand images for fidelity.
const QUALITY: Record<UploadKind, [number, number]> = {
  item: [72, 55],
  logo: [80, 60],
  favicon: [80, 60],
  cover: [80, 60],
};

// Cover'lar logo/item/favicon'dan büyük base64 üretir; bu kind için ayrı tavan.
const MAX_OPTIMIZED_BY_KIND: Partial<Record<UploadKind, number>> = {
  item: 90 * 1024, // ≈120KB base64 — a typical 720px photo lands at 40-60KB
  cover: 380 * 1024, // ~500KB base64 sonrası
};

// Stable machine codes next to the (Turkish) message so the builder can show
// the owner a localized sentence instead of the raw server text.
const IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE';
const IMAGE_UNPROCESSABLE = 'IMAGE_UNPROCESSABLE';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  maybeSweep();
  const { id } = await params;

  // Plain write-access gate first (POST → write; viewers 403). The menu
  // module gate is applied per-kind below: brand uploads (favicon / cover /
  // logo from Marka Kimliği) must keep working when the admin disabled the
  // menu module. Nothing is persisted here — saving a menu logo still goes
  // through the menu-gated theme endpoint.
  const gate = await requireRestaurantAccess(req, id);
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

  // `item` (menu product image) is the only menu-exclusive kind; `logo` is
  // shared by the menu builder and brand identity and can't be told apart.
  if (kind === 'item') {
    const menuGate = await requireMenuModuleAccess(req, id);
    if (!menuGate.ok) return menuGate.res;
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'Sadece görsel dosyası yüklenebilir', code: IMAGE_UNPROCESSABLE },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'Görsel 5 MB\'dan büyük olamaz', code: IMAGE_TOO_LARGE },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dims = DIMENSIONS[kind];
  const [quality, fallbackQuality] = QUALITY[kind];

  const encode = (webpQuality: number) =>
    sharp(buffer)
      .rotate() // honor EXIF orientation then strip it
      .resize({ width: dims.width, height: dims.height ?? undefined, fit: dims.fit, withoutEnlargement: true })
      .webp({ quality: webpQuality })
      .toBuffer();

  let optimized: Buffer;
  try {
    optimized = await encode(quality);
  } catch (err) {
    console.error('[MenuUpload] sharp failed:', (err as Error).message);
    return NextResponse.json({ error: 'Görsel işlenemedi', code: IMAGE_UNPROCESSABLE }, { status: 400 });
  }

  const cap = MAX_OPTIMIZED_BY_KIND[kind] ?? MAX_OPTIMIZED_BYTES;
  if (optimized.byteLength > cap) {
    // Rare — very complex image that didn't compress below cap. Reduce quality and retry once.
    try {
      optimized = await encode(fallbackQuality);
    } catch {
      return NextResponse.json({ error: 'Görsel işlenemedi', code: IMAGE_UNPROCESSABLE }, { status: 400 });
    }
    if (optimized.byteLength > cap) {
      return NextResponse.json(
        { error: 'Görsel çok büyük. Daha düşük çözünürlükte tekrar deneyin.', code: IMAGE_TOO_LARGE },
        { status: 413 },
      );
    }
  }

  const dataUrl = `data:image/webp;base64,${optimized.toString('base64')}`;
  return NextResponse.json({ url: dataUrl, bytes: optimized.byteLength, kind });
}
