// SCAFFOLDED: ROI calculator persistence. When wired, saves the inputs
// (monthly revenue, avg ticket, no-show rate, etc.) + computed
// projection for later email follow-up / sales outreach. See
// scaffolding.ts for the `ROIRequest` Prisma model sketch.
import { NextRequest } from 'next/server';
import { scaffoldedResponse } from '@/lib/scaffolding';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const limit = rateLimit(`roi-save:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  return scaffoldedResponse('src/app/api/roi/save/route.ts', { received: body });
}
