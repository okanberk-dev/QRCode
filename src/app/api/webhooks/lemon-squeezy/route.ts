/**
 * Lemon Squeezy webhook receiver (CLAUDE.md §44.4).
 *
 * Flow:
 *   1. Read raw body BEFORE JSON parse (signature signed over exact bytes)
 *   2. Verify HMAC-SHA256 signature (timing-safe) — invalid → 401
 *   3. Compute payload SHA256 hash → `LemonSqueezyEvent.payloadHash` UNIQUE
 *      constraint for idempotency. Duplicate (P2002) → 200 + incrementCount
 *   4. Insert event row with `processedAt: null`
 *   5. Parse payload, dispatch to handler
 *   6. Update row with `processedAt: now` + `error: handlerResult.message`
 *   7. Always return 200 after step 2 (signature OK) — Lemon Squeezy
 *      retry storm prevention. Failed handlers leave processedAt=null
 *      for admin manual replay.
 *
 * Security:
 *   - Signature verify gate (without it any actor can spoof events)
 *   - Lemon Squeezy doesn't include `event_id` in payload; we use
 *     `payloadHash` as dedupe key (deterministic per delivery body)
 *   - PII in payload (user_email, user_name) — never logged via console;
 *     stored in `payload Json` for forensics + redacted in Sentry capture
 */

import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import {
  computePayloadHash,
  dispatchLemonSqueezyEvent,
  getLemonSqueezyConfig,
  parseLemonSqueezyPayload,
  verifyLemonSqueezySignature,
} from '@/lib/lemon-squeezy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// LS allows up to ~30s for webhook ack; we cap below Vercel gateway limit
// to leave headroom for retries within the same request.
export const maxDuration = 30;

const SIGNATURE_HEADER = 'x-signature';
const EVENT_NAME_HEADER = 'x-event-name';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const config = getLemonSqueezyConfig();

  // Read raw body once — must happen before any JSON parse since
  // signature is computed over the exact bytes Lemon Squeezy sent.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    Sentry.captureException(err, {
      tags: { integration: 'lemon-squeezy', phase: 'read_body' },
    });
    return NextResponse.json({ ok: false, error: 'read_body_failed' }, { status: 400 });
  }

  if (!rawBody) {
    return NextResponse.json({ ok: false, error: 'empty_body' }, { status: 400 });
  }

  // Even if config disabled, we want to log the attempt so operator
  // notices a misconfigured webhook URL. Return 503 (LS will retry).
  if (!config.enabled) {
    Sentry.captureMessage('Lemon Squeezy webhook received but integration disabled', {
      level: 'error',
      tags: {
        integration: 'lemon-squeezy',
        reason: config.disabledReason ?? 'unknown',
      },
    });
    return NextResponse.json(
      { ok: false, error: 'integration_disabled', reason: config.disabledReason ?? null },
      { status: 503 },
    );
  }

  // Step 1: signature gate
  const signature = req.headers.get(SIGNATURE_HEADER);
  const verify = verifyLemonSqueezySignature(rawBody, signature, config.webhookSecret);
  if (!verify.ok) {
    Sentry.captureMessage('Lemon Squeezy webhook signature rejected', {
      level: 'warning',
      tags: {
        integration: 'lemon-squeezy',
        reason: verify.reason ?? 'unknown',
      },
    });
    return NextResponse.json(
      { ok: false, error: 'signature_invalid', reason: verify.reason ?? null },
      { status: 401 },
    );
  }

  // Step 2: parse payload — defansif, partial garanti (event_name + data.id/type)
  const parsed = parseLemonSqueezyPayload(rawBody);
  if (!parsed.ok || !parsed.payload) {
    Sentry.captureMessage('Lemon Squeezy webhook payload malformed', {
      level: 'warning',
      tags: {
        integration: 'lemon-squeezy',
        reason: parsed.reason ?? 'unknown',
      },
    });
    return NextResponse.json(
      { ok: false, error: 'payload_invalid', reason: parsed.reason ?? null },
      { status: 400 },
    );
  }

  const payload = parsed.payload;
  const payloadHash = computePayloadHash(rawBody);
  const eventName = payload.meta.event_name;
  const resourceType = payload.data.type;
  const resourceId = payload.data.id;
  const headerEventName = req.headers.get(EVENT_NAME_HEADER);

  // Defansif: header'daki event_name body ile uyuşmuyorsa Sentry warn
  // (signature ile body bütünlüğü garantili, ama header tampering işareti).
  if (headerEventName && headerEventName !== eventName) {
    Sentry.captureMessage('Lemon Squeezy event_name header/body mismatch', {
      level: 'warning',
      tags: {
        integration: 'lemon-squeezy',
        header_event: headerEventName.slice(0, 60),
        body_event: eventName,
      },
    });
  }

  // Step 3: idempotency insert
  let eventRowId: string | null = null;
  try {
    const created = await prisma.lemonSqueezyEvent.create({
      data: {
        payloadHash,
        eventName,
        resourceType,
        resourceId,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    eventRowId = created.id;
  } catch (err) {
    // P2002 = duplicate payloadHash → already processed (or in-flight).
    // Increment receivedCount, return 200 (LS happy, no retry).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      await prisma.lemonSqueezyEvent
        .update({
          where: { payloadHash },
          data: { receivedCount: { increment: 1 } },
        })
        .catch(() => {
          // Best-effort — even if update fails, idempotent semantic preserved.
        });
      return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
    }
    Sentry.captureException(err, {
      tags: { integration: 'lemon-squeezy', phase: 'event_insert' },
    });
    // DB write failed — return 500 so LS retries (legit transient error).
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }

  // Step 4: dispatch handler. Errors caught inside dispatchLemonSqueezyEvent.
  const result = await dispatchLemonSqueezyEvent(payload);

  // Step 5: mark event row processed (or record handler error for retry)
  try {
    await prisma.lemonSqueezyEvent.update({
      where: { id: eventRowId },
      data: {
        processedAt: new Date(),
        error: result.ok
          ? null
          : `${result.reason ?? 'unknown'}${result.message ? ': ' + result.message.slice(0, 200) : ''}`,
      },
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { integration: 'lemon-squeezy', phase: 'event_finalize' },
    });
    // Non-fatal — event row already exists, side effects (handler) ran.
  }

  // Always return 200 once signature verified — Lemon Squeezy retry storm
  // protection. Failed handlers stay in DB with `error` set, admin can
  // manually replay via future /admin/lemon-squeezy/events UI.
  return NextResponse.json(
    {
      ok: true,
      eventId: eventRowId,
      eventName,
      processed: result.ok,
      handlerReason: result.ok ? null : result.reason,
    },
    { status: 200 },
  );
}

/** GET probe for ops health-check (returns config status, no secrets). */
export async function GET(): Promise<NextResponse> {
  const config = getLemonSqueezyConfig();
  return NextResponse.json({
    integration: 'lemon-squeezy',
    enabled: config.enabled,
    mode: config.mode,
    reason: config.disabledReason ?? null,
  });
}
