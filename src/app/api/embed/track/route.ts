import { NextRequest, NextResponse } from 'next/server';
import { recordEmbedView } from '@/lib/embed-tracking';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// 1×1 transparent GIF — JS-disabled iframe için fallback (256-byte sabit).
// base64'ten Buffer'a kararlı encoding (ASCII-only).
const PIXEL_BASE64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const PIXEL_BYTES = Buffer.from(PIXEL_BASE64, 'base64');

function clientIp(req: NextRequest): string {
  const xfwd = req.headers.get('x-forwarded-for');
  if (xfwd) return xfwd.split(',')[0]?.trim() || 'unknown';
  return (req as unknown as { ip?: string }).ip || 'unknown';
}

async function gateAndTrack(
  req: NextRequest,
  slug: string,
): Promise<NextResponse | null> {
  const ip = clientIp(req);
  const limit = await rateLimit(`embed-track:${ip}`, 60, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
  }
  const referer = req.headers.get('referer');
  const ua = req.headers.get('user-agent');
  await recordEmbedView({ slug, referer, ip, ua });
  return null;
}

/**
 * GET tracking pixel — JS-free fallback. `<img src="/api/embed/track?slug=...">`
 * iframe içinden veya direct çağrılır. Response 1×1 transparent GIF.
 * Side-effect (DB insert) RESTful saf değil ama tracking-pixel pattern
 * (GA / Sentry / Resend webhook beacon de aynı yöntem).
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || '';
  if (!slug.trim()) {
    return new NextResponse(PIXEL_BYTES, {
      status: 400,
      headers: { 'Content-Type': 'image/gif' },
    });
  }

  const gated = await gateAndTrack(req, slug);
  if (gated) return gated;

  return new NextResponse(PIXEL_BYTES, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Length': String(PIXEL_BYTES.length),
    },
  });
}

/**
 * POST optional — JS-side tracking, sessionStorage 30dk dedupe ile
 * tetiklenir. Daha doğru tek-defa-sayım, ama JS-required.
 */
export async function POST(req: NextRequest) {
  let body: { slug?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (typeof body.slug !== 'string' || !body.slug.trim()) {
    return NextResponse.json({ error: 'slug_required' }, { status: 400 });
  }

  const gated = await gateAndTrack(req, body.slug);
  if (gated) return gated;

  return NextResponse.json({ ok: true });
}
