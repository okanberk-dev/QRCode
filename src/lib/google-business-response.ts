import { NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api-errors';
import type { GoogleBusinessApiError } from '@/lib/google-business';
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
    // Yoksa konservatif default 60 saniye (Google quota dashboard'da
    // "per minute" sınırı dolarsa tipik recovery süresi).
    const retryAfter = error.retryAfterSeconds ?? 60;
    const body = isTr
      ? (retryAfter > 0
        ? `Google API kotası doldu. ${retryAfter} saniye sonra tekrar deneyin.`
        : 'Google API kotası doldu. Birkaç dakika sonra tekrar deneyin.')
      : (retryAfter > 0
        ? `Google API quota exhausted. Try again in ${retryAfter}s.`
        : 'Google API quota exhausted. Try again in a few minutes.');
    return ApiErrors.tooManyRequests(body, 'GOOGLE_RATE_LIMITED', retryAfter);
  }
  const fallback = !isTr && fallbackMessageEn ? fallbackMessageEn : fallbackMessageTr;
  return NextResponse.json(
    { error: fallback, code: error.code },
    { status: 502 },
  );
}
