import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
    }

    // 1. Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Sadece JPG, PNG veya WebP dosyaları yüklenebilir.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ error: 'Dosya boyutu 5MB\u2019dan küçük olmalıdır.' }, { status: 400 });
    }

    // 2. Prepare Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Process with Sharp (Optimization)
    // - Resize to max 1200px width/height while maintaining aspect ratio
    // - Convert to WebP with 80% quality to save space
    const processedImage = await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 4. Save to disk
    const fileName = `${crypto.randomUUID()}.webp`;
    const uploadDir = path.join(process.cwd(), 'public/uploads/menu');
    
    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, fileName);
    console.log('[API_MENU_UPLOAD] Saving to:', filePath);
    await writeFile(filePath, processedImage);

    // 5. Return URL
    const url = `/uploads/menu/${fileName}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error('[API_MENU_UPLOAD]', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: `Dosya yüklenirken bir hata oluştu: ${errorMessage}` }, { status: 500 });
  }
}
