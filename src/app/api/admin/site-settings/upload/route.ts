import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { uploadToStorage, isStorageConfigured } from '@/lib/supabase-storage';

type Kind = 'logo' | 'favicon';

const RASTER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_TYPES = [...RASTER_TYPES, 'image/svg+xml'];
const FAVICON_TYPES = [...RASTER_TYPES, 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];

const MAX_BYTES: Record<Kind, number> = {
  logo: 2 * 1024 * 1024,
  favicon: 1 * 1024 * 1024,
};

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  if (!isStorageConfigured()) {
    return ApiErrors.internalError(
      'Supabase Storage yapılandırılmamış. SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY env değişkenlerini ayarlayın.'
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kindRaw = formData.get('kind');
    const kind = typeof kindRaw === 'string' ? (kindRaw as Kind) : null;

    if (!file) return ApiErrors.badRequest('Dosya bulunamadı');
    if (!kind || !['logo', 'favicon'].includes(kind)) {
      return ApiErrors.badRequest('Geçersiz kind (logo|favicon)');
    }

    const allowed =
      kind === 'logo' ? LOGO_TYPES : FAVICON_TYPES;
    if (!allowed.includes(file.type)) {
      return ApiErrors.badRequest(`Geçersiz dosya türü: ${file.type}`);
    }

    if (file.size > MAX_BYTES[kind]) {
      return ApiErrors.badRequest(
        `Dosya boyutu çok büyük (max ${MAX_BYTES[kind] / 1024 / 1024}MB)`
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isSvg = file.type === 'image/svg+xml';

    let outBuffer: Buffer;
    let outExt: string;
    let outMime: string;

    if (isSvg) {
      outBuffer = buffer;
      outExt = 'svg';
      outMime = 'image/svg+xml';
    } else if (kind === 'logo') {
      outBuffer = await sharp(buffer)
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
      outExt = 'webp';
      outMime = 'image/webp';
    } else {
      outBuffer = await sharp(buffer)
        .resize(128, 128, { fit: 'cover' })
        .png()
        .toBuffer();
      outExt = 'png';
      outMime = 'image/png';
    }

    const path = `site/${kind}-${Date.now()}.${outExt}`;
    const publicUrl = await uploadToStorage(outBuffer, path, outMime);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('[site-settings/upload]', err);
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return ApiErrors.internalError(`Yükleme başarısız: ${msg}`);
  }
}
