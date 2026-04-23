// SCAFFOLDED: careers application intake. When wired, persists the
// application payload (name, email, role, message, link to portfolio,
// optional file attachment) to the `CareerApplication` Prisma model
// and emails the HR inbox. See scaffolding.ts for the model sketch.
//
// Frontend `/careers` page currently renders a static "we'd love to
// hear from you" block; when the application form is added, it posts
// here. Until then the endpoint returns 501 so the UI can fail
// gracefully.
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
  const limit = rateLimit(`careers-apply:${ip}`, 5, 30 * 60 * 1000);
  if (!limit.allowed) {
    return Response.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  return scaffoldedResponse('src/app/api/careers/apply/route.ts', {
    received: body,
  });
}
