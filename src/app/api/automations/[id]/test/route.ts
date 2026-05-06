import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { dispatchWebhook } from '@/lib/webhook-fanout';

// Stage 12 §38.82 — webhook test endpoint.
// Owner panel "Test webhook" button — gerçek webhook URL'ine sample payload fire,
// HMAC signature ile (production parity), result UI'ya gösterir (status code +
// response time + retry attempts).
//
// Gerçek dispatch — receiver gerçek bir POST görür (test ortamı için ngrok /
// webhook.site URL beklenir). Persist + audit log normal dispatch akışıyla
// aynı (`automation.fire.${ok|fail}` audit + lastFiredAt update).

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function ownerRef(actor: PanelActor): string {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Rate limit: 5/dk/actor — test fire'ı abuse engelle (gerçek webhook
  // receiver'a istemsiz spam fire'ı önle).
  const rl = await rateLimit(`automations:test:${actor.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfterSeconds },
      { status: 429 },
    );
  }

  const rule = await prisma.automationRule.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      action: true,
      target: true,
      isActive: true,
    },
  });
  if (!rule) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (rule.userId !== ownerRef(actor)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (rule.action !== 'webhook') {
    return NextResponse.json({ error: 'not_webhook_action' }, { status: 400 });
  }
  if (!rule.target) {
    return NextResponse.json({ error: 'missing_target' }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(rule.target)) {
    return NextResponse.json({ error: 'invalid_webhook_url' }, { status: 400 });
  }

  const samplePayload = {
    event: 'test.webhook',
    feedbackId: 'test-feedback-id',
    restaurantId: 'test-restaurant-id',
    restaurantName: 'Test Restaurant',
    rating: 4,
    comment: 'Bu bir test webhook payload örneğidir. (Buaze → ngrok / webhook.site test fire)',
    platform: null,
    branch: null,
    customerName: null,
    customerEmail: null,
    timestamp: new Date().toISOString(),
    isTest: true,
  };

  const result = await dispatchWebhook({
    ruleId: rule.id,
    webhookUrl: rule.target,
    payload: samplePayload,
    source: 'test',
    ruleOwnerRef: rule.userId,
  });

  return NextResponse.json({
    ok: result.ok,
    httpStatus: result.httpStatus,
    responseMs: result.responseMs,
    attempts: result.attempts,
    errorReason: result.errorReason ?? null,
    signatureSent: result.signatureSent,
  });
}
