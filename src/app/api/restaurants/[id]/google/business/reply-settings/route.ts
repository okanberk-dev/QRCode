import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { writePanelAuditLog } from '@/lib/audit-log';
import { gateGoogleReviewRoute } from '@/lib/google-review-route';
import { z } from 'zod';
import {
  MAX_BANNED_PHRASES,
  MAX_BANNED_PHRASE_LENGTH,
  MAX_SIGNATURE_LENGTH,
  REPLY_ADDRESS_FORMS,
  REPLY_LENGTHS,
  REPLY_TONES,
  normalizeBannedPhrases,
  readGoogleReplySettings,
} from '@/lib/google-reply-settings';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';

const singleLine = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => v.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim());

const GoogleReplySettingsSchema = z
  .object({
    tone: z.enum(REPLY_TONES),
    length: z.enum(REPLY_LENGTHS),
    addressForm: z.enum(REPLY_ADDRESS_FORMS),
    useName: z.boolean(),
    signature: singleLine(MAX_SIGNATURE_LENGTH),
    bannedPhrases: z.array(singleLine(MAX_BANNED_PHRASE_LENGTH)).max(MAX_BANNED_PHRASES),
  })
  .strict();

/** Google reply settings of one business (tone, length, address, signature, banned phrases). */
async function handleGET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateGoogleReviewRoute(req, id);
  if (!gate.ok) return gate.response;
  const row = await prisma.restaurant.findUnique({ where: { id }, select: { googleReplySettings: true } });
  return NextResponse.json(
    { settings: readGoogleReplySettings(row?.googleReplySettings) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateGoogleReviewRoute(req, id, { write: true });
  if (!gate.ok) return gate.response;

  const limit = await rateLimit(`google-reply-settings:${gate.actor.id}:${id}`, 20, 60_000);
  if (!limit.allowed) return ApiErrors.tooManyRequests(undefined, 'RATE_LIMITED', limit.retryAfterSeconds);

  const parsed = validateBody(GoogleReplySettingsSchema, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const settings = { ...parsed.data, bannedPhrases: normalizeBannedPhrases(parsed.data.bannedPhrases) };

  const before = await prisma.restaurant.findUnique({ where: { id }, select: { googleReplySettings: true } });
  await prisma.restaurant.update({ where: { id }, data: { googleReplySettings: settings } });
  await writePanelAuditLog(gate.actor, 'owner.google.reply_settings.update', id, {
    before: readGoogleReplySettings(before?.googleReplySettings),
    after: settings,
  });
  return NextResponse.json({ settings });
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
