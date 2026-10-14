/**
 * Platform-level availability of the optional reply feature (Google Business
 * Profile sign-in).
 *
 * Problem: Google's Business Profile API quota is 0 project-wide until the
 * access request is approved (CLAUDE.md §38.231), and the OAuth consent
 * screen may still be in Testing. Without a platform-level signal every owner
 * would complete a full Google sign-in only to learn on return that the API
 * is not enabled. This module is that signal:
 *
 *   - `'disabled'`        env `GOOGLE_BUSINESS_REPLY_ENABLED=false` (operator switch)
 *   - `'not_provisioned'` a stamp in the key/value `Settings` table, written
 *                         the moment ANY owner's sync hits the "quota is 0"
 *                         condition, valid for 3 days
 *   - `'available'`       everything else
 *
 * The stamp expires after 3 days so the connect button returns and the next
 * owner who connects re-stamps or clears it (the cost of a re-probe is one
 * owner round trip every 3 days at worst). A successful non-cached sync that
 * returns at least one account clears it. The connect route itself is NOT
 * gated: the hide is UI-only, so the admin hub can still connect to re-probe.
 *
 * Key: `google.business_api_state` (site settings only read `site.` keys, so
 * this does not collide). Stores a timestamp and no personal data.
 */

import { prisma } from '@/lib/prisma';
import type { GoogleReplyAvailability } from '@/lib/google-places';

export type { GoogleReplyAvailability };

export const BUSINESS_API_STATE_KEY = 'google.business_api_state';
const NOT_PROVISIONED_PREFIX = 'not_provisioned@';

/** After this long the stamp is treated as unknown and the connect button returns. */
export const NOT_PROVISIONED_TTL_MS = 3 * 24 * 60 * 60 * 1000;
/** Do not rewrite a stamp that is younger than this. */
const STAMP_REFRESH_MS = 60 * 60 * 1000;
/** In-process memo of the `Settings` read. */
const MEMO_TTL_MS = 60_000;
/** At most one clear per business per this window. */
const CLEAR_THROTTLE_MS = 120_000;

// ─── pure helpers (unit-tested) ──────────────────────────────────────────

export function formatApiStateStamp(at: Date): string {
  return `${NOT_PROVISIONED_PREFIX}${at.toISOString()}`;
}

/** The stamped time, or null when the value is absent or malformed. */
export function parseApiStateStamp(value: string | null | undefined): Date | null {
  if (typeof value !== 'string' || !value.startsWith(NOT_PROVISIONED_PREFIX)) return null;
  const ms = Date.parse(value.slice(NOT_PROVISIONED_PREFIX.length));
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/** `GOOGLE_BUSINESS_REPLY_ENABLED=false` (case-insensitive, trimmed). */
export function isReplySwitchedOff(envValue: string | null | undefined): boolean {
  return typeof envValue === 'string' && envValue.trim().toLowerCase() === 'false';
}

export function computeReplyAvailability(input: {
  envValue: string | null | undefined;
  stampValue: string | null | undefined;
  now: Date;
}): GoogleReplyAvailability {
  if (isReplySwitchedOff(input.envValue)) return 'disabled';
  const stamped = parseApiStateStamp(input.stampValue);
  if (stamped) {
    // A stamp "from the future" (clock skew between instances) counts as fresh.
    const age = Math.max(0, input.now.getTime() - stamped.getTime());
    if (age < NOT_PROVISIONED_TTL_MS) return 'not_provisioned';
  }
  return 'available';
}

// ─── database-backed ─────────────────────────────────────────────────────

let memo: { value: GoogleReplyAvailability; at: number } | null = null;
let lastStampWriteAt = 0;
const lastClearAt = new Map<string, number>();

function describeError(err: unknown): { errorName: string; errorMessage: string } {
  return {
    errorName: err instanceof Error ? err.name : typeof err,
    errorMessage: String(err instanceof Error ? err.message : err).slice(0, 200),
  };
}

/**
 * Current availability. The `Settings` read is memoised in-process for 60 s.
 * A database failure answers `'available'` (this is a UI hint only: failing
 * open never lets an owner into anything they could not already reach) and is
 * not memoised.
 */
export async function getReplyAvailability(now: Date = new Date()): Promise<GoogleReplyAvailability> {
  const envValue = process.env.GOOGLE_BUSINESS_REPLY_ENABLED;
  if (isReplySwitchedOff(envValue)) return 'disabled';

  const nowMs = now.getTime();
  if (memo && nowMs - memo.at < MEMO_TTL_MS) return memo.value;

  try {
    const row = await prisma.settings.findUnique({
      where: { key: BUSINESS_API_STATE_KEY },
      select: { value: true },
    });
    const value = computeReplyAvailability({ envValue, stampValue: row?.value, now });
    memo = { value, at: nowMs };
    return value;
  } catch (err) {
    console.warn('[google availability] read failed (treating as available)', describeError(err));
    return 'available';
  }
}

/**
 * Stamp "the Business Profile API is not provisioned" — best effort, never
 * throws. Skipped when a stamp younger than one hour already exists.
 */
export async function markBusinessApiNotProvisioned(now: Date = new Date()): Promise<void> {
  const nowMs = now.getTime();
  try {
    if (lastStampWriteAt && nowMs - lastStampWriteAt < STAMP_REFRESH_MS) return;

    const row = await prisma.settings.findUnique({
      where: { key: BUSINESS_API_STATE_KEY },
      select: { value: true },
    });
    const stamped = parseApiStateStamp(row?.value);
    if (stamped) {
      const age = nowMs - stamped.getTime();
      if (age >= 0 && age < STAMP_REFRESH_MS) {
        lastStampWriteAt = stamped.getTime();
        memo = { value: 'not_provisioned', at: nowMs };
        return;
      }
    }

    const value = formatApiStateStamp(now);
    await prisma.settings.upsert({
      where: { key: BUSINESS_API_STATE_KEY },
      create: { key: BUSINESS_API_STATE_KEY, value },
      update: { value },
    });
    lastStampWriteAt = nowMs;
    memo = { value: 'not_provisioned', at: nowMs };
  } catch (err) {
    console.warn('[google availability] stamp failed (non-fatal)', describeError(err));
  }
}

/**
 * Remove the stamp after a successful non-cached sync that returned at least
 * one account. At most once per `CLEAR_THROTTLE_MS` per business. Best effort,
 * never throws.
 */
export async function clearBusinessApiNotProvisioned(
  restaurantId?: string,
  now: Date = new Date(),
): Promise<void> {
  const nowMs = now.getTime();
  const throttleKey = restaurantId ?? '*';
  try {
    const last = lastClearAt.get(throttleKey);
    if (last !== undefined && nowMs - last < CLEAR_THROTTLE_MS) return;
    if (lastClearAt.size > 500) lastClearAt.clear();
    lastClearAt.set(throttleKey, nowMs);

    await prisma.settings.deleteMany({ where: { key: BUSINESS_API_STATE_KEY } });
    lastStampWriteAt = 0;
    memo = { value: 'available', at: nowMs };
  } catch (err) {
    console.warn('[google availability] clear failed (non-fatal)', describeError(err));
  }
}

/** Test hook. */
export function __resetBusinessAvailabilityForTests(): void {
  memo = null;
  lastStampWriteAt = 0;
  lastClearAt.clear();
}
