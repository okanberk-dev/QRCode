// CLAUDE.md §38.99 — Live recipient count preview for compose modal.
//
// Owner compose modal'da debounced fetch: subject/body yazarken kaç kişiye
// gideceği canlı sayım + 5-örnek maskeli email.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import {
  resolveSegmentRecipients,
  maskEmail,
} from '@/lib/customer-campaign-recipients';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PreviewSchema = z
  .object({
    restaurantId: z.string().min(1),
    onlyMarketingConsent: z.literal(true),
  })
  .strict();

type PreviewBody = z.infer<typeof PreviewSchema>;

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Rate limit — 30/dk/actor (compose modal debounced fetch için).
  const limit = await rateLimit(
    `customer-campaigns-preview:${actor.source}:${actor.id}`,
    30,
    60_000,
  );
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<PreviewBody>(PreviewSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const access = await canAccessRestaurant(actor, data.restaurantId);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: data.restaurantId },
    select: { campaignsEnabled: true },
  });
  if (!restaurant) return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });
  if (!restaurant.campaignsEnabled) {
    return NextResponse.json({ error: 'campaigns_disabled' }, { status: 403 });
  }

  const recipients = await resolveSegmentRecipients({
    restaurantId: data.restaurantId,
    onlyMarketingConsent: true,
  });

  // Sample preview — first 5 masked emails (defense-in-depth, owner görür ama
  // ham email expose etmez. CLAUDE.md §37.7 PII redaction).
  const samplePreview = recipients.slice(0, 5).map((r) => maskEmail(r.email));

  return NextResponse.json(
    {
      count: recipients.length,
      samplePreview,
    },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
