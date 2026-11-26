// Live updates for the customer's card page (CLAUDE.md §61): when the
// counter adds a stamp or gives a reward, the phone hears about it at once
// (Server-Sent Events over the in-process bus, §55). The event carries only
// the change and the new balance; the page then re-reads the card.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { subscribeLoyaltyMember } from '@/lib/live-events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_MS = 25_000;
// Card pages are short visits; the browser reconnects on its own if the
// page stays open, which re-checks the card.
const MAX_STREAM_MS = 10 * 60_000;
const NO_STORE = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  const [ipLimit, cardLimit] = await Promise.all([
    rateLimit(`loyalty-sse:ip:${getClientIp(req.headers)}`, 240, 60_000),
    rateLimit(`loyalty-sse:token:${token}`, 20, 60_000),
  ]);
  if (!ipLimit.allowed || !cardLimit.allowed) {
    return NextResponse.json({ error: 'rate_limit' }, { status: 429, headers: { ...NO_STORE, 'Retry-After': '30' } });
  }
  const member = await prisma.loyaltyMember.findUnique({
    where: { cardToken: token },
    select: { id: true, program: { select: { isActive: true, restaurant: { select: { isActive: true, loyaltyEnabled: true } } } } },
  });
  const live = member && member.program.isActive && member.program.restaurant.isActive && member.program.restaurant.loyaltyEnabled;
  // 204 tells EventSource to stop reconnecting.
  if (!live) return new NextResponse(null, { status: 204, headers: NO_STORE });

  const encoder = new TextEncoder();
  let stop: () => void = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stop();
        }
      };
      const unsubscribe = subscribeLoyaltyMember(member.id, (change) => {
        send(`event: change\ndata: ${JSON.stringify(change)}\n\n`);
      });
      const heartbeat = setInterval(() => send(': ping\n\n'), HEARTBEAT_MS);
      const maxAge = setTimeout(() => stop(), MAX_STREAM_MS);
      stop = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        clearTimeout(maxAge);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener('abort', () => stop());
      send('retry: 4000\n\n: connected\n\n');
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'private, no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
