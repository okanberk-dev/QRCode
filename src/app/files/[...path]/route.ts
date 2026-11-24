import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSafeFilePath, STORED_FILE_TYPES } from '@/lib/file-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NOT_FOUND_HEADERS = { 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' };

/**
 * Public stored files (CLAUDE.md §55): site logo, favicon and share images.
 * Paths are timestamped, so a hit is cached for a year as immutable.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const path = Array.isArray(segments) ? segments.join('/') : '';
  if (!isSafeFilePath(path)) return new NextResponse('Not found', { status: 404, headers: NOT_FOUND_HEADERS });

  const file = await prisma.storedFile.findUnique({
    where: { path },
    select: { data: true, contentType: true, sha256: true },
  });
  if (!file || !STORED_FILE_TYPES.has(file.contentType)) {
    return new NextResponse('Not found', { status: 404, headers: NOT_FOUND_HEADERS });
  }

  const etag = `"${file.sha256}"`;
  const headers = {
    'Content-Type': file.contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  };
  if (req.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(new Uint8Array(file.data), { status: 200, headers });
}
