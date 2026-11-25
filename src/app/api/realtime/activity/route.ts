import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { subscribeFeedback } from '@/lib/live-events';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_MS = 25_000;
// The browser reconnects on its own; a cap keeps no stream open forever
// (and re-checks access on every reconnect).
const MAX_STREAM_MS = 30 * 60_000;
const MAX_IDS = 50;

/**
 * Live feed of new feedback for the owner dashboard (CLAUDE.md §55,
 * replaces Supabase Realtime). Server-Sent Events: `event: feedback` with
 * the row fields the feed renders. `?restaurantIds=a,b` narrows the stream
 * to the businesses the feed shows; anything outside the actor's scope is
 * ignored. 204 (no businesses) tells EventSource not to reconnect.
 */
async function handleGET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const limit = await rateLimit(`realtime-sse:${actor.source}:${actor.id}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const scoped = await getScopedRestaurantIds(actor);
  if (scoped === null) {
    return NextResponse.json({ error: 'unsupported_role' }, { status: 403 });
  }
  const wantedRaw = req.nextUrl.searchParams.get('restaurantIds');
  const wanted = wantedRaw ? new Set(wantedRaw.split(',').map((s) => s.trim()).filter(Boolean)) : null;
  const ids = new Set(scoped.filter((id) => !wanted || wanted.has(id)).slice(0, MAX_IDS));
  if (ids.size === 0) return new NextResponse(null, { status: 204 });

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
      const unsubscribe = subscribeFeedback(ids, (row) => {
        send(`event: feedback\ndata: ${JSON.stringify(row)}\n\n`);
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
      send('retry: 5000\n\n: connected\n\n');
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // no-transform: keeps the compression layer from buffering the stream.
      'Cache-Control': 'private, no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
