import { NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api-errors';
import type { GoogleBusinessApiError } from '@/lib/google-business';
import { ownerGoogleMessage } from '@/lib/google-owner-copy';
import type { Locale } from '@/lib/translations';

/**
 * Translate a `GoogleBusinessApiError` into a controlled HTTP response.
 *
 * - `GOOGLE_REAUTH_REQUIRED` → 401 + `requiresReauth: true` so owner UI
 *   can show a "reconnect Google" CTA instead of a generic 500.
 * - `GOOGLE_RATE_LIMITED` → 429 (Retry-After hint left to caller of
 *   ApiErrors.tooManyRequests if needed; default ok).
 * - All other failures (`GOOGLE_SERVER_ERROR`, `GOOGLE_NETWORK_ERROR`,
 *   `GOOGLE_API_ERROR`, `GOOGLE_NOT_CONFIGURED`) → 502 with the typed
 *   code so clients can branch without parsing strings.
 *
 * The Sentry capture has already happened inside `googleBusinessFetch`;
 * this layer is purely about response shape — no extra event fired.
 *
 * CLAUDE.md §38 audit Fix #7 — locale param eklendi (TR default,
 * CLAUDE.md §22.9). Caller endpoint locale'i `getLocaleFromRequest(req)`
 * ile çözer, helper'a geçirir.
 */
export function googleBusinessErrorResponse(
  error: GoogleBusinessApiError,
  fallbackMessageTr: string,
  fallbackMessageEn?: string,
  locale: Locale = 'tr',
): NextResponse {
  const isTr = locale === 'tr';
  if (error.requiresReauth) {
    return NextResponse.json(
      {
        error: isTr
          ? 'Google bağlantısı süresi doldu. Hesabı yeniden bağlayın.'
          : 'Google connection expired. Reconnect the account.',
        code: 'GOOGLE_REAUTH_REQUIRED',
        requiresReauth: true,
      },
      { status: 401 },
    );
  }
  if (error.code === 'GOOGLE_RATE_LIMITED') {
    // Google'ın önerdiği Retry-After saniye olarak UI'a forward edilir.
    // Yoksa konservatif default 60 saniye (Google'ın dakika-bazlı sınırı
    // dolarsa tipik recovery süresi).
    //
    // Owner-facing copy: no "quota" / "API" wording (§38.233). The panel maps
    // by `code` anyway; this text is the safe fallback for other consumers.
    const retryAfter = error.retryAfterSeconds ?? 60;
    const body = isTr
      ? (retryAfter > 0
        ? `Google şu an yoğun. ${retryAfter} saniye sonra tekrar dene.`
        : 'Google şu an yoğun. Birkaç dakika sonra tekrar dene.')
      : (retryAfter > 0
        ? `Google is busy right now. Try again in ${retryAfter}s.`
        : 'Google is busy right now. Please try again in a few minutes.');
    return ApiErrors.tooManyRequests(body, 'GOOGLE_RATE_LIMITED', retryAfter);
  }
  const fallback = !isTr && fallbackMessageEn ? fallbackMessageEn : fallbackMessageTr;
  return NextResponse.json(
    { error: fallback, code: error.code },
    { status: 502 },
  );
}

/**
 * Error response for the Places routes whose status is not covered by
 * `ApiErrors` (422, 503 …). The `error` text is the owner-safe copy for the
 * machine `code` — never anything that came from Google.
 */
export function googleOwnerErrorResponse(
  status: number,
  code: string,
  locale: Locale = 'tr',
  headers?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { error: ownerGoogleMessage(code, locale), code },
    { status, ...(headers ? { headers } : {}) },
  );
}
