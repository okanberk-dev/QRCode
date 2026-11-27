import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Maintenance mode (CLAUDE.md §55). A build with MAINTENANCE_MODE=1 rewrites
// every request here (next.config.ts), so no page, API, cron or webhook can
// write while the database is being moved. Without the flag this route is a
// plain 404.
const RETRY_AFTER_SECONDS = '300';

const HTML = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Buaze · Bakım</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;color:#0a0a0a;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{max-width:440px;padding:32px 20px;text-align:center}.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#c6f24e;margin-bottom:16px}h1{font-size:22px;margin:0 0 8px}p{margin:0 0 16px;color:#525252}</style>
</head><body><main><span class="dot"></span>
<h1>Kısa bir bakım yapıyoruz</h1><p>Buaze birkaç dakika içinde yeniden açılacak. Lütfen biraz sonra tekrar deneyin.</p>
<h1 lang="en">We're doing a short maintenance</h1><p lang="en">Buaze will be back in a few minutes. Please try again shortly.</p>
</main></body></html>`;

function isOn(): boolean {
  const v = (process.env.MAINTENANCE_MODE ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}

function respond(req: NextRequest): NextResponse {
  if (!isOn()) return new NextResponse('Not found', { status: 404 });
  const headers = {
    'Retry-After': RETRY_AFTER_SECONDS,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
  };
  const wantsHtml = (req.headers.get('accept') ?? '').includes('text/html');
  if (wantsHtml && req.method === 'GET') {
    return new NextResponse(HTML, { status: 503, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
  }
  return NextResponse.json({ error: 'maintenance', retryAfterSeconds: Number(RETRY_AFTER_SECONDS) }, { status: 503, headers });
}

export const GET = respond;
export const HEAD = respond;
export const POST = respond;
export const PUT = respond;
export const PATCH = respond;
export const DELETE = respond;
export const OPTIONS = respond;
