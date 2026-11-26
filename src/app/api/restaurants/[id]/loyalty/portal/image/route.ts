// Logo / cover upload for the customer panel (CLAUDE.md §61): sharp →
// WebP, stored in Postgres (`stored_files`, §55) under loyalty/<restaurant>/.
// Returns the site-relative URL; the portal PUT saves it.
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { withServerTiming } from '@/lib/server-timing';
import { gateLoyaltyRoute } from '@/lib/loyalty-route';
import { saveFile, FILES_URL_PATH } from '@/lib/file-store';

export const runtime = 'nodejs';

const MAX_UPLOAD = 6 * 1024 * 1024;

async function handlePOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'manage');
  if (!gate.ok) return gate.response;
  const kind = req.nextUrl.searchParams.get('kind') === 'cover' ? 'cover' : 'logo';
  // Refuse a huge body before reading it into memory.
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_UPLOAD + 64 * 1024) {
    return NextResponse.json({ error: 'IMAGE_TOO_LARGE', code: 'IMAGE_TOO_LARGE' }, { status: 413 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'NO_FILE', code: 'NO_FILE' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_UPLOAD) {
    return NextResponse.json({ error: 'IMAGE_TOO_LARGE', code: 'IMAGE_TOO_LARGE' }, { status: 413 });
  }
  let out: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const img = sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate();
    out =
      kind === 'cover'
        ? await img.resize(1600, 900, { fit: 'cover', position: 'attention' }).webp({ quality: 78 }).toBuffer()
        : await img.resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
  } catch {
    return NextResponse.json({ error: 'IMAGE_UNPROCESSABLE', code: 'IMAGE_UNPROCESSABLE' }, { status: 422 });
  }
  const path = `loyalty/${id}/${kind}-${Date.now().toString(36)}.webp`;
  try {
    await saveFile(path, out, 'image/webp');
  } catch {
    return NextResponse.json({ error: 'IMAGE_TOO_LARGE', code: 'IMAGE_TOO_LARGE' }, { status: 413 });
  }
  return NextResponse.json({ url: `${FILES_URL_PATH}${path}`, bytes: out.length, kind }, { status: 201 });
}

export const POST = withServerTiming(handlePOST);
