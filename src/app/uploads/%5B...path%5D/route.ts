import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join('/');

  // Hardcode absolute path for production to avoid environment issues
  const storageRoot = process.env.NODE_ENV === 'production' 
    ? '/app/storage' 
    : path.join(process.cwd(), 'storage');
      
  const fullPath = path.join(storageRoot, 'uploads', filePath);
  
  console.log(`[UPLOADS_DEBUG] Looking for: ${filePath} at ${fullPath}`);

  // Security: Ensure the resolved path is within the uploads directory
  const absoluteUploadsDir = path.join(storageRoot, 'uploads');
  if (!fullPath.startsWith(absoluteUploadsDir)) {
    console.error(`[UPLOADS_DEBUG] Security violation: ${fullPath} is outside ${absoluteUploadsDir}`);
    return new NextResponse('Yetkisiz erişim', { status: 403 });
  }

  if (!existsSync(fullPath)) {
    console.error(`[UPLOADS_DEBUG] 404 - File NOT found on disk: ${fullPath}`);
    return new NextResponse('Dosya bulunamadı', { status: 404 });
  }

  try {
    const fileBuffer = await readFile(fullPath);
    console.log(`[UPLOADS_DEBUG] Successfully serving: ${filePath} (${fileBuffer.length} bytes)`);
    
    // Determine content type based on extension
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error(`[UPLOADS_PROXY] Error reading file: ${fullPath}`, error);
    return new NextResponse('Sunucu hatası', { status: 500 });
  }
}
